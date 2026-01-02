/**
 * Mobile API Service
 * Self-contained API configuration for mobile app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axios from 'axios';

// Get platform-specific API URL
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    // For Android emulator use 10.0.2.2, for physical device use your IP
    return 'http://192.168.1.10:3001/api';
  } else if (Platform.OS === 'ios') {
    return 'http://192.168.1.10:3001/api';
  }
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

// Combined API service
export const ApiService = {
  // Campaign
  createCampaign: campaignApi.createCampaign,
  getFeaturedCampaigns: campaignApi.getFeaturedCampaigns,
  listCampaigns: campaignApi.listCampaigns,
  getCampaignById: campaignApi.getCampaignById,
  getUserCampaigns: campaignApi.getUserCampaigns,
  
  // User
  getUserProfile: userApi.getUserProfile,
  updateUserProfile: userApi.updateUserProfile,
  getUserId,
  
  // Auth
  requestPasswordReset: authApi.requestPasswordReset,
  resetPassword: authApi.resetPassword,
  requestSignupCode: authApi.requestSignupCode,
  verifySignupCode: authApi.verifySignupCode,
  verifyResetCode: authApi.verifyResetCode,
};

export { storage, getToken, getUserId, getApiUrl };
export default ApiService;
