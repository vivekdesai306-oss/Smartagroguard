import axios from 'axios';

// Automatically detect whether we're in production (Vercel/cloud) or local dev
const getBaseUrl = () => {
  if (typeof window !== 'undefined' && window.__AGROGUARD_API_URL__) {
    return window.__AGROGUARD_API_URL__;
  }
  // Vite env variable if provided
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname) {
    const host = window.location.hostname;
    // If accessing via local machine or hotspot / LAN IP (e.g. 192.168.x.x)
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.')
    ) {
      return `http://${host}:8000`;
    }
  }
  // Public production cloud backend (Render)
  return 'https://smartagroguard-backend-1.onrender.com';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 45000,
});

// Request interceptor to automatically insert authorization token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 Unauthorized automatically
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('agroguard:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
