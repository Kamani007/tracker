import os
import traceback
import time
from itertools import combinations
from math import comb
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify, send_file
import tempfile
import datetime

# Global storage for processed results
stored_results = None
# Constants
COMB_LIMIT = 10000  # if combinations exceed this, use greedy fallback

# ---------------- Utilities ---------------- #
def safe_std(values):
    """Calculate standard deviation safely"""
    s = pd.Series(values, dtype="float64")
    if s.size < 2:
        return float("inf")
    return s.std(ddof=1)

def is_numeric_series(s: pd.Series):
    """Check if series contains numeric data"""
    return pd.api.types.is_numeric_dtype(s)

def coerce_numeric(series, name):
    """Convert series to numeric, return converted series and count of dropped values"""
    out = pd.to_numeric(series, errors="coerce")
    dropped = series.size - out.dropna().size
    return out, dropped

# ---------------- PCE preparation (uses ONLY 'PCE (%)') ---------------- #
def make_pce_work(df: pd.DataFrame, basis: str, log_messages=[]):
    """
    Build a compact table with one row per (Batch, Sheet, Device, Pixel) and PCE_WORK.
    ALWAYS uses 'PCE (%)'. NEVER touches 'PCE (%)_AVG'.
    - forward: keep rows where Scan Direction == 'F'; average duplicates within that direction.
    - reverse: keep rows where Scan Direction == 'R'; average duplicates within that direction.
    - average: compute the mean of PCE (%) across BOTH F and R rows for each pixel.
    Returns columns: [Batch ID, Sheet ID, Device ID, Pixel ID, PCE_WORK]
    """
    req = ["Batch ID", "Sheet ID", "Device ID", "Pixel ID", "Scan Direction", "PCE (%)"]
    missing = [c for c in req if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required column(s): {missing}")

    work = df.copy()
    work["PCE (%)"], dropped = coerce_numeric(work["PCE (%)"], "PCE (%)")
    if dropped:
        log_messages.append(f"Dropped {dropped} row(s) with non-numeric PCE (%).")
    work = work.dropna(subset=["PCE (%)"])
    if work.empty:
        log_messages.append("No valid rows after coercing PCE (%) to numeric.")
        return pd.DataFrame(columns=["Batch ID","Sheet ID","Device ID","Pixel ID","PCE_WORK"])

    work["Scan Direction"] = work["Scan Direction"].astype(str).str.strip().str.upper()
    id_cols = ["Batch ID","Sheet ID","Device ID","Pixel ID"]

    if basis == "forward":
        w = work[work["Scan Direction"] == "F"]
        if w.empty:
            log_messages.append("No rows for basis=Forward (Scan Direction == 'F').")
            return pd.DataFrame(columns=id_cols + ["PCE_WORK"])
        grouped = w.groupby(id_cols, as_index=False)["PCE (%)"].mean()
        return grouped.rename(columns={"PCE (%)": "PCE_WORK"})

    if basis == "reverse":
        w = work[work["Scan Direction"] == "R"]
        if w.empty:
            log_messages.append("No rows for basis=Reverse (Scan Direction == 'R').")
            return pd.DataFrame(columns=id_cols + ["PCE_WORK"])
        grouped = w.groupby(id_cols, as_index=False)["PCE (%)"].mean()
        return grouped.rename(columns={"PCE (%)": "PCE_WORK"})

    if basis == "average-fr":
        # mean across whichever directions exist for the pixel
        grouped = work.groupby(id_cols, as_index=False)["PCE (%)"].mean()
        return grouped.rename(columns={"PCE (%)": "PCE_WORK"})

    raise ValueError(f"Unsupported basis: {basis}")

# ---------------- Device candidates (exact M pixels) ---------------- #
def build_device_candidates_M(pce_df: pd.DataFrame, m_pixels: int, method: str, log_messages=[]):
    """
    For each (Batch, Sheet, Device), pick best EXACT-M-pixel subset by:
      - minimize-sd  => minimize SD of PCE_WORK
      - maximize-mean-pce=> maximize mean of PCE_WORK
    Devices with < M pixels are skipped.
    Returns: [Batch ID, Sheet ID, Device ID, CandidatePixels(list), CandidatePCEs(list), DeviceMetric, PixelsUsed=M]
    """
    need = ["Batch ID","Sheet ID","Device ID","Pixel ID","PCE_WORK"]
    missing = [c for c in need if c not in pce_df.columns]
    if missing:
        raise ValueError(f"Missing columns for candidate building: {missing}")

    if pce_df.empty:
        return pd.DataFrame(columns=[
            "Batch ID","Sheet ID","Device ID","CandidatePixels","CandidatePCEs","DeviceMetric","PixelsUsed"
        ])

    recs = []
    g = pce_df.groupby(["Batch ID","Sheet ID","Device ID"], as_index=False)
    for (batch_id, sheet_id, dev_id), group in g:
        group = group.sort_values("Pixel ID")
        pixels = group["Pixel ID"].tolist()
        pces   = group["PCE_WORK"].astype(float).tolist()

        if len(pixels) < m_pixels:
            continue

        best_metric = None
        best_pix = None
        best_vals = None

        for idxs in combinations(range(len(pixels)), m_pixels):
            vals = [pces[i] for i in idxs]
            pixs = [pixels[i] for i in idxs]
            if method == "minimize-sd":
                metric = safe_std(vals)
                better = (best_metric is None) or (metric < best_metric)
            else:  # maximize-mean-pce
                metric = float(np.mean(vals))
                better = (best_metric is None) or (metric > best_metric)
            if better:
                best_metric = metric
                best_pix = pixs
                best_vals = vals

        if best_pix is None:
            continue

        recs.append({
            "Batch ID": batch_id,
            "Sheet ID": sheet_id,
            "Device ID": dev_id,
            "CandidatePixels": best_pix,
            "CandidatePCEs": best_vals,
            "DeviceMetric": best_metric,
            "PixelsUsed": m_pixels,
        })

    return pd.DataFrame(recs)

# ---------------- Device selection per sheet (SAFE) ---------------- #
def select_devices_for_sheet(sheet_group: pd.DataFrame, k_devices, method: str, log_messages=[]):
    """
    Choose devices for a single (Batch, Sheet).
    If k_devices is "select-all" or k_devices >= available -> select ALL available devices.
    If 1 <= k_devices < available -> try exact-combo search; greedy fallback if too many combos.
    """
    if sheet_group.empty:
        return None

    available = len(sheet_group)

    # Normalize k_devices
    if k_devices == "select-all" or (isinstance(k_devices, int) and (k_devices <= 0 or k_devices >= available)):
        combined = [x for sub in sheet_group["CandidatePCEs"] for x in sub]
        metric = safe_std(combined) if method == "minimize-sd" else (float(np.mean(combined)) if combined else float("nan"))
        return {
            "SelectedDevices": tuple(sheet_group["Device ID"].tolist()),
            "CombinedPCEs": combined,
            "CombinedMetric": metric,
            "TotalPixels": int(sum(sheet_group["PixelsUsed"])),
        }

    # From here, 1 <= k_devices < available
    dev_ids = sheet_group["Device ID"].tolist()

    # Safe combinations check
    try:
        num_combos = comb(available, k_devices)
    except ValueError:
        num_combos = 0

    if num_combos and num_combos <= COMB_LIMIT:
        best = None
        for dev_combo in combinations(dev_ids, k_devices):
            rows = sheet_group[sheet_group["Device ID"].isin(dev_combo)]
            combined = [x for sub in rows["CandidatePCEs"] for x in sub]
            metric = safe_std(combined) if method == "minimize-sd" else (float(np.mean(combined)) if combined else float("nan"))
            better = (best is None) or ((metric < best["CombinedMetric"]) if method=="minimize-sd" else (metric > best["CombinedMetric"]))
            if better:
                best = {
                    "SelectedDevices": tuple(dev_combo),
                    "CombinedPCEs": combined,
                    "CombinedMetric": metric,
                    "TotalPixels": int(sum(rows["PixelsUsed"])),
                }
        return best

    # Greedy fallback (bounded)
    log_messages.append(f"Too many combinations ({num_combos:,} if computed); using greedy selection.")
    remaining = sheet_group.copy()
    selected = []
    combined = []

    steps = min(k_devices, available)
    for _ in range(steps):
        best_dev = None
        best_metric = None
        for _, row in remaining.iterrows():
            test = combined + row["CandidatePCEs"]
            m = safe_std(test) if method == "minimize-sd" else (float(np.mean(test)) if test else float("nan"))
            better = (best_metric is None) or ((m < best_metric) if method=="minimize-sd" else (m > best_metric))
            if better:
                best_metric = m
                best_dev = row
        if best_dev is None:
            break
        selected.append(best_dev["Device ID"])
        combined += best_dev["CandidatePCEs"]
        remaining = remaining[remaining["Device ID"] != best_dev["Device ID"]]

    rows = sheet_group[sheet_group["Device ID"].isin(selected)]
    return {
        "SelectedDevices": tuple(selected),
        "CombinedPCEs": combined,
        "CombinedMetric": (safe_std(combined) if method == "minimize-sd" else (float(np.mean(combined)) if combined else float("nan"))),
        "TotalPixels": int(sum(rows["PixelsUsed"])),
    }

# ---------------- Entire data assembly ---------------- #
def assemble_entire_rows(
    original_df: pd.DataFrame,
    basis: str,             # "forward" | "reverse" | "average-fr"
    selections,             # list: for each kept sheet {Batch ID, Sheet ID, SelectedDevices, SelectedPixelsMap}
    m_pixels: int,          # 3 or 4 (for metadata only)
    method: str,            # for metadata
    log_messages=[]
) -> pd.DataFrame:
    """
    Build rows for Entire_Data.xlsx.
    - Forward/Reverse: include original rows only for the chosen direction; average duplicates within that direction.
    - Average (F/R): include BOTH original rows (F and R) for each selected pixel,
      and add a PCE_WORK column set to the mean of the two (repeated on both rows).
      If only one direction exists, keep that row and PCE_WORK = that value.
    NEVER uses PCE (%)_AVG.
    """
    need = ["Batch ID","Sheet ID","Device ID","Pixel ID","Scan Direction","PCE (%)"]
    missing = [c for c in need if c not in original_df.columns]
    if missing:
        raise ValueError(f"Missing columns in original data: {missing}")

    df = original_df.copy()
    df["PCE (%)"] = pd.to_numeric(df["PCE (%)"], errors="coerce")

    out = []

    for sel in selections:
        b = sel["Batch ID"]; s = sel["Sheet ID"]
        for dev in sel["SelectedDevices"]:
            for px in sel["SelectedPixelsMap"].get(dev, []):
                rows = df[(df["Batch ID"] == b) & (df["Sheet ID"] == s) &
                          (df["Device ID"] == dev) & (df["Pixel ID"] == px)]
                if basis in ("forward","reverse"):
                    dir_code = "F" if basis == "forward" else "R"
                    sub = rows[rows["Scan Direction"].astype(str).str.upper() == dir_code]
                    sub = sub.dropna(subset=["PCE (%)"])
                    if sub.empty:
                        continue
                    if len(sub) > 1:
                        # aggregate duplicates in that direction
                        agg = {c: ("mean" if is_numeric_series(sub[c]) else "first") for c in sub.columns}
                        sub = sub.groupby(["Batch ID","Sheet ID","Device ID","Pixel ID"], as_index=False).agg(agg)
                        sub["Scan Direction"] = dir_code
                    sub = sub.copy()
                    sub["Basis"] = basis
                    sub["Pixel choice (M)"] = m_pixels
                    sub["Method"] = method
                    sub["Selected (Yes/No)"] = "Yes"
                    sub["PCE_WORK"] = sub["PCE (%)"]
                    out.append(sub)
                else:
                    # Average: include BOTH original rows (F and R) if present
                    sub = rows.dropna(subset=["PCE (%)"]).copy()
                    if sub.empty:
                        continue
                    # compute mean across whatever directions exist
                    mean_val = sub["PCE (%)"].mean()
                    # If multiple rows for a direction, reduce within-direction first (rare)
                    def reduce_dir(dcode):
                        part = sub[sub["Scan Direction"].astype(str).str.upper() == dcode]
                        if part.empty:
                            return None
                        if len(part) > 1:
                            agg = {c: ("mean" if is_numeric_series(part[c]) else "first") for c in part.columns}
                            part = part.groupby(["Batch ID","Sheet ID","Device ID","Pixel ID"], as_index=False).agg(agg)
                            part["Scan Direction"] = dcode
                        return part

                    f_part = reduce_dir("F")
                    r_part = reduce_dir("R")

                    parts = []
                    if f_part is not None: parts.append(f_part)
                    if r_part is not None: parts.append(r_part)
                    if not parts:
                        # no labeled directions? keep merged single row
                        merged = sub.groupby(["Batch ID","Sheet ID","Device ID","Pixel ID"], as_index=False).first()
                        merged["Basis"] = basis
                        merged["Pixel choice (M)"] = m_pixels
                        merged["Method"] = method
                        merged["Selected (Yes/No)"] = "Yes"
                        merged["PCE_WORK"] = mean_val
                        out.append(merged)
                    else:
                        both = pd.concat(parts, ignore_index=True)
                        both = both.copy()
                        both["Basis"] = basis
                        both["Pixel choice (M)"] = m_pixels
                        both["Method"] = method
                        both["Selected (Yes/No)"] = "Yes"
                        both["PCE_WORK"] = mean_val  # repeat same averaged value on each of the F/R rows
                        out.append(both)

    if not out:
        return pd.DataFrame()

    full = pd.concat(out, ignore_index=True)

    preferred = ["Batch ID","Sheet ID","Device ID","Pixel ID","Scan Direction",
                 "Basis","Pixel choice (M)","Method","Selected (Yes/No)","PCE_WORK","PCE (%)"]
    rest = [c for c in full.columns if c not in preferred]
    full = full[[c for c in preferred if c in full.columns] + rest]

    sort_cols = [c for c in ["Batch ID","Sheet ID","Device ID","Pixel ID","Scan Direction"] if c in full.columns]
    if sort_cols:
        full = full.sort_values(sort_cols, kind="mergesort").reset_index(drop=True)
    return full

# ---------------- Core pipeline with both outputs ---------------- #
def process_excel_analysis(
    file_path: str,
    options: dict
) -> dict:
    """
    Process Excel file with given options and return results
    """
    log_messages = []
    
    try:
        # Extract options
        sheets_mode = options.get('sheetsMode', 'top-k')
        sheets_top_k = options.get('sheetsTopK', 6)
        devices_mode = options.get('devicesMode', 'top-k') 
        devices_top_k = options.get('devicesTopK', 6)
        pixels_per_device = options.get('pixelsPerDevice', 3)
        method = options.get('method', 'minimize-sd')
        basis = options.get('basis', 'forward')
        use_all_sheets = options.get('useAllSheets', True)
        sheet_ids = options.get('sheetIds', '')

        log_messages.append(f"Loading file: {file_path}")
        
        # Read file based on extension
        file_extension = file_path.lower().split('.')[-1]
        
        try:
            if file_extension in ['xlsx', 'xls']:
                # For Excel files, just read the first sheet (default behavior)
                df_full = pd.read_excel(file_path)
                log_messages.append(f"Successfully read Excel file (.{file_extension})")
            elif file_extension == 'csv':
                df_full = pd.read_csv(file_path)
                log_messages.append("Successfully read CSV file")
            else:
                raise ValueError(f"Unsupported file extension: .{file_extension}. Supported: .xlsx, .xls, .csv")
        except Exception as e:
            raise ValueError(f"Failed to read file: {str(e)}")
        
        if df_full is None or df_full.empty:
            raise ValueError("Input file is empty or unreadable.")

        df_full.columns = df_full.columns.str.strip()
        
        # Check required columns
        req = ["Batch ID","Sheet ID","Device ID","Pixel ID","Scan Direction","PCE (%)"]
        missing = [c for c in req if c not in df_full.columns]
        if missing:
            raise ValueError(f"Missing required columns: {missing}")

        # Optional sheet filter
        if not use_all_sheets and sheet_ids.strip():
            sheet_list = [s.strip() for s in sheet_ids.split(',') if s.strip()]
            if sheet_list:
                before = len(df_full)
                df_full = df_full[df_full["Sheet ID"].astype(str).isin(set(map(str, sheet_list)))]
                after = len(df_full)
                log_messages.append(f"Sheet filter applied: kept {after} / {before} rows.")
                if df_full.empty:
                    raise ValueError("No rows left after applying sheet filter.")

        # Prepare PCE_WORK
        log_messages.append(f"Preparing PCE using basis={basis}")
        pce_df = make_pce_work(df_full, basis=basis, log_messages=log_messages)

        # Build device candidates
        log_messages.append(f"Building device candidates (M={pixels_per_device}, method={method})")
        cand_df = build_device_candidates_M(pce_df, m_pixels=pixels_per_device, method=method, log_messages=log_messages)
        
        if cand_df.empty:
            raise ValueError("No device candidates produced; check data and settings.")

        # Per-sheet device selection
        log_messages.append("Selecting devices per (Batch, Sheet)")
        quick_rows = []

        gb = cand_df.groupby(["Batch ID","Sheet ID"], as_index=False)
        for (batch_id, sheet_id), group in gb:
            # Devices selection
            k_dev = devices_top_k if devices_mode == "top-k" else "select-all"
            if isinstance(k_dev, int) and k_dev > len(group):
                k_dev = "select-all"

            result = select_devices_for_sheet(group, k_devices=k_dev, method=method, log_messages=log_messages)
            if result is None:
                continue

            sel_devs = result["SelectedDevices"]
            combined = result["CombinedPCEs"]
            total_pix = result["TotalPixels"]
            combined_mean = float(np.mean(combined)) if len(combined) else float("nan")
            combined_sd = safe_std(combined)

            # Map device -> pixels used from candidate table
            dev_to_pix = {}
            for dev in sel_devs:
                row = group[group["Device ID"] == dev].iloc[0]
                dev_to_pix[dev] = row["CandidatePixels"]

            pixels_per_device_str = "; ".join(
                f"{str(dev)}: {', '.join(map(str, dev_to_pix.get(dev, [])))}"
                for dev in sel_devs
            )

            quick_rows.append({
                "Batch ID": batch_id,
                "Sheet ID": sheet_id,
                "Devices mode": ("Select All" if (k_dev == "select-all") else f"Top-{k_dev}"),
                "Pixel choice (M)": pixels_per_device,
                "Method": method,
                "Basis": basis,
                "Selected devices": ", ".join(map(str, sel_devs)),
                "Selected pixels per device": pixels_per_device_str,
                "Total pixels used": int(total_pix),
                "Combined mean PCE": combined_mean,
                "Combined SD PCE": combined_sd
            })

        if not quick_rows:
            raise ValueError("No sheets produced a valid selection.")

        quick_df = pd.DataFrame(quick_rows)

        # Rank sheets by method
        if method == "minimize-sd":
            quick_df = quick_df.sort_values(["Combined SD PCE","Batch ID","Sheet ID"], na_position="last")
        else:
            quick_df = quick_df.sort_values(["Combined mean PCE","Batch ID","Sheet ID"], ascending=[False, True, True], na_position="last")

        quick_df.insert(0, "Rank", range(1, len(quick_df) + 1))

        # Sheet selection
        if sheets_mode == "top-k" and sheets_top_k > 0:
            sheets_top_k = min(sheets_top_k, len(quick_df))
            quick_df = quick_df.head(sheets_top_k)
            log_messages.append(f"Keeping top {sheets_top_k} sheet(s).")
        else:
            log_messages.append("Keeping all sheets (Select All).")

        # Convert DataFrame to dict for JSON response
        results_data = quick_df.to_dict('records')

        # Store data for file generation
        selections = []
        for idx, row in quick_df.iterrows():
            batch_id = row["Batch ID"]
            sheet_id = row["Sheet ID"]
            sel_devs = [d.strip() for d in row["Selected devices"].split(",")]
            
            # Build selected pixels map from the candidate data
            selected_pixels_map = {}
            for dev in sel_devs:
                dev_row = cand_df[(cand_df["Batch ID"] == batch_id) & 
                                  (cand_df["Sheet ID"] == sheet_id) & 
                                  (cand_df["Device ID"] == dev)]
                if not dev_row.empty:
                    selected_pixels_map[dev] = dev_row.iloc[0]["CandidatePixels"]
                    
            selections.append({
                "Batch ID": batch_id,
                "Sheet ID": sheet_id,
                "SelectedDevices": sel_devs,
                "SelectedPixelsMap": selected_pixels_map
            })

        # Generate entire data
        try:
            log_messages.append("Generating detailed data for Entire_Data.xlsx...")
            entire_df = assemble_entire_rows(
                original_df=df_full,
                basis=basis,
                selections=selections,
                m_pixels=pixels_per_device,
                method=method,
                log_messages=log_messages
            )
        except Exception as e:
            log_messages.append(f"Warning: Could not generate entire data: {str(e)}")
            entire_df = pd.DataFrame()

        # Store results for download
        global stored_results
        stored_results = {
            "quick_data": quick_df,
            "entire_data": entire_df,
            "timestamp": time.time()
        }

        log_messages.append("✅ Analysis completed successfully! Download data stored.")

        return {
            "status": "success",
            "message": "Processing completed successfully!",
            "summary": {
                "sheetsProcessed": len(quick_df),
                "devicesAnalyzed": sum(len(row["Selected devices"].split(", ")) for row in results_data if row["Selected devices"]),
                "totalPixels": sum(row["Total pixels used"] for row in results_data),
                "entireDataRows": len(entire_df)
            },
            "results": results_data,
            "logs": log_messages,
            "hasDownloadData": True
        }

    except Exception as e:
        log_messages.append(f"ERROR: {str(e)}")
        log_messages.append("Full traceback:\n" + traceback.format_exc())
        return {
            "status": "error",
            "message": f"Processing failed: {str(e)}",
            "logs": log_messages,
            "hasDownloadData": False
        }