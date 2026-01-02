/**
 * Mobile App Configuration
 */

// API Configuration
export const API_CONFIG = {
  BASE_URL: 'http://localhost:3001/api',
  TIMEOUT: 15000,
  EXTENDED_TIMEOUT: 20000,
};

// Blockchain Configuration
export const BLOCKCHAIN_CONFIG = {
  CONTRACT_ADDRESS: '0x13f57b9AD14Ec25bBc162F5Ff6ed688EEDB515b1',
  RPC_URL: 'https://eth-sepolia.g.alchemy.com/v2/JKr_0zzfptD4Ie6et6JPg',
  CHAIN_ID: 11155111,
  CHAIN_NAME: 'Sepolia',
};

// App Configuration
export const APP_CONFIG = {
  APP_NAME: 'Funderr',
  VERSION: '1.0.0',
  SUPPORT_EMAIL: 'support@funderr.com',
};

// Validation Rules
export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 6,
  NAME_MIN_LENGTH: 2,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

// Campaign Categories
export const CAMPAIGN_CATEGORIES = [
  'All',
  'Education',
  'Water',
  'Emergency',
  'Health',
  'Environment',
  'Technology',
  'Community',
];
