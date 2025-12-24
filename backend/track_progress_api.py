"""
Track Progress API Module
Handles all CRUD operations for work packages, tasks, and subtasks
MongoDB Collections:
- work_packages: Main work package data
- tasks: Tasks within work packages
- subtasks: Subtasks within tasks
"""
import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Optional
from flask import jsonify, request, Blueprint
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Blueprint for Track Progress API
track_progress_bp = Blueprint('track_progress', __name__)

class TrackProgressAPI:
    """Track Progress API class handling all work package, task, and subtask operations"""
    
    def __init__(self):
        # MongoDB connection
        self.connection_string = os.getenv('MONGODB_CONNECTION_STRING')
        self.database_name = os.getenv('DATABASE_NAME', 'passdown_db')
        self.client = None
        self.db = None
        self._connect_to_mongodb()
        
        # Collection names
        self.COLLECTION_WORK_PACKAGES = 'work_packages'
    
    def _connect_to_mongodb(self):
        """Establish MongoDB connection"""
        try:
            if not self.connection_string:
                logging.warning("MongoDB connection string not found. Using local fallback.")
                return
            
            self.client = MongoClient(self.connection_string)
            self.db = self.client[self.database_name]
            # Test connection
            self.client.server_info()
            logging.info("✅ MongoDB connection established for Track Progress API")
        except Exception as e:
            logging.error(f"❌ MongoDB connection failed: {e}")
            self.client = None
            self.db = None
    
    def _serialize_doc(self, doc):
        """Convert MongoDB document to JSON-serializable format"""
        if doc and '_id' in doc:
            doc['_id'] = str(doc['_id'])
        return doc
    
    def _sort_tasks_by_priority(self, tasks):
        """Sort tasks by priority (P1=Critical, P2=High, P3=Medium, P4=Low, P5=Very Low)"""
        if not tasks:
            return []
        # Sort by priority ascending (1=Critical, 2=High, 3=Medium, 4=Low, 5=Very Low)
        return sorted(tasks, key=lambda task: task.get('priority', 3))
    
    # ==================== WORK PACKAGES ====================
    
    def get_all_work_packages(self):
        """Get all work packages with their tasks sorted by priority"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            work_packages = list(self.db[self.COLLECTION_WORK_PACKAGES].find().sort('created_at', -1))
            
            # Sort tasks within each work package by priority
            for wp in work_packages:
                if 'tasks' in wp and wp['tasks']:
                    wp['tasks'] = self._sort_tasks_by_priority(wp['tasks'])
            
            serialized = [self._serialize_doc(wp) for wp in work_packages]
            
            return jsonify({"success": True, "data": serialized}), 200
        except Exception as e:
            logging.error(f"Error getting work packages: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def get_work_package_by_id(self, wp_id):
        """Get a specific work package by ID"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            work_package = self.db[self.COLLECTION_WORK_PACKAGES].find_one({'id': wp_id})
            
            if not work_package:
                return jsonify({"success": False, "error": "Work package not found"}), 404
            
            return jsonify({"success": True, "data": self._serialize_doc(work_package)}), 200
        except Exception as e:
            logging.error(f"Error getting work package: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def create_work_package(self, data):
        """Create a new work package"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            # Generate unique ID
            existing_packages = list(self.db[self.COLLECTION_WORK_PACKAGES].find())
            next_number = len(existing_packages) + 1
            wp_id = f"wp{next_number}"
            
            # Ensure unique ID
            while self.db[self.COLLECTION_WORK_PACKAGES].find_one({'id': wp_id}):
                next_number += 1
                wp_id = f"wp{next_number}"
            
            work_package = {
                'id': wp_id,
                'name': data.get('name'),
                'status': data.get('status', 'planning'),
                'deliverable': data.get('deliverable', ''),
                'partnership': data.get('partnership', ''),
                'deadline': data.get('deadline', ''),
                'tasks': [],
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            result = self.db[self.COLLECTION_WORK_PACKAGES].insert_one(work_package)
            work_package['_id'] = str(result.inserted_id)
            
            logging.info(f"✅ Created work package: {wp_id}")
            return jsonify({"success": True, "data": self._serialize_doc(work_package)}), 201
        except Exception as e:
            logging.error(f"Error creating work package: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def update_work_package(self, wp_id, data):
        """Update a work package"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            update_data = {
                'updated_at': datetime.now().isoformat()
            }
            
            # Update only provided fields
            allowed_fields = ['name', 'status', 'deliverable', 'partnership', 'deadline', 'tasks']
            for field in allowed_fields:
                if field in data:
                    update_data[field] = data[field]
            
            result = self.db[self.COLLECTION_WORK_PACKAGES].update_one(
                {'id': wp_id},
                {'$set': update_data}
            )
            
            if result.matched_count == 0:
                return jsonify({"success": False, "error": "Work package not found"}), 404
            
            logging.info(f"✅ Updated work package: {wp_id}")
            return jsonify({"success": True, "message": "Work package updated"}), 200
        except Exception as e:
            logging.error(f"Error updating work package: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def delete_work_package(self, wp_id):
        """Delete a work package"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            result = self.db[self.COLLECTION_WORK_PACKAGES].delete_one({'id': wp_id})
            
            if result.deleted_count == 0:
                return jsonify({"success": False, "error": "Work package not found"}), 404
            
            logging.info(f"✅ Deleted work package: {wp_id}")
            return jsonify({"success": True, "message": "Work package deleted"}), 200
        except Exception as e:
            logging.error(f"Error deleting work package: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    # ==================== TASKS ====================
    
    def add_task_to_package(self, wp_id, task_data):
        """Add a task to a work package"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            # Get the work package
            work_package = self.db[self.COLLECTION_WORK_PACKAGES].find_one({'id': wp_id})
            if not work_package:
                return jsonify({"success": False, "error": "Work package not found"}), 404
            
            # Create new task
            task = {
                'id': task_data.get('id', f"t{int(datetime.now().timestamp() * 1000)}"),
                'title': task_data.get('title'),
                'responsible': task_data.get('responsible', 'TBD'),
                'accountable': task_data.get('accountable', 'TBD'),
                'consulted': task_data.get('consulted', 'TBD'),
                'informed': task_data.get('informed', 'TBD'),
                'priority': task_data.get('priority', 3),  # Default to P3 - Medium
                'progress': task_data.get('progress', 0),
                'subtasks': task_data.get('subtasks', []),
                'created_at': datetime.now().isoformat()
            }
            
            # Add task to work package
            result = self.db[self.COLLECTION_WORK_PACKAGES].update_one(
                {'id': wp_id},
                {
                    '$push': {'tasks': task},
                    '$set': {'updated_at': datetime.now().isoformat()}
                }
            )
            
            if result.matched_count == 0:
                return jsonify({"success": False, "error": "Work package not found"}), 404
            
            logging.info(f"✅ Added task {task['id']} to work package {wp_id}")
            return jsonify({"success": True, "data": task}), 201
        except Exception as e:
            logging.error(f"Error adding task: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def update_task(self, wp_id, task_id, task_data):
        """Update a specific task in a work package"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            # Get the work package
            work_package = self.db[self.COLLECTION_WORK_PACKAGES].find_one({'id': wp_id})
            if not work_package:
                return jsonify({"success": False, "error": "Work package not found"}), 404
            
            # Find and update the task
            tasks = work_package.get('tasks', [])
            task_found = False
            
            for i, task in enumerate(tasks):
                if task['id'] == task_id:
                    # Update task fields
                    for key, value in task_data.items():
                        if key != 'id':  # Don't update ID
                            tasks[i][key] = value
                    task_found = True
                    break
            
            if not task_found:
                return jsonify({"success": False, "error": "Task not found"}), 404
            
            # Update the work package with modified tasks
            result = self.db[self.COLLECTION_WORK_PACKAGES].update_one(
                {'id': wp_id},
                {
                    '$set': {
                        'tasks': tasks,
                        'updated_at': datetime.now().isoformat()
                    }
                }
            )
            
            logging.info(f"✅ Updated task {task_id} in work package {wp_id}")
            return jsonify({"success": True, "message": "Task updated"}), 200
        except Exception as e:
            logging.error(f"Error updating task: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def delete_task(self, wp_id, task_id):
        """Delete a task from a work package"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            result = self.db[self.COLLECTION_WORK_PACKAGES].update_one(
                {'id': wp_id},
                {
                    '$pull': {'tasks': {'id': task_id}},
                    '$set': {'updated_at': datetime.now().isoformat()}
                }
            )
            
            if result.matched_count == 0:
                return jsonify({"success": False, "error": "Work package not found"}), 404
            
            logging.info(f"✅ Deleted task {task_id} from work package {wp_id}")
            return jsonify({"success": True, "message": "Task deleted"}), 200
        except Exception as e:
            logging.error(f"Error deleting task: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    # ==================== SUBTASKS ====================
    
    def add_subtask_to_task(self, wp_id, task_id, subtask_data):
        """Add a subtask to a task"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            # Get the work package
            work_package = self.db[self.COLLECTION_WORK_PACKAGES].find_one({'id': wp_id})
            if not work_package:
                return jsonify({"success": False, "error": "Work package not found"}), 404
            
            # Find the task and add subtask
            tasks = work_package.get('tasks', [])
            task_found = False
            
            for i, task in enumerate(tasks):
                if task['id'] == task_id:
                    subtask = {
                        'id': subtask_data.get('id', f"st{int(datetime.now().timestamp() * 1000)}"),
                        'title': subtask_data.get('title'),
                        'completed': subtask_data.get('completed', False),
                        'progress': subtask_data.get('progress', 0),
                        'responsible': subtask_data.get('responsible', ''),
                        'accountable': subtask_data.get('accountable', ''),
                        'consulted': subtask_data.get('consulted', ''),
                        'informed': subtask_data.get('informed', ''),
                        'deadline': subtask_data.get('deadline', ''),
                        'created_at': datetime.now().isoformat()
                    }
                    
                    if 'subtasks' not in tasks[i]:
                        tasks[i]['subtasks'] = []
                    tasks[i]['subtasks'].append(subtask)
                    task_found = True
                    break
            
            if not task_found:
                return jsonify({"success": False, "error": "Task not found"}), 404
            
            # Update the work package
            result = self.db[self.COLLECTION_WORK_PACKAGES].update_one(
                {'id': wp_id},
                {
                    '$set': {
                        'tasks': tasks,
                        'updated_at': datetime.now().isoformat()
                    }
                }
            )
            
            logging.info(f"✅ Added subtask to task {task_id} in work package {wp_id}")
            return jsonify({"success": True, "data": subtask}), 201
        except Exception as e:
            logging.error(f"Error adding subtask: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def update_subtask(self, wp_id, task_id, subtask_id, subtask_data):
        """Update a specific subtask"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            # Get the work package
            work_package = self.db[self.COLLECTION_WORK_PACKAGES].find_one({'id': wp_id})
            if not work_package:
                return jsonify({"success": False, "error": "Work package not found"}), 404
            
            # Find and update the subtask
            tasks = work_package.get('tasks', [])
            subtask_found = False
            
            for i, task in enumerate(tasks):
                if task['id'] == task_id:
                    subtasks = task.get('subtasks', [])
                    for j, subtask in enumerate(subtasks):
                        if subtask['id'] == subtask_id:
                            # Update subtask fields
                            for key, value in subtask_data.items():
                                if key != 'id':  # Don't update ID
                                    tasks[i]['subtasks'][j][key] = value
                            subtask_found = True
                            break
                    if subtask_found:
                        break
            
            if not subtask_found:
                return jsonify({"success": False, "error": "Subtask not found"}), 404
            
            # Update the work package
            result = self.db[self.COLLECTION_WORK_PACKAGES].update_one(
                {'id': wp_id},
                {
                    '$set': {
                        'tasks': tasks,
                        'updated_at': datetime.now().isoformat()
                    }
                }
            )
            
            logging.info(f"✅ Updated subtask {subtask_id} in task {task_id}")
            return jsonify({"success": True, "message": "Subtask updated"}), 200
        except Exception as e:
            logging.error(f"Error updating subtask: {e}")
            return jsonify({"success": False, "error": str(e)}), 500
    
    def delete_subtask(self, wp_id, task_id, subtask_id):
        """Delete a subtask from a task"""
        try:
            if self.db is None:
                return jsonify({"success": False, "error": "Database not connected"}), 500
            
            # Get the work package
            work_package = self.db[self.COLLECTION_WORK_PACKAGES].find_one({'id': wp_id})
            if not work_package:
                return jsonify({"success": False, "error": "Work package not found"}), 404
            
            # Find and remove the subtask
            tasks = work_package.get('tasks', [])
            subtask_found = False
            
            for i, task in enumerate(tasks):
                if task['id'] == task_id:
                    subtasks = task.get('subtasks', [])
                    tasks[i]['subtasks'] = [st for st in subtasks if st['id'] != subtask_id]
                    subtask_found = True
                    break
            
            if not subtask_found:
                return jsonify({"success": False, "error": "Task not found"}), 404
            
            # Update the work package
            result = self.db[self.COLLECTION_WORK_PACKAGES].update_one(
                {'id': wp_id},
                {
                    '$set': {
                        'tasks': tasks,
                        'updated_at': datetime.now().isoformat()
                    }
                }
            )
            
            logging.info(f"✅ Deleted subtask {subtask_id} from task {task_id}")
            return jsonify({"success": True, "message": "Subtask deleted"}), 200
        except Exception as e:
            logging.error(f"Error deleting subtask: {e}")
            return jsonify({"success": False, "error": str(e)}), 500


# Create API instance
track_progress_api = TrackProgressAPI()


# ==================== FLASK ROUTES ====================

@track_progress_bp.route('/work-packages', methods=['GET'])
def get_work_packages():
    """GET all work packages"""
    return track_progress_api.get_all_work_packages()


@track_progress_bp.route('/work-packages/<wp_id>', methods=['GET'])
def get_work_package(wp_id):
    """GET a specific work package"""
    return track_progress_api.get_work_package_by_id(wp_id)


@track_progress_bp.route('/work-packages', methods=['POST'])
def create_work_package():
    """POST create a new work package"""
    return track_progress_api.create_work_package(request.get_json())


@track_progress_bp.route('/work-packages/<wp_id>', methods=['PUT'])
def update_work_package(wp_id):
    """PUT update a work package"""
    return track_progress_api.update_work_package(wp_id, request.get_json())


@track_progress_bp.route('/work-packages/<wp_id>', methods=['DELETE'])
def delete_work_package(wp_id):
    """DELETE a work package"""
    return track_progress_api.delete_work_package(wp_id)


@track_progress_bp.route('/work-packages/<wp_id>/tasks', methods=['POST'])
def add_task(wp_id):
    """POST add a task to a work package"""
    return track_progress_api.add_task_to_package(wp_id, request.get_json())


@track_progress_bp.route('/work-packages/<wp_id>/tasks/<task_id>', methods=['PUT'])
def update_task(wp_id, task_id):
    """PUT update a task"""
    return track_progress_api.update_task(wp_id, task_id, request.get_json())


@track_progress_bp.route('/work-packages/<wp_id>/tasks/<task_id>', methods=['DELETE'])
def delete_task(wp_id, task_id):
    """DELETE a task"""
    return track_progress_api.delete_task(wp_id, task_id)


@track_progress_bp.route('/work-packages/<wp_id>/tasks/<task_id>/subtasks', methods=['POST'])
def add_subtask(wp_id, task_id):
    """POST add a subtask to a task"""
    return track_progress_api.add_subtask_to_task(wp_id, task_id, request.get_json())


@track_progress_bp.route('/work-packages/<wp_id>/tasks/<task_id>/subtasks/<subtask_id>', methods=['PUT'])
def update_subtask(wp_id, task_id, subtask_id):
    """PUT update a subtask"""
    return track_progress_api.update_subtask(wp_id, task_id, subtask_id, request.get_json())


@track_progress_bp.route('/work-packages/<wp_id>/tasks/<task_id>/subtasks/<subtask_id>', methods=['DELETE'])
def delete_subtask(wp_id, task_id, subtask_id):
    """DELETE a subtask"""
    return track_progress_api.delete_subtask(wp_id, task_id, subtask_id)
