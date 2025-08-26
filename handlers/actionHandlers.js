const { withErrorHandling } = require('./errors');
const { EMOJI } = require('../config/constants');

// Import all command handlers
const contentCommands = require('../commands/content');
const analyticsCommands = require('../commands/analytics');
const systemCommands = require('../commands/system');

/**
 * Action handler mapping - connects navigation button callbacks to actual command functions
 * Format: 'category_action': handlerFunction
 */
const actionHandlerMap = {
  // Content Management Actions
  'content_create': contentCommands.handleAddCase,
  'content_edit': createEditCaseHandler(),
  'content_delete': createDeleteCaseHandler(),
  'content_list': contentCommands.handleListCases,
  'content_preview': createPreviewHandler(),

  // Analytics Actions
  'analytics_view': analyticsCommands.handleAnalytics,
  'analytics_recent': analyticsCommands.handleRecentVisits,
  'analytics_test': analyticsCommands.handleTestMatomo,
  'analytics_start': analyticsCommands.handleAnalyticsStart,
  'analytics_stop': analyticsCommands.handleAnalyticsStop,
  'analytics_refresh': analyticsCommands.handleAnalytics, // Force refresh same as view

  // System Tools Actions
  'system_status': systemCommands.handleStatus,
  'system_history': contentCommands.handleHistory,
  'system_download': contentCommands.handleGet,
  'system_rollback': createRollbackHandler(),
  'system_cancel': systemCommands.handleCancel,

  // Help Actions
  'help_commands': systemCommands.handleHelpText,
  'help_guide': createUsageGuideHandler(),
  'help_support': createSupportHandler(),
  'help_about': createAboutHandler()
};

/**
 * Create wrapper for edit case that prompts for case ID
 */
function createEditCaseHandler() {
  return withErrorHandling(async (ctx) => {
    await ctx.reply(
      `✏️ *Edit Case Study*\n\n` +
      `Please enter the case ID you want to edit:\n\n` +
      `💡 Use /list_cases to see all available cases`,
      { parse_mode: 'MarkdownV2' }
    );
    
    // Set a temporary state to capture the next message as case ID
    const stateManager = require('../stateManager');
    const userId = ctx.from.id;
    
    stateManager.initUserState(userId);
    stateManager.updateUserState(userId, {
      command: 'edit_case_prompt',
      currentStep: 'waiting_case_id',
      data: { fromNavigation: true }
    });
  });
}

/**
 * Create wrapper for delete case that prompts for case ID
 */
function createDeleteCaseHandler() {
  return withErrorHandling(async (ctx) => {
    await ctx.reply(
      `🗑️ *Delete Case Study*\n\n` +
      `Please enter the case ID you want to delete:\n\n` +
      `⚠️ This action cannot be undone!\n` +
      `💡 Use /list_cases to see all available cases`,
      { parse_mode: 'MarkdownV2' }
    );
    
    // Set a temporary state to capture the next message as case ID
    const stateManager = require('../stateManager');
    const userId = ctx.from.id;
    
    stateManager.initUserState(userId);
    stateManager.updateUserState(userId, {
      command: 'delete_case_prompt',
      currentStep: 'waiting_case_id',
      data: { fromNavigation: true }
    });
  });
}

/**
 * Create wrapper for preview that prompts for case ID
 */
function createPreviewHandler() {
  return withErrorHandling(async (ctx) => {
    await ctx.reply(
      `👁️ *Preview Case Study*\n\n` +
      `Please enter the case ID you want to preview:\n\n` +
      `💡 Use /list_cases to see all available cases`,
      { parse_mode: 'MarkdownV2' }
    );
    
    // Set a temporary state to capture the next message as case ID
    const stateManager = require('../stateManager');
    const userId = ctx.from.id;
    
    stateManager.initUserState(userId);
    stateManager.updateUserState(userId, {
      command: 'preview_case_prompt',
      currentStep: 'waiting_case_id',
      data: { fromNavigation: true }
    });
  });
}

/**
 * Create wrapper for rollback that prompts for version number
 */
function createRollbackHandler() {
  return withErrorHandling(async (ctx) => {
    await ctx.reply(
      `↩️ *Rollback to Previous Version*\n\n` +
      `Please enter the version number to rollback to:\n\n` +
      `💡 Use the System Tools → Version History to see available versions`,
      { parse_mode: 'MarkdownV2' }
    );
    
    // Set a temporary state to capture the next message as version number
    const stateManager = require('../stateManager');
    const userId = ctx.from.id;
    
    stateManager.initUserState(userId);
    stateManager.updateUserState(userId, {
      command: 'rollback_prompt',
      currentStep: 'waiting_version',
      data: { fromNavigation: true }
    });
  });
}

/**
 * Create usage guide handler
 */
