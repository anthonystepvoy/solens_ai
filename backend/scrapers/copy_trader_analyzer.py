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
BLOCK_LIMIT = 5  # Number of blocks to scan for copytraders (reduced from 20)

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
BLOCK_SCAN_LIMIT = 10

# Common DEX program IDs for detecting swaps
DEX_PROGRAM_IDS = {
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter',
    '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM': 'Raydium',
    'EhpADApTmMm46FWTaWqkqNpgEm4xgHUHoJZCWrfnT27': 'Orca',
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Whirlpool',
    'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
    'CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR': 'Raydium CLMM',
    'SaberQK8Z8Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2': 'Saber',
    'Amm1QK8Z8Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q': 'Amm1',
    # Add more as needed
}

# Bot accounts from original script
botAccounts = {
    "LUNARCc6FmA3hzPrwmXW3z6RNX1MYXhKS4opYoqCm9P": "Lunar",
    "vs1ongEMwP15z6RKykbUbWwAf8WXFKNTLkfEr5JN6K7": "VisionAIO",
    "BSfD6SHZigAfDWSjzD5Q41jw8LmKwtmjskPH9XW1mrRW": "Photon",
    "7HeD6sLLqAnKVRuSfc1Ko3BSPMNKWgGTiWLKXJF31vKM": "Bloom",
    "b1oomGGqPKGD6errbyfbVMBuzSC8WtAAYo8MwNafWW1": "Bloom",
    "GengarGzVQiNwzmXFC6sz3oT4HY91MnV26nDX6z2U97V": "SharpAIO",
    "minTcHYRLVPubRK8nt6sqe2ZpWrGDLQoNLipDJCGocY": "Mintech",
    "6m2CDdhRgxpH4WjvdzxAYbGxwdGUz5MziiL5jek2kBma": "OKX",
    "BANANAjs7FJiPQqJTGFzkZJndT9o7UmKiYYGaJz6frGu": "Banana Gun",
    "9QT9pBnnvrRXdEdkYhp5KrB9SqgTopmmVNunUm726DbJ": "StarkDex Bot",
    "97VmzkjX9w8gMFS2RnHTSjtMEDbifGXBq9pgosFdFnM": "TradeWiz",
    "CABAL69DYBisjkdHxwVktMy2TPHYVYc2D3UDQQ2DLwKM": "Cabal Bot",
    "b1oodtXw4tigt8MoRcRrWUGCW31WeFUtFMsFgwQpSQ9": "Blood",
    "Axiom3a2w1UbMt2SMgqSvRiuJFTPusDhwKamNgPTeNQ9": "Axiom",
    "PEPPER3dYQpY2TTqHp3XinzRu519X7GswmVNb5tqK8L": "Peppermints",
    "King7ki4SKMBPb3iupnQwTyjsq294jaXsgLmJo8cb7T": "King Bot (??)",
}

