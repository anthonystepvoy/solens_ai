from dotenv import load_dotenv
import os

# Load environment variables - try multiple paths for different deployment scenarios
env_paths = ['../.env', '.env', './.env']
for env_path in env_paths:
    if os.path.exists(env_path):
        load_dotenv(dotenv_path=env_path)
        break

from fastapi import FastAPI, Request, BackgroundTasks, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
import json
import os
import subprocess
import io
import ssl
import pandas as pd
from datetime import datetime, timedelta
import traceback
import math
import numpy as np
from dateutil import parser as date_parser
from pymongo import MongoClient
import random
import asyncio
import threading
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from collections import Counter

app = FastAPI(title="Solens AI API", version="1.0.0")

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
MONGO_URI = os.environ.get('MONGO_URI')

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=10000,
    maxPoolSize=10,
    retryWrites=True,
    w='majority'
)
db = client["solens_ai"]

# Background scheduler for automatic discovery
scheduler = BackgroundScheduler()

@app.get("/")
def read_root():
    return {"message": "Backend API is running!"}

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

@app.post("/run-discovery")
def run_discovery():
    script_path = os.path.join(os.path.dirname(__file__), '../backend/scrapers/gmgn_coins_traders.js')
    env = os.environ.copy()
    env["FIREBASE_SERVICE_ACCOUNT_KEY"] = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '../config/solensai-service-account.json')
    )
    try:
        # Use UTF-8 encoding to handle Unicode characters properly
        result = subprocess.run(
            ['node', script_path],
            capture_output=True, 
            text=True, 
            encoding='utf-8',
            errors='replace',  # Replace problematic characters instead of failing
            check=False, 
            env=env
        )
        
        # Print output to backend terminal for real-time feedback
        print("--- Discovery Script Output ---")
        print(result.stdout)
        print("--- Discovery Script Errors (if any) ---")
        print(result.stderr)
        print("---------------------------------")
        
        return {
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

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

@app.post("/copytrade-analyze")
def copytrade_analyze(data: dict = Body(...)):
    wallet_address = data.get('wallet_address')
    if not wallet_address:
        return PlainTextResponse("wallet_address is required", status_code=400)
    script_path = os.path.join(os.path.dirname(__file__), '../backend/scrapers/copy_trader_analyzer.py')
    env = os.environ.copy()
    print("[DEBUG] HELIUS_API_KEY in env:", env.get("HELIUS_API_KEY"))
    print("[DEBUG] Current working directory:", os.getcwd())
    try:
        result = subprocess.run(
            ['python', script_path, wallet_address],
            capture_output=True,
            text=True,
            env=env,
            timeout=120
        )
        if result.returncode == 0:
            try:
                return JSONResponse(json.loads(result.stdout))
            except Exception:
                return PlainTextResponse(result.stdout, status_code=200)
        else:
            return PlainTextResponse(result.stderr or "Script error", status_code=500)
    except Exception as e:
        return PlainTextResponse(str(e), status_code=500)

@app.post("/ml-process")
def ml_process():
    script_path = os.path.join(os.path.dirname(__file__), '../backend/scrapers/ml_processor.py')
    env = os.environ.copy()
    env["FIREBASE_SERVICE_ACCOUNT_KEY_PATH"] = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '../config/solensai-service-account.json')
    )
    try:
        result = subprocess.run(
            ['python', script_path],
            capture_output=True, 
            text=True, 
            encoding='utf-8',
            errors='replace',
            check=False, 
            env=env
        )
        return {
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/dashboard-summary")
def dashboard_summary():
    try:
        client.admin.command('ping')
    except Exception as db_error:
        print(f"[ERROR] MongoDB connection failed: {db_error}")
        return JSONResponse(status_code=500, content={"error": "Database connection failed"})

    wallets = list(db.wallets.find({}))
    latest_tokens = list(db.minute_rank_snapshots.find({}).sort("retrieved_at", -1).limit(20))

    # --- NEW: Helper function for safe normalization ---
    def normalize(values):
        valid_values = [v for v in values if v is not None]
        if not valid_values: return [0.0] * len(values)
        min_val, max_val = min(valid_values), max(valid_values)
        if max_val == min_val: return [0.0] * len(values)
        return [((v - min_val) / (max_val - min_val)) if v is not None else 0.0 for v in values]

    # --- UPGRADED RANKING LOGIC (GMGN DATA ONLY) ---

    # 1. Top Profitable Wallets (filtered for 'great' wallets, fallback if empty)
    great_wallets = [
        w for w in wallets
        if w.get('gmgn_detailed_stats', {}).get('pnl_7d', 0) > 0
        and w.get('gmgn_detailed_stats', {}).get('winrate', 0) > 0.5
        and w.get('ai_insights', {}).get('overall_smart_score', 0) > 0.5
        and (w.get('gmgn_detailed_stats', {}).get('buy_7d', 0) + w.get('gmgn_detailed_stats', {}).get('sell_7d', 0)) >= 10
    ]
    if not great_wallets:
        # Fallback: show top 5 by smart score, no filters
        great_wallets = sorted(
            [w for w in wallets if w.get('ai_insights', {}).get('overall_smart_score')],
            key=lambda w: w['ai_insights']['overall_smart_score'], reverse=True
        )[:5]
    top_wallets_sorted = sorted(
        great_wallets,
        key=lambda w: w['ai_insights']['overall_smart_score'], reverse=True)
    
    top_wallets_summary = [{
        "address": w.get('_id'),
        "pnl_7d": f"{w.get('gmgn_detailed_stats', {}).get('pnl_7d', 0):.2f}%",
        "winRate": f"{w.get('gmgn_detailed_stats', {}).get('winrate', 0) * 100:.0f}%",
        "smartScore": f"{w.get('ai_insights', {}).get('overall_smart_score', 0) * 100:.0f}",
        "riskScore": f"{w.get('ai_insights', {}).get('risk_score', 0) * 100:.0f}",
        "ml_tags": w.get('ai_insights', {}).get('tags_ml', [])
    } for w in top_wallets_sorted[:20]]

    # 2. Hot Wallets 1H (use 1 hour stats)
    hot_wallets_candidates = [w for w in wallets if w.get('gmgn_detailed_stats')]
    trades_1h_values = [w.get('gmgn_detailed_stats', {}).get('buy_1h', 0) + w.get('gmgn_detailed_stats', {}).get('sell_1h', 0) for w in hot_wallets_candidates]
    pnl_1h_values = [w.get('gmgn_detailed_stats', {}).get('pnl_1h') for w in hot_wallets_candidates]
    norm_trades_1h = normalize(trades_1h_values)
    norm_pnl_1h = normalize(pnl_1h_values)
    for i, w in enumerate(hot_wallets_candidates):
        w['hot_score_1h'] = (norm_trades_1h[i] * 0.6) + (norm_pnl_1h[i] * 0.4)
        w['trades_1h'] = trades_1h_values[i]
        w['pnl_1h'] = pnl_1h_values[i] if pnl_1h_values[i] is not None else 0
    filtered_hot_wallets_1h = [w for w in hot_wallets_candidates if w['trades_1h'] >= 5 and w['pnl_1h'] > 0]
    if not filtered_hot_wallets_1h:
        filtered_hot_wallets_1h = [w for w in hot_wallets_candidates if w['trades_1h'] > 0]
        filtered_hot_wallets_1h = sorted(filtered_hot_wallets_1h, key=lambda w: w['hot_score_1h'], reverse=True)[:5]
    else:
        filtered_hot_wallets_1h = sorted(filtered_hot_wallets_1h, key=lambda w: w['hot_score_1h'], reverse=True)[:5]
    hot_wallets_1h = [{
        "address": w.get('_id'),
        "trades_1h": w['trades_1h'],
        "pnl_1h": f"{w['pnl_1h']:.2f}%"
    } for w in filtered_hot_wallets_1h]

    # 3. Top Risky Wallets (by ML risk_score, only if > 0, and stricter filters)
    risky_wallets_sorted = sorted(
        [w for w in wallets if w.get('ai_insights', {}).get('risk_score', 0) > 0
         and w.get('gmgn_detailed_stats', {}).get('pnl_7d', 0) > 0
         and w.get('gmgn_detailed_stats', {}).get('winrate', 0) > 0.5
         and (w.get('gmgn_detailed_stats', {}).get('buy_7d', 0) + w.get('gmgn_detailed_stats', {}).get('sell_7d', 0)) >= 10],
        key=lambda w: w['ai_insights']['risk_score'], reverse=True)
    top_risky_wallets_summary = [{
        "address": w.get('_id'),
        "pnl_7d": f"{w.get('gmgn_detailed_stats', {}).get('pnl_7d', 0):.2f}%",
        "winRate": f"{w.get('gmgn_detailed_stats', {}).get('winrate', 0) * 100:.0f}%",
        "smartScore": f"{w.get('ai_insights', {}).get('overall_smart_score', 0) * 100:.0f}",
        "riskScore": f"{w.get('ai_insights', {}).get('risk_score', 0) * 100:.0f}",
        "ml_tags": w.get('ai_insights', {}).get('tags_ml', [])
    } for w in risky_wallets_sorted[:5]]

    # 4. ML Categories (top 5 most common tags_ml)
    all_tags = []
    for w in wallets:
        tags = w.get('ai_insights', {}).get('tags_ml', [])
        if tags:
            all_tags.extend(tags)
    tag_counts = Counter(all_tags)
    ml_categories = [tag for tag, _ in tag_counts.most_common(5)]

    # Trending Tokens (top 5 by market cap from latest 1-minute rank)
    trending_tokens_summary = []
    if latest_tokens:
        sorted_tokens = sorted(latest_tokens, key=lambda t: t.get('market_cap', 0), reverse=True)
        for t in sorted_tokens[:5]:
            trending_tokens_summary.append({
                "token": t.get('symbol', 'N/A'),
                "market_cap": f"${t.get('market_cap', 0):,}"
            })

    # Placeholder for metrics, trending tokens, etc.
    metrics = [{"label": "Total Wallets Tracked", "value": len(wallets)}]
    return {
            "metrics": metrics,
        "topWallets": top_wallets_summary,
        "hotWallets1h": hot_wallets_1h,
        "topRiskyWallets": top_risky_wallets_summary,
        "mlCategories": ml_categories,
        "trendingTokens": trending_tokens_summary,
        "mlTags": [],
        "lastUpdate": datetime.utcnow().isoformat(),
        "max_free_wallets": 5,  # For future frontend use
    }

@app.get("/recent-activity")
def recent_activity():
    wallets = []
    for doc in db.wallets.find({}):
        doc['id'] = str(doc['_id'])
        del doc['_id']
        wallets.append(doc)
    tokens = []
    for doc in db.tokens.find({}):
        doc['id'] = str(doc['_id'])
        del doc['_id']
        tokens.append(doc)
    events = []
    for w in wallets:
        created_at = w.get('created_at')
        if created_at:
            events.append({
                'type': 'wallet',
                'description': f"New wallet created: {w.get('id', '')}",
                'timestamp': created_at
            })
    for t in tokens:
        created_at = t.get('created_at')
        if created_at:
            events.append({
                'type': 'token',
                'description': f"New token listed: {t.get('symbol', t.get('token', 'N/A'))}",
                'timestamp': created_at
            })
    for w in wallets:
        trades = w.get('recent_trades', [])
        for tr in trades:
            amount = tr.get('amount', 0)
            if amount and float(amount) > 1000:
                events.append({
                    'type': 'trade',
                    'description': f"Big trade by {w.get('id', '')}: {amount} {tr.get('token', '')}",
                    'timestamp': tr.get('timestamp', '')
                })
    def parse_ts(e):
        try:
            return date_parser.parse(e['timestamp'])
        except Exception:
            return datetime.min
    events = sorted([e for e in events if e['timestamp']], key=parse_ts, reverse=True)[:20]
    return events

@app.get("/mongo-test")
def mongo_test():
    try:
        collections = db.list_collection_names()
        return {"status": "success", "collections": collections}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.get("/top-tokens")
def get_top_tokens():
    try:
        client.admin.command('ping')
    except Exception as db_error:
        return JSONResponse(status_code=500, content={"error": "Database connection failed"})

    # Get latest 1-minute rank tokens for fresh data
    latest_tokens = list(db.minute_rank_snapshots.find({}).sort("retrieved_at", -1).limit(50))
    
    # Helper to safely convert to float, returns 0 if error
    def to_float(value):
        try:
            return float(value)
        except (ValueError, TypeError):
            return 0

    # Sort tokens by different criteria using the latest 1-minute data
    top_by_liquidity = sorted(latest_tokens, key=lambda t: to_float(t.get('liquidity')), reverse=True)[:10]
    top_by_market_cap = sorted(latest_tokens, key=lambda t: to_float(t.get('market_cap')), reverse=True)[:10]
    top_by_holders = sorted(latest_tokens, key=lambda t: to_float(t.get('holder_count', 0)), reverse=True)[:10]

    # Sanitize data for a clean response
    def sanitize_token(token):
        return {
            "address": token.get('address'),
            "symbol": token.get('symbol'),
            "logo": token.get('logo'),
            "liquidity": f"${to_float(token.get('liquidity')):,}",
            "market_cap": f"${to_float(token.get('market_cap')):,}",
            "holder_count": f"{int(to_float(token.get('holder_count', 0))):,}"
        }

    # Get last update time from minute_rank job (more relevant for this endpoint)
    last_update_doc = db.job_status.find_one({"job": "minute_rank"}, sort=[("last_update", -1)])
    if not last_update_doc:
        # Fallback to discovery job if minute_rank not found
        last_update_doc = db.job_status.find_one({"job": "discovery"}, sort=[("last_update", -1)])
    
    last_update = last_update_doc['last_update'].isoformat() if last_update_doc else datetime.utcnow().isoformat()

    return {
        "top_by_liquidity": [sanitize_token(t) for t in top_by_liquidity],
        "top_by_market_cap": [sanitize_token(t) for t in top_by_market_cap],
        "top_by_holders": [sanitize_token(t) for t in top_by_holders],
        "last_update": last_update,
        "data_source": "1-minute_rank_snapshots"
    }

@app.get("/tokens/latest-minute-rank")
def get_latest_minute_rank():
    """
    Returns the most recent batch of tokens from the 1-minute rank snapshot.
    """
    try:
        # Get the 20 most recent tokens (i.e., the latest snapshot)
        latest_tokens = list(db.minute_rank_snapshots.find({})
            .sort("retrieved_at", -1)
            .limit(20)
        )
        results = []
        for doc in latest_tokens:
            doc['id'] = str(doc['_id'])
            del doc['_id']
            results.append(sanitize_json(doc))
        return results
    except Exception as e:
        print("Error in /tokens/latest-minute-rank:", e)
        return []

def run_discovery_automatically():
    """Background function to run discovery automatically"""
    try:
        print(f"[AUTO-DISCOVERY] Starting automatic discovery at {datetime.utcnow()}")
        script_path = os.path.join(os.path.dirname(__file__), '../backend/scrapers/gmgn_coins_traders.js')
        env = os.environ.copy()
        env["FIREBASE_SERVICE_ACCOUNT_KEY_PATH"] = os.path.abspath(
            os.path.join(os.path.dirname(__file__), '../config/solensai-service-account.json')
        )
        
        result = subprocess.run(
            ['node', script_path],
            capture_output=True, 
            text=True, 
            encoding='utf-8',
            errors='replace',
            check=False, 
            env=env
        )
        
        if result.returncode == 0:
            print(f"[AUTO-DISCOVERY] Successfully completed at {datetime.utcnow()}")
            # Update job status
            db.job_status.update_one({"job": "discovery"}, {"$set": {
                "job": "discovery",
                "status": "auto_complete",
                "last_update": datetime.utcnow(),
                "auto_run": True
            }}, upsert=True)

            # --- AUTO RUN ML PROCESSOR ---
            try:
                print("[AUTO-ML] Running ML Processor after discovery...")
                ml_script_path = os.path.join(os.path.dirname(__file__), '../backend/scrapers/ml_processor.py')
                ml_result = subprocess.run(
                    ['python', ml_script_path],
                    capture_output=True,
                    text=True,
                    encoding='utf-8',
                    errors='replace',
                    check=False
                )
                print("--- ML Processor Output ---")
                print(ml_result.stdout)
                print("--- ML Processor Errors (if any) ---")
                print(ml_result.stderr)
                print("---------------------------------")
            except Exception as ml_e:
                print(f"[AUTO-ML] Exception running ML Processor: {ml_e}")
        else:
            print(f"[AUTO-DISCOVERY] Failed with return code {result.returncode}")
            print(f"[AUTO-DISCOVERY] Error: {result.stderr}")
            
    except Exception as e:
        print(f"[AUTO-DISCOVERY] Exception occurred: {e}")

def run_minute_rank_automatically():
    """Background function to fetch 1-minute token rank automatically"""
    try:
        print(f"[AUTO-1MIN-RANK] Starting 1-minute rank fetch at {datetime.utcnow()}")
        script_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'scrapers', 'fetch_rank.js'))
        result = subprocess.run(['node', script_path, 'minute'], capture_output=True, text=True, encoding='utf-8', errors='replace', check=False)
        print(result.stdout)
        print(result.stderr)
    except Exception as e:
        print(f"[AUTO-1MIN-RANK] Exception occurred: {e}")

