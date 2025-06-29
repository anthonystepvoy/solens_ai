import os
from pymongo import MongoClient
from datetime import datetime
import requests
import time

# MongoDB Connection
MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client["solens_ai"]

def enrich_wallets_with_gmgn_details():
    wallets = list(db.wallets.find({}))
    print(f"Found {len(wallets)} wallets in database.")
    updated = 0
    for w in wallets:
        wallet_address = w.get('_id') or w.get('wallet_address')
        if not wallet_address:
            continue
        # Fetch detailed stats from GMGN
        url = f"https://gmgn.ai/api/v1/wallet_stat/sol/{wallet_address}/7d"
        try:
            resp = requests.get(url, headers={"accept": "application/json"}, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data.get('code') == 0 and data.get('data'):
                    gmgn_details = data['data']
                    db.wallets.update_one(
                        {"_id": wallet_address},
                        {"$set": {"gmgn_detailed_stats": gmgn_details, "last_gmgn_enrich": datetime.utcnow()}},
                        upsert=True
                    )
                    updated += 1
                    print(f"[OK] Updated {wallet_address}")
                else:
                    print(f"[WARN] No data for {wallet_address}")
            else:
                print(f"[ERR] HTTP {resp.status_code} for {wallet_address}")
        except Exception as e:
            print(f"[ERR] Exception for {wallet_address}: {e}")
        time.sleep(0.5)  # Avoid rate limiting
    print(f"Enrichment complete. Updated {updated} wallets.")

if __name__ == "__main__":
    enrich_wallets_with_gmgn_details() 