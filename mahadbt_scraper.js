#!/usr/bin/env node

/**
 * MahaDBT Farmer Schemes Scraper
 * Scrapes farmer/agriculture schemes from MahaDBT portal
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://mahadbt.maharashtra.gov.in';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,mr;q=0.8',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════
// Fetch Main Farmer Login Page
// ═══════════════════════════════════════════════════════════════════════════

async function fetchMainPage() {
  try {
    console.log('🔍 Fetching MahaDBT Farmer Portal...');
    const response = await axios.get(
      `${BASE_URL}/Farmer/AgriLogin/AgriLogin`,
      { headers: HEADERS, timeout: 30000 }
    );
    console.log('  ✅ Main page fetched successfully');
    return response.data;
  } catch (error) {
    console.error('  ❌ Error fetching main page:', error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Extract Farmer Scheme Links
// ═══════════════════════════════════════════════════════════════════════════

async function extractSchemeLinks(html) {
  const $ = cheerio.load(html);
  const links = [];
  
  // Find all links that look like scheme links
  $('a').each((_, element) => {
    const href = $(element).attr('href');
    const text = $(element).text().trim();
    
    if (!href || !text) return;
    
    // Filter for farmer/agriculture related schemes
    const lowerText = text.toLowerCase();
    const lowerHref = href.toLowerCase();
    
    // Keywords that indicate farmer schemes
    const farmerKeywords = [
      'शेतकरी', 'कृषी', 'शेत', 'पीक', 'किसान', 'खत', 'बियाणे',
      'farmer', 'agricult', 'crop', 'farm', 'seed', 'fertilizer',
      'ट्रॅक्टर', 'यंत्र', 'सिंचन', 'पाणी', 'कर्ज', 'विमा',
      'tractor', 'machinery', 'irrigation', 'loan', 'insurance',
      'अनुदान', 'subsidy', 'सबसिडी'
    ];
    
    // Check if link is related to farmer schemes
    const isFarmerScheme = farmerKeywords.some(keyword => 
      lowerText.includes(keyword) || lowerHref.includes(keyword)
    );
    
    // Exclude non-scheme links
    const excludeKeywords = ['login', 'logout', 'register', 'home', 'contact', 'about'];
    const isExcluded = excludeKeywords.some(keyword => 
      lowerText.includes(keyword) || lowerHref.includes(keyword)
    );
    
    if (isFarmerScheme && !isExcluded && text.length > 5) {
      let fullUrl = href;
      if (!href.startsWith('http')) {
        fullUrl = href.startsWith('/') ? BASE_URL + href : BASE_URL + '/' + href;
      }
      
      links.push({
        title: text,
        url: fullUrl,
      });
    }
  });
  
  // Remove duplicates
  const uniqueLinks = [];
  const seen = new Set();
  
  for (const link of links) {
    const key = link.url.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueLinks.push(link);
    }
  }
  
  console.log(`  ✅ Found ${uniqueLinks.length} farmer scheme links`);
  return uniqueLinks;
}

// ═══════════════════════════════════════════════════════════════════════════
// Fetch and Parse Scheme Details
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSchemeDetails(url, title) {
  try {
    const response = await axios.get(url, { 
      headers: HEADERS, 
      timeout: 30000 
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove script, style, and navigation elements
    $('script, style, nav, header, footer, .menu, .sidebar').remove();
    
    // Try to find main content area
    let content = '';
    const contentSelectors = [
      '.content', '.main-content', '.scheme-details', 
      '.scheme-info', 'article', 'main', '.container'
    ];
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        break;
      }
    }
    
    // If no specific content area found, get body text
    if (!content) {
      content = $('body').text();
    }
    
    // Clean up text
    content = content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    // Extract structured information
    const scheme = {
      id: `mahadbt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      titleEn: title,
      titleMr: title,
      titleHi: title,
      descriptionEn: '',
      descriptionMr: '',
      descriptionHi: '',
      imageUrl: null,
      documentUrl: null,
      websiteUrl: url,
      category: 'सबसिडी',
      eligibility: [],
      benefits: [],
      documents: [],
      applicationProcess: null,
      deadline: null,
      isActive: true,
      source: 'mahadbt.maharashtra.gov.in',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Extract description (first 500 chars of content)
    const description = content.substring(0, 500).trim();
    scheme.descriptionMr = description;
    scheme.descriptionEn = description;
    scheme.descriptionHi = description;
    
    // Try to extract eligibility
    const eligibilityMatch = content.match(/पात्रता|eligibility|पात्र/i);
    if (eligibilityMatch) {
      const eligibilityText = content.substring(eligibilityMatch.index, eligibilityMatch.index + 500);
      const eligibilityLines = eligibilityText.split(/[।\.\n]/).filter(line => line.trim().length > 10);
      scheme.eligibility = eligibilityLines.slice(0, 5).map(line => line.trim());
    }
    
    // Default eligibility if none found
    if (scheme.eligibility.length === 0) {
      scheme.eligibility = ['महाराष्ट्रातील शेतकरी', 'भारतीय नागरिक'];
    }
    
    // Try to extract benefits
    const benefitsMatch = content.match(/फायदे|benefits|लाभ/i);
    if (benefitsMatch) {
      const benefitsText = content.substring(benefitsMatch.index, benefitsMatch.index + 500);
      const benefitLines = benefitsText.split(/[।\.\n]/).filter(line => line.trim().length > 10);
      scheme.benefits = benefitLines.slice(0, 5).map(line => line.trim());
    }
    
    // Default benefits if none found
    if (scheme.benefits.length === 0) {
      scheme.benefits = ['सरकारी योजना लाभ', 'आर्थिक सहाय्य'];
    }
    
    // Try to extract required documents
    const documentsMatch = content.match(/कागदपत्रे|documents|दस्तावेज/i);
    if (documentsMatch) {
      const documentsText = content.substring(documentsMatch.index, documentsMatch.index + 500);
      const docLines = documentsText.split(/[।\.\n]/).filter(line => line.trim().length > 5);
      scheme.documents = docLines.slice(0, 5).map(line => line.trim());
    }
    
    // Default documents if none found
    if (scheme.documents.length === 0) {
      scheme.documents = ['आधार कार्ड', '7/12 उतारा', 'बँक खाते तपशील'];
    }
    
    // Determine category from title
    const titleLower = title.toLowerCase();
    if (titleLower.includes('कर्ज') || titleLower.includes('loan')) {
      scheme.category = 'कर्ज';
    } else if (titleLower.includes('विमा') || titleLower.includes('insurance')) {
      scheme.category = 'विमा';
    } else if (titleLower.includes('यंत्र') || titleLower.includes('machinery')) {
      scheme.category = 'उपकरणे';
    } else if (titleLower.includes('प्रशिक्षण') || titleLower.includes('training')) {
      scheme.category = 'प्रशिक्षण';
    }
    
    // Application process
    scheme.applicationProcess = 'MahaDBT पोर्टल वर ऑनलाइन अर्ज करा';
    
    return scheme;
    
  } catch (error) {
    console.error(`  ❌ Error fetching scheme: ${url} - ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Function
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🌾 MahaDBT Farmer Schemes Scraper');
  console.log('  📅 ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  // Step 1: Fetch main page
  const html = await fetchMainPage();
  if (!html) {
    console.log('❌ Failed to fetch main page. Exiting...');
    return [];
  }
  
  // Step 2: Extract scheme links
  const links = await extractSchemeLinks(html);
  if (links.length === 0) {
    console.log('⚠️  No farmer scheme links found. Exiting...');
    return [];
  }
  
  console.log('');
  console.log('📋 Scheme Links Found:');
  links.forEach((link, i) => {
    console.log(`  ${i + 1}. ${link.title}`);
  });
  console.log('');
  
  // Step 3: Fetch details for each scheme (limit to first 10 to avoid overload)
  console.log('🔄 Fetching scheme details...');
  const schemes = [];
  const maxSchemes = Math.min(links.length, 10); // Limit to 10 schemes
  
  for (let i = 0; i < maxSchemes; i++) {
    const link = links[i];
    console.log(`  [${i + 1}/${maxSchemes}] Fetching: ${link.title}`);
    
    const scheme = await fetchSchemeDetails(link.url, link.title);
    if (scheme) {
      schemes.push(scheme);
      console.log(`    ✅ Extracted scheme details`);
    }
    
    // Wait 2 seconds between requests to avoid overloading server
    if (i < maxSchemes - 1) {
      await sleep(2000);
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ✅ Successfully scraped ${schemes.length} schemes`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  return schemes;
}

// Run if called directly
if (require.main === module) {
  main().then(schemes => {
    if (schemes.length > 0) {
      console.log('Sample Scheme:');
      console.log(JSON.stringify(schemes[0], null, 2));
    }
  });
}

module.exports = { main };
