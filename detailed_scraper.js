#!/usr/bin/env node

/**
 * Detailed Scheme Scraper with Full Content Extraction
 * Extracts complete information from scheme pages
 */

const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,mr;q=0.8',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════
// Extract Detailed Scheme Information
// ═══════════════════════════════════════════════════════════════════════════

async function extractDetailedSchemeInfo(url, title) {
  try {
    console.log(`  📄 Fetching: ${title}`);
    
    const response = await axios.get(url, { 
      headers: HEADERS, 
      timeout: 30000 
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove unwanted elements
    $('script, style, nav, header, footer, .menu, .sidebar, .advertisement, .ad').remove();
    
    const scheme = {
      id: `detailed-${title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase().substring(0, 50)}`,
      titleEn: title,
      titleMr: title,
      titleHi: title,
      descriptionEn: '',
      descriptionMr: '',
      descriptionHi: '',
      fullContentEn: '',
      fullContentMr: '',
      imageUrl: null,
      documentUrl: null,
      websiteUrl: url,
      category: 'सबसिडी',
      eligibility: [],
      benefits: [],
      documents: [],
      applicationProcess: '',
      howToApply: '',
      importantDates: [],
      contactInfo: '',
      deadline: null,
      isActive: true,
      source: 'govtschemes.in',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Extract main content area
    const article = $('article').first();
    const mainContent = article.length > 0 ? article : $('.content, .main-content, .scheme-details').first();
    
    // ═══════════════════════════════════════════════════════════════════════
    // 1. Extract Description / Introduction
    // ═══════════════════════════════════════════════════════════════════════
    
    const introHeadings = mainContent.find('h2, h3').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('introduction') || 
             text.includes('overview') || 
             text.includes('about') ||
             text.includes('scheme introduction');
    });
    
    if (introHeadings.length > 0) {
      const introSection = introHeadings.first();
      let description = '';
      
      // Get all paragraphs after the heading until next heading
      introSection.nextAll().each((i, el) => {
        if ($(el).is('h2, h3')) return false; // Stop at next heading
        if ($(el).is('p')) {
          const text = $(el).text().trim();
          if (text.length > 20) {
            description += text + '\n\n';
          }
        }
      });
      
      scheme.descriptionEn = description.trim();
      scheme.descriptionMr = description.trim();
      scheme.descriptionHi = description.trim();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 2. Extract Benefits
    // ═══════════════════════════════════════════════════════════════════════
    
    const benefitsHeadings = mainContent.find('h2, h3').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('benefit') || text.includes('advantage') || text.includes('फायदे');
    });
    
    if (benefitsHeadings.length > 0) {
      const benefitsSection = benefitsHeadings.first();
      
      // Try to find list
      const benefitsList = benefitsSection.nextAll('ul, ol').first();
      if (benefitsList.length > 0) {
        benefitsList.find('li').each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 5) {
            scheme.benefits.push(text);
          }
        });
      } else {
        // Get paragraphs
        benefitsSection.nextAll('p').slice(0, 5).each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 10) {
            scheme.benefits.push(text);
          }
        });
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 3. Extract Eligibility
    // ═══════════════════════════════════════════════════════════════════════
    
    const eligibilityHeadings = mainContent.find('h2, h3').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('eligibility') || text.includes('पात्रता') || text.includes('who can apply');
    });
    
    if (eligibilityHeadings.length > 0) {
      const eligibilitySection = eligibilityHeadings.first();
      
      // Try to find list
      const eligibilityList = eligibilitySection.nextAll('ul, ol').first();
      if (eligibilityList.length > 0) {
        eligibilityList.find('li').each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 5) {
            scheme.eligibility.push(text);
          }
        });
      } else {
        // Get paragraphs
        eligibilitySection.nextAll('p').slice(0, 5).each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 10) {
            scheme.eligibility.push(text);
          }
        });
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 4. Extract Required Documents
    // ═══════════════════════════════════════════════════════════════════════
    
    const documentsHeadings = mainContent.find('h2, h3').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('document') || 
             text.includes('कागदपत्र') || 
             text.includes('required') ||
             text.includes('papers needed');
    });
    
    if (documentsHeadings.length > 0) {
      const documentsSection = documentsHeadings.first();
      
      // Try to find list
      const documentsList = documentsSection.nextAll('ul, ol').first();
      if (documentsList.length > 0) {
        documentsList.find('li').each((i, el) => {
          const text = $(el).text().trim();
          if (text && text.length > 3) {
            scheme.documents.push(text);
          }
        });
      } else {
        // Get paragraphs
        documentsSection.nextAll('p').slice(0, 5).each((i, el) => {
          const text = $(el).text().trim();
          if (text.length > 5) {
            scheme.documents.push(text);
          }
        });
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 5. Extract Application Process / How to Apply
    // ═══════════════════════════════════════════════════════════════════════
    
    const applyHeadings = mainContent.find('h2, h3').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('how to apply') || 
             text.includes('application') || 
             text.includes('apply online') ||
             text.includes('अर्ज कसा करायचा');
    });
    
    if (applyHeadings.length > 0) {
      const applySection = applyHeadings.first();
      let processText = '';
      
      // Get all content after heading
      applySection.nextAll().each((i, el) => {
        if ($(el).is('h2, h3')) return false; // Stop at next heading
        
        if ($(el).is('p')) {
          processText += $(el).text().trim() + '\n\n';
        } else if ($(el).is('ol, ul')) {
          $(el).find('li').each((j, li) => {
            processText += `${j + 1}. ${$(li).text().trim()}\n`;
          });
          processText += '\n';
        }
      });
      
      scheme.applicationProcess = processText.trim();
      scheme.howToApply = processText.trim();
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 6. Extract Important Dates
    // ═══════════════════════════════════════════════════════════════════════
    
    const datesHeadings = mainContent.find('h2, h3').filter((i, el) => {
      const text = $(el).text().toLowerCase();
      return text.includes('important date') || 
             text.includes('deadline') || 
             text.includes('last date');
    });
    
    if (datesHeadings.length > 0) {
      const datesSection = datesHeadings.first();
      datesSection.nextAll('p, li').slice(0, 5).each((i, el) => {
        const text = $(el).text().trim();
        if (text.length > 5) {
          scheme.importantDates.push(text);
        }
      });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 7. Extract Official Website Links
    // ═══════════════════════════════════════════════════════════════════════
    
    mainContent.find('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().toLowerCase();
      
      if (href && href.startsWith('http') && !href.includes('govtschemes.in')) {
        if (text.includes('official') || text.includes('website') || text.includes('apply') || text.includes('portal')) {
          scheme.websiteUrl = href;
        }
        
        if (text.includes('pdf') || text.includes('guideline') || text.includes('document') || href.includes('.pdf')) {
          scheme.documentUrl = href;
        }
      }
    });
    
    // ═══════════════════════════════════════════════════════════════════════
    // 8. Extract Images
    // ═══════════════════════════════════════════════════════════════════════
    
    const images = mainContent.find('img');
    if (images.length > 0) {
      const firstImg = images.first().attr('src');
      if (firstImg && firstImg.startsWith('http')) {
        scheme.imageUrl = firstImg;
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // 9. Extract Full Content (for reference)
    // ═══════════════════════════════════════════════════════════════════════
    
    const fullText = mainContent.text()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
    
    scheme.fullContentEn = fullText.substring(0, 2000); // Limit to 2000 chars
    
    // ═══════════════════════════════════════════════════════════════════════
    // 10. Determine Category
    // ═══════════════════════════════════════════════════════════════════════
    
    const titleLower = title.toLowerCase();
    const contentLower = fullText.toLowerCase();
    
    if (titleLower.includes('loan') || titleLower.includes('credit') || contentLower.includes('loan')) {
      scheme.category = 'कर्ज';
    } else if (titleLower.includes('insurance') || titleLower.includes('bima') || contentLower.includes('insurance')) {
      scheme.category = 'विमा';
    } else if (titleLower.includes('training') || contentLower.includes('training')) {
      scheme.category = 'प्रशिक्षण';
    } else if (titleLower.includes('machinery') || titleLower.includes('tractor') || titleLower.includes('equipment')) {
      scheme.category = 'उपकरणे';
    } else if (titleLower.includes('electricity') || titleLower.includes('vij') || titleLower.includes('power')) {
      scheme.category = 'वीज';
    } else if (titleLower.includes('irrigation') || titleLower.includes('water') || titleLower.includes('सिंचन')) {
      scheme.category = 'सिंचन';
    } else if (titleLower.includes('pension')) {
      scheme.category = 'इतर';
    }
    
    // Set defaults if empty
    if (scheme.eligibility.length === 0) {
      scheme.eligibility = ['भारतीय नागरिक', 'शेतकरी'];
    }
    
    if (scheme.benefits.length === 0) {
      scheme.benefits = ['सरकारी योजना लाभ'];
    }
    
    if (scheme.documents.length === 0) {
      scheme.documents = ['आधार कार्ड', 'बँक खाते तपशील'];
    }
    
    if (!scheme.applicationProcess) {
      scheme.applicationProcess = 'अधिकृत वेबसाइट वर ऑनलाइन अर्ज करा';
    }
    
    console.log(`    ✅ Extracted detailed info`);
    return scheme;
    
  } catch (error) {
    console.error(`    ❌ Error: ${error.message}`);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Test with Sample URL
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n🔍 Testing Detailed Scraper...\n');
  
  const testUrl = 'https://www.govtschemes.in/maharashtra-mukhya-mantri-baliraja-vij-savlat-yojana';
  const testTitle = 'Maharashtra Mukhya Mantri Baliraja Vij Savlat Yojana';
  
  const scheme = await extractDetailedSchemeInfo(testUrl, testTitle);
  
  if (scheme) {
    console.log('\n' + '='.repeat(70));
    console.log('EXTRACTED SCHEME DETAILS:');
    console.log('='.repeat(70));
    console.log(JSON.stringify(scheme, null, 2));
  }
}

if (require.main === module) {
  main();
}

module.exports = { extractDetailedSchemeInfo };
