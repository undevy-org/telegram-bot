# Telegram Bot CMS: Setup & Deployment Guide

This document provides a step-by-step guide to setting up the Telegram Bot CMS on a new server.

**Prerequisite:** This bot is a headless CMS for the **Interactive Terminal Portfolio**. It requires a running instance of the portfolio application to connect to its Admin API. Before proceeding, ensure you have a deployed and functional portfolio.

-   [Portfolio Setup Guide](https://github.com/undevy-org/portfolio/blob/main/SETUP.md)

## 1. Server Prerequisites

### 1.1. Environment
-   A server running Ubuntu 22.04 LTS or another modern Linux distribution.
-   [Node.js](https://nodejs.org/) (v20.x or later, preferably managed via `nvm`).
-   [Git](https://git-scm.com/).
-   [PM2](https://pm2.keymetrics.io/) for process management.

### 1.2. Credentials
-   A Telegram Bot Token from [@BotFather](https://t.me/BotFather).
-   Your personal Telegram User ID.
-   The URL and Admin Token for your portfolio's Admin API.

## 2. Server Preparation

If you are deploying the bot on the same server as the portfolio, you can skip to section 3. If on a new server, follow these steps.

### 2.1. Install Node.js and PM2
```bash
# Install Node.js Version Manager (nvm) and the latest LTS Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install --lts

# Install PM2 globally
npm install pm2 -g
```

## 3. Bot Deployment

### 3.1. Clone the Repository
Clone the bot repository into your desired directory on the server.

```bash
# Example: cloning into the user's home directory
git clone https://github.com/undevy-org/telegram-bot.git ~/telegram-bot
cd ~/telegram-bot
```

### 3.2. Install Dependencies
Install the required Node.js packages.

```bash
npm install --production
```

### 3.3. Configure Environment Variables
Create a `.env` file for your production settings.

1.  Copy the example file:
    ```bash
    cp .env.example .env
    ```
2.  Edit the file with your credentials:
    ```bash
    nano .env
    ```
3.  Fill in all the required values:
    ```env
    # Telegram Bot Token from @BotFather
    TELEGRAM_BOT_TOKEN=your_bot_token

    # Your personal Telegram ID for admin access
    ADMIN_USER_ID=your_telegram_id

    # URL of your portfolio's admin API
    API_URL=https://your-domain.com/api/admin/content

    # Secret token for your portfolio's admin API
    API_TOKEN=your_api_token
    
    # (Optional) Matomo analytics settings for visitor notifications
    MATOMO_URL=https://analytics.your-domain.com
    MATOMO_TOKEN=your_matomo_api_token
    ```

### 3.4. Run the Bot with PM2
Start the bot as a persistent background process using PM2.

```bash
# Start the bot and give it a descriptive name
pm2 start bot.js --name "portfolio-bot"

# Save the process list to have it restart on server reboots
pm2 save
```

### 3.5. Verify Installation
Check the bot's status and logs to ensure it started correctly.

```bash
# Check status (should show 'online')
pm2 status

# View live logs for any errors
pm2 logs portfolio-bot
```
You can now interact with your bot in Telegram. Send the `/start` command to verify it is responsive.

## 4. CI/CD Automation (GitHub Actions)

To enable automated deployments on every push to the `main` branch, you need to configure GitHub Secrets.

### 4.1. Required Secrets
Add these secrets to your bot's repository settings (`Settings > Secrets and variables > Actions`):

-   `SSH_HOST`: Your server's IP address.
-   `SSH_USER`: Your server username.
-   `SSH_PRIVATE_KEY`: An SSH private key that has access to your server.
-   `DEPLOY_PATH_BOT`: The absolute path to the bot's directory on the server (e.g., `/home/your_user/telegram-bot`).
-   `PM2_APP_NAME_BOT`: The name of the PM2 process (e.g., `portfolio-bot`).

With these secrets in place, the `deploy.yml` workflow will automatically handle future updates.