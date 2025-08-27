const constants = require('../../../config/constants');

describe('Configuration Constants', () => {
  describe('Environment Variables', () => {
    it('should load environment variables', () => {
      // This test assumes test environment is set up in jest.setup.js
      expect(constants.TOKEN).toBe('test_token');
      expect(constants.API_URL).toBe('http://localhost:3000/api/admin/content');
      expect(constants.ADMIN_USER_ID).toBe('123456789');
    });

    it('should have default values where appropriate', () => {
      expect(constants.PORTFOLIO_NAME).toBe('Test Portfolio');
    });
  });

  describe('EMOJI Constants', () => {
    it('should have required emoji constants', () => {
      expect(constants.EMOJI.SUCCESS).toBe('✅');
      expect(constants.EMOJI.ERROR).toBe('❌');
      expect(constants.EMOJI.WARNING).toBe('⚠️');
    });
  });

  describe('Navigation Constants', () => {
    it('should have navigation categories', () => {
      expect(constants.NAVIGATION.CATEGORIES.CONTENT).toBeDefined();
      expect(constants.NAVIGATION.CATEGORIES.ANALYTICS).toBeDefined();
      expect(constants.NAVIGATION.CATEGORIES.SYSTEM).toBeDefined();
    });

    it('should have content actions', () => {
      expect(constants.NAVIGATION.CONTENT_ACTIONS.CREATE).toBeDefined();
      expect(constants.NAVIGATION.CONTENT_ACTIONS.EDIT).toBeDefined();
      expect(constants.NAVIGATION.CONTENT_ACTIONS.DELETE).toBeDefined();
    });
  });

  describe('Navigation Helper Functions', () => {
    describe('generateCallback', () => {
      it('should generate callback data correctly', () => {
        const result = constants.NavigationHelpers.generateCallback('nav', 'content', 'list');
        expect(result).toBe('nav_content_list');
      });
    });

    describe('parseCallback', () => {
      it('should parse callback data correctly', () => {
        const result = constants.NavigationHelpers.parseCallback('nav_content_list');
        expect(result).toEqual({
          type: 'nav',
          action: 'content',
          data: ['list']
        });
      });
    });

    describe('getCategory', () => {
      it('should return category configuration by ID', () => {
        const result = constants.NavigationHelpers.getCategory('content');
        expect(result.id).toBe('content');
        expect(result.title).toBe('📝 Content Management');
      });

      it('should return null for non-existent category', () => {
        const result = constants.NavigationHelpers.getCategory('nonexistent');
        expect(result).toBeNull();
      });
    });

    describe('getCategoryActions', () => {
      it('should return actions for a specific category', () => {
        const result = constants.NavigationHelpers.getCategoryActions('content');
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      });

      it('should return empty array for non-existent category', () => {
        const result = constants.NavigationHelpers.getCategoryActions('nonexistent');
        expect(Array.isArray(result)).toBe(true);
        expect(result).toEqual([]);
      });
    });
  });
});