/**
 * Shared useCampaigns Hook
 * Platform-agnostic campaign data management
 */

import { useState, useCallback, useEffect } from 'react';

/**
 * Create campaigns hook factory
 * @param {object} campaignApi - Campaign API instance
 * @returns {Function} - useCampaigns hook
 */
export const createUseCampaigns = (campaignApi) => {
  return (options = {}) => {
    const { autoFetch = false, limit = 10, category = null } = options;
    
    const [campaigns, setCampaigns] = useState([]);
    const [filteredCampaigns, setFilteredCampaigns] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(category || 'All');

    /**
     * Fetch featured campaigns
     */
    const fetchFeaturedCampaigns = useCallback(async (fetchLimit = limit) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await campaignApi.getFeaturedCampaigns(fetchLimit);
        setCampaigns(data);
        setFilteredCampaigns(data);
        return data;
      } catch (err) {
        setError(err.message || 'Failed to fetch campaigns');
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, [campaignApi, limit]);

    /**
     * Fetch all campaigns
     */
    const fetchCampaigns = useCallback(async (status = null) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await campaignApi.listCampaigns(status);
        setCampaigns(data);
        setFilteredCampaigns(data);
        return data;
      } catch (err) {
        setError(err.message || 'Failed to fetch campaigns');
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, [campaignApi]);

    /**
     * Fetch single campaign
     */
    const fetchCampaignById = useCallback(async (campaignId) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await campaignApi.getCampaignById(campaignId);
        return data;
      } catch (err) {
        setError(err.message || 'Failed to fetch campaign');
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, [campaignApi]);

    /**
     * Create campaign
     */
    const createCampaign = useCallback(async (campaignData) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await campaignApi.createCampaign(campaignData);
        setCampaigns((prev) => [...prev, data]);
        return data;
      } catch (err) {
        setError(err.message || 'Failed to create campaign');
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, [campaignApi]);

    /**
     * Update campaign
     */
    const updateCampaign = useCallback(async (campaignId, updateData) => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await campaignApi.updateCampaign(campaignId, updateData);
        setCampaigns((prev) =>
          prev.map((c) => (c._id === campaignId ? data : c))
        );
        return data;
      } catch (err) {
        setError(err.message || 'Failed to update campaign');
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, [campaignApi]);

    /**
     * Delete campaign
     */
    const deleteCampaign = useCallback(async (campaignId) => {
      setIsLoading(true);
      setError(null);
      
      try {
        await campaignApi.deleteCampaign(campaignId);
        setCampaigns((prev) => prev.filter((c) => c._id !== campaignId));
        return true;
      } catch (err) {
        setError(err.message || 'Failed to delete campaign');
        throw err;
      } finally {
        setIsLoading(false);
      }
    }, [campaignApi]);

    /**
     * Filter campaigns by search and category
     */
    const filterCampaigns = useCallback(() => {
      let filtered = [...campaigns];

      // Filter by category
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
    }, [campaigns, selectedCategory, searchQuery]);

    // Auto-filter when dependencies change
    useEffect(() => {
      filterCampaigns();
    }, [filterCampaigns]);

    // Auto-fetch on mount if enabled
    useEffect(() => {
      if (autoFetch) {
        fetchFeaturedCampaigns();
      }
    }, [autoFetch, fetchFeaturedCampaigns]);

    return {
      campaigns,
      filteredCampaigns,
      isLoading,
      error,
      searchQuery,
      selectedCategory,
      setSearchQuery,
      setSelectedCategory,
      fetchFeaturedCampaigns,
      fetchCampaigns,
      fetchCampaignById,
      createCampaign,
      updateCampaign,
      deleteCampaign,
      filterCampaigns,
      refetch: fetchFeaturedCampaigns,
    };
  };
};

export default createUseCampaigns;
