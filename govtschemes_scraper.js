#!/usr/bin/env node

/**
 * GovtSchemes.in Scraper
 * Scrapes farmer/agriculture schemes from govtschemes.in
 */

const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://www.govtschemes.in';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════
// Fetch Scheme List from Category Page
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSchemeList(categoryUrl, categoryName) {
  console.log(`🔍 Fetching ${categoryName}...`);
  
  try {
    const response = await axios.get(categoryUrl, { 
      headers: HEADERS, 
      timeout: 30000 
    });
    
    const $ = cheerio.load(response.data);
    const schemes = [];
    
    // Find all scheme links
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim();
      
      if (!href || !text || text.length < 10) return;
      
      // Filter for scheme links (exclude navigation, subscription, etc.)
      const excludeKeywords = [
        'subscription', 'forum', 'complaint', 'login', 'register',
        'home', 'contact', 'about', 'allschemes', 'subscribe',
        'free schemes alerts', 'submit discussion'
      ];
      
      const lowerText = text.toLowerCase();
      const lowerHref = href.toLowerCase();
      
      const isExcluded = excludeKeywords.some(k => 
        lowerText.includes(k) || lowerHref.includes(k)
      );
      
      // Check if it's a scheme link (has "scheme" or "yojana" in text or URL)
      const isScheme = (
        lowerText.includes('scheme') || 
        lowerText.includes('yojana') || 
        lowerText.includes('योजना') ||
        (href.startsWith('/') && href.length > 10 && !href.includes('/form/') && !href.includes('/subscription/'))
      );
      
      if (isScheme && !isExcluded) {
        const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
        
        // Check if it's Maharashtra scheme
        const isMaharashtra = lowerText.includes('maharashtra') || 
                              lowerText.includes('महाराष्ट्र');
        
        schemes.push({
          title: text,
          url: fullUrl,
          isMaharashtra: isMaharashtra,
        });
      }
    });
    
    // Remove duplicates
    const uniqueSchemes = [];
    const seen = new Set();
    
    for (const scheme of schemes) {
      if (!seen.has(scheme.url)) {
        seen.add(scheme.url);
        uniqueSchemes.push(scheme);
      }
    }
    
    console.log(`  ✅ Found ${uniqueSchemes.length} schemes`);
    return uniqueSchemes;
    
  } catch (error) {
    console.error(`  ❌ Error fetching ${categoryName}: ${error.message}`);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Fetch Scheme Details
// ═══════════════════════════════════════════════════════════════════════════

async function fetchSchemeDetails(url, title) {
  try {
    const response = await axios.get(url, { 
      headers: HEADERS, 
      timeout: 30000 
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, .menu, .sidebar, .comment').remove();
    
    // Extract main content
    const article = $('article').first();
    const content = article.length > 0 ? article : $('.content').first();
    
    // Extract description
    let description = '';
    const introSection = content.find('h2:contains("Introduction"), h2:contains("Overview"), h3:contains("Introduction")').first();
    if (introSection.length > 0) {
      description = introSection.next('p').text().trim();
    }
    
    if (!description) {
      // Get first meaningful paragraph
      content.find('p').each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 50 && !description) {
          description = text;
        }
      });
    }
    
    // Limit description length
    if (description.length > 500) {
      description = description.substring(0, 500) + '...';
    }
    
    // Extract benefits
    const benefits = [];
    const benefitsSection = content.find('h2:contains("Benefits"), h3:contains("Benefits"), h2:contains("Scheme Benefits")').first();
    if (benefitsSection.length > 0) {
      benefitsSection.nextAll('ul, ol').first().find('li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && i < 5) {
          benefits.push(text);
        }
      });
      
      // If no list, get paragraphs
      if (benefits.length === 0) {
        benefitsSection.nextAll('p').slice(0, 3).each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 10) {
            benefits.push(text);
          }
        });
      }
    }
    
    // Extract eligibility
    const eligibility = [];
    const eligibilitySection = content.find('h2:contains("Eligibility"), h3:contains("Eligibility"), h2:contains("Eligibility Requirements")').first();
    if (eligibilitySection.length > 0) {
      eligibilitySection.nextAll('ul, ol').first().find('li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && i < 5) {
          eligibility.push(text);
        }
      });
      
      // If no list, get paragraphs
      if (eligibility.length === 0) {
        eligibilitySection.nextAll('p').slice(0, 3).each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 10) {
            eligibility.push(text);
          }
        });
      }
    }
    
    // Extract documents
    const documents = [];
    const documentsSection = content.find('h2:contains("Documents"), h3:contains("Documents"), h2:contains("Required Documents")').first();
    if (documentsSection.length > 0) {
      documentsSection.nextAll('ul, ol').first().find('li').each((i, el) => {
        const text = $(el).text().trim();
        if (text && i < 5) {
          documents.push(text);
        }
      });
    }
    
    // Extract official website link
    let websiteUrl = url;
    content.find('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().toLowerCase();
      if (href && (text.includes('official') || text.includes('website') || text.includes('apply'))) {
        if (href.startsWith('http') && !href.includes('govtschemes.in')) {
          websiteUrl = href;
        }
      }
    });
    
    // Determine category
    let category = 'सबसिडी';
    const titleLower = title.toLowerCase();
    if (titleLower.includes('loan') || titleLower.includes('credit') || titleLower.includes('कर्ज')) {
      category = 'कर्ज';
    } else if (titleLower.includes('insurance') || titleLower.includes('विमा')) {
      category = 'विमा';
    } else if (titleLower.includes('training') || titleLower.includes('प्रशिक्षण')) {
      category = 'प्रशिक्षण';
    } else if (titleLower.includes('machinery') || titleLower.includes('equipment') || titleLower.includes('tractor') || titleLower.includes('यंत्र')) {
      category = 'उपकरणे';
    } else if (titleLower.includes('irrigation') || titleLower.includes('water') || titleLower.includes('सिंचन')) {
      category = 'सिंचन';
    }
    
    // Create scheme object
    const scheme = {
      id: `govtschemes-${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 50)}`,
      titleEn: title,
      titleMr: title,
      titleHi: title,
      descriptionEn: description || `${title} - Government scheme for farmers`,
      descriptionMr: description || `${title} - शेतकऱ्यांसाठी सरकारी योजना`,
      descriptionHi: description || `${title} - किसानों के लिए सरकारी योजना`,
      imageUrl: null,
      documentUrl: null,
      websiteUrl: websiteUrl,
      category: category,
      eligibility: eligibility.length > 0 ? eligibility : ['भारतीय नागरिक', 'शेतकरी'],
      benefits: benefits.length > 0 ? benefits : ['सरकारी योजना लाभ'],
      documents: documents.length > 0 ? documents : ['आधार कार्ड', 'बँक खाते तपशील'],
      applicationProcess: 'अधिकृत वेबसाइट वर ऑनलाइन अर्ज करा',
      deadline: null,
      isActive: true,
      source: 'govtschemes.in',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    return scheme;
    
  } catch (error) {
    console.error(`  ❌ Error fetching details for: ${title}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Function
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  🌾 GovtSchemes.in Scraper');
  console.log('  📅 ' + new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  
  // Fetch from multiple categories
  const categories = [
    { url: `${BASE_URL}/taxonomies/term/59`, name: 'Agriculture Schemes' },
    { url: `${BASE_URL}/taxonomies/term/111`, name: 'Farmer Schemes' },
  ];
  
  let allSchemeLinks = [];
  
  for (const category of categories) {
    const schemes = await fetchSchemeList(category.url, category.name);
    allSchemeLinks = allSchemeLinks.concat(schemes);
    await sleep(2000);
  }
  
  // Remove duplicates
  const uniqueLinks = [];
  const seen = new Set();
  for (const link of allSchemeLinks) {
    if (!seen.has(link.url)) {
      seen.add(link.url);
      uniqueLinks.push(link);
    }
  }
  
  // Filter for Maharashtra schemes only
  const maharashtraSchemes = uniqueLinks.filter(s => s.isMaharashtra);
  
  console.log('');
  console.log(`📊 Total unique schemes found: ${uniqueLinks.length}`);
  console.log(`📍 Maharashtra schemes: ${maharashtraSchemes.length}`);
  console.log('');
  
  // Fetch details for Maharashtra schemes (limit to 10)
  const schemesToFetch = maharashtraSchemes.slice(0, 10);
  console.log(`🔄 Fetching details for ${schemesToFetch.length} Maharashtra schemes...`);
  console.log('');
  
  const schemes = [];
  for (let i = 0; i < schemesToFetch.length; i++) {
    const link = schemesToFetch[i];
    console.log(`  [${i + 1}/${schemesToFetch.length}] ${link.title}`);
    
    const scheme = await fetchSchemeDetails(link.url, link.title);
    if (scheme) {
      schemes.push(scheme);
      console.log(`    ✅ Extracted`);
    }
    
    // Wait between requests
    if (i < schemesToFetch.length - 1) {
      await sleep(2000);
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  ✅ Successfully scraped ${schemes.length} Maharashtra schemes`);
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
