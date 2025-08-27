const NavigationManager = require('../utils/navigationManager');
const MessageEditor = require('../utils/messageEditor');
const ContentNavigationEnhancer = require('../utils/contentNavigationEnhancer');
const AnalyticsNavigationEnhancer = require('../utils/analyticsNavigationEnhancer');
const { NavigationHelpers, EMOJI } = require('../config/constants');
const { 
  getNavigationContext, 
  initUserState,
  clearUserState,
  isInActiveWorkflow 
} = require('../stateManager');
const { executeActionHandler } = require('./actionHandlers');

// Import command handlers for delegation
const contentCommands = require('../commands/content');
const analyticsCommands = require('../commands/analytics');
const systemCommands = require('../commands/system');

/**
 * NavigationHandler - Handles all navigation-related callback queries
 */
class NavigationHandler {
  constructor() {
    this.navigationManager = new NavigationManager();
    this.messageEditor = new MessageEditor();
    this.contentEnhancer = new ContentNavigationEnhancer();
    this.analyticsEnhancer = new AnalyticsNavigationEnhancer();
  }

  /**
   * Set up navigation callback handlers on the bot
   * @param {Bot} bot - Grammy bot instance
   */
  setupNavigationHandlers(bot) {
    // Main navigation callbacks
    bot.callbackQuery(/^nav_/, this.handleNavigationCallback.bind(this));
    
    // Action confirmation callbacks
    bot.callbackQuery(/^conf_/, this.handleConfirmationCallback.bind(this));
    
    // General action callbacks
    bot.callbackQuery(/^act_/, this.handleActionCallback.bind(this));
    
    // Pagination callbacks
    bot.callbackQuery(/^page_/, this.handlePaginationCallback.bind(this));
    
    console.log('[NAVIGATION] Navigation callback handlers registered');
  }

  /**
   * Handle navigation callback queries (nav_*)
   * @param {object} ctx - Grammy context
   */
  async handleNavigationCallback(ctx) {
    try {
      await ctx.answerCallbackQuery();
      
      const userId = ctx.from.id;
      const callbackData = ctx.callbackQuery.data;
      const parsed = NavigationHelpers.parseCallback(callbackData);
      
      // Initialize user state if needed
      if (!getNavigationContext(userId)) {
        initUserState(userId);
      }
      
      console.log(`[NAVIGATION] User ${userId} navigating: ${callbackData}`);
      
      // Route to appropriate handler based on action
      switch (parsed.action) {
        case 'main':
          await this.handleMainMenuNavigation(ctx, userId);
          break;
        
        case 'back':
          await this.handleBackNavigation(ctx, userId);
          break;
        
        case 'content':
          await this.handleCategoryNavigation(ctx, userId, 'content', 'Content Management');
          break;
        
        case 'analytics':
          await this.handleCategoryNavigation(ctx, userId, 'analytics', 'Analytics');
          break;
        
        case 'system':
          await this.handleCategoryNavigation(ctx, userId, 'system', 'System Tools');
          break;
        
        case 'help':
          await this.handleCategoryNavigation(ctx, userId, 'help', 'Help & Info');
          break;
        
        default:
          // Handle category-specific actions (e.g., nav_content_create)
          await this.handleCategoryActionNavigation(ctx, userId, parsed);
          break;
      }
      
    } catch (error) {
      console.error('[NAVIGATION] Navigation callback error:', error);
      await this.handleNavigationError(ctx, error);
    }
  }

  /**
   * Handle confirmation callback queries (conf_*)
   * @param {object} ctx - Grammy context
   */
  async handleConfirmationCallback(ctx) {
    try {
      await ctx.answerCallbackQuery();
      
      const userId = ctx.from.id;
      const callbackData = ctx.callbackQuery.data;
      const parsed = NavigationHelpers.parseCallback(callbackData);
      
      console.log(`[NAVIGATION] User ${userId} confirming: ${callbackData}`);
      
      // Extract category, action, and confirmation type
      const [category, action, confirmType] = parsed.data;
      
      if (confirmType === 'confirm') {
        await this.executeConfirmedAction(ctx, userId, category, action);
      } else {
        // Handle cancellation - go back to category menu
        await this.handleBackNavigation(ctx, userId);
      }
      
    } catch (error) {
      console.error('[NAVIGATION] Confirmation callback error:', error);
      await this.handleNavigationError(ctx, error);
    }
  }

  /**
   * Handle general action callback queries (act_*)
   * @param {object} ctx - Grammy context
   */
  async handleActionCallback(ctx) {
    try {
      await ctx.answerCallbackQuery();
      
      const userId = ctx.from.id;
      const callbackData = ctx.callbackQuery.data;
      
      console.log(`[NAVIGATION] User ${userId} executing action: ${callbackData}`);
      
      // Execute the action using our action handler mapping
      const success = await executeActionHandler(callbackData, ctx);
      
      if (!success) {
        console.warn(`[NAVIGATION] Failed to execute action: ${callbackData}`);
      }
      
    } catch (error) {
      console.error('[NAVIGATION] Action callback error:', error);
      await this.handleNavigationError(ctx, error);
    }
  }

