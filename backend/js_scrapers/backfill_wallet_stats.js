import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

puppeteer.use(StealthPlugin());

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
let db;

async function backfillMissingStats() {
  await client.connect();
  db = client.db("solens_ai");
  const walletsCollection = db.collection("wallets");

  // Find wallets missing either field
  const query = {
    $or: [
      { unique_tokens_bought_7d: { $exists: false } },
      { avg_buy_usd_7d: { $exists: false } }
    ]
  };
  const walletsToFix = await walletsCollection.find(query).toArray();
  const totalToFix = walletsToFix.length;

  if (totalToFix === 0) {
    console.log("✓ No wallets with missing data found. Your database is up-to-date.");
    await client.close();
    return;
  }

  console.log(`Found ${totalToFix} wallets with missing data. Starting repair process...`);
  let fixedCount = 0;

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  for (let i = 0; i < walletsToFix.length; i++) {
    const wallet = walletsToFix[i];
    const walletAddress = wallet._id;
    if (!walletAddress) continue;
    console.log(`[${i+1}/${totalToFix}] Processing wallet: ${walletAddress.slice(0, 6)}...`);
    try {
      const activityUrl = `https://gmgn.ai/vas/api/v1/wallet_activity/sol?type=buy&type=sell&device_id=b4e58a50-81f0-4ffb-850e-f433598a8c51&client_id=gmgn_web_20250701-623-affa2c7&from_app=gmgn&app_ver=20250701-623-affa2c7&tz_name=America%2FMontevideo&tz_offset=-10800&app_lang=en-US&fp_did=535415de390d0e8ab5b33b8fd73b2830&os=web&wallet=${walletAddress}&limit=200`;
      await page.goto(activityUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      let jsonText = '';
      const preTag = await page.$('pre');
      if (preTag) {
        jsonText = await page.evaluate(el => el.textContent, preTag);
      } else {
        jsonText = await page.evaluate(() => document.body.innerText);
      }
      const activityData = JSON.parse(jsonText);
      if (activityData && activityData.code === 0 && activityData.data && Array.isArray(activityData.data.activities)) {
        const tokensBought = new Set();
        const buyUsdAmounts = [];
        for (const trade of activityData.data.activities) {
          if (trade.event_type === 'buy') {
            const tokenAddr = trade.token?.address;
            if (tokenAddr) tokensBought.add(tokenAddr);
            if (trade.cost_usd) buyUsdAmounts.push(Number(trade.cost_usd));
          }
        }
        const uniqueTokensBought7d = tokensBought.size;
        const avgBuyUsd7d = buyUsdAmounts.length > 0 ? (buyUsdAmounts.reduce((a, b) => a + b, 0) / buyUsdAmounts.length) : 0.0;
        await walletsCollection.updateOne(
          { _id: walletAddress },
          { $set: { unique_tokens_bought_7d: uniqueTokensBought7d, avg_buy_usd_7d: avgBuyUsd7d } }
        );
        console.log(`  ✓ Success! Updated with: ${uniqueTokensBought7d} unique tokens, $${avgBuyUsd7d.toFixed(2)} avg buy.`);
        fixedCount++;
      } else {
        console.log(`  [!] API returned valid response but no data. Skipping.`);
      }
    } catch (e) {
      console.log(`  [!] An unexpected error occurred: ${e.message}`);
      continue;
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  await browser.close();
  await client.close();
  console.log("\n=== Backfill Complete ===");
  console.log(`Successfully repaired ${fixedCount} out of ${totalToFix} wallets.`);
}

backfillMissingStats().catch(err => console.error("Unexpected error:", err)); 