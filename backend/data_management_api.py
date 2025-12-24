"""
Data Management API Module
Handles all CRUD operations for safety issues, kudos, and top issues
"""
import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional
from flask import jsonify
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class DataManagementAPI:
    """Data Management API class handling all data CRUD operations"""
    
    def __init__(self):
        # MongoDB connection
        self.connection_string = os.getenv('MONGODB_CONNECTION_STRING')
        self.database_name = os.getenv('DATABASE_NAME', 'passdown_db')
        self.client = None
        self.db = None
        self._connect_to_mongodb()
        
        # Collection names
        self.COLLECTION_SAFETY = 'safety_issues'
        self.COLLECTION_KUDOS = 'kudos_entries'
        self.COLLECTION_TOP_ISSUES = 'top_issues'
        self.COLLECTION_BATCH_PRIORITY = 'batch_priorities'
        self.COLLECTION_BATCH_LOCATION = 'batch_location_history'
        self.COLLECTION_BASELINE_BATCHES = 'baseline_batches'
    
    def _connect_to_mongodb(self):
        """Establish MongoDB connection"""
        try:
            if not self.connection_string:
                logging.warning("MongoDB connection string not found. Using local fallback.")
                return
            
            self.client = MongoClient(
                self.connection_string,
                serverSelectionTimeoutMS=60000,  # 60 seconds for Azure
                connectTimeoutMS=60000,
                socketTimeoutMS=60000
            )
            self.db = self.client[self.database_name]
            # Test connection
            self.client.server_info()
            
            # Create unique index to prevent duplicates
            self.db['top_issues'].create_index('id', unique=True)
            logging.info("✅ MongoDB connection established")
        except Exception as e:
            logging.error(f"❌ MongoDB connection failed: {e}")
            logging.error(f"Connection string (first 50 chars): {self.connection_string[:50] if self.connection_string else 'None'}...")
            logging.error(f"Database name: {self.database_name}")
            import traceback
            logging.error(f"Full traceback: {traceback.format_exc()}")
            self.client = None
            self.db = None
    
    def _serialize_doc(self, doc):
        """Convert MongoDB document to JSON-serializable format"""
        if doc and '_id' in doc:
            doc['_id'] = str(doc['_id'])
        return doc
    
    # ==================== SAFETY ISSUES ====================
    
    def _get_safety_issues_data(self, limit=None, skip=0):
        """Get safety issues data (for caching) - returns dict, not Response"""
        if self.db is None:
            raise Exception("Database not connected")
        
        # Get total count
        total_count = self.db[self.COLLECTION_SAFETY].count_documents({})
        
        # Build query with pagination
        query = self.db[self.COLLECTION_SAFETY].find().sort('date', -1)
        if skip > 0:
            query = query.skip(skip)
        if limit:
            query = query.limit(limit)
        
        issues = list(query)
        serialized = [self._serialize_doc(issue) for issue in issues]
        
        return {
            "success": True, 
            "data": serialized,
            "total": total_count,
            "count": len(serialized),
            "skip": skip,
            "limit": limit
        }
    
    def get_all_safety_issues(self, limit=None, skip=0):
        """Get all safety issues with optional pagination"""
        try:
            data = self._get_safety_issues_data(limit, skip)
            return jsonify(data), 200
        except Exception as e:
            logging.error(f"Error getting safety issues: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def create_safety_issue(self, data):
        """Create a new safety issue"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            # Get the next ID (max + 1)
            existing_issues = list(self.db[self.COLLECTION_SAFETY].find())
            next_id = max([item.get('id', 0) for item in existing_issues], default=0) + 1
            
            issue = {
                'id': next_id,
                'issue': data.get('issue'),
                'person': data.get('person'),
                'action': data.get('action'),
                'done': data.get('done', 'No'),  # Default to "No" for new issues
                'date': datetime.now().strftime('%m/%d'),
                'timestamp': datetime.now().isoformat()
            }
            
            result = self.db[self.COLLECTION_SAFETY].insert_one(issue)
            issue['_id'] = str(result.inserted_id)
            
            return jsonify({"success": True, "data": self._serialize_doc(issue)}), 201
        except Exception as e:
            logging.error(f"Error creating safety issue: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def update_safety_issue(self, issue_id, data):
        """Update a safety issue"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            logging.info(f"🔄 Updating safety issue {issue_id} with data: {data}")
            
            update_data = {}
            if 'done' in data:
                update_data['done'] = data['done']
                logging.info(f"📝 Setting done status to: {data['done']}")
            if 'issue' in data:
                update_data['issue'] = data['issue']
            if 'person' in data:
                update_data['person'] = data['person']
            if 'action' in data:
                update_data['action'] = data['action']
            
            result = self.db[self.COLLECTION_SAFETY].update_one(
                {'_id': ObjectId(issue_id)},
                {'$set': update_data}
            )
            
            logging.info(f"✅ Update result: matched={result.matched_count}, modified={result.modified_count}")
            
            if result.matched_count == 0:
                return jsonify({"success": False, "error": "Issue not found"}), 404
            
            return jsonify({"success": True, "message": "Issue updated"}), 200
        except Exception as e:
            logging.error(f"Error updating safety issue: {e}")
            return jsonify({"success": False, "error": str(e)}), 500

    def delete_safety_issue(self, issue_id):
        """Delete a safety issue"""
        try:
            if self.db is None:
                logging.error("❌ MongoDB not connected")
                return jsonify({"success": False, "error": "Database error"}), 500
            
            logging.info(f"🗑️ Attempting to delete safety issue: {issue_id}")
            result = self.db[self.COLLECTION_SAFETY].delete_one({'_id': ObjectId(issue_id)})
            
            if result.deleted_count == 0:
                logging.warning(f"⚠️ Safety issue not found: {issue_id}")
                return jsonify({"success": False, "error": "Issue not found"}), 404
            
            logging.info(f"✅ Successfully deleted safety issue: {issue_id}")
            return jsonify({"success": True, "message": "Issue deleted"}), 200
        except Exception as e:
            logging.error(f"❌ Error deleting safety issue {issue_id}: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    # ==================== KUDOS ====================
    
    def _get_kudos_data(self, limit=None, skip=0):
        """Get kudos data (for caching) - returns dict, not Response"""
        if self.db is None:
            raise Exception("Database not connected")
        
        # Get total count
        total_count = self.db[self.COLLECTION_KUDOS].count_documents({})
        
        # Build query with pagination
        query = self.db[self.COLLECTION_KUDOS].find().sort('date', -1)
        if skip > 0:
            query = query.skip(skip)
        if limit:
            query = query.limit(limit)
        
        kudos = list(query)
        serialized = [self._serialize_doc(entry) for entry in kudos]
        
        return {
            "success": True, 
            "data": serialized,
            "total": total_count,
            "count": len(serialized),
            "skip": skip,
            "limit": limit
        }
    
    def get_all_kudos(self, limit=None, skip=0):
        """Get all kudos entries with optional pagination"""
        try:
            data = self._get_kudos_data(limit, skip)
            return jsonify(data), 200
        except Exception as e:
            logging.error(f"Error getting kudos: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def create_kudos(self, data):
        """Create a new kudos entry"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            # Get the next ID (max + 1)
            existing_kudos = list(self.db[self.COLLECTION_KUDOS].find())
            next_id = max([item.get('id', 0) for item in existing_kudos], default=0) + 1
            
            kudos = {
                'id': next_id,
                'name': data.get('name'),
                'action': data.get('action'),
                'by_whom': data.get('by_whom', ''),
                'date': datetime.now().strftime('%m/%d'),
                'timestamp': datetime.now().isoformat()
            }
            
            result = self.db[self.COLLECTION_KUDOS].insert_one(kudos)
            kudos['_id'] = str(result.inserted_id)
            
            return jsonify({"success": True, "data": self._serialize_doc(kudos)}), 201
        except Exception as e:
            logging.error(f"Error creating kudos: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def delete_kudos(self, kudos_id):
        """Delete a kudos entry"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            result = self.db[self.COLLECTION_KUDOS].delete_one({'_id': ObjectId(kudos_id)})
            
            if result.deleted_count == 0:
                return jsonify({"success": False, "error": "Kudos not found"}), 404
            
            return jsonify({"success": True, "message": "Kudos deleted"}), 200
        except Exception as e:
            logging.error(f"Error deleting kudos: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    # ==================== TOP ISSUES (Unified - replaces today/yesterday) ====================
    
    def get_all_top_issues(self, limit=None, skip=0, status=None):
        """Get all top issues with optional pagination and status filter
        status: 'Pending' or 'Done' or None (all)
        """
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            # Build filter
            filter_query = {}
            if status:
                filter_query['status'] = status
            
            # Get total count
            total_count = self.db[self.COLLECTION_TOP_ISSUES].count_documents(filter_query)
            
            # Build query with pagination
            query = self.db[self.COLLECTION_TOP_ISSUES].find(filter_query).sort('id', 1)
            if skip > 0:
                query = query.skip(skip)
            if limit:
                query = query.limit(limit)
            
            issues = list(query)
            # Add sr_no as alias for id for frontend compatibility
            for issue in issues:
                issue['sr_no'] = issue.get('id')
            serialized = [self._serialize_doc(issue) for issue in issues]
            
            return jsonify({
                "success": True, 
                "data": serialized,
                "total": total_count,
                "count": len(serialized),
                "skip": skip,
                "limit": limit
            }), 200
        except Exception as e:
            logging.error(f"Error getting top issues: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    # Backward compatibility aliases
    def get_all_today_issues(self, limit=None, skip=0):
        """Backward compatibility - returns all issues"""
        return self.get_all_top_issues(limit, skip, status=None)
    
    def get_all_yesterday_issues(self, limit=None, skip=0):
        """Backward compatibility - returns pending issues"""
        return self.get_all_top_issues(limit, skip, status='Pending')
    
    def create_top_issue(self, data):
        """Create a new top issue"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            # Get next ID
            last_issue = self.db[self.COLLECTION_TOP_ISSUES].find_one(sort=[('id', -1)])
            next_id = (last_issue['id'] + 1) if last_issue else 1
            
            # Create issue with Pending status by default
            issue = {
                'id': next_id,
                'description': data.get('description'),
                'who': data.get('who'),
                'status': data.get('status', 'Pending'),
                'priority': data.get('priority', ''),
                'date': datetime.now().strftime('%m/%d'),
                'created_at': datetime.now().isoformat()
            }
            
            result = self.db[self.COLLECTION_TOP_ISSUES].insert_one(issue)
            issue['_id'] = str(result.inserted_id)
            
            return jsonify({"success": True, "data": self._serialize_doc(issue)}), 201
        except Exception as e:
            logging.error(f"Error creating top issue: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    # Backward compatibility aliases
    def create_today_issue(self, data):
        """Backward compatibility"""
        return self.create_top_issue(data)
    
    def create_yesterday_issue(self, data):
        """Backward compatibility"""
        return self.create_top_issue(data)
    
    def update_top_issue(self, issue_id, data):
        """Update a top issue"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            update_data = {}
            if 'description' in data:
                update_data['description'] = data['description']
            if 'who' in data:
                update_data['who'] = data['who']
            if 'status' in data:
                update_data['status'] = data['status']
            if 'done' in data:
                # Map 'done' field to 'status' for backward compatibility
                update_data['status'] = 'Done' if data['done'] == 'Yes' else 'Pending'
            if 'priority' in data:
                update_data['priority'] = data['priority']
            if 'date' in data:
                update_data['date'] = data['date']
            
            update_data['updated_at'] = datetime.now().isoformat()
            
            result = self.db[self.COLLECTION_TOP_ISSUES].update_one(
                {'id': int(issue_id)},
                {'$set': update_data}
            )
            
            if result.matched_count == 0:
                return jsonify({"success": False, "error": "Issue not found"}), 404
            
            return jsonify({"success": True, "message": "Issue updated"}), 200
        except Exception as e:
            logging.error(f"Error updating top issue: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    # Backward compatibility aliases
    def update_today_issue(self, issue_id, data):
        """Backward compatibility"""
        return self.update_top_issue(issue_id, data)
    
    def update_yesterday_issue(self, issue_id, data):
        """Backward compatibility"""
        return self.update_top_issue(issue_id, data)
    
    def delete_top_issue(self, issue_id):
        """Delete a top issue"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            result = self.db[self.COLLECTION_TOP_ISSUES].delete_one({'id': int(issue_id)})
            
            if result.deleted_count == 0:
                return jsonify({"success": False, "error": "Issue not found"}), 404
            
            return jsonify({"success": True, "message": "Issue deleted"}), 200
        except Exception as e:
            logging.error(f"Error deleting top issue: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    # Backward compatibility aliases
    def delete_today_issue(self, issue_id):
        """Backward compatibility"""
        return self.delete_top_issue(issue_id)
    
    def delete_yesterday_issue(self, issue_id):
        """Backward compatibility"""
        return self.delete_top_issue(issue_id)
    
    # ==================== RESET ====================

    
    # ==================== BATCH PRIORITIES ====================
    
    def get_all_batch_priorities(self):
        """Get all batch priorities"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            priorities = list(self.db[self.COLLECTION_BATCH_PRIORITY].find())
            serialized = [self._serialize_doc(priority) for priority in priorities]
            
            # Convert to dictionary for easier lookup: { batch_id: priority }
            priorities_dict = {p['batch_id']: p['priority'] for p in serialized if 'batch_id' in p and 'priority' in p}
            
            return jsonify({"success": True, "data": priorities_dict}), 200
        except Exception as e:
            logging.error(f"Error getting batch priorities: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def update_batch_priority(self, batch_id, priority):
        """Update priority for a batch"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            # If priority is empty string or None, delete the entry
            if priority is None or priority == '' or priority == 'null':
                self.db[self.COLLECTION_BATCH_PRIORITY].delete_one({'batch_id': batch_id})
                return jsonify({"success": True, "message": "Priority cleared"}), 200
            
            # Accept any value as string (h/high/m/medium/l/low/1/2/3)
            # Frontend normalizes for display logic, backend just stores
            priority_str = str(priority).strip()
            
            # Upsert: update if exists, insert if not
            result = self.db[self.COLLECTION_BATCH_PRIORITY].update_one(
                {'batch_id': batch_id},
                {'$set': {
                    'batch_id': batch_id,
                    'priority': priority_str,
                    'updated_at': datetime.now().isoformat()
                }},
                upsert=True
            )
            
            return jsonify({"success": True, "message": "Priority updated"}), 200
        except Exception as e:
            logging.error(f"Error updating batch priority: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    # ==================== BATCH LOCATION HISTORY ====================
    
    def save_batch_location_snapshot(self, batches_data):
        """Save a snapshot of batch location data to MongoDB for historical tracking"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            snapshot = {
                'timestamp': datetime.now().isoformat(),
                'date': datetime.now().strftime('%Y-%m-%d'),
                'batches': batches_data,
                'count': len(batches_data)
            }
            
            result = self.db[self.COLLECTION_BATCH_LOCATION].insert_one(snapshot)
            
            return jsonify({
                "success": True,
                "message": "Batch location snapshot saved",
                "snapshot_id": str(result.inserted_id)
            }), 201
        except Exception as e:
            logging.error(f"Error saving batch location snapshot: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def get_batch_location_history(self, days=7):
        """Get historical batch location snapshots"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            snapshots = list(
                self.db[self.COLLECTION_BATCH_LOCATION]
                .find()
                .sort('timestamp', -1)
                .limit(days * 24)  # Assuming hourly snapshots
            )
            
            serialized = [self._serialize_doc(snapshot) for snapshot in snapshots]
            
            return jsonify({"success": True, "data": serialized}), 200
        except Exception as e:
            logging.error(f"Error getting batch location history: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    

    
    # ==================== BASELINE BATCHES ====================
    
    def get_all_baseline_batches(self):
        """Get all baseline batches"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            batches = list(self.db[self.COLLECTION_BASELINE_BATCHES].find().sort('created_at', -1))
            serialized = [self._serialize_doc(batch) for batch in batches]
            
            return jsonify({"success": True, "data": serialized}), 200
        except Exception as e:
            logging.error(f"Error getting baseline batches: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def create_baseline_batch(self, data):
        """Create a new baseline batch entry"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            # Validate required fields
            if not data.get('batch') or not data.get('sheet'):
                return jsonify({"success": False, "error": "Batch and sheet are required"}), 400
            
            # Get the max ID from existing data
            existing_batches = list(self.db[self.COLLECTION_BASELINE_BATCHES].find())
            next_id = max([item.get('id', 0) for item in existing_batches], default=0) + 1
            
            # Create new baseline batch entry
            new_batch = {
                'id': next_id,
                'batch': data.get('batch').strip(),
                'sheet': data.get('sheet').strip(),
                'created_at': datetime.now().isoformat(),
                'timestamp': datetime.now().isoformat()
            }
            
            self.db[self.COLLECTION_BASELINE_BATCHES].insert_one(new_batch)
            
            return jsonify({
                "success": True,
                "message": "Baseline batch created successfully",
                "data": self._serialize_doc(new_batch)
            }), 201
        except Exception as e:
            logging.error(f"Error creating baseline batch: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def delete_baseline_batch(self, batch_id):
        """Delete a baseline batch by ID"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database error"}), 500
            
            result = self.db[self.COLLECTION_BASELINE_BATCHES].delete_one({'id': int(batch_id)})
            
            if result.deleted_count == 0:
                return jsonify({"success": False, "error": "Baseline batch not found"}), 404
            
            return jsonify({"success": True, "message": "Baseline batch deleted successfully"}), 200
        except Exception as e:
            logging.error(f"Error deleting baseline batch: {e}")
            return jsonify({"success": False, "error": str(e)}), 500

# Lazy singleton instance - will be created on first access
_data_api_instance = None

def get_data_api():
    """Get or create the singleton data API instance"""
    global _data_api_instance
    if _data_api_instance is None:
        _data_api_instance = DataManagementAPI()
    return _data_api_instance

# For backward compatibility
class DataAPIProxy:
    """Proxy class that delegates to the lazy-loaded singleton"""
    def __getattr__(self, name):
        return getattr(get_data_api(), name)

data_api = DataAPIProxy()
