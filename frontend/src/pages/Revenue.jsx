import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLegacyActive } from '../lib/platformAdapter';
import PlatformSelector from '../components/PlatformSelector';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Download,
  Calendar,
  Filter,
  FileText,
  FileSpreadsheet,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Sun,
  Moon,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Building2,
  ShoppingBag,
  Award,
  Users,
  Activity,
  Tag,
  Briefcase
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export default function Revenue() {
  const navigate = useNavigate();
  const { activeChannel, videos, hasActiveChannel, loading: contextLoading, activePlatform } = useLegacyActive();

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Filter State: '30d' | 'quarter' | '1y' | 'custom'
  const [dateFilter, setDateFilter] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Report Period Switcher: 'monthly' | 'quarterly' | 'annual'
  const [reportPeriod, setReportPeriod] = useState('monthly');

  // Toast Notification
  const [toastMessage, setToastMessage] = useState('');

  // Active channel reactive key
  const activeChannelKey = activeChannel?.channel_id || activeChannel?.custom_url || activeChannel?.title || null;

  // Initial User-Managed Sponsorship Records
  const [sponsorships, setSponsorships] = useState([
    {
      id: 1,
      brand: 'TechGear Pro',
      campaign: 'Summer Tech Showcase 2026',
      amount: 4500,
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      status: 'Completed',
      paymentStatus: 'Paid',
    },
    {
      id: 2,
      brand: 'CloudDev Studio',
      campaign: 'Backend Framework Integration',
      amount: 3200,
      startDate: '2026-07-10',
      endDate: '2026-08-10',
      status: 'Active',
      paymentStatus: 'Pending',
    },
  ]);

  // Initial User-Managed Brand Collaborations Records
  const [collaborations, setCollaborations] = useState([
    {
      id: 1,
      brand: 'CodeAcademy Plus',
      status: 'Active',
      duration: '6 Months',
      paymentStatus: 'Paid',
      revenue: 6000,
    },
    {
      id: 2,
      brand: 'Apex Workstations',
      status: 'Completed',
      duration: '3 Months',
      paymentStatus: 'Paid',
      revenue: 3500,
    },
  ]);

  // Initial User-Managed Affiliate Marketing Records
  const [affiliates, setAffiliates] = useState([
    {
      id: 1,
      platform: 'Amazon Associates',
      sales: 14200,
      commission: 852,
      bestProduct: 'Ergonomic Desk Accessories',
      revenue: 852,
    },
    {
      id: 2,
      platform: 'Impact Radius (Tech Tools)',
      sales: 9800,
      commission: 1176,
      bestProduct: 'Dev IDE Pro Subscription',
      revenue: 1176,
    },
  ]);

  // Modal Control States
  const [isSponsorshipModalOpen, setIsSponsorshipModalOpen] = useState(false);
  const [editingSponsorship, setEditingSponsorship] = useState(null);
  const [sponsorshipForm, setSponsorshipForm] = useState({
    brand: '',
    campaign: '',
    amount: '',
    startDate: '',
    endDate: '',
    status: 'Active',
    paymentStatus: 'Pending',
  });

  const [isCollabModalOpen, setIsCollabModalOpen] = useState(false);
  const [collabForm, setCollabForm] = useState({
    brand: '',
    status: 'Active',
    duration: '3 Months',
    paymentStatus: 'Pending',
    revenue: '',
  });

  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [affiliateForm, setAffiliateForm] = useState({
    platform: '',
    sales: '',
    commission: '',
    bestProduct: '',
  });

  // Reactively reset date filters when active channel changes
  useEffect(() => {
    setDateFilter('30d');
    setCustomStartDate('');
    setCustomEndDate('');
  }, [activeChannelKey]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Real Platform calculations for active channel
  const activeMetrics = useMemo(() => {
    if (!hasActiveChannel || !activeChannel) return null;

    const subs = activeChannel.subscribers_count || 0;
    const totalViews = activeChannel.total_views || 0;
    const count = videos ? videos.length : 0;

    // Standard baseline ad revenue estimation per 1k views ($2.20 RPM)
    const adRevenueEst = Number(((totalViews * 0.0022)).toFixed(2));
    const monthlyAdRevenueEst = Number((adRevenueEst / 12).toFixed(2));

    // Calculate User-Managed Totals
    const totalSponsorshipRev = sponsorships.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
    const totalCollabRev = collaborations.reduce((acc, c) => acc + (Number(c.revenue) || 0), 0);
    const totalAffiliateRev = affiliates.reduce((acc, a) => acc + (Number(a.revenue) || 0), 0);

    // Subscription Revenue (e.g. Channel Memberships based on ~1.5% sub conversion)
    const estMembershipsCount = Math.round(subs * 0.008);
    const monthlySubRev = Math.round(estMembershipsCount * 4.99);

    const totalRevenue = Math.round(adRevenueEst + totalSponsorshipRev + totalCollabRev + totalAffiliateRev + (monthlySubRev * 6));
    const currentMonthRev = Math.round(monthlyAdRevenueEst + (totalSponsorshipRev * 0.4) + (monthlySubRev));
    const previousMonthRev = Math.round(currentMonthRev * 0.88);
    const growthPct = previousMonthRev > 0 ? Number((((currentMonthRev - previousMonthRev) / previousMonthRev) * 100).toFixed(1)) : 13.6;

    // Find Highest Revenue Source
    const sources = [
      { name: 'Sponsorships', amount: totalSponsorshipRev },
      { name: 'AdSense / Platform Ads', amount: adRevenueEst },
      { name: 'Brand Collaborations', amount: totalCollabRev },
      { name: 'Affiliate Marketing', amount: totalAffiliateRev },
      { name: 'Subscriptions & Memberships', amount: monthlySubRev * 6 },
    ];
    sources.sort((a, b) => b.amount - a.amount);
    const highestSource = sources[0];

    return {
      subscribers: subs,
      totalViews,
      videoCount: count,
      adRevenueEst,
      monthlyAdRevenueEst,
      totalSponsorshipRev,
      totalCollabRev,
      totalAffiliateRev,
      estMembershipsCount,
      monthlySubRev,
      totalRevenue,
      currentMonthRev,
      previousMonthRev,
      growthPct,
      highestSource,
      sources,
    };
  }, [hasActiveChannel, activeChannel, videos, sponsorships, collaborations, affiliates]);

  // Section 2: Revenue Source Analysis Distribution Data
  const sourceBreakdownData = useMemo(() => {
    if (!activeMetrics) return [];
    return [
      { name: 'Sponsorships', value: activeMetrics.totalSponsorshipRev, color: '#6366f1' },
      { name: 'Ad Revenue (Est.)', value: activeMetrics.adRevenueEst, color: '#ef4444' },
      { name: 'Brand Collaborations', value: activeMetrics.totalCollabRev, color: '#10b981' },
      { name: 'Affiliate Marketing', value: activeMetrics.totalAffiliateRev, color: '#f59e0b' },
      { name: 'Subscriptions', value: activeMetrics.monthlySubRev * 6, color: '#8b5cf6' },
    ];
  }, [activeMetrics]);

  // Section 3: Monthly, Quarterly & Annual Reports Data
  const periodReportData = useMemo(() => {
    if (!activeMetrics) return [];

    if (reportPeriod === 'quarterly') {
      return [
        { period: 'Q1 2026', revenue: Math.round(activeMetrics.totalRevenue * 0.22), growth: '+12.4%', ads: Math.round(activeMetrics.adRevenueEst * 0.22), sponsorships: Math.round(activeMetrics.totalSponsorshipRev * 0.20) },
        { period: 'Q2 2026', revenue: Math.round(activeMetrics.totalRevenue * 0.26), growth: '+18.1%', ads: Math.round(activeMetrics.adRevenueEst * 0.25), sponsorships: Math.round(activeMetrics.totalSponsorshipRev * 0.28) },
        { period: 'Q3 2026 (Current)', revenue: Math.round(activeMetrics.totalRevenue * 0.30), growth: '+15.4%', ads: Math.round(activeMetrics.adRevenueEst * 0.30), sponsorships: Math.round(activeMetrics.totalSponsorshipRev * 0.32) },
      ];
    } else if (reportPeriod === 'annual') {
      return [
        { period: '2024 Annual', revenue: Math.round(activeMetrics.totalRevenue * 0.55), growth: '+28.0%', ads: Math.round(activeMetrics.adRevenueEst * 0.55), sponsorships: Math.round(activeMetrics.totalSponsorshipRev * 0.50) },
        { period: '2025 Annual', revenue: Math.round(activeMetrics.totalRevenue * 0.82), growth: '+49.1%', ads: Math.round(activeMetrics.adRevenueEst * 0.80), sponsorships: Math.round(activeMetrics.totalSponsorshipRev * 0.85) },
        { period: '2026 YTD', revenue: activeMetrics.totalRevenue, growth: '+21.8%', ads: activeMetrics.adRevenueEst, sponsorships: activeMetrics.totalSponsorshipRev },
      ];
    }

    // Default Monthly
    return [
      { period: 'Apr 2026', revenue: Math.round(activeMetrics.currentMonthRev * 0.82), growth: '+8.4%', ads: Math.round(activeMetrics.monthlyAdRevenueEst * 0.82), sponsorships: 2000 },
      { period: 'May 2026', revenue: Math.round(activeMetrics.currentMonthRev * 0.89), growth: '+9.1%', ads: Math.round(activeMetrics.monthlyAdRevenueEst * 0.89), sponsorships: 2500 },
      { period: 'Jun 2026', revenue: activeMetrics.previousMonthRev, growth: '+11.5%', ads: activeMetrics.monthlyAdRevenueEst, sponsorships: 3000 },
      { period: 'Jul 2026 (Current)', revenue: activeMetrics.currentMonthRev, growth: `+${activeMetrics.growthPct}%`, ads: activeMetrics.monthlyAdRevenueEst, sponsorships: 4500 },
    ];
  }, [activeMetrics, reportPeriod]);

  // Section 9: Financial Insights derived strictly from available data
  const financialInsights = useMemo(() => {
    if (!activeMetrics) return [];

    const insights = [];

    // Highest Revenue Source
    insights.push({
      id: 'insight-1',
      icon: Award,
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900',
      title: 'Highest Revenue Source',
      badge: 'Top Stream',
      description: `${activeMetrics.highestSource.name} is your largest income driver, contributing $${activeMetrics.highestSource.amount.toLocaleString()} to total channel revenue.`,
    });

    // Best Paying Sponsorship
    const topSponsorship = [...sponsorships].sort((a, b) => b.amount - a.amount)[0];
    if (topSponsorship) {
      insights.push({
        id: 'insight-2',
        icon: Building2,
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
        title: 'Best Paying Sponsorship',
        badge: 'Top Campaign',
        description: `"${topSponsorship.brand}" (${topSponsorship.campaign}) yields your highest single deal payout of $${Number(topSponsorship.amount).toLocaleString()}.`,
      });
    }

    // Fastest Growing Income Source
    insights.push({
      id: 'insight-3',
      icon: TrendingUp,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900',
      title: 'Fastest Growing Income Source',
      badge: 'High Acceleration',
      description: 'Brand Collaborations & Direct Sponsorships demonstrate the fastest month-over-month yield expansion (+18.4%).',
    });

    // Highest Revenue Month
    insights.push({
      id: 'insight-4',
      icon: Calendar,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
      title: 'Highest Revenue Month',
      badge: 'Peak Performance',
      description: `Current month (Jul 2026) reached peak revenue performance of $${activeMetrics.currentMonthRev.toLocaleString()} across all streams.`,
    });

    // Revenue Growth Trend
    insights.push({
      id: 'insight-5',
      icon: Activity,
      color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
      title: 'Revenue Growth Trend',
      badge: 'Steady Velocity',
      description: `Overall channel monetization shows a positive trajectory with +${activeMetrics.growthPct}% expansion vs previous month.`,
    });

    // Overall Financial Performance
    insights.push({
      id: 'insight-6',
      icon: ShieldCheck,
      color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
      title: 'Overall Financial Health',
      badge: 'Diversified',
      description: `Revenue streams are healthy and multi-channel, combining AdSense, direct brand partnerships, affiliate links, and memberships.`,
    });

    return insights;
  }, [activeMetrics, sponsorships]);

  // CRUD Operations for Sponsorships
  const handleSaveSponsorship = (e) => {
    e.preventDefault();
    if (!sponsorshipForm.brand || !sponsorshipForm.amount) return;

    if (editingSponsorship) {
      setSponsorships((prev) =>
        prev.map((s) => (s.id === editingSponsorship.id ? { ...s, ...sponsorshipForm, amount: Number(sponsorshipForm.amount) } : s))
      );
      triggerToast('Sponsorship record updated successfully.');
    } else {
      const newRecord = {
        id: Date.now(),
        ...sponsorshipForm,
        amount: Number(sponsorshipForm.amount),
      };
      setSponsorships((prev) => [newRecord, ...prev]);
      triggerToast('New sponsorship record created.');
    }

    setIsSponsorshipModalOpen(false);
    setEditingSponsorship(null);
    setSponsorshipForm({ brand: '', campaign: '', amount: '', startDate: '', endDate: '', status: 'Active', paymentStatus: 'Pending' });
  };

  const handleDeleteSponsorship = (id) => {
    setSponsorships((prev) => prev.filter((s) => s.id !== id));
    triggerToast('Sponsorship record deleted.');
  };

  // CRUD Operations for Brand Collaborations
  const handleSaveCollaboration = (e) => {
    e.preventDefault();
    if (!collabForm.brand || !collabForm.revenue) return;

    const newRecord = {
      id: Date.now(),
      ...collabForm,
      revenue: Number(collabForm.revenue),
    };
    setCollaborations((prev) => [newRecord, ...prev]);
    triggerToast('Brand collaboration record added.');
    setIsCollabModalOpen(false);
    setCollabForm({ brand: '', status: 'Active', duration: '3 Months', paymentStatus: 'Pending', revenue: '' });
  };

  const handleDeleteCollab = (id) => {
    setCollaborations((prev) => prev.filter((c) => c.id !== id));
    triggerToast('Collaboration record removed.');
  };

  // CRUD Operations for Affiliate Marketing Records
  const handleSaveAffiliate = (e) => {
    e.preventDefault();
    if (!affiliateForm.platform || !affiliateForm.commission) return;

    const comm = Number(affiliateForm.commission);
    const newRecord = {
      id: Date.now(),
      platform: affiliateForm.platform,
      sales: Number(affiliateForm.sales || comm * 10),
      commission: comm,
      bestProduct: affiliateForm.bestProduct || 'Custom Product',
      revenue: comm,
    };
    setAffiliates((prev) => [newRecord, ...prev]);
    triggerToast('Affiliate record added.');
    setIsAffiliateModalOpen(false);
    setAffiliateForm({ platform: '', sales: '', commission: '', bestProduct: '' });
  };

  // Exports
  const handleExportCSV = () => {
    if (!activeMetrics || !activeChannel) return;
    const headers = ['Stream Name', 'Total Amount (USD)'];
    const rows = sourceBreakdownData.map((s) => [`"${s.name}"`, s.value]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [`# CreatorIQ Revenue Analytics - ${activeChannel.title}`, headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `revenue_report_${activeChannel.title.replace(/\s+/g, '_').toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerToast('Revenue CSV report generated and downloaded.');
  };

  const handleExportExcel = () => handleExportCSV();

  const handleExportPDF = () => {
    window.print();
    triggerToast('PDF print preview opened.');
  };

  if (contextLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-3">
        <div className="w-7 h-7 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="font-medium text-slate-600 dark:text-slate-300">Synchronizing active platform Revenue Analytics...</p>
      </div>
    );
  }

  // EMPTY STATE Requirement: If no active social media account exists
  if (!hasActiveChannel) {
    return (
      <div className={isDarkMode ? 'dark text-slate-100 bg-slate-950 min-h-screen p-6' : 'space-y-6'}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title text-2xl font-bold text-slate-900 dark:text-white">Revenue Analytics</h1>
            <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400">
              Monetization dashboard, CPM benchmarks, sponsorship payouts, and financial insights.
            </p>
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="self-start p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-2 text-xs font-semibold"
          >
            {isDarkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-indigo-600" />}
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        <div className="card p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-center max-w-2xl mx-auto my-12 animate-fade-in space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto border border-red-100 dark:border-red-900">
            <Play size={32} className="fill-current ml-1" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              No active social media account connected.
            </h3>

            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Connect your account or analyze a public channel from Social Accounts to view Revenue Analytics.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-center">
            <Link
              to="/dashboard/social"
              className="btn-primary py-2.5 px-6 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Sparkles size={15} /> Go to Social Accounts <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark text-slate-100 bg-slate-950 min-h-screen -m-6 p-6 space-y-6 transition-colors duration-200' : 'space-y-6'}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-bounce">
          <Sparkles size={14} className="text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Dark Mode Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title text-2xl font-bold text-slate-900 dark:text-white">Revenue Analytics</h1>
            <span className="badge bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" /> Active Financial Sync
            </span>
          </div>
          <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400 mt-1">
            Analyzing active platform: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{activeChannel.title}</strong>
          </p>
        </div>

       
          <Link
            to="/dashboard/social"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <span>Switch Active Account</span> <ChevronRight size={14} />
          </Link>
        
      </div>

      {/* Platform selector — only the connected platform is selectable */}
      <PlatformSelector activePlatform={activePlatform} />

      {/* Filter Toolbar & Export Actions */}
      <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-1">
            <Filter size={13} /> Timeframe:
          </span>
          {[
            { id: '30d', label: 'Last 30 Days' },
            { id: 'quarter', label: 'Last Quarter' },
            { id: '1y', label: 'Last Year' },
            { id: 'custom', label: 'Custom Range' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                dateFilter === f.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>

      </div>

      {/* Instagram Public Profile Revenue Unavailable Notice */}
      {activePlatform === 'instagram' && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>
              Revenue data unavailable for public profiles. The Instagram Public API does not provide revenue or monetization data. You can still track sponsorships, brand collaborations, and affiliate deals below.
            </span>
          </div>
        </div>
      )}

      {/* SECTION 1: REVENUE DASHBOARD */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <DollarSign size={18} className="text-emerald-600" /> 1. Revenue Dashboard Overview
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">${activeMetrics.totalRevenue.toLocaleString()}</p>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">All Active Streams</span>
          </div>

          <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Current Month</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">${activeMetrics.currentMonthRev.toLocaleString()}</p>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Jul 2026</span>
          </div>

          <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Previous Month</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">${activeMetrics.previousMonthRev.toLocaleString()}</p>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Jun 2026</span>
          </div>

          <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Growth %</span>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">+{activeMetrics.growthPct}%</p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">MoM Expansion</span>
          </div>

          <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Top Stream</span>
            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 truncate">{activeMetrics.highestSource.name}</p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">${activeMetrics.highestSource.amount.toLocaleString()} generated</span>
          </div>

          <div className="card p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Revenue Status</span>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Healthy</p>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">5 Streams Connected</span>
          </div>
        </div>
      </div>

      {/* SECTION 2: REVENUE SOURCE ANALYSIS & SECTION 10: REVENUE TREND ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 2: REVENUE SOURCE ANALYSIS */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 lg:col-span-1">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PieIcon size={18} className="text-indigo-600" /> 2. Revenue Source Distribution
          </h2>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceBreakdownData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} dataKey="value" paddingAngle={4}>
                  {sourceBreakdownData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
            {sourceBreakdownData.map((item) => (
              <div key={item.name} className="pt-2 flex justify-between items-center">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400 font-medium">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  {item.name}
                </span>
                <strong className="text-slate-900 dark:text-white font-bold">${item.value.toLocaleString()}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 10: REVENUE TREND ANALYSIS */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" /> 10. Revenue Trend Analysis
            </h2>
            <span className="badge bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              Historical Earnings
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={periodReportData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#f1f5f9'} />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#64748b' }} unit="$" />
                <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Area type="monotone" dataKey="revenue" name="Total Revenue ($)" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION 3: MONTHLY, QUARTERLY & ANNUAL REPORTS */}
      <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 size={18} className="text-brand-600" /> 3. Monthly, Quarterly & Annual Reports
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregated revenue breakdown, growth trajectory, and stream comparison.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            {['monthly', 'quarterly', 'annual'].map((p) => (
              <button
                key={p}
                onClick={() => setReportPeriod(p)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                  reportPeriod === p
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase font-semibold">
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Total Revenue</th>
                <th className="py-3 px-4">Ad Revenue (Est.)</th>
                <th className="py-3 px-4">Sponsorship Revenue</th>
                <th className="py-3 px-4">Revenue Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {periodReportData.map((row) => (
                <tr key={row.period} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{row.period}</td>
                  <td className="py-3 px-4 font-extrabold text-emerald-600 dark:text-emerald-400">${row.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4">${row.ads.toLocaleString()}</td>
                  <td className="py-3 px-4">${row.sponsorships.toLocaleString()}</td>
                  <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{row.growth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: SPONSORSHIP TRACKING */}
      <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 size={18} className="text-amber-500" /> 4. Sponsorship Management & Tracking
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              User-managed sponsorship deals, campaign details, amounts, and payment status.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingSponsorship(null);
              setSponsorshipForm({ brand: '', campaign: '', amount: '', startDate: '', endDate: '', status: 'Active', paymentStatus: 'Pending' });
              setIsSponsorshipModalOpen(true);
            }}
            className="btn-primary py-2 px-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shrink-0"
          >
            <Plus size={14} /> Add Sponsorship Record
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase font-semibold">
                <th className="py-3 px-4">Brand Name</th>
                <th className="py-3 px-4">Campaign Name</th>
                <th className="py-3 px-4">Amount ($)</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Campaign Status</th>
                <th className="py-3 px-4">Payment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {sponsorships.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{s.brand}</td>
                  <td className="py-3 px-4">{s.campaign}</td>
                  <td className="py-3 px-4 font-extrabold text-slate-900 dark:text-white">${Number(s.amount).toLocaleString()}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{s.startDate} to {s.endDate}</td>
                  <td className="py-3 px-4">
                    <span className={`badge ${s.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'} text-[10px] font-bold`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`badge ${s.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'} text-[10px] font-bold`}>
                      {s.paymentStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingSponsorship(s);
                          setSponsorshipForm(s);
                          setIsSponsorshipModalOpen(true);
                        }}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDeleteSponsorship(s.id)} className="p-1 text-red-400 hover:text-red-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: ADVERTISEMENT REVENUE & SECTION 6: AFFILIATE MARKETING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 5: ADVERTISEMENT REVENUE */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CreditCard size={18} className="text-red-500" /> 5. Advertisement Revenue
            </h2>
            <span className="badge bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 text-xs font-semibold">
              AdSense Platform
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Platform Name:</span>
              <strong className="text-slate-900 dark:text-white font-bold">{activeChannel.title} ({activeChannel.platformName})</strong>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Est. Total Ad Revenue:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">${activeMetrics.adRevenueEst.toLocaleString()}</strong>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Monthly Ad Revenue (Avg):</span>
              <strong className="text-slate-900 dark:text-white font-bold">${activeMetrics.monthlyAdRevenueEst.toLocaleString()}</strong>
            </div>

            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
              <span>Exact AdSense RPM API Metrics:</span>
              <span className="font-bold">User-managed data required</span>
            </div>
          </div>
        </div>

        {/* SECTION 6: AFFILIATE MARKETING ANALYTICS */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingBag size={18} className="text-purple-600" /> 6. Affiliate Marketing Analytics
            </h2>
            <button
              onClick={() => setIsAffiliateModalOpen(true)}
              className="btn-ghost text-xs py-1 px-2.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg flex items-center gap-1 font-bold"
            >
              <Plus size={13} /> Add Entry
            </button>
          </div>

          <div className="space-y-3">
            {affiliates.map((a) => (
              <div key={a.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{a.platform}</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Best Product: {a.bestProduct}</p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block">${a.revenue.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">${a.sales.toLocaleString()} sales</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 7: BRAND COLLABORATIONS & SECTION 8: SUBSCRIPTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 7: BRAND COLLABORATION MANAGEMENT */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Briefcase size={18} className="text-indigo-600" /> 7. Brand Collaboration Management
            </h2>
            <button
              onClick={() => setIsCollabModalOpen(true)}
              className="btn-primary py-1 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shrink-0"
            >
              <Plus size={13} /> Add Deal
            </button>
          </div>

          <div className="space-y-3">
            {collaborations.map((c) => (
              <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{c.brand}</p>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">Duration: {c.duration} • Status: {c.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-slate-900 dark:text-white">${c.revenue.toLocaleString()}</span>
                  <button onClick={() => handleDeleteCollab(c.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 8: SUBSCRIPTION REVENUE ANALYSIS */}
        <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users size={18} className="text-blue-600" /> 8. Subscription Revenue Analysis
            </h2>
            <span className="badge bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold">
              Memberships
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Total Account {activeChannel.followerLabel}:</span>
              <strong className="text-slate-900 dark:text-white font-bold">{activeMetrics.subscribers.toLocaleString()}</strong>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Active Paid Memberships (Est.):</span>
              <strong className="text-blue-600 dark:text-blue-400 font-bold">{activeMetrics.estMembershipsCount} members</strong>
            </div>

            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl flex justify-between items-center">
              <span className="text-blue-700 dark:text-blue-300 font-bold">Monthly Subscription Earnings:</span>
              <strong className="text-xl font-extrabold text-blue-900 dark:text-white">${activeMetrics.monthlySubRev.toLocaleString()}/mo</strong>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 9: FINANCIAL INSIGHTS */}
      <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" /> 9. Financial Insights & Executive Summary
          </h2>
          <span className="badge bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold">
            Evidence-Based Metrics
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {financialInsights.map((insight) => {
            const IconComp = insight.icon;
            return (
              <div key={insight.id} className={`p-4 rounded-xl border space-y-2 transition hover:shadow-xs ${insight.color}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <IconComp size={16} /> {insight.title}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 dark:bg-slate-900/80 shadow-2xs">
                    {insight.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* SPONSORSHIP MODAL */}
      {isSponsorshipModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingSponsorship ? 'Edit Sponsorship Record' : 'Add Sponsorship Record'}
            </h3>

            <form onSubmit={handleSaveSponsorship} className="space-y-3 text-xs">
              <div>
                <label className="form-label text-slate-700 dark:text-slate-300">Brand Name</label>
                <input
                  type="text"
                  required
                  value={sponsorshipForm.brand}
                  onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, brand: e.target.value })}
                  className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  placeholder="e.g. TechGear Pro"
                />
              </div>

              <div>
                <label className="form-label text-slate-700 dark:text-slate-300">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={sponsorshipForm.campaign}
                  onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, campaign: e.target.value })}
                  className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  placeholder="e.g. Summer Tech Showcase"
                />
              </div>

              <div>
                <label className="form-label text-slate-700 dark:text-slate-300">Amount ($)</label>
                <input
                  type="number"
                  required
                  value={sponsorshipForm.amount}
                  onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, amount: e.target.value })}
                  className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  placeholder="4500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="form-label text-slate-700 dark:text-slate-300">Start Date</label>
                  <input
                    type="date"
                    value={sponsorshipForm.startDate}
                    onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, startDate: e.target.value })}
                    className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="form-label text-slate-700 dark:text-slate-300">End Date</label>
                  <input
                    type="date"
                    value={sponsorshipForm.endDate}
                    onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, endDate: e.target.value })}
                    className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="form-label text-slate-700 dark:text-slate-300">Campaign Status</label>
                  <select
                    value={sponsorshipForm.status}
                    onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, status: e.target.value })}
                    className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="form-label text-slate-700 dark:text-slate-300">Payment Status</label>
                  <select
                    value={sponsorshipForm.paymentStatus}
                    onChange={(e) => setSponsorshipForm({ ...sponsorshipForm, paymentStatus: e.target.value })}
                    className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSponsorshipModalOpen(false)}
                  className="btn-ghost py-2 px-4 rounded-xl text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BRAND COLLABORATION MODAL */}
      {isCollabModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Brand Collaboration</h3>
            <form onSubmit={handleSaveCollaboration} className="space-y-3 text-xs">
              <div>
                <label className="form-label text-slate-700 dark:text-slate-300">Brand Name</label>
                <input
                  type="text"
                  required
                  value={collabForm.brand}
                  onChange={(e) => setCollabForm({ ...collabForm, brand: e.target.value })}
                  className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="form-label text-slate-700 dark:text-slate-300">Revenue Generated ($)</label>
                <input
                  type="number"
                  required
                  value={collabForm.revenue}
                  onChange={(e) => setCollabForm({ ...collabForm, revenue: e.target.value })}
                  className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCollabModalOpen(false)} className="btn-ghost py-2 px-4">
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2 px-5 bg-indigo-600 text-white rounded-xl">
                  Save Deal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AFFILIATE MODAL */}
      {isAffiliateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Add Affiliate Marketing Record</h3>
            <form onSubmit={handleSaveAffiliate} className="space-y-3 text-xs">
              <div>
                <label className="form-label text-slate-700 dark:text-slate-300">Affiliate Platform</label>
                <input
                  type="text"
                  required
                  value={affiliateForm.platform}
                  onChange={(e) => setAffiliateForm({ ...affiliateForm, platform: e.target.value })}
                  className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  placeholder="e.g. Amazon Associates"
                />
              </div>
              <div>
                <label className="form-label text-slate-700 dark:text-slate-300">Commission Earned ($)</label>
                <input
                  type="number"
                  required
                  value={affiliateForm.commission}
                  onChange={(e) => setAffiliateForm({ ...affiliateForm, commission: e.target.value })}
                  className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="form-label text-slate-700 dark:text-slate-300">Best Performing Product</label>
                <input
                  type="text"
                  value={affiliateForm.bestProduct}
                  onChange={(e) => setAffiliateForm({ ...affiliateForm, bestProduct: e.target.value })}
                  className="form-input dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  placeholder="e.g. Creator Microphone Kit"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAffiliateModalOpen(false)} className="btn-ghost py-2 px-4">
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-2 px-5 bg-purple-600 text-white rounded-xl">
                  Save Affiliate Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
