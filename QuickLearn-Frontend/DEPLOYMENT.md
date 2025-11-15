# Deployment Guide

## Vercel Deployment

### Required Environment Variables

For the frontend to work correctly in production, you need to set the following environment variable in Vercel:

#### `VITE_API_BASE`

This should be set to your backend API URL.

**How to set it in Vercel:**

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `VITE_API_BASE`
   - **Value**: Your backend API URL (e.g., `https://api.quick-learn-dev.vercel.app` or `https://your-backend-domain.com`)
   - **Environment**: Select all environments (Production, Preview, Development) or just Production

4. **Important**: After adding the environment variable, you need to redeploy your application for the changes to take effect.

### Example Values

- **For this project (Render backend):**
  ```
  VITE_API_BASE=https://quicklearn-dev.onrender.com
  ```

- **If backend is on a separate domain:**
  ```
  VITE_API_BASE=https://api.quick-learn-dev.vercel.app
  ```

- **If backend is on a subdomain:**
  ```
  VITE_API_BASE=https://backend.yourdomain.com
  ```

- **If backend is on the same domain (using Vercel rewrites):**
  ```
  VITE_API_BASE=
  ```
  (Leave empty for relative paths - requires proper Vercel rewrite configuration)

### Vercel Rewrites (Alternative Approach)

If your backend is deployed on the same Vercel project or you want to proxy API requests, you can configure rewrites in `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-api.com/api/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

If using rewrites, you can set `VITE_API_BASE` to an empty string or omit it (it will default to relative paths).

### Troubleshooting

#### Error: "Failed to load resource: the server responded with a status of 500"

This usually means:
1. `VITE_API_BASE` is not set correctly
2. The backend API is not accessible from the frontend domain (CORS issues)
3. The backend is returning 500 errors

**Solution:**
- Verify `VITE_API_BASE` is set correctly in Vercel
- Check backend CORS configuration allows requests from your frontend domain
- Check backend logs for actual error messages

#### Error: "Failed to fetch" or Network errors

This usually means:
1. `VITE_API_BASE` is pointing to `http://localhost:3000` (wrong for production)
2. The backend URL is incorrect
3. CORS is blocking the requests

**Solution:**
- Ensure `VITE_API_BASE` is set to the correct production backend URL
- Verify the backend is running and accessible
- Check CORS settings on the backend

### Verifying Configuration

After deployment, check the browser console:
- In development, you should see: `API Base URL: http://localhost:3000`
- In production, check the Network tab to see what URL is being used for API calls
- If you see `http://localhost:3000` in production, the environment variable is not set correctly

