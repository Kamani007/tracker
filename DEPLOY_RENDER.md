# Render.com Deployment - Quick Start

## Step 1: Create Render Account (2 minutes)
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with your GitHub account (Manish4268)
4. Authorize Render to access your repositories

## Step 2: Create Web Service (5 minutes)

### 2.1 Create New Web Service
1. Click "New +" button (top right)
2. Select "Web Service"
3. Connect your repository: `Rayleigh-Solar-Tech-Daily`
4. Click "Connect"

### 2.2 Configure Service

**Basic Settings:**
```
Name: rayleigh-solar-backend
Region: Oregon (US West) - or closest to you
Branch: main
Root Directory: backend
```

**Build & Deploy:**
```
Runtime: Python 3

Build Command:
pip install -r requirements.txt

Start Command:
gunicorn --bind 0.0.0.0:$PORT --timeout 600 app:app
```

**Instance Type:**
```
Select: Free (750 hours/month - plenty for development)
```

### 2.3 Add Environment Variables

Click "Advanced" → Add Environment Variables:

```
PORT=10000
MONGODB_CONNECTION_STRING=<your MongoDB connection string from backend/.env>
DATABASE_NAME=<your database name from backend/.env>
AZURE_CONTAINER_URL=<your Azure Storage URL from backend/.env>
AZURE_CONTAINER_SAS=<your Azure Storage SAS from backend/.env>
```

**To get values:** Open `backend/.env` and copy each value

### 2.4 Deploy
1. Click "Create Web Service"
2. Render will:
   - Clone your repository
   - Install Python dependencies
   - Start your Flask app
   - Takes 3-5 minutes
3. Wait for "Live" status (green dot)

## Step 3: Get Your Backend URL

After deployment:
- Your URL will be: `https://rayleigh-solar-backend.onrender.com`
- Copy this URL

Test it:
```
https://rayleigh-solar-backend.onrender.com/api/health
```

## Step 4: Update Frontend

Edit: `frontend/src/lib/api.js`

Change line 9 to:
```javascript
return 'https://rayleigh-solar-backend.onrender.com/api';
```

Commit and push:
```powershell
git add frontend/src/lib/api.js
git commit -m "Update API URL to Render backend"
git push
```

## Benefits:
- ✅ Free (750 hours/month)
- ✅ No quota issues
- ✅ Auto-deploy from GitHub
- ✅ HTTPS included
- ✅ Works immediately

## Note:
Free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake up. Perfect for development!

## Upgrade Later (Optional):
If you need always-on: $7/month for Starter plan

---

**Ready? Go to https://render.com and sign up with GitHub!**
