import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { MongoClient } from "mongodb";

puppeteer.use(StealthPlugin());

const MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(MONGO_URI);
let db;

async function enrichAllWallets() {
  await client.connect();
  db = client.db("solens_ai");
  const wallets = await db.collection("wallets").find({}).toArray();
  console.log(`Found ${wallets.length} wallets in database.`);

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-web-security",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-site-isolation-trials"
    ],
    defaultViewport: null,
    ignoreHTTPSErrors: true
  });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  let updated = 0;
  for (const w of wallets) {
    const walletAddress = w._id || w.wallet_address;
    if (!walletAddress) continue;
    const detailedStatsUrl = `https://gmgn.ai/api/v1/wallet_stat/sol/${walletAddress}/7d?device_id=b4e58a50-81f0-4ffb-850e-f433598a8c51&client_id=gmgn_web_20250628-487-0a3c13b&from_app=gmgn&app_ver=20250628-487-0a3c13b&tz_name=America%2FMontevideo&tz_offset=-10800&app_lang=en-US&fp_did=535415de390d0e8ab5b33b8fd73b2830&os=web&period=7d`;
    try {
      await page.goto(detailedStatsUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      const preTag = await page.$('pre');
      let jsonText;
      if (preTag) {
        jsonText = await page.evaluate(el => el.textContent, preTag);
      } else {
        // fallback: try to get body text
        jsonText = await page.evaluate(() => document.body.innerText);
      }
      try {
        const detailedData = JSON.parse(jsonText);
        if (detailedData && detailedData.code === 0 && detailedData.data) {
          await db.collection("wallets").updateOne(
            { _id: walletAddress },
            { $set: { gmgn_detailed_stats: detailedData.data, last_gmgn_enrich: new Date() } },
            { upsert: true }
          );
          updated++;
          console.log(`[OK] Updated ${walletAddress}`);
        } else {
          console.log(`[WARN] No data for ${walletAddress}`);
        }
      } catch (jsonErr) {
        console.log(`[ERR] Non-JSON response for ${walletAddress}:`, (jsonText || '').slice(0, 200));
      }
    } catch (e) {
      console.error(`[ERR] Exception for ${walletAddress}:`, e.message);
    }
    await new Promise(resolve => setTimeout(resolve, 400)); // Delay to avoid rate limiting
  }
  await browser.close();
  console.log(`Enrichment complete. Updated ${updated} wallets.`);
  await client.close();
}

enrichAllWallets().catch(err => console.error("Unexpected error:", err)); 