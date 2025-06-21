import streamlit as st
import pandas as pd
from google.cloud import firestore
import os
import json
import sys
import plotly.express as px

# Add project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils import display_firestore_table

# --------------------------------------------------------------------------------
# Page Configuration
# --------------------------------------------------------------------------------
st.set_page_config(layout="wide", page_title="SOLENS AI | Dashboard", page_icon="frontend/assets/solens-logo-white.png")

# --------------------------------------------------------------------------------
# Caching Functions
# --------------------------------------------------------------------------------
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
def fetch_data(_db_client, collection_name):
    """Fetches and caches data from a Firestore collection."""
    try:
        docs = _db_client.collection(collection_name).stream()
        data = []
        for doc in docs:
            doc_data = doc.to_dict()
            doc_data['id'] = doc.id  # Explicitly add the document ID
            data.append(doc_data)
        return pd.DataFrame(data)
    except Exception as e:
        st.error(f"Error fetching data from '{collection_name}': {e}")
        return pd.DataFrame()

# --------------------------------------------------------------------------------
# Main Dashboard
# --------------------------------------------------------------------------------
def dashboard():
    st.title("Welcome to SOLENS AI")
    st.markdown("Your central hub for Solana smart money analytics and insights.")

    db = get_firestore_client()
    df_wallets = fetch_data(db, 'wallets')

    if df_wallets.empty:
        st.info("No wallet data found. Please run the 'Update Wallets' tool to begin.")
        st.stop()

    # --- Key Metrics ---
    st.subheader("Platform At a Glance")
    
    # Expand nested data for calculations
    df_normalized = pd.json_normalize(df_wallets.to_dict('records'), sep='_')
    df_normalized.columns = [col.lower() for col in df_normalized.columns] # Ensure consistent casing
    
    total_pnl = df_normalized['on_chain_data_pnl_sol'].sum() if 'on_chain_data_pnl_sol' in df_normalized.columns else 0
    avg_win_rate = df_normalized['on_chain_data_win_rate'].mean() if 'on_chain_data_win_rate' in df_normalized.columns else 0
    wallet_count = len(df_wallets)
    
    # Calculate unique tokens (more complex, requires parsing)
    # This is a simplified example; a robust version would handle multiple token fields
    try:
        all_tokens = df_normalized['on_chain_data_top_tokens_by_trades'].explode().dropna()
        unique_tokens = all_tokens.apply(lambda x: x.get('token_address')).nunique()
    except KeyError:
        unique_tokens = "N/A" # Fallback if column doesn't exist

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric(label="Total Realized PnL", value=f"{total_pnl:,.2f} SOL")
    with col2:
        st.metric(label="Avg. Win Rate", value=f"{avg_win_rate:.2%}")
    with col3:
        st.metric(label="Tracked Wallets", value=f"{wallet_count}")
    with col4:
        st.metric(label="Unique Tokens Traded", value=unique_tokens)

    st.markdown("---")

    # --- AI Insights Section ---
    if 'ai_insights_overall_smart_score' in df_normalized.columns:
        st.subheader("🏆 Top AI-Ranked Wallets")
        df_sorted_ai = df_normalized.sort_values(by='ai_insights_overall_smart_score', ascending=False).head(5)
        
        for _, row in df_sorted_ai.iterrows():
            id_val = row.get('id', 'N/A')
            score = row.get('ai_insights_overall_smart_score', 0)
            tags = row.get('ai_insights_tags_ml', [])
            pnl = row.get('on_chain_data_pnl_sol', 0)
            
            with st.container(border=True):
                st.markdown(f"**Wallet:** `{id_val}`")
                col1, col2, col3 = st.columns(3)
                col1.metric("AI Smart Score", f"{score:.0f}")
                col2.metric("PnL", f"{pnl:,.2f} SOL")
                col3.write("**ML Tags:**")
                col3.write(", ".join(tags) if tags and isinstance(tags, list) else "None")
        st.markdown("---")


    # --- Wallets Overview Table ---
    # Helper class to mimic Firestore document structure for display function
    class MockDocument:
        def __init__(self, data):
            self._data = data
        def to_dict(self):
            return self._data

    # Convert dataframe back to list of mock documents for the display function
    docs_for_display = [MockDocument(rec) for rec in df_wallets.to_dict('records')]

    display_firestore_table(docs_for_display, title="Wallets Overview")
    
    st.info("💡 Some columns like 'SOL Balance' or '% PnL' will only appear after you run the 'On-Chain Analyzer' from the sidebar.", icon="ℹ️")

    st.markdown("---")

    # --- Insights & Trends ---
    st.subheader("Insights & Trends")
    
    col1, col2 = st.columns(2)

    with col1:
        st.write("#### AI Smart Score Distribution")
        if 'ai_insights_overall_smart_score' in df_normalized.columns:
            fig = px.histogram(df_normalized, x='ai_insights_overall_smart_score', nbins=20,
                               title="Distribution of AI Smart Scores",
                               labels={'ai_insights_overall_smart_score': 'AI Smart Score'})
            fig.update_layout(yaxis_title="Number of Wallets")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("AI Insights not available. Run the ML Processor.")

    with col2:
        st.write("#### Win Rate Distribution")
        if 'on_chain_data_win_rate' in df_normalized.columns:
            fig = px.histogram(df_normalized, x='on_chain_data_win_rate', nbins=20,
                               title="Distribution of Trader Win Rates",
                               labels={'on_chain_data_win_rate': 'Win Rate'})
            fig.update_layout(xaxis_tickformat=".0%", yaxis_title="Number of Wallets")
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("On-chain data not available.")
            
    st.info("Additional charts, such as PnL over time and top token performance, are planned for future updates.")


if __name__ == "__main__":
    dashboard() 