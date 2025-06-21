import streamlit as st
import subprocess
import os
import json
import io
import pandas as pd
import sys
from google.cloud import firestore

# Add project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils import display_firestore_table

st.set_page_config(layout="wide", page_title="Copy Trader Analyzer", page_icon="frontend/assets/solens-logo-white.png")

# --- Firestore Connection (cached) ---
@st.cache_resource
def get_firestore_client():
    """Establishes a cached connection to Firestore."""
    # Try local path first - best for local development
    cred_path = "../config/solensai-service-account.json"
    if os.path.exists(cred_path):
        try:
            return firestore.Client.from_service_account_json(cred_path)
        except Exception as e:
            st.error(f"Failed to connect to Firestore using local key: {e}")
            st.stop()

    # Fallback to Streamlit secrets - for deployment
    try:
        if 'firestore_service_account' in st.secrets:
            creds_json = st.secrets['firestore_service_account']
            return firestore.Client.from_service_account_info(creds_json)
    except Exception:
        # This will fail if secrets.toml doesn't exist, which is fine
        pass

    # If neither method works, show an error
    st.error("Failed to connect to Firestore. Please set up your credentials either via a local '../config/solensai-service-account.json' file or Streamlit secrets.")
    st.stop()

@st.cache_data(ttl=300)
def fetch_wallet_data(_db_client, wallet_address):
    """Fetches wallet data from Firestore for a specific address."""
    try:
        doc = _db_client.collection('wallets').document(wallet_address).get()
        if doc.exists:
            wallet_data = doc.to_dict()
            wallet_data['id'] = doc.id # Explicitly add the document ID
            return wallet_data
        return None
    except Exception as e:
        st.error(f"Error fetching wallet data: {e}")
        return None

# --- UI Component: Pro Wallet History ---
def display_pro_wallet_history(wallet_data):
    with st.container(border=True):
        st.subheader("Target Wallet Profile")
        if not wallet_data:
            st.info("Enter a wallet address to see its profile.")
            return

        is_pro = wallet_data.get('copy_trade_analysis', {}).get('is_pro_wallet', False)
        if is_pro:
            st.success("This wallet is classified as a 'Pro Wallet'.")
        else:
            st.info("This wallet is not classified as a 'Pro Wallet'.")

        # Display key metrics
        onchain_pnl = wallet_data.get('on_chain_data', {}).get('pnl_sol', 0)
        win_rate = wallet_data.get('on_chain_data', {}).get('win_rate', 0)
        smart_score = wallet_data.get('ai_insights', {}).get('overall_smart_score', 0)
        
        col1, col2, col3 = st.columns(3)
        col1.metric("PnL (SOL)", f"{onchain_pnl:,.2f}")
        col2.metric("Win Rate", f"{win_rate:.2%}")
        col3.metric("Smart Score", f"{smart_score:.0f}")

# --- UI Component: Analysis Summary ---
def display_analysis_summary(results_df, block_limit):
    with st.container(border=True):
        st.subheader("Analysis Summary")
        col1, col2, col3 = st.columns(3)
        col1.metric("Copy Traders Found", len(results_df))
        if 'similarity' in results_df.columns:
            avg_similarity = results_df['similarity'].mean()
            col2.metric("Avg. Similarity", f"{avg_similarity:.2%}")
        else:
            col2.metric("Analysis Type", "Pattern Match")
        col3.metric("Time Window", f"{block_limit} Blocks")

# --- Main App Logic ---
st.title("Copy Trader Analyzer")
st.markdown("Analyze a wallet to discover its trading patterns and identify potential copy traders.")

# Initialize session state for results
if 'copy_trader_results' not in st.session_state:
    st.session_state.copy_trader_results = None

# --- Layout Definition ---
left_col, right_col = st.columns([2, 1.2], gap="large")

