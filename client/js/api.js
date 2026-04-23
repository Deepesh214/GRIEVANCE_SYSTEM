/**
 * API helper — wraps fetch(), attaches JWT, and normalises errors.
 * Pages import this with <script src="/js/api.js"> and then call
 *   api.get('/public/stats')     // returns parsed JSON or throws
 *   api.post('/auth/login', body)
 *   api.upload('/grievances', formData)
 */

// When served from the same host (Vercel, or Express in production) we
// use a relative path. For local dev where the frontend is opened via
// Live Server on :5500 we fall back to http://localhost:5000/api.
const API_BASE = (window.__API_BASE__ ||
  ((location.origin && location.origin.indexOf('file:') !== 0 && location.port !== '5500')
    ? '/api'
    : 'http://localhost:5000/api'));

function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function setUser(u) { localStorage.setItem('user', JSON.stringify(u)); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
}
function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function request(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
  const token = getToken();
  const opts = {
    method,
    headers: {
      ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };
  if (body) opts.body = body instanceof FormData ? body : JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, opts);
  } catch (err) {
    throw new Error(`Network error — is the server running on ${API_BASE}?`);
  }

  if (raw) return res;

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    // Auth expired — bounce to login
    if (res.status === 401 && token) {
      clearSession();
      if (!location.pathname.endsWith('login.html')) {
        location.href = 'login.html?expired=1';
      }
    }
    const msg = (data && data.message) || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status; err.payload = data;
    throw err;
  }
  return data;
}

const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  upload: (p, formData) => request(p, { method: 'POST', body: formData }),
  raw: (p) => request(p, { raw: true }),
  // session helpers
  getToken, setToken, getUser, setUser, clearSession,
  base: API_BASE,
};

window.api = api;
