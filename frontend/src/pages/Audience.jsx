import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLegacyActive } from '../lib/platformAdapter';
import { useActivePlatform } from '../context/ActivePlatformContext';
import PlatformSelector from '../components/PlatformSelector';
import {
  Users, Globe, Smartphone, TrendingUp, Eye, ThumbsUp, MessageSquare,
  Share2, Bookmark, Clock, Download, FileSpreadsheet, FileText,
  CheckCircle2, Tv, Laptop, Tablet, ChevronRight, Activity
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie,
  Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';

const GENDER_COLORS = ['#3b82f6', '#ec4899', '#8b5cf6'];

const formatNumber = (value) =>
  value == null ? '—' : value.toLocaleString();

const formatCompact = (value) => {
  if (value == null) return '—';
  if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

export default function Audience() {
  const navigate = useNavigate();
  const { audience, activeChannel, hasActiveChannel, loading: contextLoading, platformMeta } = useLegacyActive();
  const { activePlatform } = useActivePlatform();

  const [dateFilter, setDateFilter] = useState('30d');
  const [exportNotification, setExportNotification] = useState('');

  const triggerExportNotification = (msg) => {
    setExportNotification(msg);
    setTimeout(() => setExportNotification(''), 4000);
  };

  const platformName = platformMeta?.displayName || 'Account';
  const followerLabel = platformMeta?.followerLabel || 'Followers';
  const contentLabel = platformMeta?.contentLabel || 'Posts';

  const dataWindow = useMemo(() => {
    switch (dateFilter) {
      case '7d': return 2;
      case '90d': return 4;
      case '1y': return 6;
      default: return 3;
    }
  }, [dateFilter]);

  const followerTimeline = useMemo(
    () => (audience?.followerGrowth?.timeline || []).slice(-dataWindow),
    [audience, dataWindow],
  );
  const reachTimeline = useMemo(
    () => (audience?.reach?.reachTrend || []).slice(-dataWindow),
    [audience, dataWindow],
  );
  const impressionTimeline = useMemo(
    () => (audience?.reach?.impressionTrend || []).slice(-dataWindow),
    [audience, dataWindow],
  );
  const watchTimeTimeline = useMemo(
    () => (audience?.reach?.watchTimeTrend || []).slice(-dataWindow),
    [audience, dataWindow],
  );
  const engagementTimeline = useMemo(
    () => (audience?.engagement?.trends || []).slice(-dataWindow),
    [audience, dataWindow],
  );

  const exportRows = () => {
    const ov = audience?.overview || {};
    const fg = audience?.followerGrowth || {};
    const eg = audience?.engagement || {};
    const dem = audience?.demographics || {};
    const act = audience?.activity || {};
    return [
      ['Section', 'Metric Name', 'Value'],
      ['Audience Overview', 'Total Followers', ov.totalFollowers],
      ['Audience Overview', 'New Followers', ov.newFollowers],
      ['Audience Overview', 'Monthly Follower Growth', `${ov.monthlyFollowerGrowth}%`],
      ['Audience Overview', 'Audience Reach', ov.reach],
      ['Audience Overview', 'Impressions', ov.impressions],
      ['Audience Overview', 'Average Engagement Rate', `${ov.avgEngagementRate}%`],
      ['Audience Demographics', 'Primary Country', dem.countries?.[0]?.name],
      ['Audience Activity', 'Peak Engagement Time', act.peakEngagementTime],
      ['Engagement Insights', 'Total Likes', eg.totalLikes],
      ['Engagement Insights', 'Total Comments', eg.totalComments],
      ['Engagement Insights', 'Total Shares', eg.shares],
      ['Engagement Insights', 'Total Saves', eg.saves],
      ['Engagement Insights', 'Engagement Rate', `${eg.engagementRate}%`],
      ['Follower Growth', 'Daily Growth', fg.daily],
      ['Follower Growth', 'Weekly Growth', fg.weekly],
      ['Follower Growth', 'Monthly Growth', fg.monthly],
      ['Follower Growth', 'Growth Percentage', `${fg.growthPercentage}%`],
    ];
  };

  const handleExportCSV = () => {
    if (!hasActiveChannel || !activeChannel) return;
    const rows = exportRows();
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeChannel.title}_Audience_Analytics_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerExportNotification(`Exported CSV for ${activeChannel.title} successfully!`);
  };

  const handleExportExcel = () => {
    if (!hasActiveChannel || !activeChannel) return;
    const rows = exportRows();
    const bodyRows = rows.slice(1).map((r) =>
      `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`
    ).join('');
    const content = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"/></head>
      <body>
        <h2>Audience Analytics Report — ${activeChannel.title}</h2>
        <p><strong>Platform:</strong> ${platformName} | <strong>Date Range:</strong> ${dateFilter}</p>
        <table border="1">
          <thead>
            <tr style="background-color: #1e293b; color: #ffffff;">
              <th>Category</th><th>Metric</th><th>Value</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([content], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeChannel.title}_Audience_Analytics_${dateFilter}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerExportNotification(`Exported Excel report for ${activeChannel.title} successfully!`);
  };

  const handleExportPDF = () => {
    if (!hasActiveChannel || !activeChannel) return;
    window.print();
    triggerExportNotification(`Opened print & PDF export dialog for ${activeChannel.title}.`);
  };

  if (contextLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 space-y-3">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-semibold text-slate-600">Loading active platform audience data...</p>
      </div>
    );
  }

  if (!hasActiveChannel || !activeChannel) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title text-2xl font-bold text-slate-900">Audience Analytics</h1>
          <p className="page-subtitle text-sm text-slate-500">
            Demographic breakdowns, follower growth, geographic distribution, and engagement insights.
          </p>
        </div>

        <PlatformSelector activePlatform={activePlatform} />

        <div className="card p-12 bg-white border border-slate-200/80 rounded-3xl text-center max-w-2xl mx-auto space-y-5 shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center gap-0 justify-center mx-auto shadow-inner">
            <Users size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">No active social media account connected.</h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
              Connect your account or analyze a public profile from Social Accounts to view Audience Analytics.
            </p>
          </div>

          <div className="pt-3">
            <button
              onClick={() => navigate('/dashboard/social')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:scale-[1.02]"
            >
              Go to Social Accounts <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const ov = audience?.overview || {};
  const dem = audience?.demographics || {};
  const fg = audience?.followerGrowth || {};
  const act = audience?.activity || {};
  const dev = audience?.devices || {};
  const geo = audience?.geography || {};
  const reach = audience?.reach || {};
  const eg = audience?.engagement || {};

  return (
    <div className="space-y-8">
      {exportNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{exportNotification}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title text-2xl font-extrabold text-slate-900">Audience Analytics</h1>
          </div>
          <p className="page-subtitle text-xs text-slate-500 mt-1">
            Showing simulated audience metrics for active {followerLabel === 'Subscribers' ? 'YouTube channel' : 'account'}: <strong className="text-slate-900 font-bold">{activeChannel.title}</strong> ({activeChannel.custom_url || activeChannel.channel_id})
          </p>
        </div>

      </div>

      <div className="bg-white p-4 border border-slate-200/80 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <PlatformSelector activePlatform={activePlatform} />

          <div className="text-[11px] text-slate-400 font-medium hidden lg:block">
            Multi-Platform Architecture Ready
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3.5">
            <img
              src={activeChannel.avatar_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=120&q=80'}
              alt={activeChannel.title}
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-300/40 shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">{activeChannel.title}</h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                  {activeChannel.custom_url || activeChannel.channel_id}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {formatNumber(ov.totalFollowers)} Total {followerLabel} • {activeChannel.video_count ?? 0} {contentLabel} • {formatNumber(ov.impressions)} Impressions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200/80 w-full sm:w-auto">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer pr-2"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SECTION 1: AUDIENCE OVERVIEW */}
      {/* ==================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users size={18} className="text-brand-600" /> 1. Audience Overview
          </h2>
          <span className="text-xs text-slate-400">KPI Card Metrics</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-500">Total {followerLabel}</span>
            <p className="text-xl font-extrabold text-slate-900">{formatCompact(ov.totalFollowers)}</p>
          </div>

          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-500">New {followerLabel}</span>
            <p className="text-xl font-extrabold text-slate-900">{formatNumber(ov.newFollowers)}</p>
          </div>

          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-500">Monthly Growth</span>
            <p className="text-xl font-extrabold text-emerald-600">+{ov.monthlyFollowerGrowth}%</p>
          </div>

          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-500">Audience Reach</span>
            <p className="text-xl font-extrabold text-slate-900">{formatCompact(ov.reach)}</p>
          </div>

          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-500">Impressions</span>
            <p className="text-xl font-extrabold text-slate-900">{formatCompact(ov.impressions)}</p>
          </div>

          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-500">Avg Engagement Rate</span>
            <p className="text-xl font-extrabold text-brand-600">{ov.avgEngagementRate}%</p>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* SECTION 2: AUDIENCE DEMOGRAPHICS */}
      {/* ==================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Globe size={18} className="text-blue-600" /> 2. Audience Demographics
          </h2>
          <span className="text-xs text-slate-400">Demographic Breakdown</span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800">Age Distribution</h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dem.age || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="percentage" name="Audience %" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800">Gender Distribution</h3>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dem.gender || []}
                    dataKey="percentage"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    outerRadius={62}
                    innerRadius={38}
                    label={({ label, percentage }) => `${label} ${percentage}%`}
                    labelLine={false}
                  >
                    {(dem.gender || []).map((entry, idx) => (
                      <Cell key={entry.label} fill={GENDER_COLORS[idx % GENDER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800">Geographic Distribution</h3>
            <div className="space-y-3 pt-1">
              {(dem.countries || []).slice(0, 5).map((c) => (
                <div key={c.name} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">{c.name}</span>
                  <span className="text-xs font-extrabold text-slate-900">{c.percentage}%</span>
                </div>
              ))}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Region Level Data</span>
                <span className="text-xs font-bold text-slate-900">{(dem.regions || []).length} Regions</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* SECTION 3: FOLLOWER GROWTH ANALYSIS */}
      {/* ==================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-600" /> 3. Follower Growth Analysis
          </h2>
          <span className="text-xs text-slate-400">Growth Trajectory & Timeline</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="p-3 bg-white border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Daily Growth</span>
            <p className="text-sm font-extrabold text-slate-900 mt-1">{formatNumber(fg.daily)}</p>
          </div>
          <div className="p-3 bg-white border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Weekly Growth</span>
            <p className="text-sm font-extrabold text-slate-900 mt-1">{formatNumber(fg.weekly)}</p>
          </div>
          <div className="p-3 bg-white border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Monthly Growth</span>
            <p className="text-sm font-extrabold text-slate-900 mt-1">{formatNumber(fg.monthly)}</p>
          </div>
          <div className="p-3 bg-white border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total {followerLabel}</span>
            <p className="text-sm font-extrabold text-slate-900 mt-1">{formatNumber(fg.total)}</p>
          </div>
          <div className="p-3 bg-white border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">New {followerLabel}</span>
            <p className="text-sm font-extrabold text-slate-900 mt-1">{formatNumber(fg.newFollowers)}</p>
          </div>
          <div className="p-3 bg-white border border-slate-200/80 rounded-xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Growth Percentage</span>
            <p className="text-sm font-extrabold text-emerald-600 mt-1">+{fg.growthPercentage}%</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800">Total {followerLabel} Growth Line Chart</h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={followerTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString() : v} />
                  <Line type="monotone" dataKey="followers" name={followerLabel} stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800">New {followerLabel} Bar Chart</h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={followerTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString() : v} />
                  <Bar dataKey="newFollowers" name="New Followers" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* SECTION 4: AUDIENCE ACTIVITY ANALYSIS */}
      {/* ==================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Clock size={18} className="text-indigo-600" /> 4. Audience Activity Analysis
          </h2>
          <span className="text-xs text-slate-400">Peak Performance Slots</span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-slate-500">Most Active Hours</span>
            <div className="space-y-1.5 pt-2">
              {(act.mostActiveHours || []).slice(0, 5).map((h) => (
                <div key={h.hour} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{h.hour}</span>
                  <span className="font-bold text-slate-900">{h.activity}% activity</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-slate-500">Peak Engagement Time</span>
            <p className="text-sm font-extrabold text-slate-900 pt-1">{act.peakEngagementTime}</p>
          </div>

          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-slate-500">Most Active Days</span>
            <div className="space-y-1.5 pt-1">
              {(act.mostActiveDays || []).slice(0, 3).map((d) => (
                <div key={d.day} className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">{d.day}</span>
                  <span className="font-bold text-slate-900">{d.percentage}% activity</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-slate-800">Audience Activity by Day of Week</h3>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={act.dailyActivity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="activity" name="Activity %" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* SECTION 5: DEVICE USAGE ANALYSIS */}
      {/* ==================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Smartphone size={18} className="text-amber-600" /> 5. Device Usage Analysis
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Mobile Users', value: dev.mobile, icon: Smartphone, color: 'text-indigo-500' },
            { label: 'Desktop Users', value: dev.desktop, icon: Laptop, color: 'text-blue-500' },
            { label: 'Tablet Users', value: dev.tablet, icon: Tablet, color: 'text-emerald-500' },
            { label: 'Smart TV Users', value: dev.smartTv, icon: Tv, color: 'text-purple-500' },
          ].map((d) => (
            <div key={d.label} className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold text-slate-600">{d.label}</span>
                <d.icon size={18} className={d.color} />
              </div>
              <p className="text-xl font-extrabold text-slate-900">{d.value ?? 0}%</p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================================================== */}
      {/* SECTION 6: GEOGRAPHIC AUDIENCE ANALYSIS */}
      {/* ==================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Globe size={18} className="text-emerald-600" /> 6. Geographic Audience Analysis
          </h2>
          <span className="text-xs text-slate-400">Country & Location Distribution</span>
        </div>

        <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Location</th>
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Percentage of Audience</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(geo.countries || []).map((c) => (
                  <tr key={`${c.name}-${c.type}`}>
                    <td className="py-3 font-extrabold text-slate-900 flex items-center gap-2">
                      <Globe size={14} className="text-blue-500" /> {c.name}
                    </td>
                    <td className="py-3 text-slate-600">Country</td>
                    <td className="py-3 text-slate-600">{c.percentage}%</td>
                  </tr>
                ))}
                {(geo.regions || []).map((r) => (
                  <tr key={`${r.name}-${r.type}`}>
                    <td className="py-3 text-slate-600 font-semibold">{r.name}</td>
                    <td className="py-3 text-slate-500">Region</td>
                    <td className="py-3 text-slate-600">{r.percentage}%</td>
                  </tr>
                ))}
                {(geo.topCities || []).map((c) => (
                  <tr key={`${c.name}-${c.type}`}>
                    <td className="py-3 text-slate-600 font-semibold">{c.name}</td>
                    <td className="py-3 text-slate-500">City</td>
                    <td className="py-3 text-slate-600">{c.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* SECTION 7: REACH & IMPRESSIONS ANALYSIS */}
      {/* ==================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Eye size={18} className="text-blue-600" /> 7. Reach & Impressions Analysis
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-500">Total Reach</span>
            <p className="text-lg font-extrabold text-slate-900">{formatCompact(reach.totalReach)}</p>
          </div>
          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-500">Total Impressions</span>
            <p className="text-lg font-extrabold text-slate-900">{formatCompact(reach.totalImpressions)}</p>
          </div>
          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-500">Unique Viewers</span>
            <p className="text-lg font-extrabold text-slate-900">{formatCompact(reach.uniqueViewers)}</p>
          </div>
          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-500">Reach Trend</span>
            <p className="text-lg font-extrabold text-emerald-600">{reachTimeline.length > 0 ? formatCompact(reachTimeline[reachTimeline.length - 1].reach) : '—'}</p>
          </div>
          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-2">
            <span className="text-[11px] font-bold text-slate-500">Impression Trend</span>
            <p className="text-lg font-extrabold text-emerald-600">{impressionTimeline.length > 0 ? formatCompact(impressionTimeline[impressionTimeline.length - 1].impressions) : '—'}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800">Reach Trend</h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <TrendBarChart data={reachTimeline} dataKey="reach" name="Reach" color="#3b82f6" />
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800">Impressions Trend</h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <TrendBarChart data={impressionTimeline} dataKey="impressions" name="Impressions" color="#10b981" />
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
            <h3 className="text-xs font-bold text-slate-800">Watch Time Trend</h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <TrendBarChart data={watchTimeTimeline} dataKey="minutes" name="Minutes" color="#f59e0b" />
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {/* ==================================================== */}
      {/* SECTION 8: AUDIENCE ENGAGEMENT INSIGHTS */}
      {/* ==================================================== */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ThumbsUp size={18} className="text-rose-500" /> 8. Audience Engagement Insights
          </h2>
          <span className="text-xs text-slate-400">Interactions & Trajectory</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold text-slate-500">Total Likes</span>
              <ThumbsUp size={16} className="text-blue-500" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{formatNumber(eg.totalLikes)}</p>
          </div>

          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold text-slate-500">Total Comments</span>
              <MessageSquare size={16} className="text-emerald-500" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{formatNumber(eg.totalComments)}</p>
          </div>

          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold text-slate-500">Shares</span>
              <Share2 size={16} className="text-indigo-400" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{formatNumber(eg.shares)}</p>
          </div>

          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold text-slate-500">Saves</span>
              <Bookmark size={16} className="text-slate-400" />
            </div>
            <p className="text-xl font-extrabold text-slate-900">{formatNumber(eg.saves)}</p>
          </div>

          <div className="card p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold text-slate-500">Engagement Rate</span>
              <Activity size={16} className="text-rose-500" />
            </div>
            <p className="text-xl font-extrabold text-brand-600">{eg.engagementRate}%</p>
          </div>
        </div>

        <div className="card p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-slate-800">Audience Interaction Trends (Likes, Comments, Shares, Saves)</h3>
          {engagementTimeline.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={engagementTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString() : v} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="likes" name="Likes" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="comments" name="Comments" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="shares" name="Shares" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="saves" name="Saves" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 bg-slate-50 rounded-xl flex items-center justify-center text-xs text-slate-400">
              No interaction trends available in selected date range.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function TrendBarChart({ data, dataKey, name, color }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <Tooltip formatter={(v) => typeof v === 'number' ? v.toLocaleString() : v} />
        <Bar dataKey={dataKey} name={name} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
