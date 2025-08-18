const fetch = require('node-fetch');
const { MATOMO_URL, MATOMO_SITE_ID, MATOMO_TOKEN } = require('../config/constants');

/**
 * Fetches recent visits from Matomo
 * @param {number} limit - Number of visits to fetch
 * @returns {Promise<Array>} - Array of visit objects
 */
async function getRecentVisits(sinceIso = null, untilIso = null, limit = 50) {
  const url = new URL(`${MATOMO_URL}/index.php`);

  url.searchParams.append('module', 'API');
  url.searchParams.append('method', 'Live.getLastVisitsDetails');
  url.searchParams.append('idSite', MATOMO_SITE_ID);
  url.searchParams.append('period', 'day');
  url.searchParams.append('date', 'today');
  url.searchParams.append('format', 'json');
  url.searchParams.append('token_auth', MATOMO_TOKEN);
  url.searchParams.append('filter_limit', limit.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Matomo API error: ${response.status}`);
  }

  const data = await response.json();

  if (sinceIso && untilIso) {
    const since = new Date(sinceIso).getTime() / 1000;
    const until = new Date(untilIso).getTime() / 1000;

    return data.filter(v => {
      const ts = v.serverTimestamp;
      return ts >= since && ts <= until;
    });
  }

  return data;
}

/**
 * Tests Matomo API connection
 * @returns {Promise<Object>} - Site information
 */
async function testConnection() {
  const url = new URL(`${MATOMO_URL}/index.php`);
  
  url.searchParams.append('module', 'API');
  url.searchParams.append('method', 'SitesManager.getSiteFromId');
  url.searchParams.append('idSite', MATOMO_SITE_ID);
  url.searchParams.append('format', 'json');
  url.searchParams.append('token_auth', MATOMO_TOKEN);
  
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`Matomo API error: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Extracts access code from visit data
 * @param {Object} visit - Visit object from Matomo
 * @returns {string|null} - Access code or null
 */

function extractAccessCode(visit) {
  // Primary method: check custom dimensions
  if (Array.isArray(visit.customDimensions) && visit.customDimensions.length > 0) {
    const dim = visit.customDimensions.find(d => d.idDimension === '1');
    if (dim && dim.value) {
      return dim.value;
    }
  }

  // Fallback to URL parameter
  if (Array.isArray(visit.actionDetails)) {
    const firstActionWithCode = visit.actionDetails.find(
      action => action.url && action.url.includes('code=')
    );
    if (firstActionWithCode) {
      const urlMatch = firstActionWithCode.url.match(/[?&]code=([^&#]+)/);
      if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
      }
    }
  }

  return null;
}

/**
 * Extracts visited pages from visit data
 * @param {Object} visit - Visit object from Matomo
 * @returns {Array} - Array of page names
 */
function extractVisitedPages(visit) {
  // Add a check for visit.actionDetails to prevent errors
  if (!Array.isArray(visit.actionDetails)) {
    return ['Entry']; // Or return an empty array, depending on desired behavior
  }

  const pages = [];
  const seenUrls = new Set(); // To avoid duplicates

  visit.actionDetails.forEach(action => {
    // Ensure action is an object and has a URL
    if (typeof action !== 'object' || action === null || !action.url || action.type !== 'action') {
      return;
    }

    const urlKey = action.url;

    // Skip if we've already seen this exact URL in sequence
    if (pages.length > 0 && pages[pages.length - 1] === urlKey) {
      return;
    }

    let pageName = 'Unknown Page';

    // This allows the bot to filter out the generic portfolio title for any deployment
    const portfolioName = process.env.PORTFOLIO_NAME || 'Portfolio';

    // First, try to use the page title if it's meaningful and exists
    if (action.pageTitle && typeof action.pageTitle === 'string' && !action.pageTitle.includes(portfolioName)) {
      pageName = action.pageTitle;
    }
    // Then, try to extract from URL hash
    else if (action.url.includes('#')) {
      const hashMatch = action.url.match(/#([^&?\\s]+)/);
      if (hashMatch && hashMatch[1]) {
        // Convert hash to readable format
        const screenName = hashMatch[1];
        const screenTitles = {
          Entry: 'Entry - Authentication',
          MainHub: 'Main Hub - Navigation',
          Introduction: 'Introduction - About Me',
          Timeline: 'Timeline - Experience',
          RoleDetail: 'Role Detail',
          CaseList: 'Case Studies - List',
          CaseDetail: 'Case Study - Detail',
          SkillsGrid: 'Skills - Overview',
          SkillDetail: 'Skill - Detail',
          SideProjects: 'Side Projects',
          Contact: 'Contact Information'
        };
        pageName = screenTitles[screenName] || screenName;
      }
    }
    // Check if it's the main page
    else if (action.url.includes('?code=') && !action.url.includes('#')) {
      pageName = 'Entry - Authentication';
    }
    // Fall back to page title
    else if (action.pageTitle && typeof action.pageTitle === 'string') {
      pageName = action.pageTitle;
    }

    // Only add to pages if pageName is not null or undefined
    if (pageName) {
      pages.push(pageName);
    }
  });

  // Return just the page names, removing consecutive duplicates
  return pages
    .filter((page, index, self) => {
      return index === 0 || page !== self[index - 1];
    });
}

/**
 * Formats visit data for display
 * @param {Object} visit - Visit object from Matomo
 * @returns {Object} - Formatted visit data
 */
function formatVisitData(visit) {
  return {
    accessCode: extractAccessCode(visit),
    pages: extractVisitedPages(visit),
    timestamp: new Date(visit.serverTimestamp * 1000),
    timePretty: visit.serverTimePretty,
    duration: visit.visitDurationPretty || '0s',
    country: visit.country || 'Unknown',
    city: visit.city || 'Unknown',
    device: visit.deviceType || 'Unknown',
    browser: visit.browserName || 'Unknown',
    isFirstVisit: visit.visitCount === '1',
    actionCount: visit.actions || 0
  };
}

module.exports = {
  getRecentVisits,
  testConnection,
  extractAccessCode,
  extractVisitedPages,
  formatVisitData
};