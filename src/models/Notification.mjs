import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      // Donor notifications
      'NEW_CAMPAIGN',
      'NEW_CAMPAIGN_FROM_CREATOR',  // New: Campaign from a creator the donor has donated to before
      'DONATION_SUCCESS',
      'CAMPAIGN_GOAL_REACHED',
      'CAMPAIGN_ENDING_SOON',
      'CAMPAIGN_UPDATE',
      'SPENDING_ADDED',  // New: Campaign creator added a spending record
      
      // Campaign creator notifications
      'PROFILE_APPROVED',
      'PROFILE_REJECTED',
      'NEW_DONATION',
      'MILESTONE_REACHED',
      'CAMPAIGN_PUBLISHED',
      'CAMPAIGN_APPROVED',
      'CAMPAIGN_REJECTED',
      'CAMPAIGN_ENDING',
      
      // Admin notifications
      'NEW_PROFILE_PENDING',
      'NEW_CAMPAIGN_PENDING',
      'ADMIN_NEW_DONATION', // New: notify admin of all donations
      
      // General
      'SYSTEM_MESSAGE'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Campaign'
    },
    donationAmount: Number,
    donorName: String,
    milestonePercent: Number,
    rejectionReason: String
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  icon: {
    type: String,
    default: '🔔'
  },
  actionUrl: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  const notification = new this(data);
  await notification.save();
  return notification;
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ userId, read: false });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { userId, read: false },
    { read: true, readAt: new Date() }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
