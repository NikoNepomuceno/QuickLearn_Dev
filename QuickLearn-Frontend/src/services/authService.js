const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export async function registerUser(payload) {
  return request('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
}

export async function verifyEmail(payload) {
  return request('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
}

export async function resendOtp(payload) {
  return request('/api/auth/resend-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
}

export async function loginUser(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
}


export async function logoutUser(payload) {
  return request('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
}

export async function getCurrentUser() {
  return request('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
  }).then(res => res.user);
}

export async function forgotPassword(payload) {
  return request('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
}

export async function resetPassword(payload) {
  return request('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
}

export async function updatePassword(payload) {
  return request('/api/auth/update-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
}

export async function deleteAccount() {
  return request('/api/auth/account', {
    method: 'DELETE',
    credentials: 'include',
  });
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    let message = 'Request failed';
    try {
      const data = await res.json();
      message = data?.error || data?.message || message;
    } catch {
      try { message = await res.text(); } catch {}
    }
    throw new Error(message || `${res.status}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

// Best-effort cleanup also on explicit logout
export function clearLegacyTokens() {
  try {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    // Clear leaderboard animation flag so it shows again after logout
    sessionStorage.removeItem('leaderboard-animation-shown')
  } catch (error) {
    console.warn('Failed to clear tokens!', error)
  }
}

// Token management for API requests
export function getToken() {
  try {
    // Try to get from localStorage first (for development/testing)
    const token = localStorage.getItem('accessToken')
    if (token) return token

    // In production, tokens should be in httpOnly cookies
    // For now, we'll rely on cookie-based auth
    return null
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem('accessToken', token)
  } catch {}
}

export function removeToken() {
  try {
    localStorage.removeItem('accessToken')
  } catch {}
}

export async function isAuthenticated() {
  // Check if we have a token in localStorage first (for development/testing)
  const token = getToken()
  if (token) return true

  // For cookie-based auth, check with the server
  try {
    await getCurrentUser()
    return true
  } catch {
    // If getCurrentUser fails, user is not authenticated
    return false
  }
}

// Create authService object for easier imports
export const authService = {
  registerUser,
  verifyEmail,
  resendOtp,
  loginUser,
  logoutUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  updatePassword,
  deleteAccount,
  getToken,
  setToken,
  removeToken,
  isAuthenticated,
  clearLegacyTokens
}


