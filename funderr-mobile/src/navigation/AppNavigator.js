/**
 * Mobile App Navigator
 * Navigation setup for the mobile app
 */

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen1 from '../screens/OnboardingScreen1';
import OnboardingScreen2 from '../screens/OnboardingScreen2';
import OnboardingScreen3 from '../screens/OnboardingScreen3';
import HomeScreen from '../screens/HomeScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import ExploreCampaignsScreen from '../screens/ExploreCampaignsScreen';
import CampaignDetailsScreen from '../screens/CampaignDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DashboardScreen from '../screens/DashboardScreen';
import CampaignCreationScreen from '../screens/CampaignCreationScreen';
import CampaignProfileCreationScreen from '../screens/CampaignProfileCreationScreen';
import DonorProfileCreationScreen from '../screens/DonorProfileCreationScreen';
import WalletScreen from '../screens/WalletScreen';
import WithdrawFundsScreen from '../screens/WithdrawFundsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import HelpScreen from '../screens/HelpScreen';
import AccountabilityScreen from '../screens/AccountabilityScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();

// Root Navigator - simplified single stack
const AppNavigator = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState('Onboarding1');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
        
        if (token) {
          // User is logged in, go directly to Home
          setInitialRoute('Home');
        } else if (hasSeenOnboarding === 'true') {
          // Returning user (seen onboarding but not logged in), go to SignIn
          setInitialRoute('SignIn');
        } else {
          // First time user, show onboarding screens
          setInitialRoute('Onboarding1');
        }
      } catch (error) {
        console.log('Auth check error:', error);
      } finally {
        setIsReady(true);
      }
    };

    checkAuth();
  }, []);

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Onboarding */}
        <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
        <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
        <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
        
        {/* Auth Screens */}
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        
        {/* Main Screens */}
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Explore" component={ExploreCampaignsScreen} />
        <Stack.Screen name="CampaignDetails" component={CampaignDetailsScreen} />
        <Stack.Screen name="CampaignCreation" component={CampaignCreationScreen} />
        <Stack.Screen name="CampaignProfileCreation" component={CampaignProfileCreationScreen} />
        <Stack.Screen name="DonorProfileCreation" component={DonorProfileCreationScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="WithdrawFunds" component={WithdrawFundsScreen} />
        <Stack.Screen name="History" component={HistoryScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="Accountability" component={AccountabilityScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});

export default AppNavigator;
