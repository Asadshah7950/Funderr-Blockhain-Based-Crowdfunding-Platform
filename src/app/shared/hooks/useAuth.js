/**
 * Shared useAuth Hook
 * Platform-agnostic authentication state management
 * NOTE: Storage operations must be provided via context
 */

import { useState, useCallback } from 'react';

/**
 * Create auth hook factory
 * @param {object} storage - Storage interface with get/set/remove methods
 * @param {object} authApi - Auth API instance
 * @returns {Function} - useAuth hook
 */
export const createUseAuth = (storage, authApi) => {
  return () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    /**
     * Sign in user
     */
    const signIn = useCallback(async (email, password) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await authApi.signIn(email, password);
        
        if (response.token) {
          await storage.set('userToken', response.token);
        }
        
        const userId = response.userId || response._id || response.id;
        if (userId) {
          await storage.set('userId', String(userId));
        }
        
        await storage.set('userEmail', email);
        await storage.set('lastEmail', email);
        await storage.set('returningUser', 'true');
        
        setUser({ email, userId, ...response });
        setIsLoading(false);
        
        return response;
      } catch (err) {
        setError(err.message || 'Sign in failed');
        setIsLoading(false);
        throw err;
      }
    }, [authApi, storage]);

    /**
     * Sign up user
     */
    const signUp = useCallback(async (name, email, password, role) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await authApi.signUp(name, email, password, role);
        
        await storage.set('lastEmail', email);
        await storage.set('returningUser', 'true');
        
        setIsLoading(false);
        return response;
      } catch (err) {
        setError(err.message || 'Sign up failed');
        setIsLoading(false);
        throw err;
      }
    }, [authApi, storage]);

    /**
     * Sign out user
     */
    const signOut = useCallback(async () => {
      setIsLoading(true);
      
      try {
        await storage.remove('userToken');
        await storage.remove('userId');
        setUser(null);
        setIsLoading(false);
        return true;
      } catch (err) {
        setError(err.message || 'Sign out failed');
        setIsLoading(false);
        throw err;
      }
    }, [storage]);

    /**
     * Get current auth state
     */
    const getAuthState = useCallback(async () => {
      try {
        const token = await storage.get('userToken');
        const userId = await storage.get('userId');
        const email = await storage.get('userEmail');
        const role = await storage.get('userRole');
        
        if (token && userId) {
          setUser({ token, userId, email, role });
          return { isAuthenticated: true, token, userId, email, role };
        }
        
        return { isAuthenticated: false };
      } catch (err) {
        return { isAuthenticated: false };
      }
    }, [storage]);

    /**
     * Check if user is authenticated
     */
    const isAuthenticated = useCallback(async () => {
      const token = await storage.get('userToken');
      return !!token;
    }, [storage]);

    /**
     * Get user token
     */
    const getToken = useCallback(async () => {
      return await storage.get('userToken');
    }, [storage]);

    /**
     * Get user ID
     */
    const getUserId = useCallback(async () => {
      return await storage.get('userId');
    }, [storage]);

    return {
      user,
      isLoading,
      error,
      signIn,
      signUp,
      signOut,
      getAuthState,
      isAuthenticated,
      getToken,
      getUserId,
    };
  };
};

export default createUseAuth;
