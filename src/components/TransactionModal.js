/**
 * Transaction Modal Component for Web
 * Shows transaction status during blockchain operations
 * States: waiting, confirming, success, error
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const TransactionModal = ({ 
  visible, 
  status, 
  txHash, 
  error, 
  amount,
  campaignTitle,
  onClose,
  type = 'donation'
}) => {
  const getStatusContent = () => {
    switch (status) {
      case 'waiting':
        return {
          icon: 'wallet-outline',
          iconColor: '#f59e0b',
          gradientColors: ['#fef3c7', '#fde68a'],
          title: 'Confirm in Wallet',
          message: `Please confirm the ${type} of ${amount} ETH in your MetaMask wallet`,
        };
      case 'confirming':
        return {
          icon: 'cube-outline',
          iconColor: '#6366f1',
          gradientColors: ['#e0e7ff', '#c7d2fe'],
          title: 'Processing on Blockchain',
          message: 'Your transaction is being confirmed on the Ethereum network...',
        };
      case 'success':
        return {
          icon: 'checkmark-circle',
          iconColor: '#10b981',
          gradientColors: ['#d1fae5', '#a7f3d0'],
          title: type === 'donation' ? 'Donation Successful!' : 'Withdrawal Successful!',
          message: type === 'donation' 
            ? `Thank you for your generous donation of ${amount} ETH to "${campaignTitle}"!`
            : `Successfully withdrew ${amount} ETH from "${campaignTitle}"!`,
        };
      case 'error':
        return {
          icon: 'close-circle',
          iconColor: '#ef4444',
          gradientColors: ['#fee2e2', '#fecaca'],
          title: 'Transaction Failed',
          message: error || 'Something went wrong. Please try again.',
        };
      default:
        return null;
    }
  };

  const content = getStatusContent();
  if (!content) return null;

  const openEtherscan = () => {
    if (txHash) {
      Linking.openURL(`https://sepolia.etherscan.io/tx/${txHash}`);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={status === 'success' || status === 'error' ? onClose : undefined}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Icon with gradient background */}
          <LinearGradient
            colors={content.gradientColors}
            style={styles.iconContainer}
          >
            {(status === 'waiting' || status === 'confirming') ? (
              <View style={styles.spinnerContainer}>
                <View style={[styles.spinner, { borderTopColor: content.iconColor }]} />
                <Ionicons 
                  name={content.icon} 
                  size={32} 
                  color={content.iconColor} 
                  style={styles.spinnerIcon}
                />
              </View>
            ) : (
              <Ionicons name={content.icon} size={48} color={content.iconColor} />
            )}
          </LinearGradient>

          {/* Title */}
          <Text style={styles.title}>{content.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{content.message}</Text>

          {/* Progress Steps */}
          {(status === 'waiting' || status === 'confirming') && (
            <View style={styles.progressContainer}>
              <View style={styles.progressStep}>
                <View style={[
                  styles.stepCircle,
                  { backgroundColor: status === 'waiting' ? '#f59e0b' : '#10b981' }
                ]}>
                  {status === 'waiting' ? (
                    <View style={styles.stepSpinner} />
                  ) : (
                    <Ionicons name="checkmark" size={14} color="white" />
                  )}
                </View>
                <Text style={styles.stepLabel}>Wallet</Text>
              </View>

              <View style={[
                styles.progressLine,
                { backgroundColor: status === 'confirming' ? '#6366f1' : '#e5e7eb' }
              ]} />

              <View style={styles.progressStep}>
                <View style={[
                  styles.stepCircle,
                  { backgroundColor: status === 'confirming' ? '#6366f1' : '#e5e7eb' }
                ]}>
                  {status === 'confirming' ? (
                    <View style={styles.stepSpinner} />
                  ) : (
                    <Text style={{ color: '#9ca3af', fontSize: 12 }}>2</Text>
                  )}
                </View>
                <Text style={styles.stepLabel}>Blockchain</Text>
              </View>
            </View>
          )}

          {/* Transaction Hash */}
          {txHash && (
            <TouchableOpacity style={styles.txHashContainer} onPress={openEtherscan}>
              <Text style={styles.txHashLabel}>Transaction Hash</Text>
              <View style={styles.txHashRow}>
                <Text style={styles.txHash}>
                  {txHash.slice(0, 10)}...{txHash.slice(-8)}
                </Text>
                <Ionicons name="open-outline" size={14} color="#6366f1" />
              </View>
            </TouchableOpacity>
          )}

          {/* Etherscan Button */}
          {txHash && (
            <TouchableOpacity style={styles.etherscanButton} onPress={openEtherscan}>
              <Ionicons name="link-outline" size={18} color="#4b5563" />
              <Text style={styles.etherscanButtonText}>View on Etherscan</Text>
            </TouchableOpacity>
          )}

          {/* Close/Done Button */}
          {(status === 'success' || status === 'error') && (
            <TouchableOpacity 
              style={[
                styles.primaryButton,
                { backgroundColor: status === 'success' ? '#10b981' : '#6366f1' }
              ]} 
              onPress={onClose}
            >
              <Text style={styles.primaryButtonText}>
                {status === 'success' ? 'Done' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Hints */}
          {status === 'waiting' && (
            <Text style={styles.hint}>
              💡 Don't see the popup? Check your MetaMask extension.
            </Text>
          )}
          {status === 'confirming' && (
            <Text style={styles.hint}>
              ⏱️ This usually takes 15-30 seconds on Sepolia testnet.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  spinnerContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderWidth: 3,
    borderColor: '#e5e7eb',
    borderTopWidth: 3,
    borderRadius: 30,
  },
  spinnerIcon: {
    position: 'absolute',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    width: '100%',
  },
  progressStep: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepSpinner: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderTopColor: 'white',
    borderRadius: 8,
  },
  stepLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  progressLine: {
    width: 50,
    height: 2,
    marginHorizontal: 8,
    marginBottom: 20,
    borderRadius: 1,
  },
  txHashContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 16,
  },
  txHashLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  txHashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txHash: {
    fontSize: 13,
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  etherscanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  etherscanButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4b5563',
    marginLeft: 8,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  hint: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
});

export default TransactionModal;