def run_hourly_rank_automatically():
    try:
        print(f"[AUTO-1HR-RANK] Starting 1-hour rank fetch at {datetime.utcnow()}")
        script_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'scrapers', 'fetch_rank.js'))
        result = subprocess.run(['node', script_path, 'hour'], capture_output=True, text=True, encoding='utf-8', errors='replace', check=False)
        print(result.stdout)
        print(result.stderr)
    except Exception as e:
        print(f"[AUTO-1HR-RANK] Exception occurred: {e}")

def run_hourly_wallet_discovery_automatically():
    try:
        print(f"[AUTO-1HR-WALLET] Starting 1-hour wallet discovery at {datetime.utcnow()}")
        script_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'scrapers', 'discover_wallets_top_1hr.js'))
        print(f"[DEBUG] Resolved script_path for 1hr wallet discovery: {script_path}")
        result = subprocess.run(['node', script_path], capture_output=True, text=True, encoding='utf-8', errors='replace', check=False)
        print(result.stdout)
        print(result.stderr)
    except Exception as e:
        print(f"[AUTO-1HR-WALLET] Exception occurred: {e}")

def run_daily_rank_automatically():
    try:
        print(f"[AUTO-24HR-RANK] Starting 24-hour rank fetch at {datetime.utcnow()}")
        script_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'scrapers', 'fetch_rank.js'))
        result = subprocess.run(['node', script_path, 'day'], capture_output=True, text=True, encoding='utf-8', errors='replace', check=False)
        print(result.stdout)
        print(result.stderr)
    except Exception as e:
        print(f"[AUTO-24HR-RANK] Exception occurred: {e}")

