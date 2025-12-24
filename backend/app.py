"""
Rayleigh Solar Tech Daily Passdown System - Main Application
Single backend server with modular architecture

This is the main entry point that imports modular APIs:
- charts_api: Handles all chart-related functionality
- data_management_api: Handles all CRUD operations for safety, kudos, and issues
- Testing Push
"""

import os
import sys

# Ensure we're working from the correct directory for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
os.chdir(current_dir)

from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import modular API modules
from charts_api import charts_api
from data_management_api import data_api
from upload_data_api import upload_api
from analysis_api import process_excel_analysis
from stability_api import stability_api
from batch_api_working import get_current_batch_location, batch_health
from batch_task_api import batch_task_api
from track_progress_api import track_progress_bp

# Import cache manager
try:
    from cache_manager import cache_manager
    CACHE_AVAILABLE = True
except ImportError:
    cache_manager = None
    CACHE_AVAILABLE = False
    print("⚠️ Cache manager not available - running without cache")

# Load environment variables from .env file (for local development)
# In production (Render), environment variables are set in Render dashboard
load_dotenv()

# Create Flask app
app = Flask(__name__)

# ==================== CORS CONFIGURATION ====================
# 🔧 DEPLOYMENT GUIDE: Comment/Uncomment the appropriate block before deployment

# 🏠 LOCAL DEVELOPMENT - Uncomment for local development
cors_origins = [
    'http://localhost:5173',  # Local development (Vite default)
    'http://localhost:5174',  # Alternative Vite port
    'http://localhost:3000',  # Alternative local port
    'http://localhost:7071',  # Backend runs on 7071
]

# 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (Render.com backend)
# cors_origins = [
#     'https://*.azurestaticapps.net',  # UAT Azure Static Web Apps (wildcard)
#     'http://localhost:5173',  # Local development access
#     'http://localhost:5174',  # Alternative Vite port
# ]

# 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (Azure Web App)
# cors_origins = [
#     'https://ambitious-ground-04a44660f.3.azurestaticapps.net',  # Production Azure Static Web App
#     'http://localhost:5173',  # Local development
#     'http://localhost:5174',  # Alternative local port
# ]

CORS(app, 
     origins=cors_origins,
     supports_credentials=False,  # False allows multiple origins without credentials
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization']
)

# Register blueprints
app.register_blueprint(track_progress_bp, url_prefix='/api/track-progress')

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    from flask import jsonify
    from datetime import datetime
    return jsonify({
        "success": True,
        "status": "healthy",
        "message": "Passdown API is running",
        "timestamp": datetime.utcnow().isoformat(),
        "mongodb": "connected" if data_api.db is not None else "disconnected",
        "features": [
            "Safety Issues Management",
            "Kudos Management",
            "Today's Top Issues",
            "Yesterday's Top Issues",
            "Chart Data API",
            "Excel/CSV Analysis API",
            "Track Progress API (Work Packages, Tasks, Subtasks)"
        ]
    }), 200

# ==================== CACHE MANAGEMENT ENDPOINTS ====================

