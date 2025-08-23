# Portfolio CMS Telegram Bot

A modular Telegram bot for managing portfolio content without SSH access. Built with grammY framework.

## Architecture Overview

The bot follows a modular architecture pattern with clear separation of concerns:

- **bot.js** - Main entry point that orchestrates all modules
- **config/** - Centralized configuration and constants
- **commands/** - All bot command implementations
- **handlers/** - Event handling and conversation flows
- **services/** - External API integrations
- **utils/** - Reusable utility functions
- **middleware/** - Request preprocessing (auth, logging)

## Key Features

### Content Management
- Create, edit, and delete case studies with interactive wizards
- Preview content before making changes
- Automatic validation and error handling

### Version Control
- Automatic backups on every change
- View change history
- Rollback to any previous version
- Compare differences between versions

### Analytics Integration
- Real-time visitor notifications
- Automatic monitoring every 5 minutes
- Detailed visit information (location, device, pages viewed)

### Security
- Telegram User ID based authentication
- Bearer token for API access
- Confirmation prompts for destructive operations

## Development

### Prerequisites
- Node.js 20.x or later
- Telegram Bot Token (from @BotFather)

### Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Configure your `.env`:
   ```env
   TELEGRAM_BOT_TOKEN=your_bot_token
   API_URL=https://your-domain.com/api/admin/content
   API_TOKEN=your_api_token
   ADMIN_USER_ID=your_telegram_id
   BACKUP_DIR=./content-backups
   MATOMO_URL=https://analytics.your-domain.com
   MATOMO_TOKEN=your_matomo_token
   PORTFOLIO_NAME=Your Portfolio
   ```

4. Run the bot:
   ```bash
   npm start
   ```

### Testing

Always test changes locally before deploying:

1. Start the portfolio locally (`npm run dev` in parent directory)
2. Run the bot with test configuration
3. Test all major command flows
4. Verify error handling works correctly

## Deployment

The bot is deployed via GitHub Actions:

1. Commit and push changes to main branch
2. GitHub Actions automatically deploys to server
3. Bot restarts via PM2

Monitor deployment:
```bash

pm2 logs YOUR_BOT_PROCESS_NAME --lines 100
```

### Required GitHub Secrets

- `SSH_HOST`: Production server IP
- `SSH_USER`: Server username  
- `SSH_PRIVATE_KEY`: SSH key for deployment
- `DEPLOY_PATH_BOT`: Bot deployment path
- `PM2_APP_NAME_BOT`: PM2 process name

## Commands

- `/start` - Initialize bot
- `/help` - Show all commands
- `/status` - Check bot and API status
- `/stats` - View portfolio statistics
- `/list` - List all cases
- `/add_case` - Create new case
- `/edit_case_[id]` - Edit existing case
- `/delete_case_[id]` - Delete case
- `/history` - View change history
- `/restore` - Restore from backup

## Architecture

The bot integrates with the portfolio API to manage content stored in `content.json` on the server.

## Related Repositories

- [Portfolio Frontend](https://github.com/undevy-org/portfolio) - Main portfolio application

## Version

See [package.json](./package.json) for current version.

## Troubleshooting

### Bot not responding
- Check PM2 status: `pm2 status`
- View logs: `pm2 logs YOUR_BOT_PROCESS_NAME`
- Verify environment variables are set

### API connection errors
- Ensure portfolio is running
- Check API_TOKEN matches server configuration
- Verify network connectivity

### Analytics not working
- Confirm MATOMO_TOKEN is set correctly
- Test connection with `/test_matomo`
- Check Matomo API is accessible