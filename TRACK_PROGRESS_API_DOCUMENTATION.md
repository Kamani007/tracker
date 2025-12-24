# Track Progress API Documentation

## Overview
Backend API for managing work packages, tasks, and subtasks with MongoDB storage. All endpoints are prefixed with `/api/track-progress`.

## Database Structure

### MongoDB Collection: `work_packages`

```javascript
{
  "_id": ObjectId,
  "id": "wp1",  // Unique work package ID
  "name": "Project Alpha",
  "priority": 1,  // 1 = High, 2 = Medium, 3 = Low
  "status": "in progress",  // "planning", "in progress", "completed"
  "deliverable": "Mobile app release",
  "partnership": "Company XYZ",
  "deadline": "2025-12-31",
  "created_at": "2025-11-10T10:00:00",
  "updated_at": "2025-11-10T15:30:00",
  "tasks": [
    {
      "id": "t1731244800000",
      "title": "Design UI mockups",
      "responsible": "John Doe",
      "accountable": "Jane Smith",
      "consulted": "Team A",
      "informed": "Management",
      "progress": 45,
      "created_at": "2025-11-10T11:00:00",
      "subtasks": [
        {
          "id": "st1731248400000",
          "title": "Create wireframes",
          "completed": false,
          "progress": 70,
          "responsible": "Alice",
          "accountable": "Bob",
          "consulted": "Design Team",
          "informed": "Stakeholders",
          "deadline": "2025-11-20",
          "created_at": "2025-11-10T12:00:00"
        }
      ]
    }
  ]
}
```

## API Endpoints

### Work Packages

#### 1. Get All Work Packages
```http
GET /api/track-progress/work-packages
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "id": "wp1",
      "name": "Project Alpha",
      "priority": 1,
      "status": "in progress",
      "deliverable": "Mobile app release",
      "partnership": "Company XYZ",
      "deadline": "2025-12-31",
      "tasks": [],
      "created_at": "2025-11-10T10:00:00",
      "updated_at": "2025-11-10T15:30:00"
    }
  ]
}
```

#### 2. Get Single Work Package
```http
GET /api/track-progress/work-packages/{wpId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "id": "wp1",
    "name": "Project Alpha",
    ...
  }
}
```

#### 3. Create Work Package
```http
POST /api/track-progress/work-packages
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Project Beta",
  "priority": 2,
  "status": "planning",
  "deliverable": "Backend API",
  "partnership": "Vendor ABC",
  "deadline": "2025-12-15"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "id": "wp2",
    "name": "Project Beta",
    ...
  }
}
```

#### 4. Update Work Package
```http
PUT /api/track-progress/work-packages/{wpId}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "status": "completed",
  "tasks": [...] // Full tasks array
}
```

**Response:**
```json
{
  "success": true,
  "message": "Work package updated"
}
```

#### 5. Delete Work Package
```http
DELETE /api/track-progress/work-packages/{wpId}
```

**Response:**
```json
{
  "success": true,
  "message": "Work package deleted"
}
```

### Tasks

#### 6. Add Task to Work Package
```http
POST /api/track-progress/work-packages/{wpId}/tasks
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Design UI mockups",
  "responsible": "John Doe",
  "accountable": "Jane Smith",
  "consulted": "Team A",
  "informed": "Management"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "t1731244800000",
    "title": "Design UI mockups",
    "responsible": "John Doe",
    "accountable": "Jane Smith",
    "consulted": "Team A",
    "informed": "Management",
    "progress": 0,
    "subtasks": [],
    "created_at": "2025-11-10T11:00:00"
  }
}
```

#### 7. Update Task
```http
PUT /api/track-progress/work-packages/{wpId}/tasks/{taskId}
Content-Type: application/json
```

**Request Body:**
```json
{
  "progress": 75,
  "subtasks": [...] // Updated subtasks array
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task updated"
}
```

#### 8. Delete Task
```http
DELETE /api/track-progress/work-packages/{wpId}/tasks/{taskId}
```

**Response:**
```json
{
  "success": true,
  "message": "Task deleted"
}
```

### Subtasks

#### 9. Add Subtask to Task
```http
POST /api/track-progress/work-packages/{wpId}/tasks/{taskId}/subtasks
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Create wireframes",
  "deadline": "2025-11-20"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "st1731248400000",
    "title": "Create wireframes",
    "completed": false,
    "progress": 0,
    "responsible": "",
    "accountable": "",
    "consulted": "",
    "informed": "",
    "deadline": "2025-11-20",
    "created_at": "2025-11-10T12:00:00"
  }
}
```

#### 10. Update Subtask
```http
PUT /api/track-progress/work-packages/{wpId}/tasks/{taskId}/subtasks/{subtaskId}
Content-Type: application/json
```

**Request Body:**
```json
{
  "progress": 85,
  "deadline": "2025-11-25",
  "responsible": "Alice"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subtask updated"
}
```

#### 11. Delete Subtask
```http
DELETE /api/track-progress/work-packages/{wpId}/tasks/{taskId}/subtasks/{subtaskId}
```

**Response:**
```json
{
  "success": true,
  "message": "Subtask deleted"
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**HTTP Status Codes:**
- `200` - Success
- `201` - Created successfully
- `404` - Resource not found
- `500` - Server error

## Frontend Integration

### JavaScript API Client (api.js)

```javascript
import { trackProgressAPI } from '@/lib/api';

// Get all work packages
const workPackages = await trackProgressAPI.getAllWorkPackages();

// Create work package
const newPackage = await trackProgressAPI.createWorkPackage({
  name: "Project Gamma",
  priority: 1,
  status: "planning",
  deliverable: "Web Dashboard",
  partnership: "",
  deadline: "2025-12-31"
});

// Update work package
await trackProgressAPI.updateWorkPackage("wp1", {
  tasks: updatedTasksArray
});

// Add task
const newTask = await trackProgressAPI.addTask("wp1", {
  title: "Backend Development",
  responsible: "John",
  accountable: "Jane"
});

// Update subtask
await trackProgressAPI.updateSubtask("wp1", "t123", "st456", {
  progress: 90,
  deadline: "2025-11-30"
});
```

## Environment Variables

Add to backend `.env` file:

```env
MONGODB_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/
DATABASE_NAME=passdown_db
```

## MongoDB Setup

1. Collection `work_packages` will be auto-created on first insert
2. No indexes required initially
3. Recommended indexes for production:
   ```javascript
   db.work_packages.createIndex({ "id": 1 }, { unique: true })
   db.work_packages.createIndex({ "created_at": -1 })
   ```

## Testing with cURL

### Create Work Package
```bash
curl -X POST http://localhost:7071/api/track-progress/work-packages \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "priority": 1,
    "status": "planning",
    "deliverable": "Test Deliverable",
    "deadline": "2025-12-31"
  }'
```

### Get All Work Packages
```bash
curl http://localhost:7071/api/track-progress/work-packages
```

### Update Work Package
```bash
curl -X PUT http://localhost:7071/api/track-progress/work-packages/wp1 \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

## Notes

- All timestamps are in ISO 8601 format
- Work package IDs are auto-generated (wp1, wp2, wp3, ...)
- Task IDs use timestamp format (t1731244800000)
- Subtask IDs use timestamp format (st1731248400000)
- Progress values are 0-100 (percentage)
- Priority: 1=High, 2=Medium, 3=Low
- Status options: "planning", "in progress", "completed"
