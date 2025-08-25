const { EMOJI } = require('../config/constants');

/**
 * Escapes special characters in text for Telegram MarkdownV2.
 * @param {string | null | undefined} text 
 * @returns {string}
 */
function escapeMarkdown(text) {
  if (text === null || typeof text === 'undefined') {
    return ''; // Return an empty string for null or undefined
  }
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}

/**
 * Formats a date to a human-readable string.
 * @param {*} date 
 * @returns 
 */
function formatDate(date) {
  return new Date(date).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** * Truncates text to a specified length, adding ellipsis if necessary.
 * @param {string} text 
 * @param {number} maxLength 
 * @returns {string}
 */
function truncateText(text, maxLength = 200) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/** * Formats file size in a human-readable way.
 * @param {number} bytes 
 * @returns {string}
 */ 
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Formats uptime in seconds to human-readable string
 * @param {number} seconds - Uptime in seconds
 * @returns {string} - Formatted string like "2d 3h 15m"
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}д`);
  if (hours > 0) parts.push(`${hours}ч`);
  if (minutes > 0) parts.push(`${minutes}м`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}с`);
  
  return parts.join(' ');
}

module.exports = {
  escapeMarkdown,
  formatDate,
  truncateText,
  formatUptime,
  formatFileSize
};