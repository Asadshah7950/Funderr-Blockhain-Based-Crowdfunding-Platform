/**
 * WithdrawFundsScreen - Web Version
 * Allows campaign creators to withdraw funds from their smart contracts
 * Mirrors the mobile app's WithdrawFundsScreen functionality
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';
import { withdrawFromContract, getCampaignRaised } from '../blockchain/contract';

const WithdrawFundsScreen = ({ navigation }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [ethersProvider, setEthersProvider] = useState(null);
  const [ethersSigner, setEthersSigner] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Check wallet connection on mount
  useEffect(() => {
    checkWalletConnection();
    
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, []);

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      setWalletConnected(false);
      setWalletAddress(null);
      setEthersProvider(null);
      setEthersSigner(null);
    } else {
      setWalletAddress(accounts[0]);
      checkWalletConnection();
    }
  };

  const handleChainChanged = () => {
    checkWalletConnection();
  };

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          
          setWalletConnected(true);
          setWalletAddress(accounts[0]);
          setEthersProvider(provider);
          setEthersSigner(signer);
        } else {
          setWalletConnected(false);
          setWalletAddress(null);
        }
      } catch (err) {
        console.error('Error checking wallet:', err);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Check if on Sepolia
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0xaa36a7') {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xaa36a7' }],
            });
          } catch (switchError) {
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia',
                  rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/JKr_0zzfptD4Ie6et6JPg'],
                  nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                  blockExplorerUrls: ['https://sepolia.etherscan.io'],
                }],
              });
            }
          }
        }
        
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        setWalletConnected(true);
        setWalletAddress(accounts[0]);
        setEthersProvider(provider);
        setEthersSigner(signer);
      } catch (err) {
        console.error('Error connecting wallet:', err);
        showAlert('Connection Failed', err.message || 'Failed to connect wallet');
      }
    } else {
      showAlert('MetaMask Required', 'Please install MetaMask to use this feature');
    }
  };

  // Fetch user's campaigns
  const fetchMyCampaigns = useCallback(async () => {
    try {
      setError(null);
      
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        setError('Please log in to view your campaigns');
        setLoading(false);
        return;
      }

      const allCampaigns = await ApiService.getUserCampaigns(userId);
      
      // Filter only approved campaigns with contract address
      const eligibleCampaigns = (allCampaigns || []).filter(
        campaign => campaign.status === 'approved' && campaign.campaignContractAddress
      );

      // Calculate withdrawal status for each campaign
      const campaignsWithStatus = eligibleCampaigns.map(campaign => {
        const withdrawStatus = getWithdrawStatus(campaign);
        return { ...campaign, withdrawStatus };
      });

      // Fetch real-time blockchain data
      const campaignsWithBlockchainData = await Promise.all(
        campaignsWithStatus.map(async (campaign) => {
          try {
            if (campaign.campaignContractAddress) {
              const raised = await getCampaignRaised(campaign.campaignContractAddress);
              return {
                ...campaign,
                blockchainRaised: parseFloat(raised),
                withdrawStatus: getWithdrawStatus({ ...campaign, amountRaised: parseFloat(raised) }),
              };
            }
            return campaign;
          } catch (err) {
            console.error(`Error fetching blockchain data for ${campaign._id}:`, err);
            return campaign;
          }
        })
      );

      setCampaigns(campaignsWithBlockchainData);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyCampaigns();
  }, [fetchMyCampaigns]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyCampaigns();
  };

  // Calculate withdrawal status (same logic as mobile)
  const getWithdrawStatus = (campaign) => {
    const now = new Date();
    const createdDate = new Date(campaign.dateCreated || campaign.createdAt);
    const durationDays = campaign.duration || 30;
    const deadline = new Date(createdDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const raised = campaign.blockchainRaised || campaign.amountRaised || 0;
    const goal = parseFloat(campaign.goal || 0);
    
    const isDeadlinePassed = now > deadline;
    const isGoalReached = raised >= goal && goal > 0;
    const hasNoFunds = raised <= 0;
    const isWithdrawn = campaign.withdrawn || false;

    if (isWithdrawn) {
      return { canWithdraw: false, reason: 'Funds already withdrawn', status: 'withdrawn' };
    }
    if (hasNoFunds) {
      return { canWithdraw: false, reason: 'No funds to withdraw', status: 'no_funds' };
    }
    if (isGoalReached) {
      return { canWithdraw: true, reason: 'Goal reached! Ready to withdraw', status: 'goal_reached' };
    }
    if (isDeadlinePassed) {
      return { canWithdraw: true, reason: 'Campaign ended. Ready to withdraw', status: 'deadline_passed' };
    }

    const daysRemaining = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    return {
      canWithdraw: false,
      reason: `Campaign active. ${daysRemaining} days remaining`,
      status: 'active',
      daysRemaining,
    };
  };

  // Show alert (cross-platform)
  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // Handle withdrawal
  const handleWithdraw = async (campaign) => {
    if (!walletConnected || !ethersSigner) {
      showAlert('Wallet Required', 'Please connect your MetaMask wallet first');
      return;
    }

    // Check wallet address matches
    if (campaign.walletAddress?.toLowerCase() !== walletAddress?.toLowerCase()) {
      showAlert(
        'Wrong Wallet',
        `This campaign was created with wallet:\n${campaign.walletAddress?.slice(0, 10)}...${campaign.walletAddress?.slice(-6)}\n\nPlease connect that wallet to withdraw.`
      );
      return;
    }

    const withdrawStatus = getWithdrawStatus(campaign);
    if (!withdrawStatus.canWithdraw) {
      showAlert('Cannot Withdraw', withdrawStatus.reason);
      return;
    }

    const raised = campaign.blockchainRaised || campaign.amountRaised || 0;
    
    const confirmed = Platform.OS === 'web' 
      ? window.confirm(`Withdraw ${raised.toFixed(4)} ETH from "${campaign.title}"?\n\nFunds will be sent to:\n${walletAddress}`)
      : await new Promise(resolve => {
          Alert.alert(
            'Confirm Withdrawal',
            `Withdraw ${raised.toFixed(4)} ETH from "${campaign.title}"?`,
            [
              { text: 'Cancel', onPress: () => resolve(false) },
              { text: 'Withdraw', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    setWithdrawingId(campaign._id);
    setError(null);
    setSuccessMessage(null);
    setTxHash(null);

    try {
      console.log('🔗 Starting withdrawal from:', campaign.campaignContractAddress);
      
      const receipt = await withdrawFromContract(ethersSigner, campaign.campaignContractAddress);
      
      const hash = receipt.hash || receipt.transactionHash;
      setTxHash(hash);
      
      console.log('✅ Withdrawal successful! Tx:', hash);
      
      setSuccessMessage(`Successfully withdrew ${raised.toFixed(4)} ETH from "${campaign.title}"!`);
      
      // Update campaign in state
      setCampaigns(prev => prev.map(c => 
        c._id === campaign._id 
          ? { ...c, withdrawn: true, withdrawStatus: { canWithdraw: false, reason: 'Funds withdrawn', status: 'withdrawn' } }
          : c
      ));
      
      // Refresh after a delay
      setTimeout(() => fetchMyCampaigns(), 3000);
    } catch (err) {
      console.error('❌ Withdrawal error:', err);
      
      let errorMessage = err.message || 'Failed to withdraw funds';
      
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        errorMessage = 'Transaction was rejected';
      } else if (errorMessage.includes('Only campaign creator')) {
        errorMessage = 'Only the campaign creator can withdraw funds';
      } else if (errorMessage.includes('already withdrawn')) {
        errorMessage = 'Funds have already been withdrawn';
      } else if (errorMessage.includes('still active')) {
        errorMessage = 'Campaign is still active. Wait until deadline or goal is reached.';
      }
      
      setError(errorMessage);
    } finally {
      setWithdrawingId(null);
    }
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Get status colors
  const getStatusColors = (status) => {
    switch (status) {
      case 'goal_reached':
      case 'deadline_passed':
        return { bg: '#d1fae5', text: '#059669', icon: 'checkmark-circle' };
      case 'withdrawn':
        return { bg: '#f3f4f6', text: '#6b7280', icon: 'checkmark-done' };
      case 'no_funds':
        return { bg: '#fee2e2', text: '#dc2626', icon: 'alert-circle' };
      case 'active':
      default:
        return { bg: '#fef3c7', text: '#d97706', icon: 'time' };
    }
  };

  const getStatusText = (withdrawStatus) => {
    switch (withdrawStatus.status) {
      case 'goal_reached': return '✅ Goal Reached';
      case 'deadline_passed': return '⏰ Campaign Ended';
      case 'withdrawn': return '✓ Withdrawn';
      case 'no_funds': return '💰 No Funds';
      case 'active': return `📅 ${withdrawStatus.daysRemaining}d left`;
      default: return 'Unknown';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Withdraw Funds</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#14b8a6']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Wallet Connection Banner */}
        <View style={[styles.walletBanner, { backgroundColor: walletConnected ? '#d1fae5' : '#fee2e2' }]}>
          <View style={styles.walletBannerContent}>
            <Ionicons 
              name={walletConnected ? 'wallet' : 'wallet-outline'} 
              size={24} 
              color={walletConnected ? '#059669' : '#dc2626'} 
            />
            <View style={styles.walletBannerText}>
              <Text style={[styles.walletStatusText, { color: walletConnected ? '#059669' : '#dc2626' }]}>
                {walletConnected ? 'Wallet Connected' : 'Wallet Not Connected'}
              </Text>
              {walletConnected && (
                <Text style={styles.walletAddressText}>{formatAddress(walletAddress)}</Text>
              )}
            </View>
          </View>
          {!walletConnected && (
            <TouchableOpacity style={styles.connectButton} onPress={connectWallet}>
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Error Message */}
        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={20} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={20} color="#dc2626" />
            </TouchableOpacity>
          </View>
        )}

        {/* Success Message */}
        {successMessage && (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <View style={styles.successContent}>
              <Text style={styles.successText}>{successMessage}</Text>
              {txHash && (
                <TouchableOpacity 
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      window.open(`https://sepolia.etherscan.io/tx/${txHash}`, '_blank');
                    }
                  }}
                >
                  <Text style={styles.etherscanLink}>View on Etherscan →</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={() => setSuccessMessage(null)}>
              <Ionicons name="close" size={20} color="#059669" />
            </TouchableOpacity>
          </View>
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={28} color="#4f46e5" />
          <View style={styles.infoBannerContent}>
            <Text style={styles.infoBannerTitle}>Secure Withdrawals</Text>
            <Text style={styles.infoBannerText}>
              Withdraw when your campaign goal is reached OR when the deadline passes. 
              You must use the same wallet that created the campaign.
            </Text>
          </View>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#14b8a6" />
            <Text style={styles.loadingText}>Loading your campaigns...</Text>
          </View>
        )}

        {/* Campaigns List */}
        {!loading && campaigns.length > 0 && (
          <View style={styles.campaignsSection}>
            <Text style={styles.sectionTitle}>Your Campaigns ({campaigns.length})</Text>
            
            {campaigns.map((campaign) => {
              const statusColors = getStatusColors(campaign.withdrawStatus?.status);
              const raised = campaign.blockchainRaised || campaign.amountRaised || 0;
              const goal = parseFloat(campaign.goal || 0);
              const progress = goal > 0 ? Math.min((raised / goal) * 100, 100) : 0;
              
              return (
                <View key={campaign._id} style={styles.campaignCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.campaignTitle} numberOfLines={2}>{campaign.title}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                        {getStatusText(campaign.withdrawStatus)}
                      </Text>
                    </View>
                  </View>

                  {/* Progress */}
                  <View style={styles.progressSection}>
                    <View style={styles.progressHeader}>
                      <Text style={styles.raisedAmount}>{raised.toFixed(4)} ETH</Text>
                      <Text style={styles.goalAmount}>of {goal} ETH goal</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <LinearGradient
                        colors={['#14b8a6', '#0d9488']}
                        style={[styles.progressFill, { width: `${progress}%` }]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      />
                    </View>
                    <Text style={styles.progressText}>{progress.toFixed(1)}% funded</Text>
                  </View>

                  {/* Contract Info */}
                  <TouchableOpacity 
                    style={styles.contractInfo}
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.open(`https://sepolia.etherscan.io/address/${campaign.campaignContractAddress}`, '_blank');
                      }
                    }}
                  >
                    <Ionicons name="document-text-outline" size={16} color="#6b7280" />
                    <Text style={styles.contractLabel}>Contract: </Text>
                    <Text style={styles.contractAddress}>
                      {campaign.campaignContractAddress?.slice(0, 10)}...{campaign.campaignContractAddress?.slice(-6)}
                    </Text>
                    <Ionicons name="open-outline" size={14} color="#14b8a6" />
                  </TouchableOpacity>

                  {/* Status Info */}
                  <View style={[styles.statusInfoBox, { backgroundColor: statusColors.bg }]}>
                    <Ionicons name={statusColors.icon} size={18} color={statusColors.text} />
                    <Text style={[styles.statusInfoText, { color: statusColors.text }]}>
                      {campaign.withdrawStatus?.reason}
                    </Text>
                  </View>

                  {/* Withdraw Button */}
                  <TouchableOpacity
                    style={[
                      styles.withdrawButton,
                      !campaign.withdrawStatus?.canWithdraw && styles.withdrawButtonDisabled
                    ]}
                    onPress={() => handleWithdraw(campaign)}
                    disabled={!campaign.withdrawStatus?.canWithdraw || withdrawingId === campaign._id}
                  >
                    <LinearGradient
                      colors={campaign.withdrawStatus?.canWithdraw 
                        ? ['#14b8a6', '#0d9488'] 
                        : ['#9ca3af', '#6b7280']}
                      style={styles.withdrawButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {withdrawingId === campaign._id ? (
                        <>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={styles.withdrawButtonText}>Processing...</Text>
                        </>
                      ) : campaign.withdrawStatus?.canWithdraw ? (
                        <>
                          <Ionicons name="wallet" size={20} color="#fff" />
                          <Text style={styles.withdrawButtonText}>
                            Withdraw {raised.toFixed(4)} ETH
                          </Text>
                        </>
                      ) : campaign.withdrawStatus?.status === 'withdrawn' ? (
                        <>
                          <Ionicons name="checkmark-done" size={20} color="#fff" />
                          <Text style={styles.withdrawButtonText}>Already Withdrawn</Text>
                        </>
                      ) : campaign.withdrawStatus?.status === 'no_funds' ? (
                        <>
                          <Ionicons name="wallet-outline" size={20} color="#fff" />
                          <Text style={styles.withdrawButtonText}>No Funds Available</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="lock-closed" size={20} color="#fff" />
                          <Text style={styles.withdrawButtonText}>Cannot Withdraw Yet</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Empty State */}
        {!loading && campaigns.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>No Campaigns Found</Text>
            <Text style={styles.emptyStateText}>
              You don't have any approved campaigns on the blockchain yet.
            </Text>
            <TouchableOpacity 
              style={styles.createCampaignLink}
              onPress={() => navigation.navigate('CampaignCreation')}
            >
              <Text style={styles.createCampaignLinkText}>Create a Campaign →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* How It Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howItWorksTitle}>📋 When Can You Withdraw?</Text>
          
          <View style={styles.stepItem}>
            <View style={[styles.stepIcon, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="checkmark" size={16} color="#059669" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Goal Reached</Text>
              <Text style={styles.stepText}>When your campaign reaches 100% of its funding goal, you can withdraw immediately.</Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={[styles.stepIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="time" size={16} color="#d97706" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Campaign Ended</Text>
              <Text style={styles.stepText}>After your campaign deadline passes, you can withdraw whatever amount was raised.</Text>
            </View>
          </View>
          
          <View style={styles.stepItem}>
            <View style={[styles.stepIcon, { backgroundColor: '#e0e7ff' }]}>
              <Ionicons name="wallet" size={16} color="#4f46e5" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Correct Wallet</Text>
              <Text style={styles.stepText}>You must connect the same wallet you used to create the campaign.</Text>
            </View>
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  walletBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  walletBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  walletBannerText: {
    gap: 2,
  },
  walletStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  walletAddressText: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
  },
  connectButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    color: '#dc2626',
    fontSize: 14,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  successContent: {
    flex: 1,
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '500',
  },
  etherscanLink: {
    color: '#4f46e5',
    fontSize: 13,
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#eef2ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#4338ca',
    lineHeight: 18,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 48,
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  campaignsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  campaignCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  campaignTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
  },
  raisedAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14b8a6',
  },
  goalAmount: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  contractInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  contractLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  contractAddress: {
    fontSize: 13,
    color: '#14b8a6',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    flex: 1,
  },
  statusInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusInfoText: {
    fontSize: 14,
    flex: 1,
  },
  withdrawButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  withdrawButtonDisabled: {
    opacity: 0.8,
  },
  withdrawButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  createCampaignLink: {
    padding: 8,
  },
  createCampaignLinkText: {
    color: '#14b8a6',
    fontWeight: '600',
  },
  howItWorks: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  howItWorksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  stepItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  stepText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});

export default WithdrawFundsScreen;
