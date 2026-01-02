import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiService } from '../services/ApiService';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Animated, Alert, Image } from 'react-native';
import { Modal, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export default function AdminPortalScreen({ navigation }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCampaignId, setRejectCampaignId] = useState(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteUserId, setPromoteUserId] = useState(null);
  const [promoteUserName, setPromoteUserName] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCampaignId, setDeleteCampaignId] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [allCampaigns, setAllCampaigns] = useState([]);
  const [users, setUsers] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('pending-campaigns');
  const [role, setRole] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [rejectUserId, setRejectUserId] = useState(null);
  const [rejectUserReason, setRejectUserReason] = useState('');
  const [showRejectUserModal, setShowRejectUserModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  
  // Donation states
  const [recentDonations, setRecentDonations] = useState([]);
  const [donationStats, setDonationStats] = useState(null);
  const [donationsLoading, setDonationsLoading] = useState(false);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const checkRoleAndFetchData = async () => {
      const userRole = await AsyncStorage.getItem('userRole');
      setRole(userRole);
      if (userRole !== 'admin') {
        setAccessDenied(true);
        setTimeout(() => {
          navigation.replace('UserInterface');
        }, 2000);
        return;
      }
      setLoading(true);
      try {
        const allCampaignsData = await ApiService.listCampaigns();
        setAllCampaigns(allCampaignsData);
        
        const pendingCampaigns = await ApiService.listCampaigns('pending');
        setCampaigns(pendingCampaigns);
        
        const allUsers = await ApiService.getAllUsers();
        setUsers(allUsers);
        
        const pendingUserApprovals = await ApiService.getPendingApprovals();
        setPendingUsers(pendingUserApprovals);
        
        // Fetch recent donations and stats
        try {
          const donationsData = await ApiService.getRecentDonations(50);
          setRecentDonations(donationsData.donations || []);
          
          const statsData = await ApiService.getDonationStats();
          setDonationStats(statsData.stats || null);
        } catch (donationError) {
          console.error('Error fetching donations:', donationError);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    checkRoleAndFetchData();
  }, []);

  const handleApprove = async (id) => {
    setLoading(true);
    try {
      await ApiService.approveCampaign(id);
      const pendingCampaigns = await ApiService.listCampaigns('pending');
      setCampaigns(pendingCampaigns);
      const allCampaignsData = await ApiService.listCampaigns();
      setAllCampaigns(allCampaignsData);
    } catch (error) {
      console.error('Approve error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = (id) => {
    setRejectCampaignId(id);
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (!rejectCampaignId) return;
    setLoading(true);
    try {
      await ApiService.rejectCampaign(rejectCampaignId, rejectReason || 'Not approved by admin');
      setShowRejectModal(false);
      setRejectReason('');
      setRejectCampaignId(null);
      const pendingCampaigns = await ApiService.listCampaigns('pending');
      setCampaigns(pendingCampaigns);
      const allCampaignsData = await ApiService.listCampaigns();
      setAllCampaigns(allCampaignsData);
    } catch (error) {
      console.error('Reject error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    setLoading(true);
      try {
        console.log('[AdminPortal] Deleting campaign id=', id);
        const res = await ApiService.deleteCampaign(id);
        console.log('[AdminPortal] delete response=', res);
        // Re-fetch lists from server to ensure consistency
        try {
          const pendingCampaigns = await ApiService.listCampaigns('pending');
          const allCampaignsData = await ApiService.listCampaigns();
          console.log('[AdminPortal] refreshed pending count=', pendingCampaigns.length, 'all count=', allCampaignsData.length);
          // Ensure any lingering objects with different id field are removed
          const normalizedPending = pendingCampaigns.filter(c => !(c._id === id || c.id === id));
          const normalizedAll = allCampaignsData.filter(c => !(c._id === id || c.id === id));
          setCampaigns(normalizedPending);
          setAllCampaigns(normalizedAll);
        } catch (refreshErr) {
          // If re-fetch fails, at least remove locally (support both id formats)
          setAllCampaigns(prev => prev.filter(c => !(c._id === id || c.id === id)));
          setCampaigns(prev => prev.filter(c => !(c._id === id || c.id === id)));
          console.error('Error refreshing lists after delete:', refreshErr);
        }
        Alert.alert('Deleted', 'Campaign deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.error('[AdminPortal] delete error response status=', status, 'data=', data);
      const msg = (data && data.message) || (data && JSON.stringify(data)) || 'Could not delete campaign. Please try again.';
      Alert.alert('Delete failed', `Status: ${status || 'unknown'}\n${msg}`);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
      setDeleteCampaignId(null);
    }
  };

  const promptDelete = (id) => {
    setDeleteCampaignId(id);
    setShowDeleteModal(true);
  };

  const handleUserStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'restricted' : 'active';
    setLoading(true);
    try {
      await ApiService.updateUserStatus(userId, newStatus);
      const allUsers = await ApiService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Update user status error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = (userId, userName) => {
    setPromoteUserId(userId);
    setPromoteUserName(userName);
    setShowPromoteModal(true);
  };

  const confirmPromoteToAdmin = async () => {
    if (!promoteUserId) return;
    setLoading(true);
    try {
      await ApiService.updateUserRole(promoteUserId, 'admin');
      setShowPromoteModal(false);
      setPromoteUserId(null);
      setPromoteUserName('');
      const allUsers = await ApiService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Promote to admin error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId) => {
    setLoading(true);
    try {
      await ApiService.approveUser(userId);
      const pendingUserApprovals = await ApiService.getPendingApprovals();
      setPendingUsers(pendingUserApprovals);
      Alert.alert('Success', 'User approved successfully');
    } catch (error) {
      console.error('Approve user error:', error);
      Alert.alert('Error', 'Failed to approve user');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectUser = (userId) => {
    setRejectUserId(userId);
    setShowRejectUserModal(true);
  };

  const submitRejectUser = async () => {
    if (!rejectUserId) return;
    setLoading(true);
    try {
      await ApiService.rejectUser(rejectUserId, rejectUserReason || 'Not approved by admin');
      setShowRejectUserModal(false);
      setRejectUserReason('');
      setRejectUserId(null);
      const pendingUserApprovals = await ApiService.getPendingApprovals();
      setPendingUsers(pendingUserApprovals);
      Alert.alert('Success', 'User rejected');
    } catch (error) {
      console.error('Reject user error:', error);
      Alert.alert('Error', 'Failed to reject user');
    } finally {
      setLoading(false);
    }
  };

  const handleViewCertificate = (certificateUrl) => {
    setSelectedCertificate(certificateUrl);
    setShowCertificateModal(true);
  };

  const handleDownloadCertificate = (certificateUrl) => {
    // Open in new tab for download
    window.open(certificateUrl, '_blank');
  };

  if (accessDenied) {
    return (
      <LinearGradient colors={["#14b8a6", "#2563eb"]} style={styles.background}>
        <Animated.View style={[styles.accessDeniedContainer, { opacity: fadeAnim }]}>
          <View style={styles.accessDeniedCard}>
            <Ionicons name="lock-closed" size={64} color="#ef4444" />
            <Text style={styles.accessDeniedTitle}>Access Denied</Text>
            <Text style={styles.accessDeniedText}>You do not have permission to view this page.</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.wrapper}>
      <LinearGradient colors={["#14b8a6", "#2563eb"]} style={styles.background}>
        {/* Animated Blobs Background */}
        <View style={styles.blobContainer}>
          <Animated.View style={[styles.blob, styles.blob1]} />
          <Animated.View style={[styles.blob, styles.blob2]} />
          <Animated.View style={[styles.blob, styles.blob3]} />
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']}
                style={styles.headerCard}
              >
                <Ionicons name="shield-checkmark" size={40} color="#fff" />
                <Text style={styles.heading}>Admin Portal</Text>
                <Text style={styles.subheading}>Manage campaigns and users</Text>
              </LinearGradient>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBarContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.tabBar}
              >
                <TouchableOpacity 
                  onPress={() => setTab('all-campaigns')} 
                  style={[styles.tab, tab === 'all-campaigns' && styles.activeTab]}
                  activeOpacity={0.7}
                >
                  {tab === 'all-campaigns' && (
                    <LinearGradient
                      colors={['#8b5cf6', '#ec4899']}
                      style={styles.activeTabGradient}
                    />
                  )}
                  <Ionicons name="albums" size={20} color="#fff" style={styles.tabIcon} />
                  <Text style={styles.tabText}>All Campaigns</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setTab('pending-campaigns')} 
                  style={[styles.tab, tab === 'pending-campaigns' && styles.activeTab]}
                  activeOpacity={0.7}
                >
                  {tab === 'pending-campaigns' && (
                    <LinearGradient
                      colors={['#8b5cf6', '#ec4899']}
                      style={styles.activeTabGradient}
                    />
                  )}
                  <Ionicons name="time" size={20} color="#fff" style={styles.tabIcon} />
                  <Text style={styles.tabText}>Pending</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setTab('users')} 
                  style={[styles.tab, tab === 'users' && styles.activeTab]}
                  activeOpacity={0.7}
                >
                  {tab === 'users' && (
                    <LinearGradient
                      colors={['#8b5cf6', '#ec4899']}
                      style={styles.activeTabGradient}
                    />
                  )}
                  <MaterialIcons name="people" size={20} color="#fff" style={styles.tabIcon} />
                  <Text style={styles.tabText}>Users</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setTab('user-approvals')} 
                  style={[styles.tab, tab === 'user-approvals' && styles.activeTab]}
                  activeOpacity={0.7}
                >
                  {tab === 'user-approvals' && (
                    <LinearGradient
                      colors={['#8b5cf6', '#ec4899']}
                      style={styles.activeTabGradient}
                    />
                  )}
                  <Ionicons name="checkmark-done" size={20} color="#fff" style={styles.tabIcon} />
                  <Text style={styles.tabText}>Approvals</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setTab('donations')} 
                  style={[styles.tab, tab === 'donations' && styles.activeTab]}
                  activeOpacity={0.7}
                >
                  {tab === 'donations' && (
                    <LinearGradient
                      colors={['#8b5cf6', '#ec4899']}
                      style={styles.activeTabGradient}
                    />
                  )}
                  <Ionicons name="cash" size={20} color="#fff" style={styles.tabIcon} />
                  <Text style={styles.tabText}>Donations</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Content */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : tab === 'all-campaigns' ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>All Campaigns</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{allCampaigns.length}</Text>
                  </View>
                </View>
                {allCampaigns.map(c => (
                  <LinearGradient
                    key={c._id}
                    colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                    style={styles.card}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{c.title}</Text>
                      <View style={[
                        styles.statusBadge, 
                        c.status === 'approved' && styles.statusApproved,
                        c.status === 'rejected' && styles.statusRejected,
                        c.status === 'pending' && styles.statusPending
                      ]}>
                        <Text style={styles.statusBadgeText}>{c.status}</Text>
                      </View>
                    </View>
                    <View style={styles.cardContent}>
                      <View style={styles.infoRow}>
                        <Ionicons name="person" size={16} color="#0f766e" />
                        <Text style={styles.infoText}>Creator: {c.creatorName}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="cash" size={16} color="#10b981" />
                        <Text style={styles.infoText}>Goal: ${c.goal} | Raised: ${c.raised}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="pricetag" size={16} color="#8b5cf6" />
                        <Text style={styles.infoText}>Category: {c.category}</Text>
                      </View>
                      {c.rejectionReason && (
                        <View style={styles.rejectionBox}>
                          <Text style={styles.rejectionText}>Rejection: {c.rejectionReason}</Text>
                        </View>
                      )}
                    </View>
                    {c.status === 'pending' && (
                      <View style={styles.cardActions}>
                        <TouchableOpacity 
                          onPress={() => handleApprove(c._id)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#10b981', '#059669']}
                            style={styles.actionBtn}
                          >
                            <Ionicons name="checkmark-circle" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Approve</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={() => handleReject(c._id)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#ef4444', '#dc2626']}
                            style={styles.actionBtn}
                          >
                            <Ionicons name="close-circle" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Reject</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => promptDelete(c._id)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#6b7280', '#4b5563']}
                            style={styles.actionBtn}
                          >
                            <Ionicons name="trash" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Delete</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    )}
                    {c.status !== 'pending' && (
                      <View style={styles.cardActions}>
                          <TouchableOpacity
                            onPress={() => promptDelete(c._id)}
                            activeOpacity={0.8}
                          >
                          <LinearGradient
                            colors={['#6b7280', '#4b5563']}
                            style={styles.actionBtn}
                          >
                            <Ionicons name="trash" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Delete</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    )}
                  </LinearGradient>
                ))}
              </View>
            ) : tab === 'pending-campaigns' ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pending Campaigns</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{campaigns.length}</Text>
                  </View>
                </View>
                {campaigns.map(c => (
                  <LinearGradient
                    key={c._id}
                    colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                    style={styles.card}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{c.title}</Text>
                      <View style={[styles.statusBadge, styles.statusPending]}>
                        <Text style={styles.statusBadgeText}>{c.status}</Text>
                      </View>
                    </View>
                    <View style={styles.cardContent}>
                      <View style={styles.infoRow}>
                        <Ionicons name="person" size={16} color="#0f766e" />
                        <Text style={styles.infoText}>Creator: {c.creatorName}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="cash" size={16} color="#10b981" />
                        <Text style={styles.infoText}>Goal: ${c.goal} | Raised: ${c.raised}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="pricetag" size={16} color="#8b5cf6" />
                        <Text style={styles.infoText}>Category: {c.category}</Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity 
                        onPress={() => handleApprove(c._id)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#10b981', '#059669']}
                          style={styles.actionBtn}
                        >
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Approve</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleReject(c._id)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#ef4444', '#dc2626']}
                          style={styles.actionBtn}
                        >
                          <Ionicons name="close-circle" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Reject</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => promptDelete(c._id)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#6b7280', '#4b5563']}
                          style={styles.actionBtn}
                        >
                          <Ionicons name="trash" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Delete</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            ) : tab === 'users' ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>All Users</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{users.length}</Text>
                  </View>
                </View>
                {users.map(u => (
                  <LinearGradient
                    key={u._id || u.id}
                    colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                    style={styles.card}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{u.name || u.username}</Text>
                      <View style={[
                        styles.statusBadge,
                        (u.status || 'active') === 'active' ? styles.statusApproved : styles.statusRejected
                      ]}>
                        <Text style={styles.statusBadgeText}>{u.status || 'active'}</Text>
                      </View>
                    </View>
                    <View style={styles.cardContent}>
                      <View style={styles.infoRow}>
                        <Ionicons name="mail" size={16} color="#2563eb" />
                        <Text style={styles.infoText}>Email: {u.email}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="shield" size={16} color="#8b5cf6" />
                        <Text style={styles.infoText}>Role: {u.role}</Text>
                      </View>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity 
                        onPress={() => handleUserStatus(u._id, u.status || 'active')}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={u.status === 'active' ? ['#ef4444', '#dc2626'] : ['#10b981', '#059669']}
                          style={styles.actionBtn}
                        >
                          <Ionicons 
                            name={u.status === 'active' ? 'ban' : 'checkmark-circle'} 
                            size={18} 
                            color="#fff" 
                          />
                          <Text style={styles.actionBtnText}>
                            {u.status === 'active' ? 'Restrict' : 'Unrestrict'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      {u.role !== 'admin' && (
                        <TouchableOpacity 
                          onPress={() => handlePromoteToAdmin(u._id, u.name || u.username)}
                          activeOpacity={0.8}
                        >
                          <LinearGradient
                            colors={['#8b5cf6', '#7c3aed']}
                            style={styles.actionBtn}
                          >
                            <Ionicons name="arrow-up-circle" size={18} color="#fff" />
                            <Text style={styles.actionBtnText}>Promote</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </LinearGradient>
                ))}
              </View>
            ) : tab === 'user-approvals' ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Pending User Approvals</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingUsers.length}</Text>
                  </View>
                </View>
                {pendingUsers.length === 0 && (
                  <View style={styles.emptyState}>
                    <Ionicons name="checkmark-done-circle" size={64} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.emptyText}>No pending approvals</Text>
                  </View>
                )}
                {pendingUsers.map(u => (
                  <LinearGradient
                    key={u._id}
                    colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                    style={styles.card}
                  >
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{u.name || u.username}</Text>
                      <View style={[styles.statusBadge, styles.statusPending]}>
                        <Text style={styles.statusBadgeText}>Pending</Text>
                      </View>
                    </View>
                    <View style={styles.cardContent}>
                      <View style={styles.infoRow}>
                        <Ionicons name="mail" size={16} color="#2563eb" />
                        <Text style={styles.infoText}>Email: {u.email}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="shield" size={16} color="#8b5cf6" />
                        <Text style={styles.infoText}>Role: {u.role}</Text>
                      </View>
                      {u.organizationName && (
                        <View style={styles.infoRow}>
                          <Ionicons name="business" size={16} color="#10b981" />
                          <Text style={styles.infoText}>Organization: {u.organizationName}</Text>
                        </View>
                      )}
                      {u.organizationLicenseNumber && (
                        <View style={styles.infoRow}>
                          <Ionicons name="document-text" size={16} color="#f59e0b" />
                          <Text style={styles.infoText}>License: {u.organizationLicenseNumber}</Text>
                        </View>
                      )}
                      {u.organizationDescription && (
                        <View style={styles.descriptionBox}>
                          <Text style={styles.descriptionLabel}>Description:</Text>
                          <Text style={styles.descriptionText}>{u.organizationDescription}</Text>
                        </View>
                      )}
                      {u.organizationCertificateUrl && (
                        <View style={styles.certificateSection}>
                          <Text style={styles.certificateLabel}>Organization Certificate:</Text>
                          <TouchableOpacity 
                            onPress={() => handleViewCertificate(u.organizationCertificateUrl)}
                            activeOpacity={0.8}
                          >
                            <Image 
                              source={{ uri: u.organizationCertificateUrl }} 
                              style={styles.certificateImage}
                              resizeMode="contain"
                            />
                            <View style={styles.certificateOverlay}>
                              <Ionicons name="expand" size={24} color="#fff" />
                              <Text style={styles.certificateOverlayText}>Tap to enlarge</Text>
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => handleDownloadCertificate(u.organizationCertificateUrl)}
                            style={styles.downloadButton}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="download" size={16} color="#2563eb" />
                            <Text style={styles.downloadButtonText}>Download Certificate</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity 
                        onPress={() => handleApproveUser(u._id)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#10b981', '#059669']}
                          style={styles.actionBtn}
                        >
                          <Ionicons name="checkmark-circle" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Approve</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => handleRejectUser(u._id)}
                        activeOpacity={0.8}
                      >
                        <LinearGradient
                          colors={['#ef4444', '#dc2626']}
                          style={styles.actionBtn}
                        >
                          <Ionicons name="close-circle" size={18} color="#fff" />
                          <Text style={styles.actionBtnText}>Reject</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            ) : tab === 'donations' ? (
              <View style={styles.section}>
                {/* Donation Stats */}
                <View style={styles.donationStatsContainer}>
                  <LinearGradient
                    colors={['rgba(16, 185, 129, 0.9)', 'rgba(5, 150, 105, 0.9)']}
                    style={styles.donationStatCard}
                  >
                    <Ionicons name="trending-up" size={28} color="#fff" />
                    <Text style={styles.donationStatValue}>
                      {donationStats?.allTime?.total?.toFixed(4) || '0'} ETH
                    </Text>
                    <Text style={styles.donationStatLabel}>Total Raised</Text>
                    <Text style={styles.donationStatSubLabel}>
                      {donationStats?.allTime?.count || 0} donations
                    </Text>
                  </LinearGradient>
                  
                  <LinearGradient
                    colors={['rgba(139, 92, 246, 0.9)', 'rgba(124, 58, 237, 0.9)']}
                    style={styles.donationStatCard}
                  >
                    <Ionicons name="today" size={28} color="#fff" />
                    <Text style={styles.donationStatValue}>
                      {donationStats?.today?.total?.toFixed(4) || '0'} ETH
                    </Text>
                    <Text style={styles.donationStatLabel}>Today</Text>
                    <Text style={styles.donationStatSubLabel}>
                      {donationStats?.today?.count || 0} donations
                    </Text>
                  </LinearGradient>
                  
                  <LinearGradient
                    colors={['rgba(236, 72, 153, 0.9)', 'rgba(219, 39, 119, 0.9)']}
                    style={styles.donationStatCard}
                  >
                    <Ionicons name="calendar" size={28} color="#fff" />
                    <Text style={styles.donationStatValue}>
                      {donationStats?.thisWeek?.total?.toFixed(4) || '0'} ETH
                    </Text>
                    <Text style={styles.donationStatLabel}>This Week</Text>
                    <Text style={styles.donationStatSubLabel}>
                      {donationStats?.thisWeek?.count || 0} donations
                    </Text>
                  </LinearGradient>
                </View>

                {/* Recent Donations Header */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Donations</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{recentDonations.length}</Text>
                  </View>
                </View>

                {recentDonations.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="cash-outline" size={64} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.emptyText}>No donations yet</Text>
                  </View>
                ) : (
                  recentDonations.map((donation, index) => (
                    <LinearGradient
                      key={donation._id || index}
                      colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                      style={styles.card}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.donationHeaderLeft}>
                          <Ionicons name="heart" size={20} color="#ec4899" />
                          <Text style={styles.donationAmount}>{donation.amount} ETH</Text>
                        </View>
                        <Text style={styles.donationTime}>
                          {new Date(donation.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.cardContent}>
                        <View style={styles.infoRow}>
                          <Ionicons name="person" size={16} color="#8b5cf6" />
                          <Text style={styles.infoText}>
                            From: {donation.isAnonymous ? 'Anonymous' : (donation.donorName || 'Unknown')}
                          </Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Ionicons name="megaphone" size={16} color="#10b981" />
                          <Text style={styles.infoText} numberOfLines={1}>
                            To: {donation.campaignTitle || 'Campaign'}
                          </Text>
                        </View>
                        {donation.message && (
                          <View style={styles.donationMessageBox}>
                            <Ionicons name="chatbubble-ellipses" size={14} color="#64748b" />
                            <Text style={styles.donationMessage} numberOfLines={2}>
                              "{donation.message}"
                            </Text>
                          </View>
                        )}
                        {donation.transactionHash && (
                          <View style={styles.infoRow}>
                            <Ionicons name="link" size={16} color="#3b82f6" />
                            <Text style={styles.txHashText} numberOfLines={1}>
                              Tx: {donation.transactionHash.slice(0, 10)}...{donation.transactionHash.slice(-8)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  ))
                )}
              </View>
            ) : null}
          </Animated.View>
        </ScrollView>
      </LinearGradient>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={32} color="#ef4444" />
              <Text style={styles.modalTitle}>Rejection Reason</Text>
            </View>
            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Enter reason for rejection..."
              style={styles.modalInput}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setShowRejectModal(false)}
                activeOpacity={0.8}
              >
                <View style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={submitReject}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.modalSubmitBtn}
                >
                  <Text style={styles.modalSubmitText}>Submit</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Promote Modal */}
      <Modal
        visible={showPromoteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPromoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="shield-checkmark" size={32} color="#8b5cf6" />
              <Text style={styles.modalTitle}>Promote to Admin</Text>
            </View>
            <Text style={styles.modalDescription}>
              Are you sure you want to promote <Text style={styles.modalUserName}>{promoteUserName}</Text> to admin?
            </Text>
            <Text style={styles.modalWarning}>
              This action will give them full administrative privileges.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setShowPromoteModal(false)}
                activeOpacity={0.8}
              >
                <View style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={confirmPromoteToAdmin}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#8b5cf6', '#7c3aed']}
                  style={styles.modalSubmitBtn}
                >
                  <Text style={styles.modalSubmitText}>Promote</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowDeleteModal(false); setDeleteCampaignId(null); }}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="trash" size={32} color="#6b7280" />
              <Text style={styles.modalTitle}>Confirm Delete</Text>
            </View>
            <Text style={styles.modalDescription}>
              Are you sure you want to permanently delete this campaign? This action cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => { setShowDeleteModal(false); setDeleteCampaignId(null); }}
                activeOpacity={0.8}
              >
                <View style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => handleDelete(deleteCampaignId)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.modalSubmitBtn}
                >
                  <Text style={styles.modalSubmitText}>Delete</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Reject User Modal */}
      <Modal
        visible={showRejectUserModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={32} color="#ef4444" />
              <Text style={styles.modalTitle}>User Rejection Reason</Text>
            </View>
            <TextInput
              value={rejectUserReason}
              onChangeText={setRejectUserReason}
              placeholder="Enter reason for rejecting this user..."
              style={styles.modalInput}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                onPress={() => setShowRejectUserModal(false)}
                activeOpacity={0.8}
              >
                <View style={styles.modalCancelBtn}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={submitRejectUser}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  style={styles.modalSubmitBtn}
                >
                  <Text style={styles.modalSubmitText}>Submit</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Certificate Viewer Modal */}
      <Modal
        visible={showCertificateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCertificateModal(false)}
      >
        <View style={styles.certificateModalOverlay}>
          <TouchableOpacity 
            style={styles.certificateModalCloseArea}
            activeOpacity={1}
            onPress={() => setShowCertificateModal(false)}
          >
            <View style={styles.certificateModalHeader}>
              <Text style={styles.certificateModalTitle}>Organization Certificate</Text>
              <TouchableOpacity 
                onPress={() => setShowCertificateModal(false)}
                style={styles.certificateModalCloseButton}
              >
                <Ionicons name="close-circle" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          <View style={styles.certificateModalContent}>
            <ScrollView 
              contentContainerStyle={styles.certificateScrollContent}
              maximumZoomScale={3}
              minimumZoomScale={1}
            >
              {selectedCertificate && (
                <Image 
                  source={{ uri: selectedCertificate }} 
                  style={styles.certificateModalImage}
                  resizeMode="contain"
                />
              )}
            </ScrollView>
            <View style={styles.certificateModalActions}>
              <TouchableOpacity 
                onPress={() => handleDownloadCertificate(selectedCertificate)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#2563eb', '#1e40af']}
                  style={styles.certificateModalButton}
                >
                  <Ionicons name="download" size={20} color="#fff" />
                  <Text style={styles.certificateModalButtonText}>Download</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  background: {
    flex: 1,
  },
  blobContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.15,
  },
  blob1: {
    width: 300,
    height: 300,
    backgroundColor: '#8b5cf6',
    top: -100,
    left: -100,
  },
  blob2: {
    width: 400,
    height: 400,
    backgroundColor: '#ec4899',
    top: 200,
    right: -150,
  },
  blob3: {
    width: 350,
    height: 350,
    backgroundColor: '#10b981',
    bottom: -100,
    left: 50,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 24,
  },
  headerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  subheading: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  tabBarContainer: {
    marginBottom: 24,
  },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    position: 'relative',
  },
  activeTab: {
    overflow: 'hidden',
  },
  activeTabGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  tabIcon: {
    marginRight: 6,
    zIndex: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    zIndex: 1,
  },
  section: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f766e',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusApproved: {
    backgroundColor: '#d1fae5',
  },
  statusRejected: {
    backgroundColor: '#fee2e2',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
    color: '#1f2937',
  },
  cardContent: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  rejectionBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  rejectionText: {
    fontSize: 13,
    color: '#991b1b',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
    fontWeight: '600',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  accessDeniedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ef4444',
    marginTop: 20,
    marginBottom: 12,
  },
  accessDeniedText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: '#374151',
    backgroundColor: '#f9fafb',
    marginBottom: 20,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  modalDescription: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  modalUserName: {
    fontWeight: '700',
    color: '#8b5cf6',
  },
  modalWarning: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6b7280',
  },
  modalSubmitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  descriptionBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  certificateSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  certificateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  certificateImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  certificateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  certificateOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  downloadButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 6,
  },
  certificateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  certificateModalCloseArea: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  certificateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  certificateModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  certificateModalCloseButton: {
    padding: 4,
  },
  certificateModalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  certificateScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  certificateModalImage: {
    width: '100%',
    height: 600,
    maxWidth: 800,
  },
  certificateModalActions: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  certificateModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  certificateModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 12,
    fontWeight: '600',
  },
  // Donation styles
  donationStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  donationStatCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  donationStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginTop: 8,
  },
  donationStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    fontWeight: '600',
  },
  donationStatSubLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  donationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  donationAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
  },
  donationTime: {
    fontSize: 12,
    color: '#64748b',
  },
  donationMessageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  donationMessage: {
    flex: 1,
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
  },
  txHashText: {
    fontSize: 12,
    color: '#3b82f6',
    fontFamily: 'monospace',
  },
});