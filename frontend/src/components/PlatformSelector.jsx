import { useNavigate } from 'react-router-dom';
import { Layers, Globe } from 'lucide-react';
import {
  YouTubeIcon, InstagramIcon, FacebookIcon, LinkedInIcon, XIcon
} from './PlatformBrandIcon';
import { useActivePlatform } from '../context/ActivePlatformContext';

const SUPPORTED_PLATFORMS = [
  { id: 'youtube', name: 'YouTube', color: 'bg-red-600', icon: YouTubeIcon },
  { id: 'instagram', name: 'Instagram', color: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600', icon: InstagramIcon },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-600', icon: FacebookIcon },
  { id: 'linkedin', name: 'LinkedIn', color: 'bg-sky-700', icon: LinkedInIcon },
  { id: 'twitter', name: 'X (Twitter)', color: 'bg-slate-900', icon: XIcon },
];

export default function PlatformSelector({ activePlatform: propActive, onSelectPlatform }) {
  const navigate = useNavigate();
  const context = useActivePlatform();

  const selectedPlatform = propActive || context?.selectedPlatform || context?.activePlatform || 'all';
  const connectedPlatforms = context?.connectedPlatforms || [];
  const selectPlatform = onSelectPlatform || context?.selectPlatform || (() => {});

  const isAllSelected = selectedPlatform === 'all';

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {/* ── All Platforms Button ────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => selectPlatform('all')}
        title="View unified analytics across all connected platforms"
        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
          isAllSelected
            ? 'bg-slate-900 text-white shadow-sm ring-2 ring-indigo-500/40 dark:bg-indigo-600'
            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-750'
        }`}
      >
        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
          isAllSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
        }`}>
          <Layers size={12} />
        </span>
        <span>All Platforms</span>
        {connectedPlatforms.length > 0 && (
          <span className={`px-1.5 py-0.5 text-[10px] font-extrabold rounded-full ${
            isAllSelected
              ? 'bg-white/20 text-white'
              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
          }`}>
            {connectedPlatforms.length}
          </span>
        )}
      </button>

      {/* ── Individual Platform Buttons ─────────────────────────────────── */}
      {SUPPORTED_PLATFORMS.map((p) => {
        const isConnected = connectedPlatforms.includes(p.id);
        const isActive = selectedPlatform === p.id;

        return (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (isConnected) {
                selectPlatform(p.id);
              } else {
                navigate(`/dashboard/social/${p.id}`);
              }
            }}
            title={
              isActive
                ? `${p.name} is currently selected`
                : isConnected
                  ? `Filter to ${p.name} data`
                  : `${p.name} is not connected. Click to connect.`
            }
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              isActive
                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-indigo-500/40 dark:bg-slate-700'
                : isConnected
                  ? 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-750'
                  : 'bg-white/60 text-slate-400 border border-slate-200/80 hover:border-slate-300 opacity-60 dark:bg-slate-900/40 dark:text-slate-500 dark:border-slate-800'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 ${p.color}`}>
              <p.icon className="w-3 h-3" />
            </span>
            <span>{p.name}</span>

            {isConnected ? (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                {isActive ? (
                  <span className="text-[10px] text-emerald-300 font-bold uppercase">Active</span>
                ) : (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Connected</span>
                )}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-normal">Connect</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

