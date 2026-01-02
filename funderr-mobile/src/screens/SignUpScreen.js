/**
 * Mobile Sign Up Screen - Redesigned
 * Clean white UI matching SignIn screen
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
import {
  validateEmail,
  validatePassword,
  validateName,
  validateConfirmPassword,
  getPasswordStrength,
} from '../utils/validation';

const SignUpScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  const handleSendCode = async () => {
    setMessage('');
    const emailResult = validateEmail(email);
    setEmailError(emailResult.error);
    
    if (!emailResult.isValid) return;

    setCodeLoading(true);
    try {
      await ApiService.requestSignupCode(email);
      setCodeSent(true);
      setMessage('Verification code sent to your email');
      setMessageType('success');
      setCanResend(false);
      setResendTimer(120);
      
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setMessage('Failed to send code. Please try again.');
      setMessageType('error');
    }
    setCodeLoading(false);
  };

  const handleSignUp = async () => {
    // Validate all inputs
    const nameResult = validateName(name);
    const emailResult = validateEmail(email);
    const passwordResult = validatePassword(password);
    const confirmResult = validateConfirmPassword(password, confirmPassword);

    setNameError(nameResult.error);
    setEmailError(emailResult.error);
    setPasswordError(passwordResult.error);
    setConfirmPasswordError(confirmResult.error);

    if (!nameResult.isValid || !emailResult.isValid || 
        !passwordResult.isValid || !confirmResult.isValid) {
      setMessage('Please check all fields');
      setMessageType('error');
      return;
    }

    if (!codeSent || !code) {
      setMessage('Please verify your email with the code');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('Verifying code...');
    setMessageType('info');

    try {
      // Verify code
      await ApiService.verifySignupCode(email, code);
      
      setMessage('Creating your account...');
      
      // Sign up
      await AuthService.signUp(name, email, password);
      
      // Auto sign in
      const response = await AuthService.signIn(email, password);
      
      // Store user data
      await AsyncStorage.setItem('userToken', response.token);
      await AsyncStorage.setItem('userId', response.userId);
      await AsyncStorage.setItem('userEmail', email);
      await AsyncStorage.setItem('userName', name);

      setMessage('Account created successfully!');
      setMessageType('success');
      setIsLoading(false);

      // Navigate to role selection
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'RoleSelection' }],
        });
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      setMessage('Invalid code or registration failed');
      setMessageType('error');
    }
  };

  const passwordStrength = getPasswordStrength(password);

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
              <Text style={styles.title}>Create Account</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Name Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, nameError && styles.inputError]}
                  placeholder="Full Name"
                  placeholderTextColor="#b0b0b0"
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                />
                {nameError && <Text style={styles.errorText}>{nameError}</Text>}
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={[styles.input, emailError && styles.inputError]}
                  placeholder="Your Email"
                  placeholderTextColor="#b0b0b0"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                {emailError && <Text style={styles.errorText}>{emailError}</Text>}
              </View>

              {/* Send Code Button */}
              <TouchableOpacity
                style={[styles.sendCodeButton, (!canResend || codeLoading) && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={codeLoading || !canResend}
              >
                <Text style={styles.sendCodeText}>
                  {codeLoading ? 'Sending...' : 
                   canResend ? (codeSent ? 'Resend Code' : 'Send Verification Code') : 
                   `Resend in ${resendTimer}s`}
                </Text>
              </TouchableOpacity>

              {/* Verification Code Input */}
              {codeSent && (
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Verification Code"
                    placeholderTextColor="#b0b0b0"
                    value={code}
                    onChangeText={setCode}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[styles.input, passwordError && styles.inputError]}
                    placeholder="Create Password"
                    placeholderTextColor="#b0b0b0"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    autoComplete="password-new"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                  >
                    <Text style={styles.eyeIcon}>{passwordVisible ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
                {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
                {password && (
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    Password Strength: {passwordStrength.label}
                  </Text>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[styles.input, confirmPasswordError && styles.inputError]}
                    placeholder="Confirm Password"
                    placeholderTextColor="#b0b0b0"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!passwordVisible}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                  >
                    <Text style={styles.eyeIcon}>{passwordVisible ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
                {confirmPasswordError && <Text style={styles.errorText}>{confirmPasswordError}</Text>}
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

              {/* Create Account Button */}
              <TouchableOpacity
                style={[styles.createButton, isLoading && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.createButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Sign Up Buttons */}
              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => {
                  console.log('Apple Sign Up');
                }}
              >
                <Text style={styles.appleIcon}>🍎</Text>
                <Text style={styles.socialButtonText}>Sign up with Apple</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.socialButton}
                onPress={() => {
                  console.log('Google Sign Up');
                }}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.socialButtonTextGoogle}>Sign up with Google</Text>
              </TouchableOpacity>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                  <Text style={styles.signInLinkText}>Sign In</Text>
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
  strengthText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
    fontWeight: '600',
  },
  sendCodeButton: {
    backgroundColor: '#14b8a6',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  sendCodeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
  createButton: {
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
  createButtonText: {
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
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signInText: {
    fontSize: 14,
    color: '#6b7280',
  },
  signInLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
});

export default SignUpScreen;