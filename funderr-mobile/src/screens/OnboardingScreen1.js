/**
 * Onboarding Screen 1
 * "Let's Help Each Others" - with image collage
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

// Sample images - using placeholder images (replace with your own)
const IMAGES = [
  { uri: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=300&h=400&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?w=300&h=400&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?w=300&h=400&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1509099836639-18ba1795216d?w=300&h=400&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1476234251651-f353703a034d?w=300&h=400&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?w=300&h=400&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=300&h=400&fit=crop' },
  { uri: 'https://images.unsplash.com/photo-1448932133140-b4045783ed9e?w=300&h=400&fit=crop' },
];

const OnboardingScreen1 = ({ navigation }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const imageAnims = useRef(IMAGES.map(() => new Animated.Value(0))).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate images first
    const imageAnimations = imageAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
      })
    );

    Animated.stagger(50, imageAnimations).start();

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
      navigation.navigate('Onboarding2');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Image Collage */}
      <View style={styles.imageCollage}>
        {/* Row 1 */}
        <View style={styles.imageRow}>
          <Animated.View
            style={[
              styles.imageWrapper,
              styles.imageTall,
              {
                opacity: imageAnims[0],
                transform: [
                  {
                    translateY: imageAnims[0].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
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
              styles.imageShort,
              {
                opacity: imageAnims[1],
                transform: [
                  {
                    translateY: imageAnims[1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={IMAGES[1]} style={styles.image} />
          </Animated.View>
          
          <Animated.View
            style={[
              styles.imageWrapper,
              styles.imageMedium,
              {
                opacity: imageAnims[2],
                transform: [
                  {
                    translateY: imageAnims[2].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
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
              styles.imageShort,
              {
                opacity: imageAnims[3],
                transform: [
                  {
                    translateY: imageAnims[3].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={IMAGES[3]} style={styles.image} />
          </Animated.View>
        </View>

        {/* Row 2 */}
        <View style={styles.imageRow}>
          <Animated.View
            style={[
              styles.imageWrapper,
              styles.imageShort,
              {
                opacity: imageAnims[4],
                transform: [
                  {
                    translateY: imageAnims[4].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={IMAGES[4]} style={styles.image} />
          </Animated.View>
          
          <Animated.View
            style={[
              styles.imageWrapper,
              styles.imageTall,
              {
                opacity: imageAnims[5],
                transform: [
                  {
                    translateY: imageAnims[5].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={IMAGES[5]} style={styles.image} />
          </Animated.View>
          
          <Animated.View
            style={[
              styles.imageWrapper,
              styles.imageShort,
              {
                opacity: imageAnims[6],
                transform: [
                  {
                    translateY: imageAnims[6].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={IMAGES[6]} style={styles.image} />
          </Animated.View>
          
          <Animated.View
            style={[
              styles.imageWrapper,
              styles.imageMedium,
              {
                opacity: imageAnims[7],
                transform: [
                  {
                    translateY: imageAnims[7].interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Image source={IMAGES[7]} style={styles.image} />
          </Animated.View>
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
          <Text style={styles.title}>Let's Help</Text>
          <Text style={styles.title}>Each Others</Text>
          
          <Text style={styles.subtitle}>
            When we give cheerfully and accept{'\n'}gratefully, everyone is blessed
          </Text>

          {/* Indicator line */}
          <View style={styles.indicator} />
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
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  imageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  imageWrapper: {
    marginHorizontal: 4,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  imageTall: {
    width: width * 0.18,
    height: height * 0.18,
  },
  imageMedium: {
    width: width * 0.18,
    height: height * 0.15,
  },
  imageShort: {
    width: width * 0.18,
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
  indicator: {
    width: 30,
    height: 4,
    backgroundColor: '#14b8a6',
    borderRadius: 2,
    marginTop: 20,
    alignSelf: 'center',
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

export default OnboardingScreen1;
