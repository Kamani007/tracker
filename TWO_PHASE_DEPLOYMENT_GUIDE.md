# 🚀 Two-Phase Azure Deployment Guide

## 🎯 Problem: We Need URLs Before We Have URLs!
- Frontend needs backend URL (don't have it yet)
- Backend needs frontend URL (don't have it yet)

## ✅ Solution: Two-Phase Deployment

---

## 📋 PHASE 1: Create Azure Resources

### Step 1: Create Azure Web App (Backend)

**In Azure Portal:**

1. **Create Resource Group**:
   - Go to https://portal.azure.com
   - **"+ Create a resource"** → **"Resource Group"**
   - Name: `rg-rayleigh-solar-prod`
   - Region: `East US`
   - **Create**

2. **Create App Service Plan**:
   - **"+ Create a resource"** → **"App Service Plan"**
   - Name: `asp-rayleigh-solar-prod`
   - Resource Group: `rg-rayleigh-solar-prod`
   - OS: `Linux`
   - Pricing: `B1 Basic` ($13/month)
   - **Create**

3. **Create Web App**:
   - **"+ Create a resource"** → **"Web App"**
   - Name: `rayleigh-solar-backend-prod`
   - Resource Group: `rg-rayleigh-solar-prod`
   - Runtime: `Python 3.11`
   - App Service Plan: `asp-rayleigh-solar-prod`
   - **Create**

**✅ Result**: You'll get backend URL: `https://rayleigh-solar-backend-prod.azurewebsites.net`

### Step 2: Configure Web App Environment Variables

**In Web App → Configuration → Application Settings**, add:

```
MONGODB_CONNECTION_STRING = <copy from your Render.com settings>
DATABASE_NAME = <copy from your Render.com settings>
AZURE_CONTAINER_URL = <copy from your Render.com settings>
AZURE_CONTAINER_SAS = <copy from your Render.com settings>
PYTHONPATH = /home/site/wwwroot
SCM_DO_BUILD_DURING_DEPLOYMENT = true
```

**Click "Save"**

### Step 3: Get Web App Publish Profile

1. **In your Web App** → **Overview**
2. **Click "Get publish profile"**
3. **Download** the `.PublishSettings` file
4. **Open and copy** the entire XML content

### Step 4: Create Azure Static Web App (Frontend)

1. **"+ Create a resource"** → **"Static Web App"**
   ```
   Resource Group: rg-rayleigh-solar-prod
   Name: rayleigh-solar-frontend-prod
   Plan: Free
   Region: East US 2
   
   Source: GitHub
   Organization: Rayleigh-Solar-Tech
   Repository: Tracker
   Branch: main
   Build Presets: Custom
   
   App location: /frontend
   Output location: dist
   ```

2. **Create**

**✅ Result**: You'll get frontend URL: `https://<generated-name>.azurestaticapps.net`

### Step 5: Get Static Web App Deployment Token

1. **After creation** → go to your Static Web App
2. **"Manage deployment token"**
3. **Copy the token**

---

## 🔧 PHASE 2: Update URLs and Redeploy

### Step 1: Add GitHub Secrets

**Go to GitHub → Settings → Secrets and variables → Actions**:

```
Name: AZURE_WEBAPP_PUBLISH_PROFILE_PROD
Value: <paste the XML from Web App publish profile>

Name: AZURE_STATIC_WEB_APPS_API_TOKEN_PROD_NEW  
Value: <paste the token from Static Web App>
```

### Step 2: Update Code with Real URLs

**Now you have both URLs! Update the code:**

1. **Update Frontend API URL** in `frontend/src/lib/api.js`:
   ```javascript
   // Replace this line:
   const API_BASE_URL = 'https://rayleigh-solar-backend-prod.azurewebsites.net/api';
   
   // With your actual Web App URL (probably the same, but verify)
   ```

2. **Update Backend CORS** in `backend/app.py`:
   ```python
   # Replace this:
   cors_origins = [
       'https://*.azurestaticapps.net',
       'https://localhost:5173',
   ]
   
   # With your actual Static Web App URL:
   cors_origins = [
       'https://<your-actual-static-web-app-name>.azurestaticapps.net',
       'https://*.azurestaticapps.net',  # Keep as backup
   ]
   ```

### Step 3: Deploy with Updated URLs

```bash
# Commit the changes with real URLs
git add .
git commit -m "feat: update URLs for production Azure deployment"
git push origin main
```

**GitHub Actions will automatically deploy to both:**
- ✅ Backend → Azure Web App
- ✅ Frontend → Azure Static Web App

---

## 🧪 PHASE 3: Test and Verify

### Step 1: Test Backend

**Visit**: `https://rayleigh-solar-backend-prod.azurewebsites.net/api/health`

**Should return**:
```json
{"status": "healthy", "message": "Backend is running!"}
```

### Step 2: Test Frontend

**Visit**: `https://<your-static-web-app>.azurestaticapps.net`

**Check browser console**:
```javascript
🚀 API Configuration: {
  baseURL: "https://rayleigh-solar-backend-prod.azurewebsites.net/api",
  environment: "production"
}
```

### Step 3: Test Full Functionality

- ✅ Login works
- ✅ Data loads
- ✅ File uploads work
- ✅ No CORS errors in console

---

## 📝 Quick Reference Commands

### If you need to restart Web App:
```bash
az webapp restart --name rayleigh-solar-backend-prod --resource-group rg-rayleigh-solar-prod
```

### If you need to check Web App logs:
```bash
az webapp log tail --name rayleigh-solar-backend-prod --resource-group rg-rayleigh-solar-prod
```

### To view Static Web App in portal:
Go to: Azure Portal → Static Web Apps → rayleigh-solar-frontend-prod

---

## ✅ Final Result

**Production Environment (NEW)**:
```
Frontend: https://<your-name>.azurestaticapps.net
Backend:  https://rayleigh-solar-backend-prod.azurewebsites.net
```

**UAT Environment (Unchanged)**:
```
Frontend: https://icy-desert-0e8aa711e.3.azurestaticapps.net
Backend:  https://rayleigh-solar-backend.onrender.com
```

---

## 🎯 Step-by-Step Checklist

### Phase 1: Create Resources
- [ ] Create Resource Group
- [ ] Create App Service Plan  
- [ ] Create Web App
- [ ] Configure Web App environment variables
- [ ] Get Web App publish profile
- [ ] Create Static Web App
- [ ] Get Static Web App deployment token

### Phase 2: Configure and Deploy
- [ ] Add GitHub secrets
- [ ] Update frontend API URL with real backend URL
- [ ] Update backend CORS with real frontend URL
- [ ] Commit and push to trigger deployment

### Phase 3: Test
- [ ] Backend health check works
- [ ] Frontend loads and shows correct API config
- [ ] Full application functionality works
- [ ] No CORS errors

**Ready to start with Phase 1?** 🚀