import streamlit as st
import subprocess
import os
import sys
from google.cloud import firestore
import pandas as pd

# Add project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils import display_firestore_table

st.set_page_config(layout="wide", page_title="On-Chain Analyzer", page_icon="frontend/assets/solens-logo-white.png")
st.title("On-Chain Analyzer")
st.markdown("Run on-chain analysis to calculate performance metrics for tracked wallets.")

# --- Firestore Connection ---
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

@st.cache_data(ttl=60)
def fetch_wallets_with_onchain_data(_db_client):
    """Fetches and caches wallet data with on-chain analysis from Firestore."""
    try:
        docs = _db_client.collection('wallets').stream()
        data = []
        for doc in docs:
            wallet_data = doc.to_dict()
            wallet_data['id'] = doc.id # Explicitly add the document ID
            data.append(wallet_data)
        # Filter wallets that have on-chain data
        wallets_with_data = [w for w in data if w.get('on_chain_data')]
        return wallets_with_data
    except Exception as e:
        st.error(f"Error fetching wallet data: {e}")
        return []

# --- Main Analysis Function ---
def run_onchain_analysis(force_rerun=False):
    """Handles the on-chain analysis process with enhanced feedback."""
    
    # Create status container for real-time updates
    status_container = st.container()
    
    with status_container:
        st.info("🔄 Preparing to run on-chain analysis...")
    
    try:
        with status_container:
            st.info("📡 Processing wallet transactions and calculating metrics...")
        
        command = ["python", "../backend/python_scripts/on_chain_analyzer.py"]
        if force_rerun:
            command.append("--force-rerun") # Add a flag to the script if needed

        result = subprocess.run(
            command,
            capture_output=True, text=True, check=False
        )
        
        # Always show the output for debugging purposes
        st.markdown("---")
        st.subheader("🔍 Script Execution Details")
        
        with st.expander("Show Script Output", expanded=True):
            st.text("Return Code:")
            st.code(result.returncode, language='text')
            
            if result.stdout:
                st.text("Script Output (stdout):")
                st.code(result.stdout, language='text')
            else:
                st.info("Script produced no standard output.")
                
            if result.stderr:
                st.text("Error Log (stderr):")
                st.code(result.stderr, language='text')
            else:
                st.info("Script produced no standard errors.")

        if result.returncode == 0:
            with status_container:
                st.success("✅ On-chain analysis script finished successfully!")
            
            # Fetch and display updated data
            st.markdown("---")
            st.subheader("📊 Analysis Results")
            
            db = get_firestore_client()
            wallets_data = fetch_wallets_with_onchain_data(db)
            
            if wallets_data:
                # Create mock documents for display function
                class MockDocument:
                    def __init__(self, data):
                        self._data = data
                    def to_dict(self):
                        return self._data
                
                docs_for_display = [MockDocument(wallet) for wallet in wallets_data]
                display_firestore_table(docs_for_display, title="Wallets with On-Chain Analysis")
                
                # Show summary metrics
                st.markdown("---")
                st.subheader("📈 Analysis Summary")
                
                # Calculate key metrics from on-chain data
                total_pnl = sum(w.get('on_chain_data', {}).get('pnl_sol', 0) for w in wallets_data)
                avg_win_rate = sum(w.get('on_chain_data', {}).get('win_rate', 0) for w in wallets_data) / len(wallets_data) if wallets_data else 0
                total_volume = sum(w.get('on_chain_data', {}).get('total_volume_sol', 0) for w in wallets_data)
                total_trades = sum(w.get('on_chain_data', {}).get('total_trades', 0) for w in wallets_data)
                
                col1, col2, col3, col4 = st.columns(4)
                with col1:
                    st.metric("Total PnL", f"{total_pnl:,.2f} SOL")
                with col2:
                    st.metric("Avg Win Rate", f"{avg_win_rate:.2%}")
                with col3:
                    st.metric("Total Volume", f"{total_volume:,.2f} SOL")
                with col4:
                    st.metric("Total Trades", f"{total_trades:,}")
                
                # Show detailed metrics breakdown
                st.markdown("---")
                st.subheader("🔍 Detailed Metrics Breakdown")
                
                # Create a detailed metrics table
                detailed_metrics = []
                for wallet in wallets_data:
                    onchain = wallet.get('on_chain_data', {})
                    metrics = {
                        'wallet_id': wallet.get('id', 'N/A'),
                        'pnl_sol': onchain.get('pnl_sol', 0),
                        'win_rate': onchain.get('win_rate', 0),
                        'total_volume_sol': onchain.get('total_volume_sol', 0),
                        'total_trades': onchain.get('total_trades', 0),
                        'sol_balance_change': onchain.get('sol_balance_change', 0),
                        'swap_count': onchain.get('swap_count', 0),
                        'total_transactions': onchain.get('total_transactions', 0)
                    }
                    detailed_metrics.append(metrics)
                
                if detailed_metrics:
                    df_metrics = pd.DataFrame(detailed_metrics)
                    
                    # Format the dataframe for display
                    df_display = df_metrics.copy()
                    df_display['win_rate'] = df_display['win_rate'].apply(lambda x: f"{x:.2%}")
                    df_display['pnl_sol'] = df_display['pnl_sol'].apply(lambda x: f"{x:,.4f}")
                    df_display['total_volume_sol'] = df_display['total_volume_sol'].apply(lambda x: f"{x:,.4f}")
                    df_display['sol_balance_change'] = df_display['sol_balance_change'].apply(lambda x: f"{x:,.2f}")
                    
                    # Rename columns for better display
                    df_display.columns = ['Wallet ID', 'PnL (SOL)', 'Win Rate', 'Volume (SOL)', 'Trades', 'SOL Balance Change', 'Swaps', 'Total TXs']
                    
                    st.dataframe(df_display, use_container_width=True)
                
            else:
                st.warning("No wallets with on-chain data found. The analysis may not have processed any wallets.")
                
        else:
            with status_container:
                st.error("❌ Error reported during on-chain analysis script execution!")
            
            # Display detailed error information
            st.markdown("---")
            st.subheader("🔍 Error Details")
            
            if result.stdout:
                st.text("Script Output:")
                st.code(result.stdout, language='text')
            if result.stderr:
                st.text("Error Log:")
                st.code(result.stderr, language='text')
                
    except Exception as e:
        with status_container:
            st.error(f"❌ Unexpected error when trying to run the script: {str(e)}")