  /**
   * Handle pagination callback queries (page_*)
   * @param {object} ctx - Grammy context
   */
  async handlePaginationCallback(ctx) {
    try {
      await ctx.answerCallbackQuery();
      
      const userId = ctx.from.id;
      const callbackData = ctx.callbackQuery.data;
      const parsed = NavigationHelpers.parseCallback(callbackData);
      
      console.log(`[NAVIGATION] User ${userId} pagination: ${callbackData}`);
      
      // Handle pagination based on context
      const [context, pageNumber] = parsed.data;
      await this.handlePaginatedContent(ctx, userId, context, parseInt(pageNumber));
      
    } catch (error) {
      console.error('[NAVIGATION] Pagination callback error:', error);
      await this.handleNavigationError(ctx, error);
    }
  }

  // Navigation handlers

  /**
   * Handle main menu navigation
   * @param {object} ctx - Grammy context
   * @param {number|string} userId - User ID
   */
  async handleMainMenuNavigation(ctx, userId) {
    // Clear any active workflow state
    clearUserState(userId);
    initUserState(userId);
    
    const menuData = this.navigationManager.getMainMenu(userId);
    this.navigationManager.updateNavigationState(userId, menuData.menuState, 'Main Menu');
    
    await this.messageEditor.updateMenuMessage(ctx, menuData);
  }

  /**
   * Handle back navigation
   * @param {object} ctx - Grammy context
   * @param {number|string} userId - User ID
   */
  async handleBackNavigation(ctx, userId) {
    const previousMenu = this.navigationManager.handleBackNavigation(userId);
    
    if (!previousMenu) {
      // Can't go back further, show main menu
      await this.handleMainMenuNavigation(ctx, userId);
      return;
    }
    
    // Generate appropriate menu based on previous state
    let menuData;
    
    switch (previousMenu.state) {
      case 'content_category':
        menuData = this.navigationManager.getCategoryMenu('content', userId);
        break;
      case 'analytics_category':
        menuData = this.navigationManager.getCategoryMenu('analytics', userId);
        break;
      case 'system_category':
        menuData = this.navigationManager.getCategoryMenu('system', userId);
        break;
      case 'help_category':
        menuData = this.navigationManager.getCategoryMenu('help', userId);
        break;
      default:
        menuData = this.navigationManager.getMainMenu(userId);
        break;
    }
    
    await this.messageEditor.updateMenuMessage(ctx, menuData);
  }

  /**
   * Handle category navigation
   * @param {object} ctx - Grammy context
   * @param {number|string} userId - User ID
   * @param {string} categoryId - Category identifier
   * @param {string} categoryTitle - Category display title
   */
  async handleCategoryNavigation(ctx, userId, categoryId, categoryTitle) {
    const menuData = this.navigationManager.getCategoryMenu(categoryId, userId);
    this.navigationManager.updateNavigationState(userId, menuData.menuState, categoryTitle);
    
    await this.messageEditor.updateMenuMessage(ctx, menuData);
  }

  /**
   * Handle category-specific action navigation
   * @param {object} ctx - Grammy context
   * @param {number|string} userId - User ID
   * @param {object} parsed - Parsed callback data
   */
  async handleCategoryActionNavigation(ctx, userId, parsed) {
    const [category, action] = parsed.data;
    
    console.log(`[NAVIGATION] Category action: ${category}.${action}`);
    
    // Check if user has active workflow - if so, show confirmation
    if (isInActiveWorkflow(userId)) {
      const confirmationMenu = this.navigationManager.getActionConfirmationMenu(
        category, 
        action, 
        userId,
        { details: 'This will cancel your current workflow.' }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, confirmationMenu);
      return;
    }
    
    // Direct execution for non-destructive actions
    await this.executeAction(ctx, userId, category, action);
  }

  /**
   * Execute confirmed action
   * @param {object} ctx - Grammy context
   * @param {number|string} userId - User ID
   * @param {string} category - Category identifier
   * @param {string} action - Action identifier
   */
  async executeConfirmedAction(ctx, userId, category, action) {
    // Clear any existing state before starting new action
    clearUserState(userId);
    
    const parsed = NavigationHelpers.parseCallback(ctx.callbackQuery.data);
    const additionalData = parsed.data.slice(2); // Get any additional data after category and action
    
    // Handle actions that need additional context (like case ID for delete)
    if (action === 'delete' && additionalData.length > 0) {
      const caseId = additionalData[0];
      await this.executeDeleteAction(ctx, caseId);
    } else if (action === 'edit' && additionalData.length > 0) {
      const caseId = additionalData[0];
      await this.executeEditAction(ctx, caseId);
    } else if (action === 'preview' && additionalData.length > 0) {
      const caseId = additionalData[0];
      await this.executePreviewAction(ctx, caseId);
    } else {
      await this.executeAction(ctx, userId, category, action);
    }
  }

