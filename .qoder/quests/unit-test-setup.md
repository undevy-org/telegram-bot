# Unit Testing Setup for Telegram CMS Bot

## Overview

This document outlines the implementation plan for establishing a comprehensive unit testing infrastructure for the Telegram CMS bot. The testing strategy follows the testing pyramid approach with a focus on unit tests as the foundation, providing confidence in code changes, early bug detection, and regression prevention.

## Git Workflow

All testing infrastructure changes must be implemented in a feature branch following our PR-based workflow:

```bash
# First, ensure your main branch is up to date
git checkout main
git pull origin main

# Create a feature branch for this work
git checkout -b feat/unit-testing-setup

# All work must be done in this branch
```

## Existing Code Structure Audit

Based on verification of the actual codebase structure, here are the files that will be tested:

**Utility Files (`utils/` directory):**
- `utils/format.js` - Contains formatting functions including `escapeMarkdown`, `formatDate`, `truncateText`, `formatFileSize`, `formatUptime`
- `utils/validators.js` - Contains validation functions including `isValidCaseId`, `validateRequiredFields`, `parseArrayInput`, `caseExists`, `findProfilesUsingCase`
- Other utility files exist but are not part of Phase 1

**Configuration Files (`config/` directory):**
- `config/constants.js` - Contains environment variables, emoji constants, navigation constants, and helper functions

All function and file names have been verified to match the actual codebase.

**Verification Commands Run:**
```bash
# Verified files exist:
ls -la utils/
# format.js validators.js and other files exist

ls -la config/
# constants.js exists

# Verified exported functions:
grep -E "exports\.|module\.exports" utils/format.js
# Exports: escapeMarkdown, formatDate, truncateText, formatUptime, formatFileSize

grep -E "exports\.|module\.exports" utils/validators.js
# Exports: isValidCaseId, validateRequiredFields, parseArrayInput, caseExists, findProfilesUsingCase
```

## Architecture

### Testing Technology Stack

- **Jest**: Primary testing framework for Node.js with built-in mocking capabilities
- **Node.js Test Environment**: Matching production environment for accurate testing
- **ESLint**: Code quality and consistency checks integrated with testing workflow

### Testing Philosophy

We adopt a testing pyramid approach with three distinct levels:

```
        /\
       /E2E\        <- End-to-End (10%)
      /------\
     /  Integ  \    <- Integration (30%)
    /----------\
   /   Unit     \   <- Unit Tests (60%)
  /--------------\
```

### Directory Structure

```
telegram-bot/
├── __tests__/
│   ├── unit/
│   │   ├── utils/
│   │   │   ├── format.test.js
│   │   │   └── validators.test.js
│   │   └── config/
│   │       └── constants.test.js
│   ├── integration/
│   └── fixtures/
│       ├── mockContent.json
│       └── mockEnv.js
├── jest.config.js
└── jest.setup.js
```

## Test Scope Definition

### Phase 1: Unit Testing Focus (Current Implementation)

#### What Will Be Tested

1. **Utility Functions** (`utils/` directory)
   - Text formatting functions (escaping markdown, truncating text, formatting dates)
   - Input validation functions (URL validation, required field checks)
   - Data transformation functions

2. **Configuration Logic** (`config/` directory)
   - Environment variable parsing
   - Default value handling
   - Configuration validation

3. **Pure Business Logic**
   - Case study data structure validation
   - Menu generation logic
   - Helper functions

#### What Will NOT Be Tested (in this phase)

- Telegram bot interactions (requires integration testing)
- API calls to portfolio backend (requires mocking)
- Database or file system operations
- Multi-step conversation flows

## Implementation Plan

### Step 1: Setup Testing Infrastructure

Install required packages:
```bash
npm install --save-dev jest @types/jest
```

Create Jest configuration files:

**jest.config.js**:
```javascript
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'utils/**/*.js',
    'config/**/*.js',
    '!node_modules/**',
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/*.test.js'
  ],
  setupFilesAfterEnv: ['./jest.setup.js'],
  verbose: true
};
```

**jest.setup.js**:
```javascript
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
```

### Step 2: Create Test File Structure

```bash
# Create test directories
mkdir -p __tests__/unit/utils
mkdir -p __tests__/unit/config
mkdir -p __tests__/fixtures

# Create initial test files
touch __tests__/unit/utils/format.test.js
touch __tests__/unit/utils/validators.test.js
touch __tests__/unit/config/constants.test.js
```

### Incremental Implementation Approach

Follow this incremental approach for implementation:

**Revised Step 1:** Set up minimal infrastructure and write ONE test
```bash
# After creating feature branch and verifying files exist
npm install --save-dev jest

# Create ONLY jest.config.js first
# Write ONE test for ONE function that you've confirmed exists
# For example, if only escapeMarkdown exists, test only that

# Create a single test file:
mkdir -p __tests__/unit/utils
echo "const { escapeMarkdown } = require('../../../utils/format');" > __tests__/unit/utils/format.test.js

# Run to ensure basic setup works
npm test
```

**Step 2:** Create PR with minimal working setup
- Push your branch with just the setup + one test file
- Create PR for review
- After approval, merge

**Step 3:** Add remaining tests in subsequent PRs
- This allows for faster feedback cycles
- Easier to review smaller changes

### Step 3: Write Core Unit Tests

#### Testing Formatters (`utils/format.js`)

