/**
 * MSAMB Scraper — msamb.com (284 Maharashtra APMCs, daily data)
 * Run: node msamb_scraper.js
 */

const admin = require("firebase-admin");
const axios = require("axios");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const BASE  = "https://msamb.com";
const sleep = ms => new Promise(r => setTimeout(r, ms));

const HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "Accept": "*/*",
  "X-Requested-With": "XMLHttpRequest",
  "Referer": `${BASE}/ApmcDetail/APMCPriceInformation`,
};

const MR_TO_EN = {
  "कांदा":"Onion","टोमॅटो":"Tomato","बटाटा":"Potato","गहू":"Wheat",
  "सोयाबीन":"Soyabean","सोयाबिन":"Soyabean","मका":"Maize",
  "ज्वारी":"Jowar(Sorghum)","बाजरी":"Bajra(Pearl Millet/Cumbu)",
  "तांदूळ":"Rice","लसूण":"Garlic","आले":"Ginger(Green)",
  "मिरची (हिरवी)":"Green Chilli","मिरची":"Green Chilli",
  "ढोबळी मिरची":"Chilly Capsicum","ढोवळी मिरची":"Chilly Capsicum",
  "वांगी":"Brinjal","कोबी":"Cabbage",
  "फुलकोबी":"Cauliflower","फ्लॉवर":"Cauliflower",
  "भेंडी":"Bhindi(Ladies Finger)","भेडी":"Bhindi(Ladies Finger)",
  "कारले":"Bitter gourd","कारली":"Bitter gourd",
  "दुधी भोपळा":"Bottle gourd","काकडी":"Cucumbar(Kheera)",
  "गाजर":"Carrot","कोथिंबीर":"Coriander(Leaves)","कोथिंबिर":"Coriander(Leaves)",
  "पालक":"Spinach","मेथी":"Methi(Leaves)","मेथी भाजी":"Methi(Leaves)",
  "बीट":"Beetroot","दोडका":"Ridgeguard(Tori)",
  "कलिंगड":"Water Melon","टरबूज":"Water Melon",
  "खरबूज":"Karbuja(Musk Melon)","खरबुज":"Karbuja(Musk Melon)",
  "पपई":"Papaya","आंबा":"Mango","केळी":"Banana",
  "द्राक्षे":"Grapes","द्राक्ष":"Grapes",
  "डाळिंब":"Pomegranate","डाळींब":"Pomegranate",
  "सफरचंद":"Apple","मोसंबी":"Mousambi(Sweet Lime)",
  "लिंबू":"Lemon","अननस":"Pineapple","संत्री":"Mousambi(Sweet Lime)",
  "हरभरा":"Bengal Gram(Gram)(Whole)","तूर":"Arhar(Tur/Red Gram)(Whole)",
  "मूग":"Moong(Green Gram)(Whole)","उडीद":"Urad(Black Gram)(Whole)",
  "कापूस":"Cotton","हळद":"Turmeric","शेवगा":"Drumstick",
  "भोपळा":"Pumpkin","शेंगदाणे":"Groundnut","आवळा":"Amla(Nelli Kai)",
  "चिकू":"Papaya","पेरू":"Papaya",
};

function mrToEn(mr) {
  if (!mr) return mr;
  const c = mr.trim();
  if (MR_TO_EN[c]) return MR_TO_EN[c];
  for (const [k, v] of Object.entries(MR_TO_EN)) {
    if (c.startsWith(k)) return v;
  }
  return c;
}

function makeId(commodity, market, date) {
  return `${commodity}_${market}_${date}`
    .replace(/\s+/g,"_").replace(/\//g,"-").replace(/[()]/g,"");
}

function parseHtml(html) {
  const records = [];
  let latestDate = null;
  const trMatches = html.match(/<tr>([\s\S]*?)<\/tr>/g) || [];

  for (const tr of trMatches) {
    const tdMatches = tr.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
    const cells = tdMatches.map(td => td.replace(/<[^>]+>/g,"").trim());
    if (!cells.length) continue;

    if (cells.length === 1 && /^\d{2}\/\d{2}\/\d{4}$/.test(cells[0])) {
      if (!latestDate) latestDate = cells[0];
      else break;
      continue;
    }
    if (!latestDate) continue;
    if (cells.some(c => c.includes("एकुण"))) continue;

    if (cells.length >= 7) {
      const minPrice = parseFloat(cells[4]) || 0;
      if (minPrice > 0 && cells[0].length > 1) {
        records.push({
          commodity:   mrToEn(cells[0]),
          commodityMr: cells[0],
          variety:     (cells[1] === "---" || cells[1] === "----") ? "" : cells[1],
          minPrice,
          maxPrice:    parseFloat(cells[5]) || 0,
          avgPrice:    parseFloat(cells[6]) || 0,
          arrivalQtl:  parseFloat(cells[3]) || 0,
          date:        latestDate,
        });
      }
    }
  }
  return records;
}

async function main() {
  console.log("🌾 MSAMB scraper starting...\n");

  const listResp = await axios.get(
    `${BASE}/ApmcDetail/GetApmcForArrivalPriceInfo?_=${Date.now()}`,
    { timeout: 30000, headers: HEADERS }
  );
  const apmcList = listResp.data;
  console.log(`Found ${apmcList.length} APMCs\n`);

  let total = 0;

  for (const apmc of apmcList) {
    await sleep(300);
    const code   = apmc.ApmcCode;
    const nameMr = apmc.ApmcNameM || `APMC_${code}`;
    const nameEn = `${nameMr} APMC`;

    process.stdout.write(`📍 ${nameMr} (${code})... `);

    try {
      const resp = await axios.get(
        `${BASE}/ApmcDetail/DataGridBind?commodityCode=null&apmcCode=${code}`,
        { timeout: 30000, headers: HEADERS }
      );

      if (!resp.data || resp.data.length < 50) { console.log("no data"); continue; }

      const records = parseHtml(resp.data);
      if (records.length === 0) { console.log("0"); continue; }

      for (let i = 0; i < records.length; i += 400) {
        const batch = db.batch();
        records.slice(i, i + 400).forEach(r => {
          const id = makeId(r.commodity, nameEn, r.date);
          batch.set(db.collection("mandi_rates").doc(id), {
            commodity:   r.commodity,
            commodityMr: r.commodityMr,
            variety:     r.variety,
            market:      nameEn,
            marketMr:    `${nameMr} कृ.उ.बा.स.`,
            district:    "",
            minPrice:    r.minPrice,
            maxPrice:    r.maxPrice,
            avgPrice:    r.avgPrice,
            arrivalQtl:  r.arrivalQtl,
            date:        r.date,
            updatedAt:   admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
          total++;
        });
        await batch.commit();
      }
      console.log(`✅ ${records.length} (${records[0]?.date})`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
  }

  await db.collection("mandi_meta").doc("last_sync").set({
    syncedAt:     admin.firestore.FieldValue.serverTimestamp(),
    totalRecords: total,
    source:       "msamb.com",
  });

  console.log(`\n✅ Done! Total: ${total} records`);
  process.exit(0);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
