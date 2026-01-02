/**
 * History Screen
 * Shows user's campaign history:
 * - For Campaign Creators: Created campaigns with timestamps and approval status, plus donated campaigns
 * - For Donors: Campaigns they've donated to with timestamps and total amount donated
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';

const HistoryScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [createdCampaigns, setCreatedCampaigns] = useState([]);
  const [donatedCampaigns, setDonatedCampaigns] = useState([]);
  const [totalDonated, setTotalDonated] = useState(0);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setError(null);
      
      // Get user role and ID
      const role = await AsyncStorage.getItem('userRole');
      const userId = await AsyncStorage.getItem('userId');
      setUserRole(role);

      if (!userId) {
        setError('Please log in to view history');
        setLoading(false);
        return;
      }

      // Fetch user's campaigns (created by them)
      const myCampaigns = await ApiService.getMyCampaigns();
      
      if (Array.isArray(myCampaigns)) {
        // Sort by date created (newest first)
        const sortedCampaigns = myCampaigns.sort((a, b) => 
          new Date(b.dateCreated || b.createdAt) - new Date(a.dateCreated || a.createdAt)
        );
        setCreatedCampaigns(sortedCampaigns);
      }

      // Fetch all campaigns to find ones user donated to
      const allCampaigns = await ApiService.listCampaigns();
      
      if (Array.isArray(allCampaigns)) {
        // Filter campaigns where user has donated
        const donated = allCampaigns.filter(campaign => {
          if (!campaign.donations || !Array.isArray(campaign.donations)) return false;
          return campaign.donations.some(donation => 
            donation.donorId === userId || donation.donor === userId
          );
        });

        // Calculate donations for each campaign
        const donatedWithAmount = donated.map(campaign => {
          const userDonations = campaign.donations.filter(d => 
            d.donorId === userId || d.donor === userId
          );
          const totalToThisCampaign = userDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
          const lastDonation = userDonations.sort((a, b) => 
            new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)
          )[0];
          
          return {
            ...campaign,
            userDonationAmount: totalToThisCampaign,
            lastDonationDate: lastDonation?.timestamp || lastDonation?.createdAt,
          };
        });

        // Sort by last donation date
        donatedWithAmount.sort((a, b) => 
          new Date(b.lastDonationDate) - new Date(a.lastDonationDate)
        );

        setDonatedCampaigns(donatedWithAmount);

        // Calculate total donated
        const total = donatedWithAmount.reduce((sum, c) => sum + c.userDonationAmount, 0);
        setTotalDonated(total);
      }

    } catch (err) {
      console.error('Error fetching history:', err);
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'checkmark-circle';
      case 'pending':
        return 'time';
      case 'rejected':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  const renderCreatedCampaignCard = (campaign) => (
    <TouchableOpacity
      key={campaign._id}
      style={styles.campaignCard}
      onPress={() => navigation.navigate('CampaignDetails', { campaignId: campaign._id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Text style={styles.campaignTitle} numberOfLines={2}>{campaign.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{formatDate(campaign.dateCreated || campaign.createdAt)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="cash-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>
              {parseFloat(campaign.amountRaised || 0).toFixed(4)} / {campaign.goal} ETH
            </Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(campaign.status) + '20' }]}>
            <Ionicons 
              name={getStatusIcon(campaign.status)} 
              size={14} 
              color={getStatusColor(campaign.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(campaign.status) }]}>
              {campaign.status?.charAt(0).toUpperCase() + campaign.status?.slice(1) || 'Unknown'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
        </View>
      </View>
      {campaign.status === 'rejected' && campaign.rejectionReason && (
        <View style={styles.rejectionBox}>
          <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
          <Text style={styles.rejectionText}>{campaign.rejectionReason}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderDonatedCampaignCard = (campaign) => (
    <TouchableOpacity
      key={campaign._id}
      style={styles.campaignCard}
      onPress={() => navigation.navigate('CampaignDetails', { campaignId: campaign._id })}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Text style={styles.campaignTitle} numberOfLines={2}>{campaign.title}</Text>
          <Text style={styles.creatorText}>by {campaign.creatorName}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{formatDate(campaign.lastDonationDate)}</Text>
          </View>
        </View>
        <View style={styles.cardRight}>
          <View style={styles.donationBadge}>
            <Text style={styles.donationAmount}>
              {campaign.userDonationAmount?.toFixed(4)} ETH
            </Text>
            <Text style={styles.donationLabel}>Donated</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.chevron} />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );
  }

  const isCampaignCreator = userRole === 'campaign_creator';

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0d9488', '#14b8a6']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>History</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#14b8a6']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Campaign Creator Section */}
            {isCampaignCreator && (
              <>
                {/* Created Campaigns */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="create-outline" size={22} color="#14b8a6" />
                    <Text style={styles.sectionTitle}>My Created Campaigns</Text>
                    <View style={styles.countBadge}>
                      <Text style={styles.countText}>{createdCampaigns.length}</Text>
                    </View>
                  </View>

                  {createdCampaigns.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="document-outline" size={40} color="#D1D5DB" />
                      <Text style={styles.emptyText}>No campaigns created yet</Text>
                      <TouchableOpacity 
                        style={styles.createButton}
                        onPress={() => navigation.navigate('CampaignCreation')}
                      >
                        <Text style={styles.createButtonText}>Create Campaign</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    createdCampaigns.map(renderCreatedCampaignCard)
                  )}
                </View>

                {/* Donated Campaigns for Creator */}
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Ionicons name="heart-outline" size={22} color="#EC4899" />
                    <Text style={styles.sectionTitle}>Campaigns I Donated To</Text>
                    <View style={[styles.countBadge, { backgroundColor: '#EC489920' }]}>
                      <Text style={[styles.countText, { color: '#EC4899' }]}>{donatedCampaigns.length}</Text>
                    </View>
                  </View>

                  {donatedCampaigns.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="heart-outline" size={40} color="#D1D5DB" />
                      <Text style={styles.emptyText}>No donations made yet</Text>
                    </View>
                  ) : (
                    donatedCampaigns.map(renderDonatedCampaignCard)
                  )}
                </View>
              </>
            )}

            {/* Donor Section */}
            {!isCampaignCreator && (
              <View style={styles.section}>
                {/* Total Donated Summary */}
                <View style={styles.summaryCard}>
                  <LinearGradient colors={['#EC4899', '#F472B6']} style={styles.summaryGradient}>
                    <Ionicons name="heart" size={32} color="#fff" />
                    <Text style={styles.summaryLabel}>Total Donated</Text>
                    <Text style={styles.summaryAmount}>{totalDonated.toFixed(4)} ETH</Text>
                    <Text style={styles.summaryCount}>
                      Across {donatedCampaigns.length} campaign{donatedCampaigns.length !== 1 ? 's' : ''}
                    </Text>
                  </LinearGradient>
                </View>

                <View style={styles.sectionHeader}>
                  <Ionicons name="heart-outline" size={22} color="#EC4899" />
                  <Text style={styles.sectionTitle}>Donated Campaigns</Text>
                  <View style={[styles.countBadge, { backgroundColor: '#EC489920' }]}>
                    <Text style={[styles.countText, { color: '#EC4899' }]}>{donatedCampaigns.length}</Text>
                  </View>
                </View>

                {donatedCampaigns.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="heart-outline" size={40} color="#D1D5DB" />
                    <Text style={styles.emptyText}>No donations made yet</Text>
                    <TouchableOpacity 
                      style={styles.createButton}
                      onPress={() => navigation.navigate('Explore')}
                    >
                      <Text style={styles.createButtonText}>Explore Campaigns</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  donatedCampaigns.map(renderDonatedCampaignCard)
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#14b8a620',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  campaignCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  campaignTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  creatorText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  chevron: {
    marginTop: 8,
  },
  rejectionBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  rejectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: '#7F1D1D',
  },
  donationBadge: {
    alignItems: 'flex-end',
  },
  donationAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EC4899',
  },
  donationLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#9CA3AF',
    marginTop: 12,
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  summaryCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  summaryGradient: {
    padding: 24,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  summaryCount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#14b8a6',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default HistoryScreen;