# Fee wallets from original script
feeWallets = {
    "9yMwSPk9mrXSN7yDHUuZurAh1sjbJsfpUqjZ7SvVtdco": "Trojan",
    "AaG6of1gbj1pbDumvbSiTuJhRCRkkUNaWVxijSbWvTJW": "Axiom",
    "97VmzkjX9w8gMFS2RnHTSjtMEDbifGXBq9pgosFdFnM": "TradeWiz",
    "BB5dnY55FXS1e1NXqZDwCzgdYJdMCj3B92PU6Q5Fb6DT": "GMGN",
    "28KqHiudrpzfVkVWQ1jztQ2Aarf4W3CvTitjWEqTCkpA": "BullX",
    "HWEoBxYs7ssKuudEjzjmpfJVX7Dvi7wescFsVx2L5yoY": "Bloxroute",
    "7ks326H4LbMVaUC8nW5FpC5EoAf5eK5pf4Dsx4HDQLpq": "Bloxroute",
    "TEMPaMeCRFAS9EKF53Jd6KpHxgL47uWLcpFArU1Fanq": "Temporal",
    "noz3jAjPiHuBPqiSPkkugaJDkJscPuRhYnSpbi8UvC4": "Temporal",
    "noz3str9KXfpKknefHji8L1mPgimezaiUyCHYMDv1GE": "Temporal",
    "noz6uoYCDijhu1V7cutCpwxNiSovEwLdRHPwmgCGDNo": "Temporal",
    "noz9EPNcT7WH6Sou3sr3GGjHQYVkN3DNirpbvDkv9YJ": "Temporal",
    "nozc5yT15LazbLTFVZzoNZCwjh3yUtW86LoUyqsBu4L": "Temporal",
    "nozFrhfnNGoyqwVuwPAW4aaGqempx4PU6g6D9CJMv7Z": "Temporal",
    "nozievPk7HyK1Rqy1MPJwVQ7qQg2QoJGyP71oeDwbsu": "Temporal",
    "noznbgwYnBLDHu8wcQVCEw6kDrXkPdKkydGJGNXGvL7": "Temporal",
    "nozNVWs5N8mgzuD3qigrCG2UoKxZttxzZ85pvAQVrbP": "Temporal",
    "nozpEGbwx4BcGp6pvEdAh1JoC2CQGZdU6HbNP1v2p6P": "Temporal",
    "nozrhjhkCr3zXT3BiT4WCodYCUFeQvcdUkM7MqhKqge": "Temporal",
    "nozrwQtWhEdrA6W8dkbt9gnUaMs52PdAv5byipnadq3": "Temporal",
    "nozUacTVWub3cL4mJmGCYjKZTnE9RbdY5AP46iQgbPJ": "Temporal",
    "nozWCyTPppJjRuw2fpzDhhWbW355fzosWSzrrMYB1Qk": "Temporal",
    "nozWNju6dY353eMkMqURqwQEoM3SFgEKC6psLCSfUne": "Temporal",
    "nozxNBgWohjR75vdspfxR5H9ceC7XXH99xpxhVGt3Bb": "Temporal",
    "NexTbLoCkWykbLuB1NkjXgFWkX9oAtcoagQegygXXA2": "Next Block 1",
    "nextBLoCkPMgmG8ZgJtABeScP35qLa2AMCNKntAP7Xc": "Next Block 2",
    "NextbLoCkVtMGcV47JzewQdvBpLqT9TxQFozQkN98pE": "Next Block 3",
    "NEXTbLoCkB51HpLBLojQfpyVAMorm3zzKg7w9NFdqid": "Next Block 4",
    "NeXTBLoCKs9F1y5PJS9CKrFNNLU1keHW71rfh7KgA1X": "Next Block 5",
    "neXtBLock1LeC67jYd1QdAa32kbVeubsfPNTJC1V5At": "Next Block 6",
    "nEXTBLockYgngeRmRrjDV31mGSekVPqZoMGhQEZtPVG": "Next Block 7",
    "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5": "Jito1",
    "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe": "Jito2",
    "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY": "Jito3",
    "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49": "Jito4",
    "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh": "Jito5",
    "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt": "Jito6",
    "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL": "Jito7",
    "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT": "Jito8",
    "6fQaVhYZA4w3MBSXjJ81Vf6W1EDYeUPXpgVQ6UQyU1Av": "0slot",
    "4HiwLEP2Bzqj3hM2ENxJuzhcPCdsafwiet3oGkMkuQY4": "0slot",
    "7toBU3inhmrARGngC7z6SjyP85HgGMmCTEwGNRAcYnEK": "0slot",
    "8mR3wB1nh4D6J9RUCugxUpc6ya8w38LPxZ3ZjcBhgzws": "0slot",
    "6SiVU5WEwqfFapRuYCndomztEwDjvS5xgtEof3PLEGm9": "0slot",
    "TpdxgNJBWZRL8UXF5mrEsyWxDWx9HQexA9P1eTWQ42p": "0slot",
    "D8f3WkQu6dCF33cZxuAsrKHrGsqGP2yvAHf8mX6RXnwf": "0slot",
    "GQPFicsy3P3NXxB5piJohoxACqTvWE9fKpLgdsMduoHE": "0slot",
    "Ey2JEr8hDkgN8qKJGrLf2yFjRhW7rab99HVxwi5rcvJE": "0slot",
    "4iUgjMT8q2hNZnLuhpqZ1QtiV8deFPy2ajvvjEpKKgsS": "0slot",
    "3Rz8uD83QsU8wKvZbgWAPvCNDU6Fy8TSZTMcPm3RB6zt": "0slot",
    "FCjUJZ1qozm1e8romw216qyfQMaaWKxWsuySnumVCCNe": "0slot",
    "Cix2bHfqPcKcM233mzxbLk14kSggUUiz2A87fJtGivXr": "0slot",
    "ENxTEjSQ1YabmUpXAdCgevnHQ9MHdLv8tzFiuiYJqa13": "0slot",
    "J9BMEWFbCBEjtQ1fG5Lo9kouX1HfrKQxeUxetwXrifBw": "0slot",
    "6rYLG55Q9RpsPGvqdPNJs4z5WTxJVatMB8zV3WJhs5EK": "0slot",
    "Dz8rMcdokTLfbnNz2ZdYocZixgaA1TMqbA31xtwPgcxb": "0slot"
}

