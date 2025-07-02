// File: backend/js_scrapers/gmgn_coins_traders.js
// --- SMART DISCOVERY ENGINE WITH STRICT QUALITY FILTERING ---

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { MongoClient } from "mongodb";
require('dotenv').config();

puppeteer.use(StealthPlugin());

const MONGO_URI = process.env.MONGO_URI;
const client = new MongoClient(MONGO_URI);
let db;

async function fetchDetailedWalletStats(page, walletAddress) {
    const detailedStatsUrl = `https://gmgn.ai/api/v1/wallet_stat/sol/${walletAddress}/7d?device_id=b4e58a50-81f0-4ffb-850e-f433598a8c51&client_id=gmgn_web_20250628-487-0a3c13b&from_app=gmgn&app_ver=20250628-487-0a3c13b&tz_name=America%2FMontevideo&tz_offset=-10800&app_lang=en-US&fp_did=535415de390d0e8ab5b33b8fd73b2830&os=web&period=7d`;

    try {
        const detailedData = await page.evaluate(async (url) => {
            const response = await fetch(url, { headers: { "accept": "application/json" } });
            return response.json();
        }, detailedStatsUrl);

        if (detailedData && detailedData.code === 0) {
            return detailedData.data;
        }
    } catch (error) {
        console.error(`Error fetching detailed stats for ${walletAddress}:`, error.message);
    }
    return null;
}

async function fetchWalletActivity(page, walletAddress) {
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
            return activityData.data.activities;
        }
    } catch (error) {
        console.error(`Error fetching activity for ${walletAddress}:`, error.message);
    }
    return [];
}

function calculateWalletEnrichmentFields(activities) {
    const tokensBought = new Set();
    const buyUsdAmounts = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    for (const trade of activities) {
        const tradeDate = new Date(trade.timestamp * 1000);
        
        // Only count trades from the last 7 days
        if (tradeDate >= sevenDaysAgo && trade.event_type === 'buy') {
            const tokenAddr = trade.token?.address;
            if (tokenAddr) tokensBought.add(tokenAddr);
            if (trade.cost_usd) buyUsdAmounts.push(Number(trade.cost_usd));
        }
    }
    
    const uniqueTokensBought7d = tokensBought.size;
    const avgBuyUsd7d = buyUsdAmounts.length > 0 ? 
        (buyUsdAmounts.reduce((a, b) => a + b, 0) / buyUsdAmounts.length) : null;
    
    return { uniqueTokensBought7d, avgBuyUsd7d };
}

function passesWalletQualityFilters(detailedStats, enrichmentFields, traderData) {
    const { uniqueTokensBought7d, avgBuyUsd7d } = enrichmentFields;
    
    // Extract win rate and PNL from detailed stats or trader data
    const winrate7d = detailedStats?.winrate_7d ?? detailedStats?.winrate ?? 0;
    const pnl7d = detailedStats?.pnl_7d ?? detailedStats?.pnl ?? 0;
    
    // Apply the same strict filters as the main wallet scraper
    const passesFilters = 
        uniqueTokensBought7d >= 5 &&
        winrate7d >= 0.3 &&
        pnl7d > 0 &&
        avgBuyUsd7d !== null && avgBuyUsd7d >= 30;
    
    return {
        passes: passesFilters,
        metrics: {
            uniqueTokensBought7d,
            winrate7d,
            pnl7d,
            avgBuyUsd7d
        }
    };
}

function calculateTokenQualityScore(token) {
    let score = 0;
    
    // Liquidity score (0-30 points)
    const liquidity = parseFloat(token.liquidity || 0);
    if (liquidity > 50000) score += 30;
    else if (liquidity > 25000) score += 20;
    else if (liquidity > 10000) score += 10;
    
    // Market cap score (0-25 points)
    const marketCap = parseFloat(token.market_cap || 0);
    if (marketCap > 100000) score += 25;
    else if (marketCap > 50000) score += 15;
    else if (marketCap > 25000) score += 10;
    
    // Holder count score (0-20 points)
    const holderCount = parseInt(token.holder_count || 0);
    if (holderCount > 200) score += 20;
    else if (holderCount > 100) score += 15;
    else if (holderCount > 50) score += 10;
    
    // Rug ratio score (0-15 points) - lower is better
    const rugRatio = parseFloat(token.rug_ratio || 1);
    if (rugRatio < 0.2) score += 15;
    else if (rugRatio < 0.4) score += 10;
    else if (rugRatio < 0.6) score += 5;
    
    // Honeypot check (0-10 points)
    if (!token.is_honeypot) score += 10;
    
    return score;
}