def run_daily_wallet_discovery_automatically():
    try:
        print(f"[AUTO-24HR-WALLET] Starting 24-hour wallet discovery at {datetime.utcnow()}")
        script_path = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'backend', 'scrapers', 'discover_wallets_top_24hr.js'))
        print(f"[DEBUG] Resolved script_path for 24hr wallet discovery: {script_path}")
        result = subprocess.run(['node', script_path], capture_output=True, text=True, encoding='utf-8', errors='replace', check=False)
        print(result.stdout)
        print(result.stderr)
    except Exception as e:
        print(f"[AUTO-24HR-WALLET] Exception occurred: {e}")

def start_scheduler():
    """Start the background scheduler"""
    try:
        # Add the discovery job to run every minute
        scheduler.add_job(
            func=run_discovery_automatically,
            trigger=IntervalTrigger(minutes=1),
            id='auto_discovery',
            name='Automatic Discovery',
            replace_existing=True
        )
        
        # Add the 1-minute rank job to run every minute
        scheduler.add_job(
            func=run_minute_rank_automatically,
            trigger=IntervalTrigger(minutes=1),
            id='auto_minute_rank',
            name='Automatic 1-Minute Rank',
            replace_existing=True
        )

        # 1HR scripts every 10 minutes
        scheduler.add_job(
            func=run_hourly_rank_automatically,
            trigger=IntervalTrigger(minutes=10),
            id='auto_hourly_rank',
            name='Automatic 1-Hour Rank',
            replace_existing=True
        )
        scheduler.add_job(
            func=run_hourly_wallet_discovery_automatically,
            trigger=IntervalTrigger(minutes=10),
            id='auto_hourly_wallet_discovery',
            name='Automatic 1-Hour Wallet Discovery',
            replace_existing=True
        )

        # 24HR scripts every hour
        scheduler.add_job(
            func=run_daily_rank_automatically,
            trigger=IntervalTrigger(hours=1),
            id='auto_daily_rank',
            name='Automatic 24-Hour Rank',
            replace_existing=True
        )
        scheduler.add_job(
            func=run_daily_wallet_discovery_automatically,
            trigger=IntervalTrigger(hours=1),
            id='auto_daily_wallet_discovery',
            name='Automatic 24-Hour Wallet Discovery',
            replace_existing=True
        )
        
        scheduler.start()
        print("[SCHEDULER] Background scheduler started - all jobs scheduled")
    except Exception as e:
        print(f"[SCHEDULER] Failed to start scheduler: {e}")

