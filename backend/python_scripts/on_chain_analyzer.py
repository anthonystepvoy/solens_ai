import sys
if sys.platform == "win32":
    import os
    os.system('chcp 65001')
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

import os
import requests
import json
import time
from datetime import datetime, timedelta
from collections import defaultdict
import asyncio
from solana.rpc.async_api import AsyncClient
from solders.pubkey import Pubkey
from solders.signature import Signature
from pymongo import MongoClient

# Ensure FIREBASE_SERVICE_ACCOUNT_KEY_PATH is set
if not os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH"):
    os.environ["FIREBASE_SERVICE_ACCOUNT_KEY_PATH"] = r"C:/Users/HomePC/Documents/Code Togheter/solens_ai/config/solensai-service-account.json"

# --- CONFIGURATION ---
script_dir = os.path.dirname(__file__)
config_path = os.path.join(script_dir, 'config.json')

# Try to load config, with fallback to environment variable
HELIUS_API_KEY = None
try:
    if os.path.exists(config_path):
        with open(config_path) as f:
            config = json.load(f)
        HELIUS_API_KEY = config.get("helius_api_key")
    else:
        print(f"Config file not found at {config_path}, trying environment variable...")
except Exception as e:
    print(f"Error reading config file: {e}")

# Fallback to environment variable
if not HELIUS_API_KEY:
    HELIUS_API_KEY = os.environ.get("HELIUS_API_KEY")
    if HELIUS_API_KEY:
        print("Using HELIUS_API_KEY from environment variable")
    else:
        # Use a default key for testing (you should replace this with your actual key)
        HELIUS_API_KEY = "your_helius_api_key_here"
        print("WARNING: Using default Helius API key. Please set HELIUS_API_KEY environment variable or create config.json")

if not HELIUS_API_KEY or HELIUS_API_KEY == "your_helius_api_key_here":
    print("ERROR: No valid Helius API key found. Please set HELIUS_API_KEY environment variable or create config.json")
    sys.exit(1)

HELIUS_API_URL = "https://api.helius.xyz"
HELIUS_RPC_URL = f"https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"
WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112"

# MongoDB Atlas connection with timeout
MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000, connectTimeoutMS=10000)
db = client["solens_ai"]

# --- ANALYSIS CONFIGURATION ---
MAX_SIGNATURES_PER_WALLET = 5000  # Limit to prevent infinite loops
MAX_TRANSACTION_BATCHES = 50  # Limit transaction processing batches
REQUEST_TIMEOUT = 30  # seconds

# --- HELPER FUNCTIONS ---

