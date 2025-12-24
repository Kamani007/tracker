
import os, io
import pandas as pd
from statistics import mean, stdev, median, quantiles
from dotenv import load_dotenv

# Optional: Azure SDK (faster). If not installed, we'll use requests for SAS URL and container listing.
try:
    from azure.storage.blob import BlobServiceClient, ContainerClient, BlobClient
except Exception:
    BlobServiceClient = ContainerClient = BlobClient = None

# -------------------- ENV SETUP --------------------
load_dotenv()

# REQUIRED file name (enforced strictly)
REQUIRED_BLOB_NAME = os.getenv("BLOB_NAME", "BaseLine.xlsx")

"""
Supported configurations (set EXACTLY ONE of these modes):

1) Single Blob SAS URL (must point to BaseLine.xlsx exactly)
   BLOB_SAS_URL="https://<acct>.blob.core.windows.net/<container>/BaseLine.xlsx?sv=..."

2) Container SAS (must contain BaseLine.xlsx)
   AZURE_CONTAINER_URL="https://<acct>.blob.core.windows.net/<container>"
   AZURE_CONTAINER_SAS="?sv=...&sp=rl..."   # needs r + l to list/confirm
   # optional: BLOB_NAME="BaseLine.xlsx" (default)

3) Connection String (must contain BaseLine.xlsx)
   AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=...;"
   CONTAINER_NAME="baseline-xlsx"
   # optional: BLOB_NAME="BaseLine.xlsx" (default)
"""


# -------------------- STRICT LOADERS --------------------
def _read_xlsx_from_blob_sas_url(blob_sas_url: str) -> pd.DataFrame:
    """Download BaseLine.xlsx via a single Blob SAS URL (exact file)."""
    # Quick sanity: enforce URL targets REQUIRED_BLOB_NAME
    lower = blob_sas_url.lower()
    if not (lower.endswith(REQUIRED_BLOB_NAME.lower()) or f"/{REQUIRED_BLOB_NAME.lower()}?" in lower):
        raise FileNotFoundError(f"BLOB_SAS_URL must point to '{REQUIRED_BLOB_NAME}'.")
    if BlobClient is None:
        import requests
        r = requests.get(blob_sas_url)
        r.raise_for_status()
        return pd.read_excel(io.BytesIO(r.content))
    data = BlobClient.from_blob_url(blob_sas_url).download_blob().readall()
    return pd.read_excel(io.BytesIO(data))

def _strict_read_blob_from_container_sas(container_url: str, sas_token, blob_name: str):
    """
    Accepts either:
    - combined container SAS in container_url (has '?'), or
    - split mode: container_url (no '?') + sas_token ("?sv=...").
    Builds: https://<acct>.blob.core.windows.net/<container>/<blob>?<token>
    """
    import io, requests, pandas as pd
    from urllib.parse import urlsplit, urlunsplit

    if "?" in container_url:
        # Combined mode from Azure portal
        parts = urlsplit(container_url)
        if not parts.query:
            raise ValueError("Container URL has '?' but no query string.")
        # Insert '/BaseLine.xlsx' before the query
        path = parts.path.rstrip("/") + "/" + blob_name
        blob_url = urlunsplit((parts.scheme, parts.netloc, path, parts.query, ""))  # keep same token
    else:
        # Split mode (old behavior)
        if not sas_token:
            raise ValueError("AZURE_CONTAINER_SAS is required when container URL has no query.")
        if not sas_token.startswith("?"):
            sas_token = "?" + sas_token
        blob_url = container_url.rstrip("/") + "/" + blob_name + sas_token

    # Optional: print safe URL (without sig) for debugging
    safe = blob_url.split("&sig=")[0]
    print(f"🔐 Fetching: {safe}")

    r = requests.get(blob_url, stream=True)
    if r.status_code == 200:
        return pd.read_excel(io.BytesIO(r.content))
    if r.status_code == 404:
        raise FileNotFoundError(f"'{blob_name}' not found in container.")
    if r.status_code == 403:
        raise PermissionError("403 Forbidden: SAS lacks 'r', expired times, or IP restriction (sip) mismatch.")
    raise RuntimeError(f"Unexpected status {r.status_code} fetching blob.")





def _strict_read_blob_from_conn_str(conn_str: str, container: str, blob_name: str):
    """Read exactly BaseLine.xlsx via connection string. Raises if missing."""
    if BlobServiceClient is None:
        raise RuntimeError("azure-storage-blob is required for connection-string reads (pip install azure-storage-blob).")
    bsc = BlobServiceClient.from_connection_string(conn_str)
    cont = bsc.get_container_client(container)
    bc = cont.get_blob_client(blob_name)
    if not bc.exists():
        raise FileNotFoundError(f"Required blob '{blob_name}' not found in container '{container}'.")
    data = bc.download_blob().readall()
    return pd.read_excel(io.BytesIO(data))


def _load_baseline_df():
    """STRICT: load only 'BaseLine.xlsx' from Azure. If missing/inaccessible, raise. No local fallback."""
    blob_sas_url = os.getenv("BLOB_SAS_URL")
    container_url = os.getenv("AZURE_CONTAINER_URL")
    sas_token = os.getenv("AZURE_CONTAINER_SAS")
    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container = os.getenv("CONTAINER_NAME")
    blob_name = REQUIRED_BLOB_NAME  # enforced exact name

    modes = sum(bool(x) for x in [blob_sas_url, (container_url and sas_token), (conn_str and container)])
    if modes != 1:
        raise RuntimeError(
            "Configure exactly ONE source:\n"
            "1) BLOB_SAS_URL (must point to BaseLine.xlsx), OR\n"
            "2) AZURE_CONTAINER_URL + AZURE_CONTAINER_SAS, OR\n"
            "3) AZURE_STORAGE_CONNECTION_STRING + CONTAINER_NAME"
        )

    if blob_sas_url:
        print("🔐 Loading BaseLine.xlsx via BLOB_SAS_URL (strict)")
        return _read_xlsx_from_blob_sas_url(blob_sas_url)

    if container_url and sas_token:
        print("🔐 Loading BaseLine.xlsx via Container SAS (strict)")
        return _strict_read_blob_from_container_sas(container_url, sas_token, blob_name)

    # connection string
    print("🔐 Loading BaseLine.xlsx via Connection String (strict)")
    return _strict_read_blob_from_conn_str(conn_str, container, blob_name)


