import { BadgeCheck, ExternalLink, LogOut, RefreshCw } from 'lucide-react';

/**
 * A single, reusable "Connected Platform" card used by the YouTube, Instagram,
 * and Facebook integration pages. It renders the connected account's banner,
 * avatar, name, verified badge, category, description, website, metrics, and
 * optional Sync Data / Disconnect action buttons below the card.
 *
 * Only the platform-specific colors/icons are passed in as props.
 */
export default function ConnectedPlatformCard({
  // Identity
  name = '',
  username = '',
  verified = false,
  verifiedColor = 'text-sky-500',
  category = '',
  categoryIcon = null,
  description = '',
  website = '',
  websiteClass = 'text-blue-600 hover:text-blue-800',
  pageLink = '',
  pageLinkLabel = 'Facebook Page URL',
  avatarUrl = '',
  coverUrl = '',
  fallbackBanner = 'bg-slate-900',
  fallbackAvatar = null,
  metaLine = '',
  accountType = '',
  accountTypeClass = 'bg-slate-900',
  handleBadge = '',
  handleBadgeClass = 'badge badge-green',
  externalHref = '',
  externalLabel = 'View on Platform',

  // Metrics
  metrics = [],
  metricGridClass = 'grid-cols-2 sm:grid-cols-4',

  // Actions
  onSync,
  onDisconnect,
  syncing = false,
  loading = false,
  syncLabel = 'Sync Data',
  disconnectLabel = 'Disconnect',

  // Extra content rendered above the action buttons (e.g. recent videos grid)
  children,
}) {
  return (
    <div className="card bg-white border border-slate-200/90 rounded-2xl shadow-sm overflow-hidden animate-fade-in dark:bg-slate-900 dark:border-slate-700">
      {/* Banner / Cover Image */}
      {coverUrl ? (
        <div className="h-28 sm:h-36 w-full bg-slate-900 relative overflow-hidden">
          <img src={coverUrl} alt={`${name} cover`} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`h-28 w-full ${fallbackBanner}`} />
      )}

      {/* Profile Header */}
      <div className="p-6 relative pt-0">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 sm:-mt-12 mb-6">
          <div className="flex items-end gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-md bg-white object-cover shrink-0 dark:border-slate-900 dark:bg-slate-900"
              />
            ) : (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-white shadow-md bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 dark:border-slate-900 dark:bg-slate-700 dark:text-slate-400">
                {fallbackAvatar}
              </div>
            )}
            <div className="space-y-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{name}</h2>
                {verified && (
                  <BadgeCheck size={18} className={`shrink-0 ${verifiedColor}`} aria-label="Verified" />
                )}
                {category && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold uppercase tracking-wider dark:bg-slate-800 dark:text-slate-300">
                    {categoryIcon}
                    {category}
                  </span>
                )}
                {accountType && (
                  <span className={`px-2 py-0.5 text-white rounded-full text-[10px] font-extrabold uppercase tracking-wider ${accountTypeClass}`}>
                    {accountType}
                  </span>
                )}
                {handleBadge && (
                  <span className={`${handleBadgeClass} font-mono text-[10px]`}>{handleBadge}</span>
                )}
              </div>
              {username && <p className="text-xs text-slate-500 dark:text-slate-400">{username}</p>}
              {metaLine && <p className="text-[11px] text-slate-400 font-mono dark:text-slate-500">{metaLine}</p>}
              {description && <p className="text-xs text-slate-500 line-clamp-2 max-w-xl dark:text-slate-400">{description}</p>}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-1 text-xs font-medium transition ${websiteClass}`}
                >
                  <ExternalLink size={12} /> {website}
                </a>
              )}
              {pageLink && (
                <a
                  href={pageLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 font-medium transition dark:text-slate-500"
                >
                  <ExternalLink size={12} /> {pageLinkLabel}
                </a>
              )}
            </div>
          </div>

          {externalHref && (
            <a
              href={externalHref}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost text-xs border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 self-start sm:self-auto text-slate-700 transition dark:border-slate-600 dark:text-slate-200"
            >
              {externalLabel} <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Metrics KPI Cards — real values only; omit entries when the API does not provide them */}
        {metrics.length > 0 && (
          <div className={`grid gap-4 mb-6 ${metricGridClass}`}>
            {metrics.map((metric) => (
              <div key={metric.label} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1 dark:bg-slate-800 dark:border-slate-700">
                <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 dark:text-slate-500">
                  {metric.icon} {metric.label}
                </span>
                <p className="text-base sm:text-xl font-extrabold text-slate-900 leading-tight dark:text-slate-100">{metric.value}</p>
              </div>
            ))}
          </div>
        )}

        {children}

        {/* Sync / Disconnect buttons below the card */}
        {(onSync || onDisconnect) && (
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 dark:border-slate-700">
            {onSync && (
              <button
                type="button"
                onClick={onSync}
                disabled={loading || syncing}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                <RefreshCw size={13} className={loading || syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : syncLabel}
              </button>
            )}
            {onDisconnect && (
              <button
                type="button"
                onClick={onDisconnect}
                disabled={loading || syncing}
                className="flex-1 py-2.5 px-4 bg-white border border-rose-200 text-rose-600 text-xs font-semibold rounded-xl hover:bg-rose-50 transition flex items-center justify-center gap-1.5 disabled:opacity-50 dark:bg-slate-800 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/50"
              >
                <LogOut size={14} /> {disconnectLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}