async def get_transactions_in_time_window(address, days_history=7, ui_callback=None):
    """
    Fetches all transactions for a given wallet within a specified time window.
    This version uses the more reliable method of fetching signatures and then parsing them.
    """
    if ui_callback: ui_callback(f"  Fetching transactions from the last {days_history} days for {address[:6]}...")

    all_transactions = []
    before_signature = None
    start_time_dt = datetime.utcnow() - timedelta(days=days_history)
    start_time_unix = int(start_time_dt.timestamp())
    
    # Add safety counters
    signature_fetch_count = 0
    max_signatures = MAX_SIGNATURES_PER_WALLET

    # Step 1: Fetch all relevant transaction signatures using the RPC client
    all_signatures = []
    try:
        wallet_pubkey = Pubkey.from_string(address)
        async with AsyncClient(HELIUS_RPC_URL) as client:
            while signature_fetch_count < max_signatures:
                signature_fetch_count += 1
                
                if ui_callback and signature_fetch_count % 10 == 0:
                    ui_callback(f"    Fetched {len(all_signatures)} signatures so far...")
                
                # Add timeout to prevent hanging
                try:
                    sig_result = await asyncio.wait_for(
                        client.get_signatures_for_address(wallet_pubkey, limit=1000, before=before_signature),
                        timeout=REQUEST_TIMEOUT
                    )
                except asyncio.TimeoutError:
                    if ui_callback: ui_callback(f"    Timeout fetching signatures, stopping at {len(all_signatures)} signatures")
                    break
                
                if not sig_result.value:
                    if ui_callback: ui_callback(f"    No more signatures found")
                    break # No more signatures

                signatures_batch = sig_result.value
                all_signatures.extend(signatures_batch)

                last_sig_in_batch = signatures_batch[-1]
                if last_sig_in_batch.block_time and last_sig_in_batch.block_time < start_time_unix:
                    if ui_callback: ui_callback(f"  Reached end of time window ({days_history} days).")
                    break

                before_signature = last_sig_in_batch.signature
                if not before_signature or len(signatures_batch) < 1000:
                    if ui_callback: ui_callback(f"    Reached end of wallet history")
                    break # Reached the end of the wallet's history
                
                # Add small delay to prevent rate limiting
                await asyncio.sleep(0.1)
    
    except Exception as e:
        msg = f"  An unexpected error occurred while fetching signatures for {address[:6]}: {repr(e)}"
        if ui_callback: ui_callback(msg)
        else: print(msg)
        return []

    # Step 2: Filter signatures to be strictly within the desired time window
    signatures_in_window_str = [
        str(s.signature) for s in all_signatures
        if s.block_time and s.block_time >= start_time_unix
    ]

    if not signatures_in_window_str:
        if ui_callback: ui_callback(f"  Fetched 0 transactions from the last {days_history} days.")
        return []

    # Step 3: Parse the transactions from the collected signatures in batches
    url = f"{HELIUS_API_URL}/v0/transactions/?api-key={HELIUS_API_KEY}"
    
    batch_count = 0
    for i in range(0, len(signatures_in_window_str), 100):
        if batch_count >= MAX_TRANSACTION_BATCHES:
            if ui_callback: ui_callback(f"    Reached maximum batch limit ({MAX_TRANSACTION_BATCHES}), stopping")
            break
            
        batch_count += 1
        batch_signatures = signatures_in_window_str[i:i + 100]
        
        if ui_callback and batch_count % 5 == 0:
            ui_callback(f"    Processing batch {batch_count}/{min(len(signatures_in_window_str)//100 + 1, MAX_TRANSACTION_BATCHES)}")
        
        try:
            # Using synchronous requests here for simplicity, as in discover_traders
            response = requests.post(url, json={"transactions": batch_signatures}, timeout=REQUEST_TIMEOUT)
            response.raise_for_status()
            parsed_txs = response.json()
            all_transactions.extend(parsed_txs)
        except requests.RequestException as e:
            msg = f"    Error parsing transaction batch for {address[:6]}: {e}"
            if ui_callback: ui_callback(msg)
            else: print(msg)
            continue # Try next batch
        
        # Add small delay to prevent rate limiting
        time.sleep(0.1)

    if ui_callback: ui_callback(f"  Fetched {len(all_transactions)} transactions from the last {days_history} days.")
    return all_transactions

