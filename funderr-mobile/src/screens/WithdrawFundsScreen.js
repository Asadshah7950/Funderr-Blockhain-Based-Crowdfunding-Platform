/**
 * Withdraw Funds Screen
 * Allows campaign creators to withdraw funds from their campaign smart contracts
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../context/WalletContext';
import { ApiService } from '../services/ApiService';

const WithdrawFundsScreen = ({ navigation }) => {
  const { 
    isConnected, 
    walletAddress,
    address,
    withdrawFromCampaign,
    txStatus,
    txHash,
    txError,
    isConfirming,
    isConfirmed,
    resetTransaction,
  } = useWallet();

  // Use address or walletAddress (whichever is available)
  const userWalletAddress = walletAddress || address;

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawingCampaignId, setWithdrawingCampaignId] = useState(null);
  const [error, setError] = useState(null);

  // Fetch user's campaigns
  const fetchMyCampaigns = useCallback(async () => {
    try {
      setError(null);
      console.log('📥 Fetching my campaigns...');
      
      const response = await ApiService.getMyCampaigns();
      console.log('📦 Response:', response);
      
      if (response && response.success && response.campaigns) {
        // Show all approved campaigns with contract address
        const allCampaigns = response.campaigns.filter(
          campaign => campaign.status === 'approved' && campaign.campaignContractAddress
        );
        console.log('✅ Found campaigns:', allCampaigns.length);
        setCampaigns(allCampaigns);
      } else if (response && Array.isArray(response)) {
        // Handle case where response is directly an array
        const allCampaigns = response.filter(
          campaign => campaign.status === 'approved' && campaign.campaignContractAddress
        );
        console.log('✅ Found campaigns (array):', allCampaigns.length);
        setCampaigns(allCampaigns);
      } else {
        console.log('⚠️ No campaigns found or invalid response');
        setCampaigns([]);
      }
    } catch (err) {
      console.error('❌ Error fetching campaigns:', err);
      setError(err.message || 'Failed to load your campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyCampaigns();
  }, [fetchMyCampaigns]);

  // Handle transaction status changes
  useEffect(() => {
    if (isConfirmed && withdrawingCampaignId) {
      Alert.alert(
        '🎉 Withdrawal Successful!',
        'Funds have been transferred to your wallet.',
        [
          {
            text: 'View on Etherscan',
            onPress: () => {
              if (txHash) {
                Linking.openURL(`https://sepolia.etherscan.io/tx/${txHash}`);
              }
            },
          },
          {
            text: 'OK',
            onPress: () => {
              resetTransaction();
              setWithdrawingCampaignId(null);
              fetchMyCampaigns(); // Refresh to update balances
            },
          },
        ]
      );
    }
  }, [isConfirmed, txHash, withdrawingCampaignId]);

  useEffect(() => {
    if (txError && withdrawingCampaignId) {
      Alert.alert(
        '❌ Withdrawal Failed',
        txError || 'Transaction was rejected or failed.',
        [
          {
            text: 'OK',
            onPress: () => {
              resetTransaction();
              setWithdrawingCampaignId(null);
            },
          },
        ]
      );
    }
  }, [txError, withdrawingCampaignId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyCampaigns();
  };

  // Calculate if campaign can be withdrawn
  const getWithdrawStatus = (campaign) => {
    const now = new Date();
    const createdDate = new Date(campaign.dateCreated || campaign.createdAt);
    const durationDays = campaign.duration || 30;
    const deadline = new Date(createdDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    
    const isDeadlinePassed = now > deadline;
    const isGoalReached = parseFloat(campaign.amountRaised || 0) >= parseFloat(campaign.goal || 0);
    const hasNoFunds = parseFloat(campaign.amountRaised || 0) <= 0;
    const isWithdrawn = campaign.withdrawn || false;

    if (isWithdrawn) {
      return { canWithdraw: false, reason: 'Already withdrawn', status: 'withdrawn' };
    }
    if (hasNoFunds) {
      return { canWithdraw: false, reason: 'No funds to withdraw', status: 'no_funds' };
    }
    if (isGoalReached) {
      return { canWithdraw: true, reason: 'Goal reached! You can withdraw', status: 'goal_reached' };
    }
    if (isDeadlinePassed) {
      return { canWithdraw: true, reason: 'Campaign ended. You can withdraw', status: 'deadline_passed' };
    }
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return { 
      canWithdraw: false, 
      reason: `Campaign still active. ${daysRemaining} days remaining`, 
      status: 'active',
      daysRemaining 
    };
  };

  const handleWithdraw = async (campaign) => {
    if (!isConnected) {
      Alert.alert(
        'Wallet Not Connected',
        'Please connect your wallet first from the Profile screen.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if user's wallet matches campaign creator wallet
    if (campaign.walletAddress?.toLowerCase() !== userWalletAddress?.toLowerCase()) {
      Alert.alert(
        '⚠️ Wrong Wallet',
        `This campaign was created with a different wallet.\n\nCampaign wallet:\n${campaign.walletAddress?.slice(0, 10)}...${campaign.walletAddress?.slice(-6)}\n\nYour wallet:\n${userWalletAddress?.slice(0, 10)}...${userWalletAddress?.slice(-6)}\n\nPlease connect the correct wallet to withdraw.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const withdrawStatus = getWithdrawStatus(campaign);
    
    if (!withdrawStatus.canWithdraw) {
      Alert.alert(
        '⚠️ Cannot Withdraw Yet',
        withdrawStatus.reason,
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Confirm Withdrawal',
      `Are you sure you want to withdraw ${campaign.amountRaised} ETH from "${campaign.title}"?\n\nFunds will be sent to:\n${userWalletAddress?.slice(0, 10)}...${userWalletAddress?.slice(-8)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'default',
          onPress: async () => {
            try {
              setWithdrawingCampaignId(campaign._id);
              resetTransaction();
              
              const result = await withdrawFromCampaign(campaign.campaignContractAddress);
              
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to initiate withdrawal');
                setWithdrawingCampaignId(null);
              }
            } catch (error) {
              console.error('Withdrawal error:', error);
              Alert.alert('Error', error.message || 'Failed to withdraw funds');
              setWithdrawingCampaignId(null);
            }
          },
        },
      ]
    );
  };

  const openEtherscan = (addressToOpen, type = 'address') => {
    const baseUrl = 'https://sepolia.etherscan.io';
    const url = type === 'tx' 
      ? `${baseUrl}/tx/${addressToOpen}`
      : `${baseUrl}/address/${addressToOpen}`;
    Linking.openURL(url);
  };

  const renderCampaignCard = (campaign) => {
    const isWithdrawing = withdrawingCampaignId === campaign._id;
    const progress = campaign.goal > 0 
      ? ((campaign.amountRaised / campaign.goal) * 100).toFixed(1)
      : 0;
    const withdrawStatus = getWithdrawStatus(campaign);

    return (
      <View key={campaign._id} style={styles.campaignCard}>
        {/* Campaign Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.campaignTitle} numberOfLines={2}>
            {campaign.title}
          </Text>
          <View style={[
            styles.statusBadge,
            withdrawStatus.canWithdraw ? styles.statusBadgeSuccess : 
            withdrawStatus.status === 'withdrawn' ? styles.statusBadgeGray :
            styles.statusBadgeWarning
          ]}>
            <Ionicons 
              name={
                withdrawStatus.canWithdraw ? "checkmark-circle" : 
                withdrawStatus.status === 'withdrawn' ? "checkmark-done-circle" :
                withdrawStatus.status === 'no_funds' ? "alert-circle" :
                "time"
              } 
              size={14} 
              color={
                withdrawStatus.canWithdraw ? "#10B981" : 
                withdrawStatus.status === 'withdrawn' ? "#6B7280" :
                "#F59E0B"
              } 
            />
            <Text style={[
              styles.statusText,
              withdrawStatus.canWithdraw ? styles.statusTextSuccess : 
              withdrawStatus.status === 'withdrawn' ? styles.statusTextGray :
              styles.statusTextWarning
            ]}>
              {withdrawStatus.status === 'goal_reached' ? 'Goal Reached' :
               withdrawStatus.status === 'deadline_passed' ? 'Ended' :
               withdrawStatus.status === 'withdrawn' ? 'Withdrawn' :
               withdrawStatus.status === 'no_funds' ? 'No Funds' :
               `${withdrawStatus.daysRemaining}d left`}
            </Text>
          </View>
        </View>

        {/* Funding Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.raisedAmount}>{parseFloat(campaign.amountRaised || 0).toFixed(4)} ETH</Text>
            <Text style={styles.goalAmount}>of {campaign.goal} ETH goal</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% funded</Text>
        </View>

        {/* Contract Info */}
        <View style={styles.contractSection}>
          <Text style={styles.contractLabel}>Smart Contract</Text>
          <TouchableOpacity 
            style={styles.contractAddress}
            onPress={() => openEtherscan(campaign.campaignContractAddress)}
          >
            <Text style={styles.contractAddressText}>
              {campaign.campaignContractAddress?.slice(0, 10)}...{campaign.campaignContractAddress?.slice(-8)}
            </Text>
            <Ionicons name="open-outline" size={14} color="#6366F1" />
          </TouchableOpacity>
        </View>

        {/* Withdraw Status Info */}
        <View style={[
          styles.withdrawInfoBox,
          withdrawStatus.canWithdraw ? styles.withdrawInfoBoxSuccess : styles.withdrawInfoBoxWarning
        ]}>
          <Ionicons 
            name={withdrawStatus.canWithdraw ? "checkmark-circle" : "information-circle"} 
            size={18} 
            color={withdrawStatus.canWithdraw ? "#059669" : "#D97706"} 
          />
          <Text style={[
            styles.withdrawInfoText,
            withdrawStatus.canWithdraw ? styles.withdrawInfoTextSuccess : styles.withdrawInfoTextWarning
          ]}>
            {withdrawStatus.reason}
          </Text>
        </View>

        {/* Withdraw Button */}
        <TouchableOpacity
          style={[
            styles.withdrawButton,
            (!withdrawStatus.canWithdraw || isWithdrawing) && styles.withdrawButtonDisabled,
          ]}
          onPress={() => handleWithdraw(campaign)}
          disabled={!withdrawStatus.canWithdraw || isWithdrawing}
        >
          {isWithdrawing ? (
            <>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.withdrawButtonText}>
                {isConfirming ? 'Confirming...' : 'Processing...'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="wallet-outline" size={20} color="#FFF" />
              <Text style={styles.withdrawButtonText}>
                {withdrawStatus.canWithdraw 
                  ? `Withdraw ${parseFloat(campaign.amountRaised || 0).toFixed(4)} ETH`
                  : withdrawStatus.status === 'withdrawn' ? 'Already Withdrawn'
                  : withdrawStatus.status === 'no_funds' ? 'No Funds Available'
                  : 'Cannot Withdraw Yet'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loadingText}>Loading your campaigns...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw Funds</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Wallet Status */}
      <View style={[styles.walletStatus, isConnected ? styles.walletConnected : styles.walletDisconnected]}>
        <Ionicons 
          name={isConnected ? "wallet" : "wallet-outline"} 
          size={20} 
          color={isConnected ? "#10B981" : "#EF4444"} 
        />
        <Text style={[styles.walletStatusText, isConnected ? styles.connectedText : styles.disconnectedText]}>
          {isConnected 
            ? `Connected: ${userWalletAddress?.slice(0, 6)}...${userWalletAddress?.slice(-4)}`
            : 'Wallet not connected'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Error Message */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchMyCampaigns}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={24} color="#6366F1" />
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Secure Withdrawals</Text>
            <Text style={styles.infoBannerText}>
              You can withdraw funds when your campaign goal is reached OR when the campaign deadline passes.
            </Text>
          </View>
        </View>

        {/* Campaigns List */}
        {campaigns.length > 0 ? (
          <View style={styles.campaignsList}>
            <Text style={styles.sectionTitle}>Your Campaigns ({campaigns.length})</Text>
            {campaigns.map(renderCampaignCard)}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Campaigns Found</Text>
            <Text style={styles.emptyText}>
              You don't have any approved campaigns on the blockchain yet.
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => navigation.navigate('CampaignCreation')}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFF" />
              <Text style={styles.createButtonText}>Create a Campaign</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* How It Works Section */}
        <View style={styles.howItWorks}>
          <Text style={styles.howItWorksTitle}>When Can You Withdraw?</Text>
          
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#10B981' }]}>
              <Ionicons name="checkmark" size={16} color="#FFF" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Goal Reached</Text>
              <Text style={styles.stepText}>
                When your campaign reaches 100% of its funding goal, you can withdraw immediately.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="time" size={16} color="#FFF" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Campaign Ended</Text>
              <Text style={styles.stepText}>
                After your campaign deadline passes, you can withdraw whatever amount was raised.
              </Text>
            </View>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: '#6366F1' }]}>
              <Ionicons name="wallet" size={16} color="#FFF" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Connect Correct Wallet</Text>
              <Text style={styles.stepText}>
                You must be connected with the same wallet you used to create the campaign.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  walletStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  walletConnected: {
    backgroundColor: '#D1FAE5',
  },
  walletDisconnected: {
    backgroundColor: '#FEE2E2',
  },
  walletStatusText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  connectedText: {
    color: '#059669',
  },
  disconnectedText: {
    color: '#DC2626',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#DC2626',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 8,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  infoBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4338CA',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#6366F1',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  campaignsList: {
    marginBottom: 24,
  },
  campaignCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  campaignTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeGray: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  statusTextSuccess: {
    color: '#059669',
  },
  statusTextWarning: {
    color: '#D97706',
  },
  statusTextGray: {
    color: '#6B7280',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  raisedAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6366F1',
  },
  goalAmount: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  contractSection: {
    marginBottom: 12,
  },
  contractLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  contractAddress: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contractAddressText: {
    fontSize: 14,
    color: '#6366F1',
    fontFamily: 'monospace',
    marginRight: 6,
  },
  withdrawInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  withdrawInfoBoxSuccess: {
    backgroundColor: '#D1FAE5',
  },
  withdrawInfoBoxWarning: {
    backgroundColor: '#FEF3C7',
  },
  withdrawInfoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
  },
  withdrawInfoTextSuccess: {
    color: '#059669',
  },
  withdrawInfoTextWarning: {
    color: '#92400E',
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    borderRadius: 12,
  },
  withdrawButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  withdrawButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  howItWorks: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default WithdrawFundsScreen;
