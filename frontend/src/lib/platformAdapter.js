import { useMemo } from 'react';
import { useActivePlatform } from '../context/ActivePlatformContext';

/**
 * Adapters that map the normalized ActivePlatform output (activeAccount /
 * contentItems) back into the legacy "YouTube channel + videos" shape that the
 * existing analytics pages consume. This lets every page keep its logic and UI
 * untouched while reading only from ActivePlatformContext, regardless of which
 * platform is currently active.
 *
 * Requirement: "Read data only from ActivePlatformContext" + "Normalize
 * Instagram data into the same structure used by YouTube so every page works
 * without UI changes."
 */

export function toLegacyChannel(account, platformMeta) {
  if (!account) return null;
  const handle = (account.handle || '').replace(/^@/, '');
  return {
    title: account.name || '',
    custom_url: handle || null,
    channel_id: account.externalId || account.id || handle || null,
    avatar_url: account.avatarUrl || '',
    banner_url: account.bannerUrl || null,
    profile_image: account.avatarUrl || '',
    subscribers_count: account.followersCount || 0,
    total_views: account.totalViews || 0,
    video_count: account.contentCount || 0,
    country: account.country || null,
    description: account.description || '',
    platformId: platformMeta?.id || 'youtube',
    platformName: platformMeta?.displayName || 'YouTube',
    followerLabel: platformMeta?.followerLabel || 'Subscribers',
    contentLabel: platformMeta?.contentLabel || 'Videos',
  };
}

export function toLegacyVideos(contentItems) {
  return (contentItems || []).map((v) => {
    const meters = v.metrics || {};
    return {
      id: v.id || '',
      video_id: v.id || '',
      title: v.title || 'Untitled',
      published_at: v.publishedAt || null,
      views: meters.views ?? 0,
      likes: meters.likes ?? 0,
      comments: meters.comments ?? 0,
      shares: meters.shares ?? null,
      saves: meters.saves ?? null,
      watch_time_minutes: meters.watchTimeMinutes ?? (meters.views ? Math.round(meters.views * 2.5) : 0),
      duration_seconds: meters.duration ?? null,
      reach: meters.reach ?? null,
      thumbnail_url: v.thumbnailUrl || '',
      description: '',
      url: v.url || '#',
      type: v.type || 'video',
    };
  });
}

/**
 * Hook that brings the active platform into the legacy shape used by
 * Audience, GrowthTrends, Revenue and Reports.
 */
export function useLegacyActive() {
  const { activeAccount, contentItems, activeAudience, hasActivePlatform, loading, platformMeta } = useActivePlatform();
  const activeChannel = useMemo(() => toLegacyChannel(activeAccount, platformMeta), [activeAccount, platformMeta]);
  const videos = useMemo(() => toLegacyVideos(contentItems), [contentItems]);
  return {
    activeChannel,
    videos,
    audience: activeAudience || null,
    hasActiveChannel: hasActivePlatform,
    loading: loading,
    platformMeta,
    activePlatform: platformMeta?.id || null,
  };
}