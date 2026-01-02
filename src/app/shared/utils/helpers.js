/**
 * Shared Helper Utilities
 * Platform-agnostic helper functions
 */

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol (default: 'Ξ' for ETH)
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount, currency = 'Ξ') => {
  if (amount === null || amount === undefined) return `${currency}0.00`;
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currency}${num.toFixed(2)}`;
};

/**
 * Format large numbers with K/M suffixes
 * @param {number} num - Number to format
 * @returns {string} - Formatted number string
 */
export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

/**
 * Calculate progress percentage
 * @param {number} raised - Amount raised
 * @param {number} goal - Funding goal
 * @returns {number} - Progress percentage (0-100)
 */
export const calculateProgress = (raised, goal) => {
  if (!goal || goal === 0) return 0;
  const progress = (raised / goal) * 100;
  return Math.min(progress, 100);
};

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Calculate days remaining until deadline
 * @param {string|Date} deadline - Deadline date
 * @returns {number} - Days remaining
 */
export const calculateDaysRemaining = (deadline) => {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} - Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Generate random ID
 * @returns {string} - Random ID string
 */
export const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

/**
 * Deep clone an object
 * @param {object} obj - Object to clone
 * @returns {object} - Cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 * @param {object} obj - Object to check
 * @returns {boolean} - True if empty
 */
export const isEmpty = (obj) => {
  if (!obj) return true;
  return Object.keys(obj).length === 0;
};

export default {
  formatCurrency,
  formatNumber,
  calculateProgress,
  formatDate,
  calculateDaysRemaining,
  truncateText,
  generateId,
  debounce,
  deepClone,
  isEmpty,
};
