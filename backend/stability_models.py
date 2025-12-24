"""
Stability Models - Database models for stability device tracking
Uses the same MongoDB connection as the main data management system
"""

import os
import time
import logging
from datetime import datetime, timedelta
from pymongo import MongoClient
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class StabilityDatabaseManager:
    """Database connection manager for stability system"""
    
    def __init__(self):
        # MongoDB connection - following exact same pattern as DataManagementAPI
        self.connection_string = os.getenv('MONGODB_CONNECTION_STRING')
        self.database_name = os.getenv('DATABASE_NAME', 'passdown_db')
        self.client = None
        self.db = None
        self.connected = False
        self._connect_to_mongodb()
    
    def _connect_to_mongodb(self):
        """Establish MongoDB connection - exact same pattern as DataManagementAPI"""
        try:
            if not self.connection_string:
                logging.warning("MongoDB connection string not found. Using local fallback.")
                return
            
            self.client = MongoClient(self.connection_string)
            self.db = self.client[self.database_name]
            # Test connection
            self.client.server_info()
            logging.info("✅ Stability MongoDB connection established")
            self.connected = True
        except Exception as e:
            logging.error(f"❌ Stability MongoDB connection failed: {e}")
            self.client = None
            self.db = None
            self.connected = False
    
    def connect(self):
        """Legacy connect method for backward compatibility"""
        return self.connected
    
    def close_connection(self):
        """Close database connection"""
        if self.client:
            self.client.close()
            self.connected = False

