# Rayleigh Solar Tech Daily Passdown System - Clean Version# Rayleigh Solar Tech Daily Passdown System - Enhanced Version



A clean, minimal version of the daily passdown system with only essential functionality.A full-stack production dashboard application for managing daily issues and updates in a solar technology manufacturing environment.



## ✨ Features## ✨ New Features & Enhancements



- **Save Functionality**: Safety issues, Kudos, Today's issues, Yesterday's issues### 🔄 Workflow Automation

- **Chart Data API**: Parameter visualization with mock data- **Today → Yesterday Flow**: Items added to "Today" automatically appear in "Top Issues" as incomplete tasks

- **Clean Architecture**: Minimal dependencies, focused functionality- **Smart Status Management**: Users can mark items as complete directly in the Top Issues section

- **Comprehensive Testing**: Two focused test cases- **Intelligent Filtering**: "Show only incomplete" checkbox to focus on active tasks



## 🏗️ Project Structure### � Enhanced Kudos System

- **Attribution Tracking**: New "By Whom" field to track who gave the kudos

```- **Complete Information**: Name, Action, and Attribution all captured

├── backend/- **Enhanced UI**: Improved form with three input fields for comprehensive kudos tracking

│   ├── passdown_app_clean.py      # Clean main application

│   ├── test_save_functionality.py # Test Case 1: Save operations### 📊 Improved User Interface

│   ├── test_chart_functionality.py# Test Case 2: Chart functionality- **Scrollable Tables**: All tables now scroll with max-height of 320px for better data management

│   ├── requirements.txt           # Minimal dependencies- **Sticky Headers**: Table headers remain visible while scrolling through data

│   ├── .env                       # Database configuration- **Enhanced Styling**: Improved borders, rounded corners, and responsive design

│   └── .env.example              # Environment template- **Individual Refresh**: Tables refresh individually instead of full page reload for better UX

│

├── frontend/### 🔧 Backend Improvements

│   ├── src/- **Robust Validation**: Enhanced data validation across all endpoints

│   │   ├── App.jsx               # Main dashboard- **Workflow Integration**: Automatic cross-collection updates for Today→Yesterday flow

│   │   ├── components/           # UI components- **Improved Error Handling**: Consistent error responses and database connection management

│   │   └── lib/api.js           # API integration- **Performance Optimization**: Individual database connections for reliability

│   ├── package.json

│   └── vite.config.js### 🧪 Testing & Quality

│- **Comprehensive Test Suite**: Complete API endpoint testing with automated validation

├── start.bat                     # Windows startup script- **Edge Case Testing**: Unicode, special characters, and data validation testing

├── start.sh                      # Unix startup script- **Performance Testing**: Multi-request performance validation

└── README.md                     # This file- **Workflow Testing**: Automated testing of the Today→Yesterday workflow

```

## �🏗️ Architecture

## 🚀 Quick Start

### Backend

### 1. Backend Setup- **Python Flask** local development server

```powershell- **Azure Functions** for cloud deployment

cd backend- **MongoDB Atlas** for data storage

- **CORS** enabled for frontend integration

# Install dependencies- **Individual DB connections** for improved reliability

pip install -r requirements.txt

### Frontend

# Configure environment (copy .env.example to .env and update)- **React 19** with Vite

cp .env.example .env- **Tailwind CSS** for styling

- **Radix UI** components

# Start clean server- **Recharts** for data visualization

python passdown_app_clean.py- **Individual table refresh** for better performance

```

## 📁 Project Structure

### 2. Frontend Setup

```powershell```

cd frontend├── backend/

npm install  # (if needed)│   ├── passdown_app.py          # Main consolidated backend (Flask + Azure Functions)

npm run dev│   ├── create_demo_data_new.py  # Demo data generator

