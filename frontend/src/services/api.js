const BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';

export const getImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const origin = apiBase.replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${cleanPath}`;
};

export const getAuthToken = () => localStorage.getItem('pos_token') || '';
export const setAuthToken = (token) => {
  if (token) localStorage.setItem('pos_token', token);
  else localStorage.removeItem('pos_token');
};

export const getActiveUser = () => {
  try {
    const raw = localStorage.getItem('pos_user');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const setActiveUser = (user) => {
  if (user) localStorage.setItem('pos_user', JSON.stringify(user));
  else localStorage.removeItem('pos_user');
};

export const getActiveRestaurant = () => {
  try {
    const raw = localStorage.getItem('pos_restaurant');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

export const setActiveRestaurant = (restaurant) => {
  if (restaurant) localStorage.setItem('pos_restaurant', JSON.stringify(restaurant));
  else localStorage.removeItem('pos_restaurant');
};

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getAuthToken();
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (!isFormData && config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(url, config);
  let json = null;
  try {
    json = await res.json();
  } catch (e) {
    // response might be empty
  }

  if (!res.ok) {
    let errorMsg = 'An unexpected error occurred';
    if (Array.isArray(json?.errors) && json.errors.length > 0) {
      const errList = json.errors.map((e) => (typeof e === 'string' ? e : e.message || JSON.stringify(e)));
      errorMsg = errList.join(' • ');
    } else if (json?.message) {
      errorMsg = json.message;
    }
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = json;
    const isAuthRoute =
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/logout') ||
      endpoint.includes('/auth/forgot-password') ||
      endpoint.includes('/auth/resend-reset-otp') ||
      endpoint.includes('/auth/verify-reset-otp') ||
      endpoint.includes('/auth/reset-password');

    if (res.status === 401 && !isAuthRoute) {
      window.dispatchEvent(new CustomEvent('pos_unauthorized'));
    }
    throw error;
  }

  return json;
}

export const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body, ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body, ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options }),
};

export default api;
