// Shared report data utilities.
//
// Single source of truth for metrics, performance alerts and revenue
// notifications that are derived from the active platform dataset. Both the
// Reports page (report content) and the Notifications page (derived
// notifications) read from here so figures never diverge.

// User-managed revenue records — identical to the Revenue Analytics page so
// all revenue figures reported here match that module.
export const DEFAULT_SPONSORSHIPS = [
  { id: 1, brand: 'TechGear Pro', campaign: 'Summer Tech Showcase 2026', amount: 4500 },
  { id: 2, brand: 'CloudDev Studio', campaign: 'Backend Framework Integration', amount: 3200 },
];
export const DEFAULT_COLLABS = [
  { id: 1, revenue: 6000 },
  { id: 2, revenue: 3500 },
];
export const DEFAULT_AFFILIATES = [
  { id: 1, revenue: 852 },
  { id: 2, revenue: 1176 },
];

const fmtMoney = (n) => (n == null ? '—' : `$${Number(n).toLocaleString()}`);

/**
 * Compute all report metrics for the active platform. Values are derived
 * exclusively from the ActivePlatform context (activeChannel + videos +
 * audience) using the same formulas as the existing analytics modules.
 */
export function computeReportMetrics(activeChannel, videos, audience) {
  if (!activeChannel) return null;

  const subs = activeChannel.subscribers_count || 0;
  const accountTotalViews = activeChannel.total_views || 0;
  const count = videos.length;

  const aggregateViews = count > 0
    ? videos.reduce((acc, v) => acc + (v.views || 0), 0)
    : accountTotalViews;
  const totalLikes = count > 0
    ? videos.reduce((acc, v) => acc + (v.likes || 0), 0)
    : Math.round(accountTotalViews * 0.04);
  const totalComments = count > 0
    ? videos.reduce((acc, v) => acc + (v.comments || 0), 0)
    : Math.round(accountTotalViews * 0.005);
  const totalShares = count > 0 ? videos.reduce((acc, v) => acc + (v.shares || 0), 0) : 0;
  const totalSaves = count > 0 ? videos.reduce((acc, v) => acc + (v.saves || 0), 0) : 0;
  const watchTimeHours = count > 0
    ? Number((videos.reduce((acc, v) => acc + (v.watch_time_minutes || (v.views ? v.views * 2.5 : 0)), 0) / 60).toFixed(1))
    : 0;

  // Audience values must match the Audience Analytics module.
  const ov = audience?.overview || {};
  const followers = ov.totalFollowers ?? subs;
  const newFollowers = ov.newFollowers ?? null;
  const reach = ov.reach ?? null;
  const impressions = ov.impressions ?? null;
  const engagementRate = ov.avgEngagementRate ?? audience?.engagement?.engagementRate ?? null;

  // Revenue values must match the Revenue Analytics module.
  const adRevenueEst = Number((accountTotalViews * 0.0022).toFixed(2));
  const monthlyAdRevenueEst = Number((adRevenueEst / 12).toFixed(2));
  const totalSponsorshipRev = DEFAULT_SPONSORSHIPS.reduce((acc, s) => acc + s.amount, 0);
  const totalCollabRev = DEFAULT_COLLABS.reduce((acc, c) => acc + c.revenue, 0);
  const totalAffiliateRev = DEFAULT_AFFILIATES.reduce((acc, a) => acc + a.revenue, 0);
  const estMembershipsCount = Math.round(followers * 0.008);
  const monthlySubRev = Math.round(estMembershipsCount * 4.99);
  const totalRevenue = Math.round(adRevenueEst + totalSponsorshipRev + totalCollabRev + totalAffiliateRev + monthlySubRev * 6);
  const currentMonthRev = Math.round(monthlyAdRevenueEst + totalSponsorshipRev * 0.4 + monthlySubRev);
  const previousMonthRev = Math.round(currentMonthRev * 0.88);
  const growthPct = previousMonthRev > 0
    ? Number((((currentMonthRev - previousMonthRev) / previousMonthRev) * 100).toFixed(1))
    : 13.6;

  const sources = [
    { name: 'Sponsorships', amount: totalSponsorshipRev, color: '#6366f1' },
    { name: 'AdSense / Platform Ads', amount: adRevenueEst, color: '#ef4444' },
    { name: 'Brand Collaborations', amount: totalCollabRev, color: '#10b981' },
    { name: 'Affiliate Marketing', amount: totalAffiliateRev, color: '#f59e0b' },
    { name: 'Subscriptions & Memberships', amount: monthlySubRev * 6, color: '#8b5cf6' },
  ].sort((a, b) => b.amount - a.amount);

  const bestContent = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0))[0] || null;

  return {
    followers,
    newFollowers,
    reach,
    impressions,
    engagementRate,
    subs,
    accountTotalViews,
    aggregateViews,
    totalLikes,
    totalComments,
    totalShares,
    totalSaves,
    watchTimeHours,
    count,
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
    highestSource: sources[0],
    sources,
    bestContent,
  };
}

