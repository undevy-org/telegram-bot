const { InlineKeyboard } = require('grammy');
const { NAVIGATION, EMOJI, NavigationHelpers } = require('../config/constants');
const { 
  getNavigationContext, 
  navigateToMenu, 
  navigateBack,
  setNavigationMessageId 
} = require('../stateManager');
const { escapeMarkdown } = require('./format');

/**
 * NavigationManager - Handles all navigation menu rendering and state management
 */
class NavigationManager {
  constructor() {
    this.categories = NAVIGATION.CATEGORIES;
    this.actions = {
      content: NAVIGATION.CONTENT_ACTIONS,
      analytics: NAVIGATION.ANALYTICS_ACTIONS,
      system: NAVIGATION.SYSTEM_ACTIONS,
      help: NAVIGATION.HELP_ACTIONS
    };
  }

  /**
   * Generate the main menu with category buttons
   * @param {number|string} userId - User ID for context
   * @returns {object} Menu data with text and keyboard
   */
  getMainMenu(userId) {
    const context = getNavigationContext(userId);
    const welcomeText = this._generateWelcomeText(context);
    
    const keyboard = new InlineKeyboard()
      .text(this.categories.CONTENT.title, NavigationHelpers.generateCallback('nav', 'content'))
      .text(this.categories.ANALYTICS.title, NavigationHelpers.generateCallback('nav', 'analytics'))
      .row()
      .text(this.categories.SYSTEM.title, NavigationHelpers.generateCallback('nav', 'system'))
      .text(this.categories.HELP.title, NavigationHelpers.generateCallback('nav', 'help'));

    return {
      text: welcomeText,
      keyboard,
      menuState: NAVIGATION.STATES.MAIN_MENU
    };
  }

  /**
   * Generate category menu (Content, Analytics, System, Help)
   * @param {string} categoryId - Category identifier
   * @param {number|string} userId - User ID for context
   * @returns {object} Menu data with text and keyboard
   */
  getCategoryMenu(categoryId, userId) {
    const category = NavigationHelpers.getCategory(categoryId);
    const actions = NavigationHelpers.getCategoryActions(categoryId);
    
    if (!category || !actions) {
      throw new Error(`Invalid category: ${categoryId}`);
    }

    const context = getNavigationContext(userId);
    const breadcrumbs = context?.breadcrumbs ? NavigationHelpers.generateBreadcrumbs(context.breadcrumbs) : 'Main Menu';
    
    const menuText = this._generateCategoryText(category, breadcrumbs);
    const keyboard = this._generateCategoryKeyboard(categoryId, actions);

    return {
      text: menuText,
      keyboard,
      menuState: `${categoryId.toLowerCase()}_category`
    };
  }

  /**
   * Generate action confirmation menu
   * @param {string} categoryId - Category identifier
   * @param {string} actionId - Action identifier
   * @param {number|string} userId - User ID for context
   * @param {object} additionalData - Additional context data
   * @returns {object} Menu data with text and keyboard
   */
  getActionConfirmationMenu(categoryId, actionId, userId, additionalData = {}) {
    const category = NavigationHelpers.getCategory(categoryId);
    const actions = NavigationHelpers.getCategoryActions(categoryId);
    const action = actions.find(a => a.id === actionId);
    
    if (!category || !action) {
      throw new Error(`Invalid action: ${categoryId}.${actionId}`);
    }

    const context = getNavigationContext(userId);
    const breadcrumbs = context?.breadcrumbs ? NavigationHelpers.generateBreadcrumbs([...context.breadcrumbs, action.title]) : `Main Menu → ${category.title} → ${action.title}`;
    
    const confirmText = this._generateConfirmationText(action, breadcrumbs, additionalData);
    const keyboard = this._generateConfirmationKeyboard(categoryId, actionId, additionalData);

    return {
      text: confirmText,
      keyboard,
      menuState: NAVIGATION.STATES.ACTIVE_WORKFLOW
    };
  }

