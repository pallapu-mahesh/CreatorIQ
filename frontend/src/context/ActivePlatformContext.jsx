import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  YouTubeIcon, InstagramIcon, FacebookIcon, LinkedInIcon, XIcon
} from '../components/PlatformBrandIcon';

const ActivePlatformContext = createContext(null);

const PLATFORM_STORAGE_KEY = 'creatoriq_active_platform';

/**
 * Platform metadata registry.
 * Add new platforms here — the rest of the architecture picks them up automatically.
 */
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
};

/**
 * Normalize a YouTube video into the platform-agnostic content item format.
 */
function normalizeYouTubeVideo(video) {
  return {
    id: video.video_id || video.id || '',
    title: video.title || 'Untitled',
    type: 'video',
    thumbnailUrl: video.thumbnail_url || '',
    url: video.url || `https://www.youtube.com/watch?v=${video.video_id}`,
    publishedAt: video.published_at || null,
    metrics: {
      views: video.views ?? 0,
      likes: video.likes ?? 0,
      comments: video.comments ?? 0,
      shares: null,
      saves: null,
      duration: video.duration || null,
    },
  };
}

/**
 * Normalize YouTube channel data into the platform-agnostic account format.
 */
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

/**
 * Normalize an Instagram post/reel into platform-agnostic content item format.
 */
function normalizeInstagramMedia(item) {
  const likes = item.likes ?? item.like_count ?? item.likeCount ?? 0;
  const comments = item.comments ?? item.comments_count ?? item.commentsCount ?? 0;
  const views = item.views ?? item.play_count ?? item.video_play_count ?? item.videoPlayCount ?? null; // Never fabricate (req 8)
  const shares = item.shares ?? item.shares_count ?? null; // Never fabricate (req 8)
  const saves = item.saves ?? item.saves_count ?? null; // Never fabricate (req 8)
  const mediaType = (item.content_type || item.media_type || 'post').toLowerCase();

  return {
    id: item.external_id || item.id || '',
    title: item.title || item.caption || 'Instagram Post',
    type: mediaType,
    thumbnailUrl: item.thumbnail_url || item.media_url || item.thumbnailUrl || '',
    url: item.url || item.permalink || 'https://instagram.com',
    publishedAt: item.published_at || item.publishedAt || item.timestamp || null,
    metrics: {
      views: views,
      likes: likes,
      comments: comments,
      shares: shares,
      saves: saves,
      duration: null,
    },
  };
}

/**
 * Normalize Instagram profile data into platform-agnostic account format.
 */
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

/**
 * Normalize a Facebook Page post into platform-agnostic content item format.
 */
function normalizeFacebookPost(item) {
  const likes = item.likes ?? item.like_count ?? item.likeCount ?? item.reactions ?? 0;
  const comments = item.comments ?? item.comments_count ?? item.commentsCount ?? 0;
  const shares = item.shares ?? item.shares_count ?? null; // Never fabricate (req 8)
  const views = item.views ?? item.video_views ?? item.play_count ?? null; // Never fabricate (req 8)
  const mediaType = (item.content_type || item.media_type || item.type || 'post').toLowerCase();

  return {
    id: item.external_id || item.id || '',
    title: item.title || item.message || item.caption || 'Facebook Post',
    type: mediaType.includes('video') ? 'video' : 'post',
    thumbnailUrl: item.thumbnail_url || item.media_url || item.full_picture || '',
    url: item.url || item.permalink_url || 'https://facebook.com',
    publishedAt: item.published_at || item.publishedAt || item.created_time || null,
    metrics: {
      views: views,
      likes: likes,
      comments: comments,
      shares: shares,
      saves: null,
      duration: null,
    },
  };
}

/**
 * Normalize Facebook Page data into the platform-agnostic account format.
 */
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

import { demoData } from './demoData';

