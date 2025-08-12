const fs = require('fs');
if (fs.existsSync('.env.local')) {
  require('dotenv').config({ path: '.env.local' });
} else {
  require('dotenv').config();
}

const { Bot } = require('grammy');

const { TOKEN, ADMIN_USER_ID } = require('./config/constants');
const authMiddleware = require('./middleware/auth');
const { setupErrorHandler } = require('./handlers/errors');
const { setupCallbackHandlers } = require('./handlers/callbacks');
const { handleConversation } = require('./handlers/conversations');
const { registerCommands, analytics } = require('./commands');
const AnalyticsMonitor = require('./analytics');

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

bot.start({
  onStart: () => {
    console.log('[BOT] ✅ Bot started successfully!');
    console.log('[BOT] Waiting for messages...');
    
    analyticsMonitor.start();
    console.log('[BOT] Analytics monitoring started');
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