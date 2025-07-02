import os
from pymongo import MongoClient
from datetime import datetime
import requests
import time

# MONGO_URI should be set in your environment or .env file
MONGO_URI = os.environ.get('MONGO_URI')
client = MongoClient(MONGO_URI)
db = client["solens_ai"]

def calculate_smart_score(winrate, pnl_7d, risk_score, trade_consistency):
    # Normalize inputs to 0-1
    winrate = min(max(winrate, 0), 1)
    pnl_7d = min(max(pnl_7d / 2, 0), 1)  # e.g., 200%+ is maxed
    risk_score = min(max(risk_score, 0), 1)
    trade_consistency = min(max(trade_consistency, 0), 1)
    return round(0.4 * winrate + 0.3 * pnl_7d + 0.2 * (1 - risk_score) + 0.1 * trade_consistency, 4)

def calculate_risk_score(honeypot_ratio, fast_trade_ratio, winrate):
    honeypot_ratio = min(max(honeypot_ratio, 0), 1)
    fast_trade_ratio = min(max(fast_trade_ratio, 0), 1)
    winrate = min(max(winrate, 0), 1)
    return round(0.5 * honeypot_ratio + 0.3 * fast_trade_ratio + 0.2 * (1 - winrate), 4)

def trade_consistency(trades_7d, unique_tokens_7d):
    # Consistency: more tokens and more trades is better, but not too many
    if trades_7d == 0 or unique_tokens_7d == 0:
        return 0
    avg_trades_per_token = trades_7d / unique_tokens_7d
    # Ideal is 1-5 trades per token
    if avg_trades_per_token > 10:
        return 0
    return min(avg_trades_per_token / 5, 1)

def enrich_wallets_with_gmgn_details():
    wallets = list(db.wallets.find({}))
    print(f"Found {len(wallets)} wallets in database.")
    updated = 0
    min_trades_7d = 10    # Minimum trades in 7 days
    max_trades_7d = 100   # Maximum trades in 7 days
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
                    trades_7d = gmgn_details.get('buy_7d', 0) + gmgn_details.get('sell_7d', 0)
                    if trades_7d < min_trades_7d:
                        print(f"[SKIP] {wallet_address} has only {trades_7d} trades in 7d (min {min_trades_7d})")
                        continue
                    if trades_7d > max_trades_7d:
                        print(f"[SKIP] {wallet_address} has {trades_7d} trades in 7d (max {max_trades_7d})")
                        continue
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

def enrich_wallets_with_custom_scores():
    wallets = list(db.wallets.find({}))
    print(f"Found {len(wallets)} wallets in database.")
    updated = 0
    for w in wallets:
        stats = w.get('gmgn_detailed_stats', {})
        winrate = stats.get('winrate', 0)
        pnl_7d = stats.get('pnl_7d', 0)
        risk = stats.get('risk') or {}
        honeypot_ratio = risk.get('token_honeypot_ratio', 0)
        fast_trade_ratio = risk.get('fast_tx_ratio', 0)
        trades_7d = stats.get('buy_7d', 0) + stats.get('sell_7d', 0)
        unique_tokens_7d = w.get('unique_tokens_7d') or (w.get('token_distribution_7d') and len(w['token_distribution_7d'])) or 0
        consistency = trade_consistency(trades_7d, unique_tokens_7d)
        smart_score = calculate_smart_score(winrate, pnl_7d, risk.get('risk_score', 0), consistency)
        risk_score = calculate_risk_score(honeypot_ratio, fast_trade_ratio, winrate)
        db.wallets.update_one(
            {"_id": w["_id"]},
            {"$set": {"my_smart_score": smart_score, "my_risk_score": risk_score}},
        )
        updated += 1
    print(f"Updated {updated} wallets with custom smart and risk scores.")

if __name__ == "__main__":
    enrich_wallets_with_custom_scores() 