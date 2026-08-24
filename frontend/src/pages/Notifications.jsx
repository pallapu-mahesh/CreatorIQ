import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { useLegacyActive } from '../lib/platformAdapter';
import { computeReportMetrics, buildPerformanceAlerts, buildRevenueNotifications } from '../lib/reportData';
import {
  Bell,
  CheckCheck,
  Mail,
  MailOpen,
  Clock,
  ChevronRight,
  Sparkles,
  Play,
} from 'lucide-react';

// Badge styles per notification type.
const NOTIF_STYLE = {
  report: 'bg-blue-100 text-blue-700',
  followers: 'bg-violet-100 text-violet-700',
  engagement: 'bg-emerald-100 text-emerald-700',
  revenue: 'bg-amber-100 text-amber-700',
  sponsorship: 'bg-indigo-100 text-indigo-700',
  affiliate: 'bg-purple-100 text-purple-700',
  milestone: 'bg-rose-100 text-rose-700',
  growth: 'bg-teal-100 text-teal-700',
  views: 'bg-sky-100 text-sky-700',
  content: 'bg-orange-100 text-orange-700',
  schedule: 'bg-slate-100 text-slate-700',
  info: 'bg-blue-100 text-blue-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

/**
 * The single, centralized location where ALL notifications are displayed.
 *
 * Performance alerts and revenue notifications are derived from the active
 * platform dataset and seeded into the centralized notification store
 * (NotificationContext) here — nowhere else renders them.
 */
export default function Notifications() {
  const {
    notifications, unreadCount, addNotifications, markRead, markUnread, markAllRead, clearNotifications,
  } = useNotifications();
  const { activeChannel, videos, audience, hasActiveChannel, activePlatform, loading } = useLegacyActive();

  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'read'

  // Derive platform performance alerts + revenue notifications and seed them
  // into the centralized store once per active platform (deduped by id).
  const metrics = useMemo(
    () => (hasActiveChannel ? computeReportMetrics(activeChannel, videos, audience) : null),
    [hasActiveChannel, activeChannel, videos, audience],
  );

  const derivedSeed = useMemo(() => {
    if (!metrics || !activePlatform) return [];
    const now = new Date().toISOString();
    return [
      ...buildPerformanceAlerts(metrics, activeChannel).map((a) => ({
        id: `alert-${activePlatform}-${a.type}`,
        title: a.title,
        type: a.type,
        datetime: now,
        read: false,
        details: a.details,
      })),
      ...buildRevenueNotifications(metrics).map((r) => ({
        id: `rev-${activePlatform}-${r.type}`,
        title: r.title,
        type: r.type,
        datetime: now,
        read: false,
        details: r.details,
      })),
    ];
  }, [metrics, activePlatform, activeChannel]);

  useEffect(() => {
    if (derivedSeed.length > 0) addNotifications(derivedSeed);
  }, [derivedSeed, addNotifications]);

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
            {unreadCount > 0 && (
              <span className="badge bg-red-600 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </div>
          <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400 mt-1">
            All performance alerts, revenue notifications and system events in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCheck size={14} /> Mark all as read
          </button>
          <Link
            to="/dashboard/social"
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <span>Switch Active Account</span> <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Platform context note */}
      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
        <Bell size={13} className="text-brand-600 shrink-0" />
        <span>
          {hasActiveChannel ? (
            <>
              Alerts and revenue notifications are derived from the active platform dataset:{' '}
              <strong className="text-slate-700 dark:text-slate-200">{activeChannel.title}</strong> ({activePlatform}). Report generation
              events are also routed here from the Reports page.
            </>
          ) : (
            'Connect an active social media account to see derived performance and revenue notifications.'
          )}
        </span>
      </div>

      {/* Filter + clear */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
          {[
            { id: 'all', label: `All (${notifications.length})` },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'read', label: 'Read' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                filter === f.id ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={clearNotifications}
          className="text-[11px] font-bold text-red-500 hover:text-red-600 transition text-left"
        >
          Clear all notifications
        </button>
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="card p-14 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl text-center">
          <Bell size={30} className="text-slate-300 dark:text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filter !== 'all' ? `No ${filter} notifications.` : "You're all caught up!"}
          </p>
          {!hasActiveChannel && (
            <div className="pt-4 flex justify-center">
              <Link
                to="/dashboard/social"
                className="btn-primary py-2.5 px-6 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2"
              >
                <Sparkles size={14} /> Go to Social Accounts <Play size={13} className="fill-current" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="card bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800">
          {filtered.map((n) => (
            <div key={n.id} className={`px-5 py-4 flex items-start gap-3 transition ${n.read ? 'opacity-70' : 'bg-indigo-50/30'}`}>
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${n.read ? 'bg-slate-300' : 'bg-indigo-500 animate-pulse'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{n.title}</p>
                  <span className={`badge text-[9px] font-bold px-2 py-0.5 rounded-full ${NOTIF_STYLE[n.type] || NOTIF_STYLE.info}`}>
                    {n.type}
                  </span>
                  <span className={`badge text-[9px] font-semibold px-2 py-0.5 rounded-full ${n.read ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-indigo-100 text-indigo-700'}`}>
                    {n.read ? 'Read' : 'Unread'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{n.details}</p>
                {n.emailStatus && (
                  <p className="text-[10px] mt-1.5 flex items-center gap-1 font-semibold">
                    {n.emailStatus === 'sent' ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <MailOpen size={11} /> Emailed to {n.emailRecipient || 'your email'}
                      </span>
                    ) : n.emailStatus === 'unavailable' ? (
                      <span className="text-amber-600 flex items-center gap-1">
                        <Mail size={11} /> Email delivery unavailable
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1">
                        <Mail size={11} /> Email delivery failed
                      </span>
                    )}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 flex items-center gap-1">
                  <Clock size={10} /> {fmtDateTime(n.datetime)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => markRead(n.id)}
                  disabled={n.read}
                  title="Mark as read"
                  className={`p-2 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${n.read ? 'text-slate-200 cursor-default' : 'text-emerald-600 hover:bg-emerald-50'}`}
                >
                  <MailOpen size={14} />
                </button>
                <button
                  onClick={() => markUnread(n.id)}
                  disabled={!n.read}
                  title="Mark as unread"
                  className={`p-2 rounded-lg text-[10px] font-bold transition flex items-center gap-1 ${!n.read ? 'text-slate-200 cursor-default' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                >
                  <Mail size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
        {filtered.length} shown · {notifications.length} total · {unreadCount} unread
      </p>
    </div>
  );
}
