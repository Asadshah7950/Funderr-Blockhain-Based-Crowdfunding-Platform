import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform, Image, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const Header = ({ navigation }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const navLinks = [
    { name: 'Home', screen: 'Home' },
    { name: 'Explore Campaigns', screen: 'Explore' },
  ];

  const handleNavigation = (screen) => {
    setIsMenuOpen(false);
    if (navigation && screen) {
      navigation.navigate(screen);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.navbar}>
        <View style={styles.content}>
          {/* Logo */}
          <TouchableOpacity 
            style={styles.logoContainer}
            onPress={() => handleNavigation('Home')}
            activeOpacity={0.8}
          >
            <Image 
              source={require('../../assets/funderr logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/* Desktop Navigation */}
          {isDesktop && (
            <View style={styles.desktopNav}>
              {navLinks.map((link) => (
                <TouchableOpacity
                  key={link.name}
                  onPress={() => handleNavigation(link.screen, link.action)}
                  style={styles.navLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navLinkText}>{link.name}</Text>
                  <View style={styles.navLinkUnderline} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Desktop CTAs */}
          {isDesktop && (
            <View style={styles.desktopCtas}>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => handleNavigation('Auth')}
                activeOpacity={0.8}
              >
                <Text style={styles.loginButtonText}>Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {/* Connect wallet logic */}}
              >
                <LinearGradient
                  colors={['#14b8a6', '#2563eb']}
                  style={styles.walletButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="wallet" size={16} color="#fff" style={styles.walletIcon} />
                  <Text style={styles.walletButtonText}>Connect Wallet</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Mobile Menu Button */}
          {!isDesktop && (
            <TouchableOpacity
              style={styles.mobileMenuButton}
              onPress={() => setIsMenuOpen(!isMenuOpen)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isMenuOpen ? 'close' : 'menu'} 
                size={24} 
                color="#1f2937" 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <View style={styles.mobileMenu}>
            <View style={styles.mobileMenuContent}>
              {navLinks.map((link) => (
                <TouchableOpacity
                  key={link.name}
                  onPress={() => handleNavigation(link.screen)}
                  style={styles.mobileNavLink}
                  activeOpacity={0.7}
                >
                  <Text style={styles.mobileNavLinkText}>{link.name}</Text>
                </TouchableOpacity>
              ))}
              <View style={styles.mobileMenuCtas}>
                <TouchableOpacity
                  style={styles.mobileLoginButton}
                  onPress={() => handleNavigation('Auth')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.mobileLoginButtonText}>Login</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.9}>
                  <LinearGradient
                    colors={['#14b8a6', '#2563eb']}
                    style={styles.mobileWalletButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="wallet" size={16} color="#fff" style={styles.walletIcon} />
                    <Text style={styles.walletButtonText}>Connect Wallet</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: Platform.OS === 'web' ? 'fixed' : 'relative',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }),
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  navbar: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
    paddingHorizontal: 16,
    maxWidth: 1280,
    marginHorizontal: 'auto',
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoImage: {
    width: 150,
    height: 80,
  },
  logoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 32,
  },
  navLink: {
    position: 'relative',
  },
  navLinkText: {
    color: 'rgba(31, 41, 55, 0.8)',
    fontWeight: '500',
    fontSize: 15,
  },
  navLinkUnderline: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    width: 0,
    height: 2,
    backgroundColor: '#14b8a6',
    ...(Platform.OS === 'web' && {
      transition: 'width 0.3s ease',
    }),
  },
  desktopCtas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  loginButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#1f2937',
    fontWeight: '600',
    fontSize: 15,
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  walletIcon: {
    marginRight: 8,
  },
  walletButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  mobileMenuButton: {
    padding: 8,
    borderRadius: 8,
  },
  mobileMenu: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  mobileMenuContent: {
    gap: 16,
  },
  mobileNavLink: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  mobileNavLinkText: {
    color: 'rgba(31, 41, 55, 0.8)',
    fontWeight: '500',
    fontSize: 15,
  },
  mobileMenuCtas: {
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  mobileLoginButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  mobileLoginButtonText: {
    color: '#1f2937',
    fontWeight: '600',
    fontSize: 15,
  },
  mobileWalletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});

export default Header;
