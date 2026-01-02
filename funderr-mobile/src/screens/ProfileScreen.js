/**
 * Mobile Profile Screen - Dynamic Version
 * Fetches real data from MongoDB database
 * Includes MetaMask wallet integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';
import { useWallet } from '../context/WalletContext';

const ProfileScreen = ({ navigation }) => {
  // Wallet context
  const { 
    isConnected: walletConnected, 
    isConnecting: walletConnecting, 
    walletAddress, 
    balance: walletBalance,
    connect: connectWallet,
    disconnect: disconnectWallet,
    formatAddress
  } = useWallet();

  // User data state
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    donationsMade: 0,
    totalDonated: 0,
    campaignsCreated: 0,
    totalRaised: 0,
    totalContributors: 0,
    pendingCampaigns: 0,
    approvedCampaigns: 0,
    rejectedCampaigns: 0,
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Edit form state
  const [editData, setEditData] = useState({
    name: '',
    phone: '',
    address: '',
    organization: '',
    description: '',
  });

  // Load user profile from API
  const loadUserProfile = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Fetch user profile from MongoDB
      const userData = await ApiService.getUserProfile();
      
      if (userData) {
        setUser(userData);
        setEditData({
          name: userData.name || '',
          phone: userData.phone || '',
          address: userData.address || '',
          organization: userData.organization || '',
          description: userData.description || '',
        });
        
        // Store updated user data locally
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        await AsyncStorage.setItem('userRole', userData.role || 'user');
        await AsyncStorage.setItem('userName', userData.name || '');
      }

      // Fetch user stats from MongoDB
      try {
        const userStats = await ApiService.getUserStats();
        if (userStats) {
          setStats(userStats);
        }
      } catch (statsError) {
        console.log('Could not fetch stats:', statsError);
      }

    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile. Please check your connection.');
      
      // Try to load from local storage as fallback
      try {
        const localData = await AsyncStorage.getItem('userData');
        if (localData) {
          const parsed = JSON.parse(localData);
          setUser(parsed);
          setEditData({
            name: parsed.name || '',
            phone: parsed.phone || '',
            address: parsed.address || '',
            organization: parsed.organization || '',
            description: parsed.description || '',
          });
        }
      } catch (localError) {
        console.error('Error loading local data:', localError);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Handle pull to refresh
  const onRefresh = useCallback(() => {
    loadUserProfile(true);
  }, [loadUserProfile]);

  // Handle save profile
  const handleSave = async () => {
    if (!editData.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setIsSaving(true);
    try {
      // Update profile in MongoDB
      const updatedUser = await ApiService.updateUserProfile(editData);
      
      // Update local state
      setUser(updatedUser);
      
      // Update local storage
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      await AsyncStorage.setItem('userName', updatedUser.name || '');
      
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (err) {
      console.error('Error saving profile:', err);
      Alert.alert('Error', err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditData({
      name: user?.name || '',
      phone: user?.phone || '',
      address: user?.address || '',
      organization: user?.organization || '',
      description: user?.description || '',
    });
    setIsEditing(false);
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'userToken',
                'userData',
                'userRole',
                'userId',
                'userEmail',
                'userName',
              ]);
              navigation.reset({
                index: 0,
                routes: [{ name: 'SignIn' }],
              });
            } catch (err) {
              console.error('Logout error:', err);
            }
          },
        },
      ]
    );
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get role display name
  const getRoleDisplay = (role) => {
    switch (role) {
      case 'campaign_creator':
        return { emoji: '🚀', text: 'Campaign Creator' };
      case 'donor':
        return { emoji: '💖', text: 'Donor' };
      case 'admin':
        return { emoji: '👑', text: 'Administrator' };
      default:
        return { emoji: '👤', text: 'User' };
    }
  };

  // Get approval status badge
  const getApprovalBadge = (status) => {
    switch (status) {
      case 'approved':
        return { color: '#10b981', text: 'Approved', icon: '✓' };
      case 'pending':
        return { color: '#f59e0b', text: 'Pending Approval', icon: '⏳' };
      case 'rejected':
        return { color: '#ef4444', text: 'Rejected', icon: '✗' };
      default:
        return null;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#14b8a6" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const roleInfo = getRoleDisplay(user?.role);
  const approvalBadge = user?.role === 'campaign_creator' ? getApprovalBadge(user?.approvalStatus) : null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#14b8a6" />
      
      {/* Header */}
      <LinearGradient
        colors={['#14b8a6', '#0d9488']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          {isEditing ? (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelEdit}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {roleInfo.emoji} {roleInfo.text}
            </Text>
          </View>
          
          {/* Approval Status Badge for Campaign Creators */}
          {approvalBadge && (
            <View style={[styles.approvalBadge, { backgroundColor: approvalBadge.color + '20' }]}>
              <Text style={[styles.approvalText, { color: approvalBadge.color }]}>
                {approvalBadge.icon} {approvalBadge.text}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={['#14b8a6']}
            tintColor="#14b8a6"
          />
        }
      >
        {/* Error Message */}
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
            <TouchableOpacity onPress={() => loadUserProfile()}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          {/* Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editData.name}
                onChangeText={(text) => setEditData({ ...editData, name: text })}
                placeholder="Enter your name"
                placeholderTextColor="#9ca3af"
              />
            ) : (
              <Text style={styles.fieldValue}>{user?.name || 'Not set'}</Text>
            )}
          </View>

          {/* Email (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            <Text style={styles.fieldValue}>{user?.email || 'Not set'}</Text>
            <Text style={styles.fieldNote}>Email cannot be changed</Text>
          </View>

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editData.phone}
                onChangeText={(text) => setEditData({ ...editData, phone: text })}
                placeholder="Enter your phone number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.fieldValue}>{user?.phone || 'Not set'}</Text>
            )}
          </View>

          {/* Address (for Donors) */}
          {(user?.role === 'donor' || isEditing) && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Address</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editData.address}
                  onChangeText={(text) => setEditData({ ...editData, address: text })}
                  placeholder="Enter your address"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={2}
                />
              ) : (
                <Text style={styles.fieldValue}>{user?.address || 'Not set'}</Text>
              )}
            </View>
          )}

          {/* Member Since */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Member Since</Text>
            <Text style={styles.fieldValue}>{formatDate(user?.createdAt)}</Text>
          </View>
        </View>

        {/* Organization Section (Campaign Creators Only) */}
        {(user?.role === 'campaign_creator' || (isEditing && editData.organization)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Organization Details</Text>
            
            {/* Organization Name */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Organization Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={editData.organization}
                  onChangeText={(text) => setEditData({ ...editData, organization: text })}
                  placeholder="Enter organization name"
                  placeholderTextColor="#9ca3af"
                />
              ) : (
                <Text style={styles.fieldValue}>{user?.organization || 'Not set'}</Text>
              )}
            </View>

            {/* Description */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Description</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editData.description}
                  onChangeText={(text) => setEditData({ ...editData, description: text })}
                  placeholder="Describe your organization"
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                />
              ) : (
                <Text style={styles.fieldValue}>{user?.description || 'No description'}</Text>
              )}
            </View>

            {/* License Number (Read-only) */}
            {user?.organizationLicenseNumber && (
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>License Number</Text>
                <Text style={styles.fieldValue}>{user.organizationLicenseNumber}</Text>
              </View>
            )}

            {/* Rejection Reason (if rejected) */}
            {user?.approvalStatus === 'rejected' && user?.rejectionReason && (
              <View style={styles.rejectionContainer}>
                <Text style={styles.rejectionTitle}>⚠️ Rejection Reason</Text>
                <Text style={styles.rejectionText}>{user.rejectionReason}</Text>
              </View>
            )}
          </View>
        )}

        {/* Save Button (when editing) */}
        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Activity Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity Statistics</Text>
          
          {/* Donor Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.donationsMade}</Text>
              <Text style={styles.statLabel}>Donations Made</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>Ξ {stats.totalDonated.toFixed(4)}</Text>
              <Text style={styles.statLabel}>Total Donated</Text>
            </View>
          </View>

          {/* Campaign Creator Stats */}
          {user?.role === 'campaign_creator' && (
            <>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.campaignsCreated}</Text>
                  <Text style={styles.statLabel}>Campaigns Created</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>Ξ {stats.totalRaised.toFixed(4)}</Text>
                  <Text style={styles.statLabel}>Total Raised</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.totalContributors}</Text>
                  <Text style={styles.statLabel}>Total Contributors</Text>
                </View>
                <View style={[styles.statCard, styles.statCardSmall]}>
                  <View style={styles.campaignStatusRow}>
                    <Text style={styles.statusDot}>🟢</Text>
                    <Text style={styles.statusText}>{stats.approvedCampaigns} Approved</Text>
                  </View>
                  <View style={styles.campaignStatusRow}>
                    <Text style={styles.statusDot}>🟡</Text>
                    <Text style={styles.statusText}>{stats.pendingCampaigns} Pending</Text>
                  </View>
                  <View style={styles.campaignStatusRow}>
                    <Text style={styles.statusDot}>🔴</Text>
                    <Text style={styles.statusText}>{stats.rejectedCampaigns} Rejected</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Account Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Account Status</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: user?.status === 'active' ? '#d1fae5' : '#fee2e2' }
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: user?.status === 'active' ? '#10b981' : '#ef4444' }
              ]}>
                {user?.status === 'active' ? '✓ Active' : '⚠ Restricted'}
              </Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Role</Text>
            <Text style={styles.statusValue}>{roleInfo.text}</Text>
          </View>

          {user?.role === 'campaign_creator' && (
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Approval Status</Text>
              <View style={[
                styles.statusBadge,
                { backgroundColor: (approvalBadge?.color || '#9ca3af') + '20' }
              ]}>
                <Text style={[
                  styles.statusBadgeText,
                  { color: approvalBadge?.color || '#9ca3af' }
                ]}>
                  {approvalBadge?.icon} {approvalBadge?.text || 'Unknown'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity 
            style={styles.dashboardItem}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <View style={styles.dashboardIconContainer}>
              <Text style={styles.dashboardIcon}>📊</Text>
            </View>
            <View style={styles.dashboardContent}>
              <Text style={styles.dashboardText}>Go to Dashboard</Text>
              <Text style={styles.dashboardSubtext}>View your stats and activity</Text>
            </View>
            <Text style={styles.settingsArrow}>›</Text>
          </TouchableOpacity>

          {user?.role === 'campaign_creator' && (
            <TouchableOpacity 
              style={styles.dashboardItem}
              onPress={() => navigation.navigate('CampaignCreation')}
            >
              <View style={[styles.dashboardIconContainer, { backgroundColor: '#dbeafe' }]}>
                <Text style={styles.dashboardIcon}>➕</Text>
              </View>
              <View style={styles.dashboardContent}>
                <Text style={styles.dashboardText}>Create Campaign</Text>
                <Text style={styles.dashboardSubtext}>Start a new fundraising campaign</Text>
              </View>
              <Text style={styles.settingsArrow}>›</Text>
            </TouchableOpacity>
          )}

          {user?.role === 'campaign_creator' && (
            <TouchableOpacity 
              style={styles.dashboardItem}
              onPress={() => navigation.navigate('WithdrawFunds')}
            >
              <View style={[styles.dashboardIconContainer, { backgroundColor: '#d1fae5' }]}>
                <Text style={styles.dashboardIcon}>💰</Text>
              </View>
              <View style={styles.dashboardContent}>
                <Text style={styles.dashboardText}>Withdraw Funds</Text>
                <Text style={styles.dashboardSubtext}>Withdraw from your campaigns</Text>
              </View>
              <Text style={styles.settingsArrow}>›</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.dashboardItem}
            onPress={() => navigation.navigate('Explore')}
          >
            <View style={[styles.dashboardIconContainer, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.dashboardIcon}>🔍</Text>
            </View>
            <View style={styles.dashboardContent}>
              <Text style={styles.dashboardText}>Explore Campaigns</Text>
              <Text style={styles.dashboardSubtext}>Discover causes to support</Text>
            </View>
            <Text style={styles.settingsArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Wallet Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🦊 MetaMask Wallet</Text>
          
          {walletConnected ? (
            <>
              {/* Connected State */}
              <View style={styles.walletConnectedContainer}>
                <View style={styles.walletStatusRow}>
                  <View style={styles.walletConnectedBadge}>
                    <Text style={styles.walletConnectedDot}>●</Text>
                    <Text style={styles.walletConnectedText}>Connected</Text>
                  </View>
                </View>

                {/* Wallet Address */}
                <View style={styles.walletInfoCard}>
                  <Text style={styles.walletInfoLabel}>Wallet Address</Text>
                  <Text style={styles.walletAddress}>
                    {formatAddress ? formatAddress(walletAddress) : walletAddress}
                  </Text>
                  <TouchableOpacity 
                    style={styles.copyButton}
                    onPress={() => {
                      // In a real app, you'd use Clipboard API
                      Alert.alert('Address Copied', walletAddress);
                    }}
                  >
                    <Text style={styles.copyButtonText}>📋 Copy Full Address</Text>
                  </TouchableOpacity>
                </View>

                {/* Balance */}
                <View style={styles.walletBalanceCard}>
                  <Text style={styles.walletBalanceLabel}>Balance</Text>
                  <Text style={styles.walletBalanceValue}>
                    Ξ {walletBalance ? parseFloat(walletBalance).toFixed(4) : '0.0000'}
                  </Text>
                  <Text style={styles.walletBalanceSubtext}>ETH (Ethereum)</Text>
                </View>

                {/* Disconnect Button */}
                <TouchableOpacity 
                  style={styles.disconnectButton}
                  onPress={() => {
                    Alert.alert(
                      'Disconnect Wallet',
                      'Are you sure you want to disconnect your MetaMask wallet?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Disconnect', 
                          style: 'destructive',
                          onPress: disconnectWallet 
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.disconnectButtonText}>Disconnect Wallet</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Not Connected State */}
              <View style={styles.walletNotConnectedContainer}>
                <View style={styles.walletIconContainer}>
                  <Text style={styles.walletBigIcon}>🦊</Text>
                </View>
                <Text style={styles.walletTitle}>Connect Your Wallet</Text>
                <Text style={styles.walletDescription}>
                  Connect your MetaMask wallet to donate to campaigns, track transactions, 
                  and manage your ETH securely on the Ethereum blockchain.
                </Text>

                {/* Features */}
                <View style={styles.walletFeatures}>
                  <View style={styles.walletFeatureItem}>
                    <Text style={styles.walletFeatureIcon}>🔒</Text>
                    <Text style={styles.walletFeatureText}>Secure & Private</Text>
                  </View>
                  <View style={styles.walletFeatureItem}>
                    <Text style={styles.walletFeatureIcon}>⚡</Text>
                    <Text style={styles.walletFeatureText}>Fast Transactions</Text>
                  </View>
                  <View style={styles.walletFeatureItem}>
                    <Text style={styles.walletFeatureIcon}>📊</Text>
                    <Text style={styles.walletFeatureText}>Track Donations</Text>
                  </View>
                </View>

                {/* Connect Button */}
                <TouchableOpacity 
                  style={[styles.connectWalletButton, walletConnecting && styles.buttonDisabled]}
                  onPress={connectWallet}
                  disabled={walletConnecting}
                >
                  {walletConnecting ? (
                    <View style={styles.connectingRow}>
                      <ActivityIndicator color="#ffffff" size="small" />
                      <Text style={styles.connectWalletButtonText}>  Connecting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.connectWalletButtonText}>🦊 Connect MetaMask</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.walletNote}>
                  Don't have MetaMask?{' '}
                  <Text style={styles.walletNoteLink}>Download here</Text>
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Funderr v1.0.0</Text>

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  editButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
  },
  cancelButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#14b8a6',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  approvalBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  approvalText: {
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    marginTop: -10,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorBannerText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  retryText: {
    color: '#14b8a6',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  section: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 16,
    color: '#1f2937',
  },
  fieldNote: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  rejectionContainer: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 6,
  },
  rejectionText: {
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#14b8a6',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statCardSmall: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14b8a6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  campaignStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  statusDot: {
    fontSize: 10,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingsIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  settingsText: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  settingsArrow: {
    fontSize: 20,
    color: '#9ca3af',
  },
  dashboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dashboardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dashboardIcon: {
    fontSize: 20,
  },
  dashboardContent: {
    flex: 1,
  },
  dashboardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  dashboardSubtext: {
    fontSize: 13,
    color: '#6b7280',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 16,
  },
  // Wallet Styles
  walletConnectedContainer: {
    marginTop: 4,
  },
  walletStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  walletConnectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  walletConnectedDot: {
    color: '#10b981',
    fontSize: 10,
    marginRight: 6,
  },
  walletConnectedText: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 14,
  },
  walletInfoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  walletInfoLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 8,
  },
  walletAddress: {
    fontSize: 15,
    fontFamily: 'monospace',
    color: '#1f2937',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  copyButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  walletBalanceCard: {
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
  },
  walletBalanceLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  walletBalanceValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  walletBalanceSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  disconnectButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  walletNotConnectedContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  walletIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletBigIcon: {
    fontSize: 40,
  },
  walletTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  walletDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  walletFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 24,
  },
  walletFeatureItem: {
    alignItems: 'center',
  },
  walletFeatureIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  walletFeatureText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  connectWalletButton: {
    backgroundColor: '#f6851b',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#f6851b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  connectWalletButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletNote: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  walletNoteLink: {
    color: '#f6851b',
    fontWeight: '600',
  },
});

export default ProfileScreen;
