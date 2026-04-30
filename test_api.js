/**
 * Test Agmarknet direct scraping
 * Run: node test_api.js
 */

const axios = require("axios");

// Agmarknet state-wise daily price URL
// State code for Maharashtra = 11
// This returns JSON data directly
async function testAgmarknet() {
  console.log("Testing Agmarknet direct endpoints...\n");

  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const yyyy = today.getFullYear();
  const dateStr = `${dd}/${mm}/${yyyy}`;

  // Try 1: Agmarknet JSON endpoint (used by some apps)
  const urls = [
    // State-wise price report
    `https://agmarknet.gov.in/PriceAndArrivals/CommodityWiseReport.aspx?Tx_Commodity=0&Tx_State=MH&Tx_District=0&Tx_Market=0&DateFrom=${dateStr}&DateTo=${dateStr}&Fr_Date=${dateStr}&To_Date=${dateStr}&Tx_Trend=0&Tx_CommodityHead=ALL&Tx_StateHead=Maharashtra&Tx_DistrictHead=ALL&Tx_MarketHead=ALL`,
    // Arrivals page
    `https://agmarknet.gov.in/PriceAndArrivals/arrivals1.aspx`,
  ];

  for (const url of urls) {
    try {
      const r = await axios.get(url, {
        timeout: 15000,
        headers: { "User-Agent": "Mozilla/5.0" }
      });
      console.log(`URL: ${url.substring(0, 80)}...`);
      console.log(`Status: ${r.status}, Size: ${r.data?.length || 0} bytes`);
      // Check if it has price data
      if (r.data?.includes?.("Maharashtra") || r.data?.includes?.("Pune")) {
        console.log("✅ Contains Maharashtra data!");
      }
      console.log();
    } catch (e) {
      console.log(`❌ ${url.substring(0, 60)}: ${e.message}\n`);
    }
  }
}

// Also check if data.gov.in has today's data with State-only filter (no District)
async function testDataGovIn() {
  console.log("\nTesting data.gov.in State-only filter (no District)...");
  const API_KEY = "579b464db66ec23bdd00000143c9863cd86e488f75586e772a1de8bd";
  const BASE = "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24";

  for (let d = 1; d <= 10; d++) {
    const date = new Date();
    date.setDate(date.getDate() - d);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dateStr = `${dd}-${mm}-${date.getFullYear()}`;

    try {
      const url = `${BASE}?api-key=${API_KEY}&format=json&filters[State]=Maharashtra&filters[Arrival_Date]=${dateStr}&limit=1`;
      const r = await axios.get(url, { timeout: 15000 });
      const total = parseInt(r.data?.total ?? 0);
      console.log(`  ${dateStr} → ${total > 0 ? `✅ ${total} records` : "0"}`);
    } catch (e) {
      console.log(`  ${dateStr} → ❌ ${e.message}`);
    }
  }
}

async function main() {
  await testAgmarknet();
  await testDataGovIn();
}

main().catch(e => console.error("❌", e.message));
