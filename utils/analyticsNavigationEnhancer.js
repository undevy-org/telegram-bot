const NavigationManager = require('./navigationManager');
const MessageEditor = require('./messageEditor');
const { NavigationHelpers, EMOJI } = require('../config/constants');
const { escapeMarkdown, formatDate } = require('./format');

/**
 * AnalyticsNavigationEnhancer - Enhanced analytics dashboard with interactive navigation
 */
class AnalyticsNavigationEnhancer {
  constructor() {
    this.navigationManager = new NavigationManager();
    this.messageEditor = new MessageEditor();
  }

  /**
   * Generate real-time analytics dashboard
   * @param {object} ctx - Grammy context
   * @param {object} analyticsMonitor - Analytics monitor instance
   * @param {object} recentVisits - Recent visits data
   */
  async showAnalyticsDashboard(ctx, analyticsMonitor = null, recentVisits = []) {
    const userId = ctx.from.id;
    
    try {
      const stats = analyticsMonitor ? analyticsMonitor.getStats() : null;
      const dashboardText = this._generateDashboardText(stats, recentVisits);
      
      const dashboardMenu = this.navigationManager.getSuccessMenu(
        dashboardText,
        userId,
        {
          actions: [
            {
              text: `${EMOJI.REFRESH} Refresh Data`,
              callback: NavigationHelpers.generateCallback('nav', 'analytics', 'refresh'),
              newRow: false
            },
            {
              text: `${EMOJI.VIEW} Recent Visits`,
              callback: NavigationHelpers.generateCallback('nav', 'analytics', 'recent'),
              newRow: false
            },
            {
              text: `${EMOJI.SETTINGS} Test Connection`,
              callback: NavigationHelpers.generateCallback('nav', 'analytics', 'test'),
              newRow: true
            },
            {
              text: stats?.isRunning ? `${EMOJI.CANCEL} Stop Monitor` : `${EMOJI.CONFIRM} Start Monitor`,
              callback: NavigationHelpers.generateCallback('nav', 'analytics', stats?.isRunning ? 'stop' : 'start'),
              newRow: false
            }
          ]
        }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, dashboardMenu);
      
    } catch (error) {
      console.error('[ANALYTICS_NAV] Dashboard error:', error);
      await this.showAnalyticsError(ctx, 'Failed to load analytics dashboard', error);
    }
  }

  /**
   * Show recent visits with navigation
   * @param {object} ctx - Grammy context
   * @param {array} visits - Recent visits array
   */
  async showRecentVisitsWithNavigation(ctx, visits = []) {
    const userId = ctx.from.id;
    
    if (!visits || visits.length === 0) {
      const noVisitsMenu = this.navigationManager.getSuccessMenu(
        `${EMOJI.INFO} **No Recent Visits**\n\nNo visits found today. Check back later or refresh the data.`,
        userId,
        {
          actions: [
            {
              text: `${EMOJI.REFRESH} Check Again`,
              callback: NavigationHelpers.generateCallback('nav', 'analytics', 'recent'),
              newRow: false
            },
            {
              text: `${EMOJI.ANALYTICS} Dashboard`,
              callback: NavigationHelpers.generateCallback('nav', 'analytics', 'view'),
              newRow: false
            }
          ]
        }
      );
      
      return await this.messageEditor.updateMenuMessage(ctx, noVisitsMenu);
    }

    // Show visits with pagination if many
    const visitsToShow = visits.slice(0, 3); // Show first 3 visits
    const visitsText = this._generateVisitsText(visitsToShow);
    
    const actions = [
      {
        text: `${EMOJI.REFRESH} Refresh Visits`,
        callback: NavigationHelpers.generateCallback('nav', 'analytics', 'recent'),
        newRow: false
      },
      {
        text: `${EMOJI.ANALYTICS} Dashboard`,
        callback: NavigationHelpers.generateCallback('nav', 'analytics', 'view'),
        newRow: false
      }
    ];

    if (visits.length > 3) {
      actions.push({
        text: `${EMOJI.VIEW} Show More (${visits.length - 3})`,
        callback: NavigationHelpers.generateCallback('page', 'visits', '2'),
        newRow: true
      });
    }

    const visitsMenu = this.navigationManager.getSuccessMenu(
      visitsText,
      userId,
      { actions }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, visitsMenu);
  }