  /**
   * Execute specific action
   * @param {object} ctx - Grammy context
   * @param {number|string} userId - User ID
   * @param {string} category - Category identifier
   * @param {string} action - Action identifier
   */
  async executeAction(ctx, userId, category, action) {
    try {
      // Show loading state
      const loadingMenu = this.navigationManager.getLoadingMenu(
        `Executing ${category} ${action}...`,
        true
      );
      
      await this.messageEditor.updateMenuMessage(ctx, loadingMenu);
      
      // Delegate to appropriate command handler
      switch (category) {
        case 'content':
          await this.executeContentAction(ctx, action);
          break;
        case 'analytics':
          await this.executeAnalyticsAction(ctx, action);
          break;
        case 'system':
          await this.executeSystemAction(ctx, action);
          break;
        case 'help':
          await this.executeHelpAction(ctx, action);
          break;
        default:
          throw new Error(`Unknown category: ${category}`);
      }
      
    } catch (error) {
      console.error(`[NAVIGATION] Action execution error (${category}.${action}):`, error);
      
      const errorMenu = this.navigationManager.getErrorMenu(
        `Failed to execute ${category} ${action}: ${error.message}`,
        userId,
        { retryCallback: NavigationHelpers.generateCallback('nav', category, action) }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, errorMenu);
    }
  }

  /**
   * Execute content management actions
   * @param {object} ctx - Grammy context
   * @param {string} action - Action identifier
   */
  async executeContentAction(ctx, action) {
    const userId = ctx.from.id;
    
    try {
      // Show loading state
      await this.contentEnhancer.showContentLoading(ctx, action);
      
      switch (action) {
        case 'create':
          // Clear navigation state before starting workflow
          this.navigationManager.updateNavigationState(userId, 'active_workflow', 'Create Case');
          await contentCommands.handleAddCase(ctx);
          break;
        case 'edit':
          this.navigationManager.updateNavigationState(userId, 'active_workflow', 'Edit Case');
          await contentCommands.handleEditCase(ctx);
          break;
        case 'delete':
          this.navigationManager.updateNavigationState(userId, 'active_workflow', 'Delete Case');
          await contentCommands.handleDeleteCase(ctx);
          break;
        case 'list':
          // For list, we'll intercept the response to add navigation
          await this.executeContentListWithNavigation(ctx);
          break;
        case 'preview':
          await contentCommands.handlePreview(ctx);
          break;
        default:
          throw new Error(`Unknown content action: ${action}`);
      }
      
    } catch (error) {
      console.error(`[NAVIGATION] Content action error (${action}):`, error);
      await this.contentEnhancer.showOperationError(
        ctx, 
        action, 
        error, 
        NavigationHelpers.generateCallback('nav', 'content', action)
      );
    }
  }

  /**
   * Execute analytics actions
   * @param {object} ctx - Grammy context
   * @param {string} action - Action identifier
   */
  async executeAnalyticsAction(ctx, action) {
    const userId = ctx.from.id;
    
    try {
      // Show loading state
      await this.analyticsEnhancer.showAnalyticsLoading(ctx, action);
      
      switch (action) {
        case 'view':
          await this.showAnalyticsDashboard(ctx);
          break;
        case 'recent':
          await this.showRecentVisitsWithNavigation(ctx);
          break;
        case 'test':
          await this.executeAnalyticsTest(ctx);
          break;
        case 'start':
          await this.executeAnalyticsStart(ctx);
          break;
        case 'stop':
          await this.executeAnalyticsStop(ctx);
          break;
        case 'refresh':
          await this.executeAnalyticsRefresh(ctx);
          break;
        case 'controls':
          await this.showAnalyticsControls(ctx);
          break;
        default:
          throw new Error(`Unknown analytics action: ${action}`);
      }
      
    } catch (error) {
      console.error(`[NAVIGATION] Analytics action error (${action}):`, error);
      await this.analyticsEnhancer.showAnalyticsError(
        ctx, 
        `Failed to execute analytics ${action}`, 
        error
      );
    }
  }

  /**
   * Execute system actions
   * @param {object} ctx - Grammy context
   * @param {string} action - Action identifier
   */
  async executeSystemAction(ctx, action) {
    const userId = ctx.from.id;
    
    try {
      // Show loading state
      const loadingMenu = this.navigationManager.getLoadingMenu(
        `Processing system ${action}...`,
        true
      );
      await this.messageEditor.updateMenuMessage(ctx, loadingMenu);
      
      switch (action) {
        case 'status':
          await this.showSystemStatusDashboard(ctx);
          break;
        case 'history':
          await this.showVersionHistoryWithNavigation(ctx);
          break;
        case 'download':
          await this.executeSystemDownload(ctx);
          break;
        case 'rollback':
          await contentCommands.handleRollback(ctx);
          break;
        case 'cancel':
          await systemCommands.handleCancel(ctx);
          break;
        default:
          throw new Error(`Unknown system action: ${action}`);
      }
      
    } catch (error) {
      console.error(`[NAVIGATION] System action error (${action}):`, error);
      
      const errorMenu = this.navigationManager.getErrorMenu(
        `Failed to execute system ${action}: ${error.message}`,
        userId,
        { retryCallback: NavigationHelpers.generateCallback('nav', 'system', action) }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, errorMenu);
    }
  }

