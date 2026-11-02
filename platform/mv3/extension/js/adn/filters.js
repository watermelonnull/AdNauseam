/*******************************************************************************
    AdNauseam MV3 - Filter parser
    Extracts cosmetic selectors from filter lists
*******************************************************************************/

// Parse cosmetic filters and extract selectors
function parseCosmeticFilters(filterText) {
  const selectors = [];
  const lines = filterText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('#')) continue;
    
    // Match cosmetic filters: example.com##.selector
    const cosmeticMatch = trimmed.match(/^([^#]*?)##(.+)$/);
    if (cosmeticMatch) {
      const selector = cosmeticMatch[2];
      
      // Skip procedural selectors and special cases
      if (selector.includes(':has(') ||
          selector.includes(':has-text(') ||
          selector.includes(':style(') ||
          selector.includes(':remove(') ||
          selector.includes('script:') ||
          selector.startsWith('+js(')) {
        continue;
      }
      
      // Valid simple CSS selector
      selectors.push(selector);
    }
  }
  
  return selectors;
}

// Load and parse AdNauseam filters
async function loadAdNauseamFilters() {
  try {
    // In real implementation, fetch from adnauseam.txt
    // For now, return common ad selectors
    return [
      '.ad',
      '.advertisement',
      '[data-ad]',
      '.sponsored',
      '.pla-unit',
      '.clickable-card',
      '[id*="ad-"]',
      '[class*="ad-"]',
      '.GoogleActiveViewElement'
    ];
  } catch (error) {
    console.error('[ADN] Error loading filters:', error);
    return [];
  }
}

export { parseCosmeticFilters, loadAdNauseamFilters };