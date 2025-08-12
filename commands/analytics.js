const { EMOJI } = require('../config/constants');
const { escapeMarkdown, formatDate } = require('../utils/format');
const { getRecentVisits, testConnection, formatVisitData, extractAccessCode } = require('../services/matomo');
const { withErrorHandling } = require('../handlers/errors');

// Analytics monitor instance (will be set from main bot.js)
let analyticsMonitor = null;

/**
 * Sets the analytics monitor instance
 * Called from main bot.js during initialization
 */
function setAnalyticsMonitor(monitor) {
  analyticsMonitor = monitor;
}

/**
 * Handles /analytics command
 * Forces immediate check for new visits
 */
const handleAnalytics = withErrorHandling(async (ctx) => {
  if (!analyticsMonitor) {
    return await ctx.reply(`${EMOJI.ERROR} Analytics monitor not initialized.`);
  }
  
  await ctx.reply(`${EMOJI.LOADING} Checking for recent visits...`);
  
  // Force immediate check by setting last check time to 1 hour ago
  analyticsMonitor.lastCheckTime = new Date(Date.now() - 60 * 60 * 1000);
  await analyticsMonitor.checkVisits();
  
  await ctx.reply(`${EMOJI.SUCCESS} Analytics check completed`);
});

/**
 * Handles /analytics_stop command
 * Stops automatic monitoring
 */
const handleAnalyticsStop = withErrorHandling(async (ctx) => {
  if (!analyticsMonitor) {
    return await ctx.reply(`${EMOJI.ERROR} Analytics monitor not initialized.`);
  }
  
  analyticsMonitor.stop();
  await ctx.reply(`🛑 Analytics monitoring stopped`);
});

/**
 * Handles /analytics_start command
 * Starts automatic monitoring
 */
const handleAnalyticsStart = withErrorHandling(async (ctx) => {
  if (!analyticsMonitor) {
    return await ctx.reply(`${EMOJI.ERROR} Analytics monitor not initialized.`);
  }
  
  analyticsMonitor.start();
  await ctx.reply(`▶️ Analytics monitoring started`);
});

/**
 * Handles /analytics_stats command
 * Shows monitoring statistics
 */
const handleAnalyticsStats = withErrorHandling(async (ctx) => {
  if (!analyticsMonitor) {
    return await ctx.reply(`${EMOJI.ERROR} Analytics monitor not initialized.`);
  }
  
  const stats = analyticsMonitor.getStats();
  
  const message = [
    `${EMOJI.ANALYTICS} *Analytics Monitor Statistics*`,
    '',
    `Status: ${stats.isRunning ? '🟢 Running' : '🔴 Stopped'}`,
    `Checks performed: ${stats.checksPerformed}`,
    `Notifications sent: ${stats.notificationsSent}`,
    `Tracked visits: ${stats.notifiedVisitsCount}`,
    `Errors: ${stats.errors}`,
    '',
    stats.lastCheckTime 
      ? `Last check: ${escapeMarkdown(formatDate(stats.lastCheckTime))}`
      : 'Last check: Never'
  ].join('\n');
  
  await ctx.reply(message, { parse_mode: 'MarkdownV2' });
});

/**
 * Handles /analytics_clear command
 * Clears visit history (for debugging)
 */
const handleAnalyticsClear = withErrorHandling(async (ctx) => {
  if (!analyticsMonitor) {
    return await ctx.reply(`${EMOJI.ERROR} Analytics monitor not initialized.`);
  }
  
  const clearedCount = analyticsMonitor.clearHistory();
  
  await ctx.reply(
    `${EMOJI.SUCCESS} Cleared ${clearedCount} visits from history\\. ` +
    `Next check will re\\-notify about all visits\\.`,
    { parse_mode: 'MarkdownV2' }
  );
});

/**
 * Handles /recent_visits command
 * Shows last 5 visits with details
 */
const handleRecentVisits = withErrorHandling(async (ctx) => {
  await ctx.reply(`${EMOJI.ANALYTICS} Fetching recent visits...`);
  
  const visits = await getRecentVisits(5);
  
  if (!visits || visits.length === 0) {
    return await ctx.reply(`${EMOJI.INFO} No visits found today.`);
  }
  
  for (const visit of visits) {
    const visitData = formatVisitData(visit);
    
    let message = visitData.accessCode 
      ? `${EMOJI.VISIT} *Visit with code:* \`${escapeMarkdown(visitData.accessCode)}\`\n`
      : `${EMOJI.ANONYMOUS} *Anonymous visit*\n`;
    
    message += `🕐 ${escapeMarkdown(formatDate(visitData.timestamp))}\n`;
    message += `📍 ${escapeMarkdown(visitData.country)}, ${escapeMarkdown(visitData.city)}\n`;
    message += `📱 ${escapeMarkdown(visitData.device)} \\(${escapeMarkdown(visitData.browser)}\\)\n`;
    
    if (visitData.pages.length > 0) {
      const pagesStr = visitData.pages.map(p => escapeMarkdown(p)).join(' → ');
      message += `📄 ${pagesStr}\n`;
    }
    
    message += `⏱️ ${escapeMarkdown(visitData.duration)}\n`;
    
    if (visitData.isFirstVisit && visitData.actionCount <= 1) {
      message += `\n⚡ \\(First time visitor, bounced\\)`;
    }
    
    message += '\n━━━━━━━━━━━━━━━━━━━';
    
    await ctx.reply(message, { parse_mode: 'MarkdownV2' });
  }
  
  await ctx.reply(`${EMOJI.SUCCESS} That's all for today!`);
});

