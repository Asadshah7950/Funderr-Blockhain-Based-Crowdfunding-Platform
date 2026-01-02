import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  SafeAreaView,
  Alert,
  Platform,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
  ImageBackground
} from 'react-native';

const { width, height } = Dimensions.get('window');
import { LinearGradient } from 'expo-linear-gradient';
import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { donate, getContract, donateToContract, withdrawFromContract, getCampaignRaised } from '../blockchain/contract';
import TransactionModal from '../components/TransactionModal';

const CROWDFUNDING_QUOTE =
  'Small contributions create extraordinary change';



// Define image paths (will be dynamically loaded)
const imageMapping = {
  // General UI images
  mainpage: require('../assets/mainpage.jpg'),
  bg: require('../assets/bg.jpg'),
  roleSelection: require('../assets/RoleSelection.jpg'),
  mute: require('../assets/Mute.jpg'),
  dad: require('../assets/Dad.jpg'),
  vet: require('../assets/vet.jpeg'),
  // Category images for explore screen
  water: require('../assets/Water.jpg'),
  education: require('../assets/Book for kids.jpg'),
  emergency: require('../assets/Disaster.jpeg'),
  art: require('../assets/Arts education.jpg'),
  health: require('../assets/Aid.jpg'),
  sports: require('../assets/Youth sport.jpg'),
  food: require('../assets/Community garden.jpeg'),
};

// Define campaigns with image keys instead of direct references
// Trending campaigns from backend
// ...existing code...

// Helper function to get category image
const getCategoryImage = (category) => {
  if (!category) return imageMapping.mainpage;
  const categoryKey = category.toLowerCase().trim();
  
  // Direct match first
  if (imageMapping[categoryKey]) {
    return imageMapping[categoryKey];
  }
  
  // Fuzzy matching for common variations
  if (categoryKey.includes('water') || categoryKey.includes('clean')) return imageMapping.water;
  if (categoryKey.includes('education') || categoryKey.includes('school') || categoryKey.includes('learning')) return imageMapping.education;
  if (categoryKey.includes('emergency') || categoryKey.includes('disaster') || categoryKey.includes('relief')) return imageMapping.emergency;
  if (categoryKey.includes('art') || categoryKey.includes('culture') || categoryKey.includes('creative')) return imageMapping.art;
  if (categoryKey.includes('health') || categoryKey.includes('medical') || categoryKey.includes('healthcare')) return imageMapping.health;
  if (categoryKey.includes('sport') || categoryKey.includes('athletic') || categoryKey.includes('fitness')) return imageMapping.sports;
  if (categoryKey.includes('food') || categoryKey.includes('nutrition') || categoryKey.includes('hunger')) return imageMapping.food;
  
  // Default fallback to ensure we always return an image
  return imageMapping.mainpage;
};

// Helper function to get category icon name
const getCategoryIcon = (category) => {
  if (!category) return 'category';
  const categoryKey = category.toLowerCase().trim();
  
  if (categoryKey.includes('water') || categoryKey.includes('clean')) return 'water-drop';
  if (categoryKey.includes('education') || categoryKey.includes('school') || categoryKey.includes('learning')) return 'school';
  if (categoryKey.includes('emergency') || categoryKey.includes('disaster') || categoryKey.includes('relief')) return 'warning';
  if (categoryKey.includes('art') || categoryKey.includes('culture') || categoryKey.includes('creative')) return 'palette';
  if (categoryKey.includes('health') || categoryKey.includes('medical') || categoryKey.includes('healthcare')) return 'medical-services';
  if (categoryKey.includes('sport') || categoryKey.includes('athletic') || categoryKey.includes('fitness')) return 'sports-soccer';
  if (categoryKey.includes('food') || categoryKey.includes('nutrition') || categoryKey.includes('hunger')) return 'restaurant';
  
  return 'category';
};

// Helper function to get consistent campaign image (used by both cards and modal)
const getCampaignImageSource = (campaign, isExplore = false) => {
  let imageSource;
  
  if (isExplore) {
    // For explore cards, always use category image
    imageSource = getCategoryImage(campaign.category);
    console.log(`Explore card - Campaign: ${campaign.title}, Category: ${campaign.category}, Image:`, imageSource);
  } else {
    // For regular cards and modal, try campaign imageKey first, then fallback to category image
    try {
      if (campaign.imageKey && imageMapping[campaign.imageKey]) {
        imageSource = imageMapping[campaign.imageKey];
        console.log(`Using campaign imageKey: ${campaign.imageKey} for ${campaign.title}`);
      } else {
        imageSource = getCategoryImage(campaign.category);
        console.log(`Using category image for ${campaign.title}, Category: ${campaign.category}`);
      }
    } catch (e) {
      console.warn(`Error loading image for campaign: ${campaign.title}`, e);
      imageSource = getCategoryImage(campaign.category);
    }
  }
  
  // Final safety check to ensure we have a valid image source
  if (!imageSource) {
    console.warn(`No image source found for campaign: ${campaign.title}, using mainpage fallback`);
    imageSource = imageMapping.mainpage;
  }
  
  return imageSource;
};

const UserInterface = ({ navigation }) => {
  // Fetch trending campaigns (approved only)
  useEffect(() => {
    const fetchTrendingCampaigns = async () => {
      try {
        const campaigns = await ApiService.listCampaigns('approved');
        // apply overrides from AsyncStorage
        try {
          const overridesRaw = await AsyncStorage.getItem('campaignOverrides');
          const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
          const applied = (campaigns || []).filter(c => {
            const id = c._id || c.id;
            const ov = overrides[id];
            return !(ov && ov.deleted);
          }).map(c => {
            const id = c._id || c.id;
            const ov = overrides[id];
            if (ov && typeof ov.raised === 'number') return { ...c, raised: ov.raised };
            return c;
          });
          setTrendingCampaigns(applied);
          setCampaignOverrides(overrides || {});
        } catch (e) {
          console.warn('Failed to apply campaign overrides', e);
          setTrendingCampaigns(campaigns);
        }
      } catch (error) {
        console.error('Error fetching trending campaigns:', error);
      }
    };
    fetchTrendingCampaigns();
  }, []);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [userCampaigns, setUserCampaigns] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);
  const [profileFocused, setProfileFocused] = useState(false);
  const [showExplore, setShowExplore] = useState(false);
  const [trendingCampaigns, setTrendingCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');
  const [showDonationConfirm, setShowDonationConfirm] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalTitle, setErrorModalTitle] = useState('');
  const [errorModalMessage, setErrorModalMessage] = useState('');
  const [errorModalIcon, setErrorModalIcon] = useState('error-outline');
  const [donatedCampaigns, setDonatedCampaigns] = useState([]);
  const [campaignOverrides, setCampaignOverrides] = useState({}); // { [id]: { raised?: number, deleted?: true } }
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  // Accountability / Spendings state
  const [showSpendingsModal, setShowSpendingsModal] = useState(false);
  const [campaignSpendings, setCampaignSpendings] = useState([]);
  const [spendingsLoading, setSpendingsLoading] = useState(false);
  const [spendingsTotalSpent, setSpendingsTotalSpent] = useState(0);
  const [spendingsRemainingFunds, setSpendingsRemainingFunds] = useState(0);
  // Add Spending form state (for campaign creators)
  const [showAddSpendingModal, setShowAddSpendingModal] = useState(false);
  const [spendingDescription, setSpendingDescription] = useState('');
  const [spendingAmount, setSpendingAmount] = useState('');
  const [spendingCategory, setSpendingCategory] = useState('General');
  const [spendingReceipt, setSpendingReceipt] = useState(null);
  const [addSpendingLoading, setAddSpendingLoading] = useState(false);
  // Wallet connection state
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletProviderType, setWalletProviderType] = useState(null); // 'injected' | 'walletconnect' | null
  const [ethersProvider, setEthersProvider] = useState(null);
  const [ethersSigner, setEthersSigner] = useState(null);
  const [signedMessage, setSignedMessage] = useState(null);
  // Transaction modal states (like mobile app)
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txStatus, setTxStatus] = useState('waiting'); // waiting, confirming, success, error
  const [txHash, setTxHash] = useState(null);
  const [txError, setTxError] = useState(null);
  const [txAmount, setTxAmount] = useState('');
  const [txCampaignTitle, setTxCampaignTitle] = useState('');
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // success, error, warning, info
  const toastAnimation = useRef(new Animated.Value(0)).current;
  // Extract the route name to determine which tab we're on
  const activeRoute = useRoute();
  // Listen for navigation params to trigger campaign refresh
  useFocusEffect(
    React.useCallback(() => {
      if (activeRoute?.params?.refreshCampaigns && userProfile && userProfile.id) {
        const fetchUserCampaigns = async () => {
          try {
            const campaigns = await ApiService.getUserCampaigns(userProfile.id);
            // apply any local overrides
            try {
              const overridesRaw = await AsyncStorage.getItem('campaignOverrides');
              const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
              const applied = (campaigns || []).filter(c => {
                const id = c._id || c.id;
                const ov = overrides[id];
                return !(ov && ov.deleted);
              }).map(c => {
                const id = c._id || c.id;
                const ov = overrides[id];
                if (ov && typeof ov.raised === 'number') return { ...c, raised: ov.raised };
                return c;
              });
              setUserCampaigns(applied);
            } catch (e) {
              console.warn('Failed to apply campaign overrides to user campaigns', e);
              setUserCampaigns(campaigns);
            }
          } catch (error) {
            console.error('Error refreshing user campaigns:', error);
          }
        };
        fetchUserCampaigns();
      }
    }, [activeRoute?.params?.refreshCampaigns, userProfile])
  );
  const [activeTab, setActiveTab] = useState('trending');
  const [search, setSearch] = useState('');
  useFocusEffect(
    React.useCallback(() => {
      const loadUserData = async () => {
        try {
          // Get stored profile data
          const profileData = await AsyncStorage.getItem('userProfile');
          if (profileData) {
            let parsedProfile = JSON.parse(profileData);
            // Ensure id is set from _id if missing
            if (!parsedProfile.id && parsedProfile._id) {
              parsedProfile.id = parsedProfile._id;
            }
            // Load donated campaigns for this user if any
            try {
              const key = `donatedCampaigns:${parsedProfile.id || parsedProfile._id}`;
              const stored = await AsyncStorage.getItem(key);
              if (stored) setDonatedCampaigns(JSON.parse(stored));
            } catch (e) {
              console.warn('Failed to load donated campaigns', e);
            }
            setUserProfile(parsedProfile);
          } else {
            // Check if we at least have email
            const userEmail = await AsyncStorage.getItem('userEmail');
            if (userEmail) {
              setUserProfile({ email: userEmail });
            }
          }
        } catch (error) {
          console.error('Failed to load user data:', error);
        }
      };
      loadUserData();
      return () => {}; // Cleanup function
    }, [])
  );

  // Fetch user's campaigns when userProfile is set and has a valid id
  useEffect(() => {
    const fetchUserCampaigns = async () => {
      // Try to get userId from AsyncStorage if not in userProfile
      let userId = userProfile?.id;
      if (!userId) {
        userId = await AsyncStorage.getItem('userId');
      }
      
      console.log('Fetching user campaigns for userId:', userId);
      if (userId) {
        try {
          const campaigns = await ApiService.getUserCampaigns(userId);
          console.log('Fetched campaigns:', campaigns);
          setUserCampaigns(campaigns);
        } catch (error) {
          console.error('Error fetching user campaigns:', error);
        }
      } else {
        console.log('No userId available yet, skipping campaign fetch');
      }
    };
    fetchUserCampaigns();
  }, [userProfile]);