```│   ├── test_connection.py       # Database connection test

│   ├── test_all_endpoints.py    # Comprehensive test suite

### 3. Access Application│   ├── requirements.txt         # Python dependencies

- **Frontend**: http://localhost:5173│   ├── .env.example            # Environment variables template

- **Backend**: http://localhost:7071│   ├── function.json           # Azure Functions configuration

- **Health Check**: http://localhost:7071/api/health│   └── host.json               # Azure Functions host config

│

## 🧪 Testing├── frontend/

│   ├── src/

### Test Case 1: Save Functionality│   │   ├── App.jsx             # Main dashboard component

Tests all save operations (Safety, Kudos, Today, Yesterday issues)│   │   ├── lib/

```powershell│   │   │   ├── api.js          # API integration utilities

cd backend│   │   │   └── utils.js        # UI utilities

python test_save_functionality.py│   │   └── components/ui/      # Reusable UI components

```│   ├── package.json            # Node.js dependencies

│   ├── .env.example           # Environment variables template

### Test Case 2: Chart Functionality  │   └── vite.config.js         # Vite configuration

Tests chart data loading and parameter functionality│

```powershell├── start.bat                   # Windows startup script

cd backend├── start.sh                    # Linux/macOS startup script

python test_chart_functionality.py└── README.md                   # This file

``````



## 📊 API Endpoints## 🚀 Quick Start



### Core Endpoints### 🏃‍♂️ Express Setup (Recommended)

- `GET/POST /api/safety` - Safety issues

- `GET/POST /api/kudos` - Kudos entriesUse the startup scripts for the fastest setup:

- `GET/POST /api/today` - Today's issues

- `GET/POST /api/yesterday` - Yesterday's issues**Windows:**

- `PUT /api/yesterday/:id` - Update yesterday issue```cmd

start.bat

### Chart Endpoints```

- `GET /api/charts/parameters` - Available parameters

- `GET /api/charts/data/:parameter` - Chart data for parameter**Linux/macOS:**

```bash

### Systemchmod +x start.sh

- `GET /api/health` - Health check./start.sh

```

## 🔧 Configuration

These scripts will automatically:

### Environment Variables (.env)- ✅ Check prerequisites (Python, Node.js)

```- 🐍 Start the backend server on port 7071

MONGODB_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/- ⚛️ Start the frontend dev server on port 5173

DATABASE_NAME=passdown_db- 🌐 Open the application in your browser

```

### 📋 Manual Setup

## 🎯 Key Improvements

### Prerequisites

✅ **Simplified Architecture** - Removed unnecessary complexity  - **Node.js 18+** for frontend

✅ **Focused Testing** - Two comprehensive test cases  - **Python 3.8+** for backend

✅ **Clean Dependencies** - Only essential packages  - **MongoDB Atlas** account and cluster

✅ **Better Error Handling** - Robust error management  

✅ **Clear Documentation** - Simple setup instructions  ### 1. Backend Setup



## 🔍 What Was Cleaned Up```powershell

# Navigate to backend directory

**Removed Files:**cd backend

- analyze_data.py

- database.py (merged into main app)# Install Python dependencies

- data_processor.pypip install -r requirements.txt

- local_server.py

- test_all_save_functionality.py# Copy environment template and configure

- Multiple redundant test filescopy .env.example .env

- __pycache__ directories# Edit .env with your MongoDB connection string

- Data directories

# Test database connection

**Consolidated Features:**python test_connection.py

- Single main application file

- Minimal dependencies# Create demo data (optional)

- Two focused test casespython create_demo_data_new.py

- Clean project structure

# Run comprehensive tests

## 💡 Usagepython test_all_endpoints.py



1. **Start the application** using start scripts or manually# Start local development server

2. **Run Test Case 1** to verify all save operations workpython passdown_app.py

3. **Run Test Case 2** to verify chart functionality works```

4. **Use the frontend** to interact with the system

The backend will be available at `http://localhost:7071`

The system is now clean, minimal, and focused on core functionality with comprehensive testing.
### 2. Frontend Setup