def calculate_pnl_fifo(swap_transactions, wallet_address, ui_callback=None):
    # This function assumes transactions are sorted OLDEST to NEWEST
    total_pnl_sol, total_volume_sol, winning_trades, losing_trades, incomplete_sells = 0, 0, 0, 0, 0
    token_portfolio = defaultdict(list) # Stores purchase lots: {'amount': float, 'cost_sol': float}
    swaps_by_token = defaultdict(list)

    for tx in swap_transactions:
        # We only care about SWAP transactions that were successful
        if tx.get("type") != "SWAP" or tx.get("transactionError"):
            continue

        transfers = tx.get("tokenTransfers", [])
        if len(transfers) < 2:
            continue
            
        sent_transfer = next((t for t in transfers if t.get("fromUserAccount") == wallet_address), None)
        received_transfer = next((t for t in transfers if t.get("toUserAccount") == wallet_address), None)

        if not sent_transfer or not received_transfer:
            continue

        sent_mint, sent_amount = sent_transfer.get("mint"), sent_transfer.get("tokenAmount")
        received_mint, received_amount = received_transfer.get("mint"), received_transfer.get("tokenAmount")

        if not all([sent_mint, sent_amount, received_mint, received_amount]):
            continue

        is_buy = sent_mint == WRAPPED_SOL_MINT and received_mint != WRAPPED_SOL_MINT
        is_sell = received_mint == WRAPPED_SOL_MINT and sent_mint != WRAPPED_SOL_MINT

        if is_buy:
            buy_token_mint, buy_token_amount, sol_spent = received_mint, received_amount, sent_amount
            total_volume_sol += sol_spent
            # Record the purchase in the portfolio
            token_portfolio[buy_token_mint].append({'amount': buy_token_amount, 'cost_sol': sol_spent})
            swaps_by_token[buy_token_mint].append(tx)
            msg = f"      [BUY] {buy_token_amount:.4f} of {buy_token_mint[:6]} for {sol_spent:.4f} SOL"
            if ui_callback: ui_callback(msg)

        elif is_sell:
            sell_token_mint, sell_token_amount, sol_received = sent_mint, sent_amount, received_amount
            total_volume_sol += sol_received

            # Check if we have any of this token in our portfolio
            if sell_token_mint in token_portfolio and token_portfolio[sell_token_mint]:
                # FIFO: Sell from the oldest lots first
                remaining_to_sell = sell_token_amount
                lot_pnl = 0
                
                while remaining_to_sell > 0 and token_portfolio[sell_token_mint]:
                    lot = token_portfolio[sell_token_mint][0]  # Get the oldest lot
                    lot_amount = lot['amount']
                    lot_cost = lot['cost_sol']
                    
                    if lot_amount <= remaining_to_sell:
                        # Sell the entire lot
                        sold_amount = lot_amount
                        cost_basis = lot_cost
                        token_portfolio[sell_token_mint].pop(0)  # Remove the lot
                    else:
                        # Sell part of the lot
                        sold_amount = remaining_to_sell
                        cost_basis = (lot_cost / lot_amount) * sold_amount
                        lot['amount'] -= sold_amount
                        lot['cost_sol'] -= cost_basis
                    
                    # Calculate PnL for this lot
                    lot_pnl += sol_received * (sold_amount / sell_token_amount) - cost_basis
                    remaining_to_sell -= sold_amount
                
                if lot_pnl > 0:
                    winning_trades += 1
                else:
                    losing_trades += 1
                
                total_pnl_sol += lot_pnl
                swaps_by_token[sell_token_mint].append(tx)
                msg = f"      [SELL] {sell_token_amount:.4f} of {sell_token_mint[:6]} for {sol_received:.4f} SOL (PnL: {lot_pnl:.4f} SOL)"
                if ui_callback: ui_callback(msg)
            else:
                # We're selling a token we don't have in our portfolio (incomplete sell)
                incomplete_sells += 1
                msg = f"      [INCOMPLETE SELL] {sell_token_amount:.4f} of {sell_token_mint[:6]} for {sol_received:.4f} SOL (no buy record)"
                if ui_callback: ui_callback(msg)

    # Calculate win rate
    total_trades = winning_trades + losing_trades
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0

    # Count swaps per token
    token_swap_counts = {token: len(swaps) for token, swaps in swaps_by_token.items()}

    result = {
        'pnl_sol': total_pnl_sol,
        'win_rate': win_rate,
        'winning_trades': winning_trades,
        'losing_trades': losing_trades,
        'incomplete_sells': incomplete_sells, # New metric
        'total_volume_sol': total_volume_sol,
        'swap_count': sum(token_swap_counts.values()), # Total swaps (buy/sell)
        'total_transactions': len(swap_transactions),
        'analysis_period_days': 7
    }

    return result

async def analyze_wallet(wallet_address, days_history=7, ui_callback=None):
    """
    Analyzes a single wallet's trading performance.
    """
    if ui_callback: ui_callback(f"Analyzing wallet {wallet_address[:6]}...")
    
    try:
        # Fetch transactions
        transactions = await get_transactions_in_time_window(wallet_address, days_history, ui_callback)
        
        if not transactions:
            if ui_callback: ui_callback(f"No transactions found for wallet {wallet_address[:6]}")
            return None
        
        # Filter for SWAP transactions only
        swap_transactions = [tx for tx in transactions if tx.get("type") == "SWAP" and not tx.get("transactionError")]
        
        if not swap_transactions:
            if ui_callback: ui_callback(f"No swap transactions found for wallet {wallet_address[:6]}")
            return None
        
        if ui_callback: ui_callback(f"Found {len(swap_transactions)} swap transactions")
        
        # Calculate PnL using FIFO method
        result = calculate_pnl_fifo(swap_transactions, wallet_address, ui_callback)
        result['wallet'] = wallet_address
        
        if ui_callback: ui_callback(f"Analysis complete for {wallet_address[:6]}: PnL={result['pnl_sol']:.4f} SOL, Win Rate={result['win_rate']:.1f}%")
        
        # Update MongoDB with the analysis results
        try:
            # Use the wallet address as the document ID (matching discovery script structure)
            db.wallets.update_one(
                {"_id": wallet_address},  # Use _id field as set by discovery script
                {"$set": {
                    "on_chain_data": result,
                    "updated_at": datetime.utcnow(),
                    "discovered_by": ["OnChain_Analyzer"]
                }},
                upsert=True
            )
            if ui_callback: ui_callback(f"✓ Updated MongoDB for wallet {wallet_address[:6]}")
        except Exception as e:
            if ui_callback: ui_callback(f"✗ Error updating MongoDB for wallet {wallet_address[:6]}: {e}")
        
        return result
        
    except Exception as e:
        if ui_callback: ui_callback(f"✗ Error analyzing wallet {wallet_address[:6]}: {e}")
        return None

