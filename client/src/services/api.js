import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
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

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'Something went wrong';
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else {
      // Don't show toast for expected errors handled by components
      if (!error.config?.skipErrorToast) {
        toast.error(message);
      }
    }
    
    return Promise.reject(error.response?.data || error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  sendOTP: (phone) => api.post('/auth/otp/send', { phone }),
  verifyOTP: (phone, otp) => api.post('/auth/otp/verify', { phone, otp }),
  getProfile: () => api.get('/auth/profile'),
};

// Listings endpoints
export const listingsAPI = {
  getAll: (params) => api.get('/listings', { params }),
  getById: (id) => api.get(`/listings/${id}`),
  create: (data) => api.post('/listings', data),
  update: (id, data) => api.patch(`/listings/${id}`, data),
  delete: (id) => api.delete(`/listings/${id}`),
};

// Orders endpoints
export const ordersAPI = {
  create: (data) => api.post('/orders', data),
  getById: (id) => api.get(`/orders/${id}`),
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),
  update: (id, data) => api.patch(`/orders/${id}`, data),
  requestInvoice: (id) => api.post(`/orders/${id}/invoice`),
  getInvoice: (id) => api.get(`/orders/${id}/invoice`),
};

// Messages endpoints
export const messagesAPI = {
  create: (data) => api.post('/messages', data),
  getOrderMessages: (orderId, params) => api.get(`/messages/order/${orderId}`, { params }),
  getUnreadCount: () => api.get('/messages/unread-count'),
};

// Uploads endpoints
export const uploadsAPI = {
  getSignature: (data) => api.post('/uploads/sign', data),
  validate: (data) => api.post('/uploads/validate', data),
};

// Disputes endpoints
export const disputesAPI = {
  create: (data) => api.post('/disputes', data),
  getById: (id) => api.get(`/disputes/${id}`),
  getMyDisputes: (params) => api.get('/disputes/my-disputes', { params }),
  addComment: (id, text) => api.post(`/disputes/${id}/comments`, { text }),
};

// Admin endpoints
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAllOrders: (params) => api.get('/admin/orders', { params }),
  getAllDisputes: (params) => api.get('/admin/disputes', { params }),
  updateDispute: (id, data) => api.patch(`/admin/disputes/${id}`, data),
  getAllUsers: (params) => api.get('/admin/users', { params }),
  updateKYC: (userId, data) => api.patch(`/admin/kyc/${userId}`, data),
  toggleUserStatus: (userId, isActive) => api.patch(`/admin/users/${userId}/status`, { isActive }),
};

export default api;