/**
 * Performance alerts derived from active platform data.
 * Used by the centralized Notifications page (not shown inside Reports).
 */
export function buildPerformanceAlerts(metrics, activeChannel) {
  if (!metrics || !activeChannel) return [];
  const alerts = [];

  const views = metrics.aggregateViews;
  if (views >= 100000) {
    alerts.push({ type: 'views', title: 'View Milestone Reached', details: `${activeChannel.title} crossed ${views.toLocaleString()} total views across ${metrics.count} recent items.` });
  } else if (views >= 50000) {
    alerts.push({ type: 'views', title: 'View Milestone Approaching', details: `Currently at ${views.toLocaleString()} views — the 100K milestone is within reach.` });
  } else {
    alerts.push({ type: 'views', title: 'View Growth Tracking', details: `Total recent views: ${views.toLocaleString()}. Keep posting to reach the next milestone.` });
  }

  if (metrics.growthPct > 0) {
    alerts.push({ type: 'engagement', title: 'Engagement Increased', details: `Engagement rose +${metrics.growthPct}% month over month (${metrics.engagementRate}% average engagement rate).` });
  } else {
    alerts.push({ type: 'engagement', title: 'Engagement Steady', details: `Average engagement rate is ${metrics.engagementRate}% across recent content.` });
  }

  const f = metrics.followers;
  if (f >= 100000) {
    alerts.push({ type: 'followers', title: `${activeChannel.followerLabel} Milestone Reached`, details: `Hit ${f.toLocaleString()} ${activeChannel.followerLabel.toLowerCase()} on ${activeChannel.title}.` });
  } else {
    alerts.push({ type: 'followers', title: `${activeChannel.followerLabel} Milestone`, details: `${activeChannel.followerLabel} count is at ${f.toLocaleString()}.` });
  }

  if (metrics.bestContent) {
    alerts.push({
      type: 'content',
      title: 'Content Outperformed Previous',
      details: `"${metrics.bestContent.title}" is the top performer with ${metrics.bestContent.views.toLocaleString()} views — ahead of your average.`,
    });
  }

  return alerts;
}

/**
 * Revenue notifications derived from revenue data.
 * Used by the centralized Notifications page (not shown inside Reports).
 */
export function buildRevenueNotifications(metrics) {
  if (!metrics) return [];
  const topSponsorship = [...DEFAULT_SPONSORSHIPS].sort((a, b) => b.amount - a.amount)[0];
  return [
    { type: 'sponsorship', title: 'Sponsorship Payment Received', details: `${topSponsorship.brand} sponsorship payment of $${topSponsorship.amount.toLocaleString()} recorded for "${topSponsorship.campaign}".` },
    { type: 'affiliate', title: 'Affiliate Commission Updated', details: `Affiliate commissions total $${metrics.totalAffiliateRev.toLocaleString()} across ${DEFAULT_AFFILIATES.length} affiliate programs.` },
    { type: 'report', title: 'Monthly Revenue Report Generated', details: `Latest revenue snapshot: ${fmtMoney(metrics.currentMonthRev)} this month (${fmtMoney(metrics.totalRevenue)} all-time).` },
    { type: 'milestone', title: 'Revenue Milestone Achieved', details: `Total estimated revenue reached ${fmtMoney(metrics.totalRevenue)} across all active streams.` },
    { type: 'growth', title: 'Revenue Growth Notification', details: `Revenue grew +${metrics.growthPct}% vs previous month. Top stream: ${metrics.highestSource.name} (${fmtMoney(metrics.highestSource.amount)}).` },
  ];
}
