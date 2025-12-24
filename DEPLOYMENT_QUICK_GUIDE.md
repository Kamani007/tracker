# 🔧 Quick Deployment Guide - Comment/Uncomment Method

## 📁 Files to Modify Before Deployment

### 1. `frontend/src/lib/api.js` (Lines 8-19)

#### 🏠 For LOCAL DEVELOPMENT:
```javascript
// 🏠 LOCAL DEVELOPMENT - Uncomment for local development
const API_BASE_URL = 'http://localhost:7071/api';
const ENVIRONMENT = 'development';

// 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (testing branch)
// const API_BASE_URL = 'https://rayleigh-solar-backend.onrender.com/api';
// const ENVIRONMENT = 'uat';

// 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (main branch)
// const API_BASE_URL = 'https://rayleigh-solar-backend-prod.azurewebsites.net/api';
// const ENVIRONMENT = 'production';
```

#### 🧪 For UAT DEPLOYMENT (testing branch):
```javascript
// 🏠 LOCAL DEVELOPMENT - Uncomment for local development
// const API_BASE_URL = 'http://localhost:5000/api';
// const ENVIRONMENT = 'development';

// 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (testing branch)
const API_BASE_URL = 'https://rayleigh-solar-backend.onrender.com/api';
const ENVIRONMENT = 'uat';

// 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (main branch)
// const API_BASE_URL = 'https://rayleigh-solar-backend-prod.azurewebsites.net/api';
// const ENVIRONMENT = 'production';
```

#### 🚀 For PRODUCTION DEPLOYMENT (main branch):
```javascript
// 🏠 LOCAL DEVELOPMENT - Uncomment for local development
// const API_BASE_URL = 'http://localhost:5000/api';
// const ENVIRONMENT = 'development';

// 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (testing branch)
// const API_BASE_URL = 'https://rayleigh-solar-backend.onrender.com/api';
// const ENVIRONMENT = 'uat';

// 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (main branch)
const API_BASE_URL = 'https://rayleigh-solar-backend-prod.azurewebsites.net/api';
const ENVIRONMENT = 'production';
```

---

### 2. `frontend/src/lib/azureAuth.js` (Lines 10-21)

#### 🏠 For LOCAL DEVELOPMENT:
```javascript
// 🏠 LOCAL DEVELOPMENT - Uncomment for local development
export const isDevelopment = () => true;
export const isAzureSWA = () => false;

// 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (testing branch)
// export const isDevelopment = () => false;
// export const isAzureSWA = () => true;

// 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (main branch)
// export const isDevelopment = () => false;
// export const isAzureSWA = () => true;
```

#### 🧪 For UAT DEPLOYMENT (testing branch):
```javascript
// 🏠 LOCAL DEVELOPMENT - Uncomment for local development
// export const isDevelopment = () => true;
// export const isAzureSWA = () => false;

// 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (testing branch)
export const isDevelopment = () => false;
export const isAzureSWA = () => true;

// 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (main branch)
// export const isDevelopment = () => false;
// export const isAzureSWA = () => true;
```

#### 🚀 For PRODUCTION DEPLOYMENT (main branch):
```javascript
// 🏠 LOCAL DEVELOPMENT - Uncomment for local development
// export const isDevelopment = () => true;
// export const isAzureSWA = () => false;

// 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (testing branch)
// export const isDevelopment = () => false;
// export const isAzureSWA = () => true;

// 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (main branch)
export const isDevelopment = () => false;
export const isAzureSWA = () => true;
```

---

### 3. `backend/app.py` (Lines 39-58)

#### 🏠 For LOCAL DEVELOPMENT:
```python
# 🏠 LOCAL DEVELOPMENT - Uncomment for local development
cors_origins = [
    'http://localhost:5173',  # Local development (Vite default)
    'http://localhost:5174',  # Alternative Vite port
    'http://localhost:3000',  # Alternative local port
    'http://localhost:7071',  # Azure Functions local emulator
]

# 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (Render.com backend)
# cors_origins = [
#     'https://*.azurestaticapps.net',  # UAT Azure Static Web Apps (wildcard)
#     'http://localhost:5173',  # Local development access
#     'http://localhost:5174',  # Alternative Vite port
# ]

# 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (Azure Web App)
# cors_origins = [
#     'https://icy-desert-0e8aa711e.3.azurestaticapps.net',  # Production frontend
#     'https://*.azurestaticapps.net',  # Allow other Azure SWA instances
# ]
```

