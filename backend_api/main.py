import os

# Cipher backend - API only (no data collection)
# Try to load dotenv, but don't fail if it's not available
try:
    from dotenv import load_dotenv
    
    # Load environment variables - try multiple paths for different deployment scenarios
    env_paths = ['../.env', '.env', './.env']
    for env_path in env_paths:
        if os.path.exists(env_path):
            load_dotenv(dotenv_path=env_path)
            break
    print("Successfully loaded dotenv")
except ImportError:
    print("python-dotenv not available, using system environment variables only")
    # dotenv is not available, but that's okay - we'll just use system env vars

from fastapi import FastAPI, Request, BackgroundTasks, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
import json
import ssl
import pandas as pd
from datetime import datetime, timedelta
import traceback
import math
import numpy as np
from dateutil import parser as date_parser
from pymongo import MongoClient
import random
from collections import Counter

app = FastAPI(title="Cipher API", version="2.0.0")

# Configure CORS for production
allowed_origins = ["*"]  # You can restrict this to your frontend domain in production
if os.environ.get("FRONTEND_URL"):
    allowed_origins = [os.environ.get("FRONTEND_URL")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SETTINGS_FILE = os.path.join(os.path.dirname(__file__), 'discovery_settings.json')

# MONGO_URI should be set in your environment or .env file
MONGO_URI = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URI') or 'mongodb://localhost:27017'

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=10000,
    maxPoolSize=10,
    retryWrites=True,
    w='majority',
    tls=True,
    tlsAllowInvalidCertificates=True,
    tlsAllowInvalidHostnames=True
)
db = client["solens_ai"]

@app.get("/")
def read_root():
    return {"message": "Cipher API is running! (Data collection disabled)"}

