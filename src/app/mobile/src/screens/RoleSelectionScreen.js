/**
 * Mobile Role Selection Screen
 * Phone-friendly role selection after registration
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
import { LinearGradient } from 'expo-linear-gradient';
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
      // Update user profile with role
      await ApiService.updateUserProfile({ role: selectedRole });
      await AsyncStorage.setItem('userRole', selectedRole);

      // Navigate based on role
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Dashboard' }],
        });
      }, 500);
    } catch (error) {
      console.error('Error saving role:', error);
    }
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={['#14b8a6', '#2563eb']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>funderr</Text>
              <Text style={styles.tagline}>Empowering Change Together</Text>
            </View>

            {/* Header */}
            <View style={styles.header}>
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
              <LinearGradient
                colors={
                  !selectedRole || isLoading
                    ? ['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.2)']
                    : ['#ffffff', '#f8fafc']
                }
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#0f766e" />
                ) : (
                  <Text style={[
                    styles.buttonText,
                    (!selectedRole) && styles.buttonTextDisabled,
                  ]}>
                    Continue
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  cardsContainer: {
    marginBottom: 30,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  roleCardSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderColor: '#ffffff',
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(236, 72, 153, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardIconBlue: {
    backgroundColor: 'rgba(37, 99, 235, 0.3)',
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
    color: '#ffffff',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
  },
  checkmark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkmarkIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#14b8a6',
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    shadowOpacity: 0.1,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f766e',
  },
  buttonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
});

export default RoleSelectionScreen;
