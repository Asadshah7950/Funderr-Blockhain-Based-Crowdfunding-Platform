/**
 * Mobile Role Selection Screen - Redesigned
 * Clean white UI matching SignIn screen
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';

const RoleSelectionScreen = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    try {
      // If campaign creator, navigate to profile creation screen
      if (selectedRole === 'campaign_creator') {
        setIsLoading(false);
        navigation.navigate('CampaignProfileCreation');
        return;
      }

      // If donor, navigate to donor profile creation screen
      if (selectedRole === 'donor') {
        setIsLoading(false);
        navigation.navigate('DonorProfileCreation');
        return;
      }
    } catch (error) {
      console.error('Error saving role:', error);
    }
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logoText}>Help</Text>
            <TouchableOpacity style={styles.menuButton}>
              <View style={styles.menuIcon}>
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
                <View style={styles.menuLine} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Logo Container */}
          <View style={styles.logoContainer}>
            <Text style={styles.appLogoText}>funderr</Text>
            <Text style={styles.tagline}>Empowering Change Together</Text>
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Choose Your Path</Text>
            <Text style={styles.subtitle}>
              How would you like to make a difference?
            </Text>
          </View>

          {/* Role Cards */}
          <View style={styles.cardsContainer}>
            {/* Donor Card */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'donor' && styles.roleCardSelected,
              ]}
              onPress={() => setSelectedRole('donor')}
              activeOpacity={0.8}
            >
              <View style={styles.cardIcon}>
                <Text style={styles.cardEmoji}>💖</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Donor</Text>
                <Text style={styles.cardDescription}>
                  Support causes and make a meaningful impact with your contributions
                </Text>
              </View>
              {selectedRole === 'donor' && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkIcon}>✓</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Campaign Creator Card */}
            <TouchableOpacity
              style={[
                styles.roleCard,
                selectedRole === 'campaign_creator' && styles.roleCardSelected,
              ]}
              onPress={() => setSelectedRole('campaign_creator')}
              activeOpacity={0.8}
            >
              <View style={[styles.cardIcon, styles.cardIconBlue]}>
                <Text style={styles.cardEmoji}>🚀</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Campaign Creator</Text>
                <Text style={styles.cardDescription}>
                  Launch fundraising campaigns and bring your vision to life
                </Text>
              </View>
              {selectedRole === 'campaign_creator' && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkIcon}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!selectedRole || isLoading) && styles.buttonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!selectedRole || isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={[
                styles.buttonText,
                (!selectedRole) && styles.buttonTextDisabled,
              ]}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '400',
    color: '#14b8a6',
    fontStyle: 'italic',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    width: 24,
    height: 24,
    justifyContent: 'space-between',
  },
  menuLine: {
    width: 24,
    height: 2,
    backgroundColor: '#1f2937',
    marginVertical: 2,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appLogoText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#14b8a6',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  cardsContainer: {
    marginBottom: 30,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleCardSelected: {
    backgroundColor: '#e0f2f1',
    borderColor: '#14b8a6',
    borderWidth: 2.5,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fce7f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardIconBlue: {
    backgroundColor: '#dbeafe',
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkmarkIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  continueButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0.05,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonTextDisabled: {
    color: '#9ca3af',
  },
});

export default RoleSelectionScreen;