  /**
   * Show analytics monitoring controls
   * @param {object} ctx - Grammy context
   * @param {object} analyticsMonitor - Analytics monitor instance
   * @param {string} operation - Operation performed (start/stop)
   */
  async showMonitoringControls(ctx, analyticsMonitor, operation = null) {
    const userId = ctx.from.id;
    const stats = analyticsMonitor ? analyticsMonitor.getStats() : null;
    
    let statusText = `${EMOJI.SETTINGS} **Analytics Monitoring Controls**\n\n`;
    
    if (operation) {
      const operationResults = {
        start: `${EMOJI.SUCCESS} Analytics monitoring started successfully!`,
        stop: `${EMOJI.SUCCESS} Analytics monitoring stopped successfully!`,
        test: `${EMOJI.SUCCESS} Matomo connection test completed!`
      };
      statusText += operationResults[operation] + '\n\n';
    }

    if (stats) {
      statusText += `**Current Status:** ${stats.isRunning ? '🟢 Running' : '🔴 Stopped'}\n`;
      statusText += `**Checks Performed:** ${stats.checksPerformed}\n`;
      statusText += `**Notifications Sent:** ${stats.notificationsSent}\n`;
      statusText += `**Tracked Visits:** ${stats.notifiedVisitsCount}\n`;
      
      if (stats.lastCheckTime) {
        statusText += `**Last Check:** ${escapeMarkdown(formatDate(stats.lastCheckTime))}\n`;
      }
      
      if (stats.errors > 0) {
        statusText += `**Errors:** ⚠️ ${stats.errors}\n`;
      }
    }

    const controlsMenu = this.navigationManager.getSuccessMenu(
      statusText,
      userId,
      {
        actions: [
          {
            text: stats?.isRunning ? `${EMOJI.CANCEL} Stop Monitoring` : `${EMOJI.CONFIRM} Start Monitoring`,
            callback: NavigationHelpers.generateCallback('nav', 'analytics', stats?.isRunning ? 'stop' : 'start'),
            newRow: false
          },
          {
            text: `${EMOJI.SETTINGS} Test Connection`,
            callback: NavigationHelpers.generateCallback('nav', 'analytics', 'test'),
            newRow: false
          },
          {
            text: `${EMOJI.ANALYTICS} View Dashboard`,
            callback: NavigationHelpers.generateCallback('nav', 'analytics', 'view'),
            newRow: true
          },
          {
            text: `${EMOJI.REFRESH} Force Check`,
            callback: NavigationHelpers.generateCallback('nav', 'analytics', 'refresh'),
            newRow: false
          }
        ]
      }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, controlsMenu);
  }

  /**
   * Show connection test results
   * @param {object} ctx - Grammy context
   * @param {object} testResult - Test result data
   */
  async showConnectionTestResult(ctx, testResult) {
    const userId = ctx.from.id;
    
    let resultText = `${EMOJI.SETTINGS} **Matomo Connection Test**\n\n`;
    
    if (testResult && testResult.name) {
      resultText += `${EMOJI.SUCCESS} **Connection Successful!**\n\n`;
      resultText += `**Site Name:** ${escapeMarkdown(testResult.name)}\n`;
      resultText += `**Site ID:** ${escapeMarkdown(testResult.idsite?.toString() || 'Unknown')}\n`;
      resultText += `**Status:** 🟢 API is working correctly\n`;
    } else if (testResult) {
      resultText += `${EMOJI.WARNING} **Partial Success**\n\n`;
      resultText += `Got response but unexpected format.\n`;
      resultText += `Raw response: ${JSON.stringify(testResult).substring(0, 200)}...\n`;
    } else {
      resultText += `${EMOJI.ERROR} **Connection Failed**\n\n`;
      resultText += `Unable to connect to Matomo API.\n`;
      resultText += `Please check your configuration.\n`;
    }

    const testResultMenu = this.navigationManager.getSuccessMenu(
      resultText,
      userId,
      {
        actions: [
          {
            text: `${EMOJI.REFRESH} Test Again`,
            callback: NavigationHelpers.generateCallback('nav', 'analytics', 'test'),
            newRow: false
          },
          {
            text: `${EMOJI.SETTINGS} Monitor Controls`,
            callback: NavigationHelpers.generateCallback('nav', 'analytics', 'controls'),
            newRow: false
          },
          {
            text: `${EMOJI.ANALYTICS} Dashboard`,
            callback: NavigationHelpers.generateCallback('nav', 'analytics', 'view'),
            newRow: true
          }
        ]
      }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, testResultMenu);
  }

