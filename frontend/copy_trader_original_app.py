import streamlit as st
import json
import pandas as pd
import sys
from main import CopyWalletFinder, processTransaction, getSolAmountBought, shorten

st.set_page_config(layout="wide", page_title="Solana Copy Trader Finder")

st.title("Find Copy Traders for a Specific Wallet")
st.write("Enter a single 'pro' wallet address to find its copy traders:")

# Load config
try:
    with open('config.json') as f:
        config = json.load(f)
    rpc_url = config['rpc_url']
    block_limit = config.get('blockLimit', 1) # Use get for safety
except FileNotFoundError:
    st.error("config.json not found. Please create it with your RPC URL and other settings.")
    st.stop()
except json.JSONDecodeError:
    st.error("Error decoding config.json. Please check its format.")
    st.stop()
except KeyError as e:
    st.error(f"Missing key in config.json: {e}")
    st.stop()


def find_copy_traders(wallet_address: str):
    """
    This function contains the core logic to find copy traders for a given wallet address.
    It's adapted from the main() function in main.py.
    """
    finder = CopyWalletFinder(rpc_url)

    with st.spinner(f"Searching for last buy transaction for wallet {shorten(wallet_address)}..."):
        transaction, contract_address = finder.getLastBuy(wallet_address)
        if not transaction or not contract_address:
            st.warning("Could not retrieve main wallet transaction details. The wallet might not have recent buy activity.")
            return None, None, None

    with st.spinner(f"Getting details for transaction {shorten(transaction)}..."):
        main_block, tx_data = finder.getBlockHash(transaction)
        if main_block is None:
            st.error("Main transaction failed or did not meet the criteria; cannot proceed.")
            return None, None, None

    main_sol_bought = getSolAmountBought(tx_data)
    main_tx_info = {
        "wallet_address": wallet_address,
        "contract_address": contract_address,
        "transaction": transaction,
        "main_block": main_block,
        "main_sol_bought": main_sol_bought
    }
    
    with st.spinner(f"Scanning blocks near block {main_block} for potential copy traders... (limit: {block_limit} blocks)"):
        _, main_block, potential_traders = finder.getPotentialCopyTraders(main_block, wallet_address, contract_address, block_limit)

    if not potential_traders:
        return main_tx_info, [], []

    rows = []
    headers = ["Trader", "Signature", "Block Delay", "Bot Used", "Tx Processor/Fee Wallet", "Fee Paid (SOL)", "SOL Bought", "Profit/PNL"]
    
    progress_text = f"Processing {len(potential_traders)} potential traders..."
    progress_bar = st.progress(0, text=progress_text)
    
    for i, (trader, tx_sig, contestant_block) in enumerate(potential_traders):
        result = processTransaction(finder, tx_sig, main_block, trader)
        if not result:
            continue

        profit_usd, profit_percent = finder.getPNL(contract_address, trader)
        
        if profit_percent != "N/A":
            profit_pnl = f"{profit_usd} ({profit_percent})"
        else:
            profit_pnl = profit_usd

        result["profitPNL"] = profit_pnl
        fee_wallets_str = ", ".join(result["feePaidTo"].keys())
        rows.append([
            trader,
            shorten(tx_sig),
            result["blockDelay"],
            result["botUsed"],
            fee_wallets_str,
            f"{float(result['feePaid']):.8f}",
            f"{result['solAmountBought']:.8f}",
            profit_pnl
        ])
        progress_bar.progress((i + 1) / len(potential_traders), text=f"Processing {i+1}/{len(potential_traders)} potential traders...")

    progress_bar.empty()
    return main_tx_info, headers, rows

wallet_input = st.text_input("Wallet Address", value=config.get('walletAddress', ''))

if st.button("Find Copy Traders"):
    if wallet_input:
        main_tx_info, headers, data = find_copy_traders(wallet_input)
        
        if main_tx_info:
            st.subheader("Target Wallet Transaction")
            st.text(f"Wallet: {main_tx_info['wallet_address']}")
            st.text(f"Last Token Buy: {main_tx_info['contract_address']}")
            st.text(f"Transaction: {main_tx_info['transaction']}")
            st.text(f"Block: {main_tx_info['main_block']}")
            st.text(f"Amount Bought: {main_tx_info['main_sol_bought']:.8f} SOL")

        if data:
            st.subheader(f"Found {len(data)} potential copy traders")
            df = pd.DataFrame(data, columns=headers)
            st.dataframe(df)
        elif main_tx_info: # If we have main_tx_info but no data
             st.info("No potential copy traders found for this wallet in the scanned block range.")

    else:
        st.warning("Please enter a wallet address.") 