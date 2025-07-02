import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

puppeteer.use(StealthPlugin());

// MongoDB Atlas connection
const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
let db;

async function scrapeWallets() {
  console.log("=== GMGN Wallet Scraper: Starting ===");
  await client.connect();
  console.log("Connected to MongoDB!");
  db = client.db("solens_ai");

  console.log("Launching browser...");
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
  console.log("Browser launched!");

  const page = await browser.newPage();
  
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    console.log("Fetching initial wallet rankings...");
    
    await page.goto("https://gmgn.ai", { waitUntil: "domcontentloaded", timeout: 30000 });
    
    const initialData = await page.evaluate(async () => {
      const response = await fetch(
        "https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/7d?orderby=pnl_7d&direction=desc&device_id=c639da51-3f8d-47a3-b191-1b4092c52001&client_id=gmgn_web_20250613-2194-6838f94&from_app=gmgn&app_ver=20250613-2194-6838f94&tz_name=America%2FMontevideo&tz_offset=-10800&app_lang=en-US&fp_did=unknown&os=web",
        {
          headers: { "accept": "application/json" }
        }
      );
      return response.json();
    });
    
    if (initialData.code === 0 && initialData.data && initialData.data.rank) {
      // Apply MINIMAL initial filtering - only basic safety checks
      const candidateWallets = initialData.data.rank
        .filter(wallet => {
          return (
            wallet.realized_profit > 0 &&
            wallet.pnl_7d > 0 &&
            wallet.risk.token_honeypot_ratio === 0 &&
            wallet.risk.fast_tx_ratio < 0.3
          );
        });

      console.log(`Found ${candidateWallets.length} candidate wallets for detailed analysis...`);

      const qualifiedWallets = [];
      
      // Process each wallet individually with full enrichment and filtering
      for (let i = 0; i < candidateWallets.length; i++) {
        const wallet = candidateWallets[i];
        const walletAddress = wallet.wallet_address;
        
        console.log(`Processing wallet ${i + 1}/${candidateWallets.length}: ${walletAddress.slice(0, 8)}...`);
        
        try {
          // Fetch detailed stats
          const detailedStatsUrl = `https://gmgn.ai/api/v1/wallet_stat/sol/${walletAddress}/7d?device_id=b4e58a50-81f0-4ffb-850e-f433598a8c51&client_id=gmgn_web_20250628-487-0a3c13b&from_app=gmgn&app_ver=20250628-487-0a3c13b&tz_name=America%2FMontevideo&tz_offset=-10800&app_lang=en-US&fp_did=535415de390d0e8ab5b33b8fd73b2830&os=web&period=7d`;

          const detailedData = await page.evaluate(async (url) => {
            const response = await fetch(url, { headers: { "accept": "application/json" } });
            return response.json();
          }, detailedStatsUrl);

          // Fetch activity data for enrichment
          let uniqueTokensBought7d = 0;
          let avgBuyUsd7d = null;
          
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
            // Compute enrichment fields
            const tokensBought = new Set();
            const buyUsdAmounts = [];
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            
            for (const trade of activityData.data.activities) {
              const tradeDate = new Date(trade.timestamp * 1000);
              
              // Only count trades from the last 7 days
              if (tradeDate >= sevenDaysAgo && trade.event_type === 'buy') {
                const tokenAddr = trade.token?.address;
                if (tokenAddr) tokensBought.add(tokenAddr);
                if (trade.cost_usd) buyUsdAmounts.push(Number(trade.cost_usd));
              }
            }
            
            uniqueTokensBought7d = tokensBought.size;
            avgBuyUsd7d = buyUsdAmounts.length > 0 ? (buyUsdAmounts.reduce((a, b) => a + b, 0) / buyUsdAmounts.length) : null;
          }

          // Extract win rate and PNL from detailed data or fallback to initial data
          const winrate7d = detailedData?.data?.winrate_7d ?? detailedData?.data?.winrate ?? wallet.winrate_7d ?? 0;
          const pnl7d = detailedData?.data?.pnl_7d ?? detailedData?.data?.pnl ?? wallet.pnl_7d ?? 0;

          // Apply ALL quality filters here
          const passesAllFilters =
            uniqueTokensBought7d >= 5 &&
            winrate7d >= 0.3 &&
            pnl7d > 0 &&
            avgBuyUsd7d !== null && avgBuyUsd7d >= 30;

          if (!passesAllFilters) {
            console.log(`[SKIP] ${walletAddress.slice(0, 8)}: Failed filters - ` +
              `tokens: ${uniqueTokensBought7d}, winrate: ${(winrate7d * 100).toFixed(1)}%, ` +
              `pnl_7d: ${pnl7d.toFixed(2)}%, avg_buy: $${avgBuyUsd7d?.toFixed(2) || 'N/A'}`);
            continue;
          }

          // Calculate copy trading score
          const winRateScore = winrate7d * 40; // 40% weight
          const profitPerTradeScore = Math.min((wallet.realized_profit / wallet.txs_30d) / 1000 * 30, 30); // 30% weight
          const tradeCountScore = Math.min(wallet.txs_30d / 50 * 20, 20); // 20% weight
          const riskScore = (1 - wallet.risk.fast_tx_ratio) * 10; // 10% weight
          const copyTradingScore = Math.round(winRateScore + profitPerTradeScore + tradeCountScore + riskScore);

          // Create enriched wallet object
          const enrichedWallet = {
            ...wallet,
            rank: qualifiedWallets.length + 1,
            copy_trading_score: copyTradingScore,
            unique_tokens_bought_7d: uniqueTokensBought7d,
            avg_buy_usd_7d: avgBuyUsd7d,
            enriched_winrate_7d: winrate7d,
            enriched_pnl_7d: pnl7d
          };

          qualifiedWallets.push(enrichedWallet);

          // Save to database
          const walletData = {
            gmgn_data: { ...enrichedWallet },
            gmgn_detailed_stats: detailedData?.data || null,
            unique_tokens_bought_7d: uniqueTokensBought7d,
            avg_buy_usd_7d: avgBuyUsd7d,
            updated_at: new Date(),
            discovered_by: ['GMGN_Wallet_Scraper']
          };

          await db.collection("wallets").updateOne(
            { _id: walletAddress },
            { $set: walletData },
            { upsert: true }
          );

          console.log(`[SAVED] ${walletAddress.slice(0, 8)}: Score ${copyTradingScore}, ` +
            `${uniqueTokensBought7d} tokens, ${(winrate7d * 100).toFixed(1)}% winrate, $${avgBuyUsd7d.toFixed(2)} avg buy`);

        } catch (error) {
          console.error(`[ERROR] Processing ${walletAddress}:`, error.message);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Sort qualified wallets by copy trading score
      qualifiedWallets.sort((a, b) => {
        if (b.enriched_winrate_7d !== a.enriched_winrate_7d) {
          return b.enriched_winrate_7d - a.enriched_winrate_7d;
        }
        const aAvgProfit = a.realized_profit / a.txs_30d;
        const bAvgProfit = b.realized_profit / b.txs_30d;
        if (bAvgProfit !== aAvgProfit) {
          return bAvgProfit - aAvgProfit;
        }
        return b.txs_30d - a.txs_30d;
      });

      console.log(`\n=== FINAL RESULTS: ${qualifiedWallets.length} QUALIFIED WALLETS ===`);
      
      // Print top 5 qualified wallets
      qualifiedWallets.slice(0, 5).forEach((wallet, index) => {
        console.log(`\n${index + 1}. ${wallet.wallet_address} (Score: ${wallet.copy_trading_score})`);
        console.log(`   Tokens Bought (7d): ${wallet.unique_tokens_bought_7d}`);
        console.log(`   Win Rate: ${(wallet.enriched_winrate_7d * 100).toFixed(2)}%`);
        console.log(`   PNL (7d): ${wallet.enriched_pnl_7d.toFixed(2)}%`);
        console.log(`   Avg Buy: $${wallet.avg_buy_usd_7d.toFixed(2)}`);
        console.log(`   Total Trades: ${wallet.txs_30d}`);
      });

    } else {
      console.error("Failed to get initial wallet data:", initialData);
    }

  } catch (error) {
    console.error("Error during scraping:", error);
  } finally {
    await browser.close();
    await client.close();
    console.log("=== GMGN Wallet Scraper: Finished ===");
  }
}

// Run the scraper (removed duplicate call)
scrapeWallets().catch((err) => console.error("Unexpected error:", err)); 