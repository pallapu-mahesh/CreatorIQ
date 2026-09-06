/**
 * ActivePlatformContext.jsx
 *
 * Central state manager for the connected social platform.
 *
 * On connect:
 *   1. sessionStorage updated (for immediate UI reactivity)
 *   2. POST /api/platforms/connect — persists connection + all analytics modules to MongoDB
 *   3. platform_account_id stored in context (needed for all MongoDB queries)
 *
 * On disconnect:
 *   1. sessionStorage cleared
 *   2. POST /api/platforms/disconnect — marks disconnected in MongoDB
 *   3. platform_account_id cleared from context
 *
 * On mount:
 *   - GET /api/platforms/connections — restore active platform state from MongoDB
 *     (survives full page refresh even without sessionStorage)
 *
 * Analytics pages:
 *   - Use activePlatform + platformAccountId from this context as query params
 *     when calling the MongoDB-backed /api/mongo/* endpoints
 */

import {
  createContext, useContext, useState, useCallback,
  useMemo, useEffect, useRef,
} from 'react';
import {
  YouTubeIcon, InstagramIcon, FacebookIcon, LinkedInIcon, XIcon,
} from '../components/PlatformBrandIcon';
import { connectPlatform, disconnectPlatform, getPlatformConnections } from '../api/platformsApi';
import { saveModuleAnalytics } from '../api/mongoAnalyticsApi';
import { demoData } from './demoData';

const ActivePlatformContext = createContext(null);

const PLATFORM_STORAGE_KEY = 'creatoriq_active_platform';
const ACCOUNT_ID_STORAGE_KEY = 'creatoriq_platform_account_id';

// ─────────────────────────────────────────────────────────────────────────────
// Platform metadata registry
// ─────────────────────────────────────────────────────────────────────────────
const PLATFORM_REGISTRY = {
  youtube: {
    id: 'youtube',
    displayName: 'YouTube',
    color: 'red',
    accentBg: 'bg-red-500',
    accentText: 'text-red-600',
    accentBorder: 'border-red-500',
    accentLight: 'bg-red-50',
    gradientFrom: 'from-red-600',
    gradientTo: 'to-slate-900',
    icon: YouTubeIcon,
    followerLabel: 'Subscribers',
    contentLabel: 'Videos',
    contentSingular: 'Video',
  },
  instagram: {
    id: 'instagram',
    displayName: 'Instagram',
    color: 'pink',
    accentBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600',
    accentText: 'text-rose-600',
    accentBorder: 'border-rose-500',
    accentLight: 'bg-rose-50',
    gradientFrom: 'from-rose-600',
    gradientTo: 'to-purple-900',
    icon: InstagramIcon,
    followerLabel: 'Followers',
    contentLabel: 'Posts',
    contentSingular: 'Post',
  },
  facebook: {
    id: 'facebook',
    displayName: 'Facebook',
    color: 'blue',
    accentBg: 'bg-blue-600',
    accentText: 'text-blue-600',
    accentBorder: 'border-blue-500',
    accentLight: 'bg-blue-50',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-slate-900',
    icon: FacebookIcon,
    followerLabel: 'Followers',
    contentLabel: 'Posts',
    contentSingular: 'Post',
  },
  linkedin: {
    id: 'linkedin',
    displayName: 'LinkedIn',
    color: 'sky',
    accentBg: 'bg-sky-700',
    accentText: 'text-sky-700',
    accentBorder: 'border-sky-500',
    accentLight: 'bg-sky-50',
    gradientFrom: 'from-sky-700',
    gradientTo: 'to-slate-900',
    icon: LinkedInIcon,
    followerLabel: 'Connections',
    contentLabel: 'Posts',
    contentSingular: 'Post',
  },
  twitter: {
    id: 'twitter',
    displayName: 'X (Twitter)',
    color: 'slate',
    accentBg: 'bg-slate-900',
    accentText: 'text-slate-900',
    accentBorder: 'border-slate-700',
    accentLight: 'bg-slate-100',
    gradientFrom: 'from-slate-900',
    gradientTo: 'to-slate-700',
    icon: XIcon,
    followerLabel: 'Followers',
    contentLabel: 'Posts',
    contentSingular: 'Post',
  },
  all: {
    id: 'all',
    displayName: 'All Platforms',
    color: 'indigo',
    accentBg: 'bg-indigo-600',
    accentText: 'text-indigo-600',
    accentBorder: 'border-indigo-500',
    accentLight: 'bg-indigo-50',
    gradientFrom: 'from-indigo-600',
    gradientTo: 'to-slate-900',
    followerLabel: 'Total Audience',
    contentLabel: 'Total Content',
    contentSingular: 'Item',
  },
};

