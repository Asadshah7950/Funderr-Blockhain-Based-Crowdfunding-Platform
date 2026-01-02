/**
 * Campaign Creation Screen for Funderr Mobile
 * Allows campaign creators to create new fundraising campaigns
 * Integrates with backend API and blockchain smart contract
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { ApiService } from '../services/ApiService';
import { useWallet } from '../context/WalletContext';

const { width, height } = Dimensions.get('window');

const CampaignCreationScreen = ({ navigation }) => {
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fundingGoal, setFundingGoal] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('30');
  const [image, setImage] = useState(null);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [restrictionReason, setRestrictionReason] = useState('');
  
  // Wallet context
  const { isConnected: walletConnected, walletAddress } = useWallet();

  // Refs for scroll control
  const scrollViewRef = useRef(null);
  const titleInputRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const goalInputRef = useRef(null);

  // Categories
  const categories = [
    { id: 'EDUCATION', label: 'Education', icon: '📚' },
    { id: 'HEALTH', label: 'Health', icon: '🏥' },
    { id: 'EMERGENCY', label: 'Emergency', icon: '🚨' },
    { id: 'WATER', label: 'Water', icon: '💧' },
    { id: 'FOOD', label: 'Food', icon: '🍽️' },
    { id: 'SPORTS', label: 'Sports', icon: '⚽' },
    { id: 'ARTS', label: 'Arts', icon: '🎨' },
    { id: 'ENVIRONMENT', label: 'Environment', icon: '🌱' },
  ];

  // Duration options
  const durationOptions = [
    { value: '7', label: '7 Days' },
    { value: '14', label: '14 Days' },
    { value: '30', label: '30 Days' },
    { value: '60', label: '60 Days' },
    { value: '90', label: '90 Days' },
  ];

  // Check user eligibility on mount
  useEffect(() => {
    checkUserEligibility();
  }, []);

  const checkUserEligibility = async () => {
    try {
      // First check if user is logged in
      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        // User not logged in, redirect to sign in
        Alert.alert(
          'Sign In Required',
          'Please sign in to create a campaign.',
          [
            { text: 'Cancel', onPress: () => navigation.goBack(), style: 'cancel' },
            { text: 'Sign In', onPress: () => navigation.navigate('SignIn') }
          ]
        );
        return;
      }

      const userProfile = await ApiService.getUserProfile();
      
      if (!userProfile) {
        // Could not fetch profile, but don't block - let them try to submit
        console.log('Could not fetch user profile for eligibility check');
        return;
      }
      
      if (userProfile.role !== 'campaign_creator') {
        setRestrictionReason('Only campaign creators can create campaigns. Please update your role in your profile.');
        setShowRestrictionModal(true);
        return;
      }

      if (userProfile.approvalStatus === 'pending') {
        setRestrictionReason('Your profile is awaiting admin approval. You cannot create campaigns until approved.');
        setShowRestrictionModal(true);
      } else if (userProfile.approvalStatus === 'rejected') {
        setRestrictionReason(`Your profile was rejected: ${userProfile.rejectionReason || 'No reason provided'}. Please contact support.`);
        setShowRestrictionModal(true);
      } else if (userProfile.status === 'restricted') {
        setRestrictionReason('Your account is currently restricted. Please contact the administrator.');
        setShowRestrictionModal(true);
      }
    } catch (error) {
      console.log('Error checking user eligibility:', error);
      
      // If it's a 401 error, token is invalid - redirect to sign in
      if (error.status === 401) {
        // Clear invalid token
        await AsyncStorage.multiRemove(['userToken', 'userId', 'userEmail', 'userName', 'userRole']);
        
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please sign in again.',
          [
            { text: 'Cancel', onPress: () => navigation.goBack(), style: 'cancel' },
            { text: 'Sign In', onPress: () => navigation.navigate('SignIn') }
          ]
        );
      }
      // For other errors, just log and let user proceed - validation will happen on submit
    }
  };

  // Pick image from gallery
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload campaign images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Validate form
  const validateForm = () => {
    // ============ WALLET REQUIRED ============
    // Campaign creator MUST connect wallet to receive donations
    if (!walletConnected || !walletAddress) {
      setMessage('⚠️ Please connect your MetaMask wallet first. Your wallet address will be used to receive donations.');
      setMessageType('error');
      return false;
    }

    if (!title.trim()) {
      setMessage('Please enter a campaign title');
      setMessageType('error');
      return false;
    }

    if (title.trim().length < 5) {
      setMessage('Campaign title must be at least 5 characters');
      setMessageType('error');
      return false;
    }

    if (!description.trim()) {
      setMessage('Please enter a campaign description');
      setMessageType('error');
      return false;
    }

    if (description.trim().length < 50) {
      setMessage('Description must be at least 50 characters');
      setMessageType('error');
      return false;
    }

    if (!fundingGoal || isNaN(parseFloat(fundingGoal)) || parseFloat(fundingGoal) <= 0) {
      setMessage('Please enter a valid funding goal amount');
      setMessageType('error');
      return false;
    }

    if (parseFloat(fundingGoal) < 0.01) {
      setMessage('Minimum funding goal is 0.01 ETH');
      setMessageType('error');
      return false;
    }

    if (!category) {
      setMessage('Please select a category');
      setMessageType('error');
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    setMessage('');
    setMessageType('');

    if (!validateForm()) {
      return;
    }

    try {
      setMessage('Creating your campaign...');
      setMessageType('info');
      setIsSubmitting(true);

      // Get user token
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setMessage('');
        setIsSubmitting(false);
        Alert.alert(
          'Sign In Required',
          'Please sign in to create a campaign.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => navigation.navigate('SignIn') }
          ]
        );
        return;
      }

      // Verify user is a campaign creator before submitting
      try {
        const userProfile = await ApiService.getUserProfile();
        const userRole = userProfile?.role || await AsyncStorage.getItem('userRole');
        
        if (userRole === 'donor') {
          setMessage('');
          setIsSubmitting(false);
          setRestrictionReason('Donors cannot create campaigns. Only campaign creators can create fundraising campaigns. Please update your role if you wish to create campaigns.');
          setShowRestrictionModal(true);
          return;
        }
        
        if (userRole !== 'campaign_creator') {
          setMessage('');
          setIsSubmitting(false);
          setRestrictionReason('Only campaign creators can create campaigns. Please update your role in your profile.');
          setShowRestrictionModal(true);
          return;
        }

        if (userProfile?.approvalStatus === 'pending') {
          setMessage('');
          setIsSubmitting(false);
          setRestrictionReason('Your profile is awaiting admin approval. You cannot create campaigns until approved.');
          setShowRestrictionModal(true);
          return;
        }

        if (userProfile?.approvalStatus === 'rejected') {
          setMessage('');
          setIsSubmitting(false);
          setRestrictionReason(`Your profile was rejected: ${userProfile.rejectionReason || 'No reason provided'}. Please contact support.`);
          setShowRestrictionModal(true);
          return;
        }
      } catch (profileError) {
        console.log('Could not verify user role:', profileError);
        // Continue with submission - backend will validate
      }

      // ============ WALLET REQUIRED CHECK ============
      // Double-check wallet is connected (required for blockchain registration)
      if (!walletConnected || !walletAddress) {
        setMessage('');
        setIsSubmitting(false);
        Alert.alert(
          '🦊 Wallet Required',
          'Please connect your MetaMask wallet before creating a campaign. Your wallet address will be registered on the blockchain to receive donations.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Prepare campaign data with REQUIRED wallet address
      const campaignData = {
        title: title.trim(),
        description: description.trim(),
        goal: parseFloat(fundingGoal),
        category: category,
        duration: parseInt(duration),
        walletAddress: walletAddress, // REQUIRED - will be registered on blockchain
      };

      // Create campaign via API
      const result = await ApiService.createCampaign(campaignData);

      if (result) {
        setMessage('');
        setShowSuccessModal(true);
      }
    } catch (error) {
      console.error('Campaign submission error:', error);

      if (error.status === 403 || error.message?.includes('restricted')) {
        setMessage('');
        setRestrictionReason('Your account is currently restricted and you cannot create campaigns.');
        setShowRestrictionModal(true);
      } else if (error.status === 401) {
        Alert.alert('Session Expired', 'Please sign in again.', [
          { text: 'OK', onPress: () => navigation.navigate('SignIn') }
        ]);
      } else if (error.message?.includes('donor') || error.message?.includes('role')) {
        setMessage('');
        setRestrictionReason('Only campaign creators can create campaigns. Donors are not allowed to create fundraising campaigns.');
        setShowRestrictionModal(true);
      } else {
        setMessage(error.message || 'Failed to create campaign. Please try again.');
        setMessageType('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle success modal close
  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    // Reset form
    setTitle('');
    setDescription('');
    setFundingGoal('');
    setCategory('');
    setDuration('30');
    setImage(null);
    // Navigate to dashboard or campaigns
    navigation.navigate('Dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#14b8a6" />
      
      {/* Header */}
      <LinearGradient
        colors={['#14b8a6', '#0d9488']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Campaign</Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Campaign Image */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campaign Image</Text>
            <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImage}>
              {image ? (
                <Image source={{ uri: image }} style={styles.selectedImage} />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Text style={styles.imagePlaceholderIcon}>📷</Text>
                  <Text style={styles.imagePlaceholderText}>Tap to add campaign image</Text>
                  <Text style={styles.imagePlaceholderHint}>Recommended: 16:9 ratio</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Title Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campaign Title *</Text>
            <View style={styles.inputContainer}>
              <TextInput
                ref={titleInputRef}
                style={styles.input}
                placeholder="Enter a compelling campaign title"
                placeholderTextColor="#9ca3af"
                value={title}
                onChangeText={setTitle}
                maxLength={100}
                returnKeyType="next"
                onSubmitEditing={() => descriptionInputRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            <Text style={styles.inputHint}>{title.length}/100 characters</Text>
          </View>

          {/* Description Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description *</Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                ref={descriptionInputRef}
                style={[styles.input, styles.textArea]}
                placeholder="Tell people why you're raising funds and how it will make a difference..."
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={2000}
              />
            </View>
            <Text style={styles.inputHint}>{description.length}/2000 characters (minimum 50)</Text>
          </View>

          {/* Funding Goal Input */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Funding Goal (ETH) *</Text>
            <View style={styles.currencyInputContainer}>
              <View style={styles.currencyLabel}>
                <Text style={styles.currencyText}>Ξ</Text>
              </View>
              <TextInput
                ref={goalInputRef}
                style={styles.currencyInput}
                placeholder="1.5"
                placeholderTextColor="#9ca3af"
                value={fundingGoal}
                onChangeText={setFundingGoal}
                keyboardType="decimal-pad"
              />
              <Text style={styles.currencySuffix}>ETH</Text>
            </View>
            <Text style={styles.inputHint}>Set a realistic target amount in Ethereum</Text>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Category *</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    category === cat.id && styles.categoryButtonSelected
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setCategory(cat.id);
                  }}
                >
                  <Text style={styles.categoryIcon}>{cat.icon}</Text>
                  <Text style={[
                    styles.categoryText,
                    category === cat.id && styles.categoryTextSelected
                  ]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Duration Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campaign Duration</Text>
            <View style={styles.durationContainer}>
              {durationOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.durationButton,
                    duration === option.value && styles.durationButtonSelected
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    setDuration(option.value);
                  }}
                >
                  <Text style={[
                    styles.durationText,
                    duration === option.value && styles.durationTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Wallet Connection Status - REQUIRED */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Wallet Connection *</Text>
            <Text style={styles.walletRequiredNote}>
              ⚠️ Required: Your wallet address will be registered on the blockchain as the campaign owner
            </Text>
            <View style={[
              styles.walletStatusCard,
              walletConnected ? styles.walletConnectedCard : styles.walletDisconnectedCard
            ]}>
              <Text style={styles.walletStatusIcon}>
                {walletConnected ? '🦊' : '❌'}
              </Text>
              <View style={styles.walletStatusContent}>
                <Text style={[
                  styles.walletStatusTitle,
                  walletConnected ? styles.walletConnectedText : styles.walletDisconnectedText
                ]}>
                  {walletConnected ? '✓ Wallet Connected' : 'Wallet Not Connected'}
                </Text>
                <Text style={styles.walletStatusDescription}>
                  {walletConnected 
                    ? `Your wallet: ${walletAddress?.substring(0, 6)}...${walletAddress?.substring(walletAddress.length - 4)}\nThis address will receive donations.`
                    : 'You must connect your MetaMask wallet to create a campaign. Go to Profile → Connect Wallet.'}
                </Text>
              </View>
            </View>
            {!walletConnected && (
              <TouchableOpacity 
                style={styles.connectWalletButton}
                onPress={() => navigation.navigate('Profile')}
              >
                <Text style={styles.connectWalletButtonText}>🦊 Go to Profile to Connect Wallet</Text>
              </TouchableOpacity>
            )}
            {walletConnected && (
              <View style={styles.walletBenefitsBox}>
                <Text style={styles.walletBenefitsTitle}>✓ Your wallet will:</Text>
                <Text style={styles.walletBenefitItem}>• Be registered as campaign owner on blockchain</Text>
                <Text style={styles.walletBenefitItem}>• Receive all donations directly</Text>
                <Text style={styles.walletBenefitItem}>• Be able to withdraw funds when goal is reached</Text>
              </View>
            )}
          </View>

          {/* Message Display */}
          {message ? (
            <View style={[
              styles.messageContainer,
              messageType === 'success' && styles.successMessage,
              messageType === 'error' && styles.errorMessage,
              messageType === 'info' && styles.infoMessage,
            ]}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={() => {
              Keyboard.dismiss();
              handleSubmit();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <View style={styles.submitButtonContent}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={styles.submitButtonText}>  Creating Campaign...</Text>
              </View>
            ) : (
              <View style={styles.submitButtonContent}>
                <Text style={styles.submitButtonIcon}>🚀</Text>
                <Text style={styles.submitButtonText}>Launch Campaign</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Note */}
          <Text style={styles.noteText}>
            ℹ️ Your campaign will be reviewed and published within 24 hours
          </Text>

          {/* ============ BLOCKCHAIN INFO SECTION ============ */}
          <View style={styles.blockchainInfoSection}>
            <Text style={styles.blockchainInfoTitle}>⛓️ Blockchain Registration</Text>
            <View style={styles.blockchainInfoBox}>
              <Text style={styles.blockchainInfoIcon}>🏭</Text>
              <View style={styles.blockchainInfoContent}>
                <Text style={styles.blockchainInfoHeading}>Factory Pattern Smart Contract</Text>
                <Text style={styles.blockchainInfoText}>
                  Once your campaign is approved by admin, it will be automatically registered on the blockchain with its own dedicated smart contract address.
                </Text>
              </View>
            </View>
            
            <View style={styles.blockchainFeatureList}>
              <View style={styles.blockchainFeatureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.featureText}>Individual smart contract per campaign</Text>
              </View>
              <View style={styles.blockchainFeatureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.featureText}>Full donation transparency on Etherscan</Text>
              </View>
              <View style={styles.blockchainFeatureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.featureText}>Self-donation prevention built-in</Text>
              </View>
              <View style={styles.blockchainFeatureItem}>
                <Text style={styles.featureIcon}>✓</Text>
                <Text style={styles.featureText}>Secure fund management</Text>
              </View>
            </View>

            <View style={styles.networkInfoBadge}>
              <Text style={styles.networkInfoIcon}>🔷</Text>
              <Text style={styles.networkInfoText}>Sepolia Testnet (Ethereum)</Text>
            </View>
          </View>
          {/* ============ END BLOCKCHAIN INFO SECTION ============ */}

          {/* Extra padding for keyboard */}
          <View style={{ height: 150 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Restriction Modal */}
      <Modal
        visible={showRestrictionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRestrictionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>🚫</Text>
            </View>
            <Text style={styles.modalTitle}>Cannot Create Campaign</Text>
            <Text style={styles.modalMessage}>{restrictionReason}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setShowRestrictionModal(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.modalButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleSuccessClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconContainer, styles.successIconContainer]}>
              <Text style={styles.modalIcon}>🎉</Text>
            </View>
            <Text style={styles.modalTitle}>Campaign Created!</Text>
            <Text style={styles.modalMessage}>
              Your campaign has been submitted for review. Once approved, it will be registered on the blockchain with your wallet address ({walletAddress?.substring(0, 6)}...{walletAddress?.substring(walletAddress?.length - 4)}) as the campaign owner.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, styles.successModalButton]}
              onPress={handleSuccessClose}
            >
              <Text style={styles.modalButtonText}>View Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10,
  },
  imagePickerContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  imagePlaceholderText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  imagePlaceholderHint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  textAreaContainer: {
    height: 150,
  },
  textArea: {
    flex: 1,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  inputHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
    marginLeft: 4,
  },
  currencyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  currencyLabel: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#14b8a6',
    borderTopLeftRadius: 11,
    borderBottomLeftRadius: 11,
  },
  currencyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  currencyInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  currencySuffix: {
    fontSize: 14,
    color: '#6b7280',
    paddingRight: 16,
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryButton: {
    width: (width - 48) / 4,
    margin: 4,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  categoryButtonSelected: {
    backgroundColor: '#d1fae5',
    borderColor: '#14b8a6',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  categoryTextSelected: {
    color: '#14b8a6',
    fontWeight: '600',
  },
  durationContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  durationButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    margin: 4,
  },
  durationButtonSelected: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  durationText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  durationTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  walletStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  walletConnectedCard: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  walletDisconnectedCard: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  walletStatusIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  walletStatusContent: {
    flex: 1,
  },
  walletStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  walletConnectedText: {
    color: '#10b981',
  },
  walletDisconnectedText: {
    color: '#f59e0b',
  },
  walletStatusDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  walletRequiredNote: {
    fontSize: 12,
    color: '#dc2626',
    marginBottom: 12,
    fontWeight: '500',
  },
  connectWalletButton: {
    marginTop: 12,
    backgroundColor: '#f97316',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  connectWalletButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  walletBenefitsBox: {
    marginTop: 12,
    backgroundColor: '#ecfdf5',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  walletBenefitsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 6,
  },
  walletBenefitItem: {
    fontSize: 12,
    color: '#065f46',
    marginBottom: 2,
    paddingLeft: 4,
  },
  messageContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  successMessage: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  infoMessage: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0ea5e9',
  },
  messageText: {
    fontSize: 14,
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0.1,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  noteText: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconContainer: {
    backgroundColor: '#d1fae5',
  },
  modalIcon: {
    fontSize: 40,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  successModalButton: {
    backgroundColor: '#14b8a6',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // ============ BLOCKCHAIN INFO STYLES ============
  blockchainInfoSection: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  blockchainInfoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  blockchainInfoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0fdfa',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  blockchainInfoIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  blockchainInfoContent: {
    flex: 1,
  },
  blockchainInfoHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0d9488',
    marginBottom: 4,
  },
  blockchainInfoText: {
    fontSize: 13,
    color: '#5b6b68',
    lineHeight: 18,
  },
  blockchainFeatureList: {
    marginBottom: 16,
  },
  blockchainFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '700',
    marginRight: 10,
    width: 20,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 13,
    color: '#4b5563',
    flex: 1,
  },
  networkInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  networkInfoIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  networkInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
  },
  // ============ END BLOCKCHAIN INFO STYLES ============
});

export default CampaignCreationScreen;
