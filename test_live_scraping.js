#!/usr/bin/env node

/**
 * Test Live Scraping
 * Quick test to verify schemes are being scraped from websites
 */

const { fetchFromMyScheme, fetchFromMahaDBT } = require('./schemes_scraper');

async function test() {
  console.log('🧪 Testing Live Scraping...\n');

  try {
    // Test MyScheme
    console.log('Testing MyScheme.gov.in...');
    const mySchemeResults = await fetchFromMyScheme();
    console.log(`✅ MyScheme: ${mySchemeResults.length} schemes\n`);

    // Test MahaDBT
    console.log('Testing MahaDBT...');
    const mahaDBTResults = await fetchFromMahaDBT();
    console.log(`✅ MahaDBT: ${mahaDBTResults.length} schemes\n`);

    // Show sample
    if (mySchemeResults.length > 0) {
      console.log('Sample scheme from MyScheme:');
      console.log(JSON.stringify(mySchemeResults[0], null, 2));
    } else if (mahaDBTResults.length > 0) {
      console.log('Sample scheme from MahaDBT:');
      console.log(JSON.stringify(mahaDBTResults[0], null, 2));
    }

    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