def _load_data_xlsx():
    """Load 'data.xlsx' from Azure (same location as BaseLine.xlsx)."""
    container_url = os.getenv("AZURE_CONTAINER_URL")
    sas_token = os.getenv("AZURE_CONTAINER_SAS")
    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container = os.getenv("CONTAINER_NAME")
    blob_name = "data.xlsx"  # hardcoded to data.xlsx

    modes = sum(bool(x) for x in [(container_url and sas_token), (conn_str and container)])
    if modes != 1:
        raise RuntimeError(
            "Configure exactly ONE source:\n"
            "1) AZURE_CONTAINER_URL + AZURE_CONTAINER_SAS, OR\n"
            "2) AZURE_STORAGE_CONNECTION_STRING + CONTAINER_NAME"
        )

    if container_url and sas_token:
        print("🔐 Loading data.xlsx via Container SAS")
        return _strict_read_blob_from_container_sas(container_url, sas_token, blob_name)

    # connection string
    print("🔐 Loading data.xlsx via Connection String")
    return _strict_read_blob_from_conn_str(conn_str, container, blob_name)


def _load_device_yield_xlsx():
    """Load 'Device_Yield.xlsx' from Azure (same location as BaseLine.xlsx)."""
    container_url = os.getenv("AZURE_CONTAINER_URL")
    sas_token = os.getenv("AZURE_CONTAINER_SAS")
    conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
    container = os.getenv("CONTAINER_NAME")
    blob_name = "Device_Yield.xlsx"

    modes = sum(bool(x) for x in [(container_url and sas_token), (conn_str and container)])
    if modes != 1:
        raise RuntimeError(
            "Configure exactly ONE source:\n"
            "1) AZURE_CONTAINER_URL + AZURE_CONTAINER_SAS, OR\n"
            "2) AZURE_STORAGE_CONNECTION_STRING + CONTAINER_NAME"
        )

    if container_url and sas_token:
        print("🔐 Loading Device_Yield.xlsx via Container SAS")
        return _strict_read_blob_from_container_sas(container_url, sas_token, blob_name)

    # connection string
    print("🔐 Loading Device_Yield.xlsx via Connection String")
    return _strict_read_blob_from_conn_str(conn_str, container, blob_name)



# -------------------- STATS HELPERS --------------------
def calculate_box_plot_stats(values):
    """Calculate box plot statistics from a list of values (keeps your original 'count = len/4')."""
    if not values or len(values) == 0:
        return {
            'min': 0, 'q1': 0, 'median': 0, 'q3': 0, 'max': 0,
            'mean': 0, 'std': 0, 'count': 0
        }

    sorted_values = sorted(values)
    n = len(sorted_values)

    if n >= 4:
        q_values = quantiles(sorted_values, n=4)
        q1, median_val, q3 = q_values[0], q_values[1], q_values[2]
    else:
        q1 = sorted_values[0]
        median_val = median(sorted_values)
        q3 = sorted_values[-1]

    return {
        'min': round(min(sorted_values), 2),
        'q1': round(q1, 2),
        'median': round(median_val, 2),
        'q3': round(q3, 2),
        'max': round(max(sorted_values), 2),
        'mean': round(mean(sorted_values), 2),
        'std': round(stdev(sorted_values) if len(sorted_values) > 1 else 0, 2),
        'count': len(sorted_values) / 4  # preserved from your code
    }


# -------------------- CORE EXTRACTORS (STRICT) --------------------
def extract_chart_data():
    """Extract chart data from strictly-loaded BaseLine.xlsx."""
    parameter_mapping = {
        'PCE': 'PCE (%)_AVG',
        'FF': 'FF (%)_AVG',
        'Max Power': 'Max Power (mW/cm2)_AVG',
        'HI': 'HI (%)_AVG',
        'I_sc': 'J_sc (mA/cm2)_AVG',
        'V_oc': 'V_oc (V)_AVG',
        'R_series': 'R_series (Ohm.cm2)_AVG',
        'R_shunt': 'R_shunt (Ohm.cm2)_AVG'
    }
    empty_stats = {'min': 0, 'q1': 0, 'median': 0, 'q3': 0, 'max': 0, 'mean': 0, 'std': 0, 'count': 0}
    chart_data = {k: [] for k in parameter_mapping}

    df = _load_baseline_df()  # <-- will raise if BaseLine.xlsx not accessible
    print(f"✅ Excel loaded. Shape: {df.shape}")

    batch_column = next((c for c in df.columns if 'batch' in str(c).lower() or 'id' in str(c).lower()), None)
    batches = df[batch_column].unique() if batch_column else ['Baseline']
    colmap = {str(c).upper(): c for c in df.columns}

    for param, col in parameter_mapping.items():
        col_key = colmap.get(col.upper())
        if not col_key:
            # Try fuzzy match
            for alt in df.columns:
                if param.lower() in str(alt).lower():
                    col_key = alt
                    print(f"✅ Using alternative for {param}: {alt}")
                    break
        if not col_key:
            s = dict(empty_stats); s['batch'] = 'No Data'
            chart_data[param].append(s)
            continue

        if batch_column:
            for b in batches:
                vals = pd.to_numeric(df.loc[df[batch_column] == b, col_key], errors='coerce').dropna().tolist()
                s = calculate_box_plot_stats(vals) if vals else dict(empty_stats)
                s['batch'] = str(b)
                chart_data[param].append(s)
        else:
            vals = pd.to_numeric(df[col_key], errors='coerce').dropna().tolist()
            s = calculate_box_plot_stats(vals) if vals else dict(empty_stats)
            s['batch'] = 'Baseline'
            chart_data[param].append(s)

    return chart_data


