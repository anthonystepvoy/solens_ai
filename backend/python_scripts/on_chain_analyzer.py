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
with open(config_path) as f:
    config = json.load(f)
HELIUS_API_KEY = config.get("helius_api_key")
if not HELIUS_API_KEY:
    raise RuntimeError("helius_api_key missing from config.json")
HELIUS_API_URL = "https://api.helius.xyz"
HELIUS_RPC_URL = f"https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"
WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112"

# MongoDB Atlas connection
MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client["solens_ai"]

# --- ANALYSIS CONFIGURATION ---
# TRANSACTION_LIMIT is no longer a global constant. It will be passed as a parameter.

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

    # Step 1: Fetch all relevant transaction signatures using the RPC client
    all_signatures = []
    try:
        wallet_pubkey = Pubkey.from_string(address)
        async with AsyncClient(HELIUS_RPC_URL) as client:
            while True:
                # The solana-py library handles the 'before' parameter correctly
                sig_result = await client.get_signatures_for_address(wallet_pubkey, limit=1000, before=before_signature)
                
                if not sig_result.value:
                    break # No more signatures

                signatures_batch = sig_result.value
                all_signatures.extend(signatures_batch)

                last_sig_in_batch = signatures_batch[-1]
                if last_sig_in_batch.block_time and last_sig_in_batch.block_time < start_time_unix:
                    if ui_callback: ui_callback(f"  Reached end of time window ({days_history} days).")
                    break

                before_signature = last_sig_in_batch.signature
                if not before_signature or len(signatures_batch) < 1000:
                    break # Reached the end of the wallet's history
    
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
    
    for i in range(0, len(signatures_in_window_str), 100):
        batch_signatures = signatures_in_window_str[i:i + 100]
        try:
            # Using synchronous requests here for simplicity, as in discover_traders
            response = requests.post(url, json={"transactions": batch_signatures}, timeout=30)
            response.raise_for_status()
            parsed_txs = response.json()
            all_transactions.extend(parsed_txs)
        except requests.RequestException as e:
            msg = f"    Error parsing transaction batch for {address[:6]}: {e}"
            if ui_callback: ui_callback(msg)
            else: print(msg)
            continue # Try next batch

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
            swaps_by_token[sell_token_mint].append(tx)
            
            cost_of_tokens_sold_sol = 0
            purchase_lots = token_portfolio.get(sell_token_mint) # No defaultdict here
            
            # ** CRITICAL CHANGE: If we have no record of buying this token, it's an incomplete trade. **
            if not purchase_lots:
                incomplete_sells += 1
                msg = f"      [SELL] {sell_token_amount:.4f} of {sell_token_mint[:6]} for {sol_received:.4f} SOL. PnL: UNKNOWN (Incomplete)"
                if ui_callback: ui_callback(msg)
                continue # Skip PnL calculation for this trade

            # FIFO cost calculation
            tokens_to_account_for = sell_token_amount
            cost_calculated = False
            while tokens_to_account_for > 0 and purchase_lots:
                oldest_purchase = purchase_lots[0]
                if oldest_purchase['amount'] <= tokens_to_account_for:
                    cost_of_tokens_sold_sol += oldest_purchase['cost_sol']
                    tokens_to_account_for -= oldest_purchase['amount']
                    purchase_lots.pop(0)
                else:
                    cost_per_token = oldest_purchase['cost_sol'] / oldest_purchase['amount']
                    cost_of_tokens_sold_sol += tokens_to_account_for * cost_per_token
                    oldest_purchase['amount'] -= tokens_to_account_for
                    tokens_to_account_for = 0
                cost_calculated = True
            
            # This case handles if we sold more than we have purchase records for (within the time window)
            if tokens_to_account_for > 0 and not purchase_lots:
                 incomplete_sells += 1
                 msg = f"      [SELL] {sell_token_amount:.4f} of {sell_token_mint[:6]} for {sol_received:.4f} SOL. PnL: UNKNOWN (Partial History)"
                 if ui_callback: ui_callback(msg)
                 continue # Skip PnL for this partial trade

            trade_pnl_sol = sol_received - cost_of_tokens_sold_sol
            total_pnl_sol += trade_pnl_sol
            
            status = "WIN" if trade_pnl_sol > 0 else "LOSS"
            if trade_pnl_sol > 0: winning_trades += 1
            else: losing_trades += 1
            
            msg = f"      [SELL] {sell_token_amount:.4f} of {sell_token_mint[:6]} for {sol_received:.4f} SOL. PnL: {trade_pnl_sol:+.4f} ({status})"
            if ui_callback: ui_callback(msg)

    total_trades = winning_trades + losing_trades
    win_rate = (winning_trades / total_trades) * 100 if total_trades > 0 else 0
    return swaps_by_token, total_pnl_sol, win_rate, total_trades, total_volume_sol, incomplete_sells