const CONNECTED_PLATFORMS_KEY = 'creatoriq_connected_platforms';
const SELECTED_PLATFORM_KEY = 'creatoriq_selected_platform';
const CONNECTED_ACCOUNTS_KEY = 'creatoriq_connected_accounts';

// ─────────────────────────────────────────────────────────────────────────────
// Normalizers (unchanged — kept for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────

function normalizeYouTubeAccount(channel) {
  if (!channel) return null;
  return {
    name: channel.title || 'YouTube Channel',
    handle: channel.custom_url || channel.channel_id || '',
    avatarUrl: channel.avatar_url || '',
    bannerUrl: channel.banner_url || null,
    followersCount: channel.subscribers_count || 0,
    followingCount: null,
    contentCount: channel.video_count || 0,
    totalViews: channel.total_views || 0,
    description: channel.description || '',
    country: channel.country || null,
    accountType: 'channel',
    publishedAt: channel.published_at || null,
    externalUrl: channel.custom_url
      ? `https://youtube.com/${channel.custom_url}`
      : channel.channel_id
        ? `https://youtube.com/channel/${channel.channel_id}`
        : null,
    _raw: channel,
  };
}

function normalizeInstagramAccount(profile) {
  if (!profile) return null;
  const rawHandle = profile.username || profile.handle || profile.name || '';
  const cleanHandle = rawHandle ? (rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`) : '';
  return {
    name: profile.fullName || profile.name || profile.username || 'Instagram Account',
    handle: cleanHandle,
    avatarUrl: profile.profileImage || profile.profile_picture_url || profile.avatar_url || profile.profile_image || '',
    bannerUrl: null,
    followersCount: profile.followers ?? profile.followers_count ?? profile.followersCount ?? 0,
    followingCount: profile.following ?? profile.follows_count ?? profile.followingCount ?? 0,
    contentCount: profile.mediaPosts ?? profile.media_count ?? profile.contentCount ?? 0,
    totalViews: profile.totalViews ?? null,
    description: profile.bio || profile.biography || profile.description || '',
    country: null,
    accountType: profile.accountType || profile.account_type || 'BUSINESS',
    publishedAt: null,
    externalUrl: cleanHandle ? `https://instagram.com/${cleanHandle.replace(/^@/, '')}` : null,
    _raw: profile,
  };
}