def extract_device_yield_data():
    """
    Extract device yield data from Device_Yield.xlsx.
    Returns line graph data:
    - X-axis: Batch IDs
    - Y-axis (Primary): Yield Percentage (45-100%)
    - Y-axis (Secondary): Total Pixels per batch
    - Card shows Overall Device Yield %
    - Individual parameter yields (FF, J_sc, Max Power, PCE, R_series, R_shunt, V_oc)
    """
    print("📊 Loading Device Yield data from Device_Yield.xlsx...")
    df = _load_device_yield_xlsx()
    
    # Find Batch ID column
    batch_column = next((c for c in df.columns if 'batch' in str(c).lower()), None)
    if not batch_column:
        raise ValueError("No Batch ID column found in Device_Yield.xlsx")
    
    # Get unique batches (sorted)
    batches = sorted(df[batch_column].unique())
    print(f"✅ Found {len(batches)} batches: {batches}")
    
    # Find Total_Pixels and parameter failure columns
    total_pixels_col = next((c for c in df.columns if 'total_pixels' in str(c).lower() and 'failed' not in str(c).lower()), None)
    failed_pixels_col = next((c for c in df.columns if 'total_failed_pixels' in str(c).lower()), None)
    
    if not total_pixels_col or not failed_pixels_col:
        raise ValueError("Missing Total_Pixels or Total_Failed_Pixels columns in Device_Yield.xlsx")
    
    # Parameter failure columns
    param_columns = {
        'FF': next((c for c in df.columns if c == 'FF' or 'ff (' in str(c).lower()), None),
        'J_sc': next((c for c in df.columns if c == 'J_sc' or 'j_sc (' in str(c).lower() or 'jsc' in str(c).lower()), None),
        'Max Power': next((c for c in df.columns if 'max power' in str(c).lower() or 'maxpower' in str(c).lower()), None),
        'PCE': next((c for c in df.columns if c == 'PCE' or 'pce (' in str(c).lower()), None),
        'R_series': next((c for c in df.columns if 'r_series' in str(c).lower() or 'rseries' in str(c).lower()), None),
        'R_shunt': next((c for c in df.columns if 'r_shunt' in str(c).lower() or 'rshunt' in str(c).lower()), None),
        'V_oc': next((c for c in df.columns if c == 'V_oc' or 'v_oc (' in str(c).lower() or 'voc' in str(c).lower()), None)
    }
    
    # Build result structure
    result = {
        'batches': [str(b) for b in batches],
        'yield_percentages': [],  # Overall yield % per batch
        'total_pixels': [],  # Total pixels per batch (for secondary axis)
        'failed_pixels': [],  # Failed pixels per batch (for reference)
        'parameter_yields': {}  # Individual parameter yields
    }
    
    # Initialize parameter yields
    for param in param_columns.keys():
        result['parameter_yields'][param] = []
    
    # Extract data for each batch
    total_all_pixels = 0
    total_all_failed = 0
    
    for batch in batches:
        batch_data = df[df[batch_column] == batch]
        if not batch_data.empty:
            total_px = batch_data[total_pixels_col].iloc[0]
            failed_px = batch_data[failed_pixels_col].iloc[0]
            
            total_px = int(total_px) if pd.notna(total_px) else 0
            failed_px = int(failed_px) if pd.notna(failed_px) else 0
            
            # Calculate overall yield percentage for this batch
            yield_pct = ((total_px - failed_px) / total_px * 100) if total_px > 0 else 0
            
            result['total_pixels'].append(total_px)
            result['failed_pixels'].append(failed_px)
            result['yield_percentages'].append(round(yield_pct, 2))
            
            # Calculate individual parameter yields
            for param, col_name in param_columns.items():
                if col_name:
                    param_failed = batch_data[col_name].iloc[0]
                    param_failed = int(param_failed) if pd.notna(param_failed) else 0
                    param_yield = ((total_px - param_failed) / total_px * 100) if total_px > 0 else 0
                    result['parameter_yields'][param].append(round(param_yield, 2))
                else:
                    result['parameter_yields'][param].append(0)
            
            total_all_pixels += total_px
            total_all_failed += failed_px
        else:
            result['total_pixels'].append(0)
            result['failed_pixels'].append(0)
            result['yield_percentages'].append(0)
            for param in param_columns.keys():
                result['parameter_yields'][param].append(0)
    
    # Calculate overall yield
    overall_yield = ((total_all_pixels - total_all_failed) / total_all_pixels * 100) if total_all_pixels > 0 else 0
    result['overall_yield'] = round(overall_yield, 2)
    
    print(f"  ✅ Overall Yield %: {result['yield_percentages']}")
    print(f"  ✅ Total Pixels: {result['total_pixels']}")
    print(f"  ✅ Parameter Yields:")
    for param, yields in result['parameter_yields'].items():
        print(f"     - {param}: {yields}")
    print(f"✅ Overall Device Yield: {overall_yield:.2f}%")
    print(f"✅ Device Yield data extracted successfully")
    
    return result


