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

// APMC Name → District mapping (complete)
const APMC_NAME_TO_DISTRICT = {
  // Ahmednagar
  "अकोले":"Ahmednagar","अहमदनगर":"Ahmednagar","अहिल्यानगर":"Ahmednagar",
  "आळेफाटा":"Pune","कर्जत (अहमहदनगर)":"Ahmednagar","कर्जत- (मिरजगाव)":"Ahmednagar",
  "कोपरगाव":"Ahmednagar","नेवासा":"Ahmednagar","पारनेर":"Ahmednagar",
  "पाथर्डी":"Ahmednagar","राहता":"Ahmednagar","राहुरी":"Ahmednagar",
  "राहूरी":"Ahmednagar","राहूरी -वांबोरी":"Ahmednagar","संगमनेर":"Ahmednagar",
  "श्रीगोंदा":"Ahmednagar","श्रीरामपूर":"Ahmednagar","शेवगाव":"Ahmednagar",
  // Akola
  "अकोला":"Akola","बाळापूर":"Akola","मुर्तीजापूर":"Akola","पातूर":"Akola",
  // Amravati
  "अचलपूर":"Amravati","अजनगाव सुर्जी":"Amravati","अमरावती":"Amravati","मोर्शी":"Amravati",
  // Aurangabad
  "औरंगाबाद":"Aurangabad","छत्रपती संभाजीनगर":"Aurangabad","कन्न्ड":"Aurangabad",
  "गंगापूर":"Aurangabad","पैठण":"Aurangabad","सिल्लोड":"Aurangabad",
  "सिल्लोड- भराडी":"Aurangabad","वैजापूर":"Aurangabad","वैजापूर- शिऊर":"Aurangabad",
  "भोकरदन":"Aurangabad","भोकरदन -पिपळगाव रेणू":"Aurangabad",
  // Beed
  "बीड":"Beed","आंबेजोबाई":"Beed","केज":"Beed","गेवराई":"Beed",
  "माजलगाव":"Beed","परळी-वैजनाथ":"Beed","किल्ले धारुर":"Beed",
  "वडवणी":"Beed","आष्टी- कारंजा":"Beed",
  // Bhandara
  "भंडारा":"Bhandara","तुमसर":"Bhandara","पवनी":"Bhandara","लाखणी":"Bhandara",
  // Buldhana
  "बुलढाणा":"Buldhana","खामगाव":"Buldhana","चिखली":"Buldhana",
  "देउळगाव राजा":"Buldhana","लोणार":"Buldhana","मलकापूर":"Buldhana",
  "मेहकर":"Buldhana","शेगाव":"Buldhana",
  // Chandrapur
  "चंद्रपूर":"Chandrapur","भद्रावती":"Chandrapur","चिमुर":"Chandrapur",
  "ब्रम्हपूरी":"Chandrapur","मुल":"Chandrapur","नागभिड":"Chandrapur",
  "राजूरा":"Chandrapur","सावली":"Chandrapur","सिंदेवाही":"Chandrapur",
  "वरोरा":"Chandrapur","वरोरा-खांबाडा":"Chandrapur","वरोरा-माढेली":"Chandrapur",
  "वरोरा-शेगाव":"Chandrapur","चार्मोशी":"Chandrapur",
  // Dhule
  "धुळे":"Dhule","दोंडाईचा":"Dhule","दोंडाईचा - सिंदखेड":"Dhule","साक्री":"Dhule","शिरपूर":"Dhule",
  // Gadchiroli
  "गडचिरोली":"Gadchiroli","आरमेरी -देसाइगंज":"Gadchiroli","आरमोरी":"Gadchiroli","गोंडपिंपरी":"Gadchiroli",
  // Gondia
  "गोंदिया":"Gondia","तिरोडा":"Gondia",
  // Hingoli
  "हिंगोली":"Hingoli","कळमनुरी":"Hingoli","सेनगाव":"Hingoli","बसमत (कुरुंडा)":"Hingoli",
  // Jalgaon
  "जळगाव":"Jalgaon","अमळनेर":"Jalgaon","चाळीसगाव":"Jalgaon","चोपडा":"Jalgaon",
  "पाचोरा":"Jalgaon","पाचोरा- भदगाव":"Jalgaon","पारोळा":"Jalgaon",
  "भुसावळ":"Jalgaon","यावल":"Jalgaon","रावेर":"Jalgaon",
  // Jalna
  "जालना":"Jalna","बदनापूर":"Jalna","मंठा":"Jalna","परतूर":"Jalna","जाफराबाद":"Jalna",
  // Kolhapur
  "कोल्हापूर":"Kolhapur","गडहिंग्लज":"Kolhapur",
  // Latur
  "लातूर":"Latur","अहमहपूर":"Latur","औराद शहाजानी":"Latur","औसा":"Latur",
  "चाकूर":"Latur","देवणी":"Latur","निलंगा":"Latur","उदगीर":"Latur",
  // Mumbai / Thane / Palghar / Raigad
  "मुंबई":"Mumbai","कल्याण":"Thane","भिवंडी":"Thane","मुरबाड":"Thane",
  "उल्हासनगर":"Thane","पालघर (बेवूर)":"Palghar","वसई":"Palghar",
  "अलिबाग":"Raigad","कर्जत (रायगड)":"Raigad","मुरुड":"Raigad",
  "पनवेल":"Raigad","पेण":"Raigad","रोहा":"Raigad","मानगाव (भादव)":"Raigad",
  // Nagpur
  "नागपूर":"Nagpur","भिवापूर":"Nagpur","काटोल":"Nagpur","कामठी":"Nagpur",
  "कळमेश्वर":"Nagpur","नरखेड":"Nagpur","पारशिवनी":"Nagpur","रामटेक":"Nagpur",
  "सावनेर":"Nagpur","हिंगणा":"Nagpur","मांढळ":"Nagpur","उमरेड":"Nagpur",
  // Nanded
  "नांदेड":"Nanded","भोकर":"Nanded","हादगाव":"Nanded","हादगाव-तामसा":"Nanded",
  "हिमायतनगर":"Nanded","लोहा":"Nanded","मुखेड":"Nanded","मुदखेड":"Nanded",
  "धर्माबाद":"Nanded",
  // Nandurbar
  "नंदुरबार":"Nandurbar","नंदूरबार":"Nandurbar","अक्कलकुआ":"Nandurbar",
  "नवापूर":"Nandurbar","शहादा":"Nandurbar","तळोदा":"Nandurbar","दुधणी":"Nandurbar",
  // Nashik
  "नाशिक":"Nashik","चांदवड":"Nashik","देवळा":"Nashik","दिंडोरी":"Nashik",
  "दिंडोरी-वणी":"Nashik","घोटी":"Nashik","कळवण":"Nashik","मालेगाव":"Nashik",
  "मनमाड":"Nashik","नांदगाव":"Nashik","नामपूर":"Nashik","नामपूर- करंजाड":"Nashik",
  "सटाणा":"Nashik","सिन्नर":"Nashik","येवला":"Nashik","येवला -आंदरसूल":"Nashik",
  "लासलगाव":"Nashik","लासूर स्टेशन":"Nashik","पिंपळगाव बसवंत":"Nashik",
  "पिंपळगाव(ब) - औरंगपूर भेंडाळी":"Nashik","पिंपळगाव(ब) - पालखेड":"Nashik",
  "पिंपळगाव(ब) - सायखेडा":"Nashik",
  // Osmanabad / Dharashiv
  "उस्मानाबाद":"Osmanabad","धाराशिव":"Osmanabad","कळंब (धाराशिव)":"Osmanabad",
  "परांडा":"Osmanabad","तुळजापूर":"Osmanabad","उमराणे":"Osmanabad",
  // Parbhani
  "परभणी":"Parbhani","गंगाखेड":"Parbhani","जिंतूर":"Parbhani","मानवत":"Parbhani",
  "पोम्भुर्नी":"Parbhani","सेलु":"Parbhani",
  // Pune
  "पुणे":"Pune","बारामती":"Pune","दौंड-केडगाव":"Pune","दौंड-पाटस":"Pune",
  "दौंड-यवत":"Pune","इंदापूर":"Pune","जुन्नर":"Pune","खेड-चाकण":"Pune",
  "मंचर":"Pune","मंचर- वणी":"Pune","शिरुर":"Pune","वडगाव पेठ":"Pune",
  "भोर":"Pune","आळेफाटा":"Pune",
  // Ratnagiri
  "रत्नागिरी":"Ratnagiri",
  // Sangli
  "सांगली":"Sangli","आटपाडी":"Sangli","इस्लामपूर":"Sangli","तासगाव":"Sangli",
  "पलूस":"Sangli","विटा":"Sangli",
  // Satara
  "सातारा":"Satara","कऱ्हाड":"Satara","पाटन":"Satara","वाई":"Satara",
  "वडूज":"Satara","फलटण":"Satara","लोणंद":"Satara",
  // Solapur
  "सोलापूर":"Solapur","अकलुज":"Solapur","बार्शी":"Solapur",
  "बार्शी -वैराग":"Solapur","करमाळा":"Solapur","कुर्डवाडी":"Solapur",
  "कुर्डवाडी-मोडनिंब":"Solapur","मंगळवेढा":"Solapur","मोहोळ":"Solapur",
  "पंढरपूर":"Solapur","सांगोला":"Solapur","ताडकळस":"Solapur",
  // Wardha
  "वर्धा":"Wardha","आर्वी":"Wardha","हिंगणघाट":"Wardha","पुलगाव":"Wardha",
  "समुद्रपूर":"Wardha","सिंदी":"Wardha",
  // Washim
  "वाशीम":"Washim","कारंजा":"Washim","मंगरुळपीर":"Washim","मानोरा":"Washim","रिसोड":"Washim",
  // Yavatmal
  "यवतमाळ":"Yavatmal","दिग्रस":"Yavatmal","घाटंजी":"Yavatmal",
  "मारेगाव":"Yavatmal","राळेगाव":"Yavatmal","उमरखेड":"Yavatmal",
  "वणी":"Yavatmal","वरूड-राजूरा बझार":"Amravati",
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
  const allRecordsForJson = [];

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
      // Collect for JSON
      allRecordsForJson.push(...records.map(r => ({
        c: r.commodity, cMr: r.commodityMr, v: r.variety,
        m: nameEn, mMr: `${nameMr} कृ.उ.बा.स.`, d: district,
        mn: r.minPrice, mx: r.maxPrice, av: r.avgPrice,
        ar: r.arrivalQtl, dt: r.date,
      })));
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

  // Generate JSON file for GitHub Pages (0 Firestore reads for users)
  const today = new Date().toISOString().split("T")[0];
  const jsonData = {
    date:        today,
    totalRecords: total,
    generatedAt: new Date().toISOString(),
    records:     allRecordsForJson,
  };
  require("fs").writeFileSync("mandi_latest.json", JSON.stringify(jsonData), { encoding: "utf8" });
  console.log(`\n📄 mandi_latest.json generated (${total} records)`);

  // Delete records older than 8 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 8);
  console.log(`\n🗑️  Deleting records older than ${cutoff.toDateString()}...`);
  let deleted = 0;
  while (true) {
    const snap = await db.collection("mandi_rates")
      .where("updatedAt", "<", admin.firestore.Timestamp.fromDate(cutoff))
      .limit(400).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => { batch.delete(d.ref); deleted++; });
    await batch.commit();
  }
  console.log(`   ✅ Deleted ${deleted} old records.`);

  // Clear district/market cache so app rebuilds it fresh
  await db.collection("mandi_meta").doc("districts").delete();
  await db.collection("mandi_meta").doc("markets").delete();

  console.log(`\n✅ Done! Total: ${total} records`);
  process.exit(0);
}

main().catch(e => { console.error("❌", e.message); process.exit(1); });
