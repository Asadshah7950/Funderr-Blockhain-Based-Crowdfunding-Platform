import axios from 'axios';
import { AuthService } from './AuthService';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for API
// Use different URL for Android emulator, physical device, and web
export const getApiUrl = () => {
  if (Platform.OS === 'android') {
    // For Android physical device, use your computer's local IP
    // Make sure your phone and computer are on the same WiFi network
    return 'http://192.168.1.10:3001/api';
  } else if (Platform.OS === 'ios') {
    // For iOS physical device, use your computer's local IP
    return 'http://192.168.1.10:3001/api';
  }
  // For web, use localhost
  return 'http://localhost:3001/api';
};

const API_URL = getApiUrl();
console.log('ApiService using URL:', API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add authorization header for authenticated requests
api.interceptors.request.use(
  async (config) => {
    const token = await AuthService.getUserToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export class ApiService {
  // Campaign API methods
  static async createCampaign(campaignData) {
    try {
      const response = await api.post('/campaigns', campaignData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  static async getFeaturedCampaigns(limit = 6) {
    try {
      const response = await api.get('/campaigns/featured', { params: { limit } });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  static async listCampaigns(status = null) {
    try {
      const params = status ? { status } : {};
      const response = await api.get('/campaigns', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  static async approveCampaign(campaignId) {
    try {
      const response = await api.put(`/campaigns/${campaignId}/approve`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  static async rejectCampaign(campaignId, reason = '') {
    try {
      const response = await api.put(`/campaigns/${campaignId}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  static async getUserCampaigns(userId) {
    try {
      const response = await api.get(`/campaigns/user/${userId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  static async updateCampaign(campaignId, updateData) {
    try {
      const response = await api.put(`/campaigns/${campaignId}`, updateData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  static async deleteCampaign(campaignId) {
    try {
      const response = await api.delete(`/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  static async getUserId() {
    return await AuthService.getUserId();
  }
  
  // User API calls
  static async getUserProfile() {
    try {
      // Get the user ID from the authentication service
      const userId = await AuthService.getUserId();
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      try {
        // Make an API call to get the user profile
        const response = await api.get(`/users/${userId}`);
        return response.data;
      } catch (error) {
        // If we get a 404, the user might not have a profile yet
        if (error.response && error.response.status === 404) {
          console.log('User profile not found in API, using basic data');
          
          // Get basic user info from authentication API
          const token = await AuthService.getUserToken();
          
          if (token) {
            try {
              // Try to get user info from token verification endpoint
              const verifyResponse = await api.post('/auth/verify-token', { token });
              if (verifyResponse.data && verifyResponse.data.user) {
                return verifyResponse.data.user;
              }
            } catch (verifyError) {
              console.log('Could not get user info from token verification');
            }
          }
          
          // Last resort - use stored data as fallback
          const email = await AsyncStorage.getItem('userEmail');
          const role = await AsyncStorage.getItem('userRole');
          
          return {
            id: userId,
            email: email,
            role: role || 'user',
            joinDate: new Date().toISOString(),
          };
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  static async updateUserProfile(userData) {
    try {
      // Get the user ID
      const userId = await AuthService.getUserId();
      
      if (!userId) {
        throw new Error('User not authenticated');
      }
      
      // Make an API call to update the user profile
      const response = await api.put(`/users/${userId}`, userData);
      
      // Store role in AsyncStorage for UI purposes
      if (userData.role) {
        await AsyncStorage.setItem('userRole', userData.role);
      }
      
      return response.data;
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  // Forgot Password: Request reset code
  static async requestPasswordReset(email) {
    try {
      const response = await api.post('/auth/request-password-reset', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Forgot Password: Verify code and set new password
  static async resetPassword(email, code, newPassword) {
    try {
      const response = await api.post('/auth/reset-password', { email, code, newPassword });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Signup: Request code for new user (does not require user to exist)
  static async requestSignupCode(email) {
    try {
      const response = await api.post('/auth/send-signup-code', { email });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Signup: Verify code for new user (does not require user to exist)
  static async verifySignupCode(email, code) {
    try {
      const response = await api.post('/auth/verify-signup-code', { email, code });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Forgot Password: Verify reset code (user must exist)
  static async verifyResetCode(email, code) {
    try {
      const response = await api.post('/auth/verify-reset-code', { email, code });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get all users (Admin only)
  static async getAllUsers() {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }

  // Update user status (Admin only)
  static async updateUserStatus(userId, status) {
    try {
      const response = await api.put(`/users/${userId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Update user status error:', error);
      throw error;
    }
  }

  // Update user role (Admin only)
  static async updateUserRole(userId, role) {
    try {
      const response = await api.put(`/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      console.error('Update user role error:', error);
      throw error;
    }
  }

  // Upload certificate image
  static async uploadCertificate(formData) {
    try {
      console.log('[ApiService] Uploading certificate...');
      const response = await api.post('/upload/upload-certificate', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('[ApiService] Upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('[ApiService] Upload certificate error:', error.response?.status, error.response?.data);
      throw error;
    }
  }

  // Get pending approvals (Admin only)
  static async getPendingApprovals() {
    try {
      const response = await api.get('/users/approvals/pending');
      return response.data;
    } catch (error) {
      console.error('Get pending approvals error:', error);
      throw error;
    }
  }

  // Approve user (Admin only)
  static async approveUser(userId) {
    try {
      const response = await api.put(`/users/${userId}/approve`);
      return response.data;
    } catch (error) {
      console.error('Approve user error:', error);
      throw error;
    }
  }

  // Reject user (Admin only)
  static async rejectUser(userId, reason) {
    try {
      const response = await api.put(`/users/${userId}/reject`, { reason });
      return response.data;
    } catch (error) {
      console.error('Reject user error:', error);
      throw error;
    }
  }

  // ===================== ACCOUNTABILITY / SPENDINGS METHODS =====================

  // Get a single campaign by ID
  static async getCampaignById(campaignId) {
    try {
      const response = await api.get(`/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      console.error('Get campaign by ID error:', error);
      throw error;
    }
  }

  // Get spendings for a campaign (public - donors can view)
  static async getCampaignSpendings(campaignId) {
    try {
      const response = await api.get(`/campaigns/${campaignId}/spendings`);
      return response.data;
    } catch (error) {
      console.error('Get campaign spendings error:', error);
      throw error;
    }
  }

  // Add a spending record (campaign creator only)
  static async addSpending(campaignId, spendingData) {
    try {
      const response = await api.post(`/campaigns/${campaignId}/spendings`, spendingData);
      return response.data;
    } catch (error) {
      console.error('Add spending error:', error);
      throw error;
    }
  }

  // Delete a spending record (campaign creator only)
  static async deleteSpending(campaignId, spendingId) {
    try {
      const response = await api.delete(`/campaigns/${campaignId}/spendings/${spendingId}`);
      return response.data;
    } catch (error) {
      console.error('Delete spending error:', error);
      throw error;
    }
  }

  // Upload spending receipt (image or PDF)
  static async uploadSpendingReceipt(formData) {
    try {
      console.log('[ApiService] Uploading spending receipt...');
      const response = await api.post('/upload/upload-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('[ApiService] Receipt upload successful:', response.data);
      return response.data;
    } catch (error) {
      console.error('[ApiService] Upload receipt error:', error.response?.status, error.response?.data);
      throw error;
    }
  }

  // ===================== DONATION METHODS =====================

  // Record a donation (notifies admin and campaign creator)
  static async recordDonation(donationData) {
    try {
      const response = await api.post('/donations', donationData);
      return response.data;
    } catch (error) {
      console.error('Record donation error:', error);
      throw error;
    }
  }

  // Get recent donations (admin only)
  static async getRecentDonations(limit = 50) {
    try {
      const response = await api.get(`/donations/recent?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Get recent donations error:', error);
      throw error;
    }
  }

  // Get donation statistics (admin only)
  static async getDonationStats() {
    try {
      const response = await api.get('/donations/stats');
      return response.data;
    } catch (error) {
      console.error('Get donation stats error:', error);
      throw error;
    }
  }

  // Get donations for a specific campaign
  static async getCampaignDonations(campaignId, limit = 20) {
    try {
      const response = await api.get(`/donations/campaign/${campaignId}?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Get campaign donations error:', error);
      throw error;
    }
  }

  // Get user's own donations
  static async getMyDonations() {
    try {
      const response = await api.get('/donations/my');
      return response.data;
    } catch (error) {
      console.error('Get my donations error:', error);
      throw error;
    }
  }

  // ===================== WITHDRAWAL METHODS =====================

  // Get withdrawal status for a campaign (campaign creator only)
  static async getWithdrawalStatus(campaignId) {
    try {
      const response = await api.get(`/campaigns/${campaignId}/withdraw-status`);
      return response.data;
    } catch (error) {
      console.error('Get withdrawal status error:', error);
      throw error;
    }
  }

  // Get blockchain info for a campaign
  static async getCampaignBlockchainInfo(campaignId) {
    try {
      const response = await api.get(`/campaigns/${campaignId}/blockchain`);
      return response.data;
    } catch (error) {
      console.error('Get campaign blockchain info error:', error);
      throw error;
    }
  }

  // Get creator's campaigns with withdrawal status
  static async getMyCampaignsForWithdrawal() {
    try {
      const userId = await AuthService.getUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const campaigns = await this.getUserCampaigns(userId);
      // Filter only approved campaigns with contract address
      return campaigns.filter(c => c.status === 'approved' && c.campaignContractAddress);
    } catch (error) {
      console.error('Get my campaigns for withdrawal error:', error);
      throw error;
    }
  }

  // ===================== NOTIFICATION METHODS =====================

  // Get all notifications for current user
  static async getNotifications(page = 1, limit = 20, unreadOnly = false) {
    try {
      const response = await api.get('/notifications', {
        params: { page, limit, unreadOnly: unreadOnly.toString() }
      });
      return response.data;
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  }

  // Get unread notification count
  static async getUnreadNotificationCount() {
    try {
      const response = await api.get('/notifications/unread-count');
      return response.data;
    } catch (error) {
      console.error('Get unread count error:', error);
      throw error;
    }
  }

  // Mark a notification as read
  static async markNotificationAsRead(notificationId) {
    try {
      const response = await api.put(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Mark notification as read error:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  static async markAllNotificationsAsRead() {
    try {
      const response = await api.put('/notifications/read-all');
      return response.data;
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  }

  // Delete a notification
  static async deleteNotification(notificationId) {
    try {
      const response = await api.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }

  // Delete all notifications
  static async deleteAllNotifications() {
    try {
      const response = await api.delete('/notifications');
      return response.data;
    } catch (error) {
      console.error('Delete all notifications error:', error);
      throw error;
    }
  }
}