```powershell
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Copy environment template
copy .env.example .env.local
# .env.local is pre-configured for local development

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🔧 Configuration

### Backend Environment Variables (.env)
```env
MONGODB_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/
DATABASE_NAME=passdown_db
COLLECTION_TODAY=today_updates
COLLECTION_YESTERDAY=yesterday_updates
```

### Frontend Environment Variables (.env.local)
```env
VITE_API_BASE_URL=http://localhost:7071/api
VITE_DEVELOPMENT_MODE=true
VITE_BACKEND_TYPE=local
```

## 📊 API Endpoints

### Safety Issues
- `GET /api/safety` - Get all safety issues
- `POST /api/safety` - Create a new safety issue
- `DELETE /api/safety/{safety_id}` - Delete a safety issue

### Kudos
- `GET /api/kudos` - Get all kudos entries
- `POST /api/kudos` - Create a new kudos entry
- `DELETE /api/kudos/{kudos_id}` - Delete a kudos entry

### Today's Issues
- `GET /api/today` - Get all today's issues
- `POST /api/today` - Create a new today's issue
- `DELETE /api/today/{issue_id}` - Delete a today's issue

### Yesterday's Issues
- `GET /api/yesterday` - Get all yesterday's issues
- `POST /api/yesterday` - Create a new yesterday's issue
- `PUT /api/yesterday/{issue_id}` - Update a yesterday's issue
- `DELETE /api/yesterday/{issue_id}` - Delete a yesterday's issue

### Health Check
- `GET /api/health` - Check API status

## 🎯 Features

### Dashboard
- **Real-time data** from MongoDB
- **API status indicator** in the navbar
- **Error handling** with user feedback
- **Loading states** for better UX

### Today's Issues Management
- ✅ Create new issues
- ✅ View all issues
- ✅ Delete issues
- 🔄 Auto-refresh data

### Yesterday's Issues Management
- ✅ View yesterday's issues
- ✅ Toggle completion status
- ✅ Delete issues
- 🔍 Filter incomplete items

### Process Information
- Static process data display
- Performance metrics visualization

### Safety & Kudos
- Safety issues tracking
- Team kudos management
- Date-stamped entries

## 🛠️ Development

### Adding New Features

1. **Backend**: Add new endpoints in `local_server.py`
2. **Database**: Update models in `database.py`
3. **Frontend**: Update `src/lib/api.js` for new API calls
4. **UI**: Modify `src/App.jsx` for new interface elements

### Running Tests

```powershell
# Backend database test
cd backend
python test_db.py

# Frontend linting
cd frontend
npm run lint
```

### Building for Production

```powershell
# Frontend build
cd frontend
npm run build

# The built files will be in the dist/ directory
```

## 🌐 Deployment

### Current Architecture (MongoDB Atlas + Local Flask)
- **Database:** MongoDB Atlas (cloud-ready)
- **Local Development:** Flask server in `passdown_app.py`
- **Production Ready:** Single file design for easy Azure migration

### Future Azure Migration
The application is designed for seamless Azure migration:

#### Azure Functions (Backend)
```powershell
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Initialize Azure Functions (already configured)
# Deploy to Azure
func azure functionapp publish <your-function-app-name>
```

#### Azure Static Web Apps (Frontend)
1. Build the frontend: `npm run build`
2. Deploy the `dist/` folder to Azure Static Web Apps
3. Configure API routes to point to your Azure Functions

### Environment Variables for Production
```env
# Backend (.env)
MONGODB_CONNECTION_STRING=mongodb+srv://your-cluster@azure.mongodb.net/
DATABASE_NAME=passdown_db

# Frontend (.env.local)
VITE_API_BASE_URL=https://your-function-app.azurewebsites.net/api
```

## 🐛 Troubleshooting

### Common Issues

1. **"API Disconnected"** - Check if backend server is running
2. **CORS errors** - Ensure CORS is properly configured in backend
3. **Database connection fails** - Verify MongoDB connection string
4. **Frontend build fails** - Check Node.js version compatibility

### Debugging Tips

1. Check browser developer console for frontend errors
2. Check backend logs for API errors
3. Test API endpoints directly with curl or Postman
4. Verify environment variables are loaded correctly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review API documentation
- Check MongoDB Atlas connectivity
- Verify environment variables