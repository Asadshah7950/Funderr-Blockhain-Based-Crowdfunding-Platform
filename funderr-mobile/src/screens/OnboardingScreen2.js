/**
 * Onboarding Screen 2
 * "We Can Help Poor People" - with image collage
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Sample images - using placeholder images
const IMAGES = [
  { uri: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=400&h=300&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=300&h=200&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=300&h=200&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=300&fit=crop' },
];

const OnboardingScreen2 = ({ navigation }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const imageAnims = useRef(IMAGES.map(() => new Animated.Value(0))).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate images first
    const imageAnimations = imageAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 150,
        useNativeDriver: true,
      })
    );

    Animated.stagger(100, imageAnimations).start();

    // Then animate text
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(indicatorAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 400);
  }, []);

  const handleNext = () => {
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.navigate('Onboarding3');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Image Collage - 2x2 Grid */}
      <View style={styles.imageCollage}>
        <View style={styles.imageGrid}>
          {/* Top Row */}
          <View style={styles.topRow}>
            <Animated.View
              style={[
                styles.imageWrapper,
                styles.imageLarge,
                {
                  opacity: imageAnims[0],
                  transform: [
                    {
                      scale: imageAnims[0].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Image source={IMAGES[0]} style={styles.image} />
            </Animated.View>
            
            <Animated.View
              style={[
                styles.imageWrapper,
                styles.imageSmall,
                {
                  opacity: imageAnims[1],
                  transform: [
                    {
                      scale: imageAnims[1].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Image source={IMAGES[1]} style={styles.image} />
            </Animated.View>
          </View>

          {/* Bottom Row */}
          <View style={styles.bottomRow}>
            <Animated.View
              style={[
                styles.imageWrapper,
                styles.imageSmall,
                {
                  opacity: imageAnims[2],
                  transform: [
                    {
                      scale: imageAnims[2].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Image source={IMAGES[2]} style={styles.image} />
            </Animated.View>
            
            <Animated.View
              style={[
                styles.imageWrapper,
                styles.imageLarge,
                {
                  opacity: imageAnims[3],
                  transform: [
                    {
                      scale: imageAnims[3].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Image source={IMAGES[3]} style={styles.image} />
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Content Section */}
      <View style={styles.contentSection}>
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Text style={styles.title}>We Can Help</Text>
          <Text style={styles.title}>Poor People</Text>
          
          <Text style={styles.subtitle}>
            When we give cheerfully and accept{'\n'}gratefully, everyone is blessed
          </Text>

          {/* Indicator dots */}
          <View style={styles.indicatorContainer}>
            <Animated.View 
              style={[
                styles.indicator, 
                styles.indicatorInactive,
                { opacity: indicatorAnim }
              ]} 
            />
            <Animated.View 
              style={[
                styles.indicator, 
                styles.indicatorActive,
                { opacity: indicatorAnim }
              ]} 
            />
          </View>
        </Animated.View>

        {/* Next Button */}
        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <View style={styles.nextButtonInner}>
              <Text style={styles.nextButtonText}>›</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  imageCollage: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: 'center',
  },
  imageGrid: {
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  imageWrapper: {
    marginHorizontal: 6,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  imageLarge: {
    width: width * 0.42,
    height: height * 0.18,
  },
  imageSmall: {
    width: width * 0.28,
    height: height * 0.12,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  contentSection: {
    paddingHorizontal: 32,
    paddingBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  indicator: {
    width: 24,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#14b8a6',
  },
  indicatorInactive: {
    backgroundColor: '#e2e8f0',
  },
  nextButton: {
    marginTop: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#14b8a6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 28,
    color: '#ffffff',
    fontWeight: '300',
    marginTop: -2,
  },
});

export default OnboardingScreen2;