async def discover_traders_with_helius(token_address, limit=100, ui_callback=None):
    """
    Discovers recent traders for a specific Solana token using the Helius API.
    1. Fetches recent transaction signatures for the token's mint address.
    2. Parses these transactions to find swaps.
    3. Extracts the trader's wallet (fee payer) from the swap transactions.
    """
    msg = f"  -> Discovering up to {limit} recent traders for token {token_address[:10]}... via Helius"
    if ui_callback: ui_callback(msg)
    else: print(msg)

    # Step 1: Get recent transaction signatures for the token mint
    signatures = []
    try:
        token_pubkey = Pubkey.from_string(token_address)
        async with AsyncClient(HELIUS_RPC_URL) as client:
            # Fetch last 1000 signatures, as many won't be swaps.
            sig_result = await client.get_signatures_for_address(token_pubkey, limit=1000)
            signatures = [str(s.signature) for s in sig_result.value]
        
        msg = f"    Found {len(signatures)} recent transaction signatures for the token."
        if ui_callback: ui_callback(msg)
        else: print(msg)
        if not signatures:
             return []

    except Exception as e:
        msg = f"    An unexpected error occurred fetching token signatures: {repr(e)}"
        if ui_callback: ui_callback(msg)
        else: print(msg)
        return []

    # Step 2: Parse transactions to find swaps and identify traders
    trader_wallets = set()
    url = f"{HELIUS_API_URL}/v0/transactions/?api-key={HELIUS_API_KEY}"
    
    # Helius allows up to 100 transactions per request in this endpoint
    for i in range(0, len(signatures), 100):
        if len(trader_wallets) >= limit:
            break
            
        batch_signatures = signatures[i:i + 100]
        try:
            response = requests.post(url, json={"transactions": batch_signatures})
            response.raise_for_status()
            parsed_txs = response.json()

            for tx in parsed_txs:
                if tx.get("type") == "SWAP" and not tx.get("transactionError"):
                    fee_payer = tx.get("feePayer")
                    if fee_payer:
                        trader_wallets.add(fee_payer)
                        if len(trader_wallets) >= limit:
                            break
        
        except requests.RequestException as e:
            msg = f"    Error parsing transaction batch: {e}"
            if ui_callback: ui_callback(msg)
            else: print(msg)
            continue # Try next batch

    unique_wallets = list(trader_wallets)
    msg = f"    Discovered {len(unique_wallets)} unique traders from recent swaps."
    if ui_callback: ui_callback(msg)
    else: print(msg)
    
    return unique_wallets[:limit]

