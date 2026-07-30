import api from "./axiosConfig";

// Interceptor to inject JWT token in the Authorization headers
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

// Interceptor to handle specific HTTP errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        console.warn('Unauthorized! Logging out user.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Dispatch custom event or redirect window if needed
        window.dispatchEvent(new Event('auth-logout'));
      }
    } else if (error.response && error.response.status === 403) {
      // User is likely suspended. Trigger a silent refetch of user data
      window.dispatchEvent(new Event('auth-forbidden'));
      
      // We can also return a rejected promise but add a flag so callers know to ignore
      error.isForbidden = true;
    }
    return Promise.reject(error);
  }
);
// Generic API endpoint factory to reduce duplication
export const createEndpoint = {
  get: (url) => (params) => api.get(url, { params }),
  post: (url) => (data, config) => api.post(url, data, config),
  put: (url) => (data, config) => api.put(url, data, config),
  patch: (url) => (data, config) => api.patch(url, data, config),
  delete: (url) => (config) => api.delete(url, config),
  getById: (base) => (id, params) => api.get(`${base}/${id}`, { params }),
  deleteById: (base) => (id) => api.delete(`${base}/${id}`),
  patchById: (base) => (id, data) => api.patch(`${base}/${id}`, data),
  putById: (base) => (id, data) => api.put(`${base}/${id}`, data),
};

// Authentication Endpoints API
export const authApi = {
  register: createEndpoint.post('/auth/register'),
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    if (response.data?.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.removeItem('user');
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-logout'));
  },
  getMe: createEndpoint.get('/auth/me'),
  verifyEmail: createEndpoint.post('/auth/verify/email'),
  verifyPhone: createEndpoint.post('/auth/verify/phone'),
  updateHostProfile: createEndpoint.put('/auth/profile/host'),
  updateGuestProfile: createEndpoint.put('/auth/profile/guest'),
};

// Listings (Host profiles search and listing management) API
export const listingsApi = {
  create: createEndpoint.post('/listings'),
  getMyListings: createEndpoint.get('/listings/my'),
  deleteListing: createEndpoint.deleteById('/listings'),
  searchHosts: createEndpoint.get('/listings/search'), // handles params automatically
  getKashrutOptions: createEndpoint.get('/listings/kashrut-options'),
};

export const postsApi = {
  create: createEndpoint.post('/posts'),
  update: createEndpoint.putById('/posts'),
  getOpenPosts: createEndpoint.get('/posts'),
  claimPost: (id) => api.post(`/posts/${id}/claim`),
  cancelPost: (id) => api.post(`/posts/${id}/cancel`),
};

// Bookings / Matches API
export const bookingsApi = {
  requestBooking: createEndpoint.post('/bookings/request'),
  getIncomingBookings: createEndpoint.get('/bookings/incoming'),
  respondToBooking: (matchId, status) => api.patch(`/bookings/${matchId}/respond`, { status }),
  getMatchDetails: (matchId) => api.get(`/matches/${matchId}/details`),
  getGuestRequestsCount: createEndpoint.get('/bookings/count'),
  checkGuestStatus: (hostId) => api.get(`/bookings/guest-status/${hostId}`),
};

// Admin Management & Moderation API
export const adminApi = {
  getStats: createEndpoint.get('/admin/stats'),
  getUsers: createEndpoint.get('/admin/users'),
  updateUserStatus: (userId, accountStatus, reason = null) => api.patch(`/admin/users/${userId}/status`, { account_status: accountStatus, reason }),
  verifyGuest: (userId, isVerified) => api.patch(`/admin/users/${userId}/verify-guest`, { is_soldier_or_national_service: isVerified }),
  getBookings: createEndpoint.get('/admin/bookings'),
  deletePost: createEndpoint.deleteById('/admin/posts'),
  deleteUser: createEndpoint.deleteById('/admin/users'),
  getPendingVerifications: createEndpoint.get('/admin/verifications/pending'),
  approveVerification: (requestId) => api.post(`/admin/verifications/${requestId}/approve`),
  rejectVerification: (requestId, reason) => api.post(`/admin/verifications/${requestId}/reject`, { rejection_reason: reason }),
  getSupportChatHistory: (targetUserId) => api.get(`/admin/support-chats/${targetUserId}`),
  replyToSupportChat: (targetUserId, content) => api.post(`/admin/support-chats/${targetUserId}/reply`, { content }),
};

// Host Availability API
export const availabilityApi = {
  getDashboard: createEndpoint.get('/availability'),
  saveRules: createEndpoint.put('/availability/rules'),
  setOverride: (overrideDate, status, note = null) =>
    api.post('/availability/overrides', { override_date: overrideDate, status, note }),
  deleteOverride: createEndpoint.deleteById('/availability/overrides'),
  syncOverrides: (overridesMap) => {
    const overrides = Object.entries(overridesMap).map(([override_date, status]) => ({
      override_date,
      status,
    }));
    return api.put('/availability/overrides', { overrides });
  },
};

// User Identity & Moderation Verification API
export const verificationApi = {
  submitDocuments: (formData) =>
    api.post('/verification/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getStatus: createEndpoint.get('/verification/status'),
  getSupportMessages: (targetUserId = null) =>
    api.get('/verification/support-messages', { params: { target_user_id: targetUserId } }),
  sendSupportMessage: (content, targetUserId = null) =>
    api.post('/verification/support-messages', { content, target_user_id: targetUserId }),
};

// AI Agent API
export const agentApi = {
  chat: (message) => api.post('/agent/chat', { message }),
};

// Reviews & Monitoring API
export const reviewsApi = {
  getPending: createEndpoint.get('/reviews/pending'),
  createReview: createEndpoint.post('/reviews'),
  getHostReviews: (hostId) => api.get(`/reviews/host/${hostId}`),
  getGuestReviews: (guestId) => api.get(`/reviews/guest/${guestId}`),
  getMatchReviews: (matchId) => api.get(`/reviews/match/${matchId}`),
  getAlerts: createEndpoint.get('/reviews/alerts'),
  updateStatus: (reviewId, status) => api.patch(`/reviews/${reviewId}/status`, { status }),
};

// Persistent Notifications API
export const notificationsApi = {
  getNotifications: createEndpoint.get('/notifications'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: createEndpoint.patch('/notifications/read-all'),
  deleteNotification: createEndpoint.deleteById('/notifications'),
};

export default api;