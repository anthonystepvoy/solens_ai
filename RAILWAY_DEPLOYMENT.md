# Railway Deployment Guide

This guide will help you deploy your Solens AI project to Railway.

## Prerequisites

1. A Railway account (free at [railway.app](https://railway.app))
2. Your code pushed to a GitHub repository
3. MongoDB database (you can use Railway's MongoDB plugin or external MongoDB Atlas)

## Step-by-Step Deployment

### 1. Connect Your Repository

1. Go to [railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will automatically detect the configuration

### 2. Environment Variables

Set these environment variables in Railway's dashboard:

**Required:**
```
MONGO_URI=your_mongodb_connection_string
```

**Optional (for enhanced security):**
```
FRONTEND_URL=your_frontend_domain
HELIUS_API_KEY=your_helius_api_key
FIREBASE_SERVICE_ACCOUNT_KEY=your_firebase_key_json
```

### 3. MongoDB Setup

**Option A: Railway MongoDB Plugin (Recommended)**
1. In your Railway project, click "New"
2. Select "Database" → "MongoDB"
3. Railway will automatically set the `MONGO_URI` environment variable

**Option B: MongoDB Atlas**
1. Create a MongoDB Atlas cluster
2. Get your connection string
3. Set it as `MONGO_URI` in Railway environment variables

### 4. Deployment Configuration

The project uses these configuration files:

- `railway.json` - Main Railway configuration
- `nixpacks.toml` - Build configuration for Python + Node.js
- `Procfile` - Process definition (backup)

### 5. Build Process

Railway will automatically:
1. Install Node.js and Python
2. Install Node.js dependencies from `backend/scrapers/package.json`
3. Install Python dependencies from `backend_api/requirements.txt`
4. Start the FastAPI server

### 6. Verify Deployment

1. Check the deployment logs in Railway dashboard
2. Visit your Railway URL (e.g., `https://your-app.railway.app`)
3. You should see: `{"message": "Backend API is running!"}`

### 7. API Endpoints

Your API will be available at:
- Health check: `GET /`
- Tokens: `GET /tokens`
- Wallets: `GET /wallets`
- Scheduler status: `GET /scheduler-status`
- And many more...

### 8. Background Jobs

The application includes automatic background jobs:
- Token discovery (every minute)
- Rank fetching (every minute/hour/day)
- Wallet discovery (every 10 minutes/hour)

These run automatically via APScheduler.

## Troubleshooting

### Common Issues

1. **Build fails**: Check that all dependencies are in requirements.txt
2. **MongoDB connection fails**: Verify MONGO_URI is correct
3. **Node.js scripts fail**: Ensure puppeteer dependencies are installed

### Logs

Check Railway logs for:
- Build process errors
- Runtime errors
- Background job failures

### Environment Variables

Make sure all required environment variables are set:
```bash
MONGO_URI=your_mongodb_connection_string
HELIUS_API_KEY=your_helius_api_key  # if using Helius API
FIREBASE_SERVICE_ACCOUNT_KEY=your_firebase_key  # if using Firebase
```

## Scaling

Railway automatically scales based on traffic. You can also:
- Set custom scaling rules
- Add more resources
- Configure auto-scaling

## Monitoring

Railway provides:
- Real-time logs
- Performance metrics
- Error tracking
- Health checks

## Next Steps

After deployment:
1. Test all API endpoints
2. Monitor background jobs
3. Set up custom domain (optional)
4. Configure SSL certificates (automatic with Railway)
5. Set up monitoring and alerts

## Support

- Railway Documentation: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Project Issues: Create an issue in your GitHub repository 