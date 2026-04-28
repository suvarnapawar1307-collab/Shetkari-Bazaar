/**
 * Mandi Rates Scraper — krushikranti.com (Agmarknet daily data)
 * Run locally: node scraper.js
 * GitHub Actions: uses FIREBASE_SERVICE_ACCOUNT secret
 */

const admin   = require("firebase-admin");
const axios   = require("axios");
const cheerio = require("cheerio");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const BASE  = "https://www.krushikranti.com/bajarbhav";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const DISTRICTS = [
  { slug: "ahilyanagar-bajar-bhav-today",  en: "Ahmednagar" },
  { slug: "pune-bajar-bhav-today",         en: "Pune" },
  { slug: "nashik-bajar-bhav-today",       en: "Nashik" },
  { slug: "nagpur-bajar-bhav-today",       en: "Nagpur" },
  { slug: "solapur-bajar-bhav-today",      en: "Solapur" },
  { slug: "kolhapur-bajar-bhav-today",     en: "Kolhapur" },
  { slug: "aurangabad-bajar-bhav-today",   en: "Aurangabad" },
  { slug: "latur-bajar-bhav-today",        en: "Latur" },
  { slug: "jalgaon-bajar-bhav-today",      en: "Jalgaon" },
  { slug: "sangli-bajar-bhav-today",       en: "Sangli" },
  { slug: "satara-bajar-bhav-today",       en: "Satara" },
  { slug: "akola-bajar-bhav-today",        en: "Akola" },
  { slug: "amravati-bajar-bhav-today",     en: "Amravati" },
  { slug: "wardha-bajar-bhav-today",       en: "Wardha" },
  { slug: "nanded-bajar-bhav-today",       en: "Nanded" },
  { slug: "beed-bajar-bhav-today",         en: "Beed" },
  { slug: "buldhana-bajar-bhav-today",     en: "Buldhana" },
  { slug: "chandrapur-bajar-bhav-today",   en: "Chandrapur" },
  { slug: "yavatmal-bajar-bhav-today",     en: "Yavatmal" },
  { slug: "osmanabad-bajar-bhav-today",    en: "Osmanabad" },
];

const MR_TO_EN = {
  "कांदा":"Onion","टोमॅटो":"Tomato","बटाटा":"Potato","गहू":"Wheat",
  "सोयाबिन":"Soyabean","मका":"Maize","ज्वारी":"Jowar(Sorghum)",
  "बाजरी":"Bajra(Pearl Millet/Cumbu)","तांदूळ":"Rice","लसूण":"Garlic",
  "आले":"Ginger(Green)","मिरची (हिरवी)":"Green Chilli",
  "ढोवळी मिरची":"Chilly Capsicum","वांगी":"Brinjal","कोबी":"Cabbage",
  "फ्लॉवर":"Cauliflower","भेडी":"Bhindi(Ladies Finger)",
  "कारली":"Bitter gourd","दुधी भोपळा":"Bottle gourd",
  "काकडी":"Cucumbar(Kheera)","गाजर":"Carrot",
  "कोथिंबिर":"Coriander(Leaves)","पालक":"Spinach",
  "मेथी भाजी":"Methi(Leaves)","बीट":"Beetroot",
  "दोडका (शिराळी)":"Ridgeguard(Tori)","कलिंगड":"Water Melon",
  "टरबूज":"Water Melon","खरबुज":"Karbuja(Musk Melon)",
  "पपई":"Papaya","आंबा":"Mango","केळी":"Banana",
  "द्राक्ष":"Grapes","डाळींब":"Pomegranate","सफरचंद":"Apple",
  "मोसंबी":"Mousambi(Sweet Lime)","लिंबू":"Lemon","अननस":"Pineapple",
  "हरभरा":"Bengal Gram(Gram)(Whole)","तूर":"Arhar(Tur/Red Gram)(Whole)",
  "मूग":"Moong(Green Gram)(Whole)","उडीद":"Urad(Black Gram)(Whole)",
  "गवार":"Guar","कापूस":"Cotton","हळद":"Turmeric",
  "शेवगा":"Drumstick","भोपळा":"Pumpkin","संत्री":"Mousambi(Sweet Lime)",
};

function mrToEn(mr) {
  if (MR_TO_EN[mr]) return MR_TO_EN[mr];
  for (const [k, v] of Object.entries(MR_TO_EN)) {
    if (mr.startsWith(k)) return v;
  }
  return mr;
}

function makeId(commodity, market, date) {
  return `${commodity}_${market}_${date}`
    .replace(/\s+/g,"_").replace(/\//g,"-").replace(/[()]/g,"");
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

    if (cells.length === 1 && /^\d{2}\/\d{2}\/\d{4}$/.test(cells[0])) {
      if (!latestDate) { latestDate = cells[0]; }
      else { stopCapture = true; }
      return;
    }

    if (!latestDate) return;
    if (cells.some(c => c.includes("एकुण"))) { stopCapture = true; return; }

    if (cells.length >= 7) {
      const minPrice = parseFloat(cells[4]) || 0;
      if (minPrice > 0 && cells[0].length > 1) {
        records.push({
          commodity:   mrToEn(cells[0]),
          commodityMr: cells[0],
          market:      `${districtEn} APMC`,
          district:    districtEn,
          variety:     cells[1] === "---" ? "" : cells[1],
          minPrice,
          maxPrice:    parseFloat(cells[5]) || 0,
          avgPrice:    parseFloat(cells[6]) || 0,
          arrivalQtl:  parseFloat(cells[3]) || 0,
          date:        latestDate,
        });
      }
    }
  });

  return records;
}

async function main() {
  console.log("🌾 Krushikranti scraper starting...\n");
  let total = 0;

  for (const { slug, en } of DISTRICTS) {
    await sleep(1500);
    process.stdout.write(`📍 ${en}... `);
    try {
      const records = await scrapeDistrict(slug, en);
      if (records.length === 0) { console.log("0 records"); continue; }

      // Batch write (max 500 per batch)
      for (let i = 0; i < records.length; i += 400) {
        const batch = db.batch();
        records.slice(i, i + 400).forEach(r => {
          const id = makeId(r.commodity, r.market, r.date);
          batch.set(db.collection("mandi_rates").doc(id), {
            ...r,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          total++;
        });
        await batch.commit();
      }
      console.log(`✅ ${records.length} records (${records[0]?.date})`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }

  await db.collection("mandi_meta").doc("last_sync").set({
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    totalRecords: total,
    source: "krushikranti.com",
  });

  console.log(`\n✅ Done! Total: ${total} records`);
  process.exit(0);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
