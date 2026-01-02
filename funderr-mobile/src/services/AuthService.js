/**
 * Mobile Auth Service
 * Platform-specific authentication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from './ApiService';

export class AuthService {
  /**
   * Sign in user
   */
  static async signIn(email, password) {
    try {
      console.log(`Attempting to sign in with: ${email}`);
      
      // Check for returning user UI preferences
      const lastEmail = await AsyncStorage.getItem('lastEmail');
      const returningUser = await AsyncStorage.getItem('returningUser');
      let savedUserProfile = null;
      let savedUserRole = null;
      
      if (returningUser === 'true' && lastEmail === email) {
        savedUserProfile = await AsyncStorage.getItem('savedUserProfile');
        savedUserRole = await AsyncStorage.getItem('savedUserRole');
      }
      
      // Authenticate with backend
      const response = await authApi.signIn(email, password);
      console.log('Backend authentication response:', response);
      
      if (!response || !response.token) {
        throw new Error('Invalid response from server');
      }
      
      // Store authentication data
      await AsyncStorage.setItem('userToken', response.token);
      
      const userId = response.userId || response._id || response.id;
      if (userId) {
        await AsyncStorage.setItem('userId', String(userId));
      }
      await AsyncStorage.setItem('userEmail', email);
      await AsyncStorage.setItem('lastEmail', email);
      await AsyncStorage.setItem('returningUser', 'true');
      
      console.log('Sign in successful');
      
      return {
        ...response,
        isReturningUser: returningUser === 'true',
        hasProfile: !!savedUserProfile,
        hasRole: !!savedUserRole,
      };
    } catch (error) {
      console.error('Sign in error:', error.message);
      
      if (error.response) {
        if (error.response.data && error.response.data.message) {
          throw new Error(error.response.data.message);
        } else if (error.response.status === 401 || error.response.status === 403) {
          throw new Error('Invalid email or password');
        }
      }
      
      throw new Error('Cannot connect to the server. Please check your internet connection.');
    }
  }

  /**
   * Sign up user
   */
  static async signUp(name, email, password, role) {
    try {
      console.log(`Attempting to register with: ${email}`);
      
      const response = await authApi.signUp(name, email, password, role);
      console.log('Backend registration response:', response);
      
      if (!response) {
        throw new Error('Invalid response from server');
      }
      
      await AsyncStorage.setItem('lastEmail', email);
      await AsyncStorage.setItem('returningUser', 'true');
      
      console.log('Sign up successful');
      return response;
    } catch (error) {
      console.error('Sign up error:', error.message);
      
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      
      throw new Error('Registration failed. Please try again later.');
    }
  }

  /**
   * Sign out user
   */
  static async signOut() {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get user token
   */
  static async getUserToken() {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch (error) {
      console.error('Get user token error:', error);
      return null;
    }
  }

  /**
   * Get user ID
   */
  static async getUserId() {
    try {
      return await AsyncStorage.getItem('userId');
    } catch (error) {
      console.error('Get user ID error:', error);
      return null;
    }
  }

  /**
   * Reset password
   */
  static async resetPassword(email) {
    try {
      return await authApi.requestPasswordReset(email);
    } catch (error) {
      console.error('Reset password error:', error);
      throw new Error(error.response?.data?.message || 'Password reset failed');
    }
  }

  /**
   * Verify token
   */
  static async verifyToken() {
    try {
      const token = await this.getUserToken();
      if (!token) return false;
      
      const response = await authApi.verifyToken(token);
      return response.valid;
    } catch (error) {
      console.error('Verify token error:', error);
      return false;
    }
  }
}

export default AuthService;
