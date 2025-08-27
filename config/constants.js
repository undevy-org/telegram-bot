module.exports = {
  // Environment variables
  TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  API_URL: process.env.API_URL,
  API_TOKEN: process.env.API_TOKEN,
  ADMIN_USER_ID: process.env.ADMIN_USER_ID,
  MATOMO_TOKEN: process.env.MATOMO_TOKEN,
  PORTFOLIO_NAME: process.env.PORTFOLIO_NAME || 'Portfolio',
  
  // Paths and directories
  BACKUP_DIR: process.env.BACKUP_DIR,
  
  // Analytics
  MATOMO_URL: process.env.MATOMO_URL,
  MATOMO_SITE_ID: '1',
  ANALYTICS_CHECK_INTERVAL: 5 * 60 * 1000,
  
  // Bot settings
  MAX_MESSAGE_LENGTH: 4096,
  BACKUP_RETENTION: 10,
  
  // Emojis for bot responses
  EMOJI: {
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    LOADING: '⏳',
    NEW: '🆕',
    EDIT: '✏️',
    DELETE: '🗑️',
    ANALYTICS: '📊',
    VISIT: '🎯',
    ANONYMOUS: '👤',
    // Navigation emojis
    CONTENT: '📝',
    SYSTEM: '⚙️',
    HELP: '❓',
    BACK: '←',
    LIST: '📋',
    CREATE: '🆕',
    VIEW: '👁️',
    REFRESH: '🔄',
    SETTINGS: '🔧',
    CANCEL: '❌',
    CONFIRM: '✅',
    SKIP: '⏭️',
    PREVIOUS: '⬅️',
    NEXT: '➡️'
  },

  // Navigation constants
  NAVIGATION: {
    // Menu states
    STATES: {
      MAIN_MENU: 'main_menu',
      CONTENT_CATEGORY: 'content_category',
      ANALYTICS_CATEGORY: 'analytics_category',
      SYSTEM_CATEGORY: 'system_category',
      HELP_CATEGORY: 'help_category',
      ACTIVE_WORKFLOW: 'active_workflow'
    },

    // Callback data patterns
    CALLBACKS: {
      NAVIGATION: 'nav',
      WORKFLOW: 'wf',
      CONFIRMATION: 'conf',
      PAGINATION: 'page',
      ACTION: 'act'
    },

    // Menu categories
    CATEGORIES: {
      CONTENT: {
        id: 'content',
        title: '📝 Content Management',
        description: 'Create, edit, and manage portfolio content'
      },
      ANALYTICS: {
        id: 'analytics',
        title: '📊 Analytics',
        description: 'View visitor statistics and monitoring'
      },
      SYSTEM: {
        id: 'system',
        title: '⚙️ System Tools',
        description: 'System status, backups, and maintenance'
      },
      HELP: {
        id: 'help',
        title: '❓ Help & Info',
        description: 'Commands, guides, and support information'
      }
    },

    // Content management actions
    CONTENT_ACTIONS: {
      CREATE: { id: 'create', title: '🆕 Create Content', description: 'Add new case studies or profiles' },
      EDIT: { id: 'edit', title: '✏️ Edit Content', description: 'Modify existing content' },
      DELETE: { id: 'delete', title: '🗑️ Delete Content', description: 'Remove content items' },
      LIST: { id: 'list', title: '📋 List All Content', description: 'View all content items' },
      PREVIEW: { id: 'preview', title: '👁️ Preview Content', description: 'Preview content before publishing' }
    },

    // Analytics actions
    ANALYTICS_ACTIONS: {
      VIEW: { id: 'view', title: '📊 View Analytics', description: 'Current visitor statistics' },
      RECENT: { id: 'recent', title: '🎯 Recent Visits', description: 'Latest visitor activity' },
      TEST: { id: 'test', title: '🔧 Test Connection', description: 'Test Matomo connection' },
      START: { id: 'start', title: '▶️ Start Monitor', description: 'Begin analytics monitoring' },
      STOP: { id: 'stop', title: '⏹️ Stop Monitor', description: 'Stop analytics monitoring' },
      REFRESH: { id: 'refresh', title: '🔄 Refresh Now', description: 'Update analytics data' }
    },

    // System tools actions
    SYSTEM_ACTIONS: {
      STATUS: { id: 'status', title: '📊 System Status', description: 'Check system health and status' },
      HISTORY: { id: 'history', title: '📜 Version History', description: 'View content change history' },
      DOWNLOAD: { id: 'download', title: '💾 Download Content', description: 'Export current content' },
      ROLLBACK: { id: 'rollback', title: '⏪ Rollback', description: 'Restore previous version' },
      CANCEL: { id: 'cancel', title: '❌ Cancel Operations', description: 'Cancel active operations' }
    },

    // Help actions
    HELP_ACTIONS: {
      COMMANDS: { id: 'commands', title: '📝 All Commands', description: 'Complete list of bot commands' },
      GUIDE: { id: 'guide', title: '📖 Usage Guide', description: 'How to use the bot effectively' },
      SUPPORT: { id: 'support', title: '💬 Contact Support', description: 'Get help with issues' },
      ABOUT: { id: 'about', title: 'ℹ️ About Bot', description: 'Bot version and information' }
    },

    // Layout settings
    LAYOUT: {
      MAX_BUTTONS_PER_ROW: 3,
      MAX_ROWS: 8,
      BACK_BUTTON_POSITION: 'bottom-left'
    }
  }
};

// Navigation helper functions
const NavigationHelpers = {
  /**
   * Generate callback data for navigation
   * @param {string} type - Callback type (nav, wf, conf, etc.)
   * @param {...string} parts - Additional parts to join
   * @returns {string} Formatted callback data
   */
  generateCallback: (type, ...parts) => {
    return [type, ...parts].join('_');
  },

  /**
   * Parse callback data
   * @param {string} callbackData - The callback data to parse
   * @returns {object} Parsed callback object
   */
  parseCallback: (callbackData) => {
    const parts = callbackData.split('_');
    return {
      type: parts[0],
      action: parts[1],
      data: parts.slice(2)
    };
  },

  /**
   * Get category configuration by ID
   * @param {string} categoryId - Category identifier
   * @returns {object|null} Category configuration or null if not found
   */
  getCategory: (categoryId) => {
    const categories = module.exports.NAVIGATION.CATEGORIES;
    return Object.values(categories).find(cat => cat.id === categoryId) || null;
  },

  /**
   * Get actions for a specific category
   * @param {string} categoryId - Category identifier
   * @returns {object[]} Array of action configurations
   */
  getCategoryActions: (categoryId) => {
    const actionsMap = {
      'content': module.exports.NAVIGATION.CONTENT_ACTIONS,
      'analytics': module.exports.NAVIGATION.ANALYTICS_ACTIONS,
      'system': module.exports.NAVIGATION.SYSTEM_ACTIONS,
      'help': module.exports.NAVIGATION.HELP_ACTIONS
    };
    return Object.values(actionsMap[categoryId] || {});
  },

  /**
   * Generate breadcrumb string
   * @param {string[]} menuHistory - Array of menu names
   * @returns {string} Formatted breadcrumb string
   */
  generateBreadcrumbs: (menuHistory) => {
    return menuHistory.join(' → ');
  }
};

module.exports.NavigationHelpers = NavigationHelpers;