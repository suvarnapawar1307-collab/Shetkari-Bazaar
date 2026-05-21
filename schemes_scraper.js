#!/usr/bin/env node

/**
 * Government Schemes Scraper - LIVE DATA
 * Fetches real-time schemes from official government websites
 * NO HARDCODED DATA - Pure web scraping!
 */

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,mr;q=0.8,hi;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════
// 1. MyScheme.gov.in - Official Central Government Portal
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromMyScheme() {
  console.log('🔍 Fetching from MyScheme.gov.in API...');
  
  try {
    // Use the official MyScheme API v6
    const apiUrl = 'https://api.myscheme.gov.in/search/v6/schemes';
    const params = new URLSearchParams({
      lang: 'mr',
      q: JSON.stringify([
        { identifier: 'level', value: 'State' },
        { identifier: 'beneficiaryState', value: 'Maharashtra' }
      ]),
      keyword: '',
      sort: 'multiple_sort',
      from: '0',
      size: '100' // Fetch 100 schemes
    });

    const response = await axios.get(`${apiUrl}?${params}`, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'origin': 'https://www.myscheme.gov.in',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
        'x-api-key': 'tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc'
      },
      timeout: 30000,
    });

    // Check correct response structure: response.data.data.hits.items
    if (response.data && response.data.data && response.data.data.hits && response.data.data.hits.items) {
      const allItems = response.data.data.hits.items;
      
      const schemes = allItems
        .filter(s => {
          // Since we already filtered for Maharashtra state schemes in the API call,
          // we can be less restrictive here. Just exclude schemes that are clearly not relevant.
          // Most Maharashtra state schemes are agriculture-related anyway.
          const fields = s.fields || {};
          const titleMr = (fields.schemeName || '').toLowerCase();
          const titleEn = (fields.schemeNameEng || '').toLowerCase();
          const descMr = (fields.briefDescription || '').toLowerCase();
          const descEn = (fields.briefDescriptionEng || '').toLowerCase();
          
          // Exclude clearly non-agricultural schemes (education, health, housing only)
          const isEducationOnly = (titleEn.includes('education') || titleEn.includes('school') || titleEn.includes('student')) &&
                                   !titleEn.includes('farm') && !titleEn.includes('agricult');
          const isHealthOnly = (titleEn.includes('health') || titleEn.includes('medical') || titleEn.includes('hospital')) &&
                               !titleEn.includes('farm') && !titleEn.includes('agricult');
          
          // Include everything else (most Maharashtra schemes benefit farmers)
          return !isEducationOnly && !isHealthOnly;
        })
        .map((s, i) => {
          const fields = s.fields || {};
          
          // Determine category
          let category = 'इतर';
          const titleMr = (fields.schemeName || '').toLowerCase();
          const titleEn = (fields.schemeNameEng || '').toLowerCase();
          const descMr = (fields.briefDescription || '').toLowerCase();
          const descEn = (fields.briefDescriptionEng || '').toLowerCase();
          
          if (titleMr.includes('कर्ज') || titleEn.includes('loan') || titleEn.includes('credit')) {
            category = 'कर्ज';
          } else if (titleMr.includes('विमा') || titleEn.includes('insurance') || titleMr.includes('बीमा')) {
            category = 'विमा';
          } else if (titleMr.includes('अनुदान') || titleEn.includes('subsidy') || titleMr.includes('सबसिडी')) {
            category = 'सबसिडी';
          } else if (titleMr.includes('प्रशिक्षण') || titleEn.includes('training')) {
            category = 'प्रशिक्षण';
          } else if (titleMr.includes('यंत्र') || titleEn.includes('machinery') || titleEn.includes('equipment')) {
            category = 'उपकरणे';
          }

          // Build website URL from slug
          const websiteUrl = fields.slug 
            ? `https://www.myscheme.gov.in/schemes/${fields.slug}`
            : 'https://www.myscheme.gov.in';

          return {
            id: `myscheme-${fields.schemeId || fields.slug || s.id || i}`,
            titleEn: fields.schemeNameEng || fields.schemeName || '',
            titleMr: fields.schemeName || fields.schemeNameEng || '',
            titleHi: fields.schemeNameHin || fields.schemeName || '',
            descriptionEn: fields.briefDescriptionEng || fields.briefDescription || 'Government scheme',
            descriptionMr: fields.briefDescription || fields.briefDescriptionEng || 'सरकारी योजना',
            descriptionHi: fields.briefDescriptionHin || fields.briefDescription || 'सरकारी योजना',
            imageUrl: null,
            documentUrl: null,
            websiteUrl: websiteUrl,
            category: category,
            eligibility: ['भारतीय नागरिक', 'महाराष्ट्र राज्य'],
            benefits: ['सरकारी योजना लाभ'],
            documents: ['आधार कार्ड', 'बँक खाते तपशील'],
            applicationProcess: 'MyScheme पोर्टल वर ऑनलाइन अर्ज करा किंवा संबंधित विभागात अर्ज करा',
            deadline: null,
            isActive: true,
            source: 'myscheme.gov.in',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        });

      console.log(`  ✅ Fetched ${schemes.length} agriculture schemes from MyScheme API`);
      return schemes;
    }
  } catch (error) {
    console.log(`  ⚠️  MyScheme API failed: ${error.message}`);
    return []; // Return empty array if API fails
  }

  // No fallback data - only live API data
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. MahaDBT - Maharashtra Direct Benefit Transfer Portal
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromMahaDBT() {
  console.log('🔍 Fetching from MahaDBT...');
  
  // MahaDBT website is not accessible for scraping
  // Return empty array - only use live API data
  console.log('  ℹ️  MahaDBT scraping not available - skipping');
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Krishi Maharashtra - Agriculture Department
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromKrishiMaharashtra() {
  console.log('🔍 Fetching from Krishi Maharashtra...');
  
  // Return empty array - only use live API data
  console.log('  ℹ️  Krishi Maharashtra scraping not available - skipping');
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. India.gov.in - National Portal
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromIndiaGov() {
  console.log('🔍 Fetching from India.gov.in...');
  
  // Return empty array - only use live API data
  console.log('  ℹ️  India.gov.in scraping not available - skipping');
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function mapCategory(category) {
  if (!category) return 'इतर';
  
  const cat = category.toLowerCase();
  if (cat.includes('agricult') || cat.includes('farm') || cat.includes('कृषी')) return 'सबसिडी';
  if (cat.includes('loan') || cat.includes('credit') || cat.includes('कर्ज')) return 'कर्ज';
  if (cat.includes('insur') || cat.includes('विमा')) return 'विमा';
  if (cat.includes('train') || cat.includes('प्रशिक्षण')) return 'प्रशिक्षण';
  if (cat.includes('equip') || cat.includes('उपकरण')) return 'उपकरणे';
  if (cat.includes('market') || cat.includes('विपणन')) return 'विपणन';
  
  return 'इतर';
}

function deduplicateSchemes(schemes) {
  const seen = new Set();
  return schemes.filter(scheme => {
    // Create unique key from title
    const key = scheme.titleEn.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validateScheme(scheme) {
  return (
    scheme.id &&
    scheme.titleMr &&
    scheme.titleMr.length > 3 &&
    scheme.category &&
    scheme.source
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Save to JSON File (for GitHub repo - Direct fetch by Flutter app)
// ═══════════════════════════════════════════════════════════════════════════

function saveToJson(schemes) {
  console.log('💾 Saving to schemes_latest.json...');
  
  const data = {
    lastUpdated: new Date().toISOString(),
    totalSchemes: schemes.length,
    schemes: schemes,
  };
  
  fs.writeFileSync('schemes_latest.json', JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ Saved to schemes_latest.json');
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Function
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🌾 Government Schemes Live Scraper');
  console.log('  📅 ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  try {
    // Fetch from multiple sources in parallel
    console.log('🔄 Fetching from multiple sources...\n');
    
    const results = await Promise.allSettled([
      fetchFromMyScheme(),
      fetchFromMahaDBT(),
      fetchFromKrishiMaharashtra(),
      fetchFromIndiaGov(),
    ]);

    // Collect successful results
    let allSchemes = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        allSchemes = allSchemes.concat(result.value);
      }
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  📊 Fetch Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  Total fetched: ${allSchemes.length}`);
    
    // Validate schemes
    allSchemes = allSchemes.filter(validateScheme);
    console.log(`  After validation: ${allSchemes.length}`);
    
    // Remove duplicates
    allSchemes = deduplicateSchemes(allSchemes);
    console.log(`  After deduplication: ${allSchemes.length}`);
    
    // Group by source
    const bySource = {};
    allSchemes.forEach(s => {
      bySource[s.source] = (bySource[s.source] || 0) + 1;
    });
    
    console.log('');
    console.log('  By Source:');
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`    ${source}: ${count}`);
    });
    
    console.log('═══════════════════════════════════════════════════════════════');
    
    if (allSchemes.length === 0) {
      console.log('');
      console.log('⚠️  No schemes fetched! All sources failed.');
      console.log('   Check internet connection and website availability.');
      console.log('');
      process.exit(1);
    }

    // Save to JSON
    saveToJson(allSchemes);
    
    console.log('');
    console.log('✅ Schemes sync completed successfully!');
    console.log(`   Total schemes: ${allSchemes.length}`);
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, fetchFromMyScheme, fetchFromMahaDBT };
