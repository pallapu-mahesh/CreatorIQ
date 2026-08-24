import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLegacyActive } from '../lib/platformAdapter';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { computeReportMetrics } from '../lib/reportData';
import { downloadReportXlsx } from '../lib/excelExport';
import { downloadReportPdf } from '../lib/reportPdf';
import { deliverReport } from '../api/reports';
import YouTubeEmptyState from '../components/YouTubeEmptyState';
import {
  FileText,
  FileSpreadsheet,
  Download,
  Eye,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  ChevronRight,
  Activity,
  Award,
  Target,
  Play,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  YouTubeIcon, InstagramIcon, FacebookIcon, LinkedInIcon, XIcon,
} from '../components/PlatformBrandIcon';

// ─── Multi-platform switcher (matches the rest of the app) ───────────────
const SUPPORTED_PLATFORMS = [
  { id: 'youtube', name: 'YouTube', color: 'bg-red-600', icon: YouTubeIcon },
  { id: 'instagram', name: 'Instagram', color: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600', icon: InstagramIcon },
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-600', icon: FacebookIcon },
  { id: 'linkedin', name: 'LinkedIn', color: 'bg-sky-700', icon: LinkedInIcon },
  { id: 'twitter', name: 'X (Twitter)', color: 'bg-slate-900', icon: XIcon },
];
const platformById = Object.fromEntries(SUPPORTED_PLATFORMS.map((p) => [p.id, p]));

const REPORT_TYPES = ['Weekly Performance', 'Monthly Summary', 'Quarterly Summary', 'Annual Summary'];
const SCHEDULE_FREQS = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];

// ─── Formatting helpers ──────────────────────────────────────────────────
const fmtCompact = (n) => {
  if (n == null) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
};
const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString());
const fmtMoney = (n) => (n == null ? '—' : `$${Number(n).toLocaleString()}`);
const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
};

