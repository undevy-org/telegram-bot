const { EMOJI } = require('../config/constants');
const { escapeMarkdown, formatFileSize, formatDate } = require('../utils/format');
const { getContent } = require('../services/api');
const { withErrorHandling } = require('../handlers/errors');
const stateManager = require('../stateManager');
const { version } = require('../package.json');
const { formatUptime } = require('../utils/format');
const NavigationManager = require('../utils/navigationManager');
const MessageEditor = require('../utils/messageEditor');

// Initialize navigation components
const navigationManager = new NavigationManager();
const messageEditor = new MessageEditor();

/**
 * Handles /start and /help commands
 * Shows interactive main menu with navigation buttons
 */
const handleStart = withErrorHandling(async (ctx) => {
  const userId = ctx.from.id;
  
  // Initialize user state for navigation
  stateManager.initUserState(userId);
  
  // Get main menu from navigation manager
  const menuData = navigationManager.getMainMenu(userId);
  
  // Update navigation state
  navigationManager.updateNavigationState(userId, menuData.menuState, 'Main Menu');
  
  // Send the interactive menu
  const result = await messageEditor.updateMenuMessage(ctx, menuData);
  
  // Store message ID for future edits
  if (result.success && result.messageId) {
    navigationManager.setMessageId(userId, result.messageId);
  }
  
  console.log(`[SYSTEM] User ${userId} started bot, showing main menu`);
});

/**
 * Show text-based help as fallback or for power users
 */
const handleHelpText = withErrorHandling(async (ctx) => {
  const welcomeMessage = `
🤖 *Portfolio Content Manager*

Available commands:

*Content Viewing:*
\\- /status — Check system status
\\- /get — Download current content\\.json
\\- /list\\_cases — List available case studies
\\- /preview \\[case\\_id\\] — View case study details

*Content Management:*
\\- /add\\_case — Create new case study \\(interactive\\)
\\- /edit\\_case \\[id\\] — Edit existing case study
\\- /delete\\_case \\[id\\] — Delete case study

*Version Control:*
\\- /history — View last 10 versions
\\- /rollback N — Restore version N
\\- /diff N \\[M\\] — Compare versions

*Analytics:*
\\- /analytics — Force check for new visits
\\- /recent\\_visits — Show last 5 visits
\\- /analytics\\_stop — Stop monitoring
\\- /analytics\\_start — Start monitoring

*Utility:*
\\- /cancel — Cancel active dialog
\\- /skip — Skip optional field
\\- /keep — Keep existing value \\(edit mode\\)

💡 Use /start for interactive menu
`;

  await ctx.reply(welcomeMessage, { parse_mode: 'MarkdownV2' });
});

/**
 * Handles /status command
 * Shows system status and statistics
 */
const handleStatus = withErrorHandling(async (ctx) => {
  await ctx.reply(`${EMOJI.LOADING} Checking status...`);
  
  const result = await getContent();
  
  const profileCount = Object.keys(result.content)
    .filter(key => key === key.toUpperCase() && key !== 'GLOBAL_DATA')
    .length;
  
  const caseCount = Object.keys(result.content.GLOBAL_DATA?.case_studies || {}).length;
  
  const uptime = process.uptime();
  const uptimeFormatted = formatUptime(uptime);
  
  const statusMessage = `
${EMOJI.SUCCESS} *System Status*

📊 *Content Statistics:*
\\- Profiles: ${escapeMarkdown(profileCount.toString())}
\\- Case studies: ${escapeMarkdown(caseCount.toString())}
\\- File size: ${escapeMarkdown(formatFileSize(result.stats.fileSize))}
\\- Last modified: ${escapeMarkdown(formatDate(result.stats.lastModified))}

🔗 *System Info:*
\\- Bot version: ${escapeMarkdown(version)}
\\- Uptime: ${escapeMarkdown(uptimeFormatted)}
\\- API status: Connected
\\- Server time: ${escapeMarkdown(formatDate(result.timestamp))}

💡 Use /list\\_cases to see all available cases
`;
  
  await ctx.reply(statusMessage, { parse_mode: 'MarkdownV2' });
});

/**
 * Handles /cancel command
 * Cancels any active conversation
 */
const handleCancel = withErrorHandling(async (ctx) => {
  const userId = ctx.from.id;
  
  if (!stateManager.hasActiveState(userId)) {
    return await ctx.reply(`${EMOJI.ERROR} You don't have any active sessions.`);
  }
  
  const state = stateManager.getUserState(userId);
  const command = state.command;
  
  stateManager.clearUserState(userId);
  
  await ctx.reply(
    `${EMOJI.SUCCESS} ${escapeMarkdown(command)} session cancelled\\. All entered data has been deleted\\.`,
    { parse_mode: 'MarkdownV2' }
  );
});

/**
 * Handles /skip command
 * Works only in active conversations
 */
const handleSkip = withErrorHandling(async (ctx) => {
  const userId = ctx.from.id;
  const state = stateManager.getUserState(userId);
  
  if (!state || !state.command) {
    return await ctx.reply(
      `${EMOJI.ERROR} The /skip command only works during content creation or editing.`
    );
  }
  
  // Forward to conversation handler with special /skip text
  ctx.message.text = '/skip';
  // This will be handled by conversation handler
});

/**
 * Handles /keep command  
 * Works only during edit conversations
 */
const handleKeep = withErrorHandling(async (ctx) => {
  const userId = ctx.from.id;
  const state = stateManager.getUserState(userId);
  
  if (!state || state.command !== 'edit_case') {
    return await ctx.reply(
      `${EMOJI.ERROR} The /keep command only works during case editing.`
    );
  }
  
  // Forward to conversation handler
  ctx.message.text = '/keep';
  // This will be handled by conversation handler
});

module.exports = {
  handleStart,
  handleHelpText,
  handleStatus,
  handleCancel,
  handleSkip,
  handleKeep
};