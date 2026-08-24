import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { useYouTube } from '../context/YouTubeContext';
import { YouTubeIcon } from './PlatformBrandIcon';

export default function YouTubeEmptyState({ title, message, isNoChannelFound }) {
  let contextNoChannelFound = false;
  try {
    const yt = useYouTube();
    contextNoChannelFound = yt.noChannelFound;
  } catch {
    // context optional
  }

  const showNoChannelFound = isNoChannelFound ?? contextNoChannelFound;

  if (showNoChannelFound) {
    const displayTitle =
      !title || title.includes('No active') || title.includes('No YouTube')
        ? 'Google account connected successfully.'
        : title;

    const displayMessage =
      !message || message.includes('Connect your own')
        ? "No YouTube channel was found for this Google account. Please create a YouTube channel or use 'Analyze Public YouTube Channel' to analyze any public channel."
        : message;

    return (
      <div className="card p-10 bg-white border border-slate-200/90 rounded-2xl shadow-sm text-center max-w-2xl mx-auto my-8 animate-fade-in space-y-4 dark:bg-slate-900 dark:border-slate-700">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs border border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800">
          <CheckCircle2 size={32} className="text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{displayTitle}</h3>

          <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed dark:text-slate-300">
            {displayMessage}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/dashboard/social/youtube"
            className="btn-primary py-2.5 px-5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <Sparkles size={14} /> Analyze Public YouTube Channel <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-10 bg-white border border-slate-200/90 rounded-2xl shadow-sm text-center max-w-2xl mx-auto my-8 animate-fade-in space-y-4 dark:bg-slate-900 dark:border-slate-700">
      <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-xs border border-red-100 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800">
        <YouTubeIcon className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {title || "No YouTube channel connected."}
        </h3>

        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed dark:text-slate-400">
          {message || "Connect your own YouTube account or analyze a public channel to view analytics."}
        </p>
      </div>

      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/dashboard/social/youtube"
          className="btn-primary py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
        >
          <Sparkles size={14} /> Connect or Analyze YouTube Channel <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
