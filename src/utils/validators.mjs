/**
 * Validation and sanitization utilities for Funderr Web3 Crowdfunding
 */

export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

export function isValidEthAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

export function formatEthAddress(address) {
  if (!isValidEthAddress(address)) return '';
  const trimmed = address.trim();
  return trimmed.slice(0, 6) + '...' + trimmed.slice(-4);
}

export function validateCampaignGoal(goal) {
  const parsed = Number(goal);
  if (isNaN(parsed) || parsed <= 0) {
    return { valid: false, error: 'Goal must be a positive number' };
  }
  if (parsed > 100000) {
    return { valid: false, error: 'Goal exceeds maximum threshold of 100,000 ETH' };
  }
  return { valid: true, value: parsed };
}

export function sanitizeCampaignInput(title, description) {
  const sanitizedTitle = (title || '').trim().slice(0, 100);
  const sanitizedDesc = (description || '').trim().slice(0, 5000);
  return {
    title: sanitizedTitle,
    description: sanitizedDesc,
    isValid: sanitizedTitle.length >= 3 && sanitizedDesc.length >= 10,
  };
}
