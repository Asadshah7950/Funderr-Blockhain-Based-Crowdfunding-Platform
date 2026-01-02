import mongoose from 'mongoose';

const DonationSchema = new mongoose.Schema({
  campaignId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Campaign', 
    required: true,
    index: true
  },
  campaignTitle: { 
    type: String, 
    required: true 
  },
  donorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    index: true
  },
  donorName: { 
    type: String, 
    default: 'Anonymous' 
  },
  donorEmail: { 
    type: String 
  },
  donorWallet: { 
    type: String 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'ETH' 
  },
  message: { 
    type: String,
    maxlength: 500
  },
  transactionHash: { 
    type: String,
    index: true
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'refunded'], 
    default: 'completed' 
  },
  isAnonymous: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  }
});

// Index for efficient queries
DonationSchema.index({ createdAt: -1 });
DonationSchema.index({ campaignId: 1, createdAt: -1 });

// Static method to get recent donations
DonationSchema.statics.getRecentDonations = async function(limit = 50) {
  return this.find({ status: 'completed' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('campaignId', 'title imageKey')
    .populate('donorId', 'name email');
};

// Static method to get donation stats
DonationSchema.statics.getDonationStats = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  
  const [totalStats, todayStats, weekStats] = await Promise.all([
    this.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]),
    this.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: weekAgo } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ])
  ]);

  return {
    allTime: {
      total: totalStats[0]?.total || 0,
      count: totalStats[0]?.count || 0
    },
    today: {
      total: todayStats[0]?.total || 0,
      count: todayStats[0]?.count || 0
    },
    thisWeek: {
      total: weekStats[0]?.total || 0,
      count: weekStats[0]?.count || 0
    }
  };
};

export default mongoose.model('Donation', DonationSchema);
