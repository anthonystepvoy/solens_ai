import sys
import os
import json
import requests
import csv
import io
from dotenv import load_dotenv
import traceback
from datetime import datetime
import time
import random
import tls_client
from fake_useragent import UserAgent

# Usage: python copy_trader_analyzer.py <WALLET_ADDRESS>
# If no argument is provided, uses WALLET_TO_ANALYZE placeholder below.

# --- Placeholders/Config ---
WALLET_TO_ANALYZE = ""  # Set a default wallet here if desired
RPC_URL = "https://api.mainnet-beta.solana.com"  # Set your Helius or Solana RPC URL here
BLOCK_LIMIT = 20  # Number of blocks to scan for copytraders

# --- CONFIGURATION ---
try:
    # Try multiple paths for .env file
    possible_paths = [
        os.path.join(os.path.dirname(__file__), '.env'),
        os.path.join(os.path.dirname(__file__), '..', '.env'),
        os.path.join(os.path.dirname(__file__), '..', '..', '.env'),
        '.env'
    ]
    
    loaded = False
    for path in possible_paths:
        if os.path.exists(path):
            load_dotenv(dotenv_path=path)
            loaded = True
            print(f"[INFO] Loaded .env from: {path}", file=sys.stderr)
            break
    
    if not loaded:
        print(f"[WARNING] No .env file found in any of these paths: {possible_paths}", file=sys.stderr)
        
