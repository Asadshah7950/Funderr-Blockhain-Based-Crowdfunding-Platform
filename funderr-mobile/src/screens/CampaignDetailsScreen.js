/**
 * Mobile Campaign Details Screen - Redesigned
 * Matches the provided design with dynamic data from MongoDB
 * Includes MetaMask wallet integration for donations with smart contract
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Share,
  Dimensions,
  RefreshControl,
  TextInput,
  Modal,
  Linking,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';
import { useWallet } from '../context/WalletContext';
import blockchainService from '../services/BlockchainService';

const { width } = Dimensions.get('window');
const imageWidth = (width - 48 - 12) / 2; // Two images with padding and gap

const CampaignDetailsScreen = ({ route, navigation }) => {
  const { campaign: initialCampaign, campaignId, id } = route.params || {};
  
  // Support both 'id' and 'campaignId' parameters
  const passedId = campaignId || id;
  
  // Wallet context - with proper transaction support
  const {
    isConnected: walletConnected,
    walletAddress,
    balance: walletBalance,
    connect: connectWallet,
    isConnecting: walletConnecting,
    // Transaction state (from wagmi)
    sendEthTransaction,
    resetTransaction,
    txStatus,
    txHash,
    txError,
    isConfirming,
    isConfirmed,
    refreshBalance,
  } = useWallet();
  
  // State
  const [campaign, setCampaign] = useState(initialCampaign || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDonating, setIsDonating] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [error, setError] = useState(null);
  
  // Donation modal state
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [donationStep, setDonationStep] = useState('amount'); // 'amount', 'confirm', 'processing', 'confirming', 'success', 'error'
  const [donationTxHash, setDonationTxHash] = useState(null);
  
  // Ownership state for accountability feature
  const [isOwner, setIsOwner] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  // ============ WATCH TRANSACTION STATUS (Professional Flow) ============
  useEffect(() => {
    // When transaction is sent and waiting for confirmation
    if (txStatus === 'confirming' && donationStep === 'processing') {
      setDonationStep('confirming');
      if (txHash) {
        setDonationTxHash(txHash);
      }
    }
    
    // When transaction is confirmed on blockchain
    if (isConfirmed && txHash && donationStep === 'confirming') {
      console.log('✅ Donation confirmed on blockchain!');
      setDonationTxHash(txHash);
      
      // Record donation in backend
      recordDonationInBackend(txHash);
      
      // Show success
      setDonationStep('success');
      setIsDonating(false);
      
      // Refresh data
      setTimeout(() => {
        onRefresh();
        refreshBalance();
      }, 2000);
    }
    
    // When transaction fails
    if (txStatus === 'error' && (donationStep === 'processing' || donationStep === 'confirming')) {
      console.log('❌ Transaction failed:', txError);
      setDonationStep('error');
      setIsDonating(false);
    }
  }, [txStatus, isConfirmed, txHash, txError, donationStep]);

  // Record donation in backend after blockchain confirmation
  const recordDonationInBackend = async (transactionHash) => {
    try {
      console.log('📝 Recording donation in backend...');
      console.log('   Campaign ID:', campaign._id);
      console.log('   Amount:', donationAmount);
      console.log('   TX Hash:', transactionHash);
      
      const result = await ApiService.recordDonation({
        campaignId: campaign._id,
        amount: parseFloat(donationAmount),
        transactionHash: transactionHash,
        walletAddress: walletAddress,
        message: '',
      });
      
      console.log('✅ Donation recorded in backend:', result);
      
      // Update local campaign state immediately for better UX
      if (result && result.newAmountRaised !== undefined) {
        setCampaign(prev => ({
          ...prev,
          amountRaised: result.newAmountRaised,
        }));
      } else {
        // Fallback: update locally
        setCampaign(prev => ({
          ...prev,
          amountRaised: (parseFloat(prev.amountRaised) || 0) + parseFloat(donationAmount),
        }));
      }
      
    } catch (apiError) {
      console.log('⚠️ Backend update failed (transaction still valid):', apiError);
      // Still update local state even if backend fails
      setCampaign(prev => ({
        ...prev,
        amountRaised: (parseFloat(prev.amountRaised) || 0) + parseFloat(donationAmount),
      }));
    }
  };

  // Fetch campaign data from API
  const fetchCampaign = useCallback(async (showRefresh = false) => {
    const targetId = passedId || initialCampaign?._id;
    
    if (!targetId) {
      setError('No campaign ID provided');
      setIsLoading(false);
      return;
    }

    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      console.log('Fetching campaign with ID:', targetId);
      const data = await ApiService.getCampaignById(targetId);
      console.log('Campaign data received:', data);
      
      if (data) {
        setCampaign(data);
      } else {
        setError('Campaign not found');
      }
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError(err.message || 'Failed to load campaign details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [passedId, initialCampaign]);

  useEffect(() => {
    // If we have initialCampaign with full data, use it directly
    if (initialCampaign && initialCampaign._id && initialCampaign.title) {
      setCampaign(initialCampaign);
      setIsLoading(false);
    } else {
      // Otherwise fetch from API using the ID
      fetchCampaign();
    }
  }, []);

  // Check if current user is the campaign owner
  useEffect(() => {
    const checkOwnership = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const profileData = await AsyncStorage.getItem('userProfile');
        
        let currentUserOwnerId = null;
        if (userId) {
          currentUserOwnerId = userId;
        } else if (profileData) {
          const profile = JSON.parse(profileData);
          currentUserOwnerId = profile._id || profile.id;
        }
        
        setCurrentUserId(currentUserOwnerId);
        
        if (campaign && currentUserOwnerId) {
          // Check all possible creator ID fields from the campaign
          // The campaign model uses creatorId, but API might populate it as creator
          // Convert to string for comparison since MongoDB ObjectIds may be objects
          let campaignOwnerId = 
            campaign.creatorId?._id || 
            campaign.creatorId?.id || 
            campaign.creatorId ||
            campaign.creator?._id || 
            campaign.creator?.id || 
            campaign.creator;
          
          // Convert to string for proper comparison
          const ownerIdStr = String(campaignOwnerId || '');
          const userIdStr = String(currentUserOwnerId || '');
          
          console.log('[Accountability] Current user ID:', userIdStr);
          console.log('[Accountability] Campaign owner ID:', ownerIdStr);
          console.log('[Accountability] Is owner:', userIdStr === ownerIdStr);
          
          setIsOwner(userIdStr === ownerIdStr && userIdStr !== '');
        }
      } catch (error) {
        console.log('Error checking ownership:', error);
        setIsOwner(false);
      }
    };
    
    checkOwnership();
  }, [campaign]);

  // Handle refresh
  const onRefresh = useCallback(async () => {
    const targetId = passedId || campaign?._id || initialCampaign?._id;
    if (!targetId) return;
    
    try {
      setIsRefreshing(true);
      const data = await ApiService.getCampaignById(targetId);
      if (data) {
        setCampaign(data);
      }
    } catch (err) {
      console.error('Error refreshing campaign:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [passedId, campaign, initialCampaign]);

  // Handle share
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this campaign: ${campaign?.title}\n\nHelp support this cause on Funderr!`,
        title: campaign?.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // Navigate to accountability screen
  const handleViewAccountability = () => {
    navigation.navigate('Accountability', {
      campaign: campaign,
      isOwner: isOwner,
    });
  };

  // Handle donate
  const handleDonate = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        Alert.alert(
          'Sign In Required',
          'Please sign in to make a donation',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => navigation.navigate('SignIn') }
          ]
        );
        return;
      }

      if (!walletConnected) {
        Alert.alert(
          'Connect Wallet',
          'Please connect your MetaMask wallet to make donations',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Connect Wallet', 
              onPress: async () => {
                await connectWallet();
              }
            }
          ]
        );
        return;
      }

      // Fetch real-time wallet balance before showing modal
      if (walletAddress) {
        try {
          const realTimeBalance = await blockchainService.getWalletBalance(walletAddress);
          console.log('Real-time wallet balance:', realTimeBalance);
          // The balance will be updated through context refresh
          refreshBalance();
        } catch (e) {
          console.log('Failed to fetch real-time balance:', e);
        }
      }

      // Show donation modal
      setShowDonationModal(true);
      setDonationStep('amount');
      setDonationAmount('');
    } catch (error) {
      console.error('Donation error:', error);
      Alert.alert('Error', 'Failed to process donation');
    }
  };

  // Process donation - with self-donation prevention
  const processDonation = async () => {
    const amount = parseFloat(donationAmount);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid donation amount');
      return;
    }

    if (amount > parseFloat(walletBalance || 0)) {
      Alert.alert('Insufficient Balance', `Your wallet balance (${parseFloat(walletBalance).toFixed(4)} ETH) is less than the donation amount`);
      return;
    }

    // ============ SELF-DONATION PREVENTION ============
    // Check if user is the campaign creator (blockchain level)
    if (campaign.campaignContractAddress && walletAddress) {
      try {
        const eligibility = await blockchainService.canDonate(campaign.campaignContractAddress, walletAddress);
        if (!eligibility.canDonate) {
          Alert.alert(
            eligibility.isCreator ? '🚫 Self-Donation Not Allowed' : 'Cannot Donate',
            eligibility.reason,
            [{ text: 'OK' }]
          );
          return;
        }
      } catch (e) {
        console.log('Eligibility check failed, proceeding:', e);
      }
    }

    setDonationStep('confirm');
  };

  // ============ CONFIRM DONATION - PROFESSIONAL WALLETCONNECT FLOW ============
  const confirmDonation = async () => {
    setDonationStep('processing');
    setIsDonating(true);
    setDonationTxHash(null);

    try {
      console.log('🚀 Starting donation via WalletConnect (Professional Flow)...');
      console.log('   Campaign:', campaign.title);
      console.log('   Amount:', donationAmount, 'ETH');
      console.log('   From:', walletAddress);
      
      // Determine recipient address
      // Priority: Campaign contract > Creator wallet
      const recipientAddress = campaign.campaignContractAddress || campaign.walletAddress;
      
      if (!recipientAddress) {
        throw new Error('Campaign is not ready to receive donations. Please try again later.');
      }
      
      console.log('   To:', recipientAddress);
      
      // Determine if recipient is a smart contract
      // If campaign has a contract address, we need to call the contract's donate function
      const isContract = !!campaign.campaignContractAddress;
      console.log('   Is Contract:', isContract);
      
      // Reset any previous transaction state
      resetTransaction();
      
      // Send transaction via WalletConnect (wagmi)
      // Pass isContract flag to call the proper function
      const result = await sendEthTransaction(recipientAddress, donationAmount, isContract);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to initiate transaction');
      }
      
      // Transaction initiated successfully
      // The useEffect hook will watch for confirmation and update UI automatically
      console.log('📤 Transaction sent to wallet for approval...');
      
      // Note: We don't set success here - the useEffect watching txStatus will handle it
      // This gives us REAL confirmation from blockchain
      
    } catch (error) {
      console.error('❌ Donation initiation failed:', error);
      setDonationStep('error');
      setIsDonating(false);
    }
  };

  // Close donation modal
  const closeDonationModal = () => {
    setShowDonationModal(false);
    setDonationAmount('');
    setDonationStep('amount');
    setDonationTxHash(null);
    // Reset transaction state for next donation
    resetTransaction();
  };

  // Quick amount buttons
  const quickAmounts = ['0.01', '0.05', '0.1', '0.5', '1'];

  // Blockchain info helper functions
  const openEtherscan = (address, type = 'address') => {
    const baseUrl = 'https://sepolia.etherscan.io';
    const url = type === 'tx' 
      ? `${baseUrl}/tx/${address}` 
      : `${baseUrl}/address/${address}`;
    Linking.openURL(url).catch(err => {
      console.error('Failed to open Etherscan:', err);
      Alert.alert('Error', 'Failed to open Etherscan');
    });
  };

  const copyToClipboard = (text, label) => {
    Clipboard.setString(text);
    Alert.alert('Copied!', `${label} copied to clipboard`);
  };

  const shortenAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Calculate days remaining
  const calculateDaysRemaining = () => {
    if (!campaign?.dateCreated || !campaign?.duration) return 0;
    const startDate = new Date(campaign.dateCreated);
    const endDate = new Date(startDate.getTime() + campaign.duration * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  // Format currency (ETH)
  const formatAmount = (amount) => {
    if (!amount) return '0 ETH';
    return `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ETH`;
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading campaign...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !campaign) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>😕</Text>
          <Text style={styles.errorText}>{error || 'Campaign not found'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchCampaign()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButtonAlt}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonAltText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const daysRemaining = calculateDaysRemaining();
  const contributorsCount = campaign.contributors?.length || 0;
  
  // Get campaign images (main + additional)
  const placeholderImage = 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80';
  const mainImage = campaign.imageKey || placeholderImage;
  
  // Simulated additional images (in real app, these would come from the campaign data)
  const additionalImages = [
    campaign.imageKey || 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=400&q=80',
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&q=80',
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.headerButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleShare}
        >
          <Text style={styles.headerButtonText}>Share</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#14b8a6']}
            tintColor="#14b8a6"
          />
        }
      >
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          {/* Left Image with count badge */}
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: additionalImages[0] }}
              style={styles.galleryImage}
              resizeMode="cover"
            />
            <View style={styles.imageCountBadge}>
              <Text style={styles.imageCountText}>10+</Text>
              <Text style={styles.imageCountLabel}>Image</Text>
            </View>
          </View>
          
          {/* Right Image with play button */}
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: additionalImages[1] }}
              style={styles.galleryImage}
              resizeMode="cover"
            />
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>
        </View>

        {/* Campaign Info */}
        <View style={styles.infoSection}>
          {/* Category */}
          <Text style={styles.category}>{campaign.category || 'General'}</Text>
          
          {/* Title and Avatar Row */}
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{campaign.title}</Text>
              <Text style={styles.daysLeft}>{daysRemaining} Days Left</Text>
            </View>
            
            {/* Contributors Avatars */}
            <View style={styles.avatarStack}>
              {[...Array(Math.min(3, contributorsCount || 3))].map((_, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.avatar, 
                    { right: index * 12, zIndex: 3 - index }
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {String.fromCharCode(65 + index)}
                  </Text>
                </View>
              ))}
              {contributorsCount > 3 && (
                <View style={[styles.avatar, styles.avatarCount, { right: 36, zIndex: 0 }]}>
                  <Text style={styles.avatarCountText}>{contributorsCount - 3}+</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>◎</Text>
              </View>
              <View>
                <Text style={styles.statLabel}>Target amount</Text>
                <Text style={styles.statValue}>{formatAmount(campaign.goal)}</Text>
              </View>
            </View>
            
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Text style={styles.statIcon}>◎</Text>
              </View>
              <View>
                <Text style={styles.statLabel}>Raised</Text>
                <Text style={styles.statValue}>{formatAmount(campaign.amountRaised)}</Text>
              </View>
            </View>
          </View>

          {/* Creator */}
          <View style={styles.creatorRow}>
            <View style={styles.creatorAvatar}>
              <Text style={styles.creatorAvatarText}>
                {campaign.creatorName?.charAt(0)?.toUpperCase() || 'C'}
              </Text>
            </View>
            <Text style={styles.creatorLabel}>by </Text>
            <Text style={styles.creatorName}>{campaign.creatorName || 'Anonymous'}</Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.description} numberOfLines={showFullDescription ? undefined : 4}>
              {campaign.description}
            </Text>
            {campaign.description?.length > 200 && (
              <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                <Text style={styles.readMore}>
                  {showFullDescription ? 'Show Less' : 'Read More'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ============ BLOCKCHAIN INFO SECTION ============ */}
          <View style={styles.blockchainSection}>
            <Text style={styles.blockchainTitle}>⛓️ Blockchain Info</Text>
            
            {/* Blockchain Status */}
            <View style={styles.blockchainStatusRow}>
              <Text style={styles.blockchainLabel}>Status:</Text>
              <View style={[
                styles.blockchainBadge,
                campaign.campaignContractAddress ? styles.badgeSuccess : styles.badgePending
              ]}>
                <Text style={[
                  styles.badgeText,
                  campaign.campaignContractAddress ? styles.badgeTextSuccess : styles.badgeTextPending
                ]}>
                  {campaign.campaignContractAddress ? '✓ On Blockchain' : '⏳ Pending Registration'}
                </Text>
              </View>
            </View>

            {/* Contract Address - Only show if registered on blockchain */}
            {campaign.campaignContractAddress && (
              <View style={styles.blockchainRow}>
                <Text style={styles.blockchainLabel}>Smart Contract:</Text>
                <View style={styles.addressContainer}>
                  <TouchableOpacity 
                    style={styles.addressBox}
                    onPress={() => copyToClipboard(campaign.campaignContractAddress, 'Contract address')}
                  >
                    <Text style={styles.addressText}>
                      {shortenAddress(campaign.campaignContractAddress)}
                    </Text>
                    <Text style={styles.copyIcon}>📋</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.etherscanButton}
                    onPress={() => openEtherscan(campaign.campaignContractAddress)}
                  >
                    <Text style={styles.etherscanButtonText}>View ↗</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Creator Wallet Address */}
            {campaign.walletAddress && (
              <View style={styles.blockchainRow}>
                <Text style={styles.blockchainLabel}>Creator Wallet:</Text>
                <View style={styles.addressContainer}>
                  <TouchableOpacity 
                    style={styles.addressBox}
                    onPress={() => copyToClipboard(campaign.walletAddress, 'Creator wallet')}
                  >
                    <Text style={styles.addressText}>
                      {shortenAddress(campaign.walletAddress)}
                    </Text>
                    <Text style={styles.copyIcon}>📋</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.etherscanButton}
                    onPress={() => openEtherscan(campaign.walletAddress)}
                  >
                    <Text style={styles.etherscanButtonText}>View ↗</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Transaction Hash - Only show if available */}
            {campaign.blockchainTxHash && (
              <View style={styles.blockchainRow}>
                <Text style={styles.blockchainLabel}>Creation TX:</Text>
                <View style={styles.addressContainer}>
                  <TouchableOpacity 
                    style={styles.addressBox}
                    onPress={() => copyToClipboard(campaign.blockchainTxHash, 'Transaction hash')}
                  >
                    <Text style={styles.addressText}>
                      {shortenAddress(campaign.blockchainTxHash)}
                    </Text>
                    <Text style={styles.copyIcon}>📋</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.etherscanButton}
                    onPress={() => openEtherscan(campaign.blockchainTxHash, 'tx')}
                  >
                    <Text style={styles.etherscanButtonText}>View ↗</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Network Info */}
            <View style={styles.networkInfoRow}>
              <View style={styles.networkBadge}>
                <Text style={styles.networkIcon}>🔷</Text>
                <Text style={styles.networkText}>Sepolia Testnet</Text>
              </View>
              {campaign.campaignContractAddress && (
                <Text style={styles.verifiedText}>✓ Verified</Text>
              )}
            </View>

            {/* Factory Pattern Info */}
            {campaign.campaignContractAddress && (
              <View style={styles.factoryInfoBox}>
                <Text style={styles.factoryInfoText}>
                  🏭 This campaign has its own smart contract. All donations are tracked on-chain with full transparency.
                </Text>
              </View>
            )}

            {/* Pending Registration Info */}
            {!campaign.campaignContractAddress && campaign.approvalStatus === 'approved' && (
              <View style={styles.pendingInfoBox}>
                <Text style={styles.pendingInfoText}>
                  ⏳ Blockchain registration is processing. The smart contract will be deployed shortly.
                </Text>
              </View>
            )}

            {!campaign.campaignContractAddress && campaign.approvalStatus !== 'approved' && (
              <View style={styles.pendingInfoBox}>
                <Text style={styles.pendingInfoText}>
                  📋 This campaign is pending admin approval. Once approved, it will be registered on the blockchain.
                </Text>
              </View>
            )}
          </View>
          {/* ============ END BLOCKCHAIN INFO SECTION ============ */}
        </View>

        {/* ============ ACCOUNTABILITY SECTION ============ */}
        <View style={styles.accountabilitySection}>
          <TouchableOpacity
            style={styles.accountabilityButton}
            onPress={handleViewAccountability}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isOwner ? ['#f97316', '#ea580c'] : ['#10b981', '#059669']}
              style={styles.accountabilityGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons 
                name={isOwner ? 'cloud-upload' : 'receipt-long'} 
                size={22} 
                color="#fff" 
              />
              <Text style={styles.accountabilityButtonText}>
                {isOwner ? 'Upload Accountability' : 'View Accountability'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
        {/* ============ END ACCOUNTABILITY SECTION ============ */}

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Donate Button */}
      <View style={styles.donateButtonContainer}>
        <TouchableOpacity
          style={[styles.donateButton, isDonating && styles.buttonDisabled]}
          onPress={handleDonate}
          disabled={isDonating}
          activeOpacity={0.8}
        >
          {isDonating ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={styles.donateButtonContent}>
              {walletConnected && (
                <Text style={styles.walletIndicator}>🦊 </Text>
              )}
              <Text style={styles.donateButtonText}>
                {walletConnected ? 'Donate with ETH' : 'Connect Wallet to Donate'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Donation Modal */}
      <Modal
        visible={showDonationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeDonationModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {donationStep === 'success' ? '🎉 Thank You!' : 'Make a Donation'}
              </Text>
              {donationStep !== 'processing' && (
                <TouchableOpacity onPress={closeDonationModal}>
                  <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Amount Step */}
            {donationStep === 'amount' && (
              <View style={styles.modalBody}>
                <Text style={styles.campaignTitle}>{campaign?.title}</Text>
                
                {/* Wallet Info */}
                <View style={styles.walletInfoBox}>
                  <Text style={styles.walletLabel}>Your Wallet Balance</Text>
                  <Text style={styles.walletBalanceText}>
                    Ξ {parseFloat(walletBalance || 0).toFixed(4)} ETH
                  </Text>
                </View>

                {/* Amount Input */}
                <Text style={styles.inputLabel}>Enter Amount (ETH)</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencyPrefix}>Ξ</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={donationAmount}
                    onChangeText={setDonationAmount}
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Quick Amount Buttons */}
                <View style={styles.quickAmounts}>
                  {quickAmounts.map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.quickAmountButton,
                        donationAmount === amount && styles.quickAmountButtonActive
                      ]}
                      onPress={() => setDonationAmount(amount)}
                    >
                      <Text style={[
                        styles.quickAmountText,
                        donationAmount === amount && styles.quickAmountTextActive
                      ]}>
                        {amount} ETH
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Continue Button */}
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    (!donationAmount || parseFloat(donationAmount) <= 0) && styles.buttonDisabled
                  ]}
                  onPress={processDonation}
                  disabled={!donationAmount || parseFloat(donationAmount) <= 0}
                >
                  <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Confirm Step */}
            {donationStep === 'confirm' && (
              <View style={styles.modalBody}>
                <View style={styles.confirmBox}>
                  <Text style={styles.confirmLabel}>You're donating</Text>
                  <Text style={styles.confirmAmount}>Ξ {donationAmount} ETH</Text>
                  <Text style={styles.confirmTo}>to {campaign?.title}</Text>
                </View>

                <View style={styles.transactionDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>From</Text>
                    <Text style={styles.detailValue}>
                      {walletAddress?.substring(0, 6)}...{walletAddress?.substring(walletAddress.length - 4)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>To (Smart Contract)</Text>
                    <Text style={styles.detailValue}>
                      {campaign?.campaignContractAddress 
                        ? `${campaign.campaignContractAddress.substring(0, 6)}...${campaign.campaignContractAddress.substring(campaign.campaignContractAddress.length - 4)}`
                        : campaign?.walletAddress 
                          ? `${campaign.walletAddress.substring(0, 6)}...${campaign.walletAddress.substring(campaign.walletAddress.length - 4)}`
                          : 'Platform Wallet'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Network</Text>
                    <Text style={styles.detailValue}>Sepolia Testnet</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gas Fee (Est.)</Text>
                    <Text style={styles.detailValue}>~0.002 ETH</Text>
                  </View>
                </View>

                {/* Blockchain Security Info */}
                <View style={styles.blockchainSecurityInfo}>
                  <Text style={styles.securityInfoIcon}>🔐</Text>
                  <Text style={styles.securityInfoText}>
                    {campaign?.campaignContractAddress 
                      ? 'This transaction will be recorded on the campaign\'s dedicated smart contract.'
                      : 'Your donation will be sent to the campaign wallet.'}
                  </Text>
                </View>

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setDonationStep('amount')}
                  >
                    <Text style={styles.cancelButtonText}>Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={confirmDonation}
                  >
                    <Text style={styles.confirmButtonText}>Confirm & Pay</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Processing Step - Waiting for user to confirm in wallet */}
            {donationStep === 'processing' && (
              <View style={styles.modalBody}>
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#14b8a6" />
                  <Text style={styles.processingTitle}>Waiting for Confirmation</Text>
                  <Text style={styles.processingText}>
                    Please confirm the transaction in your MetaMask wallet...
                  </Text>
                  <View style={styles.processingHint}>
                    <Text style={styles.processingHintText}>
                      💡 Check your MetaMask app for a transaction request
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Confirming Step - Transaction sent, waiting for blockchain */}
            {donationStep === 'confirming' && (
              <View style={styles.modalBody}>
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#f59e0b" />
                  <Text style={styles.processingTitle}>Confirming on Blockchain</Text>
                  <Text style={styles.processingText}>
                    Your transaction has been sent! Waiting for blockchain confirmation...
                  </Text>
                  {donationTxHash && (
                    <TouchableOpacity 
                      style={styles.viewTxButton}
                      onPress={() => openEtherscan(donationTxHash, 'tx')}
                    >
                      <Text style={styles.viewTxButtonText}>View Transaction ↗</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.confirmingInfo}>
                    <Text style={styles.confirmingInfoText}>
                      ⏳ This usually takes 15-30 seconds on Sepolia
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Error Step - Transaction failed */}
            {donationStep === 'error' && (
              <View style={styles.modalBody}>
                <View style={styles.errorStepContainer}>
                  <View style={styles.errorStepIcon}>
                    <Text style={styles.errorStepIconText}>✕</Text>
                  </View>
                  <Text style={styles.errorStepTitle}>Transaction Failed</Text>
                  <Text style={styles.errorStepMessage}>
                    {txError || 'The transaction was rejected or failed. Please try again.'}
                  </Text>
                  <View style={styles.errorButtonRow}>
                    <TouchableOpacity
                      style={styles.errorCancelButton}
                      onPress={closeDonationModal}
                    >
                      <Text style={styles.errorCancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.errorRetryButton}
                      onPress={() => {
                        resetTransaction();
                        setDonationStep('amount');
                      }}
                    >
                      <Text style={styles.errorRetryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Success Step */}
            {donationStep === 'success' && (
              <View style={styles.modalBody}>
                <View style={styles.successContainer}>
                  <View style={styles.successIcon}>
                    <Text style={styles.successIconText}>✓</Text>
                  </View>
                  <Text style={styles.successTitle}>Donation Successful!</Text>
                  <Text style={styles.successAmount}>Ξ {donationAmount} ETH</Text>
                  <Text style={styles.successMessage}>
                    Your donation to {campaign?.title} has been confirmed on the blockchain!
                  </Text>
                  {donationTxHash && (
                    <TouchableOpacity 
                      style={styles.viewTxSuccessButton}
                      onPress={() => openEtherscan(donationTxHash, 'tx')}
                    >
                      <Text style={styles.viewTxSuccessButtonText}>View on Etherscan ↗</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={closeDonationModal}
                  >
                    <Text style={styles.doneButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonAlt: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonAltText: {
    color: '#6b7280',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  imageGallery: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  imageWrapper: {
    flex: 1,
    height: 180,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  imageCountBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -25 }],
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  imageCountText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  imageCountLabel: {
    color: '#ffffff',
    fontSize: 12,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  playIcon: {
    fontSize: 18,
    color: '#1f2937',
    marginLeft: 4,
  },
  infoSection: {
    padding: 20,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14b8a6',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 34,
    marginBottom: 6,
  },
  daysLeft: {
    fontSize: 14,
    color: '#9ca3af',
  },
  avatarStack: {
    flexDirection: 'row',
    position: 'relative',
    width: 80,
    height: 40,
  },
  avatar: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  avatarCount: {
    backgroundColor: '#1f2937',
  },
  avatarCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0fdfa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statIcon: {
    fontSize: 20,
    color: '#14b8a6',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creatorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  creatorAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  creatorLabel: {
    fontSize: 14,
    color: '#9ca3af',
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  descriptionContainer: {
    marginTop: 4,
  },
  description: {
    fontSize: 15,
    color: '#6b7280',
    lineHeight: 24,
  },
  readMore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
    marginTop: 8,
  },
  // ============ BLOCKCHAIN INFO STYLES ============
  blockchainSection: {
    marginTop: 24,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  blockchainTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  blockchainStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  blockchainLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    minWidth: 100,
  },
  blockchainBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeSuccess: {
    backgroundColor: '#d1fae5',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeTextSuccess: {
    color: '#059669',
  },
  badgeTextPending: {
    color: '#d97706',
  },
  blockchainRow: {
    marginBottom: 12,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  addressBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#475569',
  },
  copyIcon: {
    fontSize: 14,
    marginLeft: 8,
  },
  etherscanButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  etherscanButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  networkInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  networkIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  networkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  factoryInfoBox: {
    marginTop: 12,
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  factoryInfoText: {
    fontSize: 12,
    color: '#047857',
    lineHeight: 18,
  },
  pendingInfoBox: {
    marginTop: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  pendingInfoText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  // ============ END BLOCKCHAIN INFO STYLES ============
  donateButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 34,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  donateButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  donateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  donateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletIndicator: {
    fontSize: 18,
  },
  // Donation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#9ca3af',
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  walletInfoBox: {
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  walletLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  walletBalanceText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14b8a6',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 16,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '600',
    color: '#14b8a6',
    paddingLeft: 16,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    padding: 16,
    paddingLeft: 8,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  quickAmountButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  quickAmountButtonActive: {
    backgroundColor: '#d1fae5',
    borderColor: '#14b8a6',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  quickAmountTextActive: {
    color: '#14b8a6',
  },
  continueButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  confirmBox: {
    backgroundColor: '#f0fdfa',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  confirmLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  confirmAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 8,
  },
  confirmTo: {
    fontSize: 14,
    color: '#6b7280',
  },
  transactionDetails: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  blockchainSecurityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  securityInfoIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  securityInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#0369a1',
    lineHeight: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    flex: 2,
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 20,
    marginBottom: 8,
  },
  processingText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconText: {
    fontSize: 40,
    color: '#10b981',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  successAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  doneButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  // View Transaction Button
  viewTxButton: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  viewTxButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#d97706',
  },
  // Confirming info box
  confirmingInfo: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    width: '100%',
  },
  confirmingInfoText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  // Error Step Styles
  errorStepContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  errorStepIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorStepIconText: {
    fontSize: 40,
    color: '#ef4444',
    fontWeight: '700',
  },
  errorStepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorStepMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  errorButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  errorCancelButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  errorCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  errorRetryButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  errorRetryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Success Transaction Button
  viewTxSuccessButton: {
    backgroundColor: '#d1fae5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  viewTxSuccessButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  // ============ ACCOUNTABILITY STYLES ============
  accountabilitySection: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  accountabilityButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accountabilityGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
  },
  accountabilityButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});

export default CampaignDetailsScreen;
