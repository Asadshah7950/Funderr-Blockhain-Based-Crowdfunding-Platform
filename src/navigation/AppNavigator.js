import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import LoadingScreen from '../components/LoadingScreen';

// Screens
import HomeScreen from '../screens/HomeScreen';
import AuthScreen from '../screens/AuthScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import DonorProfileCreationScreen from '../screens/DonorProfileCreationScreen';
import CampaignProfileCreationScreen from '../screens/CampaignProfileCreationScreen';
import CampaignCreationScreen from '../screens/CampaignCreationScreen';
import UserInterface from '../screens/UserInterface';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import AdminPortalScreen from '../screens/AdminPortalScreen';
import ExploreCampaigns from '../screens/ExploreCampaigns';
import WithdrawFundsScreen from '../screens/WithdrawFundsScreen';

// Create navigation stacks
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Main app navigator (after authentication)
const MainTabNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="UserInterface" component={UserInterface} />
      <Stack.Screen name="CampaignCreation" component={CampaignCreationScreen} />
      <Stack.Screen name="AdminPortal" component={AdminPortalScreen} options={{ title: 'Admin Portal' }} />
      <Stack.Screen name="WithdrawFunds" component={WithdrawFundsScreen} options={{ title: 'Withdraw Funds' }} />
    </Stack.Navigator>
  );
};

// Authentication navigator
const AuthNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Explore" component={ExploreCampaigns} />
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="DonorProfileCreation" component={DonorProfileCreationScreen} />
      <Stack.Screen name="CampaignProfileCreation" component={CampaignProfileCreationScreen} />
      <Stack.Screen name="AdminPortal" component={AdminPortalScreen} options={{ title: 'Admin Portal' }} />
    </Stack.Navigator>
  );
};

// Root Navigator
const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  useEffect(() => {
    const setupApp = async () => {
      // Check if we're on mobile (iOS or Android)
      const isMobile = Platform.OS === 'ios' || Platform.OS === 'android';
      
      // Check authentication status
      try {
        const token = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');
        
        if (token) {
          setIsAuthenticated(true);
          setUserRole(role);
        }
      } catch (error) {
        console.log('Error checking auth status:', error);
      }
      
      if (isMobile) {
        // Show loading screen for 3 seconds on mobile
        setTimeout(() => {
          setIsLoading(false);
        }, 3000); // 3 seconds = 3000 milliseconds
      } else {
        // Skip loading screen on web - immediately proceed
        setIsLoading(false);
      }
    };

    setupApp();
  }, []);

  // Show loading screen only if isLoading is true (mobile platforms)
  if (isLoading) {
    return <LoadingScreen message="Loading your dreams..." />;
  }
 
  // Configure linking for web and deep links
  const linking = {
    prefixes: [Linking.createURL('/'), 'https://funderrapp.com'],
    config: {
      screens: {
        Auth: {
          screens: {
            Home: 'home',
            SignIn: 'signin',
            SignUp: 'signup',
            RoleSelection: 'role',
            DonorProfileCreation: 'donor-profile',
            CampaignProfileCreation: 'campaign-profile',
          },
        },
        MainApp: {
          screens: {
            Home: 'dashboard',
            Projects: 'projects',
            Profile: 'profile',
          },
        },
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // User is logged in - start with MainApp
          <>
            <Stack.Screen 
              name="MainApp" 
              component={MainTabNavigator} 
              initialParams={{ 
                screen: userRole === 'admin' ? 'AdminPortal' : 'UserInterface' 
              }}
            />
            <Stack.Screen name="Auth" component={AuthNavigator} />
          </>
        ) : (
          // User is not logged in - start with Auth
          <>
            <Stack.Screen name="Auth" component={AuthNavigator} />
            <Stack.Screen name="MainApp" component={MainTabNavigator} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
