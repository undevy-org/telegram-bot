const NavigationManager = require('./navigationManager');
const MessageEditor = require('./messageEditor');
const { NavigationHelpers, EMOJI } = require('../config/constants');

/**
 * ContentNavigationEnhancer - Enhances content commands with navigation feedback
 */
class ContentNavigationEnhancer {
  constructor() {
    this.navigationManager = new NavigationManager();
    this.messageEditor = new MessageEditor();
  }

  /**
   * Enhance content listing with navigation buttons
   * @param {object} ctx - Grammy context
   * @param {string} originalMessage - Original list message
   */
  async enhanceContentList(ctx, originalMessage) {
    const userId = ctx.from.id;
    
    // Add navigation buttons to the existing message
    const enhancedMessage = originalMessage + '\n\n━━━━━━━━━━━━━━━━━━━\n**Quick Actions:**';
    
    const successMenu = this.navigationManager.getSuccessMenu(
      enhancedMessage,
      userId,
      {
        actions: [
          {
            text: `${EMOJI.CREATE} Create New Case`,
            callback: NavigationHelpers.generateCallback('nav', 'content', 'create'),
            newRow: false
          },
          {
            text: `${EMOJI.REFRESH} Refresh List`,
            callback: NavigationHelpers.generateCallback('act', 'refresh'),
            newRow: true
          }
        ]
      }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, {
      text: enhancedMessage,
      keyboard: successMenu.keyboard
    });
  }

  /**
   * Enhance content preview with action buttons
   * @param {object} ctx - Grammy context
   * @param {string} originalMessage - Original preview message
   * @param {string} caseId - Case ID for actions
   */
  async enhanceContentPreview(ctx, originalMessage, caseId) {
    const userId = ctx.from.id;
    
    const enhancedMessage = originalMessage + '\n\n━━━━━━━━━━━━━━━━━━━\n**Available Actions:**';
    
    const successMenu = this.navigationManager.getSuccessMenu(
      enhancedMessage,
      userId,
      {
        actions: [
          {
            text: `${EMOJI.EDIT} Edit This Case`,
            callback: NavigationHelpers.generateCallback('conf', 'content', 'edit', caseId),
            newRow: false
          },
          {
            text: `${EMOJI.DELETE} Delete Case`,
            callback: NavigationHelpers.generateCallback('conf', 'content', 'delete', caseId),
            newRow: false
          },
          {
            text: `${EMOJI.LIST} All Cases`,
            callback: NavigationHelpers.generateCallback('nav', 'content', 'list'),
            newRow: true
          }
        ]
      }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, {
      text: enhancedMessage,
      keyboard: successMenu.keyboard
    });
  }

  /**
   * Show operation success with navigation options
   * @param {object} ctx - Grammy context
   * @param {string} operation - Operation type (created, updated, deleted)
   * @param {string} caseId - Case ID (optional)
   * @param {object} additionalInfo - Additional info to display
   */
  async showOperationSuccess(ctx, operation, caseId = null, additionalInfo = {}) {
    const userId = ctx.from.id;
    
    const operationMessages = {
      created: `Case study "${caseId}" has been created successfully!`,
      updated: `Case study "${caseId}" has been updated successfully!`,
      deleted: `Case study "${caseId}" has been deleted successfully!`,
      downloaded: `Content has been downloaded successfully!`
    };
    
    let successMessage = operationMessages[operation] || `Operation completed successfully!`;
    
    if (additionalInfo.backup) {
      successMessage += `\n\n**Backup created:** ${additionalInfo.backup}`;
    }
    
    if (additionalInfo.profilesAffected) {
      successMessage += `\n**Profiles updated:** ${additionalInfo.profilesAffected}`;
    }
    
    const actions = [];
    
    // Add operation-specific actions
    if (operation === 'created' && caseId) {
      actions.push({
        text: `${EMOJI.VIEW} Preview New Case`,
        callback: NavigationHelpers.generateCallback('conf', 'content', 'preview', caseId),
        newRow: false
      });
      actions.push({
        text: `${EMOJI.EDIT} Edit Case`,
        callback: NavigationHelpers.generateCallback('conf', 'content', 'edit', caseId),
        newRow: false
      });
    }
    
    if (operation === 'updated' && caseId) {
      actions.push({
        text: `${EMOJI.VIEW} Preview Updated Case`,
        callback: NavigationHelpers.generateCallback('conf', 'content', 'preview', caseId),
        newRow: false
      });
    }
    
    // Always add these actions
    actions.push({
      text: `${EMOJI.LIST} View All Cases`,
      callback: NavigationHelpers.generateCallback('nav', 'content', 'list'),
      newRow: true
    });
    
    actions.push({
      text: `${EMOJI.CREATE} Create Another`,
      callback: NavigationHelpers.generateCallback('nav', 'content', 'create'),
      newRow: false
    });
    
    const successMenu = this.navigationManager.getSuccessMenu(
      successMessage,
      userId,
      { actions }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, successMenu);
  }