async def analyze_wallet(wallet_address, days_history=7, ui_callback=None):
    if ui_callback: ui_callback(f"Analyzing wallet: {wallet_address}")
    else: print(f"Analyzing wallet: {wallet_address}")

    # Fetch transactions within the specified time window
    transactions = await get_transactions_in_time_window(
        wallet_address, 
        days_history=days_history, 
        ui_callback=ui_callback
    )
    if not transactions:
        msg = f"    No transactions found for {wallet_address} in the last {days_history} days. Skipping."
        if ui_callback: ui_callback(msg)
        else: print(msg)
        return None
    
    # Chronological order is required for accurate FIFO PnL calculation
    transactions.reverse() 

    # New, more accurate SOL balance calculation
    sol_balance_change_lamports = 0
    for tx in transactions:
        for acc_data in tx.get("accountData", []):
            if acc_data.get("account") == wallet_address:
                sol_balance_change_lamports += acc_data.get("nativeBalanceChange", 0)
    sol_balance_change = sol_balance_change_lamports / 1e9 # Convert lamports to SOL

    # PnL calculation now uses the improved FIFO method
    swaps_by_token, total_pnl, win_rate, total_trades, total_volume_sol, incomplete_sells = calculate_pnl_fifo(transactions, wallet_address, ui_callback)

    if not swaps_by_token:
        msg = f"    No SOL-based swaps found for {wallet_address}. Skipping."
        if ui_callback: ui_callback(msg)
        else: print(msg)
        return None

    token_swap_counts = {token: len(swaps) for token, swaps in swaps_by_token.items()}
    
    result = {
        'wallet': wallet_address,
        'pnl_sol': total_pnl,
        'win_rate': win_rate,
        'sol_balance_change': sol_balance_change, # Note: This is over the analyzed period
        'total_trades': total_trades, # Now only counts "complete" trades
        'incomplete_sells': incomplete_sells, # New metric
        'total_volume_sol': total_volume_sol,
        'swap_count': sum(token_swap_counts.values()), # Total swaps (buy/sell)
        'total_transactions': len(transactions),
        'analysis_period_days': days_history
    }

    # --- MONGODB INTEGRATION ---
    db.wallets.update_one(
        {"_id": wallet_address},
        {"$set": {"on_chain_data": result, "updated_at": datetime.utcnow(), "discovered_by": ["OnChain_Analyzer"]}},
        upsert=True
    )

    return result

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
        wallet_docs = db.wallets.find({})
        wallet_addresses = [doc['_id'] for doc in wallet_docs]
        if not wallet_addresses:
            print("WARNING: No wallets found in the 'wallets' collection in MongoDB. Exiting.")
            return
        print(f"Found {len(wallet_addresses)} wallets to analyze.")
        analysis_results = []
        for i, address in enumerate(wallet_addresses):
            print(f"\nAnalyzing wallet {i+1}/{len(wallet_addresses)}: {address}")
            result = await analyze_wallet(address, days_history=7, ui_callback=print)
            if result:
                analysis_results.append(result)
        print("\n" + "-"*50)
        print("Updating MongoDB with analysis results...")
        if not analysis_results:
            print("No new analysis results to update.")
        else:
            for res in analysis_results:
                wallet_id = res.pop('wallet') 
                db.wallets.update_one(
                    {"_id": wallet_id},
                    {"$set": res},
                    upsert=True
                )
            print(f"Successfully updated {len(analysis_results)} wallets in MongoDB.")
    except Exception as e:
        print(f"\nERROR: An unexpected error occurred in main(): {e}")

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