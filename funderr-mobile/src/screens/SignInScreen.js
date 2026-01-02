/**
 * Mobile Sign In Screen - Redesigned
 * Clean white UI with social auth options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '../services/AuthService';
import { ApiService } from '../services/ApiService';
import { validateEmail, validatePassword } from '../utils/validation';

const SignInScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleEmailChange = (text) => {
    setEmail(text);
    if (emailError) {
      const result = validateEmail(text);
      setEmailError(result.error);
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (passwordError) {
      const result = validatePassword(text);
      setPasswordError(result.error);
    }
  };

  const handleSignIn = async () => {
    // Validate inputs
    const emailResult = validateEmail(email);
    const passwordResult = validatePassword(password);

    setEmailError(emailResult.error);
    setPasswordError(passwordResult.error);

    if (!emailResult.isValid || !passwordResult.isValid) {
      setMessage('Please check your email and password');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('Signing in...');
    setMessageType('info');

    try {
      const response = await AuthService.signIn(email, password);
      
      if (!response || !response.token) {
        throw new Error('Invalid credentials');
      }

      // Store user data
      await AsyncStorage.setItem('userToken', response.token);
      if (response.userId) {
        await AsyncStorage.setItem('userId', response.userId);
      }
      await AsyncStorage.setItem('userEmail', email);

      // Fetch user profile
      let userProfile = null;
      try {
        userProfile = await ApiService.getUserProfile();
        if (userProfile?.role) {
          await AsyncStorage.setItem('userRole', userProfile.role);
        }
      } catch (e) {
        console.log('Could not fetch profile:', e);
      }

      setMessage('Login successful!');
      setMessageType('success');
      setIsLoading(false);

      // Navigate based on role
      setTimeout(() => {
        if (userProfile?.role) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'RoleSelection' }],
          });
        }
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      
      if (error.message?.includes('Network')) {
        setMessage('Unable to connect. Check your internet connection.');
      } else if (error.message?.includes('Invalid') || error.message?.includes('password')) {
        setMessage('Invalid email or password');
      } else {
        setMessage('Sign in failed. Please try again.');
      }
      setMessageType('error');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logoText}>Funderr</Text>
              <TouchableOpacity style={styles.menuButton}>
                <View style={styles.menuIcon}>
                  <View style={styles.menuLine} />
                  <View style={styles.menuLine} />
                  <View style={styles.menuLine} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Sign In</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, emailError && styles.inputError]}
                  placeholder="Your Email"
                  placeholderTextColor="#b0b0b0"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                {emailError && <Text style={styles.errorText}>{emailError}</Text>}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[styles.input, passwordError && styles.inputError]}
                    placeholder="Enter Password"
                    placeholderTextColor="#b0b0b0"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!passwordVisible}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                  >
                    <Text style={styles.eyeIcon}>{passwordVisible ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
                {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              </View>

              {/* Message */}
              {message && (
                <View style={[
                  styles.messageContainer,
                  messageType === 'success' && styles.successMessage,
                  messageType === 'error' && styles.errorMessage,
                ]}>
                  <Text style={styles.messageText}>{message}</Text>
                </View>
              )}

              {/* Continue Button */}
              <TouchableOpacity
                style={[styles.continueButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.continueButtonText}>Continue</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Sign In Buttons */}
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => {
                  // Apple Sign In will be handled by your auth service
                  console.log('Apple Sign In');
                }}
              >
                <Text style={styles.appleIcon}>🍎</Text>
                <Text style={styles.socialButtonText}>Sign in with Apple</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => {
                  // Google Sign In will be handled by your auth service
                  console.log('Google Sign In');
                }}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.socialButtonTextGoogle}>Sign in with Google</Text>
              </TouchableOpacity>

              {/* Create Account Link */}
              <View style={styles.createAccountContainer}>
                <Text style={styles.newUserText}>New User? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                  <Text style={styles.createAccountText}>Create Account</Text>
                </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
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
  titleContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 15,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  passwordWrapper: {
    position: 'relative',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 25,
    marginBottom: 16,
    backgroundColor: '#e0f2fe',
  },
  successMessage: {
    backgroundColor: '#d1fae5',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
  },
  messageText: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: 13,
    color: '#9ca3af',
    marginHorizontal: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 25,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  appleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285f4',
    marginRight: 8,
  },
  socialButtonTextGoogle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4285f4',
  },
  createAccountContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  newUserText: {
    fontSize: 14,
    color: '#6b7280',
  },
  createAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
});

export default SignInScreen;