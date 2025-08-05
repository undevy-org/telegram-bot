// telegram-bot/analytics.js

const { ANALYTICS_CHECK_INTERVAL, EMOJI } = require('./config/constants');
const { escapeMarkdown } = require('./utils/format');
const { getContent } = require('./services/api');
const {
  getRecentVisits,
  extractAccessCode,
  extractVisitedPages,
  formatVisitData,
} = require('./services/matomo');

/**
 * Analytics Monitor Class
 * Tracks portfolio visits and sends notifications to admin
 * Uses visitId tracking instead of timestamps to ensure no visits are missed
 */
class AnalyticsMonitor {
  constructor(bot, adminUserId) {
    this.bot = bot;
    this.adminUserId = adminUserId;
    
    // Store IDs of visits we've already notified about
    this.notifiedVisitIds = new Set();
    
    // Track if monitoring is active
    this.isRunning = false;
    this.checkTimer = null;

    // Statistics for debugging
    // FIX 1: Initialize lastCheckTime to a valid date to prevent startup crash.
    // Set it to 1 hour ago to fetch recent visits on the first run.
    const initialCheckTime = new Date(Date.now() - 60 * 60 * 1000);

    this.stats = {
      checksPerformed: 0,
      notificationsSent: 0,
      lastCheckTime: initialCheckTime,
      errors: 0
    };

    console.log('[ANALYTICS] Monitor initialized for user:', adminUserId);
  }

  /**
   * Start the monitoring loop
   */
  start() {
    if (this.isRunning) {
      console.log('[ANALYTICS] Monitor already running');
      return;
    }

    this.isRunning = true;
    
    // Perform immediate check
    this.checkVisits().then(() => {
      console.log('[ANALYTICS] Initial check completed');
    });
    
    // Set up interval for regular checks
    this.checkTimer = setInterval(() => {
      this.checkVisits();
    }, ANALYTICS_CHECK_INTERVAL);
    
    console.log('[ANALYTICS] Monitor started with interval:', ANALYTICS_CHECK_INTERVAL / 1000, 'seconds');
  }

  /**
   * Stop the monitoring loop
   */
  stop() {
    if (!this.isRunning) {
      console.log('[ANALYTICS] Monitor already stopped');
      return;
    }

    clearInterval(this.checkTimer);
    this.isRunning = false;
    console.log('[ANALYTICS] Monitor stopped');
  }

