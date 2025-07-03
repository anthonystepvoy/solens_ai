import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { MongoClient } from "mongodb";
import { exec } from "child_process";
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: './.env' });

puppeteer.use(StealthPlugin());

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);

const MODES = {
  minute: {
    url: "https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/1m?orderby=open_timestamp&direction=desc&limit=20&filters[]=renounced&filters[]=frozen&platforms[]=pump&platforms[]=pumpamm&platforms[]=moonshot&platforms[]=raydium&platforms[]=meteora&platforms[]=fluxbeam&platforms[]=orca&platforms[]=ray_launchpad&platforms[]=boop",
    collection: "minute_rank_snapshots",
    source_list: "latest_1m_rank",
    chain_script: null
  },
  hour: {
    url: "https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/1h?orderby=open_timestamp&direction=desc&limit=20&filters[]=renounced&filters[]=frozen&platforms[]=pump&platforms[]=pumpamm&platforms[]=moonshot&platforms[]=raydium&platforms[]=meteora&platforms[]=fluxbeam&platforms[]=orca&platforms[]=ray_launchpad&platforms[]=boop",
    collection: "hourly_rank_snapshots",
    source_list: "latest_1h_rank",
    chain_script: "discover_wallets_top_1hr.js"
  },
  day: {
    url: "https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/24h?orderby=open_timestamp&direction=desc&limit=20&filters[]=renounced&filters[]=frozen&platforms[]=pump&platforms[]=pumpamm&platforms[]=moonshot&platforms[]=raydium&platforms[]=meteora&platforms[]=fluxbeam&platforms[]=orca&platforms[]=ray_launchpad&platforms[]=boop",
    collection: "daily_rank_snapshots",
    source_list: "latest_24h_rank",
    chain_script: "discover_wallets_top_24hr.js"
  }
};

async function fetchRank(mode) {
  if (!MODES[mode]) {
    console.error(`Invalid mode: ${mode}. Use one of: minute, hour, day.`);
    process.exit(1);
  }
  const { url, collection, source_list, chain_script } = MODES[mode];
  const scriptStart = Date.now();
  console.log(`[${new Date().toISOString()}] Running ${mode} Rank Fetch...`);
  console.log(`Fetching from: ${url}`);

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
    }, url);
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
          source_list,
          retrieved_at: new Date()
        }));

        const result = await db.collection(collection).insertMany(documentsToInsert);
        console.log(`[TIMER] MongoDB insertMany: ${(Date.now() - mongoStart) / 1000}s`);
        console.log(`\u2713 Inserted ${result.insertedCount} new tokens into ${collection}.`);
        
        console.log("First 3 tokens inserted:");
        documentsToInsert.slice(0, 3).forEach((token, i) => {
          console.log(`  ${i+1}. ${token.symbol || 'Unknown'} (${token.address.slice(0, 8)}...)`);
        });

        // --- CHAINED: Run wallet discovery for hour/day ---
        if (chain_script) {
          const scriptPath = path.resolve(__dirname, chain_script);
          console.log(`[CHAIN] Running ${scriptPath} script...`);
          exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
            if (error) {
              console.error(`[CHAIN] Error running wallet discovery: ${error.message}`);
              return;
            }
            if (stdout) console.log(`[CHAIN] Wallet discovery output:\n${stdout}`);
            if (stderr) console.error(`[CHAIN] Wallet discovery errors:\n${stderr}`);
          });
        }
      } else {
        console.log(`\u2713 ${mode} rank API returned 0 tokens. No data inserted.`);
      }
    } else {
      console.error("\u2717 API response format unexpected:", rankData);
    }
  } catch (error) {
    console.error(`\u2717 Error in fetch_rank.js [${mode}]:`, error.message);
    console.error("Full error:", error);
  } finally {
    await browser.close();
    await client.close();
    console.log(`[TIMER] Total script time: ${(Date.now() - scriptStart) / 1000}s`);
  }
}

const mode = process.argv[2];
fetchRank(mode).catch(console.error); 