import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Base URL for API
// Use different URL for Android emulator and web
// Use 10.0.2.2 specifically for Android emulator (it maps to host machine's localhost)
// For real Android devices, you would need your actual machine's IP address
const getApiUrl = () => {
  if (Platform.OS === 'android') {
    // Android physical device needs your computer's local IP
    return 'http://192.168.1.10:3001/api';
  } else if (Platform.OS === 'ios') {
    // iOS physical device needs your computer's local IP
    return 'http://192.168.1.10:3001/api';
  } else {
    // Web or other platforms
    return 'http://localhost:3001/api';
  }
};

const API_URL = getApiUrl();
console.log(`Platform: ${Platform.OS}, Using API URL: ${API_URL}`);

// Create axios instance for auth requests
const authApi = axios.create({
  baseURL: `${API_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Cache-Control': 'no-cache'
  },
  timeout: Platform.OS === 'android' ? 20000 : 15000, // Extended timeout for Android connections
  validateStatus: status => status >= 200 && status < 500, // Handle 4xx errors in the response handler
});

export class AuthService {  static async signIn(email, password) {
    try {
      console.log(`Attempting to sign in with: ${email} to ${authApi.defaults.baseURL}/login`);
      
      // Check if we have saved data for this user for UI preferences only
      const lastEmail = await AsyncStorage.getItem('lastEmail');
      const returningUser = await AsyncStorage.getItem('returningUser');
      let savedUserProfile = null;
      let savedUserRole = null;
      
      // If this is a returning user with the same email
      if (returningUser === 'true' && lastEmail === email) {
        savedUserProfile = await AsyncStorage.getItem('savedUserProfile');
        savedUserRole = await AsyncStorage.getItem('savedUserRole');
      }
      
      // Real authentication with backend only
      const response = await authApi.post('/login', { email, password });
      console.log('Backend authentication response:', response.data);
      
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      
      // Store the authentication data
      if (response.data.token) {
        await AsyncStorage.setItem('userToken', response.data.token);
      } else {
        await AsyncStorage.removeItem('userToken');
      }
      
      // Handle userId - it might come as 'userId' or '_id' from MongoDB
      const userId = response.data.userId || response.data._id || response.data.id;
      if (userId) {
        await AsyncStorage.setItem('userId', String(userId));
      }
      await AsyncStorage.setItem('userEmail', email);
      
      // Store that this is a returning user for next login
      await AsyncStorage.setItem('lastEmail', email);
      await AsyncStorage.setItem('returningUser', 'true');
      
      console.log('Sign in successful with backend authentication');
      
      return {
        ...response.data,
        isReturningUser: returningUser === 'true',
        hasProfile: !!savedUserProfile,
        hasRole: !!savedUserRole
      };
    } catch (error) {
      console.error('Sign in error:', error.message);
      
      // Format error message for better UI display
      if (error.response) {
        if (error.response.data && error.response.data.message) {
          throw new Error(error.response.data.message);
        } else if (error.response.status === 401 || error.response.status === 403) {
          throw new Error('Invalid email or password');
        } else {
          throw new Error('Authentication failed');
        }
      }
      
      // Network or other errors
      throw new Error('Cannot connect to the server. Please check your internet connection.');
    }
  }static async signUp(name, email, password, role) {
    try {
      console.log(`Attempting to register with: ${email} to ${authApi.defaults.baseURL}/register`);
      // Connect to the backend for registration - no mock fallback
      const response = await authApi.post('/register', { name, email, password, role });
      console.log('Backend registration response:', response.data);
      if (!response || !response.data) {
        throw new Error('Invalid response from server');
      }
      // Store that this is a returning user for next login
      await AsyncStorage.setItem('lastEmail', email);
      await AsyncStorage.setItem('returningUser', 'true');
      console.log('Sign up successful');
      return response.data;
    } catch (error) {
      console.error('Sign up error:', error.message);
      // Format error message for better UI display
      if (error.response && error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Registration failed. Please try again later.');
    }
  }

  static async signOut() {
    try {
      // Clear the stored authentication data
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userId');
      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  static async getUserToken() {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return token;
    } catch (error) {
      console.error('Get user token error:', error);
      return null;
    }
  }

  static async getUserId() {
    try {
      const userId = await AsyncStorage.getItem('userId');
      return userId;
    } catch (error) {
      console.error('Get user ID error:', error);
      return null;
    }
  }

  static async resetPassword(email) {
    try {
      const response = await authApi.post('/forgot-password', { email });
      return response.data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw new Error(error.response?.data?.message || 'Password reset failed');
    }
  }

  static async verifyToken() {
    try {
      const token = await this.getUserToken();
      if (!token) return false;
      
      const response = await authApi.post('/verify-token', { token });
      return response.data.valid;
    } catch (error) {
      console.error('Verify token error:', error);
      return false;
    }
  }
}
