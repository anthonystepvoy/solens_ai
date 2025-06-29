import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { MongoClient } from "mongodb";

puppeteer.use(StealthPlugin());

const MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(MONGO_URI);

async function fetchLatestMinuteRank() {
  console.log(`[${new Date().toISOString()}] Running 1-Minute Rank Fetch...`);
  const oneMinuteRankUrl = "https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/1m?orderby=open_timestamp&direction=desc&limit=20&filters[]=renounced&filters[]=frozen&platforms[]=pump&platforms[]=pumpamm&platforms[]=moonshot&platforms[]=raydium&platforms[]=meteora&platforms[]=fluxbeam&platforms[]=orca&platforms[]=ray_launchpad&platforms[]=boop";
  
  console.log(`Fetching from: ${oneMinuteRankUrl}`);
  
  const browser = await puppeteer.launch({ 
    headless: true, 
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    timeout: 30000
  });
  const page = await browser.newPage();

  try {
    // Set page timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    console.log("Navigating to gmgn.ai main site...");
    
    // First navigate to the main site to establish the domain context
    await page.goto("https://gmgn.ai", { waitUntil: "domcontentloaded", timeout: 30000 });
    
    console.log("Main site loaded, now fetching API data...");
    
    // Now use the same working approach as gmgn_coins_traders.js
    const rankData = await page.evaluate(async (url) => {
      const response = await fetch(url, { headers: { "accept": "application/json" } });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return response.json();
    }, oneMinuteRankUrl);

    console.log("API response received, processing data...");

    if (rankData.code === 0 && rankData.data && rankData.data.rank) {
      const latestTokens = rankData.data.rank;
      console.log(`✓ API returned ${latestTokens.length} tokens`);
      
      if (latestTokens.length > 0) {
        await client.connect();
        const db = client.db("solens_ai");

        const documentsToInsert = latestTokens.map(token => ({
          ...token,
          source_list: "latest_1m_rank",
          retrieved_at: new Date()
        }));

        // Using insertMany for efficiency
        const result = await db.collection("minute_rank_snapshots").insertMany(documentsToInsert);
        console.log(`✓ Inserted ${result.insertedCount} new tokens into minute_rank_snapshots.`);
        
        // Show first few tokens for verification
        console.log("First 3 tokens inserted:");
        documentsToInsert.slice(0, 3).forEach((token, i) => {
          console.log(`  ${i+1}. ${token.symbol || 'Unknown'} (${token.address.slice(0, 8)}...)`);
        });
      } else {
        console.log("✓ 1-minute rank API returned 0 tokens. No data inserted.");
      }
    } else {
      console.error("✗ API response format unexpected:", rankData);
    }
  } catch (error) {
    console.error("✗ Error in fetch_minute_rank.js:", error.message);
    console.error("Full error:", error);
  } finally {
    await browser.close();
    await client.close();
  }
}

fetchLatestMinuteRank().catch(console.error); 