except Exception as e:
    print(f"[ERROR] Could not load .env file: {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)

# MONGO_URI should be set in your environment or .env file
MONGO_URI = os.environ.get('MONGO_URI')
WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112"
BLOCK_SCAN_LIMIT = 20  # Increased to scan more blocks

# Common DEX program IDs for detecting swaps
DEX_PROGRAM_IDS = {
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': 'Raydium',
    'EhpADApTmMm46FWTaWqkqNpgEm4xgHUHoJZCWrfnT27': 'Orca',
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Whirlpool',
    'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
    'CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR': 'Raydium CLMM',
    'SaberQK8Z8Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2': 'Saber',
    'Amm1QK8Z8Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q': 'Amm1',
    # Add more as needed
}

# Add bot and fee wallet detection
botAccounts = {
    "LUNARCc6FmA3hzPrwmXW3z6RNX1MYXhKS4opYoqCm9P": "Lunar",
    # ... add more as needed ...
}
feeWallets = {
    "9yMwSPk9mrXSN7yDHUZurAh1sjbJsfpUqjZ7SvVtdco": "Trojan",
    # ... add more as needed ...
}

# --- HELIUS CONFIGURATION ---
HELIUS_API_KEY = os.getenv("HELIUS_API_KEY")
HELIUS_RPC_URL = os.getenv("HELIUS_RPC_URL")
HELIUS_API_BASE_URL = os.getenv("HELIUS_API_BASE_URL")

# Debug: Print environment variables (be careful with sensitive data)
print(f"[DEBUG] HELIUS_API_KEY: {'SET' if HELIUS_API_KEY else 'NOT SET'}", file=sys.stderr)
print(f"[DEBUG] HELIUS_RPC_URL: {HELIUS_RPC_URL}", file=sys.stderr)
print(f"[DEBUG] HELIUS_API_BASE_URL: {HELIUS_API_BASE_URL}", file=sys.stderr)

if not HELIUS_API_KEY:
    print("[ERROR] HELIUS_API_KEY is not set in environment variables.", file=sys.stderr)
    sys.exit(1)

if not HELIUS_RPC_URL:
    print("[ERROR] HELIUS_RPC_URL is not set in environment variables.", file=sys.stderr)
    sys.exit(1)

if not HELIUS_API_BASE_URL:
    print("[ERROR] HELIUS_API_BASE_URL is not set in environment variables.", file=sys.stderr)
    sys.exit(1)

# --- HELPER FUNCTIONS ---

def make_helius_request(url, method='get', payload=None, timeout=30):
    """Make a request to Helius API with better error handling"""
    try:
        print(f"[DEBUG] Making {method.upper()} request to: {url}", file=sys.stderr)
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Copy-Trader-Analyzer/1.0'
        }
        
        if method.lower() == 'get':
            response = requests.get(url, timeout=timeout, headers=headers)
        else:
            response = requests.post(url, json=payload, timeout=timeout, headers=headers)
            
        print(f"[DEBUG] Response status: {response.status_code}", file=sys.stderr)
        
        if response.status_code == 429:
            retry_after = int(response.headers.get('Retry-After', 30))
            print(f"[WARNING] Rate limited. Waiting {retry_after} seconds...", file=sys.stderr)
            time.sleep(retry_after)
            return make_helius_request(url, method, payload, timeout)
            
        response.raise_for_status()
        return response.json()
        
    except requests.exceptions.Timeout:
        print(f"[ERROR] Timeout occurred for URL {url}", file=sys.stderr)
    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] HTTP error {e.response.status_code} for URL {url}: {e}", file=sys.stderr)
        if e.response.status_code == 401:
            print("[ERROR] Unauthorized - check your API key", file=sys.stderr)
        elif e.response.status_code == 403:
            print("[ERROR] Forbidden - check your API permissions", file=sys.stderr)
    except requests.RequestException as e:
        print(f"[ERROR] Request failed for URL {url}: {e}", file=sys.stderr)
    except json.JSONDecodeError as e:
        print(f"[ERROR] Failed to decode JSON from Helius for URL {url}: {e}", file=sys.stderr)
    except Exception as e:
        print(f"[ERROR] Unexpected error for URL {url}: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
    
    return None

def get_pnl(token_address, wallet_address):
    try:
        url = f"https://gmgn.ai/defi/quotation/v1/smartmoney/sol/walletstat/{wallet_address}?token_address={token_address}&period=1d"
        response = requests.get(url)
        data = response.json().get('data', {})
        return f"${data.get('total_profit', 0):.2f}", f"{data.get('realized_profit_pnl', 0):.2f}%"
    except:
        return "N/A", "N/A"

def find_latest_buy_transactions(wallet_address, max_buys=3):
    """Find the latest N buy/swap transactions for a wallet"""
    try:
        url = f"{HELIUS_API_BASE_URL}/v0/addresses/{wallet_address}/transactions?api-key={HELIUS_API_KEY}&limit=500"
        print(f"[DEBUG] Searching for transactions for wallet: {wallet_address}", file=sys.stderr)
        transactions = make_helius_request(url)
        if not transactions or not isinstance(transactions, list):
            print(f"[ERROR] No transactions found for wallet: {wallet_address}", file=sys.stderr)
            return []
        print(f"[DEBUG] Found {len(transactions)} transactions", file=sys.stderr)
        buys = []
        for i, tx in enumerate(transactions):
            try:
                print(f"[DEBUG] Analyzing transaction {i+1}/{len(transactions)}: {tx.get('signature', 'NO_SIG')}", file=sys.stderr)
                token_transfers = tx.get("tokenTransfers", [])
                sent_sol = False
                received_token = None
                for transfer in token_transfers:
                    from_user = transfer.get("fromUserAccount")
                    to_user = transfer.get("toUserAccount")
                    mint = transfer.get("mint")
                    if from_user == wallet_address and mint == WRAPPED_SOL_MINT:
                        sent_sol = True
                    if to_user == wallet_address and mint != WRAPPED_SOL_MINT:
                        received_token = mint
                tx_type = tx.get("type", "").upper()
                description = tx.get("description", "").lower()
                if tx_type in ["SWAP", "TRADE"] or "swap" in description or "buy" in description:
                    for transfer in token_transfers:
                        if (transfer.get("toUserAccount") == wallet_address and transfer.get("mint") != WRAPPED_SOL_MINT):
                            received_token = transfer.get("mint")
                            sent_sol = True
                            break
                if sent_sol and received_token:
                    slot = tx.get('slot')
                    signature = tx.get('signature')
                    print(f"[SUCCESS] Found buy transaction - Signature: {signature}, Token: {received_token}, Slot: {slot}", file=sys.stderr)
                    buys.append((signature, received_token, slot))
                    if len(buys) >= max_buys:
                        break
            except Exception as e:
                print(f"[ERROR] Error analyzing transaction {i}: {e}", file=sys.stderr)
                continue
        if not buys:
            print(f"[WARNING] No buy transactions found for wallet: {wallet_address}", file=sys.stderr)
        return buys
    except Exception as e:
        print(f"[ERROR] Error in find_latest_buy_transactions: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return []

def scan_blocks_for_copytraders(start_block, token_address, main_wallet):
    """Scan blocks for potential copy traders"""
    try:
        copy_traders = []
        unique_traders = set()
        
        print(f"[DEBUG] Scanning {BLOCK_SCAN_LIMIT} blocks starting from block {start_block}", file=sys.stderr)
        print(f"[DEBUG] Looking for token: {token_address}", file=sys.stderr)
        print(f"[DEBUG] Excluding main wallet: {main_wallet}", file=sys.stderr)
        
        scan_range = list(range(0, BLOCK_SCAN_LIMIT + 1))  # Just scan forward
        
        for i in scan_range:
            current_block = start_block + i
            
            print(f"[DEBUG] Scanning block {current_block} (offset {i:+d})", file=sys.stderr)
            
            payload = {
                "jsonrpc": "2.0",
                "id": "1",
                "method": "getBlock",
                "params": [
                    current_block,
                    {
                        "encoding": "jsonParsed",
                        "maxSupportedTransactionVersion": 0,
                        "transactionDetails": "full"
                    }
                ]
            }
            
            block_data = make_helius_request(HELIUS_RPC_URL, method='post', payload=payload)
            
            if not block_data or 'result' not in block_data:
                print(f"[WARNING] No data for block {current_block}", file=sys.stderr)
                continue
                
            if not block_data['result']:
                print(f"[WARNING] Empty block {current_block}", file=sys.stderr)
                continue
            
            transactions = block_data['result'].get('transactions', [])
            print(f"[DEBUG] Found {len(transactions)} transactions in block {current_block}", file=sys.stderr)
            
            for tx_index, tx in enumerate(transactions):
                try:
                    # MULTIPLE METHODS TO DETECT TOKEN BUYS
                    
                    # Get the fee payer/signer (first account)
                    account_keys = tx.get('transaction', {}).get('message', {}).get('accountKeys', [])
                    if not account_keys:
                        continue
                        
                    signer = account_keys[0].get('pubkey')
                    if not signer or signer == main_wallet:
                        continue
                    
                    if signer in unique_traders:
                        continue
                    
                    # METHOD 1: Check postTokenBalances for the target token
                    post_balances = tx.get('meta', {}).get('postTokenBalances', [])
                    pre_balances = tx.get('meta', {}).get('preTokenBalances', [])
                    
                    target_token_acquired = False
                    token_amount_acquired = 0
                    
                    # Compare pre vs post balances
                    for post_bal in post_balances:
                        if (post_bal.get('mint') == token_address and 
                            post_bal.get('owner') == signer):
                            
                            post_amount = post_bal.get('uiTokenAmount', {}).get('uiAmount', 0)
                            
                            # Find corresponding pre-balance
                            pre_amount = 0
                            for pre_bal in pre_balances:
                                if (pre_bal.get('mint') == token_address and 
                                    pre_bal.get('owner') == signer and
                                    pre_bal.get('accountIndex') == post_bal.get('accountIndex')):
                                    pre_amount = pre_bal.get('uiTokenAmount', {}).get('uiAmount', 0)
                                    break
                            
                            if post_amount > pre_amount:
                                target_token_acquired = True
                                token_amount_acquired = post_amount - pre_amount
                                print(f"[DEBUG] Wallet {signer} acquired {token_amount_acquired} of target token", file=sys.stderr)
                                break
                    
                    # METHOD 2: Check if transaction failed (skip failed transactions)
                    if tx.get('meta', {}).get('err') is not None:
                        continue
                    
                    # METHOD 3: Check instruction types for swaps/transfers
                    contains_swap = False
                    instructions = tx.get('transaction', {}).get('message', {}).get('instructions', [])
                    
                    for instruction in instructions:
                        program_id = instruction.get('programId', '')
                        # Common DEX program IDs
                        if program_id in [
                            'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',  # Jupiter
                            '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',  # Raydium
                            'EhpADApTmMm46FWTaWqkqNpgEm4xgHUHoJZCWrfnT27',  # Orca
                            'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',   # Whirlpool
                        ]:
                            contains_swap = True
                            break
                    
                    # If we found target token acquisition OR swap instruction
                    if target_token_acquired or contains_swap:
                        print(f"[DEBUG] Found potential copy trader: {signer} in block {current_block}", file=sys.stderr)
                        
                        # Extract transaction details
                        meta = tx.get('meta', {})
                        fee_paid = meta.get('fee', 0) / 1e9
                        signature = tx.get('transaction', {}).get('signatures', [None])[0]
                        
                        # Calculate SOL spent (look at pre vs post SOL balance)
                        sol_spent = 0
                        for i, post_bal in enumerate(meta.get('postBalances', [])):
                            pre_bal = meta.get('preBalances', [0] * len(meta.get('postBalances', [])))[i]
                            if i < len(account_keys) and account_keys[i].get('pubkey') == signer:
                                sol_difference = (pre_bal - post_bal) / 1e9  # Convert lamports to SOL
                                if sol_difference > 0:  # SOL was spent
                                    sol_spent = sol_difference
                                break
                        
                        # Additional check for token transfers in inner instructions
                        if not target_token_acquired:
                            inner_instructions = tx.get('meta', {}).get('innerInstructions', [])
                            for inner in inner_instructions:
                                for instr in inner.get('instructions', []):
                                    if instr.get('parsed', {}).get('type') == 'transfer' and \
                                       instr.get('parsed', {}).get('info', {}).get('destination') == signer and \
                                       instr.get('parsed', {}).get('info', {}).get('mint') == token_address:
                                        target_token_acquired = True
                                        print(f"[DEBUG] Wallet {signer} acquired target token via inner instruction", file=sys.stderr)
                                        break
                        
                        # Calculate profit
                        profit_usd, profit_pct = get_pnl(token_address, signer)
                        
                        trader_info = {
                            "Trader": signer,
                            "Signature": signature or "N/A",
                            "Block Delay": current_block - start_block,
                            "Bot Used": "Detected" if contains_swap else "Unknown",
                            "Fee Wallet": "Unknown",
                            "Tx Processor/Fee Wallet": signer,
                            "Fee Paid": fee_paid,
                            "SOL Spent": round(sol_spent, 6) if sol_spent > 0 else "N/A",
                            "Token Amount": round(token_amount_acquired, 6) if token_amount_acquired > 0 else "N/A",
                            "Profit/USD": profit_usd,
                            "Profit/%": profit_pct
                        }
                        
                        # Add bot and fee wallet detection
                        bot_used = "Unknown"
                        for instruction in instructions:
                            program_id = instruction.get('programId', '')
                            if program_id in botAccounts:
                                bot_used = botAccounts[program_id]
                                break
                        trader_info["Bot Used"] = bot_used
                        
                        for account in account_keys:
                            if account.get('pubkey') in feeWallets:
                                trader_info["Fee Wallet"] = feeWallets[account.get('pubkey')]
                                break
                        
                        copy_traders.append(trader_info)
                        unique_traders.add(signer)
                        
                except Exception as e:
                    print(f"[ERROR] Error processing transaction {tx_index} in block {current_block}: {e}", file=sys.stderr)
                    continue
        
        print(f"[SUCCESS] Found {len(copy_traders)} potential copy traders", file=sys.stderr)
        return copy_traders
        
    except Exception as e:
        print(f"[ERROR] Error in scan_blocks_for_copytraders: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return []

# --- MAIN EXECUTION ---
def main():
    try:
        print(f"[INFO] Copy Trader Analyzer started at {datetime.now()}", file=sys.stderr)
        
        # Accept wallet address as command-line argument or use placeholder
        if len(sys.argv) > 1:
            walletAddress = sys.argv[1]
        else:
            walletAddress = WALLET_TO_ANALYZE
        if not walletAddress:
            print("No target wallet address provided.")
            sys.exit(1)
        rpcUrl = RPC_URL
        blockLimit = BLOCK_LIMIT
        
        print(f"[INFO] Analyzing wallet: {walletAddress}", file=sys.stderr)
        
        # Validate wallet address format (basic check)
        if len(walletAddress) < 32 or len(walletAddress) > 44:
            print(f"[ERROR] Invalid wallet address format: {walletAddress}", file=sys.stderr)
            sys.exit(1)
        
        print("[INFO] Step 1: Finding latest buy transactions...", file=sys.stderr)
        buy_txs = find_latest_buy_transactions(walletAddress, max_buys=3)
        if not buy_txs:
            print(f"[FAIL] Could not find recent buy transactions for wallet {walletAddress}.", file=sys.stderr)
            output = {
                "count": 0,
                "results": [],
                "error": "No recent buy transactions found"
            }
            print(json.dumps(output))
            return
        
        all_potential_traders = []
        for idx, (signature, token_address, start_block) in enumerate(buy_txs):
            print(f"[INFO] Step 2: Scanning blocks for copy traders for buy {idx+1} (token: {token_address}, slot: {start_block})...", file=sys.stderr)
            potential_traders = scan_blocks_for_copytraders(start_block, token_address, walletAddress)
            all_potential_traders.extend(potential_traders)
        
        results = [trader for trader in all_potential_traders]
        
        output = {
            "count": len(results),
            "results": results
        }
        
        print(f"[SUCCESS] Analysis complete. Found {len(results)} potential copy traders.", file=sys.stderr)
        print(json.dumps(output))
        
    except Exception as e:
        print(f"[ERROR] Exception in main: {e}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        
        # Return error as JSON
        error_output = {
            "count": 0,
            "results": [],
            "error": str(e)
        }
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass  # Ignore if reconfigure fails
    main()