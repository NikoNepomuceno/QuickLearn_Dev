## Cookie-based Auth Setup (JWT in httpOnly Session Cookies)

This guide shows how to configure environment variables and verify the cookie-based authentication end-to-end in development and production.

### 1) Backend .env (QuickLearn-Backend/.env)

Use a strong secret and point CORS to your frontend origin.

```env
# Required
JWT_ACCESS_SECRET=replace-with-a-long-random-string

# Your frontend dev URL (Vite default)
FRONTEND_ORIGIN=http://localhost:5173

# Optional: set to production in prod environments
NODE_ENV=development
```

Notes

- JWTs are signed with `JWT_ACCESS_SECRET` and stored as `access_token` httpOnly cookies.
- The cookie uses a 30-minute sliding idle timeout. Any authenticated request refreshes the cookie expiry.
- `FRONTEND_ORIGIN` must exactly match the origin you load the SPA from (scheme + host + port).

### 2) Frontend .env (QuickLearn-Frontend/.env)

Point the web app at your backend base URL.

```env
VITE_API_BASE=http://localhost:3000
```

Notes

- The frontend sends `credentials: 'include'` on auth requests so the browser will attach cookies.
- If you change ports or hostnames, update both `VITE_API_BASE` and `FRONTEND_ORIGIN` accordingly.

### 3) Development Run

1. Backend

   - Directory: `QuickLearn-Backend`
   - Ensure `.env` exists as above
   - Start server (e.g., `npm start` or your script)

2. Frontend

   - Directory: `QuickLearn-Frontend`
   - Ensure `.env` exists as above
   - Start dev server (e.g., `bun dev` or `npm run dev`)

3. Test Flow
   - Visit `http://localhost:5173`
   - Register → Verify Email → Login
   - On successful login, an `access_token` httpOnly cookie is set
   - Navigating to `/login` or `/register` while authenticated redirects to `/`
   - After 30+ minutes of inactivity, the next request should 401 and the app will prompt to login again

### 4) Production Checklist

- HTTPS required when using `SameSite=None; Secure`
  - In production, the cookie uses `secure: true` and `sameSite: 'none'`
  - Serve the frontend over HTTPS and set `FRONTEND_ORIGIN` to the HTTPS origin
- Reverse Proxy (e.g., Nginx) must forward:
  - `Origin` and `Cookie` headers end-to-end
  - `OPTIONS` requests for CORS preflight
- Set `NODE_ENV=production` on the backend
- Example production envs

```env
# Backend
NODE_ENV=production
JWT_ACCESS_SECRET=replace-with-strong-secret
FRONTEND_ORIGIN=https://app.example.com

# Frontend
VITE_API_BASE=https://api.example.com
```

### 5) Troubleshooting

- Cookies not set in browser

  - Ensure requests include credentials: the frontend uses `credentials: 'include'`
  - `FRONTEND_ORIGIN` must match the page origin exactly
  - In production, use HTTPS; browsers block `SameSite=None` cookies over HTTP

- CORS errors (blocked by CORS policy)

  - Confirm `FRONTEND_ORIGIN` is correct and backend sends `Access-Control-Allow-Origin` for that exact origin
  - Backend must include `Access-Control-Allow-Credentials: true`
  - Preflight (`OPTIONS`) must return 200

- Immediate 401 after login

  - Check system clock skew between client and server; large skew can invalidate tokens
  - Inspect browser devtools → Network → Response headers for `Set-Cookie`

- Can still access /login while authenticated
  - Ensure backend is running and `/api/auth/me` returns 200 for authenticated users
  - Verify router guard is calling `getCurrentUser()` and navigation guard runs before visiting `/login`

### 6) API Behavior Summary

- Login: `POST /api/auth/login`

  - Sets `access_token` cookie (httpOnly, 30m sliding)
  - Returns `{ user }` in JSON

- Current User: `GET /api/auth/me`

  - Returns `{ user }` if cookie valid; 401 otherwise

- Logout: `POST /api/auth/logout`
  - Clears `access_token` cookie
