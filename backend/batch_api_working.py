# -*- coding: utf-8 -*-
"""
Batch Processing API - Azure parquet → Runs × Process/ProcessType (TypeId path) → current location
Corrected join path:
run.Id → run_step.RunId → run_step.ProcessModuleId(=TypeId) → process_module.TypeId → ProcessId → process.Id
→ process.CategoryId → process_type_category.TypeId → process_type.Id → process_type.Name
"""

import os
import json
import re
import io
from pathlib import Path
from datetime import datetime
from urllib.parse import quote
import xml.etree.ElementTree as ET
import pandas as pd
import requests
from flask import jsonify, request
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# =========================
# CONFIG
# =========================
# Use environment variables with fallbacks for development
SAS_TOKEN = os.getenv('AZURE_SAS_TOKEN')
AZURE_STORAGE_ACCOUNT = os.getenv('AZURE_STORAGE_ACCOUNT', 'solodbdata')
ACCOUNT_URL = f"https://{AZURE_STORAGE_ACCOUNT}.blob.core.windows.net"
CONTAINER = os.getenv('AZURE_STORAGE_CONTAINER', 'production')
PREFIX = None
ALLOW_LISTING = True
DEBUG = True

def dbg(*a):
    if DEBUG:
        print(*a)

NEEDED = {"run", "run_step", "process_module", "process", "process_category", "process_type_category", "process_type"}

SESSION = requests.Session()
SESSION.mount("https://", requests.adapters.HTTPAdapter(max_retries=3))

# =========================
# Azure helpers (concise)
# =========================
def _findall_nsless(elem, tag):
    return elem.findall(f".//{{*}}{tag}")

def _findtext_nsless(elem, tag):
    el = elem.find(f".//{{*}}{tag}")
    return el.text if (el is not None and el.text) else None

def azure_list_blobs(container: str, prefix: str = None, maxresults: int = 5000):
    blobs, marker = [], None
    while True:
        params = {"restype": "container", "comp": "list", "maxresults": str(maxresults)}
        if prefix:
            params["prefix"] = prefix
        if marker:
            params["marker"] = marker
        url = f"{ACCOUNT_URL}/{container}?" + "&".join([f"{k}={quote(v)}" for k, v in params.items()]) + f"&{SAS_TOKEN}"
        r = SESSION.get(url, timeout=60)
        if r.status_code != 200:
            dbg(f"⚠️ LIST failed {container}: HTTP {r.status_code}")
            break
        root = ET.fromstring(r.text)
        for b in _findall_nsless(root, "Blob"):
            n = b.find("{*}Name")
            if n is not None and n.text:
                blobs.append(n.text)
        marker = _findtext_nsless(root, "NextMarker")
        if not marker:
            break
    return blobs

CANDIDATES = {
    "run": ["run.parquet", "parquet/run.parquet", "tables/run.parquet", "delta/run.parquet"],
    "run_step": ["run_step.parquet", "parquet/run_step.parquet", "tables/run_step.parquet", "delta/run_step.parquet"],
    "process_module": ["process_module.parquet", "parquet/process_module.parquet", "tables/process_module.parquet"],
    "process": ["process.parquet", "parquet/process.parquet", "tables/process.parquet"],
    "process_category": ["process_category.parquet", "parquet/process_category.parquet", "tables/process_category.parquet"],
    "process_type_category": ["process_type_category.parquet", "parquet/process_type_category.parquet", "tables/process_type_category.parquet"],
    "process_type": ["process_type.parquet", "parquet/process_type.parquet", "tables/process_type.parquet"],
}

def pick_blob_from_list(all_blobs, table):
    leaf = f"{table}.parquet".lower()
    exact = [b for b in all_blobs if b.lower() == leaf or b.lower().endswith("/" + leaf)]
    if exact:
        return exact[0]
    anymatch = [b for b in all_blobs if b.lower().endswith(leaf)]
    return anymatch[0] if anymatch else None

def guess_blob_for_table(table: str):
    for cand in CANDIDATES[table]:
        url = f"{ACCOUNT_URL}/{CONTAINER}/{quote(cand, safe='/')}?{SAS_TOKEN}"
        h = SESSION.head(url, timeout=20)
        if h.status_code in (200, 206):
            return cand
        g = SESSION.get(url, headers={"Range": "bytes=0-0"}, timeout=20)
        if g.status_code in (200, 206):
            return cand
    return None

