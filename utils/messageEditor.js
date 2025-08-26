const { escapeMarkdown } = require('./format');
const { EMOJI } = require('../config/constants');
const { setNavigationMessageId } = require('../stateManager');

/**
 * MessageEditor - Handles smart message editing with fallback strategies
 */
class MessageEditor {
  constructor() {
    this.editAttempts = new Map(); // Track edit attempts per user
    this.maxRetries = 3;
  }

  /**
   * Update or send menu message with edit-first strategy
   * @param {object} ctx - Grammy context
   * @param {object} menuData - Menu data with text and keyboard
   * @param {object} options - Additional options
   * @returns {Promise<object>} Result with success status and message info
   */
  async updateMenuMessage(ctx, menuData, options = {}) {
    const userId = ctx.from?.id;
    const parseMode = options.parseMode || 'MarkdownV2';
    
    try {
      // Prepare message options
      const messageOptions = {
        parse_mode: parseMode,
        disable_web_page_preview: true
      };
      
      if (menuData.keyboard) {
        messageOptions.reply_markup = menuData.keyboard;
      }

      // Try to edit existing message first
      if (ctx.callbackQuery?.message?.message_id) {
        try {
          await ctx.editMessageText(
            this._formatText(menuData.text, parseMode),
            messageOptions
          );
          
          // Update navigation context with current message ID
          if (userId) {
            setNavigationMessageId(userId, ctx.callbackQuery.message.message_id);
          }
          
          return {
            success: true,
            action: 'edited',
            messageId: ctx.callbackQuery.message.message_id
          };
        } catch (editError) {
          console.log('[MESSAGE_EDITOR] Edit failed, trying fallback:', editError.message);
          return await this._handleEditFallback(ctx, menuData, messageOptions, userId, editError);
        }
      }
      
      // Send new message if no existing message to edit
      const sentMessage = await ctx.reply(
        this._formatText(menuData.text, parseMode),
        messageOptions
      );
      
      if (userId) {
        setNavigationMessageId(userId, sentMessage.message_id);
      }
      
      return {
        success: true,
        action: 'sent',
        messageId: sentMessage.message_id
      };
      
    } catch (error) {
      console.error('[MESSAGE_EDITOR] Failed to update menu message:', error);
      return await this._handleCriticalError(ctx, error, userId);
    }
  }

