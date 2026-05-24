#!/usr/bin/env node

/**
 * Test MyScheme API to see all available fields
 */

const axios = require('axios');

async function testMySchemeAPI() {
  console.log('🔍 Testing MyScheme API...\n');
  
  try {
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
      size: '1' // Fetch only 1 scheme to see structure
    });

    const response = await axios.get(`${apiUrl}?${params}`, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'origin': 'https://www.myscheme.gov.in',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-api-key': 'tYTy5eEhlu9rFjyxuCr7ra7ACp4dv1RH8gWuHTDc'
      },
      timeout: 30000,
    });

    if (response.data && response.data.data && response.data.data.hits && response.data.data.hits.items) {
      const items = response.data.data.hits.items;
      
      if (items.length > 0) {
        const firstScheme = items[0];
        
        console.log('📋 First Scheme Structure:\n');
        console.log('Top-level keys:', Object.keys(firstScheme));
        console.log('\n📦 Fields object keys:', Object.keys(firstScheme.fields || {}));
        console.log('\n📄 Full scheme data:\n');
        console.log(JSON.stringify(firstScheme, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testMySchemeAPI();
