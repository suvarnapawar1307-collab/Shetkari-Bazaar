# Mandi Rates Sync — GitHub Actions Setup (FREE)

No Firebase billing needed. Runs free on GitHub Actions.

## Step 1: Get Firebase Service Account Key

1. Go to https://console.firebase.google.com/project/shetkari-bazzar/settings/serviceaccounts/adminsdk
2. Click "Generate new private key"
3. Download the JSON file
4. Copy the entire JSON content

## Step 2: Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions → New secret

Add these two secrets:

| Secret Name | Value |
|---|---|
| `MANDI_API_KEY` | `579b464db66ec23bdd000001e68e388b437e41c567bff940d5603f35` |
| `FIREBASE_SERVICE_ACCOUNT` | *(paste the entire JSON from Step 1)* |

## Step 3: Push to GitHub

```bash
git add .
git commit -m "Add mandi rates sync workflow"
git push
```

## Step 4: Test Manually

Go to GitHub repo → Actions → "Sync Mandi Rates" → Run workflow

## How it works

- Runs automatically every day at 8:00 AM IST
- Fetches all Maharashtra mandi rates from data.gov.in
- Saves to Firestore `mandi_rates/` collection
- App reads from Firestore (fast, offline)
- Completely FREE (GitHub Actions: 2000 min/month free)

## Run Locally (for testing)

```bash
cd shetkari_bazaar/functions

# Set env vars
set MANDI_API_KEY=579b464db66ec23bdd000001e68e388b437e41c567bff940d5603f35
set FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

node sync.js
```
