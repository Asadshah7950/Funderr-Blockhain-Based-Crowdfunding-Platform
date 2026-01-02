import Notification from '../models/Notification.mjs';
import User from '../models/User.mjs';

class NotificationService {
  
  // ==================== DONOR NOTIFICATIONS ====================
  
  /**
   * Notify all donors about a new campaign
   */
  static async notifyNewCampaign(campaign) {
    try {
      // Get all donors
      const donors = await User.find({ role: 'donor' });
      
      if (donors.length === 0) {
        console.log('No donors to notify about new campaign');
        return;
      }
      
      const notifications = donors.map(donor => ({
        userId: donor._id,
        type: 'NEW_CAMPAIGN',
        title: '🚀 New Campaign Launched!',
        message: `"${campaign.title}" is now live. Be among the first to support this cause!`,
        icon: '🚀',
        data: {
          campaignId: campaign._id
        },
        actionUrl: `/campaign/${campaign._id}`
      }));
      
      await Notification.insertMany(notifications);
      console.log(`Notified ${donors.length} donors about new campaign: ${campaign.title}`);
    } catch (error) {
      console.error('Error notifying new campaign:', error);
    }
  }
  
  /**
   * Notify donor about successful donation
   */
  static async notifyDonationSuccess(donorId, donation, campaign) {
    try {
      await Notification.createNotification({
        userId: donorId,
        type: 'DONATION_SUCCESS',
        title: '💰 Donation Successful!',
        message: `Your donation of ${donation.amount} ETH to "${campaign.title}" has been confirmed. Thank you for your generosity!`,
        icon: '💰',
        data: {
          campaignId: campaign._id,
          donationAmount: donation.amount
        },
        actionUrl: `/campaign/${campaign._id}`
      });
      console.log(`Notified donor ${donorId} about successful donation`);
    } catch (error) {
      console.error('Error notifying donation success:', error);
    }
  }
  
  /**
   * Notify donors when campaign goal is reached
   */
  static async notifyCampaignGoalReached(campaign, donorIds) {
    try {
      if (!donorIds || donorIds.length === 0) {
        console.log('No donors to notify about goal reached');
        return;
      }
      
      const notifications = donorIds.map(donorId => ({
        userId: donorId,
        type: 'CAMPAIGN_GOAL_REACHED',
        title: '🎉 Campaign Goal Reached!',
        message: `Great news! "${campaign.title}" has reached its funding goal. Your contribution made this possible!`,
        icon: '🎉',
        data: {
          campaignId: campaign._id
        },
        actionUrl: `/campaign/${campaign._id}`
      }));
      
      await Notification.insertMany(notifications);
      console.log(`Notified ${donorIds.length} donors about goal reached: ${campaign.title}`);
    } catch (error) {
      console.error('Error notifying goal reached:', error);
    }
  }
  
  /**
   * Notify donors about campaign ending soon
   */
  static async notifyCampaignEndingSoon(campaign, donorIds) {
    try {
      if (!donorIds || donorIds.length === 0) return;
      
      const notifications = donorIds.map(donorId => ({
        userId: donorId,
        type: 'CAMPAIGN_ENDING_SOON',
        title: '⏰ Campaign Ending Soon!',
        message: `"${campaign.title}" is ending soon. Make your final contribution before it's too late!`,
        icon: '⏰',
        data: {
          campaignId: campaign._id
        },
        actionUrl: `/campaign/${campaign._id}`
      }));
      
      await Notification.insertMany(notifications);
    } catch (error) {
      console.error('Error notifying campaign ending soon:', error);
    }
  }
  
  // ==================== CAMPAIGN CREATOR NOTIFICATIONS ====================
  
  /**
   * Notify campaign creator about profile approval
   */
  static async notifyProfileApproved(userId) {
    try {
      await Notification.createNotification({
        userId,
        type: 'PROFILE_APPROVED',
        title: '✅ Profile Approved!',
        message: 'Congratulations! Your campaign creator profile has been approved. You can now create and launch campaigns.',
        icon: '✅',
        actionUrl: '/create-campaign'
      });
      console.log(`Notified user ${userId} about profile approval`);
    } catch (error) {
      console.error('Error notifying profile approved:', error);
    }
  }
  
  /**
   * Notify campaign creator about profile rejection
   */
  static async notifyProfileRejected(userId, reason) {
    try {
      await Notification.createNotification({
        userId,
        type: 'PROFILE_REJECTED',
        title: '❌ Profile Needs Attention',
        message: `Your campaign creator profile was not approved. Reason: ${reason || 'No reason provided'}. Please update your profile and resubmit.`,
        icon: '❌',
        data: {
          rejectionReason: reason
        },
        actionUrl: '/profile'
      });
      console.log(`Notified user ${userId} about profile rejection`);
    } catch (error) {
      console.error('Error notifying profile rejected:', error);
    }
  }
  
