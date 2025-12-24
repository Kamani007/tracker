# 🚀 Azure Production Deployment - Step by Step

## ✅ Configuration Status: PRODUCTION MODE
- Frontend: Points to Azure Web App backend
- Backend: CORS allows production Azure Static Web Apps
- Ready for Azure deployment!

---

## 🏗️ Step 1: Create Azure Web App (Backend)

### Option A: Azure Portal (Recommended)

1. **Go to Azure Portal**: https://portal.azure.com

2. **Create Resource Group** (if you don't have one):
   - Click **"+ Create a resource"**
   - Search **"Resource Group"**
   - Name: `rg-rayleigh-solar-prod`
   - Region: `East US` (or your preferred region)
   - Click **"Review + Create"** → **"Create"**

3. **Create App Service Plan**:
   - Click **"+ Create a resource"**
   - Search **"App Service Plan"**
   - Configuration:
     ```
     Resource Group: rg-rayleigh-solar-prod
     Name: asp-rayleigh-solar-prod
     Operating System: Linux
     Region: East US (same as resource group)
     Pricing Tier: B1 Basic ($13/month) or F1 Free (for testing)
     ```
   - Click **"Review + Create"** → **"Create"**

4. **Create Web App**:
   - Click **"+ Create a resource"**
   - Search **"Web App"**
   - Configuration:
     ```
     Resource Group: rg-rayleigh-solar-prod
     Name: rayleigh-solar-backend-prod
     Publish: Code
     Runtime stack: Python 3.11
     Region: East US
     App Service Plan: asp-rayleigh-solar-prod
     ```
   - Click **"Review + Create"** → **"Create"**

### Option B: Azure CLI (If you prefer command line)
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

## 🔧 Step 2: Configure Azure Web App Environment Variables

1. **Go to your Web App** in Azure Portal
2. **Navigate**: Settings → **Configuration** → **Application Settings**
3. **Click "New application setting"** for each of these:

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

4. **Click "Save"** after adding all settings

### 🔍 Where to find these values:
- **MongoDB info**: Check your Render.com environment variables
- **Azure Blob info**: Check your existing Azure Blob Storage settings

---

## 🔄 Step 3: Set Up GitHub Actions Deployment

### Get Publish Profile:
1. **In your Web App** → **Overview**
2. **Click "Get publish profile"**
3. **Download** the `.PublishSettings` file
4. **Open the file** and **copy the entire XML content**

### Add GitHub Secret:
1. **Go to GitHub**: https://github.com/Rayleigh-Solar-Tech/Tracker
2. **Click Settings** → **Secrets and variables** → **Actions**
3. **Click "New repository secret"**
4. **Add secret**:
   ```
   Name: AZURE_WEBAPP_PUBLISH_PROFILE
   Value: <paste the entire XML content from publish profile>
   ```

---

## 🚀 Step 4: Deploy Backend to Azure

### Method 1: GitHub Actions (Automatic)
Just push to the main branch:
```bash
git add .
git commit -m "deploy: configure for Azure Web App production"
git push origin main
```

The GitHub Actions workflow will automatically deploy your backend!

### Method 2: Manual Deploy (Alternative)
If you prefer manual deployment:
1. **In Web App** → **Deployment Center**
2. **Choose "GitHub"**
3. **Authenticate** and select your repository
4. **Branch**: main
5. **Build Provider**: "GitHub Actions"
6. **Save**

---

## ✅ Step 5: Test Backend Deployment

1. **Check Web App URL**: 
   ```
   https://rayleigh-solar-backend-prod.azurewebsites.net/api/health
   ```
   Should return: `{"status": "healthy", "message": "Backend is running!"}`

2. **Check Web App Logs**:
   - In Azure Portal → Your Web App → **Monitoring** → **Log stream**
   - Look for startup messages and any errors

---

## 🌐 Step 6: Frontend is Already Deployed!

Your frontend is already on Azure Static Web Apps:
```
https://icy-desert-0e8aa711e.3.azurestaticapps.net
```

Since we updated the API configuration to point to the new Azure Web App backend, it should automatically connect once the backend is deployed.

---

## 🧪 Step 7: Test Full Application

1. **Visit your frontend**: https://icy-desert-0e8aa711e.3.azurestaticapps.net
2. **Check browser console** for API configuration:
   ```
   🚀 API Configuration: {
     baseURL: "https://rayleigh-solar-backend-prod.azurewebsites.net/api",
     environment: "production"
   }
   ```
3. **Test functionality**: Login, view data, upload files, etc.

---

## 🚨 Troubleshooting

### If backend doesn't start:
1. **Check environment variables** in Azure Web App configuration
2. **Check logs** in Azure Portal → Web App → Log stream
3. **Verify startup command**: `gunicorn --bind 0.0.0.0:$PORT --timeout 600 --workers 1 --preload app:app`

### If frontend can't connect to backend:
1. **Check CORS settings** in backend/app.py
2. **Verify API URL** in frontend/src/lib/api.js
3. **Check browser console** for network errors

### Common fixes:
```bash
# Restart Web App
az webapp restart --name rayleigh-solar-backend-prod --resource-group rg-rayleigh-solar-prod

# View Web App logs
az webapp log tail --name rayleigh-solar-backend-prod --resource-group rg-rayleigh-solar-prod
```

---

## 🎉 Success!

Once deployed, you'll have:
- ✅ **Frontend**: Azure Static Web Apps
- ✅ **Backend**: Azure Web App  
- ✅ **Database**: MongoDB Atlas
- ✅ **Storage**: Azure Blob Storage
- ✅ **Auto-deployment**: via GitHub Actions

**Estimated monthly cost**: ~$15-20 (Azure Web App B1 + Static Web Apps free tier)

---

## 📋 Next Steps After Deployment

1. **Monitor performance** in Azure Application Insights
2. **Set up alerts** for downtime or errors
3. **Configure custom domain** (if needed)
4. **Set up backup strategy** for database
5. **Scale Web App** if needed (higher tier plans)

Let me know when you've completed each step and if you encounter any issues! 🚀