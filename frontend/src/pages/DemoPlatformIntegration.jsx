import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronRight, ArrowLeft, LogOut, ShieldCheck, CheckCircle2,
  Eye, Heart, MessageCircle, Share2, ExternalLink, Film, Bookmark,
} from 'lucide-react';
import { useActivePlatform } from '../context/ActivePlatformContext';
import { useConnectionGuard } from '../components/ConnectionGuard';
import PlatformBrandIcon, { PLATFORM_BRAND } from '../components/PlatformBrandIcon';

const PLATFORM_DISPLAY = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  twitter: 'X (Twitter)',
};

const formatCount = (n) => {
  if (n === null || n === undefined || n === '') return '—';
  if (typeof n !== 'number') return n;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 10000) return `${(n / 1000).toFixed(0)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
};

const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDuration = (seconds) => {
  if (seconds === null || seconds === undefined) return '';
  if (seconds < 60) return 'Short';
  return `${Math.floor(seconds / 60)}m`;
};

export default function DemoPlatformIntegration({ platformId }) {
  const {
    activePlatform,
    platformMeta,
    activeAccount,
    contentItems,
    hasActivePlatform,
    switchPlatform,
    clearActivePlatform,
  } = useActivePlatform();
  const { guardedConnect } = useConnectionGuard();

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const isActive = hasActivePlatform && activePlatform === platformId;
  const displayName = platformMeta?.displayName || PLATFORM_DISPLAY[platformId] || 'Account';
  const meta = platformMeta || {};
  const account = isActive ? activeAccount : null;
  const content = isActive ? contentItems : [];

  const handleConnect = () => {
    guardedConnect(platformId, () => {
      switchPlatform(platformId);
      setSuccessMsg(`Successfully connected your ${displayName} account!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    });
  };

  const handleDisconnect = async () => {
    try {
      setSubmitting(true);
      clearActivePlatform();
      setSuccessMsg(`Successfully disconnected your ${displayName} account.`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [];
  if (account?.followersCount != null) {
    stats.push({ label: meta.followerLabel || 'Followers', value: account.followersCount });
  }
  if (account?.followingCount != null) {
    stats.push({ label: 'Following', value: account.followingCount });
  }
  if (account?.contentCount != null) {
    stats.push({ label: meta.contentLabel || 'Content', value: account.contentCount });
  }
  if (account?.totalViews != null) {
    stats.push({ label: 'Total Views', value: account.totalViews });
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <Link to="/dashboard" className="hover:text-slate-900 dark:hover:text-slate-100 transition">Dashboard</Link>
        <ChevronRight size={13} className="text-slate-400 dark:text-slate-500" />
        <Link to="/dashboard/social" className="hover:text-slate-900 dark:hover:text-slate-100 transition">Social Accounts</Link>
        <ChevronRight size={13} className="text-slate-400 dark:text-slate-500" />
        <span className="text-slate-900 dark:text-slate-100 font-semibold">{displayName}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/social"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-300 transition"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{displayName} Connection</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage your {displayName} connection</p>
          </div>
        </div>

        {account ? (
          <span className="badge badge-green gap-1.5 self-start md:self-auto px-3 py-1.5 text-xs font-semibold">
            <CheckCircle2 size={14} className="text-emerald-600" />
            Connected
          </span>
        ) : (
          <span className="badge badge-slate gap-1.5 self-start md:self-auto px-3 py-1.5 text-xs font-semibold">
            <ShieldCheck size={14} /> Not Connected
          </span>
        )}
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 size={16} className="text-emerald-600" />
          {successMsg}
        </div>
      )}

      {account ? (
        <div className="space-y-6">
          {/* Connected Profile Card */}
          <div className="card bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {account.avatarUrl ? (
                <img
                  src={account.avatarUrl}
                  alt={account.name}
                  className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-700 object-cover shadow-sm shrink-0"
                />
              ) : (
                <div className={`w-16 h-16 rounded-full ${PLATFORM_BRAND[platformId]?.bg || 'bg-slate-900'} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                  <PlatformBrandIcon platformId={platformId} className="w-8 h-8" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{account.name}</h2>
                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                </div>
                {account.handle && (
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">{account.handle}</p>
                )}
                {account.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl leading-relaxed">{account.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {account.accountType && (
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {account.accountType}
                    </span>
                  )}
                  {account.country && (
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      {account.country}
                    </span>
                  )}
                  {account.externalUrl && (
                    <a
                      href={account.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-800 transition"
                    >
                      <ExternalLink size={11} /> View on {displayName}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handleDisconnect}
              disabled={submitting}
              className="py-2.5 px-4 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 shadow-xs transition flex items-center gap-2 self-stretch md:self-auto justify-center"
            >
              <LogOut size={14} /> Disconnect
            </button>
          </div>

          {/* Stats Grid */}
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${stats.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
            {stats.map((stat) => (
              <div key={stat.label} className="card bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-5 shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</span>
                <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">{formatCount(stat.value)}</p>
              </div>
            ))}
          </div>

          {/* Content List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Film size={16} /> Recent {meta.contentLabel || 'Content'}
            </h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {content.map((item) => {
                const m = item.metrics || {};
                return (
                  <div key={item.id} className="card bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl overflow-hidden shadow-xs flex flex-col">
                    <div className="aspect-video relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-400">
                          <Film size={32} />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 bg-slate-900/85 text-white text-[10px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider flex items-center gap-1 shadow">
                        {item.type || 'Post'}
                      </div>
                      {formatDuration(m.duration) && (
                        <span className="absolute bottom-2 right-2 bg-slate-900/85 text-[10px] text-white px-1.5 py-0.5 rounded font-mono font-bold">
                          {formatDuration(m.duration)}
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">{item.title}</h4>
                        {item.publishedAt && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-1">{formatDate(item.publishedAt)}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        <div className="flex items-center gap-3">
                          {m.views != null && (
                            <span className="flex items-center gap-1">
                              <Eye size={12} /> {formatCount(m.views)}
                            </span>
                          )}
                          {m.likes != null && (
                            <span className="flex items-center gap-1">
                              <Heart size={12} /> {formatCount(m.likes)}
                            </span>
                          )}
                          {m.comments != null && (
                            <span className="flex items-center gap-1">
                              <MessageCircle size={12} /> {formatCount(m.comments)}
                            </span>
                          )}
                          {m.shares != null && (
                            <span className="flex items-center gap-1">
                              <Share2 size={12} /> {formatCount(m.shares)}
                            </span>
                          )}
                          {m.saves != null && (
                            <span className="flex items-center gap-1">
                              <Bookmark size={12} /> {formatCount(m.saves)}
                            </span>
                          )}
                        </div>
                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition shrink-0"
                            title={`View on ${displayName}`}
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-700 rounded-2xl p-12 text-center max-w-2xl mx-auto shadow-sm space-y-6">
          <div className={`w-16 h-16 rounded-2xl ${PLATFORM_BRAND[platformId]?.bg || 'bg-slate-900'} text-white flex items-center justify-center mx-auto shadow-sm`}>
            <PlatformBrandIcon platformId={platformId} className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Connect {displayName}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Connect your {displayName} account to view your analytics.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={handleConnect}
              disabled={submitting}
              className={`px-6 py-3 ${meta.accentBg || 'bg-slate-900'} hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 mx-auto disabled:opacity-50`}
            >
              Connect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