@app.route('/api/cache/status', methods=['GET'])
def cache_status():
    """Get cache statistics"""
    try:
        from cache_manager import cache_manager
        stats = cache_manager.get_cache_stats()
        return jsonify({
            "success": True,
            "cache": stats
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/cache/refresh', methods=['POST'])
def cache_refresh():
    """Manually trigger cache refresh - fetches fresh data from Azure and updates cache"""
    try:
        print("\n🔄 Manual cache refresh triggered...")
        from cache_manager import cache_manager
        from data_processor import extract_chart_data, extract_device_yield_data, extract_iv_repeatability_data, get_all_data_full, get_all_data_info
        
        # Clear old cache first to force fresh Azure fetch
        print("🗑️  Clearing old cache...")
        cache_keys = ["device_yield", "iv_repeatability", "all_data_full", "all_data_info"]
        for param in ["PCE", "FF", "Max Power", "HI", "I_sc", "V_oc", "R_series", "R_shunt"]:
            cache_keys.append(f"chart_{param}")
        
        for key in cache_keys:
            cache_manager.invalidate(key)
        
        # Fetch fresh data from Azure
        print("☁️  Fetching fresh data from Azure...")
        cache_manager.set("device_yield", extract_device_yield_data())
        cache_manager.set("iv_repeatability", extract_iv_repeatability_data())
        cache_manager.set("all_data_full", get_all_data_full())
        cache_manager.set("all_data_info", get_all_data_info())
        
        print("📊 Refreshing chart data...")
        all_chart_data = extract_chart_data()
        for param in ["PCE", "FF", "Max Power", "HI", "I_sc", "V_oc", "R_series", "R_shunt"]:
            cache_manager.set(f"chart_{param}", all_chart_data.get(param, []))
        
        # Morning meetings NOT cached - they're already in MongoDB (fast enough)
        print("📋 Morning meetings: NO caching (already in MongoDB)")
        
        print("✅ Cache refresh complete!")
        
        return jsonify({
            "success": True,
            "message": "Cache refreshed successfully - fetched fresh data from Azure",
            "items_refreshed": len(cache_keys)
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/cache/clear', methods=['POST'])
def cache_clear():
    """Clear all cache"""
    try:
        from cache_manager import cache_manager
        cache_manager.invalidate()
        return jsonify({
            "success": True,
            "message": "Cache cleared successfully"
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ==================== DATA MANAGEMENT ENDPOINTS ====================

# Safety Issues
@app.route('/api/safety', methods=['GET'])
def get_safety_issues():
    from flask import request
    limit = request.args.get('limit', type=int)
    skip = request.args.get('skip', default=0, type=int)
    
    # No caching - morning meetings already in MongoDB
    return data_api.get_all_safety_issues(limit=limit, skip=skip)

@app.route('/api/safety', methods=['POST'])
def create_safety_issue():
    from flask import request
    result = data_api.create_safety_issue(request.get_json())
    return result

@app.route('/api/safety/<issue_id>', methods=['PUT'])
def update_safety_issue(issue_id):
    from flask import request
    print(f"\n🔄 Updating safety issue: {issue_id}")
    result = data_api.update_safety_issue(issue_id, request.get_json())
    return result

@app.route('/api/safety/<issue_id>', methods=['DELETE'])
def delete_safety_issue(issue_id):
    print(f"\n🗑️ Deleting safety issue: {issue_id}")
    result = data_api.delete_safety_issue(issue_id)
    return result

# Kudos
@app.route('/api/kudos', methods=['GET'])
def get_kudos():
    from flask import request
    limit = request.args.get('limit', type=int)
    skip = request.args.get('skip', default=0, type=int)
    
    # No caching - morning meetings already in MongoDB
    return data_api.get_all_kudos(limit=limit, skip=skip)

@app.route('/api/kudos', methods=['POST'])
def create_kudos():
    from flask import request
    result = data_api.create_kudos(request.get_json())
    return result

@app.route('/api/kudos/<kudos_id>', methods=['DELETE'])
def delete_kudos(kudos_id):
    result = data_api.delete_kudos(kudos_id)
    return result

# ==================== TOP ISSUES (Unified - replaces today/yesterday) ====================
@app.route('/api/top-issues', methods=['GET'])
def get_top_issues():
    from flask import request
    limit = request.args.get('limit', type=int)
    skip = request.args.get('skip', default=0, type=int)
    status = request.args.get('status', type=str)  # 'Pending' or 'Done' or None (all)
    return data_api.get_all_top_issues(limit=limit, skip=skip, status=status)

@app.route('/api/top-issues', methods=['POST'])
def create_top_issue():
    from flask import request
    return data_api.create_top_issue(request.get_json())

@app.route('/api/top-issues/<issue_id>', methods=['PUT'])
def update_top_issue(issue_id):
    from flask import request
    return data_api.update_top_issue(issue_id, request.get_json())

@app.route('/api/top-issues/<issue_id>', methods=['DELETE'])
def delete_top_issue(issue_id):
    return data_api.delete_top_issue(issue_id)

# Backward compatibility - keep old endpoints working
@app.route('/api/today', methods=['GET'])
def get_today_issues():
    from flask import request
    limit = request.args.get('limit', type=int)
    skip = request.args.get('skip', default=0, type=int)
    return data_api.get_all_top_issues(limit=limit, skip=skip)

@app.route('/api/today', methods=['POST'])
def create_today_issue():
    from flask import request
    return data_api.create_top_issue(request.get_json())

@app.route('/api/today/<issue_id>', methods=['PUT'])
def update_today_issue(issue_id):
    from flask import request
    return data_api.update_top_issue(issue_id, request.get_json())

@app.route('/api/today/<issue_id>', methods=['DELETE'])
def delete_today_issue(issue_id):
    return data_api.delete_top_issue(issue_id)

@app.route('/api/yesterday', methods=['GET'])
def get_yesterday_issues():
    from flask import request
    limit = request.args.get('limit', type=int)
    skip = request.args.get('skip', default=0, type=int)
    return data_api.get_all_top_issues(limit=limit, skip=skip, status='Pending')

@app.route('/api/yesterday/<issue_id>', methods=['PUT'])
def update_yesterday_issue(issue_id):
    from flask import request
    return data_api.update_top_issue(issue_id, request.get_json())

@app.route('/api/yesterday/<issue_id>', methods=['DELETE'])
def delete_yesterday_issue(issue_id):
    return data_api.delete_top_issue(issue_id)

# ==================== BASELINE BATCHES ENDPOINTS ====================

@app.route('/api/baseline-batches', methods=['GET'])
def get_baseline_batches():
    return data_api.get_all_baseline_batches()

@app.route('/api/baseline-batches', methods=['POST'])
def create_baseline_batch():
    from flask import request
    return data_api.create_baseline_batch(request.get_json())

@app.route('/api/baseline-batches/<batch_id>', methods=['DELETE'])
def delete_baseline_batch(batch_id):
    return data_api.delete_baseline_batch(batch_id)

# ==================== CHART ENDPOINTS ====================

@app.route('/api/charts/parameters', methods=['GET'])
def get_chart_parameters():
    """Get list of available chart parameters."""
    return charts_api.get_parameters()

@app.route('/api/charts/data/<parameter>', methods=['GET'])
def get_chart_data(parameter):
    """Get chart data for a specific parameter."""
    return charts_api.get_chart_data(parameter)

@app.route('/api/charts/device-yield', methods=['GET'])
def get_device_yield_data():
    """Get device yield data with 2.5% quantiles and batch averages."""
    return charts_api.get_device_yield_data()

@app.route('/api/charts/iv-repeatability', methods=['GET'])
def get_iv_repeatability_data():
    """Get IV repeatability data with daily averages for last 10 days."""
    return charts_api.get_iv_repeatability_data()

@app.route('/api/charts/std-dev', methods=['GET'])
def get_std_dev_data():
    """Get standard deviation data for all parameters across batches."""
    return charts_api.get_std_dev()

@app.route('/api/charts/clear-cache/<cache_key>', methods=['POST'])
def clear_chart_cache(cache_key):
    """Clear a specific cache item."""
    from flask import jsonify
    try:
        if CACHE_AVAILABLE:
            from cache_manager import cache_manager
            cache_manager.invalidate(cache_key)
            return jsonify({
                "success": True,
                "message": f"Cache cleared for: {cache_key}"
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": "Cache not available"
            }), 400
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ==================== ALL DATA ENDPOINTS ====================

@app.route('/api/all-data-info', methods=['GET'])
def get_all_data_info():
    """Get all data information including batches and sheets (with caching)."""
    from flask import jsonify
    from data_processor import get_all_data_info
    try:
        # Try cache first
        try:
            from cache_manager import cache_manager
            data = cache_manager.get_or_compute("all_data_info", get_all_data_info)
        except:
            data = get_all_data_info()
        return jsonify(data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/clear-all-data-cache', methods=['POST'])
def clear_all_data_cache():
    """Clear ALL MongoDB caches (All Data + Info + PCE Charts + Device Yield + IV Repeatability + Morning Meetings)"""
    from flask import jsonify
    try:
        from cache_manager import cache_manager
        
        print("\n🗑️ Clearing ALL MongoDB caches...")
        
        # 1. Clear All Data
        cache_manager.invalidate("all_data_full")
        print("   ✅ Cleared: all_data_full")
        
        # 2. Clear All Data Info
        cache_manager.invalidate("all_data_info")
        print("   ✅ Cleared: all_data_info")
        
        # 3. Clear PCE Analysis charts (8 parameters) - also used by Std Dev
        parameters = ['PCE', 'FF', 'Max Power', 'HI', 'I_sc', 'V_oc', 'R_series', 'R_shunt']
        for param in parameters:
            cache_manager.invalidate(f"chart_{param}")
        print(f"   ✅ Cleared: {len(parameters)} PCE Analysis parameters (also used by Std Dev)")
        
        # 4. Clear Device Yield
        cache_manager.invalidate("device_yield")
        print("   ✅ Cleared: device_yield")
        
        # 5. Clear IV Repeatability
        cache_manager.invalidate("iv_repeatability")
        print("   ✅ Cleared: iv_repeatability")
        
        # Morning meetings NOT cached - they're already in MongoDB (fast enough)
        print("   ℹ️  Morning meetings: NO cache (direct MongoDB access)")
        
        print("✅ All caches cleared - next requests will fetch fresh data from Azure\n")
        
        return jsonify({
            "status": "success", 
            "message": "All caches cleared successfully",
            "cleared": ["all_data_full", "all_data_info", "pce_charts_x8", "device_yield", "iv_repeatability"]
        })
    except Exception as e:
        print(f"❌ Error clearing cache: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/all-data-full', methods=['GET'])
def get_all_data_full_endpoint():
    """
    Returns all_data_full with MongoDB caching for instant loading.
    Cache is refreshed automatically at 8 AM UTC daily.
    Add ?force_refresh=true to bypass cache and get fresh data.
    """
    from flask import jsonify, request
    from data_processor import get_all_data_full
    from datetime import timedelta
    
    try:
        # Check if force refresh requested (from Refresh button)
        force_refresh = request.args.get('force_refresh', 'false').lower() == 'true'
        
        if force_refresh:
            print("🔄 FORCE REFRESH: User clicked Refresh button - bypassing cache...")
            data = get_all_data_full()
            
            # Update MongoDB cache with fresh data
            try:
                from cache_manager import cache_manager
                cache_manager.set("all_data_full", data, ttl=timedelta(hours=24))
                print("✅ MongoDB cache updated with fresh data")
            except Exception as e:
                print(f"⚠️ Failed to update MongoDB cache: {e}")
            
            return jsonify(data)
        
        # Try MongoDB cache first (instant - 0.5 seconds)
        try:
            from cache_manager import cache_manager
            cached = cache_manager.get("all_data_full")
            if cached:
                print("✅ Cache HIT: all_data_full (MongoDB - instant response)")
                return jsonify(cached)
        except ImportError as ie:
            print(f"⚠️ Cache manager not available: {ie} - fetching from Azure")
        except Exception as e:
            print(f"⚠️ MongoDB cache check failed: {e}")
        
        # Cache miss - fetch from Azure (40 seconds)
        print("🚀 Cache MISS: Fetching from Azure (first load or cache expired)...")
        data = get_all_data_full()
        
        # Cache in MongoDB for 24 hours
        try:
            from cache_manager import cache_manager
            cache_manager.set("all_data_full", data, ttl=timedelta(hours=24))
            print("✅ Data cached in MongoDB (TTL: 24 hours)")
        except Exception as e:
            print(f"⚠️ Failed to cache in MongoDB: {e}")
        
        return jsonify(data)
    except Exception as e:
        print(f"❌ API Error in all-data-full: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route('/api/all-data-boxplot', methods=['POST'])
def get_all_data_boxplot():
    """Generate box plot data for selected batches and parameters."""
    from flask import request, jsonify
    from data_processor import get_all_data_boxplot
    try:
        data = request.get_json()
        batches = data.get('batches', [])
        parameters = data.get('parameters', ['PCE'])
        
        if not batches:
            return jsonify({"error": "No batches selected"}), 400
        
        result = get_all_data_boxplot(batches, parameters)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/all-data-linechart', methods=['POST'])
def get_all_data_linechart():
    """Generate line chart data for selected sheets and parameters."""
    from flask import request, jsonify
    from data_processor import get_all_data_linechart
    try:
        data = request.get_json()
        sheets = data.get('sheets', [])
        parameters = data.get('parameters', ['PCE'])
        
        if not sheets:
            return jsonify({"error": "No sheets selected"}), 400
        
        result = get_all_data_linechart(sheets, parameters)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/all-data-sheet-boxplot', methods=['POST'])
def get_all_data_sheet_boxplot():
    """Generate box plot data for selected sheets and parameters (grouped by batch)."""
    from flask import request, jsonify
    from data_processor import get_all_data_sheet_boxplot
    try:
        data = request.get_json()
        sheets = data.get('sheets', [])
        parameters = data.get('parameters', ['PCE'])
        
        if not sheets:
            return jsonify({"error": "No sheets selected"}), 400
        
        result = get_all_data_sheet_boxplot(sheets, parameters)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/storage/check-connection', methods=['GET'])
def make_connection_check():
    """Get IV repeatability data with daily averages for last 10 days."""
    return charts_api.get_iv_repeatability_data()

# ==================== UPLOAD DATA ENDPOINTS ====================

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload file to Azure Blob Storage"""
    return upload_api.upload_file()

# ==================== STABILITY ENDPOINTS ====================

@app.route('/api/stability/grid-data', methods=['GET'])
def get_stability_grid_data():
    """Get all stability grid data including devices and history"""
    return stability_api.get_grid_data()

@app.route('/api/stability/devices', methods=['GET'])
def get_stability_devices():
    """Get all active stability devices"""
    return stability_api.get_devices()

@app.route('/api/stability/devices', methods=['POST'])
def create_stability_device():
    """Create a new stability device"""
    return stability_api.create_device()

@app.route('/api/stability/devices/<path:device_path>', methods=['PUT'])
def update_stability_device(device_path):
    """Update stability device by position"""
    return stability_api.device_by_position(device_path)

@app.route('/api/stability/devices/<path:device_path>', methods=['DELETE'])
def delete_stability_device(device_path):
    """Delete stability device by position (soft delete)"""
    return stability_api.device_by_position(device_path)

@app.route('/api/stability/history/<path:device_path>', methods=['GET'])
def get_stability_history(device_path):
    """Get history for specific stability slot"""
    return stability_api.get_history(device_path)

@app.route('/api/stability/check-expired', methods=['GET'])
def check_expired_devices():
    """Check for devices that have exceeded their time_hours"""
    return stability_api.check_expired_devices()

@app.route('/api/stability/process-expired', methods=['POST'])
def process_expired_devices():
    """Process expired devices automatically and return details"""
    return stability_api.process_expired_devices()

# ==================== STABILITY DEVICE DATA ENDPOINTS ====================

from stability_device_data_api import get_device_data_api
device_data_api = get_device_data_api()

@app.route('/api/stability/device-data/<device_id>', methods=['GET'])
def get_device_performance_data(device_id):
    """Get performance time series data for a specific device"""
    return device_data_api.get_device_data(device_id)

@app.route('/api/stability/available-devices', methods=['GET'])
def get_available_devices():
    """Get list of all devices with performance data"""
    return device_data_api.get_available_devices()

@app.route('/api/stability/refresh-data', methods=['POST'])
def refresh_device_data():
    """Refresh device data from CSV files"""
    return device_data_api.refresh_data()

@app.route('/api/stability/check-azure-files', methods=['GET'])
def check_azure_files():
    """Check what files are available in Azure - for debugging"""
    return device_data_api.check_azure_files()

@app.route('/api/stability/cache-status', methods=['GET'])
def get_cache_status():
    """Get cache status - shows when data was cached and when it expires (for monitoring)"""
    return device_data_api.get_cache_status()

@app.route('/api/stability/refresh-data', methods=['POST'])
def force_refresh_stability_data():
    """Force refresh - clears cache and reloads fresh data from Azure immediately"""
    return device_data_api.refresh_data()

# ==================== STABILITY SAMPLES ENDPOINTS (NEW - Position Independent) ====================

from stability_samples_api import stability_samples_api

@app.route('/api/stability/samples/grid-data', methods=['GET'])
def get_stability_samples_grid_data():
    """Get grid data with sample counts (no positions)"""
    return stability_samples_api.get_grid_data()

@app.route('/api/stability/samples/batch-add', methods=['POST'])
def batch_add_samples():
    """Add multiple samples at once"""
    return stability_samples_api.batch_add_samples()

@app.route('/api/stability/samples/active', methods=['GET'])
def get_active_samples():
    """Get active samples for a temperature"""
    return stability_samples_api.get_active_samples()

@app.route('/api/stability/samples/history', methods=['GET'])
def get_samples_history():
    """Get historical samples for a temperature"""
    return stability_samples_api.get_history()

@app.route('/api/stability/samples/remove', methods=['POST'])
def remove_samples():
    """Remove specific samples (move to history)"""
    return stability_samples_api.remove_samples()

@app.route('/api/stability/samples/remove-all', methods=['POST'])
def remove_all_samples():
    """Remove all samples from a temperature"""
    return stability_samples_api.remove_all_samples()

@app.route('/api/stability/samples/by-id', methods=['GET'])
def get_sample_by_id():
    """Get a specific sample by deviceId"""
    return stability_samples_api.get_sample_by_id()

@app.route('/api/stability/samples/update', methods=['PUT'])
def update_sample():
    """Update a sample"""
    return stability_samples_api.update_sample()

# ==================== BATCH PROCESSING ENDPOINTS ====================

@app.route('/api/batches/current-location', methods=['GET'])
def get_current_batch_location_route():
    """Get current location of all batches from Azure parquet data"""
    return get_current_batch_location()

@app.route('/api/batches/health', methods=['GET'])
def batch_health_route():
    """Health check for batch processing API"""
    return batch_health()

# ==================== BATCH PROCESS TRACKING ENDPOINTS ====================

@app.route('/api/batch-processes', methods=['GET'])
def get_batch_processes():
    """Get all batches with their current process"""
    return batch_task_api.get_all_batches()

@app.route('/api/batch-processes', methods=['POST'])
def add_batch_process():
    """Add a new batch"""
    return batch_task_api.add_batch()

@app.route('/api/batch-processes', methods=['PUT'])
def update_batch_process():
    """Update batch process and status"""
    return batch_task_api.update_batch()

@app.route('/api/batch-processes', methods=['DELETE'])
def delete_batch_process():
    """Delete a batch"""
    return batch_task_api.delete_batch()

@app.route('/api/batch-processes/options', methods=['GET'])
def get_batch_process_options():
    """Get available process and status options"""
    return batch_task_api.get_options()

# Batch priorities
@app.route('/api/batches/priorities', methods=['GET'])
def get_batch_priorities():
    """Get all batch priorities"""
    return data_api.get_all_batch_priorities()

@app.route('/api/batches/priorities/<batch_id>', methods=['PUT'])
def update_batch_priority_route(batch_id):
    """Update priority for a specific batch"""
    from flask import request
    data = request.get_json()
    priority = data.get('priority')
    return data_api.update_batch_priority(batch_id, priority)

# Batch location history
@app.route('/api/batches/location/snapshot', methods=['POST'])
def save_batch_location_snapshot():
    """Save a snapshot of batch location data"""
    from flask import request
    data = request.get_json()
    batches = data.get('batches', [])
    return data_api.save_batch_location_snapshot(batches)

@app.route('/api/batches/location/history', methods=['GET'])
def get_batch_location_history():
    """Get historical batch location snapshots"""
    from flask import request
    days = request.args.get('days', 7, type=int)
    return data_api.get_batch_location_history(days)



# ==================== ANALYSIS ENDPOINTS ====================

@app.route('/api/analysis/process', methods=['POST'])
def process_analysis():
    """Process Excel/CSV file for analysis"""
    from flask import request, jsonify
    import tempfile
    import os
    
    try:
        # Check if file was uploaded
        if 'file' not in request.files:
            return jsonify({"status": "error", "message": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"status": "error", "message": "No file selected"}), 400
        
        # Get processing options from form data
        options = {}
        try:
            options['sheetsMode'] = request.form.get('sheetsMode', 'top-k')
            options['sheetsTopK'] = int(request.form.get('sheetsTopK', 6))
            options['devicesMode'] = request.form.get('devicesMode', 'top-k')
            options['devicesTopK'] = int(request.form.get('devicesTopK', 6))
            options['pixelsPerDevice'] = int(request.form.get('pixelsPerDevice', 3))
            options['method'] = request.form.get('method', 'minimize-sd')
            options['basis'] = request.form.get('basis', 'forward')
            options['useAllSheets'] = request.form.get('useAllSheets', 'true').lower() == 'true'
            options['sheetIds'] = request.form.get('sheetIds', '')
        except (ValueError, TypeError) as e:
            return jsonify({"status": "error", "message": f"Invalid options format: {str(e)}"}), 400
        
        # Save uploaded file temporarily
        tmp_file = None
        try:
            # Determine file extension
            if file.filename.lower().endswith(('.xlsx', '.xls')):
                suffix = '.xlsx'
            elif file.filename.lower().endswith('.csv'):
                suffix = '.csv'
            else:
                suffix = '.xlsx'  # Default fallback
            
            tmp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
            file.save(tmp_file.name)
            tmp_file.close()  # Close file handle before processing
            
            # Process the file
            result = process_excel_analysis(tmp_file.name, options)
            
            # Add filename to result
            result['fileName'] = file.filename
            
            return jsonify(result)
            
        finally:
            # Safe cleanup - try to delete temp file if it exists
            if tmp_file and os.path.exists(tmp_file.name):
                try:
                    os.unlink(tmp_file.name)
                except Exception:
                    # If deletion fails, just log it - don't crash the request
                    print(f"⚠️ Could not delete temporary file: {tmp_file.name}")
                    pass
            
    except Exception as e:
        import traceback
        error_msg = f"Unexpected error: {str(e)}"
        traceback_str = traceback.format_exc()
        print(f"❌ ANALYSIS ERROR: {error_msg}")
        print(f"📋 TRACEBACK:\n{traceback_str}")
        
        return jsonify({
            "status": "error", 
            "message": error_msg,
            "logs": [error_msg, f"Traceback: {traceback_str}"]
        }), 500

@app.route('/api/analysis/download', methods=['POST'])
def download_analysis_results():
    """Generate and download analysis results as separate Excel files"""
    from flask import request, jsonify, send_file
    import tempfile
    import os
    import pandas as pd
    from datetime import datetime
    from analysis_api import stored_results
    
    try:
        # Get the file type from request
        data = request.get_json() or {}
        file_type = data.get('fileType', 'quick')  # 'quick' or 'entire'
        
        print(f"🔍 Download request received - fileType: {file_type}")
        print(f"📝 Request data: {data}")
        
        # Check if we have stored results
        if stored_results is None:
            print("❌ No stored results available")
            return jsonify({"status": "error", "message": "No analysis results available. Please run analysis first."}), 400
        
        quick_df = stored_results.get('quick_data')
        entire_df = stored_results.get('entire_data')
        
        if quick_df is None or quick_df.empty:
            return jsonify({"status": "error", "message": "No Quick Data available"}), 400
        
        # Create timestamp for filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create temporary file
        if file_type == 'entire':
            if entire_df is None or entire_df.empty:
                return jsonify({"status": "error", "message": "No Entire Data available"}), 400
            
            filename = f"Entire_Data_{timestamp}.xlsx"
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
                with pd.ExcelWriter(tmp_file.name, engine='openpyxl') as writer:
                    entire_df.to_excel(writer, sheet_name='Entire_Data', index=False)
                    
                    # Auto-adjust column widths
                    workbook = writer.book
                    worksheet = writer.sheets['Entire_Data']
                    for column in worksheet.columns:
                        max_length = 0
                        column_letter = column[0].column_letter
                        for cell in column:
                            try:
                                if len(str(cell.value)) > max_length:
                                    max_length = len(str(cell.value))
                            except:
                                pass
                        adjusted_width = min(max_length + 2, 50)
                        worksheet.column_dimensions[column_letter].width = adjusted_width
                
                return send_file(
                    tmp_file.name,
                    as_attachment=True,
                    download_name=filename,
                    mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
        else:
            # Default to quick data
            filename = f"Quick_Data_{timestamp}.xlsx"
            with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp_file:
                with pd.ExcelWriter(tmp_file.name, engine='openpyxl') as writer:
                    quick_df.to_excel(writer, sheet_name='Quick_Data', index=False)
                    
                    # Auto-adjust column widths
                    workbook = writer.book
                    worksheet = writer.sheets['Quick_Data']
                    for column in worksheet.columns:
                        max_length = 0
                        column_letter = column[0].column_letter
                        for cell in column:
                            try:
                                if len(str(cell.value)) > max_length:
                                    max_length = len(str(cell.value))
                            except:
                                pass
                        adjusted_width = min(max_length + 2, 50)
                        worksheet.column_dimensions[column_letter].width = adjusted_width
                
                return send_file(
                    tmp_file.name,
                    as_attachment=True,
                    download_name=filename,
                    mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
            
    except Exception as e:
        import traceback
        error_msg = f"Download error: {str(e)}"
        traceback_str = traceback.format_exc()
        print(f"❌ DOWNLOAD ERROR: {error_msg}")
        print(f"📋 TRACEBACK:\n{traceback_str}")
        
        return jsonify({
            "status": "error", 
            "message": error_msg
        }), 500

@app.route('/api/download-azure-file', methods=['GET'])
def download_azure_file():
    """Download files from Azure Blob Storage"""
    from flask import send_file, request
    import requests
    import tempfile
    
    try:
        # Get filename from query parameter
        filename = request.args.get('filename', 'BaseLine.xlsx')
        
        # Get Azure credentials from environment
        azure_container_url = os.getenv('AZURE_CONTAINER_URL')
        azure_container_sas = os.getenv('AZURE_CONTAINER_SAS')
        
        if not azure_container_url or not azure_container_sas:
            return jsonify({
                "status": "error",
                "message": "Azure credentials not configured"
            }), 500
        
        # Construct blob URL
        blob_url = f"{azure_container_url}/{filename}?{azure_container_sas}"
        
        print(f"📥 Downloading file from Azure: {filename}")
        
        # Download file from Azure
        response = requests.get(blob_url)
        
        if response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": f"Failed to download file from Azure: {response.status_code}"
            }), 500
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp_file:
            tmp_file.write(response.content)
            tmp_file_path = tmp_file.name
        
        print(f"✅ File downloaded successfully: {filename}")
        
        # Send file to client
        return send_file(
            tmp_file_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' if filename.endswith('.xlsx') else 'application/octet-stream'
        )
        
    except Exception as e:
        import traceback
        error_msg = f"Download error: {str(e)}"
        traceback_str = traceback.format_exc()
        print(f"❌ DOWNLOAD ERROR: {error_msg}")
        print(f"📋 TRACEBACK:\n{traceback_str}")
        
        return jsonify({
            "status": "error",
            "message": error_msg
        }), 500

# ==================== START SERVER ====================

def auto_remove_expired_devices_on_startup():
    """Automatically remove expired devices when server starts"""
    try:
        print("\n🔍 Checking for expired devices...")
        from stability_models import StabilityDatabaseManager, StabilityDeviceModel
        
        stability_db = StabilityDatabaseManager()
        if not stability_db.connected:
            print("⚠️  Could not connect to database for expired device check")
            return
        
        device_model = StabilityDeviceModel(stability_db)
        expired_devices = device_model.check_expired_devices()
        
        if not expired_devices:
            print("✅ No expired devices found")
            stability_db.close_connection()
            return
        
        print(f"⏰ Found {len(expired_devices)} expired device(s)")
        removed_count = 0
        
        for device in expired_devices:
            try:
                print(f"   🗑️  Removing {device['device_id']} (expired {device['hours_over']:.2f}h ago)")
                success = device_model.soft_delete(
                    device['section_key'],
                    device['subsection_key'],
                    device['row'],
                    device['col'],
                    'System'
                )
                if success:
                    removed_count += 1
                    print(f"   ✅ Successfully removed {device['device_id']}")
                else:
                    print(f"   ❌ Failed to remove {device['device_id']}")
            except Exception as e:
                print(f"   ❌ Error removing {device['device_id']}: {e}")
        
        stability_db.close_connection()
        print(f"🎯 Auto-removal complete: {removed_count}/{len(expired_devices)} devices removed\n")
        
    except Exception as e:
        print(f"⚠️  Error during startup expired device check: {e}\n")

def initialize_graph_cache():
    """MongoDB cache only - NO persistent Azure Blob cache"""
    try:
        print("\n" + "="*60)
        print("🗄️ MONGODB CACHE SYSTEM")
        print("="*60)
        print("✅ Persistent Azure Blob cache DISABLED")
        print("✅ Using ONLY MongoDB cache (24hr TTL)")
        print("✅ Cache refreshes: 8:00 AM AST daily via scheduler")
        print("✅ Manual refresh: 'Refresh All Data' button on homepage")
        print("✅ Always fetches from Azure data.xlsx - NO OLD CACHED DATA!")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"⚠️ Cache initialization info: {e}\n")

# Initialize cache ONCE at module load time (before Flask starts)
# This ensures cache is ready before any requests
_cache_initialized = False
if not _cache_initialized:
    auto_remove_expired_devices_on_startup()
    initialize_graph_cache()
    _cache_initialized = True

# Start cache scheduler (runs on any startup, not just python app.py)
try:
    print("\n" + "="*60)
    print("🕐 STARTING CACHE SCHEDULER")
    print("="*60)
    from cache_scheduler import start_scheduler
    start_scheduler()
    print("✅ Cache scheduler initialized successfully!")
    print("   ⏰ Next refresh: 8:00 AM AST daily")
    print("   📊 Caching: All Data, PCE Analysis, Device Yield, IV Repeatability")
    print("="*60 + "\n")
except Exception as e:
    print(f"⚠️ Scheduler failed to start: {e}")
    print("   ℹ️  Manual refresh via buttons will still work")

if __name__ == '__main__':
    print("🚀 Starting Modular Passdown API Server")
    print("=" * 60)
    print("📊 Features Available:")
    print("  ✅ Safety Issues Management (data_management_api.py)")
    print("  ✅ Kudos Management (data_management_api.py)")
    print("  ✅ Today's Top Issues (data_management_api.py)")
    print("  ✅ Yesterday's Top Issues (data_management_api.py)")
    print("  ✅ Chart Data API (charts_api.py) - WITH CACHING")
    print("  ✅ Excel/CSV Analysis API (analysis_api.py)")
    print("  ✅ Stability Dashboard API (stability_api.py)")
    print("  ✅ All Data Analysis API (data_processor.py)")
    print("  ✅ Track Progress API (track_progress_api.py)")
    print("\n🔧 Manual Reset: POST /api/reset-today")
    print("🏥 Health Check: GET /api/health")
    print("📊 Analysis Processing: POST /api/analysis/process")
    print("📥 Download Results: POST /api/analysis/download")
    print("🔬 Stability Grid: GET /api/stability/grid-data")
    print("⚗️ Device Management: /api/stability/devices")
    print("📊 All Data Info: GET /api/all-data-info")
    print("📈 All Data Box Plot: POST /api/all-data-boxplot")
    print("📉 All Data Line Chart: POST /api/all-data-linechart")
    print("📋 Track Progress: /api/track-progress/work-packages")
    print("=" * 60)
    
    print("\n✅ Server is READY! All charts: MongoDB cache (instant) + 8:00 AM AST refresh! 🚀\n")
    
    app.run(host='0.0.0.0', port=7071, debug=True)