  /**
   * Generate loading state menu
   * @param {string} message - Loading message
   * @param {boolean} showCancel - Whether to show cancel button
   * @returns {object} Menu data with text and keyboard
   */
  getLoadingMenu(message, showCancel = true) {
    const keyboard = new InlineKeyboard();
    
    if (showCancel) {
      keyboard.text(`${EMOJI.CANCEL} Cancel`, NavigationHelpers.generateCallback('act', 'cancel'));
    }

    return {
      text: `${EMOJI.LOADING} ${message}`,
      keyboard: showCancel ? keyboard : null
    };
  }

  /**
   * Generate error menu with navigation options
   * @param {string} errorMessage - Error message to display
   * @param {number|string} userId - User ID for context
   * @param {object} options - Additional options
   * @returns {object} Menu data with text and keyboard
   */
  getErrorMenu(errorMessage, userId, options = {}) {
    const context = getNavigationContext(userId);
    const currentMenu = context?.currentMenu || NAVIGATION.STATES.MAIN_MENU;
    
    const errorText = `${EMOJI.ERROR} **Error**\n\n${escapeMarkdown(errorMessage)}\n\n`;
    
    const keyboard = new InlineKeyboard();
    
    if (options.retryCallback) {
      keyboard.text(`${EMOJI.REFRESH} Try Again`, options.retryCallback).row();
    }
    
    if (currentMenu !== NAVIGATION.STATES.MAIN_MENU) {
      keyboard.text(`${EMOJI.BACK} Back`, NavigationHelpers.generateCallback('nav', 'back'));
    }
    
    keyboard.text(`${EMOJI.HELP} Main Menu`, NavigationHelpers.generateCallback('nav', 'main'));

    return {
      text: errorText,
      keyboard
    };
  }

  /**
   * Generate success menu with next action options
   * @param {string} successMessage - Success message to display
   * @param {number|string} userId - User ID for context
   * @param {object} options - Additional options and next actions
   * @returns {object} Menu data with text and keyboard
   */
  getSuccessMenu(successMessage, userId, options = {}) {
    const context = getNavigationContext(userId);
    const successText = `${EMOJI.SUCCESS} **Success**\n\n${escapeMarkdown(successMessage)}\n\n`;
    
    const keyboard = new InlineKeyboard();
    
    // Add custom action buttons if provided
    if (options.actions) {
      for (const action of options.actions) {
        keyboard.text(action.text, action.callback);
        if (action.newRow) keyboard.row();
      }
    }
    
    // Always provide navigation options
    const currentMenu = context?.currentMenu || NAVIGATION.STATES.MAIN_MENU;
    if (currentMenu !== NAVIGATION.STATES.MAIN_MENU) {
      keyboard.text(`${EMOJI.BACK} Back`, NavigationHelpers.generateCallback('nav', 'back'));
    }
    keyboard.text(`${EMOJI.HELP} Main Menu`, NavigationHelpers.generateCallback('nav', 'main'));

    return {
      text: successText,
      keyboard
    };
  }

  /**
   * Update navigation state for user
   * @param {number|string} userId - User ID
   * @param {string} menuState - New menu state
   * @param {string} menuTitle - Menu title for breadcrumbs
   * @param {number} messageId - Message ID for editing
   */
  updateNavigationState(userId, menuState, menuTitle, messageId = null) {
    navigateToMenu(userId, menuState, menuTitle, messageId);
  }

  /**
   * Handle back navigation for user
   * @param {number|string} userId - User ID
   * @returns {object|null} Previous menu info or null
   */
  handleBackNavigation(userId) {
    return navigateBack(userId);
  }

  /**
   * Set message ID for current navigation context
   * @param {number|string} userId - User ID
   * @param {number} messageId - Message ID
   */
  setMessageId(userId, messageId) {
    setNavigationMessageId(userId, messageId);
  }