# Add bot and fee wallet detection
botAccounts = {
    "LUNARCc6FmA3hzPrwmXW3z6RNX1MYXhKS4opYoqCm9P": "Lunar",
    # ... add more as needed ...
}
feeWallets = {
    "9yMwSPk9mrXSN7yDHUuZurAh1sjbJsfpUqjZ7SvVtdco": "Trojan",
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

def shorten(s: str) -> str:
    return f"{s[:4]}...{s[-5:]}" if len(s) >= 9 else s

def checkTxIsBuy(txData: dict) -> bool:
    for msg in txData["result"]["meta"].get("logMessages", []):
        if "Instruction: Sell" in msg:
            return False
        if "Instruction: Buy" in msg:
            return True
    return True

def getFeeInfo(txData: dict):
    feePaidTo = {}
    feePaid = 0
    for instr in txData["result"]["transaction"]["message"]["instructions"]:
        # Only process if instr is a dict and has a 'parsed' key that is also a dict
        if isinstance(instr, dict) and isinstance(instr.get("parsed"), dict):
            if instr["parsed"].get("type") == "transfer":
                info = instr["parsed"].get("info", {})
                dest = info.get("destination")
                lamports = int(info.get("lamports", 0))
                if dest in feeWallets:
                    solAmount = lamports / 1_000_000_000
                    feePaidTo[feeWallets[dest]] = solAmount
                    feePaid += solAmount
    return feePaidTo, feePaid

def getSolAmountBought(txData: dict) -> float:
    solAmount = 0
    for group in txData["result"]["meta"].get("innerInstructions", []):
        for instr in group.get("instructions", []):
            if instr.get("program") == "system":
                parsed = instr.get("parsed")
                if parsed and parsed.get("type") == "transfer":
                    lamports = parsed.get("info", {}).get("lamports")
                    if lamports:
                        solAmount += lamports / 1e9
    return solAmount

class CopyWalletFinder:
    def __init__(self, rpcUrl: str):
        self.rpcUrl = rpcUrl
        self.session = tls_client.Session(client_identifier="chrome_103")

    def randomiseRequest(self):
        self.identifier = random.choice(
            [browser for browser in tls_client.settings.ClientIdentifiers.__args__
             if browser.startswith(('chrome', 'safari', 'firefox', 'opera'))]
        )
        parts = self.identifier.split('_')
        identifier, version, *rest = parts
        identifier = identifier.capitalize()
        
        self.sendRequest = tls_client.Session(random_tls_extension_order=True, client_identifier=self.identifier)
        self.sendRequest.timeout_seconds = 60

        if identifier == 'Opera':
            identifier = 'Chrome'
            osType = 'Windows'
        elif version.lower() == 'ios':
            osType = 'iOS'
        else:
            osType = 'Windows'

        try:
            self.user_agent = UserAgent(os=[osType]).random
        except Exception:
            self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:82.0) Gecko/20100101 Firefox/82.0"

        self.headers = {
            'Host': 'gmgn.ai',
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'dnt': '1',
            'priority': 'u=1, i',
            'referer': 'https://gmgn.ai/?chain=sol',
            'user-agent': self.user_agent
        }

    def getLastBuy(self, walletAddress: str):
        # Try GMGN API first
        url = f"https://gmgn.mobi/api/v1/wallet_activity/sol?type=buy&wallet={walletAddress}&limit=10&cost=10"
        for attempt in range(3):
            self.randomiseRequest()
            try:
                print(f"[DEBUG] Attempt {attempt + 1}: Making request to {url}", file=sys.stderr)
                response = self.session.get(url, headers=self.headers)
        print(f"[DEBUG] Response status: {response.status_code}", file=sys.stderr)
        
                if response.status_code != 200:
                    print(f"[DEBUG] Non-200 status: {response.text[:200]}", file=sys.stderr)
                    continue
                
                response_text = response.text
                if not response_text.strip():
                    print(f"[DEBUG] Empty response received", file=sys.stderr)
                    continue
                
                data = response.json()
                if 'data' not in data:
                    print(f"[DEBUG] No 'data' key in response", file=sys.stderr)
                    continue
                
                activities = data['data']['activities']
                print(f"[DEBUG] Found {len(activities)} activities", file=sys.stderr)
                
                buys = [act for act in activities if act.get("event_type") == "buy"]
                print(f"[DEBUG] Found {len(buys)} buy events", file=sys.stderr)
                
                if not buys:
                    print(f"No buy events found for {walletAddress}", file=sys.stderr)
                    continue
                
                lastToken = max(buys, key=lambda x: x['timestamp'])['token']['address']
                tokenBuys = [act for act in buys if act['token']['address'] == lastToken]
                firstTokenBuy = min(tokenBuys, key=lambda x: x['timestamp'])
                return firstTokenBuy['tx_hash'], firstTokenBuy['token']['address']
    except Exception as e:
                print(f"Attempt {attempt + 1} failed for wallet {walletAddress}: {e}", file=sys.stderr)
        
        # Fallback: Use Helius API to find recent buy transactions
        print(f"[INFO] GMGN API blocked, using Helius fallback for {walletAddress}", file=sys.stderr)
        return self.getLastBuyFromHelius(walletAddress)
    
    def getLastBuyFromHelius(self, walletAddress: str):
        """Fallback method using Helius API to find buy transactions"""
    try:
            # Get recent transactions from Helius
            url = f"{HELIUS_API_BASE_URL}/v0/addresses/{walletAddress}/transactions?api-key={HELIUS_API_KEY}&limit=50"
            response = requests.get(url, timeout=30)
            
            if response.status_code != 200:
                print(f"[ERROR] Helius API returned {response.status_code}", file=sys.stderr)
                return None, None
            
            transactions = response.json()
            if not transactions:
                print(f"[ERROR] No transactions found for {walletAddress}", file=sys.stderr)
                return None, None
            
            # Look for buy transactions
            for tx in transactions:
                # Check if this is a swap/buy transaction
                tx_type = tx.get("type", "").upper()
                description = tx.get("description", "").lower()
                
                if tx_type in ["SWAP", "TRADE"] or "swap" in description or "buy" in description:
                    # Look for token transfers to identify what was bought
                    token_transfers = tx.get("tokenTransfers", [])
                    
                    for transfer in token_transfers:
                        # Check if this wallet received a token (not SOL/WSOL)
                        if (transfer.get("toUserAccount") == walletAddress and 
                            transfer.get("mint") != WRAPPED_SOL_MINT):
                            
                            received_token = transfer.get("mint")
                            signature = tx.get('signature')
                            
                            print(f"[SUCCESS] Found buy transaction - Signature: {signature}, Token: {received_token}", file=sys.stderr)
                            return signature, received_token
            
            print(f"[WARNING] No buy transactions found in recent history for {walletAddress}", file=sys.stderr)
            return None, None
                        
            except Exception as e:
            print(f"[ERROR] Error in getLastBuyFromHelius: {e}", file=sys.stderr)
            return None, None

    def getBlockHash(self, transaction: str):
        payload = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "getTransaction",
            "params": [
                transaction,
                {"encoding": "jsonParsed", "maxSupportedTransactionVersion": 0, "commitment": "confirmed"}
            ]
        }
        txData = self.session.post(self.rpcUrl, json=payload).json()
        if txData["result"]['meta']["err"] is not None or not checkTxIsBuy(txData):
            return None, txData
        return int(txData['result']['slot']), txData

    def getPotentialCopyTraders(self, startBlock: int, walletAddress: str, contractAddress: str, blockLimit: int):
        mainTx = None
        potentialTraders = {}
        total_blocks = blockLimit + 1
        
        print(f"[PROGRESS] Starting block scan: {total_blocks} blocks to analyze", file=sys.stderr)
        
        for currentBlock in range(startBlock, startBlock + blockLimit + 1):
            block_index = currentBlock - startBlock + 1
            print(f"[PROGRESS] Analyzing block {currentBlock} ({block_index}/{total_blocks})", file=sys.stderr)
            
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getBlock",
                "params": [currentBlock, {"encoding": "json", "maxSupportedTransactionVersion": 0,
                                            "transactionDetails": "full", "rewards": False}]
            }
            data = self.session.post(self.rpcUrl, json=payload).json()
            transactions = data['result']['transactions']
            
            print(f"[PROGRESS] Found {len(transactions)} transactions in block {currentBlock}", file=sys.stderr)
            
            if currentBlock == startBlock:
                for tx in transactions:
                    if walletAddress in tx['transaction']['message']['accountKeys']:
                        postBalances = tx['meta'].get('postTokenBalances', [])
                        if postBalances and postBalances[0].get('mint') == contractAddress:
                            mainTx = tx['transaction']['signatures'][0]
                            print(f"[PROGRESS] Found main transaction: {mainTx[:8]}...", file=sys.stderr)
                            break
            
            copytrader_count = 0
            for tx in transactions:
                trader = tx['transaction']['message']['accountKeys'][0]
                if trader == walletAddress:
                    continue
                postBalances = tx['meta'].get('postTokenBalances', [])
                if any(balance.get('mint') == contractAddress for balance in postBalances):
                    if trader not in potentialTraders:
                        potentialTraders[trader] = (tx['transaction']['signatures'][0], currentBlock)
                        copytrader_count += 1
            
            if copytrader_count > 0:
                print(f"[PROGRESS] Found {copytrader_count} new copytraders in block {currentBlock}", file=sys.stderr)
        
        uniqueTraders = [(w, sig, blk) for w, (sig, blk) in potentialTraders.items()]
        print(f"[PROGRESS] Total copytraders found: {len(uniqueTraders)}", file=sys.stderr)
        return mainTx, startBlock, uniqueTraders

