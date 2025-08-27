const {
  escapeMarkdown,
  formatDate,
  truncateText,
  formatFileSize,
  formatUptime
} = require('../../../utils/format');

describe('Formatters Utility Functions', () => {
  describe('escapeMarkdown', () => {
    it('should escape special characters for Telegram MarkdownV2', () => {
      const text = '_*[]()~`>#+-=|{}.!';
      const result = escapeMarkdown(text);
      expect(result).toBe('\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\=\\|\\{\\}\\.\\!');
    });

    it('should return empty string for null or undefined input', () => {
      expect(escapeMarkdown(null)).toBe('');
      expect(escapeMarkdown(undefined)).toBe('');
    });

    it('should handle normal text without special characters', () => {
      const text = 'Normal text without special characters';
      expect(escapeMarkdown(text)).toBe(text);
    });
  });

  describe('formatDate', () => {
    it('should format date to human-readable string', () => {
      const date = '2024-03-15T10:30:00Z';
      // Note: This test may need adjustment based on timezone
      expect(formatDate(date)).toMatch(/\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}/);
    });

    it('should handle invalid dates', () => {
      const result = formatDate('invalid-date');
      expect(result).toContain('Invalid Date');
    });
  });

  describe('truncateText', () => {
    it('should return full text when under limit', () => {
      const text = 'Short description';
      expect(truncateText(text, 50)).toBe(text);
    });

    it('should truncate and add ellipsis when over limit', () => {
      const text = 'This is a very long description that exceeds the character limit';
      const result = truncateText(text, 20);
      expect(result).toBe('This is a very long ...');
      expect(result.length).toBeLessThanOrEqual(23); // 20 + '...'
    });

    it('should handle empty strings', () => {
      expect(truncateText('', 10)).toBe('');
    });

    it('should handle undefined input gracefully', () => {
      expect(truncateText(undefined, 10)).toBeUndefined();
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1048576)).toBe('1.0 MB');
    });
  });

  describe('formatUptime', () => {
    it('should format seconds to human-readable string', () => {
      expect(formatUptime(3661)).toBe('1ч 1м 1с');
      expect(formatUptime(90061)).toBe('1д 1ч 1м 1с');
      expect(formatUptime(0)).toBe('0с');
    });
  });
});