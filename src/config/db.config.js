/**
 * MongoDB Configuration
 * This file contains connection settings for MongoDB
 */

// You would normally store this in .env file
// For this example, we're providing a default MongoDB URI
// Replace with your actual MongoDB connection string when deploying
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/funderrdb';

const dbConfig = {
  url: MONGODB_URI,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
};

export default dbConfig;
