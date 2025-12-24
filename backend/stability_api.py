"""
Stability Dashboard API - Modular backend for device stability tracking
Handles grid-based device management with time tracking and history
"""

import time
import threading
from datetime import datetime, timedelta
from flask import jsonify, request

try:
    # Import stability models if available
    from stability_models import StabilityDatabaseManager, StabilityDeviceModel, StabilityHistoryModel
    STABILITY_MODELS_AVAILABLE = True
except ImportError:
    print("⚠️ Stability models not available. Stability features will be disabled.")
    STABILITY_MODELS_AVAILABLE = False

def automatic_device_checker():
    """Check and remove expired devices (called once at startup)"""
    try:
        if not STABILITY_MODELS_AVAILABLE:
            return 0
            
        print(f"🤖 [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Running automatic device expiry check...")
        
        stability_db = StabilityDatabaseManager()
        if not stability_db.connected:
            print("❌ Database connection failed during automatic check")
            return 0
            
        device_model = StabilityDeviceModel(stability_db)
        expired_devices = device_model.check_expired_devices()
        
        removed_count = 0
        if expired_devices:
            print(f"⚠️  Found {len(expired_devices)} expired devices - processing removal...")
            
            for device in expired_devices:
                success = device_model.soft_delete(
                    section_key=device['section_key'],
                    subsection_key=device['subsection_key'],
                    row=device['row'],
                    col=device['col'],
                    removed_by='system'
                )
                if success:
                    removed_count += 1
                    print(f"✅ Auto-removed device {device.get('device_id', 'Unknown')} from {device['section_key']}/{device['subsection_key']} ({device['row']},{device['col']})")
            
            print(f"🎯 Automatic removal complete: {removed_count}/{len(expired_devices)} devices processed")
        else:
            print("✓ No expired devices found")
            
        stability_db.close_connection()
        return removed_count
            
    except Exception as e:
        print(f"❌ Error in automatic device checker: {str(e)}")
        return 0

def setup_startup_device_check():
    """Run device expiry check once at startup only"""
    try:
        def delayed_startup_check():
            time.sleep(5)  # Wait 5 seconds after startup for database connection
            print("🔍 Running startup device expiry check...")
            removed_count = automatic_device_checker()
            if removed_count > 0:
                print(f"✅ Startup check completed: Removed {removed_count} expired device(s)")
            else:
                print("✅ Startup check completed: No expired devices found")
        
        # Run the check in a separate thread to avoid blocking startup
        startup_check_thread = threading.Thread(target=delayed_startup_check, daemon=True)
        startup_check_thread.start()
        
        print("📋 Startup device expiry check scheduled")
        return True
        
    except Exception as e:
        print(f"❌ Failed to setup startup device check: {str(e)}")
        return False

