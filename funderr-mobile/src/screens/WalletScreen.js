/**
 * Wallet Screen for Funderr Mobile
 * Allows users to connect/disconnect MetaMask wallet
 * View wallet address, balance, and transaction history
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  Keyboard,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../context/WalletContext';
import walletService from '../services/WalletService';

const WalletScreen = ({ navigation }) => {
  const {
    isConnected,
    isConnecting,
    walletAddress,
    balance,
    network,
    error,
    connect,
    disconnect,
    refreshBalance,
    formatAddress,
    getNetworkName,
  } = useWallet();

  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressError, setAddressError] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Handle connect wallet - Opens Web3Modal
  const handleConnect = async () => {
    try {
      await connect();
      // Web3Modal will handle the connection flow automatically
    } catch (err) {
      Alert.alert('Connection Failed', err.message || 'Failed to connect wallet. Please try again.');
    }
  };

  // Handle address submission
  const handleAddressSubmit = async () => {
    Keyboard.dismiss();
    setAddressError('');
    
    const trimmedAddress = addressInput.trim();
    
    if (!trimmedAddress) {
      setAddressError('Please enter your wallet address');
      return;
    }
    
    if (!walletService.isValidAddress(trimmedAddress)) {
      setAddressError('Invalid Ethereum address format');
      return;
    }
    
    setConnecting(true);
    
    try {
      await walletService.connectWithAddress(trimmedAddress);
      setShowAddressModal(false);
      setAddressInput('');
      Alert.alert('Success', 'Wallet connected successfully!');
    } catch (err) {
      setAddressError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  // Handle paste from clipboard
  const handlePasteAddress = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        setAddressInput(text.trim());
        setAddressError('');
      }
    } catch (err) {
      console.error('Failed to paste:', err);
    }
  };

  // Handle disconnect wallet
  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Wallet',
      'Are you sure you want to disconnect your wallet?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnect();
              Alert.alert('Disconnected', 'Your wallet has been disconnected.');
            } catch (err) {
              Alert.alert('Error', 'Failed to disconnect wallet.');
            }
          },
        },
      ]
    );
  };

  // Handle copy address
  const handleCopyAddress = async () => {
    if (walletAddress) {
      await Clipboard.setStringAsync(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBalance();
    } catch (err) {
      console.error('Error refreshing:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Open MetaMask to copy address
  const openMetaMaskToCopy = async () => {
    try {
      await walletService.openMetaMask();
    } catch (err) {
      console.error('Failed to open MetaMask:', err);
    }
  };

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
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wallet</Text>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#14b8a6']}
            tintColor="#14b8a6"
          />
        }
      >
        {/* Wallet Status Card */}
        <View style={styles.walletCard}>
          <LinearGradient
            colors={isConnected ? ['#10b981', '#059669'] : ['#6b7280', '#4b5563']}
            style={styles.walletCardGradient}
          >
            <View style={styles.walletIconContainer}>
              <Text style={styles.walletIcon}>🦊</Text>
            </View>
            
            <Text style={styles.walletStatusLabel}>
              {isConnected ? 'Connected' : 'Not Connected'}
            </Text>
            
            {isConnected && walletAddress && (
              <>
                <TouchableOpacity
                  style={styles.addressContainer}
                  onPress={handleCopyAddress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addressText}>
                    {formatAddress(walletAddress)}
                  </Text>
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={18}
                    color="#ffffff"
                    style={styles.copyIcon}
                  />
                </TouchableOpacity>
                {copied && (
                  <Text style={styles.copiedText}>Address copied!</Text>
                )}
              </>
            )}

            {isConnected && (
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>Balance</Text>
                <Text style={styles.balanceAmount}>Ξ {parseFloat(balance).toFixed(4)}</Text>
                <Text style={styles.balanceCurrency}>ETH</Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Connect/Disconnect Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            isConnected ? styles.disconnectButton : styles.connectButton,
          ]}
          onPress={isConnected ? handleDisconnect : handleConnect}
          disabled={isConnecting}
          activeOpacity={0.8}
        >
          {isConnecting ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons
                name={isConnected ? 'log-out-outline' : 'wallet-outline'}
                size={22}
                color="#ffffff"
              />
              <Text style={styles.actionButtonText}>
                {isConnected ? 'Disconnect Wallet' : 'Connect MetaMask'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>About Wallet Connection</Text>
          
          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#14b8a6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>Secure Connection</Text>
              <Text style={styles.infoItemText}>
                Your wallet connection is secured using industry-standard encryption.
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="flash-outline" size={24} color="#14b8a6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>Instant Donations</Text>
              <Text style={styles.infoItemText}>
                Make instant donations to campaigns directly from your wallet.
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="receipt-outline" size={24} color="#14b8a6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>Transaction History</Text>
              <Text style={styles.infoItemText}>
                View all your donation transactions on the blockchain.
              </Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="cash-outline" size={24} color="#14b8a6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoItemTitle}>Receive Funds</Text>
              <Text style={styles.infoItemText}>
                Campaign creators receive donations directly to their connected wallet.
              </Text>
            </View>
          </View>
        </View>

        {/* Network Info */}
        {isConnected && (
          <View style={styles.networkCard}>
            <View style={styles.networkHeader}>
              <Ionicons name="globe-outline" size={20} color="#14b8a6" />
              <Text style={styles.networkTitle}>Network</Text>
            </View>
            <View style={styles.networkInfo}>
              <View style={[styles.networkDot, { backgroundColor: network === 'mainnet' ? '#10b981' : '#f59e0b' }]} />
              <Text style={styles.networkName}>{getNetworkName()}</Text>
            </View>
            <Text style={styles.networkHint}>
              {network === 'mainnet' 
                ? 'Connected to Ethereum Mainnet'
                : 'Connected to testnet - transactions use test ETH'}
            </Text>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={20} color="#14b8a6" />
            <Text style={styles.helpButtonText}>How to connect MetaMask</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="document-text-outline" size={20} color="#14b8a6" />
            <Text style={styles.helpButtonText}>Wallet FAQs</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Address Input Modal */}
      <Modal
        visible={showAddressModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Connect Wallet</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowAddressModal(false);
                  setAddressInput('');
                  setAddressError('');
                }}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Copy your wallet address from MetaMask and paste it below to connect.
            </Text>

            <TouchableOpacity
              style={styles.openMetaMaskButton}
              onPress={openMetaMaskToCopy}
            >
              <Text style={styles.openMetaMaskIcon}>🦊</Text>
              <Text style={styles.openMetaMaskText}>Open MetaMask to Copy Address</Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.addressInputField, addressError && styles.inputError]}
                placeholder="0x..."
                placeholderTextColor="#9ca3af"
                value={addressInput}
                onChangeText={(text) => {
                  setAddressInput(text);
                  setAddressError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.pasteButton}
                onPress={handlePasteAddress}
              >
                <Ionicons name="clipboard-outline" size={20} color="#14b8a6" />
                <Text style={styles.pasteButtonText}>Paste</Text>
              </TouchableOpacity>
            </View>

            {addressError ? (
              <Text style={styles.errorText}>{addressError}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.connectModalButton, connecting && styles.buttonDisabled]}
              onPress={handleAddressSubmit}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.connectModalButtonText}>Connect Wallet</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.modalHint}>
              Your private keys are never shared. We only use your public address to display your balance.
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  walletCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  walletCardGradient: {
    padding: 24,
    alignItems: 'center',
  },
  walletIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  walletIcon: {
    fontSize: 40,
  },
  walletStatusLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'monospace',
  },
  copyIcon: {
    marginLeft: 10,
  },
  copiedText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 8,
  },
  balanceContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
  },
  balanceCurrency: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  connectButton: {
    backgroundColor: '#14b8a6',
  },
  disconnectButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 10,
  },
  infoSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoContent: {
    flex: 1,
  },
  infoItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  infoItemText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  networkCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  networkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  networkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  networkName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  networkHint: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 18,
  },
  helpSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  helpButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#1f2937',
    marginLeft: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  openMetaMaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  openMetaMaskIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  openMetaMaskText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressInputField: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  pasteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginLeft: 10,
  },
  pasteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
    marginLeft: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#ef4444',
    marginBottom: 16,
  },
  connectModalButton: {
    backgroundColor: '#14b8a6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  connectModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  modalHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default WalletScreen;
