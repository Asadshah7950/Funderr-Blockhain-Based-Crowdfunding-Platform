import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Modal,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';
import { createFund, getContractWithSigner } from '../blockchain/contract';
import { ethers } from 'ethers';

const { width, height } = Dimensions.get('window');

const CampaignCreationScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fundingGoal, setFundingGoal] = useState('');
  const [duration, setDuration] = useState('30');
  const [category, setCategory] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [campaignImage, setCampaignImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [focusedInput, setFocusedInput] = useState('');
  const [showRestrictionModal, setShowRestrictionModal] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const categories = [
    'Technology',
    'Social Impact', 
    'Environment',
    'Education',
    'Healthcare',
    'Energy',
    'Arts',
    'Sports',
    'Emergency',
    'Food',
    'Water'
  ];

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // Load wallet address from storage
  useEffect(() => {
    const loadWalletAddress = async () => {
      try {
        const savedWallet = await AsyncStorage.getItem('walletAddress');
        if (savedWallet) {
          setWalletAddress(savedWallet);
        }
      } catch (error) {
        console.log('Error loading wallet:', error);
      }
    };
    loadWalletAddress();
  }, []);

  // Handle image picker
  const pickImage = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            const uri = URL.createObjectURL(file);
            setCampaignImage({
              uri: uri,
              type: file.type || 'image/jpeg',
              name: file.name || 'campaign-image.jpg',
              file: file,
            });
          }
        };
        
        input.click();
        return;
      }
      
      const { launchImageLibraryAsync, MediaTypeOptions } = require('expo-image-picker');
      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setCampaignImage({
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'campaign-image.jpg',
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleSubmit = async () => {
    // Clear previous messages
    setMessage('');
    setMessageType('');

    try {
      // Check user approval status first
      const userProfile = await ApiService.getUserProfile();
      
      if (userProfile.role === 'campaign_creator' && userProfile.approvalStatus !== 'approved') {
        if (userProfile.approvalStatus === 'pending') {
          setMessage('Your profile is awaiting admin approval. You cannot create campaigns until approved.');
          setMessageType('error');
          return;
        } else if (userProfile.approvalStatus === 'rejected') {
          setMessage(`Your profile was rejected: ${userProfile.rejectionReason || 'No reason provided'}. Please contact support.`);
          setMessageType('error');
          return;
        }
      }

      // Validate input fields
      if (!title.trim()) {
        setMessage('Please enter a campaign title');
        setMessageType('error');
        return;
      }

      if (!description.trim()) {
        setMessage('Please enter a campaign description');
        setMessageType('error');
        return;
      }

      if (!fundingGoal || isNaN(parseFloat(fundingGoal)) || parseFloat(fundingGoal) <= 0) {
        setMessage('Please enter a valid funding goal amount');
        setMessageType('error');
        return;
      }

      if (!category.trim()) {
        setMessage('Please select a category');
        setMessageType('error');
        return;
      }

      setMessage('Creating your campaign...');
      setMessageType('info');
      setIsSubmitting(true);

      const campaignData = {
        title,
        description,
        goal: parseFloat(fundingGoal),
        category: category.toUpperCase(),
      };
      
      // Create campaign in backend first
      const backendResult = await ApiService.createCampaign(campaignData);
      
      // Try to deploy to blockchain (web only)
      let blockchainTxHash = null;
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          
          // Deploy smart contract with 30 days duration
          const tx = await createFund(signer, title, fundingGoal, 30);
          blockchainTxHash = tx?.transactionHash || 'pending';
          console.log('Blockchain campaign created:', blockchainTxHash);
          
          // Update backend with blockchain tx hash if available
          if (blockchainTxHash && backendResult._id) {
            try {
              await ApiService.updateCampaign(backendResult._id, { blockchainTxHash });
            } catch (updateErr) {
              console.warn('Failed to update campaign with blockchain hash:', updateErr);
            }
          }
        } catch (blockchainErr) {
          console.warn('Blockchain deployment failed, campaign created on backend only:', blockchainErr);
          // Don't fail the campaign creation if blockchain fails
        }
      }
      
      setMessage('Your campaign has been submitted for review and will be published within 24 hours.');
      setMessageType('success');
      setTimeout(() => {
        navigation.navigate('UserInterface', { refreshCampaigns: true });
      }, 2000);
    } catch (error) {
      console.error('Campaign submission error:', error);
      
      // Check if user is restricted
      if (error.response && error.response.data && error.response.data.code === 'USER_RESTRICTED') {
        setMessage(''); // Clear the loading message
        setMessageType('');
        setShowRestrictionModal(true);
      } else {
        setMessage('There was an error creating your campaign. Please try again.');
        setMessageType('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Main Card */}
            <Animatable.View
              animation="fadeInUp"
              duration={800}
              style={styles.mainCard}
            >
              {/* Header Section */}
              <View style={styles.headerSection}>
                <View style={styles.badgeContainer}>
                  <LinearGradient
                    colors={['#14b8a6', '#0d9488']}
                    style={styles.badge}
                  >
                    <Ionicons name="rocket" size={14} color="white" />
                    <Text style={styles.badgeText}>New Campaign</Text>
                  </LinearGradient>
                </View>
                
                <Text style={styles.headerTitle}>Create Your Campaign</Text>
                <Text style={styles.headerSubtitle}>
                  Fill in the details below to launch your fundraising campaign
                </Text>
              </View>

              {/* Form Section */}
              <View style={styles.formSection}>
                {/* Campaign Title */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Campaign Title *</Text>
                  <View style={[
                    styles.inputContainer,
                    focusedInput === 'title' && styles.inputContainerFocused
                  ]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter a compelling title for your campaign"
                      value={title}
                      onChangeText={setTitle}
                      onFocus={() => setFocusedInput('title')}
                      onBlur={() => setFocusedInput('')}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                {/* Category Selection */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Category *</Text>
                  <View style={styles.categoryContainer}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryPill,
                          category === cat && styles.categoryPillSelected
                        ]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text style={[
                          styles.categoryPillText,
                          category === cat && styles.categoryPillTextSelected
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description *</Text>
                  <View style={[
                    styles.textAreaContainer,
                    focusedInput === 'description' && styles.inputContainerFocused
                  ]}>
                    <TextInput
                      style={styles.textArea}
                      placeholder="Describe your campaign, its goals, and how the funds will be used..."
                      value={description}
                      onChangeText={setDescription}
                      onFocus={() => setFocusedInput('description')}
                      onBlur={() => setFocusedInput('')}
                      multiline
                      numberOfLines={5}
                      textAlignVertical="top"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                {/* Two Column Row: Funding Goal & Duration */}
                <View style={styles.twoColumnRow}>
                  {/* Funding Goal */}
                  <View style={styles.halfColumn}>
                    <Text style={styles.inputLabel}>Funding Goal *</Text>
                    <View style={[
                      styles.iconInputContainer,
                      focusedInput === 'goal' && styles.inputContainerFocused
                    ]}>
                      <View style={styles.inputIconLeft}>
                        <Text style={styles.ethIcon}>Ξ</Text>
                      </View>
                      <TextInput
                        style={styles.iconInput}
                        placeholder="0.00"
                        value={fundingGoal}
                        onChangeText={setFundingGoal}
                        onFocus={() => setFocusedInput('goal')}
                        onBlur={() => setFocusedInput('')}
                        keyboardType="numeric"
                        placeholderTextColor="#9ca3af"
                      />
                      <View style={styles.inputSuffix}>
                        <Text style={styles.suffixText}>ETH</Text>
                      </View>
                    </View>
                  </View>

                  {/* Duration */}
                  <View style={styles.halfColumn}>
                    <Text style={styles.inputLabel}>Duration (Days)</Text>
                    <View style={[
                      styles.iconInputContainer,
                      focusedInput === 'duration' && styles.inputContainerFocused
                    ]}>
                      <View style={styles.inputIconLeft}>
                        <Ionicons name="calendar-outline" size={18} color="#6b7280" />
                      </View>
                      <TextInput
                        style={styles.iconInput}
                        placeholder="30"
                        value={duration}
                        onChangeText={setDuration}
                        onFocus={() => setFocusedInput('duration')}
                        onBlur={() => setFocusedInput('')}
                        keyboardType="numeric"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>
                </View>

                {/* Campaign Image */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Campaign Image</Text>
                  <TouchableOpacity
                    style={styles.imageUploadContainer}
                    onPress={pickImage}
                  >
                    {campaignImage ? (
                      <View style={styles.imagePreviewContainer}>
                        <Image 
                          source={{ uri: campaignImage.uri }} 
                          style={styles.imagePreview}
                          resizeMode="cover"
                        />
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => setCampaignImage(null)}
                        >
                          <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.uploadPlaceholder}>
                        <View style={styles.uploadIconContainer}>
                          <Ionicons name="cloud-upload-outline" size={32} color="#9ca3af" />
                        </View>
                        <Text style={styles.uploadText}>Click to upload campaign image</Text>
                        <Text style={styles.uploadHint}>PNG, JPG up to 10MB</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Wallet Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Wallet Address</Text>
                  <View style={[
                    styles.iconInputContainer,
                    focusedInput === 'wallet' && styles.inputContainerFocused
                  ]}>
                    <View style={styles.inputIconLeft}>
                      <Ionicons name="wallet-outline" size={18} color="#6b7280" />
                    </View>
                    <TextInput
                      style={styles.iconInput}
                      placeholder="0x..."
                      value={walletAddress}
                      onChangeText={setWalletAddress}
                      onFocus={() => setFocusedInput('wallet')}
                      onBlur={() => setFocusedInput('')}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <Text style={styles.inputHint}>
                    Your connected wallet will receive the funds
                  </Text>
                </View>

                {/* Message Display */}
                {message ? (
                  <Animatable.View 
                    style={[
                      styles.messageContainer, 
                      messageType === 'success' ? styles.successMessage : 
                      messageType === 'error' ? styles.errorMessage : 
                      styles.infoMessage
                    ]}
                    animation="fadeInUp"
                    duration={400}
                  >
                    <Ionicons 
                      name={
                        messageType === 'success' ? 'checkmark-circle' : 
                        messageType === 'error' ? 'alert-circle' : 
                        'information-circle'
                      } 
                      size={20} 
                      color={
                        messageType === 'success' ? '#059669' : 
                        messageType === 'error' ? '#dc2626' : 
                        '#0284c7'
                      } 
                    />
                    <Text style={[
                      styles.messageText,
                      messageType === 'success' ? styles.successText :
                      messageType === 'error' ? styles.errorText :
                      styles.infoText
                    ]}>
                      {message}
                    </Text>
                  </Animatable.View>
                ) : null}

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, isSubmitting && styles.disabledButton]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  <LinearGradient
                    colors={isSubmitting ? ['#9ca3af', '#6b7280'] : ['#14b8a6', '#0d9488']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButtonGradient}
                  >
                    {isSubmitting ? (
                      <View style={styles.submitButtonContent}>
                        <ActivityIndicator size="small" color="#fff" />
                        <Text style={styles.submitButtonText}>Creating Campaign...</Text>
                      </View>
                    ) : (
                      <View style={styles.submitButtonContent}>
                        <Ionicons name="rocket-outline" size={20} color="#fff" />
                        <Text style={styles.submitButtonText}>Create Campaign</Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Back Button */}
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={18} color="#6b7280" />
                  <Text style={styles.backButtonText}>Back to Dashboard</Text>
                </TouchableOpacity>
              </View>
            </Animatable.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* Restriction Modal */}
      <Modal
        visible={showRestrictionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRestrictionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalIconContainer}>
                <MaterialIcons name="block" size={40} color="#ef4444" />
              </View>
              
              <Text style={styles.modalTitle}>Account Restricted</Text>
              
              <Text style={styles.modalMessage}>
                Your account is currently restricted and you cannot create campaigns at this time.
              </Text>
              
              <Text style={styles.modalSubMessage}>
                Please contact the administrator for assistance or more information about your account status.
              </Text>
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowRestrictionModal(false)}
              >
                <Text style={styles.modalButtonText}>Understood</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  mainCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 600,
    ...(Platform.OS === 'web' && { width: '70%', minWidth: 400 }),
  },
  headerSection: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  badgeContainer: {
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  formSection: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
  },
  inputContainerFocused: {
    borderColor: '#14b8a6',
    borderWidth: 2,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
  },
  textAreaContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    minHeight: 120,
  },
  textArea: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  dropdownContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownContainerFocused: {
    borderColor: '#14b8a6',
    borderWidth: 2,
  },
  dropdownText: {
    fontSize: 15,
    color: '#111827',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#9ca3af',
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemSelected: {
    backgroundColor: '#f0fdfa',
  },
  dropdownItemText: {
    fontSize: 15,
    color: '#374151',
  },
  dropdownItemTextSelected: {
    color: '#14b8a6',
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryPillSelected: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  categoryPillText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: '500',
  },
  categoryPillTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  twoColumnRow: {
    flexDirection: 'row',
    marginHorizontal: -8,
    marginBottom: 20,
  },
  halfColumn: {
    flex: 1,
    paddingHorizontal: 8,
  },
  iconInputContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIconLeft: {
    paddingLeft: 14,
    paddingRight: 8,
  },
  ethIcon: {
    fontSize: 18,
    color: '#6b7280',
    fontWeight: '600',
  },
  iconInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    fontSize: 15,
    color: '#111827',
  },
  inputSuffix: {
    paddingRight: 14,
    paddingLeft: 8,
  },
  suffixText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  imageUploadContainer: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadPlaceholder: {
    padding: 32,
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: '#9ca3af',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  successMessage: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  infoMessage: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 10,
    lineHeight: 20,
  },
  successText: {
    color: '#059669',
  },
  errorText: {
    color: '#dc2626',
  },
  infoText: {
    color: '#0284c7',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 25,
    elevation: 10,
  },
  modalIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  modalSubMessage: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CampaignCreationScreen;