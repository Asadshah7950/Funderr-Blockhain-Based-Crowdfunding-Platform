/**
 * Mobile Sign In Screen
 * Phone-friendly authentication screen
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
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';
import { ApiService } from '../services/ApiService';
import { validateEmail, validatePassword } from '../utils/validation';

const { width } = Dimensions.get('window');

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
            routes: [{ name: 'Main', params: { screen: 'Dashboard' } }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main', params: { screen: 'RoleSelection' } }],
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

  // Social sign in handlers (placeholder - integrate with your auth service)
  const handleAppleSignIn = async () => {
    // TODO: Implement Apple Sign In with your AuthService
    setMessage('Apple Sign In coming soon');
    setMessageType('info');
  };

  const handleGoogleSignIn = async () => {
    // TODO: Implement Google Sign In with your AuthService
    setMessage('Google Sign In coming soon');
    setMessageType('info');
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
              <Text style={styles.logoText}>Help</Text>
              <TouchableOpacity 
                style={styles.menuButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="menu" size={24} color="#1f2937" />
              </TouchableOpacity>
            </View>

            {/* Title */}
            <Text style={styles.title}>Sign In</Text>

            {/* Form */}
            <View style={styles.form}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, emailError && styles.inputError]}
                  placeholder="Your Email"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, passwordError && styles.inputError]}
                  placeholder="Enter Password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!passwordVisible}
                  autoComplete="password"
                />
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              </View>

              {/* Message */}
              {message ? (
                <View style={[
                  styles.messageContainer,
                  messageType === 'success' && styles.successMessage,
                  messageType === 'error' && styles.errorMessage,
                ]}>
                  <Text style={[
                    styles.messageText,
                    messageType === 'success' && styles.successMessageText,
                    messageType === 'error' && styles.errorMessageText,
                  ]}>{message}</Text>
                </View>
              ) : null}

              {/* Continue Button */}
              <TouchableOpacity
                style={[styles.continueButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignIn}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={isLoading ? ['#9ca3af', '#6b7280'] : ['#0d9488', '#14b8a6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.continueButtonText}>Continue</Text>
                  )}
                </LinearGradient>
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
                onPress={handleAppleSignIn}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-apple" size={20} color="#000000" />
                <Text style={styles.socialButtonText}>Sign in with Apple</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButton}
                onPress={handleGoogleSignIn}
                activeOpacity={0.7}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </TouchableOpacity>

              {/* Sign Up Link */}
              <View style={styles.signUpLink}>
                <Text style={styles.signUpText}>New User? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                  <Text style={styles.signUpLinkText}>Create Account</Text>
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
    marginTop: 10,
    marginBottom: 40,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#0d9488',
    fontStyle: 'italic',
  },
  menuButton: {
    padding: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 16,
    fontWeight: '500',
  },
  messageContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
  },
  successMessage: {
    backgroundColor: '#d1fae5',
  },
  errorMessage: {
    backgroundColor: '#fee2e2',
  },
  messageText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  successMessageText: {
    color: '#059669',
  },
  errorMessageText: {
    color: '#dc2626',
  },
  continueButton: {
    marginTop: 8,
    marginBottom: 24,
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginHorizontal: 16,
    color: '#9ca3af',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 30,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#0d9488',
    marginLeft: 12,
  },
  signUpLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signUpText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  signUpLinkText: {
    color: '#0d9488',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SignInScreen;
