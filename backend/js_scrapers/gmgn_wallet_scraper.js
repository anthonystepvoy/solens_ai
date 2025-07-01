import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import { MongoClient } from "mongodb";

puppeteer.use(StealthPlugin());

// MongoDB Atlas connection
const MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
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
      // Filter wallets based on copy trading criteria
      const profitableWallets = initialData.data.rank
        .filter(wallet => {
          const minNonZeroProfitDays = 2;
          const minTokens7d = 1;
          const maxAvgPnlPerTrade = 500; // 500% per trade
          const dailyProfit = wallet.daily_profit_7d || [];
          const nonZeroProfitDays = dailyProfit.filter(day => day.profit && day.profit !== 0).length;
          const avgPnlPerTrade = wallet.pnl_7d && wallet.txs_30d ? wallet.pnl_7d / wallet.txs_30d : 0;
          return (
            wallet.realized_profit > 0 &&
            wallet.pnl_7d > 0 &&
            nonZeroProfitDays >= minNonZeroProfitDays &&
            (wallet.token_num_7d || 0) >= minTokens7d &&
            wallet.winrate_7d >= 0.7 &&
            wallet.risk.token_honeypot_ratio === 0 &&
            wallet.risk.fast_tx_ratio < 0.3 &&
            avgPnlPerTrade <= maxAvgPnlPerTrade
          );
        })
        .sort((a, b) => {
          // Primary sort by win rate
          if (b.winrate_7d !== a.winrate_7d) {
            return b.winrate_7d - a.winrate_7d;
          }
          // Secondary sort by average profit per trade
          const aAvgProfit = a.realized_profit / a.txs_30d;
          const bAvgProfit = b.realized_profit / b.txs_30d;
          if (bAvgProfit !== aAvgProfit) {
            return bAvgProfit - aAvgProfit;
          }
          // Tertiary sort by number of trades (more trades = more reliable)
          return b.txs_30d - a.txs_30d;
        });

      // Add rank and copy trading score to each wallet
      const rankedWallets = profitableWallets.map((wallet, index) => {
        // Calculate copy trading score (0-100)
        const winRateScore = wallet.winrate_7d * 40; // 40% weight
        const profitPerTradeScore = Math.min((wallet.realized_profit / wallet.txs_30d) / 1000 * 30, 30); // 30% weight, capped at 30
        const tradeCountScore = Math.min(wallet.txs_30d / 50 * 20, 20); // 20% weight, capped at 20
        const riskScore = (1 - wallet.risk.fast_tx_ratio) * 10; // 10% weight

        const copyTradingScore = Math.round(winRateScore + profitPerTradeScore + tradeCountScore + riskScore);

        return {
          rank: index + 1,
          copy_trading_score: copyTradingScore,
          ...wallet
        };
      });

      // Replace Firestore upserts with MongoDB upserts for wallets
      for (const wallet of rankedWallets) {
        const walletData = {
          gmgn_data: { ...wallet },
          updated_at: new Date(),
          discovered_by: ['GMGN_Wallet_Scraper']
        };
        await db.collection("wallets").updateOne(
          { _id: wallet.wallet_address },
          { $set: walletData },
          { upsert: true }
        );
      }
      console.log(`Sent ${rankedWallets.length} wallets to MongoDB (wallets collection).`);
      
      // Print top 5 wallets for quick review
      console.log("\nTop 5 Wallets for Copy Trading:");
      rankedWallets.slice(0, 5).forEach(wallet => {
        const avgPnlPerTrade = wallet.pnl_7d && wallet.txs_30d ? (wallet.pnl_7d / wallet.txs_30d) : 0;
        const dailyProfit = wallet.daily_profit_7d || [];
        const nonZeroProfitDays = dailyProfit.filter(day => day.profit && day.profit !== 0).length;
        console.log(`\nRank ${wallet.rank} (Score: ${wallet.copy_trading_score}/100):`);
        console.log(`Address: ${wallet.wallet_address}`);
        console.log(`Win Rate: ${(wallet.winrate_7d * 100).toFixed(2)}%`);
        console.log(`Total Trades: ${wallet.txs_30d}`);
        console.log(`Avg Profit per Trade: $${(wallet.realized_profit / wallet.txs_30d).toFixed(2)}`);
        console.log(`Avg PNL% per Trade (7d): ${avgPnlPerTrade.toFixed(2)}%`);
        console.log(`Non-zero profit days (7d): ${nonZeroProfitDays}`);
        console.log(`Tokens traded in 7d: ${wallet.token_num_7d || 0}`);
        console.log(`Total Profit: $${wallet.realized_profit.toFixed(2)}`);
        console.log(`7d PNL: ${wallet.pnl_7d.toFixed(2)}%`);
        console.log(`Risk Metrics:`);
        console.log(`  - Honeypot Ratio: ${wallet.risk.token_honeypot_ratio * 100}%`);
        console.log(`  - Fast Trade Ratio: ${wallet.risk.fast_tx_ratio * 100}%`);
        console.log(`  - No Buy Hold Ratio: ${wallet.risk.no_buy_hold_ratio * 100}%`);
      });

      // Loop through each promising wallet to get detailed stats
      for (const wallet of profitableWallets) {
        const walletAddress = wallet.wallet_address;
        const detailedStatsUrl = `https://gmgn.ai/api/v1/wallet_stat/sol/${walletAddress}/7d?device_id=b4e58a50-81f0-4ffb-850e-f433598a8c51&client_id=gmgn_web_20250628-487-0a3c13b&from_app=gmgn&app_ver=20250628-487-0a3c13b&tz_name=America%2FMontevideo&tz_offset=-10800&app_lang=en-US&fp_did=535415de390d0e8ab5b33b8fd73b2830&os=web&period=7d`;

        try {
          const detailedData = await page.evaluate(async (url) => {
            const response = await fetch(url, { headers: { "accept": "application/json" } });
            return response.json();
          }, detailedStatsUrl);

          let walletToSave = {
            gmgn_data: { ...wallet }, // Save the original summary data
            updated_at: new Date(),
            discovered_by: ['GMGN_Wallet_Scraper']
          };

          if (detailedData && detailedData.code === 0) {
            console.log(`✓ Successfully fetched details for wallet ${walletAddress.slice(0, 6)}...`);
            // Add the new detailed stats to our wallet object
            walletToSave.gmgn_detailed_stats = detailedData.data;
          }

          // --- NEW: Fetch wallet activity and calculate avg SOL per buy trade ---
          let avgSolPerBuy7d = null;
          try {
            const activityUrl = `https://gmgn.ai/vas/api/v1/wallet_activity/sol?type=buy&type=sell&device_id=b4e58a50-81f0-4ffb-850e-f433598a8c51&client_id=gmgn_web_20250701-623-affa2c7&from_app=gmgn&app_ver=20250701-623-affa2c7&tz_name=America%2FMontevideo&tz_offset=-10800&app_lang=en-US&fp_did=535415de390d0e8ab5b33b8fd73b2830&os=web&wallet=${walletAddress}&limit=50&cost=10`;
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
              const buyTrades = activityData.data.activities.filter(trade => trade.event_type === 'buy');
              const solAmounts = buyTrades.map(trade => parseFloat(trade.quote_amount || '0')).filter(x => !isNaN(x));
              if (solAmounts.length > 0) {
                const totalSol = solAmounts.reduce((a, b) => a + b, 0);
                avgSolPerBuy7d = totalSol / solAmounts.length;
              }
            }
          } catch (err) {
            console.error(`[WARN] Could not fetch/calculate avg SOL per buy for ${walletAddress}:`, err.message);
          }
          if (avgSolPerBuy7d !== null) {
            walletToSave.avg_sol_per_buy_7d = avgSolPerBuy7d;
          }
          // --- END NEW ---

          // Upsert the combined data into MongoDB
          await db.collection("wallets").updateOne(
            { _id: walletAddress },
            { $set: walletToSave },
            { upsert: true }
          );

        } catch (e) {
          console.error(`Error fetching detailed stats for ${walletAddress}:`, e.message);
        }
        await new Promise(resolve => setTimeout(resolve, 300)); // Short delay
      }
      console.log(`Processing complete. All wallet data has been updated in MongoDB.`);

    } else {
      console.error("Failed to get initial wallet data:", initialData);
    }

  } catch (error) {
    console.error("Error during scraping:", error);
  } finally {
    await browser.close();
    console.log("=== GMGN Wallet Scraper: Finished ===");
  }
}

scrapeWallets().catch((err) => console.error("Unexpected error:", err)); 