async def main():
    """The main function to orchestrate the wallet analysis."""
    print("\n" + "="*50)
    print("STARTING ON-CHAIN ANALYSIS SCRIPT")
    print("="*50)

    try:
        # Test MongoDB connection first
        print("Testing MongoDB connection...")
        try:
            client.admin.command('ping')
            print("✓ MongoDB connection successful")
        except Exception as e:
            print(f"✗ MongoDB connection failed: {e}")
            return

        # Get all wallet addresses from the database
        wallet_docs = list(db.wallets.find({}))
        if not wallet_docs:
            print("WARNING: No wallets found in the 'wallets' collection in MongoDB. Exiting.")
            return
        
        print(f"Found {len(wallet_docs)} total wallets in database.")
        
        # Extract wallet addresses - handle both _id and address fields
        wallet_addresses = []
        for doc in wallet_docs:
            # The discovery script stores wallets with _id as the wallet address
            wallet_id = doc.get('_id')
            if wallet_id:
                wallet_addresses.append(wallet_id)
        
        if not wallet_addresses:
            print("No valid wallet addresses found. Exiting.")
            return
            
        print(f"Extracted {len(wallet_addresses)} wallet addresses for analysis.")
        
        # Filter for high-quality wallets only to save processing time
        high_quality_wallets = []
        for doc in wallet_docs:
            # Only analyze wallets that meet quality criteria
            if (doc.get('significant_profit', False) and 
                doc.get('profit_threshold_passed', False) and
                doc.get('quality_score', 0) > 0.05):
                high_quality_wallets.append(doc['_id'])
        
        print(f"Filtered to {len(high_quality_wallets)} high-quality wallets for analysis.")
        
        if not high_quality_wallets:
            print("No high-quality wallets found. Consider running the discovery script first.")
            return
        
        analysis_results = []
        start_time = time.time()
        
        # Write job start status
        db.job_status.update_one({"job": "onchain_analyzer"}, {"$set": {
            "job": "onchain_analyzer",
            "status": "running",
            "percent": 0,
            "current_wallet": None,
            "total_wallets": len(high_quality_wallets),
            "last_update": datetime.utcnow()
        }}, upsert=True)
        
        for i, address in enumerate(high_quality_wallets):
            print(f"\n{'='*60}")
            print(f"Analyzing wallet {i+1}/{len(high_quality_wallets)}: {address}")
            print(f"Progress: {i+1}/{len(high_quality_wallets)} ({((i+1)/len(high_quality_wallets)*100):.1f}%)")
            print(f"Elapsed time: {time.time() - start_time:.1f}s")
            print(f"{'='*60}")
            
            try:
                # Add timeout for individual wallet analysis
                result = await asyncio.wait_for(
                    analyze_wallet(address, days_history=7, ui_callback=print),
                    timeout=120  # Reduced to 2 minutes per wallet
                )
                if result:
                    analysis_results.append(result)
                    print(f"✓ Successfully analyzed wallet {i+1}")
                else:
                    print(f"⚠ No analysis result for wallet {i+1}")
                    
            except asyncio.TimeoutError:
                print(f"✗ Timeout analyzing wallet {i+1} after 2 minutes, skipping...")
                continue
            except Exception as e:
                print(f"✗ Error analyzing wallet {i+1}: {e}")
                continue
            
            # Add delay between wallets to prevent rate limiting
            if i < len(high_quality_wallets) - 1:
                print("Waiting 3 seconds before next wallet...")
                await asyncio.sleep(3)
            
            # Update job status
            db.job_status.update_one({"job": "onchain_analyzer"}, {"$set": {
                "job": "onchain_analyzer",
                "status": f"Analyzing {i+1}/{len(high_quality_wallets)}",
                "percent": int((i+1)/len(high_quality_wallets)*100),
                "current_wallet": address,
                "total_wallets": len(high_quality_wallets),
                "last_update": datetime.utcnow()
            }}, upsert=True)
        
        # Write job complete status
        db.job_status.update_one({"job": "onchain_analyzer"}, {"$set": {
            "job": "onchain_analyzer",
            "status": "complete",
            "percent": 100,
            "current_wallet": None,
            "total_wallets": len(high_quality_wallets),
            "last_update": datetime.utcnow()
        }}, upsert=True)
        
        print("\n" + "-"*50)
        print("Analysis Summary:")
        print(f"Successfully analyzed {len(analysis_results)} wallets")
        if analysis_results:
            total_pnl = sum(r.get('pnl_sol', 0) for r in analysis_results)
            avg_win_rate = sum(r.get('win_rate', 0) for r in analysis_results) / len(analysis_results)
            print(f"Total PnL across all wallets: {total_pnl:.4f} SOL")
            print(f"Average win rate: {avg_win_rate:.1f}%")
            
        total_time = time.time() - start_time
        print(f"\nTotal analysis time: {total_time:.1f}s ({total_time/60:.1f} minutes)")
        
    except Exception as e:
        db.job_status.update_one({"job": "onchain_analyzer"}, {"$set": {
            "job": "onchain_analyzer",
            "status": f"error: {e}",
            "percent": 0,
            "current_wallet": None,
            "total_wallets": 0,
            "last_update": datetime.utcnow()
        }}, upsert=True)
        print(f"\nERROR: An unexpected error occurred in main(): {e}")
        import traceback
        traceback.print_exc()

    finally:
        print("\n" + "="*50)
        print("ON-CHAIN ANALYSIS SCRIPT FINISHED")
        print("="*50)


def main_cli():
    # This function remains to support potential direct command-line execution in the future
    # For now, we will just run the main async function.
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"An error occurred during CLI execution: {e}")

if __name__ == "__main__":
    main_cli()