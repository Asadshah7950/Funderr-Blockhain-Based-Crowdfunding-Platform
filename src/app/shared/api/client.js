/**
 * Shared API Client
 * Platform-agnostic API functions
 * NOTE: Storage operations must be injected from platform-specific code
 */

import axios from 'axios';
import { API_CONFIG } from '../config';

/**
 * Create an API client instance
 * @param {object} options - Configuration options
 * @param {string} options.baseURL - Base URL for the API
 * @param {Function} options.getToken - Async function to get auth token
 * @param {number} options.timeout - Request timeout
 * @returns {object} - Axios instance with interceptors
 */
export const createApiClient = ({ baseURL, getToken, timeout = API_CONFIG.TIMEOUT }) => {
  const client = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout,
  });

  // Request interceptor for auth
  client.interceptors.request.use(
    async (config) => {
      if (getToken) {
        const token = await getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      // Format error for consistent handling
      const formattedError = {
        message: error.response?.data?.message || error.message || 'An error occurred',
        status: error.response?.status,
        data: error.response?.data,
      };
      return Promise.reject(formattedError);
    }
  );

  return client;
};

/**
 * Campaign API functions factory
 * @param {object} apiClient - Axios instance
 * @returns {object} - Campaign API methods
 */
export const createCampaignApi = (apiClient) => ({
  /**
   * Create a new campaign
   */
  createCampaign: async (campaignData) => {
    const response = await apiClient.post('/campaigns', campaignData);
    return response.data;
  },

  /**
   * Get featured campaigns
   */
  getFeaturedCampaigns: async (limit = 6) => {
    const response = await apiClient.get('/campaigns/featured', { params: { limit } });
    return response.data;
  },

  /**
   * List all campaigns
   */
  listCampaigns: async (status = null) => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/campaigns', { params });
    return response.data;
  },

  /**
   * Get campaign by ID
   */
  getCampaignById: async (campaignId) => {
    const response = await apiClient.get(`/campaigns/${campaignId}`);
    return response.data;
  },

  /**
   * Approve campaign (admin)
   */
  approveCampaign: async (campaignId) => {
    const response = await apiClient.put(`/campaigns/${campaignId}/approve`);
    return response.data;
  },

  /**
   * Reject campaign (admin)
   */
  rejectCampaign: async (campaignId, reason = '') => {
    const response = await apiClient.put(`/campaigns/${campaignId}/reject`, { reason });
    return response.data;
  },

  /**
   * Get user's campaigns
   */
  getUserCampaigns: async (userId) => {
    const response = await apiClient.get(`/campaigns/user/${userId}`);
    return response.data;
  },

  /**
   * Update campaign
   */
  updateCampaign: async (campaignId, updateData) => {
    const response = await apiClient.put(`/campaigns/${campaignId}`, updateData);
    return response.data;
  },

  /**
   * Delete campaign
   */
  deleteCampaign: async (campaignId) => {
    const response = await apiClient.delete(`/campaigns/${campaignId}`);
    return response.data;
  },
});

/**
 * User API functions factory
 * @param {object} apiClient - Axios instance
 * @param {Function} getUserId - Function to get current user ID
 * @returns {object} - User API methods
 */
export const createUserApi = (apiClient, getUserId) => ({
  /**
   * Get user profile
   */
  getUserProfile: async () => {
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  /**
   * Update user profile
   */
  updateUserProfile: async (userData) => {
    const userId = await getUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    const response = await apiClient.put(`/users/${userId}`, userData);
    return response.data;
  },

  /**
   * Get all users (admin)
   */
  getAllUsers: async () => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  /**
   * Update user status (admin)
   */
  updateUserStatus: async (userId, status) => {
    const response = await apiClient.put(`/users/${userId}/status`, { status });
    return response.data;
  },

  /**
   * Update user role (admin)
   */
  updateUserRole: async (userId, role) => {
    const response = await apiClient.put(`/users/${userId}/role`, { role });
    return response.data;
  },

  /**
   * Get pending approvals (admin)
   */
  getPendingApprovals: async () => {
    const response = await apiClient.get('/users/approvals/pending');
    return response.data;
  },

  /**
   * Approve user (admin)
   */
  approveUser: async (userId) => {
    const response = await apiClient.put(`/users/${userId}/approve`);
    return response.data;
  },

  /**
   * Reject user (admin)
   */
  rejectUser: async (userId, reason) => {
    const response = await apiClient.put(`/users/${userId}/reject`, { reason });
    return response.data;
  },
});

/**
 * Auth API functions factory
 * @param {object} apiClient - Axios instance
 * @returns {object} - Auth API methods
 */
export const createAuthApi = (apiClient) => ({
  /**
   * Sign in
   */
  signIn: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },

  /**
   * Sign up
   */
  signUp: async (name, email, password, role) => {
    const response = await apiClient.post('/auth/register', { name, email, password, role });
    return response.data;
  },

  /**
   * Request password reset
   */
  requestPasswordReset: async (email) => {
    const response = await apiClient.post('/auth/request-password-reset', { email });
    return response.data;
  },

  /**
   * Reset password
   */
  resetPassword: async (email, code, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', { email, code, newPassword });
    return response.data;
  },

  /**
   * Request signup code
   */
  requestSignupCode: async (email) => {
    const response = await apiClient.post('/auth/send-signup-code', { email });
    return response.data;
  },

  /**
   * Verify signup code
   */
  verifySignupCode: async (email, code) => {
    const response = await apiClient.post('/auth/verify-signup-code', { email, code });
    return response.data;
  },

  /**
   * Verify reset code
   */
  verifyResetCode: async (email, code) => {
    const response = await apiClient.post('/auth/verify-reset-code', { email, code });
    return response.data;
  },

  /**
   * Verify token
   */
  verifyToken: async (token) => {
    const response = await apiClient.post('/auth/verify-token', { token });
    return response.data;
  },
});

/**
 * Upload API functions factory
 * @param {object} apiClient - Axios instance
 * @returns {object} - Upload API methods
 */
export const createUploadApi = (apiClient) => ({
  /**
   * Upload certificate
   */
  uploadCertificate: async (formData) => {
    const response = await apiClient.post('/upload/upload-certificate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
});

export default {
  createApiClient,
  createCampaignApi,
  createUserApi,
  createAuthApi,
  createUploadApi,
};
