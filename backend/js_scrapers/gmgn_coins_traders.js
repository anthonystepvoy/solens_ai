import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import { MongoClient } from "mongodb";

puppeteer.use(StealthPlugin());

// MongoDB Atlas connection
const MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(MONGO_URI);
let db;

// Function to get random time period
function getRandomTimePeriod() {
    return '24h';  // Changed from 1h to 24h for more discovery opportunities
}

// Function to get random filters
function getRandomFilters() {
    return []; // No filters, include all tokens
}

// Function to get random quality thresholds
function getRandomQualityThresholds() {
    return {
        minLiquidity: 5000, // Reduced from 10000 to 5000
        minHolderCount: 50, // Reduced from 100 to 50
        minMarketCap: 25000, // Reduced from 50000 to 25000
        maxRugRatio: 0.5 // Increased from 0.3 to 0.5
    };
}

// Helper function to add timeout to fetch
async function fetchWithTimeout(url, options = {}, timeout = 30000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function main() {
    console.log("Starting discovery process...");
    
    try {
        await client.connect();
        db = client.db("solens_ai");
        console.log("Connected to MongoDB");

        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
            timeout: 60000
        });

        const page = await browser.newPage();
        
        // Set page timeouts
        page.setDefaultTimeout(30000);
        page.setDefaultNavigationTimeout(30000);

        try {
            // Get random parameters
            const timePeriod = getRandomTimePeriod();
            const filters = getRandomFilters();
            const thresholds = getRandomQualityThresholds();

            console.log(`Using time period: ${timePeriod}`);
            console.log(`Using filters: ${filters.join(', ')}`);
            console.log('Quality thresholds:', thresholds);

            const filtersQuery = filters.map(f => `filters[]=${f}`).join('&');
            const url = `https://gmgn.ai/defi/quotation/v1/rank/sol/swaps/${timePeriod}?orderby=swaps&direction=desc&${filtersQuery}`;

            console.log(`DEBUG: Fetching URL: ${url}`);

            console.log("Opening the main page...");
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

            console.log("Fetching data...");
            const rankData = await page.evaluate((url) => {
                return fetch(url, { 
                    signal: AbortSignal.timeout(30000) // 30 second timeout
                })
                    .then((res) => {
                        if (!res.ok) {
                            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                        }
                        return res.json();
                    })
                    .then((json) => json.data.rank);
            }, url);

            console.log(`DEBUG: Found ${rankData.length} total coins from API.`);
            // Add debug: print first 5 tokens
            console.log('DEBUG: First 5 tokens from API:', rankData.slice(0, 5));
            
            // Filter for what we define as "good quality" coins using random thresholds
            const goodQualityCoins = rankData.filter(coin => {
                const liquidity = parseFloat(coin.liquidity);
                const holder_count = parseInt(coin.holder_count, 10);
                const market_cap = parseInt(coin.market_cap, 10);
                const rug_ratio = parseFloat(coin.rug_ratio);
                const pass = liquidity > thresholds.minLiquidity &&
                       holder_count > thresholds.minHolderCount &&
                       market_cap > thresholds.minMarketCap &&
                       rug_ratio < thresholds.maxRugRatio;
                if (!pass) {
                    console.log(`DEBUG: Token ${coin.symbol || coin.address.slice(0,6)} filtered out. Liquidity: ${liquidity}, Holders: ${holder_count}, Market Cap: ${market_cap}, Rug Ratio: ${rug_ratio}`);
                }
                return pass;
            });
            console.log(`DEBUG: Filtered down to ${goodQualityCoins.length} 'good quality' coins.`);

            // Load previously processed coins if file exists
            let processedCoins = new Map(); // Changed from Set to Map to track timestamps
            try {
                if (fs.existsSync('processed_coins.json')) {
                    const processedData = fs.readFileSync('processed_coins.json');
                    const processedArray = JSON.parse(processedData);
                    // Convert to Map with timestamps (default to 7 days ago if no timestamp)
                    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                    processedCoins = new Map(processedArray.map(coin => [
                        typeof coin === 'string' ? coin : coin.address,
                        typeof coin === 'string' ? sevenDaysAgo : coin.timestamp || sevenDaysAgo
                    ]));
                    console.log(`DEBUG: Loaded ${processedCoins.size} previously processed coins.`);
                }
            } catch (error) {
                console.log('No previous processed coins found or error reading file');
            }

            // Filter out recently processed coins (within last 7 days)
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            const newCoins = goodQualityCoins.filter(coin => {
                const lastProcessed = processedCoins.get(coin.address);
                return !lastProcessed || lastProcessed < sevenDaysAgo;
            });
            const data = newCoins.map((item) => item.address);

            if (newCoins.length > 0) {
                 console.log(`DEBUG: Found ${newCoins.length} new coins to process:`, newCoins.map(c => c.symbol || c.address.slice(0, 6)).join(', '));
            } else {
                console.log("DEBUG: No new quality coins to process after filtering previously processed ones.");
            }
            
            console.log(`Found ${data.length} new good quality coins to process.`);

            if (data.length === 0) {
                console.log("No new coins found. Try running again later.");
                return;
            }

            console.log("Processing coins...");

            // Process coins with better error handling and timeouts
            for (let i = 0; i < newCoins.length; i++) {
                const coin = newCoins[i];
                const coinAddress = coin.address;
                console.log(`DEBUG: Processing coin ${i + 1}/${newCoins.length}: ${coin.symbol || coinAddress.slice(0, 6)}...`);
                
                const page2 = await browser.newPage();
                page2.setDefaultTimeout(30000);
                page2.setDefaultNavigationTimeout(30000);
                
                const topTradersUrl = `https://gmgn.ai/defi/quotation/v1/tokens/top_traders/sol/${coinAddress}?orderby=profit&direction=desc`;
                console.log(`DEBUG: Fetching traders from: ${topTradersUrl}`);

                try {
                    await page2.goto(
                        topTradersUrl,
                        { waitUntil: "domcontentloaded", timeout: 30000 }
                    );

                    const tradesData = await page2.evaluate(() => {
                        return fetch(window.location.href, { 
                            signal: AbortSignal.timeout(30000) // 30 second timeout
                        })
                            .then((res) => {
                                if (!res.ok) {
                                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                                }
                                return res.json();
                            })
                            .then((json) =>
                                json.data.map((item) => ({
                                    address: item.address,
                                    solAddress: item.native_transfer.from_address,
                                    profit: item.realized_profit,
                                    profit_change: item.profit_change,
                                    timestamp: item.created_at,
                                }))
                            );
                    });
                    console.log(`DEBUG: Fetched ${tradesData.length} trades for token ${coin.symbol || coinAddress.slice(0,6)}`);
                    if (tradesData.length > 0) {
                        console.log('DEBUG: First 3 trades:', tradesData.slice(0,3));
                    }

                    // --- BEGIN: RESTORE AND IMPROVE WALLET QUALITY FILTERING ---
                    // Filter for high-quality traders only
                    const filteredTrades = tradesData.filter(trade => {
                        // Must have profit data
                        if (trade.profit === undefined || trade.profit === null) {
                            return false;
                        }
                        
                        // Must have positive profit (profitable trades only)
                        const profit = parseFloat(trade.profit);
                        if (profit <= 0) {
                            return false;
                        }
                        
                        // Must have reasonable profit change percentage (if available)
                        if (trade.profit_change !== undefined && trade.profit_change !== null) {
                            const profitChange = parseFloat(trade.profit_change);
                            // Reduced from 20% to 10% profit change requirement
                            if (profitChange < 10) {
                                return false;
                            }
                        }
                        
                        return true;
                    });
                    
                    console.log(`DEBUG: Filtered to ${filteredTrades.length} profitable trades (from ${tradesData.length} total)`);
                    
                    // Additional filtering: only include traders with significant profits
                    const highQualityTrades = filteredTrades.filter(trade => {
                        const profit = parseFloat(trade.profit);
                        // Reduced from 0.1 SOL to 0.05 SOL profit requirement
                        return profit > 0.05;
                    });
                    
                    console.log(`DEBUG: High-quality trades (>0.05 SOL profit): ${highQualityTrades.length}`);
                    
                    const profitableTrades = highQualityTrades; // Use high-quality filtered trades
                    // --- END: RESTORE AND IMPROVE WALLET QUALITY FILTERING ---

                    // Deduplicate makers
                    const uniqueTrades = [];
                    const seenAddress = new Set();

                    for (const trade of profitableTrades) {
                        if (!seenAddress.has(trade.address)) {
                            uniqueTrades.push(trade);
                            seenAddress.add(trade.address);
                        }
                    }

                    // Sort by profit (highest first) and limit to top 20 wallets per token
                    const sortedTrades = uniqueTrades.sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit));
                    const topTrades = sortedTrades.slice(0, 20); // Only store top 20 wallets per token

                    console.log(`DEBUG: Found ${uniqueTrades.length} unique, profitable traders for ${coin.symbol || coinAddress.slice(0, 6)}.`);
                    console.log(`DEBUG: Storing top ${topTrades.length} highest-profit traders to save MongoDB space.`);

                    // Replace Firestore upserts with MongoDB upserts for tokens and wallets
                    // For tokens:
                    const tokenData = {
                      address: coinAddress,
                      symbol: coin.symbol,
                      logo: coin.logo,
                      liquidity: coin.liquidity,
                      holder_count: coin.holder_count,
                      market_cap: coin.market_cap,
                      rug_ratio: coin.rug_ratio,
                      is_honeypot: coin.is_honeypot !== undefined ? coin.is_honeypot : null,
                      last_gmgn_update: new Date(),
                      discovered_by: ['GMGN_Coin_Scraper']
                    };
                    await db.collection("tokens").updateOne(
                      { address: coinAddress },
                      { $set: tokenData },
                      { upsert: true }
                    );

                    // For wallets:
                    for (const trade of topTrades) {
                      const walletData = {
                        token_address: coinAddress,
                        profit: trade.profit,
                        profit_change: trade.profit_change,
                        timestamp: trade.timestamp,
                        discovered_by: ['GMGN_Token_Trader_Scraper'],
                        updated_at: new Date(),
                        // Add quality metadata
                        quality_score: parseFloat(trade.profit), // Use profit as quality score
                        quality_tier: parseFloat(trade.profit) > 1.0 ? 'high' : parseFloat(trade.profit) > 0.5 ? 'medium' : 'low',
                        profit_threshold_passed: true,
                        significant_profit: parseFloat(trade.profit) > 0.05 // Updated threshold
                      };
                      await db.collection("wallets").updateOne(
                        { _id: trade.address },
                        { $set: walletData },
                        { upsert: true }
                      );
                    }

                    // Add to processed coins
                    processedCoins.set(coinAddress, coin.timestamp || Date.now());
                    
                    console.log(`✓ Processed coin: ${coinAddress}`);
                    
                    // Small delay between requests to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                } catch (error) {
                    console.error(`✗ Error processing coin ${coinAddress}:`, error.message);
                    // Continue with next coin instead of stopping
                } finally {
                    await page2.close();
                }
            }

            // Save data to JSON files
            fs.writeFileSync("processed_coins.json", JSON.stringify([...processedCoins.entries()], null, 2));
            console.log("✓ Processed coins saved to processed_coins.json!");
            console.log("✓ Discovery process completed successfully!");
            
        } catch (error) {
            console.error("✗ Error during processing:", error);
            throw error;
        } finally {
            await browser.close();
            await client.close();
        }
    } catch (error) {
        console.error("✗ Fatal error in discovery process:", error);
        process.exit(1);
    }
}

// Add timeout to the entire script
const scriptTimeout = setTimeout(() => {
    console.error("✗ Discovery script timed out after 10 minutes");
    process.exit(1);
}, 10 * 60 * 1000); // 10 minutes

main()
    .then(() => {
        clearTimeout(scriptTimeout);
        console.log("✓ Discovery script completed successfully");
        process.exit(0);
    })
    .catch((err) => {
        clearTimeout(scriptTimeout);
        console.error("✗ Discovery script failed:", err);
        process.exit(1);
    });
