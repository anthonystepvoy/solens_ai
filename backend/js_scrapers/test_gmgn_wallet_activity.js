import puppeteer from 'puppeteer';

const wallet = '21vJn8G48d1mToiwx2PL4WSVMhmcP7CxNRYuT8dqBw68'; // Example wallet
const url = `https://gmgn.ai/vas/api/v1/wallet_activity/sol?type=buy&type=sell&device_id=b4e58a50-81f0-4ffb-850e-f433598a8c51&client_id=gmgn_web_20250701-623-affa2c7&from_app=gmgn&app_ver=20250701-623-affa2c7&tz_name=America%2FMontevideo&tz_offset=-10800&app_lang=en-US&fp_did=535415de390d0e8ab5b33b8fd73b2830&os=web&wallet=${wallet}&limit=50&cost=10`;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Try to get the JSON from the page
  let content = await page.content();
  let jsonText = '';
  try {
    // If the response is JSON, it will be in a <pre> or as body text
    const preTag = await page.$('pre');
    if (preTag) {
      jsonText = await page.evaluate(el => el.textContent, preTag);
    } else {
      jsonText = await page.evaluate(() => document.body.innerText);
    }
    const data = JSON.parse(jsonText);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('[ERROR] Could not parse JSON. Raw content:');
    console.log(jsonText || content);
  }

  await browser.close();
})(); 