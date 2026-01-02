/**
 * Help & FAQ Screen
 * Provides help information and frequently asked questions for users
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const faqs = [
  {
    id: 1,
    question: 'How do I create a fundraising campaign?',
    answer: 'To create a campaign, go to "Create Fund" from the menu. Fill in your campaign details including title, description, goal amount, and duration. Your campaign will be reviewed by our team before being published on the blockchain.',
  },
  {
    id: 2,
    question: 'How do donations work?',
    answer: 'Donations are made directly through the Ethereum blockchain using your connected wallet (MetaMask). When you donate, the funds go directly to the campaign\'s smart contract, ensuring transparency and security.',
  },
  {
    id: 3,
    question: 'When can I withdraw my campaign funds?',
    answer: 'Campaign creators can withdraw funds when either: 1) The fundraising goal is reached, or 2) The campaign deadline has passed. You must use the same wallet that created the campaign to withdraw.',
  },
  {
    id: 4,
    question: 'How do I connect my wallet?',
    answer: 'Go to "Wallet" from the menu and tap "Connect Wallet". This will open WalletConnect which allows you to connect MetaMask or other supported wallets. Make sure you\'re on the Sepolia testnet.',
  },
  {
    id: 5,
    question: 'What happens if a campaign doesn\'t reach its goal?',
    answer: 'Unlike traditional crowdfunding, our platform allows creators to withdraw whatever funds have been raised once the deadline passes, even if the goal isn\'t met. This ensures creators can still benefit from partial funding.',
  },
  {
    id: 6,
    question: 'Are there any fees?',
    answer: 'The platform may charge a small percentage fee on withdrawals to support operations. Additionally, all blockchain transactions require gas fees which are paid in ETH.',
  },
  {
    id: 7,
    question: 'How long does campaign approval take?',
    answer: 'Campaign approval typically takes 1-2 business days. Our team reviews each campaign to ensure it meets our guidelines and is legitimate.',
  },
  {
    id: 8,
    question: 'Can I donate to my own campaign?',
    answer: 'No, self-donations are not allowed. The smart contract automatically prevents the campaign creator from donating to their own campaign to maintain integrity.',
  },
  {
    id: 9,
    question: 'What network does Funderr use?',
    answer: 'Funderr currently operates on the Ethereum Sepolia testnet. This allows users to test the platform with test ETH before we launch on mainnet.',
  },
  {
    id: 10,
    question: 'How do I get test ETH for Sepolia?',
    answer: 'You can get free Sepolia test ETH from faucets like sepoliafaucet.com or the Alchemy Sepolia faucet. These provide small amounts of test ETH for testing purposes.',
  },
];

const contactOptions = [
  {
    id: 'email',
    icon: 'mail-outline',
    label: 'Email Support',
    value: 'support@funderr.com',
    action: () => Linking.openURL('mailto:support@funderr.com'),
  },
  {
    id: 'twitter',
    icon: 'logo-twitter',
    label: 'Twitter',
    value: '@FunderrApp',
    action: () => Linking.openURL('https://twitter.com/FunderrApp'),
  },
  {
    id: 'discord',
    icon: 'logo-discord',
    label: 'Discord Community',
    value: 'Join our server',
    action: () => Linking.openURL('https://discord.gg/funderr'),
  },
];

const HelpScreen = ({ navigation }) => {
  const [expandedFaq, setExpandedFaq] = useState(null);

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#0d9488', '#14b8a6']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.welcomeGradient}>
            <Ionicons name="help-buoy" size={48} color="#fff" />
            <Text style={styles.welcomeTitle}>How can we help?</Text>
            <Text style={styles.welcomeText}>
              Find answers to common questions or reach out to our support team
            </Text>
          </LinearGradient>
        </View>

        {/* Quick Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={styles.quickLinksRow}>
            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('CampaignCreation')}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: '#14b8a620' }]}>
                <Ionicons name="add-circle" size={24} color="#14b8a6" />
              </View>
              <Text style={styles.quickLinkText}>Create Campaign</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('Wallet')}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: '#3B82F620' }]}>
                <Ionicons name="wallet" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.quickLinkText}>Connect Wallet</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => navigation.navigate('Explore')}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: '#EC489920' }]}>
                <Ionicons name="search" size={24} color="#EC4899" />
              </View>
              <Text style={styles.quickLinkText}>Explore</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {faqs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqCard}
              onPress={() => toggleFaq(faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedFaq === faq.id ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color="#6B7280"
                />
              </View>
              {expandedFaq === faq.id && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          {contactOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.contactCard}
              onPress={option.action}
              activeOpacity={0.7}
            >
              <View style={styles.contactIcon}>
                <Ionicons name={option.icon} size={22} color="#14b8a6" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>{option.label}</Text>
                <Text style={styles.contactValue}>{option.value}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Version Info */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>Funderr v1.0.0</Text>
          <Text style={styles.networkText}>Network: Sepolia Testnet</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
  welcomeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  welcomeGradient: {
    padding: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  quickLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickLinkCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickLinkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#14b8a610',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  contactValue: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  networkText: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 4,
  },
});

export default HelpScreen;