// Handle profile view
  // Fetch user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const loadUserData = async () => {
        try {
          // Get user role
          const role = await AsyncStorage.getItem('userRole');
          setUserRole(role);

          // If no role, navigate to RoleSelection (which is in Auth navigator)
          if (!role) {
            navigation.navigate('Auth', { screen: 'RoleSelection' });
            return;
          }
          // Get stored profile data
          const profileData = await AsyncStorage.getItem('userProfile');
          const userId = await AsyncStorage.getItem('userId');
          const userEmail = await AsyncStorage.getItem('userEmail');
          
          if (profileData) {
            let parsedProfile = JSON.parse(profileData);
            if (!parsedProfile.id && parsedProfile._id) {
              parsedProfile.id = parsedProfile._id;
            }
            // Ensure we have userId from AsyncStorage if not in profile
            if (!parsedProfile.id && userId) {
              parsedProfile.id = userId;
            }
            setUserProfile(parsedProfile);
          } else {
            // Create profile from available data
            if (userEmail || userId) {
              setUserProfile({ 
                email: userEmail,
                id: userId 
              });
            }
          }
          // Fetch user's campaigns for notification
          try {
            const currentUserId = userId || (userProfile && userProfile.id);
            if (currentUserId) {
              const campaigns = await ApiService.getUserCampaigns(currentUserId);
              setUserCampaigns(campaigns);
            }
          } catch (error) {
            console.error('Error fetching user campaigns:', error);
          }
        } catch (error) {
          console.error('Failed to load user data:', error);
        }
      };

      loadUserData();
      return () => {}; // Cleanup function
    }, [])
  );// Handle profile view
  const handleProfileOpen = async () => {
    setShowProfile(true);
    setProfileFocused(true);
    setProfileLoading(true);
    setProfileError(null);
    
    try {
      // Use ApiService to get the user profile
      const { ApiService } = require('../services/ApiService');
      const profileData = await ApiService.getUserProfile();
      
      if (profileData) {
        setUserProfile({
          ...profileData,
          avatar: imageMapping.roleSelection,
          // Ensure name is set - use a default if not available
          name: profileData.name || 
                profileData.fullName || 
                (profileData.role === 'donor' ? 'Donor User' : 'Campaign Creator')
        });
      } else {
        throw new Error('Profile not found');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfileError('Profile not found or failed to load.');
      
      // Fallback to basic data from AsyncStorage if API call fails
      try {
        const userEmail = await AsyncStorage.getItem('userEmail');
        const userRole = await AsyncStorage.getItem('userRole');
        
        if (userEmail) {
          setUserProfile({
            email: userEmail,
            name: userRole === 'donor' ? 'Donor User' : 'Campaign Creator',
            role: userRole,
            avatar: imageMapping.roleSelection
          });
          setProfileError(null); // Clear error if we can show something
        }
      } catch (fallbackError) {
        console.error('Fallback profile fetch failed:', fallbackError);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Instead of removing all user data, we'll:
      // 1. Store a backup of important user information
      const userEmail = await AsyncStorage.getItem('userEmail');
      const userRole = await AsyncStorage.getItem('userRole');
      const userProfile = await AsyncStorage.getItem('userProfile');
      
      // 2. Remove authentication token to log out
      await AsyncStorage.removeItem('userToken');
      
      // 3. Store a flag indicating this is a returning user
      await AsyncStorage.setItem('returningUser', 'true');
      
      // 4. Preserve the email for easier login next time
      if (userEmail) {
        await AsyncStorage.setItem('lastEmail', userEmail);
      }
      
      // 5. Store profile data in a backup key
      if (userProfile) {
        await AsyncStorage.setItem('savedUserProfile', userProfile);
      }
      
      // 6. Store user role in a backup key
      if (userRole) {
        await AsyncStorage.setItem('savedUserRole', userRole);
      }
      
      // Navigate to auth stack
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }]
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Logout Failed', 'Please try again');
    }
  };const renderCampaignCard = (campaign, index, isExplore = false) => {
    // Use consistent image source logic for both cards and modal
    const imageSource = getCampaignImageSource(campaign, isExplore);

    if (isExplore) {
      // Render the explore card style with image at top (two per row)
      return (
        <Animatable.View
          key={campaign.id || campaign._id}
          animation="fadeInUp"
          duration={700}
          delay={index * 100}
          style={styles.exploreCardContainer}
        >
          <View style={styles.exploreCard}>
            {/* Campaign Image at Top */}
            <View style={styles.exploreCardImageContainer}>
              <Image 
                source={imageSource}
                style={styles.exploreCardImage}
                resizeMode="cover"
              />
              <View style={styles.exploreCardOverlay}>
                <View style={styles.categoryBadge}>
                  <MaterialIcons 
                    name={getCategoryIcon(campaign.category)} 
                    size={16} 
                    color="#14b8a6" 
                    style={{ marginRight: 4 }} 
                  />
                  <Text style={styles.categoryText}>{campaign.category}</Text>
                </View>
              </View>
            </View>
            
            {/* Campaign Details */}
            <View style={styles.exploreCardContent}>
              <Text style={styles.exploreCardTitle}>{campaign.title}</Text>
              <Text style={styles.exploreCardDesc} numberOfLines={2}>{campaign.desc || campaign.description}</Text>
              
              <View style={styles.fundingInfo}>
                <Text style={styles.fundingAmount}>ETH {(campaign.raised || campaign.amountRaised || 0).toLocaleString()}</Text>
                <Text style={styles.fundingGoal}>of ETH {(campaign.goal || 0).toLocaleString()}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.viewCampaignButton} 
                onPress={() => { setSelectedCampaign(campaign); setShowCampaignModal(true); }}
              >
                <Text style={styles.viewCampaignText}>View Campaign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animatable.View>
      );
    }

    // Standard campaign card for non-explore view
    return (
      <Animatable.View
        key={campaign.id || campaign._id}
        animation="fadeInUp"
        duration={700}
        delay={index * 150} // Staggered animation
      >
        <TouchableOpacity 
          style={styles.campaignCard}
          onPress={() => Alert.alert('Campaign Details', `You selected: ${campaign.title}`)}
          activeOpacity={0.7}
        >
          <Image 
            source={imageSource} 
            style={styles.campaignImage}
            defaultSource={Platform.OS === 'android' ? imageMapping.mainpage : undefined}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.campaignTitle}>{campaign.title}</Text>
            <Text style={styles.campaignDesc}>{campaign.desc || campaign.description}</Text>
            <Text style={styles.campaignDesc}>
              ETH {(campaign.raised || campaign.amountRaised || 0).toLocaleString()} of ETH {(campaign.goal || 0).toLocaleString()}
            </Text>
            <TouchableOpacity style={[styles.viewCampaignButton, {alignSelf: 'flex-start', marginTop: 8}]} onPress={() => { setSelectedCampaign(campaign); setShowCampaignModal(true); }}>
              <Text style={styles.viewCampaignText}>View Campaign</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animatable.View>
    );
  };  // Function to handle campaign creation
  const handleStartCampaign = () => {
    navigation.navigate('CampaignCreation');
  };
  
  // Function to handle exploring campaigns
  const handleExplore = () => {
    setShowExplore(true);
    setActiveTab('trending'); // Default to trending tab when opening explore
  };

  // ===================== NOTIFICATION FUNCTIONS =====================
  
  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    
    // Animate toast in
    Animated.sequence([
      Animated.timing(toastAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.timing(toastAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToastVisible(false);
    });
  };

  // Fetch notifications from API
  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const response = await ApiService.getNotifications();
      console.log('🔔 Notifications response:', response);
      if (response.success) {
        setNotifications(response.notifications || []);
        setUnreadNotificationCount(response.unreadCount || 0);
        console.log('🔔 Loaded', response.notifications?.length || 0, 'notifications');
      } else {
        console.log('⚠️ Notifications response not successful:', response);
      }
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  // Fetch unread notification count
  const fetchUnreadCount = async () => {
    try {
      const response = await ApiService.getUnreadNotificationCount();
      console.log('🔔 Unread count response:', response);
      if (response.success) {
        setUnreadNotificationCount(response.unreadCount || 0);
      }
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
    }
  };

  // Mark notification as read
  const markNotificationAsRead = async (notificationId) => {
    try {
      await ApiService.markNotificationAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadNotificationCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all notifications as read
  const markAllNotificationsAsRead = async () => {
    try {
      await ApiService.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadNotificationCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Handle notification click - navigate to relevant screen
  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await markNotificationAsRead(notification._id);
    }
    
    // Navigate based on notification type
    if (notification.type === 'NEW_DONATION' && notification.data?.campaignId) {
      // Campaign creator received a donation - show campaign details
      setShowNotificationsPanel(false);
      // Find and show the campaign
      const campaign = userCampaigns.find(c => (c._id || c.id) === notification.data.campaignId);
      if (campaign) {
        setSelectedCampaign(campaign);
        setShowCampaignModal(true);
      }
    } else if (notification.type === 'NEW_CAMPAIGN' && notification.data?.campaignId) {
      // Donor notified of new campaign - show explore with that campaign
      setShowNotificationsPanel(false);
      // Fetch and show the campaign
      try {
        const campaign = await ApiService.getCampaignById(notification.data.campaignId);
        if (campaign) {
          setSelectedCampaign(campaign);
          setShowCampaignModal(true);
        }
      } catch (error) {
        console.error('Error fetching campaign:', error);
      }
    }
  };

  // Fetch notifications on mount and periodically
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [userProfile]);

  // ===================== ACCOUNTABILITY / SPENDINGS FUNCTIONS =====================
  
  // Fetch spendings for a campaign
  const fetchCampaignSpendings = async (campaignId) => {
    setSpendingsLoading(true);
    try {
      const data = await ApiService.getCampaignSpendings(campaignId);
      setCampaignSpendings(data.spendings || []);
      const totalSpent = data.totalSpent || 0;
      setSpendingsTotalSpent(totalSpent);
      // Calculate remaining funds from blockchain raised amount (selectedCampaign.raised)
      // not from MongoDB's amountRaised which may be out of sync
      const campaignRaised = selectedCampaign?.raised || selectedCampaign?.amountRaised || data.amountRaised || 0;
      setSpendingsRemainingFunds(Math.max(0, campaignRaised - totalSpent));
    } catch (error) {
      console.error('Error fetching spendings:', error);
      setCampaignSpendings([]);
      setSpendingsTotalSpent(0);
      // Even on error, try to use selectedCampaign.raised if available
      const campaignRaised = selectedCampaign?.raised || selectedCampaign?.amountRaised || 0;
      setSpendingsRemainingFunds(campaignRaised);
    } finally {
      setSpendingsLoading(false);
    }
  };

  // Open spendings modal
  const handleViewSpendings = async () => {
    if (!selectedCampaign) return;
    const campaignId = selectedCampaign._id || selectedCampaign.id;
    await fetchCampaignSpendings(campaignId);
    setShowSpendingsModal(true);
  };

  // Handle adding a new spending record
  const handleAddSpending = async () => {
    if (!selectedCampaign) return;
    
    // Cross-platform alert function
    const showAlert = (title, message) => {
      if (Platform.OS === 'web') {
        window.alert(`${title}\n\n${message}`);
      } else {
        Alert.alert(title, message, [{ text: 'OK' }]);
      }
    };
    
    const amt = parseFloat(spendingAmount);
    if (!spendingDescription.trim()) {
      showAlert('Error', 'Please enter a description');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      showAlert('Error', 'Please enter a valid amount');
      return;
    }
    if (!spendingReceipt) {
      showAlert('Error', 'Please upload a receipt');
      return;
    }

    // Check if campaign has enough funds before uploading
    const campaignRaised = selectedCampaign.raised || selectedCampaign.amountRaised || 0;
    const availableFunds = campaignRaised - spendingsTotalSpent;
    
    if (campaignRaised === 0) {
      showAlert(
        'No Funds Available', 
        'This campaign has not received any donations yet. You cannot add spending records until the campaign receives funds.'
      );
      return;
    }
    
    if (amt > availableFunds) {
      showAlert(
        'Insufficient Funds', 
        `The spending amount (${amt} ETH) exceeds the available funds (${availableFunds.toFixed(4)} ETH).\n\nTotal Raised: ${campaignRaised} ETH\nAlready Spent: ${spendingsTotalSpent.toFixed(4)} ETH\nAvailable: ${availableFunds.toFixed(4)} ETH`
      );
      return;
    }

    setAddSpendingLoading(true);
    try {
      const campaignId = selectedCampaign._id || selectedCampaign.id;
      
      // First upload the receipt
      const formData = new FormData();
      
      // Handle file upload differently for web vs mobile
      if (Platform.OS === 'web' && spendingReceipt.file) {
        // For web, use the actual File object
        formData.append('receipt', spendingReceipt.file, spendingReceipt.name);
      } else {
        // For mobile, use the URI-based approach
        formData.append('receipt', {
          uri: spendingReceipt.uri,
          type: spendingReceipt.type || 'image/jpeg',
          name: spendingReceipt.name || 'receipt.jpg',
        });
      }

      const uploadResponse = await ApiService.uploadSpendingReceipt(formData);
      
      // Then add the spending record
      // Include blockchain raised amount so backend can validate correctly
      const spendingData = {
        description: spendingDescription.trim(),
        amount: amt,
        receiptUrl: uploadResponse.url,
        receiptPublicId: uploadResponse.public_id,
        category: spendingCategory,
        blockchainRaised: campaignRaised, // Send blockchain raised amount for accurate validation
      };

      await ApiService.addSpending(campaignId, spendingData);
      
      // Refresh spendings
      await fetchCampaignSpendings(campaignId);
      
      // Reset form
      setSpendingDescription('');
      setSpendingAmount('');
      setSpendingCategory('General');
      setSpendingReceipt(null);
      setShowAddSpendingModal(false);
      
      if (Platform.OS === 'web') {
        window.alert('Success\n\nSpending record added successfully');
      } else {
        Alert.alert('Success', 'Spending record added successfully');
      }
    } catch (error) {
      console.error('Error adding spending:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add spending record';
      if (Platform.OS === 'web') {
        window.alert(`Error\n\n${errorMessage}`);
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setAddSpendingLoading(false);
    }
  };

  // Pick receipt image - works on both mobile and web
  const pickSpendingReceipt = async () => {
    try {
      // For web platform, use native file input
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            const uri = URL.createObjectURL(file);
            setSpendingReceipt({
              uri: uri,
              type: file.type || 'image/jpeg',
              name: file.name || 'receipt.jpg',
              file: file, // Keep original file for FormData
            });
          }
        };
        
        input.click();
        return;
      }
      
      // For mobile platforms, use expo-image-picker
      const { launchImageLibraryAsync, MediaTypeOptions } = require('expo-image-picker');
      const result = await launchImageLibraryAsync({
        mediaTypes: MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSpendingReceipt({
          uri: result.assets[0].uri,
          type: 'image/jpeg',
          name: 'receipt.jpg',
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Pick receipt document (PDF) - works on both mobile and web
  const pickSpendingDocument = async () => {
    try {
      // For web platform, use native file input
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf,image/*';
        
        input.onchange = (event) => {
          const file = event.target.files[0];
          if (file) {
            // Create a blob URL for the file
            const uri = URL.createObjectURL(file);
            setSpendingReceipt({
              uri: uri,
              type: file.type || 'application/pdf',
              name: file.name || 'receipt.pdf',
              file: file, // Keep original file for FormData
            });
          }
        };
        
        input.click();
        return;
      }
      
      // For mobile platforms, use expo-document-picker
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      console.log('Document picker result:', result);

      if (!result.canceled && result.assets && result.assets[0]) {
        setSpendingReceipt({
          uri: result.assets[0].uri,
          type: result.assets[0].mimeType || 'application/pdf',
          name: result.assets[0].name || 'receipt.pdf',
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  };

  // Store userId in state for creator comparison
  const [currentUserId, setCurrentUserId] = useState(null);
  
  // Load userId on mount
  useEffect(() => {
    const loadUserId = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        if (userId) setCurrentUserId(userId);
      } catch (e) {
        console.log('Failed to load userId:', e);
      }
    };
    loadUserId();
  }, []);

  // Check if current user is the campaign creator
  const isCurrentUserCampaignCreator = () => {
    if (!selectedCampaign) return false;
    const creatorId = selectedCampaign.creatorId;
    
    // Check from multiple sources
    const userId = currentUserId || 
                   (userProfile && (userProfile.id || userProfile._id || userProfile.userId));
    
    if (creatorId && userId) {
      return creatorId.toString() === userId.toString();
    }
    
    return false;
  };

  // Helper function to show error modal
  const showError = (title, message, icon = 'error-outline') => {
    setErrorModalTitle(title);
    setErrorModalMessage(message);
    setErrorModalIcon(icon);
    setShowErrorModal(true);
  };

  // Handle donate button click - show confirmation dialog
  const handleDonateClick = async () => {
    console.log("💰 Donation validation initiated");
    console.log("Current states:", {
      showDonationConfirm,
      selectedCampaign: selectedCampaign?.title,
      donateAmount,
      walletConnected,
      walletAddress
    });
    
    const amt = Number(donateAmount);
    if (!selectedCampaign || !amt || isNaN(amt) || amt <= 0) {
      console.error("❌ Invalid amount validation failed");
      Alert.alert('Invalid Amount', 'Please enter a valid donation amount greater than 0');
      return;
    }
    console.log("✅ Amount validation passed:", amt);
    
    // Step 1: Check if wallet is connected
    if (typeof window === 'undefined' || !window.ethereum) {
      console.error("❌ MetaMask not detected");
      showError(
        'MetaMask Not Found',
        'MetaMask wallet extension is required to make donations.\n\nPlease install MetaMask from metamask.io and refresh the page.',
        'account-balance-wallet'
      );
      return;
    }

    if (!walletConnected || !ethersProvider || !ethersSigner) {
      console.error("❌ Wallet not connected");
      showError(
        'Wallet Not Connected',
        'Please connect your MetaMask wallet before making a donation.\n\nClick the wallet icon in the top-right corner to connect.',
        'link-off'
      );
      return;
    }

    console.log("✅ Wallet connected:", walletAddress);

    const campaignId = selectedCampaign._id || selectedCampaign.id;
    console.log("Campaign ID:", campaignId);
    console.log("Donation amount:", amt);

    // Step 2: Validate campaign goal
    try {
      const goalVal = selectedCampaign && selectedCampaign.goal !== undefined && selectedCampaign.goal !== null ? Number(selectedCampaign.goal) : Infinity;
      const raisedVal = selectedCampaign && selectedCampaign.raised !== undefined && selectedCampaign.raised !== null ? Number(selectedCampaign.raised) : 0;
      const remaining = isFinite(goalVal) ? Math.max(0, goalVal - raisedVal) : Infinity;
      
      if (remaining <= 0) {
        console.error("❌ Campaign fully funded");
        showError(
          'Campaign Fully Funded',
          'This campaign has already reached its funding goal!\n\nThank you for your interest in supporting this cause.',
          'check-circle'
        );
        return;
      }
      
      if (isFinite(remaining) && amt > remaining) {
        console.error(`❌ Amount exceeds remaining: ${amt} > ${remaining}`);
        showError(
          'Amount Exceeds Goal',
          `The donation amount exceeds what's needed.\n\nMaximum you can donate: ${remaining} ETH\nYour entered amount: ${amt} ETH\n\nPlease adjust your donation amount.`,
          'warning'
        );
        return;
      }
      console.log("✅ Campaign goal validation passed");
    } catch (e) {
      console.warn('Failed to validate donation amount against campaign goal', e);
    }

    // Step 3: Check wallet balance
    try {
      console.log("💳 Checking wallet balance...");
      const balance = await ethersProvider.getBalance(walletAddress);
      const balanceInEth = Number(ethers.formatEther(balance));
      setWalletBalance(balanceInEth);
      
      console.log("Wallet balance:", balanceInEth, "ETH");
      console.log("Donation amount:", amt, "ETH");
      
      // Add buffer for gas fees (estimated ~0.001 ETH)
      const requiredAmount = amt + 0.001;
      
      if (balanceInEth < requiredAmount) {
        console.error(`❌ Insufficient balance: ${balanceInEth} < ${requiredAmount}`);
        showError(
          'Insufficient Balance',
          `Your wallet doesn't have enough ETH for this donation.\n\n💰 Your Balance: ${balanceInEth.toFixed(6)} ETH\n💸 Required: ${amt} ETH (donation)\n⛽ Gas Fees: ~0.001 ETH\n\n📊 Total Needed: ${requiredAmount.toFixed(6)} ETH\n❌ Short By: ${(requiredAmount - balanceInEth).toFixed(6)} ETH\n\nPlease add more Sepolia ETH to your wallet.`,
          'account-balance-wallet'
        );
        return;
      }
      
      console.log("✅ Sufficient balance confirmed");
    } catch (balanceError) {
      console.error("❌ Failed to check balance:", balanceError);
      showError(
        'Balance Check Failed',
        `Unable to verify your wallet balance.\n\nError: ${balanceError.message || 'Unknown error'}\n\nPlease check your wallet connection and try again.`,
        'sync-problem'
      );
      return;
    }

    // Step 4: Show confirmation dialog
    console.log("✅ All validations passed, showing confirmation dialog");
    console.log("Selected campaign:", selectedCampaign);
    console.log("Donation amount:", donateAmount);
    console.log("Wallet balance:", walletBalance);
    setShowDonationConfirm(true);
    console.log("📋 Confirmation modal state set to true");
  };

  // Handle closing the transaction modal
  const handleTxModalClose = () => {
    setTxModalVisible(false);
    
    // If successful, close the donate modal too and refresh
    if (txStatus === 'success') {
      setShowCampaignModal(false);
      setDonateAmount('');
    }
    
    // Reset states after a short delay
    setTimeout(() => {
      setTxStatus('waiting');
      setTxHash(null);
      setTxError(null);
    }, 300);
  };

  // Actual donation execution after confirmation with TransactionModal
  const handleDonateConfirmed = async () => {
    console.log("💰 Donation confirmed, executing transaction...");
    setShowDonationConfirm(false);
    
    const amt = Number(donateAmount);
    const campaignId = selectedCampaign._id || selectedCampaign.id;
    const campaignContractAddress = selectedCampaign.campaignContractAddress;

    // Store for modal display
    setTxAmount(amt.toString());
    setTxCampaignTitle(selectedCampaign?.title || 'Campaign');

    // Try blockchain donation first (if wallet connected and on web)
    let blockchainTxHash = null;
    let blockchainSuccess = false;

    if (typeof window !== 'undefined' && window.ethereum && walletConnected && ethersSigner) {
      // Show transaction modal with waiting state
      setTxModalVisible(true);
      setTxStatus('waiting');
      setTxHash(null);
      setTxError(null);

      try {
        console.log("🔗 Web platform detected with wallet connection");
        console.log("Wallet address:", walletAddress);
        console.log("Provider exists:", !!ethersProvider);
        console.log("Signer exists:", !!ethersSigner);
        console.log("Campaign contract address:", campaignContractAddress);
        
        // Verify wallet is on Sepolia before attempting donation
        if (!ethersProvider) {
          console.error("❌ No provider available");
          throw new Error("Provider not initialized");
        }

        const network = await ethersProvider.getNetwork();
        console.log("📡 Network check - Current chainId:", network.chainId, "Expected: 11155111");
        
        if (network.chainId !== 11155111n) {
          console.warn("⚠️ Not on Sepolia! Current chainId:", network.chainId);
          throw new Error(`Wrong network! Please switch to Sepolia testnet. Current chain: ${network.chainId}`);
        }
        
        console.log("✅ Network verified: Sepolia");

        let tx;
        
        // FACTORY PATTERN: Use campaign contract address if available
        if (campaignContractAddress && campaignContractAddress.startsWith('0x')) {
          console.log("🏭 Using Factory Pattern - donating to campaign contract:", campaignContractAddress);
          console.log("📝 Donation amount:", amt, "ETH");
          
          // Use donateToContract which calls the campaign's donateSimple() function
          tx = await donateToContract(ethersSigner, campaignContractAddress, amt);
          console.log("📦 Transaction submitted:", tx);
        } else {
          // Legacy fallback: Use campaign ID (old Funderr.sol contract)
          console.warn("⚠️ No contract address found, using legacy donation method");
          const campaignNumber = typeof campaignId === 'string' ? parseInt(campaignId, 10) : campaignId;
          console.log("📝 Campaign number (legacy):", campaignNumber);
          
          if (isNaN(campaignNumber)) {
            throw new Error(`Invalid campaign ID: ${campaignId}`);
          }
          
          tx = await donate(ethersSigner, campaignNumber, amt);
          console.log("📦 Transaction submitted (legacy):", tx);
        }
        
        if (!tx) {
          throw new Error("No transaction returned from donate function");
        }

        // Extract hash from transaction
        blockchainTxHash = tx.hash || tx.transactionHash;
        console.log("🔍 Transaction hash extracted:", blockchainTxHash);
        
        // Update modal to confirming state with tx hash
        setTxHash(blockchainTxHash);
        setTxStatus('confirming');
        console.log("⏳ Waiting for blockchain confirmation...");
        
        // Wait for transaction confirmation
        const receipt = await tx.wait();
        console.log("✅ Transaction confirmed!", receipt);
        
        blockchainSuccess = true;
        
        console.log('✅ Blockchain donation completed!');
        console.log('Transaction hash:', blockchainTxHash);
        console.log('Block number:', receipt.blockNumber);
        
        // Show success state in modal
        setTxStatus('success');
        setMessage(`✅ Donation sent! Tx: ${blockchainTxHash?.substring(0, 10)}...`);
        setMessageType('success');
        
      } catch (blockchainErr) {
        console.error('❌ Blockchain donation failed:', blockchainErr);
        console.error('Error message:', blockchainErr.message);
        console.error('Error code:', blockchainErr.code);
        
        // Parse error message
        let errorMessage = 'Transaction failed. Please try again.';
        
        if (blockchainErr.code === 4001 || blockchainErr.code === 'ACTION_REJECTED') {
          errorMessage = 'Transaction was rejected in MetaMask.';
        } else if (blockchainErr.code === -32603) {
          errorMessage = 'Insufficient funds for this transaction.';
        } else if (blockchainErr.message?.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds in your wallet.';
        } else if (blockchainErr.message?.includes('user rejected')) {
          errorMessage = 'Transaction was cancelled.';
        } else if (blockchainErr.message) {
          errorMessage = blockchainErr.message.length > 100 
            ? blockchainErr.message.substring(0, 100) + '...' 
            : blockchainErr.message;
        }
        
        setTxError(errorMessage);
        setTxStatus('error');
        setMessage(`⚠️ Blockchain error: ${errorMessage}`);
        setMessageType('warning');
      }
    } else {
      console.log("ℹ️ Skipping blockchain (not web or wallet not connected)");
      console.log("Is window defined:", typeof window !== 'undefined');
      console.log("Has ethereum:", typeof window !== 'undefined' && !!window.ethereum);
      console.log("Wallet connected:", walletConnected);
      console.log("Has signer:", !!ethersSigner);
    }

    // Update backend regardless of blockchain success
    (async () => {
      try {
        console.log("📤 Updating backend with donation...");
        const updatedRemote = await ApiService.updateCampaign(campaignId, { 
          raised: (selectedCampaign.raised || 0) + amt,
          ...(blockchainTxHash && { blockchainTxHash }) // Include tx hash if available
        });

        console.log("✅ Backend updated successfully");
        console.log("New raised amount:", updatedRemote.raised);

        // If updated successfully, apply remote response to local state
        setTrendingCampaigns(prev => prev.map(c => (c._id === campaignId || c.id === campaignId) ? { ...c, raised: updatedRemote.raised } : c).filter(c => (c.raised || 0) < (c.goal || Infinity)));
        setUserCampaigns(prev => prev.map(c => (c._id === campaignId || c.id === campaignId) ? { ...c, raised: updatedRemote.raised } : c).filter(c => (c.raised || 0) < (c.goal || Infinity)));

        // If goal reached or exceeded, delete remotely and locally
        if ((updatedRemote.raised || 0) >= (updatedRemote.goal || Infinity)) {
          try {
            await ApiService.deleteCampaign(campaignId);
            console.log("✅ Campaign deleted (goal reached)");
          } catch (e) {
            console.warn('Failed to delete campaign remotely', e);
          }
          setTrendingCampaigns(prev => prev.filter(c => !(c._id === campaignId || c.id === campaignId)));
          setUserCampaigns(prev => prev.filter(c => !(c._id === campaignId || c.id === campaignId)));
          
          try { 
            Alert.alert('Thank you!', 'This donation completed the campaign.'); 
          } catch (e) { 
            console.log('Alert not available (web fallback)'); 
          }
        }

        // Reconciliation: remove any local override for this campaign since server accepted the change
        try {
          const overridesRaw = await AsyncStorage.getItem('campaignOverrides');
          const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
          if (overrides && (overrides[campaignId] || overrides[campaignId] === 0)) {
            delete overrides[campaignId];
            await AsyncStorage.setItem('campaignOverrides', JSON.stringify(overrides));
            setCampaignOverrides(overrides);
          }
        } catch (e) {
          console.warn('Failed to reconcile campaign override after remote update', e);
        }

      } catch (err) {
        console.warn('Remote update failed, falling back to local update', err);

        // Local fallback: update in-memory
        setTrendingCampaigns(prev => {
          const updated = prev.map(c => {
            if ((c.id && c.id === campaignId) || (c._id && c._id === campaignId)) {
              return { ...c, raised: (c.raised || 0) + amt };
            }
            return c;
          });
          return updated.filter(c => (c.raised || 0) < (c.goal || Infinity));
        });

        setUserCampaigns(prev => {
          const updated = prev.map(c => {
            if ((c.id && c.id === campaignId) || (c._id && c._id === campaignId)) {
              return { ...c, raised: (c.raised || 0) + amt };
            }
            return c;
          });
          // Determine if campaign reached its goal after local update
          try {
            const matching = updated.find(c => (c._id === campaignId || c.id === campaignId));
            if (matching && isFinite(matching.goal) && (matching.raised || 0) >= matching.goal) {
              try { Alert.alert('Thank you!', 'This donation completed the campaign.'); } catch (e) { }
            }
          } catch (e) { }
          return updated.filter(c => (c.raised || 0) < (c.goal || Infinity));
        });
      }
    })();

    // Persist campaign override (raised or deleted) so it survives reloads
    (async () => {
      try {
        const overridesRaw = await AsyncStorage.getItem('campaignOverrides');
        const overrides = overridesRaw ? JSON.parse(overridesRaw) : {};
        const current = overrides[campaignId] || {};
        const newRaised = (current.raised || selectedCampaign.raised || 0) + amt;
        if (newRaised >= (selectedCampaign.goal || Infinity)) {
          overrides[campaignId] = { deleted: true };
        } else {
          overrides[campaignId] = { ...current, raised: newRaised };
        }
        await AsyncStorage.setItem('campaignOverrides', JSON.stringify(overrides));
        setCampaignOverrides(overrides);
      } catch (e) {
        console.warn('Failed to persist campaign override', e);
      }
    })();

    // Add to donatedCampaigns for this user (avoid duplicates)
    setDonatedCampaigns(prev => {
      const exists = prev.some(c => (c.id && c.id === (selectedCampaign.id || selectedCampaign._id)) || (c._id && c._id === (selectedCampaign._id || selectedCampaign.id)));
      if (exists) return prev.map(c => {
        if ((c.id && c.id === selectedCampaign.id) || (c._id && c._id === selectedCampaign._id)) {
          return { ...c, raised: (c.raised || 0) + amt };
        }
        return c;
      });
      const newEntry = { ...(selectedCampaign || {}), raised: (selectedCampaign.raised || 0) + amt };
      const updated = [newEntry, ...prev];

      // Persist to AsyncStorage per-user if available
      (async () => {
        try {
          if (userProfile && (userProfile.id || userProfile._id)) {
            const key = `donatedCampaigns:${userProfile.id || userProfile._id}`;
            await AsyncStorage.setItem(key, JSON.stringify(updated));
          }
        } catch (e) {
          console.warn('Failed to persist donated campaigns', e);
        }
      })();

      return updated;
    });

    // Record donation to notify admin and campaign creator
    (async () => {
      try {
        console.log('📤 Recording donation for notifications:', { campaignId, amount: amt });
        const result = await ApiService.recordDonation({
          campaignId: campaignId,
          amount: amt,
          message: '', // Could add donation message field later
          transactionHash: blockchainTxHash || '',
          isAnonymous: false // Could add anonymous option later
        });
        console.log('✅ Donation recorded successfully:', result);
        
        // Show toast notification for successful donation
        showToast(`Donation of ${amt} ETH successful! 🎉`, 'success');
      } catch (e) {
        console.error('❌ Failed to record donation for notifications:', e);
        console.error('Error details:', e.response?.data || e.message);
      }
    })();

    // Close modal and reset amount
    setShowCampaignModal(false);
    setSelectedCampaign(null);
    setDonateAmount('');
    
    console.log("✅ Donation process completed");
  };

  // Wallet helpers
  const connectWallet = async () => {
    // Web - injected provider (MetaMask)
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        console.log("🔐 Attempting wallet connection...");
        
        // Request accounts
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        
        if (accounts && accounts.length > 0) {
          console.log("✅ Accounts approved:", accounts);
          
          // Create provider and get signer
          const provider = new ethers.BrowserProvider(window.ethereum);
          console.log("✅ BrowserProvider created");
          
          // Get current network
          const network = await provider.getNetwork();
          console.log("ℹ️ Current network:", network.name, "chainId:", network.chainId);
          
          // Check if on Sepolia (chainId: 11155111)
          if (network.chainId !== 11155111n) {
            console.warn("⚠️ Not on Sepolia! Current chainId:", network.chainId);
            console.log("Attempting to switch to Sepolia...");
            
            try {
              // Try to switch to Sepolia
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }], // 11155111 in hex
              });
              console.log("✅ Switched to Sepolia");
            } catch (switchError) {
              // If chain doesn't exist, add it
              if (switchError.code === 4902) {
                console.log("⚠️ Sepolia not found in MetaMask. Adding it...");
                try {
                  await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                      chainId: '0xaa36a7',
                      chainName: 'Sepolia',
                      rpcUrls: ['https://eth-sepolia.g.alchemy.com/v2/JKr_0zzfptD4Ie6et6JPg'],
                      nativeCurrency: {
                        name: 'Ethereum',
                        symbol: 'ETH',
                        decimals: 18,
                      },
                      blockExplorerUrls: ['https://sepolia.etherscan.io'],
                    }],
                  });
                  console.log("✅ Sepolia network added and switched");
                } catch (addError) {
                  console.error("❌ Failed to add Sepolia:", addError);
                  Alert.alert('Setup Failed', 'Could not add Sepolia network. Please add it manually in MetaMask settings.');
                  return;
                }
              } else {
                console.error("❌ Failed to switch to Sepolia:", switchError);
                Alert.alert('Network Switch Failed', 'Please switch to Sepolia testnet manually in MetaMask. Error: ' + switchError.message);
                return;
              }
            }
          }
          
          // Get signer after network is confirmed
          const signer = await provider.getSigner();
          console.log("✅ Signer obtained:", signer.address);
          
          // Verify we're on Sepolia one more time
          const finalNetwork = await provider.getNetwork();
          console.log("✅ Final network verification:", finalNetwork.name, "chainId:", finalNetwork.chainId);
          
          if (finalNetwork.chainId !== 11155111n) {
            console.error("❌ Still not on Sepolia after switch attempt");
            Alert.alert('Wrong Network', 'Please make sure you are on Sepolia testnet. Current chainId: ' + finalNetwork.chainId);
            return;
          }
          
          setEthersProvider(provider);
          setEthersSigner(signer);
          setWalletConnected(true);
          setWalletAddress(accounts[0]);
          setWalletProviderType('injected');
          setWalletModalOpen(false);
          setMessage('✅ Wallet connected to Sepolia!');
          setMessageType('success');
          
          console.log("✅ Wallet connection complete");
          return;
        }
      } catch (e) {
        console.error('❌ Wallet connection error:', e);
        
        if (e.code === 4001) {
          Alert.alert('Connection Rejected', 'You rejected the connection request');
        } else {
          Alert.alert('Wallet Connection Failed', `Error: ${e.message}`);
        }
        return;
      }
    }

    // Mobile or no injected provider - show guidance
    Alert.alert('No Web3 Wallet Detected', 'Please install MetaMask (desktop) or connect using WalletConnect (mobile)');
  };

  const signTestMessage = async () => {
    if (!ethersSigner) {
      Alert.alert('No signer', 'Connect wallet first');
      return;
    }
    try {
      const msg = `Funderr test signature @ ${new Date().toISOString()}`;
      const signature = await ethersSigner.signMessage(msg);
      setSignedMessage(signature);
      Alert.alert('Signed', 'Message signed successfully');
    } catch (e) {
      console.warn('Signing failed', e);
      Alert.alert('Signing failed', 'Please approve the signing in your wallet.');
    }
  };

  const disconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress(null);
    setWalletProviderType(null);
  };

  // Setup network and account change listeners
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    // Listen for network/chain changes
    const handleChainChanged = async (chainId) => {
      console.log("🔄 Chain changed to:", chainId);
      const chainIdDecimal = parseInt(chainId, 16);
      
      if (chainIdDecimal !== 11155111) {
        console.warn("⚠️ Network changed away from Sepolia! New chainId:", chainIdDecimal);
        setMessage(`⚠️ Wrong network! You are on chain ${chainIdDecimal}. Please switch to Sepolia (11155111).`);
        setMessageType('warning');
        
        // Try to auto-switch back to Sepolia
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia
          });
          console.log("✅ Auto-switched back to Sepolia");
        } catch (e) {
          console.error("❌ Failed to auto-switch to Sepolia:", e);
        }
      } else {
        console.log("✅ Back on Sepolia network");
        setMessage("✅ Connected to Sepolia testnet");
        setMessageType('success');
      }
    };

    // Listen for account changes
    const handleAccountsChanged = (accounts) => {
      console.log("👤 Accounts changed:", accounts);
      
      if (accounts.length === 0) {
        console.warn("⚠️ Wallet disconnected");
        setWalletConnected(false);
        setWalletAddress(null);
        setMessage("⚠️ Wallet disconnected");
        setMessageType('warning');
      } else if (accounts[0] !== walletAddress) {
        console.log("✅ Account switched to:", accounts[0]);
        setWalletAddress(accounts[0]);
        setMessage(`✅ Switched to account: ${accounts[0].substring(0, 6)}...${accounts[0].substring(38)}`);
        setMessageType('success');
      }
    };

    // Add listeners
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('accountsChanged', handleAccountsChanged);

    console.log("✅ Network and account listeners attached");

    // Cleanup listeners on unmount
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        console.log("🧹 Network and account listeners removed");
      }
    };
  }, [walletAddress]);

  // Computed: remaining amount for the selected campaign (in ETH)
  const selectedRemaining = (() => {
    if (!selectedCampaign) return Infinity;
    const goalVal = selectedCampaign.goal !== undefined && selectedCampaign.goal !== null ? Number(selectedCampaign.goal) : Infinity;
    const raisedVal = selectedCampaign.raised !== undefined && selectedCampaign.raised !== null ? Number(selectedCampaign.raised) : 0;
    return isFinite(goalVal) ? Math.max(0, goalVal - raisedVal) : Infinity;
  })();

  // Is the Donate button currently disabled due to goal reached or input exceeding remaining?
  const donateExceedsRemaining = (() => {
    const amt = Number(donateAmount);
    if (!isFinite(selectedRemaining)) return false; // no limit
    // Only consider "exceeds remaining" when user has entered a valid numeric amount
    if (donateAmount === '' || donateAmount == null) return false;
    if (isNaN(amt)) return false;
    return amt > selectedRemaining;
  })();

  // Separate flag to determine if Donate button should be disabled (invalid input or exceeds remaining)
  const donateDisabled = (() => {
    const amt = Number(donateAmount);
    if (!donateAmount || donateAmount.trim() === '') return true; // require input
    if (isNaN(amt) || amt <= 0) return true; // invalid numeric
    if (isFinite(selectedRemaining) && amt > selectedRemaining) return true; // over limit
    return false;
  })();

  // Handler that clamps the entered donation amount to the remaining amount (if there is a limit)
  const handleDonateAmountChange = (val) => {
    // Allow empty string
    if (!val || val.trim() === '') {
      setDonateAmount('');
      return;
    }
    // Allow numeric input, but clamp to remaining when finite
    const parsed = Number(val);
    if (isNaN(parsed)) {
      // keep as-is to allow user to edit; validation prevents non-numeric donations
      setDonateAmount(val);
      return;
    }
    if (isFinite(selectedRemaining) && parsed > selectedRemaining) {
      setDonateAmount(String(selectedRemaining));
      return;
    }
    setDonateAmount(String(val));
  };
  
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false
    });
  }, [navigation]);

  // Calculate stats for dashboard
  const dashboardStats = React.useMemo(() => {
    const activeCampaigns = userCampaigns.filter(c => c.status === 'approved' && (c.raised || 0) < (c.goal || Infinity));
    const completedCampaigns = userCampaigns.filter(c => c.status === 'approved' && (c.raised || 0) >= (c.goal || Infinity));
    const totalRaised = userCampaigns.reduce((sum, c) => sum + (c.raised || c.amountRaised || 0), 0);
    const totalContributors = donatedCampaigns.length + userCampaigns.reduce((sum, c) => sum + (c.contributorsCount || 0), 0);
    
    return {
      totalRaised,
      activeCount: activeCampaigns.length,
      totalContributors,
      completedCount: completedCampaigns.length,
      activeCampaigns,
      completedCampaigns,
    };
  }, [userCampaigns, donatedCampaigns]);

  // Dashboard tab state
  const [dashboardTab, setDashboardTab] = useState('active');
  
  return (
  <View style={{flex: 1, backgroundColor: '#f9fafb'}}>
    <StatusBar barStyle="dark-content" backgroundColor="#f9fafb" />
    
      {/* Only render Campaign History Modal and its container when showHistory is true */}
      {showHistory && (
        <View style={styles.modalBackdrop50}>
          <View style={styles.historyModal}>
            <View style={styles.historyTitleContainer}>
              <LinearGradient
                colors={['#14b8a6', '#9370DB']}
                style={styles.historyTitleGradient}
              >
                <MaterialIcons name="history" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.historyTitle}>Your Campaign History</Text>
              </LinearGradient>
            </View>
            <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
              {userCampaigns.length === 0 ? (
                <View style={styles.emptyHistoryContainer}>
                  <MaterialIcons name="history" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyHistoryText}>No campaigns found</Text>
                  <Text style={styles.emptyHistorySubtext}>Your campaign history will appear here</Text>
                </View>
              ) : (
                userCampaigns.map(campaign => (
                  <View key={campaign._id} style={styles.historyItem}>
                    <View style={styles.historyItemHeader}>
                      <MaterialIcons 
                        name={campaign.status === 'approved' ? 'check-circle' : campaign.status === 'rejected' ? 'cancel' : 'schedule'} 
                        size={20} 
                        color={campaign.status === 'pending' ? '#14b8a6' : campaign.status === 'rejected' ? '#ef4444' : '#10b981'} 
                      />
                      <Text style={styles.historyItemTitle}>{campaign.title}</Text>
                    </View>
                    <View style={[
                      styles.historyItemStatus, 
                      {backgroundColor: campaign.status === 'pending' ? 'rgba(20, 184, 166, 0.1)' : 
                                      campaign.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 
                                      'rgba(16, 185, 129, 0.1)',
                       borderColor: campaign.status === 'pending' ? '#14b8a6' : 
                                   campaign.status === 'rejected' ? '#ef4444' : 
                                   '#10b981'}
                    ]}>
                      <Text style={[styles.historyItemStatusText, {
                        color: campaign.status === 'pending' ? '#14b8a6' : 
                               campaign.status === 'rejected' ? '#ef4444' : 
                               '#10b981'
                      }]}>
                        {campaign.status.toUpperCase()}
                      </Text>
                    </View>
                    {campaign.status === 'rejected' && (
                      <TouchableOpacity onPress={() => {setSelectedReason(campaign.rejectionReason || 'No reason provided'); setShowReasonModal(true);}} style={styles.seeDetailsBtn}>
                        <MaterialIcons name="info-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                        <Text style={styles.seeDetailsText}>See Details</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.historyCloseBtn} onPress={() => setShowHistory(false)}>
              <LinearGradient
                colors={['#9370DB', '#14b8a6']}
                style={styles.historyCloseBtnGradient}
              >
                <MaterialIcons name="close" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.historyCloseText}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Campaign View Modal */}
      {showCampaignModal && selectedCampaign && (() => {
        const modalImageSource = getCampaignImageSource(selectedCampaign, false);
        console.log(`Modal - Campaign: ${selectedCampaign.title}, Image:`, modalImageSource);
        return (
          <View style={styles.modalBackdrop}>
            <View style={styles.campaignModal}>
              <Image
                source={modalImageSource}
                style={styles.campaignModalImage}
                resizeMode="cover"
              />
              <View style={styles.campaignTitleContainer}>
                <LinearGradient
                  colors={['#9370DB', '#14b8a6']}
                  style={styles.campaignTitleGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons name="campaign" size={24} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.campaignModalTitle}>{selectedCampaign.title}</Text>
                </LinearGradient>
              </View>
              <Text style={styles.campaignModalDesc}>{selectedCampaign.desc}</Text>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <LinearGradient
                  colors={['#9370DB', '#14b8a6']}
                  style={[styles.progressFill, { width: `${Math.min(100, ((selectedCampaign.raised||0) / (selectedCampaign.goal||1)) * 100)}%` }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              <Text style={styles.progressText}>Raised: ETH {selectedCampaign.raised || 0} / {selectedCampaign.goal || 'N/A'}</Text>
            </View>

            <TextInput
              placeholder='Enter amount to donate (ETH)'
              value={donateAmount}
              onChangeText={handleDonateAmountChange}
              keyboardType='numeric'
              style={styles.donateInput}
            />

            {/* Remaining and validation hints */}
            {isFinite(selectedRemaining) && (
              <Text style={styles.remainingText}>Remaining: {selectedRemaining} ETH</Text>
            )}
            {(donateAmount && !isNaN(Number(donateAmount)) && donateExceedsRemaining) && (
              <Text style={styles.errorText}>Amount exceeds remaining target</Text>
            )}

            <View style={styles.campaignModalActionsVertical}>
              {/* Donate Button */}
              <TouchableOpacity
                onPress={handleDonateClick}
                style={[styles.modalActionBtn, donateDisabled && styles.primaryBtnDisabled]}
                disabled={donateDisabled}
              >
                <LinearGradient
                  colors={donateDisabled ? ['rgba(148, 112, 219, 0.4)', 'rgba(148, 112, 219, 0.4)'] : ['#9370DB', '#14b8a6']}
                  style={styles.modalActionBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons name="favorite" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.modalActionBtnText}>Donate to Campaign</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              {/* View Accountability Button */}
              <TouchableOpacity
                onPress={handleViewSpendings}
                style={styles.modalActionBtn}
              >
                <LinearGradient
                  colors={['#9370DB', '#14b8a6']}
                  style={styles.modalActionBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons name="receipt-long" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.modalActionBtnText}>View Accountability</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => { setShowCampaignModal(false); setSelectedCampaign(null); setDonateAmount(''); }} style={styles.closeLink}>
                <Text style={styles.closeLinkText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        );
      })()}

      {/* Donation Confirmation Modal */}
      {showDonationConfirm && selectedCampaign && (
        <View style={styles.modalBackdrop}>
          <View style={styles.confirmationModal}>
            <View style={styles.confirmationHeader}>
              <LinearGradient
                colors={['#9370DB', '#14b8a6']}
                style={styles.confirmationHeaderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="check-circle-outline" size={28} color="#fff" style={{ marginRight: 10 }} />
                <Text style={styles.confirmationHeaderText}>Confirm Donation</Text>
              </LinearGradient>
            </View>

            <ScrollView style={styles.confirmationScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.confirmationContent}>
                <Text style={styles.confirmationLabel}>You are about to donate:</Text>
                <View style={styles.confirmationAmountBox}>
                  <MaterialIcons name="account-balance-wallet" size={24} color="#9370DB" />
                  <Text style={styles.confirmationAmount}>{donateAmount} ETH</Text>
                </View>

                <View style={styles.confirmationDivider} />

                <Text style={styles.confirmationLabel}>Campaign Details:</Text>
                <View style={styles.confirmationCampaignBox}>
                  <View style={styles.confirmationRow}>
                    <MaterialIcons name="campaign" size={20} color="#64748b" />
                    <Text style={styles.confirmationCampaignTitle}>{selectedCampaign.title}</Text>
                  </View>
                  <Text style={styles.confirmationCampaignDesc} numberOfLines={3}>
                    {selectedCampaign.desc}
                  </Text>
                  <View style={styles.confirmationStatsRow}>
                    <View style={styles.confirmationStat}>
                      <Text style={styles.confirmationStatLabel}>Goal</Text>
                      <Text style={styles.confirmationStatValue}>{selectedCampaign.goal || 0} ETH</Text>
                    </View>
                    <View style={styles.confirmationStat}>
                      <Text style={styles.confirmationStatLabel}>Raised</Text>
                      <Text style={styles.confirmationStatValue}>{selectedCampaign.raised || 0} ETH</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.confirmationDivider} />

                {walletBalance && (
                  <View style={styles.confirmationBalanceBox}>
                    <MaterialIcons name="account-balance" size={18} color="#64748b" />
                    <Text style={styles.confirmationBalanceText}>
                      Your Balance: {walletBalance.toFixed(6)} ETH
                    </Text>
                  </View>
                )}

                <View style={styles.confirmationWarning}>
                  <MaterialIcons name="info-outline" size={18} color="#f59e0b" />
                  <Text style={styles.confirmationWarningText}>
                    This transaction will be processed on the Sepolia blockchain. Gas fees apply.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.confirmationActions}>
              <TouchableOpacity
                style={styles.confirmationCancelBtn}
                onPress={() => setShowDonationConfirm(false)}
              >
                <Text style={styles.confirmationCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.confirmationConfirmBtn}
                onPress={handleDonateConfirmed}
              >
                <LinearGradient
                  colors={['#9370DB', '#14b8a6']}
                  style={styles.confirmationConfirmGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <MaterialIcons name="send" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.confirmationConfirmText}>Confirm & Send</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Transaction Status Modal (like mobile app) */}
      <TransactionModal
        visible={txModalVisible}
        status={txStatus}
        txHash={txHash}
        error={txError}
        amount={txAmount}
        campaignTitle={txCampaignTitle}
        onClose={handleTxModalClose}
        type="donation"
      />

      {/* Spendings/Accountability Modal */}
      {showSpendingsModal && selectedCampaign && (
        <View style={styles.modalBackdrop}>
          <View style={styles.spendingsModal}>
            <View style={styles.spendingsHeader}>
              <LinearGradient
                colors={['#10b981', '#059669']}
                style={styles.spendingsHeaderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="receipt-long" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.spendingsHeaderText}>Campaign Accountability</Text>
              </LinearGradient>
            </View>

            <ScrollView style={styles.spendingsScrollView} showsVerticalScrollIndicator={false}>
              {/* Campaign Info */}
              <View style={styles.spendingsCampaignInfo}>
                <Text style={styles.spendingsCampaignTitle}>{selectedCampaign.title}</Text>
                <View style={styles.spendingsStatsRow}>
                  <View style={styles.spendingsStat}>
                    <Text style={styles.spendingsStatLabel}>Total Raised</Text>
                    <Text style={styles.spendingsStatValue}>{selectedCampaign.raised || 0} ETH</Text>
                  </View>
                  <View style={styles.spendingsStat}>
                    <Text style={styles.spendingsStatLabel}>Total Spent</Text>
                    <Text style={[styles.spendingsStatValue, { color: '#ef4444' }]}>{spendingsTotalSpent.toFixed(4)} ETH</Text>
                  </View>
                  <View style={styles.spendingsStat}>
                    <Text style={styles.spendingsStatLabel}>Remaining</Text>
                    <Text style={[styles.spendingsStatValue, { color: '#10b981' }]}>{spendingsRemainingFunds.toFixed(4)} ETH</Text>
                  </View>
                </View>
              </View>

              {/* Add Spending Button (for campaign creators) */}
              {isCurrentUserCampaignCreator() && (
                <TouchableOpacity
                  style={styles.addSpendingBtn}
                  onPress={() => setShowAddSpendingModal(true)}
                >
                  <LinearGradient
                    colors={['#14b8a6', '#0d9488']}
                    style={styles.addSpendingBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons name="add-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.addSpendingBtnText}>Add Spending Record</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Spendings List */}
              <View style={styles.spendingsDivider} />
              <Text style={styles.spendingsSectionTitle}>Spending Records</Text>
              
              {spendingsLoading ? (
                <View style={styles.spendingsLoadingContainer}>
                  <Text style={styles.spendingsLoadingText}>Loading spendings...</Text>
                </View>
              ) : campaignSpendings.length === 0 ? (
                <View style={styles.spendingsEmptyContainer}>
                  <MaterialIcons name="receipt" size={48} color="#cbd5e1" />
                  <Text style={styles.spendingsEmptyText}>No spending records yet</Text>
                  <Text style={styles.spendingsEmptySubtext}>
                    {isCurrentUserCampaignCreator() 
                      ? 'Add spending records to show donors how funds are being used'
                      : 'The campaign creator will add spending records as funds are used'}
                  </Text>
                </View>
              ) : (
                campaignSpendings.map((spending, index) => (
                  <View key={spending._id || index} style={styles.spendingItem}>
                    <View style={styles.spendingItemHeader}>
                      <View style={styles.spendingItemCategory}>
                        <MaterialIcons name="category" size={16} color="#14b8a6" />
                        <Text style={styles.spendingItemCategoryText}>{spending.category || 'General'}</Text>
                      </View>
                      <Text style={styles.spendingItemDate}>
                        {new Date(spending.date).toLocaleDateString()}
                      </Text>
                    </View>
                    
                    <Text style={styles.spendingItemDescription}>{spending.description}</Text>
                    
                    <View style={styles.spendingItemFooter}>
                      <Text style={styles.spendingItemAmount}>{spending.amount.toFixed(4)} ETH</Text>
                      
                      <TouchableOpacity
                        style={styles.viewReceiptBtn}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.open(spending.receiptUrl, '_blank');
                          } else {
                            const { Linking } = require('react-native');
                            Linking.openURL(spending.receiptUrl);
                          }
                        }}
                      >
                        <MaterialIcons name="visibility" size={16} color="#14b8a6" />
                        <Text style={styles.viewReceiptBtnText}>View Receipt</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.spendingsCloseBtn}
              onPress={() => setShowSpendingsModal(false)}
            >
              <Text style={styles.spendingsCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Spending Modal (for campaign creators) */}
      {showAddSpendingModal && selectedCampaign && (
        <View style={styles.modalBackdrop}>
          <View style={styles.addSpendingModal}>
            <View style={styles.addSpendingHeader}>
              <LinearGradient
                colors={['#14b8a6', '#0d9488']}
                style={styles.addSpendingHeaderGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialIcons name="add-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.addSpendingHeaderText}>Add Spending Record</Text>
              </LinearGradient>
            </View>

            <ScrollView style={styles.addSpendingScrollView} showsVerticalScrollIndicator={false}>
              {/* Description Input */}
              <View style={styles.addSpendingInputGroup}>
                <Text style={styles.addSpendingLabel}>Description *</Text>
                <TextInput
                  style={styles.addSpendingInput}
                  placeholder="What was this spending for?"
                  value={spendingDescription}
                  onChangeText={setSpendingDescription}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor="#9ca3af"
                />
              </View>

              {/* Amount Input */}
              <View style={styles.addSpendingInputGroup}>
                <Text style={styles.addSpendingLabel}>Amount (ETH) *</Text>
                <TextInput
                  style={styles.addSpendingInput}
                  placeholder="0.00"
                  value={spendingAmount}
                  onChangeText={setSpendingAmount}
                  keyboardType="numeric"
                  placeholderTextColor="#9ca3af"
                />
                <Text style={styles.addSpendingHint}>
                  Available: {spendingsRemainingFunds.toFixed(4)} ETH
                </Text>
              </View>

              {/* Category Selector */}
              <View style={styles.addSpendingInputGroup}>
                <Text style={styles.addSpendingLabel}>Category</Text>
                <View style={styles.categorySelector}>
                  {['General', 'Equipment', 'Services', 'Materials', 'Transport', 'Other'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categorySelectorItem,
                        spendingCategory === cat && styles.categorySelectorItemActive
                      ]}
                      onPress={() => setSpendingCategory(cat)}
                    >
                      <Text style={[
                        styles.categorySelectorText,
                        spendingCategory === cat && styles.categorySelectorTextActive
                      ]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Receipt Upload */}
              <View style={styles.addSpendingInputGroup}>
                <Text style={styles.addSpendingLabel}>Receipt/Proof *</Text>
                <View style={styles.receiptUploadContainer}>
                  <TouchableOpacity
                    style={styles.receiptUploadBtn}
                    onPress={pickSpendingReceipt}
                  >
                    <MaterialIcons name="photo" size={24} color="#14b8a6" />
                    <Text style={styles.receiptUploadBtnText}>Image</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.receiptUploadBtn}
                    onPress={pickSpendingDocument}
                  >
                    <MaterialIcons name="picture-as-pdf" size={24} color="#14b8a6" />
                    <Text style={styles.receiptUploadBtnText}>PDF</Text>
                  </TouchableOpacity>
                </View>
                {spendingReceipt && (
                  <View style={styles.receiptPreview}>
                    <MaterialIcons name="check-circle" size={20} color="#10b981" />
                    <Text style={styles.receiptPreviewText}>{spendingReceipt.name}</Text>
                    <TouchableOpacity onPress={() => setSpendingReceipt(null)}>
                      <MaterialIcons name="close" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.addSpendingActions}>
              <TouchableOpacity
                style={styles.addSpendingCancelBtn}
                onPress={() => {
                  setShowAddSpendingModal(false);
                  setSpendingDescription('');
                  setSpendingAmount('');
                  setSpendingCategory('General');
                  setSpendingReceipt(null);
                }}
              >
                <Text style={styles.addSpendingCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.addSpendingSubmitBtn}
                onPress={handleAddSpending}
                disabled={addSpendingLoading}
              >
                <LinearGradient
                  colors={addSpendingLoading ? ['#9ca3af', '#9ca3af'] : ['#14b8a6', '#0d9488']}
                  style={styles.addSpendingSubmitBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {addSpendingLoading ? (
                    <Text style={styles.addSpendingSubmitBtnText}>Adding...</Text>
                  ) : (
                    <>
                      <MaterialIcons name="check" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.addSpendingSubmitBtnText}>Add Record</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <View style={styles.modalBackdrop}>
          <View style={styles.errorModal}>
            <View style={styles.errorModalHeader}>
              <MaterialIcons name={errorModalIcon} size={48} color="#ef4444" />
            </View>
            
            <View style={styles.errorModalContent}>
              <Text style={styles.errorModalTitle}>{errorModalTitle}</Text>
              <Text style={styles.errorModalMessage}>{errorModalMessage}</Text>
            </View>

            <TouchableOpacity
              style={styles.errorModalButton}
              onPress={() => setShowErrorModal(false)}
            >
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.errorModalButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.errorModalButtonText}>Got It</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Wallet Modal */}
      {walletModalOpen && (
        <View style={styles.modalBackdrop}>
          <View style={styles.walletModal}>
            <Text style={styles.walletModalTitle}>Wallet Connection</Text>
            {walletConnected ? (
              <View>
                <Text style={styles.walletConnectedText}>Connected: {walletAddress}</Text>
                <TouchableOpacity onPress={() => { disconnectWallet(); setWalletModalOpen(false); }} style={styles.disconnectBtn}>
                  <Text style={styles.disconnectBtnText}>Disconnect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.walletModalHelp}>Connect your web3 wallet to interact with blockchain features.</Text>
                <TouchableOpacity onPress={connectWallet} style={styles.primaryBtn}>
                  <Text style={styles.primaryBtnText}>Connect Wallet</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { Alert.alert('Mobile Wallet', 'Use WalletConnect-enabled wallets.'); }} style={styles.helpLink}>
                  <Text style={styles.helpLinkText}>Need help? Connect via WalletConnect (coming soon)</Text>
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={() => setWalletModalOpen(false)} style={styles.closeModalLink}>
              <Text style={styles.closeLinkText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Reason Modal */}
      {showReasonModal && (
        <View style={styles.modalBackdrop}>
          <View style={styles.reasonModal}>
            <View style={styles.reasonTitleContainer}>
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.reasonTitleGradient}
              >
                <MaterialIcons name="error-outline" size={24} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.reasonTitle}>Rejection Reason</Text>
              </LinearGradient>
            </View>
            <View style={styles.reasonContent}>
              <MaterialIcons name="info-outline" size={20} color="#64748b" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.reasonText}>{selectedReason}</Text>
            </View>
            <TouchableOpacity style={styles.reasonCloseBtn} onPress={() => setShowReasonModal(false)}>
              <LinearGradient
                colors={['#9370DB', '#181818ff']}
                style={styles.reasonCloseBtnGradient}
              >
                <MaterialIcons name="close" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.reasonCloseBtnText}>Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Modern Background with Animated Patterns - HomeScreen Style */}
      <View style={styles.backgroundPatterns}>
        <Animatable.View animation="pulse" iterationCount="infinite" duration={3000} style={[styles.bgPattern, styles.bgPattern1]} />
        <Animatable.View animation="bounceIn" iterationCount="infinite" duration={3000} delay={1000} style={[styles.bgPattern, styles.bgPattern2]} />
      </View>
      <SafeAreaView style={[styles.safeArea, {flex: 1}]}>      
        {/* Modern Header - Properly Aligned */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {/* Left side - Home button */}
            <View style={styles.headerLeft}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Home')}
                style={styles.homeButton}
              >
                <LinearGradient
                  colors={['#14b8a6', '#0d9488']}
                  style={styles.homeIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="home" size={22} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            
            {/* Center - Logo and Title */}
            <Animatable.View 
              animation="fadeIn" 
              duration={1000} 
              delay={300} 
              style={styles.headerCenter}
            >
              <LinearGradient
                colors={['#14b8a6', '#0d9488']}
                style={styles.logoCircle}
              >
                <MaterialIcons name="favorite" size={22} color="white" />
              </LinearGradient>
              <Animatable.Text 
                animation="fadeInDown" 
                duration={800} 
                delay={700}
                style={styles.headerTitle}
              >
                Funderr
              </Animatable.Text>
            </Animatable.View>
            
            {/* Right side - Admin, Wallet, and Profile buttons */}
            <View style={styles.headerRight}>
              {userRole === 'admin' && (
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => navigation.navigate('AdminPortal')}
                >
                  <Ionicons name="shield-checkmark" size={22} color="#6b7280" />
                </TouchableOpacity>
              )}
              
              {/* Withdraw Funds Button - Only for Campaign Creators */}
              {userRole === 'campaign_creator' && (
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => navigation.navigate('WithdrawFunds')}
                >
                  <LinearGradient
                    colors={['#f59e0b', '#d97706']}
                    style={styles.headerIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="cash-outline" size={22} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              )}
              
              {(userRole === 'donor' || userRole === 'campaign_creator') && (
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => setWalletModalOpen(true)}
                >
                  <LinearGradient
                    colors={walletConnected ? ['#10b981', '#14b8a6'] : ['#6b7280', '#9ca3af']}
                    style={styles.headerIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="wallet" size={22} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Notification Bell - For Donors and Campaign Creators */}
              {(userRole === 'donor' || userRole === 'campaign_creator') && (
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => {
                    setShowNotificationsPanel(true);
                    fetchNotifications();
                  }}
                >
                  <LinearGradient
                    colors={['#8b5cf6', '#7c3aed']}
                    style={styles.headerIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="notifications" size={22} color="#fff" />
                  </LinearGradient>
                  {unreadNotificationCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.headerIconButton, profileFocused && styles.headerIconButtonFocused]}
                onPress={handleProfileOpen}
              >
                <LinearGradient
                  colors={['#14b8a6', '#0d9488']}
                  style={styles.headerIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="person-circle" size={22} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      
      <ScrollView 
        style={styles.mainScrollView} 
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard Header Section */}
        <View style={styles.dashboardHeader}>
          <Animatable.View animation="fadeInDown" duration={800} style={styles.dashboardHeaderContent}>
            <View style={styles.dashboardTitleSection}>
              <Text style={styles.dashboardTitle}>
                {userRole === 'campaign_creator' ? 'Creator Dashboard' : 'Donor Dashboard'}
              </Text>
              <Text style={styles.dashboardSubtitle}>
                {userRole === 'campaign_creator' 
                  ? 'Manage your campaigns and track performance'
                  : 'Manage your donations and discover campaigns'}
              </Text>
            </View>
            
            <View style={styles.dashboardActions}>
              <TouchableOpacity
                style={styles.walletActionButton}
                onPress={() => setWalletModalOpen(true)}
              >
                <Ionicons name="wallet-outline" size={18} color="#374151" />
                <Text style={styles.walletActionText}>
                  {walletConnected ? `${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}` : 'Connect Wallet'}
                </Text>
              </TouchableOpacity>
              
              {userRole === 'campaign_creator' && (
                <TouchableOpacity
                  style={styles.createCampaignButton}
                  onPress={handleStartCampaign}
                >
                  <LinearGradient
                    colors={['#14b8a6', '#0d9488']}
                    style={styles.createCampaignGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                    <Text style={styles.createCampaignText}>Create Campaign</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </Animatable.View>
        </View>

        {/* Stats Grid */}
        <Animatable.View animation="fadeInUp" duration={800} delay={200} style={styles.statsGrid}>
          <TouchableOpacity style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>Total Raised</Text>
              <View style={[styles.statCardIcon, {backgroundColor: 'rgba(20, 184, 166, 0.1)'}]}>
                <Ionicons name="trending-up" size={18} color="#14b8a6" />
              </View>
            </View>
            <Text style={styles.statCardValue}>{dashboardStats.totalRaised.toFixed(2)} ETH</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>Active Campaigns</Text>
              <View style={[styles.statCardIcon, {backgroundColor: 'rgba(59, 130, 246, 0.1)'}]}>
                <Ionicons name="rocket-outline" size={18} color="#3b82f6" />
              </View>
            </View>
            <Text style={styles.statCardValue}>{dashboardStats.activeCount}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>Total Contributors</Text>
              <View style={[styles.statCardIcon, {backgroundColor: 'rgba(168, 85, 247, 0.1)'}]}>
                <Ionicons name="people-outline" size={18} color="#a855f7" />
              </View>
            </View>
            <Text style={styles.statCardValue}>{dashboardStats.totalContributors}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statCard}>
            <View style={styles.statCardHeader}>
              <Text style={styles.statCardLabel}>Completed</Text>
              <View style={[styles.statCardIcon, {backgroundColor: 'rgba(34, 197, 94, 0.1)'}]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" />
              </View>
            </View>
            <Text style={styles.statCardValue}>{dashboardStats.completedCount}</Text>
          </TouchableOpacity>
        </Animatable.View>

        {/* Dashboard Tabs */}
        <Animatable.View animation="fadeInUp" duration={800} delay={400} style={styles.dashboardTabsContainer}>
          <View style={styles.dashboardTabsList}>
            <TouchableOpacity
              style={[styles.dashboardTab, dashboardTab === 'active' && styles.dashboardTabActive]}
              onPress={() => setDashboardTab('active')}
            >
              <Text style={[styles.dashboardTabText, dashboardTab === 'active' && styles.dashboardTabTextActive]}>Active</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dashboardTab, dashboardTab === 'completed' && styles.dashboardTabActive]}
              onPress={() => setDashboardTab('completed')}
            >
              <Text style={[styles.dashboardTabText, dashboardTab === 'completed' && styles.dashboardTabTextActive]}>Completed</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dashboardTab, dashboardTab === 'history' && styles.dashboardTabActive]}
              onPress={() => setDashboardTab('history')}
            >
              <Text style={[styles.dashboardTabText, dashboardTab === 'history' && styles.dashboardTabTextActive]}>History</Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>

        {/* Tab Content */}
        {dashboardTab === 'active' && (
          <Animatable.View animation="fadeIn" duration={500} style={styles.tabContent}>
            <View style={styles.tabContentHeader}>
              <Text style={styles.tabContentTitle}>Active Campaigns</Text>
              {userRole === 'campaign_creator' && (
                <TouchableOpacity onPress={handleStartCampaign} style={styles.tabHeaderButton}>
                  <Text style={styles.tabHeaderButtonText}>Create New Campaign</Text>
                </TouchableOpacity>
              )}
            </View>

            {trendingCampaigns.length === 0 && userCampaigns.filter(c => c.status === 'approved').length === 0 ? (
              <View style={styles.emptyTabContent}>
                <Ionicons name="rocket-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTabText}>No active campaigns</Text>
                <Text style={styles.emptyTabSubtext}>
                  {userRole === 'campaign_creator' 
                    ? 'Create your first campaign to get started'
                    : 'Explore campaigns to support a cause'}
                </Text>
                <TouchableOpacity 
                  style={styles.emptyTabButton}
                  onPress={userRole === 'campaign_creator' ? handleStartCampaign : handleExplore}
                >
                  <LinearGradient
                    colors={['#14b8a6', '#0d9488']}
                    style={styles.emptyTabButtonGradient}
                  >
                    <Text style={styles.emptyTabButtonText}>
                      {userRole === 'campaign_creator' ? 'Create Campaign' : 'Explore Campaigns'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.campaignsGrid}>
                {(userRole === 'campaign_creator' ? userCampaigns.filter(c => c.status === 'approved') : trendingCampaigns).map((campaign, index) => {
                  const progress = ((campaign.raised || campaign.amountRaised || 0) / (campaign.goal || 1)) * 100;
                  const imageSource = getCampaignImageSource(campaign, true);
                  const daysLeft = campaign.daysLeft || Math.max(0, Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24))) || 30;
                  
                  return (
                    <Animatable.View 
                      key={campaign._id || campaign.id || index}
                      animation="fadeInUp"
                      duration={600}
                      delay={index * 100}
                      style={styles.dashboardCampaignCard}
                    >
                      <View style={styles.dashboardCampaignImageContainer}>
                        <Image
                          source={imageSource}
                          style={styles.dashboardCampaignImage}
                          resizeMode="cover"
                        />
                      </View>
                      
                      <View style={styles.dashboardCampaignContent}>
                        <Text style={styles.dashboardCampaignTitle} numberOfLines={1}>
                          {campaign.title}
                        </Text>
                        <View style={styles.dashboardCampaignMeta}>
                          <Ionicons name="time-outline" size={14} color="#6b7280" />
                          <Text style={styles.dashboardCampaignMetaText}>{daysLeft} days remaining</Text>
                        </View>
                        
                        <View style={styles.dashboardProgressSection}>
                          <View style={styles.dashboardProgressHeader}>
                            <Text style={styles.dashboardProgressLabel}>Progress</Text>
                            <Text style={styles.dashboardProgressPercent}>{Math.min(100, progress).toFixed(0)}%</Text>
                          </View>
                          <View style={styles.dashboardProgressTrack}>
                            <LinearGradient
                              colors={['#14b8a6', '#0d9488']}
                              style={[styles.dashboardProgressFill, { width: `${Math.min(100, progress)}%` }]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                            />
                          </View>
                          <View style={styles.dashboardProgressFooter}>
                            <Text style={styles.dashboardProgressRaised}>
                              {(campaign.raised || campaign.amountRaised || 0).toFixed(2)} ETH raised
                            </Text>
                            <Text style={styles.dashboardProgressGoal}>
                              of {(campaign.goal || 0).toFixed(2)} ETH
                            </Text>
                          </View>
                        </View>
                        
                        <View style={styles.dashboardCampaignStats}>
                          <View style={styles.dashboardCampaignStat}>
                            <Ionicons name="people-outline" size={14} color="#6b7280" />
                            <Text style={styles.dashboardCampaignStatText}>{campaign.contributorsCount || 0} contributors</Text>
                          </View>
                        </View>
                        
                        <View style={styles.dashboardCampaignActions}>
                          <TouchableOpacity 
                            style={styles.dashboardActionButtonOutline}
                            onPress={() => handleViewSpendings()}
                          >
                            <Text style={styles.dashboardActionButtonOutlineText}>View Analytics</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.dashboardActionButtonFilled}
                            onPress={() => { setSelectedCampaign(campaign); setShowCampaignModal(true); }}
                          >
                            <Text style={styles.dashboardActionButtonFilledText}>Manage</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Animatable.View>
                  );
                })}
              </View>
            )}
          </Animatable.View>
        )}

        {dashboardTab === 'completed' && (
          <Animatable.View animation="fadeIn" duration={500} style={styles.tabContent}>
            <View style={styles.tabContentHeader}>
              <Text style={styles.tabContentTitle}>Completed Campaigns</Text>
            </View>

            {dashboardStats.completedCampaigns.length === 0 ? (
              <View style={styles.emptyTabContent}>
                <Ionicons name="checkmark-done-circle-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTabText}>No completed campaigns yet</Text>
                <Text style={styles.emptyTabSubtext}>Completed campaigns will appear here</Text>
              </View>
            ) : (
              <View style={styles.completedCampaignsList}>
                {dashboardStats.completedCampaigns.map((campaign, index) => (
                  <Animatable.View 
                    key={campaign._id || campaign.id || index}
                    animation="fadeInUp"
                    duration={600}
                    delay={index * 100}
                    style={styles.completedCampaignCard}
                  >
                    <View style={styles.completedCampaignHeader}>
                      <View style={styles.completedCampaignInfo}>
                        <Text style={styles.completedCampaignTitle}>{campaign.title}</Text>
                        <Text style={styles.completedCampaignDate}>
                          Completed on {new Date(campaign.completedDate || campaign.updatedAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                        <Text style={styles.completedBadgeText}>Funded</Text>
                      </View>
                    </View>
                    
                    <View style={styles.completedCampaignStats}>
                      <View style={styles.completedStat}>
                        <Text style={styles.completedStatLabel}>Amount Raised</Text>
                        <Text style={[styles.completedStatValue, {color: '#14b8a6'}]}>
                          {(campaign.raised || campaign.amountRaised || 0).toFixed(2)} ETH
                        </Text>
                      </View>
                      <View style={styles.completedStat}>
                        <Text style={styles.completedStatLabel}>Contributors</Text>
                        <Text style={styles.completedStatValue}>{campaign.contributorsCount || 0}</Text>
                      </View>
                      <View style={styles.completedStat}>
                        <Text style={styles.completedStatLabel}>Success Rate</Text>
                        <Text style={styles.completedStatValue}>100%</Text>
                      </View>
                    </View>
                    
                    <View style={styles.completedCampaignActions}>
                      <TouchableOpacity style={styles.completedActionButton}>
                        <Text style={styles.completedActionButtonText}>View Report</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.completedActionButton}>
                        <Text style={styles.completedActionButtonText}>Share Success</Text>
                      </TouchableOpacity>
                    </View>
                  </Animatable.View>
                ))}
              </View>
            )}
          </Animatable.View>
        )}

        {dashboardTab === 'history' && (
          <Animatable.View animation="fadeIn" duration={500} style={styles.tabContent}>
            <View style={styles.historyCard}>
              <View style={styles.historyCardHeader}>
                <Text style={styles.historyCardTitle}>All Campaigns Timeline</Text>
                <Text style={styles.historyCardSubtitle}>Complete history of your fundraising journey</Text>
              </View>
              
              <View style={styles.historyTimeline}>
                {userCampaigns.length === 0 ? (
                  <View style={styles.emptyTabContent}>
                    <Ionicons name="time-outline" size={48} color="#d1d5db" />
                    <Text style={styles.emptyTabText}>No campaign history</Text>
                    <Text style={styles.emptyTabSubtext}>Your campaign history will appear here</Text>
                  </View>
                ) : (
                  userCampaigns.map((campaign, index) => (
                    <TouchableOpacity 
                      key={campaign._id || campaign.id || index}
                      style={styles.historyTimelineItem}
                      onPress={() => { setSelectedCampaign(campaign); setShowCampaignModal(true); }}
                    >
                      <View style={[
                        styles.historyTimelineDot,
                        { backgroundColor: campaign.status === 'approved' && (campaign.raised || 0) >= (campaign.goal || Infinity) 
                            ? '#22c55e' 
                            : campaign.status === 'approved' 
                              ? '#14b8a6' 
                              : campaign.status === 'rejected' 
                                ? '#ef4444' 
                                : '#f59e0b' 
                        }
                      ]} />
                      <View style={styles.historyTimelineContent}>
                        <Text style={styles.historyTimelineTitle}>{campaign.title}</Text>
                        <Text style={styles.historyTimelineMeta}>
                          {(campaign.raised || campaign.amountRaised || 0).toFixed(2)} ETH raised • {campaign.contributorsCount || 0} contributors
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.historyTimelineAction}>
                        <Text style={styles.historyTimelineActionText}>View Details</Text>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          </Animatable.View>
        )}

        {/* Explore Section Button */}
        {!showExplore && (
          <Animatable.View animation="fadeInUp" duration={800} delay={600} style={styles.exploreButtonContainer}>
            <TouchableOpacity onPress={handleExplore} style={styles.exploreButton}>
              <LinearGradient
                colors={['#14b8a6', '#0d9488']}
                style={styles.exploreButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="compass-outline" size={20} color="#fff" />
                <Text style={styles.exploreButtonText}>Explore All Campaigns</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        )}

      {/* Only render campaigns section when showExplore is true, nothing otherwise */}
      {showExplore ? (
        <View style={styles.campaignsSection}>
          {/* Exploration view - HomeScreen Style */}
          <View style={styles.exploreSection}>
            <View style={styles.exploreSectionHeader}>
              <Animatable.Text animation="fadeInDown" duration={900} style={styles.exploreTitle}>
                Explore Campaigns
              </Animatable.Text>
              <Text style={styles.exploreSubtitle}>
                Discover meaningful projects making a difference
              </Text>
            </View>
            
            <View style={styles.exploreContainer}>
              <TouchableOpacity 
                style={styles.closeExploreBtn}
                onPress={() => setShowExplore(false)}
              >
                <Ionicons name="close-circle" size={28} color="#ef4444" />
              </TouchableOpacity>
              
              {/* Search Bar in Explore View */}
            <Animatable.View 
              style={styles.searchContainer}
              animation="fadeIn"
              duration={500}
            >
              <Ionicons name="search" size={22} color="#14b8a6" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by title, description or category..."
                placeholderTextColor="#9ca3af"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
              {search.trim() !== '' && (
                <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchButton}>
                  <Ionicons name="close-circle" size={18} color="#6b7280" />
                </TouchableOpacity>
              )}
            </Animatable.View>
              {/* Search Results Count */}
            {search.trim() !== '' && (
              <View style={styles.searchResultsContainer}>
                <Text style={styles.searchResultsText}>
                  {activeTab === 'trending' 
                    ? trendingCampaigns.filter(campaign => 
                        (campaign.title || '').toLowerCase().includes(search.toLowerCase()) ||
                        (campaign.description || '').toLowerCase().includes(search.toLowerCase()) ||
                        (campaign.category || '').toLowerCase().includes(search.toLowerCase())
                      ).length 
                    : (donatedCampaigns || []).filter(campaign => 
                        (campaign.title || '').toLowerCase().includes(search.toLowerCase()) ||
                        (campaign.description || '').toLowerCase().includes(search.toLowerCase()) ||
                        (campaign.category || '').toLowerCase().includes(search.toLowerCase())
                      ).length
                  } results found for "{search}"
                </Text>
              </View>
            )}
            
            {/* Tabs */}
            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
                onPress={() => setActiveTab('trending')}
              >
                <Text style={[styles.tabText, activeTab === 'trending' && styles.activeTabText]}>Trending Campaigns</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'donated' && styles.activeTab]}
                onPress={() => setActiveTab('donated')}
              >
                <Text style={[styles.tabText, activeTab === 'donated' && styles.activeTabText]}>Donated Campaigns</Text>
              </TouchableOpacity>
            </View>
              {/* Show two campaigns per row */}
            {activeTab === 'trending' ? (
              <View style={styles.exploreCampaignsList}>
                {trendingCampaigns
                  .filter(campaign => 
                    search.trim() === '' || 
                    (campaign.title || '').toLowerCase().includes(search.toLowerCase()) ||
                    (campaign.description || '').toLowerCase().includes(search.toLowerCase()) ||
                    (campaign.category || '').toLowerCase().includes(search.toLowerCase())
                  )
                  .map((campaign, index) => renderCampaignCard(campaign, index, true))}
                {trendingCampaigns.filter(campaign => 
                  search.trim() !== '' && 
                  !(campaign.title || '').toLowerCase().includes(search.toLowerCase()) &&
                  !(campaign.description || '').toLowerCase().includes(search.toLowerCase()) &&
                  !(campaign.category || '').toLowerCase().includes(search.toLowerCase())
                ).length === trendingCampaigns.length && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No campaigns found matching "{search}"</Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.exploreCampaignsList}>
                {donatedCampaigns && donatedCampaigns.length > 0 ? (
                  donatedCampaigns
                    .filter(campaign => search.trim() === '' || (campaign.title || '').toLowerCase().includes(search.toLowerCase()) || (campaign.description || '').toLowerCase().includes(search.toLowerCase()) || (campaign.category || '').toLowerCase().includes(search.toLowerCase()))
                    .map((campaign, index) => renderCampaignCard(campaign, index, true))
                ) : (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>You haven't donated to any campaigns yet.</Text>
                  </View>
                )}
              </View>
            )}
            </View>
          </View>
        </View>
      ) : null}
      {showProfile && (
        <View style={styles.profileModalOverlay}>
          <View style={styles.profileModal}>
            <TouchableOpacity style={styles.closeProfileBtn} onPress={() => { setShowProfile(false); setProfileFocused(false); }}>
              <Ionicons name="close" size={24} color="#9370DB" />
            </TouchableOpacity>
            
            {profileLoading ? (
              <View style={styles.profileLoadingContainer}>
                <Animatable.Text animation="pulse" iterationCount="infinite" style={styles.profileLoadingText}>
                  Loading Profile...
                </Animatable.Text>
              </View>
            ) : profileError ? (
              <View style={styles.profileErrorContainer}>
                <MaterialIcons name="error-outline" size={40} color="#f44336" />
                <Text style={styles.profileErrorText}>{profileError}</Text>
              </View>
            ) : userProfile ? (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.profileScrollView}>
                <Animatable.View animation="fadeIn" duration={500} style={styles.profileContent}>
                  <Image 
                    source={userProfile.avatar || imageMapping.roleSelection} 
                    style={styles.profileAvatar}
                    defaultSource={imageMapping.roleSelection}
                  />
                  
                  <Animatable.Text animation="fadeInUp" delay={100} style={styles.profileName}>
                    {userProfile.name || userProfile.fullName || 'User'}
                  </Animatable.Text>
                  
                  <LinearGradient
                    colors={['#9370DB', '#14b8a6']}
                    style={styles.profileRoleBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <MaterialIcons 
                      name={userProfile.role === 'donor' ? 'favorite' : 'campaign'} 
                      size={16} 
                      color="#fff" 
                      style={styles.profileRoleIcon} 
                    />
                    <Text style={styles.profileRoleText}>
                      {userProfile.role === 'donor' ? 'Donor' : 'Campaign Creator'}
                    </Text>
                  </LinearGradient>
                  
                  <Animatable.View animation="fadeInUp" delay={200} style={styles.profileDetailSection}>
                    <Text style={styles.profileLabel}>Email:</Text>
                    <Text style={styles.profileValue}>{userProfile.email}</Text>
                  
                    {userProfile.phone && (
                      <>
                        <Text style={styles.profileLabel}>Phone:</Text>
                        <Text style={styles.profileValue}>{userProfile.phone}</Text>
                      </>
                    )}
                    
                    {userProfile.address && (
                      <>
                        <Text style={styles.profileLabel}>Address:</Text>
                        <Text style={styles.profileValue}>{userProfile.address}</Text>
                      </>
                    )}
                    
                    {userProfile.organization && (
                      <>
                        <Text style={styles.profileLabel}>Organization:</Text>
                        <Text style={styles.profileValue}>{userProfile.organization}</Text>
                      </>
                    )}
                    
                    {userProfile.role === 'donor' && userProfile.paymentMethods && (
                      <>
                        <Text style={styles.profileLabel}>Payment Methods:</Text>
                        <Text style={styles.profileValue}>{userProfile.paymentMethods}</Text>
                      </>
                    )}
                    
                    {userProfile.role === 'campaign' && userProfile.campaignCount && (
                      <>
                        <Text style={styles.profileLabel}>Campaigns Created:</Text>
                        <Text style={styles.profileValue}>{userProfile.campaignCount}</Text>
                      </>
                    )}
                  </Animatable.View>
                  
                  <TouchableOpacity 
                    onPress={handleLogout}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={['#9370DB', '#14b8a6']}
                      style={styles.logoutButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <MaterialIcons name="logout" size={18} color="#fff" style={{marginRight: 8}} />
                      <Text style={styles.logoutButtonText}>Log Out</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animatable.View>
              </ScrollView>
            ) : (
              <View style={styles.profileErrorContainer}>
                <Text style={styles.profileErrorText}>No profile found</Text>
              </View>
            )}
          </View>
        </View>
      )}
      </ScrollView>

      {/* Notifications Panel Modal */}
      {showNotificationsPanel && (
        <View style={styles.modalBackdrop}>
          <Animatable.View 
            animation="slideInRight" 
            duration={300} 
            style={styles.notificationsPanelContainer}
          >
            <LinearGradient
              colors={['#8b5cf6', '#7c3aed']}
              style={styles.notificationsPanelHeader}
            >
              <View style={styles.notificationsPanelTitleRow}>
                <Ionicons name="notifications" size={24} color="#fff" />
                <Text style={styles.notificationsPanelTitle}>Notifications</Text>
                {unreadNotificationCount > 0 && (
                  <View style={styles.notificationCountBadge}>
                    <Text style={styles.notificationCountText}>{unreadNotificationCount}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => setShowNotificationsPanel(false)}
                style={styles.closeNotificationsBtn}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            
            {/* Action buttons */}
            {notifications.length > 0 && unreadNotificationCount > 0 && (
              <TouchableOpacity 
                style={styles.markAllReadBtn}
                onPress={markAllNotificationsAsRead}
              >
                <Ionicons name="checkmark-done" size={18} color="#8b5cf6" />
                <Text style={styles.markAllReadText}>Mark all as read</Text>
              </TouchableOpacity>
            )}
            
            <ScrollView style={styles.notificationsList}>
              {notificationsLoading ? (
                <View style={styles.notificationsLoadingContainer}>
                  <Animatable.View animation="pulse" iterationCount="infinite">
                    <Ionicons name="notifications-outline" size={48} color="#8b5cf6" />
                  </Animatable.View>
                  <Text style={styles.notificationsLoadingText}>Loading notifications...</Text>
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.noNotificationsContainer}>
                  <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" />
                  <Text style={styles.noNotificationsTitle}>No notifications yet</Text>
                  <Text style={styles.noNotificationsText}>
                    {userRole === 'campaign_creator' 
                      ? 'When donors contribute to your campaigns, you\'ll see notifications here!'
                      : 'When new campaigns are launched, you\'ll be notified here!'}
                  </Text>
                </View>
              ) : (
                notifications.map((notification, index) => (
                  <TouchableOpacity 
                    key={notification._id || index}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.notificationItemUnread
                    ]}
                    onPress={() => handleNotificationClick(notification)}
                  >
                    <View style={[
                      styles.notificationIcon,
                      notification.type === 'NEW_DONATION' && { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                      notification.type === 'NEW_CAMPAIGN' && { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                    ]}>
                      <Text style={styles.notificationIconEmoji}>
                        {notification.icon || (notification.type === 'NEW_DONATION' ? '💰' : '🚀')}
                      </Text>
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationMessage} numberOfLines={2}>
                        {notification.message}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                        {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {!notification.read && (
                      <View style={styles.notificationUnreadDot} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Animatable.View>
        </View>
      )}

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View 
          style={[
            styles.toastContainer,
            {
              opacity: toastAnimation,
              transform: [{
                translateY: toastAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              }],
            },
            toastType === 'success' && styles.toastSuccess,
            toastType === 'error' && styles.toastError,
            toastType === 'warning' && styles.toastWarning,
            toastType === 'info' && styles.toastInfo,
          ]}
        >
          <View style={styles.toastContent}>
            <Ionicons 
              name={
                toastType === 'success' ? 'checkmark-circle' :
                toastType === 'error' ? 'close-circle' :
                toastType === 'warning' ? 'warning' : 'information-circle'
              } 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    minHeight: '100%',
    backgroundColor: '#f9fafb',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  mainScrollView: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollViewContent: {
    flexGrow: 1,
    backgroundColor: '#f9fafb',
  },
  
  // Header Styles
  header: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(20, 184, 166, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  homeButton: {
    padding: 4,
    borderRadius: 12,
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  homeIconGradient: {
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconButton: {
    padding: 4,
    borderRadius: 12,
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerIconButtonFocused: {
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(20,184,166,0.9)',
    shadowColor: '#14b8a6',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  headerIconGradient: {
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },  noResultsText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  searchResultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 5,
  },
  searchResultsText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  mainActionButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 30,
    marginHorizontal: 8,
    marginBottom: 16,
    minWidth: 180,
    alignItems: 'center',
    shadowColor: '#ff6b6b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#feca57',
  },
  mainActionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 1,
    textShadowColor: '#ff6b6b',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  animatedGradient: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  glassOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 0,
    borderWidth: 0,
    shadowColor: '#fff',
    shadowOpacity: 0.1,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 2 },
    zIndex: 10,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoTitle: {
    display: 'none',
  },
  logoTitleAnimated: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#764ba2',
    textAlign: 'center',
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: 1,
    marginVertical: 8,
    flexShrink: 1,
  },
  startCampaignButton: {
    backgroundColor: '#C19A6B', // Bronze-gold color
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  startCampaignText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  heroBackground: {
    // No longer used, background image removed
    display: 'none',
  },
  heroOverlay: {
    minHeight: height * 0.45,
    width: '100%',
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
    backgroundColor: 'rgba(147, 112, 219, 0.10)',
    borderRadius: 32,
    shadowColor: '#fff',
    shadowOpacity: 0.08,
    shadowRadius: 24,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap',
  },  mainActionButton: {
    backgroundColor: '#9370DB', // Purple color for the Start Your Campaign button
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    marginHorizontal: 8,
    marginBottom: 16,
    minWidth: 180,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  mainActionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },  quoteContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginBottom: 20,
  },
  quote: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#374151',
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 28,
  },  campaignsSection: {
    backgroundColor: '#f7f9fc',
    paddingVertical: 8,
    marginTop: 8,
    minHeight: 0,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9370DB',
    textAlign: 'center',
    opacity: 0.7,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
  },  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#9370DB', // Purple color
  },
  profileIconContainer: {
    backgroundColor: '#f0eaff',
    borderRadius: 20,
    padding: 6,
    marginLeft: 8,
    elevation: 2,
  },  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    backgroundColor: 'transparent',
  },
  clearSearchButton: {
    padding: 4,
  },tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#14b8a6', // Teal color
  },
  tabText: {
    fontSize: 16,
    color: '#6b7280', // Gray color
    fontWeight: '600',
  },
  activeTabText: {
    color: '#fff',
  },
  campaignsList: {
    flex: 1,
    marginHorizontal: 20,
  },  campaignCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#9370DB', // Purple color
    shadowOpacity: 0.07,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  campaignImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    marginRight: 16,
    resizeMode: 'cover',
    backgroundColor: '#e6e8fa',
  },
  campaignTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9370DB', // Purple color
    marginBottom: 4,
  },  campaignDesc: {
    fontSize: 14,
    color: '#555',
  },
  fundingText: {
    fontSize: 12,
    color: '#9370DB',
    fontWeight: '600',
    marginTop: 4,
  },
  // Explore view styles
  exploreContainer: {
    flex: 1,
    backgroundColor: '#f7f9fc',
    padding: 10,
    paddingBottom: 20,
  },
  exploreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 5,
  },
  exploreTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeExploreBtn: {
    padding: 5,
  },
  exploreCampaignsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  exploreCardContainer: {
    width: '48%',
    marginBottom: 15,
  },
  


  
  // Category Image Header Styles
  categoryImageContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  categoryImageHeader: {
    height: 100,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryImageStyle: {
    borderRadius: 16,
  },
  categoryImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  categoryHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryIcon: {
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  categoryHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  exploreCard: {
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  exploreCardBg: {
    height: 120,
    width: '100%',
  },
  exploreCardImageContainer: {
    height: 120,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  exploreCardImage: {
    height: 120,
    width: '100%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  exploreCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#14b8a6',
  },
  exploreCardContent: {
    padding: 10,
  },
  exploreCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  exploreCardDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  fundingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  fundingAmount: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  fundingGoal: {
    fontSize: 13,
    color: '#777',
    marginLeft: 5,
  },  viewCampaignButton: {
    backgroundColor: '#14b8a6', // Changed to teal
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 8,
  },
  viewCampaignText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  profileModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(147, 112, 219, 0.3)', // Purple color with opacity
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  profileModal: {
    width: 320,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#9370DB',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(147, 112, 219, 0.2)',
  },
  profileScrollView: {
    width: '100%',
    maxHeight: '100%',
  },
  profileContent: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  closeProfileBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
    backgroundColor: 'rgba(147, 112, 219, 0.15)',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  profileLoadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  profileLoadingText: {
    fontSize: 18,
    color: '#9370DB',
    fontWeight: '600',
  },
  profileErrorContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  profileErrorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  profileAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    marginTop: 16,
    borderWidth: 4,
    borderColor: '#9370DB',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  profileName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#9370DB',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  profileRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  profileRoleIcon: {
    marginRight: 4,
  },
  profileRoleText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  profileDetailSection: {
    width: '100%',
    paddingTop: 16,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: 'rgba(147, 112, 219, 0.3)',
    backgroundColor: 'rgba(147, 112, 219, 0.03)',
    borderRadius: 12,
    marginTop: 8,
  },
  profileLabel: {
    fontSize: 15,
    color: '#9370DB',
    marginTop: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  profileValue: {
    fontSize: 16,
    color: '#4a5568',
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 22,
  },
  logoutButton: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  
  // HomeScreen Style Components
  backgroundElement1: {
    position: 'absolute',
    top: 100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(20, 184, 166, 0.05)',
  },
  backgroundElement2: {
    position: 'absolute',
    bottom: 200,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(37, 99, 235, 0.03)',
  },
  
  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  heroBackgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroBackground1: {
    position: 'absolute',
    top: -50,
    right: -100,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(20, 184, 166, 0.06)',
  },
  heroBackground2: {
    position: 'absolute',
    bottom: -80,
    left: -120,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(37, 99, 235, 0.04)',
  },
  heroGrid: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTextContainer: {
    zIndex: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: '800',
    color: '#1f2937',
    lineHeight: 48,
    marginBottom: 16,
    textAlign: 'center',
  },
  heroTitleGradient: {
    color: '#14b8a6',
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#6b7280',
    lineHeight: 28,
    marginBottom: 32,
    maxWidth: 500,
    textAlign: 'center',
  },
  heroButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroButtonsGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  primaryActionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  primaryActionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  primaryActionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryActionButton: {
    backgroundColor: 'white',
    borderColor: '#14b8a6',
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionButtonText: {
    color: '#14b8a6',
    fontSize: 16,
    fontWeight: '600',
  },
  outlineActionButton: {
    backgroundColor: 'transparent',
    borderColor: '#14b8a6',
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineActionButtonText: {
    color: '#14b8a6',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Quote Section
  quoteCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(243, 244, 246, 0.8)',
  },
  quoteIcon: {
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  quoteText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#374151',
    lineHeight: 28,
    marginBottom: 16,
  },
  quoteAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
    alignSelf: 'flex-end',
  },
  
  // Explore Section
  exploreSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  exploreSectionHeader: {
    marginBottom: 20,
  },
  exploreTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  exploreSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },

  // Dashboard Header Styles
  dashboardHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  dashboardHeaderContent: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'space-between',
    alignItems: Platform.OS === 'web' ? 'center' : 'flex-start',
    gap: 16,
  },
  dashboardTitleSection: {
    flex: 1,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  dashboardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  dashboardActions: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  walletActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    minWidth: 140,
  },
  walletActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  createCampaignButton: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  createCampaignGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  createCampaignText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  statCardIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statCardValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },

  // Dashboard Tabs
  dashboardTabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  dashboardTabsList: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    padding: 4,
    maxWidth: 400,
  },
  dashboardTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  dashboardTabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dashboardTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  dashboardTabTextActive: {
    color: '#111827',
    fontWeight: '600',
  },

  // Tab Content
  tabContent: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  tabContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tabContentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  tabHeaderButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabHeaderButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Empty Tab Content
  emptyTabContent: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTabText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyTabSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyTabButton: {
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
  },
  emptyTabButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyTabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Campaigns Grid
  campaignsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  // Dashboard Campaign Card
  dashboardCampaignCard: {
    flex: 1,
    minWidth: 280,
    maxWidth: Platform.OS === 'web' ? '48%' : '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  dashboardCampaignImageContainer: {
    height: 160,
    overflow: 'hidden',
  },
  dashboardCampaignImage: {
    width: '100%',
    height: '100%',
  },
  dashboardCampaignContent: {
    padding: 16,
  },
  dashboardCampaignTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  dashboardCampaignMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  dashboardCampaignMetaText: {
    fontSize: 13,
    color: '#6b7280',
  },
  dashboardProgressSection: {
    marginBottom: 16,
  },
  dashboardProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dashboardProgressLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  dashboardProgressPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  dashboardProgressTrack: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  dashboardProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  dashboardProgressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dashboardProgressRaised: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  dashboardProgressGoal: {
    fontSize: 13,
    color: '#6b7280',
  },
  dashboardCampaignStats: {
    marginBottom: 16,
  },
  dashboardCampaignStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dashboardCampaignStatText: {
    fontSize: 13,
    color: '#6b7280',
  },
  dashboardCampaignActions: {
    flexDirection: 'row',
    gap: 12,
  },
  dashboardActionButtonOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dashboardActionButtonOutlineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  dashboardActionButtonFilled: {
    flex: 1,
    backgroundColor: '#14b8a6',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dashboardActionButtonFilledText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },

  // Completed Campaigns
  completedCampaignsList: {
    gap: 16,
  },
  completedCampaignCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  completedCampaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  completedCampaignInfo: {
    flex: 1,
  },
  completedCampaignTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  completedCampaignDate: {
    fontSize: 13,
    color: '#6b7280',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  completedCampaignStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
    marginBottom: 16,
  },
  completedStat: {
    alignItems: 'center',
  },
  completedStatLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  completedStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  completedCampaignActions: {
    flexDirection: 'row',
    gap: 12,
  },
  completedActionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completedActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  // History Card
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  historyCardHeader: {
    marginBottom: 20,
  },
  historyCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  historyCardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  historyTimeline: {
    gap: 12,
  },
  historyTimelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    gap: 12,
  },
  historyTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  historyTimelineContent: {
    flex: 1,
  },
  historyTimelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  historyTimelineMeta: {
    fontSize: 13,
    color: '#6b7280',
  },
  historyTimelineAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  historyTimelineActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },

  // Explore Button
  exploreButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 40,
    alignItems: 'center',
  },
  exploreButton: {
    borderRadius: 10,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  exploreButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 8,
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

// NOTE: styles added below by patch - keep grouped for readability
const extraStyles = StyleSheet.create({
  modalBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 200
  },
  modalBackdrop50: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', zIndex: 99, width: '50%', margin: 'auto',
    backgroundColor: 'rgba(20, 184, 166, 0.1)'
  },
  historyModal: {
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 24, 
    width: '90%', 
    maxWidth: 450,
    maxHeight: '80%',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(147, 112, 219, 0.2)'
  },
  historyTitleContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  historyTitleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20
  },
  historyTitle: { 
    fontWeight: '700', 
    fontSize: 20, 
    color: '#fff', 
    textAlign: 'center',
    letterSpacing: 0.5
  },
  historyScroll: { 
    maxHeight: 350,
    paddingHorizontal: 4
  },
  historyItem: { 
    marginBottom: 16, 
    padding: 16, 
    borderRadius: 12, 
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: 'rgba(147, 112, 219, 0.1)',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  historyItemTitle: { 
    fontWeight: '600',
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 6
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  emptyHistoryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center'
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center'
  },
  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  historyItemStatus: { 
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    marginTop: 4
  },
  historyItemStatusText: {
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center'
  },
  seeDetailsBtn: { 
    marginTop: 12, 
    backgroundColor: '#ef4444', 
    borderRadius: 8, 
    padding: 8, 
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3
  },
  seeDetailsText: { 
    color: '#fff',
    fontWeight: '600',
    fontSize: 12
  },
  historyCloseBtn: { 
    marginTop: 24, 
    borderRadius: 12, 
    alignSelf: 'center',
    overflow: 'hidden',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  historyCloseBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    minWidth: 140
  },
  historyCloseText: { 
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    textAlign: 'center'
  },

  campaignModal: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 24, 
    width: '90%', 
    maxWidth: 520,
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
  campaignModalImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  campaignTitleContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  campaignTitleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  campaignModalTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#fff', 
    textAlign: 'center',
    letterSpacing: 0.5,
    flex: 1,
  },
  campaignModalDesc: { 
    color: '#4a5568', 
    marginBottom: 16, 
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  progressContainer: { width: '100%', marginBottom: 16 },
  progressTrack: { 
    height: 16, 
    backgroundColor: 'rgba(148, 112, 219, 0.1)', 
    borderRadius: 12, 
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(148, 112, 219, 0.2)',
  },
  progressFill: { 
    height: '100%', 
    borderRadius: 12,
  },
  progressText: { 
    textAlign: 'center', 
    marginTop: 8, 
    color: '#9370DB',
    fontSize: 15,
    fontWeight: '600',
  },
  donateInput: { 
    borderWidth: 2, 
    borderColor: 'rgba(148, 112, 219, 0.3)', 
    borderRadius: 12, 
    padding: 12, 
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: 'rgba(148, 112, 219, 0.05)',
    color: '#4a5568',
  },
  campaignModalActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  campaignModalActionsVertical: { 
    flexDirection: 'column', 
    gap: 12,
    marginTop: 8,
  },
  modalActionBtn: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalActionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  modalActionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },

  primaryBtn: { 
    paddingVertical: 14, 
    paddingHorizontal: 24, 
    borderRadius: 10,
    backgroundColor: '#14b8a6',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  closeLink: { 
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
  },
  closeLinkText: { 
    color: '#14b8a6', 
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },

  remainingText: { 
    fontSize: 14, 
    color: '#14b8a6', 
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: { 
    fontSize: 14, 
    color: '#ef4444', 
    marginBottom: 8,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryBtnDisabled: { 
    opacity: 0.6,
  },

  walletModal: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 24, 
    width: '85%', 
    maxWidth: 420,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  walletModalTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#14b8a6', 
    marginBottom: 12,
  },
  walletConnectedText: { 
    marginBottom: 12,
    fontSize: 14,
    color: '#374151',
  },
  disconnectBtn: { 
    backgroundColor: '#ef4444', 
    padding: 12, 
    borderRadius: 10,
    alignItems: 'center',
  },
  disconnectBtnText: { 
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  walletModalHelp: { 
    marginBottom: 16,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  helpLink: { 
    padding: 8,
    marginTop: 8,
  },
  helpLinkText: { 
    color: '#14b8a6',
    fontSize: 13,
  },
  closeModalLink: { 
    marginTop: 16, 
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },

  reasonModal: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 24, 
    width: '88%',
    maxWidth: 400,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)'
  },
  reasonTitleContainer: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  reasonTitleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20
  },
  reasonTitle: { 
    fontWeight: '700', 
    fontSize: 18, 
    color: '#fff', 
    textAlign: 'center',
    letterSpacing: 0.5
  },
  reasonContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
    marginBottom: 20
  },
  reasonText: { 
    color: '#374151', 
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
    fontWeight: '500'
  },
  reasonCloseBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6
  },
  reasonCloseBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24
  },
  reasonCloseBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },

  // Donation Confirmation Modal Styles
  confirmationModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  confirmationHeader: {
    overflow: 'hidden',
  },
  confirmationHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  confirmationHeaderText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confirmationScrollView: {
    flex: 1,
  },
  confirmationContent: {
    padding: 24,
  },
  confirmationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmationAmountBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e7ff',
  },
  confirmationAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#9370DB',
    marginLeft: 12,
  },
  confirmationDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 20,
  },
  confirmationCampaignBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  confirmationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmationCampaignTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
    flex: 1,
  },
  confirmationCampaignDesc: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  confirmationStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  confirmationStat: {
    alignItems: 'center',
  },
  confirmationStatLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
    fontWeight: '600',
  },
  confirmationStatValue: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '700',
  },
  confirmationBalanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  confirmationBalanceText: {
    fontSize: 14,
    color: '#166534',
    marginLeft: 8,
    fontWeight: '600',
  },
  confirmationWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  confirmationWarningText: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  confirmationActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  confirmationCancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  confirmationCancelText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmationConfirmBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#9370DB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmationConfirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  confirmationConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Error Modal Styles
  errorModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '88%',
    maxWidth: 450,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 24,
  },
  errorModalHeader: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  errorModalContent: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  errorModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorModalMessage: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  errorModalButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  errorModalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ===================== ACCOUNTABILITY / SPENDINGS STYLES =====================

  // Spendings Modal
  spendingsModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '92%',
    maxWidth: 550,
    maxHeight: '85%',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  spendingsHeader: {
    width: '100%',
  },
  spendingsHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  spendingsHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  spendingsScrollView: {
    maxHeight: 450,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  spendingsCampaignInfo: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  spendingsCampaignTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 12,
  },
  spendingsStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  spendingsStat: {
    alignItems: 'center',
    flex: 1,
  },
  spendingsStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  spendingsStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  addSpendingBtn: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addSpendingBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  addSpendingBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  spendingsDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  spendingsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  spendingsLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  spendingsLoadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  spendingsEmptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  spendingsEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 12,
  },
  spendingsEmptySubtext: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  spendingItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  spendingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spendingItemCategory: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spendingItemCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0d9488',
    marginLeft: 4,
  },
  spendingItemDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  spendingItemDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  spendingItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spendingItemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  viewReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f2f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewReceiptBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14b8a6',
    marginLeft: 4,
  },
  spendingsCloseBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  spendingsCloseBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },

  // Add Spending Modal
  addSpendingModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '92%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  addSpendingHeader: {
    width: '100%',
  },
  addSpendingHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  addSpendingHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  addSpendingScrollView: {
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: 400,
  },
  addSpendingInputGroup: {
    marginBottom: 20,
  },
  addSpendingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  addSpendingInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    ...(Platform.OS === 'web' && { outlineStyle: 'none' }),
  },
  addSpendingHint: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 6,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categorySelectorItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categorySelectorItemActive: {
    backgroundColor: '#e0f2f1',
    borderColor: '#14b8a6',
  },
  categorySelectorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  categorySelectorTextActive: {
    color: '#0d9488',
    fontWeight: '600',
  },
  receiptUploadContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  receiptUploadBtn: {
    flex: 1,
    backgroundColor: '#f0fdfa',
    borderWidth: 2,
    borderColor: '#14b8a6',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptUploadBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14b8a6',
    marginTop: 4,
  },
  receiptPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  receiptPreviewText: {
    flex: 1,
    fontSize: 13,
    color: '#065f46',
    marginLeft: 8,
  },
  addSpendingActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  addSpendingCancelBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addSpendingCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  addSpendingSubmitBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addSpendingSubmitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  addSpendingSubmitBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // ===================== NOTIFICATION STYLES =====================
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  notificationsPanelContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: Math.min(400, width * 0.9),
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  notificationsPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  notificationsPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationsPanelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
  },
  notificationCountBadge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  notificationCountText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '700',
  },
  closeNotificationsBtn: {
    padding: 8,
  },
  markAllReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#faf5ff',
  },
  markAllReadText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  notificationsList: {
    flex: 1,
  },
  notificationsLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  notificationsLoadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
  },
  noNotificationsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  noNotificationsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  noNotificationsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#fff',
  },
  notificationItemUnread: {
    backgroundColor: '#faf5ff',
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationIconEmoji: {
    fontSize: 22,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 6,
  },
  notificationUnreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8b5cf6',
    marginLeft: 8,
    marginTop: 6,
  },
  // ===================== TOAST NOTIFICATION STYLES =====================
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    maxWidth: 350,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    flex: 1,
  },
  toastSuccess: {
    backgroundColor: '#10b981',
  },
  toastError: {
    backgroundColor: '#ef4444',
  },
  toastWarning: {
    backgroundColor: '#f59e0b',
  },
  toastInfo: {
    backgroundColor: '#3b82f6',
  },
});

// Merge extraStyles into styles object by copying properties so existing code can reference styles.* uniformly
Object.assign(styles, extraStyles);

export default UserInterface;