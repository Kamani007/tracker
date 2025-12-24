"""
Batch Process Tracking API - MongoDB storage for tracking batch processes
Each batch goes through multiple processes - track current process for each batch
"""

import os
from datetime import datetime
import pytz
from flask import jsonify, request
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# Timezone for Atlantic Time (Halifax)
ATLANTIC_TZ = pytz.timezone('America/Halifax')

# MongoDB connection
MONGO_URI = os.getenv('MONGODB_CONNECTION_STRING', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI)
db = client['passdown_db']
batch_processes_collection = db['batch_processes']

# Process options that each batch goes through
PROCESS_OPTIONS = [
    "Solution prep",
    "P1/cleaning",
    "Coating",
    "QC/characterization",
    "P2 scribing",
    "Carbon",
    "Encapsulation",
    "Dicing",
    "Testing",
    "Stability"
]

STATUS_OPTIONS = [
    "Done",
    "Work in progress",
    "To be started"
]

class BatchTaskAPI:
    """Handle batch process tracking operations"""
    
    def get_all_batches(self):
        """Get all batches with their current process"""
        try:
            batches = list(batch_processes_collection.find(
                {},
                {'_id': 0}
            ).sort('last_updated', -1))
            
            # Convert datetime to string for JSON (with hours in Atlantic Time)
            for batch in batches:
                if 'last_updated' in batch and isinstance(batch['last_updated'], datetime):
                    # Convert UTC to Atlantic Time
                    utc_time = batch['last_updated'].replace(tzinfo=pytz.utc)
                    atlantic_time = utc_time.astimezone(ATLANTIC_TZ)
                    batch['last_updated'] = atlantic_time.strftime('%b %d, %Y %I:%M %p')
            
            return jsonify({
                'success': True,
                'data': batches,
                'count': len(batches)
            })
        except Exception as e:
            print(f"Error fetching batches: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    def add_batch(self):
        """Add a new batch"""
        try:
            data = request.get_json()
            
            # Validate required fields
            if not data.get('batch_name'):
                return jsonify({
                    'success': False,
                    'error': 'Batch name is required'
                }), 400
            
            if not data.get('current_process'):
                return jsonify({
                    'success': False,
                    'error': 'Current process is required'
                }), 400
            
            # Validate process
            if data['current_process'] not in PROCESS_OPTIONS:
                return jsonify({
                    'success': False,
                    'error': f'Invalid process. Must be one of: {", ".join(PROCESS_OPTIONS)}'
                }), 400
            
            # Validate status
            if data['status'] not in STATUS_OPTIONS:
                return jsonify({
                    'success': False,
                    'error': f'Invalid status. Must be one of: {", ".join(STATUS_OPTIONS)}'
                }), 400
            
            # Check if batch already exists
            existing = batch_processes_collection.find_one({'batch_name': data['batch_name']})
            if existing:
                return jsonify({
                    'success': False,
                    'error': 'Batch already exists'
                }), 400
            
            # Create batch document
            batch = {
                'batch_name': data['batch_name'],
                'current_process': data['current_process'],
                'status': data['status'],
                'last_updated': datetime.utcnow(),
                'created_at': datetime.utcnow()
            }
            
            # Insert into MongoDB
            batch_processes_collection.insert_one(batch)
            
            # Return created batch (without _id)
            batch.pop('_id', None)
            # Convert UTC to Atlantic Time for display
            utc_updated = batch['last_updated'].replace(tzinfo=pytz.utc)
            atlantic_updated = utc_updated.astimezone(ATLANTIC_TZ)
            batch['last_updated'] = atlantic_updated.strftime('%b %d, %Y %I:%M %p')
            
            utc_created = batch['created_at'].replace(tzinfo=pytz.utc)
            atlantic_created = utc_created.astimezone(ATLANTIC_TZ)
            batch['created_at'] = atlantic_created.strftime('%b %d, %Y %I:%M %p')
            
            return jsonify({
                'success': True,
                'message': 'Batch added successfully',
                'data': batch
            })
        except Exception as e:
            print(f"Error adding batch: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    def update_batch(self):
        """Update batch process and status"""
        try:
            data = request.get_json()
            
            # Validate required fields
            if not data.get('batch_name'):
                return jsonify({
                    'success': False,
                    'error': 'Batch name is required'
                }), 400
            
            update_fields = {}
            
            # Update process if provided
            if data.get('current_process'):
                if data['current_process'] not in PROCESS_OPTIONS:
                    return jsonify({
                        'success': False,
                        'error': f'Invalid process. Must be one of: {", ".join(PROCESS_OPTIONS)}'
                    }), 400
                update_fields['current_process'] = data['current_process']
            
            # Update status if provided
            if data.get('status'):
                if data['status'] not in STATUS_OPTIONS:
                    return jsonify({
                        'success': False,
                        'error': f'Invalid status. Must be one of: {", ".join(STATUS_OPTIONS)}'
                    }), 400
                update_fields['status'] = data['status']
            
            if not update_fields:
                return jsonify({
                    'success': False,
                    'error': 'No fields to update'
                }), 400
            
            update_fields['last_updated'] = datetime.utcnow()
            
            # Update batch in MongoDB
            result = batch_processes_collection.update_one(
                {'batch_name': data['batch_name']},
                {'$set': update_fields}
            )
            
            if result.matched_count == 0:
                return jsonify({
                    'success': False,
                    'error': 'Batch not found'
                }), 404
            
            return jsonify({
                'success': True,
                'message': 'Batch updated successfully'
            })
        except Exception as e:
            print(f"Error updating batch: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    def delete_batch(self):
        """Delete a batch"""
        try:
            batch_name = request.args.get('batch_name')
            
            if not batch_name:
                return jsonify({
                    'success': False,
                    'error': 'Batch name is required'
                }), 400
            
            # Delete from MongoDB
            result = batch_processes_collection.delete_one({'batch_name': batch_name})
            
            if result.deleted_count == 0:
                return jsonify({
                    'success': False,
                    'error': 'Batch not found'
                }), 404
            
            return jsonify({
                'success': True,
                'message': 'Batch deleted successfully'
            })
        except Exception as e:
            print(f"Error deleting batch: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 500
    
    def get_options(self):
        """Get available process and status options"""
        return jsonify({
            'success': True,
            'processes': PROCESS_OPTIONS,
            'statuses': STATUS_OPTIONS
        })

# Create API instance
batch_task_api = BatchTaskAPI()
