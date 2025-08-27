const {
  isValidCaseId,
  validateRequiredFields,
  parseArrayInput,
  caseExists,
  findProfilesUsingCase
} = require('../../../utils/validators');

describe('Validator Functions', () => {
  describe('isValidCaseId', () => {
    it('should accept valid case IDs', () => {
      expect(isValidCaseId('valid_id')).toBe(true);
      expect(isValidCaseId('valid123')).toBe(true);
      expect(isValidCaseId('valid_123_id')).toBe(true);
    });

    it('should reject invalid case IDs', () => {
      expect(isValidCaseId('Invalid-ID')).toBe(false);
      expect(isValidCaseId('invalid id')).toBe(false);
      expect(isValidCaseId('invalid.id')).toBe(false);
      expect(isValidCaseId('')).toBe(false);
    });
  });

  describe('validateRequiredFields', () => {
    it('should pass when all required fields present', () => {
      const data = { title: 'Test', description: 'Desc', url: 'http://test.com' };
      const required = ['title', 'description', 'url'];
      expect(validateRequiredFields(data, required)).toEqual({ valid: true, missing: [] });
    });

    it('should identify missing fields', () => {
      const data = { title: 'Test' };
      const required = ['title', 'description', 'url'];
      const result = validateRequiredFields(data, required);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['description', 'url']);
    });
  });

  describe('parseArrayInput', () => {
    it('should parse comma-separated input', () => {
      const input = 'item1, item2, item3';
      expect(parseArrayInput(input)).toEqual(['item1', 'item2', 'item3']);
    });

    it('should parse newline-separated input', () => {
      const input = 'item1\nitem2\nitem3';
      expect(parseArrayInput(input, '\n')).toEqual(['item1', 'item2', 'item3']);
    });

    it('should handle empty input', () => {
      expect(parseArrayInput('')).toEqual([]);
      expect(parseArrayInput(null)).toEqual([]);
    });

    it('should filter out empty items', () => {
      const input = 'item1, , item3';
      expect(parseArrayInput(input)).toEqual(['item1', 'item3']);
    });
  });

  describe('caseExists', () => {
    it('should return true when case exists', () => {
      const content = {
        GLOBAL_DATA: {
          case_studies: {
            'test_case': { title: 'Test Case' }
          }
        }
      };
      expect(caseExists(content, 'test_case')).toBe(true);
    });

    it('should return false when case does not exist', () => {
      const content = {
        GLOBAL_DATA: {
          case_studies: {
            'other_case': { title: 'Other Case' }
          }
        }
      };
      expect(caseExists(content, 'test_case')).toBe(false);
    });

    it('should return false when content structure is invalid', () => {
      const content = {};
      expect(caseExists(content, 'test_case')).toBe(false);
    });
  });

  describe('findProfilesUsingCase', () => {
    it('should find profiles using a specific case', () => {
      const content = {
        profile1: {
          meta: {
            cases: ['case1', 'case2']
          }
        },
        profile2: {
          meta: {
            cases: ['case2', 'case3']
          }
        },
        GLOBAL_DATA: {
          case_studies: {}
        }
      };
      expect(findProfilesUsingCase(content, 'case2')).toEqual(['profile1', 'profile2']);
    });

    it('should return empty array when no profiles use the case', () => {
      const content = {
        profile1: {
          meta: {
            cases: ['case1']
          }
        },
        GLOBAL_DATA: {
          case_studies: {}
        }
      };
      expect(findProfilesUsingCase(content, 'case2')).toEqual([]);
    });
  });
});