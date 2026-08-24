import api from './axios';

export const analyticsService = {
  // Content Analytics API
  getContentItems: async (params = {}) => {
    const res = await api.get('/api/content/items', { params });
    return res.data;
  },
  getContentKPIs: async (params = {}) => {
    const res = await api.get('/api/content/kpis', { params });
    return res.data;
  },
  getContentTrends: async (params = {}) => {
    const res = await api.get('/api/content/trends', { params });
    return res.data;
  },
  getTopPerformingContent: async (params = {}) => {
    const res = await api.get('/api/content/top-performing', { params });
    return res.data;
  },
  compareContentItems: async (contentIds) => {
    const res = await api.post('/api/content/compare', { content_ids: contentIds });
    return res.data;
  },

  // Audience Analytics API
  getAudienceOverview: async (params = {}) => {
    const res = await api.get('/api/audience/overview', { params });
    return res.data;
  },
  getAudienceDemographics: async (params = {}) => {
    const res = await api.get('/api/audience/demographics', { params });
    return res.data;
  },
  getAudienceActivity: async (params = {}) => {
    const res = await api.get('/api/audience/activity', { params });
    return res.data;
  },
  getAudienceReach: async (params = {}) => {
    const res = await api.get('/api/audience/reach', { params });
    return res.data;
  },
  getAudienceEngagement: async (params = {}) => {
    const res = await api.get('/api/audience/engagement', { params });
    return res.data;
  },
  getFollowerGrowth: async (params = {}) => {
    const res = await api.get('/api/audience/growth', { params });
    return res.data;
  },

  // Growth & Trends API
  getGrowthTrends: async (params = {}) => {
    const res = await api.get('/api/trends/growth', { params });
    return res.data;
  },
  getHashtagTrends: async (params = {}) => {
    const res = await api.get('/api/trends/hashtags', { params });
    return res.data;
  },
  getFullGrowthAnalysis: async (params = {}) => {
    const res = await api.get('/api/trends/analysis', { params });
    return res.data;
  },
};



