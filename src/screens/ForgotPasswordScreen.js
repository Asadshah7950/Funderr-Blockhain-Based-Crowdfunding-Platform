import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  StatusBar,
  ScrollView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Animatable from 'react-native-animatable';
import { MaterialIcons } from '@expo/vector-icons';
import { ApiService } from '../services/ApiService';

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setMessage('');
    if (!email) {
      setMessage('Please enter your email.');
      return;
    }
    setLoading(true);
    try {
      await ApiService.requestPasswordReset(email);
      setMessage('A code has been sent to your email.');
      setStep(2);
    } catch (err) {
      setMessage('Failed to send reset code.');
    }
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    setMessage('');
    if (!code) {
      setMessage('Please enter the code sent to your email.');
      return;
    }
    setLoading(true);
    try {
      await ApiService.verifyResetCode(email, code);
      setStep(3);
      setMessage('Code verified. Enter your new password.');
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message && err.response.data.message.toLowerCase().includes('invalid')) {
        setMessage('Invalid or expired code.');
      } else {
        setMessage('Failed to verify code.');
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    setMessage('');
    if (!newPassword) {
      setMessage('Please enter a new password.');
      return;
    }
    setLoading(true);
    try {
      await ApiService.resetPassword(email, code, newPassword);
      setMessage('Password reset successful! You can now sign in.');
      setTimeout(() => {
        navigation.navigate('Auth');
      }, 1500);
    } catch (err) {
      setMessage('Failed to reset password. Try again.');
    }
    setLoading(false);
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#667eea']}
      style={styles.background}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.centeredWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Animatable.View 
            animation="fadeInUp" 
            duration={800} 
            style={styles.card}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.90)']}
              style={styles.cardGradient}
            >
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={['#ff6b6b', '#feca57', '#ff9a9e']}
                  style={styles.logoCircle}
                >
                  <MaterialIcons name="lock-reset" size={32} color="white" />
                </LinearGradient>
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  {step === 1 ? 'Enter your email to get started' :
                   step === 2 ? 'Check your email for the code' :
                   'Create a new password'}
                </Text>
              </View>

              {step === 1 && (
                <View style={styles.stepContainer}>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['#f8f9fa', '#e9ecef']}
                      style={styles.inputGradient}
                    >
                      <MaterialIcons name="email" size={20} color="#667eea" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your email address"
                        placeholderTextColor="#6c757d"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </LinearGradient>
                  </View>
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={handleSendCode} 
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={loading ? ['#cccccc', '#aaaaaa'] : ['#667eea', '#764ba2']}
                      style={styles.buttonGradient}
                    >
                      <MaterialIcons name="send" size={20} color="white" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>
                        {loading ? 'Sending...' : 'Send Reset Code'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {step === 2 && (
                <View style={styles.stepContainer}>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['#f8f9fa', '#e9ecef']}
                      style={styles.inputGradient}
                    >
                      <MaterialIcons name="verified-user" size={20} color="#667eea" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter verification code"
                        placeholderTextColor="#6c757d"
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize="none"
                      />
                    </LinearGradient>
                  </View>
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={handleVerifyCode} 
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={loading ? ['#cccccc', '#aaaaaa'] : ['#667eea', '#764ba2']}
                      style={styles.buttonGradient}
                    >
                      <MaterialIcons name="verified" size={20} color="white" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>
                        {loading ? 'Verifying...' : 'Verify Code'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {step === 3 && (
                <View style={styles.stepContainer}>
                  <View style={styles.inputContainer}>
                    <LinearGradient
                      colors={['#f8f9fa', '#e9ecef']}
                      style={styles.inputGradient}
                    >
                      <MaterialIcons name="lock" size={20} color="#667eea" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter new password"
                        placeholderTextColor="#6c757d"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                      />
                    </LinearGradient>
                  </View>
                  <TouchableOpacity 
                    style={styles.button} 
                    onPress={handleResetPassword} 
                    disabled={loading}
                  >
                    <LinearGradient
                      colors={loading ? ['#cccccc', '#aaaaaa'] : ['#56ab2f', '#a8e6cf']}
                      style={styles.buttonGradient}
                    >
                      <MaterialIcons name="check-circle" size={20} color="white" style={styles.buttonIcon} />
                      <Text style={styles.buttonText}>
                        {loading ? 'Resetting...' : 'Reset Password'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}

              {message ? (
                <Animatable.View 
                  animation="fadeIn" 
                  style={[styles.messageContainer, message.includes('success') ? styles.successContainer : styles.errorContainer]}
                >
                  <MaterialIcons 
                    name={message.includes('success') ? 'check-circle' : 'error'} 
                    size={20} 
                    color={message.includes('success') ? '#4CAF50' : '#F44336'} 
                  />
                  <Text style={[styles.message, message.includes('success') ? styles.success : styles.error]}>
                    {message}
                  </Text>
                </Animatable.View>
              ) : null}

              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.link}>
                  <MaterialIcons name="arrow-back" size={16} color="#667eea" /> Back to Sign In
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animatable.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  centeredWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight + 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },
  card: {
    borderRadius: 16,
    padding: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: 16,
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#764ba2',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  stepContainer: {
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#2c3e50',
  },
  button: {
    marginBottom: 16,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: '#667eea',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
  },
  successContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  errorContainer: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  message: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  success: {
    color: '#4CAF50',
  },
  error: {
    color: '#F44336',
  },
  link: {
    textAlign: 'center',
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
});

export default ForgotPasswordScreen;
