/**
 * Mobile API Service
 * Self-contained API configuration for mobile app
 * Uses dynamic IP detection from Expo
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';
import Constants from 'expo-constants';

// Dynamic API URL configuration - automatically detects IP from Expo
const getApiUrl = () => {
  // For development with Expo - automatically get IP from Metro bundler
  if (__DEV__) {
    // Get the debugger host which contains the IP of the machine running Metro
    const debuggerHost = Constants.expoConfig?.hostUri || Constants.manifest?.debuggerHost;
    
    if (debuggerHost) {
      // Extract IP from debuggerHost (format: "192.168.1.10:8081")
      const ip = debuggerHost.split(':')[0];
      console.log('🌐 Dynamic API URL detected:', `http://${ip}:3001/api`);
      return `http://${ip}:3001/api`;
    }
    
    // Fallback for different platforms
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to access host machine
      return 'http://10.0.2.2:3001/api';
    } else if (Platform.OS === 'ios') {
      // iOS simulator can use localhost
      return 'http://localhost:3001/api';
    }
  }
  
  // Production URL (update this when you deploy to production)
  return 'http://localhost:3001/api';
};

// Storage adapter
const storage = {
  get: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },
  set: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },
  remove: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },
};

// Get user token
const getToken = async () => {
  return await storage.get('userToken');
};

// Get user ID
const getUserId = async () => {
  return await storage.get('userId');
};

// Create axios instance
const apiClient = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor for auth
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const formattedError = {
      message: error.response?.data?.message || error.message || 'An error occurred',
      status: error.response?.status,
      data: error.response?.data,
    };
    return Promise.reject(formattedError);
  }
);

// Campaign API
export const campaignApi = {
  createCampaign: async (campaignData) => {
    const response = await apiClient.post('/campaigns', campaignData);
    return response.data;
  },
  getFeaturedCampaigns: async (limit = 6) => {
    const response = await apiClient.get('/campaigns/featured', { params: { limit } });
    return response.data;
  },
  listCampaigns: async (status = null) => {
    const params = status ? { status } : {};
    const response = await apiClient.get('/campaigns', { params });
    return response.data;
  },
  getCampaignById: async (campaignId) => {
    const response = await apiClient.get(`/campaigns/${campaignId}`);
    return response.data;
  },
  getUserCampaigns: async (userId) => {
    const response = await apiClient.get(`/campaigns/user/${userId}`);
    return response.data;
  },
  getMyCampaigns: async () => {
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    const response = await apiClient.get(`/campaigns/user/${userId}`);
    return response.data;
  },
  recordDonation: async (donationData) => {
    const { campaignId, amount, transactionHash, walletAddress, message } = donationData;
    const response = await apiClient.post(`/campaigns/${campaignId}/donate`, {
      amount,
      transactionHash,
      walletAddress,
      message
    });
    return response.data;
  },
  getCampaignDonations: async (campaignId) => {
    const response = await apiClient.get(`/campaigns/${campaignId}/donations`);
    return response.data;
  },
  updateCampaignBlockchain: async (campaignId, blockchainData) => {
    const response = await apiClient.put(`/campaigns/${campaignId}/blockchain`, blockchainData);
    return response.data;
  },
};

// User API
export const userApi = {
  getUserProfile: async () => {
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },
  updateUserProfile: async (userData) => {
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    const response = await apiClient.put(`/users/${userId}`, userData);
    return response.data;
  },
  getUserStats: async () => {
    const userId = await getUserId();
    if (!userId) throw new Error('User not authenticated');
    const response = await apiClient.get(`/users/${userId}/stats`);
    return response.data;
  },
};

// Upload API
export const uploadApi = {
  uploadCertificate: async (formData) => {
    const token = await getToken();
    const response = await apiClient.post('/upload/upload-certificate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    return response.data;
  },
};

// Auth API
export const authApi = {
  signIn: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  },
  signUp: async (name, email, password, role) => {
    const response = await apiClient.post('/auth/register', { name, email, password, role });
    return response.data;
  },
  requestPasswordReset: async (email) => {
    const response = await apiClient.post('/auth/request-password-reset', { email });
    return response.data;
  },
  resetPassword: async (email, code, newPassword) => {
    const response = await apiClient.post('/auth/reset-password', { email, code, newPassword });
    return response.data;
  },
  requestSignupCode: async (email) => {
    const response = await apiClient.post('/auth/send-signup-code', { email });
    return response.data;
  },
  verifySignupCode: async (email, code) => {
    const response = await apiClient.post('/auth/verify-signup-code', { email, code });
    return response.data;
  },
  verifyResetCode: async (email, code) => {
    const response = await apiClient.post('/auth/verify-reset-code', { email, code });
    return response.data;
  },
};

// Accountability/Spendings API
export const accountabilityApi = {
  // Get spendings for a campaign (public - donors can view)
  getCampaignSpendings: async (campaignId) => {
    const response = await apiClient.get(`/campaigns/${campaignId}/spendings`);
    return response.data;
  },
  
  // Add a spending record (campaign creator only)
  addSpending: async (campaignId, spendingData) => {
    const response = await apiClient.post(`/campaigns/${campaignId}/spendings`, spendingData);
    return response.data;
  },
  
  // Delete a spending record (campaign creator only)
  deleteSpending: async (campaignId, spendingId) => {
    const response = await apiClient.delete(`/campaigns/${campaignId}/spendings/${spendingId}`);
    return response.data;
  },
  
  // Upload spending receipt (image or PDF)
  uploadSpendingReceipt: async (formData) => {
    const token = await getToken();
    const response = await apiClient.post('/upload/spending-receipt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    return response.data;
  },
};

// Notifications API
export const notificationsApi = {
  // Get all notifications for the current user
  getNotifications: async (page = 1, limit = 20, unreadOnly = false) => {
    const response = await apiClient.get('/notifications', {
      params: { page, limit, unreadOnly: unreadOnly.toString() }
    });
    return response.data;
  },
  
  // Get unread notification count
  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },
  
  // Mark a notification as read
  markAsRead: async (notificationId) => {
    const response = await apiClient.put(`/notifications/${notificationId}/read`);
    return response.data;
  },
  
  // Mark all notifications as read
  markAllAsRead: async () => {
    const response = await apiClient.put('/notifications/read-all');
    return response.data;
  },
  
  // Delete a notification
  deleteNotification: async (notificationId) => {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  },
  
  // Delete all notifications
  deleteAllNotifications: async () => {
    const response = await apiClient.delete('/notifications');
    return response.data;
  },
};

// Combined API service
export const ApiService = {
  // Campaign
  createCampaign: campaignApi.createCampaign,
  getFeaturedCampaigns: campaignApi.getFeaturedCampaigns,
  listCampaigns: campaignApi.listCampaigns,
  getCampaignById: campaignApi.getCampaignById,
  getUserCampaigns: campaignApi.getUserCampaigns,
  getMyCampaigns: campaignApi.getMyCampaigns,
  recordDonation: campaignApi.recordDonation,
  getCampaignDonations: campaignApi.getCampaignDonations,
  updateCampaignBlockchain: campaignApi.updateCampaignBlockchain,
  
  // User
  getUserProfile: userApi.getUserProfile,
  updateUserProfile: userApi.updateUserProfile,
  getUserStats: userApi.getUserStats,
  getUserId,
  
  // Upload
  uploadCertificate: uploadApi.uploadCertificate,
  
  // Auth
  requestPasswordReset: authApi.requestPasswordReset,
  resetPassword: authApi.resetPassword,
  requestSignupCode: authApi.requestSignupCode,
  verifySignupCode: authApi.verifySignupCode,
  verifyResetCode: authApi.verifyResetCode,
  
  // Accountability/Spendings
  getCampaignSpendings: accountabilityApi.getCampaignSpendings,
  addSpending: accountabilityApi.addSpending,
  deleteSpending: accountabilityApi.deleteSpending,
  uploadSpendingReceipt: accountabilityApi.uploadSpendingReceipt,
  
  // Notifications
  getNotifications: notificationsApi.getNotifications,
  getUnreadCount: notificationsApi.getUnreadCount,
  markNotificationAsRead: notificationsApi.markAsRead,
  markAllNotificationsAsRead: notificationsApi.markAllAsRead,
  deleteNotification: notificationsApi.deleteNotification,
  deleteAllNotifications: notificationsApi.deleteAllNotifications,
};

export { storage, getToken, getUserId, getApiUrl };
export default ApiService;
