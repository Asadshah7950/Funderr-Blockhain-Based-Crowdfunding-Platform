/**
 * Shared Module Index
 * Main entry point for all shared code
 */

// Config
export * from './config';
export { default as config } from './config';

// API
export * from './api';
export { default as apiClient } from './api/client';

// Blockchain
export * from './blockchain';
export { default as blockchainHelper } from './blockchain/contract';

// Hooks
export * from './hooks';

// Utils
export * from './utils';
export { default as helpers } from './utils/helpers';
export { default as validation } from './utils/validation';
