# 🚀 Step-by-Step Azure Deployment Guide

## 📋 Quick Reference

### Current Setup Status
- ✅ **Frontend**: Azure Static Web Apps (configured)
- ⏳ **Backend**: Need to set up Azure Web App (production)
- ✅ **Backend**: Render.com (UAT/testing - keep existing)
- ✅ **Database**: MongoDB Atlas
- ✅ **Storage**: Azure Blob Storage

### Target Architecture
```
Production (main branch):  Azure SWA → Azure Web App → MongoDB
UAT (uat/testing branch):  Azure SWA → Render.com → MongoDB
```

---

## 🎯 Phase 1: Create Azure Web App (Production Backend)

### Option A: Azure Portal (Recommended for beginners)

#### Step 1: Create Resource Group
1. Go to https://portal.azure.com
2. Click **"+ Create a resource"**
3. Search **"Resource Group"** → Create
4. Configuration:
   ```
   Resource group name: rg-rayleigh-solar-prod
   Region: East US (or your preferred region)
   ```
5. Click **"Review + Create"** → **"Create"**

#### Step 2: Create App Service Plan
1. Click **"+ Create a resource"**
2. Search **"App Service Plan"** → Create
3. Configuration:
   ```
   Resource Group: rg-rayleigh-solar-prod
   Name: asp-rayleigh-solar-prod
   Operating System: Linux
   Region: East US (same as resource group)
   Pricing Tier: B1 Basic ($13/month) or F1 Free (for testing)
   ```
4. Click **"Review + Create"** → **"Create"**

#### Step 3: Create Web App
1. Click **"+ Create a resource"**
2. Search **"Web App"** → Create
3. Configuration:
   ```
   Resource Group: rg-rayleigh-solar-prod
   Name: rayleigh-solar-backend-prod
   Publish: Code
   Runtime stack: Python 3.11
   Region: East US
   App Service Plan: asp-rayleigh-solar-prod
   ```
4. Click **"Review + Create"** → **"Create"**

### Option B: Azure CLI (For advanced users)
```bash
# Login to Azure
az login

# Create resource group
az group create --name rg-rayleigh-solar-prod --location eastus

# Create App Service Plan
az appservice plan create \
  --name asp-rayleigh-solar-prod \
  --resource-group rg-rayleigh-solar-prod \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --name rayleigh-solar-backend-prod \
  --resource-group rg-rayleigh-solar-prod \
  --plan asp-rayleigh-solar-prod \
  --runtime "PYTHON:3.11"
```

---

## 🔧 Phase 2: Configure Azure Web App

### Step 1: Configure Environment Variables
In Azure Portal → Your Web App → **Configuration** → **Application Settings**

Click **"+ New application setting"** for each:

```
Name: MONGODB_CONNECTION_STRING
Value: <your_mongodb_connection_string_from_render>

Name: DATABASE_NAME  
Value: <your_database_name>

Name: AZURE_CONTAINER_URL
Value: <your_azure_blob_container_url>

Name: AZURE_CONTAINER_SAS
Value: <your_azure_sas_token>

Name: PYTHONPATH
Value: /home/site/wwwroot

Name: SCM_DO_BUILD_DURING_DEPLOYMENT
Value: true
```

Click **"Save"** after adding all settings.

### Step 2: Configure Startup Command
In **Configuration** → **General Settings**:
```
Startup Command: gunicorn --bind 0.0.0.0:$PORT --timeout 600 --workers 1 --preload app:app
```

---

## 🔄 Phase 3: Set Up GitHub Actions Deployment

### Step 1: Get Publish Profile
1. In Azure Portal → Your Web App → **Overview**
2. Click **"Get publish profile"**
3. Download the `.PublishSettings` file
4. Open the file and copy the entire XML content

### Step 2: Add GitHub Secrets
1. Go to your GitHub repository: https://github.com/Rayleigh-Solar-Tech/Tracker
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**

Add these secrets:

```
Name: AZURE_WEBAPP_PUBLISH_PROFILE
Value: <paste the entire XML content from publish profile>

Name: AZURE_STATIC_WEB_APPS_API_TOKEN_PROD
Value: <your existing Azure Static Web Apps token>

Name: AZURE_STATIC_WEB_APPS_API_TOKEN_UAT
Value: <UAT Azure Static Web Apps token - create separate instance>
```

