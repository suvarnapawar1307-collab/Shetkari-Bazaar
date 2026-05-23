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

// ═══════════════════════════════════════════════════════════════════════════
// 2. MahaDBT - Maharashtra Direct Benefit Transfer Portal
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromMahaDBT() {
  console.log('🔍 Fetching from MahaDBT...');
  
  try {
    // Fetch main farmer portal page
    const response = await axios.get(
      'https://mahadbt.maharashtra.gov.in/Farmer/AgriLogin/AgriLogin',
      { headers: HEADERS, timeout: 30000 }
    );
    
    const $ = cheerio.load(response.data);
    const schemes = [];
    
    // Extract scheme links
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      
      if (!href || !text || text.length < 5) return;
      
      const lowerText = text.toLowerCase();
      
      // Filter for farmer/agriculture schemes
      const farmerKeywords = [
        'शेतकरी', 'कृषी', 'शेत', 'पीक', 'किसान',
        'farmer', 'agricult', 'crop', 'farm',
        'ट्रॅक्टर', 'यंत्र', 'सिंचन', 'पाणी', 'कर्ज', 'विमा',
        'tractor', 'machinery', 'irrigation', 'loan', 'insurance',
        'अनुदान', 'subsidy', 'सबसिडी', 'योजना'
      ];
      
      const excludeKeywords = ['login', 'logout', 'register', 'home', 'contact', 'about', 'तक्रार', 'प्रश्न', 'पुस्तिका'];
      
      const isFarmerScheme = farmerKeywords.some(k => lowerText.includes(k));
      const isExcluded = excludeKeywords.some(k => lowerText.includes(k));
      
      if (isFarmerScheme && !isExcluded) {
        let fullUrl = href;
        if (!href.startsWith('http')) {
          fullUrl = href.startsWith('/') 
            ? 'https://mahadbt.maharashtra.gov.in' + href 
            : 'https://mahadbt.maharashtra.gov.in/' + href;
        }
        
        // Determine category
        let category = 'सबसिडी';
        if (lowerText.includes('कर्ज') || lowerText.includes('loan')) {
          category = 'कर्ज';
        } else if (lowerText.includes('विमा') || lowerText.includes('insurance')) {
          category = 'विमा';
        } else if (lowerText.includes('यंत्र') || lowerText.includes('machinery')) {
          category = 'उपकरणे';
        } else if (lowerText.includes('प्रशिक्षण') || lowerText.includes('training')) {
          category = 'प्रशिक्षण';
        } else if (lowerText.includes('सिंचन') || lowerText.includes('irrigation') || lowerText.includes('पाणी')) {
          category = 'सिंचन';
        }
        
        schemes.push({
          id: `mahadbt-${text.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`,
          titleEn: text,
          titleMr: text,
          titleHi: text,
          descriptionEn: `${text} - Maharashtra government scheme for farmers`,
          descriptionMr: `${text} - महाराष्ट्र शासनाची शेतकऱ्यांसाठी योजना`,
          descriptionHi: `${text} - महाराष्ट्र सरकार की किसानों के लिए योजना`,
          imageUrl: null,
          documentUrl: null,
          websiteUrl: fullUrl,
          category: category,
          eligibility: ['महाराष्ट्रातील शेतकरी', 'भारतीय नागरिक'],
          benefits: ['सरकारी योजना लाभ', 'आर्थिक सहाय्य'],
          documents: ['आधार कार्ड', '7/12 उतारा', 'बँक खाते तपशील'],
          applicationProcess: 'MahaDBT पोर्टल वर ऑनलाइन अर्ज करा',
          deadline: null,
          isActive: true,
          source: 'mahadbt.maharashtra.gov.in',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });
    
    // Remove duplicates
    const uniqueSchemes = [];
    const seen = new Set();
    for (const scheme of schemes) {
      if (!seen.has(scheme.id)) {
        seen.add(scheme.id);
        uniqueSchemes.push(scheme);
      }
    }
    
    console.log(`  ✅ Fetched ${uniqueSchemes.length} schemes from MahaDBT`);
    return uniqueSchemes;
    
  } catch (error) {
    console.log(`  ⚠️  MahaDBT scraping failed: ${error.message}`);
    return [];
  }
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

// ═══════════════════════════════════════════════════════════════════════════
// 4. GovtSchemes.in - Government Schemes Portal (with Detailed Extraction)
// ═══════════════════════════════════════════════════════════════════════════

async function fetchFromGovtSchemes() {
  console.log('🔍 Fetching from GovtSchemes.in...');
  
  try {
    const categories = [
      'https://www.govtschemes.in/taxonomies/term/59',  // Agriculture
      'https://www.govtschemes.in/taxonomies/term/111', // Farmer
    ];
    
    let schemeLinks = [];
    
    // Step 1: Collect scheme links
    for (const categoryUrl of categories) {
      const response = await axios.get(categoryUrl, { 
        headers: HEADERS, 
        timeout: 30000 
      });
      
      const $ = cheerio.load(response.data);
      
      // Find scheme links
      $('a').each((_, element) => {
        const href = $(element).attr('href');
        const text = $(element).text().trim();
        
        if (!href || !text || text.length < 10) return;
        
        const lowerText = text.toLowerCase();
        const lowerHref = href.toLowerCase();
        
        // Check if it's Maharashtra or Central government scheme
        const isMaharashtra = lowerText.includes('maharashtra') || lowerText.includes('महाराष्ट्र');
        const isCentral = lowerText.includes('pradhan mantri') || 
                         lowerText.includes('pm ') || 
                         lowerText.includes('pm-') ||
                         lowerText.includes('प्रधानमंत्री') ||
                         lowerText.includes('national') ||
                         lowerText.includes('rashtriya') ||
                         lowerText.includes('राष्ट्रीय') ||
                         lowerText.includes('central');
        
        // Exclude other state schemes
        const otherStates = [
          'haryana', 'gujarat', 'rajasthan', 'punjab', 'bihar', 'uttar pradesh',
          'madhya pradesh', 'karnataka', 'tamil nadu', 'kerala', 'telangana',
          'andhra pradesh', 'west bengal', 'odisha', 'jharkhand', 'chhattisgarh',
          'uttarakhand', 'himachal pradesh', 'jammu', 'kashmir', 'goa',
          'assam', 'meghalaya', 'manipur', 'tripura', 'mizoram', 'nagaland',
          'arunachal pradesh', 'sikkim'
        ];
        
        const isOtherState = otherStates.some(state => lowerText.includes(state));
        
        // Only include Maharashtra or Central schemes (not other states)
        if (!isMaharashtra && !isCentral) return;
        if (isOtherState && !isCentral) return;
        
        // Exclude non-scheme links
        const excludeKeywords = [
          'subscription', 'forum', 'complaint', 'login', 'register',
          'allschemes', 'subscribe', 'alerts', 'discussion', 'comment'
        ];
        
        const isExcluded = excludeKeywords.some(k => 
          lowerText.includes(k) || lowerHref.includes(k)
        );
        
        if (isExcluded) return;
        
        // Must be a proper scheme link
        const isSchemeLink = (
          lowerText.includes('scheme') || 
          lowerText.includes('yojana') || 
          lowerText.includes('योजना') ||
          (href.startsWith('/') && href.length > 10 && !href.includes('/form/'))
        );
        
        if (!isSchemeLink) return;
        
        const fullUrl = href.startsWith('http') ? href : 'https://www.govtschemes.in' + href;
        
        schemeLinks.push({ title: text, url: fullUrl });
      });
      
      await sleep(2000);
    }
    
    // Remove duplicates
    const uniqueLinks = [];
    const seen = new Set();
    for (const link of schemeLinks) {
      if (!seen.has(link.url)) {
        seen.add(link.url);
        uniqueLinks.push(link);
      }
    }
    
    console.log(`  📋 Found ${uniqueLinks.length} scheme links`);
    
    // Step 2: Fetch detailed information for each scheme (limit to 10 to avoid overload)
    const schemesToFetch = uniqueLinks.slice(0, 10);
    const schemes = [];
    
    for (let i = 0; i < schemesToFetch.length; i++) {
      const link = schemesToFetch[i];
      console.log(`  [${i + 1}/${schemesToFetch.length}] Fetching: ${link.title}`);
      
      try {
        const response = await axios.get(link.url, { headers: HEADERS, timeout: 30000 });
        const $ = cheerio.load(response.data);
        
        // Remove unwanted elements
        $('script, style, nav, header, footer, .menu, .sidebar').remove();
        
        const scheme = {
          id: `govtschemes-${link.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 50)}`,
          titleEn: link.title,
          titleMr: link.title,
          titleHi: link.title,
          descriptionEn: '',
          descriptionMr: '',
          descriptionHi: '',
          imageUrl: null,
          documentUrl: null,
          websiteUrl: link.url,
          category: 'सबसिडी',
          eligibility: [],
          benefits: [],
          documents: [],
          applicationProcess: '',
          deadline: null,
          isActive: true,
          source: 'govtschemes.in',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        const mainContent = $('article, .content').first();
        
        // Extract description
        const introHeading = mainContent.find('h2, h3').filter((i, el) => {
          const text = $(el).text().toLowerCase();
          return text.includes('introduction') || text.includes('overview');
        }).first();
        
        if (introHeading.length > 0) {
          let desc = '';
          introHeading.nextAll('p').slice(0, 3).each((i, el) => {
            desc += $(el).text().trim() + '\n\n';
          });
          scheme.descriptionEn = desc.trim();
          scheme.descriptionMr = desc.trim();
        }
        
        // Extract benefits
        const benefitsHeading = mainContent.find('h2, h3').filter((i, el) => {
          return $(el).text().toLowerCase().includes('benefit');
        }).first();
        
        if (benefitsHeading.length > 0) {
          benefitsHeading.nextAll('ul, ol').first().find('li').each((i, el) => {
            const text = $(el).text().trim();
            if (text && i < 10) scheme.benefits.push(text);
          });
        }
        
        // Extract eligibility
        const eligibilityHeading = mainContent.find('h2, h3').filter((i, el) => {
          return $(el).text().toLowerCase().includes('eligibility');
        }).first();
        
        if (eligibilityHeading.length > 0) {
          eligibilityHeading.nextAll('ul, ol').first().find('li').each((i, el) => {
            const text = $(el).text().trim();
            if (text && i < 10) scheme.eligibility.push(text);
          });
        }
        
        // Extract documents
        const documentsHeading = mainContent.find('h2, h3').filter((i, el) => {
          return $(el).text().toLowerCase().includes('document');
        }).first();
        
        if (documentsHeading.length > 0) {
          documentsHeading.nextAll('ul, ol').first().find('li').each((i, el) => {
            const text = $(el).text().trim();
            if (text && i < 10) scheme.documents.push(text);
          });
        }
        
        // Extract official website
        mainContent.find('a').each((i, el) => {
          const href = $(el).attr('href');
          const text = $(el).text().toLowerCase();
          if (href && href.startsWith('http') && !href.includes('govtschemes.in')) {
            if (text.includes('official') || text.includes('website')) {
              scheme.websiteUrl = href;
            }
            if (href.includes('.pdf')) {
              scheme.documentUrl = href;
            }
          }
        });
        
        // Determine category
        const titleLower = link.title.toLowerCase();
        if (titleLower.includes('electricity') || titleLower.includes('vij') || titleLower.includes('power')) {
          scheme.category = 'वीज';
        } else if (titleLower.includes('insurance') || titleLower.includes('bima')) {
          scheme.category = 'विमा';
        } else if (titleLower.includes('loan') || titleLower.includes('credit')) {
          scheme.category = 'कर्ज';
        } else if (titleLower.includes('pension')) {
          scheme.category = 'इतर';
        }
        
        // Set defaults
        if (scheme.eligibility.length === 0) {
          scheme.eligibility = ['भारतीय नागरिक', 'शेतकरी'];
        }
        if (scheme.benefits.length === 0) {
          scheme.benefits = ['सरकारी योजना लाभ'];
        }
        if (scheme.documents.length === 0) {
          scheme.documents = ['आधार कार्ड', 'बँक खाते तपशील'];
        }
        
        scheme.applicationProcess = 'अधिकृत वेबसाइट वर ऑनलाइन अर्ज करा';
        
        schemes.push(scheme);
        console.log(`    ✅ Extracted`);
        
      } catch (error) {
        console.log(`    ⚠️  Failed: ${error.message}`);
      }
      
      await sleep(2000);
    }
    
    console.log(`  ✅ Fetched ${schemes.length} detailed schemes from GovtSchemes.in`);
    return schemes;
    
  } catch (error) {
    console.log(`  ⚠️  GovtSchemes.in scraping failed: ${error.message}`);
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
      fetchFromGovtSchemes(),
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
