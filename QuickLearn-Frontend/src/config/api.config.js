/**
 * API Configuration
 * 
 * Determines the API base URL based on environment variables and current location.
 * 
 * Environment Variables:
 * - VITE_API_BASE: Explicitly set API base URL (e.g., https://api.example.com)
 * 
 * Auto-detection:
 * - In production (Vercel), if VITE_API_BASE is not set, it will default to relative paths
 * - In development, defaults to http://localhost:3000
 */

// Get the API base URL from environment variable
const getApiBase = () => {
  // If explicitly set, use it (remove trailing slash if present)
  if (import.meta.env.VITE_API_BASE) {
    const base = import.meta.env.VITE_API_BASE.trim()
    // Remove trailing slash to avoid double slashes when constructing URLs
    return base.endsWith('/') ? base.slice(0, -1) : base
  }

  // In production (Vercel), check if we're on a deployed domain
  if (import.meta.env.PROD) {
    // If we're in production but no API base is set, we need to warn
    // The backend URL must be set via VITE_API_BASE environment variable
    console.warn(
      'VITE_API_BASE is not set in production. ' +
      'Please set it in Vercel environment variables. ' +
      'Falling back to relative paths (this may not work if backend is on a different domain).'
    )
    
    // Use relative paths as a fallback
    // This works if the backend is proxied through Vercel rewrites
    return ''
  }

  // Development default
  return 'http://localhost:3000'
}

export const API_BASE = getApiBase()

// Log the API base in development for debugging
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE || '(relative paths)')
}

