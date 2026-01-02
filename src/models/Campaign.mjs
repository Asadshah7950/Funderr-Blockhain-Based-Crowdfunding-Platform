import mongoose from 'mongoose';

// Schema for spending records (accountability)
const SpendingSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  receiptUrl: { type: String, required: true }, // Cloudinary URL
  receiptPublicId: { type: String }, // Cloudinary public ID for deletion
  date: { type: Date, default: Date.now },
  category: { type: String }, // e.g., 'Equipment', 'Services', 'Materials', etc.
});

// Schema for donation records
const DonationSchema = new mongoose.Schema({
  walletAddress: { type: String, required: true },
  amount: { type: Number, required: true },
  transactionHash: { type: String },
  date: { type: Date, default: Date.now },
  message: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
  blockNumber: { type: Number },
});

const CampaignSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  goal: { type: Number, required: true },
  amountRaised: { type: Number, default: 0 },
  contributors: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: { type: Number },
    date: { type: Date, default: Date.now }
  }],
  donations: [DonationSchema], // Track ETH donations with wallet addresses
  spendings: [SpendingSchema], // Accountability: track how funds are spent
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorName: { type: String },
  dateCreated: { type: Date, default: Date.now },
  duration: { type: Number, default: 30 }, // Campaign duration in days
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'], default: 'pending' },
  category: { type: String, required: true },
  imageKey: { type: String },
  rejectionReason: { type: String },
  
  // Blockchain integration (Factory Pattern - individual contract per campaign)
  blockchainId: { type: String }, // Campaign ID from factory (string for large numbers)
  blockchainTxHash: { type: String }, // Transaction hash of campaign contract creation
  campaignContractAddress: { type: String }, // Individual campaign contract address (Etherscan visible)
  walletAddress: { type: String }, // Campaign creator's wallet address for receiving funds
  
  // Admin approval tracking
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

// Index for efficient queries
CampaignSchema.index({ status: 1, dateCreated: -1 });
CampaignSchema.index({ blockchainId: 1 });
CampaignSchema.index({ campaignContractAddress: 1 });
CampaignSchema.index({ creatorId: 1 });

export default mongoose.model('Campaign', CampaignSchema);