# --- UI Components ---
col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    st.markdown("<div style='text-align: center;'>", unsafe_allow_html=True)
    run_button = st.button("🔍 Run On-Chain Analysis", key="on_chain_analyzer", type="primary", use_container_width=True)
    force_rerun_checkbox = st.checkbox("Bypass cache and force re-analysis", help="This may take longer but ensures the latest data is processed.")
    st.markdown("</div>", unsafe_allow_html=True)

if run_button:
    run_onchain_analysis(force_rerun=force_rerun_checkbox)

# --- Current Data Preview ---
st.markdown("---")
with st.expander("👀 Preview Current On-Chain Data", expanded=False):
    try:
        db = get_firestore_client()
        current_wallets = fetch_wallets_with_onchain_data(db)
        
        data_exists = not current_wallets.empty if isinstance(current_wallets, (pd.Series, pd.DataFrame)) else current_wallets

        if data_exists:
            st.info(f"Currently have on-chain data for {len(current_wallets)} wallets")
            
            class MockDocument:
                def __init__(self, data):
                    self._data = data
                def to_dict(self):
                    return self._data

            wallet_list = current_wallets.to_list() if isinstance(current_wallets, pd.Series) else current_wallets
            sample_docs = [MockDocument(wallet) for wallet in wallet_list[:5]]
            display_firestore_table(sample_docs, title="Sample of Current On-Chain Data")

            if len(wallet_list) > 5:
                st.info(f"... and {len(wallet_list) - 5} more wallets with on-chain data")
        else:
            st.info("No wallets with on-chain data found. Run the analyzer to generate it.")
            
    except Exception as e:
        st.error(f"Error loading current data: {e}")

# --- Analysis Information ---
st.markdown("---")
st.markdown("""
### 📋 What the On-Chain Analyzer Does

The On-Chain Analyzer processes transaction data for tracked wallets and calculates key performance metrics:

**Key Metrics Calculated:**
- **PnL (SOL)**: Realized profit/loss from SOL-based trades
- **Win Rate**: Percentage of profitable trades
- **Total Volume**: Total trading volume in SOL
- **SOL Balance Change**: Net change in SOL balance over the analysis period
- **Trade Counts**: Number of complete trades and total transactions
- **Swap Analysis**: Number of SOL swaps performed

**Process:**
1. Fetches transaction history for each tracked wallet
2. Analyzes SOL-based trading patterns
3. Calculates performance metrics
4. Updates the `on_chain_data` field in Firestore documents

### ⚠️ Important Notes
- Analysis may take several minutes depending on the number of wallets
- Only wallets with recent transaction activity will be processed
- Results are stored in the `on_chain_data` sub-object of each wallet document
- Visit the **Dashboard** page to see comprehensive analytics with these metrics
""")

# --- Instructions ---
st.markdown("---")
st.markdown("""
### 🚀 Instructions
1. Click the **Run On-Chain Analysis** button to start processing
2. Wait for the analysis to complete (this may take several minutes)
3. View the results in the table above
4. Check the detailed metrics breakdown for insights
5. Visit the **Dashboard** page to see these metrics integrated with other data

### 🔄 When to Run
- After updating wallets with new data
- When you want to refresh performance calculations
- Before analyzing copy trading opportunities
- To get the latest trading performance metrics
""") 