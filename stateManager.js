// Simple in-memory state management for user conversations
const userStates = new Map();
const { NAVIGATION } = require('./config/constants');

const ADD_CASE_STATES = {
  WAITING_ID: 'waiting_id',
  WAITING_TITLE: 'waiting_title',
  WAITING_DESC: 'waiting_desc',
  WAITING_METRICS: 'waiting_metrics',
  WAITING_TAGS: 'waiting_tags',
  WAITING_CHALLENGE: 'waiting_challenge',
  WAITING_APPROACH: 'waiting_approach',
  WAITING_SOLUTION: 'waiting_solution',
  WAITING_RESULTS: 'waiting_results',
  WAITING_LEARNINGS: 'waiting_learnings'
};

const EDIT_CASE_STATES = {
  WAITING_CASE_ID: 'waiting_case_id_to_edit',
  WAITING_TITLE: 'waiting_title_edit',
  WAITING_DESC: 'waiting_desc_edit',
  WAITING_METRICS: 'waiting_metrics_edit',
  WAITING_TAGS: 'waiting_tags_edit',
  WAITING_CHALLENGE: 'waiting_challenge_edit',
  WAITING_APPROACH: 'waiting_approach_edit',
  WAITING_SOLUTION: 'waiting_solution_edit',
  WAITING_RESULTS: 'waiting_results_edit',
  WAITING_LEARNINGS: 'waiting_learnings_edit'
};

function initUserState(userId) {
  userStates.set(userId, {
    command: null,
    currentStep: null,
    data: {},
    startedAt: Date.now(),
    // Navigation context
    navigation: {
      currentMenu: NAVIGATION.STATES.MAIN_MENU,
      menuHistory: ['Main Menu'],
      messageId: null,
      lastAction: null,
      breadcrumbs: ['Main Menu'],
      lastInteraction: Date.now()
    }
  });
}

function getUserState(userId) {
  return userStates.get(userId);
}

function updateUserState(userId, updates) {
  const currentState = getUserState(userId) || {};
  userStates.set(userId, {
    ...currentState,
    ...updates
  });
}

function clearUserState(userId) {
  userStates.delete(userId);
}

function hasActiveState(userId) {
  return userStates.has(userId);
}

// Clean up old states (older than 1 hour)
function cleanupOldStates() {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  for (const [userId, state] of userStates.entries()) {
    if (state.startedAt < oneHourAgo) {
      userStates.delete(userId);
    }
  }
}

// Navigation-specific state management functions

/**
 * Get user's navigation context
 * @param {number|string} userId - User ID
 * @returns {object|null} Navigation context or null
 */
function getNavigationContext(userId) {
  const state = getUserState(userId);
  return state?.navigation || null;
}

/**
 * Update user's navigation context
 * @param {number|string} userId - User ID
 * @param {object} navigationUpdates - Navigation context updates
 */
function updateNavigationContext(userId, navigationUpdates) {
  const currentState = getUserState(userId) || {};
  const currentNavigation = currentState.navigation || {
    currentMenu: NAVIGATION.STATES.MAIN_MENU,
    menuHistory: ['Main Menu'],
    messageId: null,
    lastAction: null,
    breadcrumbs: ['Main Menu'],
    lastInteraction: Date.now()
  };

  userStates.set(userId, {
    ...currentState,
    navigation: {
      ...currentNavigation,
      ...navigationUpdates,
      lastInteraction: Date.now()
    }
  });
}

/**
 * Navigate to a new menu and update history
 * @param {number|string} userId - User ID
 * @param {string} menuState - New menu state
 * @param {string} menuTitle - Display title for breadcrumbs
 * @param {number} messageId - Message ID for editing
 */
function navigateToMenu(userId, menuState, menuTitle, messageId = null) {
  const context = getNavigationContext(userId) || {};
  const menuHistory = [...(context.menuHistory || ['Main Menu'])];  
  const breadcrumbs = [...(context.breadcrumbs || ['Main Menu'])];
  
  // Add new menu to history if it's different from current
  if (menuHistory[menuHistory.length - 1] !== menuTitle) {
    menuHistory.push(menuTitle);
    breadcrumbs.push(menuTitle);
  }
  
  updateNavigationContext(userId, {
    currentMenu: menuState,
    menuHistory,
    breadcrumbs,
    messageId: messageId || context.messageId,
    lastAction: `navigate_to_${menuState}`
  });
}

/**
 * Navigate back to previous menu
 * @param {number|string} userId - User ID
 * @returns {object|null} Previous menu info or null
 */
function navigateBack(userId) {
  const context = getNavigationContext(userId);
  if (!context || !context.menuHistory || context.menuHistory.length <= 1) {
    return null;
  }
  
  const menuHistory = [...context.menuHistory];
  const breadcrumbs = [...context.breadcrumbs];
  
  // Remove current menu
  menuHistory.pop();
  breadcrumbs.pop();
  
  const previousMenu = menuHistory[menuHistory.length - 1];
  let previousMenuState = NAVIGATION.STATES.MAIN_MENU;
  
  // Map menu titles to states
  if (previousMenu === 'Content Management') {
    previousMenuState = NAVIGATION.STATES.CONTENT_CATEGORY;
  } else if (previousMenu === 'Analytics') {
    previousMenuState = NAVIGATION.STATES.ANALYTICS_CATEGORY;
  } else if (previousMenu === 'System Tools') {
    previousMenuState = NAVIGATION.STATES.SYSTEM_CATEGORY;
  } else if (previousMenu === 'Help & Info') {
    previousMenuState = NAVIGATION.STATES.HELP_CATEGORY;
  }
  
  updateNavigationContext(userId, {
    currentMenu: previousMenuState,
    menuHistory,
    breadcrumbs,
    lastAction: `navigate_back_to_${previousMenuState}`
  });
  
  return {
    state: previousMenuState,
    title: previousMenu,
    history: menuHistory,
    breadcrumbs
  };
}

/**
 * Set message ID for current navigation context
 * @param {number|string} userId - User ID
 * @param {number} messageId - Message ID
 */
function setNavigationMessageId(userId, messageId) {
  updateNavigationContext(userId, { messageId });
}

/**
 * Clear navigation context for user
 * @param {number|string} userId - User ID
 */
function clearNavigationContext(userId) {
  const currentState = getUserState(userId);
  if (currentState) {
    userStates.set(userId, {
      ...currentState,
      navigation: {
        currentMenu: NAVIGATION.STATES.MAIN_MENU,
        menuHistory: ['Main Menu'],
        messageId: null,
        lastAction: null,
        breadcrumbs: ['Main Menu'],
        lastInteraction: Date.now()
      }
    });
  }
}

/**
 * Check if user is in an active workflow (not just navigating menus)
 * @param {number|string} userId - User ID
 * @returns {boolean} True if in active workflow
 */
function isInActiveWorkflow(userId) {
  const state = getUserState(userId);
  return state && (state.command || state.currentStep);
}

// Run cleanup every 30 minutes
setInterval(cleanupOldStates, 30 * 60 * 1000);

module.exports = {
  ADD_CASE_STATES,
  EDIT_CASE_STATES,
  initUserState,
  getUserState,
  updateUserState,
  clearUserState,
  hasActiveState,
  // Navigation functions
  getNavigationContext,
  updateNavigationContext,
  navigateToMenu,
  navigateBack,
  setNavigationMessageId,
  clearNavigationContext,
  isInActiveWorkflow
};