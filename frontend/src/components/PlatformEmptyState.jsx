import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';
import PlatformBrandIcon from './PlatformBrandIcon';

/**
 * PlatformEmptyState — Generic empty state for analytics pages
 * when no social media platform is currently active.
 *
 * Used by: Dashboard, ContentAnalytics, Audience, GrowthTrends, Revenue, Reports.
 * Replaces YouTubeEmptyState usage in shared analytics pages.
 */
export default function PlatformEmptyState({ title, message }) {
  return (
    <div className="card p-10 bg-white border border-slate-200/90 rounded-2xl shadow-sm text-center max-w-2xl mx-auto my-8 animate-fade-in space-y-5 dark:bg-slate-900 dark:border-slate-700">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto shadow-xs border border-brand-100 dark:bg-brand-900/40 dark:text-brand-300 dark:border-brand-800">
        <PlatformBrandIcon platformId="youtube" className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {title || 'No active platform connected'}
        </h3>

        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed dark:text-slate-400">
          {message || 'Connect a social media platform to view analytics. Your dashboard, content, audience, growth, revenue, and reports will automatically populate with live data.'}
        </p>
      </div>

      {/* Available platforms hint */}
      <div className="flex items-center justify-center gap-3 pt-1">
        {[
          { id: 'youtube', name: 'YouTube', bg: 'bg-red-600' },
          { id: 'instagram', name: 'Instagram', bg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600' },
          { id: 'facebook', name: 'Facebook', bg: 'bg-blue-600' },
          { id: 'linkedin', name: 'LinkedIn', bg: 'bg-sky-700' },
          { id: 'twitter', name: 'X', bg: 'bg-slate-900' },
        ].map((p) => (
          <div
            key={p.id}
            title={p.name}
            className={`w-8 h-8 rounded-lg ${p.bg} text-white flex items-center justify-center opacity-30 hover:opacity-80 transition-opacity cursor-default`}
          >
            <PlatformBrandIcon platformId={p.id} className="w-4 h-4" />
          </div>
        ))}
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/dashboard/social"
          className="btn-primary py-2.5 px-5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
        >
          <Sparkles size={14} /> Connect a Platform <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
