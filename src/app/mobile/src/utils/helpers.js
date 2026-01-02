/**
 * Mobile Helper Utilities
 */

export const formatCurrency = (amount, currency = 'Ξ') => {
  if (amount === null || amount === undefined) return `${currency}0.00`;
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `${currency}${num.toFixed(2)}`;
};

export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
};

export const calculateProgress = (raised, goal) => {
  if (!goal || goal === 0) return 0;
  const progress = (raised / goal) * 100;
  return Math.min(progress, 100);
};

export const formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const calculateDaysRemaining = (deadline) => {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