  /**
   * Execute help actions
   * @param {object} ctx - Grammy context
   * @param {string} action - Action identifier
   */
  async executeHelpAction(ctx, action) {
    const userId = ctx.from.id;
    
    try {
      switch (action) {
        case 'commands':
          await this.showCommandsHelp(ctx);
          break;
        case 'guide':
          await this.showUsageGuide(ctx);
          break;
        case 'support':
          await this.showSupportInfo(ctx);
          break;
        case 'about':
          await this.showAboutInfo(ctx);
          break;
        default:
          throw new Error(`Unknown help action: ${action}`);
      }
      
    } catch (error) {
      console.error(`[NAVIGATION] Help action error (${action}):`, error);
      
      const errorMenu = this.navigationManager.getErrorMenu(
        `Failed to load help information: ${error.message}`,
        userId,
        { retryCallback: NavigationHelpers.generateCallback('nav', 'help', action) }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, errorMenu);
    }
  }

  /**
   * Handle cancel action
   * @param {object} ctx - Grammy context
   * @param {number|string} userId - User ID
   */
  async handleCancelAction(ctx, userId) {
    clearUserState(userId);
    
    const successMenu = this.navigationManager.getSuccessMenu(
      'Operation cancelled successfully.',
      userId,
      {
        actions: [
          {
            text: `${EMOJI.HELP} Main Menu`,
            callback: NavigationHelpers.generateCallback('nav', 'main'),
            newRow: true
          }
        ]
      }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, successMenu);
  }

  /**
   * Handle refresh action
   * @param {object} ctx - Grammy context
   * @param {number|string} userId - User ID
   */
  async handleRefreshAction(ctx, userId) {
    const context = getNavigationContext(userId);
    const currentMenu = context?.currentMenu;
    
    // Refresh current menu based on state
    if (currentMenu === 'analytics_category') {
      await this.handleCategoryNavigation(ctx, userId, 'analytics', 'Analytics');
    } else {
      // Default to main menu refresh
      await this.handleMainMenuNavigation(ctx, userId);
    }
  }

  /**
   * Handle paginated content
   * @param {object} ctx - Grammy context
   * @param {number|string} userId - User ID
   * @param {string} context - Content context
   * @param {number} pageNumber - Page number
   */
  async handlePaginatedContent(ctx, userId, context, pageNumber) {
    // This will be implemented when we add pagination support
    console.log(`[NAVIGATION] Pagination requested: ${context}, page ${pageNumber}`);
    
    // For now, show a placeholder
    const errorMenu = this.navigationManager.getErrorMenu(
      'Pagination not yet implemented',
      userId
    );
    
    await this.messageEditor.updateMenuMessage(ctx, errorMenu);
  }

  /**
   * Execute delete action for specific case
   * @param {object} ctx - Grammy context
   * @param {string} caseId - Case ID to delete
   */
  async executeDeleteAction(ctx, caseId) {
    try {
      // Mock the message text for handleDeleteCase
      ctx.message = { text: `/delete_case ${caseId}` };
      await contentCommands.handleDeleteCase(ctx);
    } catch (error) {
      console.error('[NAVIGATION] Delete action error:', error);
      await this.contentEnhancer.showOperationError(ctx, 'delete case', error);
    }
  }

  /**
   * Execute edit action for specific case
   * @param {object} ctx - Grammy context
   * @param {string} caseId - Case ID to edit
   */
  async executeEditAction(ctx, caseId) {
    try {
      // Mock the message text for handleEditCase
      ctx.message = { text: `/edit_case ${caseId}` };
      await contentCommands.handleEditCase(ctx);
    } catch (error) {
      console.error('[NAVIGATION] Edit action error:', error);
      await this.contentEnhancer.showOperationError(ctx, 'edit case', error);
    }
  }

  /**
   * Execute preview action for specific case
   * @param {object} ctx - Grammy context
   * @param {string} caseId - Case ID to preview
   */
  async executePreviewAction(ctx, caseId) {
    try {
      // Mock the message text for handlePreview
      ctx.message = { text: `/preview ${caseId}` };
      await contentCommands.handlePreview(ctx);
      
      // Note: The original handler sends a new message,
      // so we don't need to enhance it here unless we want to add navigation
    } catch (error) {
      console.error('[NAVIGATION] Preview action error:', error);
      await this.contentEnhancer.showOperationError(ctx, 'preview case', error);
    }
  }

  /**
   * Show analytics dashboard with real-time data
   * @param {object} ctx - Grammy context
   */
  async showAnalyticsDashboard(ctx) {
    try {
      // Get analytics monitor from the global scope
      const analytics = require('../commands/analytics');
      
      // Note: We need to access the analytics monitor instance
      // For now, we'll show a basic dashboard. In a full implementation,
      // we would pass the monitor instance properly.
      
      await this.analyticsEnhancer.showAnalyticsDashboard(ctx, null, []);
      
    } catch (error) {
      console.error('[NAVIGATION] Analytics dashboard error:', error);
      await this.analyticsEnhancer.showAnalyticsError(ctx, 'Failed to load analytics dashboard', error);
    }
  }

  /**
   * Show recent visits with navigation
   * @param {object} ctx - Grammy context
   */
  async showRecentVisitsWithNavigation(ctx) {
    try {
      const { getRecentVisits } = require('../services/matomo');
      const visits = await getRecentVisits(5);
      
      await this.analyticsEnhancer.showRecentVisitsWithNavigation(ctx, visits);
      
    } catch (error) {
      console.error('[NAVIGATION] Recent visits error:', error);
      await this.analyticsEnhancer.showAnalyticsError(ctx, 'Failed to load recent visits', error);
    }
  }

