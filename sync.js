/**
 * Mandi Rates Sync Script
 * Runs via GitHub Actions (free) or locally: node sync.js
 *
 * Required env vars:
 *   MANDI_API_KEY              — from data.gov.in
 *   FIREBASE_SERVICE_ACCOUNT   — JSON string of Firebase service account key
 */

const admin = require("firebase-admin");
const axios = require("axios");

// ── Init Firebase ─────────────────────────────────────────────
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const API_BASE =
  "https://api.data.gov.in/resource/35985678-0d79-46b4-9ed6-6f13308a1d24";

const MAHARASHTRA_DISTRICTS = [
  "Ahmednagar","Akola","Amravati","Aurangabad","Beed","Bhandara","Buldhana",
  "Chandrapur","Dhule","Gadchiroli","Gondia","Hingoli","Jalgaon","Jalna",
  "Kolhapur","Latur","Mumbai","Nagpur","Nanded","Nandurbar","Nashik",
  "Osmanabad","Palghar","Parbhani","Pune","Raigad","Ratnagiri","Sangli",
  "Satara","Sindhudurg","Solapur","Thane","Wardha","Washim","Yavatmal",
  "Chattrapati Sambhajinagar","Dharashiv"
];

// ── Delete records older than 7 days ─────────────────────────
async function deleteOldRecords() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 10);
  console.log(`🗑️  Deleting records older than ${cutoff.toDateString()}...`);
  let deleted = 0;

  // Run multiple batches until all old records are gone
  while (true) {
    const snap = await db.collection("mandi_rates")
      .where("updatedAt", "<", admin.firestore.Timestamp.fromDate(cutoff))
      .limit(400)
      .get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach(d => { batch.delete(d.ref); deleted++; });
    await batch.commit();
  }
  console.log(`   ✅ Deleted ${deleted} old records.`);
}

// ── Helpers ───────────────────────────────────────────────────
function getDateString(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}-${mm}-${d.getFullYear()}`;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function makeId(commodity, market, date) {
  return `${commodity}_${market}_${date}`
    .replace(/\s+/g, "_")
    .replace(/\//g, "-");
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const apiKey = process.env.MANDI_API_KEY;
  if (!apiKey) {
    console.error("❌ MANDI_API_KEY not set");
    process.exit(1);
  }

  console.log("🌾 Starting Mandi Rates sync (last 3 days)...");
  let totalSaved = 0;

  // Fetch last 5 days — API has 2-3 day lag so this ensures full coverage
  for (let daysAgo = 1; daysAgo <= 5; daysAgo++) {
    const date = getDateString(daysAgo);
    console.log(`\n📅 Fetching ${date}...`);
    let dayTotal = 0;

    for (const district of MAHARASHTRA_DISTRICTS) {
      await sleep(300); // avoid 429 rate limit
      let offset = 0;
      const limit = 500;

      while (true) {
        const url =
          `${API_BASE}?api-key=${apiKey}&format=json` +
          `&filters[State]=Maharashtra` +
          `&filters[District]=${encodeURIComponent(district)}` +
          `&filters[Arrival_Date]=${date}` +
          `&limit=${limit}&offset=${offset}`;

        const response = await axios.get(url, { timeout: 20000 });
        const data = response.data;
        const records = data?.records ?? [];
        const apiTotal = parseInt(data?.total ?? 0);

        if (records.length === 0) break;

        // Firestore batch write (max 500)
        const batch = db.batch();
        for (const r of records) {
          const commodity  = r.Commodity || "";
          const market     = r.Market    || "";
          const dist       = r.District  || "";
          const variety    = r.Variety   || "";
          const arrDate    = r.Arrival_Date || "";
          const minPrice   = parseFloat(r.Min_Price    || 0);
          const maxPrice   = parseFloat(r.Max_Price    || 0);
          const avgPrice   = parseFloat(r.Modal_Price  || 0);
          const arrivalQtl = parseFloat(r.Arrivals_in_Qtl || 0);

          if (!commodity || !market) continue;

          const id = makeId(commodity, market, arrDate);
          batch.set(
            db.collection("mandi_rates").doc(id),
            { commodity, market, district: dist, variety,
              minPrice, maxPrice, avgPrice, arrivalQtl,
              date: arrDate,
              updatedAt: admin.firestore.FieldValue.serverTimestamp() },
            { merge: true }
          );
          dayTotal++;
          totalSaved++;
        }
        await batch.commit();

        offset += limit;
        if (offset >= apiTotal) break;
      }
    }

    console.log(`  ✅ ${date}: ${dayTotal} records`);
  }

  // Delete old records (older than 7 days)
  await deleteOldRecords();

  // Write sync metadata
  await db.collection("mandi_meta").doc("last_sync").set({
    syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    totalRecords: totalSaved,
  });

  console.log(`\n✅ Done! Total: ${totalSaved} records saved to Firestore`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Error:", e.message);
  process.exit(1);
});
