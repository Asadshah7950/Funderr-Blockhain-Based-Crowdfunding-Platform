/**
 * Mobile Validation Utilities
 */

import { VALIDATION_RULES } from '../config';

export const validateEmail = (email) => {
  if (!email) return { isValid: false, error: 'Email is required' };
  if (!VALIDATION_RULES.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true, error: null };
};

export const validatePassword = (password) => {
  if (!password) return { isValid: false, error: 'Password is required' };
  if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    return { isValid: false, error: `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters` };
  }
  return { isValid: true, error: null };
};

export const validateName = (name) => {
  if (!name) return { isValid: false, error: 'Name is required' };
  if (name.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
    return { isValid: false, error: `Name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters` };
  }
  return { isValid: true, error: null };
};

export const validateConfirmPassword = (password, confirmPassword) => {
  if (!confirmPassword) return { isValid: false, error: 'Please confirm your password' };
  if (password !== confirmPassword) {
    return { isValid: false, error: 'Passwords do not match' };
  }
  return { isValid: true, error: null };
};

export const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: 'None', color: '#9ca3af' };
  
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
  
  const levels = [
    { strength: 0, label: 'Very Weak', color: '#ef4444' },
    { strength: 1, label: 'Weak', color: '#f97316' },
    { strength: 2, label: 'Fair', color: '#eab308' },
    { strength: 3, label: 'Good', color: '#22c55e' },
    { strength: 4, label: 'Strong', color: '#14b8a6' },
    { strength: 5, label: 'Very Strong', color: '#0f766e' },
  ];
  
  return levels[Math.min(score, 5)];
};
