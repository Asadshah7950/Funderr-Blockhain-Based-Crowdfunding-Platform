import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { ApiService } from '../services/ApiService';
import Header from '../components/Header';
import Footer from '../components/Footer';

const CampaignCard = ({ campaign, onPress, index }) => {
  const progress = campaign.goal > 0 ? (campaign.amountRaised / campaign.goal) * 100 : 0;
  const randomBackers = Math.floor(Math.random() * 500) + 100;
  const randomDays = Math.floor(Math.random() * 25) + 5;
  
  // Varied placeholder images from Unsplash
  const placeholderImages = [
    'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=800&q=80', // Donation/charity
    'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800&q=80', // Medical/health
    'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&q=80', // Technology
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80', // Environment
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&q=80', // Innovation
    'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&q=80', // Community
  ];
  
  const imageUrl = campaign.imageKey || placeholderImages[index % placeholderImages.length];

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={1}
      disabled={true}
    >
      <Image
        source={{ uri: imageUrl }}
        style={styles.cardImage}
      />

      {/* Category Badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{campaign.category}</Text>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {campaign.title}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={3}>
          {campaign.description}
        </Text>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              Ξ{(campaign.amountRaised / 1000).toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>
              raised of Ξ{(campaign.goal / 1000).toFixed(1)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{randomBackers}</Text>
            <Text style={styles.statLabel}>backers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{randomDays}</Text>
            <Text style={styles.statLabel}>days left</Text>
          </View>
        </View>

        {/* Donate Button */}
        <TouchableOpacity
          style={styles.donateButton}
          onPress={(e) => {
            e.stopPropagation();
            onPress();
          }}
          activeOpacity={0.8}
        >
          <View style={styles.donateButtonGradient}>
            <Ionicons name="wallet-outline" size={18} color="#ffffff" />
            <Text style={styles.donateButtonText}>Donate Now</Text>
          </View>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

export default function ExploreCampaigns({ navigation }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Education', 'Water', 'Emergency'];

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    filterCampaigns();
  }, [searchQuery, selectedCategory, campaigns]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getFeaturedCampaigns(50); // Fetch more campaigns
      setCampaigns(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Unable to load campaigns. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filterCampaigns = () => {
    let filtered = [...campaigns];

    // Filter by category (case-insensitive)
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(
        (campaign) => 
          campaign.category && 
          campaign.category.toLowerCase().trim() === selectedCategory.toLowerCase().trim()
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (campaign) =>
          campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          campaign.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCampaigns(filtered);
  };

  const handleCampaignPress = () => {
    // Redirect to login page
    navigation.navigate('Auth');
  };

  const getCardWidth = () => {
    if (isDesktop) return '31%';
    if (isTablet) return '48%';
    return '100%';
  };

  return (
    <View style={styles.container}>
      {/* Header Component */}
      <Header navigation={navigation} />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Back Button Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
        {/* Search and Filter Section */}
        <View style={styles.searchSection}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search campaigns..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === category && styles.categoryButtonTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results Count */}
        {!loading && !error && (
          <View style={styles.resultsSection}>
            <Text style={styles.resultsText}>
              {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'} found
            </Text>
          </View>
        )}

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
            <TouchableOpacity style={styles.retryButton} onPress={fetchCampaigns}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Campaigns Grid */}
        {!loading && !error && (
          <View style={styles.contentContainer}>
            {filteredCampaigns.length > 0 ? (
              <View
                style={[
                  styles.grid,
                  { flexDirection: isDesktop || isTablet ? 'row' : 'column' },
                ]}
              >
                {filteredCampaigns.map((campaign, index) => (
                  <Animatable.View
                    key={campaign._id}
                    animation="fadeInUp"
                    duration={600}
                    delay={index * 50}
                    style={[
                      styles.gridItem,
                      {
                        width: getCardWidth(),
                        marginRight:
                          isDesktop || isTablet
                            ? index % (isDesktop ? 3 : 2) === (isDesktop ? 2 : 1)
                              ? 0
                              : '3.5%'
                            : 0,
                        marginBottom: 24,
                      },
                    ]}
                  >
                    <CampaignCard
                      campaign={campaign}
                      onPress={handleCampaignPress}
                      index={index}
                    />
                  </Animatable.View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="file-tray-outline" size={64} color="#9ca3af" />
                <Text style={styles.emptyText}>No campaigns found</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your search or filters
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Footer */}
        <Footer navigation={navigation} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  topBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1f2937',
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  categoryButtonActive: {
    backgroundColor: '#14b8a6',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryButtonTextActive: {
    color: '#ffffff',
  },
  resultsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultsText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  grid: {
    flexWrap: 'wrap',
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
    textAlign: 'center',
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
    backgroundColor: '#14b8a6',
  },
  donateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#14b8a6',
  },
  donateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
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
    paddingVertical: 80,
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