export function ActivePlatformProvider({ children }) {
  // ─── Local state ────────────────────────────────────────────
  const [activePlatform, setActivePlatformState] = useState(() => {
    try {
      return sessionStorage.getItem(PLATFORM_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  });

  // ─── Persist active platform to session storage ─────────────
  const persistPlatform = useCallback((platformId) => {
    setActivePlatformState(platformId);
    if (platformId) {
      sessionStorage.setItem(PLATFORM_STORAGE_KEY, platformId);
    } else {
      sessionStorage.removeItem(PLATFORM_STORAGE_KEY);
    }
  }, []);

  // ─── Switch active platform ─────────────────────────────────
  const switchPlatform = useCallback((platformId) => {
    if (platformId === activePlatform) return;
    persistPlatform(platformId);
  }, [activePlatform, persistPlatform]);

  // ─── Clear active platform (empty state) ────────────────────
  const clearActivePlatform = useCallback(() => {
    persistPlatform(null);
  }, [persistPlatform]);

  // ─── Build normalized output based on active platform ───────
  const normalized = useMemo(() => {
    const platformMeta = activePlatform ? PLATFORM_REGISTRY[activePlatform] : null;

    if (activePlatform && demoData[activePlatform]) {
      return {
        activePlatform,
        platformMeta,
        activeAccount: demoData[activePlatform].account,
        contentItems: demoData[activePlatform].content,
        activeAudience: demoData[activePlatform].audience || null,
        hasActivePlatform: true,
        loading: false,
        error: null,
        activeSource: 'demo',
      };
    }

    return {
      activePlatform: null,
      platformMeta: null,
      activeAccount: null,
      contentItems: [],
      activeAudience: null,
      hasActivePlatform: false,
      loading: false,
      error: null,
      activeSource: null,
    };
  }, [activePlatform]);

  // ─── Context value ──────────────────────────────────────────
  const value = useMemo(() => ({
    // Normalized state
    activePlatform: normalized.activePlatform,
    platformMeta: normalized.platformMeta,
    activeAccount: normalized.activeAccount,
    contentItems: normalized.contentItems,
    activeAudience: normalized.activeAudience,
    hasActivePlatform: normalized.hasActivePlatform,
    loading: normalized.loading,
    error: normalized.error,
    activeSource: normalized.activeSource,

    // Platform registry for UI rendering
    PLATFORM_REGISTRY,

    // Actions
    switchPlatform,
    clearActivePlatform,

    // Mock platform contexts for backward compatibility
    youtube: {
      activeChannel: activePlatform === 'youtube' ? demoData.youtube.account : null,
      videos: activePlatform === 'youtube' ? demoData.youtube.content : [],
      hasActiveChannel: activePlatform === 'youtube',
      loading: false,
      error: null,
      disconnectActiveChannel: clearActivePlatform,
      activatePublicChannel: async () => { switchPlatform('youtube'); },
      activateOAuthChannel: async () => { switchPlatform('youtube'); },
    },
    instagram: {
      activeProfile: activePlatform === 'instagram' ? demoData.instagram.account : null,
      media: activePlatform === 'instagram' ? demoData.instagram.content : [],
      hasActiveProfile: activePlatform === 'instagram',
      loading: false,
      error: null,
      disconnectActiveProfile: clearActivePlatform,
      activatePublicProfile: async () => { switchPlatform('instagram'); },
      activateOAuthAccount: async () => { switchPlatform('instagram'); },
    },
    facebook: {
      activePage: activePlatform === 'facebook' ? demoData.facebook.account : null,
      posts: activePlatform === 'facebook' ? demoData.facebook.content : [],
      hasActivePage: activePlatform === 'facebook',
      loading: false,
      error: null,
      disconnectActivePage: clearActivePlatform,
      activatePublicPage: async () => { switchPlatform('facebook'); },
      activateOAuthAccount: async () => { switchPlatform('facebook'); },
    },
  }), [normalized, switchPlatform, clearActivePlatform, activePlatform]);

  return (
    <ActivePlatformContext.Provider value={value}>
      {children}
    </ActivePlatformContext.Provider>
  );
}

/**
 * Hook to consume the centralized Active Platform context.
 */
export function useActivePlatform() {
  const context = useContext(ActivePlatformContext);
  if (!context) {
    throw new Error('useActivePlatform must be used within an ActivePlatformProvider');
  }
  return context;
}

