import React, { useState, useLayoutEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  KeyboardAvoidingView, 
  Platform, 
  Dimensions,
  StatusBar,
  ScrollView,
  ImageBackground
} from 'react-native';
import { AuthService } from '../services/AuthService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');
const isTablet = width >= 768;

const SignInScreen = ({ navigation }) => {
  const [email, setEmail] = useState('muz3@gmail.com');
  const [password, setPassword] = useState('12345678');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

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
    }
    
    setPasswordError('');
    return true;
  };

  const handleSignIn = async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      setMessage('Please check email and password fields.');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('Signing in...');
    setMessageType('info');
    
    try {
      // Call the AuthService which will try to connect to the real backend
      console.log('Calling AuthService.signIn for:', email);
      const response = await AuthService.signIn(email, password);
      console.log('Authentication response received:', response);
      
      if (!response || !response.token) {
        console.error('Invalid response format:', response);
        throw new Error('Invalid credentials or server error');
      }
      
      // Set the user info in AsyncStorage (if not already done by AuthService)
      if (response.token) await AsyncStorage.setItem('userToken', response.token);
      if (response.userId) await AsyncStorage.setItem('userId', response.userId);
      if (email) await AsyncStorage.setItem('userEmail', email);
      
      // Fetch user profile from backend to get the latest role
      const { ApiService } = require('../services/ApiService');
      let userProfile = null;
      try {
        userProfile = await ApiService.getUserProfile();
        if (userProfile && userProfile.role) {
          await AsyncStorage.setItem('userRole', userProfile.role);
        } else {
          await AsyncStorage.removeItem('userRole');
        }
        // Also store the full userProfile for later screens
        await AsyncStorage.setItem('userProfile', JSON.stringify(userProfile));
      } catch (e) {
        await AsyncStorage.removeItem('userRole');
        await AsyncStorage.removeItem('userProfile');
      }
      
      setIsLoading(false);
      setMessage('Login successful!');
      setMessageType('success');
      
      // Wait for AsyncStorage writes to complete before navigating
      setTimeout(() => {
        if (userProfile && userProfile.role === 'admin') {
          // Navigate directly to AdminPortal for admin users
          navigation.navigate('AdminPortal');
        } else {
          const validRoles = ['donor', 'campaign_creator'];
          if (userProfile && validRoles.includes(userProfile.role)) {
            if (userProfile.name) {
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainApp' }]
              });
            } else {
              if (userProfile.role === 'donor') {
                navigation.navigate('DonorProfileCreation');
              } else {
                navigation.navigate('CampaignProfileCreation');
              }
            }
          } else {
            navigation.navigate('RoleSelection');
          }
        }
      }, 1000);
    } catch (error) {
      setIsLoading(false);
      // Check if it's a network error
      if (error.message && error.message.includes('Network Error')) {
        setMessage('Unable to connect to the server. Please check your internet connection.');
      } else if (error.response && error.response.status === 401) {
        setMessage('Invalid email or password. Please try again.');
      } else if (error.message && (
          error.message.toLowerCase().includes('password') || 
          error.message.toLowerCase().includes('invalid') ||
          error.message.toLowerCase().includes('credentials')
        )) {
        // Handle specific auth errors from our AuthService
        setMessage(error.message);
      } else {
        setMessage('Authentication failed. Please check your credentials and try again.');
      }
      setMessageType('error');
      console.error('Login error:', error);
    }
  };

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
                    <Text style={styles.title}>Welcome back</Text>
                    <Text style={styles.subtitle}>Sign in to continue funding dreams</Text>
                  </View>

                  <View style={styles.formFields}>
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
                      onPress={handleSignIn}
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
                          {isLoading ? 'Signing In...' : 'Sign In'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.linksContainer}>
                      <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                        <Text style={styles.link}>
                          Don't have an account? <Text style={styles.linkBold}>Create Account</Text>
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.termsLink} 
                        onPress={() => navigation.navigate('ForgotPassword')}
                      >
                        <Text style={styles.termsText}>Forgot Password?</Text>
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
                    source={require('../assets/signin.jpg')}
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
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImageStyle: {
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
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

export default SignInScreen;