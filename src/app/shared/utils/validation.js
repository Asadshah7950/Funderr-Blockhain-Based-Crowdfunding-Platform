/**
 * Shared Validation Utilities
 * Platform-agnostic validation functions
 */

import { VALIDATION_RULES } from '../config';

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} - { isValid: boolean, error: string | null }
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }
  if (!VALIDATION_RULES.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true, error: null };
};

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {object} - { isValid: boolean, error: string | null }
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    return { isValid: false, error: `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters` };
  }
  return { isValid: true, error: null };
};

/**
 * Validate name
 * @param {string} name - Name to validate
 * @returns {object} - { isValid: boolean, error: string | null }
 */
export const validateName = (name) => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: 'Name is required' };
  }
  if (name.trim().length < VALIDATION_RULES.NAME_MIN_LENGTH) {
    return { isValid: false, error: `Name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters` };
  }
  return { isValid: true, error: null };
};

/**
 * Validate confirm password
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {object} - { isValid: boolean, error: string | null }
 */
export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) {
    return { isValid: false, error: 'Please confirm your password' };
  }
  if (confirmPassword !== password) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  return { isValid: true, error: null };
};

/**
 * Get password strength
 * @param {string} password - Password to check
 * @returns {string} - 'Strong', 'Moderate', or 'Weak'
 */
export const getPasswordStrength = (password) => {
  if (!password) return 'Weak';
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);
  
  if (password.length > 7 && hasUpperCase && hasNumber && hasSpecialChar) {
    return 'Strong';
  } else if (password.length > 5) {
    return 'Moderate';
  }
  return 'Weak';
};

/**
 * Validate campaign data
 * @param {object} campaignData - Campaign data to validate
 * @returns {object} - { isValid: boolean, errors: object }
 */
export const validateCampaignData = (campaignData) => {
  const errors = {};
  
  if (!campaignData.title || campaignData.title.trim() === '') {
    errors.title = 'Campaign title is required';
  }
  
  if (!campaignData.description || campaignData.description.trim() === '') {
    errors.description = 'Campaign description is required';
  }
  
  if (!campaignData.goal || campaignData.goal <= 0) {
    errors.goal = 'Valid funding goal is required';
  }
  
  if (!campaignData.category) {
    errors.category = 'Category is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export default {
  validateEmail,
  validatePassword,
  validateName,
  validateConfirmPassword,
  getPasswordStrength,
  validateCampaignData,
};
