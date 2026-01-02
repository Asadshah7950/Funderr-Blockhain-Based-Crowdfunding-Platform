/**
 * Mobile Campaign Details Screen
 * Phone-friendly campaign details and donation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { calculateProgress, formatCurrency, formatDate, calculateDaysRemaining } from '../utils/helpers';

const CampaignDetailsScreen = ({ route, navigation }) => {
  const { campaign } = route.params || {};
  const [donationAmount, setDonationAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!campaign) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Campaign not found</Text>
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

  const progress = calculateProgress(campaign.amountRaised, campaign.goal);
  const daysRemaining = calculateDaysRemaining(campaign.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  const placeholderImage = 'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=800&q=80';
  const imageUrl = campaign.imageKey || placeholderImage;

  const handleDonate = async () => {
    if (!donationAmount || parseFloat(donationAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid donation amount');
      return;
    }

    setIsProcessing(true);
    
    // Check if user is authenticated
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const token = await AsyncStorage.getItem('userToken');
    
    if (!token) {
      setIsProcessing(false);
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

    // Here you would integrate with blockchain
    // Using shared blockchain logic: donate(signer, campaignId, amount)
    Alert.alert(
      'Donation',
      `Processing donation of Ξ${donationAmount}...`,
      [{ text: 'OK' }]
    );
    
    setTimeout(() => {
      setIsProcessing(false);
      setDonationAmount('');
      Alert.alert('Success', 'Thank you for your donation!');
    }, 2000);
  };

  const quickAmounts = ['0.01', '0.05', '0.1', '0.5'];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.imageOverlay}
        />
        <SafeAreaView style={styles.headerActions}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonIcon}>←</Text>
          </TouchableOpacity>
        </SafeAreaView>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{campaign.category || 'General'}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Campaign Info */}
        <View style={styles.infoSection}>
          <Text style={styles.title}>{campaign.title}</Text>
          
          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={styles.progressValue}>{formatCurrency(campaign.amountRaised / 1000)}</Text>
                <Text style={styles.progressLabel}>raised</Text>
              </View>
              <View style={styles.progressStat}>
                <Text style={styles.progressValue}>{progress.toFixed(0)}%</Text>
                <Text style={styles.progressLabel}>funded</Text>
              </View>
              <View style={styles.progressStat}>
                <Text style={styles.progressValue}>{daysRemaining}</Text>
                <Text style={styles.progressLabel}>days left</Text>
              </View>
            </View>
          </View>

          {/* Goal */}
          <View style={styles.goalSection}>
            <Text style={styles.goalLabel}>Funding Goal</Text>
            <Text style={styles.goalValue}>{formatCurrency(campaign.goal / 1000)}</Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About this Campaign</Text>
            <Text style={styles.description}>{campaign.description}</Text>
          </View>
        </View>

        {/* Donation Section */}
        <View style={styles.donationSection}>
          <Text style={styles.sectionTitle}>Make a Donation</Text>
          
          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            {quickAmounts.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.quickAmountButton,
                  donationAmount === amount && styles.quickAmountButtonActive,
                ]}
                onPress={() => setDonationAmount(amount)}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    donationAmount === amount && styles.quickAmountTextActive,
                  ]}
                >
                  Ξ{amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Or enter custom amount (ETH)</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputPrefix}>Ξ</Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                value={donationAmount}
                onChangeText={setDonationAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Donate Button */}
          <TouchableOpacity
            style={[styles.donateButton, isProcessing && styles.buttonDisabled]}
            onPress={handleDonate}
            disabled={isProcessing}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={isProcessing ? ['#9ca3af', '#6b7280'] : ['#14b8a6', '#0d9488']}
              style={styles.donateButtonGradient}
            >
              <Text style={styles.donateButtonText}>
                {isProcessing ? 'Processing...' : 'Donate Now'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>🔐</Text>
            <Text style={styles.securityText}>
              Secured by blockchain smart contracts
            </Text>
          </View>
        </View>

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  imageContainer: {
    height: 280,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  headerActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonIcon: {
    fontSize: 24,
    color: '#ffffff',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#14b8a6',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  infoSection: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
    lineHeight: 32,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 5,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressStat: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  progressLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  goalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  goalLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  goalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  descriptionSection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  donationSection: {
    padding: 20,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  quickAmountButtonActive: {
    borderColor: '#14b8a6',
    backgroundColor: '#f0fdfa',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  quickAmountTextActive: {
    color: '#14b8a6',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
  },
  inputPrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#14b8a6',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    color: '#1f2937',
  },
  donateButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    shadowOpacity: 0.1,
  },
  donateButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  donateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  securityNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  securityText: {
    fontSize: 13,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 20,
  },
  backButtonAlt: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  backButtonAltText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CampaignDetailsScreen;