def extract_iv_repeatability_data():
    """Extract IV repeatability (daily avg + CV for last 10 days) from data.xlsx."""
    df = _load_data_xlsx()  # Changed from _load_baseline_df() to use data.xlsx

    date_column = next((c for c in df.columns if 'date' in str(c).lower()), None)
    if not date_column:
        raise ValueError("No date column found for IV repeatability analysis.")

    colmap = {str(c).upper(): c for c in df.columns}
    # Updated to include all 8 parameters matching charts_api.py
    iv_parameters = {
        'PCE': 'PCE (%)_AVG',
        'FF': 'FF (%)_AVG',
        'Max Power': 'Max Power (mW/cm2)_AVG',
        'HI': 'HI (%)_AVG',
        'I_sc': 'J_sc (mA/cm2)_AVG',
        'V_oc': 'V_oc (V)_AVG',
        'R_series': 'R_series (Ohm.cm2)_AVG',
        'R_shunt': 'R_shunt (Ohm.cm2)_AVG'
    }

    # Convert to datetime (handles Excel serials)
    if str(df[date_column].dtype) in ('float64', 'int64'):
        try:
            df[date_column] = pd.to_datetime(df[date_column], origin='1899-12-30', unit='D')
        except Exception:
            df[date_column] = pd.to_datetime(df[date_column], unit='D', origin='unix')
    else:
        df[date_column] = pd.to_datetime(df[date_column], errors='coerce')

    df = df.dropna(subset=[date_column])
    if df.empty:
        raise ValueError("No valid dates found.")

    df = df.sort_values(by=date_column)
    df['date_only'] = df[date_column].dt.date
    unique_dates = sorted(df['date_only'].unique())
    last_10 = unique_dates[-10:] if len(unique_dates) >= 10 else unique_dates

    daily_data = []
    for d in last_10:
        day_df = df[df['date_only'] == d]
        point = {'date': d.strftime('%Y-%m-%d'), 'date_short': d.strftime('%m/%d')}

        for param, col_name in iv_parameters.items():
            col_key = colmap.get(col_name.upper())
            if col_key and col_key in day_df.columns:
                vals = pd.to_numeric(day_df[col_key], errors='coerce').dropna()
                if len(vals) > 0:
                    avg = round(mean(vals), 3)
                    cv = round((stdev(vals) / avg * 100), 3) if len(vals) > 1 and avg != 0 else 0
                    point[f'{param}_avg'] = avg
                    point[f'{param}_cv'] = cv
                else:
                    point[f'{param}_avg'] = 0
                    point[f'{param}_cv'] = 0
            else:
                point[f'{param}_avg'] = 0
                point[f'{param}_cv'] = 0

        daily_data.append(point)

    print(f"✅ Processed {len(daily_data)} days of IV repeatability data from data.xlsx")
    return {
        'dates': [p['date'] for p in daily_data],
        'repeatability_data': daily_data,
        'parameters': ['PCE', 'FF', 'Max Power', 'HI', 'I_sc', 'V_oc', 'R_series', 'R_shunt']  # Updated to match charts_api.py
    }


# -------------------- SIMPLE GETTERS --------------------
def get_parameter_data(parameter):
    all_data = extract_chart_data() 
    return all_data.get(parameter, [])

def get_all_parameters():
    return ['PCE', 'FF', 'Max Power', 'HI', 'I_sc', 'V_oc', 'R_series', 'R_shunt']


# -------------------- ALL DATA FUNCTIONS --------------------
def get_all_data_info():
    """Scan data.xlsx and return batch and sheet information."""
    try:
        df = _load_data_xlsx()
        
        # Get unique batches
        batch_column = None
        for col in df.columns:
            if 'batch' in str(col).lower():
                batch_column = col
                break
        
        if not batch_column:
            raise ValueError("No batch column found in data.xlsx")
        
        batches = sorted(df[batch_column].dropna().unique().astype(str))
        
        # Get sheets information for each batch
        batch_sheets = {}
        sheet_column = None
        for col in df.columns:
            if 'sheet' in str(col).lower() or 'sample' in str(col).lower():
                sheet_column = col
                break
        
        if sheet_column:
            for batch in batches:
                batch_df = df[df[batch_column].astype(str) == batch]
                sheets = sorted(batch_df[sheet_column].dropna().unique().astype(str))
                batch_sheets[batch] = sheets
        else:
            # If no sheet column, create dummy sheets
            for batch in batches:
                batch_sheets[batch] = ['S001', 'S002', 'S003']  # Default sheets
        
        return {
            'batches': batches,
            'batch_sheets': batch_sheets,
            'total_batches': len(batches),
            'parameters': ['PCE', 'FF', 'Max Power', 'HI', 'I_sc', 'V_oc', 'R_series', 'R_shunt']
        }
        
    except Exception as e:
        print(f"Error getting all data info: {e}")
        return {
            'batches': [],
            'batch_sheets': {},
            'total_batches': 0,
            'parameters': ['PCE', 'FF', 'Max Power', 'HI', 'I_sc', 'V_oc', 'R_series', 'R_shunt']
        }


