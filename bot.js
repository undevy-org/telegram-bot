const fs = require('fs');
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config();
}

const { Bot } = require('grammy');
const { version } = require('./package.json');
const fsPromises = require('fs').promises;
const path = require('path');

const { TOKEN, ADMIN_USER_ID, ENABLE_ANALYTICS } = require('./config/constants');
const authMiddleware = require('./middleware/auth');
const { setupErrorHandler } = require('./handlers/errors');
const { setupCallbackHandlers } = require('./handlers/callbacks');
const { handleConversation } = require('./handlers/conversations');
const { registerCommands, analytics } = require('./commands');
const AnalyticsMonitor = require('./analytics');
const { escapeMarkdown } = require('./utils/format');

if (!TOKEN) {
  console.error('[BOT] Missing TELEGRAM_BOT_TOKEN! Please check your .env file');
  process.exit(1);
}

const bot = new Bot(TOKEN);
console.log('[BOT] Bot instance created');

const analyticsMonitor = new AnalyticsMonitor(bot, ADMIN_USER_ID);
analytics.setAnalyticsMonitor(analyticsMonitor);
console.log('[BOT] Analytics monitor initialized');

bot.use(authMiddleware);
console.log('[BOT] Auth middleware attached');

setupErrorHandler(bot);
console.log('[BOT] Error handler configured');

registerCommands(bot);
console.log('[BOT] Commands registered');

setupCallbackHandlers(bot);
console.log('[BOT] Callback handlers configured');

bot.on('message:text', async (ctx) => {
  // First try to handle as part of conversation
  const handled = await handleConversation(ctx);
  
  // If not part of conversation and starts with /, it's an unknown command
  if (!handled && ctx.message.text.startsWith('/')) {
    await ctx.reply('❓ Unknown command. Use /help to see available commands.');
  }
});

async function sendDeploymentNotification() {
  try {
    // Format deployment time in Moscow timezone
    const deployTime = new Date().toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    
    // Check if this is a new version deployment
    const versionFile = path.join(__dirname, '.last-version');
    let previousVersion = null;
    let isNewVersion = false;
    
    try {
      // Try to read previous version from file
      previousVersion = await fsPromises.readFile(versionFile, 'utf8');
      isNewVersion = previousVersion !== version;
    } catch (error) {
      // File doesn't exist, this is first deployment
      isNewVersion = true;
    }
    
    let message = '';
    if (isNewVersion) {
      // New version deployed message
      message = `🚀 *New Deployment\\!*\n\n`;
      message += `📦 *Version:* \`v${version}\`\n`;
      if (previousVersion) {
        message += `📤 *Previous:* \`v${previousVersion}\`\n`;
      }
      message += `⏰ *Time:* ${escapeMarkdown(deployTime)}\n`;
      message += `✅ *Status:* Bot is running and ready for work\n\n`;
      message += `Use /status to check the system\\.`;
      
      // Save current version for next comparison
      await fsPromises.writeFile(versionFile, version);
    } else {
      // Bot restart without version change
      message = `♻️ *Bot Restarted*\n\n`;
      message += `📦 *Version:* \`v${version}\` \\(no changes\\)\n`;
      message += `⏰ *Time:* ${escapeMarkdown(deployTime)}\n`;
      message += `✅ *Status:* Bot is online again`;
    }
    
    // Send notification to admin via Telegram
    await bot.api.sendMessage(ADMIN_USER_ID, message, {
      parse_mode: 'MarkdownV2'
    });
    
    console.log(`[BOT] Deployment notification sent: v${version}`);
  } catch (error) {
    console.error('[BOT] Failed to send deployment notification:', error);
    // Don't crash the bot if notification fails
  }
}

bot.start({
  onStart: () => {
    console.log('[BOT] ✅ Bot started successfully!');
    console.log(`[BOT] Version: v${version}`);
    console.log('[BOT] Waiting for messages...');
    
    sendDeploymentNotification();
        if (ENABLE_ANALYTICS) {
            analyticsMonitor.start();
            console.log('[BOT] Analytics monitoring is enabled and started');
        } else {
            console.log('[BOT] Analytics monitoring is disabled');
        }
    },
});

process.once('SIGINT', () => {
  console.log('[BOT] Received SIGINT, shutting down gracefully...');
  analyticsMonitor.stop();
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('[BOT] Received SIGTERM, shutting down gracefully...');
  analyticsMonitor.stop();
  bot.stop('SIGTERM');
});

console.log('[BOT] Bot initialization complete');