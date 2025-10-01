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
  } catch {}
}