  /**
   * Show analytics loading state
   * @param {object} ctx - Grammy context
   * @param {string} operation - Operation being performed
   */
  async showAnalyticsLoading(ctx, operation) {
    const loadingMessages = {
      view: 'Loading analytics dashboard...',
      recent: 'Fetching recent visits...',
      test: 'Testing Matomo connection...',
      start: 'Starting analytics monitoring...',
      stop: 'Stopping analytics monitoring...',
      refresh: 'Refreshing analytics data...'
    };
    
    const message = loadingMessages[operation] || 'Processing analytics request...';
    
    const loadingMenu = this.navigationManager.getLoadingMenu(message, true);
    return await this.messageEditor.updateMenuMessage(ctx, loadingMenu);
  }

  /**
   * Show analytics error with retry options
   * @param {object} ctx - Grammy context
   * @param {string} errorMessage - Error message
   * @param {Error} error - Error object
   */
  async showAnalyticsError(ctx, errorMessage, error = null) {
    const userId = ctx.from.id;
    
    let fullMessage = errorMessage;
    if (error?.message) {
      fullMessage += `\n\nError details: ${error.message}`;
    }
    
    const errorMenu = this.navigationManager.getErrorMenu(
      fullMessage,
      userId,
      {
        retryCallback: NavigationHelpers.generateCallback('nav', 'analytics', 'view')
      }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, errorMenu);
  }

  // Private helper methods

  /**
   * Generate dashboard text with current analytics data
   * @param {object} stats - Analytics monitor stats
   * @param {array} recentVisits - Recent visits data
   * @returns {string} Formatted dashboard text
   * @private
   */
  _generateDashboardText(stats, recentVisits = []) {
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    let text = `${EMOJI.ANALYTICS} **Analytics Dashboard**\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n\n`;

    // Monitor Status
    if (stats) {
      text += `**📊 Monitor Status**\n`;
      text += `Status: ${stats.isRunning ? '🟢 Active' : '🔴 Inactive'}\n`;
      text += `Total Checks: ${stats.checksPerformed}\n`;
      text += `Notifications: ${stats.notificationsSent}\n`;
      
      if (stats.errors > 0) {
        text += `Errors: ⚠️ ${stats.errors}\n`;
      }
      
      text += '\n';
    }

    // Recent Activity
    text += `**👥 Recent Activity**\n`;
    if (recentVisits && recentVisits.length > 0) {
      text += `Visits today: ${recentVisits.length}\n`;
      const latestVisit = recentVisits[0];
      if (latestVisit) {
        text += `Latest: ${this._formatVisitSummary(latestVisit)}\n`;
      }
    } else {
      text += `No visits recorded today\n`;
    }

    text += `\n**⏰ Updated:** ${currentTime}\n\n`;
    text += `Use the buttons below to manage analytics:`;

    return text;
  }

  /**
   * Generate visits text for display
   * @param {array} visits - Visits array
   * @returns {string} Formatted visits text
   * @private
   */
  _generateVisitsText(visits) {
    let text = `${EMOJI.VISIT} **Recent Visits (${visits.length})**\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n\n`;

    visits.forEach((visit, index) => {
      const { formatVisitData } = require('../services/matomo');
      const visitData = formatVisitData(visit);
      
      text += `**${index + 1}.** `;
      
      if (visitData.accessCode) {
        text += `🔑 Code: \`${escapeMarkdown(visitData.accessCode)}\`\n`;
      } else {
        text += `${EMOJI.ANONYMOUS} Anonymous visitor\n`;
      }
      
      text += `🕐 ${escapeMarkdown(formatDate(visitData.timestamp))}\n`;
      text += `📍 ${escapeMarkdown(visitData.country)}, ${escapeMarkdown(visitData.city)}\n`;
      text += `📱 ${escapeMarkdown(visitData.device)}\n`;
      text += `⏱️ Duration: ${escapeMarkdown(visitData.duration)}\n`;
      
      if (index < visits.length - 1) {
        text += '\n';
      }
    });

    return text;
  }

  /**
   * Format a single visit for summary display
   * @param {object} visit - Visit data
   * @returns {string} Formatted visit summary
   * @private
   */
  _formatVisitSummary(visit) {
    const { formatVisitData } = require('../services/matomo');
    const visitData = formatVisitData(visit);
    
    const timeAgo = this._getTimeAgo(visitData.timestamp);
    const location = `${visitData.city}, ${visitData.country}`;
    
    if (visitData.accessCode) {
      return `🔑 ${visitData.accessCode} from ${location} (${timeAgo})`;
    } else {
      return `${EMOJI.ANONYMOUS} ${location} (${timeAgo})`;
    }
  }

  /**
   * Get time ago string
   * @param {Date} timestamp - Timestamp
   * @returns {string} Time ago string
   * @private
   */
  _getTimeAgo(timestamp) {
    const now = new Date();
    const diffMs = now - new Date(timestamp);
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}

module.exports = AnalyticsNavigationEnhancer;