@app.on_event("startup")
async def startup_event():
    """Start the background scheduler when the app starts"""
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    """Stop the background scheduler when the app shuts down"""
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] Background scheduler stopped")

@app.get("/scheduler-status")
def get_scheduler_status():
    """Get the status of the background scheduler"""
    try:
        jobs = []
        for job in scheduler.get_jobs():
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run_time": str(job.next_run_time) if job.next_run_time else None,
                "trigger": str(job.trigger)
            })
        
        return {
            "scheduler_running": scheduler.running,
            "jobs": jobs,
            "job_count": len(jobs)
                }
    except Exception as e:
        return {"error": str(e)}

@app.post("/scheduler/start")
def start_scheduler_manual():
    """Manually start the scheduler"""
    try:
        if not scheduler.running:
            start_scheduler()
            return {"status": "started", "message": "Scheduler started successfully"}
        else:
            return {"status": "already_running", "message": "Scheduler is already running"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/scheduler/stop")
def stop_scheduler_manual():
    """Manually stop the scheduler"""
    try:
        if scheduler.running:
            scheduler.shutdown()
            return {"status": "stopped", "message": "Scheduler stopped successfully"}
        else:
            return {"status": "not_running", "message": "Scheduler is not running"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/scheduler/run-now")
def run_discovery_now():
    """Manually trigger discovery immediately"""
    try:
        # Run discovery in a separate thread to avoid blocking
        thread = threading.Thread(target=run_discovery_automatically)
        thread.daemon = True
        thread.start()
        return {"status": "triggered", "message": "Discovery started in background"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/scheduler/run-minute-rank-now")
def run_minute_rank_now():
    """Manually trigger 1-minute rank fetch immediately"""
    try:
        # Run 1-minute rank fetch in a separate thread to avoid blocking
        thread = threading.Thread(target=run_minute_rank_automatically)
        thread.daemon = True
        thread.start()
        return {"status": "triggered", "message": "1-minute rank fetch started in background"}
    except Exception as e:
        return {"error": str(e)}

@app.post("/scheduler/run-all-now")
def run_all_now():
    """Manually trigger both discovery and 1-minute rank fetch immediately"""
    try:
        # Run both in separate threads to avoid blocking
        discovery_thread = threading.Thread(target=run_discovery_automatically)
        discovery_thread.daemon = True
        discovery_thread.start()
        
        minute_rank_thread = threading.Thread(target=run_minute_rank_automatically)
        minute_rank_thread.daemon = True
        minute_rank_thread.start()
        
        return {"status": "triggered", "message": "Discovery and 1-minute rank fetch started in background"}
    except Exception as e:
        return {"error": str(e)}

@app.get("/token/{token_address}")
def get_token(token_address: str):
    doc = db.tokens.find_one({"address": token_address})
    if doc:
        doc['id'] = str(doc['_id'])
        del doc['_id']
        return doc
    return JSONResponse(status_code=404, content={"error": "Token not found"})

# Production server configuration
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"Starting server on {host}:{port}")
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=False,  # Disable reload in production
        log_level="info"
    ) 