import sys
import os
import json
import requests
import csv
import io
from dotenv import load_dotenv

# --- CONFIGURATION ---
try:
    dotenv_path = os.path.join(os.path.dirname(__file__), '../../.env')
    load_dotenv(dotenv_path=dotenv_path)
except Exception as e:
    print(f"[ERROR] Could not load .env file: {e}", file=sys.stderr)
    sys.exit(1)

MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
WRAPPED_SOL_MINT = "So11111111111111111111111111111111111111112"
BLOCK_SCAN_LIMIT = 1  # Only scan 1 block after the main transaction.

# --- HELIUS CONFIGURATION (from .env) ---
HELIUS_API_KEY = os.getenv("HELIUS_API_KEY")
HELIUS_RPC_URL = os.getenv("HELIUS_RPC_URL")
HELIUS_API_BASE_URL = os.getenv("HELIUS_API_BASE_URL")

if not all([HELIUS_API_KEY, HELIUS_RPC_URL, HELIUS_API_BASE_URL]):
    print("[ERROR] One or more Helius environment variables are not set in your .env file.", file=sys.stderr)
    sys.exit(1)

# --- HELPER FUNCTIONS ---

def make_helius_request(url, method='get', payload=None, timeout=20):
    try:
        if method == 'get':
            response = requests.get(url, timeout=timeout)
        else:
            response = requests.post(url, json=payload, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"[ERROR] Helius API request failed for URL {url}: {e}", file=sys.stderr)
    except json.JSONDecodeError:
        print(f"[ERROR] Failed to decode JSON from Helius for URL {url}", file=sys.stderr)
    return None

def find_latest_buy_transaction(wallet_address):
    url = f"{HELIUS_API_BASE_URL}/v0/addresses/{wallet_address}/transactions?api-key={HELIUS_API_KEY}&type=SWAP"
    transactions = make_helius_request(url)

    if not transactions:
        return None, None, None

    for tx in transactions:
        sent_sol = False
        received_token = None
        for transfer in tx.get("tokenTransfers", []):
            if transfer.get("fromUserAccount") == wallet_address and transfer.get("mint") == WRAPPED_SOL_MINT:
                sent_sol = True
            if transfer.get("toUserAccount") == wallet_address and transfer.get("mint") != WRAPPED_SOL_MINT:
                received_token = transfer.get("mint")
        if sent_sol and received_token:
            return tx['signature'], received_token, tx.get('slot')
    return None, None, None

def scan_blocks_for_copytraders(start_block, token_address, main_wallet):
    copy_traders = []
    unique_traders = set()
    for i in range(1, BLOCK_SCAN_LIMIT + 1):
        current_block = start_block + i
        payload = {
            "jsonrpc": "2.0",
            "id": "1",
            "method": "getBlock",
            "params": [current_block, {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0, "transactionDetails": "full"}]
        }
        block_data = make_helius_request(HELIUS_RPC_URL, method='post', payload=payload)
        if not block_data or 'result' not in block_data or not block_data['result']:
            continue
        for tx in block_data['result'].get('transactions', []):
            signer = tx['transaction']['message']['accountKeys'][0].get('pubkey')
            if signer == main_wallet:
                continue
            post_balances = tx['meta'].get('postTokenBalances', [])
            is_target_token_buy = any(bal.get('mint') == token_address and bal.get('owner') == signer for bal in post_balances)
            if is_target_token_buy and signer not in unique_traders:
                # Fee paid (lamports to SOL)
                fee_paid = tx['meta'].get('fee', 0) / 1e9
                # Fee payer (first account in accountKeys)
                fee_wallet = tx['transaction']['message']['accountKeys'][0].get('pubkey')
                # SOL bought (look for WRAPPED_SOL_MINT in postTokenBalances)
                sol_bought = None
                for bal in post_balances:
                    if bal.get('mint') == WRAPPED_SOL_MINT and bal.get('owner') == signer:
                        sol_bought = bal.get('uiTokenAmount', {}).get('uiAmount')
                # Bot used (placeholder, unless you have logic)
                bot_used = "Unknown"
                # Profit fields (not available)
                profit_usd = "N/A"
                profit_pct = "N/A"
                trader_info = {
                    "Trader": signer,
                    "Signature": tx['transaction']['signatures'][0],
                    "Block Delay": current_block - start_block,
                    "Bot Used": bot_used,
                    "Tx Processor/Fee Wallet": fee_wallet,
                    "Fee Paid": fee_paid,
                    "SOL Bought": sol_bought,
                    "Profit/USD": profit_usd,
                    "Profit/%": profit_pct
                }
                copy_traders.append(trader_info)
                unique_traders.add(signer)
    return copy_traders

# --- MAIN EXECUTION ---
def main():
    if len(sys.argv) < 2:
        print("[ERROR] Please provide a wallet address to analyze.", file=sys.stderr)
        print("Usage: python copy_trader_analyzer.py <WALLET_ADDRESS>", file=sys.stderr)
        sys.exit(1)
    wallet_address = sys.argv[1]
    signature, token_address, start_block = find_latest_buy_transaction(wallet_address)
    if not signature:
        print(f"[FAIL] Could not find a recent buy transaction for wallet {wallet_address}. Exiting.", file=sys.stderr)
        sys.exit(1)
    potential_traders = scan_blocks_for_copytraders(start_block, token_address, wallet_address)
    results = [trader for trader in potential_traders]
    output = {
        "count": len(potential_traders),
        "results": results
    }
    print(json.dumps(output))

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding='utf-8')
    main()