with left_col:
    st.subheader("Target Wallet")
    wallet_address = st.text_input(
        "Enter the wallet address you want to analyze for copy trading activity:",
        placeholder="e.g., 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        key="wallet_input",
        label_visibility="collapsed"
    )
    
    run_button = st.button("▶️ Run Analysis", type="primary", use_container_width=True)
    
    # This container will hold the status and results of the analysis
    results_container = st.container()

with right_col:
    # Display Pro Wallet info immediately if address is available
    db = get_firestore_client()
    target_wallet_data = fetch_wallet_data(db, wallet_address) if wallet_address else None
    display_pro_wallet_history(target_wallet_data)

    # Tabs for additional information
    tab1, tab2, tab3 = st.tabs(["About", "Instructions", "Notes"])
    with tab1:
        st.markdown("""
        The Copy Trader Analyzer examines a wallet to identify others that may be copying its trades by looking at:
        - **Trading Timing**: When trades are executed relative to the target.
        - **Token Selection**: Which tokens are traded in common.
        - **Volume & Frequency**: Similarities in trading patterns.
        """)
    with tab2:
        st.markdown("""
        1.  Enter a wallet address in the input field.
        2.  Click **Run Analysis** to start.
        3.  Review the results table of potential copy traders.
        4.  Check the wallet profile on the right for performance metrics.
        """)
    with tab3:
        st.markdown("""
        - Analysis may take several minutes.
        - Only wallets with recent activity will be analyzed.
        - Pro wallets are more likely to have copy traders.
        """)
    
    # Placeholder for the summary, which will appear after analysis
    summary_container = st.container()

# --- Analysis Execution ---
if run_button:
    if not wallet_address:
        st.warning("Please enter a wallet address to analyze.")
    else:
        with results_container:
            with st.status("Running analysis...", expanded=True) as status:
                try:
                    st.write("Writing configuration file...")
                    config_path = "../backend/python_scripts/config.json"
                    app_config_path = "../config/app_config.json"
                    
                    with open(app_config_path) as f:
                        app_config = json.load(f)
                    
                    config_data = {
                        "rpc_url": app_config.get("rpc_url"),
                        "walletAddress": wallet_address,
                        "blockLimit": app_config.get("blockLimit", 1)
                    }
                    with open(config_path, "w") as f:
                        json.dump(config_data, f)
                    
                    st.write("Executing copy trader script...")
                    env = os.environ.copy()
                    env["FIREBASE_SERVICE_ACCOUNT_KEY_PATH"] = "../config/solensai-service-account.json"
                    
                    result = subprocess.run(
                        ["python", "../backend/python_scripts/copy_trader_analyzer.py"],
                        capture_output=True, text=True, env=env, check=False
                    )

                    if result.returncode == 0:
                        if result.stdout:
                            csv_data = io.StringIO(result.stdout)
                            df = pd.read_csv(csv_data)
                            st.session_state.copy_trader_results = df
                            status.update(label="Analysis complete!", state="complete")
                        else:
                            st.session_state.copy_trader_results = pd.DataFrame() # No results
                            status.update(label="Analysis finished, but no copy traders were found.", state="complete")
                    else:
                        st.session_state.copy_trader_results = None
                        status.update(label="Error during analysis!", state="error")
                        st.error(result.stderr or "An unknown error occurred.")

                except FileNotFoundError:
                    status.update(label="Configuration file not found!", state="error")
                    st.error(f"Configuration file not found at: {app_config_path}")
                except Exception as e:
                    status.update(label="An unexpected error occurred!", state="error")
                    st.error(f"Unexpected error: {str(e)}")

# --- Display Results After Analysis ---
if st.session_state.copy_trader_results is not None:
    with results_container:
        st.subheader("Copy Trader Analysis Results")
        if not st.session_state.copy_trader_results.empty:
            st.dataframe(st.session_state.copy_trader_results, use_container_width=True)
            # Display summary in the right column
            with summary_container:
                display_analysis_summary(st.session_state.copy_trader_results, app_config.get("blockLimit", 1))
        else:
            st.info("The analysis ran successfully, but no copy traders were detected for this wallet.") 