  /**
   * Send loading message with optional progress
   * @param {object} ctx - Grammy context
   * @param {string} message - Loading message
   * @param {object} options - Additional options
   * @returns {Promise<object>} Result with message info
   */
  async sendLoadingMessage(ctx, message, options = {}) {
    const userId = ctx.from?.id;
    
    try {
      const loadingText = `${EMOJI.LOADING} ${message}${options.showDots ? '...' : ''}`;
      
      const messageOptions = {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true
      };
      
      if (options.keyboard) {
        messageOptions.reply_markup = options.keyboard;
      }
      
      const sentMessage = await ctx.reply(loadingText, messageOptions);
      
      if (userId) {
        setNavigationMessageId(userId, sentMessage.message_id);
      }
      
      return {
        success: true,
        messageId: sentMessage.message_id
      };
      
    } catch (error) {
      console.error('[MESSAGE_EDITOR] Failed to send loading message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update loading message with progress
   * @param {object} ctx - Grammy context
   * @param {number} messageId - Message ID to update
   * @param {string} message - New loading message
   * @param {number} progress - Progress percentage (0-100)
   * @returns {Promise<object>} Result with success status
   */
  async updateLoadingMessage(ctx, messageId, message, progress = null) {
    try {
      let progressText = `${EMOJI.LOADING} ${message}`;
      
      if (progress !== null) {
        const progressBar = this._generateProgressBar(progress);
        progressText += `\n\n${progressBar} ${progress}%`;
      }
      
      await ctx.api.editMessageText(
        ctx.chat.id,
        messageId,
        this._formatText(progressText, 'MarkdownV2'),
        {
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true
        }
      );
      
      return { success: true };
      
    } catch (error) {
      console.error('[MESSAGE_EDITOR] Failed to update loading message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send error message with navigation options
   * @param {object} ctx - Grammy context
   * @param {string} errorMessage - Error message
   * @param {object} options - Additional options
   * @returns {Promise<object>} Result with message info
   */
  async sendErrorMessage(ctx, errorMessage, options = {}) {
    const userId = ctx.from?.id;
    
    try {
      let errorText = `${EMOJI.ERROR} **Error**\n\n`;
      errorText += `${escapeMarkdown(errorMessage)}\n\n`;
      
      if (options.suggestion) {
        errorText += `💡 **Suggestion:** ${escapeMarkdown(options.suggestion)}`;
      }
      
      const messageOptions = {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true
      };
      
      if (options.keyboard) {
        messageOptions.reply_markup = options.keyboard;
      }
      
      const sentMessage = await ctx.reply(errorText, messageOptions);
      
      if (userId) {
        setNavigationMessageId(userId, sentMessage.message_id);
      }
      
      return {
        success: true,
        messageId: sentMessage.message_id
      };
      
    } catch (error) {
      console.error('[MESSAGE_EDITOR] Failed to send error message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send success message with navigation options
   * @param {object} ctx - Grammy context
   * @param {string} successMessage - Success message
   * @param {object} options - Additional options
   * @returns {Promise<object>} Result with message info
   */
  async sendSuccessMessage(ctx, successMessage, options = {}) {
    const userId = ctx.from?.id;
    
    try {
      let successText = `${EMOJI.SUCCESS} **Success**\n\n`;
      successText += `${escapeMarkdown(successMessage)}\n\n`;
      
      if (options.details) {
        successText += `**Details:**\n${escapeMarkdown(options.details)}\n\n`;
      }
      
      if (options.nextSteps) {
        successText += `**Next Steps:**\n${escapeMarkdown(options.nextSteps)}`;
      }
      
      const messageOptions = {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true
      };
      
      if (options.keyboard) {
        messageOptions.reply_markup = options.keyboard;
      }
      
      const sentMessage = await ctx.reply(successText, messageOptions);
      
      if (userId) {
        setNavigationMessageId(userId, sentMessage.message_id);
      }
      
      return {
        success: true,
        messageId: sentMessage.message_id
      };
      
    } catch (error) {
      console.error('[MESSAGE_EDITOR] Failed to send success message:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up old messages by deleting them
   * @param {object} ctx - Grammy context
   * @param {number[]} messageIds - Array of message IDs to delete
   * @returns {Promise<object>} Result with cleanup info
   */
  async cleanupMessages(ctx, messageIds) {
    const results = {
      deleted: 0,
      failed: 0,
      errors: []
    };
    
    for (const messageId of messageIds) {
      try {
        await ctx.api.deleteMessage(ctx.chat.id, messageId);
        results.deleted++;
      } catch (error) {
        results.failed++;
        results.errors.push({ messageId, error: error.message });
      }
    }
    
    return results;
  }

  // Private helper methods

  /**
   * Handle edit fallback strategies
   * @param {object} ctx - Grammy context
   * @param {object} menuData - Menu data
   * @param {object} messageOptions - Message options
   * @param {number|string} userId - User ID
   * @param {Error} editError - Original edit error
   * @returns {Promise<object>} Fallback result
   * @private
   */
  async _handleEditFallback(ctx, menuData, messageOptions, userId, editError) {
    // Strategy 1: Try answerCallbackQuery and send new message
    try {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery();
      }
      
      const sentMessage = await ctx.reply(
        this._formatText(menuData.text, messageOptions.parse_mode),
        messageOptions
      );
      
      if (userId) {
        setNavigationMessageId(userId, sentMessage.message_id);
      }
      
      return {
        success: true,
        action: 'fallback_new_message',
        messageId: sentMessage.message_id,
        originalError: editError.message
      };
      
    } catch (fallbackError) {
      console.error('[MESSAGE_EDITOR] Fallback failed:', fallbackError);
      return await this._handleCriticalError(ctx, fallbackError, userId);
    }
  }

  /**
   * Handle critical errors with basic text response
   * @param {object} ctx - Grammy context
   * @param {Error} error - Error object
   * @param {number|string} userId - User ID
   * @returns {Promise<object>} Error handling result
   * @private
   */
  async _handleCriticalError(ctx, error, userId) {
    try {
      // Last resort: send plain text message
      const basicMessage = `❌ Something went wrong. Please try again or use /start to return to the main menu.`;
      
      const sentMessage = await ctx.reply(basicMessage);
      
      if (userId) {
        setNavigationMessageId(userId, sentMessage.message_id);
      }
      
      return {
        success: false,
        action: 'critical_error_basic_message',
        messageId: sentMessage.message_id,
        error: error.message
      };
      
    } catch (criticalError) {
      console.error('[MESSAGE_EDITOR] Critical error handling failed:', criticalError);
      return {
        success: false,
        action: 'total_failure',
        error: criticalError.message
      };
    }
  }

  /**
   * Format text for Telegram parsing
   * @param {string} text - Text to format
   * @param {string} parseMode - Parse mode (MarkdownV2, HTML, etc.)
   * @returns {string} Formatted text
   * @private
   */
  _formatText(text, parseMode) {
    if (parseMode === 'MarkdownV2') {
      // Text might already be escaped, check if it needs additional escaping
      return text;
    }
    return text;
  }

  /**
   * Generate progress bar visual
   * @param {number} progress - Progress percentage (0-100)
   * @returns {string} Progress bar string
   * @private
   */
  _generateProgressBar(progress) {
    const barLength = 10;
    const filledLength = Math.round((progress / 100) * barLength);
    const emptyLength = barLength - filledLength;
    
    const filled = '█'.repeat(filledLength);
    const empty = '░'.repeat(emptyLength);
    
    return `${filled}${empty}`;
  }

  /**
   * Get edit attempt count for user
   * @param {number|string} userId - User ID
   * @returns {number} Attempt count
   * @private
   */
  _getEditAttempts(userId) {
    return this.editAttempts.get(userId) || 0;
  }

  /**
   * Increment edit attempt count for user
   * @param {number|string} userId - User ID
   * @private
   */
  _incrementEditAttempts(userId) {
    const current = this._getEditAttempts(userId);
    this.editAttempts.set(userId, current + 1);
  }

  /**
   * Reset edit attempt count for user
   * @param {number|string} userId - User ID
   * @private
   */
  _resetEditAttempts(userId) {
    this.editAttempts.delete(userId);
  }
}

module.exports = MessageEditor;