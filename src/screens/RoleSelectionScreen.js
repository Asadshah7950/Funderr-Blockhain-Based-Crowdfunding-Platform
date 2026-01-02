import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Platform,
  SafeAreaView,
  ScrollView,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

const { width, height } = Dimensions.get('window');

const RoleSelectionScreen = ({ navigation }) => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkAdminRole = async () => {
      const userRole = await AsyncStorage.getItem('userRole');
      if (userRole === 'admin') {
        navigation.replace('AdminPortal');
      }
    };
    checkAdminRole();
  }, []);

  // Animation reference
  const logoAnimation = {
    0: { scale: 1 },
    0.5: { scale: 1.1 },
    1: { scale: 1 }
  };

  // When user selects a role
  const handleRoleSelect = async (role) => {
    setSelectedRole(role);
  };
  
  // Continue with selected role
  const handleContinue = async () => {
    if (!selectedRole) return;
    try {
      setIsLoading(true);
      // Update user profile in backend with selected role
      const { ApiService } = require('../services/ApiService');
      await ApiService.updateUserProfile({ role: selectedRole });
      await AsyncStorage.setItem('userRole', selectedRole);
      // Add a slight delay to show loading state
      setTimeout(() => {
        if (selectedRole === 'donor') {
          navigation.navigate('DonorProfileCreation');
        } else if (selectedRole === 'campaign_creator') {
          navigation.navigate('CampaignProfileCreation');
        }
        setIsLoading(false);
      }, 800);
    } catch (e) {
      console.error('Error saving role:', e);
      setIsLoading(false);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.headerButton}>
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.headerButtonGradient}
          >
            <MaterialIcons name="home" size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      ),
      headerTitle: '',
      headerTransparent: true,
    });
  }, [navigation]);

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <LinearGradient
        colors={['#14b8a6', '#2563eb']}
        style={styles.background}
      >
        {/* Animated Background Blobs */}
        <View style={styles.backgroundAnimation}>
          <Animatable.View
            animation={{
              0: { translateX: -100, translateY: -100, scale: 0.8 },
              0.5: { translateX: 50, translateY: 50, scale: 1.2 },
              1: { translateX: -100, translateY: -100, scale: 0.8 }
            }}
            iterationCount="infinite"
            duration={15000}
            style={[styles.blob, styles.blob1]}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
              style={styles.blobGradient}
            />
          </Animatable.View>
          
          <Animatable.View
            animation={{
              0: { translateX: 100, translateY: 100, scale: 1.2 },
              0.5: { translateX: -50, translateY: -50, scale: 0.8 },
              1: { translateX: 100, translateY: 100, scale: 1.2 }
            }}
            iterationCount="infinite"
            duration={20000}
            style={[styles.blob, styles.blob2]}
          >
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.15)', 'rgba(236, 72, 153, 0.1)']}
              style={styles.blobGradient}
            />
          </Animatable.View>
        </View>

        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Logo Section */}
            <Animatable.View 
              animation="fadeInDown" 
              duration={1000} 
              style={styles.logoSection}
            >
              <View style={styles.logoContainer}>
                <Animatable.Text 
                  animation={logoAnimation} 
                  iterationCount="infinite" 
                  duration={3000} 
                  style={styles.logoText}
                >
                  funderr
                </Animatable.Text>
                <Text style={styles.tagline}>Empowering Change Together</Text>
              </View>
            </Animatable.View>

            {/* Main Selection Container */}
            <Animatable.View 
              animation={{
                0: { opacity: 0, scale: 0.9, translateY: 50 },
                1: { opacity: 1, scale: 1, translateY: 0 }
              }}
              duration={1200}
              delay={300}
              style={styles.selectionContainer}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.15)']}
                style={styles.containerGradient}
              >
                {/* Header */}
                <View style={styles.headerContent}>
                  <LinearGradient
                    colors={['#ffffff', '#f8fafc']}
                    style={styles.titleGradient}
                  >
                    <Text style={styles.title}>Choose Your Path</Text>
                  </LinearGradient>
                  <Text style={styles.subtitle}>
                    How would you like to make a difference today?
                  </Text>
                </View>

                {/* Role Cards */}
                <View style={styles.cardsContainer}>
                  {/* Donor Card */}
                  <Animatable.View
                    animation="fadeInLeft"
                    duration={800}
                    delay={600}
                  >
                    <TouchableOpacity
                      style={[
                        styles.roleCard,
                        selectedRole === 'donor' && styles.selectedCard
                      ]}
                      onPress={() => handleRoleSelect('donor')}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={selectedRole === 'donor' ? 
                          ['rgba(236, 72, 153, 0.2)', 'rgba(139, 92, 246, 0.15)'] :
                          ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                        }
                        style={styles.cardGradient}
                      >
                        <LinearGradient
                          colors={['#ec4899', '#8b5cf6']}
                          style={styles.iconCircle}
                        >
                          <MaterialIcons name="favorite" size={32} color="white" />
                        </LinearGradient>
                        
                        <View style={styles.cardContent}>
                          <LinearGradient
                            colors={['#ffffff', '#f8fafc']}
                            style={styles.cardTitleGradient}
                          >
                            <Text style={styles.cardTitle}>Donor</Text>
                          </LinearGradient>
                          <Text style={styles.cardDescription}>
                            Support causes and make a meaningful impact with your contributions
                          </Text>
                        </View>

                        {selectedRole === 'donor' && (
                          <Animatable.View
                            animation="bounceIn"
                            duration={500}
                            style={styles.checkmark}
                          >
                            <LinearGradient
                              colors={['#ec4899', '#8b5cf6']}
                              style={styles.checkmarkCircle}
                            >
                              <MaterialIcons name="check" size={18} color="white" />
                            </LinearGradient>
                          </Animatable.View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animatable.View>

                  {/* Campaign Creator Card */}
                  <Animatable.View
                    animation="fadeInRight"
                    duration={800}
                    delay={800}
                  >
                    <TouchableOpacity
                      style={[
                        styles.roleCard,
                        selectedRole === 'campaign_creator' && styles.selectedCard
                      ]}
                      onPress={() => handleRoleSelect('campaign_creator')}
                      activeOpacity={0.9}
                    >
                      <LinearGradient
                        colors={selectedRole === 'campaign_creator' ? 
                          ['rgba(20, 184, 166, 0.2)', 'rgba(37, 99, 235, 0.15)'] :
                          ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']
                        }
                        style={styles.cardGradient}
                      >
                        <LinearGradient
                          colors={['#14b8a6', '#2563eb']}
                          style={styles.iconCircle}
                        >
                          <MaterialIcons name="campaign" size={32} color="white" />
                        </LinearGradient>
                        
                        <View style={styles.cardContent}>
                          <LinearGradient
                            colors={['#ffffff', '#f8fafc']}
                            style={styles.cardTitleGradient}
                          >
                            <Text style={styles.cardTitle}>Campaign Creator</Text>
                          </LinearGradient>
                          <Text style={styles.cardDescription}>
                            Launch fundraising campaigns and bring your vision to life
                          </Text>
                        </View>

                        {selectedRole === 'campaign_creator' && (
                          <Animatable.View
                            animation="bounceIn"
                            duration={500}
                            style={styles.checkmark}
                          >
                            <LinearGradient
                              colors={['#14b8a6', '#2563eb']}
                              style={styles.checkmarkCircle}
                            >
                              <MaterialIcons name="check" size={18} color="white" />
                            </LinearGradient>
                          </Animatable.View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animatable.View>
                </View>

                {/* Continue Button */}
                <Animatable.View
                  animation="fadeInUp"
                  duration={800}
                  delay={1000}
                >
                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      (!selectedRole || isLoading) && styles.buttonDisabled
                    ]}
                    onPress={handleContinue}
                    disabled={!selectedRole || isLoading}
                    activeOpacity={selectedRole && !isLoading ? 0.8 : 1}
                  >
                    <LinearGradient
                      colors={(!selectedRole || isLoading) ? 
                        ['rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.2)'] :
                        ['#14b8a6', '#2563eb']
                      }
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.buttonText}>
                        {isLoading ? 'Setting up...' : 'Continue'}
                      </Text>
                      {selectedRole && !isLoading && (
                        <MaterialIcons 
                          name="arrow-forward" 
                          size={22} 
                          color="white" 
                          style={styles.buttonIcon} 
                        />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animatable.View>
              </LinearGradient>
            </Animatable.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  blob1: {
    top: '10%',
    left: '10%',
  },
  blob2: {
    bottom: '15%',
    right: '15%',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  blobGradient: {
    flex: 1,
    borderRadius: 150,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 40 : 20,
    minHeight: height - (Platform.OS === 'ios' ? 100 : StatusBar.currentHeight + 60),
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: 'rgba(15, 118, 110, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    fontWeight: '500',
    letterSpacing: 1,
  },
  selectionContainer: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  containerGradient: {
    borderRadius: 32,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 40,
    elevation: 20,
    backdropFilter: 'blur(40px)',
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 32,
  },
  titleGradient: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#14b8a6',
    textAlign: 'center',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#f8fafc',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    opacity: 0.95,
  },
  cardsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  roleCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  selectedCard: {
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    transform: [{ scale: 1.02 }],
  },
  cardGradient: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 120,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleGradient: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f766e',
    letterSpacing: 0.5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#f8fafc',
    lineHeight: 20,
    fontWeight: '500',
    opacity: 0.9,
  },
  checkmark: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  checkmarkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#14b8a6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  buttonDisabled: {
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  buttonIcon: {
    marginLeft: 10,
  },
  headerButton: {
    marginLeft: 16,
    marginTop: 8,
  },
  headerButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default RoleSelectionScreen;