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
    # Use root-level fields from discovery and on_chain_data
    features = {}
    # Discovery/root features
    features['profit'] = float(wallet.get('profit', 0))
    features['quality_score'] = float(wallet.get('quality_score', 0))
    features['profit_change'] = float(wallet.get('profit_change', 0))
    features['quality_tier'] = 1 if wallet.get('quality_tier', '') == 'high' else 0
    # On-chain features
    onchain = wallet.get('on_chain_data', {})
    features['onchain_pnl_sol'] = float(onchain.get('pnl_sol', 0))
    features['onchain_win_rate'] = float(onchain.get('win_rate', 0))
    features['onchain_total_trades'] = float(onchain.get('total_trades', 0))
    features['onchain_total_volume_sol'] = float(onchain.get('total_volume_sol', 0))
    features['onchain_incomplete_sells'] = float(onchain.get('incomplete_sells', 0))
    return features

# --- SMART SCORE CALCULATION ---
def compute_smart_score(feat, norm):
    # Weighted sum (weights can be tuned)
    score = (
        0.3 * norm['quality_score'] +
        0.2 * norm['onchain_win_rate'] +
        0.2 * norm['profit'] +
        0.1 * norm['onchain_pnl_sol'] +
        0.1 * norm['onchain_total_trades'] +
        0.1 * norm['quality_tier']
    )
    return float(np.clip(score, 0, 1))

def compute_risk_score(feat, norm):
    # Simple risk score: higher incomplete sells = higher risk
    return float(np.clip(norm['onchain_incomplete_sells'], 0, 1))

# --- CATEGORY LABELS ---
CATEGORY_LABELS = [
    'High-Frequency Scalper',
    'Long-Term Holder',
    'Trench Hunter'
]

def main():
    # 1. Query wallets with both discovery fields and on_chain_data
    wallets = list(db.wallets.find({}))
    selected = []
    wallet_ids = []
    for doc in wallets:
        if 'on_chain_data' in doc and 'profit' in doc:
            selected.append(doc)
            wallet_ids.append(doc['_id'])
    if not selected:
        print('No wallets with both discovery fields and on_chain_data found.')
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
            'overall_smart_score': smart_scores[i] if i < len(smart_scores) else 0,
            'risk_score': risk_scores[i] if i < len(risk_scores) else 0,
            'tags_ml': [CATEGORY_LABELS[clusters[i]]] if i < len(clusters) else [],
            'last_ml_inference': datetime.utcnow()
        }
        db.wallets.update_one(
            {"_id": doc_id},
            {"$set": {"ai_insights": ai_insights}},
            upsert=True
        )

    # Ensure all wallets have ai_insights.risk_score (set to 0 if missing)
    for doc in db.wallets.find({}):
        if 'ai_insights' not in doc or 'risk_score' not in doc['ai_insights']:
            db.wallets.update_one(
                {"_id": doc['_id']},
                {"$set": {"ai_insights.risk_score": 0}},
                upsert=True
            )

    print(f'Processed {len(wallet_ids)} wallets and updated ai_insights.')

if __name__ == '__main__':
    main() 