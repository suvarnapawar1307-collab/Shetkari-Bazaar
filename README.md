# Mandi Rates Cloud Function Setup

## What this does
- Fetches Maharashtra mandi rates from data.gov.in API every day at 8 AM IST
- Saves to Firestore `mandi_rates/` collection
- App reads from Firestore (fast, offline-capable)

## Setup Steps

### 1. Get API Key
1. Go to https://data.gov.in/user/register
2. Register and verify email
3. Go to https://data.gov.in/user/me
4. Copy your API key

### 2. Set API Key in Firebase
```bash
cd shetkari_bazaar
firebase functions:config:set mandi.api_key="YOUR_API_KEY_HERE"
```

### 3. Deploy Function
```bash
firebase deploy --only functions
```

### 4. Test Manually (First Time)
After deploy, trigger the HTTP function once to populate initial data:
```bash
curl https://us-central1-shetkari-bazzar.cloudfunctions.net/syncMandiRatesHttp
```

Or open in browser:
```
https://us-central1-shetkari-bazzar.cloudfunctions.net/syncMandiRatesHttp
```

## How it works

**Scheduled Function** (`syncMandiRates`):
- Runs every day at 8:00 AM IST (cron: `30 2 * * *` UTC)
- Fetches all Maharashtra records from API
- Upserts to Firestore using unique ID: `{commodity}_{market}_{date}`
- Writes metadata to `mandi_meta/last_sync` with timestamp

**HTTP Function** (`syncMandiRatesHttp`):
- Manual trigger for testing or force-refresh
- Same logic as scheduled function
- Returns JSON: `{ success: true, recordsSaved: 1234 }`

## Firestore Structure

```
mandi_rates/
  ├─ Onion_Pune_2024-04-19/
  │    ├─ commodity: "Onion"
  │    ├─ market: "Pune"
  │    ├─ district: "Pune"
  │    ├─ minPrice: 800
  │    ├─ maxPrice: 1200
  │    ├─ avgPrice: 1000
  │    ├─ date: "2024-04-19"
  │    └─ updatedAt: Timestamp
  └─ ...

mandi_meta/
  └─ last_sync/
       ├─ syncedAt: Timestamp
       └─ totalRecords: 1234
```

## Troubleshooting

**"API key not configured"**
→ Run: `firebase functions:config:set mandi.api_key="YOUR_KEY"`

**Function timeout**
→ Increase timeout in `index.js`: `timeoutSeconds: 540` (9 min max)

**No data in app**
→ Trigger HTTP function manually first to populate initial data

## Cost Estimate
- Cloud Function runs: ~30 seconds/day
- Firestore writes: ~500-2000 docs/day
- **Free tier covers this easily** (2M invocations/month, 20K writes/day free)
