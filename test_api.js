/**
 * Test script — API call करतो आणि result JSON मध्ये save करतो
 * Firebase connection नाही — फक्त API test
 * Run: node test_api.js
 */

const axios = require("axios");
const fs = require("fs");

const API_KEY = "579b464db66ec23bdd000001e68e388b437e41c567bff940d5603f35";
const API_BASE = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24";

function getDateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

async function main() {
  const allRecords = [];

  // Last 3 days fetch
  for (let daysAgo = 1; daysAgo <= 3; daysAgo++) {
    const date = getDateString(daysAgo);
    let offset = 0;
    const limit = 500;
    let dayCount = 0;
    let apiTotal = 0;

    console.log(`\n📅 Fetching ${date}...`);

    do {
      const url = `${API_BASE}?api-key=${API_KEY}&format=json` +
        `&filters[State]=Maharashtra&filters[Arrival_Date]=${date}` +
        `&limit=${limit}&offset=${offset}`;

      const resp = await axios.get(url, { timeout: 20000 });
      const records = resp.data?.records ?? [];
      apiTotal = parseInt(resp.data?.total ?? 0);

      if (records.length === 0) break;

      allRecords.push(...records);
      dayCount += records.length;
      console.log(`  offset=${offset}: +${records.length} (${dayCount}/${apiTotal})`);
      offset += limit;

    } while (dayCount < apiTotal && offset < 2000); // max 2000 per day for test

    console.log(`  ✅ ${date}: ${dayCount} records`);
  }

  // Save to JSON
  const output = {
    fetchedAt: new Date().toISOString(),
    totalRecords: allRecords.length,
    records: allRecords
  };

  fs.writeFileSync("mandi_data.json", JSON.stringify(output, null, 2));
  console.log(`\n✅ Saved ${allRecords.length} records to mandi_data.json`);

  // Summary by commodity
  const byCommodity = {};
  for (const r of allRecords) {
    const c = r.Commodity || "Unknown";
    byCommodity[c] = (byCommodity[c] || 0) + 1;
  }
  const sorted = Object.entries(byCommodity).sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log("\n📊 Top 20 Commodities:");
  sorted.forEach(([name, count]) => console.log(`  ${name}: ${count} markets`));

  // Summary by district
  const byDistrict = {};
  for (const r of allRecords) {
    const d = r.District || "Unknown";
    byDistrict[d] = (byDistrict[d] || 0) + 1;
  }
  const distSorted = Object.entries(byDistrict).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log("\n🗺️ Top 15 Districts:");
  distSorted.forEach(([name, count]) => console.log(`  ${name}: ${count} records`));
}

main().catch(e => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