class StabilityDeviceModel:
    """Model for stability device management"""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.collection = db_manager.db.stability_devices
    
    def get_all(self):
        """Get all active devices with T80 status"""
        try:
            devices = list(self.collection.find({"status": {"$ne": "removed"}}))
            
            # Import device data API to check T80 status
            try:
                from stability_device_data_api import get_device_data_api
                device_data_api = get_device_data_api()
            except:
                device_data_api = None
            
            # Convert ObjectId to string and add T80 status
            for device in devices:
                device['_id'] = str(device['_id'])
                
                # Check T80 status if device has deviceId
                if device_data_api and 'deviceId' in device:
                    t80_status = device_data_api.check_device_t80_status(device['deviceId'])
                    device['has_t80'] = t80_status.get('has_t80', False)
                    if t80_status.get('has_t80'):
                        device['t80_info'] = t80_status
                else:
                    device['has_t80'] = False
            
            return devices
        except Exception as e:
            print(f"Error getting devices: {e}")
            import traceback
            traceback.print_exc()
            return []
    
    def get_by_id(self, device_id):
        """Get device by ID"""
        try:
            from bson import ObjectId
            device = self.collection.find_one({"_id": ObjectId(device_id)})
            if device:
                device['_id'] = str(device['_id'])
            return device
        except Exception as e:
            print(f"Error getting device by ID: {e}")
            return None
    
    def get_by_position(self, section_key, subsection_key, row, col):
        """Get device at specific position"""
        try:
            # Primary query using camelCase (which is what the database actually uses)
            query = {
                "sectionKey": section_key,
                "subsectionKey": subsection_key,
                "row": row,
                "col": col,
                "status": {"$ne": "removed"}
            }
            
            debug_msg = f"🔍 get_by_position query: section='{section_key}', subsection='{subsection_key}', row={row}, col={col}"
            print(debug_msg)
            with open("debug.log", "a", encoding="utf-8") as f:
                f.write(f"{debug_msg}\n")
            
            device = self.collection.find_one(query)
            
            # If not found with camelCase, try snake_case as fallback
            if not device:
                query_fallback = {
                    "section_key": section_key,
                    "subsection_key": subsection_key,
                    "row": row,
                    "col": col,
                    "status": {"$ne": "removed"}
                }
                device = self.collection.find_one(query_fallback)
                if device:
                    fallback_msg = f"� Found device using snake_case fallback"
                    print(fallback_msg)
                    with open("debug.log", "a", encoding="utf-8") as f:
                        f.write(f"{fallback_msg}\n")
            
            if device:
                device['_id'] = str(device['_id'])
                result_msg = f"✅ Found device: {device.get('deviceId', device.get('device_id', 'unknown'))}"
                print(result_msg)
                with open("debug.log", "a", encoding="utf-8") as f:
                    f.write(f"{result_msg}\n")
            else:
                result_msg = f"❌ No device found at position"
                print(result_msg)
                with open("debug.log", "a", encoding="utf-8") as f:
                    f.write(f"{result_msg}\n")
            return device
        except Exception as e:
            error_msg = f"Error getting device by position: {e}"
            print(error_msg)
            with open("debug.log", "a", encoding="utf-8") as f:
                f.write(f"{error_msg}\n")
            return None
    
    def create(self, data):
        """Create new device"""
        try:
            # Add metadata
            data['created_at'] = datetime.now()
            data['status'] = 'active'
            
            result = self.collection.insert_one(data)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error creating device: {e}")
            return None
    
    def update(self, device_id, data):
        """Update device by ID"""
        try:
            from bson import ObjectId
            update_data = data.copy()
            update_data['updated_at'] = datetime.now()
            
            result = self.collection.update_one(
                {"_id": ObjectId(device_id)},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating device: {e}")
            return False
    
    def delete(self, device_id):
        """Delete device by ID - archives to history then removes from stability_devices"""
        try:
            from bson import ObjectId
            
            # Get the device first
            device = self.get_by_id(device_id)
            if not device:
                return False
            
            # Move to history
            history_model = StabilityHistoryModel(self.db_manager)
            history_result = history_model.archive_device(device, "System")
            if not history_result:
                print(f"Failed to archive device to history")
                return False
            
            # Actually DELETE the device from stability_devices
            result = self.collection.delete_one({"_id": ObjectId(device_id)})
            return result.deleted_count > 0
        except Exception as e:
            print(f"Error deleting device: {e}")
            return False
    
    def update_by_position(self, section_key, subsection_key, row, col, data):
        """Update or create device at position"""
        try:
            # Check if device exists
            existing = self.get_by_position(section_key, subsection_key, row, col)
            
            if existing:
                # Update existing device
                update_data = data.copy()
                update_data['updated_at'] = datetime.now()
                
                result = self.collection.update_one(
                    {"_id": existing["_id"]},
                    {"$set": update_data}
                )
                return result.modified_count > 0
            else:
                # Create new device
                data['section_key'] = section_key
                data['subsection_key'] = subsection_key
                data['row'] = row
                data['col'] = col
                return self.create(data) is not None
                
        except Exception as e:
            print(f"Error updating device: {e}")
            return False
    
    def soft_delete(self, section_key, subsection_key, row, col, removed_by):
        """Soft delete device (mark as removed)"""
        try:
            debug_msg = f"🗑️ soft_delete called: section='{section_key}', subsection='{subsection_key}', row={row}, col={col}"
            print(debug_msg)
            with open("debug.log", "a", encoding="utf-8") as f:
                f.write(f"{debug_msg}\n")
            
            device = self.get_by_position(section_key, subsection_key, row, col)
            if not device:
                error_msg = f"❌ soft_delete: Device not found at position"
                print(error_msg)
                with open("debug.log", "a", encoding="utf-8") as f:
                    f.write(f"{error_msg}\n")
                return False
            
            success_msg = f"📦 Device found for deletion: {device.get('deviceId', device.get('device_id', 'unknown'))}"
            print(success_msg)
            with open("debug.log", "a", encoding="utf-8") as f:
                f.write(f"{success_msg}\n")
            
            # Move to history
            try:
                history_model = StabilityHistoryModel(self.db_manager)
                history_model.archive_device(device, removed_by)
                print(f"📝 Device archived to history")
            except Exception as history_error:
                print(f"⚠️ Warning: Could not archive to history: {history_error}")
                return False  # Don't delete if archiving failed
            
            # Store the _id for deletion BEFORE archiving
            from bson import ObjectId
            device_object_id = device['_id']
            if isinstance(device_object_id, str):
                device_object_id = ObjectId(device_object_id)
            
            # Actually DELETE the device from stability_devices collection using _id
            delete_query = {"_id": device_object_id}
            
            delete_msg = f"🗑️ Deleting device from stability_devices with _id: {device_object_id}"
            print(delete_msg)
            with open("debug.log", "a", encoding="utf-8") as f:
                f.write(f"{delete_msg}\n")
            
            result = self.collection.delete_one(delete_query)
            final_msg = f"📊 Delete result: deleted_count={result.deleted_count}"
            print(final_msg)
            with open("debug.log", "a", encoding="utf-8") as f:
                f.write(f"{final_msg}\n")
            
            if result.deleted_count > 0:
                print(f"✅ Successfully deleted device from stability_devices collection")
            else:
                print(f"❌ Failed to delete device - deleted_count is 0")
            
            return result.deleted_count > 0
            
        except Exception as e:
            print(f"Error soft deleting device: {e}")
            return False
    
    def check_expired_devices(self):
        """Check for devices that have exceeded their time limit"""
        try:
            expired_devices = []
            active_devices = self.get_all()
            
            for device in active_devices:
                # Support both camelCase and snake_case field names
                time_hours = device.get('time_hours') or device.get('timeHours')
                in_date = device.get('in_date') or device.get('inDate')
                in_time = device.get('in_time') or device.get('inTime')
                
                # Check if device has required fields
                if not time_hours or not in_date or not in_time:
                    continue
                
                try:
                    # Parse in_date and in_time - handle both HH:MM and HH:MM:SS formats
                    in_datetime_str = f"{in_date} {in_time}"
                    # Try parsing with seconds first, then without
                    try:
                        in_datetime = datetime.strptime(in_datetime_str, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        in_datetime = datetime.strptime(in_datetime_str, "%Y-%m-%d %H:%M")
                    
                    # Calculate expiry time
                    time_hours_float = float(time_hours)
                    expiry_time = in_datetime + timedelta(hours=time_hours_float)
                    
                    # Check if expired - use local time
                    current_time = datetime.now()
                    print(f"🕐 Device {device.get('deviceId')}: in={in_datetime}, expiry={expiry_time}, now={current_time}")
                    
                    if current_time > expiry_time:
                        # Get section/subsection keys with fallback to both naming conventions
                        section_key = device.get('sectionKey') or device.get('section_key', 'Unknown')
                        subsection_key = device.get('subsectionKey') or device.get('subsection_key', '')
                        device_id = device.get('deviceId') or device.get('device_id', 'Unknown')
                        
                        expired_devices.append({
                            'device_id': device_id,
                            'section_key': section_key,
                            'subsection_key': subsection_key,
                            'row': device['row'],
                            'col': device['col'],
                            'expired_time': expiry_time.isoformat(),
                            'hours_over': (current_time - expiry_time).total_seconds() / 3600
                        })
                        
                except (ValueError, KeyError) as e:
                    print(f"Error parsing device time data: {e}")
                    continue
            
            return expired_devices
            
        except Exception as e:
            print(f"Error checking expired devices: {e}")
            return []

class StabilityHistoryModel:
    """Model for stability device history"""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.collection = db_manager.db.stability_history
    
    def get_by_device_id(self, device_id):
        """Get history for a specific device ID"""
        try:
            history = list(self.collection.find({
                "device_id": device_id
            }).sort("created_at", -1))  # Most recent first
            
            # Convert ObjectId to string
            for item in history:
                item['_id'] = str(item['_id'])
            
            return history
        except Exception as e:
            print(f"Error getting device history: {e}")
            return []
    
    def get_by_position(self, section_key, subsection_key, row, col):
        """Get history for specific position"""
        try:
            # Try both field naming conventions (camelCase and snake_case)
            query_camelcase = {
                "sectionKey": section_key,
                "subsectionKey": subsection_key,
                "row": row,
                "col": col
            }
            
            query_snake_case = {
                "section_key": section_key,
                "subsection_key": subsection_key,
                "row": row,
                "col": col
            }
            
            # First try camelCase (which is what device model uses)
            history = list(self.collection.find(query_camelcase).sort("created_at", -1))
            
            # If no results with camelCase, try snake_case
            if not history:
                history = list(self.collection.find(query_snake_case).sort("created_at", -1))
            
            # Convert ObjectId to string
            for item in history:
                item['_id'] = str(item['_id'])
            
            return history
        except Exception as e:
            print(f"Error getting history: {e}")
            return []
    
    def add_entry(self, data):
        """Add history entry"""
        try:
            data['created_at'] = datetime.now()
            result = self.collection.insert_one(data)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error adding history entry: {e}")
            return None
    
    def archive_device(self, device, removed_by):
        """Archive device to history"""
        try:
            history_entry = device.copy()
            history_entry['removed_by'] = removed_by
            history_entry['removed_at'] = datetime.now()
            print(f"Archiving device to history: {history_entry}")
            # Remove the original _id to create new history entry
            if '_id' in history_entry:
                del history_entry['_id']
            
            # Ensure consistent field naming - prefer snake_case for history
            if 'section_key' in history_entry and 'sectionKey' not in history_entry:
                history_entry['sectionKey'] = history_entry['section_key']
            if 'subsection_key' in history_entry and 'subsectionKey' not in history_entry:
                history_entry['subsectionKey'] = history_entry['subsection_key']
            
            # Normalize createdBy to created_by for consistency
            if 'createdBy' in history_entry:
                history_entry['created_by'] = history_entry['createdBy']
            
            # Calculate duration and set removal times
            in_date = device.get('inDate') or device.get('in_date')
            in_time = device.get('inTime') or device.get('in_time')
            
            if in_date and in_time:
                try:
                    in_datetime_str = f"{in_date} {in_time}"
                    # Handle both HH:MM and HH:MM:SS formats
                    try:
                        in_datetime = datetime.strptime(in_datetime_str, "%Y-%m-%d %H:%M:%S")
                    except ValueError:
                        in_datetime = datetime.strptime(in_datetime_str, "%Y-%m-%d %H:%M")
                    
                    duration = datetime.now() - in_datetime
                    
                    total_seconds = int(duration.total_seconds())
                    history_entry['duration_hours'] = total_seconds // 3600
                    history_entry['duration_minutes'] = (total_seconds % 3600) // 60
                    history_entry['duration_seconds'] = total_seconds % 60
                    history_entry['actual_hours_stayed'] = total_seconds / 3600
                    
                    # Set out_date and out_time
                    now = datetime.now()
                    history_entry['out_date'] = now.strftime("%Y-%m-%d")
                    history_entry['out_time'] = now.strftime("%H:%M")
                    
                except (ValueError, KeyError):
                    pass
            
            # Copy planned duration from device if available
            if 'hours' in device or 'minutes' in device or 'seconds' in device:
                history_entry['planned_hours'] = device.get('hours', 0)
                history_entry['planned_minutes'] = device.get('minutes', 0) 
                history_entry['planned_seconds'] = device.get('seconds', 0)
            
            result = self.collection.insert_one(history_entry)
            return str(result.inserted_id)
            
        except Exception as e:
            print(f"Error archiving device: {e}")
            return None