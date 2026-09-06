/**
 * mongoAnalyticsApi.js — API client for MongoDB-backed analytics endpoints.
 *
 * All endpoints require:
 *   - JWT auth (auto-attached by axios interceptor)
 *   - platform query param (e.g. "youtube")
 *   - platform_account_id query param (returned by /api/platforms/connect)
 *
 * Data is stored per (user_id, platform, platform_account_id, module) — no cross-user leakage.
 */

import api from './axios';

const params = (platform, platformAccountId) => ({
  platform,
  platform_account_id: platformAccountId,
});

/**
 * Fetch dashboard analytics from MongoDB for the active platform account.
 */
export async function getDashboardAnalytics(platform, platformAccountId) {
  const res = await api.get('/api/mongo/dashboard', { params: params(platform, platformAccountId) });
  return res.data;
}

/**
 * Fetch content analytics (items + KPIs) from MongoDB.
 */
export async function getContentAnalytics(platform, platformAccountId) {
  const res = await api.get('/api/mongo/content', { params: params(platform, platformAccountId) });
  return res.data;
}

/**
 * Fetch audience analytics (overview, demographics, activity, engagement) from MongoDB.
 */
export async function getAudienceAnalytics(platform, platformAccountId) {
  const res = await api.get('/api/mongo/audience', { params: params(platform, platformAccountId) });
  return res.data;
}

/**
 * Fetch growth & trend analytics from MongoDB.
 */
export async function getGrowthAnalytics(platform, platformAccountId) {
  const res = await api.get('/api/mongo/growth', { params: params(platform, platformAccountId) });
  return res.data;
}

/**
 * Fetch revenue analytics from MongoDB.
 */
export async function getRevenueAnalytics(platform, platformAccountId) {
  const res = await api.get('/api/mongo/revenue', { params: params(platform, platformAccountId) });
  return res.data;
}

/**
 * Fetch report summary data from MongoDB.
 */
export async function getReportsAnalytics(platform, platformAccountId) {
  const res = await api.get('/api/mongo/reports', { params: params(platform, platformAccountId) });
  return res.data;
}

/**
 * Fetch ALL analytics modules at once from MongoDB.
 * Returns { platform, platform_account_id, user_id, modules: { dashboard, content, ... } }
 */
export async function getAllAnalytics(platform, platformAccountId) {
  const res = await api.get('/api/mongo/all', { params: params(platform, platformAccountId) });
  return res.data;
}

/**
 * Save or update a specific module's analytics in MongoDB for the current user and active platform account.
 *
 * @param {string} platform
 * @param {string} platformAccountId
 * @param {string} accountName
 * @param {string} module - 'dashboard' | 'content' | 'audience' | 'growth' | 'revenue' | 'reports'
 * @param {object} data - module analytics payload
 */
export async function saveModuleAnalytics(platform, platformAccountId, accountName, module, data) {
  const res = await api.post('/api/mongo/save-module', {
    platform,
    platform_account_id: platformAccountId,
    account_name: accountName,
    module,
    data,
  });
  return res.data;
}

