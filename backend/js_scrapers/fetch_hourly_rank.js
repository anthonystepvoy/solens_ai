import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { MongoClient } from "mongodb";
import { exec } from "child_process";
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

puppeteer.use(StealthPlugin());

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);

async function fetchLatestHourlyRank() {
  const scriptStart = Date.now();
  console.log(`[${new Date().toISOString()}] Running 1-Hour Rank Fetch...`);
  const oneHourRankUrl = "https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/1h?orderby=open_timestamp&direction=desc&limit=20&filters[]=renounced&filters[]=frozen&platforms[]=pump&platforms[]=pumpamm&platforms[]=moonshot&platforms[]=raydium&platforms[]=meteora&platforms[]=fluxbeam&platforms[]=orca&platforms[]=ray_launchpad&platforms[]=boop";
  
  console.log(`Fetching from: ${oneHourRankUrl}`);
  
  const browserStart = Date.now();
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    timeout: 30000
  });
  const page = await browser.newPage();
  console.log(`[TIMER] Puppeteer launch: ${(Date.now() - browserStart) / 1000}s`);

  try {
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    const navStart = Date.now();
    console.log("Navigating to gmgn.ai main site...");
    await page.goto("https://gmgn.ai", { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log(`[TIMER] Navigation to gmgn.ai: ${(Date.now() - navStart) / 1000}s`);
    
    console.log("Main site loaded, now fetching API data...");
    const apiStart = Date.now();
    const rankData = await page.evaluate(async (url) => {
      const response = await fetch(url, { headers: { "accept": "application/json" } });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return response.json();
    }, oneHourRankUrl);
    console.log(`[TIMER] API fetch: ${(Date.now() - apiStart) / 1000}s`);

    console.log("API response received, processing data...");

    if (rankData.code === 0 && rankData.data && rankData.data.rank) {
      const latestTokens = rankData.data.rank;
      console.log(`\u2713 API returned ${latestTokens.length} tokens`);
      
      if (latestTokens.length > 0) {
        const mongoStart = Date.now();
        await client.connect();
        const db = client.db("solens_ai");

        const documentsToInsert = latestTokens.map(token => ({
          ...token,
          source_list: "latest_1h_rank",
          retrieved_at: new Date()
        }));

        const result = await db.collection("hourly_rank_snapshots").insertMany(documentsToInsert);
        console.log(`[TIMER] MongoDB insertMany: ${(Date.now() - mongoStart) / 1000}s`);
        console.log(`\u2713 Inserted ${result.insertedCount} new tokens into hourly_rank_snapshots.`);
        
        console.log("First 3 tokens inserted:");
        documentsToInsert.slice(0, 3).forEach((token, i) => {
          console.log(`  ${i+1}. ${token.symbol || 'Unknown'} (${token.address.slice(0, 8)}...)`);
        });

        // --- CHAINED: Run wallet discovery for 1hr tokens ---
        console.log("[CHAIN] Running 1hr wallet discovery script...");
        exec('node backend/js_scrapers/discover_wallets_top_1hr.js', (error, stdout, stderr) => {
          if (error) {
            console.error(`[CHAIN] Error running wallet discovery: ${error.message}`);
            return;
          }
          if (stdout) console.log(`[CHAIN] Wallet discovery output:\n${stdout}`);
          if (stderr) console.error(`[CHAIN] Wallet discovery errors:\n${stderr}`);
        });
      } else {
        console.log("\u2713 1-hour rank API returned 0 tokens. No data inserted.");
      }
    } else {
      console.error("\u2717 API response format unexpected:", rankData);
    }
  } catch (error) {
    console.error("\u2717 Error in fetch_hourly_rank.js:", error.message);
    console.error("Full error:", error);
  } finally {
    await browser.close();
    await client.close();
    console.log(`[TIMER] Total script time: ${(Date.now() - scriptStart) / 1000}s`);
  }
}

fetchLatestHourlyRank().catch(console.error); 