"""
Stability Device Data API
Provides graph data for individual devices from device_FR_averaged.csv
"""

import pandas as pd
import os
from pathlib import Path
from flask import jsonify
import requests
from io import StringIO

class StabilityDeviceDataAPI:
    """API for stability device performance data"""
    
    def __init__(self):
        # Azure configuration for CSV files
        self.azure_container_url = os.getenv('AZURE_CONTAINER_URL')
        self.azure_container_sas = os.getenv('AZURE_CONTAINER_SAS')
        
        # Cache for dataframes with timestamps
        self._fr_df = None
        self._fr_df_timestamp = None
        self._t80_df = None
        self._t80_df_timestamp = None
        
        # Cache TTL in seconds (30 minutes = 1800 seconds)
        self.cache_ttl = 900  # Auto-refresh every 30 minutes - fresh data for LS Station!
        
        # Available parameters for graphing
        self.available_parameters = [
            'PCE', 'Max_Power', 'FF', 'J_sc', 'V_oc', 'HI', 'R_shunt', 'R_series'
        ]
    
    def _download_file_from_azure(self, filename, columns=None):
        """Download file from Azure Blob Storage - supports CSV and Parquet"""
        try:
            if not self.azure_container_url or not self.azure_container_sas:
                print(f"⚠️ Azure credentials not configured")
                return pd.DataFrame()
            
            # Construct blob URL with SAS token
            blob_url = f"{self.azure_container_url}/{filename}?{self.azure_container_sas}"
            
            print(f"📥 Downloading {filename}..." + (f" (columns: {columns})" if columns else ""))
            
            # Download the file
            response = requests.get(blob_url, stream=True)
            response.raise_for_status()
            
            # Check file type
            if filename.endswith('.parquet'):
                # Parquet: MUCH faster, supports column filtering
                import io
                df = pd.read_parquet(
                    io.BytesIO(response.content),
                    columns=columns  # Only load needed columns - HUGE performance boost!
                )
            else:
                # CSV fallback
                df = pd.read_csv(
                    StringIO(response.text),
                    usecols=columns
                )
            
            print(f"✅ Downloaded {filename}: {len(df)} rows, {len(df.columns)} columns")
            return df
            
        except Exception as e:
            print(f"❌ Error downloading {filename} from Azure: {e}")
            return pd.DataFrame()
    
    def _load_fr_data(self, columns=None):
        """Load device_FR_averaged file from Azure - auto-refreshes every 8 hours"""
        import time
        
        # Check if cache is expired (8 hours = 28800 seconds)
        current_time = time.time()
        cache_expired = (
            self._fr_df is None or 
            self._fr_df_timestamp is None or 
            (current_time - self._fr_df_timestamp) > self.cache_ttl
        )
        
        # Load/refresh data if cache is empty or expired
        if cache_expired:
            df = pd.DataFrame()
            
            # Try Parquet first (10-100x faster!) - EXACT filename from Azure
            filename = "device_FR_averaged.parquet"
            if self._fr_df is None:
                print(f"🔍 Loading {filename} with ~1000 samples (FIRST TIME)...")
            else:
                print(f"🔄 Refreshing {filename} (cache expired after 30 minutes)...")
            
            df = self._download_file_from_azure(filename, columns=None)  # Load ALL columns
            
            if df.empty:
                print(f"⚠️ {filename} not found, trying CSV...")
                filename = "device_FR_averaged.csv"
                df = self._download_file_from_azure(filename, columns=None)
            
            if df.empty:
                print(f"❌ Neither Parquet nor CSV found! Check Azure container.")
                print(f"   Container URL: {self.azure_container_url}")
                print(f"   Looking for: device_FR_averaged.parquet or .csv")
            else:
                print(f"✅ Cached {len(df)} rows for ALL devices - valid for 30 minutes")
            
            self._fr_df = df
            self._fr_df_timestamp = current_time
        
        # Filter columns in memory if requested (super fast!)
        if columns and self._fr_df is not None:
            existing_cols = [col for col in columns if col in self._fr_df.columns]
            return self._fr_df[existing_cols] if existing_cols else self._fr_df
        
        return self._fr_df
    
    def _load_t80_data(self):
        """Load T80_summary file from Azure - auto-refreshes every 8 hours"""
        import time
        
        # Check if cache is expired (8 hours)
        current_time = time.time()
        cache_expired = (
            self._t80_df is None or 
            self._t80_df_timestamp is None or 
            (current_time - self._t80_df_timestamp) > self.cache_ttl
        )
        
        if cache_expired:
            # Try Parquet first, fallback to CSV
            filename = "T80_summary.parquet"
            if self._t80_df is None:
                print(f"🔍 Loading {filename}...")
            else:
                print(f"🔄 Refreshing {filename} (cache expired after 8 hours)...")
            
            df = self._download_file_from_azure(filename)
            
            if df.empty:
                filename = "T80_summary.csv"
                df = self._download_file_from_azure(filename)
            
            self._t80_df = df
            self._t80_df_timestamp = current_time
        
        return self._t80_df
    
    def get_device_data(self, device_id):
        """
        Get all performance data for a specific device (LAZY LOADING - only loads this device's data!)
        
        Args:
            device_id: Device identifier (e.g., "B25-65-S005-B2")
            
        Returns:
            dict: Device data including time series and T80 info
        """
        try:
            print(f"🔍 Fetching data for {device_id}...")
            
            # OPTIMIZATION: Only load columns we need for this device
            # This makes it MUCH faster with large files!
            needed_columns = ['Device', 'Device_ID', 'Time_hrs', 'Batch'] + self.available_parameters
            
            # Load only needed columns (Parquet is super fast at this!)
            fr_df = self._load_fr_data(columns=needed_columns)
            t80_df = self._load_t80_data()
            
            if fr_df.empty:
                return jsonify({
                    'success': False,
                    'error': 'Device FR data not available'
                }), 404
            
            # Filter data for this device - check both 'Device' and 'Device_ID' columns
            if 'Device' in fr_df.columns:
                device_data = fr_df[fr_df['Device'] == device_id].copy()
            elif 'Device_ID' in fr_df.columns:
                device_data = fr_df[fr_df['Device_ID'] == device_id].copy()
            else:
                return jsonify({
                    'success': False,
                    'error': 'Device column not found in CSV'
                }), 404
            
            if device_data.empty:
                return jsonify({
                    'success': False,
                    'error': f'No data found for device {device_id}'
                }), 404
            
            # Sort by time
            device_data = device_data.sort_values('Time_hrs')
            
            # Prepare time series data
            time_series = []
            for _, row in device_data.iterrows():
                data_point = {
                    'time_hrs': float(row['Time_hrs']),
                    'batch': int(row['Batch']) if pd.notna(row['Batch']) else 0
                }
                
                # Add all available parameters
                for param in self.available_parameters:
                    if param in row and pd.notna(row[param]):
                        data_point[param] = float(row[param])
                    else:
                        data_point[param] = None
                
                time_series.append(data_point)
            
            # Get T80 info if available from T80 summary
            t80_info = {'has_t80': False}
            if not t80_df.empty:
                # Check for device in T80 summary
                if 'Device' in t80_df.columns:
                    t80_row = t80_df[t80_df['Device'] == device_id]
                elif 'Device_ID' in t80_df.columns:
                    t80_row = t80_df[t80_df['Device_ID'] == device_id]
                else:
                    t80_row = pd.DataFrame()
                
                if not t80_row.empty:
                    t80_row = t80_row.iloc[0]
                    # Check if device has reached T80
                    reached = False
                    if 'Reached_T80' in t80_row:
                        reached = bool(t80_row['Reached_T80']) if pd.notna(t80_row['Reached_T80']) else False
                    
                    t80_info = {
                        'has_t80': reached,
                        't80_hours': float(t80_row['T80_hours']) if 'T80_hours' in t80_row and pd.notna(t80_row['T80_hours']) else None,
                        'initial_pce': float(t80_row['Baseline_PCE']) if 'Baseline_PCE' in t80_row and pd.notna(t80_row['Baseline_PCE']) else None,
                        't80_pce': float(t80_row['Threshold_PCE']) if 'Threshold_PCE' in t80_row and pd.notna(t80_row['Threshold_PCE']) else None
                    }
            
            return jsonify({
                'success': True,
                'device_id': device_id,
                'data_points': len(time_series),
                'time_series': time_series,
                't80_info': t80_info,
                'available_parameters': self.available_parameters
            })
            
        except Exception as e:
            print(f"❌ Error getting device data: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    def get_available_devices(self):
        """Get list of all devices with data"""
        try:
            fr_df = self._load_fr_data()
            
            if fr_df.empty:
                return jsonify({
                    'success': False,
                    'error': 'No device data available'
                }), 404
            
            # Check for both 'Device' and 'Device_ID' columns
            if 'Device' in fr_df.columns:
                devices = sorted(fr_df['Device'].unique().tolist())
            elif 'Device_ID' in fr_df.columns:
                devices = sorted(fr_df['Device_ID'].unique().tolist())
            else:
                devices = []
            
            return jsonify({
                'success': True,
                'devices': devices,
                'count': len(devices)
            })
            
        except Exception as e:
            print(f"❌ Error getting available devices: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    def check_device_t80_status(self, device_id):
        """Check if a device has reached T80"""
        try:
            t80_df = self._load_t80_data()
            
            if t80_df.empty:
                # T80 summary doesn't exist or is empty - this is normal
                return {'has_t80': False}
            
            # Check both 'Device_ID' and 'Device' columns for compatibility
            if 'Device' in t80_df.columns:
                device_t80 = t80_df[t80_df['Device'] == device_id]
            elif 'Device_ID' in t80_df.columns:
                device_t80 = t80_df[t80_df['Device_ID'] == device_id]
            else:
                print(f"⚠️ T80 summary has no Device_ID or Device column")
                return {'has_t80': False}
            
            if device_t80.empty:
                # Device not in T80 summary - hasn't reached T80 yet
                return {'has_t80': False}
            
            # Device found in T80 summary - it has reached T80
            t80_row = device_t80.iloc[0]
            return {
                'has_t80': bool(t80_row['Reached_T80']) if 'Reached_T80' in t80_row and pd.notna(t80_row['Reached_T80']) else False,
                't80_hours': float(t80_row['T80_hours']) if 'T80_hours' in t80_row and pd.notna(t80_row['T80_hours']) else None,
                'initial_pce': float(t80_row['Baseline_PCE']) if 'Baseline_PCE' in t80_row and pd.notna(t80_row['Baseline_PCE']) else None,
                't80_pce': float(t80_row['Threshold_PCE']) if 'Threshold_PCE' in t80_row and pd.notna(t80_row['Threshold_PCE']) else None
            }
            
        except Exception as e:
            print(f"❌ Error checking T80 status for {device_id}: {e}")
            import traceback
            traceback.print_exc()
            return {'has_t80': False}
    
    def refresh_data(self):
        """Clear cache and reload data from files"""
        print("🔄 Force refresh requested - clearing cache...")
        self._fr_df = None
        self._t80_df = None
        self._fr_df_timestamp = None
        self._t80_df_timestamp = None
        
        # Attempt to reload
        fr_df = self._load_fr_data()
        t80_df = self._load_t80_data()
        
        return jsonify({
            'success': True,
            'message': 'Data refreshed successfully',
            'fr_rows': len(fr_df) if not fr_df.empty else 0,
            't80_rows': len(t80_df) if not t80_df.empty else 0
        })
    
    def check_azure_files(self):
        """Check what files are available in Azure - for debugging"""
        try:
            from azure.storage.blob import BlobServiceClient
            
            if not self.azure_container_url or not self.azure_container_sas:
                return jsonify({
                    'success': False,
                    'error': 'Azure credentials not configured'
                }), 500
            
            # Parse container URL
            account_url = '/'.join(self.azure_container_url.split('/')[:3])
            container_name = self.azure_container_url.split('/')[-1]
            
            # Create blob service client
            blob_service_client = BlobServiceClient(
                account_url=f"{account_url}?{self.azure_container_sas}"
            )
            container_client = blob_service_client.get_container_client(container_name)
            
            # List all blobs
            files = []
            for blob in container_client.list_blobs():
                files.append({
                    'name': blob.name,
                    'size': f"{blob.size / (1024*1024):.2f} MB"
                })
            
            return jsonify({
                'success': True,
                'container': container_name,
                'files': files,
                'count': len(files)
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': str(e),
                'container_url': self.azure_container_url
            }), 500
    
    def get_cache_status(self):
        """
        Get cache status - shows if data is cached and when it will expire
        USEFUL FOR TESTING: Check if auto-refresh is working!
        """
        try:
            import time
            from datetime import datetime, timedelta
            
            current_time = time.time()
            
            # Check FR data cache
            fr_status = {
                'cached': self._fr_df is not None,
                'rows': len(self._fr_df) if self._fr_df is not None else 0,
                'devices': len(self._fr_df['Device_ID'].unique()) if self._fr_df is not None and 'Device_ID' in self._fr_df.columns else 0
            }
            
            if self._fr_df_timestamp:
                age_seconds = current_time - self._fr_df_timestamp
                remaining_seconds = self.cache_ttl - age_seconds
                
                fr_status['cached_at'] = datetime.fromtimestamp(self._fr_df_timestamp).strftime('%Y-%m-%d %H:%M:%S')
                fr_status['age_hours'] = round(age_seconds / 3600, 2)
                fr_status['expires_in_hours'] = round(remaining_seconds / 3600, 2)
                fr_status['will_refresh_at'] = datetime.fromtimestamp(self._fr_df_timestamp + self.cache_ttl).strftime('%Y-%m-%d %H:%M:%S')
                fr_status['expired'] = remaining_seconds <= 0
            
            # Check T80 data cache
            t80_status = {
                'cached': self._t80_df is not None,
                'rows': len(self._t80_df) if self._t80_df is not None else 0
            }
            
            if self._t80_df_timestamp:
                age_seconds = current_time - self._t80_df_timestamp
                remaining_seconds = self.cache_ttl - age_seconds
                
                t80_status['cached_at'] = datetime.fromtimestamp(self._t80_df_timestamp).strftime('%Y-%m-%d %H:%M:%S')
                t80_status['age_hours'] = round(age_seconds / 3600, 2)
                t80_status['expires_in_hours'] = round(remaining_seconds / 3600, 2)
                t80_status['expired'] = remaining_seconds <= 0
            
            return jsonify({
                'success': True,
                'cache_ttl_hours': self.cache_ttl / 3600,
                'fr_data': fr_status,
                't80_data': t80_status,
                'current_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            })
            
        except Exception as e:
            print(f"❌ Error getting cache status: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500


# Singleton instance
_device_data_api_instance = None

def get_device_data_api():
    """Get or create the singleton device data API instance"""
    global _device_data_api_instance
    if _device_data_api_instance is None:
        _device_data_api_instance = StabilityDeviceDataAPI()
    return _device_data_api_instance
