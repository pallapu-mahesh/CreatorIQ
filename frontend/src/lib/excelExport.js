import * as XLSX from 'xlsx';

/**
 * Proper .xlsx workbook export for the Reports page.
 *
 * Generates clean tabular data (rows + columns) — NOT a PDF-style layout —
 * so the file opens directly in Microsoft Excel / Google Sheets for further
 * analysis. All values come from the active platform dataset (metrics, videos
 * and audience) via the shared computeReportMetrics output.
 */

const round = (n) => Math.round(n || 0);
const watchHours = (minutes) => {
  if (minutes == null) return null;
  return Number((minutes / 60).toFixed(1));
};
const engagementPct = (likes, comments, followers) =>
  followers > 0 ? Number((((likes || 0) + (comments || 0)) / followers * 100).toFixed(2)) : null;

/**
 * Build the 5-sheet workbook from the active platform dataset.
 */
export function buildReportWorkbook({ accountTitle, platform, metrics, videos, audience }) {
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: accountTitle ? `${accountTitle} — CreatorIQ Report` : 'CreatorIQ Report',
    Subject: platform ? `${platform} report data` : 'Report data',
    Author: 'CreatorIQ',
    Company: 'CreatorIQ',
    CreatedDate: new Date(),
  };
  const followers = metrics?.followers || 0;
  const timeline = audience?.followerGrowth?.timeline || [];

  // ─── 1. Content Performance ───────────────────────────────────────────
  const contentRows = [
    ['Content Title', 'Publish Date', 'Views', 'Likes', 'Comments', 'Shares', 'Saves', 'Watch Time', 'Reach', 'Engagement Rate'],
    ...(videos || []).map((v) => [
      v.title || 'Untitled',
      v.published_at ? new Date(v.published_at).toISOString().slice(0, 10) : '',
      v.views ?? '',
      v.likes ?? '',
      v.comments ?? '',
      v.shares ?? '',
      v.saves ?? '',
      watchHours(v.watch_time_minutes) ?? '',
      v.reach ?? '',
      engagementPct(v.likes, v.comments, followers) ?? '',
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(contentRows), 'Content Performance');

  // ─── 2. Audience Analytics ────────────────────────────────────────────
  const ov = audience?.overview || {};
  const audienceRows = [
    ['Metric', 'Value'],
    ['Total Followers/Subscribers', ov.totalFollowers ?? followers],
    ['New Followers/Subscribers', ov.newFollowers ?? ''],
    ['Monthly Growth (%)', ov.monthlyFollowerGrowth ?? ''],
    ['Audience Reach', ov.reach ?? ''],
    ['Impressions', ov.impressions ?? ''],
    ['Average Engagement Rate (%)', ov.avgEngagementRate ?? ''],
    ['Top Age Group', audience?.demographics?.age?.[0] ? `${audience.demographics.age[0].range} (${audience.demographics.age[0].percentage}%)` : ''],
    ['Top Country', audience?.demographics?.countries?.[0] ? `${audience.demographics.countries[0].name} (${audience.demographics.countries[0].percentage}%)` : ''],
    ['Top City', audience?.demographics?.topCities?.[0] ? `${audience.demographics.topCities[0].name} (${audience.demographics.topCities[0].percentage}%)` : ''],
    ['Mobile Devices (%)', audience?.devices?.mobile ?? ''],
    ['Desktop Devices (%)', audience?.devices?.desktop ?? ''],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(audienceRows), 'Audience Analytics');

  // ─── Period rows shared by Growth / Revenue / Monthly Statistics ──────
  const periodRows = timeline.length > 0
    ? timeline.map((m, idx) => {
      const weight = followers > 0 ? (m.followers || 0) / followers : 0;
      const previousFollowers = idx > 0 ? timeline[idx - 1].followers : ((m.followers || 0) - (m.newFollowers || 0));
      const growthBase = previousFollowers > 0 ? previousFollowers : (m.followers || 0);
      return {
        period: m.date,
        followers: m.followers || 0,
        newFollowers: m.newFollowers || 0,
        views: round((metrics?.aggregateViews || 0) * weight),
        watchTimeHours: round((metrics?.watchTimeHours || 0) * weight),
        reach: round((metrics?.reach || 0) * weight),
        growthPct: growthBase > 0 ? Number(((m.newFollowers || 0) / growthBase * 100).toFixed(2)) : 0,
        engagement: metrics?.engagementRate ?? '',
        adRevenue: round((metrics?.adRevenueEst || 0) * weight),
        sponsorshipRevenue: round((metrics?.totalSponsorshipRev || 0) * weight),
        affiliateRevenue: round((metrics?.totalAffiliateRev || 0) * weight),
        subscriptionRevenue: round((metrics?.monthlySubRev || 0) * 6 * weight),
        collabRevenue: round((metrics?.totalCollabRev || 0) * weight),
      };
    })
    : [{
      period: 'Current',
      followers,
      newFollowers: ov.newFollowers ?? 0,
      views: metrics?.aggregateViews || 0,
      watchTimeHours: metrics?.watchTimeHours || 0,
      reach: metrics?.reach || 0,
      growthPct: ov.monthlyFollowerGrowth ?? 0,
      engagement: metrics?.engagementRate ?? '',
      adRevenue: metrics?.adRevenueEst || 0,
      sponsorshipRevenue: metrics?.totalSponsorshipRev || 0,
      affiliateRevenue: metrics?.totalAffiliateRev || 0,
      subscriptionRevenue: (metrics?.monthlySubRev || 0) * 6,
      collabRevenue: metrics?.totalCollabRev || 0,
    }];

  // ─── 3. Growth Analytics ──────────────────────────────────────────────
  const growthRows = [
    ['Period', 'Followers/Subscribers', 'Views', 'Watch Time', 'Engagement', 'Growth Percentage'],
    ...periodRows.map((p) => [
      p.period,
      p.followers,
      p.views,
      p.watchTimeHours,
      p.engagement,
      p.growthPct,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(growthRows), 'Growth Analytics');

  // ─── 4. Revenue Analytics ─────────────────────────────────────────────
  const revenueRows = [
    ['Period', 'Advertisement Revenue', 'Sponsorship Revenue', 'Affiliate Revenue', 'Subscription Revenue', 'Brand Collaboration Revenue', 'Total Revenue'],
    ...periodRows.map((p) => {
      const total = p.adRevenue + p.sponsorshipRevenue + p.affiliateRevenue + p.subscriptionRevenue + p.collabRevenue;
      return [p.period, p.adRevenue, p.sponsorshipRevenue, p.affiliateRevenue, p.subscriptionRevenue, p.collabRevenue, total];
    }),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(revenueRows), 'Revenue Analytics');

  // ─── 5. Monthly Statistics ────────────────────────────────────────────
  const statsRows = [
    ['Month', 'Views', 'Followers/Subscribers', 'Engagement', 'Reach', 'Revenue'],
    ...periodRows.map((p) => [
      p.period,
      p.views,
      p.followers,
      p.engagement,
      p.reach,
      p.adRevenue + p.sponsorshipRevenue + p.affiliateRevenue + p.subscriptionRevenue + p.collabRevenue,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(statsRows), 'Monthly Statistics');

  return wb;
}

/**
 * Serialize the workbook to a real .xlsx Blob (used for download + email).
 */
export function buildReportXlsxBlob({ accountTitle, platform, metrics, videos, audience }) {
  const wb = buildReportWorkbook({ accountTitle, platform, metrics, videos, audience });
  const data = XLSX.write(wb, { bookType: 'xlsx', type: 'array', compression: true });
  const blob = new Blob([data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const fileName = `creatoriq_${platform || 'report'}_report_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return { blob, fileName };
}

/**
 * Serialize the workbook to a real .xlsx file and trigger a download.
 */
export function downloadReportXlsx(opts) {
  const { blob, fileName } = buildReportXlsxBlob(opts);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { blob, fileName };
}
