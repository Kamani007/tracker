# 🚀 Complete Azure Production Setup - NEW Instances

## 🎯 Overview
You're creating **completely separate production instances**:
- **UAT (Current)**: Azure Static Web Apps + Render.com 
- **Production (NEW)**: NEW Azure Static Web Apps + NEW Azure Web App

---

## 🏗️ Part 1: Create NEW Azure Web App (Backend)

### Step 1: Create Azure Resources

**Via Azure Portal:**

1. **Create Resource Group**:
   - Go to https://portal.azure.com
   - **"+ Create a resource"** → **"Resource Group"**
   - Name: `rg-rayleigh-solar-prod`
   - Region: `East US`

2. **Create App Service Plan**:
   - **"+ Create a resource"** → **"App Service Plan"**
   - Name: `asp-rayleigh-solar-prod`
   - Resource Group: `rg-rayleigh-solar-prod`
   - OS: `Linux`
   - Pricing: `B1 Basic` ($13/month) or `F1 Free` (for testing)

3. **Create Web App**:
   - **"+ Create a resource"** → **"Web App"**
   - Name: `rayleigh-solar-backend-prod`
   - Resource Group: `rg-rayleigh-solar-prod`
   - Runtime: `Python 3.11`
   - App Service Plan: `asp-rayleigh-solar-prod`

### Step 2: Configure Web App Environment Variables

In **Web App → Configuration → Application Settings**, add:

```
MONGODB_CONNECTION_STRING = <your_mongodb_connection_string>
DATABASE_NAME = <your_database_name>
AZURE_CONTAINER_URL = <your_azure_blob_url>
AZURE_CONTAINER_SAS = <your_azure_sas_token>
PYTHONPATH = /home/site/wwwroot
SCM_DO_BUILD_DURING_DEPLOYMENT = true
```

**💡 Tip**: Copy these values from your Render.com environment variables

---

## 🌐 Part 2: Create NEW Azure Static Web App (Frontend)

### Step 1: Create Production Static Web App

1. **In Azure Portal**:
   - **"+ Create a resource"** → **"Static Web App"**
   
2. **Configuration**:
   ```
   Subscription: <your_subscription>
   Resource Group: rg-rayleigh-solar-prod
   Name: rayleigh-solar-frontend-prod
   Plan type: Free
   Region: East US 2 (or Central US)
   
   Deployment details:
   Source: GitHub
   Organization: Rayleigh-Solar-Tech
   Repository: Tracker
   Branch: main
   Build Presets: Custom
   
   Build configuration:
   App location: /frontend
   Api location: (leave empty)
   Output location: dist
   ```

3. **Click "Review + Create"** → **"Create"**

### Step 2: Get Static Web App Deployment Token

1. **After creation**, go to your Static Web App
2. **Click "Manage deployment token"**
3. **Copy the token** (you'll need this for GitHub Actions)

---

## 🔄 Part 3: Update GitHub Actions

### Step 1: Add New GitHub Secrets

Go to **GitHub → Settings → Secrets and variables → Actions**:

1. **For Web App deployment**:
   - Go to Azure Web App → **"Get publish profile"**
   - Download and copy XML content
   - Add secret: `AZURE_WEBAPP_PUBLISH_PROFILE_PROD`

2. **For Static Web App deployment**:
   - Use the token from Step 2 above
   - Add secret: `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD_NEW`

### Step 2: Update GitHub Actions Workflows

The existing workflows need to be updated to deploy to the NEW production instances.

---

## 🔧 Part 3: Configure Code for New Production URLs

### Step 1: Update Frontend API Configuration

You'll need to update the production API URL to point to your NEW Azure Web App:

```javascript
// In frontend/src/lib/api.js
// 🚀 PRODUCTION ENVIRONMENT - Update this URL after Web App is created
const API_BASE_URL = 'https://rayleigh-solar-backend-prod.azurewebsites.net/api';
```

### Step 2: Update Backend CORS

Update CORS to allow the NEW Static Web App:

```python
# In backend/app.py
# 🚀 PRODUCTION ENVIRONMENT - Update this URL after Static Web App is created
cors_origins = [
    'https://<your-new-static-web-app>.azurestaticapps.net',  # NEW Production frontend
    'https://*.azurestaticapps.net',  # Allow other Azure SWA instances
]
```

---

## 🚀 Part 4: Deployment Process

### Step 1: Get Your New URLs

After creating the Azure resources, you'll have:

1. **New Azure Web App URL**: 
   ```
   https://rayleigh-solar-backend-prod.azurewebsites.net
   ```

2. **New Azure Static Web App URL**:
   ```
   https://<generated-name>.azurestaticapps.net
   ```

### Step 2: Update Configuration with Real URLs

Once you have the real URLs, update:

1. **Frontend API URL** in `frontend/src/lib/api.js`
2. **Backend CORS** in `backend/app.py` with the actual Static Web App URL

### Step 3: Deploy

```bash
# Commit the configuration changes
git add .
git commit -m "feat: configure for new Azure production instances"
git push origin main
```

GitHub Actions will deploy to BOTH:
- ✅ **Backend** → NEW Azure Web App
- ✅ **Frontend** → NEW Azure Static Web App

---

## 📊 Result: Complete Separation

### UAT Environment (Existing - Unchanged):
```
Azure Static Web Apps (current) → Render.com → MongoDB
URL: https://icy-desert-0e8aa711e.3.azurestaticapps.net
```

### Production Environment (NEW):
```
Azure Static Web Apps (new) → Azure Web App (new) → MongoDB  
URL: https://<new-name>.azurestaticapps.net
```

---

## ✅ Step-by-Step Checklist

### Phase 1: Create Azure Resources
- [ ] Create Resource Group: `rg-rayleigh-solar-prod`
- [ ] Create App Service Plan: `asp-rayleigh-solar-prod`  
- [ ] Create Web App: `rayleigh-solar-backend-prod`
- [ ] Configure Web App environment variables
- [ ] Create Static Web App: `rayleigh-solar-frontend-prod`
- [ ] Get deployment tokens/publish profiles

### Phase 2: Configure GitHub
- [ ] Add `AZURE_WEBAPP_PUBLISH_PROFILE_PROD` secret
- [ ] Add `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD_NEW` secret
- [ ] Update GitHub Actions workflows (if needed)

### Phase 3: Update Code Configuration
- [ ] Update API URL in `frontend/src/lib/api.js`
- [ ] Update CORS in `backend/app.py`
- [ ] Commit and push to main branch

### Phase 4: Test
- [ ] Backend health check works
- [ ] Frontend loads and connects to backend
- [ ] All functionality working (login, data, uploads, etc.)

---

## 💰 Cost Summary

**NEW Production Environment**:
- Azure Web App (B1): ~$13/month
- Azure Static Web Apps: Free
- **Total**: ~$13/month

**Existing UAT**: 
- Render.com: Free (750 hours)
- Azure Static Web Apps: Free
- **Total**: $0/month

**Combined Total**: ~$13/month for both environments

---

## 🎯 Next Steps

1. **Start with creating the Azure Web App** (Part 1)
2. **Then create the new Static Web App** (Part 2)  
3. **Get the actual URLs** and update your code
4. **Deploy and test**

Would you like me to help you start with **Part 1 (Creating the Azure Web App)** first? 🚀