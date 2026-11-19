import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization Bearer token if present and valid
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token && token !== 'null' && token !== 'undefined' && token.trim()) {
      config.headers['Authorization'] = `Bearer ${token.trim()}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle authentication and session errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      if (status === 401) {
        // Only clear token and redirect if this is NOT a background/optional call.
        // Background calls (e.g. getPreferences, getComparisons on page load) should
        // fail silently rather than kicking the user out of their session.
        const skipRedirect = error.config?._noAuthRedirect === true;
        if (!skipRedirect) {
          localStorage.removeItem('jwt_token');
          const serverMsg = data?.message || 'Your session has expired. Please log in again to continue.';
          error.message = serverMsg;
          window.dispatchEvent(new CustomEvent('auth:session-expired', { detail: { message: serverMsg } }));
        }
      } else if (status === 403) {
        // 403 = authenticated but forbidden — DO NOT clear token or redirect.
        // User is logged in but requesting something they don't own. Surface the error.
        const serverMsg = data?.message || 'Access denied. You do not have permission to perform this action.';
        error.message = serverMsg;
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
};

export const rideService = {
  searchRides: (searchData) => api.post('/api/rides/search', searchData),
  getProviders: () => api.get('/api/rides/providers'),
  getSearchById: (id) => api.get(`/api/rides/${id}`),
  getFareHistory: (searchId) => api.get(`/api/fare-history/${searchId}`),
  getModelMetrics: () => api.get('/api/rides/model-metrics'),
};

export const recommendationService = {
  getRecommendation: (options) => api.post('/api/recommendations', options),
};

export const userService = {
  getPreferences: () => api.get('/api/user/preferences', { _noAuthRedirect: true }),
  updatePreferences: (data) => api.put('/api/user/preferences', data),
  resetOnboarding: () => api.post('/api/user/reset-onboarding'),
};

export const favouriteService = {
  getFavourites: () => api.get('/api/user/favourites', { _noAuthRedirect: true }),
  addFavourite: (data) => api.post('/api/user/favourites', data),
  updateFavourite: (id, data) => api.put(`/api/user/favourites/${id}`, data),
  deleteFavourite: (id) => api.delete(`/api/user/favourites/${id}`),
};

export const searchComparisonService = {
  /** Save a user-initiated search comparison record to MySQL. */
  saveComparison: (data) => api.post('/api/searches/comparison', data),
  /** Retrieve all saved comparisons for the current user from MySQL (background call — won't force logout on 401). */
  getComparisons: () => api.get('/api/searches/comparisons', { _noAuthRedirect: true }),
  /** Delete all saved comparisons for the current user from MySQL. */
  clearComparisons: () => api.delete('/api/searches/comparisons'),
};

export default api;