  /**
   * Execute analytics connection test
   * @param {object} ctx - Grammy context
   */
  async executeAnalyticsTest(ctx) {
    try {
      const { testConnection } = require('../services/matomo');
      const testResult = await testConnection();
      
      await this.analyticsEnhancer.showConnectionTestResult(ctx, testResult);
      
    } catch (error) {
      console.error('[NAVIGATION] Analytics test error:', error);
      await this.analyticsEnhancer.showAnalyticsError(ctx, 'Connection test failed', error);
    }
  }

  /**
   * Start analytics monitoring
   * @param {object} ctx - Grammy context
   */
  async executeAnalyticsStart(ctx) {
    try {
      await analyticsCommands.handleAnalyticsStart(ctx);
      // Note: In a full implementation, we would get the monitor instance
      // and show the controls with updated status
      await this.showAnalyticsControls(ctx, 'start');
      
    } catch (error) {
      console.error('[NAVIGATION] Analytics start error:', error);
      await this.analyticsEnhancer.showAnalyticsError(ctx, 'Failed to start monitoring', error);
    }
  }

  /**
   * Stop analytics monitoring
   * @param {object} ctx - Grammy context
   */
  async executeAnalyticsStop(ctx) {
    try {
      await analyticsCommands.handleAnalyticsStop(ctx);
      // Note: In a full implementation, we would get the monitor instance
      // and show the controls with updated status
      await this.showAnalyticsControls(ctx, 'stop');
      
    } catch (error) {
      console.error('[NAVIGATION] Analytics stop error:', error);
      await this.analyticsEnhancer.showAnalyticsError(ctx, 'Failed to stop monitoring', error);
    }
  }

  /**
   * Refresh analytics data
   * @param {object} ctx - Grammy context
   */
  async executeAnalyticsRefresh(ctx) {
    try {
      await analyticsCommands.handleAnalytics(ctx);
      // After refresh, show the updated dashboard
      await this.showAnalyticsDashboard(ctx);
      
    } catch (error) {
      console.error('[NAVIGATION] Analytics refresh error:', error);
      await this.analyticsEnhancer.showAnalyticsError(ctx, 'Failed to refresh data', error);
    }
  }

  /**
   * Show analytics controls
   * @param {object} ctx - Grammy context
   * @param {string} operation - Operation that was performed
   */
  async showAnalyticsControls(ctx, operation = null) {
    try {
      // In a full implementation, we would get the actual monitor instance
      await this.analyticsEnhancer.showMonitoringControls(ctx, null, operation);
      
    } catch (error) {
      console.error('[NAVIGATION] Analytics controls error:', error);
      await this.analyticsEnhancer.showAnalyticsError(ctx, 'Failed to load controls', error);
    }
  }

