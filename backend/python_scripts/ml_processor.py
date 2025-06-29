import os
from pymongo import MongoClient
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from datetime import datetime

# --- CONFIG ---
N_CLUSTERS = 4 
CATEGORY_LABELS = [
    'High-Frequency Gem Hunter',
    'Measured Low-Cap Specialist',
    'Consistent High-Roller',
    'Volatile Scalper'
]

# MongoDB Connection
MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client["solens_ai"]

# --- UPGRADED FEATURE EXTRACTION (GMGN DATA ONLY) ---
def extract_features(wallet):
    features = {}
    gmgn = wallet.get('gmgn_detailed_stats', {})

    def to_float(value):
        try: return float(value)
        except (ValueError, TypeError): return 0.0

    features['pnl_30d'] = to_float(gmgn.get('pnl_30d'))
    features['winrate_30d'] = to_float(gmgn.get('winrate'))
    features['txs_30d'] = to_float(gmgn.get('buy_30d')) + to_float(gmgn.get('sell_30d'))
    
    features['pnl_7d'] = to_float(gmgn.get('pnl_7d'))
    features['winrate_7d'] = to_float(gmgn.get('winrate_7d'))
    features['txs_7d'] = to_float(gmgn.get('buy_7d')) + to_float(gmgn.get('sell_7d'))
    
    total_trades = to_float(gmgn.get('buy')) + to_float(gmgn.get('sell'))
    total_pnl = to_float(gmgn.get('pnl'))
    features['avg_pnl_per_trade'] = total_pnl / total_trades if total_trades > 0 else 0
    
    features['token_diversity_7d'] = to_float(gmgn.get('token_num_7d'))
    features['avg_sol_cost'] = to_float(gmgn.get('token_avg_cost'))

    return features

# --- UPGRADED SCORING (GMGN DATA ONLY) ---
def compute_smart_score(feat, norm):
    score = (
        0.25 * norm.get('winrate_30d', 0) +
        0.20 * norm.get('pnl_30d', 0) +
        0.20 * norm.get('avg_pnl_per_trade', 0) +
        0.15 * norm.get('winrate_7d', 0) +
        0.15 * norm.get('txs_7d', 0) +
        0.05 * (1 - norm.get('token_diversity_7d', 0))
    )
    # Penalize low/zero PNL: if pnl_7d is zero, score is zero
    score = score * norm.get('pnl_7d', 0)
    return float(np.clip(score, 0, 1))

def compute_risk_score(feat, norm):
    risk_score = (
        0.5 * (1 - norm.get('winrate_30d', 0)) +
        0.3 * norm.get('txs_30d', 0) +
        0.2 * norm.get('token_diversity_7d', 0)
    )
    return float(np.clip(risk_score, 0, 1))

def main():
    print("=== Upgraded ML Processor (GMGN-Only): Starting ===")
    wallets = list(db.wallets.find({"gmgn_detailed_stats": {"$exists": True}}))
    print(f"Found {len(wallets)} wallets with gmgn_detailed_stats for processing.")
    
    if not wallets:
        print('No wallets found that meet criteria for ML processing.')
        return

    wallet_ids = [w['_id'] for w in wallets]
    feature_list = [extract_features(w) for w in wallets]
    feature_names = list(feature_list[0].keys()) if feature_list else []
    
    if not feature_names:
        print("Could not extract any features. Exiting.")
        return

    X = np.array([[f.get(n, 0) for n in feature_names] for f in feature_list])
    
    scaler = StandardScaler()
    X_norm = scaler.fit_transform(X)
    print("Features normalized.")

    # Compute Scores
    smart_scores, risk_scores = [], []
    for i in range(X_norm.shape[0]):
        norm_dict = dict(zip(feature_names, X_norm[i]))
        feat_dict = feature_list[i]
        smart_scores.append(compute_smart_score(feat_dict, norm_dict))
        risk_scores.append(compute_risk_score(feat_dict, norm_dict))
    print("Smart and risk scores computed.")

    # Clustering
    kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(X_norm)
    print("Clustering complete.")

    # Update Database
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

    print(f"[OK] Processed {len(wallet_ids)} wallets and updated ai_insights.")
    print("=== ML Processor: Finished ===")

if __name__ == '__main__':
    main() 