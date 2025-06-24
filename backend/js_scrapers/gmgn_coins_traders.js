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
    return '1h';  // Always return 1h for most recent coins
}

// Function to get random filters
function getRandomFilters() {
    return []; // No filters, include all tokens
}

// Function to get random quality thresholds
function getRandomQualityThresholds() {
    return {
        minLiquidity: 0, // Allow any liquidity
        minHolderCount: 0, // Allow any holder count
        minMarketCap: 0, // Allow any market cap
        maxRugRatio: 1.0 // Allow any rug ratio
    };
}

async function main() {
    await client.connect();
    db = client.db("solens_ai");

    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

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
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

        console.log("Fetching data...");
        const rankData = await page.evaluate((url) => {
            return fetch(url)
                .then((res) => res.json())
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
        let processedCoins = new Set();
        try {
            if (fs.existsSync('processed_coins.json')) {
                const processedData = fs.readFileSync('processed_coins.json');
                processedCoins = new Set(JSON.parse(processedData));
                console.log(`DEBUG: Loaded ${processedCoins.size} previously processed coins.`);
            }
        } catch (error) {
            console.log('No previous processed coins found or error reading file');
        }

        // Filter out previously processed coins
        const newCoins = goodQualityCoins.filter(coin => !processedCoins.has(coin.address));
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

        for (const coin of newCoins) {
            const coinAddress = coin.address;
            const page2 = await browser.newPage();
            const topTradersUrl = `https://gmgn.ai/defi/quotation/v1/tokens/top_traders/sol/${coinAddress}?orderby=profit&direction=desc`;
            console.log(`DEBUG: Processing coin ${coin.symbol || coinAddress.slice(0, 6)}...`);
            console.log(`DEBUG: Fetching traders from: ${topTradersUrl}`);

            try {
                await page2.goto(
                    topTradersUrl,
                    { waitUntil: "domcontentloaded", timeout: 60000 }
                );

                const tradesData = await page2.evaluate(() => {
                    return fetch(window.location.href)
                        .then((res) => res.json())
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

                // --- BEGIN: Remove wallet profitability filter ---
                // const filteredTrades = tradesData.filter(trade => {
                //     if (trade.profit_change === undefined || trade.profit_change === null) {
                //         return true;
                //     }
                //     return parseFloat(trade.profit_change) >= 50;
                // });
                // const profitableTrades = filteredTrades.filter(trade => trade.profit > 0);
                const profitableTrades = tradesData; // No filtering, include all
                // --- END: Remove wallet profitability filter ---

                // Deduplicate makers
                const uniqueTrades = [];
                const seenAddress = new Set();

                for (const trade of profitableTrades) {
                    if (!seenAddress.has(trade.address)) {
                        uniqueTrades.push(trade);
                        seenAddress.add(trade.address);
                    }
                }

                console.log(`DEBUG: Found ${uniqueTrades.length} unique, profitable traders for ${coin.symbol || coinAddress.slice(0, 6)}.`);

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
                for (const trade of uniqueTrades) {
                  const walletData = {
                    token_address: coinAddress,
                    profit: trade.profit,
                    profit_change: trade.profit_change,
                    timestamp: trade.timestamp,
                    discovered_by: ['GMGN_Token_Trader_Scraper'],
                    updated_at: new Date()
                  };
                  await db.collection("wallets").updateOne(
                    { _id: trade.address },
                    { $set: walletData },
                    { upsert: true }
                  );
                }

                // Add to processed coins
                processedCoins.add(coinAddress);
                
                console.log(`Processed coin: ${coinAddress}`);
            } catch (error) {
                console.error(`Error processing coin ${coinAddress}:`, error);
            } finally {
                await page2.close();
            }
        }

        // Save data to JSON files
        fs.writeFileSync("processed_coins.json", JSON.stringify([...processedCoins], null, 2));
        console.log("Processed coins saved to processed_coins.json!");
    } catch (error) {
        console.error("Error during processing:", error);
    } finally {
        await browser.close();
    }
}

main().catch((err) => console.error("Unexpected error:", err));
