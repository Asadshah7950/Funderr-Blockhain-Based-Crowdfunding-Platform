import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const HowItWorks = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const steps = [
    {
      icon: "wallet-outline",
      title: "Connect Your Wallet",
      description: "Securely connect your blockchain wallet to get started with Funderr's transparent platform.",
      colors: ['#14b8a6', '#0d9488'],
    },
    {
      icon: "rocket-outline",
      title: "Create or Support",
      description: "Start your own campaign or browse and support innovative projects that inspire you.",
      colors: ['#8b5cf6', '#7c3aed'],
    },
    {
      icon: "shield-checkmark-outline",
      title: "Blockchain Security",
      description: "All transactions are recorded on the blockchain, ensuring complete transparency and security.",
      colors: ['#3b82f6', '#2563eb'],
    },
    {
      icon: "trending-up-outline",
      title: "Track Progress",
      description: "Monitor campaign progress in real-time with detailed analytics and milestone updates.",
      colors: ['#14b8a6', '#8b5cf6'],
    },
  ];

  const getCardWidth = () => {
    if (isDesktop) return '23%';
    if (isTablet) return '48%';
    return '100%';
  };

  return (
    <View style={styles.section}>
      <View style={styles.container}>
        {/* Header */}
        <Animatable.View animation="fadeInUp" duration={800} style={styles.header}>
          <Text style={styles.sectionTitle}>
            How <Text style={styles.primaryText}>Funderr</Text> Works
          </Text>
          <Text style={styles.sectionSubtitle}>
            Simple, secure, and transparent. Join thousands of creators and backers on the blockchain.
          </Text>
        </Animatable.View>

        {/* Steps Grid */}
        <View style={[styles.grid, { flexDirection: isDesktop || isTablet ? 'row' : 'column' }]}>
          {steps.map((step, index) => (
            <Animatable.View
              key={step.title}
              animation="fadeInUp"
              duration={800}
              delay={index * 100}
              style={[
                styles.stepContainer,
                {
                  width: getCardWidth(),
                  marginRight: isDesktop ? '1.66%' : isTablet ? '4%' : 0,
                  marginBottom: 24,
                }
              ]}
            >
              {/* Connecting Line (desktop only) */}
              {index < steps.length - 1 && isDesktop && (
                <View style={styles.connectingLine}>
                  <LinearGradient
                    colors={['rgba(20, 184, 166, 0.5)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.lineGradient}
                  />
                </View>
              )}

              {/* Card */}
              <View style={styles.card}>
                {/* Icon */}
                <LinearGradient
                  colors={step.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconContainer}
                >
                  <Ionicons name={step.icon} size={32} color="#ffffff" />
                </LinearGradient>

                {/* Number Badge */}
                <View style={styles.numberBadge}>
                  <Text style={styles.numberText}>{index + 1}</Text>
                </View>

                {/* Content */}
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </Animatable.View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#ffffff',
    paddingVertical: 80,
  },
  container: {
    maxWidth: 1280,
    width: '100%',
    marginHorizontal: 'auto',
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 64,
  },
  sectionTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
    marginBottom: 16,
  },
  primaryText: {
    color: '#14b8a6',
  },
  sectionSubtitle: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 600,
    lineHeight: 28,
  },
  grid: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  stepContainer: {
    position: 'relative',
  },
  connectingLine: {
    position: 'absolute',
    top: 64,
    left: '100%',
    width: '100%',
    height: 2,
    zIndex: -1,
  },
  lineGradient: {
    width: '100%',
    height: '100%',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  numberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
  },
});

export default HowItWorks;
