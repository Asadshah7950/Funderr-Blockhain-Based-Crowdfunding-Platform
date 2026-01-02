import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const LoadingScreen = ({ message = 'Loading your dreams...' }) => {
  const logoRef = useRef(null);
  const titleRef = useRef(null);
  const taglineRef = useRef(null);
  const loadingDotsRef = useRef(null);
  const floatingElements = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    // Sequence animations for smooth loading experience
    setTimeout(() => {
      logoRef.current?.bounceIn(1000);
    }, 300);

    setTimeout(() => {
      titleRef.current?.fadeInUp(800);
    }, 800);

    setTimeout(() => {
      taglineRef.current?.fadeInUp(600);
    }, 1200);

    setTimeout(() => {
      loadingDotsRef.current?.fadeIn(500);
    }, 1600);

    // Animate floating elements with different delays
    floatingElements.forEach((ref, index) => {
      setTimeout(() => {
        ref.current?.fadeIn(1000);
      }, 1000 + (index * 200));
    });
  }, []);

  return (
    <LinearGradient
      colors={['#0f766e', '#14b8a6', '#2563eb']}
      style={styles.container}
    >
      {/* Animated floating background elements */}
      <View style={styles.backgroundElements}>
        {/* Rotating geometric shapes */}
        <Animatable.View 
          ref={floatingElements[0]}
          // 'rotate' isn't a built-in registered animation in some versions of react-native-animatable.
          // Use a long fade/opacity animation here to avoid runtime errors while keeping subtle motion.
          animation="fadeIn"
          iterationCount="infinite"
          duration={20000}
          direction="alternate"
          style={[styles.rotatingElement, styles.rotatingElement1]}
        />
        <Animatable.View 
          ref={floatingElements[1]}
          animation="fadeIn"
          iterationCount="infinite"
          duration={15000}
          direction="alternate"
          style={[styles.rotatingElement, styles.rotatingElement2]}
        />
        
        {/* Floating and pulsing circles */}
        <Animatable.View 
          animation="pulse" 
          iterationCount="infinite" 
          duration={3000}
          style={[styles.floatingElement, styles.element1]}
        />
        <Animatable.View 
          animation="bounceIn" 
          iterationCount="infinite" 
          duration={4000}
          style={[styles.floatingElement, styles.element2]}
        />
        <Animatable.View 
          animation="pulse" 
          iterationCount="infinite" 
          duration={3500}
          delay={1000}
          style={[styles.floatingElement, styles.element3]}
        />
        <Animatable.View 
          // 'fadeInOut' is not a registered animation name; use fadeIn with alternate direction instead
          animation="fadeIn"
          iterationCount="infinite" 
          duration={2500}
          direction="alternate"
          style={[styles.floatingElement, styles.element4]}
        />
        
        {/* Moving wave elements */}
        <Animatable.View 
          animation="slideInLeft" 
          iterationCount="infinite" 
          duration={8000}
          direction="alternate"
          style={[styles.waveElement, styles.wave1]}
        />
        <Animatable.View 
          animation="slideInRight" 
          iterationCount="infinite" 
          duration={10000}
          direction="alternate"
          style={[styles.waveElement, styles.wave2]}
        />
        
        {/* Particle-like small elements */}
        <Animatable.View 
          animation="bounce" 
          iterationCount="infinite" 
          duration={2000}
          delay={500}
          style={[styles.particle, styles.particle1]}
        />
        <Animatable.View 
          animation="pulse" 
          iterationCount="infinite" 
          duration={1800}
          delay={800}
          style={[styles.particle, styles.particle2]}
        />
        <Animatable.View 
          animation="bounce" 
          iterationCount="infinite" 
          duration={2200}
          delay={1200}
          style={[styles.particle, styles.particle3]}
        />
        <Animatable.View 
          // fadeInOut isn't registered in all versions; use fadeIn + alternate direction
          animation="fadeIn" 
          iterationCount="infinite" 
          duration={1600}
          delay={1500}
          direction="alternate"
          style={[styles.particle, styles.particle4]}
        />
      </View>

      {/* Main content */}
      <View style={styles.contentContainer}>
        {/* Animated Logo with enhanced effects */}
        <Animatable.View 
          ref={logoRef}
          animation="bounceIn"
          duration={1200}
          delay={300}
          style={styles.logoContainer}
        >
          <Animatable.View 
            // use a gentle pulse on the logo wrapper to keep motion compatible
            animation="pulse"
            iterationCount="infinite"
            duration={3000}
            style={styles.logoWrapper}
          >
            <View style={styles.logoCircle}>
              <LinearGradient
                colors={['#14b8a6', '#2563eb']}
                style={styles.logoGradient}
              >
                <Animatable.View
                  animation="pulse"
                  iterationCount="infinite"
                  duration={2000}
                >
                  <MaterialIcons name="favorite" size={40} color="white" />
                </Animatable.View>
              </LinearGradient>
            </View>
          </Animatable.View>
          {/* Multiple animated pulse rings */}
          <Animatable.View 
            animation="pulse" 
            iterationCount="infinite" 
            duration={2000}
            style={styles.pulseRing}
          />
          <Animatable.View 
            animation="pulse" 
            iterationCount="infinite" 
            duration={2500}
            delay={500}
            style={[styles.pulseRing, styles.pulseRing2]}
          />
          <Animatable.View 
            animation="pulse" 
            iterationCount="infinite" 
            duration={3000}
            delay={1000}
            style={[styles.pulseRing, styles.pulseRing3]}
          />
        </Animatable.View>

        {/* App Title with enhanced animation */}
        <Animatable.Text 
          ref={titleRef}
          animation="tada"
          duration={1500}
          delay={800}
          style={styles.title}
        >
          Funderr
        </Animatable.Text>
        
        {/* Animated subtitle with glow effect */}
        <Animatable.View
          animation="pulse"
          iterationCount="infinite"
          duration={3000}
          delay={1200}
        >
          <Animatable.Text 
            ref={taglineRef}
            animation="bounceIn"
            duration={1000}
            delay={1200}
            style={styles.tagline}
          >
            A Crowdfunding Platform
          </Animatable.Text>
        </Animatable.View>

        {/* Animated Loading Dots */}
        <Animatable.View 
          ref={loadingDotsRef}
          style={styles.loadingContainer}
        >
          <Text style={styles.loadingText}>{message}</Text>
          <View style={styles.dotsContainer}>
            <Animatable.View 
              animation="bounce" 
              iterationCount="infinite" 
              duration={1000}
              delay={0}
              style={[styles.dot, styles.dot1]}
            />
            <Animatable.View 
              animation="bounce" 
              iterationCount="infinite" 
              duration={1000}
              delay={200}
              style={[styles.dot, styles.dot2]}
            />
            <Animatable.View 
              animation="bounce" 
              iterationCount="infinite" 
              duration={1000}
              delay={400}
              style={[styles.dot, styles.dot3]}
            />
          </View>
        </Animatable.View>

        {/* Bottom decorative elements */}
        <View style={styles.bottomDecoration}>
          <Animatable.View 
            animation="slideInUp" 
            delay={2000}
            style={styles.decorativeLine}
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingElement: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
  },
  // Enhanced rotating elements
  rotatingElement: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  rotatingElement1: {
    width: 150,
    height: 150,
    borderRadius: 20,
    top: height * 0.1,
    right: width * 0.05,
    transform: [{ rotate: '45deg' }],
  },
  rotatingElement2: {
    width: 120,
    height: 120,
    borderRadius: 60,
    bottom: height * 0.1,
    left: width * 0.05,
  },
  // Wave elements
  waveElement: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 50,
  },
  wave1: {
    width: 200,
    height: 20,
    top: height * 0.3,
    left: -100,
  },
  wave2: {
    width: 180,
    height: 15,
    bottom: height * 0.25,
    right: -90,
  },
  // Particle elements
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
  },
  particle1: {
    width: 8,
    height: 8,
    top: height * 0.2,
    left: width * 0.3,
  },
  particle2: {
    width: 6,
    height: 6,
    top: height * 0.4,
    right: width * 0.25,
  },
  particle3: {
    width: 10,
    height: 10,
    bottom: height * 0.35,
    left: width * 0.15,
  },
  particle4: {
    width: 7,
    height: 7,
    bottom: height * 0.2,
    right: width * 0.4,
  },
  element1: {
    width: 80,
    height: 80,
    top: height * 0.15,
    left: width * 0.1,
  },
  element2: {
    width: 60,
    height: 60,
    top: height * 0.25,
    right: width * 0.15,
  },
  element3: {
    width: 40,
    height: 40,
    bottom: height * 0.3,
    left: width * 0.2,
  },
  element4: {
    width: 100,
    height: 100,
    bottom: height * 0.15,
    right: width * 0.1,
  },
  contentContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    position: 'relative',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  logoGradient: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'transparent',
  },
  pulseRing2: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
  },
  pulseRing3: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    letterSpacing: 3,
    // Add a subtle glow effect
    shadowColor: 'rgba(20, 184, 166, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  tagline: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: 50,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    // Add subtle glow
    shadowColor: 'rgba(37, 99, 235, 0.3)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 15,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '400',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  dot1: {
    backgroundColor: '#14b8a6',
  },
  dot2: {
    backgroundColor: '#2563eb',
  },
  dot3: {
    backgroundColor: '#0f766e',
  },
  bottomDecoration: {
    position: 'absolute',
    bottom: -100,
    alignItems: 'center',
  },
  decorativeLine: {
    width: width * 0.6,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
});

export default LoadingScreen;
