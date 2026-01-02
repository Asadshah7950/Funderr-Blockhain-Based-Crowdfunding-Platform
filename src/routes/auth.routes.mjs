import express from 'express';
import User from '../models/User.mjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { sendResetCode, sendSignupCode } from '../services/Send-email.mjs';

// Load environment variables
dotenv.config();

const router = express.Router();

// Get JWT_SECRET from environment variables or use default
const JWT_SECRET = process.env.JWT_SECRET || 'funderr-secret-key';
const TOKEN_EXPIRATION = '1h';

// Helper functions
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION
  });
};

// In-memory store for reset codes (for demo; use DB/Redis in production)
const resetCodes = {};

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password, // In production, you should hash passwords before saving
      role: role || 'user',
    });

    // Save user to database
    const savedUser = await user.save();
    
    // Generate token
    const token = generateToken(savedUser._id);

    res.status(201).json({
      token,
      userId: savedUser._id,
      name: savedUser.name,
      email: savedUser.email,
      role: savedUser.role
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User login
router.post('/login', async (req, res) => {
  console.log('Login request received:', {
    headers: req.headers,
    body: req.body,
    ip: req.ip
  });
  
  try {
    // Validate input data
    if (!req.body) {
      console.error('No request body received');
      return res.status(400).json({ message: 'Invalid request: missing body' });
    }
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      console.error('Missing required fields:', { email: !!email, password: !!password });
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    console.log(`Attempting login for email: ${email}`);

    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists
    if (!user) {
      console.log(`User not found for email: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password', error: 'user_not_found' });
    }
    
    console.log(`User found for email: ${email}, comparing password`);
    
    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log(`Password mismatch for email: ${email}`);
      return res.status(401).json({ message: 'Invalid email or password', error: 'invalid_password' });
    }

    // Generate token
    const token = generateToken(user._id);
    
    console.log(`Login successful for: ${email}`);

    // Make sure we send a complete response
    const responseData = {
      token,
      userId: user._id.toString(), // Convert ObjectId to string
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    console.log('Sending response:', responseData);
    
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Verify token
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(401).json({ valid: false });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ valid: false });
    }
    
    res.status(200).json({ valid: true });
  } catch (error) {
    console.error('Verify token error:', error);
    res.status(401).json({ valid: false });
  }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }
    
    // In a real app, send email with password reset link
    // For demo, just return success
    
    res.status(200).json({ message: 'Password reset instructions sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request password reset (send code to email)
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Email not found' });
    }
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    resetCodes[email] = { code, expires: Date.now() + 15 * 60 * 1000 };
    
    // Send code via Resend
    await sendResetCode(email, code);
    
    res.status(200).json({ message: 'Reset code sent to email' });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset password with code
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!resetCodes[email] || resetCodes[email].code !== code || resetCodes[email].expires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    user.password = newPassword;
    await user.save();
    delete resetCodes[email];
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send signup code to any email (for registration verification)
router.post('/send-signup-code', async (req, res) => {
  try {
    console.log('Received send-signup-code request:', req.body);
    const { email } = req.body;
    
    if (!email) {
      console.log('Email is missing from request');
      return res.status(400).json({ message: 'Email is required' });
    }
    
    console.log('Checking if user exists:', email);
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    resetCodes[email] = { code, expires: Date.now() + 15 * 60 * 1000 };
    console.log('Generated code for:', email);
    
    // Send code via Resend
    console.log('Calling sendSignupCode function...');
    await sendSignupCode(email, code);
    
    console.log('Signup code sent successfully to:', email);
    res.status(200).json({ message: 'Signup code sent to email' });
  } catch (error) {
    console.error('Send signup code error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to send verification code',
      error: error.message 
    });
  }
});

// Verify signup code for any email (does not require user to exist)
router.post('/verify-signup-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!resetCodes[email] || resetCodes[email].code !== code || resetCodes[email].expires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    res.status(200).json({ message: 'Code verified' });
  } catch (error) {
    console.error('Verify signup code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify reset code for password reset (user must exist)
router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!resetCodes[email] || resetCodes[email].code !== code || resetCodes[email].expires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    res.status(200).json({ message: 'Code verified' });
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