function filterTopQualityTokens(tokens, maxTokens = 5) {
    console.log(`🔍 Filtering ${tokens.length} tokens for quality...`);
    
    // Calculate quality scores
    const scoredTokens = tokens.map(token => ({
        ...token,
        quality_score: calculateTokenQualityScore(token)
    }));
    
    // Sort by quality score (highest first)
    scoredTokens.sort((a, b) => b.quality_score - a.quality_score);
    
    // Take top tokens
    const topTokens = scoredTokens.slice(0, maxTokens);
    
    console.log(`✅ Selected top ${topTokens.length} quality tokens:`);
    topTokens.forEach((token, index) => {
        console.log(`  ${index + 1}. ${token.symbol || 'Unknown'} (Score: ${token.quality_score}/100)`);
        console.log(`     Liquidity: $${parseFloat(token.liquidity || 0).toLocaleString()}`);
        console.log(`     Market Cap: $${parseFloat(token.market_cap || 0).toLocaleString()}`);
        console.log(`     Holders: ${parseInt(token.holder_count || 0).toLocaleString()}`);
        console.log(`     Rug Ratio: ${(parseFloat(token.rug_ratio || 0) * 100).toFixed(1)}%`);
    });
    
    return topTokens;
}

async function main() {
    const scriptStart = Date.now();
    console.log("--- STARTING SMART DISCOVERY ENGINE WITH STRICT QUALITY FILTERING ---");
    
    try {
        const mongoStart = Date.now();
        await client.connect();
        db = client.db("solens_ai");
        console.log("✓ Connected to MongoDB");
        console.log(`[TIMER] MongoDB connect: ${(Date.now() - mongoStart) / 1000}s`);

        // 1. Get the LATEST 20 tokens from the 1-minute snapshot collection.
        const fetchTokensStart = Date.now();
        const tokensToProcess = await db.collection("minute_rank_snapshots")
            .find({})
            .sort({ retrieved_at: -1 }) // Get the most recent documents first
            .limit(20) // Limit to the size of a single snapshot
            .toArray();
        console.log(`[TIMER] Fetch tokens from DB: ${(Date.now() - fetchTokensStart) / 1000}s`);

        if (tokensToProcess.length === 0) {
            console.log("✓ No tokens found in the minute_rank_snapshots collection yet. Run the 1-minute fetcher first. Exiting.");
            return;
        }

        console.log(`🔥 Found ${tokensToProcess.length} tokens from the latest snapshot.`);
        
        const filterStart = Date.now();
        // 2. Filter for top quality tokens only
        const topQualityTokens = filterTopQualityTokens(tokensToProcess, 3); // Reduced to 3 for faster processing
        console.log(`[TIMER] Filter top quality tokens: ${(Date.now() - filterStart) / 1000}s`);
        
        const browserStart = Date.now();
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
        console.log(`[TIMER] Puppeteer launch: ${(Date.now() - browserStart) / 1000}s`);
        
        // Set page timeouts
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(30000);

        // First navigate to the main site to establish domain context
        const navStart = Date.now();
        console.log("Establishing domain context by navigating to gmgn.ai...");
        await page.goto("https://gmgn.ai", { waitUntil: "domcontentloaded", timeout: 30000 });
        console.log(`[TIMER] Navigation to gmgn.ai: ${(Date.now() - navStart) / 1000}s`);
        console.log("✓ Domain context established");

        let totalNewWallets = 0;
        let totalDetailedStats = 0;
        let totalWalletsProcessed = 0;
        let totalWalletsFiltered = 0;

        for (const coin of topQualityTokens) {
            const tokenStart = Date.now();
            const coinAddress = coin.address;
            console.log(`\n--- Processing TOP QUALITY Token: ${coin.symbol || coinAddress.slice(0, 6)} (Score: ${coin.quality_score}/100) ---`);
            
            try {
                const topTradersUrl = `https://gmgn.ai/defi/quotation/v1/tokens/top_traders/sol/${coinAddress}?orderby=profit&direction=desc`;
                const tradersApiStart = Date.now();
                const tradesData = await page.evaluate(async (url) => {
                    const response = await fetch(url, { headers: { "accept": "application/json" } });
                    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                    return response.json();
                }, topTradersUrl);
                console.log(`[TIMER] Traders API for ${coin.symbol || coinAddress.slice(0, 6)}: ${(Date.now() - tradersApiStart) / 1000}s`);

                if (tradesData.code === 0 && tradesData.data) {
                    const topTraders = tradesData.data.filter(t => t.realized_profit > 0.05).slice(0, 15); // Reduced to 15 traders per token
                    console.log(`✓ Found ${topTraders.length} profitable traders for ${coin.symbol || "Unknown"}.`);

                    for (const trader of topTraders) {
                        const walletStart = Date.now();
                        const walletAddress = trader.address;
                        totalWalletsProcessed++;
                        
                        // PRE-WALLET CHECK: Skip if wallet already exists
                        const existingWallet = await db.collection("wallets").findOne({ _id: walletAddress });
                        if (existingWallet) {
                            console.log(`[SKIP] Wallet already exists: ${walletAddress.slice(0, 8)}...`);
                            continue;
                        }
                        
                        console.log(`  Processing wallet ${walletAddress.slice(0, 8)}... (${totalWalletsProcessed})`);
                        
                        // Fetch detailed wallet stats
                        const detailedStatsApiStart = Date.now();
                        const detailedStats = await fetchDetailedWalletStats(page, walletAddress);
                        console.log(`    [TIMER] Detailed stats API: ${(Date.now() - detailedStatsApiStart) / 1000}s`);
                        
                        // Fetch wallet activity for enrichment
                        const activityApiStart = Date.now();
                        const activities = await fetchWalletActivity(page, walletAddress);
                        console.log(`    [TIMER] Activity API: ${(Date.now() - activityApiStart) / 1000}s`);
                        
                        // Calculate enrichment fields
                        const enrichmentFields = calculateWalletEnrichmentFields(activities);
                        
                        // Apply quality filters
                        const qualityCheck = passesWalletQualityFilters(detailedStats, enrichmentFields, trader);
                        
                        if (!qualityCheck.passes) {
                            totalWalletsFiltered++;
                            console.log(`    [FILTERED] ${walletAddress.slice(0, 8)}: ` +
                                `tokens: ${qualityCheck.metrics.uniqueTokensBought7d}, ` +
                                `winrate: ${(qualityCheck.metrics.winrate7d * 100).toFixed(1)}%, ` +
                                `pnl_7d: ${qualityCheck.metrics.pnl7d?.toFixed(2) || 'N/A'}%, ` +
                                `avg_buy: $${qualityCheck.metrics.avgBuyUsd7d?.toFixed(2) || 'N/A'}`);
                            continue;
                        }
                        
                        // Calculate copy trading score (same as main scraper)
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

                        // Add detailed stats if available
                        if (detailedStats) {
                            walletData.gmgn_detailed_stats = detailedStats;
                            totalDetailedStats++;
                        }

                        const upsertStart = Date.now();
                        const result = await db.collection("wallets").updateOne(
                            { _id: trader.address },
                            { 
                                $set: walletData, 
                                $setOnInsert: { created_at: new Date() },
                                $addToSet: { discovered_by: 'Smart_Quality_Filtered_Discovery' } 
                            },
                            { upsert: true }
                        );
                        console.log(`    [TIMER] Wallet upsert: ${(Date.now() - upsertStart) / 1000}s`);

                        if (result.upsertedCount > 0) {
                            console.log(`    [SAVED] ${trader.address.slice(0, 8)}: Score ${copyTradingScore}, ` +
                                `${enrichmentFields.uniqueTokensBought7d} tokens, ` +
                                `${(qualityCheck.metrics.winrate7d * 100).toFixed(1)}% winrate, ` +
                                `$${enrichmentFields.avgBuyUsd7d.toFixed(2)} avg buy`);
                            totalNewWallets++;
                        } else {
                            console.log(`    [UPDATED] ${trader.address.slice(0, 8)}`);
                        }

                        // Rate limiting
                        await new Promise(resolve => setTimeout(resolve, 500));
                        console.log(`    [TIMER] Total wallet processing: ${(Date.now() - walletStart) / 1000}s`);
                    }
                }
                console.log(`[TIMER] Total token processing for ${coin.symbol || coinAddress.slice(0, 6)}: ${(Date.now() - tokenStart) / 1000}s`);
            } catch (error) {
                console.error(`✗ Error processing traders for token ${coinAddress}: ${error.message}`);
            }
        }

        await browser.close();
        
        console.log(`\n🎉 SMART DISCOVERY WITH QUALITY FILTERING COMPLETE!`);
        console.log(`📊 Summary:`);
        console.log(`   • Total tokens analyzed: ${tokensToProcess.length}`);
        console.log(`   • High-quality tokens processed: ${topQualityTokens.length}`);
        console.log(`   • Total wallets processed: ${totalWalletsProcessed}`);
        console.log(`   • Wallets filtered out: ${totalWalletsFiltered} (${((totalWalletsFiltered/totalWalletsProcessed)*100).toFixed(1)}%)`);
        console.log(`   • Total new QUALITY wallets discovered: ${totalNewWallets}`);
        console.log(`   • Wallets with detailed stats: ${totalDetailedStats}`);
        console.log(`   • Quality pass rate: ${((totalNewWallets/(totalWalletsProcessed-totalWalletsFiltered))*100).toFixed(1)}%`);
        console.log(`[TIMER] Total script time: ${(Date.now() - scriptStart) / 1000}s`);

    } catch (error) {
        console.error("✗ A fatal error occurred in the discovery engine:", error);
    } finally {
        await client.close();
        console.log("--- SMART DISCOVERY ENGINE FINISHED ---");
    }
}

main().catch(console.error);

export {
  fetchDetailedWalletStats,
  fetchWalletActivity,
  calculateWalletEnrichmentFields,
  passesWalletQualityFilters,
  calculateTokenQualityScore,
  filterTopQualityTokens
};
