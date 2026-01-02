import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { AuthService } from '../services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;

const AuthScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'signup'
  const [isLoading, setIsLoading] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false);
  
  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [signupPasswordVisible, setSignupPasswordVisible] = useState(false);
  const [signupConfirmPasswordVisible, setSignupConfirmPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);
  
  // Validation errors
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getPasswordStrength = (pass) => {
    if (pass.length > 7 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) {
      return { text: 'Strong', color: '#10b981' };
    } else if (pass.length > 5) {
      return { text: 'Moderate', color: '#f59e0b' };
    } else if (pass.length > 0) {
      return { text: 'Weak', color: '#ef4444' };
    }
    return null;
  };

  const handleSendCode = async () => {
    if (!signupEmail) {
      setErrors({ ...errors, signupEmail: 'Email is required' });
      return;
    }
    if (!validateEmail(signupEmail)) {
      setErrors({ ...errors, signupEmail: 'Please enter a valid email' });
      return;
    }

    setCodeLoading(true);
    setMessage('');
    
    try {
      const ApiService = require('../services/ApiService').ApiService;
      await ApiService.requestSignupCode(signupEmail);
      setCodeSent(true);
      setMessage('Verification code sent to your email!');
      setMessageType('success');
      setCanResend(false);
      setResendTimer(120);
      
      // Start timer for resend
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
      setMessage(error.message || 'Failed to send verification code');
      setMessageType('error');
    } finally {
      setCodeLoading(false);
    }
  };

  const handleLogin = async () => {
    const newErrors = {};
    
    if (!loginEmail) {
      newErrors.loginEmail = 'Email is required';
    } else if (!validateEmail(loginEmail)) {
      newErrors.loginEmail = 'Please enter a valid email';
    }
    
    if (!loginPassword) {
      newErrors.loginPassword = 'Password is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setMessage('');
    setErrors({});
    
    try {
      const response = await AuthService.signIn(loginEmail, loginPassword);
      
      if (!response || !response.token) {
        throw new Error('Invalid credentials');
      }
      
      if (response.token) await AsyncStorage.setItem('userToken', response.token);
      
      // Store user data
      const userData = {
        userId: response.userId,
        id: response.userId, // Also store as 'id' for compatibility
        name: response.name,
        email: response.email,
        role: response.role
      };
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      await AsyncStorage.setItem('userProfile', JSON.stringify(userData)); // Also store as userProfile
      if (response.userId) await AsyncStorage.setItem('userId', response.userId);
      if (response.role) await AsyncStorage.setItem('userRole', response.role);
      if (response.email) await AsyncStorage.setItem('userEmail', response.email);
      
      setMessage('Login successful!');
      setMessageType('success');
      
      // Role-based redirect
      setTimeout(() => {
        const userRole = response.role;
        
        if (userRole === 'admin') {
          // Admin users go to Admin Portal
          navigation.replace('MainApp', { screen: 'AdminPortal' });
        } else if (userRole === 'campaign_creator') {
          // Campaign creators go to User Interface (creator mode)
          navigation.replace('MainApp', { screen: 'UserInterface' });
        } else if (userRole === 'donor') {
          // Donors go to User Interface (donor mode)
          navigation.replace('MainApp', { screen: 'UserInterface' });
        } else {
          // Users without a role go to Role Selection
          navigation.replace('RoleSelection');
        }
      }, 500);
    } catch (error) {
      setMessage(error.message || 'Login failed. Please try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    const newErrors = {};
    
    if (!signupName) {
      newErrors.signupName = 'Name is required';
    }
    
    if (!signupEmail) {
      newErrors.signupEmail = 'Email is required';
    } else if (!validateEmail(signupEmail)) {
      newErrors.signupEmail = 'Please enter a valid email';
    }
    
    if (!signupPassword) {
      newErrors.signupPassword = 'Password is required';
    } else if (signupPassword.length < 6) {
      newErrors.signupPassword = 'Password must be at least 6 characters';
    }
    
    if (!signupConfirmPassword) {
      newErrors.signupConfirmPassword = 'Please confirm your password';
    } else if (signupConfirmPassword !== signupPassword) {
      newErrors.signupConfirmPassword = 'Passwords do not match';
    }
    
    if (!codeSent) {
      newErrors.signupCode = 'Please verify your email first';
    } else if (!signupCode) {
      newErrors.signupCode = 'Please enter the verification code';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    setMessage('Verifying code...');
    setMessageType('success');
    setErrors({});
    
    try {
      const ApiService = require('../services/ApiService').ApiService;
      
      // Verify code first
      await ApiService.verifySignupCode(signupEmail, signupCode);
      
      setMessage('Creating your account...');
      
      // Create account
      const response = await AuthService.signUp(signupName, signupEmail, signupPassword, undefined);
      
      // Auto sign in after signup
      const signInResponse = await AuthService.signIn(signupEmail, signupPassword);
      
      if (signInResponse.token) await AsyncStorage.setItem('userToken', signInResponse.token);
      
      // Handle userId - it might come as 'userId' or '_id' from MongoDB
      const userId = signInResponse.userId || signInResponse._id || signInResponse.id;
      if (userId) await AsyncStorage.setItem('userId', String(userId));
      
      await AsyncStorage.setItem('userEmail', signupEmail);
      await AsyncStorage.setItem('userName', signupName);
      
      setMessage('Account created successfully!');
      setMessageType('success');
      
      setTimeout(() => {
        navigation.navigate('RoleSelection');
      }, 1000);
    } catch (error) {
      setMessage(error.message || 'Registration failed. Please try again.');
      setMessageType('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title Section */}
          <Animatable.View animation="fadeInDown" duration={800} style={styles.titleSection}>
            <Text style={styles.title}>
              Welcome to <Text style={styles.titleHighlight}>Funderr</Text>
            </Text>
            <Text style={styles.subtitle}>
              {activeTab === 'login' ? 'Sign in to continue' : 'Create your account'}
            </Text>
          </Animatable.View>

          {/* Card */}
          <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.card}>
            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'login' && styles.tabActive]}
                onPress={() => {
                  setActiveTab('login');
                  setErrors({});
                  setMessage('');
                }}
              >
                <Text style={[styles.tabText, activeTab === 'login' && styles.tabTextActive]}>
                  Login
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'signup' && styles.tabActive]}
                onPress={() => {
                  setActiveTab('signup');
                  setErrors({});
                  setMessage('');
                }}
              >
                <Text style={[styles.tabText, activeTab === 'signup' && styles.tabTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Message */}
            {message ? (
              <View style={[styles.messageBox, messageType === 'error' ? styles.messageError : styles.messageSuccess]}>
                <Ionicons
                  name={messageType === 'error' ? 'alert-circle' : 'checkmark-circle'}
                  size={20}
                  color={messageType === 'error' ? '#ef4444' : '#10b981'}
                />
                <Text style={[styles.messageText, messageType === 'error' ? styles.messageTextError : styles.messageTextSuccess]}>
                  {message}
                </Text>
              </View>
            ) : null}

            {/* Login Form */}
            {activeTab === 'login' && (
              <View style={styles.formContainer}>
                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={[styles.inputWrapper, errors.loginEmail && styles.inputError]}>
                    <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChangeText={(text) => {
                        setLoginEmail(text);
                        setErrors({ ...errors, loginEmail: '' });
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  {errors.loginEmail ? <Text style={styles.errorText}>{errors.loginEmail}</Text> : null}
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.inputWrapper, errors.loginPassword && styles.inputError]}>
                    <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChangeText={(text) => {
                        setLoginPassword(text);
                        setErrors({ ...errors, loginPassword: '' });
                      }}
                      secureTextEntry={!loginPasswordVisible}
                      placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity onPress={() => setLoginPasswordVisible(!loginPasswordVisible)}>
                      <Ionicons
                        name={loginPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.loginPassword ? <Text style={styles.errorText}>{errors.loginPassword}</Text> : null}
                </View>

                {/* Remember Me & Forgot Password */}
                <View style={styles.optionsRow}>
                  <TouchableOpacity
                    style={styles.rememberMe}
                    onPress={() => setRememberMe(!rememberMe)}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                      {rememberMe && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={styles.rememberMeText}>Remember me</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                    <Text style={styles.forgotPassword}>Forgot password?</Text>
                  </TouchableOpacity>
                </View>

                {/* Login Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#14b8a6', '#0d9488']}
                    style={styles.submitButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Sign In</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Signup Form */}
            {activeTab === 'signup' && (
              <View style={styles.formContainer}>
                {/* Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={[styles.inputWrapper, errors.signupName && styles.inputError]}>
                    <Ionicons name="person-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Muhammad Ali"
                      value={signupName}
                      onChangeText={(text) => {
                        setSignupName(text);
                        setErrors({ ...errors, signupName: '' });
                      }}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  {errors.signupName ? <Text style={styles.errorText}>{errors.signupName}</Text> : null}
                </View>

                {/* Email */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <View style={[styles.inputWrapper, errors.signupEmail && styles.inputError]}>
                    <Ionicons name="mail-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChangeText={(text) => {
                        setSignupEmail(text);
                        setErrors({ ...errors, signupEmail: '' });
                      }}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  {errors.signupEmail ? <Text style={styles.errorText}>{errors.signupEmail}</Text> : null}
                </View>

                {/* Send Verification Code Button */}
                <TouchableOpacity
                  style={[styles.verifyButton, codeSent && styles.verifyButtonSuccess]}
                  onPress={handleSendCode}
                  disabled={codeLoading || !canResend}
                >
                  <View style={styles.verifyButtonContent}>
                    {codeLoading ? (
                      <ActivityIndicator color="#14b8a6" size="small" />
                    ) : (
                      <>
                        <Ionicons 
                          name={codeSent ? "checkmark-circle" : "mail"} 
                          size={18} 
                          color={codeSent ? "#10b981" : "#14b8a6"} 
                        />
                        <Text style={[styles.verifyButtonText, codeSent && styles.verifyButtonTextSuccess]}>
                          {codeSent 
                            ? (canResend ? 'Resend Code' : `Resend in ${resendTimer}s`)
                            : 'Send Verification Code'}
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Verification Code Input */}
                {codeSent && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Verification Code</Text>
                    <View style={[styles.inputWrapper, errors.signupCode && styles.inputError]}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit code"
                        value={signupCode}
                        onChangeText={(text) => {
                          setSignupCode(text);
                          setErrors({ ...errors, signupCode: '' });
                        }}
                        keyboardType="number-pad"
                        maxLength={6}
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    {errors.signupCode ? <Text style={styles.errorText}>{errors.signupCode}</Text> : null}
                  </View>
                )}

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={[styles.inputWrapper, errors.signupPassword && styles.inputError]}>
                    <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      value={signupPassword}
                      onChangeText={(text) => {
                        setSignupPassword(text);
                        setErrors({ ...errors, signupPassword: '' });
                      }}
                      secureTextEntry={!signupPasswordVisible}
                      placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity onPress={() => setSignupPasswordVisible(!signupPasswordVisible)}>
                      <Ionicons
                        name={signupPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.signupPassword ? <Text style={styles.errorText}>{errors.signupPassword}</Text> : null}
                  {signupPassword && getPasswordStrength(signupPassword) && (
                    <View style={styles.passwordStrength}>
                      <Text style={[styles.passwordStrengthText, { color: getPasswordStrength(signupPassword).color }]}>
                        Password strength: {getPasswordStrength(signupPassword).text}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Confirm Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <View style={[styles.inputWrapper, errors.signupConfirmPassword && styles.inputError]}>
                    <Ionicons name="lock-closed-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChangeText={(text) => {
                        setSignupConfirmPassword(text);
                        setErrors({ ...errors, signupConfirmPassword: '' });
                      }}
                      secureTextEntry={!signupConfirmPasswordVisible}
                      placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity onPress={() => setSignupConfirmPasswordVisible(!signupConfirmPasswordVisible)}>
                      <Ionicons
                        name={signupConfirmPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.signupConfirmPassword ? <Text style={styles.errorText}>{errors.signupConfirmPassword}</Text> : null}
                </View>

                {/* Signup Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSignup}
                  disabled={isLoading}
                >
                  <LinearGradient
                    colors={['#14b8a6', '#2563eb']}
                    style={styles.submitButtonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Create Account</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.termsText}>
                  By signing up, you agree to our Terms of Service and Privacy Policy
                </Text>
              </View>
            )}
          </Animatable.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  titleHighlight: {
    color: '#14b8a6',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#1f2937',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  messageSuccess: {
    backgroundColor: '#d1fae5',
  },
  messageError: {
    backgroundColor: '#fee2e2',
  },
  messageText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  messageTextSuccess: {
    color: '#10b981',
  },
  messageTextError: {
    color: '#ef4444',
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  rememberMeText: {
    fontSize: 14,
    color: '#6b7280',
  },
  forgotPassword: {
    fontSize: 14,
    color: '#14b8a6',
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  termsText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  verifyButton: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#14b8a6',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
  },
  verifyButtonSuccess: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  verifyButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  verifyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  verifyButtonTextSuccess: {
    color: '#10b981',
  },
  passwordStrength: {
    marginTop: 4,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default AuthScreen;