  /**
   * Notify campaign creator about new donation
   */
  static async notifyNewDonation(campaign, donation, donorName) {
    try {
      await Notification.createNotification({
        userId: campaign.creatorId,
        type: 'NEW_DONATION',
        title: '💵 New Donation Received!',
        message: `${donorName || 'A donor'} just donated ${donation.amount} ETH to your campaign "${campaign.title}"!`,
        icon: '💵',
        data: {
          campaignId: campaign._id,
          donationAmount: donation.amount,
          donorName: donorName
        },
        actionUrl: `/campaign/${campaign._id}`
      });
      console.log(`Notified campaign creator about new donation to ${campaign.title}`);
    } catch (error) {
      console.error('Error notifying new donation:', error);
    }
  }
  
  /**
   * Notify campaign creator about milestone reached
   */
  static async notifyMilestoneReached(campaign, milestonePercent) {
    try {
      await Notification.createNotification({
        userId: campaign.creatorId,
        type: 'MILESTONE_REACHED',
        title: `🎯 ${milestonePercent}% Milestone Reached!`,
        message: `Your campaign "${campaign.title}" has reached ${milestonePercent}% of its funding goal!`,
        icon: '🎯',
        data: {
          campaignId: campaign._id,
          milestonePercent
        },
        actionUrl: `/campaign/${campaign._id}`
      });
      console.log(`Notified campaign creator about ${milestonePercent}% milestone`);
    } catch (error) {
      console.error('Error notifying milestone:', error);
    }
  }
  
  /**
   * Notify campaign creator about campaign published
   */
  static async notifyCampaignPublished(campaign) {
    try {
      await Notification.createNotification({
        userId: campaign.creatorId,
        type: 'CAMPAIGN_PUBLISHED',
        title: '📢 Campaign is Live!',
        message: `Your campaign "${campaign.title}" has been published and is now visible to donors.`,
        icon: '📢',
        data: {
          campaignId: campaign._id
        },
        actionUrl: `/campaign/${campaign._id}`
      });
      console.log(`Notified campaign creator about campaign published: ${campaign.title}`);
    } catch (error) {
      console.error('Error notifying campaign published:', error);
    }
  }
  
  /**
   * Notify campaign creator about campaign approved
   */
  static async notifyCampaignApproved(campaign) {
    try {
      await Notification.createNotification({
        userId: campaign.creatorId,
        type: 'CAMPAIGN_APPROVED',
        title: '✅ Campaign Approved!',
        message: `Great news! Your campaign "${campaign.title}" has been approved and is now live for donations.`,
        icon: '✅',
        data: {
          campaignId: campaign._id
        },
        actionUrl: `/campaign/${campaign._id}`
      });
      console.log(`Notified campaign creator about campaign approval: ${campaign.title}`);
    } catch (error) {
      console.error('Error notifying campaign approved:', error);
    }
  }
  
  /**
   * Notify campaign creator about campaign rejection
   */
  static async notifyCampaignRejected(campaign, reason) {
    try {
      await Notification.createNotification({
        userId: campaign.creatorId,
        type: 'CAMPAIGN_REJECTED',
        title: '❌ Campaign Not Approved',
        message: `Your campaign "${campaign.title}" was not approved. Reason: ${reason || 'No reason provided'}. Please make the necessary changes and resubmit.`,
        icon: '❌',
        data: {
          campaignId: campaign._id,
          rejectionReason: reason
        },
        actionUrl: `/campaign/${campaign._id}`
      });
      console.log(`Notified campaign creator about campaign rejection: ${campaign.title}`);
    } catch (error) {
      console.error('Error notifying campaign rejected:', error);
    }
  }
  
  /**
   * Notify campaign creator about campaign ending
   */
  static async notifyCampaignEnding(campaign) {
    try {
      await Notification.createNotification({
        userId: campaign.creatorId,
        type: 'CAMPAIGN_ENDING',
        title: '⏰ Your Campaign is Ending Soon!',
        message: `Your campaign "${campaign.title}" will end soon. Make sure to promote it for last-minute donations!`,
        icon: '⏰',
        data: {
          campaignId: campaign._id
        },
        actionUrl: `/campaign/${campaign._id}`
      });
    } catch (error) {
      console.error('Error notifying campaign ending:', error);
    }
  }
  
  // ==================== ADMIN NOTIFICATIONS ====================
  
  /**
   * Notify admins about new profile pending approval
   */
  static async notifyNewProfilePending(user) {
    try {
      const admins = await User.find({ role: 'admin' });
      
      if (admins.length === 0) {
        console.log('No admins to notify about pending profile');
        return;
      }
      
      const notifications = admins.map(admin => ({
        userId: admin._id,
        type: 'NEW_PROFILE_PENDING',
        title: '👤 New Profile Pending',
        message: `${user.name || user.email} has submitted a campaign creator profile for approval.`,
        icon: '👤',
        actionUrl: '/admin/approvals'
      }));
      
      await Notification.insertMany(notifications);
      console.log(`Notified ${admins.length} admins about new pending profile`);
    } catch (error) {
      console.error('Error notifying admins about pending profile:', error);
    }
  }
  
