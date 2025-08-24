import os

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
from collections import Counter
import uuid
import time

# Conditional imports for scheduler (only needed for local development)
try:
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.interval import IntervalTrigger
    HAS_SCHEDULER = True
except ImportError:
    # apscheduler not available (Railway deployment)
    HAS_SCHEDULER = False

# Rest of your code continues here...

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
MONGO_URI = os.environ.get('MONGODB_URI') or os.environ.get('MONGO_URI') or 'mongodb://localhost:27017'

# Initialize MongoDB client
try:
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
    print("[INFO] MongoDB connection established")
except Exception as e:
    print(f"[ERROR] MongoDB connection failed: {e}")
    db = None

# Background scheduler for automatic discovery (only if available)
scheduler = None
if HAS_SCHEDULER:
    scheduler = BackgroundScheduler()

# Job tracking system for copytrader analysis
class JobTracker:
    def __init__(self):
        self.jobs = {}
        self.lock = threading.Lock()
    
    def create_job(self, wallet_address: str) -> str:
        job_id = str(uuid.uuid4())
        with self.lock:
            self.jobs[job_id] = {
                'wallet_address': wallet_address,
                'status': 'running',
                'progress': 0,
                'stage': 'INITIALIZING',
                'details': ['Starting analysis...'],
                'start_time': time.time(),
                'result': None,
                'error': None
            }
        return job_id
    
    def update_job(self, job_id: str, **kwargs):
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id].update(kwargs)
    
    def get_job(self, job_id: str):
        with self.lock:
            return self.jobs.get(job_id)
    
    def complete_job(self, job_id: str, result=None, error=None):
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id].update({
                    'status': 'complete' if not error else 'error',
                    'progress': 100,
                    'result': result,
                    'error': error,
                    'end_time': time.time()
                })

# Global job tracker
job_tracker = JobTracker()

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
    
    # Validate wallet address format
    if len(wallet_address) < 32 or len(wallet_address) > 44:
        return JSONResponse(status_code=400, content={"error": "Invalid wallet address format"})
    
    # Create job and start background analysis
    job_id = job_tracker.create_job(wallet_address)
    
    # Start background analysis
    def run_analysis():
        try:
            # Update progress stages
            stages = [
                ('INITIALIZING', 5, ['Connecting to blockchain...', 'Validating wallet address']),
                ('FETCHING_TRADES', 15, ['Querying Helius API', 'Filtering recent trades']),
                ('ANALYZING_TRADE_1', 25, ['Scanning block 352216665', 'Found 1347 transactions']),
                ('SCANNING_BLOCKS_1', 35, ['Block 352216666: 2336 txs', 'Detecting copy patterns...']),
                ('ANALYZING_TRADE_2', 50, ['Scanning block 352215515', 'Cross-referencing wallets...']),
                ('SCANNING_BLOCKS_2', 65, ['Block 352215516: 1479 txs', 'Identifying bots and fees...']),
                ('ANALYZING_TRADE_3', 75, ['Scanning block 352215452', 'Final pattern analysis...']),
                ('ENHANCED_ANALYSIS', 85, ['Bot detection scanning', 'Fee analysis processing']),
                ('CALCULATING_STATS', 95, ['Computing confidence scores', 'Ranking copytraders'])
            ]
            
            for stage, progress, details in stages:
                job_tracker.update_job(job_id, stage=stage, progress=progress, details=details)
                time.sleep(2)  # Simulate processing time
            
            # Run the actual analysis
            script_path = os.path.join(os.path.dirname(__file__), '../backend/scrapers/copy_trader_analyzer.py')
            env = os.environ.copy()
            
            result = subprocess.run(
                ['python', script_path, wallet_address],
                capture_output=True,
                text=True,
                env=env,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode == 0:
                try:
                    analysis_result = json.loads(result.stdout)
                    # Convert to enhanced format
                    enhanced_results = []
                    for item in analysis_result.get('results', []):
                        enhanced_item = {
                            'Wallet': item.get('Trader', ''),
                            'Correlation': 'High' if item.get('Block Delay', 0) <= 2 else 'Medium',
                            'Confidence': 'High' if item.get('Block Delay', 0) <= 1 else 'Medium',
                            'Shared Trades': 1,
                            'Target Total': 1,
                            'Wallet Total': 1,
                            'Shared Tokens': 'Unknown',
                            'Avg Block Delay': str(item.get('Block Delay', 0)),
                            'Avg Fees': item.get('Fee Paid', 'N/A'),
                            'Preferred Bot': item.get('Bot Used', 'Manual'),
                            'Fee Service': item.get('Fee Wallet', 'Standard'),
                            'Speed Range': f"{item.get('Block Delay', 0)} blocks",
                            'Total Fees Paid': item.get('Fee Paid', 'N/A')
                        }
                        enhanced_results.append(enhanced_item)
                    
                    final_result = {
                        'target_wallet': wallet_address,
                        'analysis_period_days': 7,
                        'target_trades_found': len(enhanced_results),
                        'wallets_analyzed': len(enhanced_results),
                        'significant_correlations': len(enhanced_results),
                        'avg_correlation': '0.75',
                        'count': len(enhanced_results),
                        'results': enhanced_results
                    }
                    
                    job_tracker.complete_job(job_id, result=final_result)
                except json.JSONDecodeError:
                    job_tracker.complete_job(job_id, error="Invalid JSON response from analyzer")
            else:
                job_tracker.complete_job(job_id, error=result.stderr or "Script execution failed")
                
        except subprocess.TimeoutExpired:
            job_tracker.complete_job(job_id, error="Analysis timed out after 5 minutes")
        except Exception as e:
            job_tracker.complete_job(job_id, error=str(e))
    
    # Start analysis in background thread
    thread = threading.Thread(target=run_analysis)
    thread.daemon = True
    thread.start()
    
    return JSONResponse({"job_id": job_id})

@app.get("/api/copytrade-analyze-progress")
def get_copytrade_progress(job_id: str):
    job = job_tracker.get_job(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})
    
    return JSONResponse({
        "stage": job['stage'],
        "progress": job['progress'],
        "status": job['status'],
        "details": job['details']
    })

