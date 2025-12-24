# 🎯 Azure Deployment Checklist

## ✅ Pre-Deployment Checklist

### Repository Setup
- [ ] Code is committed and pushed to GitHub
- [ ] GitHub Actions workflows are added (`.github/workflows/`)
- [ ] Environment configuration files are updated
- [ ] Backend CORS settings include Azure Web App URL

### Azure Resources Required
- [ ] Azure Subscription active
- [ ] Resource Group created: `rg-rayleigh-solar-prod`
- [ ] App Service Plan created: `asp-rayleigh-solar-prod`
- [ ] Web App created: `rayleigh-solar-backend-prod`
- [ ] Static Web App for UAT: `rayleigh-solar-frontend-uat`

### Secrets & Configuration
- [ ] Azure Web App publish profile downloaded
- [ ] GitHub repository secrets configured:
  - [ ] `AZURE_WEBAPP_PUBLISH_PROFILE`
  - [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD`
  - [ ] `AZURE_STATIC_WEB_APPS_API_TOKEN_UAT`
- [ ] Azure Web App environment variables set:
  - [ ] `MONGODB_CONNECTION_STRING`
  - [ ] `DATABASE_NAME`
  - [ ] `AZURE_CONTAINER_URL`
  - [ ] `AZURE_CONTAINER_SAS`
  - [ ] `PYTHONPATH`
  - [ ] `SCM_DO_BUILD_DURING_DEPLOYMENT`

---

## 🚀 Deployment Process

### Step 1: Create Azure Resources
```bash
# Using Azure CLI (optional)
az login
az group create --name rg-rayleigh-solar-prod --location eastus
az appservice plan create --name asp-rayleigh-solar-prod --resource-group rg-rayleigh-solar-prod --sku B1 --is-linux
az webapp create --name rayleigh-solar-backend-prod --resource-group rg-rayleigh-solar-prod --plan asp-rayleigh-solar-prod --runtime "PYTHON:3.11"
```

### Step 2: Configure Web App
1. Set environment variables in Azure Portal
2. Configure startup command: `gunicorn --bind 0.0.0.0:$PORT --timeout 600 --workers 1 --preload app:app`

### Step 3: Set Up GitHub Actions
1. Add publish profile to GitHub secrets
2. Commit and push to trigger deployment

### Step 4: Create UAT Environment
1. Create separate Azure Static Web App for UAT
2. Configure to deploy from `uat` branch
3. Keep Render.com for UAT backend

---

## 🔄 Branch Strategy

### Production (main branch)
```
Frontend: Azure Static Web Apps (existing)
Backend:  Azure Web App (new)
Database: MongoDB Atlas
Storage:  Azure Blob Storage
```

### UAT (uat/testing branch)  
```
Frontend: Azure Static Web Apps (UAT instance)
Backend:  Render.com (existing)
Database: MongoDB Atlas
Storage:  Azure Blob Storage
```

---

## 🧪 Testing Checklist

### After Deployment
- [ ] Azure Web App health check: `https://rayleigh-solar-backend-prod.azurewebsites.net/api/health`
- [ ] Frontend loads correctly on production URL
- [ ] API calls work from frontend to backend
- [ ] Database connection successful
- [ ] File upload/download with Azure Blob Storage works
- [ ] UAT environment connects to Render.com backend

### Verification URLs
```
Production Backend:  https://rayleigh-solar-backend-prod.azurewebsites.net
Production Frontend: https://icy-desert-0e8aa711e.3.azurestaticapps.net
UAT Frontend:        https://<uat-static-web-app>.azurestaticapps.net
UAT Backend:         https://rayleigh-solar-backend.onrender.com
```

---

## 🚨 Rollback Plan

If deployment fails:
1. **Immediate**: Revert to previous working commit
2. **Frontend**: Azure Static Web Apps has automatic rollback
3. **Backend**: Deploy previous version or rollback in Azure Portal
4. **UAT**: Switch UAT to use Render.com temporarily

---

## 📊 Expected Timeline

- **Azure Web App Setup**: 15-30 minutes
- **GitHub Actions Configuration**: 10-15 minutes  
- **Testing & Verification**: 15-30 minutes
- **UAT Environment Setup**: 15-20 minutes

**Total Estimated Time**: 1-2 hours

---

## 💰 Cost Summary

### Monthly Costs
- Azure Web App (B1 Basic): ~$13/month
- Azure Static Web Apps: Free tier
- Azure Blob Storage: ~$1-5/month
- Render.com (UAT): Free (750 hours)

**Total**: ~$15-20/month

---

## 🎯 Success Criteria

### Deployment Complete When:
- [ ] Production backend responds on Azure Web App URL
- [ ] Frontend successfully connects to Azure Web App backend
- [ ] UAT frontend connects to Render.com backend
- [ ] All APIs functional (health, data, file upload/download)
- [ ] GitHub Actions deploy automatically on push
- [ ] No CORS errors in browser console
- [ ] Database operations working correctly

---

## 📞 Support Resources

### Documentation
- [Azure Web Apps for Python](https://docs.microsoft.com/en-us/azure/app-service/quickstart-python)
- [Azure Static Web Apps](https://docs.microsoft.com/en-us/azure/static-web-apps/)
- [GitHub Actions for Azure](https://docs.microsoft.com/en-us/azure/developer/github/github-actions)

### Troubleshooting
- Azure Portal → Web App → Logs
- GitHub → Actions tab → Workflow runs
- Browser Developer Tools → Console/Network tabs

---

## 🎉 Post-Deployment

### Optional Enhancements
- [ ] Set up Application Insights monitoring
- [ ] Configure custom domain names
- [ ] Set up automated backups
- [ ] Configure scaling rules
- [ ] Set up alerts and notifications

This checklist ensures a smooth transition from your current Render.com setup to a hybrid Azure + Render architecture for production and UAT environments.