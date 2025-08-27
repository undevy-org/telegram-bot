// Setup file for Jest tests
// Mock environment variables
process.env.TELEGRAM_BOT_TOKEN = 'test_token';
process.env.API_URL = 'http://localhost:3000/api/admin/content';
process.env.API_TOKEN = 'test_api_token';
process.env.ADMIN_USER_ID = '123456789';
process.env.BACKUP_DIR = './test-backups';
process.env.MATOMO_URL = 'https://analytics.example.com';
process.env.MATOMO_TOKEN = 'test_matomo_token';
process.env.PORTFOLIO_NAME = 'Test Portfolio';