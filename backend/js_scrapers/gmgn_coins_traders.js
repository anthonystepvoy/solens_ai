// File: backend/js_scrapers/gmgn_coins_traders.js
// --- SMART DISCOVERY ENGINE WITH QUALITY FILTERING ---

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { MongoClient } from "mongodb";

puppeteer.use(StealthPlugin());

const MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
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
    console.log("--- STARTING SMART DISCOVERY ENGINE WITH QUALITY FILTERING ---");
    
    try {
        await client.connect();
        db = client.db("solens_ai");
        console.log("✓ Connected to MongoDB");

        // 1. Get the LATEST 20 tokens from the 1-minute snapshot collection.
        const tokensToProcess = await db.collection("minute_rank_snapshots")
            .find({})
            .sort({ retrieved_at: -1 }) // Get the most recent documents first
            .limit(20) // Limit to the size of a single snapshot
            .toArray();

        if (tokensToProcess.length === 0) {
            console.log("✓ No tokens found in the minute_rank_snapshots collection yet. Run the 1-minute fetcher first. Exiting.");
            return;
        }

        console.log(`🔥 Found ${tokensToProcess.length} tokens from the latest snapshot.`);
        
        // 2. Filter for top quality tokens only
        const topQualityTokens = filterTopQualityTokens(tokensToProcess, 5); // Process only top 5
        
        const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
        const page = await browser.newPage();
        
        // Set page timeouts
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(30000);

        // First navigate to the main site to establish domain context
        console.log("Establishing domain context by navigating to gmgn.ai...");
        await page.goto("https://gmgn.ai", { waitUntil: "domcontentloaded", timeout: 30000 });
        console.log("✓ Domain context established");

        let totalNewWallets = 0;
        let totalDetailedStats = 0;

        for (const coin of topQualityTokens) {
            const coinAddress = coin.address;
            console.log(`\n--- Processing TOP QUALITY Token: ${coin.symbol || coinAddress.slice(0, 6)} (Score: ${coin.quality_score}/100) ---`);
            
            try {
                const topTradersUrl = `https://gmgn.ai/defi/quotation/v1/tokens/top_traders/sol/${coinAddress}?orderby=profit&direction=desc`;
                
                const tradesData = await page.evaluate(async (url) => {
                    const response = await fetch(url, { headers: { "accept": "application/json" } });
                    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
                    return response.json();
                }, topTradersUrl);

                if (tradesData.code === 0 && tradesData.data) {
                    const topTraders = tradesData.data.filter(t => t.realized_profit > 0.05).slice(0, 20);
                    console.log(`✓ Found ${topTraders.length} profitable traders for ${coin.symbol || "Unknown"}.`);

                    for (const trader of topTraders) {
                        const walletAddress = trader.address;
                        
                        // Fetch detailed wallet stats
                        console.log(`  Fetching detailed stats for ${walletAddress.slice(0, 8)}...`);
                        const detailedStats = await fetchDetailedWalletStats(page, walletAddress);
                        
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
                            },
                            updated_at: new Date()
                        };

                        // Add detailed stats if available
                        if (detailedStats) {
                            walletData.gmgn_detailed_stats = detailedStats;
                            totalDetailedStats++;
                            console.log(`    ✓ Detailed stats added`);
                        }

                        const result = await db.collection("wallets").updateOne(
                            { _id: trader.address },
                            { 
                                $set: walletData, 
                                $addToSet: { discovered_by: 'Smart_Quality_Filtered_Discovery' } 
                            },
                            { upsert: true }
                        );

                        if (result.upsertedCount > 0) {
                            console.log(`[NEW WALLET] Inserted: ${trader.address}`);
                            totalNewWallets++;
                        } else {
                            console.log(`[UPDATED WALLET] Updated: ${trader.address}`);
                        }

                        // Small delay to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 200));
                    }
                }

            } catch (error) {
                console.error(`✗ Error processing traders for token ${coinAddress}: ${error.message}`);
            }
        }

        await browser.close();
        
        console.log(`\n🎉 SMART DISCOVERY COMPLETE!`);
        console.log(`📊 Summary:`);
        console.log(`   • Total tokens analyzed: ${tokensToProcess.length}`);
        console.log(`   • High-quality tokens processed: ${topQualityTokens.length}`);
        console.log(`   • Total new wallets discovered: ${totalNewWallets}`);
        console.log(`   • Wallets with detailed stats: ${totalDetailedStats}`);
        console.log(`   • Time saved: ~${Math.round((tokensToProcess.length - topQualityTokens.length) * 2)} minutes`);

    } catch (error) {
        console.error("✗ A fatal error occurred in the discovery engine:", error);
    } finally {
        await client.close();
        console.log("--- SMART DISCOVERY ENGINE FINISHED ---");
    }
}

main().catch(console.error);