def get_all_data_boxplot(batches, parameters):
    """Generate box plot data for selected batches and parameters."""
    try:
        df = _load_data_xlsx()
        
        # Find batch column
        batch_column = None
        for col in df.columns:
            if 'batch' in str(col).lower():
                batch_column = col
                break
        
        if not batch_column:
            raise ValueError("No batch column found")
        
        # Find baseline column
        baseline_column = None
        for col in df.columns:
            if 'baseline' in str(col).lower():
                baseline_column = col
                break
        
        if baseline_column:
            print(f"\n✅ Baseline column found: '{baseline_column}'")
            print(f"   Unique values: {df[baseline_column].unique()}")
            print(f"   Value counts:\n{df[baseline_column].value_counts()}")
            
            # Check for "Yes" values
            baseline_values_str = df[baseline_column].astype(str).str.strip().str.lower()
            yes_count = baseline_values_str.isin(['yes', 'y', 'true', 't', '1']).sum()
            no_count = (baseline_values_str.isin(['no', 'n', 'false', 'f', '0', 'nan', '']) | df[baseline_column].isna()).sum()
            
            print(f"   🔍 Detection results:")
            print(f"      - 'Yes' entries (will be RED boxes): {yes_count}")
            print(f"      - 'No' entries (will be BLUE boxes): {no_count}")
            
            if yes_count == 0:
                print(f"   ⚠️ WARNING: No 'Yes' baseline data found! All data will show as normal (BLUE) boxes only.")
            else:
                print(f"   ✅ Found {yes_count} baseline measurements - you should see RED dashed boxes!")
        else:
            print("ℹ️ No baseline column found in data")
        
        # Filter by selected batches
        df_filtered = df[df[batch_column].astype(str).isin(batches)]
        
        # Parameter column mapping
        param_mapping = {
            'PCE': 'PCE (%)_AVG',
            'FF': 'FF (%)_AVG',
            'Max Power': 'Max Power (mW/cm2)_AVG',
            'HI': 'HI (%)_AVG',
            'I_sc': 'J_sc (mA/cm2)_AVG',
            'V_oc': 'V_oc (V)_AVG',
            'R_series': 'R_series (Ohm.cm2)_AVG',
            'R_shunt': 'R_shunt (Ohm.cm2)_AVG'
        }
        
        boxplot_data = {}
        
        for param in parameters:
            if param in param_mapping:
                col_name = param_mapping[param]
                # Try to find the column (case insensitive)
                actual_col = None
                for col in df.columns:
                    if str(col).upper() == col_name.upper():
                        actual_col = col
                        break
                
                if actual_col and actual_col in df_filtered.columns:
                    # Group by batch (and baseline if exists) and calculate statistics
                    batch_stats = []
                    for batch in batches:
                        batch_df = df_filtered[df_filtered[batch_column].astype(str) == batch]
                        
                        if baseline_column and baseline_column in batch_df.columns:
                            # Split by baseline: Normal (No/False/0) and Baseline (Yes/True/1)
                            baseline_values_str = batch_df[baseline_column].astype(str).str.strip().str.lower()
                            has_yes = baseline_values_str.isin(['yes', 'y', 'true', 't', '1']).any()
                            has_no = (baseline_values_str.isin(['no', 'n', 'false', 'f', '0', 'nan', '']) | batch_df[baseline_column].isna()).any()
                            
                            print(f"   Batch {batch}: has_yes={has_yes}, has_no={has_no}")
                            
                            for is_baseline in [False, True]:
                                # Handle multiple baseline value types
                                if is_baseline:
                                    # Baseline = "yes", "Yes", "true", "True", "1", 1, True, etc.
                                    mask = baseline_values_str.isin(['yes', 'y', 'true', 't', '1'])
                                else:
                                    # Normal = "no", "No", "false", "False", "0", 0, False, empty, NaN, etc.
                                    mask = (baseline_values_str.isin(['no', 'n', 'false', 'f', '0', 'nan', ''])) | (batch_df[baseline_column].isna())
                                
                                baseline_df = batch_df[mask]
                                batch_data = pd.to_numeric(baseline_df[actual_col], errors='coerce').dropna()
                                
                                if len(batch_data) > 0:
                                    try:
                                        q1 = batch_data.quantile(0.25)
                                        q2 = batch_data.quantile(0.5)  # median
                                        q3 = batch_data.quantile(0.75)
                                        iqr = q3 - q1
                                        lower_whisker = max(batch_data.min(), q1 - 1.5 * iqr)
                                        upper_whisker = min(batch_data.max(), q3 + 1.5 * iqr)
                                        
                                        # Add suffix to batch name for clarity
                                        batch_name = f"{batch} (Baseline)" if is_baseline else f"{batch} (Normal)"
                                        
                                        batch_stats.append({
                                            'batch': batch_name,
                                            'is_baseline': is_baseline,
                                            'min': float(batch_data.min()),
                                            'q1': float(q1),
                                            'median': float(q2),
                                            'q3': float(q3),
                                            'max': float(batch_data.max()),
                                            'lower_whisker': float(lower_whisker),
                                            'upper_whisker': float(upper_whisker),
                                            'mean': float(batch_data.mean()),
                                            'std': float(batch_data.std()) if len(batch_data) > 1 else 0.0,
                                            'count': len(batch_data)
                                        })
                                    except Exception as e:
                                        print(f"Error calculating stats for {batch} (baseline={is_baseline}): {e}")
                        else:
                            # No baseline column, use original logic
                            batch_data = pd.to_numeric(batch_df[actual_col], errors='coerce').dropna()
                            
                            if len(batch_data) > 0:
                                try:
                                    q1 = batch_data.quantile(0.25)
                                    q2 = batch_data.quantile(0.5)  # median
                                    q3 = batch_data.quantile(0.75)
                                    iqr = q3 - q1
                                    lower_whisker = max(batch_data.min(), q1 - 1.5 * iqr)
                                    upper_whisker = min(batch_data.max(), q3 + 1.5 * iqr)
                                    
                                    batch_stats.append({
                                        'batch': batch,
                                        'is_baseline': False,
                                        'min': float(batch_data.min()),
                                        'q1': float(q1),
                                        'median': float(q2),
                                        'q3': float(q3),
                                        'max': float(batch_data.max()),
                                        'lower_whisker': float(lower_whisker),
                                        'upper_whisker': float(upper_whisker),
                                        'mean': float(batch_data.mean()),
                                        'std': float(batch_data.std()) if len(batch_data) > 1 else 0.0,
                                        'count': len(batch_data)
                                    })
                                except Exception as e:
                                    print(f"Error calculating stats for {batch}: {e}")
                    
                    boxplot_data[param] = batch_stats
        
        return boxplot_data
        
    except Exception as e:
        print(f"Error generating boxplot data: {e}")
        return {}