  /**
   * Main method that checks for new visits and sends notifications
   */
  async checkVisits() {
    const checkStartTime = new Date();
    console.log('[ANALYTICS] Starting visit check at:', checkStartTime.toISOString());
    try {
      // FIX 2: Corrected logic for fetching visits and updating check time.
      // Update checksPerformed counter at the beginning.
      this.stats.checksPerformed++;
      
      // Log the time window for debugging
      const since = this.stats.lastCheckTime.toISOString();
      const nowIso = checkStartTime.toISOString();
      console.log('[ANALYTICS] Checking for visits between:', since, 'and', nowIso);
      
      // Fetch recent visits since the last successful check.
      const visits = await getRecentVisits(since, nowIso);
      
    console.log(`[ANALYTICS] Fetched ${visits.length} visits from Matomo since ${since}`);
      console.log('[ANALYTICS] Raw API response (first 2 visits):', JSON.stringify(visits.slice(0, 2), null, 2));

      // IMPORTANT: Update last check time only AFTER a successful fetch.
      this.stats.lastCheckTime = checkStartTime;

      // Load content.json to get company names
      const contentData = await getContent();
      const content = contentData?.content; // Adjust based on actual getContent return structure
      console.log('[ANALYTICS] Loaded content.json, has ', !!content);

      // Process each visit
      let newVisitsCount = 0;
      if (!visits || visits.length === 0) {
        console.log('[ANALYTICS] No visits to process');
      } else {
      for (const visit of visits) {
          console.log('[ANALYTICS] Processing visit ID:', visit.idVisit);
          
        // Skip if we've already notified about this visit
        if (this.notifiedVisitIds.has(visit.idVisit)) {
            console.log('[ANALYTICS] Skipping visit ID (already notified):', visit.idVisit);
          continue;
        }
        
        // Extract visit data
      const accessCode = extractAccessCode(visit);
      const visitedPages = extractVisitedPages(visit);

          console.log(`[ANALYTICS] Extracted data for visit ${visit.idVisit}:`, {
        accessCode: accessCode,
            pagesCount: visitedPages.length,
          time: visit.serverTimestamp ? new Date(visit.serverTimestamp * 1000).toLocaleTimeString() : 'Unknown',
          location: `${visit.country || 'Unknown'}, ${visit.city || 'Unknown'}`
        });
        
        // Mark as processed immediately to avoid duplicates
        this.notifiedVisitIds.add(visit.idVisit);
        newVisitsCount++;
        
      // Skip visits without access code or pages
      if (!accessCode || visitedPages.length === 0) {
        console.log('[ANALYTICS] Skipping visit (no access code or pages)');
          continue;
        }
        
        // Look up company name from content.json
      let companyName = 'Unknown Company';
          console.log('[ANALYTICS] Looking up content for code:', accessCode);
      if (content && content[accessCode]) {
        companyName = content[accessCode].meta?.company || 'Unknown Company';
        console.log('[ANALYTICS] Found company:', companyName);
      } else {
            console.log('[ANALYTICS] No profile found for code:', accessCode, '. Available keys:', Object.keys(content || {}));
      }
      
      // Format pages list using escapeMarkdown utility
      const pagesList = visitedPages
            .map(page => `  • ${escapeMarkdown(page)}`)
        .join('\n');

      // Determine visit duration
      const duration = visit.visitDurationPretty || '0s';
      
      // Check if it's a high engagement visit
      const isHighEngagement = visit.actions > 5 || visit.visitDuration > 120;

      // Build notification message with enhanced formatting
      // Use escapeMarkdown for ALL dynamic content to prevent parsing errors
      let message = `📊 **New Portfolio Visit\\!**\n`;
        message += `👤 Company: **${escapeMarkdown(companyName)}**\n`;
        message += `🔑 Code: **${escapeMarkdown(accessCode)}**\n`;
        message += `🕐 Time: ${escapeMarkdown(visit.serverTimestamp ? new Date(visit.serverTimestamp * 1000).toLocaleTimeString() : 'Unknown')}\n`;
        message += `📍 Location: ${escapeMarkdown(visit.country || 'Unknown')}, ${escapeMarkdown(visit.city || 'Unknown')}\n`;
        message += `📱 Device: ${escapeMarkdown(visit.deviceType || 'Unknown')} KATEX_INLINE_OPEN${escapeMarkdown(visit.browserName || 'Unknown')}KATEX_INLINE_CLOSE\n`;
        message += `📄 Pages visited KATEX_INLINE_OPEN${visitedPages.length}KATEX_INLINE_CLOSE:\n`;
        if (pagesList) {
            message += `${pagesList}\n`;
        }
        message += `⏱️ Duration: ${escapeMarkdown(duration)}`;
        if (isHighEngagement) {
            message += `\n🔥 **High engagement**`;
        }
        
        // Send notification
        try {
        await this.bot.api.sendMessage(this.adminUserId, message, {
            parse_mode: 'MarkdownV2'
          });
          this.stats.notificationsSent++;
            console.log('[ANALYTICS] Notification sent successfully for visit:', visit.idVisit);
          
          // Small delay between notifications to avoid rate limits
            if (newVisitsCount < visits.length) { // Only delay if there are more visits to process
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
            console.error('[ANALYTICS] Failed to send notification for visit:', visit.idVisit, error);
          // Don't throw - continue processing other visits
          }
        }
      }
      
      // Clean up old visit IDs periodically (keep last 1000)
      if (this.notifiedVisitIds.size > 1000) {
        const idsArray = Array.from(this.notifiedVisitIds);
        const idsToKeep = idsArray.slice(-1000);
        this.notifiedVisitIds = new Set(idsToKeep);
        console.log('[ANALYTICS] Cleaned up old visit IDs, kept last 1000');
      }
      
      // Log summary
      if (newVisitsCount > 0) {
        console.log(`[ANALYTICS] Check completed: ${newVisitsCount} new visits found and processed`);
      } else {
        console.log('[ANALYTICS] Check completed: no new visits');
      }
    } catch (error) {
      this.stats.errors++;
      console.error('[ANALYTICS] Error during visit check:', error);
      console.error('[ANALYTICS] Error stack:', error.stack);
      
      // If error is related to API, maybe we should notify admin
      if (this.stats.errors > 5) {
        try {
          await this.bot.api.sendMessage(
            this.adminUserId,
            `⚠️ Analytics monitoring is experiencing errors\\. ` +
            `Please check the logs\\. Errors: ${this.stats.errors}`,
            { parse_mode: 'MarkdownV2' }
          );
          // Reset error counter after notification
          this.stats.errors = 0;
          console.log('[ANALYTICS] Sent error notification to admin');
        } catch (notifyError) {
          console.error('[ANALYTICS] Failed to send error notification:', notifyError);
        }
      }
    }
  }

  /**
   * Build formatted notification message for a visit
   */
  buildNotificationMessage(visitData, companyName) {
    // Format pages list with proper escaping
    const pagesList = visitData.pages
      .map(page => `  • ${escapeMarkdown(page)}`)
      .join('\n');
    
    // Build message parts
    const parts = [
    `${EMOJI.ANALYTICS} \\*New Portfolio Visit\\!*`,
      '',
    `👤 \\*Company:\\* ${escapeMarkdown(companyName)}`,
    `🔑 \\*Code:\\* \`${escapeMarkdown(visitData.accessCode)}\``,
    `🕐 \\*Time:\\* ${escapeMarkdown(visitData.timePretty)}`,
    `📍 \\*Location:\\* ${escapeMarkdown(visitData.country)}${visitData.city !== 'Unknown' ? ', ' + escapeMarkdown(visitData.city) : ''}`,
    `📱 Device: ${escapeMarkdown(visitData.device || 'Unknown')} \KATEX_INLINE_OPEN${escapeMarkdown(visitData.browser || 'Unknown')}\KATEX_INLINE_CLOSE`,
      '',
    `📄 \\*Pages visited \KATEX_INLINE_OPEN${visitData.pages.length}\KATEX_INLINE_CLOSE:\\*`,
      pagesList
    ];
    
    // Add visit duration if available
    if (visitData.duration !== '0s') {
      parts.push('');
    parts.push(`⏱️ \\*Duration:\\* ${escapeMarkdown(visitData.duration)}`);
    }
    
    // Add special indicators
    const indicators = [];
  if (visitData.isFirstVisit) indicators.push('🆕 First visit');
  if (visitData.actionCount === 1) indicators.push('⚡ Bounced');
  else if (visitData.actionCount > 10) indicators.push('🔥 High engagement');
    if (indicators.length > 0) {
      parts.push('');
      parts.push(indicators.map(i => escapeMarkdown(i)).join(' \\| '));
    }
    
    return parts.join('\n');
  }

  /**
   * Get monitoring statistics
   */
  getStats() {
    return {
      ...this.stats,
      notifiedVisitsCount: this.notifiedVisitIds.size,
      isRunning: this.isRunning
    };
  }

  /**
   * Force check for new visits (called by /analytics command)
   */
  async forceCheck() {
    console.log('[ANALYTICS] Force check requested');
    await this.checkVisits();
  }

  /**
   * Clear all notified visit IDs (useful for testing)
   */
  clearHistory() {
    const count = this.notifiedVisitIds.size;
    this.notifiedVisitIds.clear();
    console.log(`[ANALYTICS] Cleared ${count} visit IDs from history`);
    return count;
  }
}

module.exports = AnalyticsMonitor;