def download_blob_to_memory(container: str, blob: str):
    """Download blob directly to memory"""
    url = f"{ACCOUNT_URL}/{container}/{quote(blob, safe='/')}?{SAS_TOKEN}"
    r = SESSION.get(url, timeout=120)
    if r.status_code != 200:
        dbg(f"⚠️ GET {blob}: {r.status_code}")
        return None
    return io.BytesIO(r.content)

# =========================
# Robust parquet subset loader
# =========================
def read_parquet_subset(blob_name: str, name: str, columns: list):
    """Read parquet from Azure blob - handles duplicate columns in schema"""
    try:
        import pyarrow.parquet as pq
        
        blob_data = download_blob_to_memory(CONTAINER, blob_name)
        if blob_data is None:
            return pd.DataFrame(columns=columns)
        
        # Read the parquet file with PyArrow to handle schema issues
        parquet_file = pq.ParquetFile(blob_data)
        schema = parquet_file.schema_arrow
        
        # Check for duplicate column names in schema
        col_names = [field.name for field in schema]
        
        if len(col_names) != len(set(col_names)):
            dbg(f"   ⚠️ Duplicate columns in schema for {name}: {[c for c in col_names if col_names.count(c) > 1]}")
            
            # Create a mapping of unique column indices (keep first occurrence of each name)
            seen = set()
            unique_indices = []
            for i, col_name in enumerate(col_names):
                if col_name not in seen:
                    seen.add(col_name)
                    unique_indices.append(i)
            
            # Read only unique columns by index
            table = parquet_file.read(columns=[col_names[i] for i in unique_indices])
        else:
            # No duplicates, read normally
            # Only request columns that exist
            available_cols = [c for c in columns if c in col_names]
            if available_cols:
                table = parquet_file.read(columns=available_cols)
            else:
                table = parquet_file.read()
        
        # Convert to pandas
        df = table.to_pandas()
        
        # Now select only the columns we need (if we read all)
        if columns:
            available_cols = [c for c in columns if c in df.columns]
            if available_cols:
                df = df[available_cols]
            else:
                # Return empty dataframe with requested columns
                df = pd.DataFrame(columns=columns)
        
        df.columns = [str(c) for c in df.columns]
        dbg(f"📖 {name}: {df.shape}")
        return df
        
    except Exception as e:
        dbg(f"   ❌ {name}: {e}")
        import traceback
        dbg(traceback.format_exc())
        return pd.DataFrame(columns=columns)

def strip_html(s):
    if pd.isna(s):
        return s
    return re.sub(r"<[^>]+>", "", str(s)).strip()


