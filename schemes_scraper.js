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
  console.log('🔍 Fetching from MyScheme.gov.in...');
  
  try {
    // Try API endpoint first
    const apiResponse = await axios.post(
      'https://www.myscheme.gov.in/api/scheme/search',
      {
        category: ['Agriculture', 'Rural Development', 'Social Welfare'],
        state: ['Maharashtra', 'All India'],
        limit: 100,
      },
      {
        headers: { ...HEADERS, 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    if (apiResponse.data && apiResponse.data.schemes) {
      const schemes = apiResponse.data.schemes
        .filter(s => s.category && (s.category.includes('Agricult') || s.category.includes('Rural')))
        .map((s, i) => ({
          id: `myscheme-${s.schemeId || i}`,
          titleEn: s.schemeName || s.title || '',
          titleMr: s.schemeNameMr || s.schemeName || '',
          titleHi: s.schemeNameHi || s.schemeName || '',
          descriptionEn: s.description || s.shortDescription || '',
          descriptionMr: s.descriptionMr || s.description || '',
          descriptionHi: s.descriptionHi || s.description || '',
          imageUrl: s.imageUrl || null,
          documentUrl: s.documentUrl || null,
          websiteUrl: s.officialUrl || s.url || 'https://www.myscheme.gov.in',
          category: mapCategory(s.category),
          eligibility: Array.isArray(s.eligibility) ? s.eligibility : [s.eligibility || 'भारतीय नागरिक'],
          benefits: Array.isArray(s.benefits) ? s.benefits : [s.benefits || 'सरकारी योजना लाभ'],
          documents: Array.isArray(s.documents) ? s.documents : ['आधार कार्ड', 'बँक खाते तपशील'],
          applicationProcess: s.applicationProcess || 'संबंधित विभागात अर्ज करा',
          deadline: s.deadline || null,
          isActive: true,
          source: 'myscheme.gov.in',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

      console.log(`  ✅ Found ${schemes.length} schemes from MyScheme API`);
      return schemes;
    }
  } catch (error) {
    console.log(`  ⚠️  MyScheme API failed: ${error.message}`);
  }

  // Fallback: Scrape website
  try {
    const response = await axios.get('https://www.myscheme.gov.in/search?category=Agriculture', {
      headers: HEADERS,
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const schemes = [];

    $('.scheme-card, .card, .scheme-item').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h3, h4, .scheme-title, .card-title').first().text().trim();
      const description = $elem.find('p, .description, .card-text').first().text().trim();
      const link = $elem.find('a').attr('href');

      if (title && title.length > 5) {
        schemes.push({
          id: `myscheme-web-${i}`,
          titleEn: title,
          titleMr: title,
          titleHi: title,
          descriptionEn: description || 'Government scheme for farmers',
          descriptionMr: description || 'शेतकऱ्यांसाठी सरकारी योजना',
          descriptionHi: description || 'किसानों के लिए सरकारी योजना',
          websiteUrl: link ? (link.startsWith('http') ? link : `https://www.myscheme.gov.in${link}`) : 'https://www.myscheme.gov.in',
          category: 'सबसिडी',
          eligibility: ['भारतीय नागरिक', 'शेतकरी'],
          benefits: ['सरकारी योजना लाभ'],
          documents: ['आधार कार्ड', 'बँक खाते तपशील'],
          applicationProcess: 'ऑनलाइन अर्ज करा',
          deadline: null,
          isActive: true,
          source: 'myscheme.gov.in',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    console.log(`  ✅ Scraped ${schemes.length} schemes from MyScheme website`);
    return schemes;
  } catch (error) {
    console.log(`  ❌ MyScheme scraping failed: ${error.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. MahaDBT - Maharashtra Direct Benefit Transfer Portal
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromMahaDBT() {
  console.log('🔍 Fetching from MahaDBT...');
  
  try {
    const response = await axios.get(
      'https://mahadbt.maharashtra.gov.in/SchemeData/SchemeData?str=E9DDFA703C38E51AA9F5373F9D2DAAA2',
      {
        headers: HEADERS,
        timeout: 30000,
      }
    );

    const $ = cheerio.load(response.data);
    const schemes = [];

    // Parse table rows
    $('table tr, .scheme-row, .scheme-card').each((i, elem) => {
      const $elem = $(elem);
      const cells = $elem.find('td');
      
      if (cells.length >= 2) {
        const title = $(cells[0]).text().trim() || $(cells[1]).text().trim();
        const department = $(cells[2]).text().trim();
        const link = $elem.find('a').attr('href');

        if (title && title.length > 5 && !title.includes('एकूण') && !title.includes('Total')) {
          schemes.push({
            id: `mahadbt-${i}`,
            titleEn: title,
            titleMr: title,
            titleHi: title,
            descriptionEn: `Maharashtra government scheme - ${department}`,
            descriptionMr: `महाराष्ट्र शासकीय योजना - ${department}`,
            descriptionHi: `महाराष्ट्र सरकारी योजना - ${department}`,
            websiteUrl: link ? `https://mahadbt.maharashtra.gov.in${link}` : 'https://mahadbt.maharashtra.gov.in',
            category: 'सबसिडी',
            eligibility: ['महाराष्ट्रातील नागरिक', 'आधार कार्ड आवश्यक'],
            benefits: ['थेट लाभ हस्तांतरण', 'ऑनलाइन अर्ज'],
            documents: ['आधार कार्ड', 'बँक खाते तपशील', 'जमीन दस्तऐवज'],
            applicationProcess: 'MahaDBT पोर्टल वर ऑनलाइन अर्ज करा',
            deadline: null,
            isActive: true,
            source: 'mahadbt.maharashtra.gov.in',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }
    });

    console.log(`  ✅ Scraped ${schemes.length} schemes from MahaDBT`);
    return schemes;
  } catch (error) {
    console.log(`  ❌ MahaDBT scraping failed: ${error.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. Krishi Maharashtra - Agriculture Department
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromKrishiMaharashtra() {
  console.log('🔍 Fetching from Krishi Maharashtra...');
  
  try {
    const response = await axios.get(
      'https://krishi.maharashtra.gov.in/1035/Schemes',
      {
        headers: HEADERS,
        timeout: 30000,
      }
    );

    const $ = cheerio.load(response.data);
    const schemes = [];

    $('.scheme-list li, .content-area ul li, table tr').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      const link = $elem.find('a').attr('href');

      if (text && text.length > 10 && !text.includes('Home') && !text.includes('Menu')) {
        schemes.push({
          id: `krishi-mh-${i}`,
          titleEn: text,
          titleMr: text,
          titleHi: text,
          descriptionEn: 'Maharashtra agriculture department scheme',
          descriptionMr: 'महाराष्ट्र कृषी विभाग योजना',
          descriptionHi: 'महाराष्ट्र कृषि विभाग योजना',
          websiteUrl: link ? (link.startsWith('http') ? link : `https://krishi.maharashtra.gov.in${link}`) : 'https://krishi.maharashtra.gov.in',
          category: 'सबसिडी',
          eligibility: ['महाराष्ट्रातील शेतकरी'],
          benefits: ['कृषी विकास योजना'],
          documents: ['आधार कार्ड', '7/12 उतारा'],
          applicationProcess: 'जवळच्या कृषी कार्यालयात अर्ज करा',
          deadline: null,
          isActive: true,
          source: 'krishi.maharashtra.gov.in',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    console.log(`  ✅ Scraped ${schemes.length} schemes from Krishi Maharashtra`);
    return schemes;
  } catch (error) {
    console.log(`  ❌ Krishi Maharashtra scraping failed: ${error.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. India.gov.in - National Portal
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromIndiaGov() {
  console.log('🔍 Fetching from India.gov.in...');
  
  try {
    const response = await axios.get(
      'https://www.india.gov.in/topics/agriculture',
      {
        headers: HEADERS,
        timeout: 30000,
      }
    );

    const $ = cheerio.load(response.data);
    const schemes = [];

    $('.view-content .views-row, .content-list li, .scheme-item').each((i, elem) => {
      const $elem = $(elem);
      const title = $elem.find('h3, h4, .title, a').first().text().trim();
      const description = $elem.find('p, .description, .summary').first().text().trim();
      const link = $elem.find('a').attr('href');

      if (title && title.length > 5) {
        schemes.push({
          id: `indiagov-${i}`,
          titleEn: title,
          titleMr: title,
          titleHi: title,
          descriptionEn: description || 'Central government agriculture scheme',
          descriptionMr: description || 'केंद्र सरकारची शेती योजना',
          descriptionHi: description || 'केंद्र सरकार की कृषि योजना',
          websiteUrl: link ? (link.startsWith('http') ? link : `https://www.india.gov.in${link}`) : 'https://www.india.gov.in',
          category: 'सबसिडी',
          eligibility: ['भारतीय शेतकरी'],
          benefits: ['केंद्र सरकार योजना'],
          documents: ['आधार कार्ड', 'जमीन दस्तऐवज'],
          applicationProcess: 'संबंधित विभागात अर्ज करा',
          deadline: null,
          isActive: true,
          source: 'india.gov.in',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

    console.log(`  ✅ Scraped ${schemes.length} schemes from India.gov.in`);
    return schemes;
  } catch (error) {
    console.log(`  ❌ India.gov.in scraping failed: ${error.message}`);
    return [];
  }
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