#### 🧪 For UAT DEPLOYMENT (testing branch):
```python
# 🏠 LOCAL DEVELOPMENT - Uncomment for local development
# cors_origins = [
#     'http://localhost:5173',  # Local development (Vite default)
#     'http://localhost:5174',  # Alternative Vite port
#     'http://localhost:3000',  # Alternative local port
#     'http://localhost:7071',  # Azure Functions local emulator
# ]

# 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (Render.com backend)
cors_origins = [
    'https://*.azurestaticapps.net',  # UAT Azure Static Web Apps (wildcard)
    'http://localhost:5173',  # Local development access
    'http://localhost:5174',  # Alternative Vite port
]

# 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (Azure Web App)
# cors_origins = [
#     'https://icy-desert-0e8aa711e.3.azurestaticapps.net',  # Production frontend
#     'https://*.azurestaticapps.net',  # Allow other Azure SWA instances
# ]
```

#### 🚀 For PRODUCTION DEPLOYMENT (main branch):
```python
# 🏠 LOCAL DEVELOPMENT - Uncomment for local development
# cors_origins = [
#     'http://localhost:5173',  # Local development (Vite default)
#     'http://localhost:5174',  # Alternative Vite port
#     'http://localhost:3000',  # Alternative local port
#     'http://localhost:7071',  # Azure Functions local emulator
# ]

# 🧪 UAT ENVIRONMENT - Uncomment for UAT deployment (Render.com backend)
# cors_origins = [
#     'https://*.azurestaticapps.net',  # UAT Azure Static Web Apps (wildcard)
#     'http://localhost:5173',  # Local development access
#     'http://localhost:5174',  # Alternative Vite port
# ]

# 🚀 PRODUCTION ENVIRONMENT - Uncomment for production deployment (Azure Web App)
cors_origins = [
    'https://icy-desert-0e8aa711e.3.azurestaticapps.net',  # Production frontend
    'https://*.azurestaticapps.net',  # Allow other Azure SWA instances
]
```

---

## 🚀 Quick Deployment Workflow

### For Production Deployment:
1. **Uncomment PRODUCTION blocks** in all three files:
   - `frontend/src/lib/api.js`
   - `frontend/src/lib/azureAuth.js`
   - `backend/app.py`
2. **Comment out** LOCAL and UAT blocks
3. Commit and push to `main` branch
4. GitHub Actions will automatically deploy

### For UAT Deployment:
1. **Uncomment UAT blocks** in all three files:
   - `frontend/src/lib/api.js`
   - `frontend/src/lib/azureAuth.js`
   - `backend/app.py`
2. **Comment out** LOCAL and PRODUCTION blocks
3. Commit and push to `uat` or `testing` branch
4. GitHub Actions will automatically deploy

### For Local Development:
1. **Uncomment LOCAL blocks** in all three files:
   - `frontend/src/lib/api.js`
   - `frontend/src/lib/azureAuth.js`
   - `backend/app.py`
2. **Comment out** UAT and PRODUCTION blocks
3. Run `npm run dev` in frontend folder and `python app.py` in backend folder

---

## 🎯 Current Configuration Status

**Currently set for**: 🚀 **PRODUCTION** (main branch)
- Backend API: `https://rayleigh-solar-backend-prod.azurewebsites.net/api`
- Authentication: Azure Static Web Apps
- Environment: production

---

## ⚡ Quick VS Code Tip

You can use VS Code's multi-cursor feature to quickly comment/uncomment:
1. Select the lines you want to toggle
2. Press `Ctrl+/` (Windows) or `Cmd+/` (Mac) to toggle comments
3. This makes switching between environments very fast!

---

## 🔍 Environment URLs Reference

| Environment | Frontend URL | Backend URL |
|-------------|-------------|-------------|
| **Local** | http://localhost:5173 | http://localhost:5000 |
| **UAT** | https://{uat-static-web-app}.azurestaticapps.net | https://rayleigh-solar-backend.onrender.com |
| **Production** | https://icy-desert-0e8aa711e.3.azurestaticapps.net | https://rayleigh-solar-backend-prod.azurewebsites.net |

---

## ✅ Verification Checklist

After changing configuration:
- [ ] Only one environment block is uncommented in `frontend/src/lib/api.js`
- [ ] Only one environment block is uncommented in `frontend/src/lib/azureAuth.js`
- [ ] Only one environment block is uncommented in `backend/app.py`
- [ ] Console log shows correct API base URL
- [ ] No CORS errors in browser console
- [ ] API calls working correctly
- [ ] Authentication working (if applicable)

## 📝 Files Summary

| File | Purpose | Environment Settings |
|------|---------|---------------------|
| `frontend/src/lib/api.js` | API endpoint configuration | API base URL |
| `frontend/src/lib/azureAuth.js` | Authentication behavior | Development vs Azure auth |
| `backend/app.py` | CORS allowed origins | Frontend URLs that can access backend |

This approach gives you complete control and makes it very clear which environment you're deploying to!