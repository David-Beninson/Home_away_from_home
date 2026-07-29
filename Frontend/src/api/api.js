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
    }
    return Promise.reject(error);
  }
);

// Authentication Endpoints API
export const authApi = {
  register: (userData) => api.post('/auth/register', userData),
  login: async (credentials) => {
    // credentials format: { username: "email/phone", password: "password" }
    const response = await api.post('/auth/login', credentials);
    if (response.data?.access_token) {
      localStorage.setItem('token', response.data.access_token);
      localStorage.removeItem('user'); // Clean legacy insecure user cache
    }
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('auth-logout'));
  },
  getMe: () => api.get('/auth/me'),
  verifyEmail: (data) => api.post('/auth/verify/email', data),
  verifyPhone: (data) => api.post('/auth/verify/phone', data),
  updateHostProfile: (data) => api.put('/auth/profile/host', data),
  updateGuestProfile: (data) => api.put('/auth/profile/guest', data),
};

// Listings (Host profiles search and listing management) API
export const listingsApi = {
  create: (listingData) => api.post('/listings', listingData),
  getMyListings: () => api.get('/listings/my'),
  deleteListing: (id) => api.delete(`/listings/${id}`),
  searchHosts: (params) => api.get('/listings/search', { params }), // city, kashrut_level
  getKashrutOptions: () => api.get('/listings/kashrut-options'),
};

// Posts (Guest open boards requests) API
export const postsApi = {
  create: (postData) => api.post('/posts', postData),
  update: (id, postData) => api.put(`/posts/${id}`, postData),
  getOpenPosts: () => api.get('/posts'),
  claimPost: (id) => api.post(`/posts/${id}/claim`),
};

// Bookings / Matches API
export const bookingsApi = {
  requestBooking: (data) => api.post('/bookings/request', data),
  getIncomingBookings: () => api.get('/bookings/incoming'),
  respondToBooking: (matchId, status) => api.patch(`/bookings/${matchId}/respond`, { status }), // status: "accepted" or "rejected"
  getMatchDetails: (matchId) => api.get(`/matches/${matchId}/details`),
  getGuestRequestsCount: () => api.get('/bookings/count'),
  checkGuestStatus: (hostId) => api.get(`/bookings/guest-status/${hostId}`),
};

// Admin Management & Moderation API
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  updateUserStatus: (userId, isActive) => api.patch(`/admin/users/${userId}/status`, { is_active: isActive }),
  verifyGuest: (userId, isVerified) => api.patch(`/admin/users/${userId}/verify-guest`, { is_soldier_or_national_service: isVerified }),
  getBookings: () => api.get('/admin/bookings'),
  deletePost: (postId) => api.delete(`/admin/posts/${postId}`),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getPendingVerifications: () => api.get('/admin/verifications/pending'),
  approveVerification: (requestId) => api.post(`/admin/verifications/${requestId}/approve`),
  rejectVerification: (requestId, reason) => api.post(`/admin/verifications/${requestId}/reject`, { rejection_reason: reason }),
  getSupportChatHistory: (targetUserId) => api.get(`/admin/support-chats/${targetUserId}`),
  replyToSupportChat: (targetUserId, content) => api.post(`/admin/support-chats/${targetUserId}/reply`, { content }),
};

// Host Availability API
export const availabilityApi = {
  // Fetch full state (rule + overrides) on dashboard load
  getDashboard: () => api.get('/availability'),

  // Upsert recurring rules
  saveRules: (rulesPayload) => api.put('/availability/rules', rulesPayload),

  // Upsert a single date override (open/closed)
  setOverride: (overrideDate, status, note = null) =>
    api.post('/availability/overrides', { override_date: overrideDate, status, note }),

  // Remove a single date override (revert to rule)
  deleteOverride: (overrideDate) => api.delete(`/availability/overrides/${overrideDate}`),

  // Bulk-sync the full overrides map to the backend
  // overridesMap: { 'YYYY-MM-DD': 'open' | 'closed' }
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
  getStatus: () => api.get('/verification/status'),
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
  getPending: () => api.get('/reviews/pending'),
  createReview: (data) => api.post('/reviews', data),
  getHostReviews: (hostId) => api.get(`/reviews/host/${hostId}`),
  getGuestReviews: (guestId) => api.get(`/reviews/guest/${guestId}`),
  getMatchReviews: (matchId) => api.get(`/reviews/match/${matchId}`),
  getAlerts: () => api.get('/reviews/alerts'),
  updateStatus: (reviewId, status) => api.patch(`/reviews/${reviewId}/status`, { status }),
};

export default api;