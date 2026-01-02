import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/funderrdb';

console.log('Attempting to connect to MongoDB at:', MONGODB_URI);

/**
 * Connect to MongoDB database
 */
const connect = async () => {
  try {
    // Set strictQuery to false for more lenient query filter
    mongoose.set('strictQuery', false);
    
    // Add connection options for better stability
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
      family: 4                       // Use IPv4, skip IPv6
    });
    
    console.log('MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    console.error('MongoDB connection error details:', {
      message: error.message,
      code: error.code,
      uri: MONGODB_URI.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://****:****@'), // Hide credentials in logs
    });
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB database
 */
const disconnect = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('MongoDB disconnect error:', error);
  }
};

/**
 * Check if MongoDB is connected
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

export default {
  connect,
  disconnect,
  isConnected,
  connection: mongoose.connection
};
