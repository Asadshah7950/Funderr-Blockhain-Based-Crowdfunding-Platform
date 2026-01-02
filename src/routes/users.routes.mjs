import express from 'express';
import User from '../models/User.mjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// Get JWT_SECRET from environment variables or use default
const JWT_SECRET = process.env.JWT_SECRET || 'funderr-secret-key';

// Middleware to authenticate user
const authenticate = async (req, res, next) => {
  try {
    // Check for token in the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token required' });
    }
    
    // Extract token from header
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ===================== IMPORTANT: Static routes must come BEFORE parameterized routes =====================

// Get pending approvals (Admin only) - MUST be before /:id routes
router.get('/approvals/pending', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }
    
    // Get all users with pending approval status
    const pendingUsers = await User.find({ 
      approvalStatus: 'pending',
      role: 'campaign_creator'
    }).select('-password').sort({ createdAt: -1 });
    
    res.status(200).json(pendingUsers);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (Admin only) - MUST be before /:id routes
router.get('/', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }
    
    // Get all users excluding passwords
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===================== Parameterized routes below =====================

// Get user stats (donations made, campaigns created, etc.)
router.get('/:id/stats', authenticate, async (req, res) => {
  try {
    // Check if requested ID matches authenticated user
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const userId = req.params.id;
    
    // Import Campaign model
    const Campaign = (await import('../models/Campaign.mjs')).default;
    
    // Get all campaigns where user has contributed
    const allCampaigns = await Campaign.find({});
    
    let donationsMade = 0;
    let totalDonated = 0;
    
    // Calculate donations made by this user
    allCampaigns.forEach(campaign => {
      if (campaign.contributors && campaign.contributors.length > 0) {
        campaign.contributors.forEach(contributor => {
          if (contributor.userId && contributor.userId.toString() === userId) {
            donationsMade++;
            totalDonated += contributor.amount || 0;
          }
        });
      }
    });
    
    // Get campaigns created by this user
    const userCampaigns = await Campaign.find({ creatorId: userId });
    const campaignsCreated = userCampaigns.length;
    
    // Calculate total raised from user's campaigns
    let totalRaised = 0;
    let totalContributors = 0;
    userCampaigns.forEach(campaign => {
      totalRaised += campaign.amountRaised || 0;
      totalContributors += campaign.contributors ? campaign.contributors.length : 0;
    });
    
    // Get campaign stats by status
    const pendingCampaigns = userCampaigns.filter(c => c.status === 'pending').length;
    const approvedCampaigns = userCampaigns.filter(c => c.status === 'approved').length;
    const rejectedCampaigns = userCampaigns.filter(c => c.status === 'rejected').length;
    
    res.status(200).json({
      donationsMade,
      totalDonated,
      campaignsCreated,
      totalRaised,
      totalContributors,
      pendingCampaigns,
      approvedCampaigns,
      rejectedCampaigns
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    // Check if requested ID matches authenticated user
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const user = await User.findById(req.params.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Check if requested ID matches authenticated user
    if (req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { name, role, ...otherFields } = req.body;
    
    // Create update object - don't allow email/password updates through this endpoint
    const updateData = { 
      name,
      role,
      ...otherFields,
      updatedAt: new Date()
    };
    
    // If updating organization details for campaign_creator, set approval status to pending
    if (req.user.role === 'campaign_creator' && 
        (otherFields.organizationName || otherFields.organizationDescription || 
         otherFields.organizationLicenseNumber || otherFields.organizationCertificateUrl)) {
      updateData.approvalStatus = 'pending';
      updateData.approvedBy = null;
      updateData.approvalDate = null;
      updateData.rejectionReason = null;
    }
    
    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true } // Return updated user
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user status (Admin only)
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }
    
    const { status } = req.body;
    
    // Validate status
    if (!['active', 'restricted'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be active or restricted.' });
    }
    
    // Update user status
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user role (Admin only)
router.put('/:id/role', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }
    
    const { role } = req.body;
    
    // Validate role
    if (!['donor', 'campaign_creator', 'user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }
    
    // Prevent admin from demoting themselves
    if (req.params.id === req.user._id.toString() && role !== 'admin') {
      return res.status(400).json({ message: 'Cannot change your own admin role.' });
    }
    
    // Update user role
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role, updatedAt: new Date() },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve user (Admin only)
router.put('/:id/approve', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }
    
    // Update user approval status
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { 
        approvalStatus: 'approved',
        approvedBy: req.user._id,
        approvalDate: new Date(),
        rejectionReason: null,
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ 
      message: 'User approved successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject user (Admin only)
router.put('/:id/reject', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin access required.' });
    }
    
    const { reason } = req.body;
    
    // Update user approval status
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { 
        approvalStatus: 'rejected',
        approvedBy: req.user._id,
        approvalDate: new Date(),
        rejectionReason: reason || 'No reason provided',
        updatedAt: new Date()
      },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ 
      message: 'User rejected successfully',
      user: updatedUser 
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
