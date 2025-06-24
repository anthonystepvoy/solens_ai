from datetime import datetime

@app.post("/run-onchain-analysis")
def run_onchain_analysis():
    script_path = os.path.join(os.path.dirname(__file__), '../backend/python_scripts/on_chain_analyzer.py')
    try:
        result = subprocess.run(
            ['python', script_path],
            capture_output=True, text=True, check=False
        )
        # Write job status to MongoDB
        db.job_status.update_one(
            {"job": "onchain_analyzer"},
            {"$set": {
                "last_run": datetime.utcnow().isoformat(),
                "status": "success" if result.returncode == 0 else "error",
                "stdout": result.stdout,
                "stderr": result.stderr,
                "returncode": result.returncode
            }},
            upsert=True
        )
        return {
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        }
    except Exception as e:
        db.job_status.update_one(
            {"job": "onchain_analyzer"},
            {"$set": {
                "last_run": datetime.utcnow().isoformat(),
                "status": "error",
                "stdout": '',
                "stderr": str(e),
                "returncode": -1
            }},
            upsert=True
        )
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/dashboard-summary")
def dashboard_summary():
    print("[DEBUG] /dashboard-summary endpoint called")
    try:
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
        print(f"[DEBUG] /dashboard-summary loaded {len(wallets)} wallets and {len(tokens)} tokens")
        # Get last update time from job_status/discovery or job_status/onchain_analyzer
        last_update = None
        job_times = {}
        for job in ['discovery', 'onchain_analyzer', 'ml_processor']:
            doc = db.job_status.find_one({"job": job})
            if doc and doc.get('last_run'):
                t = doc['last_run']
                job_times[job] = t
                if not last_update or t > last_update:
                    last_update = t
        # ... rest of summary logic ...
        result = {
            # ... existing summary fields ...
            "lastUpdate": last_update,
            "jobTimes": job_times,
        }
        return result
    except Exception as e:
        print(f"[ERROR] /dashboard-summary exception: {e}")
        raise 