// telegram-bot/services/matomo.js

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
  if (Array.isArray(visit.customDimensions)) {
    const dim = visit.customDimensions.find(d => d.idDimension === '1');
    if (dim?.value) return dim.value;
  }
  
  // Fallback to URL parameter
  const firstAction = visit.actionDetails?.find(
    action => action.url && action.url.includes('code=')
  );
  
  if (firstAction) {
    const urlMatch = firstAction.url.match(/[?&]code=([^&#]+)/);
    if (urlMatch) {
      return urlMatch[1];
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
  if (!visit.actionDetails) return [];
  
  const pages = [];
  const seenUrls = new Set(); // To avoid duplicates
  
  visit.actionDetails.forEach(action => {
    // Only process page views (not downloads, outlinks, etc.)
    if (action.type !== 'action' || !action.url) return;
    
    // Create a unique key for this page view
    const urlKey = action.url;
    
    // Skip if we've already seen this exact URL in sequence
    if (pages.length > 0 && pages[pages.length - 1].url === urlKey) {
      return;
    }
    
    // Extract page name from different sources
    let pageName = 'Unknown Page';
    
    // First, try to use the page title if it's meaningful
    if (action.pageTitle && !action.pageTitle.includes('Undevy Portfolio')) {
      pageName = action.pageTitle;
    } 
    // Then, try to extract from URL hash
    else if (action.url.includes('#')) {
      const hashMatch = action.url.match(/#([^&?\s]+)/);
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
    else if (action.pageTitle) {
      pageName = action.pageTitle;
    }
    
    pages.push({ name: pageName, url: urlKey });
  });
  
  // Return just the page names, removing consecutive duplicates
  return pages
    .map(p => p.name)
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