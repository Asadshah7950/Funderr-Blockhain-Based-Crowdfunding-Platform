import React, { useState, useLayoutEffect } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Dimensions, StatusBar, ScrollView,
  ImageBackground
} from 'react-native';
import { AuthService } from '../services/AuthService';
import { ApiService } from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

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
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeMessage, setCodeMessage] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendTimer, setResendTimer] = useState(0);

  const getPasswordStrength = (pass) => {
    if (pass.length > 7 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) {
      return 'Strong';
    } else if (pass.length > 5) {
      return 'Moderate';
    } else {
      return 'Weak';
    }
  };

  const validateName = (name) => {
    if (!name || name.trim() === '') {
      setNameError('Name is required');
      return false;
    }
    setNameError('');
    return true;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateConfirmPassword = (confirmPassword) => {
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    setConfirmPasswordError('');
    return true;
  };  

  const handleSendCode = async () => {
    setCodeMessage('');
    if (!validateEmail(email)) return;
    setCodeLoading(true);
    try {
      await ApiService.requestSignupCode(email);
      setCodeSent(true);
      setCodeMessage('A code has been sent to your email.');
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
    } catch (err) {
      setCodeMessage('Failed to send code.');
    }
    setCodeLoading(false);
  };

  const handleSignUp = async () => {
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      setMessage('Please check all fields.');
      setMessageType('error');
      return;
    }
    if (!codeSent) {
      setMessage('Please verify your email with the code.');
      setMessageType('error');
      return;
    }
    if (!code) {
      setMessage('Please enter the code sent to your email.');
      setMessageType('error');
      return;
    }
    setIsLoading(true);
    setMessage('Verifying code...');
    setMessageType('info');
    try {
      // Verify code using the new endpoint
      await ApiService.verifySignupCode(email, code);
      setMessage('Code verified. Creating your account...');
      // Now create the user
      const response = await AuthService.signUp(name, email, password, undefined);
      
      // After successful sign-up, also sign in the user automatically
      const signInResponse = await AuthService.signIn(email, password);
      
      // Store user data in AsyncStorage
      await AsyncStorage.setItem('userToken', signInResponse.token);
      await AsyncStorage.setItem('userId', signInResponse.userId);
      await AsyncStorage.setItem('userEmail', email);
      await AsyncStorage.setItem('userName', name);
      
      setIsLoading(false);
      setMessage('Account created successfully!');
      setMessageType('success');
      
      // Navigate to sign in screen after a short delay
      setTimeout(() => {
        navigation.navigate('Auth');
      }, 1500);
    } catch (error) {
      setIsLoading(false);
      setMessage('Invalid code or registration failed.');
      setMessageType('error');
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.headerButton}>
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.headerButtonGradient}
          >
            <Ionicons name="home" size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      ),
      headerTitle: '',
      headerTransparent: true,
    });
  }, [navigation]);

  return (
    <LinearGradient
      colors={['#0f766e', '#14b8a6', '#2563eb']}
      style={styles.background}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.mainContainer}>
          <View style={styles.splitContainer}>
            {/* Left Section - Form */}
            <Animatable.View 
              animation="fadeInLeft" 
              duration={1000}
              style={styles.leftSection}
            >
              <ScrollView 
                contentContainerStyle={styles.formScrollContainer}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.formContainer}>
                  <View style={styles.headerSection}>
                    <Text style={styles.title}>Create an account</Text>
                    <Text style={styles.subtitle}>Join our crowdfunding community</Text>
                  </View>

                  <View style={styles.formFields}>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Full name</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your full name"
                          placeholderTextColor="#9ca3af"
                          value={name}
                          onChangeText={setName}
                        />
                      </View>
                      {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Email</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your email address"
                          placeholderTextColor="#9ca3af"
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>
                      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
                    </View>

                    <TouchableOpacity
                      style={[styles.sendCodeButton, (!canResend || codeLoading) && styles.sendCodeButtonDisabled]}
                      onPress={handleSendCode}
                      disabled={codeLoading || !canResend}
                    >
                      <Text style={styles.sendCodeText}>
                        {codeLoading ? 'Sending...' : canResend ? (codeSent ? 'Resend Code' : 'Send Verification Code') : `Resend in ${resendTimer}s`}
                      </Text>
                    </TouchableOpacity>

                    {codeMessage ? (
                      <Animatable.View animation="fadeIn" style={styles.codeMessageContainer}>
                        <Text style={styles.codeMessage}>{codeMessage}</Text>
                      </Animatable.View>
                    ) : null}

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Password</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Enter your password"
                          placeholderTextColor="#9ca3af"
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!passwordVisible}
                        />
                        <TouchableOpacity 
                          onPress={() => setPasswordVisible(!passwordVisible)}
                          style={styles.eyeButton}
                        >
                          <MaterialIcons 
                            name={passwordVisible ? 'visibility-off' : 'visibility'} 
                            size={20} 
                            color="#6b7280" 
                          />
                        </TouchableOpacity>
                      </View>
                      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                      
                      {password ? (
                        <View style={styles.strengthContainer}>
                          <Text style={[styles.strengthText, {
                            color: getPasswordStrength(password) === 'Strong' ? '#10b981' :
                              getPasswordStrength(password) === 'Moderate' ? '#f59e0b' : '#ef4444'
                          }]}>
                            Password Strength: {getPasswordStrength(password)}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Confirm Password</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.passwordInput}
                          placeholder="Confirm your password"
                          placeholderTextColor="#9ca3af"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!confirmPasswordVisible}
                        />
                        <TouchableOpacity 
                          onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                          style={styles.eyeButton}
                        >
                          <MaterialIcons 
                            name={confirmPasswordVisible ? 'visibility-off' : 'visibility'} 
                            size={20} 
                            color="#6b7280" 
                          />
                        </TouchableOpacity>
                      </View>
                      {confirmPasswordError ? <Text style={styles.errorText}>{confirmPasswordError}</Text> : null}
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Verification Code</Text>
                      <View style={styles.inputWrapper}>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter verification code"
                          placeholderTextColor="#9ca3af"
                          value={code}
                          onChangeText={setCode}
                          autoCapitalize="none"
                        />
                      </View>
                    </View>

                    {message ? (
                      <Animatable.View 
                        animation="fadeIn" 
                        style={[styles.messageContainer, messageType === 'success' ? styles.successContainer : styles.errorContainer]}
                      >
                        <Text style={[styles.message, messageType === 'success' ? styles.success : styles.error]}>
                          {message}
                        </Text>
                      </Animatable.View>
                    ) : null}

                    <TouchableOpacity 
                      style={[styles.submitButton, isLoading && styles.buttonDisabled]} 
                      onPress={handleSignUp}
                      disabled={isLoading}
                    >
                      <LinearGradient
                        colors={isLoading ? 
                          ['#d1d5db', '#9ca3af'] : 
                          ['#0f766e', '#14b8a6', '#2563eb']
                        }
                        style={styles.submitButtonGradient}
                      >
                        <Text style={styles.submitButtonText}>
                          {isLoading ? 'Creating Account...' : 'Submit'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.linksContainer}>
                      <TouchableOpacity onPress={() => navigation.navigate('Auth')}>
                        <Text style={styles.link}>
                          Have any account? <Text style={styles.linkBold}>Sign in</Text>
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.termsLink}>
                        <Text style={styles.termsText}>Terms & Conditions</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </Animatable.View>

            {/* Right Section - Image */}
            {isTablet && (
              <Animatable.View 
                animation="fadeInRight" 
                duration={1000}
                style={styles.rightSection}
              >
                <View style={styles.imageContainer}>
                  <ImageBackground
                    source={require('../assets/signup.jpg')}
                    style={styles.backgroundImage}
                    imageStyle={styles.backgroundImageStyle}
                  />
                </View>
              </Animatable.View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 20,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  splitContainer: {
    flexDirection: isTablet ? 'row' : 'column',
    maxWidth: isTablet ? 900 : 380,
    width: '100%',
    maxHeight: isTablet ? height * 0.85 : height * 0.9,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 16,
    backdropFilter: 'blur(30px)',
  },
  leftSection: {
    flex: isTablet ? 1 : 1,
    padding: isTablet ? 32 : 24,
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    minHeight: isTablet ? 400 : 250,
  },
  formScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  headerSection: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
    textShadowColor: 'rgba(15, 118, 110, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '400',
    lineHeight: 20,
  },
  formFields: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: 'rgba(0, 0, 0, 0.05)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  passwordInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  strengthContainer: {
    marginTop: 6,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sendCodeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignSelf: 'flex-start',
  },
  sendCodeButtonDisabled: {
    opacity: 0.5,
  },
  sendCodeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  codeMessageContainer: {
    padding: 10,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  codeMessage: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  messageContainer: {
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  successContainer: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  message: {
    fontSize: 13,
    fontWeight: '500',
  },
  success: {
    color: '#ffffff',
  },
  error: {
    color: '#ffffff',
  },
  submitButton: {
    marginTop: 6,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  linksContainer: {
    marginTop: 16,
    alignItems: 'center',
    gap: 8,
  },
  link: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
  },
  linkBold: {
    fontWeight: '600',
    color: '#ffffff',
    textDecorationLine: 'underline',
  },
  termsLink: {
    paddingVertical: 2,
  },
  termsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  imageContainer: {
    flex: 1,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerButton: {
    marginLeft: 16,
    marginTop: 8,
  },
  headerButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default SignUpScreen;