function createUsageGuideHandler() {
  return withErrorHandling(async (ctx) => {
    const guideMessage = `
📖 *Usage Guide*

*🚀 Getting Started:*
1\\. Use the main menu to navigate between categories
2\\. Tap buttons to perform actions
3\\. Follow the interactive prompts

*📝 Content Management:*
• *Create* \\- Add new case studies with step\\-by\\-step wizard
• *Edit* \\- Modify existing content with guided prompts
• *Delete* \\- Remove content with safety confirmations
• *List* \\- View all your case studies at once

*📊 Analytics:*
• *View Dashboard* \\- See real\\-time visitor statistics
• *Recent Visits* \\- Check latest visitor activity
• *Monitor Controls* \\- Start/stop automatic monitoring

*⚙️ System Tools:*
• *Status* \\- Check system health and statistics
• *History* \\- View content change timeline
• *Download* \\- Export your content as JSON file
• *Rollback* \\- Restore previous versions

*💡 Pro Tips:*
• Use /cancel to exit any active dialog
• Use /skip to skip optional fields during creation
• All features work with both buttons and commands
• Your data is automatically backed up on changes

*🔧 Troubleshooting:*
• If buttons don't work, try /start to refresh
• Use text commands as backup \\(type /help\\)
• Contact support if you encounter issues
`;

    await ctx.reply(guideMessage, { parse_mode: 'MarkdownV2' });
  });
}

/**
 * Create support handler
 */
function createSupportHandler() {
  return withErrorHandling(async (ctx) => {
    const supportMessage = `
💬 *Contact Support*

*🆘 Need Help?*
If you're experiencing issues or need assistance:

*📧 Contact Options:*
• Create an issue on the project repository
• Contact the system administrator
• Check the documentation for common solutions

*🔍 Before Contacting Support:*
1\\. Try /status to check system health
2\\. Use /start to refresh the interface
3\\. Check if the issue persists after restart

*📊 System Information:*
• Bot Version: ${require('../package.json').version}
• Status: Running
• Last restart: ${new Date().toLocaleString()}

*🛠️ Common Solutions:*
• *Buttons not working?* Try /start to refresh
• *Commands not responding?* Check /status
• *Analytics not updating?* Use Analytics → Test Connection

*💡 Remember:*
This bot manages your portfolio content and analytics\\.
All changes are automatically backed up for safety\\.
`;

    await ctx.reply(supportMessage, { parse_mode: 'MarkdownV2' });
  });
}

/**
 * Create about handler
 */
function createAboutHandler() {
  return withErrorHandling(async (ctx) => {
    const { version } = require('../package.json');
    const uptime = process.uptime();
    const formatUptime = require('../utils/format').formatUptime;
    
    const aboutMessage = `
ℹ️ *About Portfolio Content Manager*

*🤖 Bot Information:*
• Version: ${version}
• Framework: grammY v1\\.30\\.0
• Runtime: Node\\.js ${process.version}
• Uptime: ${formatUptime(uptime)}

*🎯 Purpose:*
This bot helps you manage your portfolio content without direct server access\\. You can create, edit, and delete case studies, monitor visitor analytics, and maintain your content safely\\.

*✨ Key Features:*
• Interactive content management
• Real\\-time analytics monitoring
• Automatic backups and version control
• Button\\-driven navigation
• Text command fallbacks

*🛡️ Security:*
• User authentication required
• Confirmation prompts for destructive actions
• Automatic data backups
• Bearer token API protection

*📝 Built With:*
• grammY \\- Telegram Bot Framework
• Node\\.js \\- Runtime Environment
• Matomo \\- Analytics Integration
• Custom API \\- Content Management

*🚀 Performance:*
• Real\\-time updates every 5 minutes
• Instant command response
• Efficient message editing
• Smart fallback mechanisms

Thank you for using Portfolio Content Manager\\!
`;

    await ctx.reply(aboutMessage, { parse_mode: 'MarkdownV2' });
  });
}

/**
 * Get action handler by callback data
 * @param {string} callbackData - The full callback data (e.g., 'act_content_list')
 * @returns {function|null} Handler function or null if not found
 */
function getActionHandler(callbackData) {
  // Parse callback data to get category and action
  const parts = callbackData.split('_');
  if (parts.length < 3 || parts[0] !== 'act') {
    return null;
  }
  
  const category = parts[1];
  const action = parts[2];
  const handlerKey = `${category}_${action}`;
  
  return actionHandlerMap[handlerKey] || null;
}

/**
 * Execute action handler
 * @param {string} callbackData - The callback data
 * @param {Object} ctx - Grammy context
 * @returns {Promise<boolean>} True if handler was found and executed
 */
async function executeActionHandler(callbackData, ctx) {
  const handler = getActionHandler(callbackData);
  
  if (!handler) {
    await ctx.reply(
      `${EMOJI.ERROR} This feature is not yet implemented\\.\n\n` +
      `Callback: \`${callbackData}\``,
      { parse_mode: 'MarkdownV2' }
    );
    return false;
  }
  
  try {
    await handler(ctx);
    return true;
  } catch (error) {
    console.error(`[ACTION_HANDLER] Error executing ${callbackData}:`, error);
    await ctx.reply(
      `${EMOJI.ERROR} Error executing action: ${error.message}`
    );
    return false;
  }
}

module.exports = {
  actionHandlerMap,
  getActionHandler,
  executeActionHandler
};