class StabilityAPI:
    """Modular Stability API handler"""
    
    def __init__(self):
        pass
    
    def get_grid_data(self):
        """Get all stability grid data including devices and history"""
        try:
            if not STABILITY_MODELS_AVAILABLE:
                return jsonify({'success': False, 'error': 'Stability models not available'}), 500
            
            # Create stability database manager directly (it handles its own connection)
            stability_db = StabilityDatabaseManager()
            if not stability_db.connected:
                return jsonify({'success': False, 'error': 'Database connection failed'}), 500
            
            device_model = StabilityDeviceModel(stability_db)
            devices = device_model.get_all()
            
            # Organize devices by grid structure
            grid_data = {
                "LS w/Temp": {
                    "37C": {"rows": 6, "cols": 4, "devices": {}},
                    "65C": {"rows": 6, "cols": 4, "devices": {}},
                    "85C": {"rows": 6, "cols": 4, "devices": {}}
                },
                "Damp Heat": {
                    "": {"rows": 6, "cols": 6, "devices": {}}
                },
                "Outdoor Testing": {
                    "": {"rows": 20, "cols": 15, "devices": {}}
                }
            }
            
            # Populate grid with active devices
            for device in devices:
                # Handle both old (camelCase) and new (snake_case) field names
                section_key = device.get("section_key") or device.get("sectionKey")
                subsection_key = device.get("subsection_key") or device.get("subsectionKey")
                row = device.get("row")
                col = device.get("col")
                
                # Check if device has required fields
                if not all([section_key is not None, subsection_key is not None, row is not None, col is not None]):
                    print(f"⚠️ Skipping device with missing fields: {device}")
                    continue
                    
                slot_key = f"{row}-{col}"
                
                if section_key in grid_data and subsection_key in grid_data[section_key]:
                    # Convert to camelCase for frontend
                    device_for_frontend = {
                        "id": device.get("device_id"),
                        "deviceId": device.get("device_id"),
                        "sectionKey": section_key,
                        "subsectionKey": subsection_key,
                        "row": row,
                        "col": col,
                        "inDate": device.get("in_date"),
                        "inTime": device.get("in_time"),
                        "hours": device.get("hours"),
                        "minutes": device.get("minutes"),
                        "seconds": device.get("seconds"),
                        "timeHours": device.get("time_hours"),
                        "createdBy": device.get("created_by"),
                        "createdAt": device.get("created_at").isoformat() if device.get("created_at") else None,
                        "status": device.get("status"),
                        "hasT80": device.get("has_t80", False),
                        "t80ReachedAt": device.get("t80_reached_at").isoformat() if device.get("t80_reached_at") else None,
                    }
                    grid_data[section_key][subsection_key]["devices"][slot_key] = device_for_frontend
            
            # Close database connection
            stability_db.close_connection()
                
            return jsonify({
                'success': True,
                'gridData': grid_data
            })
        except Exception as e:
            print(f"❌ Error in get_grid_data: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': str(e)}), 500

    def get_devices(self):
        """Get all active devices"""
        try:
            if not STABILITY_MODELS_AVAILABLE:
                return jsonify({'success': False, 'error': 'Stability models not available'}), 500
            
            # Create stability database manager directly
            stability_db = StabilityDatabaseManager()
            if not stability_db.connected:
                return jsonify({'success': False, 'error': 'Database connection failed'}), 500
                
            device_model = StabilityDeviceModel(stability_db)
            devices = device_model.get_all()
            
            stability_db.close_connection()
            
            return jsonify({
                'success': True,
                'devices': devices
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    def create_device(self):
        """Create a new device"""
        try:
            if not STABILITY_MODELS_AVAILABLE:
                return jsonify({'success': False, 'error': 'Stability models not available'}), 500
            
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400
            
            # Create stability database manager directly
            stability_db = StabilityDatabaseManager()
            if not stability_db.connected:
                return jsonify({'success': False, 'error': 'Database connection failed'}), 500
                
            device_model = StabilityDeviceModel(stability_db)
            device_id = device_model.create(data)
            
            if device_id:
                device = device_model.get_by_id(device_id)
                stability_db.close_connection()
                return jsonify({
                    'success': True,
                    'device': device
                }), 201
            else:
                stability_db.close_connection()
                return jsonify({'success': False, 'error': 'Failed to create device'}), 500
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    def update_device(self, device_id):
        """Update a device"""
        try:
            if not STABILITY_MODELS_AVAILABLE:
                return jsonify({'success': False, 'error': 'Stability models not available'}), 500
            
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400
            
            stability_db = StabilityDatabaseManager()
            if not stability_db.connected:
                return jsonify({'success': False, 'error': 'Database connection failed'}), 500
                
            device_model = StabilityDeviceModel(stability_db)
            success = device_model.update(device_id, data)
            
            if success:
                device = device_model.get_by_id(device_id)
                stability_db.close_connection()
                return jsonify({
                    'success': True,
                    'device': device
                })
            else:
                stability_db.close_connection()
                return jsonify({'success': False, 'error': 'Device not found'}), 404
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    def delete_device(self, device_id):
        """Delete a device"""
        try:
            if not STABILITY_MODELS_AVAILABLE:
                return jsonify({'success': False, 'error': 'Stability models not available'}), 500
            
            stability_db = StabilityDatabaseManager()
            if not stability_db.connected:
                return jsonify({'success': False, 'error': 'Database connection failed'}), 500
                
            device_model = StabilityDeviceModel(stability_db)
            success = device_model.delete(device_id)
            
            stability_db.close_connection()
            
            if success:
                return jsonify({'success': True, 'message': 'Device deleted'})
            else:
                return jsonify({'success': False, 'error': 'Device not found'}), 404
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    def check_expired_devices(self):
        """Check and update expired devices"""
        try:
            if not STABILITY_MODELS_AVAILABLE:
                return jsonify({'success': False, 'error': 'Stability models not available'}), 500
            
            stability_db = StabilityDatabaseManager()
            if not stability_db.connected:
                return jsonify({'success': False, 'error': 'Database connection failed'}), 500
                
            device_model = StabilityDeviceModel(stability_db)
            expired_count = device_model.check_and_expire_devices()
            
            stability_db.close_connection()
            
            return jsonify({
                'success': True,
                'expired_count': expired_count
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    def get_device_history(self, device_id):
        """Get device history"""
        try:
            if not STABILITY_MODELS_AVAILABLE:
                return jsonify({'success': False, 'error': 'Stability models not available'}), 500
            
            stability_db = StabilityDatabaseManager()
            if not stability_db.connected:
                return jsonify({'success': False, 'error': 'Database connection failed'}), 500
                
            history_model = StabilityHistoryModel(stability_db)
            history = history_model.get_by_device_id(device_id)
            
            stability_db.close_connection()
            
            return jsonify({
                'success': True,
                'history': history
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    def get_history(self, device_path):
        """Get history for device path (section/subsection/row/col)"""
        try:
            if not STABILITY_MODELS_AVAILABLE:
                return jsonify({'success': False, 'error': 'Stability models not available'}), 500
            
            # Flask already URL-decodes the path parameter for us
            path_parts = device_path.split('/')
            
            if len(path_parts) < 4:
                return jsonify({'success': False, 'error': 'Invalid device path format'}), 400
            
            # Extract row and col from the end
            try:
                col = int(path_parts[-1])
                row = int(path_parts[-2])
                subsection_key = path_parts[-3]
                section_key = '/'.join(path_parts[:-3])
            except (ValueError, IndexError):
                return jsonify({'success': False, 'error': 'Invalid row/col values'}), 400
            
            # Handle empty subsection_key placeholder
            if subsection_key == '_empty_':
                subsection_key = ''
            
            stability_db = StabilityDatabaseManager()
            if not stability_db.connected:
                return jsonify({'success': False, 'error': 'Database connection failed'}), 500
                
            history_model = StabilityHistoryModel(stability_db)
            history = history_model.get_by_position(section_key, subsection_key, row, col)
            print(f"Retrieved history for {section_key}/{subsection_key} ({row},{col}): {history}")
            stability_db.close_connection()
            
            return jsonify({
                'success': True,
                'history': history
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    def device_by_position(self, device_path):
        """Update or delete stability device by position"""
        try:
            if not STABILITY_MODELS_AVAILABLE:
                return jsonify({'success': False, 'error': 'Stability models not available'}), 500
            
            # Parse the device_path manually to handle forward slashes correctly
            from urllib.parse import unquote
            decoded_path = unquote(device_path)
            path_parts = decoded_path.split('/')
            
            if len(path_parts) < 4:
                return jsonify({'success': False, 'error': 'Invalid device path format'}), 400
            
            # Extract row and col from the end
            try:
                col = int(path_parts[-1])
                row = int(path_parts[-2])
                subsection_key = path_parts[-3]
                section_key = '/'.join(path_parts[:-3])
            except (ValueError, IndexError):
                return jsonify({'success': False, 'error': 'Invalid row/col values'}), 400
            
            # Handle empty subsection_key placeholder
            if subsection_key == '_empty_':
                subsection_key = ''
            
            stability_db = StabilityDatabaseManager()
            if not stability_db.connected:
                return jsonify({'success': False, 'error': 'Database connection failed'}), 500
                
            device_model = StabilityDeviceModel(stability_db)
            
            if request.method == 'PUT':
                data = request.get_json()
                success = device_model.update_by_position(
                    section_key, subsection_key, row, col, data
                )
                stability_db.close_connection()
                return jsonify({
                    'success': success,
                    'message': 'Device updated successfully' if success else 'Device not found or no changes made'
                })
            
            elif request.method == 'DELETE':
                data = request.get_json()
                removed_by = data.get('removedBy', 'unknown')
                debug_msg = f"🗑️ DELETE request: section='{section_key}', subsection='{subsection_key}', row={row}, col={col}, removedBy='{removed_by}'"
                print(debug_msg)
                with open("debug.log", "a", encoding="utf-8") as f:
                    f.write(f"{debug_msg}\n")
                
                success = device_model.soft_delete(
                    section_key, subsection_key, row, col, removed_by
                )
                result_msg = f"🗑️ DELETE result: success={success}"
                print(result_msg)
                with open("debug.log", "a", encoding="utf-8") as f:
                    f.write(f"{result_msg}\n")
                
                stability_db.close_connection()
                response = {
                    'success': success,
                    'message': 'Device removed successfully' if success else 'Device not found'
                }
                response_msg = f"🗑️ DELETE response: {response}"
                print(response_msg)
                with open("debug.log", "a", encoding="utf-8") as f:
                    f.write(f"{response_msg}\n")
                return jsonify(response)
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    def auto_remove_expired_devices(self):
        """Auto-remove expired devices endpoint"""
        try:
            if not STABILITY_MODELS_AVAILABLE:
                return jsonify({'success': False, 'error': 'Stability models not available'}), 500
            
            stability_db = StabilityDatabaseManager()
            if not stability_db.connected:
                return jsonify({'success': False, 'error': 'Database connection failed'}), 500
                
            device_model = StabilityDeviceModel(stability_db)
            expired_devices = device_model.check_expired_devices()
            
            removed_count = 0
            if expired_devices:
                for device in expired_devices:
                    success = device_model.soft_delete(
                        device['section_key'], device['subsection_key'],
                        device['row'], device['col'], 'system'
                    )
                    if success:
                        removed_count += 1
            
            stability_db.close_connection()
            return jsonify({
                'success': True,
                'removed_count': removed_count,
                'expired_devices': expired_devices
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    def process_expired_devices(self):
        """Process expired devices automatically and return details"""
        return self.auto_remove_expired_devices()  # Same functionality

    def add_device_history(self):
        """Add device history entry"""
        try:
            if not STABILITY_MODELS_AVAILABLE:
                return jsonify({'success': False, 'error': 'Stability models not available'}), 500
            
            data = request.get_json()
            if not data:
                return jsonify({'success': False, 'error': 'No data provided'}), 400
            
            stability_db = StabilityDatabaseManager()
            if not stability_db.connected:
                return jsonify({'success': False, 'error': 'Database connection failed'}), 500
                
            history_model = StabilityHistoryModel(stability_db)
            history_id = history_model.add_entry(data)
            
            if history_id:
                stability_db.close_connection()
                return jsonify({
                    'success': True,
                    'history_id': history_id
                }), 201
            else:
                stability_db.close_connection()
                return jsonify({'success': False, 'error': 'Failed to add history'}), 500
                
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

# Lazy singleton instance
_stability_api_instance = None

def get_stability_api():
    """Get or create the singleton stability API instance"""
    global _stability_api_instance
    if _stability_api_instance is None:
        _stability_api_instance = StabilityAPI()
    return _stability_api_instance

# For backward compatibility
class StabilityAPIProxy:
    """Proxy class that delegates to the lazy-loaded singleton"""
    def __getattr__(self, name):
        return getattr(get_stability_api(), name)

stability_api = StabilityAPIProxy()