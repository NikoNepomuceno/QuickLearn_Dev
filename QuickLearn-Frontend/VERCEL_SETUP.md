# Quick Vercel Setup Guide

## Fix the 500 Errors - Set Environment Variable

Your backend is deployed at: **`https://quicklearn-dev.onrender.com`**

### Steps to Fix:

1. **Go to Vercel Dashboard**
   - Navigate to your project: https://vercel.com/dashboard
   - Select your `QuickLearn-Frontend` project

2. **Add Environment Variable**
   - Click on **Settings** tab
   - Click on **Environment Variables** in the left sidebar
   - Click **Add New** button

3. **Enter the following:**
   - **Key**: `VITE_API_BASE`
   - **Value**: `https://quicklearn-dev.onrender.com`
   - **Environment**: Select **Production** (and **Preview** if you want)
   - Click **Save**

4. **Redeploy**
   - Go to the **Deployments** tab
   - Click the **⋯** (three dots) menu on the latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger a redeploy

### Verify It's Working

After redeployment:
1. Open your deployed site: https://quick-learn-dev.vercel.app
2. Open browser DevTools (F12) → Console tab
3. You should see API calls going to `https://quicklearn-dev.onrender.com` instead of `http://localhost:3000`
4. The 500 errors should be resolved

### Troubleshooting

If you still see errors:
- **Check Network tab**: Verify API calls are going to `https://quicklearn-dev.onrender.com`
- **Check Console**: Look for CORS errors (backend might need to allow your frontend domain)
- **Verify backend is running**: Visit `https://quicklearn-dev.onrender.com/health` in your browser