function normalizeFacebookAccount(page) {
  if (!page) return null;
  const rawHandle = page.username || page.name || page.channel_name || '';
  const cleanHandle = rawHandle ? (rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`) : '';
  return {
    name: page.name || page.channel_name || page.username || 'Facebook Page',
    handle: cleanHandle,
    avatarUrl: page.profile_picture_url || page.picture || page.profile_image || page.avatar_url || '',
    bannerUrl: page.cover_url || page.cover || null,
    followersCount: page.followers ?? page.fan_count ?? page.followersCount ?? 0,
    likesCount: page.likes ?? page.likes_count ?? page.fan_count ?? null,
    followingCount: null,
    contentCount: page.posts_count ?? page.contentCount ?? 0,
    totalViews: page.totalViews ?? null,
    description: page.description || page.company_overview || '',
    country: null,
    accountType: page.accountType || page.account_type || 'PAGE',
    verified: page.verified ?? null,
    publishedAt: null,
    externalUrl: page.link || page.page_url || null,
    _raw: page,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function ActivePlatformProvider({ children }) {
  // ── Multi-Platform State ───────────────────────────────────────────────────
  const [connectedPlatforms, setConnectedPlatforms] = useState(() => {
    try {
      const stored = localStorage.getItem(CONNECTED_PLATFORMS_KEY);
      if (stored) return JSON.parse(stored);
      const single = sessionStorage.getItem(PLATFORM_STORAGE_KEY);
      return single ? [single] : [];
    } catch {
      return [];
    }
  });

  const [connectedAccounts, setConnectedAccounts] = useState(() => {
    try {
      const stored = localStorage.getItem(CONNECTED_ACCOUNTS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const [selectedPlatform, setSelectedPlatformState] = useState(() => {
    try {
      return sessionStorage.getItem(SELECTED_PLATFORM_KEY) || 'all';
    } catch {
      return 'all';
    }
  });

  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);

  const restoredRef = useRef(false);

  // ── Sync to Storage ────────────────────────────────────────────────────────
  const _saveConnectedState = useCallback((platforms, accounts) => {
    setConnectedPlatforms(platforms);
    setConnectedAccounts(accounts);
    try {
      localStorage.setItem(CONNECTED_PLATFORMS_KEY, JSON.stringify(platforms));
      localStorage.setItem(CONNECTED_ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.warn('Failed to save connected platforms to localStorage:', e);
    }
  }, []);

  // ── selectPlatform (Filters views without disconnecting anything) ───────────
  const selectPlatform = useCallback((platformId) => {
    setSelectedPlatformState(platformId);
    try {
      sessionStorage.setItem(SELECTED_PLATFORM_KEY, platformId);
      sessionStorage.setItem(PLATFORM_STORAGE_KEY, platformId === 'all' ? '' : platformId);
    } catch (e) {
      console.warn('Failed to save selected platform to sessionStorage:', e);
    }
  }, []);

  // ── Restore connections from Backend on mount ──────────────────────────────
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const token = localStorage.getItem('creatoriq_token');
    if (!token) return;

    getPlatformConnections()
      .then(({ connections }) => {
        if (!connections || connections.length === 0) return;

        const serverPlatforms = [];
        const serverAccounts = {};

        connections.forEach((conn) => {
          const p = conn.platform?.toLowerCase();
          if (p && conn.is_connected !== false) {
            serverPlatforms.push(p);
            // Construct normalized account info from server connection or fallback to demo
            const fallback = demoData[p]?.account || {};
            serverAccounts[p] = {
              name: conn.account_name || fallback.name || p.toUpperCase(),
              handle: conn.handle || fallback.handle || `@${p}`,
              avatarUrl: conn.avatar_url || fallback.avatarUrl || '',
              followersCount: conn.followers_count ?? fallback.followersCount ?? 0,
              followingCount: conn.following_count ?? fallback.followingCount ?? null,
              contentCount: conn.content_count ?? fallback.contentCount ?? 0,
              totalViews: conn.total_views ?? fallback.totalViews ?? 0,
              platformAccountId: conn.platform_account_id,
            };
          }
        });

        if (serverPlatforms.length > 0) {
          _saveConnectedState(serverPlatforms, serverAccounts);
          // Set default selection if none currently selected
          setSelectedPlatformState((current) => {
            if (current === 'all' || serverPlatforms.includes(current)) return current;
            return 'all';
          });
        }
      })
      .catch((err) => {
        console.warn('[CreatorIQ] Note on restoring connections:', err?.message || err);
      });
  }, [_saveConnectedState]);

  // ── connectPlatform (Connects a platform, preserves all others) ────────────
  const connectPlatformAction = useCallback(async (platformId, customAccount = null, customContent = null) => {
    setConnecting(true);
    setConnectError(null);

    const demo = demoData[platformId];
    const account = customAccount || demo?.account || {
      name: `${platformId.toUpperCase()} Account`,
      handle: `@${platformId}`,
      followersCount: 1000,
      contentCount: 10,
      totalViews: 50000,
    };
    const content = customContent || (demo?.content || []).map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      thumbnailUrl: item.thumbnailUrl,
      url: item.url,
      publishedAt: item.publishedAt,
      metrics: item.metrics
        ? {
            views: item.metrics.views ?? null,
            likes: item.metrics.likes ?? null,
            comments: item.metrics.comments ?? null,
            shares: item.metrics.shares ?? null,
            saves: item.metrics.saves ?? null,
            duration: item.metrics.duration ?? null,
          }
        : null,
    }));

    // Optimistically add to connected platforms
    const updatedPlatforms = Array.from(new Set([...connectedPlatforms, platformId]));
    const updatedAccounts = {
      ...connectedAccounts,
      [platformId]: account,
    };
    _saveConnectedState(updatedPlatforms, updatedAccounts);

    // Keep 'all' or switch filter to the newly connected platform
    selectPlatform(platformId);

    try {
      const result = await connectPlatform(platformId, account, content);
      if (result?.platform_account_id) {
        updatedAccounts[platformId] = {
          ...account,
          platformAccountId: result.platform_account_id,
        };
        _saveConnectedState(updatedPlatforms, updatedAccounts);
        console.info(`[CreatorIQ] ${platformId} connected. Total active platforms: ${updatedPlatforms.length}`);
      }
    } catch (err) {
      console.warn('[CreatorIQ] Backend connect notice:', err?.response?.data || err.message);
    } finally {
      setConnecting(false);
    }
  }, [connectedPlatforms, connectedAccounts, _saveConnectedState, selectPlatform]);

  // ── disconnectPlatform (Disconnects ONLY this platform) ────────────────────
  const disconnectPlatformAction = useCallback(async (platformId) => {
    setConnecting(true);
    const account = connectedAccounts[platformId];
    const accountId = account?.platformAccountId || '';

    // Remove only this platform
    const updatedPlatforms = connectedPlatforms.filter((p) => p !== platformId);
    const updatedAccounts = { ...connectedAccounts };
    delete updatedAccounts[platformId];

    _saveConnectedState(updatedPlatforms, updatedAccounts);

    // Adjust selected platform filter if we just disconnected the selected one
    if (selectedPlatform === platformId) {
      selectPlatform(updatedPlatforms.length > 0 ? 'all' : 'all');
    }

    try {
      await disconnectPlatform(platformId, accountId);
      console.info(`[CreatorIQ] ${platformId} disconnected. Remaining platforms: ${updatedPlatforms.length}`);
    } catch (err) {
      console.warn('[CreatorIQ] Backend disconnect notice:', err?.response?.data || err.message);
    } finally {
      setConnecting(false);
    }
  }, [connectedPlatforms, connectedAccounts, selectedPlatform, _saveConnectedState, selectPlatform]);

  // ── Legacy switchPlatform & clearActivePlatform aliases ────────────────────
  const switchPlatform = useCallback(async (platformId) => {
    if (!connectedPlatforms.includes(platformId)) {
      await connectPlatformAction(platformId);
    } else {
      selectPlatform(platformId);
    }
  }, [connectedPlatforms, connectPlatformAction, selectPlatform]);

  const clearActivePlatform = useCallback(async () => {
    if (selectedPlatform && selectedPlatform !== 'all') {
      await disconnectPlatformAction(selectedPlatform);
    } else if (connectedPlatforms.length > 0) {
      // Disconnect first connected platform
      await disconnectPlatformAction(connectedPlatforms[0]);
    }
  }, [selectedPlatform, connectedPlatforms, disconnectPlatformAction]);

  // ── saveModuleData ─────────────────────────────────────────────────────────
  const saveModuleData = useCallback(async (moduleName, data) => {
    const targetPlatform = selectedPlatform === 'all' ? (connectedPlatforms[0] || 'youtube') : selectedPlatform;
    const account = connectedAccounts[targetPlatform];
    const accountId = account?.platformAccountId || `${targetPlatform}_account`;
    const accountName = account?.name || targetPlatform;
    try {
      return await saveModuleAnalytics(
        targetPlatform,
        accountId,
        accountName,
        moduleName,
        data
      );
    } catch (err) {
      console.warn(`[CreatorIQ] Save ${moduleName} notice:`, err?.message);
      return null;
    }
  }, [selectedPlatform, connectedPlatforms, connectedAccounts]);

  // ── Build normalized output ────────────────────────────────────────────────
  const normalized = useMemo(() => {
    const hasAny = connectedPlatforms.length > 0;

    if (!hasAny) {
      return {
        hasActivePlatform: false,
        activePlatform: null,
        selectedPlatform: 'all',
        connectedPlatforms: [],
        connectedAccounts: {},
        platformMeta: null,
        activeAccount: null,
        contentItems: [],
        activeAudience: null,
        platformBreakdown: [],
        loading: connecting,
        error: connectError,
      };
    }

    // Build unified or single platform view
    const isAll = selectedPlatform === 'all' || !connectedPlatforms.includes(selectedPlatform);

    if (isAll) {
      // ── Aggregate across ALL connected platforms ──
      let totalFollowers = 0;
      let totalViews = 0;
      let totalContentCount = 0;
      const combinedContent = [];
      const breakdown = [];

      connectedPlatforms.forEach((p) => {
        const meta = PLATFORM_REGISTRY[p] || { displayName: p.toUpperCase(), color: 'slate' };
        const acc = connectedAccounts[p] || demoData[p]?.account || {
          name: meta.displayName,
          followersCount: 0,
          totalViews: 0,
          contentCount: 0,
        };
        const pContent = (demoData[p]?.content || []).map((c) => ({
          ...c,
          platform: p,
          platformName: meta.displayName,
        }));

        totalFollowers += (acc.followersCount || 0);
        totalViews += (acc.totalViews || 0);
        totalContentCount += (acc.contentCount || pContent.length || 0);

        combinedContent.push(...pContent);
        breakdown.push({
          platform: p,
          meta,
          account: acc,
          contentCount: acc.contentCount || pContent.length,
          followers: acc.followersCount || 0,
          views: acc.totalViews || 0,
        });
      });

      // Sort combined content items by publishedAt descending
      combinedContent.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

      const unifiedAccount = {
        name: 'All Connected Platforms',
        handle: `${connectedPlatforms.length} Platforms Connected`,
        avatarUrl: null,
        followersCount: totalFollowers,
        followingCount: null,
        contentCount: totalContentCount,
        totalViews: totalViews,
        description: `Unified portfolio across ${connectedPlatforms.map(p => PLATFORM_REGISTRY[p]?.displayName || p).join(', ')}`,
      };

      return {
        hasActivePlatform: true,
        activePlatform: 'all',
        selectedPlatform: 'all',
        connectedPlatforms,
        connectedAccounts,
        platformMeta: PLATFORM_REGISTRY.all,
        activeAccount: unifiedAccount,
        contentItems: combinedContent,
        activeAudience: null,
        platformBreakdown: breakdown,
        loading: connecting,
        error: connectError,
      };
    }

    // ── Single Selected Platform View ──
    const p = selectedPlatform;
    const meta = PLATFORM_REGISTRY[p] || { id: p, displayName: p.toUpperCase() };
    const acc = connectedAccounts[p] || demoData[p]?.account || null;
    const content = (demoData[p]?.content || []).map((c) => ({
      ...c,
      platform: p,
      platformName: meta.displayName,
    }));

    return {
      hasActivePlatform: true,
      activePlatform: p,
      selectedPlatform: p,
      connectedPlatforms,
      connectedAccounts,
      platformMeta: meta,
      activeAccount: acc,
      contentItems: content,
      activeAudience: demoData[p]?.audience || null,
      platformBreakdown: [{
        platform: p,
        meta,
        account: acc,
        contentCount: content.length,
        followers: acc?.followersCount || 0,
        views: acc?.totalViews || 0,
      }],
      loading: connecting,
      error: connectError,
    };
  }, [connectedPlatforms, connectedAccounts, selectedPlatform, connecting, connectError]);

  // ── Context Value ──────────────────────────────────────────────────────────
  const value = useMemo(() => ({
    // Multi-platform state
    hasActivePlatform: normalized.hasActivePlatform,
    activePlatform: normalized.activePlatform,
    selectedPlatform: normalized.selectedPlatform,
    connectedPlatforms: normalized.connectedPlatforms,
    connectedAccounts: normalized.connectedAccounts,
    platformMeta: normalized.platformMeta,
    activeAccount: normalized.activeAccount,
    contentItems: normalized.contentItems,
    activeAudience: normalized.activeAudience,
    platformBreakdown: normalized.platformBreakdown,
    loading: normalized.loading,
    error: normalized.error,

    // Platform registry
    PLATFORM_REGISTRY,

    // Actions
    selectPlatform,
    connectPlatform: connectPlatformAction,
    disconnectPlatform: disconnectPlatformAction,
    switchPlatform,
    clearActivePlatform,
    saveModuleData,

    // Backward-compatible platform sub-contexts
    youtube: {
      hasActiveChannel: connectedPlatforms.includes('youtube'),
      activeChannel: connectedAccounts.youtube || (connectedPlatforms.includes('youtube') ? demoData.youtube.account : null),
      videos: connectedPlatforms.includes('youtube') ? demoData.youtube.content : [],
      loading: connecting,
      error: connectError,
      disconnectActiveChannel: async () => { await disconnectPlatformAction('youtube'); },
      activatePublicChannel: async () => { await connectPlatformAction('youtube'); },
      activateOAuthChannel: async () => { await connectPlatformAction('youtube'); },
    },
    instagram: {
      hasActiveProfile: connectedPlatforms.includes('instagram'),
      activeProfile: connectedAccounts.instagram || (connectedPlatforms.includes('instagram') ? demoData.instagram.account : null),
      media: connectedPlatforms.includes('instagram') ? demoData.instagram.content : [],
      loading: connecting,
      error: connectError,
      disconnectActiveProfile: async () => { await disconnectPlatformAction('instagram'); },
      activatePublicProfile: async () => { await connectPlatformAction('instagram'); },
      activateOAuthAccount: async () => { await connectPlatformAction('instagram'); },
    },
    facebook: {
      hasActivePage: connectedPlatforms.includes('facebook'),
      activePage: connectedAccounts.facebook || (connectedPlatforms.includes('facebook') ? demoData.facebook.account : null),
      posts: connectedPlatforms.includes('facebook') ? demoData.facebook.content : [],
      loading: connecting,
      error: connectError,
      disconnectActivePage: async () => { await disconnectPlatformAction('facebook'); },
      activatePublicPage: async () => { await connectPlatformAction('facebook'); },
      activateOAuthAccount: async () => { await connectPlatformAction('facebook'); },
    },
  }), [
    normalized,
    connectedPlatforms,
    connectedAccounts,
    selectPlatform,
    connectPlatformAction,
    disconnectPlatformAction,
    switchPlatform,
    clearActivePlatform,
    saveModuleData,
    connecting,
    connectError,
  ]);

  return (
    <ActivePlatformContext.Provider value={value}>
      {children}
    </ActivePlatformContext.Provider>
  );
}

export function useActivePlatform() {
  const context = useContext(ActivePlatformContext);
  if (!context) {
    throw new Error('useActivePlatform must be used within an ActivePlatformProvider');
  }
  return context;
}