  /**
   * Show system status dashboard with interactive navigation
   * @param {object} ctx - Grammy context
   */
  async showSystemStatusDashboard(ctx) {
    try {
      const { getContent } = require('../services/api');
      const { formatFileSize, formatDate, formatUptime } = require('../utils/format');
      const { version } = require('../package.json');
      const userId = ctx.from.id;
      
      const result = await getContent();
      
      const profileCount = Object.keys(result.content)
        .filter(key => key === key.toUpperCase() && key !== 'GLOBAL_DATA')
        .length;
      
      const caseCount = Object.keys(result.content.GLOBAL_DATA?.case_studies || {}).length;
      const uptime = process.uptime();
      const uptimeFormatted = formatUptime(uptime);
      
      let statusText = `${EMOJI.SYSTEM} **System Status Dashboard**\n`;
      statusText += `━━━━━━━━━━━━━━━━━━━\n\n`;
      
      statusText += `**📊 Content Statistics:**\n`;
      statusText += `• Profiles: ${escapeMarkdown(profileCount.toString())}\n`;
      statusText += `• Case studies: ${escapeMarkdown(caseCount.toString())}\n`;
      statusText += `• File size: ${escapeMarkdown(formatFileSize(result.stats.fileSize))}\n`;
      statusText += `• Last modified: ${escapeMarkdown(formatDate(result.stats.lastModified))}\n\n`;
      
      statusText += `**🔗 System Info:**\n`;
      statusText += `• Bot version: ${escapeMarkdown(version)}\n`;
      statusText += `• Uptime: ${escapeMarkdown(uptimeFormatted)}\n`;
      statusText += `• API status: ✅ Connected\n`;
      statusText += `• Server time: ${escapeMarkdown(formatDate(result.timestamp))}\n\n`;
      
      statusText += `Use the buttons below for system actions:`;
      
      const statusMenu = this.navigationManager.getSuccessMenu(
        statusText,
        userId,
        {
          actions: [
            {
              text: `${EMOJI.REFRESH} Refresh Status`,
              callback: NavigationHelpers.generateCallback('nav', 'system', 'status'),
              newRow: false
            },
            {
              text: `${EMOJI.LIST} Version History`,
              callback: NavigationHelpers.generateCallback('nav', 'system', 'history'),
              newRow: false
            },
            {
              text: `${EMOJI.VIEW} Download Content`,
              callback: NavigationHelpers.generateCallback('nav', 'system', 'download'),
              newRow: true
            },
            {
              text: `${EMOJI.CANCEL} Cancel Operations`,
              callback: NavigationHelpers.generateCallback('nav', 'system', 'cancel'),
              newRow: false
            }
          ]
        }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, statusMenu);
      
    } catch (error) {
      console.error('[NAVIGATION] System status error:', error);
      
      // Show API connection error with helpful information
      let errorText = `${EMOJI.ERROR} **System Status - API Error**\n`;
      errorText += `━━━━━━━━━━━━━━━━━━━\n\n`;
      errorText += `**Connection Status:** ❌ Disconnected\n`;
      errorText += `**Error:** ${escapeMarkdown(error.message)}\n\n`;
      
      if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
        errorText += `**Possible Causes:**\n`;
        errorText += `• API server is not running\n`;
        errorText += `• Incorrect API URL configuration\n`;
        errorText += `• Network connectivity issues\n\n`;
        errorText += `**Next Steps:**\n`;
        errorText += `• Check if the API server is running\n`;
        errorText += `• Verify API_URL in environment variables\n`;
        errorText += `• Test network connectivity\n`;
      }
      
      const errorMenu = this.navigationManager.getErrorMenu(
        errorText,
        ctx.from.id,
        { retryCallback: NavigationHelpers.generateCallback('nav', 'system', 'status') }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, {
        text: errorText,
        keyboard: errorMenu.keyboard
      });
    }
  }

  /**
   * Show version history with navigation
   * @param {object} ctx - Grammy context
   */
  async showVersionHistoryWithNavigation(ctx) {
    try {
      const { getBackupFiles, parseBackupName } = require('../utils/helpers');
      const userId = ctx.from.id;
      
      const backupFiles = await getBackupFiles();
      
      if (backupFiles.length === 0) {
        const noHistoryMenu = this.navigationManager.getSuccessMenu(
          `${EMOJI.INFO} **No Version History**\n\nNo backups found. Backups are created when content changes.`,
          userId,
          {
            actions: [
              {
                text: `${EMOJI.SYSTEM} System Status`,
                callback: NavigationHelpers.generateCallback('nav', 'system', 'status'),
                newRow: true
              }
            ]
          }
        );
        
        return await this.messageEditor.updateMenuMessage(ctx, noHistoryMenu);
      }
      
      let historyText = `📜 **Version History (last 10)**\n`;
      historyText += `━━━━━━━━━━━━━━━━━━━\n\n`;
      
      const recentFiles = backupFiles.slice(0, 10);
      
      recentFiles.forEach((filename, i) => {
        historyText += `**${i + 1}.** ${escapeMarkdown(parseBackupName(filename))}\n`;
        historyText += `    📄 \`${escapeMarkdown(filename)}\`\n\n`;
      });
      
      const historyMenu = this.navigationManager.getSuccessMenu(
        historyText,
        userId,
        {
          actions: [
            {
              text: `${EMOJI.REFRESH} Refresh History`,
              callback: NavigationHelpers.generateCallback('nav', 'system', 'history'),
              newRow: false
            },
            {
              text: `${EMOJI.VIEW} Download Current`,
              callback: NavigationHelpers.generateCallback('nav', 'system', 'download'),
              newRow: false
            },
            {
              text: `${EMOJI.SYSTEM} System Status`,
              callback: NavigationHelpers.generateCallback('nav', 'system', 'status'),
              newRow: true
            }
          ]
        }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, historyMenu);
      
    } catch (error) {
      console.error('[NAVIGATION] Version history error:', error);
      
      const errorMenu = this.navigationManager.getErrorMenu(
        'Failed to load version history',
        ctx.from.id,
        { retryCallback: NavigationHelpers.generateCallback('nav', 'system', 'history') }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, errorMenu);
    }
  }

  /**
   * Execute system download with navigation feedback
   * @param {object} ctx - Grammy context
   */
  async executeSystemDownload(ctx) {
    try {
      // Execute the download
      await contentCommands.handleGet(ctx);
      
      // Show success with navigation options
      const successMenu = this.navigationManager.getSuccessMenu(
        'Content download completed successfully!',
        ctx.from.id,
        {
          actions: [
            {
              text: `${EMOJI.SYSTEM} System Status`,
              callback: NavigationHelpers.generateCallback('nav', 'system', 'status'),
              newRow: false
            },
            {
              text: `${EMOJI.LIST} Version History`,
              callback: NavigationHelpers.generateCallback('nav', 'system', 'history'),
              newRow: false
            }
          ]
        }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, successMenu);
      
    } catch (error) {
      console.error('[NAVIGATION] System download error:', error);
      
      const errorMenu = this.navigationManager.getErrorMenu(
        'Failed to download content',
        ctx.from.id,
        { retryCallback: NavigationHelpers.generateCallback('nav', 'system', 'download') }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, errorMenu);
    }
  }

  /**
   * Handle navigation errors
   * @param {object} ctx - Grammy context
   * @param {Error} error - Error object
   */
  async handleNavigationError(ctx, error) {
    try {
      const userId = ctx.from?.id;
      
      console.error('[NAVIGATION] Navigation error for user', userId, ':', error);
      
      const errorMenu = this.navigationManager.getErrorMenu(
        'Navigation error occurred. Please try again.',
        userId,
        {
          retryCallback: NavigationHelpers.generateCallback('nav', 'main')
        }
      );
      
      await this.messageEditor.updateMenuMessage(ctx, errorMenu);
      
    } catch (fallbackError) {
      console.error('[NAVIGATION] Critical navigation error:', fallbackError);
      
      // Last resort - send basic error message
      try {
        await ctx.reply(`${EMOJI.ERROR} Something went wrong. Please use /start to restart.`);
      } catch (criticalError) {
        console.error('[NAVIGATION] Critical fallback failed:', criticalError);
      }
    }
  }

  /**
   * Show interactive commands help
   * @param {object} ctx - Grammy context
   */
  async showCommandsHelp(ctx) {
    const userId = ctx.from.id;
    
    let helpText = `${EMOJI.HELP} **All Available Commands**\n`;
    helpText += `━━━━━━━━━━━━━━━━━━━\n\n`;
    
    helpText += `**📝 Content Management:**\n`;
    helpText += `• \`/add_case\` — Create new case study\n`;
    helpText += `• \`/edit_case [id]\` — Edit existing case\n`;
    helpText += `• \`/delete_case [id]\` — Delete case\n`;
    helpText += `• \`/list_cases\` — List all cases\n`;
    helpText += `• \`/preview [id]\` — Preview case details\n\n`;
    
    helpText += `**📊 Analytics:**\n`;
    helpText += `• \`/analytics\` — Check for new visits\n`;
    helpText += `• \`/recent_visits\` — Show last 5 visits\n`;
    helpText += `• \`/analytics_start\` — Start monitoring\n`;
    helpText += `• \`/analytics_stop\` — Stop monitoring\n\n`;
    
    helpText += `**⚙️ System Tools:**\n`;
    helpText += `• \`/status\` — Check system status\n`;
    helpText += `• \`/get\` — Download content file\n`;
    helpText += `• \`/history\` — View version history\n`;
    helpText += `• \`/rollback N\` — Restore version N\n\n`;
    
    helpText += `**ℹ️ Utility:**\n`;
    helpText += `• \`/cancel\` — Cancel active operation\n`;
    helpText += `• \`/skip\` — Skip optional field\n`;
    helpText += `• \`/keep\` — Keep existing value\n\n`;
    
    helpText += `💡 **Tip:** Use the interactive menu with /start for easier navigation!`;
    
    const commandsMenu = this.navigationManager.getSuccessMenu(
      helpText,
      userId,
      {
        actions: [
          {
            text: `${EMOJI.VIEW} Usage Guide`,
            callback: NavigationHelpers.generateCallback('nav', 'help', 'guide'),
            newRow: false
          },
          {
            text: `${EMOJI.HELP} Main Menu`,
            callback: NavigationHelpers.generateCallback('nav', 'main'),
            newRow: false
          }
        ]
      }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, commandsMenu);
  }

  /**
   * Show usage guide
   * @param {object} ctx - Grammy context
   */
  async showUsageGuide(ctx) {
    const userId = ctx.from.id;
    
    let guideText = `📖 **Bot Usage Guide**\n`;
    guideText += `━━━━━━━━━━━━━━━━━━━\n\n`;
    
    guideText += `**Getting Started:**\n`;
    guideText += `1. Send \`/start\` to open the main menu\n`;
    guideText += `2. Choose a category (Content, Analytics, System, Help)\n`;
    guideText += `3. Select an action from the category menu\n`;
    guideText += `4. Follow the interactive prompts\n\n`;
    
    guideText += `**Navigation Tips:**\n`;
    guideText += `• Use ⬅️ **Back** buttons to return to previous menus\n`;
    guideText += `• All features are accessible within 3 taps\n`;
    guideText += `• Loading states show progress for operations\n`;
    guideText += `• Error messages include retry options\n\n`;
    
    guideText += `**Content Workflows:**\n`;
    guideText += `• **Creating:** Follow the 10-step guided process\n`;
    guideText += `• **Editing:** Choose fields to modify or keep existing\n`;
    guideText += `• **Deleting:** Preview and confirm before deletion\n\n`;
    
    guideText += `**Power User Tips:**\n`;
    guideText += `• Text commands still work as shortcuts\n`;
    guideText += `• Use \`/cancel\` to exit any workflow\n`;
    guideText += `• Use \`/skip\` during content creation\n`;
    guideText += `• Use \`/keep\` during content editing\n\n`;
    
    guideText += `Need more help? Check the commands list or contact support!`;
    
    const guideMenu = this.navigationManager.getSuccessMenu(
      guideText,
      userId,
      {
        actions: [
          {
            text: `${EMOJI.LIST} All Commands`,
            callback: NavigationHelpers.generateCallback('nav', 'help', 'commands'),
            newRow: false
          },
          {
            text: `${EMOJI.INFO} Contact Support`,
            callback: NavigationHelpers.generateCallback('nav', 'help', 'support'),
            newRow: false
          },
          {
            text: `${EMOJI.HELP} Main Menu`,
            callback: NavigationHelpers.generateCallback('nav', 'main'),
            newRow: true
          }
        ]
      }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, guideMenu);
  }

  /**
   * Show support information
   * @param {object} ctx - Grammy context
   */
  async showSupportInfo(ctx) {
    const userId = ctx.from.id;
    
    let supportText = `💬 **Support & Contact**\n`;
    supportText += `━━━━━━━━━━━━━━━━━━━\n\n`;
    
    supportText += `**Having issues?** Here's how to get help:\n\n`;
    
    supportText += `**Quick Troubleshooting:**\n`;
    supportText += `• Try refreshing (use the 🔄 **Refresh** buttons)\n`;
    supportText += `• Cancel and restart workflows with \`/cancel\`\n`;
    supportText += `• Return to main menu with \`/start\`\n`;
    supportText += `• Check system status for API issues\n\n`;
    
    supportText += `**Common Issues:**\n`;
    supportText += `• **API Connection Failed:** Check internet connection\n`;
    supportText += `• **Workflow Stuck:** Use \`/cancel\` and try again\n`;
    supportText += `• **Analytics Not Working:** Test Matomo connection\n`;
    supportText += `• **Commands Not Responding:** Restart with \`/start\`\n\n`;
    
    supportText += `**Still need help?**\n`;
    supportText += `Contact the bot administrator with:\n`;
    supportText += `• Description of the issue\n`;
    supportText += `• What you were trying to do\n`;
    supportText += `• Any error messages you saw\n\n`;
    
    supportText += `**Bot Status:** ✅ **Online and Ready**`;
    
    const supportMenu = this.navigationManager.getSuccessMenu(
      supportText,
      userId,
      {
        actions: [
          {
            text: `${EMOJI.SYSTEM} System Status`,
            callback: NavigationHelpers.generateCallback('nav', 'system', 'status'),
            newRow: false
          },
          {
            text: `${EMOJI.VIEW} Usage Guide`,
            callback: NavigationHelpers.generateCallback('nav', 'help', 'guide'),
            newRow: false
          },
          {
            text: `${EMOJI.INFO} About Bot`,
            callback: NavigationHelpers.generateCallback('nav', 'help', 'about'),
            newRow: true
          },
          {
            text: `${EMOJI.HELP} Main Menu`,
            callback: NavigationHelpers.generateCallback('nav', 'main'),
            newRow: false
          }
        ]
      }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, supportMenu);
  }

  /**
   * Show about information
   * @param {object} ctx - Grammy context
   */
  async showAboutInfo(ctx) {
    const userId = ctx.from.id;
    const { version } = require('../package.json');
    const { formatUptime } = require('../utils/format');
    
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);
    const startTime = new Date(Date.now() - uptime * 1000).toLocaleString();
    
    let aboutText = `ℹ️ **About Portfolio Bot**\n`;
    aboutText += `━━━━━━━━━━━━━━━━━━━\n\n`;
    
    aboutText += `**🤖 Bot Information:**\n`;
    aboutText += `• **Version:** ${escapeMarkdown(version)}\n`;
    aboutText += `• **Framework:** grammY v1.30.0\n`;
    aboutText += `• **Runtime:** Node.js\n`;
    aboutText += `• **Started:** ${escapeMarkdown(startTime)}\n`;
    aboutText += `• **Uptime:** ${escapeMarkdown(uptimeFormatted)}\n\n`;
    
    aboutText += `**🎨 Features:**\n`;
    aboutText += `• Interactive navigation with inline keyboards\n`;
    aboutText += `• Portfolio content management\n`;
    aboutText += `• Real-time analytics monitoring\n`;
    aboutText += `• Version control and backups\n`;
    aboutText += `• Smart message editing for clean UX\n\n`;
    
    aboutText += `**🛠️ Technology Stack:**\n`;
    aboutText += `• **Backend:** Node.js with grammY framework\n`;
    aboutText += `• **Analytics:** Matomo integration\n`;
    aboutText += `• **Storage:** File-based content system\n`;
    aboutText += `• **Deployment:** PM2 process management\n\n`;
    
    aboutText += `**💯 Purpose:**\n`;
    aboutText += `Manage portfolio content and monitor analytics without SSH access. `;
    aboutText += `Built for ease of use with modern Telegram bot UX patterns.`;
    
    const aboutMenu = this.navigationManager.getSuccessMenu(
      aboutText,
      userId,
      {
        actions: [
          {
            text: `${EMOJI.SYSTEM} System Status`,
            callback: NavigationHelpers.generateCallback('nav', 'system', 'status'),
            newRow: false
          },
          {
            text: `${EMOJI.ANALYTICS} Analytics Dashboard`,
            callback: NavigationHelpers.generateCallback('nav', 'analytics', 'view'),
            newRow: false
          },
          {
            text: `${EMOJI.LIST} All Commands`,
            callback: NavigationHelpers.generateCallback('nav', 'help', 'commands'),
            newRow: true
          },
          {
            text: `${EMOJI.HELP} Main Menu`,
            callback: NavigationHelpers.generateCallback('nav', 'main'),
            newRow: false
          }
        ]
      }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, aboutMenu);
  }
}

/**
 * Set up navigation handlers on bot instance
 * @param {Bot} bot - Grammy bot instance
 */
function setupNavigationHandlers(bot) {
  const navigationHandler = new NavigationHandler();
  navigationHandler.setupNavigationHandlers(bot);
}

module.exports = {
  NavigationHandler,
  setupNavigationHandlers
};