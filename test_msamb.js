const axios = require("axios");
const BASE  = "https://msamb.com";
const HEADERS = { "User-Agent": "Mozilla/5.0", "Accept": "*/*", "X-Requested-With": "XMLHttpRequest" };

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

function getDistrict(nameMr) {
  if (!nameMr) return "";
  if (APMC_NAME_TO_DISTRICT[nameMr]) return APMC_NAME_TO_DISTRICT[nameMr];
  for (const [k, v] of Object.entries(APMC_NAME_TO_DISTRICT)) {
    if (nameMr.includes(k) || k.includes(nameMr)) return v;
  }
  return "";
}

async function main() {
  const list = await axios.get(`${BASE}/ApmcDetail/GetApmcForArrivalPriceInfo?_=${Date.now()}`, { headers: HEADERS, timeout: 30000 });
  
  const missing = list.data.filter(a => !getDistrict(a.ApmcNameM));
  console.log(`Total APMCs: ${list.data.length}`);
  console.log(`Missing district: ${missing.length}`);
  console.log("\nAPMCs without district mapping:");
  missing.forEach(a => console.log(`  "${a.ApmcNameM}":"DISTRICT", // code: ${a.ApmcCode}`));
}

main().catch(e => console.error("❌", e.message));
