/**
 * Mobile Dashboard Screen - Fully Dynamic
 * Fetches real data from MongoDB database
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';
import { calculateProgress } from '../utils/helpers';

// Format ETH amount
const formatETH = (amount) => {
  if (!amount) return '0 ETH';
  return `${Number(amount).toFixed(4)} ETH`;
};

const QuickStatCard = ({ icon, value, label, color, isLoading }) => (
  <View style={[styles.statCard, { borderTopColor: color }]}>
    <Text style={styles.statIcon}>{icon}</Text>
    {isLoading ? (
      <ActivityIndicator size="small" color={color} />
    ) : (
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    )}
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const CampaignMiniCard = ({ campaign, onPress }) => {
  const progress = calculateProgress(campaign.amountRaised, campaign.goal);
  const placeholderImage = 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400&q=80';
  
  return (
    <TouchableOpacity
      style={styles.miniCard}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.miniCardRow}>
        <Image
          source={{ uri: campaign.imageKey || placeholderImage }}
          style={styles.miniCardImage}
          resizeMode="cover"
        />
        <View style={styles.miniCardContent}>
          <Text style={styles.miniCardTitle} numberOfLines={1}>{campaign.title}</Text>
          <Text style={styles.miniCardCategory}>{campaign.category || 'General'}</Text>
          <View style={styles.miniProgressBar}>
            <View style={[styles.miniProgressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <View style={styles.miniCardStats}>
            <Text style={styles.miniCardRaised}>{formatETH(campaign.amountRaised)}</Text>
            <Text style={styles.miniCardPercent}>{progress.toFixed(0)}%</Text>
          </View>
        </View>
      </View>
      {/* Status Badge for creator's campaigns */}
      {campaign.status && (
        <View style={[
          styles.statusBadge,
          campaign.status === 'approved' ? styles.statusApproved :
          campaign.status === 'pending' ? styles.statusPending :
          styles.statusRejected
        ]}>
          <Text style={styles.statusText}>
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const DashboardScreen = ({ navigation }) => {
  // State
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [myCampaigns, setMyCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Load all data
  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
        setIsStatsLoading(true);
      }
      setError(null);

      // Get user info from AsyncStorage
      const [userId, userName, userEmail, userRole] = await Promise.all([
        AsyncStorage.getItem('userId'),
        AsyncStorage.getItem('userName'),
        AsyncStorage.getItem('userEmail'),
        AsyncStorage.getItem('userRole'),
      ]);

      if (!userId) {
        setError('Please sign in to view dashboard');
        setIsLoading(false);
        return;
      }

      // Set basic user info
      const basicUser = {
        _id: userId,
        name: userName || 'User',
        email: userEmail || '',
        role: userRole || 'donor',
      };
      setUser(basicUser);

      // Fetch data in parallel
      const fetchPromises = [
        ApiService.getFeaturedCampaigns(10),
        ApiService.getUserStats(),
      ];

      // If user is campaign creator, also fetch their campaigns
      if (userRole === 'campaign_creator') {
        fetchPromises.push(ApiService.getUserCampaigns(userId));
      }

      const results = await Promise.allSettled(fetchPromises);

      // Handle featured campaigns
      if (results[0].status === 'fulfilled') {
        setCampaigns(results[0].value || []);
      } else {
        console.error('Error fetching campaigns:', results[0].reason);
        setCampaigns([]);
      }

      // Handle user stats
      if (results[1].status === 'fulfilled') {
        setUserStats(results[1].value);
      } else {
        console.error('Error fetching stats:', results[1].reason);
        setUserStats(null);
      }

      // Handle my campaigns (for creators)
      if (userRole === 'campaign_creator' && results[2]) {
        if (results[2].status === 'fulfilled') {
          setMyCampaigns(results[2].value || []);
        } else {
          console.error('Error fetching my campaigns:', results[2].reason);
          setMyCampaigns([]);
        }
      }

      // Also fetch fresh user profile from DB
      try {
        const freshProfile = await ApiService.getUserProfile();
        if (freshProfile) {
          setUser(prev => ({ ...prev, ...freshProfile }));
        }
      } catch (profileError) {
        console.log('Could not fetch fresh profile:', profileError);
      }

    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  }, [loadData]);

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Check if user is campaign creator
  const isCampaignCreator = user?.role === 'campaign_creator';
  const isDonor = user?.role === 'donor';

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#14b8a6" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !user) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>😕</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadData()}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#14b8a6" />
      
      {/* Header */}
      <LinearGradient
        colors={['#14b8a6', '#2563eb']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileButtonText}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Role Badge & Status */}
        <View style={styles.roleBadgeContainer}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {isCampaignCreator ? '🚀 Campaign Creator' : '💖 Donor'}
            </Text>
          </View>
          {/* Approval Status for Campaign Creators */}
          {isCampaignCreator && user?.approvalStatus && (
            <View style={[
              styles.approvalBadge,
              user.approvalStatus === 'approved' ? styles.approvalApproved :
              user.approvalStatus === 'pending' ? styles.approvalPending :
              styles.approvalRejected
            ]}>
              <Text style={styles.approvalBadgeText}>
                {user.approvalStatus === 'approved' ? '✓ Verified' :
                 user.approvalStatus === 'pending' ? '⏳ Pending' : '✗ Rejected'}
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
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#14b8a6']}
            tintColor="#14b8a6"
          />
        }
      >
        {/* Quick Stats - Dynamic based on role */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsContainer}
          >
            {isDonor ? (
              // Donor Stats
              <>
                <QuickStatCard
                  icon="💰"
                  value={formatETH(userStats?.totalDonated || 0)}
                  label="Total Donated"
                  color="#14b8a6"
                  isLoading={isStatsLoading}
                />
                <QuickStatCard
                  icon="🎯"
                  value={String(userStats?.campaignsSupported || 0)}
                  label="Campaigns Supported"
                  color="#2563eb"
                  isLoading={isStatsLoading}
                />
                <QuickStatCard
                  icon="📅"
                  value={String(userStats?.donationsThisMonth || 0)}
                  label="This Month"
                  color="#8b5cf6"
                  isLoading={isStatsLoading}
                />
              </>
            ) : (
              // Campaign Creator Stats
              <>
                <QuickStatCard
                  icon="📊"
                  value={String(userStats?.totalCampaigns || myCampaigns.length || 0)}
                  label="My Campaigns"
                  color="#14b8a6"
                  isLoading={isStatsLoading}
                />
                <QuickStatCard
                  icon="💵"
                  value={formatETH(userStats?.totalRaised || 0)}
                  label="Total Raised"
                  color="#2563eb"
                  isLoading={isStatsLoading}
                />
                <QuickStatCard
                  icon="👥"
                  value={String(userStats?.totalContributors || 0)}
                  label="Total Backers"
                  color="#8b5cf6"
                  isLoading={isStatsLoading}
                />
                <QuickStatCard
                  icon="✅"
                  value={String(userStats?.approvedCampaigns || myCampaigns.filter(c => c.status === 'approved').length || 0)}
                  label="Active Campaigns"
                  color="#10b981"
                  isLoading={isStatsLoading}
                />
              </>
            )}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('ExploreCampaigns')}
            >
              <LinearGradient
                colors={['#14b8a6', '#0d9488']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonIcon}>🔍</Text>
                <Text style={styles.actionButtonText}>Explore</Text>
              </LinearGradient>
            </TouchableOpacity>

            {isCampaignCreator && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('CampaignCreation')}
              >
                <LinearGradient
                  colors={['#2563eb', '#1d4ed8']}
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionButtonIcon}>➕</Text>
                  <Text style={styles.actionButtonText}>Create</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonIcon}>👤</Text>
                <Text style={styles.actionButtonText}>Profile</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* My Campaigns Section - Only for Campaign Creators */}
        {isCampaignCreator && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Campaigns</Text>
              {myCampaigns.length > 3 && (
                <TouchableOpacity onPress={() => navigation.navigate('MyCampaigns')}>
                  <Text style={styles.seeAllText}>See All ({myCampaigns.length})</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {myCampaigns.length > 0 ? (
              myCampaigns.slice(0, 3).map((campaign) => (
                <CampaignMiniCard
                  key={campaign._id}
                  campaign={campaign}
                  onPress={() => navigation.navigate('CampaignDetails', { campaign })}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>🚀</Text>
                <Text style={styles.emptyText}>Create your first campaign</Text>
                <Text style={styles.emptySubtext}>Start raising funds for your cause</Text>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => navigation.navigate('CampaignCreation')}
                >
                  <Text style={styles.createButtonText}>Get Started</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Featured Campaigns */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isDonor ? 'Campaigns to Support' : 'Featured Campaigns'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('ExploreCampaigns')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          
          {campaigns.length > 0 ? (
            campaigns.slice(0, 5).map((campaign) => (
              <CampaignMiniCard
                key={campaign._id}
                campaign={{ ...campaign, status: undefined }} // Hide status for featured
                onPress={() => navigation.navigate('CampaignDetails', { campaign })}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>No campaigns available</Text>
              <Text style={styles.emptySubtext}>Check back later for new campaigns</Text>
            </View>
          )}
        </View>

        {/* Spacer for bottom nav */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('ExploreCampaigns')}
        >
          <Text style={styles.navIcon}>🔍</Text>
          <Text style={styles.navLabel}>Explore</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Text style={[styles.navIcon, styles.navIconActive]}>📊</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  profileButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  roleBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
  },
  approvalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  approvalApproved: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  approvalPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
  },
  approvalRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  approvalBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  statsContainer: {
    paddingRight: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    alignItems: 'center',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  miniCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  miniCardRow: {
    flexDirection: 'row',
    padding: 12,
  },
  miniCardImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
  },
  miniCardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  miniCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  miniCardCategory: {
    fontSize: 12,
    color: '#14b8a6',
    marginBottom: 8,
  },
  miniProgressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  miniProgressFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 3,
  },
  miniCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniCardRaised: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14b8a6',
  },
  miniCardPercent: {
    fontSize: 13,
    color: '#6b7280',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusApproved: {
    backgroundColor: '#d1fae5',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
  },
  navIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  navIconActive: {
    transform: [{ scale: 1.1 }],
  },
  navLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  navLabelActive: {
    color: '#14b8a6',
    fontWeight: '600',
  },
});

export default DashboardScreen;