def get_all_data_sheet_boxplot(sheets, parameters):
    """Generate box plot data for selected sheets and parameters (grouped by batch)."""
    try:
        df = _load_data_xlsx()
        
        # Find batch, sheet, and baseline columns
        batch_column = None
        sheet_column = None
        baseline_column = None
        
        for col in df.columns:
            if 'batch' in str(col).lower():
                batch_column = col
            elif 'sheet' in str(col).lower() or 'sample' in str(col).lower():
                sheet_column = col
            elif 'baseline' in str(col).lower():
                baseline_column = col
        
        if not batch_column:
            raise ValueError("No batch column found")
        
        # Parameter column mapping
        param_mapping = {
            'PCE': 'PCE (%)',
            'FF': 'FF (%)',
            'Max Power': 'Max Power (mW/cm2)',
            'HI': 'HI (%)',
            'I_sc': 'J_sc (mA/cm2)',
            'V_oc': 'V_oc (V)',
            'R_series': 'R_series (Ohm.cm2)',
            'R_shunt': 'R_shunt (Ohm.cm2)'
        }
        
        # Parse sheet selections (format: "BATCH-SHEET")
        sheet_data = []
        batch_groups = {}  # Group by batch for consistent coloring
        
        for sheet_key in sheets:
            if '-' in sheet_key:
                batch_id, sheet_name = sheet_key.split('-', 1)
                
                # Group sheets by batch
                if batch_id not in batch_groups:
                    batch_groups[batch_id] = []
                
                # Filter data for this batch and sheet
                batch_filter = df[batch_column].astype(str) == batch_id
                
                if sheet_column:
                    sheet_filter = df[sheet_column].astype(str) == sheet_name
                    filtered_df = df[batch_filter & sheet_filter]
                else:
                    # If no sheet column, just use batch data
                    filtered_df = df[batch_filter]
                
                if not filtered_df.empty:
                    # Check if we need to split by baseline
                    if baseline_column and baseline_column in filtered_df.columns:
                        # Create two sheet points: one for normal, one for baseline
                        for is_baseline in [False, True]:
                            # Handle multiple baseline value types
                            baseline_values_str = filtered_df[baseline_column].astype(str).str.strip().str.lower()
                            
                            if is_baseline:
                                # Baseline = "yes", "Yes", "true", "True", "1", 1, True, etc.
                                mask = baseline_values_str.isin(['yes', 'y', 'true', 't', '1'])
                            else:
                                # Normal = "no", "No", "false", "False", "0", 0, False, empty, NaN, etc.
                                mask = (baseline_values_str.isin(['no', 'n', 'false', 'f', '0', 'nan', ''])) | (filtered_df[baseline_column].isna())
                            
                            baseline_df = filtered_df[mask]
                            
                            if not baseline_df.empty:
                                baseline_suffix = ' (Baseline)' if is_baseline else ''
                                sheet_point = {
                                    'sheet': sheet_key + baseline_suffix, 
                                    'batch': batch_id, 
                                    'sheet_name': sheet_name + baseline_suffix,
                                    'is_baseline': is_baseline
                                }
                                
                                for param in parameters:
                                    if param in param_mapping:
                                        col_name = param_mapping[param]
                                        # Find actual column (case insensitive)
                                        actual_col = None
                                        for col in df.columns:
                                            if str(col).upper() == col_name.upper():
                                                actual_col = col
                                                break
                                        
                                        if actual_col and actual_col in baseline_df.columns:
                                            param_data = pd.to_numeric(baseline_df[actual_col], errors='coerce').dropna()
                                            if len(param_data) > 0:
                                                # Calculate statistics for box plot
                                                sheet_point[param] = {
                                                    'values': param_data.tolist(),
                                                    'min': float(param_data.min()),
                                                    'q1': float(param_data.quantile(0.25)),
                                                    'median': float(param_data.quantile(0.5)),
                                                    'q3': float(param_data.quantile(0.75)),
                                                    'max': float(param_data.max()),
                                                    'mean': float(param_data.mean()),
                                                    'count': len(param_data)
                                                }
                                            else:
                                                sheet_point[param] = None
                                        else:
                                            sheet_point[param] = None
                                
                                sheet_data.append(sheet_point)
                                batch_groups[batch_id].append(sheet_point)
                    else:
                        # No baseline column, use original logic
                        sheet_point = {'sheet': sheet_key, 'batch': batch_id, 'sheet_name': sheet_name, 'is_baseline': False}
                        
                        for param in parameters:
                            if param in param_mapping:
                                col_name = param_mapping[param]
                                # Find actual column (case insensitive)
                                actual_col = None
                                for col in df.columns:
                                    if str(col).upper() == col_name.upper():
                                        actual_col = col
                                        break
                                
                                if actual_col and actual_col in filtered_df.columns:
                                    param_data = pd.to_numeric(filtered_df[actual_col], errors='coerce').dropna()
                                    if len(param_data) > 0:
                                        # Calculate statistics for box plot
                                        sheet_point[param] = {
                                            'values': param_data.tolist(),
                                            'min': float(param_data.min()),
                                            'q1': float(param_data.quantile(0.25)),
                                            'median': float(param_data.quantile(0.5)),
                                            'q3': float(param_data.quantile(0.75)),
                                            'max': float(param_data.max()),
                                            'mean': float(param_data.mean()),
                                            'count': len(param_data)
                                        }
                                    else:
                                        sheet_point[param] = None
                                else:
                                    sheet_point[param] = None
                        
                        sheet_data.append(sheet_point)
                        batch_groups[batch_id].append(sheet_point)
        
        return {
            'data': sheet_data,
            'batch_groups': batch_groups,
            'parameters': parameters
        }
        
    except Exception as e:
        print(f"Error generating sheet box plot data: {e}")
        return {'data': [], 'batch_groups': {}, 'parameters': parameters}


