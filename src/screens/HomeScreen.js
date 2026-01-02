import React, { useLayoutEffect } from 'react';
import { StyleSheet, View, ScrollView } from 'react-native';
import Header from '../components/Header';
import Hero from '../components/Hero';
import FeaturedCampaigns from '../components/FeaturedCampaigns';
import HowItWorks from '../components/HowItWorks';
import Footer from '../components/Footer';

export default function HomeScreen({ navigation }) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Component */}
        <Header navigation={navigation} />
        
        {/* Hero Section */}
        <Hero navigation={navigation} />
        
        {/* Featured Campaigns Section */}
        <FeaturedCampaigns navigation={navigation} />
        
        {/* How It Works Section */}
        <HowItWorks />
        
        {/* Footer */}
        <Footer navigation={navigation} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
