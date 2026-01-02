import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const Hero = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const stats = [
    { icon: 'people', label: 'Active Campaigns', value: '2,400+' },
    { icon: 'shield-checkmark', label: 'Total Raised', value: '$12.5M+' },
    { icon: 'rocket', label: 'Success Rate', value: '87%' },
  ];

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        <Image
          source={require('../assets/bg.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(249, 250, 251, 1)', 'rgba(249, 250, 251, 0.95)', 'rgba(249, 250, 251, 1)']}
          style={styles.backgroundGradient}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Animatable.View 
          animation="fadeIn" 
          duration={1000}
          style={styles.innerContent}
        >
          {/* Badge */}
          <Animatable.View 
            animation="zoomIn" 
            duration={800}
            delay={200}
            style={styles.badge}
          >
            <Ionicons name="shield-checkmark" size={16} color="#14b8a6" />
            <Text style={styles.badgeText}>Blockchain-Powered & Transparent</Text>
          </Animatable.View>

          {/* Main Heading */}
          <Animatable.View animation="fadeInUp" duration={800} delay={400}>
            <Text style={[styles.heading, isMobile && styles.headingMobile]}>
              Fund Dreams,{' '}
            </Text>
            <Text style={[styles.gradientHeading, isMobile && styles.gradientHeadingMobile]}>
              Build Futures
            </Text>
          </Animatable.View>

          {/* Description */}
          <Animatable.Text 
            animation="fadeInUp" 
            duration={800} 
            delay={600}
            style={[styles.description, isMobile && styles.descriptionMobile]}
          >
            The world's most trusted blockchain crowdfunding platform. Start your campaign or support innovative projects with complete transparency and security.
          </Animatable.Text>

          {/* CTAs */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800} 
            delay={800}
            style={[styles.ctaContainer, isMobile && styles.ctaContainerMobile]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation?.navigate('Auth')}
            >
              <LinearGradient
                colors={['#14b8a6', '#2563eb']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>Start Your Campaign</Text>
                <Ionicons name="rocket" size={20} color="#fff" style={styles.buttonIcon} />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              activeOpacity={0.8}
              onPress={() => navigation?.navigate('Explore')}
            >
              <Text style={styles.secondaryButtonText}>Explore Campaigns</Text>
              <Ionicons name="arrow-forward" size={20} color="#1f2937" style={styles.buttonIcon} />
            </TouchableOpacity>
          </Animatable.View>

          {/* Stats */}
          <Animatable.View 
            animation="fadeInUp" 
            duration={800} 
            delay={1000}
            style={[styles.statsContainer, isMobile && styles.statsContainerMobile]}
          >
            {stats.map((stat, index) => (
              <Animatable.View
                key={stat.label}
                animation="fadeInUp"
                duration={600}
                delay={1000 + (index * 100)}
                style={styles.statCard}
              >
                <Ionicons name={stat.icon} size={32} color="#14b8a6" style={styles.statIcon} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Animatable.View>
            ))}
          </Animatable.View>
        </Animatable.View>
      </View>

      {/* Decorative Elements */}
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={3000}
        style={[styles.decorativeBlob, styles.blobLeft]}
      />
      <Animatable.View
        animation="pulse"
        iterationCount="infinite"
        duration={3000}
        delay={1000}
        style={[styles.decorativeBlob, styles.blobRight]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 600,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    maxWidth: 1280,
    width: '100%',
    paddingHorizontal: 16,
    position: 'relative',
    zIndex: 10,
    paddingVertical: 80,
    paddingTop: 120,
  },
  innerContent: {
    maxWidth: 896,
    marginHorizontal: 'auto',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    marginBottom: 24,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#14b8a6',
  },
  heading: {
    fontSize: 56,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#1f2937',
  },
  headingMobile: {
    fontSize: 40,
  },
  gradientHeading: {
    fontSize: 56,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#14b8a6',
    marginBottom: 24,
  },
  gradientHeadingMobile: {
    fontSize: 40,
  },
  description: {
    fontSize: 20,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
    maxWidth: 672,
    lineHeight: 32,
  },
  descriptionMobile: {
    fontSize: 18,
    lineHeight: 28,
  },
  ctaContainer: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 48,
    flexWrap: 'wrap',
  },
  ctaContainerMobile: {
    flexDirection: 'column',
    width: '100%',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 32,
    maxWidth: 768,
    width: '100%',
    justifyContent: 'center',
  },
  statsContainerMobile: {
    flexDirection: 'column',
    gap: 16,
  },
  statCard: {
    flex: 1,
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  decorativeBlob: {
    position: 'absolute',
    width: 288,
    height: 288,
    borderRadius: 144,
    opacity: 0.15,
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 60,
    elevation: 0,
  },
  blobLeft: {
    top: '25%',
    left: 40,
    backgroundColor: '#14b8a6',
    shadowColor: '#14b8a6',
  },
  blobRight: {
    bottom: '25%',
    right: 40,
    width: 384,
    height: 384,
    borderRadius: 192,
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
  },
});

export default Hero;
