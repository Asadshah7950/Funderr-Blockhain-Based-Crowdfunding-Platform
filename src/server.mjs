/**
 * This script starts the MongoDB API server for the Funderr app
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db/connection.mjs';
import authRoutes from './routes/auth.routes.mjs';
import usersRoutes from './routes/users.routes.mjs';
import userRoutes from './routes/users.routes.mjs';

// Load environment variables
dotenv.config();

// Initialize the app
const app = express();
const PORT = process.env.API_PORT || 3001;  // Make sure we use port 3001 consistently

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept', 'Cache-Control']
}));

// Add additional CORS headers for any environment
app.use((req, res, next) => {
  // Respond to all origins for development purposes
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Log incoming requests for debugging
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - Origin: ${req.headers.origin || 'none'}`);
  
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE');
    return res.status(200).json({});
  }
  
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Funderr API' });
});

// Network test route
app.get('/api/network-test', (req, res) => {
  // Return detailed information about the request for debugging
  res.json({
    success: true,
    message: 'Server connection successful!',
    timestamp: new Date().toISOString(),
    clientInfo: {
      ip: req.ip,
      headers: req.headers,
      originalUrl: req.originalUrl,
      protocol: req.protocol
    },
    serverInfo: {
      nodeEnv: process.env.NODE_ENV,
      apiPort: process.env.API_PORT,
      apiHost: process.env.API_HOST
    }
  });
});

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const dbStatus = db.connection.readyState;
    const statusTexts = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    res.json({ 
      dbStatus: statusTexts[dbStatus] || 'unknown',
      connected: dbStatus === 1,
      dbUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/funderrdb'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


import campaignsRoutes from './routes/campaigns.routes.mjs';
import uploadRoutes from './routes/upload.routes.mjs';
import notificationsRoutes from './routes/notifications.routes.mjs';
import donationsRoutes from './routes/donations.routes.mjs';
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/donations', donationsRoutes);

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await db.connect();
    
    // Start server
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    
    // Handle application shutdown
    process.on('SIGINT', async () => {
      await db.disconnect();
      server.close();
      console.log('Application gracefully shut down');
      process.exit(0);
    });
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export the server function for programmatic usage
export default startServer;