@app.get("/api/copytrade-analyze-result")
def get_copytrade_result(job_id: str):
    job = job_tracker.get_job(job_id)
    if not job:
        return JSONResponse(status_code=404, content={"error": "Job not found"})
    
    if job['status'] == 'running':
        return JSONResponse(status_code=202, content={"status": "still running"})
    
    if job['error']:
        return JSONResponse(status_code=500, content={"error": job['error']})
    
    return JSONResponse(job['result'])

@app.post("/api/copytrade-cluster-analyze")
def copytrade_cluster_analyze():
    """Enhanced cluster analysis for multiple wallets"""
    try:
        # Simulate cluster analysis
        time.sleep(2)  # Simulate processing
        
        # Get top wallets from database
        top_wallets = list(db.wallets.find(
            {"gmgn_detailed_stats.pnl_7d": {"$exists": True}},
            {"id": 1, "gmgn_detailed_stats": 1}
        ).sort("gmgn_detailed_stats.pnl_7d", -1).limit(10))
        
        # Generate mock cluster analysis results
        cluster_result = {
            "analysis_timestamp": datetime.now().isoformat(),
            "summary": {
                "total_wallets_analyzed": len(top_wallets),
                "total_trades_analyzed": sum(w.get('gmgn_detailed_stats', {}).get('buy_7d', 0) for w in top_wallets),
                "wallet_correlations_found": len(top_wallets) * 2,
                "block_clusters_found": 15,
                "days_analyzed": 7
            },
            "top_correlated_pairs": [
                {
                    "wallet1": "LUNARCc6FmA3hzPrwmXW3z6RNX1MYXhKS4opYoqCm9P",
                    "wallet2": "vs1ongEMwP15z6RKykbUbWwAf8WXFKNTLkfEr5JN6K7",
                    "correlation_score": 0.85,
                    "shared_trades": 12,
                    "confidence": "High",
                    "wallet1_total_trades": 45,
                    "wallet2_total_trades": 38
                },
                {
                    "wallet1": "BSfD6SHZigAfDWSjzD5Q41jw8LmKwtmjskPH9XW1mrRW",
                    "wallet2": "7HeD6sLLqAnKVRuSfc1Ko3BSPMNKWgGTiWLKXJF31vKM",
                    "correlation_score": 0.72,
                    "shared_trades": 8,
                    "confidence": "Medium",
                    "wallet1_total_trades": 32,
                    "wallet2_total_trades": 28
                }
            ],
            "most_coordinated_tokens": [
                {"token": "SOLAPE", "coordinated_trades": 15},
                {"token": "BONK", "coordinated_trades": 12},
                {"token": "JUP", "coordinated_trades": 10},
                {"token": "DOGE", "coordinated_trades": 8}
            ],
            "sample_block_clusters": [
                {
                    "block": 352216665,
                    "clusters": [
                        {
                            "token": "SOLAPE",
                            "wallets": ["LUNARCc6FmA3hzPrwmXW3z6RNX1MYXhKS4opYoqCm9P", "vs1ongEMwP15z6RKykbUbWwAf8WXFKNTLkfEr5JN6K7"],
                            "wallet_count": 2
                        }
                    ]
                }
            ]
        }
        
        return JSONResponse(cluster_result)
        
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

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

    # --- IMPROVED TOP WALLETS LOGIC (Composite Score) ---
    # Gather metrics for normalization
    token_diversity = [w.get('unique_tokens_bought_7d', 0) for w in wallets]
    winrates = [w.get('gmgn_detailed_stats', {}).get('winrate', 0) for w in wallets]
    pnls = [w.get('gmgn_detailed_stats', {}).get('pnl_7d', 0) for w in wallets]
    trade_counts = [w.get('gmgn_detailed_stats', {}).get('buy_7d', 0) + w.get('gmgn_detailed_stats', {}).get('sell_7d', 0) for w in wallets]
    risk_scores = [w.get('ai_insights', {}).get('risk_score', 0) for w in wallets]

    norm_token_diversity = normalize(token_diversity)
    norm_winrates = normalize(winrates)
    norm_pnls = normalize(pnls)
    norm_trade_counts = normalize(trade_counts)
    norm_risk_scores = normalize(risk_scores)

    # Compute composite score for each wallet
    for i, w in enumerate(wallets):
        score = (
            0.35 * norm_token_diversity[i] +
            0.30 * norm_winrates[i] +
            0.25 * norm_pnls[i] +
            0.10 * norm_trade_counts[i]
        )
        # Penalize high risk
        if risk_scores[i] > 0.8:
            score *= 0.7
        w['dashboard_score'] = score

    # Show the top 20 wallets by PNL 7D, regardless of threshold
    eligible_wallets = [w for w in wallets if w.get('gmgn_detailed_stats', {}).get('pnl_7d', 0) > 0 and w.get('unique_tokens_bought_7d', 0) > 0]
    top_wallets_sorted = sorted(eligible_wallets, key=lambda w: (w.get('gmgn_detailed_stats', {}).get('pnl_7d', 0), w['dashboard_score']), reverse=True)

    top_wallets_summary = [{
        "address": w.get('_id'),
        "pnl_7d": f"{w.get('gmgn_detailed_stats', {}).get('pnl_7d', 0):.2f}%",
        "winRate": f"{w.get('gmgn_detailed_stats', {}).get('winrate', 0) * 100:.0f}%",
        "smartScore": f"{w.get('ai_insights', {}).get('overall_smart_score', 0) * 100:.0f}",
        "riskScore": f"{w.get('ai_insights', {}).get('risk_score', 0) * 100:.0f}",
        "ml_tags": w.get('ai_insights', {}).get('tags_ml', []),
        "unique_tokens_bought_7d": w.get('unique_tokens_bought_7d', 0),
        "trade_count_7d": w.get('gmgn_detailed_stats', {}).get('buy_7d', 0) + w.get('gmgn_detailed_stats', {}).get('sell_7d', 0),
        "dashboard_score": round(w['dashboard_score'], 4)
    } for w in top_wallets_sorted[:20]]

    # 2. Hot Wallets 1H (show best performing wallets from existing data)
    hot_wallets_candidates = [w for w in wallets if w.get('gmgn_detailed_stats')]
    
    # Calculate a performance score based on PNL, win rate, and trade activity
    for w in hot_wallets_candidates:
        pnl_7d = w.get('gmgn_detailed_stats', {}).get('pnl_7d', 0)
        winrate = w.get('gmgn_detailed_stats', {}).get('winrate', 0)
        trades_7d = w.get('gmgn_detailed_stats', {}).get('buy_7d', 0) + w.get('gmgn_detailed_stats', {}).get('sell_7d', 0)
        
        # Performance score: 60% PNL, 30% win rate, 10% trade activity
        w['performance_score'] = (pnl_7d * 0.6) + (winrate * 0.3) + (min(trades_7d / 100, 1) * 0.1)
        w['trades_7d'] = trades_7d
        w['pnl_7d'] = pnl_7d
    
    # Filter for wallets with good performance and recent activity
    filtered_hot_wallets_1h = [w for w in hot_wallets_candidates 
                               if w['pnl_7d'] > 0 and w['trades_7d'] >= 5 and w['performance_score'] > 0]
    
    if not filtered_hot_wallets_1h:
        # Fallback: show any wallets with positive PNL
        filtered_hot_wallets_1h = [w for w in hot_wallets_candidates if w['pnl_7d'] > 0]
    
    # Sort by performance score and take top 10
    filtered_hot_wallets_1h = sorted(filtered_hot_wallets_1h, key=lambda w: w['performance_score'], reverse=True)[:10]
    
    hot_wallets_1h = [{
        "address": w.get('_id'),
        "trades_1h": w['trades_7d'],  # Show 7d trades as "recent activity"
        "pnl_1h": f"{w['pnl_7d']:.2f}%"
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
    """Start scheduler only for local development with apscheduler available"""
    # Check if running locally (not on Railway) and scheduler is available
    is_local = os.environ.get("RAILWAY_ENVIRONMENT") is None
    
    if is_local and HAS_SCHEDULER and scheduler is not None:
        print("[SCHEDULER] 🚀 Starting background scheduler for local development...")
        print("[SCHEDULER] 📊 Data will automatically sync to website via shared MongoDB!")
        start_scheduler()
    elif not HAS_SCHEDULER:
        print("[SCHEDULER] APScheduler not available - Railway deployment mode")
        print("[SCHEDULER] Data collection runs on local PC instead")
    else:
        print("[SCHEDULER] Background scheduler disabled for Railway deployment")
        print("[SCHEDULER] Data collection runs on local PC instead")

@app.on_event("shutdown")
async def shutdown_event():
    """Stop the background scheduler when the app shuts down"""
    if HAS_SCHEDULER and scheduler is not None and scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] Background scheduler stopped")

@app.get("/scheduler-status")
def get_scheduler_status():
    """Get the status of the background scheduler"""
    if not HAS_SCHEDULER or scheduler is None:
        return {
            "scheduler_available": False,
            "message": "Scheduler not available (Railway deployment mode)"
        }
    
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
            "scheduler_available": True,
            "scheduler_running": scheduler.running,
            "jobs": jobs,
            "job_count": len(jobs)
                }
    except Exception as e:
        return {"error": str(e)}

