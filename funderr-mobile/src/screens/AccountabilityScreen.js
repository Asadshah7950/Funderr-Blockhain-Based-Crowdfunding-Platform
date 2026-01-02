/**
 * AccountabilityScreen - Mobile
 * Shows campaign spending records for transparency
 * Campaign creators can add spending records with receipts
 * Donors can view how funds are being used
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Image,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/ApiService';

const SPENDING_CATEGORIES = ['General', 'Equipment', 'Services', 'Materials', 'Transport', 'Other'];

const AccountabilityScreen = ({ navigation, route }) => {
  const { campaign, isOwner } = route.params || {};
  
  // State
  const [spendings, setSpendings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [remainingFunds, setRemainingFunds] = useState(0);
  
  // Add Spending Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('General');
  const [receipt, setReceipt] = useState(null);
  const [addingSpending, setAddingSpending] = useState(false);
  
  // Receipt Preview Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Fetch spendings
  const fetchSpendings = useCallback(async () => {
    try {
      const campaignId = campaign?._id || campaign?.id;
      if (!campaignId) return;
      
      const data = await ApiService.getCampaignSpendings(campaignId);
      setSpendings(data.spendings || []);
      
      const spent = data.totalSpent || 0;
      setTotalSpent(spent);
      
      const campaignRaised = campaign?.raised || campaign?.amountRaised || data.amountRaised || 0;
      setRemainingFunds(Math.max(0, campaignRaised - spent));
    } catch (error) {
      console.error('Error fetching spendings:', error);
      setSpendings([]);
      setTotalSpent(0);
      const campaignRaised = campaign?.raised || campaign?.amountRaised || 0;
      setRemainingFunds(campaignRaised);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campaign]);

  useEffect(() => {
    fetchSpendings();
  }, [fetchSpendings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSpendings();
  };

  // Pick receipt image
  const pickReceipt = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setReceipt({
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

  // Add spending record
  const handleAddSpending = async () => {
    const amt = parseFloat(amount);
    
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!receipt) {
      Alert.alert('Error', 'Please upload a receipt');
      return;
    }

    const campaignRaised = campaign?.raised || campaign?.amountRaised || 0;
    const availableFunds = campaignRaised - totalSpent;

    if (campaignRaised === 0) {
      Alert.alert(
        'No Funds Available',
        'This campaign has not received any donations yet. You cannot add spending records until the campaign receives funds.'
      );
      return;
    }

    if (amt > availableFunds) {
      Alert.alert(
        'Insufficient Funds',
        `The spending amount (${amt} ETH) exceeds the available funds (${availableFunds.toFixed(4)} ETH).`
      );
      return;
    }

    setAddingSpending(true);
    try {
      const campaignId = campaign?._id || campaign?.id;

      // Upload receipt first
      const formData = new FormData();
      formData.append('receipt', {
        uri: receipt.uri,
        type: receipt.type || 'image/jpeg',
        name: receipt.name || 'receipt.jpg',
      });

      const uploadResult = await ApiService.uploadSpendingReceipt(formData);
      
      if (!uploadResult.url) {
        throw new Error('Receipt upload failed');
      }

      // Add spending record
      await ApiService.addSpending(campaignId, {
        description: description.trim(),
        amount: amt,
        category,
        receiptUrl: uploadResult.url,
      });

      Alert.alert('Success', 'Spending record added successfully');
      
      // Reset form
      setDescription('');
      setAmount('');
      setCategory('General');
      setReceipt(null);
      setShowAddModal(false);
      
      // Refresh spendings
      fetchSpendings();
    } catch (error) {
      console.error('Error adding spending:', error);
      Alert.alert('Error', error.message || 'Failed to add spending record');
    } finally {
      setAddingSpending(false);
    }
  };

  // Open receipt URL
  const openReceipt = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get category icon
  const getCategoryIcon = (cat) => {
    switch (cat) {
      case 'Equipment': return 'hardware-chip';
      case 'Services': return 'construct';
      case 'Materials': return 'cube';
      case 'Transport': return 'car';
      case 'Other': return 'ellipsis-horizontal';
      default: return 'pricetag';
    }
  };

  const campaignRaised = campaign?.raised || campaign?.amountRaised || 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={['#10b981', '#059669']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <MaterialIcons name="receipt-long" size={28} color="#fff" />
          <Text style={styles.headerTitle}>Campaign Accountability</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
      >
        {/* Campaign Info */}
        <View style={styles.campaignInfo}>
          <Text style={styles.campaignTitle} numberOfLines={2}>
            {campaign?.title || 'Campaign'}
          </Text>
          
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Raised</Text>
              <Text style={styles.statValue}>{campaignRaised.toFixed(4)} ETH</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={[styles.statValue, { color: '#ef4444' }]}>
                {totalSpent.toFixed(4)} ETH
              </Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={[styles.statValue, { color: '#10b981' }]}>
                {remainingFunds.toFixed(4)} ETH
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${campaignRaised > 0 ? Math.min((totalSpent / campaignRaised) * 100, 100) : 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {campaignRaised > 0 ? ((totalSpent / campaignRaised) * 100).toFixed(1) : 0}% utilized
            </Text>
          </View>
        </View>

        {/* Add Spending Button (Owner Only) */}
        {isOwner && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <LinearGradient
              colors={['#14b8a6', '#0d9488']}
              style={styles.addButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons name="add-circle" size={22} color="#fff" />
              <Text style={styles.addButtonText}>Add Spending Record</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Spendings Section */}
        <View style={styles.spendingsSection}>
          <Text style={styles.sectionTitle}>Spending Records</Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Loading records...</Text>
            </View>
          ) : spendings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="receipt" size={64} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Spending Records</Text>
              <Text style={styles.emptyText}>
                {isOwner
                  ? 'Add spending records to show donors how funds are being used'
                  : 'The campaign creator will add spending records as funds are used'}
              </Text>
            </View>
          ) : (
            spendings.map((spending, index) => (
              <View key={spending._id || index} style={styles.spendingCard}>
                <View style={styles.spendingHeader}>
                  <View style={styles.categoryBadge}>
                    <Ionicons 
                      name={getCategoryIcon(spending.category)} 
                      size={14} 
                      color="#14b8a6" 
                    />
                    <Text style={styles.categoryText}>{spending.category || 'General'}</Text>
                  </View>
                  <Text style={styles.spendingDate}>{formatDate(spending.date)}</Text>
                </View>
                
                <Text style={styles.spendingDescription}>{spending.description}</Text>
                
                <View style={styles.spendingFooter}>
                  <Text style={styles.spendingAmount}>
                    {spending.amount?.toFixed(4) || '0.0000'} ETH
                  </Text>
                  
                  {spending.receiptUrl && (
                    <TouchableOpacity
                      style={styles.viewReceiptButton}
                      onPress={() => openReceipt(spending.receiptUrl)}
                    >
                      <Ionicons name="eye" size={16} color="#14b8a6" />
                      <Text style={styles.viewReceiptText}>View Receipt</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Spending Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <LinearGradient
              colors={['#14b8a6', '#0d9488']}
              style={styles.modalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons name="add-circle" size={24} color="#fff" />
              <Text style={styles.modalTitle}>Add Spending Record</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowAddModal(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="What was this spending for?"
                  placeholderTextColor="#9ca3af"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Amount */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (ETH) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.inputHint}>
                  Available: {remainingFunds.toFixed(4)} ETH
                </Text>
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.categorySelector}>
                    {SPENDING_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryOption,
                          category === cat && styles.categoryOptionActive,
                        ]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.categoryOptionText,
                            category === cat && styles.categoryOptionTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Receipt Upload */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Receipt/Proof *</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={pickReceipt}>
                  {receipt ? (
                    <View style={styles.uploadPreview}>
                      <Image source={{ uri: receipt.uri }} style={styles.receiptThumbnail} />
                      <Text style={styles.uploadedText}>Receipt uploaded</Text>
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <MaterialIcons name="cloud-upload" size={32} color="#9ca3af" />
                      <Text style={styles.uploadText}>Tap to upload receipt</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.submitButton, addingSpending && styles.buttonDisabled]}
                onPress={handleAddSpending}
                disabled={addingSpending}
              >
                {addingSpending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="check" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>Add Record</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  campaignInfo: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  campaignTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'right',
    marginTop: 4,
  },
  addButton: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  spendingsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  spendingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  spendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdfa',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14b8a6',
  },
  spendingDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  spendingDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  spendingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  spendingAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  viewReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f0fdfa',
    borderRadius: 8,
  },
  viewReceiptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#14b8a6',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 10,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 6,
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryOptionActive: {
    backgroundColor: '#14b8a6',
    borderColor: '#14b8a6',
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  categoryOptionTextActive: {
    color: '#fff',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  uploadText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  uploadPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  receiptThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  uploadedText: {
    flex: 1,
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default AccountabilityScreen;
