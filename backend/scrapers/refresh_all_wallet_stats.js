// File: backend/scrapers/refresh_all_wallet_stats.js
// --- REFRESH ALL WALLET STATS SCRIPT ---

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { MongoClient } from "mongodb";
import dotenv from 'dotenv';
import {
  fetchDetailedWalletStats,
  fetchWalletActivity,
  calculateWalletEnrichmentFields
} from "./gmgn_coins_traders.js";

// Load environment variables
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
  console.log("--- STARTING WALLET STATS REFRESH FOR ALL WALLETS ---");

  try {
    await client.connect();
    db = client.db("solens_ai");
    console.log("✓ Connected to MongoDB");

    // Get all existing wallets
    const allWallets = await db.collection("wallets").find({}).toArray();
    console.log(`📊 Found ${allWallets.length} wallets to refresh`);

    if (allWallets.length === 0) {
      console.log("No wallets found in database. Exiting.");
      return;
    }

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

    // Set page timeouts
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    // Navigate to establish domain context
    await page.goto("https://gmgn.ai", { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("✓ Domain context established");

    let updatedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allWallets.length; i++) {
      const wallet = allWallets[i];
      const walletAddress = wallet._id || wallet.id;
      if (!walletAddress) continue;
      console.log(`[${i + 1}/${allWallets.length}] Processing ${walletAddress.slice(0, 8)}...`);
      try {
        // Fetch fresh detailed stats
        const detailedStats = await fetchDetailedWalletStats(page, walletAddress);
        // Fetch fresh activity data
        const activities = await fetchWalletActivity(page, walletAddress);
        // Calculate enrichment fields
        const enrichmentFields = calculateWalletEnrichmentFields(activities);
        // Prepare update data
        const updateData = {
          gmgn_detailed_stats: detailedStats,
          unique_tokens_bought_7d: enrichmentFields.uniqueTokensBought7d,
          avg_buy_usd_7d: enrichmentFields.avgBuyUsd7d,
          updated_at: new Date(),
          last_refresh: new Date()
        };
        // Update the wallet in database
        await db.collection("wallets").updateOne(
          { _id: walletAddress },
          { $set: updateData }
        );
        console.log(`  ✅ Updated stats for ${walletAddress.slice(0, 8)}`);
        updatedCount++;
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`  ❌ Error updating ${walletAddress.slice(0, 8)}: ${error.message}`);
        errorCount++;
      }
    }

    await browser.close();
    console.log("\n--- REFRESH COMPLETE ---");
    console.log(`✅ Successfully updated: ${updatedCount} wallets`);
    console.log(`❌ Errors: ${errorCount} wallets`);
    console.log(`📊 Total processed: ${allWallets.length} wallets`);
  } catch (error) {
    console.error('Error in main:', error);
  } finally {
    await client.close();
  }
}

main(); 