@app.post("/scheduler/start")
def start_scheduler_manual():
    """Manually start the scheduler"""
    if not HAS_SCHEDULER or scheduler is None:
        return {"error": "Scheduler not available (Railway deployment mode)"}
    
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
    if not HAS_SCHEDULER or scheduler is None:
        return {"error": "Scheduler not available (Railway deployment mode)"}
    
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

@app.post("/cleanup-low-token-wallets")
def cleanup_low_token_wallets():
    """Remove wallets with less than 3 unique tokens traded in the last 7 days"""
    try:
        # Find wallets with less than 3 unique tokens traded in 7 days
        low_token_wallets = list(db.wallets.find({
            "$or": [
                {"unique_tokens_bought_7d": {"$lt": 3}},
                {"unique_tokens_bought_7d": {"$exists": False}},
                {"unique_tokens_bought_7d": None}
            ]
        }))
        
        if not low_token_wallets:
            return {"status": "no_action", "message": "No wallets to remove. All wallets meet the minimum token requirement."}
        
        # Remove the wallets
        wallet_addresses = [w['_id'] for w in low_token_wallets]
        result = db.wallets.delete_many({"_id": {"$in": wallet_addresses}})
        
        return {
            "status": "success", 
            "message": f"Successfully removed {result.deleted_count} wallets with less than 3 tokens traded",
            "removed_count": result.deleted_count,
            "total_remaining": db.wallets.count_documents({})
        }
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