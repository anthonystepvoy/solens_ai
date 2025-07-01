from pymongo import MongoClient
import requests
import time
from collections import defaultdict

MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/solens_ai?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true"
client = MongoClient(MONGO_URI)
db = client["solens_ai"]

def fetch_all_trades(wallet_address):
    trades = []
    next_cursor = None
    while True:
        url = f"https://gmgn.ai/vas/api/v1/wallet_activity/sol?type=buy&type=sell&device_id=b4e58a50-81f0-4ffb-850e-f433598a8c51&client_id=gmgn_web_20250701-623-affa2c7&from_app=gmgn&app_ver=20250701-623-affa2c7&tz_name=America%2FMontevideo&tz_offset=-10800&app_lang=en-US&fp_did=535415de390d0e8ab5b33b8fd73b2830&os=web&wallet={wallet_address}&limit=50"
        if next_cursor:
            url += f"&next={next_cursor}"
        resp = requests.get(url, headers={"accept": "application/json"}, timeout=10)
        if resp.status_code != 200:
            break
        data = resp.json()
        activities = data.get("data", {}).get("activities", [])
        trades.extend(activities)
        next_cursor = data.get("data", {}).get("next")
        if not next_cursor or not activities:
            break
        time.sleep(0.5)  # Avoid rate limiting
    return trades

deleted = 0
for w in db.wallets.find({}):
    wallet_address = w.get('_id') or w.get('wallet_address')
    if not wallet_address:
        continue
    trades = fetch_all_trades(wallet_address)
    token_trade_counts = defaultdict(int)
    for trade in trades:
        token_addr = trade.get("token", {}).get("address")
        if token_addr:
            token_trade_counts[token_addr] += 1
    # Filter logic
    if len(token_trade_counts) < 10 or any(count > 20 for count in token_trade_counts.values()):
        db.wallets.delete_one({'_id': w['_id']})
        deleted += 1
    time.sleep(0.5)  # Avoid rate limiting

print(f"Deleted {deleted} wallets that did not meet the per-token and unique token criteria.") 