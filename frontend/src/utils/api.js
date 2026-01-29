import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updateBankDetails: (data) => api.put('/auth/bank-details', data),
};

// Farm API
export const farmAPI = {
  getAll: () => api.get('/farms'),
  getById: (id) => api.get(`/farms/${id}`),
  create: (data) => api.post('/farms', data),
  update: (id, data) => api.put(`/farms/${id}`, data),
  delete: (id) => api.delete(`/farms/${id}`),
  addCrop: (farmId, data) => api.post(`/farms/${farmId}/crops`, data),
  updateCrop: (farmId, cropId, data) => api.put(`/farms/${farmId}/crops/${cropId}`, data),
  getStates: () => api.get('/farms/states'),
};

// Appointment API (Farmer)
export const appointmentAPI = {
  getAll: () => api.get('/appointments'),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  cancel: (id) => api.put(`/appointments/${id}/cancel`),
};

// Government API
export const governmentAPI = {
  // Appointments
  getAllAppointments: (params) => api.get('/appointments/government/all', { params }),
  getNotifications: () => api.get('/appointments/government/notifications'),
  markAsRead: (appointmentIds) => api.put('/appointments/government/mark-read', { appointmentIds }),
  getStats: () => api.get('/appointments/government/stats'),
  getPendingByLocation: (date) => api.get('/appointments/government/pending-by-location', { params: { date } }),

  // Appointment actions
  verifyAppointment: (id, data) => api.put(`/appointments/government/${id}/verify`, data),
  dispatchTruck: (id, data) => api.put(`/appointments/government/${id}/dispatch-truck`, data),
  markCollected: (id, data) => api.put(`/appointments/government/${id}/collect`, data),
  updateStatus: (id, data) => api.put(`/appointments/government/${id}/status`, data),
  processPayment: (id, data) => api.put(`/appointments/government/${id}/payment`, data),
};

// AI API (Gemini)
export const aiAPI = {
  predictHarvest: (farmId, cropId) => api.post('/ai/predict-harvest', { farmId, cropId }),
  getStrawAdvice: (data) => api.post('/ai/straw-advice', data),
  getCropRecommendations: (farmId) => api.post('/ai/crop-recommendations', { farmId }),
};

// Support API
export const supportAPI = {
  createTicket: (data) => api.post('/support/ticket', data),
  getTickets: () => api.get('/support/tickets'),
  getTicketById: (id) => api.get(`/support/tickets/${id}`),
  replyToTicket: (id, message) => api.post(`/support/tickets/${id}/reply`, { message }),
  quickContact: (data) => api.post('/support/quick-contact', data),
};

// Notifications API
export const notificationsAPI = {
  sendSMS: (data) => api.post('/notifications/send-sms', data),
  sendEmail: (data) => api.post('/notifications/send-email', data),
  sendBulkSMS: (data) => api.post('/notifications/bulk-sms', data),
  sendAppointmentNotification: (appointmentId, data) => api.post(`/notifications/appointment/${appointmentId}`, data),
  sendWeatherAlert: (data) => api.post('/notifications/weather-alert', data),
  getTemplates: () => api.get('/notifications/templates'),
  testNotification: (data) => api.post('/notifications/test', data),
};

// Analytics API (Government)
export const analyticsAPI = {
  getOverview: (params) => api.get('/analytics/overview', { params }),
  getByLocation: (params) => api.get('/analytics/by-location', { params }),
  getCollectionPerformance: (params) => api.get('/analytics/collection-performance', { params }),
  getStrawTypes: () => api.get('/analytics/straw-types'),
  getPaymentSummary: (params) => api.get('/analytics/payment-summary', { params }),
  exportData: (type, params) => api.get('/analytics/export', { params: { type, ...params }, responseType: 'blob' }),
};

// Weather API
export const weatherAPI = {
  getCurrent: (params) => api.get('/weather/current', { params }),
  getForecast: (params) => api.get('/weather/forecast', { params }),
  getFarmWeather: (farmId) => api.get(`/weather/farm/${farmId}`),
  getHarvestAdvisory: (farmId, cropId) => api.get(`/weather/harvest-advisory/${farmId}/${cropId}`),
  getAlerts: () => api.get('/weather/alerts'),
};

// Maps API
export const mapsAPI = {
  // General
  geocode: (data) => api.post('/maps/geocode', data),
  getApiKey: () => api.get('/maps/api-key'),

  // Farm coordinates
  updateFarmCoordinates: (farmId) => api.put(`/maps/farm/${farmId}/coordinates`),

  // Government route planning
  getPendingFarms: (params) => api.get('/maps/government/pending-farms', { params }),
  optimizeRoute: (data) => api.post('/maps/government/optimize-route', data),
  createCollectionRoute: (data) => api.post('/maps/government/create-collection-route', data),
  getRoutes: (params) => api.get('/maps/government/routes', { params }),
  getRouteById: (id) => api.get(`/maps/government/routes/${id}`),
  startRoute: (id) => api.put(`/maps/government/routes/${id}/start`),
};

export default api;
