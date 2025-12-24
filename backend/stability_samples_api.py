"""
Stability Samples API - Position-independent sample tracking
No row/col tracking - only counts and lists
"""

import os
import logging
from datetime import datetime, timedelta
from flask import jsonify, request
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

class StabilitySamplesAPI:
    """API for managing stability samples without position tracking"""
    
    def __init__(self):
        # MongoDB connection
        self.connection_string = os.getenv('MONGODB_CONNECTION_STRING')
        self.database_name = os.getenv('DATABASE_NAME', 'passdown_db')
        self.client = None
        self.db = None
        self._connect_to_mongodb()
        
    def _connect_to_mongodb(self):
        """Establish MongoDB connection"""
        try:
            if not self.connection_string:
                logging.warning("MongoDB connection string not found")
                return
            
            self.client = MongoClient(self.connection_string)
            self.db = self.client[self.database_name]
            self.client.server_info()
            logging.info("✅ Stability Samples MongoDB connection established")
        except Exception as e:
            logging.error(f"❌ Stability Samples MongoDB connection failed: {e}")
            self.client = None
            self.db = None
    
    def get_grid_data(self):
        """Get all stability grid data with counts (no positions)"""
        try:
            if self.db is None:
                return jsonify({'success': False, 'error': 'Database not connected'}), 500
            
            # Import device data API to check T80 status
            try:
                from stability_device_data_api import get_device_data_api
                device_data_api = get_device_data_api()
            except:
                device_data_api = None
            
            # Query active samples grouped by test type and temperature
            collection = self.db.stability_samples
            
            # Structure to return
            grid_data = {
                "LS w/Temp": {
                    "37C": {"rows": 6, "cols": 4, "capacity": 24, "count": 0, "samples": []},
                    "65C": {"rows": 6, "cols": 4, "capacity": 24, "count": 0, "samples": []},
                    "85C": {"rows": 6, "cols": 4, "capacity": 24, "count": 0, "samples": []}
                },
                "Damp Heat": {
                    "": {"rows": 6, "cols": 6, "capacity": 36, "count": 0, "samples": []}
                },
                "Outdoor Testing": {
                    "": {"rows": 20, "cols": 15, "capacity": 300, "count": 0, "samples": []}
                }
            }
            
            # Get all active samples
            active_samples = list(collection.find({"status": "active"}))
            
            # Group by test type and temperature
            for sample in active_samples:
                test_type = sample.get('testType', 'LS w/Temp')
                temperature = sample.get('temperature', '37C')
                
                # Add T80 status
                if device_data_api and 'deviceId' in sample:
                    t80_status = device_data_api.check_device_t80_status(sample['deviceId'])
                    sample['has_t80'] = t80_status.get('has_t80', False)
                else:
                    sample['has_t80'] = False
                
                # Convert ObjectId to string
                sample['_id'] = str(sample['_id'])
                
                # Add to appropriate section
                if test_type in grid_data and temperature in grid_data[test_type]:
                    grid_data[test_type][temperature]['samples'].append(sample)
                    grid_data[test_type][temperature]['count'] += 1
            
            return jsonify({
                "success": True,
                "gridData": grid_data
            }), 200
            
        except Exception as e:
            logging.error(f"Error getting grid data: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def batch_add_samples(self):
        """Add multiple samples at once"""
        try:
            if self.db is None:
                return jsonify({'success': False, 'error': 'Database not connected'}), 500
            
            data = request.get_json()
            samples_data = data.get('samples', [])
            
            if not samples_data:
                return jsonify({'success': False, 'error': 'No samples provided'}), 400
            
            collection = self.db.stability_samples
            inserted_ids = []
            
            for sample_data in samples_data:
                # Use testType and temperature from each sample
                sample = {
                    'testType': sample_data.get('testType'),
                    'temperature': sample_data.get('temperature', ''),
                    'deviceId': sample_data.get('deviceId'),
                    'inDate': sample_data.get('inDate'),
                    'inTime': sample_data.get('inTime'),
                    'hours': sample_data.get('hours', 0),
                    'minutes': sample_data.get('minutes', 0),
                    'seconds': sample_data.get('seconds', 0),
                    'timeHours': sample_data.get('timeHours', 0),  # Calculated total hours
                    'targetHours': sample_data.get('targetHours', 1000),  # Target hours for completion
                    'batchName': sample_data.get('batchName', ''),  # Batch name from home page
                    'motivation': sample_data.get('motivation', ''),  # Motivation from home page
                    'status': 'active',
                    'created_at': datetime.now()
                }
                
                result = collection.insert_one(sample)
                inserted_ids.append(str(result.inserted_id))
            
            logging.info(f"✅ Added {len(inserted_ids)} samples")
            return jsonify({
                'success': True,
                'message': f'Added {len(inserted_ids)} samples',
                'inserted_ids': inserted_ids
            }), 201
            
        except Exception as e:
            logging.error(f"Error batch adding samples: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def get_active_samples(self):
        """Get active samples for a specific temperature"""
        try:
            if self.db is None:
                return jsonify({'success': False, 'error': 'Database not connected'}), 500
            
            temperature = request.args.get('temperature')
            test_type = request.args.get('testType', 'LS w/Temp')
            
            collection = self.db.stability_samples
            query = {
                'status': 'active',
                'testType': test_type
            }
            
            if temperature:
                query['temperature'] = temperature
            
            samples = list(collection.find(query))
            
            # Convert ObjectId to string
            for sample in samples:
                sample['_id'] = str(sample['_id'])
            
            return jsonify({
                'success': True,
                'samples': samples,
                'count': len(samples)
            }), 200
            
        except Exception as e:
            logging.error(f"Error getting active samples: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def get_history(self):
        """Get historical samples for a specific temperature"""
        try:
            if self.db is None:
                return jsonify({'success': False, 'error': 'Database not connected'}), 500
            
            temperature = request.args.get('temperature')
            test_type = request.args.get('testType', 'LS w/Temp')
            
            collection = self.db.stability_samples
            query = {
                'status': 'completed',
                'testType': test_type
            }
            
            if temperature:
                query['temperature'] = temperature
            
            # Sort by removed_at descending (most recent first)
            samples = list(collection.find(query).sort('removed_at', -1))
            
            # Convert ObjectId to string
            for sample in samples:
                sample['_id'] = str(sample['_id'])
            
            return jsonify({
                'success': True,
                'samples': samples,
                'count': len(samples)
            }), 200
            
        except Exception as e:
            logging.error(f"Error getting history: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def remove_samples(self):
        """Remove specific samples (move to history)"""
        try:
            if self.db is None:
                return jsonify({'success': False, 'error': 'Database not connected'}), 500
            
            data = request.get_json()
            device_ids = data.get('deviceIds', [])
            
            if not device_ids:
                return jsonify({'success': False, 'error': 'No deviceIds provided'}), 400
            
            collection = self.db.stability_samples
            removed_at = datetime.now()
            
            # Get all samples to calculate duration
            samples_to_remove = list(collection.find({'deviceId': {'$in': device_ids}, 'status': 'active'}))
            
            # Update each sample with calculated duration
            modified_count = 0
            for sample in samples_to_remove:
                # Calculate duration from inDate and inTime
                in_datetime_str = f"{sample.get('inDate')} {sample.get('inTime')}"
                try:
                    in_datetime = datetime.strptime(in_datetime_str, "%m/%d/%Y %H:%M:%S")
                    duration = removed_at - in_datetime
                    total_seconds = int(duration.total_seconds())
                    hours = total_seconds // 3600
                    minutes = (total_seconds % 3600) // 60
                    seconds = total_seconds % 60
                except:
                    hours, minutes, seconds = 0, 0, 0
                
                # Update the sample
                collection.update_one(
                    {'_id': sample['_id']},
                    {
                        '$set': {
                            'status': 'completed',
                            'removed_at': removed_at,
                            'removal_type': 'manual',
                            'hours': hours,
                            'minutes': minutes,
                            'seconds': seconds
                        }
                    }
                )
                modified_count += 1
            
            logging.info(f"✅ Removed {modified_count} samples")
            return jsonify({
                'success': True,
                'message': f'Removed {modified_count} samples',
                'removed_count': modified_count
            }), 200
            
        except Exception as e:
            logging.error(f"Error removing samples: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def remove_all_samples(self):
        """Remove all samples from a temperature (move to history)"""
        try:
            if self.db is None:
                return jsonify({'success': False, 'error': 'Database not connected'}), 500
            
            data = request.get_json()
            temperature = data.get('temperature')
            test_type = data.get('testType', 'LS w/Temp')
            
            if not temperature:
                return jsonify({'success': False, 'error': 'No temperature provided'}), 400
            
            collection = self.db.stability_samples
            removed_at = datetime.now()
            
            # Get all samples to calculate duration
            samples_to_remove = list(collection.find({
                'testType': test_type,
                'temperature': temperature,
                'status': 'active'
            }))
            
            # Update each sample with calculated duration
            modified_count = 0
            for sample in samples_to_remove:
                # Calculate duration from inDate and inTime
                in_datetime_str = f"{sample.get('inDate')} {sample.get('inTime')}"
                try:
                    in_datetime = datetime.strptime(in_datetime_str, "%m/%d/%Y %H:%M:%S")
                    duration = removed_at - in_datetime
                    total_seconds = int(duration.total_seconds())
                    hours = total_seconds // 3600
                    minutes = (total_seconds % 3600) // 60
                    seconds = total_seconds % 60
                except:
                    hours, minutes, seconds = 0, 0, 0
                
                # Update the sample
                collection.update_one(
                    {'_id': sample['_id']},
                    {
                        '$set': {
                            'status': 'completed',
                            'removed_at': removed_at,
                            'removal_type': 'manual_all',
                            'hours': hours,
                            'minutes': minutes,
                            'seconds': seconds
                        }
                    }
                )
                modified_count += 1
            
            logging.info(f"✅ Removed all {modified_count} samples from {test_type}/{temperature}")
            return jsonify({
                'success': True,
                'message': f'Removed all {modified_count} samples',
                'removed_count': modified_count
            }), 200
            
        except Exception as e:
            logging.error(f"Error removing all samples: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def get_sample_by_id(self):
        """Get a specific sample by deviceId"""
        try:
            if self.db is None:
                return jsonify({'success': False, 'error': 'Database not connected'}), 500
            
            device_id = request.args.get('deviceId')
            
            if not device_id:
                return jsonify({'success': False, 'error': 'No deviceId provided'}), 400
            
            collection = self.db.stability_samples
            sample = collection.find_one({'deviceId': device_id})
            
            if sample:
                sample['_id'] = str(sample['_id'])
                return jsonify({'success': True, 'sample': sample}), 200
            else:
                return jsonify({'success': False, 'error': 'Sample not found'}), 404
            
        except Exception as e:
            logging.error(f"Error getting sample: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500
    
    def update_sample(self):
        """Update a sample"""
        try:
            if self.db is None:
                return jsonify({'success': False, 'error': 'Database not connected'}), 500
            
            data = request.get_json()
            device_id = data.get('deviceId')
            updated_by = data.get('updated_by', 'Unknown')
            
            if not device_id:
                return jsonify({'success': False, 'error': 'No deviceId provided'}), 400
            
            collection = self.db.stability_samples
            
            # Build update data
            update_data = {
                'updated_by': updated_by,
                'updated_at': datetime.now()
            }
            
            # Add fields if provided
            if 'inDate' in data:
                update_data['inDate'] = data['inDate']
            if 'inTime' in data:
                update_data['inTime'] = data['inTime']
            if 'hours' in data:
                update_data['hours'] = data['hours']
            if 'minutes' in data:
                update_data['minutes'] = data['minutes']
            if 'seconds' in data:
                update_data['seconds'] = data['seconds']
            if 'timeHours' in data:
                update_data['timeHours'] = data['timeHours']
            
            result = collection.update_one(
                {'deviceId': device_id, 'status': 'active'},
                {'$set': update_data}
            )
            
            if result.modified_count > 0:
                return jsonify({'success': True, 'message': 'Sample updated'}), 200
            else:
                return jsonify({'success': False, 'error': 'Sample not found or not modified'}), 404
            
        except Exception as e:
            logging.error(f"Error updating sample: {e}")
            return jsonify({'success': False, 'error': str(e)}), 500

# Create global instance
stability_samples_api = StabilitySamplesAPI()
