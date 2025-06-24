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

// Function to get random time period
function getRandomTimePeriod() {
    return '1h';  // Always return 1h for most recent coins
}

// Function to get random filters
function getRandomFilters() {
    const allFilters = ['renounced', 'frozen', 'verified', 'audited'];
    const numFilters = Math.floor(Math.random() * 2) + 1; // 1 or 2 filters
    const selectedFilters = [];
    
    while (selectedFilters.length < numFilters) {
        const filter = allFilters[Math.floor(Math.random() * allFilters.length)];
        if (!selectedFilters.includes(filter)) {
            selectedFilters.push(filter);
        }
    }
    
    return selectedFilters;
}

// Function to get random quality thresholds
function getRandomQualityThresholds() {
    return {
        minLiquidity: Math.floor(Math.random() * 3000) + 1000, // 1000-4000
        minHolderCount: Math.floor(Math.random() * 30) + 10,   // 10-40
        minMarketCap: Math.floor(Math.random() * 5000) + 3000, // 3000-8000
        maxRugRatio: 0.7 + (Math.random() * 0.2)              // 0.7-0.9
    };
}

async function main() {
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

        // Filter for what we define as "good quality" coins using random thresholds
        const goodQualityCoins = rankData.filter(coin => {
            const liquidity = parseFloat(coin.liquidity);
            const holder_count = parseInt(coin.holder_count, 10);
            const market_cap = parseInt(coin.market_cap, 10);
            const rug_ratio = parseFloat(coin.rug_ratio);

            return liquidity > thresholds.minLiquidity &&
                   holder_count > thresholds.minHolderCount &&
                   market_cap > thresholds.minMarketCap &&
                   rug_ratio < thresholds.maxRugRatio;
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

                // Filter wallets with less than 50% PNL.
                const filteredTrades = tradesData.filter(trade => {
                    if (trade.profit_change === undefined || trade.profit_change === null) {
                        return true;
                    }
                    return parseFloat(trade.profit_change) >= 50;
                });

                const profitableTrades = filteredTrades.filter(trade => trade.profit > 0);

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

                // Firestore: update token document
                const tokenRef = db.collection('tokens').doc(coinAddress);
                const tokenData = {
                  address: coin.address,
                  symbol: coin.symbol,
                  logo: coin.logo,
                  liquidity: coin.liquidity,
                  holder_count: coin.holder_count,
                  market_cap: coin.market_cap,
                  rug_ratio: coin.rug_ratio,
                  is_honeypot: coin.is_honeypot !== undefined ? coin.is_honeypot : null,
                  last_gmgn_update: admin.firestore.Timestamp.now(),
                  discovered_by: admin.firestore.FieldValue.arrayUnion('GMGN_Coin_Scraper')
                };
                await tokenRef.set(tokenData, { merge: true });

                // Firestore: update wallet documents for each trade
                for (const trade of uniqueTrades) {
                  const walletRef = db.collection('wallets').doc(trade.address);
                  const tradeSummary = {
                    token_address: coinAddress,
                    profit: trade.profit,
                    profit_change: trade.profit_change,
                    timestamp: trade.timestamp
                  };
                  // Add to gmgn_data.trades_on_tokens (array)
                  await walletRef.set({
                    gmgn_data: {
                      trades_on_tokens: admin.firestore.FieldValue.arrayUnion(tradeSummary)
                    },
                    discovered_by: admin.firestore.FieldValue.arrayUnion('GMGN_Token_Trader_Scraper'),
                    updated_at: admin.firestore.Timestamp.now()
                  }, { merge: true });
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
