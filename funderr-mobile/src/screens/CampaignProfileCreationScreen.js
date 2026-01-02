/**
 * Mobile Campaign Profile Creation Screen
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
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ApiService } from '../services/ApiService';

const CampaignProfileCreationScreen = ({ navigation }) => {
  const [organization, setOrganization] = useState('');
  const [description, setDescription] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [certificate, setCertificate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Get user email when component mounts
  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const userEmail = await AsyncStorage.getItem('userEmail');
        if (!userEmail) {
          console.warn('User email not found in storage');
        }
      } catch (error) {
        console.error('Error retrieving user email:', error);
      }
    };
    getUserEmail();
  }, []);

  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload certificates.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled) {
        setCertificate(result.assets[0]);
        setMessage('Certificate selected. Click "Create Profile" to upload.');
        setMessageType('info');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };

  const uploadCertificate = async () => {
    if (!certificate) return null;

    setIsUploading(true);
    try {
      // Create FormData
      const formData = new FormData();

      // Handle data URI (base64 encoded image from web)
      if (certificate.uri.startsWith('data:')) {
        const [mimeTypePart, base64Data] = certificate.uri.split(',');
        const mimeType = mimeTypePart.match(/:(.*?);/)[1];
        const byteString = atob(base64Data);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([uint8Array], { type: mimeType });
        const extension = mimeType.split('/')[1];
        const fileName = `certificate.${extension}`;
        formData.append('certificate', blob, fileName);
      }
      // Handle blob URL
      else if (certificate.uri.startsWith('blob:') || certificate.uri.startsWith('http')) {
        const response = await fetch(certificate.uri);
        const blob = await response.blob();
        const fileName = `certificate.${blob.type.split('/')[1]}`;
        formData.append('certificate', blob, fileName);
      }
      // Handle native file URI
      else {
        const uriParts = certificate.uri.split('.');
        const fileExtension = uriParts[uriParts.length - 1].toLowerCase();
        const mimeTypes = {
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          png: 'image/png',
          gif: 'image/gif',
          webp: 'image/webp',
          pdf: 'application/pdf',
        };
        const mimeType = mimeTypes[fileExtension] || 'image/jpeg';
        const fileName = `certificate.${fileExtension}`;

        formData.append('certificate', {
          uri: certificate.uri,
          type: mimeType,
          name: fileName,
        });
      }

      // Upload to backend
      const response = await ApiService.uploadCertificate(formData);
      return response.url;
    } catch (error) {
      console.error('Certificate upload error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload certificate');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Clear previous messages
    setMessage('');
    setMessageType('');

    // Validation
    if (!organization || !description || !licenseNumber || !certificate) {
      setMessage('Please fill in all fields and upload your organization certificate.');
      setMessageType('error');
      return;
    }

    setIsLoading(true);
    setMessage('Creating your profile...');
    setMessageType('info');

    try {
      // Get email and userId from AsyncStorage
      const email = await AsyncStorage.getItem('userEmail');
      const userId = await AsyncStorage.getItem('userId');
      if (!email || !userId) {
        setMessage('Session error. Please sign in again.');
        setMessageType('error');
        setIsLoading(false);
        return;
      }

      // Upload certificate first
      setMessage('Uploading certificate...');
      const uploadedCertificateUrl = await uploadCertificate();

      if (!uploadedCertificateUrl) {
        throw new Error('Certificate upload failed');
      }

      // Save profile to backend
      setMessage('Saving profile...');
      await ApiService.updateUserProfile({
        role: 'campaign_creator',
        organizationName: organization,
        organizationDescription: description,
        organizationLicenseNumber: licenseNumber,
        organizationCertificateUrl: uploadedCertificateUrl,
        email,
      });

      await AsyncStorage.setItem('profileComplete', 'true');
      await AsyncStorage.setItem('userRole', 'campaign_creator');
      
      setMessage('Profile created successfully! Awaiting admin approval to create campaigns.');
      setMessageType('success');

      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }, 2000);
    } catch (error) {
      console.error('Profile creation error:', error);
      setMessage(error.message || 'Failed to create your profile. Please try again.');
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
              <Text style={styles.headerTitle}>Campaign Profile</Text>
              <View style={styles.headerSpacer} />
            </View>

            {/* Logo Container */}
            <View style={styles.logoContainer}>
              <View style={styles.iconContainer}>
                <Ionicons name="megaphone" size={40} color="#14b8a6" />
              </View>
              <Text style={styles.title}>Campaign Creator Profile</Text>
              <Text style={styles.subtitle}>
                Tell us about your organization and campaign
              </Text>
            </View>

            {/* Form Container */}
            <View style={styles.formContainer}>
              {/* Organization Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Organization Name *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="business-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter organization name"
                    placeholderTextColor="#9ca3af"
                    value={organization}
                    onChangeText={setOrganization}
                  />
                </View>
              </View>

              {/* Organization Description Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Organization Description *</Text>
                <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                  <Ionicons name="document-text-outline" size={20} color="#6b7280" style={styles.textAreaIcon} />
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    placeholder="Describe your organization and its mission"
                    placeholderTextColor="#9ca3af"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* License Number Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Organization License Number *</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="card-outline" size={20} color="#6b7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter license number"
                    placeholderTextColor="#9ca3af"
                    value={licenseNumber}
                    onChangeText={setLicenseNumber}
                  />
                </View>
              </View>

              {/* Certificate Upload Section */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Organization Certificate *</Text>
                
                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    certificate && styles.uploadButtonActive,
                  ]}
                  onPress={pickImage}
                  disabled={isUploading}
                  activeOpacity={0.8}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#14b8a6" />
                  ) : (
                    <>
                      <Ionicons
                        name={certificate ? 'checkmark-circle' : 'cloud-upload-outline'}
                        size={24}
                        color={certificate ? '#14b8a6' : '#6b7280'}
                      />
                      <Text style={[
                        styles.uploadButtonText,
                        certificate && styles.uploadButtonTextActive,
                      ]}>
                        {certificate ? 'Certificate Selected' : 'Upload Certificate'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {certificate && (
                  <View style={styles.previewContainer}>
                    <Image
                      source={{ uri: certificate.uri }}
                      style={styles.certificatePreview}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => {
                        setCertificate(null);
                        setMessage('');
                      }}
                    >
                      <Ionicons name="close" size={18} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.uploadHint}>
                  Upload a valid business/organization certificate (JPG, PNG, GIF, WEBP, or PDF - Max 10MB)
                </Text>
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
                  <Text style={[
                    styles.messageText,
                    messageType === 'success' && styles.successText,
                    messageType === 'error' && styles.errorText,
                    messageType === 'info' && styles.infoText,
                  ]}>
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
                  Your profile will be reviewed by our admin team. You'll be able to create campaigns once approved.
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
    backgroundColor: '#e0f2f1',
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
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  // Upload Section
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 10,
  },
  uploadButtonActive: {
    borderColor: '#14b8a6',
    backgroundColor: '#e0f2f1',
    borderStyle: 'solid',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  uploadButtonTextActive: {
    color: '#14b8a6',
  },
  uploadHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
  previewContainer: {
    position: 'relative',
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  certificatePreview: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
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

export default CampaignProfileCreationScreen;