def get_all_data_linechart(sheets, parameters):
    """Generate line chart data for selected sheets and parameters."""
    try:
        df = _load_data_xlsx()
        
        # Find batch and sheet columns
        batch_column = None
        sheet_column = None
        
        for col in df.columns:
            if 'batch' in str(col).lower():
                batch_column = col
            elif 'sheet' in str(col).lower() or 'sample' in str(col).lower():
                sheet_column = col
        
        if not batch_column:
            raise ValueError("No batch column found")
        
        # Parameter column mapping
        param_mapping = {
            'PCE': 'PCE (%)',
            'FF': 'FF (%)',
            'Max Power': 'Max Power (mW/cm2)',
            'HI': 'HI (%)',
            'I_sc': 'J_sc (mA/cm2)',
            'V_oc': 'V_oc (V)',
            'R_series': 'R_series (Ohm.cm2)',
            'R_shunt': 'R_shunt (Ohm.cm2)'
        }
        
        # Parse sheet selections (format: "BATCH-SHEET")
        sheet_data = []
        for sheet_key in sheets:
            if '-' in sheet_key:
                batch_id, sheet_name = sheet_key.split('-', 1)
                
                # Filter data for this batch and sheet
                batch_filter = df[batch_column].astype(str) == batch_id
                
                if sheet_column:
                    sheet_filter = df[sheet_column].astype(str) == sheet_name
                    filtered_df = df[batch_filter & sheet_filter]
                else:
                    # If no sheet column, just use batch data
                    filtered_df = df[batch_filter]
                
                if not filtered_df.empty:
                    # Get data for each parameter
                    sheet_point = {'sheet': sheet_key, 'batch': batch_id, 'sheet_name': sheet_name}
                    
                    for param in parameters:
                        if param in param_mapping:
                            col_name = param_mapping[param]
                            # Find actual column (case insensitive)
                            actual_col = None
                            for col in df.columns:
                                if str(col).upper() == col_name.upper():
                                    actual_col = col
                                    break
                            
                            if actual_col and actual_col in filtered_df.columns:
                                param_data = pd.to_numeric(filtered_df[actual_col], errors='coerce').dropna()
                                if len(param_data) > 0:
                                    sheet_point[param] = float(param_data.mean())  # Use mean of sheet data
                                else:
                                    sheet_point[param] = None
                            else:
                                sheet_point[param] = None
                    
                    sheet_data.append(sheet_point)
        
        return {
            'data': sheet_data,
            'parameters': parameters
        }
        
    except Exception as e:
        print(f"Error generating line chart data: {e}")
        return {'data': [], 'parameters': parameters}


