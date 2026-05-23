#!/usr/bin/env node

/**
 * Test script to explore govtschemes.in structure
 */

const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

async function testURL(url, description) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${description}`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(70));
  
  try {
    const response = await axios.get(url, { headers: HEADERS, timeout: 30000 });
    const $ = cheerio.load(response.data);
    
    // Remove scripts and styles
    $('script, style').remove();
    
    console.log('\n📋 Page Title:');
    console.log($('title').text().trim());
    
    console.log('\n📋 Main Headings (h1, h2):');
    $('h1, h2').each((i, el) => {
      const text = $(el).text().trim();
      if (text && i < 5) {
        console.log(`  ${i + 1}. ${text}`);
      }
    });
    
    console.log('\n🔗 Scheme Links Found:');
    let linkCount = 0;
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      
      if (href && text && text.length > 10 && linkCount < 10) {
        // Check if it looks like a scheme link
        if (href.includes('scheme') || href.includes('yojana') || 
            text.toLowerCase().includes('scheme') || text.toLowerCase().includes('yojana') ||
            text.toLowerCase().includes('योजना')) {
          linkCount++;
          console.log(`  ${linkCount}. ${text}`);
          console.log(`     URL: ${href}`);
        }
      }
    });
    
    console.log(`\n✅ Total scheme-like links found: ${linkCount}`);
    
    // Check for pagination
    console.log('\n📄 Pagination:');
    const paginationLinks = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href && (text.match(/^\d+$/) || text.toLowerCase().includes('next') || text.toLowerCase().includes('page'))) {
        paginationLinks.push({ text, href });
      }
    });
    
    if (paginationLinks.length > 0) {
      console.log('  Pagination found:');
      paginationLinks.slice(0, 5).forEach(link => {
        console.log(`    ${link.text}: ${link.href}`);
      });
    } else {
      console.log('  No pagination found');
    }
    
    // Check for article/scheme containers
    console.log('\n📦 Content Structure:');
    const containers = [
      '.view-content', '.views-row', 'article', '.scheme-item', 
      '.node', '.content', '.item-list'
    ];
    
    containers.forEach(selector => {
      const count = $(selector).length;
      if (count > 0) {
        console.log(`  ${selector}: ${count} elements`);
      }
    });
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('\n🔍 Exploring govtschemes.in structure...\n');
  
  // Test the three URLs provided
  await testURL(
    'https://www.govtschemes.in/taxonomies/term/59',
    'Maharashtra Schemes (term/59)'
  );
  
  await new Promise(r => setTimeout(r, 2000));
  
  await testURL(
    'https://www.govtschemes.in/taxonomies/term/111',
    'Agriculture Schemes (term/111)'
  );
  
  await new Promise(r => setTimeout(r, 2000));
  
  await testURL(
    'https://www.govtschemes.in/maharashtra-namo-shetkari-maha-samman-nidhi-yojana',
    'Sample Scheme Detail Page'
  );
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Exploration complete!');
  console.log('='.repeat(70) + '\n');
}

main();