@app.get("/settings")
def get_settings():
    if not os.path.exists(SETTINGS_FILE) or os.path.getsize(SETTINGS_FILE) == 0:
        # Default settings
        return {
            "minLiquidity": 1000,
            "minHolderCount": 10,
            "minMarketCap": 3000,
            "maxRugRatio": 0.9,
            "filters": ["verified"]
        }
    try:
        with open(SETTINGS_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        # If file is invalid, return defaults
        return {
            "minLiquidity": 1000,
            "minHolderCount": 10,
            "minMarketCap": 3000,
            "maxRugRatio": 0.9,
            "filters": ["verified"]
        }

@app.post("/settings")
async def set_settings(request: Request):
    data = await request.json()
    with open(SETTINGS_FILE, 'w') as f:
        json.dump(data, f)
    return {"status": "success"}

@app.get("/tokens")
def get_tokens():
    tokens = []
    for doc in db.tokens.find({}):
        doc['id'] = str(doc['_id'])
        del doc['_id']
        tokens.append(doc)
    return tokens

@app.get("/wallets")
def get_wallets():
    print("[DEBUG] /wallets endpoint called")
    wallets = []
    try:
        for doc in db.wallets.find({}):
            doc['id'] = str(doc['_id'])
            del doc['_id']
            wallets.append(doc)
        print(f"[DEBUG] /wallets returning {len(wallets)} wallets")
    except Exception as e:
        print(f"[ERROR] /wallets exception: {e}")
    return wallets

@app.get("/wallet/{wallet_id}")
def get_wallet(wallet_id: str):
    doc = db.wallets.find_one({"_id": wallet_id})
    if doc:
        return doc
    return JSONResponse(status_code=404, content={"error": "Wallet not found"})

@app.get("/traders")
def get_traders():
    traders = []
    for doc in db.traders.find({}):
        traders.append(doc)
    return traders

def sanitize_json(obj):
    if isinstance(obj, dict):
        return {k: sanitize_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_json(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif isinstance(obj, np.generic):  # Handles numpy.nan, numpy.int64, etc.
        if np.isnan(obj):
            return None
        return obj.item()
    elif isinstance(obj, str) and obj.strip().lower() == 'nan':
        return None
    else:
        return obj

@app.get("/dashboard-summary")
def dashboard_summary():
    print("[DEBUG] Dashboard summary endpoint called")
    try:
        pipeline = [
            {"$match": {"gmgn_detailed_stats": {"$exists": True}}},
            {"$limit": 10000},
            {"$project": {
                "_id": 1,
                "wallet_address": 1,
                "gmgn_detailed_stats.realized_profit": 1,
                "gmgn_detailed_stats.pnl": 1,
                "ai_insights.smart_score": 1,
                "ai_insights.risk_score": 1,
                "ai_insights.cluster": 1,
                "ai_insights.ml_tags": 1,
                "discovered_at": 1
            }}
        ]
        
        def normalize(values):
            if not values:
                return []
            min_val, max_val = min(values), max(values)
            if min_val == max_val:
                return [0.5] * len(values)
            return [(v - min_val) / (max_val - min_val) for v in values]

        wallets_cursor = db.wallets.aggregate(pipeline)
        wallets = list(wallets_cursor)
        
        # Process metrics
        total_wallets = len(wallets)
        wallets_with_profit = [w for w in wallets if w.get('gmgn_detailed_stats', {}).get('realized_profit', 0) > 0]
        profitable_wallets = len(wallets_with_profit)
        
        profits = [w.get('gmgn_detailed_stats', {}).get('realized_profit', 0) for w in wallets_with_profit]
        avg_profit = sum(profits) / len(profits) if profits else 0
        
        smart_scores = [w.get('ai_insights', {}).get('smart_score', 0) for w in wallets if w.get('ai_insights', {}).get('smart_score') is not None]
        risk_scores = [w.get('ai_insights', {}).get('risk_score', 0) for w in wallets if w.get('ai_insights', {}).get('risk_score') is not None]
        
        avg_smart_score = sum(smart_scores) / len(smart_scores) if smart_scores else 0
        avg_risk_score = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        
        # Top performing wallets
        top_wallets = sorted(wallets_with_profit, key=lambda w: w.get('gmgn_detailed_stats', {}).get('realized_profit', 0), reverse=True)[:10]
        
        # High-risk wallets (risk score > 0.7)
        risky_wallets = [w for w in wallets if w.get('ai_insights', {}).get('risk_score', 0) > 0.7]
        top_risky_wallets = sorted(risky_wallets, key=lambda w: w.get('ai_insights', {}).get('risk_score', 0), reverse=True)[:10]
        
        # Hot wallets from last 24h and 1h
        now = datetime.utcnow()
        yesterday = now - timedelta(days=1)
        hour_ago = now - timedelta(hours=1)
        
        hot_wallets_24h = [w for w in wallets if w.get('discovered_at') and date_parser.parse(w['discovered_at']) > yesterday]
        hot_wallets_1h = [w for w in wallets if w.get('discovered_at') and date_parser.parse(w['discovered_at']) > hour_ago]
        
        # Get trending tokens
        trending_tokens = list(db.minute_rank_snapshots.find({}).sort("timestamp", -1).limit(20))
        
        # ML insights
        ml_tags = []
        ml_categories = []
        for wallet in wallets:
            tags = wallet.get('ai_insights', {}).get('ml_tags', [])
            category = wallet.get('ai_insights', {}).get('cluster')
            if tags:
                ml_tags.extend(tags)
            if category is not None:
                ml_categories.append(category)
        
        tag_counter = Counter(ml_tags)
        category_counter = Counter(ml_categories)
        
        # Get latest update time
        latest_wallet = db.wallets.find({}).sort("discovered_at", -1).limit(1)
        latest_wallet_doc = list(latest_wallet)
        last_update = latest_wallet_doc[0].get('discovered_at') if latest_wallet_doc else None
        
        response = sanitize_json({
            "metrics": {
                "total_wallets": total_wallets,
                "profitable_wallets": profitable_wallets,
                "avg_profit": round(avg_profit, 2),
                "avg_smart_score": round(avg_smart_score, 3),
                "avg_risk_score": round(avg_risk_score, 3),
                "hot_wallets_24h_count": len(hot_wallets_24h),
                "hot_wallets_1h_count": len(hot_wallets_1h)
            },
            "topWallets": top_wallets,
            "topRiskyWallets": top_risky_wallets,
            "hotWallets24h": hot_wallets_24h,
            "hotWallets1h": hot_wallets_1h,
            "trendingTokens": trending_tokens,
            "mlTags": dict(tag_counter.most_common(10)),
            "mlCategories": dict(category_counter),
            "lastUpdate": last_update
        })
        
        return response
        
    except Exception as e:
        print(f"[ERROR] Dashboard summary failed: {e}")
        traceback.print_exc()
        return JSONResponse(
            status_code=500, 
            content={"error": f"Failed to get dashboard summary: {str(e)}"}
        )

@app.get("/recent-activity")
def recent_activity():
    try:
        # Get recent wallets (last 24 hours)
        pipeline = [
            {"$match": {"discovered_at": {"$exists": True}}},
            {"$sort": {"discovered_at": -1}},
            {"$limit": 50},
            {"$project": {
                "wallet_address": 1,
                "discovered_at": 1,
                "gmgn_detailed_stats.realized_profit": 1,
                "ai_insights.smart_score": 1,
                "ai_insights.risk_score": 1
            }}
        ]
        
        wallets = list(db.wallets.aggregate(pipeline))
        
        # Get recent token snapshots
        recent_tokens = list(db.minute_rank_snapshots.find({}).sort("timestamp", -1).limit(20))
        
        def parse_ts(e):
            try:
                return date_parser.parse(e.get('discovered_at', ''))
            except:
                return datetime.min
        
        # Sort wallets by timestamp
        wallets.sort(key=parse_ts, reverse=True)
        
        return sanitize_json({
            "recent_wallets": wallets,
            "recent_tokens": recent_tokens
        })
        
    except Exception as e:
        print(f"[ERROR] Recent activity failed: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/mongo-test")
def mongo_test():
    try:
        # Test basic connection
        collections = db.list_collection_names()
        return {"status": "connected", "collections": collections}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/top-tokens")
def get_top_tokens():
    try:
        # Get tokens from minute_rank_snapshots collection
        tokens = list(db.minute_rank_snapshots.find({}).sort("timestamp", -1).limit(100))
        
        def to_float(value):
            if value is None:
                return 0.0
            if isinstance(value, str):
                try:
                    # Remove currency symbols and commas
                    cleaned = value.replace('$', '').replace(',', '').replace(' ', '')
                    return float(cleaned)
                except:
                    return 0.0
            return float(value)
        
        def sanitize_token(token):
            return {
                'address': token.get('address', ''),
                'name': token.get('name', ''),
                'symbol': token.get('symbol', ''),
                'price': to_float(token.get('price', 0)),
                'market_cap': to_float(token.get('market_cap', 0)),
                'liquidity': to_float(token.get('liquidity', 0)),
                'volume_24h': to_float(token.get('volume_24h', 0)),
                'holders': token.get('holders', 0),
                'timestamp': token.get('timestamp', ''),
                'change_24h': to_float(token.get('change_24h', 0)),
                'change_1h': to_float(token.get('change_1h', 0)),
                'fdv': to_float(token.get('fdv', 0)),
                'rug_ratio': to_float(token.get('rug_ratio', 0))
            }
        
        # Process and sanitize the tokens
        sanitized_tokens = [sanitize_token(token) for token in tokens]
        
        return sanitized_tokens
        
    except Exception as e:
        print(f"[ERROR] Top tokens failed: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/tokens/latest-minute-rank")
def get_latest_minute_rank():
    try:
        # Get the latest minute rank snapshot
        latest_snapshot = db.minute_rank_snapshots.find({}).sort("timestamp", -1).limit(20)
        tokens = list(latest_snapshot)
        
        # Convert ObjectId to string for JSON serialization
        for token in tokens:
            token['_id'] = str(token['_id'])
        
        return tokens
        
    except Exception as e:
        print(f"[ERROR] Latest minute rank failed: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/token/{token_address}")
def get_token(token_address: str):
    try:
        # Try to find in tokens collection first
        token = db.tokens.find_one({"address": token_address})
        if not token:
            # Try minute_rank_snapshots
            token = db.minute_rank_snapshots.find_one({"address": token_address})
        
        if token:
            # Convert ObjectId to string
            token['_id'] = str(token['_id'])
            return token
        else:
            return JSONResponse(status_code=404, content={"error": "Token not found"})
            
    except Exception as e:
        print(f"[ERROR] Get token failed: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# Disabled endpoints that would trigger data collection
@app.post("/run-discovery")
def run_discovery():
    return JSONResponse(
        status_code=503, 
        content={"error": "Data collection disabled. Run from local PC instead."}
    )

@app.post("/copytrade-analyze")
def copytrade_analyze(data: dict = Body(...)):
    return JSONResponse(
        status_code=503, 
        content={"error": "Copytrade analysis disabled. Feature coming soon."}
    )

@app.post("/ml-process")
def ml_process():
    return JSONResponse(
        status_code=503, 
        content={"error": "ML processing disabled. Run from local PC instead."}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080) 