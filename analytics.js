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
    this.stats = {
      checksPerformed: 0,
      notificationsSent: 0,
      lastCheckTime: null,
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
      // Update statistics
      this.stats.checksPerformed++;
      this.stats.lastCheckTime = checkStartTime;
      
      // Fetch recent visits (last 100 to ensure we don't miss any)
      const visits = await getRecentVisits(100);
      console.log(`[ANALYTICS] Fetched ${visits.length} visits from Matomo`);

      // Load content.json to get company names
      const { content } = await getContent();
      console.log('[ANALYTICS] Loaded content.json');

      // Process each visit
      let newVisitsCount = 0;

      for (const visit of visits) {
        // Skip if we've already notified about this visit
        if (this.notifiedVisitIds.has(visit.idVisit)) {
          continue;
        }
        
        // Extract visit data
        const visitData = formatVisitData(visit);

        console.log(`[ANALYTICS] Processing new visit ${visit.idVisit}:`, {
          accessCode: visitData.accessCode,
          pages: visitData.pages.length,
          time: visitData.timePretty,
          location: `${visitData.country}, ${visitData.city}`
        });
        
        // Mark as processed immediately to avoid duplicates
        this.notifiedVisitIds.add(visit.idVisit);
        newVisitsCount++;
        
        // Skip visits without access code
        if (!visitData.accessCode) {
          console.log('[ANALYTICS] Skipping anonymous visit (no access code)');
          continue;
        }
        
        // Skip visits with no pages (shouldn't happen, but just in case)
        if (visitData.pages.length === 0) {
          console.log('[ANALYTICS] Skipping visit with no pages');
          continue;
        }
        
        // Look up company name from content.json
        const profile = content[visitData.accessCode];
        const companyName = profile?.meta?.company || 'Unknown Company';

        console.log(`[ANALYTICS] Found company: ${companyName}`);
        
        // Build notification message
        const message = this.buildNotificationMessage(visitData, companyName);
        
        // Send notification
        try {
        await this.bot.api.sendMessage(this.adminUserId, message, {
            parse_mode: 'MarkdownV2'
          });
          
          this.stats.notificationsSent++;
          console.log('[ANALYTICS] Notification sent successfully');
          
          // Small delay between notifications to avoid rate limits
          if (newVisitsCount > 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (error) {
          console.error('[ANALYTICS] Failed to send notification:', error);
          // Don't throw - continue processing other visits
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
        console.log(`[ANALYTICS] Check completed: ${newVisitsCount} new visits found`);
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
      `${EMOJI.ANALYTICS} *New Portfolio Visit\\!*`,
      '',
      `👤 *Company:* ${escapeMarkdown(companyName)}`,
      `🔑 *Code:* \`${escapeMarkdown(visitData.accessCode)}\``,
      `🕐 *Time:* ${escapeMarkdown(visitData.timePretty)}`,
      `📍 *Location:* ${escapeMarkdown(visitData.country)}${visitData.city !== 'Unknown' ? ', ' + escapeMarkdown(visitData.city) : ''}`,
      `📱 *Device:* ${escapeMarkdown(visitData.device)} \\(${escapeMarkdown(visitData.browser)}\\)`,
      '',
      `📄 *Pages visited \\(${visitData.pages.length}\\):*`,
      pagesList
    ];
    
    // Add visit duration if available
    if (visitData.duration !== '0s') {
      parts.push('');
      parts.push(`⏱️ *Duration:* ${escapeMarkdown(visitData.duration)}`);
    }
    
    // Add special indicators
    const indicators = [];
    
    if (visitData.isFirstVisit) {
      indicators.push('🆕 First visit');
    }
    
    if (visitData.actionCount === 1) {
      indicators.push('⚡ Bounced');
    } else if (visitData.actionCount > 10) {
      indicators.push('🔥 High engagement');
    }
    
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
