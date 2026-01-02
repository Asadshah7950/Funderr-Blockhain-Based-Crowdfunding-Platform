/**
 * Mobile Home Screen
 * Main dashboard with funding banner, campaign listings, and sidebar drawer
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  ActivityIndicator,
  TextInput,
  Animated,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ApiService } from '../services/ApiService';

const { width, height } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

// Sidebar Menu Items
const menuItems = [
  { id: 'createFund', label: 'Create Fund', icon: 'add-circle-outline', screen: 'CampaignCreation' },
  { id: 'wallet', label: 'Wallet', icon: 'wallet-outline', screen: 'Wallet' },
  { id: 'profile', label: 'Profile', icon: 'person-outline', screen: 'Profile' },
  { id: 'settings', label: 'Settings', icon: 'settings-outline', hasSubmenu: true },
  { id: 'history', label: 'History', icon: 'time-outline', screen: 'History' },
  { id: 'payment', label: 'Payment', icon: 'card-outline', screen: 'Payment', requiresCreator: true },
  { id: 'help', label: 'Help & FAQ', icon: 'help-circle-outline', screen: 'Help' },
];

// Settings Submenu Items
const settingsSubMenu = [
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline' },
  { id: 'security', label: 'Security & Privacy', icon: 'lock-closed-outline' },
  { id: 'paymentMethods', label: 'Payment Methods', icon: 'card-outline' },
  { id: 'helpSupport', label: 'Help & Support', icon: 'help-circle-outline' },
  { id: 'terms', label: 'Terms & Conditions', icon: 'document-text-outline' },
];

// Sidebar Drawer Component
const SidebarDrawer = ({ visible, onClose, navigation, user, userRole, onLogout }) => {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleMenuPress = (item) => {
    // Handle Settings - toggle submenu
    if (item.id === 'settings') {
      setSettingsExpanded(!settingsExpanded);
      return;
    }

    // Handle Payment - only for campaign creators
    if (item.id === 'payment') {
      if (userRole !== 'campaign_creator') {
        Alert.alert(
          'Access Restricted',
          'Only campaign creators can access payment/withdrawal features. As a donor, you can view your donation history in the History section.',
          [{ text: 'OK' }]
        );
        return;
      }
      // Navigate to WithdrawFunds for creators
      onClose();
      setTimeout(() => {
        navigation.navigate('WithdrawFunds');
      }, 300);
      return;
    }

    onClose();
    setSettingsExpanded(false);
    setTimeout(() => {
      if (item.screen) {
        navigation.navigate(item.screen);
      }
    }, 300);
  };

  const handleSettingsSubMenuPress = (subItem) => {
    // Handle each settings submenu item
    switch (subItem.id) {
      case 'notifications':
        onClose();
        setSettingsExpanded(false);
        setTimeout(() => navigation.navigate('Notifications'), 300);
        break;
      case 'security':
        Alert.alert('Security & Privacy', 'Security settings including password change and 2FA will be available soon.');
        break;
      case 'paymentMethods':
        onClose();
        setSettingsExpanded(false);
        setTimeout(() => navigation.navigate('Wallet'), 300);
        break;
      case 'helpSupport':
        onClose();
        setSettingsExpanded(false);
        setTimeout(() => navigation.navigate('Help'), 300);
        break;
      case 'terms':
        Alert.alert('Terms & Conditions', 'By using Funderr, you agree to our terms of service. Visit our website for full details.');
        break;
      default:
        break;
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: () => {
            onClose();
            onLogout();
          }
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.drawerOverlay}>
        <TouchableOpacity 
          style={styles.drawerBackdrop} 
          activeOpacity={1} 
          onPress={onClose}
        />
        <Animated.View 
          style={[
            styles.drawerContainer,
            { transform: [{ translateX: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={['#0d9488', '#14b8a6', '#0f766e']}
            style={styles.drawerGradient}
          >
            <SafeAreaView style={styles.drawerContent}>
              {/* Back Button */}
              <TouchableOpacity style={styles.drawerBackButton} onPress={onClose}>
                <Text style={styles.drawerBackText}>Back</Text>
              </TouchableOpacity>

              {/* User Profile Section */}
              <View style={styles.userSection}>
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ 
                      uri: user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&q=80' 
                    }}
                    style={styles.avatar}
                  />
                </View>
                <Text style={styles.userName}>{user?.name || 'David William'}</Text>
                <Text style={styles.userEmail}>{user?.email || 'hellobesnik@gmail.com'}</Text>
              </View>

              {/* Menu Items */}
              <ScrollView style={styles.menuSection} showsVerticalScrollIndicator={false}>
                {menuItems.map((item) => (
                  <View key={item.id}>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleMenuPress(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name={item.icon} size={22} color="#ffffff" />
                      <Text style={styles.menuItemText}>{item.label}</Text>
                      {item.hasSubmenu && (
                        <Ionicons 
                          name={settingsExpanded ? 'chevron-up' : 'chevron-down'} 
                          size={18} 
                          color="#ffffff" 
                          style={styles.submenuArrow}
                        />
                      )}
                    </TouchableOpacity>
                    
                    {/* Settings Submenu */}
                    {item.id === 'settings' && settingsExpanded && (
                      <View style={styles.submenuContainer}>
                        {settingsSubMenu.map((subItem) => (
                          <TouchableOpacity
                            key={subItem.id}
                            style={styles.submenuItem}
                            onPress={() => handleSettingsSubMenuPress(subItem)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name={subItem.icon} size={18} color="rgba(255,255,255,0.8)" />
                            <Text style={styles.submenuItemText}>{subItem.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>

              {/* Logout Button */}
              <TouchableOpacity 
                style={styles.logoutButton} 
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={22} color="#ffffff" />
                <Text style={styles.logoutText}>Log Out</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Placeholder images for campaigns without images
const placeholderImages = [
  'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=800&q=80',
  'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80',
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80',
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80',
];

// Category data
const categories = [
  { id: 'All', name: 'All', icon: '⊞', color: '#14b8a6' },
  { id: 'Education', name: 'Education', icon: '📚', color: '#f97316' },
  { id: 'Water', name: 'Water', icon: '🌊', color: '#3b82f6' },
  { id: 'Emergency', name: 'Emergency', icon: '🚨', color: '#ef4444' },
];

const HomeScreen = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Fetch campaigns when screen comes into focus (refreshes after donation)
  useFocusEffect(
    useCallback(() => {
      fetchCampaigns();
      fetchUserData();
      fetchUnreadNotifications();
    }, [])
  );

  // Fetch unread notification count
  const fetchUnreadNotifications = async () => {
    try {
      const response = await ApiService.getUnreadCount();
      if (response.success) {
        setUnreadNotifications(response.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getFeaturedCampaigns(10);
      setCampaigns(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Unable to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const userName = await AsyncStorage.getItem('userName');
      const userEmail = await AsyncStorage.getItem('userEmail');
      const userAvatar = await AsyncStorage.getItem('userAvatar');
      const role = await AsyncStorage.getItem('userRole');
      
      setUserRole(role);
      
      if (userName || userEmail) {
        setUser({
          name: userName || 'User',
          email: userEmail || '',
          avatar: userAvatar || null,
        });
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'userId', 'userName', 'userEmail', 'userAvatar']);
      navigation.reset({
        index: 0,
        routes: [{ name: 'SignIn' }],
      });
    } catch (err) {
      console.error('Error logging out:', err);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  // Filter campaigns by category and search query
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesCategory = selectedCategory === 'All' || 
      campaign.category?.toLowerCase() === selectedCategory.toLowerCase();
    
    const matchesSearch = searchQuery.trim() === '' ||
      campaign.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.creatorName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery(''); // Clear search when closing
    }
  };

  const openDrawer = () => {
    setDrawerVisible(true);
  };

  const closeDrawer = () => {
    setDrawerVisible(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Sidebar Drawer */}
      <SidebarDrawer
        visible={drawerVisible}
        onClose={closeDrawer}
        navigation={navigation}
        user={user}
        userRole={userRole}
        onLogout={handleLogout}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.menuButton} onPress={openDrawer}>
            <View style={styles.menuIcon}>
              <View style={styles.menuLine} />
              <View style={[styles.menuLine, styles.menuLineShort]} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerRightActions}>
            {/* Notification Bell */}
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={22} color="#14b8a6" />
              {unreadNotifications > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            
            {/* Search Button */}
            <TouchableOpacity 
              style={[styles.searchButton, showSearch && styles.searchButtonActive]}
              onPress={toggleSearch}
            >
              <Ionicons 
                name={showSearch ? "close" : "search"} 
                size={22} 
                color={showSearch ? "#ffffff" : "#14b8a6"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={styles.searchBarContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={20} color="#6b7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search campaigns..."
                placeholderTextColor="#9ca3af"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color="#6b7280" />
                </TouchableOpacity>
              )}
            </View>
            {searchQuery.length > 0 && (
              <Text style={styles.searchResultsText}>
                {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'result' : 'results'} found
              </Text>
            )}
          </View>
        )}

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Funding Banner */}
          <View style={styles.bannerContainer}>
            <LinearGradient
              colors={['#0d9488', '#14b8a6', '#5eead4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              {/* Decorative circles */}
              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
              
              <Text style={styles.bannerTitle}>Start Your</Text>
              <Text style={styles.bannerTitle}>Own Funding</Text>
              <Text style={styles.bannerSubtitle}>Crate Your Own Dono Post</Text>
              
              <TouchableOpacity 
                style={styles.startNowButton}
                onPress={() => navigation.navigate('CampaignCreation')}
                activeOpacity={0.8}
              >
                <Text style={styles.startNowText}>Start Now</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => setSelectedCategory(category.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.categoryIconContainer,
                  selectedCategory === category.id && styles.categoryIconActive,
                  { backgroundColor: selectedCategory === category.id ? category.color : '#f1f5f9' }
                ]}>
                  <Text style={[
                    styles.categoryIcon,
                    selectedCategory === category.id && styles.categoryIconTextActive
                  ]}>
                    {category.icon}
                  </Text>
                </View>
                <Text style={[
                  styles.categoryName,
                  selectedCategory === category.id && styles.categoryNameActive
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Popular Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#14b8a6" />
              <Text style={styles.loadingText}>Loading campaigns...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchCampaigns}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Campaign Cards */}
          {!loading && !error && (
            <View style={styles.campaignsContainer}>
              {filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign, index) => {
                  const progress = campaign.goal > 0 ? (campaign.amountRaised / campaign.goal) * 100 : 0;
                  const imageUrl = campaign.imageKey || placeholderImages[index % placeholderImages.length];
                  
                  return (
                    <TouchableOpacity
                      key={campaign._id}
                      style={styles.campaignCard}
                      onPress={() => navigation.navigate('CampaignDetails', { id: campaign._id })}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.campaignImage}
                        resizeMode="cover"
                      />
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{campaign.category || 'Campaign'}</Text>
                      </View>
                      <View style={styles.campaignInfo}>
                        <Text style={styles.campaignTitle} numberOfLines={2}>{campaign.title}</Text>
                        <Text style={styles.campaignAuthor}>By {campaign.creatorName || 'Anonymous'}</Text>
                        
                        {/* Progress Bar */}
                        <View style={styles.progressBarContainer}>
                          <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
                          </View>
                          <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
                        </View>
                        
                        <View style={styles.campaignStats}>
                          <Text style={styles.raisedAmount}>Ξ{(campaign.amountRaised || 0).toFixed(2)} Raised</Text>
                          <Text style={styles.targetAmount}>Goal - Ξ{(campaign.goal || 0).toFixed(1)}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No campaigns found</Text>
                  <Text style={styles.emptySubtext}>Try selecting a different category</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  safeArea: {
    flex: 1,
  },
  // Drawer Styles
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
  },
  drawerGradient: {
    flex: 1,
  },
  drawerContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  drawerBackButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  drawerBackText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  userSection: {
    marginBottom: 40,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  menuSection: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 16,
    flex: 1,
  },
  submenuArrow: {
    marginLeft: 'auto',
  },
  submenuContainer: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 8,
    marginLeft: 20,
    marginBottom: 8,
    paddingVertical: 4,
  },
  submenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  submenuItemText: {
    fontSize: 14,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 30,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 16,
  },
  // Header Styles
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
  },
  menuLine: {
    width: 20,
    height: 2.5,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  menuLineShort: {
    width: 14,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  searchResultsText: {
    marginTop: 8,
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  bannerContainer: {
    marginTop: 10,
    marginBottom: 24,
  },
  banner: {
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  decorCircle1: {
    width: 120,
    height: 120,
    top: -30,
    right: -20,
  },
  decorCircle2: {
    width: 80,
    height: 80,
    bottom: -20,
    right: 60,
  },
  bannerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 32,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 6,
    marginBottom: 18,
  },
  startNowButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  startNowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  categoriesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  categoryItem: {
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconActive: {
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  categoryIcon: {
    fontSize: 22,
    color: '#64748b',
  },
  categoryIconTextActive: {
    color: '#ffffff',
  },
  categoryName: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  categoryNameActive: {
    color: '#1e293b',
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  seeAllText: {
    fontSize: 14,
    color: '#14b8a6',
    fontWeight: '600',
  },
  campaignsContainer: {
    gap: 16,
  },
  campaignCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  campaignImage: {
    width: '100%',
    height: 160,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#14b8a6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  campaignInfo: {
    padding: 16,
  },
  campaignTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  campaignAuthor: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 12,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14b8a6',
  },
  campaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  raisedAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  targetAmount: {
    fontSize: 13,
    color: '#64748b',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#14b8a6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#94a3b8',
  },
});

export default HomeScreen;
