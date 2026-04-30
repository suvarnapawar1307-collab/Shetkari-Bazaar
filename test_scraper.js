/**
 * Test scraper without Firebase — just check if data is parsed correctly
 * Run: node test_scraper.js
 */

const axios  = require("axios");
const cheerio = require("cheerio");

const BASE = "https://www.krushikranti.com/bajarbhav";

const MR_TO_EN = {
  "कांदा":"Onion","टोमॅटो":"Tomato","बटाटा":"Potato","गहू":"Wheat",
  "सोयाबिन":"Soyabean","मका":"Maize","ज्वारी":"Jowar(Sorghum)",
  "बाजरी":"Bajra(Pearl Millet/Cumbu)","लसूण":"Garlic",
  "आले":"Ginger(Green)","मिरची (हिरवी)":"Green Chilli",
  "वांगी":"Brinjal","कोबी":"Cabbage","फ्लॉवर":"Cauliflower",
  "भेडी":"Bhindi(Ladies Finger)","कारली":"Bitter gourd",
  "दुधी भोपळा":"Bottle gourd","काकडी":"Cucumbar(Kheera)",
  "गाजर":"Carrot","कोथिंबिर":"Coriander(Leaves)","पालक":"Spinach",
  "आंबा":"Mango","केळी":"Banana","द्राक्ष":"Grapes",
  "डाळींब":"Pomegranate","लिंबू":"Lemon","टरबूज":"Water Melon",
  "कलिंगड":"Water Melon","खरबुज":"Karbuja(Musk Melon)",
  "हरभरा":"Bengal Gram(Gram)(Whole)","तूर":"Arhar(Tur/Red Gram)(Whole)",
  "कापूस":"Cotton","हळद":"Turmeric","शेवगा":"Drumstick",
};

function mrToEn(mr) {
  if (MR_TO_EN[mr]) return MR_TO_EN[mr];
  for (const [k, v] of Object.entries(MR_TO_EN)) {
    if (mr.startsWith(k)) return v;
  }
  return mr;
}

async function scrapeDistrict(slug, districtEn) {
  const url = `${BASE}/${slug}`;
  const resp = await axios.get(url, {
    timeout: 30000,
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  const $ = cheerio.load(resp.data);
  const records = [];
  let latestDate = null;
  let stopCapture = false;

  $("table tr").each((_, row) => {
    if (stopCapture) return;
    const cells = $(row).find("td").map((_, td) => $(td).text().trim()).get();
    if (cells.length === 0) return;

    // Date row
    if (cells.length === 1 && /^\d{2}\/\d{2}\/\d{4}$/.test(cells[0])) {
      if (!latestDate) {
        latestDate = cells[0];
      } else {
        stopCapture = true; // second date = stop, only today's data
      }
      return;
    }

    if (!latestDate) return;

    // "एकुण आवक" = end of section
    if (cells.some(c => c.includes("एकुण"))) { stopCapture = true; return; }

    // Data row: commodity, variety, unit, arrival, min, max, modal
    if (cells.length >= 7) {
      const minPrice = parseFloat(cells[4]) || 0;
      if (minPrice > 0 && cells[0].length > 1) {
        records.push({
          commodity: mrToEn(cells[0]),
          commodityMr: cells[0],
          variety: cells[1] === "---" ? "" : cells[1],
          market: `${districtEn} APMC`,
          district: districtEn,
          minPrice,
          maxPrice: parseFloat(cells[5]) || 0,
          avgPrice: parseFloat(cells[6]) || 0,
          arrivalQtl: parseFloat(cells[3]) || 0,
          date: latestDate,
        });
      }
    }
  });

  return records;
}

async function main() {
  console.log("Testing Ahmednagar scrape...\n");
  const records = await scrapeDistrict("ahilyanagar-bajar-bhav-today", "Ahmednagar");
  
  if (records.length === 0) {
    console.log("❌ No records parsed — HTML structure may have changed");
    return;
  }

  console.log(`✅ ${records.length} records found for date: ${records[0]?.date}\n`);
  console.log("Sample records:");
  records.slice(0, 5).forEach(r => {
    console.log(`  ${r.commodityMr} (${r.commodity}) — Min:${r.minPrice} Max:${r.maxPrice} Modal:${r.avgPrice} | आवक:${r.arrivalQtl}`);
  });
}

main().catch(e => console.error("❌", e.message));