### Step 3: Test GitHub Actions
1. Push a small change to the `main` branch:
   ```bash
   git add .
   git commit -m "test: trigger azure deployment"
   git push origin main
   ```
2. Check **Actions** tab in GitHub to see if workflow runs successfully

---

## 🌐 Phase 4: Set Up UAT Environment

### Step 1: Create UAT Azure Static Web App
1. In Azure Portal → **"+ Create a resource"**
2. Search **"Static Web App"** → Create
3. Configuration:
   ```
   Resource Group: rg-rayleigh-solar-prod (or create separate UAT group)
   Name: rayleigh-solar-frontend-uat
   Plan type: Free
   Source: GitHub
   Repository: Rayleigh-Solar-Tech/Tracker
   Branch: uat (or testing)
   Build location: /frontend
   Output location: dist
   ```

### Step 2: Get UAT API Token
1. Go to UAT Static Web App → **Manage deployment token**
2. Copy the token
3. Add to GitHub Secrets as `AZURE_STATIC_WEB_APPS_API_TOKEN_UAT`

---

## 🧪 Phase 5: Testing & Verification

### Step 1: Test Production Environment
1. Check Azure Web App URL: `https://rayleigh-solar-backend-prod.azurewebsites.net/api/health`
2. Should return: `{"status": "healthy", "message": "Backend is running!"}`

### Step 2: Test Frontend Connection
1. Visit your production Azure Static Web App
2. Check browser developer console for API calls
3. Verify data loads correctly

### Step 3: Test UAT Environment
1. Create `uat` branch:
   ```bash
   git checkout -b uat
   git push origin uat
   ```
2. Check UAT Static Web App
3. Verify it connects to Render.com backend

---

## 📊 Phase 6: Branch Strategy Setup

### Production Deployment (main branch)
```
Code Push → GitHub Actions → Azure Web App + Azure Static Web Apps
```

### UAT Deployment (uat/testing branch)
```
Code Push → GitHub Actions → Azure Static Web Apps → Render.com
```

---

## 🚨 Troubleshooting

### Common Issues & Solutions

#### 1. Azure Web App not starting
**Check**: Application Logs in Azure Portal
**Solution**: Verify environment variables and startup command

#### 2. CORS errors
**Check**: Browser developer console
**Solution**: Verify CORS origins in `backend/app.py`

#### 3. GitHub Actions failing
**Check**: Actions tab in GitHub repository  
**Solution**: Verify secrets are correctly set

#### 4. Database connection issues
**Check**: Azure Web App logs
**Solution**: Verify MongoDB connection string in configuration

### Useful Azure CLI Commands
```bash
# View Web App logs
az webapp log tail --name rayleigh-solar-backend-prod --resource-group rg-rayleigh-solar-prod

# Restart Web App
az webapp restart --name rayleigh-solar-backend-prod --resource-group rg-rayleigh-solar-prod

# View Web App configuration
az webapp config show --name rayleigh-solar-backend-prod --resource-group rg-rayleigh-solar-prod
```

---

## 💰 Cost Management

### Expected Monthly Costs:
- **Azure Web App (B1 Basic)**: ~$13/month
- **Azure Static Web Apps**: Free tier
- **Azure Blob Storage**: ~$1-5/month
- **Render.com (UAT)**: Free (750 hours/month)

**Total**: ~$15-20/month for production + UAT

---

## 🎯 Next Steps After Deployment

1. **Set up monitoring**: Application Insights for Azure resources
2. **Configure custom domain**: If you have a custom domain
3. **Set up SSL**: Azure provides free SSL certificates
4. **Database optimization**: Consider connection pooling for production
5. **Backup strategy**: Regular database backups
6. **Performance testing**: Load testing for production readiness

---

## 📞 Support

If you encounter issues:
1. Check Azure Web App **Logs** section
2. Review GitHub Actions **workflow runs**
3. Test API endpoints manually with tools like Postman
4. Verify all environment variables are correctly set

The deployment is designed to be:
- ✅ **Automated**: Push to trigger deployment
- ✅ **Scalable**: Azure Web Apps can scale as needed
- ✅ **Cost-effective**: Using appropriate tiers for each environment
- ✅ **Maintainable**: Clear separation between prod and UAT