import csv
import sys
import json
import random
import time
import tls_client
import io
from fake_useragent import UserAgent
# --- FIREBASE ADMIN SDK ---
import os
import firebase_admin
from firebase_admin import credentials, firestore

# --- FIREBASE INITIALIZATION ---
if not firebase_admin._apps:
    cred_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
    if not cred_path or not os.path.exists(cred_path):
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_KEY_PATH env variable not set or file does not exist.")
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
db = firestore.client()

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
    """
    Safely extract feePaidTo and feePaid (in SOL) from any parsed "transfer" instructions.
    Returns (feePaidToDict, totalFeePaidInSOL).
    """
    feePaidTo = {}
    feePaid = 0

    instr_list = txData.get("result", {}) \
                       .get("transaction", {}) \
                       .get("message", {}) \
                       .get("instructions", [])
    for instr in instr_list:
        # Skip if not a dict (e.g. sometimes RPC returns simple strings in the instructions array)
        if not isinstance(instr, dict):
            continue

        parsed = instr.get("parsed")
        # Skip if no "parsed" field or if parsed is not a dict
        if not isinstance(parsed, dict):
            continue

        if parsed.get("type") == "transfer":
            info = parsed.get("info", {})
            dest = info.get("destination")
            lamports = int(info.get("lamports", 0))
            if dest in feeWallets:
                solAmount = lamports / 1_000_000_000
                feePaidTo[feeWallets[dest]] = solAmount
                feePaid += solAmount

    return feePaidTo, feePaid

def getSolAmountBought(txData: dict) -> float:
    solAmount = 0
    
    def find_transfers(instructions):
        nonlocal solAmount
        for instr in instructions:
            if not isinstance(instr, dict):
                continue

            if instr.get("program") == "system" and instr.get("parsed", {}).get("type") == "transfer":
                lamports = instr.get("parsed", {}).get("info", {}).get("lamports")
                if lamports:
                    solAmount += lamports / 1e9
            
            # Recursively check for inner instructions, though this is less common for top-level instructions.
            if "innerInstructions" in instr:
                find_transfers(instr["innerInstructions"])

    # Check top-level instructions
    top_level_instructions = txData.get("result", {}).get("transaction", {}).get("message", {}).get("instructions", [])
    find_transfers(top_level_instructions)

    # Check inner instructions grouped by top-level instruction index
    inner_instructions_groups = txData.get("result", {}).get("meta", {}).get("innerInstructions", [])
    for group in inner_instructions_groups:
        find_transfers(group.get("instructions", []))
        
    return solAmount

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
    "NextbLoCkVtMGcV47JzewQdvBpLqT9TxFozQkN98pE": "Next Block 3",
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
    "6fQaVhYZA4w3MBSXj81Vf6W1EDYeUPXpgVQ6UQyU1Av": "0slot",
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

    def getPNL(self, contractAddress: str, walletAddress: str):
        url = f"https://gmgn.ai/defi/quotation/v1/smartmoney/sol/walletstat/{walletAddress}?token_address={contractAddress}&period=1d"
        for _ in range(3):
            self.randomiseRequest()
            try:
                response = self.session.get(url, headers=self.headers)
                if response.status_code == 200:
                    tokenData = response.json().get('data', {})

                    profit_usd_raw = tokenData.get('total_profit')
                    profit_percent_raw = tokenData.get('realized_profit_pnl')

                    profitUsd = f"${float(profit_usd_raw):,.2f}" if profit_usd_raw is not None else "N/A"
                    
                    profitPercent = f"{float(profit_percent_raw):,.2f}%" if profit_percent_raw else "N/A"

                    return profitUsd, profitPercent
                else:
                    print(f"Attempt failed for wallet {walletAddress} - Status: {response.status_code}")

            except Exception as e:
                print(f"Attempt failed for wallet {walletAddress}: {e}")
        return "N/A", "N/A"

    def getLastBuy(self, walletAddress: str):
        url = f"https://gmgn.mobi/api/v1/wallet_activity/sol?type=buy&wallet={walletAddress}&limit=10&cost=10"
        for _ in range(3):
            self.randomiseRequest()
            try:
                activities = self.session.get(url, headers=self.headers).json()['data']['activities']
                buys = [act for act in activities if act.get("event_type") == "buy"]
                if not buys:
                    print(f"No buy events found for {walletAddress}")
                    continue
                lastToken = max(buys, key=lambda x: x['timestamp'])['token']['address']
                tokenBuys = [act for act in buys if act['token']['address'] == lastToken]
                firstTokenBuy = min(tokenBuys, key=lambda x: x['timestamp'])
                return firstTokenBuy['tx_hash'], firstTokenBuy['token']['address']
            except Exception as e:
                print(f"Attempt failed for wallet {walletAddress}: {e}")
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
        if not txData.get("result"):
            print(f"Failed to fetch transaction data for {transaction}. Response: {txData}")
            return None, txData
        if txData["result"]['meta']["err"] is not None or not checkTxIsBuy(txData):
            return None, txData
        with open('tx_data.json', 'w') as f:
            json.dump(txData, f, indent=4)
        return int(txData['result']['slot']), txData

    def getPotentialCopyTraders(self, startBlock: int, walletAddress: str, contractAddress: str, blockLimit: int):
        mainTx = None
        potentialTraders = {}
        for currentBlock in range(startBlock, startBlock + blockLimit + 1):
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getBlock",
                "params": [currentBlock, {"encoding": "json", "maxSupportedTransactionVersion": 0,
                                            "transactionDetails": "full", "rewards": False}]
            }
            data = self.session.post(self.rpcUrl, json=payload).json()
            if not data.get("result"):
                print(f"Warning: Could not fetch block {currentBlock}. Response: {data}. Skipping.")
                continue
            transactions = data['result']['transactions']
            if currentBlock == startBlock:
                for tx in transactions:
                    if walletAddress in tx['transaction']['message']['accountKeys']:
                        postBalances = tx['meta'].get('postTokenBalances', [])
                        if postBalances and postBalances[0].get('mint') == contractAddress:
                            mainTx = tx['transaction']['signatures'][0]
                            break
            for tx in transactions:
                trader = tx['transaction']['message']['accountKeys'][0]
                if trader == walletAddress:
                    continue
                postBalances = tx['meta'].get('postTokenBalances', [])
                if any(balance.get('mint') == contractAddress for balance in postBalances):
                    if trader not in potentialTraders:
                        potentialTraders[trader] = (tx['transaction']['signatures'][0], currentBlock)
        uniqueTraders = [(w, sig, blk) for w, (sig, blk) in potentialTraders.items()]
        return mainTx, startBlock, uniqueTraders