/**
 * Handles /test_matomo command
 * Tests Matomo API connection
 */
const handleTestMatomo = withErrorHandling(async (ctx) => {
  await ctx.reply(`🔍 Testing Matomo API connection...`);
  
  const siteInfo = await testConnection();
  
  if (siteInfo && siteInfo.name) {
    await ctx.reply(
      `${EMOJI.SUCCESS} Matomo API works!\n\n` +
      `Site name: ${siteInfo.name}\n` +
      `Site ID: ${siteInfo.idsite || 'Unknown'}`
    );
  } else {
    await ctx.reply(`${EMOJI.WARNING} Got response but unexpected format`);
  }
});

/**
 * Handles /debug_visits command
 * Shows raw visit data for debugging
 */
const handleDebugVisits = withErrorHandling(async (ctx) => {
  await ctx.reply(`🔍 Fetching raw visit data...`);
  
  const visits = await getRecentVisits(3);
  
  if (!visits || visits.length === 0) {
    return await ctx.reply(`${EMOJI.INFO} No visits found today.`);
  }
  
  let message = `Found ${visits.length} visits:\n\n`;
  
  visits.forEach((visit, index) => {
    message += `Visit ${index + 1}:\n`;
    message += `- ID: ${visit.idVisit}\n`;
    message += `- Server time: ${visit.serverTimePretty}\n`;
    message += `- Timestamp: ${new Date(visit.serverTimestamp * 1000).toISOString()}\n`;
    message += `- Custom dims: ${JSON.stringify(visit.customDimensions || {})}\n`;
    message += `- Actions: ${visit.actions}\n`;
    message += `- Country: ${visit.country}\n`;
    message += `- Device: ${visit.deviceType}\n\n`;
  });
  
  // Truncate if too long
  if (message.length > 4000) {
    message = message.substring(0, 4000) + '\n\n(Message truncated)';
  }
  
  await ctx.reply(message);
});

/**
 * Handles /debug_dimensions command
 * Shows raw custom dimensions data
 */
const handleDebugDimensions = withErrorHandling(async (ctx) => {
  await ctx.reply(`🔍 Fetching visits with custom dimensions...`);
  
  const visits = await getRecentVisits(3);
  
  if (!visits || visits.length === 0) {
    return await ctx.reply(`${EMOJI.INFO} No visits found today.`);
  }
  
  let message = `**Custom Dimensions Debug:**\n\n`;
  
  visits.forEach((visit, index) => {
    message += `**Visit ${index + 1}:**\n`;
    
    // Show raw customDimensions data
    if (visit.customDimensions) {
      message += `CustomDimensions exists: YES\n`;
      message += `Type: ${typeof visit.customDimensions}\n`;
      message += `Is Array: ${Array.isArray(visit.customDimensions)}\n`;
      message += `Raw data: ${JSON.stringify(visit.customDimensions, null, 2)}\n`;
    } else {
      message += `CustomDimensions exists: NO\n`;
    }
    
    // Also check customVariables
    if (visit.customVariables) {
      message += `CustomVariables exists: YES\n`;
      message += `Data: ${JSON.stringify(visit.customVariables, null, 2)}\n`;
    }
    
    // Show what we extract
    const extractedCode = extractAccessCode(visit);
    message += `Extracted code: ${extractedCode || 'NONE'}\n`;
    
    // Show first action URL
    const firstAction = visit.actionDetails?.[0];
    if (firstAction?.url) {
      message += `First URL: ${firstAction.url}\n`;
    }
    
    message += `\n---\n\n`;
  });
  
  // Truncate if too long
  if (message.length > 3500) {
    message = message.substring(0, 3500) + '\n\n(Truncated)';
  }
  
  await ctx.reply(message);
});

module.exports = {
  setAnalyticsMonitor,
  handleAnalytics,
  handleAnalyticsStop,
  handleAnalyticsStart,
  handleAnalyticsStats,
  handleAnalyticsClear,
  handleRecentVisits,
  handleTestMatomo,
  handleDebugVisits,
  handleDebugDimensions
};