def get_all_data_full():
    """
    Prefetch ALL data at once for frontend caching.
    Returns complete statistics for all batches and all sheets.
    This eliminates the need for repeated Azure fetches on every selection change.
    """
    try:
        print("🚀 Loading complete dataset from Azure for prefetching...")
        df = _load_data_xlsx()
        
        # Find batch, sheet, and baseline columns
        batch_column = None
        sheet_column = None
        baseline_column = None
        
        for col in df.columns:
            if 'batch' in str(col).lower():
                batch_column = col
            elif 'sheet' in str(col).lower() or 'sample' in str(col).lower():
                sheet_column = col
            elif 'baseline' in str(col).lower():
                baseline_column = col
        
        if not batch_column:
            raise ValueError("No batch column found in data.xlsx")
        
        # Check baseline data
        if baseline_column:
            print(f"\n✅ Baseline column found: '{baseline_column}'")
            baseline_values_str = df[baseline_column].astype(str).str.strip().str.lower()
            yes_count = baseline_values_str.isin(['yes', 'y', 'true', 't', '1']).sum()
            no_count = (baseline_values_str.isin(['no', 'n', 'false', 'f', '0', 'nan', '']) | df[baseline_column].isna()).sum()
            
            print(f"   🔍 Baseline data summary:")
            print(f"      - 'Yes' entries (RED boxes): {yes_count}")
            print(f"      - 'No' entries (BLUE boxes): {no_count}")
            
            if yes_count == 0:
                print(f"   ⚠️  WARNING: No 'Yes' baseline data! All boxes will be BLUE (normal data only)")
            else:
                print(f"   ✅ You should see both BLUE (normal) and RED (baseline) boxes!")
        else:
            print("ℹ️  No baseline column found in data")
        
        # Parameter column mapping
        param_mapping = {
            'PCE': 'PCE (%)',
            'FF': 'FF (%)',
            'Max Power': 'Max Power (mW/cm2)',
            'HI': 'HI (%)',
            'I_sc': 'J_sc (mA/cm2)',
            'V_oc': 'V_oc (V)',
            'R_series': 'R_series (Ohm.cm2)',
            'R_shunt': 'R_shunt (Ohm.cm2)'
        }
        
        all_parameters = list(param_mapping.keys())
        batches = sorted(df[batch_column].dropna().unique().astype(str))
        
        # ========== BATCH-LEVEL STATISTICS ==========
        print("📊 Processing batch-level statistics...")
        print(f"   🔍 Found {len(batches)} unique batches to process")
        batch_stats = {}
        created_batch_names = []
        
        for param in all_parameters:
            col_name = param_mapping[param]
            actual_col = None
            
            # Find actual column (case insensitive)
            for col in df.columns:
                if str(col).upper() == col_name.upper():
                    actual_col = col
                    break
            
            if actual_col and actual_col in df.columns:
                batch_stats[param] = []
                
                for batch in batches:
                    batch_df = df[df[batch_column].astype(str) == batch]
                    
                    # Split by baseline if column exists
                    if baseline_column and baseline_column in batch_df.columns:
                        baseline_values_str = batch_df[baseline_column].astype(str).str.strip().str.lower()
                        
                        for is_baseline in [False, True]:
                            if is_baseline:
                                mask = baseline_values_str.isin(['yes', 'y', 'true', 't', '1'])
                            else:
                                mask = (baseline_values_str.isin(['no', 'n', 'false', 'f', '0', 'nan', '']) | batch_df[baseline_column].isna())
                            
                            baseline_df = batch_df[mask]
                            batch_data = pd.to_numeric(baseline_df[actual_col], errors='coerce').dropna()
                            
                            if len(batch_data) > 0:
                                batch_name = f"{batch} (Baseline)" if is_baseline else f"{batch} (Normal)"
                                if param == 'PCE' and batch_name not in created_batch_names:  # Log only once per batch
                                    created_batch_names.append(batch_name)
                                batch_stats[param].append({
                                    'batch': batch_name,
                                    'is_baseline': is_baseline,
                                    'color': '#ef4444' if is_baseline else '#3b82f6',
                                    'min': float(batch_data.min()),
                                    'q1': float(batch_data.quantile(0.25)),
                                    'median': float(batch_data.quantile(0.5)),
                                    'q3': float(batch_data.quantile(0.75)),
                                    'max': float(batch_data.max()),
                                    'mean': float(batch_data.mean()),
                                    'std': float(batch_data.std()) if len(batch_data) > 1 else 0.0,
                                    'count': len(batch_data)
                                })
                    else:
                        # No baseline column
                        batch_data = pd.to_numeric(batch_df[actual_col], errors='coerce').dropna()
                        
                        if len(batch_data) > 0:
                            batch_stats[param].append({
                                'batch': batch,
                                'is_baseline': False,
                                'color': '#3b82f6',
                                'min': float(batch_data.min()),
                                'q1': float(batch_data.quantile(0.25)),
                                'median': float(batch_data.quantile(0.5)),
                                'q3': float(batch_data.quantile(0.75)),
                                'max': float(batch_data.max()),
                                'mean': float(batch_data.mean()),
                                'std': float(batch_data.std()) if len(batch_data) > 1 else 0.0,
                                'count': len(batch_data)
                            })
        
        # ========== SHEET-LEVEL STATISTICS ==========
        print(f"   ✅ Created {len(created_batch_names)} batch entries with baseline split:")
        for i, name in enumerate(sorted(created_batch_names)[:10]):  # Show first 10
            print(f"      {i+1}. {name}")
        if len(created_batch_names) > 10:
            print(f"      ... and {len(created_batch_names) - 10} more")
        print("📄 Processing sheet-level statistics...")
        sheet_stats = {}
        
        # Get all batch-sheet combinations
        batch_sheets = {}
        if sheet_column:
            for batch in batches:
                batch_df = df[df[batch_column].astype(str) == batch]
                sheets = sorted(batch_df[sheet_column].dropna().unique().astype(str))
                batch_sheets[batch] = sheets
        else:
            # If no sheet column, create dummy sheets
            for batch in batches:
                batch_sheets[batch] = ['S001', 'S002', 'S003']
        
        # Calculate statistics for each sheet
        for batch in batches:
            for sheet_name in batch_sheets[batch]:
                sheet_key = f"{batch}-{sheet_name}"
                sheet_stats[sheet_key] = {
                    'sheet': sheet_key,
                    'batch': batch,
                    'sheet_name': sheet_name
                }
                
                # Filter data for this batch and sheet
                batch_filter = df[batch_column].astype(str) == batch
                
                if sheet_column:
                    sheet_filter = df[sheet_column].astype(str) == sheet_name
                    filtered_df = df[batch_filter & sheet_filter]
                else:
                    filtered_df = df[batch_filter]
                
                if not filtered_df.empty:
                    for param in all_parameters:
                        col_name = param_mapping[param]
                        actual_col = None
                        
                        # Find actual column (case insensitive)
                        for col in df.columns:
                            if str(col).upper() == col_name.upper():
                                actual_col = col
                                break
                        
                        if actual_col and actual_col in filtered_df.columns:
                            param_data = pd.to_numeric(filtered_df[actual_col], errors='coerce').dropna()
                            
                            if len(param_data) > 0:
                                sheet_stats[sheet_key][param] = {
                                    'min': float(param_data.min()),
                                    'q1': float(param_data.quantile(0.25)),
                                    'median': float(param_data.quantile(0.5)),
                                    'q3': float(param_data.quantile(0.75)),
                                    'max': float(param_data.max()),
                                    'mean': float(param_data.mean()),
                                    'count': len(param_data)
                                }
                            else:
                                sheet_stats[sheet_key][param] = None
                        else:
                            sheet_stats[sheet_key][param] = None
        
        print(f"✅ Prefetch complete: {len(batches)} batches, {len(sheet_stats)} sheets, {len(all_parameters)} parameters")
        
        return {
            'batches': batches,
            'batch_sheets': batch_sheets,
            'parameters': all_parameters,
            'batch_stats': batch_stats,
            'sheet_stats': sheet_stats,
            'total_batches': len(batches),
            'total_sheets': len(sheet_stats)
        }
        
    except Exception as e:
        print(f"❌ Error in get_all_data_full: {e}")
        import traceback
        traceback.print_exc()
        return {
            'batches': [],
            'batch_sheets': {},
            'parameters': ['PCE', 'FF', 'Max Power', 'HI', 'I_sc', 'V_oc', 'R_series', 'R_shunt'],
            'batch_stats': {},
            'sheet_stats': {},
            'total_batches': 0,
            'total_sheets': 0,
            'error': str(e)
        }
