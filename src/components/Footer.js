import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Footer = ({ navigation }) => {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: 'Home', route: 'Home' },
    { name: 'Explore', route: 'Explore' },
    { name: 'Start Campaign', route: 'CampaignCreation' },
    { name: 'How It Works', action: () => {} },
  ];

  const socialLinks = [
    { icon: 'logo-twitter', url: 'https://twitter.com' },
    { icon: 'logo-facebook', url: 'https://facebook.com' },
    { icon: 'logo-linkedin', url: 'https://linkedin.com' },
    { icon: 'logo-github', url: 'https://github.com/Musa-010/funderr' },
  ];

  const handleLinkPress = (url) => {
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  return (
    <View style={styles.footer}>
      <View style={styles.container}>
        {/* Top Section */}
        <View style={styles.topSection}>
          {/* Brand */}
          <View style={styles.brandSection}>
            <Text style={styles.brandName}>Funderr</Text>
            <Text style={styles.brandTagline}>
              Empowering dreams through blockchain transparency
            </Text>
            {/* Social Links */}
            <View style={styles.socialLinks}>
              {socialLinks.map((social, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.socialIcon}
                  onPress={() => handleLinkPress(social.url)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={social.icon} size={20} color="#6b7280" />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Links */}
          <View style={styles.linksSection}>
            <Text style={styles.linksTitle}>Quick Links</Text>
            {quickLinks.map((link, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => link.route ? navigation?.navigate(link.route) : link.action()}
                activeOpacity={0.7}
              >
                <Text style={styles.linkText}>{link.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Support */}
          <View style={styles.linksSection}>
            <Text style={styles.linksTitle}>Support</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.linkText}>Help Center</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.linkText}>Contact Us</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.linkText}>FAQ</Text>
            </TouchableOpacity>
          </View>

          {/* Legal */}
          <View style={styles.linksSection}>
            <Text style={styles.linksTitle}>Legal</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.linkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.linkText}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <Text style={styles.copyright}>
            © {currentYear} Funderr. All rights reserved.
          </Text>
          <Text style={styles.poweredBy}>
            Powered by Blockchain Technology
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: '#1f2937',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  container: {
    maxWidth: 1280,
    width: '100%',
    marginHorizontal: 'auto',
  },
  topSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  brandSection: {
    flex: 1,
    minWidth: 250,
    marginBottom: 24,
    marginRight: 24,
  },
  brandName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#14b8a6',
    marginBottom: 8,
  },
  brandTagline: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 22,
    marginBottom: 16,
    maxWidth: 280,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linksSection: {
    minWidth: 150,
    marginBottom: 24,
  },
  linksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  linkText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 12,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 24,
  },
  bottomSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  copyright: {
    fontSize: 14,
    color: '#9ca3af',
  },
  poweredBy: {
    fontSize: 14,
    color: '#9ca3af',
  },
});

export default Footer;
