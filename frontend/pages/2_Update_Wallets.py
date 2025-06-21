import streamlit as st
import subprocess
import os
import sys
from google.cloud import firestore
import pandas as pd

# Add project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils import display_firestore_table

st.set_page_config(layout="wide", page_title="Update Wallets", page_icon="frontend/assets/solens-logo-white.png")
st.title("Update Wallets Data")
st.markdown("Click the button below to run the wallet scraper and update the wallet data in Firestore.")

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

# --- Main Update Function ---
def update_wallets():
    """Handles the wallet update process with enhanced feedback."""
    
    db = get_firestore_client()
    
    # --- 1. Get initial wallet count ---
    try:
        initial_wallets = fetch_wallets(db)
        initial_count = len(initial_wallets)
    except Exception:
        initial_count = 0

    with st.status("Updating wallet list...", expanded=True) as status:
        try:
            status.write("Executing wallet scraper... This may take a moment.")
            
            env = os.environ.copy()
            env["FIREBASE_SERVICE_ACCOUNT_KEY"] = "../config/solensai-service-account.json"
            
            result = subprocess.run(
                ["node", "../backend/js_scrapers/gmgn_wallet_scraper.js"],
                capture_output=True, text=True, env=env, check=False
            )
            
            if result.returncode == 0:
                # --- 2. Get final wallet count and calculate difference ---
                st.cache_data.clear() # Clear cache to get fresh data
                final_wallets = fetch_wallets(db)
                final_count = len(final_wallets)
                new_wallets = final_count - initial_count
                
                status.update(label="Update complete!", state="complete")
                
                # --- 3. Display informative summary ---
                if new_wallets > 0:
                    st.success(f"✅ Update complete: **{new_wallets} new wallets added!** Total wallets: {final_count}")
                else:
                    st.success(f"✅ Update complete: **No new wallets found.** Total wallets: {final_count}")

            else:
                status.update(label="Error during update!", state="error")
                st.error("The wallet scraper encountered an error.")
                if result.stderr:
                    st.code(result.stderr, language="log")

        except Exception as e:
            status.update(label="An unexpected error occurred!", state="error")
            st.error(f"An unexpected error occurred: {str(e)}")

# --- UI Components ---
st.markdown("---")
# Centralized button
col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    if st.button("🔄 Update Wallet List", key="update_wallets", type="primary", use_container_width=True):
        update_wallets()

# --- Current Data Preview ---
st.markdown("---")
with st.expander("👀 Preview Current Wallet Data", expanded=False):
    try:
        db = get_firestore_client()
        current_wallets = fetch_wallets(db)
        
        if current_wallets:
            st.info(f"Currently tracking {len(current_wallets)} wallets")
            
            # Show a sample of current data
            class MockDocument:
                def __init__(self, data):
                    self._data = data
                def to_dict(self):
                    return self._data
            
            sample_docs = [MockDocument(wallet) for wallet in current_wallets[:5]]  # Show first 5
            display_firestore_table(sample_docs, title="Sample of Current Wallets")
            
            if len(current_wallets) > 5:
                st.info(f"... and {len(current_wallets) - 5} more wallets")
        else:
            st.info("No wallet data currently available. Run an update to populate the database.")
    except Exception as e:
        st.error(f"Error loading current data: {e}")

# --- Instructions ---
st.markdown("---")
st.markdown("""
### 📋 Instructions
1. Click the **Update Wallets Now** button to run the scraper
2. Wait for the process to complete (this may take several minutes)
3. View the updated data in the table above
4. Visit the **Dashboard** page to see comprehensive analytics

### ⚠️ Notes
- The scraper fetches data from external sources and may take time to complete
- Only new or updated wallet data will be added to the database
- Check the error details if the update fails
""") 