  // Private helper methods

  /**
   * Generate welcome text for main menu
   * @param {object} context - Navigation context
   * @returns {string} Formatted welcome text
   * @private
   */
  _generateWelcomeText(context) {
    const time = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    let text = `🤖 **Portfolio Content Manager**\n\n`;
    text += `Welcome\\! Choose a category to get started:\n\n`;
    text += `${EMOJI.CONTENT} **Content Management** \\- Create, edit, and manage your portfolio content\n`;
    text += `${EMOJI.ANALYTICS} **Analytics** \\- View visitor statistics and monitoring\n`;
    text += `${EMOJI.SYSTEM} **System Tools** \\- System status, backups, and maintenance\n`;
    text += `${EMOJI.HELP} **Help & Info** \\- Commands, guides, and support\n\n`;
    text += `⏰ Current time: ${escapeMarkdown(time)}`;
    
    return text;
  }

  /**
   * Generate category menu text
   * @param {object} category - Category configuration
   * @param {string} breadcrumbs - Breadcrumb navigation
   * @returns {string} Formatted category text
   * @private
   */
  _generateCategoryText(category, breadcrumbs) {
    let text = `${category.title}\n`;
    text += `━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `${category.description}\n\n`;
    text += `**Navigation:** ${breadcrumbs}\n\n`;
    text += `Choose an action:`;
    
    return text;
  }

  /**
   * Generate category keyboard layout
   * @param {string} categoryId - Category identifier
   * @param {Array} actions - Available actions array
   * @returns {InlineKeyboard} Generated keyboard
   * @private
   */
  _generateCategoryKeyboard(categoryId, actions) {
    const keyboard = new InlineKeyboard();
    
    // Add action buttons (max 3 per row as per design)
    for (let i = 0; i < actions.length; i += NAVIGATION.LAYOUT.MAX_BUTTONS_PER_ROW) {
      const rowActions = actions.slice(i, i + NAVIGATION.LAYOUT.MAX_BUTTONS_PER_ROW);
      
      for (const action of rowActions) {
        keyboard.text(
          action.title, 
          NavigationHelpers.generateCallback('act', categoryId, action.id)
        );
      }
      
      keyboard.row();
    }
    
    // Add back button at bottom as per design
    keyboard.text(`${EMOJI.BACK} Back to Main Menu`, NavigationHelpers.generateCallback('nav', 'main'));
    
    return keyboard;
  }

  /**
   * Generate confirmation keyboard
   * @param {string} categoryId - Category identifier
   * @param {string} actionId - Action identifier
   * @param {object} additionalData - Additional context data
   * @returns {InlineKeyboard} Generated keyboard
   * @private
   */
  _generateConfirmationKeyboard(categoryId, actionId, additionalData) {
    const keyboard = new InlineKeyboard()
      .text(`${EMOJI.CONFIRM} Confirm`, NavigationHelpers.generateCallback('conf', categoryId, actionId, 'confirm'))
      .text(`${EMOJI.CANCEL} Cancel`, NavigationHelpers.generateCallback('nav', 'back'));
    
    return keyboard;
  }

  /**
   * Generate confirmation text
   * @param {object} action - Action configuration
   * @param {string} breadcrumbs - Breadcrumb navigation
   * @param {object} additionalData - Additional context data
   * @returns {string} Formatted confirmation text
   * @private
   */
  _generateConfirmationText(action, breadcrumbs, additionalData) {
    let text = `${EMOJI.WARNING} **Confirmation Required**\n\n`;
    text += `You are about to: **${action.title}**\n`;
    text += `${action.description}\n\n`;
    
    if (additionalData.details) {
      text += `**Details:**\n${additionalData.details}\n\n`;
    }
    
    text += `**Navigation:** ${breadcrumbs}\n\n`;
    text += `Are you sure you want to proceed\?`;
    
    return text;
  }
}

module.exports = NavigationManager;