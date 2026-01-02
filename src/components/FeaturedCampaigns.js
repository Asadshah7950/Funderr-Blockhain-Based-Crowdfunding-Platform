import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  Image,
  useWindowDimensions,
  ActivityIndicator
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ApiService } from '../services/ApiService';

const CampaignCard = ({ 
  id, 
  title, 
  description, 
  image, 
  category, 
  raised, 
  goal, 
  contributors, 
  daysLeft,
  navigation,
  index 
}) => {
  const progress = (raised / goal) * 100;
  
  // Varied placeholder images from Unsplash
  const placeholderImages = [
    'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=800&q=80', // Donation/charity
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80', // Medical/health
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80', // Technology
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80', // Environment
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80', // Innovation
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80', // Community
  ];
  
  const imageUrl = image || placeholderImages[index % placeholderImages.length];

  return (
    <TouchableOpacity 
      style={styles.card}
      activeOpacity={1}
      disabled={true}
    >
      <Image source={{ uri: imageUrl }} style={styles.cardImage} />
      
      {/* Category Badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{category}</Text>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
        <Text style={styles.cardDescription} numberOfLines={3}>{description}</Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>Ξ{(raised / 1000).toFixed(2)}</Text>
            <Text style={styles.statLabel}>raised of Ξ{(goal / 1000).toFixed(1)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{contributors}</Text>
            <Text style={styles.statLabel}>backers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{daysLeft}</Text>
            <Text style={styles.statLabel}>days left</Text>
          </View>
        </View>

        {/* Donate Button */}
        <TouchableOpacity
          style={styles.donateButton}
          onPress={(e) => {
            e.stopPropagation();
            navigation?.navigate('Auth');
          }}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#14b8a6', '#0d9488']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.donateButtonGradient}
          >
            <Ionicons name="wallet-outline" size={18} color="#ffffff" />
            <Text style={styles.donateButtonText}>Donate Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const FeaturedCampaigns = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFeaturedCampaigns();
  }, []);

  const fetchFeaturedCampaigns = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getFeaturedCampaigns(6);
      setCampaigns(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching featured campaigns:', err);
      setError('Unable to load campaigns. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysLeft = (dateCreated, duration = 30) => {
    const created = new Date(dateCreated);
    const now = new Date();
    const daysElapsed = Math.floor((now - created) / (1000 * 60 * 60 * 24));
    const daysLeft = duration - daysElapsed;
    return daysLeft > 0 ? daysLeft : 0;
  };

  const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  return (
    <View style={styles.section}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <Animatable.View animation="fadeInUp" duration={800} style={styles.header}>
            <Text style={styles.sectionTitle}>
              Featured <Text style={styles.primaryText}>Campaigns</Text>
            </Text>
            <Text style={styles.sectionSubtitle}>
              Discover amazing projects making a real impact. Support innovation and change lives through blockchain transparency.
            </Text>
          </Animatable.View>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#14b8a6" />
              <Text style={styles.loadingText}>Loading campaigns...</Text>
            </View>
          )}

          {/* Error State */}
          {error && !loading && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={fetchFeaturedCampaigns}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Campaign Grid */}
          {!loading && !error && campaigns.length > 0 && (
            <View style={[styles.grid, { flexDirection: isDesktop || isTablet ? 'row' : 'column' }]}>
              {campaigns.map((campaign, index) => (
                <Animatable.View
                  key={campaign._id || campaign.id}
                  animation="fadeInUp"
                  duration={800}
                  delay={index * 100}
                  style={[
                    styles.gridItem,
                    {
                      width: isDesktop ? '29%' : isTablet ? '45%' : '100%',
                      marginRight: isDesktop ? '3.5%' : isTablet ? '4%' : 0,
                      marginBottom: 24,
                    }
                  ]}
                >
                  <CampaignCard 
                    id={campaign._id}
                    title={campaign.title}
                    description={campaign.description}
                    image={campaign.imageKey}
                    category={campaign.category}
                    raised={campaign.amountRaised || 0}
                    goal={campaign.goal}
                    contributors={Math.floor(Math.random() * 500) + 100}
                    daysLeft={Math.floor(Math.random() * 25) + 5}
                    navigation={navigation}
                    index={index}
                  />
                </Animatable.View>
              ))}
            </View>
          )}

          {/* Empty State */}
          {!loading && !error && campaigns.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="file-tray-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyText}>No campaigns available yet</Text>
              <Text style={styles.emptySubtext}>Check back soon for new projects!</Text>
            </View>
          )}

          {/* View All Button */}
          <Animatable.View animation="fadeInUp" duration={800} delay={400} style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={() => navigation?.navigate('Explore')}
              activeOpacity={0.8}
            >
              <Text style={styles.viewAllButtonText}>View All Campaigns</Text>
              <Ionicons name="arrow-forward" size={20} color="#14b8a6" style={styles.buttonIcon} />
            </TouchableOpacity>
          </Animatable.View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#f9fafb',
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
    marginBottom: 48,
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
    marginBottom: 48,
  },
  gridItem: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e5e7eb',
  },
  categoryBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#14b8a6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardContent: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 28,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#14b8a6',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  donateButton: {
    marginTop: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  donateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  donateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#14b8a6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14b8a6',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    maxWidth: 300,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#14b8a6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9ca3af',
  },
});

export default FeaturedCampaigns;