def processTransaction(finder: CopyWalletFinder, txSignature: str, mainBlock: int, wallet: str):
    botUsed = botAccounts.get(wallet, "")
    feePaidTo, feePaid, solBought = {}, 0, 0
    blockInfo, txData = finder.getBlockHash(txSignature)
    if blockInfo is None:
        return None
    for instr in txData["result"]["transaction"]["message"]["instructions"]:
        if isinstance(instr, dict) and "programId" in instr and instr["programId"] in botAccounts:
            botUsed = botAccounts[instr["programId"]]
            break
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

def main():
    """
    Main execution function.
    """
    # Build the absolute path to config.json relative to this script
    script_dir = os.path.dirname(__file__)
    config_path = os.path.join(script_dir, 'config.json')

    try:
        with open(config_path) as f:
            config = json.load(f)
    except FileNotFoundError:
        print(f"Error: Configuration file not found at {config_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {config_path}", file=sys.stderr)
        sys.exit(1)

    rpcUrl = config.get("rpc_url")
    walletAddress = config.get("walletAddress")
    blockLimit = config['blockLimit']
    
    if not walletAddress:
        print("No target wallet address found")
        sys.exit(1)

    finder = CopyWalletFinder(rpcUrl)
    transaction, contractAddress = finder.getLastBuy(walletAddress)
    if not transaction or not contractAddress:
        print("Could not retrieve main wallet transaction details")
        sys.exit(1)

    mainBlock, txData = finder.getBlockHash(transaction)
    if mainBlock is None:
        print("Main transaction failed or did not meet the criteria; cannot proceed.")
        sys.exit(1)

    mainSolBought = getSolAmountBought(txData)

    _, mainBlock, potentialTraders = finder.getPotentialCopyTraders(mainBlock, walletAddress, contractAddress, blockLimit)
    detected_copy_traders = []

    for trader, txSig, contestantBlock in potentialTraders:
        result = processTransaction(finder, txSig, mainBlock, trader)
        if not result:
            continue
        profitUsd, profitPercent = finder.getPNL(contractAddress, trader)
        # Parse profitUsd (e.g., '$123.45') and profitPercent (e.g., '5.67%') to floats
        try:
            profit_usd_val = float(profitUsd.replace('$','').replace(',','')) if profitUsd and profitUsd != 'N/A' else None
        except Exception:
            profit_usd_val = None
        try:
            profit_percent_val = float(profitPercent.replace('%','')) if profitPercent and profitPercent != 'N/A' else None
        except Exception:
            profit_percent_val = None
        trader_data = {
            'trader': trader,
            'hash': result['hash'],
            'blockDelay': result['blockDelay'],
            'botUsed': result['botUsed'],
            'feePaidTo': result['feePaidTo'],
            'feePaid': result['feePaid'],
            'solAmountBought': result['solAmountBought'],
            'profit_usd': profit_usd_val,
            'profit_percent': profit_percent_val
        }
        detected_copy_traders.append(trader_data)
        # Update each trader's wallet doc
        wallet_ref = db.collection('wallets').document(trader)
        wallet_ref.set({
            'discovered_by': firestore.ArrayUnion(['CopyTrade_Analyzer']),
            'updated_at': firestore.SERVER_TIMESTAMP
        }, merge=True)

    # Update pro wallet doc
    pro_wallet_ref = db.collection('wallets').document(walletAddress)
    copy_trade_analysis = {
        'is_pro_wallet': True,
        'target_token_address': contractAddress,
        'target_transaction_hash': transaction,
        'target_block': mainBlock,
        'target_sol_bought': mainSolBought,
        'detected_copy_traders': detected_copy_traders
    }
    pro_wallet_ref.set({
        'copy_trade_analysis': copy_trade_analysis,
        'updated_at': firestore.SERVER_TIMESTAMP,
        'discovered_by': firestore.ArrayUnion(['CopyTrade_Analyzer'])
    }, merge=True)

    # Get initial buy info for logging, with robust error handling
    sol_bought_info = "N/A"
    try:
        rpc_url = config.get("rpc_url", "https://api.mainnet-beta.solana.com")
        response = finder.session.get(
            rpc_url,
            json={'jsonrpc': '2.0', 'id': 1, 'method': 'getTransaction', 'params': [transaction, 'jsonParsed']}
        )
        if response.status_code == 200:
            tx_data = response.json()
            if tx_data.get("result"):
                sol_bought_info = getSolAmountBought(tx_data)
            else:
                error_message = tx_data.get('error', {}).get('message', 'Unknown RPC error')
                print(f"Warning: RPC error fetching tx {transaction}: {error_message}", file=sys.stderr)
        else:
            print(f"Warning: Could not fetch initial buy info for tx {transaction}. Status: {response.status_code}", file=sys.stderr)
    except (tls_client.exceptions.TLSClientError, json.JSONDecodeError) as e:
        print(f"Warning: Could not fetch initial buy info for tx {transaction}. Error: {e}", file=sys.stderr)

    # Print informational logs to stderr so they don't corrupt the CSV output
    print(f"Target Wallet: {walletAddress} - {shorten(transaction)} - Block: {mainBlock} - Bought: {sol_bought_info} SOL", file=sys.stderr)
    print("Finding potential copy traders...", file=sys.stderr)

    output = io.StringIO()
    writer = csv.writer(output)
    header = ["Trader", "Signature", "Block Delay", "Bot Used", "Tx Processor/Fee Wallet", "Fee Paid", "SOL Bought", "Profit/USD", "Profit/%"]
    writer.writerow(header)

    for trader in detected_copy_traders:
        feeWalletsStr = ", ".join(trader["feePaidTo"].keys())
        writer.writerow([
            trader['trader'],
            shorten(trader['hash']),
            str(trader['blockDelay']),
            trader['botUsed'],
            feeWalletsStr,
            f"{trader['feePaid']} SOL",
            f"{trader['solAmountBought']:.8f} SOL",
            trader['profit_usd'] if trader['profit_usd'] is not None else 'N/A',
            trader['profit_percent'] if trader['profit_percent'] is not None else 'N/A'
        ])

    # Get the CSV string and print ONLY that to stdout
    csv_output = output.getvalue()
    output.close()
    sys.stdout.write(csv_output)

if __name__ == "__main__":
    main()