  /**
   * Show operation error with retry options
   * @param {object} ctx - Grammy context
   * @param {string} operation - Operation type
   * @param {Error} error - Error object
   * @param {string} retryCallback - Callback for retry action
   */
  async showOperationError(ctx, operation, error, retryCallback = null) {
    const userId = ctx.from.id;
    
    const errorMessage = `Failed to ${operation}: ${error.message}`;
    
    const options = {};
    if (retryCallback) {
      options.retryCallback = retryCallback;
    }
    
    const errorMenu = this.navigationManager.getErrorMenu(
      errorMessage,
      userId,
      options
    );
    
    await this.messageEditor.updateMenuMessage(ctx, errorMenu);
  }

  /**
   * Show content loading state
   * @param {object} ctx - Grammy context
   * @param {string} operation - Operation being performed
   */
  async showContentLoading(ctx, operation) {
    const loadingMessages = {
      list: 'Loading case studies...',
      preview: 'Loading case preview...',
      create: 'Preparing case creation form...',
      edit: 'Loading case for editing...',
      delete: 'Preparing deletion preview...',
      download: 'Generating content download...'
    };
    
    const message = loadingMessages[operation] || 'Processing...';
    
    const loadingMenu = this.navigationManager.getLoadingMenu(message, true);
    return await this.messageEditor.updateMenuMessage(ctx, loadingMenu);
  }

  /**
   * Show workflow progress
   * @param {object} ctx - Grammy context
   * @param {string} workflow - Workflow type (add_case, edit_case)
   * @param {number} currentStep - Current step number
   * @param {number} totalSteps - Total number of steps
   * @param {string} stepDescription - Description of current step
   */
  async showWorkflowProgress(ctx, workflow, currentStep, totalSteps, stepDescription) {
    const userId = ctx.from.id;
    const progress = Math.round((currentStep / totalSteps) * 100);
    
    let progressMessage = `**${workflow === 'add_case' ? 'Creating' : 'Editing'} Case Study**\n\n`;
    progressMessage += `**Step ${currentStep}/${totalSteps}:** ${stepDescription}\n\n`;
    progressMessage += `Progress: ${progress}%`;
    
    const actions = [
      {
        text: `${EMOJI.CANCEL} Cancel ${workflow === 'add_case' ? 'Creation' : 'Editing'}`,
        callback: NavigationHelpers.generateCallback('act', 'cancel'),
        newRow: true
      }
    ];
    
    if (currentStep > 1) {
      actions.unshift({
        text: `${EMOJI.SKIP} Skip This Step`,
        callback: NavigationHelpers.generateCallback('act', 'skip'),
        newRow: false
      });
    }
    
    const progressMenu = this.navigationManager.getSuccessMenu(
      progressMessage,
      userId,
      { actions }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, progressMenu);
  }

  /**
   * Enhance history display with navigation
   * @param {object} ctx - Grammy context
   * @param {string} originalMessage - Original history message
   */
  async enhanceHistoryDisplay(ctx, originalMessage) {
    const userId = ctx.from.id;
    
    const enhancedMessage = originalMessage + '\n\n━━━━━━━━━━━━━━━━━━━\n**Version Control Actions:**';
    
    const successMenu = this.navigationManager.getSuccessMenu(
      enhancedMessage,
      userId,
      {
        actions: [
          {
            text: `${EMOJI.REFRESH} Refresh History`,
            callback: NavigationHelpers.generateCallback('nav', 'system', 'history'),
            newRow: false
          },
          {
            text: `${EMOJI.VIEW} Download Current`,
            callback: NavigationHelpers.generateCallback('nav', 'system', 'download'),
            newRow: false
          }
        ]
      }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, {
      text: enhancedMessage,
      keyboard: successMenu.keyboard
    });
  }

  /**
   * Show deletion confirmation with enhanced context
   * @param {object} ctx - Grammy context
   * @param {string} caseId - Case ID to delete
   * @param {object} caseData - Case data for preview
   * @param {string[]} usedInProfiles - Profiles using this case
   */
  async showDeletionConfirmation(ctx, caseId, caseData, usedInProfiles = []) {
    const userId = ctx.from.id;
    
    let confirmationDetails = `**Case to delete:**\n`;
    confirmationDetails += `• ID: ${caseId}\n`;
    confirmationDetails += `• Title: ${caseData.title || 'Untitled'}\n`;
    confirmationDetails += `• Tags: ${caseData.tags?.join(', ') || 'No tags'}`;
    
    if (usedInProfiles.length > 0) {
      confirmationDetails += `\n\n**⚠️ WARNING:** Used in ${usedInProfiles.length} profile(s): ${usedInProfiles.join(', ')}`;
    }
    
    const confirmationMenu = this.navigationManager.getActionConfirmationMenu(
      'content',
      'delete',
      userId,
      { details: confirmationDetails }
    );
    
    await this.messageEditor.updateMenuMessage(ctx, confirmationMenu);
  }
}

module.exports = ContentNavigationEnhancer;