def get_current_batch_location():
    """Get current location of all batches - using exact Jupyter notebook logic"""
    try:
        # STEP 1 — Discover blobs
        dbg(f"📦 Listing blobs in '{CONTAINER}' ...")
        blobs = azure_list_blobs(CONTAINER, PREFIX) if ALLOW_LISTING else []
        dbg(f"📦 LIST: total={len(blobs)}")
        
        selected = {}
        for tbl in sorted(NEEDED):
            blob = pick_blob_from_list(blobs, tbl) if blobs else None
            if not blob:
                blob = guess_blob_for_table(tbl)
            if not blob:
                return jsonify({"success": False, "error": f"Missing remote parquet for table: {tbl}"}), 500
            selected[tbl] = blob
        
        dbg(f"✅ STEP 1 done → tables found")
        
        # STEP 2 — Load and join tables (corrected column mappings)
        run = read_parquet_subset(selected["run"], "run",
                                  ["Id", "Label", "Name", "Motivation", "Status", "RunTypeId"]) \
            .rename(columns={"Id": "RunId"}).drop_duplicates(subset=["RunId"])
        
        run_step = read_parquet_subset(selected["run_step"], "run_step",
                                       ["RunId", "ProcessModuleId"]).drop_duplicates()
        
        process_tbl = read_parquet_subset(selected["process"], "process",
                                          ["Id", "Name", "CategoryId"]) \
            .rename(columns={"Id": "ProcessId", "Name": "ProcessName"}) \
            .drop_duplicates(subset=["ProcessId"])
        
        process_category = read_parquet_subset(selected["process_category"], "process_category",
                                               ["Id", "Name"]) \
            .rename(columns={"Id": "CategoryId", "Name": "CategoryName"}) \
            .drop_duplicates(subset=["CategoryId"])
        
        # NEW: Add process_type_category bridge table
        process_type_category = read_parquet_subset(selected["process_type_category"], "process_type_category",
                                                   ["TypeId", "CategoryId"]).drop_duplicates()
        
        # NEW: Add process_type table
        process_type = read_parquet_subset(selected["process_type"], "process_type",
                                          ["Id", "Name"]) \
            .rename(columns={"Id": "ProcessTypeId", "Name": "ProcessTypeName"}) \
            .drop_duplicates(subset=["ProcessTypeId"])
        
        # Updated process_module structure: Id, ProcessId, ModuleId, DateCreated, LastUpdate, InUse, IsAssemblyProcess, HasLocalParameter
        pm_raw = read_parquet_subset(selected["process_module"], "process_module",
                                     ["Id", "ProcessId", "ModuleId"]).copy()
        for c in ["Id", "ProcessId", "ModuleId"]:
            if c in pm_raw.columns:
                pm_raw[c] = pd.to_numeric(pm_raw[c], errors="coerce")
        
        # One representative row per ModuleId (prefer where ProcessId present)
        pm_raw["_score"] = pm_raw["ProcessId"].notna().astype(int)
        pm_by_module = (pm_raw.sort_values(["Id", "_score"], ascending=[True, False], kind="stable")
                        .drop_duplicates(subset=["Id"], keep="first")
                        .drop(columns=["_score"]))
        
        # Joins - COMPLETE MAPPING with process_type:
        # run_step.ProcessModuleId → process_module.Id → process.ProcessId → process_category.CategoryId → process_type_category.CategoryId → process_type.ProcessTypeId
        j1 = run_step.merge(pm_by_module, how="left", left_on="ProcessModuleId", right_on="Id", suffixes=("", "_pm"))
        j2 = j1.merge(process_tbl, how="left", on="ProcessId")
        j3 = j2.merge(process_category, how="left", on="CategoryId")
        j4 = j3.merge(process_type_category, how="left", on="CategoryId", suffixes=("", "_ptc"))
        j5 = j4.merge(process_type, how="left", left_on="TypeId", right_on="ProcessTypeId")
        j6 = j5.merge(run, how="left", on="RunId")
        
        # STEP 3 — Current location per run (with timestamps) - updated column names
        def _coalesce_by_name(df: pd.DataFrame, name: str):
            idxs = [i for i, c in enumerate(df.columns) if c == name]
            if not idxs:
                return pd.Series(pd.NA, index=df.index, dtype="object")
            if len(idxs) == 1:
                return df.iloc[:, idxs[0]]
            return df.iloc[:, idxs].bfill(axis=1).iloc[:, 0]
        
        def _combine_dt(date_like, time_like):
            d = pd.to_datetime(date_like, errors="coerce").dt.tz_localize(None)
            t = pd.to_timedelta(pd.Series(time_like, dtype="string").fillna("00:00:00")
                                .str.replace(r"[^\d:]", "", regex=True), errors="coerce")
            return (d + t).astype("datetime64[ns]")
        
        # Try to get run_step with timestamps, but handle if columns don't exist
        rs_cols_desired = ["RunId", "ProcessModuleId", "Sequence", "StartDate", "StartTime", "FinishDate", "FinishTime", "__batch_index", "__fragment_index"]
        
        # First, read run_step without specifying all columns to see what's available
        rs_basic = read_parquet_subset(selected["run_step"], "run_step_basic_check", ["RunId", "ProcessModuleId"])
        
        # Now try to read with all desired columns
        try:
            rs = read_parquet_subset(selected["run_step"], "run_step_for_status", rs_cols_desired).copy()
        except Exception as e:
            dbg(f"⚠️ Could not read all timestamp columns, using basic columns: {e}")
            # Fallback: just use RunId and ProcessModuleId
            rs = rs_basic.copy()
        
        # Ensure numeric columns
        for c in ["RunId", "ProcessModuleId", "Sequence", "__batch_index", "__fragment_index"]:
            if c in rs.columns:
                rs[c] = pd.to_numeric(rs[c], errors="coerce")
        
        # Only add timestamps if we have the date columns
        if "StartDate" in rs.columns and "FinishDate" in rs.columns:
            rs["started_at"] = _combine_dt(_coalesce_by_name(rs, "StartDate"), _coalesce_by_name(rs, "StartTime"))
            rs["finished_at"] = _combine_dt(_coalesce_by_name(rs, "FinishDate"), _coalesce_by_name(rs, "FinishTime"))
        else:
            dbg("⚠️ No timestamp columns available in run_step")
            rs["started_at"] = pd.NaT
            rs["finished_at"] = pd.NaT
        
        rs["status"] = pd.NA
        rs.loc[rs["finished_at"].notna(), "status"] = "Completed"
        rs.loc[(rs["started_at"].notna()) & (rs["finished_at"].isna()), "status"] = "In Progress"
        rs.loc[(rs["started_at"].isna()) & (rs["finished_at"].isna()), "status"] = "Not Started"
        rs["updated_at"] = rs[["finished_at", "started_at"]].max(axis=1)
        
        def _pick_current(g: pd.DataFrame):
            if g["updated_at"].notna().any():
                return g.loc[[g["updated_at"].idxmax()]]
            sk = [c for c in ["__batch_index", "__fragment_index"] if c in g.columns]
            if sk:
                return g.sort_values(sk, kind="stable").iloc[[-1]]
            if "Sequence" in g.columns and g["Sequence"].notna().any():
                return g.loc[[g["Sequence"].idxmax()]]
            return g.iloc[[-1]]
        
        current_step = (rs.groupby("RunId", as_index=False, group_keys=False)
                        .apply(_pick_current).reset_index(drop=True))
        
        # Resolve names using complete path: ProcessModuleId → process_module.Id → process_type
        c1 = current_step.merge(pm_by_module[["Id", "ProcessId", "ModuleId"]],
                                how="left", left_on="ProcessModuleId", right_on="Id", suffixes=("", "_pm"))
        c2 = c1.merge(process_tbl, how="left", on="ProcessId")
        c3 = c2.merge(process_category, how="left", on="CategoryId")
        c4 = c3.merge(process_type_category, how="left", on="CategoryId", suffixes=("", "_ptc"))
        c5 = c4.merge(process_type, how="left", left_on="TypeId", right_on="ProcessTypeId")
        
        run_names = (
            run[["RunId", "Label", "Name", "Motivation", "Status"]]
            .drop_duplicates(subset=["RunId"])
            .rename(columns={"Name": "RunName"})
        )
        c5 = c5.merge(run_names, on="RunId", how="left")
        
        # Add Motivation text (strip HTML)
        if "Motivation" in c5.columns:
            c5["MotivationText"] = c5["Motivation"].map(strip_html)
        
        # Final column order - updated for complete schema with process_type
        keep_cols = [c for c in [
            "RunId", "Label", "RunName", "Motivation", "MotivationText", "Status",
            "ProcessModuleId", "Id_pm", "ModuleId", 
            "ProcessId", "ProcessName", "CategoryId", "CategoryName",
            "TypeId", "ProcessTypeId", "ProcessTypeName",
            "status", "Sequence", "started_at", "finished_at", "updated_at"
        ] if c in c5.columns]
        
        current_location = (c5[keep_cols]
                            .sort_values(["RunId"], kind="stable", ascending=False)
                            .reset_index(drop=True))
        
        dbg(f"📍 Current location: {len(current_location)} runs")
        
        # Convert to JSON-friendly format
        batches = []
        for _, row in current_location.iterrows():
            batch = {
                "batch_id": int(row.get("RunId", 0)) if pd.notna(row.get("RunId")) else 0,
                "batch_number": str(row.get("Label", "")) if pd.notna(row.get("Label")) else "",
                "batch_name": str(row.get("RunName", "Unknown")) if pd.notna(row.get("RunName")) else "Unknown",
                "batch_status": str(row.get("Status", "")) if pd.notna(row.get("Status")) else "",
                "motivation": str(row.get("MotivationText", "")) if pd.notna(row.get("MotivationText")) else "",
                "process_name": str(row.get("ProcessName", "")) if pd.notna(row.get("ProcessName")) else "",
                "category_name": str(row.get("CategoryName", "")) if pd.notna(row.get("CategoryName")) else "",
                "process_type_name": str(row.get("ProcessTypeName", "")) if pd.notna(row.get("ProcessTypeName")) else "",
                "process_status": str(row.get("status", "Unknown")) if pd.notna(row.get("status")) else "Unknown",
                "started_at": str(row.get("started_at")) if pd.notna(row.get("started_at")) else "",
                "finished_at": str(row.get("finished_at")) if pd.notna(row.get("finished_at")) else ""
            }
            batches.append(batch)
        
        return jsonify({
            "success": True,
            "data": batches,
            "count": len(batches)
        })
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        dbg(f"Error in get_current_batch_location: {error_details}")
        return jsonify({"success": False, "error": str(e), "details": error_details}), 500


def batch_health():
    """Health check for batch API"""
    return jsonify({
        "success": True,
        "service": "Batch Processing API",
        "status": "operational"
    })
