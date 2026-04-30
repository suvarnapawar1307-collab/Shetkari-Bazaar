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

// APMC Code → District mapping
const APMC_DISTRICT = {
  // Ahmednagar
  "001":"Ahmednagar","030":"Ahmednagar","031":"Ahmednagar","032":"Ahmednagar",
  "033":"Ahmednagar","034":"Ahmednagar","035":"Ahmednagar","036":"Ahmednagar",
  "037":"Ahmednagar","038":"Ahmednagar","039":"Ahmednagar","040":"Ahmednagar",
  "041":"Ahmednagar","042":"Ahmednagar","043":"Ahmednagar","044":"Ahmednagar",
  // Akola
  "010":"Akola","011":"Akola","012":"Akola","013":"Akola","014":"Akola",
  // Amravati
  "079":"Amravati","080":"Amravati","081":"Amravati","082":"Amravati",
  "083":"Amravati","084":"Amravati","085":"Amravati",
  // Aurangabad / Chhatrapati Sambhajinagar
  "020":"Aurangabad","021":"Aurangabad","022":"Aurangabad","023":"Aurangabad",
  "024":"Aurangabad","025":"Aurangabad",
  // Beed
  "050":"Beed","051":"Beed","052":"Beed","053":"Beed","054":"Beed","055":"Beed",
  // Bhandara
  "060":"Bhandara","061":"Bhandara","062":"Bhandara",
  // Buldhana
  "070":"Buldhana","071":"Buldhana","072":"Buldhana","073":"Buldhana","074":"Buldhana",
  // Chandrapur
  "090":"Chandrapur","091":"Chandrapur","092":"Chandrapur","093":"Chandrapur",
  // Dhule
  "100":"Dhule","101":"Dhule","102":"Dhule",
  // Gadchiroli
  "110":"Gadchiroli","111":"Gadchiroli",
  // Gondia
  "120":"Gondia","121":"Gondia","122":"Gondia",
  // Hingoli
  "130":"Hingoli","131":"Hingoli","132":"Hingoli",
  // Jalgaon
  "140":"Jalgaon","141":"Jalgaon","142":"Jalgaon","143":"Jalgaon","144":"Jalgaon",
  "145":"Jalgaon","146":"Jalgaon",
  // Jalna
  "150":"Jalna","151":"Jalna","152":"Jalna","153":"Jalna",
  // Kolhapur
  "160":"Kolhapur","161":"Kolhapur","162":"Kolhapur","163":"Kolhapur","164":"Kolhapur",
  // Latur
  "170":"Latur","171":"Latur","172":"Latur","173":"Latur","174":"Latur",
  // Mumbai
  "180":"Mumbai","181":"Mumbai",
  // Nagpur
  "190":"Nagpur","191":"Nagpur","192":"Nagpur","193":"Nagpur","194":"Nagpur",
  // Nanded
  "200":"Nanded","201":"Nanded","202":"Nanded","203":"Nanded","204":"Nanded",
  // Nandurbar
  "147":"Nandurbar","210":"Nandurbar","211":"Nandurbar","212":"Nandurbar",
  // Nashik
  "220":"Nashik","221":"Nashik","222":"Nashik","223":"Nashik","224":"Nashik",
  "225":"Nashik","226":"Nashik","227":"Nashik","228":"Nashik","229":"Nashik",
  // Osmanabad / Dharashiv
  "230":"Osmanabad","231":"Osmanabad","232":"Osmanabad","233":"Osmanabad",
  // Palghar
  "240":"Palghar","241":"Palghar","242":"Palghar",
  // Parbhani
  "250":"Parbhani","251":"Parbhani","252":"Parbhani","253":"Parbhani",
  // Pune
  "260":"Pune","261":"Pune","262":"Pune","263":"Pune","264":"Pune",
  "265":"Pune","266":"Pune","267":"Pune","268":"Pune","269":"Pune",
  // Raigad
  "270":"Raigad","271":"Raigad","272":"Raigad","273":"Raigad",
  // Ratnagiri
  "280":"Ratnagiri","281":"Ratnagiri","282":"Ratnagiri",
  // Sangli
  "290":"Sangli","291":"Sangli","292":"Sangli","293":"Sangli","294":"Sangli",
  // Satara
  "300":"Satara","301":"Satara","302":"Satara","303":"Satara","304":"Satara",
  // Sindhudurg
  "310":"Sindhudurg","311":"Sindhudurg",
  // Solapur
  "001":"Solapur", // Akluj is Solapur
  "320":"Solapur","321":"Solapur","322":"Solapur","323":"Solapur","324":"Solapur",
  // Thane
  "330":"Thane","331":"Thane","332":"Thane",
  // Wardha
  "340":"Wardha","341":"Wardha","342":"Wardha","343":"Wardha",
  // Washim
  "350":"Washim","351":"Washim","352":"Washim",
  // Yavatmal
  "360":"Yavatmal","361":"Yavatmal","362":"Yavatmal","363":"Yavatmal","364":"Yavatmal",
};

