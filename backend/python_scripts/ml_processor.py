import os
from pymongo import MongoClient
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from datetime import datetime

# --- CONFIG ---
N_CLUSTERS = 3  # Number of wallet categories

# MongoDB Atlas connection
MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client["solens_ai"]

# --- FEATURE EXTRACTION ---
def extract_features(wallet):
    gmgn = wallet.get('gmgn_data', {})
    onchain = wallet.get('on_chain_data', {})
    features = {}
    # GMGN features
    features['gmgn_pnl_7d'] = gmgn.get('pnl_7d', 0)
    features['gmgn_winrate_7d'] = gmgn.get('winrate_7d', 0)
    features['gmgn_copy_trading_score'] = gmgn.get('copy_trading_score', 0)
    features['gmgn_risk_honeypot_ratio'] = gmgn.get('risk', {}).get('token_honeypot_ratio', 0)
    features['gmgn_risk_fast_tx_ratio'] = gmgn.get('risk', {}).get('fast_tx_ratio', 0)
    features['gmgn_txs_30d'] = gmgn.get('txs_30d', 0)
    # On-chain features
    features['onchain_pnl_sol'] = onchain.get('pnl_sol', 0)
    features['onchain_win_rate'] = onchain.get('win_rate', 0)
    features['onchain_total_trades'] = onchain.get('total_trades', 0)
    features['onchain_total_volume_sol'] = onchain.get('total_volume_sol', 0)
    features['onchain_sol_balance_change'] = onchain.get('sol_balance_change', 0)
    features['onchain_incomplete_sells'] = onchain.get('incomplete_sells', 0)
    return features

# --- SMART SCORE CALCULATION ---
def compute_smart_score(feat, norm):
    # Weighted sum (weights can be tuned)
    score = (
        0.3 * norm['gmgn_copy_trading_score'] +
        0.2 * norm['gmgn_winrate_7d'] +
        0.2 * norm['onchain_win_rate'] +
        0.1 * norm['gmgn_pnl_7d'] +
        0.1 * norm['onchain_pnl_sol'] +
        0.1 * (1 - norm['gmgn_risk_fast_tx_ratio'])
    )
    return float(np.clip(score, 0, 1))

def compute_risk_score(feat, norm):
    # Simple risk score: average of risk ratios
    return float(np.clip((norm['gmgn_risk_honeypot_ratio'] + norm['gmgn_risk_fast_tx_ratio']) / 2, 0, 1))

# --- CATEGORY LABELS ---
CATEGORY_LABELS = [
    'High-Frequency Scalper',
    'Long-Term Holder',
    'Trench Hunter'
]

def main():
    # 1. Query wallets with both gmgn_data and on_chain_data
    wallets = list(db.wallets.find({}))
    selected = []
    wallet_ids = []
    for doc in wallets:
        data = doc
        if 'gmgn_data' in data and 'on_chain_data' in data:
            selected.append(data)
            wallet_ids.append(doc['_id'])
    if not selected:
        print('No wallets with both gmgn_data and on_chain_data found.')
        return
    # 2. Extract features
    feature_list = [extract_features(w) for w in selected]
    feature_names = list(feature_list[0].keys())
    X = np.array([[f[n] for n in feature_names] for f in feature_list])
    # 3. Normalize features
    scaler = StandardScaler()
    X_norm = scaler.fit_transform(X)
    # 4. Compute smart scores and risk scores
    smart_scores = []
    risk_scores = []
    for i, feat in enumerate(feature_list):
        norm = dict(zip(feature_names, X_norm[i]))
        smart_scores.append(compute_smart_score(feat, norm))
        risk_scores.append(compute_risk_score(feat, norm))
    # 5. Clustering
    kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=42)
    clusters = kmeans.fit_predict(X_norm)
    # 6. Write back to MongoDB
    for i, doc_id in enumerate(wallet_ids):
        ai_insights = {
            'overall_smart_score': smart_scores[i],
            'risk_score': risk_scores[i],
            'tags_ml': [CATEGORY_LABELS[clusters[i]]],
            'last_ml_inference': datetime.utcnow()
        }
        db.wallets.update_one(
            {"_id": doc_id},
            {"$set": {"ai_insights": ai_insights}},
            upsert=True
        )
    print(f'Processed {len(wallet_ids)} wallets and updated ai_insights.')

if __name__ == '__main__':
    main() 