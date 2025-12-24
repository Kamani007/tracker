# 🚀 Azure Deployment Strategy

## Overview
This guide covers deploying your application with different configurations for different environments:

- **Production (main branch)**: Azure Static Web Apps + Azure Web App
- **UAT/Testing branch**: Azure Static Web Apps + Render.com
- **Development**: Local development

---

## 🏗️ Architecture Overview

### Production Environment (Azure-only)
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Azure Static Web   │───▶│   Azure Web App     │───▶│   MongoDB Atlas     │
│  Apps (Frontend)    │    │   (Backend)         │    │   (Database)        │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                        │
                                        ▼
                           ┌─────────────────────┐
                           │  Azure Blob Storage │
                           │    (File Storage)   │
                           └─────────────────────┘
```

### UAT Environment (Hybrid)
```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│  Azure Static Web   │───▶│   Render.com        │───▶│   MongoDB Atlas     │
│  Apps (Frontend)    │    │   (Backend)         │    │   (Database)        │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                        │
                                        ▼
                           ┌─────────────────────┐
                           │  Azure Blob Storage │
                           │    (File Storage)   │
                           └─────────────────────┘
```

---

## 📋 Prerequisites

### Azure Resources Needed
1. **Azure Static Web Apps** (already exists)
2. **Azure Web App** (new - for production backend)
3. **Azure Resource Group** (if not exists)
4. **Azure App Service Plan** (for Web App)

### Required Information
- Azure Subscription ID
- Resource Group Name
- MongoDB Connection String
- Azure Blob Storage credentials

---

## 🎯 Step-by-Step Deployment

## Part 1: Azure Web App Setup (Production Backend)

### Step 1: Create Azure Web App

#### Option A: Using Azure Portal (Recommended for first time)

1. **Go to Azure Portal**: https://portal.azure.com
2. **Create Resource Group** (if needed):
   - Click "+ Create a resource"
   - Search "Resource Group"
   - Name: `rg-rayleigh-solar-prod`
   - Region: `East US` (or your preferred region)

3. **Create App Service Plan**:
   - Click "+ Create a resource"
   - Search "App Service Plan"
   - Name: `asp-rayleigh-solar-prod`
   - Resource Group: `rg-rayleigh-solar-prod`
   - Operating System: `Linux`
   - Pricing Tier: `B1 Basic` (or higher for production)

4. **Create Web App**:
   - Click "+ Create a resource"
   - Search "Web App"
   - Configuration:
     ```
     App Name: rayleigh-solar-backend-prod
     Resource Group: rg-rayleigh-solar-prod
     Runtime Stack: Python 3.11
     App Service Plan: asp-rayleigh-solar-prod
     Region: East US (same as resource group)
     ```

#### Option B: Using Azure CLI
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

### Step 2: Configure Environment Variables

In Azure Portal → Your Web App → Configuration → Application Settings:

```
MONGODB_CONNECTION_STRING=<your_mongodb_connection_string>
DATABASE_NAME=<your_database_name>
AZURE_CONTAINER_URL=<your_azure_blob_container_url>
AZURE_CONTAINER_SAS=<your_azure_sas_token>
PYTHONPATH=/home/site/wwwroot
SCM_DO_BUILD_DURING_DEPLOYMENT=true
```

### Step 3: Configure Deployment

#### Option A: GitHub Actions (Recommended)

1. **In Azure Portal**:
   - Go to your Web App → Deployment Center
   - Choose "GitHub"
   - Authenticate with GitHub
   - Select Repository: `Rayleigh-Solar-Tech/Tracker`
   - Branch: `main`
   - Build Provider: "GitHub Actions"
   - Click "Save"

This will auto-generate a GitHub Actions workflow file.

#### Option B: Manual Deployment
You can deploy using Azure CLI or VS Code Azure extension.

---

## Part 2: Update Frontend Configuration

### Step 1: Update API Base URL

You'll need to update your frontend to point to the Azure Web App for production.

**Current Configuration** (in frontend code):
- Development: `http://localhost:5000`
- Production: Render.com URL

**New Configuration Needed**:
- Development: `http://localhost:5000`
- UAT: Render.com URL
- Production: Azure Web App URL

### Step 2: Update CORS Configuration

The backend needs to allow requests from both Azure Static Web Apps environments.

---

## Part 3: Branch-Specific Deployments

### Production Branch (main)
- **Frontend**: Azure Static Web Apps
- **Backend**: Azure Web App
- **Database**: MongoDB Atlas
- **Storage**: Azure Blob Storage

### UAT Branch (testing/uat)
- **Frontend**: Azure Static Web Apps (separate instance)
- **Backend**: Render.com (existing)
- **Database**: MongoDB Atlas (separate database)
- **Storage**: Azure Blob Storage

---

## 🔧 Configuration Files Needed

### 1. GitHub Actions Workflow for Azure Web App
File: `.github/workflows/azure-webapp.yml`

### 2. Updated Frontend Environment Configuration
Files to update:
- Frontend API configuration
- Azure Static Web Apps configuration

### 3. Backend CORS Configuration Update
File: `backend/app.py` - CORS origins

---

## 🚀 Deployment Process

### For Production (main branch):
1. Code changes pushed to `main` branch
2. GitHub Actions triggers automatically
3. Frontend deploys to Azure Static Web Apps
4. Backend deploys to Azure Web App

### For UAT (testing branch):
1. Code changes pushed to `testing` branch
2. Frontend deploys to Azure Static Web Apps (UAT instance)
3. Backend deploys to Render.com (existing setup)

---

## 💰 Cost Estimation

### Azure Resources (Monthly):
- **Azure Web App (B1 Basic)**: ~$13/month
- **Azure Static Web Apps**: Free tier (should be sufficient)
- **Azure Blob Storage**: ~$1-5/month (depending on usage)

### Render.com (for UAT):
- **Free Tier**: $0/month (750 hours)
- **Starter Tier**: $7/month (if needed)

**Total estimated cost**: ~$15-25/month for production + UAT environments.

---

## 🎯 Next Steps

1. **Create Azure Web App** (follow Step 1 above)
2. **Set up GitHub Actions** for automated deployment
3. **Update frontend configuration** for environment-specific API URLs
4. **Update backend CORS** to include Azure Web App URL
5. **Test deployment** with a simple change
6. **Update DNS/domain** if using custom domain

Would you like me to proceed with creating the specific configuration files and detailed steps for any of these parts?