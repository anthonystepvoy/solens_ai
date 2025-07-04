// File: backend/js_scrapers/discover_wallets_top_1hr.js
// --- DISCOVER WALLETS FROM TOP 1HR TOKENS ---

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { MongoClient } from "mongodb";
import {
  fetchDetailedWalletStats,
  fetchWalletActivity,
  calculateWalletEnrichmentFields,
  passesWalletQualityFilters,
  calculateTokenQualityScore,
  filterTopQualityTokens
} from "./gmgn_coins_traders.js";
import dotenv from 'dotenv';
// Load environment variables - try multiple paths for different deployment scenarios
const envPaths = ['../.env', './.env', '.env'];
for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    break;
  } catch (error) {
    // Continue to next path
  }
}

puppeteer.use(StealthPlugin());

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
let db;

async function main() {
  const scriptStart = Date.now();
  console.log("--- DISCOVERING WALLETS FROM TOP 1HR TOKENS ---");

  try {
    await client.connect();
    db = client.db("solens_ai");
    console.log("✓ Connected to MongoDB");

    // 1. Get the LATEST 20 tokens from the hourly_rank_snapshots collection.
    const tokensToProcess = await db.collection("hourly_rank_snapshots")
      .find({})
      .sort({ retrieved_at: -1 })
      .limit(20)
      .toArray();

    if (tokensToProcess.length === 0) {
      console.log("✓ No tokens found in the hourly_rank_snapshots collection. Exiting.");
      return;
    }

    // 2. Filter for top quality tokens only
    const topQualityTokens = filterTopQualityTokens(tokensToProcess, 20);

    const browser = await puppeteer.launch({ 
      headless: true, 
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-site-isolation-trials"
      ] 
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Establish domain context
    await page.goto("https://gmgn.ai", { waitUntil: "domcontentloaded", timeout: 30000 });

    for (const coin of topQualityTokens) {
      const coinAddress = coin.address;
      console.log(`\n--- Processing 1HR Token: ${coin.symbol || coinAddress.slice(0, 6)} (Score: ${coin.quality_score}/100) ---`);
      try {
        const topTradersUrl = `https://gmgn.ai/defi/quotation/v1/tokens/top_traders/sol/${coinAddress}?orderby=profit&direction=desc`;
        const tradesData = await page.evaluate(async (url) => {
          const response = await fetch(url, { headers: { "accept": "application/json" } });
          if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
          return response.json();
        }, topTradersUrl);

        if (tradesData.code === 0 && tradesData.data) {
          const topTraders = tradesData.data.filter(t => t.realized_profit > 0.05).slice(0, 15);
          for (const trader of topTraders) {
            const walletAddress = trader.address;
            // PRE-WALLET CHECK: Skip if wallet already exists
            const existingWallet = await db.collection("wallets").findOne({ _id: walletAddress });
            if (existingWallet) continue;
            // Fetch detailed wallet stats
            const detailedStats = await fetchDetailedWalletStats(page, walletAddress);
            // Fetch wallet activity for enrichment
            const activities = await fetchWalletActivity(page, walletAddress);
            // Calculate enrichment fields
            const enrichmentFields = calculateWalletEnrichmentFields(activities);
            // Apply quality filters
            const qualityCheck = passesWalletQualityFilters(detailedStats, enrichmentFields, trader);
            if (!qualityCheck.passes) continue;
            // Calculate copy trading score
            const winRateScore = qualityCheck.metrics.winrate7d * 40;
            const profitPerTradeScore = Math.min((trader.realized_profit / (trader.txs_30d || 1)) / 1000 * 30, 30);
            const tradeCountScore = Math.min((trader.txs_30d || 0) / 50 * 20, 20);
            const copyTradingScore = Math.round(winRateScore + profitPerTradeScore + tradeCountScore);
            const walletData = {
              gmgn_data: {
                wallet_address: trader.address,
                token_address: coinAddress,
                profit: trader.realized_profit,
                profit_change: trader.profit_change,
                timestamp: trader.created_at,
                source_token_quality_score: coin.quality_score,
                source_token_symbol: coin.symbol,
                source_token_liquidity: coin.liquidity,
                source_token_market_cap: coin.market_cap,
                copy_trading_score: copyTradingScore,
                enriched_winrate_7d: qualityCheck.metrics.winrate7d,
                enriched_pnl_7d: qualityCheck.metrics.pnl7d
              },
              unique_tokens_bought_7d: enrichmentFields.uniqueTokensBought7d,
              avg_buy_usd_7d: enrichmentFields.avgBuyUsd7d,
              updated_at: new Date()
            };
            if (detailedStats) {
              walletData.gmgn_detailed_stats = detailedStats;
            }
            await db.collection("wallets").updateOne(
              { _id: trader.address },
              { 
                $set: walletData, 
                $setOnInsert: { created_at: new Date() },
                $addToSet: { discovered_by: 'Top_1HR_Token_Discovery' } 
              },
              { upsert: true }
            );
            console.log(`    [SAVED] ${trader.address.slice(0, 8)}: Score ${copyTradingScore}`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } catch (error) {
        console.error(`✗ Error processing traders for token ${coinAddress}: ${error.message}`);
      }
    }
    await browser.close();
    console.log("--- 1HR WALLET DISCOVERY COMPLETE ---");
  } catch (error) {
    console.error("✗ A fatal error occurred in the 1hr discovery:", error);
  } finally {
    await client.close();
    console.log("--- 1HR DISCOVERY SCRIPT FINISHED ---");
  }
}

main().catch(console.error); 