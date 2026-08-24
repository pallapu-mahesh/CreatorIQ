import {
  YouTubeIcon, InstagramIcon, FacebookIcon, LinkedInIcon, XIcon
} from './PlatformBrandIcon';

const SUPPORTED_PLATFORMS = [
  { id: 'youtube', name: 'YouTube', color: 'bg-red-600', icon: YouTubeIcon },
  { id: 'instagram', name: 'Instagram', color: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600', icon: InstagramIcon },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-600', icon: FacebookIcon },
  { id: 'linkedin', name: 'LinkedIn', color: 'bg-sky-700', icon: LinkedInIcon },
  { id: 'twitter', name: 'X (Twitter)', color: 'bg-slate-900', icon: XIcon },
];

export default function PlatformSelector({ activePlatform }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      {SUPPORTED_PLATFORMS.map((p) => {
        const isActive = activePlatform === p.id;
        return (
          <button
            key={p.id}
            type="button"
            disabled={!isActive}
            title={isActive
              ? `${p.name} is the connected platform`
              : `${p.name} is not connected. Connect it from Social Accounts to report on its data.`}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              isActive
                ? 'bg-slate-900 text-white shadow-sm dark:bg-slate-700'
                : 'bg-white text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-600'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0 ${p.color}`}>
              <p.icon className="w-3 h-3" />
            </span>
            <span>{p.name}</span>
            {isActive && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-emerald-300 font-bold uppercase">Active</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
