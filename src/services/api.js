import axios from 'axios';

const rawUrl = (typeof window !== 'undefined' && window.REACT_APP_API_URL) || process.env.REACT_APP_API_URL || '';
const API_BASE_URL = rawUrl ? rawUrl.replace(/\/+$/, '') + '/api' : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || { message: error.message });
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data)
};

export const stockAPI = {
  search: (q, limit = 20) => api.get('/stocks/search', { params: { q, limit } }),
  getQuote: (symbol) => api.get(`/stocks/quote/${symbol}`),
  getAllQuotes: () => api.get('/stocks/quotes'),
  getDetails: (symbol) => api.get(`/stocks/details/${symbol}`),
  getHistory: (symbol, days = 90) => api.get(`/stocks/history/${symbol}`, { params: { days } }),
  getIntraday: (symbol) => api.get(`/stocks/intraday/${symbol}`),
  getGainers: (limit = 10) => api.get('/stocks/gainers', { params: { limit } }),
  getLosers: (limit = 10) => api.get('/stocks/losers', { params: { limit } }),
  getMostActive: (limit = 10) => api.get('/stocks/most-active', { params: { limit } }),
  get52WeekHighLow: () => api.get('/stocks/52week-highlow'),
  getIndices: () => api.get('/stocks/indices'),
  getSectors: () => api.get('/stocks/sectors'),
  getSectorStocks: (name) => api.get(`/stocks/sector/${encodeURIComponent(name)}`),
  getCategoryStocks: (type) => api.get(`/stocks/category/${type}`),
  getFundamentals: (symbol) => api.get(`/stocks/fundamentals/${symbol}`),
  getNews: (symbol) => api.get(`/stocks/news/${symbol}`),
  getIndicators: (symbol, period = 200) => api.get(`/stocks/indicators/${symbol}`, { params: { period } }),
  screener: (params) => api.get('/stocks/screener', { params }),
  getSectorHeatmap: () => api.get('/stocks/sector-heatmap'),
  getSectorNames: () => api.get('/stocks/sector-names')
};

export const portfolioAPI = {
  get: () => api.get('/portfolio'),
  addTrade: (data) => api.post('/portfolio/trade', data),
  removeTrade: (tradeId) => api.delete(`/portfolio/trade/${tradeId}`),
  reset: () => api.delete('/portfolio/reset')
};

export const watchlistAPI = {
  getAll: () => api.get('/watchlists'),
  getOne: (id) => api.get(`/watchlists/${id}`),
  create: (data) => api.post('/watchlists', data),
  update: (id, data) => api.put(`/watchlists/${id}`, data),
  remove: (id) => api.delete(`/watchlists/${id}`),
  addStock: (id, data) => api.post(`/watchlists/${id}/stocks`, data),
  removeStock: (id, symbol) => api.delete(`/watchlists/${id}/stocks/${symbol}`)
};

export const alertAPI = {
  getAll: () => api.get('/alerts'),
  create: (data) => api.post('/alerts', data),
  update: (id, data) => api.put(`/alerts/${id}`, data),
  remove: (id) => api.delete(`/alerts/${id}`),
  toggle: (id) => api.put(`/alerts/${id}/toggle`),
  getHistory: (page = 1, limit = 20) => api.get('/alerts/history', { params: { page, limit } }),
  acknowledgeHistory: (id) => api.put(`/alerts/history/${id}/acknowledge`)
};

export const notificationAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  remove: (id) => api.delete(`/notifications/${id}`)
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  updateUserStatus: (id, isActive) => api.put(`/admin/users/${id}/status`, { isActive }),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  getLogs: (params = {}) => api.get('/admin/logs', { params }),
  getStats: () => api.get('/admin/stats'),
  getHealth: () => api.get('/admin/health'),
  getMarketOverview: () => api.get('/admin/market-overview')
};

export default api;