// Better approach: derive district from APMC Marathi name
const APMC_NAME_TO_DISTRICT = {
  "अकलुज":"Solapur","अकोला":"Akola","अकोले":"Ahmednagar","अक्कलकुआ":"Nandurbar",
  "अचलपूर":"Amravati","अमरावती":"Amravati","अहमदनगर":"Ahmednagar",
  "औरंगाबाद":"Aurangabad","आळेफाटा":"Pune","आर्वी":"Wardha",
  "उमरखेड":"Yavatmal","उस्मानाबाद":"Osmanabad",
  "कऱ्हाड":"Satara","कळवण":"Nashik","कळमनुरी":"Hingoli",
  "कोपरगाव":"Ahmednagar","कोल्हापूर":"Kolhapur",
  "खामगाव":"Buldhana","गडचिरोली":"Gadchiroli","गोंदिया":"Gondia",
  "चंद्रपूर":"Chandrapur","चाळीसगाव":"Jalgaon","जळगाव":"Jalgaon",
  "जालना":"Jalna","जुन्नर":"Pune","धुळे":"Dhule","नंदुरबार":"Nandurbar",
  "नागपूर":"Nagpur","नांदेड":"Nanded","नाशिक":"Nashik","नेवासा":"Ahmednagar",
  "परभणी":"Parbhani","पुणे":"Pune","पेण":"Raigad",
  "बारामती":"Pune","बीड":"Beed","बुलढाणा":"Buldhana","भंडारा":"Bhandara",
  "मालेगाव":"Nashik","मुंबई":"Mumbai","यवतमाळ":"Yavatmal",
  "राहता":"Ahmednagar","राहुरी":"Ahmednagar","लातूर":"Latur",
  "लासलगाव":"Nashik","वर्धा":"Wardha","वाशीम":"Washim","वाई":"Satara",
  "संगमनेर":"Ahmednagar","सांगली":"Sangli","सातारा":"Satara",
  "सिन्नर":"Nashik","सोलापूर":"Solapur","हिंगणघाट":"Wardha",
  "हिंगोली":"Hingoli","श्रीरामपूर":"Ahmednagar","शेवगाव":"Ahmednagar",
};

function getDistrict(apmcCode, apmcNameMr) {
  // Try name-based lookup first (more reliable)
  if (apmcNameMr && APMC_NAME_TO_DISTRICT[apmcNameMr]) {
    return APMC_NAME_TO_DISTRICT[apmcNameMr];
  }
  // Try partial name match
  if (apmcNameMr) {
    for (const [name, dist] of Object.entries(APMC_NAME_TO_DISTRICT)) {
      if (apmcNameMr.includes(name) || name.includes(apmcNameMr)) return dist;
    }
  }
  return "";
}

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
    const district = getDistrict(code, nameMr);

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
            district:    district,
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

  // Clear district/market cache so app rebuilds it fresh
  await db.collection("mandi_meta").doc("districts").delete();
  await db.collection("mandi_meta").doc("markets").delete();

  console.log(`\n✅ Done! Total: ${total} records`);
  process.exit(0);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
