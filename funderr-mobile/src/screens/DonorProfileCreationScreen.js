/**
 * Mobile Donor Profile Creation Screen
 * Clean white UI matching funderr-mobile theme
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ApiService } from '../services/ApiService';

const DonorProfileCreationScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Get user email from AsyncStorage when component mounts
  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const userEmail = await AsyncStorage.getItem('userEmail');
        if (userEmail) {
          setEmail(userEmail);
        }
      } catch (error) {
        console.error('Error retrieving user email:', error);
      }
    };
    getUserEmail();
  }, []);

  const handleSubmit = async () => {
    // Clear previous messages
    setMessage('');
    setMessageType('');

    // Form validation
    if (!phone || !address) {
      setMessage('Please fill in all fields');
      setMessageType('error');
      return;
    }

    if (phone.length < 10) {
      setMessage('Please enter a valid phone number');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('Creating your profile...');
    setMessageType('info');

    try {
      // Get user email and ID from storage
      const userId = await AsyncStorage.getItem('userId');
      const userEmail = email || (await AsyncStorage.getItem('userEmail'));

      if (!userId || !userEmail) {
        setMessage('Session error. Please sign in again.');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      // Save profile to backend
      await ApiService.updateUserProfile({
        role: 'donor',
        phone,
        address,
        email: userEmail,
      });

      await AsyncStorage.setItem('profileComplete', 'true');
      await AsyncStorage.setItem('userRole', 'donor');

      setMessage('Your donor profile has been created successfully!');
      setMessageType('success');

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }, 2000);
    } catch (error) {
      console.error('Profile creation error:', error);
      setMessage('Failed to create your profile. Please try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#1f2937" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Donor Profile</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Logo Container */}
            <View style={styles.logoContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="heart" size={40} color="#ec4899" />
              </View>
              <Text style={styles.title}>Create Donor Profile</Text>
              <Text style={styles.subtitle}>
                Tell us about yourself to get started
              </Text>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {/* Email Display (Read-only) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <View style={[styles.inputWrapper, styles.inputDisabled]}>
                  <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
                  <Text style={styles.emailText}>{email || 'Loading...'}</Text>
                </View>
              </View>

              {/* Phone Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="call-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#9ca3af"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Address Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address *</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <Ionicons name="location-outline" size={20} color="#6b7280" style={styles.textAreaIcon} />
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Enter your address"
                    placeholderTextColor="#9ca3af"
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Message Display */}
              {message ? (
                <View
                  style={[
                    styles.messageContainer,
                    messageType === 'success' && styles.successMessage,
                    messageType === 'error' && styles.errorMessage,
                    messageType === 'info' && styles.infoMessage,
                  ]}
                >
                  <Ionicons
                    name={
                      messageType === 'success'
                        ? 'checkmark-circle'
                        : messageType === 'error'
                        ? 'alert-circle'
                        : 'information-circle'
                    }
                    size={20}
                    color={
                      messageType === 'success'
                        ? '#10b981'
                        : messageType === 'error'
                        ? '#ef4444'
                        : '#14b8a6'
                    }
                    style={styles.messageIcon}
                  />
                  <Text
                    style={[
                      styles.messageText,
                      messageType === 'success' && styles.successText,
                      messageType === 'error' && styles.errorText,
                      messageType === 'info' && styles.infoText,
                    ]}
                  >
                    {message}
                  </Text>
                </View>
              ) : null}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text style={styles.buttonText}>Creating Profile...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.buttonText}>Create Profile</Text>
                    <Ionicons name="arrow-forward" size={20} color="#ffffff" style={styles.buttonIcon} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Info Note */}
              <View style={styles.infoNote}>
                <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
                <Text style={styles.infoNoteText}>
                  As a donor, you'll be able to browse campaigns and make contributions to causes you care about.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSpacer: {
    width: 40,
  },
  // Logo Container
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fce7f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Form Container
  formContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  // Input Styles
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 14,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  textAreaIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  emailText: {
    flex: 1,
    fontSize: 16,
    color: '#6b7280',
    paddingVertical: 14,
  },
  // Message Styles
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  successMessage: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  infoMessage: {
    backgroundColor: '#e0f2f1',
    borderColor: '#14b8a6',
  },
  messageIcon: {
    marginRight: 10,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  successText: {
    color: '#065f46',
  },
  errorText: {
    color: '#991b1b',
  },
  infoText: {
    color: '#0f766e',
  },
  // Button Styles
  submitButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0.1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  // Info Note
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    padding: 14,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 10,
    lineHeight: 18,
  },
});

export default DonorProfileCreationScreen;
