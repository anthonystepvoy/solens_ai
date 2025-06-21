import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

// Helper function to create a delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function analyzeTradePage() {
  const browser = await puppeteer.launch({
    headless: false,
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
  
  // Set a longer timeout
  page.setDefaultNavigationTimeout(120000);
  
  // Set user agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  // Store all API responses
  const apiResponses = [];
  
  // Listen for all responses
  page.on('response', async response => {
    const url = response.url();
    // Focus on API endpoints
    if (url.includes('api') || url.includes('v1') || url.includes('defi')) {
      try {
        const responseData = await response.json();
        console.log(`Found API response from: ${url}`);
        apiResponses.push({
          url,
          data: responseData
        });
      } catch (e) {
        // Ignore non-JSON responses
      }
    }
  });

  try {
    console.log("Opening the trade page...");
    
    // First try to load the page with a basic timeout
    try {
      await page.goto(
        "https://gmgn.ai/trade/P9SpVtpq?chain=sol",
        { waitUntil: "domcontentloaded", timeout: 30000 }
      );
    } catch (error) {
      console.log("Initial page load timed out, continuing anyway...");
    }

    // Wait for 10 seconds to capture all requests
    console.log("Waiting for API responses...");
    await delay(10000);

    // Save the captured data
    const analysisData = {
      apiResponses,
      timestamp: new Date().toISOString()
    };

    fs.writeFileSync("trade_analysis.json", JSON.stringify(analysisData, null, 2));
    console.log("Analysis data saved to trade_analysis.json!");

  } catch (error) {
    console.error("Error during analysis:", error);
  } finally {
    await browser.close();
  }
}

analyzeTradePage().catch((err) => console.error("Unexpected error:", err)); 