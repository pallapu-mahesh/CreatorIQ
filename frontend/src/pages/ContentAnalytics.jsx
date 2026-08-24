import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivePlatform } from '../context/ActivePlatformContext';
import PlatformSelector from '../components/PlatformSelector';
import PlatformEmptyState from '../components/PlatformEmptyState';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Eye, ThumbsUp, MessageSquare, Share2, Bookmark, Clock, Signal, TrendingUp,
  Search, ArrowUpDown, Layers, CheckSquare, Square, X, ExternalLink, Play,
  Download, FileSpreadsheet, FileText, Sparkles, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function ContentAnalytics() {
  const navigate = useNavigate();
  const { activeAccount, contentItems: platformContentItems, activeAudience, hasActivePlatform, loading: contextLoading, platformMeta, activePlatform } = useActivePlatform();

  // Aliases for backward compatibility with the rest of this component
  const activeChannel = activeAccount;
  const hasActiveChannel = hasActivePlatform;
  const videos = platformContentItems;

  // Platform-aware labels (req 7, 10: never show YouTube data when a different platform is active)
  const isYouTube = platformMeta?.id === 'youtube';
  const isInstagram = platformMeta?.id === 'instagram';
  const isFacebook = platformMeta?.id === 'facebook';
  const platformLabel = platformMeta?.displayName || 'YouTube';
  const contentLabel = platformMeta?.contentLabel || 'Videos';
  const contentSingular = platformMeta?.contentSingular || 'Video';
  const followerLabel = platformMeta?.followerLabel || 'Subscribers';
  const supportsWatchTime = isYouTube || (platformContentItems || []).some(v => v.metrics?.watchTimeMinutes != null);
  const supportsReach = (platformContentItems || []).some(v => v.metrics?.reach != null);

  // Normalized ActivePlatform accounts use `name`; some legacy UI expects `title`.
  const activeName = activeAccount?.name || activeAccount?.title || 'Active account';

  // Local UI & Control State
  const [searchQuery, setSearchQuery] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [activeTrendMetric, setActiveTrendMetric] = useState('views');
  const [trendTimeframe, setTrendTimeframe] = useState('30d');

  // Side-by-side Comparison State
  const [selectedForCompare, setSelectedForCompare] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Key derived from Active Channel ID/title to detect account switches
  const activeChannelKey = activeChannel?.handle || activeChannel?.name || null;

  // Reactively reset filters, search, selections & page whenever Active Channel changes
  useEffect(() => {
    setSearchQuery('');
    setSelectedForCompare([]);
    setShowCompareModal(false);
    setCurrentPage(1);
    setSortBy('newest');
    setContentTypeFilter('all');
    setDateRangeFilter('all');
  }, [activeChannelKey]);

  // Transform normalized platform content items into Content Analytics Items
  const activeContentItems = useMemo(() => {
    if (!hasActiveChannel || !activeChannel || !videos || videos.length === 0) {
      return [];
    }

    return videos.map((v, idx) => {
      const views = v.metrics?.views ?? null;
      const likes = v.metrics?.likes ?? 0;
      const comments = v.metrics?.comments ?? 0;
      const shares = v.metrics?.shares ?? null; // Never fabricate (req 8)
      const saves = v.metrics?.saves ?? null;   // Never fabricate (req 8)

      // Engagement Rate:
      //   Instagram/Facebook: (likes + comments) / followers × 100 (req 3)
      //   YouTube:   (likes + comments + shares) / views × 100 (legacy)
      const followers = Number(activeChannel?.followersCount) || 0;
      let engRate = 0.0;
      if (isInstagram || isFacebook) {
        engRate = followers > 0 ? Number((((likes + comments) / followers) * 100).toFixed(2)) : null;
      } else if (views > 0) {
        engRate = Number((((likes + comments + (shares || 0)) / views) * 100).toFixed(2));
      }

      // Determine content type
      let type = v.type || 'video';
      if (v.metrics?.duration) {
        const parts = String(v.metrics.duration).split(':');
        if (parts.length === 2 && parseInt(parts[0]) === 0 && parseInt(parts[1]) <= 60) {
          type = 'short';
        }
      }

      return {
        id: v.id || `v_${idx}`,
        video_id: v.id,
        title: v.title || 'Untitled',
        platform: platformMeta?.id || 'youtube',
        content_type: type,
        thumbnail_url: v.thumbnailUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300',
        published_at: v.publishedAt || new Date().toISOString(),
        views: views,
        likes: likes,
        comments: comments,
        shares: shares,
        saves: saves,
        watch_time_minutes: v.metrics?.watchTimeMinutes != null
          ? v.metrics.watchTimeMinutes
          : (supportsWatchTime && views > 0 ? Math.round(views * 3.5) : 0),
        reach: v.metrics?.reach != null ? v.metrics.reach : null,
        engagement_rate: engRate,
        url: v.url || '#',
      };
    });
  }, [hasActiveChannel, activeChannel, videos, platformMeta, isInstagram, isFacebook, supportsWatchTime]);

  // Filtered and Sorted Content strictly belonging to the Active Channel
  const filteredContent = useMemo(() => {
    let result = [...activeContentItems];

    // Search filter (Content Title, Video Title, Keyword)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(item => item.title?.toLowerCase().includes(q));
    }

    // Content Type filter (Videos, Shorts, Live, Posts)
    if (contentTypeFilter !== 'all') {
      result = result.filter(item => item.content_type?.toLowerCase() === contentTypeFilter.toLowerCase());
    }

    // Date Range Filter
    if (dateRangeFilter !== 'all') {
      const now = new Date();
      let days = 30;
      if (dateRangeFilter === '7d') days = 7;
      else if (dateRangeFilter === '30d') days = 30;
      else if (dateRangeFilter === '90d') days = 90;
      else if (dateRangeFilter === '1y') days = 365;

      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      result = result.filter(item => new Date(item.published_at || 0) >= cutoff);
    }

    // Sort Ordering
    result.sort((a, b) => {
      if (sortBy === 'highest_views' || sortBy === 'views') return (b.views || 0) - (a.views || 0);
      if (sortBy === 'highest_likes' || sortBy === 'likes') return (b.likes || 0) - (a.likes || 0);
      if (sortBy === 'highest_comments' || sortBy === 'comments') return (b.comments || 0) - (a.comments || 0);
      if (sortBy === 'highest_engagement' || sortBy === 'engagement_rate') return (b.engagement_rate || 0) - (a.engagement_rate || 0);
      if (sortBy === 'oldest') return new Date(a.published_at || 0) - new Date(b.published_at || 0);
      return new Date(b.published_at || 0) - new Date(a.published_at || 0); // newest first
    });

    return result;
  }, [activeContentItems, searchQuery, contentTypeFilter, dateRangeFilter, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredContent.length / pageSize) || 1;
  const paginatedContent = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredContent.slice(start, start + pageSize);
  }, [filteredContent, currentPage, pageSize]);

  // Calculated Metrics derived strictly from the Active Channel's filtered content
  const activeMetrics = useMemo(() => {
    const followers = Number(activeChannel?.followersCount) || 0;
    const empty = {
      totalPosts: 0,
      totalViews: 0,
      hasAnyViews: false,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      hasAnyShares: false,
      totalSaves: null,
      totalWatchTimeHours: '0.0',
      totalReach: activeAudience?.reach?.totalReach ?? null,
      avgEngagementRate: null,
    };
    if (filteredContent.length === 0) {
      return empty;
    }

    const tViews = filteredContent.reduce((acc, i) => acc + (Number(i.views) || 0), 0);
    const hasAnyViews = filteredContent.some(i => i.views !== null && i.views !== undefined && Number(i.views) >= 0);
    const tLikes = filteredContent.reduce((acc, i) => acc + (i.likes || 0), 0);
    const tComments = filteredContent.reduce((acc, i) => acc + (i.comments || 0), 0);
    const tSharesMap = filteredContent.filter(i => i.shares !== null && i.shares !== undefined);
    const hasAnyShares = tSharesMap.length > 0;
    const tShares = tSharesMap.reduce((acc, i) => acc + (Number(i.shares) || 0), 0);
    const savesMap = filteredContent.filter(i => i.saves !== null && i.saves !== undefined);
    const hasAnySaves = savesMap.length > 0;
    const tSaves = savesMap.reduce((acc, i) => acc + (Number(i.saves) || 0), 0);
    const tWatchMin = filteredContent.reduce((acc, i) => acc + (i.watch_time_minutes || 0), 0);
    const reachMap = filteredContent.filter(i => i.reach !== null && i.reach !== undefined);
    const hasAnyReach = reachMap.length > 0;
    const tReach = reachMap.reduce((acc, i) => acc + (Number(i.reach) || 0), 0);

    // Engagement Rate: Instagram/Facebook = (likes + comments) / followers × 100 (req 3)
    let engagementRate = null;
    if ((isInstagram || isFacebook) && followers > 0) {
      engagementRate = ((tLikes + tComments) / followers) * 100;
    } else if (!isInstagram && !isFacebook) {
      const avgEng = filteredContent.reduce((acc, i) => acc + (Number(i.engagement_rate) || 0), 0) / filteredContent.length;
      engagementRate = avgEng;
    }

    return {
      totalPosts: filteredContent.length,
      totalViews: tViews,
      hasAnyViews,
      totalLikes: tLikes,
      totalComments: tComments,
      totalShares: tShares,
      hasAnyShares,
      totalSaves: hasAnySaves ? tSaves : null,
      totalWatchTimeHours: (tWatchMin / 60).toFixed(1),
      totalReach: hasAnyReach ? tReach : (activeAudience?.reach?.totalReach ?? null),
      avgEngagementRate: engagementRate !== null ? Number(engagementRate.toFixed(2)) : null,
    };
  }, [filteredContent, isInstagram, isFacebook, activeChannel, activeAudience]);

  // Top Performing Content identified strictly from Active Channel's videos
  const topPerforming = useMemo(() => {
    if (activeContentItems.length === 0) return {};
    const items = [...activeContentItems];
    return {
      views: [...items].sort((a, b) => (b.views || 0) - (a.views || 0))[0],
      likes: [...items].sort((a, b) => (b.likes || 0) - (a.likes || 0))[0],
      comments: [...items].sort((a, b) => (b.comments || 0) - (a.comments || 0))[0],
      engagement: [...items].sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0))[0],
    };
  }, [activeContentItems]);

  // Time Series Trend Data generated strictly for the Active Channel
  const chartTrendPoints = useMemo(() => {
    if (activeContentItems.length === 0) return [];

    let items = [...activeContentItems];

    // Filter by timeframe
    if (trendTimeframe !== 'all') {
      const now = new Date();
      let days = 30;
      if (trendTimeframe === '7d') days = 7;
      else if (trendTimeframe === '30d') days = 30;
      else if (trendTimeframe === '90d') days = 90;
      else if (trendTimeframe === '1y') days = 365;

      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      items = items.filter(i => new Date(i.published_at || 0) >= cutoff);
    }

    return items
      .sort((a, b) => new Date(a.published_at || 0) - new Date(b.published_at || 0))
      .map((item, idx) => ({
        date: item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `Video ${idx + 1}`,
        views: item.views || 0,
        likes: item.likes || 0,
        comments: item.comments || 0,
        shares: item.shares || 0,
        watch_time_hours: Number(((item.watch_time_minutes || 0) / 60).toFixed(1)),
        reach: item.reach || 0,
        engagement_rate: item.engagement_rate || 0,
      }));
  }, [activeContentItems, trendTimeframe]);

  // Comparison selection handler (max 4 videos)
  const toggleSelectForCompare = (id) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(i => i !== id));
    } else {
      if (selectedForCompare.length >= 4) {
        alert('You can select up to 4 content items for side-by-side comparison.');
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const selectedCompareItems = useMemo(() => {
    return activeContentItems.filter(i => selectedForCompare.includes(i.id));
  }, [activeContentItems, selectedForCompare]);

  // Highest metric values for comparison table highlighting
  const highestComparisonValues = useMemo(() => {
    if (selectedCompareItems.length === 0) return {};
    return {
      views: Math.max(...selectedCompareItems.map(i => i.views || 0)),
      likes: Math.max(...selectedCompareItems.map(i => i.likes || 0)),
      comments: Math.max(...selectedCompareItems.map(i => i.comments || 0)),
      shares: Math.max(...selectedCompareItems.map(i => i.shares || 0)),
      saves: Math.max(...selectedCompareItems.map(i => i.saves || 0)),
      watch_time: Math.max(...selectedCompareItems.map(i => i.watch_time_minutes || 0)),
      reach: Math.max(...selectedCompareItems.map(i => i.reach || 0)),
      engagement_rate: Math.max(...selectedCompareItems.map(i => i.engagement_rate || 0)),
    };
  }, [selectedCompareItems]);

  // Export handlers for Active Channel analytics
  const handleExportCSV = () => {
    if (filteredContent.length === 0) return;
    const headers = ['ID', 'Title', 'Platform', 'Content Type', 'Publish Date', 'Views', 'Likes', 'Comments', 'Shares', 'Saves', 'Watch Time (Mins)', 'Reach', 'Engagement Rate (%)'];
    const rows = filteredContent.map(i => [
      i.id,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      i.platform,
      i.content_type,
      i.published_at ? new Date(i.published_at).toISOString().split('T')[0] : '',
      i.views ?? 0,
      i.likes ?? 0,
      i.comments ?? 0,
      i.shares ?? 0,
      i.saves ?? '',
      i.watch_time_minutes ?? 0,
      i.reach ?? '',
      i.engagement_rate ?? 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${(activeChannel?.title || 'Active_Channel').replace(/\s+/g, '_')}_Content_Analytics.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    if (filteredContent.length === 0) return;
    let html = '<table><thead><tr><th>Title</th><th>Platform</th><th>Type</th><th>Published Date</th><th>Views</th><th>Likes</th><th>Comments</th><th>Shares</th><th>Saves</th><th>Watch Time (hrs)</th><th>Reach</th><th>Engagement Rate</th></tr></thead><tbody>';
    filteredContent.forEach(i => {
      html += `<tr><td>${i.title}</td><td>${i.platform}</td><td>${i.content_type}</td><td>${i.published_at}</td><td>${i.views}</td><td>${i.likes}</td><td>${i.comments}</td><td>${i.shares}</td><td>${i.saves ?? ''}</td><td>${((i.watch_time_minutes || 0)/60).toFixed(1)}</td><td>${i.reach ?? ''}</td><td>${i.engagement_rate}%</td></tr>`;
    });
    html += '</tbody></table>';

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeChannel?.title || 'Active_Channel').replace(/\s+/g, '_')}_Content_Analytics.xls`;
    a.click();
  };

  const handleExportPDF = () => {
    window.print();
  };

  // ----------------------------------------------------
  // RENDER: Context Loading State
  // ----------------------------------------------------
  if (contextLoading) {
    return (
      <div className="space-y-6 animate-pulse p-2">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4" />
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl mt-6" />
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Scenario 3 Empty State (No Active Channel)
  // ----------------------------------------------------
  if (!hasActiveChannel || !activeChannel) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-900 dark:text-white">Content Analytics</h1>
          <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400">
            Analyze the performance of all published content from the currently active social media account.
          </p>
        </div>

        <div className="card p-10 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm text-center max-w-2xl mx-auto my-12 animate-fade-in space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto shadow-xs border border-red-100 dark:border-red-900/50">
            <Play size={32} className="fill-current ml-1" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              No active account connected.
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Connect your social account or analyze a public profile to view content analytics.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => navigate('/dashboard/social')}
              className="btn-primary py-2.5 px-6 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2"
            >
              <Sparkles size={14} /> Go to Social Accounts
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: Active Channel Dashboard (Scenarios 1 & 2)
  // ----------------------------------------------------
  return (
    <div className="space-y-8 pb-12">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="page-title text-2xl font-bold text-slate-900 dark:text-white">Content Analytics</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Channel
            </span>
          </div>
          <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analyze the performance of all published content from <strong className="text-slate-900 dark:text-white font-bold">{activeName}</strong>
          </p>
        </div>

        {/* Active Account Identity Card */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl shadow-xs">
          <img
            src={activeChannel.avatarUrl || activeChannel.avatar_url || activeChannel.profile_image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}
            alt={activeName}
            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
          />
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[180px]">{activeName}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <span className={`font-bold ${isYouTube ? 'text-red-600' : 'text-rose-600 dark:text-rose-400'}`}>{platformLabel}</span> • {activeChannel.followersCount ? `${(activeChannel.followersCount / 1000).toFixed(1)}K ${followerLabel.toLowerCase()}` : 'Active'}
            </p>
          </div>
        </div>
      </div>

      {/* Platform selector — only the connected platform is selectable */}
      <PlatformSelector activePlatform={activePlatform} />

      {/* ── 8 KPI Cards for Active Channel ──────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Posts */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium flex items-center gap-1.5">
              <Layers size={15} className="text-slate-500 dark:text-slate-400" /> Total {contentLabel}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <TrendingUp size={12} /> Active
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {activeMetrics.totalPosts.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Returned by the {platformLabel} API</p>
        </div>

        {/* Total Views */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium flex items-center gap-1.5">
              <Eye size={15} className="text-sky-500" /> Total Views
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <TrendingUp size={12} /> Active
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {activeMetrics.hasAnyViews
              ? (activeMetrics.totalViews > 1000000
                ? `${(activeMetrics.totalViews / 1000000).toFixed(2)}M`
                : activeMetrics.totalViews.toLocaleString())
              : '—'}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Total views for {activeName}</p>
        </div>

        {/* Total Likes */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium flex items-center gap-1.5">
              <ThumbsUp size={15} className="text-rose-500" /> Total Likes
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <TrendingUp size={12} /> Active
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {activeMetrics.totalLikes > 1000000
              ? `${(activeMetrics.totalLikes / 1000000).toFixed(2)}M`
              : activeMetrics.totalLikes.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Total likes for {activeName}</p>
        </div>

        {/* Total Comments */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium flex items-center gap-1.5">
              <MessageSquare size={15} className="text-indigo-500" /> Total Comments
            </span>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
            {activeMetrics.totalComments.toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">Community discussion</p>
        </div>

        {/* Total Shares */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium flex items-center gap-1.5">
              <Share2 size={15} className="text-purple-500" /> Total Shares
            </span>
          </div>
          {activeMetrics.hasAnyShares ? (
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {activeMetrics.totalShares > 1000000
                ? `${(activeMetrics.totalShares / 1000000).toFixed(2)}M`
                : activeMetrics.totalShares.toLocaleString()}
            </p>
          ) : (
            <div className="py-1">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                No data
              </span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{activeMetrics.hasAnyShares ? ((isInstagram || isFacebook) ? 'Real shares returned by API' : 'Estimated virality') : 'Not returned for this account'}</p>
        </div>

        {/* Total Saves */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium flex items-center gap-1.5">
              <Bookmark size={15} className="text-amber-500" /> Total Saves
            </span>
          </div>
          {activeMetrics.totalSaves !== null ? (
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {activeMetrics.totalSaves.toLocaleString()}
            </p>
          ) : (
            <div className="py-1">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                No data
              </span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{activeMetrics.totalSaves !== null ? 'Saved by audience' : 'Not returned for this account'}</p>
        </div>

        {/* Total Watch Time */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium flex items-center gap-1.5">
              <Clock size={15} className="text-emerald-500" /> Total Watch Time
            </span>
          </div>
          {supportsWatchTime ? (
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {activeMetrics.totalWatchTimeHours} hrs
            </p>
          ) : (
            <div className="py-1">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                No data
              </span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{supportsWatchTime ? 'Accumulated watch time' : 'No watch time data'}</p>
        </div>

        {/* Total Reach */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium flex items-center gap-1.5">
              <Signal size={15} className="text-cyan-500" /> Total Reach
            </span>
          </div>
          {activeMetrics.totalReach !== null ? (
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {activeMetrics.totalReach > 1000000
                ? `${(activeMetrics.totalReach / 1000000).toFixed(2)}M`
                : activeMetrics.totalReach.toLocaleString()}
            </p>
          ) : (
            <div className="py-1">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                No data
              </span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{activeMetrics.totalReach !== null ? 'Audience reached' : 'No reach data'}</p>
        </div>

        {/* Average Engagement Rate */}
        <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium flex items-center gap-1.5">
              <Layers size={15} className="text-indigo-500" /> Avg Engagement Rate
            </span>
          </div>
          {activeMetrics.avgEngagementRate !== null ? (
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
              {activeMetrics.avgEngagementRate}%
            </p>
          ) : (
            <div className="py-1">
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                No data
              </span>
            </div>
          )}
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{isInstagram ? '(Likes + Comments) ÷ Followers' : 'Benchmark ratio'}</p>
        </div>
      </div>

      {/* ── Top Performing Content (Active Channel Only) ─────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Sparkles size={18} className="text-amber-500" /> Top Performing Content for {activeName}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Highest Views */}
          <div
            onClick={() => setSortBy('highest_views')}
            className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-sky-500 dark:hover:border-sky-500 transition-all cursor-pointer space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-lg">
                Highest Views
              </span>
              <Eye size={16} className="text-sky-500" />
            </div>
            {topPerforming.views ? (
              <div className="space-y-2">
                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative">
                  <img src={topPerforming.views.thumbnail_url} alt={topPerforming.views.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[10px] px-1.5 py-0.5 rounded">
                    {topPerforming.views.views != null ? `${topPerforming.views.views.toLocaleString()} views` : 'views not available'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                  {topPerforming.views.title}
                </h4>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">No {contentSingular.toLowerCase()} found</p>
            )}
          </div>

          {/* Highest Likes */}
          <div
            onClick={() => setSortBy('highest_likes')}
            className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-rose-500 dark:hover:border-rose-500 transition-all cursor-pointer space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2.5 py-1 rounded-lg">
                Highest Likes
              </span>
              <ThumbsUp size={16} className="text-rose-500" />
            </div>
            {topPerforming.likes ? (
              <div className="space-y-2">
                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative">
                  <img src={topPerforming.likes.thumbnail_url} alt={topPerforming.likes.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[10px] px-1.5 py-0.5 rounded">
                    👍 {topPerforming.likes.likes != null ? topPerforming.likes.likes.toLocaleString() : '—'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                  {topPerforming.likes.title}
                </h4>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">No {contentSingular.toLowerCase()} found</p>
            )}
          </div>

          {/* Highest Comments */}
          <div
            onClick={() => setSortBy('highest_comments')}
            className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
                Highest Comments
              </span>
              <MessageSquare size={16} className="text-indigo-500" />
            </div>
            {topPerforming.comments ? (
              <div className="space-y-2">
                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative">
                  <img src={topPerforming.comments.thumbnail_url} alt={topPerforming.comments.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-1 right-1 bg-black/80 text-white font-mono text-[10px] px-1.5 py-0.5 rounded">
                    💬 {topPerforming.comments.comments != null ? topPerforming.comments.comments.toLocaleString() : '—'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                  {topPerforming.comments.title}
                </h4>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">No {contentSingular.toLowerCase()} found</p>
            )}
          </div>

          {/* Highest Engagement Rate */}
          <div
            onClick={() => setSortBy('highest_engagement')}
            className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl hover:border-emerald-500 dark:hover:border-emerald-500 transition-all cursor-pointer space-y-3 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg">
                Highest Engagement Rate
              </span>
              <Layers size={16} className="text-emerald-500" />
            </div>
            {topPerforming.engagement ? (
              <div className="space-y-2">
                <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative">
                  <img src={topPerforming.engagement.thumbnail_url} alt={topPerforming.engagement.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <span className="absolute bottom-1 right-1 bg-emerald-600 text-white font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                    {topPerforming.engagement.engagement_rate != null ? `${topPerforming.engagement.engagement_rate}%` : '—'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                  {topPerforming.engagement.title}
                </h4>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500">No {contentSingular.toLowerCase()} found</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Performance Trend Analysis (Active Channel Only) ─── */}
      <div className="card p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" /> Performance Trend Analysis
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Historical performance trends for <strong className="text-slate-800 dark:text-slate-200">{activeName}</strong>
            </p>
          </div>

          {/* Timeframe Selectors */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {['7d', '30d', '90d', '1y', 'all'].map((tf) => (
              <button
                key={tf}
                onClick={() => setTrendTimeframe(tf)}
                className={`py-1 px-3 text-xs font-bold rounded-lg transition ${
                  trendTimeframe === tf
                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : tf === '90d' ? '90 Days' : tf === '1y' ? '1 Year' : 'All Time'}
              </button>
            ))}
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          {[
            { id: 'views', label: 'Views Over Time', color: '#0284c7' },
            { id: 'likes', label: 'Likes Over Time', color: '#f43f5e' },
            { id: 'comments', label: 'Comments Over Time', color: '#6366f1' },
            { id: 'shares', label: 'Shares Over Time', color: '#a855f7' },
            ...(supportsWatchTime ? [{ id: 'watch_time', label: 'Watch Time Trend', color: '#10b981' }] : []),
            ...(supportsReach ? [{ id: 'reach', label: 'Reach Trend', color: '#06b6d4' }] : []),
            { id: 'engagement_rate', label: 'Engagement Rate Trend', color: '#f59e0b' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTrendMetric(tab.id)}
              className={`py-1.5 px-3 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                activeTrendMetric === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tab.color }} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Interactive Recharts Visualization */}
        {chartTrendPoints.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-2xl">
            No historical trend points available for {activeName} in this timeframe.
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartTrendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={
                      activeTrendMetric === 'views' ? '#0284c7' :
                      activeTrendMetric === 'likes' ? '#f43f5e' :
                      activeTrendMetric === 'comments' ? '#6366f1' :
                      activeTrendMetric === 'shares' ? '#a855f7' :
                      activeTrendMetric === 'watch_time' ? '#10b981' :
                      activeTrendMetric === 'reach' ? '#06b6d4' : '#f59e0b'
                    } stopOpacity={0.4} />
                    <stop offset="95%" stopColor={
                      activeTrendMetric === 'views' ? '#0284c7' :
                      activeTrendMetric === 'likes' ? '#f43f5e' :
                      activeTrendMetric === 'comments' ? '#6366f1' :
                      activeTrendMetric === 'shares' ? '#a855f7' :
                      activeTrendMetric === 'watch_time' ? '#10b981' :
                      activeTrendMetric === 'reach' ? '#06b6d4' : '#f59e0b'
                    } stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl border border-slate-800 space-y-1">
                        <p className="font-bold text-slate-300">{label}</p>
                        <p className="font-mono text-emerald-400">
                          {payload[0].name}: <span className="font-bold text-white">{payload[0].value?.toLocaleString()}</span>
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey={
                    activeTrendMetric === 'watch_time' ? 'watch_time_hours' :
                    activeTrendMetric === 'engagement_rate' ? 'engagement_rate' : activeTrendMetric
                  }
                  name={activeTrendMetric.replace('_', ' ').toUpperCase()}
                  stroke={
                    activeTrendMetric === 'views' ? '#0284c7' :
                    activeTrendMetric === 'likes' ? '#f43f5e' :
                    activeTrendMetric === 'comments' ? '#6366f1' :
                    activeTrendMetric === 'shares' ? '#a855f7' :
                    activeTrendMetric === 'watch_time' ? '#10b981' :
                    activeTrendMetric === 'reach' ? '#06b6d4' : '#f59e0b'
                  }
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Controls, Search & Filter Bar (Active Channel Only) */}
      <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Search Input (Searches within active channel) */}
        <div className="relative flex-1 w-full max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeName} content titles or keywords...`}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs py-2 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters & Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Content Type Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={13} /> Type:
            <select
              value={contentTypeFilter}
              onChange={(e) => { setContentTypeFilter(e.target.value); setCurrentPage(1); }}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="all">All Content Types</option>
              {isInstagram ? (
                <>
                  <option value="post">Posts</option>
                  <option value="reel">Reels</option>
                  <option value="image">Images</option>
                  <option value="video">Videos</option>
                </>
              ) : (
                <>
                  <option value="video">Videos</option>
                  <option value="short">Shorts</option>
                </>
              )}
            </select>
          </div>

          {/* Date Range Filter */}
          <select
            value={dateRangeFilter}
            onChange={(e) => { setDateRangeFilter(e.target.value); setCurrentPage(1); }}
            className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last 1 Year</option>
          </select>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ArrowUpDown size={13} /> Sort:
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest_views">Highest Views</option>
              <option value="highest_likes">Highest Likes</option>
              <option value="highest_comments">Highest Comments</option>
              <option value="highest_engagement">Highest Engagement</option>
            </select>
          </div>

          {/* Export Dropdown Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="btn-secondary py-1.5 px-3 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center gap-1.5"
            >
              <Download size={13} /> CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="btn-secondary py-1.5 px-3 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center gap-1.5"
            >
              <FileSpreadsheet size={13} /> Excel
            </button>
            <button
              onClick={handleExportPDF}
              className="btn-secondary py-1.5 px-3 text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center gap-1.5"
            >
              <FileText size={13} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Table Header & Compare Action ───────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Content Performance Dashboard</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredContent.length} {filteredContent.length === 1 ? contentSingular.toLowerCase() : contentLabel.toLowerCase()} for {activeChannel.name || activeName}
          </span>
        </div>

        {selectedForCompare.length > 0 && (
          <button
            onClick={() => setShowCompareModal(true)}
            className="btn-primary py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 animate-bounce-subtle"
          >
            <Layers size={14} /> Compare Selected ({selectedForCompare.length})
          </button>
        )}
      </div>

      {/* ── 12-Column Active Channel Table ───────────────────── */}
      <div className="card bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                <th className="p-3 w-10 text-center">Select</th>
                <th className="p-3">Thumbnail</th>
                <th className="p-3 min-w-[220px]">Content Title</th>
                <th className="p-3">Platform</th>
                <th className="p-3">Publish Date</th>
                <th className="p-3 text-right">Views</th>
                <th className="p-3 text-right">Likes</th>
                <th className="p-3 text-right">Comments</th>
                <th className="p-3 text-right">Shares</th>
                <th className="p-3 text-center">Saves</th>
                {supportsWatchTime && <th className="p-3 text-right">Watch Time</th>}
                {supportsReach && <th className="p-3 text-center">Reach</th>}
                <th className="p-3 text-right">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedContent.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-12 text-center text-slate-400 dark:text-slate-500">
                    No {contentLabel.toLowerCase()} matched your search criteria for {activeChannel.name || activeName}.
                  </td>
                </tr>
              ) : (
                paginatedContent.map((item) => {
                  const isSelected = selectedForCompare.includes(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                        isSelected ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleSelectForCompare(item.id)}
                          className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          {isSelected ? (
                            <CheckSquare size={16} className="text-indigo-600 dark:text-indigo-400" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>

                      <td className="p-3">
                        <div className="w-14 h-9 bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                          <img
                            src={item.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>

                      <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-[280px]">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-red-600 line-clamp-2 flex items-center gap-1.5 group"
                        >
                          {item.title}
                          <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition shrink-0 text-red-600" />
                        </a>
                      </td>

                      <td className="p-3">
                        <span className={`capitalize px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                          isYouTube
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border-red-200 dark:border-red-800'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        }`}>
                          {platformLabel}
                        </span>
                      </td>

                      <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {item.published_at
                          ? new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {item.views !== null && item.views !== undefined ? item.views.toLocaleString() : '—'}
                      </td>

                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {item.likes?.toLocaleString() ?? 0}
                      </td>

                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {item.comments?.toLocaleString() ?? 0}
                      </td>

                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {item.shares !== null && item.shares !== undefined ? item.shares.toLocaleString() : '—'}
                      </td>

                      <td className="p-3 text-center">
                        {Number(item.saves) >= 0 && item.saves !== null && item.saves !== undefined ? (
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {Number(item.saves).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 italic bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            —
                          </span>
                        )}
                      </td>

                      {supportsWatchTime && (
                        <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">
                          {((item.watch_time_minutes || 0) / 60).toFixed(1)} hrs
                        </td>
                      )}

                      {supportsReach && (
                        <td className="p-3 text-center font-mono text-slate-700 dark:text-slate-300">
                          {item.reach !== null && item.reach !== undefined ? item.reach.toLocaleString() : '—'}
                        </td>
                      )}

                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {item.engagement_rate !== null ? `${item.engagement_rate}%` : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <strong className="text-slate-900 dark:text-white">{filteredContent.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> to{' '}
            <strong className="text-slate-900 dark:text-white">{Math.min(currentPage * pageSize, filteredContent.length)}</strong> of{' '}
            <strong className="text-slate-900 dark:text-white">{filteredContent.length}</strong> {contentLabel.toLowerCase()}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-medium text-slate-900 dark:text-white px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Side-by-Side Content Comparison Modal ───────────── */}
      {showCompareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-5xl w-full p-6 space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-indigo-600 dark:text-indigo-400" /> Side-by-Side Content Comparison ({activeName})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Comparing performance metrics across {selectedCompareItems.length} selected {contentSingular.toLowerCase()}{selectedCompareItems.length === 1 ? '' : 's'} from {activeChannel.name || activeName}.
                </p>
              </div>
              <button onClick={() => setShowCompareModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* Comparison Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <th className="p-3 font-bold text-slate-500 dark:text-slate-400 min-w-[140px]">Metric</th>
                    {selectedCompareItems.map((item) => (
                      <th key={item.id} className="p-3 min-w-[180px]">
                        <div className="space-y-2">
                          <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                            <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                          <p className="font-bold text-slate-900 dark:text-white line-clamp-2">{item.title}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Views */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Views</td>
                    {selectedCompareItems.map(i => {
                      const hasV = i.views !== null && i.views !== undefined;
                      const isHighest = hasV && i.views === highestComparisonValues.views && i.views > 0;
                      return (
                        <td key={i.id} className={`p-3 font-mono font-bold ${isHighest ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-900 dark:text-white'}`}>
                          {hasV ? <>{i.views.toLocaleString()} {isHighest && <span className="text-[10px] ml-1 bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">Highest</span>}</> : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Likes */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Likes</td>
                    {selectedCompareItems.map(i => {
                      const isHighest = i.likes === highestComparisonValues.likes && i.likes > 0;
                      return (
                        <td key={i.id} className={`p-3 font-mono font-bold ${isHighest ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-900 dark:text-white'}`}>
                          {i.likes?.toLocaleString()} {isHighest && <span className="text-[10px] ml-1 bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">Highest</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Comments */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Comments</td>
                    {selectedCompareItems.map(i => {
                      const isHighest = i.comments === highestComparisonValues.comments && i.comments > 0;
                      return (
                        <td key={i.id} className={`p-3 font-mono font-bold ${isHighest ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-900 dark:text-white'}`}>
                          {i.comments?.toLocaleString()} {isHighest && <span className="text-[10px] ml-1 bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">Highest</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Shares */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Shares</td>
                    {selectedCompareItems.map(i => {
                      const hasS = i.shares !== null && i.shares !== undefined;
                      const isHighest = hasS && i.shares === highestComparisonValues.shares && i.shares > 0;
                      return (
                        <td key={i.id} className={`p-3 font-mono font-bold ${isHighest ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-900 dark:text-white'}`}>
                          {hasS ? <>{i.shares.toLocaleString()} {isHighest && <span className="text-[10px] ml-1 bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">Highest</span>}</> : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Saves */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Saves</td>
                    {selectedCompareItems.map(i => {
                      const val = Number(i.saves);
                      const hasSaves = val >= 0 && i.saves !== null && i.saves !== undefined;
                      const isHighest = hasSaves && val === highestComparisonValues.saves && val > 0;
                      return (
                        <td key={i.id} className={`p-3 font-mono ${hasSaves ? (isHighest ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-900 dark:text-white') : 'text-slate-400 italic'}`}>
                          {hasSaves ? <>{val.toLocaleString()}{isHighest && <span className="text-[10px] ml-1 bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">Highest</span>}</> : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Watch Time */}
                  {supportsWatchTime && (
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Watch Time (hrs)</td>
                    {selectedCompareItems.map(i => {
                      const isHighest = i.watch_time_minutes === highestComparisonValues.watch_time && i.watch_time_minutes > 0;
                      return (
                        <td key={i.id} className={`p-3 font-mono font-bold ${isHighest ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-900 dark:text-white'}`}>
                          {((i.watch_time_minutes || 0) / 60).toFixed(1)} hrs {isHighest && <span className="text-[10px] ml-1 bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">Highest</span>}
                        </td>
                      );
                    })}
                  </tr>
                  )}

                  {/* Reach */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Reach</td>
                    {selectedCompareItems.map(i => {
                      const hasR = i.reach !== null && i.reach !== undefined && i.reach > 0;
                      const isHighest = hasR && i.reach === highestComparisonValues.reach;
                      return (
                        <td key={i.id} className={`p-3 font-mono ${hasR ? (isHighest ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-900 dark:text-white') : 'text-slate-400 italic'}`}>
                          {hasR ? <>{i.reach.toLocaleString()}{isHighest && <span className="text-[10px] ml-1 bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">Highest</span>}</> : '—'}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Engagement Rate */}
                  <tr>
                    <td className="p-3 font-bold text-slate-700 dark:text-slate-300">Engagement Rate (%)</td>
                    {selectedCompareItems.map(i => {
                      const isHighest = i.engagement_rate === highestComparisonValues.engagement_rate && i.engagement_rate > 0;
                      return (
                        <td key={i.id} className={`p-3 font-mono font-bold ${isHighest ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30' : 'text-slate-900 dark:text-white'}`}>
                          {i.engagement_rate}% {isHighest && <span className="text-[10px] ml-1 bg-emerald-600 text-white px-1.5 py-0.2 rounded font-bold">Highest</span>}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedForCompare([])}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-semibold"
              >
                Clear Selections
              </button>
              <button
                onClick={() => setShowCompareModal(false)}
                className="py-2 px-5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
