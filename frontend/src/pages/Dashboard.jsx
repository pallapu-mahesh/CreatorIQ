import { useAuth } from '../context/AuthContext';
import { useActivePlatform } from '../context/ActivePlatformContext';
import PlatformSelector from '../components/PlatformSelector';
import PlatformEmptyState from '../components/PlatformEmptyState';
import {
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Users, Eye, TrendingUp, DollarSign,
  Heart, Clock, CheckCircle2, Play, Image, UserPlus
} from 'lucide-react';

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md px-3 py-2 text-xs">
      <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{typeof p.value === 'number' && p.value > 1000 ? `${(p.value / 1000).toFixed(1)}K` : p.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const {
    activeAccount,
    contentItems,
    hasActivePlatform,
    loading,
    platformMeta,
    activePlatform,
  } = useActivePlatform();

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading active platform analytics context...</p>
      </div>
    );
  }

  if (!hasActivePlatform || !activeAccount) {
    return (
      <div className="space-y-6">
        <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="page-title text-2xl font-bold text-slate-900 dark:text-slate-100">
              Welcome back, {user?.full_name?.split(' ')[0] ?? 'Creator'} 👋
            </h1>
            <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400">
              Connect a platform to view live analytics & overview
            </p>
          </div>
        </div>

        <PlatformEmptyState title="No active platform connected" />
      </div>
    );
  }

  // ─── Derive metrics from normalized activeAccount ───────────
  const followers = activeAccount.followersCount || 0;
  const totalViews = activeAccount.totalViews || 0;
  const contentCount = activeAccount.contentCount || 0;
  const following = activeAccount.followingCount;

  // Calculate engagement from recent content items
  let avgLikes = 0;
  let avgComments = 0;
  if (contentItems.length > 0) {
    const totalLikes = contentItems.reduce((acc, v) => acc + (v.metrics.likes || 0), 0);
    const totalComments = contentItems.reduce((acc, v) => acc + (v.metrics.comments || 0), 0);
    avgLikes = Math.round(totalLikes / contentItems.length);
    avgComments = Math.round(totalComments / contentItems.length);
  }

  const estWatchTimeHours = totalViews > 0 ? Math.round(totalViews * 0.04) : 0;
  const estRevenue = totalViews > 0 ? Math.round((totalViews / 1000) * 3.5) : Math.round(followers * 0.02);

  // Platform-adaptive KPI cards
  const kpiCards = [
    {
      id: 'kpi-followers',
      label: platformMeta?.followerLabel || 'Followers',
      value: followers > 1000000 ? `${(followers / 1000000).toFixed(2)}M` : followers > 1000 ? `${(followers / 1000).toFixed(1)}K` : followers.toString(),
      change: '+12.4%',
      positive: true,
      icon: Users,
      color: platformMeta?.accentText || 'text-red-600',
      bg: platformMeta?.accentLight || 'bg-red-50',
    },
    ...(totalViews > 0 ? [{
      id: 'kpi-views',
      label: 'Total Views',
      value: totalViews > 1000000 ? `${(totalViews / 1000000).toFixed(1)}M` : `${(totalViews / 1000).toFixed(1)}K`,
      change: '+15.8%',
      positive: true,
      icon: Eye,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
    }] : []),
    ...(following !== null && following !== undefined ? [{
      id: 'kpi-following',
      label: 'Following',
      value: following > 1000 ? `${(following / 1000).toFixed(1)}K` : following.toString(),
      change: 'Account stat',
      positive: true,
      icon: UserPlus,
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    }] : []),
    {
      id: 'kpi-content',
      label: platformMeta?.contentLabel || 'Content',
      value: contentCount.toLocaleString(),
      change: `Showing ${contentItems.length} recent`,
      positive: true,
      icon: platformMeta?.id === 'youtube' ? Play : Image,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    ...(totalViews > 0 ? [{
      id: 'kpi-watchtime',
      label: 'Watch Time (Est)',
      value: `${(estWatchTimeHours / 1000).toFixed(1)}K hrs`,
      change: '+9.7%',
      positive: true,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    }] : []),
    {
      id: 'kpi-engagement',
      label: 'Avg Likes / Content',
      value: avgLikes > 1000 ? `${(avgLikes / 1000).toFixed(1)}K` : avgLikes.toString(),
      change: `${avgComments} avg comments`,
      positive: true,
      icon: Heart,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      id: 'kpi-revenue',
      label: 'Monetization Est.',
      value: `$${estRevenue.toLocaleString()}`,
      change: platformMeta?.id === 'youtube' ? 'Est CPM $3.50' : 'Est sponsorship',
      positive: true,
      icon: DollarSign,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
  ];

  // Follower growth visualization (simulated historical trend)
  const growthData = [
    { date: 'Jan', value: Math.round(followers * 0.7) },
    { date: 'Feb', value: Math.round(followers * 0.76) },
    { date: 'Mar', value: Math.round(followers * 0.82) },
    { date: 'Apr', value: Math.round(followers * 0.88) },
    { date: 'May', value: Math.round(followers * 0.94) },
    { date: 'Jun', value: followers },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-900 dark:text-slate-100">
            Welcome back, {user?.full_name?.split(' ')[0] ?? 'Creator'} 👋
          </h1>
          <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400">
            Analytics overview for active {platformMeta?.displayName}: <strong className="text-slate-900 dark:text-slate-100">{activeAccount.name}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="badge badge-green gap-1">
            <CheckCircle2 size={12} /> Active: {activeAccount.name}
          </span>
        </div>
      </div>

      {/* Platform selector — only the connected platform is selectable */}
      <PlatformSelector activePlatform={activePlatform} />

      {/* KPI Cards */}
      <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-${Math.min(kpiCards.length, 6)} gap-4`}>
        {kpiCards.map(({ id, label, value, change, positive, icon: Icon, color, bg }) => (
          <div key={id} id={id} className="card p-4 border border-slate-200/80 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-900 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</span>
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={14} className={color} />
              </div>
            </div>
            <div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{value}</p>
              <p className={`text-[11px] font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
                {change}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Growth Chart */}
        <div className="card p-5 lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {platformMeta?.followerLabel || 'Follower'} Growth — {activeAccount.name}
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Last 6 Months</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={activeAccount.name}
                  stroke={platformMeta?.color === 'red' ? '#ef4444' : platformMeta?.color === 'pink' ? '#ec4899' : platformMeta?.color === 'blue' ? '#2563eb' : platformMeta?.color === 'sky' ? '#0284c7' : '#1e293b'}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Active Account Details */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 rounded-2xl space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Active {platformMeta?.displayName} Context</h2>
          <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800">
            <img
              src={activeAccount.avatarUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'}
              alt={activeAccount.name}
              className="w-12 h-12 rounded-full border border-slate-300 dark:border-slate-600 object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{activeAccount.name}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{activeAccount.handle}</p>
            </div>
          </div>

          <div className="space-y-2 text-xs pt-1">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">{platformMeta?.followerLabel || 'Followers'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{followers.toLocaleString()}</span>
            </div>
            {totalViews > 0 && (
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Total Views</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{totalViews.toLocaleString()}</span>
              </div>
            )}
            {following !== null && following !== undefined && (
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Following</span>
                <span className="font-bold text-slate-800 dark:text-slate-100">{following.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">{platformMeta?.contentLabel || 'Content'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{contentCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400">Country / Region</span>
              <span className="font-bold text-slate-800 dark:text-slate-100">{activeAccount.country || 'Global'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
