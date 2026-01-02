/**
 * Mobile Forgot Password Screen
 * Phone-friendly password reset flow
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
import { ApiService } from '../services/ApiService';
import { validateEmail } from '../utils/validation';

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1: email, 2: code, 3: new password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setMessage('');
    const emailResult = validateEmail(email);
    
    if (!emailResult.isValid) {
      setMessage(emailResult.error);
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      await ApiService.requestPasswordReset(email);
      setMessage('Reset code sent to your email');
      setMessageType('success');
      setStep(2);
    } catch (error) {
      setMessage('Failed to send reset code');
      setMessageType('error');
    }
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    setMessage('');
    if (!code) {
      setMessage('Please enter the code');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      await ApiService.verifyResetCode(email, code);
      setStep(3);
      setMessage('Code verified! Enter your new password');
      setMessageType('success');
    } catch (error) {
      setMessage('Invalid or expired code');
      setMessageType('error');
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    setMessage('');
    if (!newPassword || newPassword.length < 6) {
      setMessage('Password must be at least 6 characters');
      setMessageType('error');
      return;
    }

    setLoading(true);
    try {
      await ApiService.resetPassword(email, code, newPassword);
      setMessage('Password reset successful!');
      setMessageType('success');
      setTimeout(() => {
        navigation.navigate('SignIn');
      }, 1500);
    } catch (error) {
      setMessage('Failed to reset password');
      setMessageType('error');
    }
    setLoading(false);
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return 'Enter Email';
      case 2: return 'Verify Code';
      case 3: return 'New Password';
      default: return 'Reset Password';
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 1: return 'We\'ll send you a reset code';
      case 2: return 'Check your email for the code';
      case 3: return 'Create a new password';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={['#667eea', '#764ba2', '#667eea']}
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
                <View style={styles.iconContainer}>
                  <Text style={styles.icon}>🔐</Text>
                </View>
                <Text style={styles.title}>{getStepTitle()}</Text>
                <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
              </View>

              {/* Progress Indicator */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
                <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
                <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
                <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
                <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
              </View>

              {/* Form */}
              <View style={styles.form}>
                {/* Step 1: Email */}
                {step === 1 && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Email Address</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="#9ca3af"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>
                )}

                {/* Step 2: Code */}
                {step === 2 && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Verification Code</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter 6-digit code"
                      placeholderTextColor="#9ca3af"
                      value={code}
                      onChangeText={setCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                )}

                {/* Step 3: New Password */}
                {step === 3 && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Create new password"
                      placeholderTextColor="#9ca3af"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                  </View>
                )}

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

                {/* Action Button */}
                <TouchableOpacity
                  style={[styles.actionButton, loading && styles.buttonDisabled]}
                  onPress={
                    step === 1 ? handleSendCode :
                    step === 2 ? handleVerifyCode :
                    handleResetPassword
                  }
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={loading ? ['#9ca3af', '#6b7280'] : ['#667eea', '#764ba2']}
                    style={styles.buttonGradient}
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {step === 1 ? 'Send Code' :
                         step === 2 ? 'Verify Code' :
                         'Reset Password'}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Back to Sign In */}
                <TouchableOpacity
                  style={styles.signInLink}
                  onPress={() => navigation.navigate('SignIn')}
                >
                  <Text style={styles.signInLinkText}>Back to Sign In</Text>
                </TouchableOpacity>
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
    marginBottom: 20,
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  progressDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressDotActive: {
    backgroundColor: '#ffffff',
  },
  progressLine: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#ffffff',
  },
  form: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  messageContainer: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
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
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionButton: {
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
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  signInLinkText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;
