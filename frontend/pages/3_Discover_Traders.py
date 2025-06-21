import streamlit as st
import subprocess
import os
import sys
from google.cloud import firestore
import pandas as pd

# Add project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils import display_firestore_table

st.set_page_config(layout="wide", page_title="Discover New Traders", page_icon="frontend/assets/solens-logo-white.png")
st.title("🔎 Discover New Traders")
st.markdown("Discover new, high-potential traders by scanning top-performing tokens. This process finds the best traders who have recently been active in trending tokens.")

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
def fetch_tokens(_db_client):
    """Fetches and caches token data from Firestore."""
    try:
        docs = _db_client.collection('tokens').stream()
        data = []
        for doc in docs:
            token_data = doc.to_dict()
            token_data['id'] = doc.id # Explicitly add the document ID
            data.append(token_data)
        return data
    except Exception as e:
        st.error(f"Error fetching token data: {e}")
        return []

@st.cache_data(ttl=60)
def fetch_wallets(_db_client):
    """Fetches and caches wallet data from Firestore."""
    try:
        docs = _db_client.collection('wallets').stream()
        data = []
        for doc in docs:
            wallet_data = doc.to_dict()
            wallet_data['id'] = doc.id # Explicitly add the document ID
            data.append(wallet_data)
        return data
    except Exception as e:
        st.error(f"Error fetching wallet data: {e}")
        return []

# --- Main Discovery Function ---
def discover_new_traders():
    """Handles the trader discovery process with enhanced feedback."""
    
    db = get_firestore_client()
    
    # --- 1. Get initial counts ---
    initial_tokens = fetch_tokens(db)
    initial_wallets = fetch_wallets(db)
    initial_token_count = len(initial_tokens)
    initial_wallet_count = len(initial_wallets)

    # --- Variables to hold script output ---
    script_stdout = ""
    script_stderr = ""

    with st.status("Discovering new traders...", expanded=True) as status:
        try:
            status.write("Executing discovery script... This may take a moment.")
            
            env = os.environ.copy()
            env["FIREBASE_SERVICE_ACCOUNT_KEY"] = "../config/solensai-service-account.json"
            
            result = subprocess.run(
                ["node", "../backend/js_scrapers/gmgn_coins_traders.js"],
                capture_output=True, text=True, env=env, check=False
            )
            
            script_stdout = result.stdout
            script_stderr = result.stderr
            
            if result.returncode == 0:
                # --- 2. Get final counts and calculate differences ---
                st.cache_data.clear() # Clear cache to get fresh data
                final_tokens = fetch_tokens(db)
                final_wallets = fetch_wallets(db)
                final_token_count = len(final_tokens)
                final_wallet_count = len(final_wallets)
                
                new_tokens = final_token_count - initial_token_count
                new_wallets = final_wallet_count - initial_wallet_count

                status.update(label="Discovery complete!", state="complete")
                
                # --- 3. Display informative summary ---
                summary_message = f"✅ **Discovery complete!** "
                if new_tokens > 0:
                    summary_message += f"Found **{new_tokens}** new tokens. "
                if new_wallets > 0:
                    summary_message += f"Discovered **{new_wallets}** new trader wallets."
                if new_tokens == 0 and new_wallets == 0:
                    summary_message += "No new tokens or traders were found."
                
                st.success(summary_message)
                
            else:
                status.update(label="Error during discovery!", state="error")
                st.error("The discovery script encountered an error.")

        except Exception as e:
            status.update(label="An unexpected error occurred!", state="error")
            st.error(f"An unexpected error occurred: {str(e)}")

    # --- 4. Always show script output for debugging (outside the status expander) ---
    if script_stdout or script_stderr:
        with st.expander("Show Discovery Log", expanded=False):
            if script_stdout:
                st.code(script_stdout, language="log")
            if script_stderr:
                st.error("Errors reported by script:")
                st.code(script_stderr, language="log")

# --- UI Components ---
st.markdown("---")
if st.button("🚀 Discover Traders from Top Tokens", type="primary", use_container_width=True):
    discover_new_traders()

# --- Tokens & Traders Overview ---
st.markdown("---")
st.header("🪙 Recently Discovered Tokens & Traders")

db = get_firestore_client()
tokens_data = fetch_tokens(db)

if tokens_data:
    # Detailed token analysis
    st.markdown("#### Select a token to view its top traders:")
    
    token_options = [f"{t.get('token_name', 'Unknown')} ({t.get('token_symbol', 'N/A')})" for t in tokens_data]
    selected_token_idx = st.selectbox(
        "Select a token:", 
        range(len(tokens_data)), 
        format_func=lambda x: token_options[x],
        label_visibility="collapsed"
    )
    
    if selected_token_idx is not None:
        selected_token = tokens_data[selected_token_idx]
        
        st.markdown(f"**Showing traders for:** `{selected_token.get('token_address', 'N/A')}`")

        recent_traders = selected_token.get('recent_traders_from_gmgn', [])
        
        if recent_traders:
            traders_df = pd.DataFrame(recent_traders)
            # Define a simple display function for this table
            display_cols = {
                'wallet_address': 'Wallet Address',
                'copy_trading_score': 'Smart Score',
                'token_num_7d': 'Tokens (7d)',
                'pnl_sol_7d': 'PnL (7d)',
            }
            # Filter and rename columns
            traders_df = traders_df[[col for col in display_cols.keys() if col in traders_df.columns]]
            traders_df = traders_df.rename(columns=display_cols)
            
            st.dataframe(traders_df, use_container_width=True)
            
            if len(recent_traders) > 10:
                st.info(f"... and {len(recent_traders) - 10} more traders.")
        else:
            st.info("No recent traders found for this token in our database.")
else:
    st.info("No token data available. Run a discovery scan to populate the database.")

# --- Instructions ---
st.markdown("---")
st.markdown("""
### 📋 How It Works
1.  Click the **Discover Traders from Top Tokens** button to run the discovery script.
2.  The script analyzes top-performing tokens on external platforms (like gmgn.ai).
3.  It identifies the most successful traders of those tokens and adds them to our database.
4.  The results are displayed below, grouped by the token they were discovered through.
""") 