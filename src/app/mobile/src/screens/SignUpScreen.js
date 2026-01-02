/**
 * Mobile Sign Up Screen
 * Phone-friendly registration screen
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
import { LinearGradient } from 'expo-linear-gradient';
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
          routes: [{ name: 'Main', params: { screen: 'RoleSelection' } }],
        });
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      setMessage('Invalid code or registration failed');
      setMessageType('error');
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const strengthColor = passwordStrength === 'Strong' ? '#10b981' : 
                        passwordStrength === 'Moderate' ? '#f59e0b' : '#ef4444';

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={['#0f766e', '#14b8a6', '#2563eb']}
        style={styles.gradient}
      >
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
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.logoText}>funderr</Text>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join our community</Text>
              </View>

              {/* Form */}
              <View style={styles.form}>
                {/* Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={[styles.input, nameError && styles.inputError]}
                    placeholder="Enter your full name"
                    placeholderTextColor="#9ca3af"
                    value={name}
                    onChangeText={setName}
                    autoComplete="name"
                  />
                  {nameError && <Text style={styles.errorText}>{nameError}</Text>}
                </View>

                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={[styles.input, emailError && styles.inputError]}
                    placeholder="Enter your email"
                    placeholderTextColor="#9ca3af"
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
                    <Text style={styles.inputLabel}>Verification Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter code from email"
                      placeholderTextColor="#9ca3af"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                    />
                  </View>
                )}

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.passwordInput, passwordError && styles.inputError]}
                      placeholder="Create a password"
                      placeholderTextColor="#9ca3af"
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
                    <Text style={[styles.strengthText, { color: strengthColor }]}>
                      Password Strength: {passwordStrength}
                    </Text>
                  )}
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={[styles.input, confirmPasswordError && styles.inputError]}
                    placeholder="Confirm your password"
                    placeholderTextColor="#9ca3af"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!passwordVisible}
                  />
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

                {/* Sign Up Button */}
                <TouchableOpacity
                  style={[styles.signUpButton, isLoading && styles.buttonDisabled]}
                  onPress={handleSignUp}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isLoading ? ['#9ca3af', '#6b7280'] : ['#ffffff', '#f8fafc']}
                    style={styles.buttonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#0f766e" />
                    ) : (
                      <Text style={styles.signUpButtonText}>Create Account</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Sign In Link */}
                <View style={styles.signInLink}>
                  <Text style={styles.signInText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                    <Text style={styles.signInLinkText}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 10,
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  form: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  inputError: {
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1f2937',
  },
  eyeButton: {
    padding: 12,
  },
  eyeIcon: {
    fontSize: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  strengthText: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  sendCodeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  sendCodeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  messageContainer: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  successMessage: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  errorMessage: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  messageText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  signUpButton: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signUpButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f766e',
  },
  signInLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  signInLinkText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default SignUpScreen;
