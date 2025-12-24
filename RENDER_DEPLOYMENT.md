# 🚀 Render Backend Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] `.env` is in `.gitignore` (not pushed to GitHub)
- [x] CORS configured to allow all origins (for testing)
- [x] `load_dotenv()` is in app.py
- [x] Code is committed and pushed to GitHub

---

## 📋 Step-by-Step Render Deployment

### Step 1: Create Render Account
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with your **GitHub account** (Manish4268)
4. Authorize Render to access your repositories

### Step 2: Create Web Service
1. Click **"New +"** button (top right)
2. Select **"Web Service"**
3. Find and click **"Rayleigh-Solar-Tech-Daily"** repository
4. Click **"Connect"**

### Step 3: Configure Service

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
Free ($0/month)
```

### Step 4: Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"**

Add these one by one:

```
MONGODB_CONNECTION_STRING
mongodb+srv://manishjadhav2003_db_user:SmbEwd4qTNmSiPTE@cluster0.mtzuq1i.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

DATABASE_NAME
passdown_db

COLLECTION_TODAY
today_updates

COLLECTION_YESTERDAY
yesterday_updates

AZURE_CONTAINER_URL
https://tesrayleigh.blob.core.windows.net/data

AZURE_CONTAINER_SAS
sp=racwdli&st=2025-10-21T11:51:05Z&se=2026-10-22T20:06:05Z&spr=https&sv=2024-11-04&sr=c&sig=WgdqYijdCfuCAjuavGlUw8H2%2FPF9AbRSOC4B%2BWmprkA%3D

CONTAINER_NAME
Data

PORT
10000
```

### Step 5: Deploy!
1. Click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Install dependencies from requirements.txt
   - Start your Flask app with gunicorn
   - Takes 3-5 minutes
3. Wait for **"Live"** status (green dot)

---

## 🧪 Step 6: Test Your Backend

### Get Your URL
After deployment, your URL will be:
```
https://rayleigh-solar-backend.onrender.com
```
(or similar - copy from Render dashboard)

### Test Health Endpoint
Open in browser or use curl:
```
https://rayleigh-solar-backend.onrender.com/api/health
```

**Expected Response:**
```json
{
  "success": true,
  "status": "healthy",
  "message": "Passdown API is running",
  "mongodb": "connected"
}
```

✅ If you see `"mongodb": "connected"` → Everything is working!

---

## 🔧 Step 7: Test from Local Frontend

1. Start your local frontend:
   ```powershell
   cd frontend
   npm run dev
   ```

2. Open http://localhost:5173

3. The frontend will automatically use Render backend

4. Try:
   - Login
   - Upload data
   - View charts

---

## 🔄 Auto-Deploy (Already Set Up!)

Every time you push to GitHub:
```powershell
git push
```

Render automatically:
1. ✅ Detects the push
2. ✅ Rebuilds your backend
3. ✅ Deploys updates
4. ✅ Takes 2-3 minutes

---

## 💰 Cost: FREE

- **Free Tier:** 750 hours/month
- **Limitations:**
  - Sleeps after 15 minutes of inactivity
  - First request after sleep takes ~30 seconds
  - Perfect for development and testing!

---

## 🔐 After Testing: Restrict CORS

Once everything works, update `backend/app.py`:

```python
# Replace the CORS configuration with:
cors_origins = [
    'http://localhost:5173',  # Local testing
    'https://*.azurestaticapps.net',  # Your Azure frontend
]

CORS(app, 
     origins=cors_origins,
     supports_credentials=True,
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization']
)
```

Then commit and push - Render will auto-deploy the security update!

---

## ✅ Summary

**Your Setup:**
- ✅ Backend: Render.com (Flask + Python)
- ✅ Frontend: Azure Static Web Apps (React + Vite)
- ✅ Database: MongoDB Atlas
- ✅ Storage: Azure Blob Storage

**All environment variables are:**
- ✅ NOT in GitHub (.gitignore)
- ✅ Set in Render dashboard
- ✅ Secure and separate from code

---

## 🆘 Troubleshooting

**Build fails:**
- Check `requirements.txt` has all dependencies
- Check Root Directory is set to `backend`

**MongoDB disconnected:**
- Verify `MONGODB_CONNECTION_STRING` is correct in Render
- Check MongoDB Atlas allows connections from anywhere (0.0.0.0/0)

**CORS errors:**
- Currently allowing all origins (for testing)
- Check browser console for exact error

---

**Ready? Go to https://render.com and start deployment! Let me know when you reach Step 6 and I'll help you test! 🚀**
