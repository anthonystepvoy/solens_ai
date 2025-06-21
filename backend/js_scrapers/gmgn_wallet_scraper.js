import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import admin from "firebase-admin";

puppeteer.use(StealthPlugin());

// Firebase Admin SDK initialization
if (!admin.apps.length) {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountPath) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY env variable not set");
  }
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const db = admin.firestore();

async function scrapeWallets() {
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
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  try {
    console.log("Fetching wallet data...");
    
    // First visit the main page to get cookies
    await page.goto("https://gmgn.ai", { waitUntil: "domcontentloaded", timeout: 30000 });
    
    // Now fetch the wallet data using the page's fetch
    const data = await page.evaluate(async () => {
      const response = await fetch(
        "https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/7d?orderby=pnl_7d&direction=desc&device_id=c639da51-3f8d-47a3-b191-1b4092c52001&client_id=gmgn_web_20250613-2194-6838f94&from_app=gmgn&app_ver=20250613-2194-6838f94&tz_name=America%2FMontevideo&tz_offset=-10800&app_lang=en-US&fp_did=unknown&os=web",
        {
          headers: {
            "accept": "application/json",
            "accept-language": "en-US,en;q=0.9",
            "sec-ch-ua": "\"Google Chrome\";v=\"137\", \"Chromium\";v=\"137\", \";Not A Brand\";v=\"99\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
          }
        }
      );
      return response.json();
    });
    
    if (data.code === 0 && data.data && data.data.rank) {
      // Filter wallets based on copy trading criteria
      const profitableWallets = data.data.rank
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

      // Firestore integration: upsert each wallet
      const batch = db.batch();
      for (const wallet of rankedWallets) {
        const walletRef = db.collection('wallets').doc(wallet.wallet_address);
        const data = {
          gmgn_data: { ...wallet },
          updated_at: admin.firestore.Timestamp.now(),
          discovered_by: admin.firestore.FieldValue.arrayUnion('GMGN_Wallet_Scraper')
        };
        batch.set(walletRef, data, { merge: true });
      }
      await batch.commit();
      console.log(`Sent ${rankedWallets.length} wallets to Firestore (wallets collection).`);
      
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
    } else {
      console.error("Failed to get wallet data:", data);
    }

  } catch (error) {
    console.error("Error during scraping:", error);
  } finally {
    await browser.close();
  }
}

scrapeWallets().catch((err) => console.error("Unexpected error:", err)); 