```javascript
// __tests__/unit/utils/format.test.js
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
      expect(result).toBe('\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\=\\|\\{\\}\\.');
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
      expect(result).toBe('This is a very long...');
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
```

#### Testing Validators (`utils/validators.js`)

```javascript
// __tests__/unit/utils/validators.test.js
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
```

#### Testing Configuration (`config/constants.js`)

```javascript
// __tests__/unit/config/constants.test.js
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
```

### Step 4: Update Package.json Scripts

Update `package.json` with test scripts:

```json
{
  "scripts": {
    "start": "node bot.js",
    "dev": "nodemon bot.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest __tests__/unit"
  }
}
```

### Step 5: Integrate with CI Pipeline

Update `.github/workflows/ci.yml` to run tests:

```yaml
# Add these steps after the "Test bot startup" step

# Run Unit Tests
- name: Run Unit Tests
  run: |
    echo "🧪 Running unit tests..."
    npm test

# Generate Coverage Report
- name: Generate Coverage Report
  run: |
    npm run test:coverage
    echo "📊 Test coverage generated"
```

## Success Criteria

Phase 1 will be considered complete when:

1. **Infrastructure Ready**
   - Jest is installed and configured
   - Test file structure is created
   - Test scripts are added to package.json

2. **Core Coverage Achieved**
   - All utility functions have corresponding tests
   - All validators have comprehensive test cases
   - Configuration parsing is tested

3. **Quality Metrics Met**
   - Unit test code coverage > 80% for targeted modules
   - All tests pass consistently
   - Tests run in under 5 seconds

4. **CI Integration Complete**
   - Tests run automatically on every pull request
   - Coverage reports are generated
   - Build fails if tests fail

## Verification Methods

We will verify successful implementation through:

1. **Manual Verification**
   ```bash
   # Run all tests and verify they pass
   npm test
   
   # Check coverage meets threshold
   npm run test:coverage
   ```

2. **CI Pipeline Validation**
   - Create a test PR with intentionally failing test
   - Verify CI blocks merge
   - Fix test and verify CI passes

3. **Code Review Checklist**
   - [ ] Each utility function has at least 3 test cases
   - [ ] Edge cases are covered (null, undefined, empty)
   - [ ] Test names clearly describe what they test
   - [ ] No test depends on external services

## Testing Best Practices

### Test Naming Convention
Tests should follow the pattern: "should [expected behavior] when [condition]"
- ✅ Good: "should return empty string when input is undefined"
- ❌ Bad: "test formatters"

### Test Organization
- Group related tests using `describe` blocks
- Keep tests focused on single behavior
- Use setup and teardown hooks appropriately

### Assertion Guidelines
- Use specific assertions (`toBe`, `toEqual`) over generic ones (`toBeTruthy`)
- Assert on specific values, not just types
- Include edge cases and error conditions

### Maintenance Considerations
- Tests should not require modification when implementation details change
- Mock external dependencies at module boundaries
- Keep test data in fixtures for reusability

## Local Testing Before Push

Before pushing any changes, run these mandatory tests:

```bash
# Before pushing any changes:
npm test                    # All tests must pass
npm run test:coverage       # Check coverage metrics
```

## Mock Data Accuracy

Based on our codebase analysis and CONTENT_MODEL.md, the following data structures are used:
- Case studies are stored in `content.GLOBAL_DATA.case_studies`
- Profile data is stored directly in `content` with `profileId` as keys
- Profiles reference cases in `profile.meta.cases` array

This structure is confirmed by examining the CONTENT_MODEL.md file which describes the content.json structure used by the bot.

## Environment Variables Documentation

The `.env.example` file should be updated with any new environment variables required for testing, maintaining our practice of documenting required env vars without exposing actual values.

## Testing Scope Clarification

Be explicit about what we're NOT mocking in unit tests:
- We're testing pure functions only
- No network calls (even mocked ones) in Phase 1
- No file system operations
- No Telegram bot context

## PR Description Template

When you create the PR, use this template:

```markdown
## Description
Implements Phase 1 of testing infrastructure as outlined in issue #[number]

## Changes
- [ ] Jest configuration added
- [ ] Test structure created
- [ ] Unit tests for [specific modules]
- [ ] CI pipeline updated

## Testing
- [ ] All tests pass locally
- [ ] Coverage > 80% for tested modules
- [ ] No console errors or warnings

## Checklist
- [ ] Created feature branch from latest main
- [ ] Verified all referenced functions exist
- [ ] Tests run in < 5 seconds
- [ ] Updated package.json scripts
```

## Fallback Plan if Files Don't Exist

If any expected files or functions are missing:
1. Document what's actually available
2. Create tests only for existing functions
3. Note in PR description which expected items were not found
4. Suggest creating missing utilities as a separate task

## Pre-Implementation Checklist
- [ ] Created feature branch `feat/unit-testing-setup`
- [ ] Verified utils/format.js exists
- [ ] Verified utils/validators.js exists  
- [ ] Verified config/constants.js exists
- [ ] Listed actual exported functions from each file
- [ ] Confirmed at least one function to test exists

## Next Steps

After Phase 1 completion, we will proceed to:
- **Phase 2**: Integration testing (command flows, API mocking)
- **Phase 3**: E2E testing (full bot interaction simulation)
- **Phase 4**: Performance and load testing