export default function Reports() {
  const {
    activeChannel, videos, audience, hasActiveChannel, loading, activePlatform, platformMeta,
  } = useLegacyActive();
  const { addNotification } = useNotifications();
  const { user } = useAuth();

  // ─── Generator state ──────────────────────────────────────────────────
  const [selectedType, setSelectedType] = useState('Monthly Summary');
  const [selectedFormat, setSelectedFormat] = useState('PDF');
  const [reportPeriod, setReportPeriod] = useState('monthly'); // 'monthly' | 'quarterly' | 'annual'
  const [generating, setGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  // ─── Report History (persisted) ───────────────────────────────────────
  const [history, setHistory] = useState(() => {
    try {
      const stored = localStorage.getItem('creatoriq_report_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('creatoriq_report_history', JSON.stringify(history));
    } catch {
      // storage unavailable — ignore
    }
  }, [history]);

  // ─── Scheduled report settings (persisted) ────────────────────────────
  const [schedule, setSchedule] = useState(() => {
    try {
      const stored = localStorage.getItem('creatoriq_schedule_settings');
      return stored ? JSON.parse(stored) : { enabled: false, frequency: 'Weekly', day: '1', format: 'PDF' };
    } catch {
      return { enabled: false, frequency: 'Weekly', day: '1', format: 'PDF' };
    }
  });

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // ─── Derived metrics — same source as every other analytics module ────
  const metrics = useMemo(
    () => (hasActiveChannel ? computeReportMetrics(activeChannel, videos, audience) : null),
    [hasActiveChannel, activeChannel, videos, audience],
  );

  // ─── Period data (monthly / quarterly / annual) ────────────────────────
  const weekLabel = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const f = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${f(monday)} – ${f(sunday)}, ${now.getFullYear()}`;
  }, []);

  const monthlyPeriods = useMemo(() => {
    if (!metrics) return [];
    const timeline = audience?.followerGrowth?.timeline || [];
    if (timeline.length === 0) return [];
    const totalNew = timeline.reduce((acc, m) => acc + (m.newFollowers || 0), 0) || 1;
    return timeline.map((m) => ({
      period: m.date,
      followers: m.followers,
      newFollowers: m.newFollowers || 0,
      views: Math.round((m.followers / Math.max(metrics.followers, 1)) * metrics.aggregateViews),
      revenue: Math.round(metrics.totalRevenue * ((m.newFollowers || 0) / totalNew)),
      engagementRate: metrics.engagementRate,
    }));
  }, [metrics, audience]);

  const periodData = useMemo(() => {
    if (!metrics) return [];
    const timeline = audience?.followerGrowth?.timeline || [];
    const sumNew = timeline.reduce((acc, m) => acc + (m.newFollowers || 0), 0) || 1;
    const agg = (months, label) => {
      const last = months[months.length - 1];
      const nf = months.reduce((acc, m) => acc + (m.newFollowers || 0), 0);
      return {
        period: label,
        followers: last ? last.followers : 0,
        newFollowers: nf,
        views: months.length ? Math.round((last.followers / Math.max(metrics.followers, 1)) * metrics.aggregateViews) : 0,
        revenue: months.length ? Math.round(metrics.totalRevenue * (nf / sumNew)) : 0,
        engagementRate: metrics.engagementRate,
      };
    };

    if (reportPeriod === 'quarterly') {
      return [
        agg(timeline.filter((m) => m.date === 'Mar'), 'Q1 2026'),
        agg(timeline.filter((m) => ['Apr', 'May', 'Jun'].includes(m.date)), 'Q2 2026'),
        agg(timeline.filter((m) => ['Jul', 'Aug'].includes(m.date)), 'Q3 2026 (Current)'),
      ];
    }
    if (reportPeriod === 'annual') {
      return [
        { period: '2024 Annual', followers: Math.round(metrics.followers * 0.62), newFollowers: metrics.newFollowers || 0, views: Math.round(metrics.aggregateViews * 0.6), revenue: Math.round(metrics.totalRevenue * 0.55), engagementRate: metrics.engagementRate },
        { period: '2025 Annual', followers: Math.round(metrics.followers * 0.82), newFollowers: metrics.newFollowers || 0, views: Math.round(metrics.aggregateViews * 0.8), revenue: Math.round(metrics.totalRevenue * 0.82), engagementRate: metrics.engagementRate },
        { period: '2026 YTD', followers: metrics.followers, newFollowers: metrics.newFollowers || 0, views: metrics.aggregateViews, revenue: metrics.totalRevenue, engagementRate: metrics.engagementRate },
      ];
    }
    return monthlyPeriods;
  }, [reportPeriod, monthlyPeriods, metrics, audience]);

  const currentPeriod = periodData[periodData.length - 1] || null;

  // ─── Report history helpers ───────────────────────────────────────────
  const periodLabel = (type) => {
    const now = new Date();
    switch (type) {
      case 'Weekly Performance':
        return `Week of ${weekLabel}`;
      case 'Quarterly Summary':
        return `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
      case 'Annual Summary':
        return String(now.getFullYear());
      default:
        return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  const addHistoryEntry = (type, format) => {
    const now = new Date();
    const entry = {
      id: `REP-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: `${activeChannel.title} — ${type}`,
      platform: activePlatform,
      platformName: platformMeta?.displayName || activePlatform || '—',
      type,
      period: periodLabel(type),
      format,
      status: 'Ready',
      generatedAt: now.toISOString(),
    };
    setHistory((prev) => [entry, ...prev]);
    return entry;
  };

  const markDownloaded = (id) => {
    setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, status: 'Downloaded' } : h)));
  };

  // Generate a centralized notification when a report is produced.
  // The notification is rendered ONLY on the Notifications page.
  const notifyGenerated = (type, format) => {
    const fmtLabel = format === 'XLSX' ? 'Excel' : 'PDF';
    addNotification({
      title: `${fmtLabel} report generated successfully`,
      type: 'report',
      details: `${fmtLabel} report generated for ${activeChannel.title}.`,
    });
  };

  // ─── Full report workflow: download -> notification -> email ───────────
  // The file is generated client-side and downloaded in the browser, then
  // uploaded to the backend which emails it to the AUTHENTICATED user's own
  // email (resolved from the JWT — the frontend never picks the recipient).
  const deliver = async ({ blob, fileName, format, type, period, name }) => {
    try {
      return await deliverReport({
        file: blob,
        fileName,
        format,
        platform: activePlatform,
        platformName: platformMeta?.displayName || activeChannel.platformName || activePlatform,
        reportType: type,
        reportPeriod: period,
        reportName: name,
        accountName: activeChannel.title,
      });
    } catch (err) {
      return {
        success: false,
        email_status: 'failed',
        email_message: err?.response?.data?.detail
          ? `Report downloaded, but the backend reported: ${err.response.data.detail}`
          : 'Report downloaded, but the backend is not reachable — email was not sent.',
      };
    }
  };

  // Record the delivery outcome: centralized notification + history metadata.
  const notifyAndRecord = (res, entry) => {
    const fmtLabel = entry.format === 'XLSX' ? 'Excel' : 'PDF';
    const status = res?.email_status || 'unavailable';
    const recipient = res?.email_recipient || user?.email || '';
    let details = `${fmtLabel} report downloaded for ${entry.platformName}.`;
    if (status === 'sent') details += ` Emailed to ${recipient || 'your email'}.`;
    else if (status === 'unavailable') details += ' Email delivery unavailable (SMTP not configured).';
    else details += ` Email delivery failed: ${res?.email_message || 'unknown reason'}.`;

    addNotification({
      title: `${fmtLabel} report downloaded successfully`,
      type: 'report',
      details,
      platform: entry.platform,
      reportPeriod: entry.period,
      emailStatus: status,
      emailRecipient: recipient,
      format: entry.format === 'XLSX' ? 'xlsx' : 'pdf',
    });
    setHistory((prev) => prev.map((h) => (h.id === entry.id
      ? { ...h, emailStatus: status, emailMessage: res?.email_message || '', emailRecipient: recipient }
      : h)));
    return status;
  };

  // ─── Excel workbook (real .xlsx — clean tabular data for Excel/Sheets) ─
  const buildXlsx = () => downloadReportXlsx({
    accountTitle: activeChannel.title,
    platform: activePlatform,
    metrics,
    videos,
    audience,
  });

  // ─── PDF brief (real .pdf generated with jsPDF) ───────────────────────
  const buildPdf = (type, period) => downloadReportPdf({
    accountTitle: activeChannel.title,
    platformName: platformMeta?.displayName || activeChannel.platformName,
    reportType: type,
    reportPeriod: period,
    metrics,
    videos,
    audience,
    platform: activePlatform,
  });

  const emailOutcomeMsg = (status, res) => {
    if (status === 'sent') return `Email sent to ${res?.email_recipient || user?.email || 'your email'}.`;
    if (status === 'unavailable') return 'Email delivery unavailable — configure SMTP on the backend.';
    return res?.email_message || 'Email delivery failed.';
  };

  // ─── Generate / preview / download actions ────────────────────────────
  const handleGeneratePreview = () => {
    if (!metrics) return;
    setGenerating(true);
    setSuccessMsg('');
    setTimeout(() => {
      addHistoryEntry(selectedType, selectedFormat);
      notifyGenerated(selectedType, selectedFormat);
      setPreviewOpen(true);
      setGenerating(false);
      setSuccessMsg(`Report preview ready — ${selectedType} (${selectedFormat}).`);
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 800);
  };

  // Download PDF -> notification -> email
  const handleDownloadPdf = async () => {
    if (!metrics) return;
    setGenerating(true);
    setSuccessMsg('');
    try {
      const pdf = buildPdf(selectedType, periodLabel(selectedType));
      const entry = addHistoryEntry(selectedType, 'PDF');
      markDownloaded(entry.id);
      const res = await deliver({
        blob: pdf.blob, fileName: pdf.fileName, format: 'pdf',
        type: selectedType, period: periodLabel(selectedType), name: entry.name,
      });
      const status = notifyAndRecord(res, entry);
      setGenerating(false);
      setSuccessMsg(`PDF report downloaded — "${entry.name}". ${emailOutcomeMsg(status, res)}`);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch {
      setGenerating(false);
      setSuccessMsg('PDF report downloaded, but the email could not be delivered.');
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  // Download Excel -> notification -> email
  const handleDownloadExcel = async () => {
    if (!metrics) return;
    setGenerating(true);
    setSuccessMsg('');
    try {
      const xl = buildXlsx();
      const entry = addHistoryEntry(selectedType, 'XLSX');
      markDownloaded(entry.id);
      const res = await deliver({
        blob: xl.blob, fileName: xl.fileName, format: 'xlsx',
        type: selectedType, period: periodLabel(selectedType), name: entry.name,
      });
      const status = notifyAndRecord(res, entry);
      setGenerating(false);
      setSuccessMsg(`Excel workbook downloaded — "${entry.name}". ${emailOutcomeMsg(status, res)}`);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch {
      setGenerating(false);
      setSuccessMsg('Excel workbook downloaded, but the email could not be delivered.');
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  // Re-downloading from history also re-runs the download -> notification -> email flow.
  const downloadHistoryItem = async (h) => {
    if (!metrics) return;
    setGenerating(true);
    setSuccessMsg('');
    try {
      let file;
      if (h.format === 'XLSX') {
        file = buildXlsx();
      } else {
        file = buildPdf(h.type, h.period);
      }
      markDownloaded(h.id);
      const res = await deliver({
        blob: file.blob, fileName: file.fileName,
        format: h.format === 'XLSX' ? 'xlsx' : 'pdf',
        type: h.type, period: h.period, name: h.name,
      });
      const status = notifyAndRecord(res, h);
      setGenerating(false);
      setSuccessMsg(`"${h.name}" downloaded. ${emailOutcomeMsg(status, res)}`);
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch {
      setGenerating(false);
      setSuccessMsg('Report downloaded, but the email could not be delivered.');
      setTimeout(() => setSuccessMsg(''), 5000);
    }
  };

  // ─── Schedule helpers ─────────────────────────────────────────────────
  const saveSchedule = () => {
    localStorage.setItem('creatoriq_schedule_settings', JSON.stringify(schedule));
    triggerToast('Scheduled report settings saved locally. No automatic emails or background jobs are sent on this demo.');
    addNotification({
      title: `Scheduled Reports ${schedule.enabled ? 'Enabled' : 'Disabled'}`,
      type: 'schedule',
      details: `Scheduled report generation set to ${schedule.frequency} (${schedule.format}) for the active platform.`,
    });
  };

  const handleClearHistory = () => {
    if (!window.confirm('Are you sure you want to clear all report history? This cannot be undone.')) {
      return;
    }
    try {
      localStorage.removeItem('creatoriq_report_history');
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    setHistory([]);
    triggerToast('Report history cleared.');
  };

  // ─── Loading / empty states ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Loading active platform reports context...</p>
      </div>
    );
  }

  if (!hasActiveChannel) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="page-title text-2xl font-bold text-slate-900 dark:text-slate-100">Reports</h1>
          <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400">
            Weekly performance, period reports, exports and scheduled generation.
          </p>
        </div>
        <YouTubeEmptyState title="No active social media account connected" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #report-print-area, #report-print-area * { visibility: visible !important; }
          #report-print-area { position: absolute !important; left: 0; top: 0; width: 100%; }
          .report-modal { position: static !important; overflow: visible !important; background: none !important; }
          .report-scroll { max-height: none !important; overflow: visible !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="page-title text-2xl font-bold text-slate-900 dark:text-slate-100">Reports</h1>
            <span className="badge bg-brand-50 dark:bg-brand-900/40 text-brand-700 border border-brand-100 text-[11px] font-bold px-2 py-0.5 rounded-full">
              Module 7 · Report Center
            </span>
          </div>
          <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400 mt-1">
            Reporting on active platform: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{activeChannel.title}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/dashboard/social"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-xs font-bold flex items-center gap-1.5 shadow-xs"
          >
            <span>Switch Active Account</span> <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {/* Platform indicators — the connected/active platform (from ActivePlatformContext) is the ONLY selectable one */}
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
                  ? 'bg-slate-900 dark:bg-slate-700 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60'
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

      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 text-emerald-800 dark:text-emerald-300 rounded-xl p-4 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Report Generator & Export */}
      <div className="card p-6 bg-gradient-to-r from-brand-900 via-slate-900 to-indigo-900 text-white rounded-2xl shadow-lg relative overflow-hidden space-y-5">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-brand-200 text-xs font-semibold">
            <Sparkles size={13} className="text-brand-300" /> Report Generator · Export & Download
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-white">
            Generate Performance Report for {activeChannel.title}
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Consolidates analytics ({fmtNum(metrics.aggregateViews)} views), audience ({fmtNum(metrics.followers)}{' '}
            {activeChannel.followerLabel.toLowerCase()}), growth and revenue ({fmtMoney(metrics.totalRevenue)}) into a
            PDF brief or Excel workbook.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 dark:text-slate-400 mb-1">Report Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-xl border border-white/20 bg-white/10 text-white font-medium focus:outline-none"
              >
                {REPORT_TYPES.map((t) => (
                  <option key={t} value={t} className="text-slate-900 dark:text-slate-100">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 dark:text-slate-400 mb-1">Export Format</label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value)}
                className="w-full text-xs py-2 px-3 rounded-xl border border-white/20 bg-white/10 text-white font-medium focus:outline-none"
              >
                <option value="PDF" className="text-slate-900 dark:text-slate-100">PDF Document</option>
                <option value="XLSX" className="text-slate-900 dark:text-slate-100">Excel Workbook (XLSX)</option>
              </select>
            </div>
          </div>

          {selectedType !== 'Weekly Performance' && (
            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-slate-300 dark:text-slate-400 mb-1">Report Period</label>
              <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl w-fit">
                {['monthly', 'quarterly', 'annual'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setReportPeriod(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                      reportPeriod === p ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-200 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={handleGeneratePreview}
              disabled={generating}
              className="py-2.5 px-5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-60"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Eye size={14} /> Generate & Preview
                </>
              )}
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={generating}
              className="py-2.5 px-5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-60"
            >
              <FileText size={14} /> Download PDF
            </button>
            <button
              onClick={handleDownloadExcel}
              disabled={generating}
              className="py-2.5 px-5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-60"
            >
              <FileSpreadsheet size={14} /> Download Excel
            </button>
          </div>
        </div>
      </div>

      {/* 1. Weekly Performance Report */}
      <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity size={16} className="text-brand-600" /> 1. Weekly Performance Report
          </h2>
          <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-1">
            <Calendar size={11} /> {weekLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 uppercase tracking-wider">
              <Eye size={12} /> Total Views
            </span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{fmtCompact(metrics.aggregateViews)}</p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{fmtNum(metrics.aggregateViews)} across {metrics.count} items</span>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 uppercase tracking-wider">
              <Users size={12} /> New {activeChannel.followerLabel}
            </span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{fmtCompact(metrics.newFollowers)}</p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{fmtNum(metrics.newFollowers)} this period</span>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 uppercase tracking-wider">
              <TrendingUp size={12} /> Engagement Rate
            </span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{metrics.engagementRate}%</p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{fmtNum(metrics.totalLikes)} likes · {fmtNum(metrics.totalComments)} comments</span>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1 uppercase tracking-wider">
              <DollarSign size={12} /> Revenue Earned
            </span>
            <p className="text-2xl font-extrabold text-emerald-600">{fmtMoney(metrics.currentMonthRev)}</p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Current month · all streams</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/50 space-y-2">
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1 uppercase tracking-wider">
              <Award size={12} /> Best Performing Content
            </span>
            {metrics.bestContent ? (
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">{metrics.bestContent.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {fmtCompact(metrics.bestContent.views)} views · {fmtCompact(metrics.bestContent.likes)} likes ·{' '}
                  {fmtCompact(metrics.bestContent.comments)} comments
                </p>
                {metrics.bestContent.published_at && (
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Published {new Date(metrics.bestContent.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">No content available.</p>
            )}
          </div>
          <div className="p-4 rounded-xl border border-brand-200 bg-brand-50/60 dark:bg-brand-900/40 space-y-2">
            <span className="text-[11px] font-semibold text-brand-700 flex items-center gap-1 uppercase tracking-wider">
              <Target size={12} /> Top Performing Platform
            </span>
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0 ${platformMeta?.accentBg || 'bg-slate-900'}`}>
                {platformMeta?.icon ? <platformMeta.icon className="w-4 h-4" /> : <Play size={14} />}
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{platformMeta?.displayName || activeChannel.platformName}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {fmtNum(metrics.followers)} {activeChannel.followerLabel.toLowerCase()} · {metrics.engagementRate}% engagement
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Monthly / Quarterly / Annual Reports */}
      <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <BarChart3 size={16} className="text-brand-600" /> 2. Monthly / Quarterly / Annual Reports
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Analytics summary, growth comparison, revenue summary and audience summary.</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            {['monthly', 'quarterly', 'annual'].map((p) => (
              <button
                key={p}
                onClick={() => setReportPeriod(p)}
className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition ${
                    reportPeriod === p ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Views</span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{currentPeriod ? fmtCompact(currentPeriod.views) : '—'}</p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">{activeChannel.followerLabel}</span>
            <p className="text-lg font-extrabold text-slate-900 dark:text-slate-100">{currentPeriod ? fmtCompact(currentPeriod.followers) : '—'}</p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">New {activeChannel.followerLabel}</span>
            <p className="text-lg font-extrabold text-brand-600">{currentPeriod ? fmtCompact(currentPeriod.newFollowers) : '—'}</p>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Revenue</span>
            <p className="text-lg font-extrabold text-emerald-600">{currentPeriod ? fmtMoney(currentPeriod.revenue) : '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Growth Comparison */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <TrendingUp size={13} className="text-indigo-500" /> Growth Comparison
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={periodData}>
                  <defs>
                    <linearGradient id="growColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => fmtCompact(v)} />
                  <Tooltip formatter={(v, name) => (name === 'Followers' ? fmtNum(v) : v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="followers" name="Followers" stroke="#6366f1" fillOpacity={1} fill="url(#growColor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <DollarSign size={13} className="text-emerald-500" /> Revenue Summary
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${fmtCompact(v)}`} />
                  <Tooltip formatter={(v) => fmtMoney(v)} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="revenue" name="Revenue ($)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Period table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 uppercase font-semibold">
                <th className="py-2.5 px-3">Period</th>
                <th className="py-2.5 px-3">Views</th>
                <th className="py-2.5 px-3">{activeChannel.followerLabel}</th>
                <th className="py-2.5 px-3">New {activeChannel.followerLabel}</th>
                <th className="py-2.5 px-3">Revenue</th>
                <th className="py-2.5 px-3">Engagement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {periodData.map((row) => (
                <tr key={row.period} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100">{row.period}</td>
                  <td className="py-2.5 px-3">{fmtCompact(row.views)}</td>
                  <td className="py-2.5 px-3">{fmtCompact(row.followers)}</td>
                  <td className="py-2.5 px-3 text-brand-600 font-semibold">+{fmtCompact(row.newFollowers)}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">{fmtMoney(row.revenue)}</td>
                  <td className="py-2.5 px-3">{row.engagementRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Audience Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">{activeChannel.followerLabel}</span>
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{fmtCompact(metrics.followers)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">New</span>
            <p className="text-sm font-extrabold text-brand-600">+{fmtCompact(metrics.newFollowers)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Reach</span>
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{fmtCompact(metrics.reach)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Impressions</span>
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{fmtCompact(metrics.impressions)}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Engagement</span>
            <p className="text-sm font-extrabold text-brand-600">{metrics.engagementRate}%</p>
          </div>
        </div>
      </div>

      {/* 3. Report History */}
      <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileText size={16} className="text-brand-600" /> 3. Report History
          </h2>
          <div className="flex items-center gap-2">
            <span className="badge bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold">
              {history.length} report{history.length === 1 ? '' : 's'}
            </span>
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="px-2.5 py-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                title="Clear all report history"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200/80 dark:border-slate-700/80">
                <th className="py-2.5 px-3">Platform</th>
                <th className="py-2.5 px-3">Report Name</th>
                <th className="py-2.5 px-3">Report Type</th>
                <th className="py-2.5 px-3">Generated Date</th>
                <th className="py-2.5 px-3">Report Period</th>
                <th className="py-2.5 px-3">Download Status</th>
                <th className="py-2.5 px-3">Email Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-200">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400 dark:text-slate-500">
                    No reports generated yet. Use the generator above to create your first report.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <td className="py-2.5 px-3">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${platformById[h.platform]?.color || 'bg-slate-300 dark:bg-slate-600'}`} />
                        <span className="text-slate-600 dark:text-slate-300">{h.platformName || h.platform}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {h.format === 'PDF'
                        ? <FileText size={14} className="text-red-500 shrink-0" />
                        : <FileSpreadsheet size={14} className="text-emerald-600 shrink-0" />}
                      <span>{h.name}</span>
                    </td>
                    <td className="py-2.5 px-3">{h.type}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{fmtDateTime(h.generatedAt)}</td>
                    <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">{h.period}</td>
                    <td className="py-2.5 px-3">
                      <span className={`badge text-[10px] font-bold ${h.status === 'Downloaded' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {h.status === 'Downloaded' ? 'Downloaded' : 'Ready'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`badge text-[10px] font-bold ${
                        h.emailStatus === 'sent'
                          ? 'bg-emerald-100 text-emerald-700'
                          : h.emailStatus === 'unavailable'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`} title={h.emailMessage || (h.emailStatus ? `Email ${h.emailStatus}` : 'Email not attempted')}>
                        {h.emailStatus === 'sent' ? 'Emailed'
                          : h.emailStatus === 'unavailable' ? 'Unavailable'
                            : h.emailStatus === 'failed' ? 'Failed'
                              : 'Pending'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => downloadHistoryItem(h)}
                        className="text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 ml-auto"
                      >
                        <Download size={13} /> Download
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Scheduled Report Generation */}
      <div className="card p-5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar size={16} className="text-blue-600" /> 4. Scheduled Report Generation
          </h2>
          <span className="badge bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-semibold flex items-center gap-1">
            <Clock size={11} /> Local schedule preference
          </span>
        </div>



        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700">Enable scheduling</span>
            <input
              type="checkbox"
              checked={schedule.enabled}
              onChange={(e) => setSchedule((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="accent-brand-600"
            />
          </label>
          <div className="p-3 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Frequency</span>
            <select
              value={schedule.frequency}
              onChange={(e) => setSchedule((prev) => ({ ...prev, frequency: e.target.value }))}
              className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none"
            >
              {SCHEDULE_FREQS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Day of period</span>
            <select
              value={schedule.day}
              onChange={(e) => setSchedule((prev) => ({ ...prev, day: e.target.value }))}
              className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none"
            >
              {[1, 5, 10, 15, 20, 25].map((d) => <option key={d} value={String(d)}>{d === 1 ? '1st' : `${d}th`}</option>)}
            </select>
          </div>
          <div className="p-3 rounded-xl border border-slate-200 space-y-1">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase">Format</span>
            <select
              value={schedule.format}
              onChange={(e) => setSchedule((prev) => ({ ...prev, format: e.target.value }))}
              className="w-full text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-white font-medium focus:outline-none"
            >
              <option value="PDF">PDF</option>
              <option value="XLSX">Excel (XLSX)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={saveSchedule} className="btn-primary py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5">
            <Calendar size={13} /> Save Schedule
          </button>
          <span className="text-[10px] text-slate-400">
            Next scheduled run: {schedule.enabled ? `${schedule.frequency.toLowerCase()} report as ${schedule.format}` : 'disabled'}
          </span>
        </div>
      </div>

      {/* ── PDF / Print preview modal ─────────────────────────────── */}
      {previewOpen && (
        <div className="report-modal fixed inset-0 z-50 bg-black/60 p-4 md:p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="report-scroll max-h-[85vh] overflow-auto rounded-2xl">
              <div id="report-print-area" className="bg-white rounded-2xl p-8 space-y-6">
                {/* Creator Information */}
                <div className="border-b border-slate-200 pb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 ${platformMeta?.accentBg || 'bg-slate-900'}`}>
                        {platformMeta?.icon ? <platformMeta.icon className="w-6 h-6" /> : <Play size={22} />}
                      </span>
                      <div>
                        <h2 className="text-xl font-extrabold text-slate-900">{activeChannel.title}</h2>
                        <p className="text-xs text-slate-500">{platformMeta?.displayName} · {activeChannel.custom_url || activeChannel.channel_id || 'Creator account'}</p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 space-y-0.5">
                      <p>Generated {fmtDateTime(new Date().toISOString())}</p>
                      <p>Period: {periodLabel(selectedType)}</p>
                      <p>Type: {selectedType} ({selectedFormat})</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">{activeChannel.followerLabel}</span>
                      <p className="text-base font-extrabold text-slate-900">{fmtCompact(metrics.followers)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Total Views</span>
                      <p className="text-base font-extrabold text-slate-900">{fmtCompact(metrics.accountTotalViews)}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Content</span>
                      <p className="text-base font-extrabold text-slate-900">{metrics.count}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Country</span>
                      <p className="text-base font-extrabold text-slate-900">{activeChannel.country || '—'}</p>
                    </div>
                  </div>
                  {activeChannel.description && (
                    <p className="text-xs text-slate-500 mt-3 leading-relaxed">{activeChannel.description}</p>
                  )}
                </div>

                {/* Analytics Summary */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Analytics Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Recent Views</span>
                      <p className="text-base font-extrabold text-slate-900">{fmtCompact(metrics.aggregateViews)}</p>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">New {activeChannel.followerLabel}</span>
                      <p className="text-base font-extrabold text-brand-600">+{fmtCompact(metrics.newFollowers)}</p>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Engagement Rate</span>
                      <p className="text-base font-extrabold text-slate-900">{metrics.engagementRate}%</p>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Watch Time</span>
                      <p className="text-base font-extrabold text-slate-900">{fmtNum(metrics.watchTimeHours)} hrs</p>
                    </div>
                  </div>
                </div>

                {/* Revenue Summary */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Revenue Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Total Revenue</span>
                      <p className="text-base font-extrabold text-emerald-600">{fmtMoney(metrics.totalRevenue)}</p>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Current Month</span>
                      <p className="text-base font-extrabold text-emerald-600">{fmtMoney(metrics.currentMonthRev)}</p>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Previous Month</span>
                      <p className="text-base font-extrabold text-slate-900">{fmtMoney(metrics.previousMonthRev)}</p>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Growth</span>
                      <p className="text-base font-extrabold text-emerald-600">+{metrics.growthPct}%</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {metrics.sources.map((s) => (
                      <div key={s.name} className="flex items-center justify-between text-xs py-1 border-b border-slate-100">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /> {s.name}
                        </span>
                        <strong className="text-slate-900">{fmtMoney(s.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audience Analytics */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Audience Analytics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">{activeChannel.followerLabel}</span>
                      <p className="text-base font-extrabold text-slate-900">{fmtCompact(metrics.followers)}</p>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Reach</span>
                      <p className="text-base font-extrabold text-slate-900">{fmtCompact(metrics.reach)}</p>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Impressions</span>
                      <p className="text-base font-extrabold text-slate-900">{fmtCompact(metrics.impressions)}</p>
                    </div>
                    <div className="p-3 border border-slate-200 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase">Avg Engagement</span>
                      <p className="text-base font-extrabold text-brand-600">{metrics.engagementRate}%</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase block mb-1">Top Age Groups</span>
                      {(audience?.demographics?.age || []).slice(0, 3).map((a) => (
                        <div key={a.range} className="flex justify-between py-0.5">
                          <span className="text-slate-600">{a.range}</span>
                          <strong className="text-slate-900">{a.percentage}%</strong>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 uppercase block mb-1">Top Countries</span>
                      {(audience?.demographics?.countries || []).slice(0, 3).map((c) => (
                        <div key={c.name} className="flex justify-between py-0.5">
                          <span className="text-slate-600">{c.name}</span>
                          <strong className="text-slate-900">{c.percentage}%</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Growth Analysis */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Growth Analysis</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <th className="py-2 px-3">Period</th>
                          <th className="py-2 px-3">{activeChannel.followerLabel}</th>
                          <th className="py-2 px-3">New {activeChannel.followerLabel}</th>
                          <th className="py-2 px-3">Views</th>
                          <th className="py-2 px-3">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {periodData.map((row) => (
                          <tr key={row.period}>
                            <td className="py-2 px-3 font-bold text-slate-900">{row.period}</td>
                            <td className="py-2 px-3">{fmtCompact(row.followers)}</td>
                            <td className="py-2 px-3">+{fmtCompact(row.newFollowers)}</td>
                            <td className="py-2 px-3">{fmtCompact(row.views)}</td>
                            <td className="py-2 px-3">{fmtMoney(row.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Performance Charts */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2">Performance Charts</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={periodData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => fmtCompact(v)} />
                          <Tooltip formatter={(v) => fmtNum(v)} />
                          <Area type="monotone" dataKey="followers" name="Followers" stroke="#6366f1" fill="#c7d2fe" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={periodData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="period" tick={{ fontSize: 10, fill: '#64748b' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `$${fmtCompact(v)}`} />
                          <Tooltip formatter={(v) => fmtMoney(v)} />
                          <Bar dataKey="revenue" name="Revenue ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 border-t border-slate-200 pt-3">
                  Generated by CreatorIQ Report Center · Data derived from the active {platformMeta?.displayName} dataset.
                  Not an official platform statement.
                </div>
              </div>
            </div>

            {/* Modal actions (hidden on print) */}
            <div className="no-print flex items-center justify-between gap-3 mt-4">
              <button
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-2.5 bg-white text-slate-700 font-bold text-xs rounded-xl shadow-md hover:bg-slate-100 transition"
              >
                Close Preview
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadExcel(selectedType)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <FileSpreadsheet size={14} /> Download Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Small inline info icon.
function InfoIcon() {
  return (
    <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
