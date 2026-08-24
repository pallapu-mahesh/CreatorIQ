import { useNavigate } from 'react-router-dom';
import {
  Share2, CheckCircle2, ArrowRight, ChevronRight
} from 'lucide-react';
import { useActivePlatform } from '../context/ActivePlatformContext';
import { useConnectionGuard } from '../components/ConnectionGuard';
import { demoData } from '../context/demoData';
import { YouTubeIcon, InstagramIcon, FacebookIcon, LinkedInIcon, XIcon } from '../components/PlatformBrandIcon';

export default function SocialAccounts() {
  const navigate = useNavigate();
  const { activePlatform, switchPlatform } = useActivePlatform();
  const { guardedConnect } = useConnectionGuard();

  const platformsRegistry = [
    {
      id: 'youtube',
      name: 'YouTube',
      route: '/dashboard/social/youtube',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-md">
          <YouTubeIcon className="w-6 h-6" />
        </div>
      ),
      description: 'Connect your YouTube channel to view detailed video analysis, subscriber metrics, and content watch time.',
      accentColor: 'border-red-500/20 hover:border-red-500/50',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      route: '/dashboard/social/instagram',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shadow-md">
          <InstagramIcon className="w-6 h-6" />
        </div>
      ),
      description: 'Connect your Instagram account to analyze posts, reels, engagement rates, and demographics.',
      accentColor: 'border-purple-500/20 hover:border-purple-500/50',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      route: '/dashboard/social/facebook',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
          <FacebookIcon className="w-6 h-6" />
        </div>
      ),
      description: 'Connect your Facebook page to view page growth, post metrics, and audience activity.',
      accentColor: 'border-blue-500/20 hover:border-blue-500/50',
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      route: '/dashboard/social/linkedin',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-sky-700 text-white flex items-center justify-center shadow-md">
          <LinkedInIcon className="w-6 h-6" />
        </div>
      ),
      description: 'Connect your LinkedIn account to track connections, article impressions, and professional engagement.',
      accentColor: 'border-sky-500/20 hover:border-sky-500/50',
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      route: '/dashboard/social/twitter',
      icon: (
        <div className="w-11 h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-md">
          <XIcon className="w-5 h-5" />
        </div>
      ),
      description: 'Connect your X (Twitter) account to monitor tweet stats, follower growth, and overall virality metrics.',
      accentColor: 'border-slate-500/20 hover:border-slate-500/50',
    },
  ];

  const platforms = platformsRegistry.map((p) => {
    const isConnected = activePlatform === p.id;
    const details = isConnected ? demoData[p.id]?.account : null;
    return {
      ...p,
      isConnected,
      channelName: details?.name || null,
      channelHandle: details?.handle || null,
      subscribers: details?.followersCount || 0,
      avatar: details?.avatarUrl || null,
      connectedAt: 'Recently',
      badgeText: isConnected ? 'Connected' : 'Available',
      badgeClass: isConnected ? 'badge-green' : 'badge-slate',
    };
  });

  return (
    <div className="space-y-8 pb-10">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <span>Dashboard</span>
        <ChevronRight size={13} className="text-slate-400 dark:text-slate-500" />
        <span className="text-slate-900 dark:text-slate-100 font-semibold">Social Accounts</span>
      </nav>

      {/* Header */}
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center shadow-md">
              <Share2 size={18} />
            </div>
            <h1 className="page-title text-2xl font-bold text-slate-900 dark:text-slate-100">Social Accounts Directory</h1>
          </div>
          <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400">
            Centralized hub for managing your social media platform integrations.
          </p>
        </div>
      </div>

      {/* Platforms Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            onClick={() => navigate(platform.route)}
            className={`card p-6 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-5 group relative ${platform.accentColor}`}
          >
            <div className="space-y-4">
              {/* Header: Icon + Badge */}
              <div className="flex items-center justify-between">
                {platform.icon}
                <span className={`badge ${platform.badgeClass} gap-1 px-2.5 py-1 text-[11px] font-semibold`}>
                  {platform.isConnected && <CheckCircle2 size={12} className="text-emerald-600" />}
                  {platform.badgeText}
                </span>
              </div>

              {/* Title + Description */}
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-brand-600 transition-colors flex items-center gap-1.5">
                  {platform.name}
                  <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity text-brand-600" />
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{platform.description}</p>
              </div>

              {/* Account details if connected */}
              {platform.isConnected && platform.channelName && (
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700 flex items-center gap-3">
                  <img
                    src={platform.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}
                    alt={platform.channelName}
                    className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-600 object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{platform.channelName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {platform.subscribers > 1000 ? `${(platform.subscribers / 1000).toFixed(1)}K followers` : `${platform.subscribers} followers`}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer action button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {platform.isConnected ? 'Connected' : 'Not Connected'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  guardedConnect(platform.id, () => {
                    if (!platform.isConnected) {
                      switchPlatform(platform.id);
                    }
                    navigate(platform.route);
                  });
                }}
                className={`py-2 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  platform.isConnected
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 shadow-xs'
                }`}
              >
                {platform.isConnected ? 'Manage' : 'Connect'}
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