def processTransaction(finder: CopyWalletFinder, txSignature: str, mainBlock: int, wallet: str):
    botUsed = ""
    feePaidTo, feePaid, solBought = {}, 0, 0
    blockInfo, txData = finder.getBlockHash(txSignature)
    if blockInfo is None:
        return None
    
    # Enhanced bot detection
    botUsed = detectBotUsage(txData, wallet)
    
    feePaidTo, feePaid = getFeeInfo(txData)
    solBought = getSolAmountBought(txData)
    blockDelay = blockInfo - mainBlock
    return {
        "hash": txSignature,
        "blockDelay": blockDelay,
        "botUsed": botUsed,
        "feePaidTo": feePaidTo,
        "feePaid": f"{feePaid:.8f}",
        "solAmountBought": solBought
    }

def detectBotUsage(txData: dict, wallet: str) -> str:
    """Enhanced bot detection that checks multiple patterns"""
    
    # 1. Check if wallet is a known bot
    if wallet in botAccounts:
        return botAccounts[wallet]
    
    # 2. Check transaction instructions for known bot program IDs
    instructions = txData["result"]["transaction"]["message"]["instructions"]
    for instr in instructions:
        if "programId" in instr:
            program_id = instr["programId"]
            if program_id in botAccounts:
                return botAccounts[program_id]
    
    # 3. Check log messages for bot patterns
    log_messages = txData["result"]["meta"].get("logMessages", [])
    for msg in log_messages:
        msg_lower = msg.lower()
        # Check for common bot patterns in logs
        if any(pattern in msg_lower for pattern in [
            "jupiter", "raydium", "orca", "whirlpool", "meteora", "fluxbeam",
            "banana", "lunar", "photon", "bloom", "sharp", "mintech", "okx",
            "stark", "cabal", "blood", "axiom", "peppermint", "king"
        ]):
            # Extract bot name from log
            for bot_name in ["jupiter", "raydium", "orca", "whirlpool", "meteora", "fluxbeam",
                           "banana", "lunar", "photon", "bloom", "sharp", "mintech", "okx",
                           "stark", "cabal", "blood", "axiom", "peppermint", "king"]:
                if bot_name in msg_lower:
                    return bot_name.capitalize()
    
    # 4. Check for specific transaction patterns
    # Look for high-frequency trading patterns
    if len(instructions) > 10:  # Complex transaction might indicate bot
        return "Complex Bot"
    
    # 5. Check for specific program interactions
    program_ids = set()
    for instr in instructions:
        if "programId" in instr:
            program_ids.add(instr["programId"])
    
    # Known DEX program IDs
    dex_programs = {
        "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4": "Jupiter",
        "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM": "Raydium",
        "EhpADApTmMm46FWTaWqkqNpgEm4xgHUHoJZCWrfnT27": "Orca",
        "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc": "Whirlpool",
        "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK": "Raydium CLMM",
        "CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR": "Raydium CLMM",
        "SaberQK8Z8Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2": "Saber",
        "Amm1QK8Z8Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q2Q": "Amm1",
    }
    
    for program_id in program_ids:
        if program_id in dex_programs:
            return f"{dex_programs[program_id]} DEX"
    
    # 6. Check for fee wallet interactions (indicates bot usage)
    feePaidTo, _ = getFeeInfo(txData)
    if feePaidTo:
        fee_wallets = list(feePaidTo.keys())
        if fee_wallets:
            return f"Bot ({fee_wallets[0]})"
    
    # 7. Check for very fast execution (same block as original)
    # This is handled in the main logic where blockDelay is calculated
    
    return "Manual"  # Default to manual if no bot patterns detected

