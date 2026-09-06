/**
 * platformsApi.js — API client for platform connection management.
 *
 * Endpoints:
 *   POST /api/platforms/connect      — connect a platform, persist analytics to MongoDB
 *   POST /api/platforms/disconnect   — disconnect a platform
 *   GET  /api/platforms/connections  — get all active connections for the current user
 */

import api from './axios';

/**
 * Connect a platform and persist all analytics modules to MongoDB.
 *
 * @param {string} platform   - Platform ID (youtube | instagram | facebook | linkedin | twitter)
 * @param {object} account    - Normalized account data (name, handle, followersCount, etc.)
 * @param {Array}  content    - Array of content items with metrics
 * @param {object} [audience] - Optional pre-built audience data
 * @returns {Promise<{ success, platform, platform_account_id, account_name }>}
 */
export async function connectPlatform(platform, account, content = [], audience = null) {
  const res = await api.post('/api/platforms/connect', {
    platform,
    account,
    content,
    audience,
  });
  return res.data;
}

/**
 * Disconnect a platform in MongoDB (marks is_connected: false, keeps analytics data).
 *
 * @param {string} platform            - Platform ID
 * @param {string} platformAccountId   - The platform_account_id returned by connectPlatform
 * @returns {Promise<{ success, platform, message }>}
 */
export async function disconnectPlatform(platform, platformAccountId) {
  const res = await api.post('/api/platforms/disconnect', {
    platform,
    platform_account_id: platformAccountId,
  });
  return res.data;
}

/**
 * Get all active platform connections for the authenticated user.
 * Used to restore platform state after page refresh.
 *
 * @returns {Promise<{ connections: Array }>}
 */
export async function getPlatformConnections() {
  const res = await api.get('/api/platforms/connections');
  return res.data;
}

/**
 * Check if a specific platform is connected.
 *
 * @param {string} platform
 * @returns {Promise<{ connected: boolean, platform: string, connection: object|null }>}
 */
export async function getPlatformConnectionStatus(platform) {
  const res = await api.get('/api/mongo/connection', { params: { platform } });
  return res.data;
}