  /**
   * Notify admins about new campaign pending approval
   */
  static async notifyNewCampaignPending(campaign, creatorName) {
    try {
      const admins = await User.find({ role: 'admin' });
      
      if (admins.length === 0) {
        console.log('No admins to notify about pending campaign');
        return;
      }
      
      const notifications = admins.map(admin => ({
        userId: admin._id,
        type: 'NEW_CAMPAIGN_PENDING',
        title: '📝 New Campaign Pending',
        message: `${creatorName || 'A campaign creator'} has submitted a new campaign "${campaign.title}" for review.`,
        icon: '📝',
        data: {
          campaignId: campaign._id
        },
        actionUrl: '/admin/campaigns'
      }));
      
      await Notification.insertMany(notifications);
      console.log(`Notified ${admins.length} admins about new pending campaign`);
    } catch (error) {
      console.error('Error notifying admins about pending campaign:', error);
    }
  }
  
  // ==================== GENERAL NOTIFICATIONS ====================
  
  /**
   * Send a system message to a user
   */
  static async sendSystemMessage(userId, title, message) {
    try {
      await Notification.createNotification({
        userId,
        type: 'SYSTEM_MESSAGE',
        title,
        message,
        icon: '📣'
      });
    } catch (error) {
      console.error('Error sending system message:', error);
    }
  }
  
  /**
   * Send a system message to all users
   */
  static async broadcastSystemMessage(title, message) {
    try {
      const users = await User.find({});
      
      const notifications = users.map(user => ({
        userId: user._id,
        type: 'SYSTEM_MESSAGE',
        title,
        message,
        icon: '📣'
      }));
      
      await Notification.insertMany(notifications);
      console.log(`Broadcast system message to ${users.length} users`);
    } catch (error) {
      console.error('Error broadcasting system message:', error);
    }
  }
  
  // ==================== SPENDING/ACCOUNTABILITY NOTIFICATIONS ====================
  
  /**
   * Notify donors when a campaign creator adds a spending record
   */
  static async notifySpendingAdded(campaign, spending, donorIds) {
    try {
      if (!donorIds || donorIds.length === 0) {
        console.log('No donors to notify about spending');
        return;
      }
      
      const notifications = donorIds.map(donorId => ({
        userId: donorId,
        type: 'SPENDING_ADDED',
        title: '📋 Spending Update',
        message: `"${campaign.title}" has added a new spending record: ${spending.description} (${spending.amount} ETH)`,
        icon: '📋',
        data: {
          campaignId: campaign._id,
          donationAmount: spending.amount
        },
        actionUrl: `/campaign/${campaign._id}`
      }));
      
      await Notification.insertMany(notifications);
      console.log(`Notified ${donorIds.length} donors about spending update for ${campaign.title}`);
    } catch (error) {
      console.error('Error notifying spending added:', error);
    }
  }
  
  /**
   * Notify previous donors when a campaign creator launches a new campaign
   * This notifies donors who have donated to ANY campaign by this creator before
   */
  static async notifyPreviousDonorsOfNewCampaign(campaign, creatorName) {
    try {
      // Import Campaign model dynamically to avoid circular dependency
      const Campaign = (await import('../models/Campaign.mjs')).default;
      
      // Find all campaigns by this creator
      const creatorCampaigns = await Campaign.find({ creatorId: campaign.creatorId });
      
      // Collect unique donor IDs from all campaigns
      const donorIdSet = new Set();
      for (const c of creatorCampaigns) {
        if (c.contributors && c.contributors.length > 0) {
          for (const contributor of c.contributors) {
            if (contributor.userId) {
              donorIdSet.add(contributor.userId.toString());
            }
          }
        }
      }
      
      if (donorIdSet.size === 0) {
        console.log('No previous donors to notify about new campaign');
        return;
      }
      
      const donorIds = Array.from(donorIdSet);
      
      const notifications = donorIds.map(donorId => ({
        userId: donorId,
        type: 'NEW_CAMPAIGN_FROM_CREATOR',
        title: '🆕 New Campaign from Creator You Supported!',
        message: `${creatorName || 'A creator you supported'} has launched a new campaign: "${campaign.title}". Check it out!`,
        icon: '🆕',
        data: {
          campaignId: campaign._id
        },
        actionUrl: `/campaign/${campaign._id}`
      }));
      
      await Notification.insertMany(notifications);
      console.log(`Notified ${donorIds.length} previous donors about new campaign from creator: ${campaign.title}`);
    } catch (error) {
      console.error('Error notifying previous donors of new campaign:', error);
    }
  }
}

export default NotificationService;