# --- MAIN EXECUTION ---
def main():
    try:
        print(f"[INFO] Copy Trader Analyzer started at {datetime.now()}", file=sys.stderr)
        
        # Accept wallet address as command-line argument or prompt if not provided
        if len(sys.argv) > 1:
            walletAddress = sys.argv[1]
        else:
            walletAddress = WALLET_TO_ANALYZE
            if not walletAddress:
                walletAddress = input("Enter the wallet address to analyze: ").strip()
        if not walletAddress:
            print("No target wallet address provided.")
            sys.exit(1)
        
        # Build Helius RPC URL from API key if not set
        rpcUrl = HELIUS_RPC_URL
        if not rpcUrl:
            if HELIUS_API_KEY:
                rpcUrl = f"https://mainnet.helius-rpc.com/?api-key={HELIUS_API_KEY}"
                print(f"[INFO] Built Helius RPC URL from API key.", file=sys.stderr)
            else:
                print("[ERROR] Helius RPC URL or API key not set in environment.", file=sys.stderr)
                sys.exit(1)
        blockLimit = BLOCK_LIMIT
        
        print(f"[INFO] Analyzing wallet: {walletAddress}", file=sys.stderr)
        
        # Validate wallet address format (basic check)
        if len(walletAddress) < 32 or len(walletAddress) > 44:
            print(f"[ERROR] Invalid wallet address format: {walletAddress}", file=sys.stderr)
            sys.exit(1)
        
        print("[INFO] Step 1: Finding latest buy transactions using GMGN API...", file=sys.stderr)
        finder = CopyWalletFinder(rpcUrl)
        transaction, contractAddress = finder.getLastBuy(walletAddress)
        if not transaction or not contractAddress:
            print(f"[FAIL] Could not retrieve main wallet transaction details for {walletAddress}.", file=sys.stderr)
            output = {
                "count": 0,
                "results": [],
                "error": "Could not retrieve main wallet transaction details"
            }
            print(json.dumps(output))
            return
        
        print(f"[INFO] Found buy transaction: {transaction} for token: {contractAddress}", file=sys.stderr)
        
        mainBlock, txData = finder.getBlockHash(transaction)
        if mainBlock is None:
            print("Main transaction failed or did not meet the criteria; cannot proceed.", file=sys.stderr)
            output = {
                "count": 0,
                "results": [],
                "error": "Main transaction failed or did not meet the criteria"
            }
            print(json.dumps(output))
            return
        
        print(f"[INFO] Main transaction block: {mainBlock}", file=sys.stderr)
        
        print(f"[INFO] Step 2: Scanning {blockLimit} blocks for copy traders...", file=sys.stderr)
        _, mainBlock, potentialTraders = finder.getPotentialCopyTraders(mainBlock, walletAddress, contractAddress, blockLimit)
        
        results = []
        total_traders = len(potentialTraders)
        print(f"[PROGRESS] Processing {total_traders} potential copytraders...", file=sys.stderr)
        
        for idx, (trader, txSig, contestantBlock) in enumerate(potentialTraders, 1):
            print(f"[PROGRESS] Analyzing copytrader {idx}/{total_traders}: {trader[:8]}...", file=sys.stderr)
            result = processTransaction(finder, txSig, mainBlock, trader)
            if not result:
                print(f"[PROGRESS] Skipped copytrader {idx}: transaction analysis failed", file=sys.stderr)
                continue
            
            feeWalletsStr = ", ".join(result["feePaidTo"].keys()) if result["feePaidTo"] else "None"
            
            trader_info = {
                "Trader": trader,
                "Signature": shorten(txSig),
                "Block Delay": result["blockDelay"],
                "Bot Used": result["botUsed"],
                "Fee Wallet": feeWalletsStr,
                "Fee Paid": result["feePaid"],
                "SOL Bought": f"{result['solAmountBought']:.8f}"
            }
            results.append(trader_info)
            print(f"[PROGRESS] Completed copytrader {idx}/{total_traders}: {result['botUsed']} bot, {result['blockDelay']} block delay", file=sys.stderr)
        
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
    main()