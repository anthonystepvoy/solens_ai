import streamlit as st
import subprocess
import os
import sys
from google.cloud import firestore
import pandas as pd
import plotly.express as px

# Add project root to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils import display_firestore_table

st.set_page_config(layout="wide", page_title="ML Processor", page_icon="frontend/assets/solens-logo-white.png")
st.title("ML Processor")
st.markdown("Run machine learning analysis to generate smart scores, predictive tags, and AI insights for all tracked wallets.")

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
def fetch_wallets_with_ai_insights(_db_client):
    """Fetches and caches wallet data with AI insights from Firestore."""
    try:
        docs = _db_client.collection('wallets').stream()
        data = []
        for doc in docs:
            wallet_data = doc.to_dict()
            wallet_data['id'] = doc.id # Explicitly add the document ID
            data.append(wallet_data)
        # Filter wallets that have AI insights
        wallets_with_ai = [w for w in data if w.get('ai_insights')]
        return wallets_with_ai
    except Exception as e:
        st.error(f"Error fetching wallet data: {e}")
        return []

@st.cache_data(ttl=60)
def fetch_all_wallets(_db_client):
    """Fetches all wallet data from Firestore."""
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

# --- ML Results Analysis ---
def analyze_ml_results(wallets_data):
    """Analyzes ML results and displays insights."""
    if not wallets_data:
        return
    
    st.markdown("---")
    st.subheader("🤖 ML Analysis Results")
    
    # Filter wallets with AI insights
    wallets_with_ai = [w for w in wallets_data if w.get('ai_insights')]
    
    if wallets_with_ai:
        # Create mock documents for display function
        class MockDocument:
            def __init__(self, data):
                self._data = data
            def to_dict(self):
                return self._data
        
        docs_for_display = [MockDocument(wallet) for wallet in wallets_with_ai]
        display_firestore_table(docs_for_display, title="Wallets with AI Insights")
        
        # Show summary metrics
        st.markdown("---")
        st.subheader("📊 ML Insights Summary")
        
        # Calculate key metrics
        smart_scores = [w.get('ai_insights', {}).get('overall_smart_score', 0) for w in wallets_with_ai]
        total_wallets = len(wallets_with_ai)
        avg_smart_score = sum(smart_scores) / len(smart_scores) if smart_scores else 0
        max_smart_score = max(smart_scores) if smart_scores else 0
        min_smart_score = min(smart_scores) if smart_scores else 0
        
        # Count wallets with predictions
        wallets_with_predictions = [w for w in wallets_with_ai if w.get('ai_insights', {}).get('predicted_next_move')]
        prediction_count = len(wallets_with_predictions)
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Wallets Processed", total_wallets)
        with col2:
            st.metric("Avg Smart Score", f"{avg_smart_score:.0f}")
        with col3:
            st.metric("Score Range", f"{min_smart_score:.0f} - {max_smart_score:.0f}")
        with col4:
            st.metric("With Predictions", prediction_count)
        
        # Smart Score Distribution Chart
        st.markdown("---")
        st.subheader("📈 Smart Score Distribution")
        
        if smart_scores:
            df_scores = pd.DataFrame({'Smart Score': smart_scores})
            
            fig = px.histogram(
                df_scores, 
                x='Smart Score', 
                nbins=20,
                title="Distribution of AI Smart Scores",
                labels={'Smart Score': 'Smart Score', 'count': 'Number of Wallets'}
            )
            fig.update_layout(
                xaxis_title="Smart Score",
                yaxis_title="Number of Wallets",
                showlegend=False
            )
            st.plotly_chart(fig, use_container_width=True)
        
        # Top Performing Wallets
        st.markdown("---")
        st.subheader("🏆 Top AI-Ranked Wallets")
        
        # Sort wallets by smart score
        top_wallets = sorted(wallets_with_ai, key=lambda x: x.get('ai_insights', {}).get('overall_smart_score', 0), reverse=True)[:5]
        
        for i, wallet in enumerate(top_wallets, 1):
            ai_insights = wallet.get('ai_insights', {})
            smart_score = ai_insights.get('overall_smart_score', 0)
            tags = ai_insights.get('tags_ml', [])
            prediction = ai_insights.get('predicted_next_move', 'No prediction')
            
            with st.container(border=True):
                st.markdown(f"**#{i} - Wallet:** `{wallet.get('id', 'N/A')}`")
                col1, col2, col3 = st.columns(3)
                col1.metric("Smart Score", f"{smart_score:.0f}")
                col2.write("**ML Tags:**")
                col2.write(", ".join(tags) if tags else "None")
                col3.write("**Prediction:**")
                col3.write(prediction)
        
        # Tag Analysis
        st.markdown("---")
        st.subheader("🏷️ ML Tag Analysis")
        
        # Collect all tags
        all_tags = []
        for wallet in wallets_with_ai:
            tags = wallet.get('ai_insights', {}).get('tags_ml', [])
            all_tags.extend(tags)
        
        if all_tags:
            # Count tag frequency
            tag_counts = pd.Series(all_tags).value_counts()
            
            # Display top tags
            st.markdown("**Most Common ML Tags:**")
            col1, col2 = st.columns(2)
            
            with col1:
                for tag, count in tag_counts.head(10).items():
                    st.write(f"• **{tag}**: {count} wallets")
            
            with col2:
                # Show tag distribution chart
                df_tags = pd.DataFrame({'Tag': tag_counts.index, 'Count': tag_counts.values})
                fig = px.bar(
                    df_tags.head(10), 
                    x='Tag', 
                    y='Count',
                    title="Top 10 ML Tags Distribution"
                )
                fig.update_layout(xaxis_tickangle=-45)
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("No ML tags found in the current data.")
        
        # Prediction Analysis
        if prediction_count > 0:
            st.markdown("---")
            st.subheader("🔮 Prediction Analysis")
            
            predictions = [w.get('ai_insights', {}).get('predicted_next_move') for w in wallets_with_predictions]
            prediction_counts = pd.Series(predictions).value_counts()
            
            st.markdown("**Predicted Next Moves:**")
            for prediction, count in prediction_counts.items():
                st.write(f"• **{prediction}**: {count} wallets")
        
    else:
        st.warning("No wallets with AI insights found. The ML processor may not have generated insights yet.")

# --- Main ML Processing Function ---
def run_ml_processor():
    """Handles the ML processing with enhanced feedback."""
    
    # Create status container for real-time updates
    status_container = st.container()
    
    with status_container:
        st.info("🔄 Preparing to run ML analysis...")
    
    try:
        with status_container:
            st.info("🤖 Computing features and generating smart scores...")
        
        env = os.environ.copy()
        env["FIREBASE_SERVICE_ACCOUNT_KEY_PATH"] = "../config/solensai-service-account.json"
        
        result = subprocess.run(
            ["python", "../backend/python_scripts/ml_processor.py"],
            capture_output=True, text=True, env=env, check=False
        )
        
        if result.returncode == 0:
            with status_container:
                st.success("✅ ML insights updated successfully!")
            
            # Fetch and display updated data
            db = get_firestore_client()
            wallets_data = fetch_all_wallets(db)
            
            if wallets_data:
                analyze_ml_results(wallets_data)
            else:
                st.warning("No wallet data found after ML processing.")
                
        else:
            with status_container:
                st.error("❌ Error during ML processing!")
            
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
            st.error(f"❌ Unexpected error: {str(e)}")

# --- UI Components ---
col1, col2, col3 = st.columns([1, 2, 1])
with col2:
    if st.button("🤖 Run ML Processor", key="ml_processor", type="primary", use_container_width=True):
        run_ml_processor()

# --- Current Data Preview ---
st.markdown("---")
with st.expander("👀 Preview Current AI Insights", expanded=False):
    try:
        db = get_firestore_client()
        current_wallets = fetch_wallets_with_ai_insights(db)

        data_exists = not current_wallets.empty if isinstance(current_wallets, (pd.Series, pd.DataFrame)) else current_wallets
        
        if data_exists:
            st.info(f"Currently have AI insights for {len(current_wallets)} wallets")
            
            class MockDocument:
                def __init__(self, data):
                    self._data = data
                def to_dict(self):
                    return self._data
            
            wallet_list = current_wallets.to_list() if isinstance(current_wallets, pd.Series) else current_wallets
            sample_docs = [MockDocument(wallet) for wallet in wallet_list[:5]]
            display_firestore_table(sample_docs, title="Sample of Wallets with AI Insights")
            
            if len(wallet_list) > 5:
                st.info(f"... and {len(wallet_list) - 5} more wallets with AI insights")
        else:
            st.info("No wallets with AI insights found. Run the ML Processor to generate them.")
            
    except Exception as e:
        st.error(f"Error loading current data: {e}")

# --- ML Information ---
st.markdown("---")
st.markdown("""
### 📋 What the ML Processor Does

The ML Processor applies machine learning algorithms to analyze wallet trading patterns and generate predictive insights:

**ML Features Computed:**
- **Smart Score**: Overall performance rating based on multiple factors
- **ML Tags**: Predictive labels indicating trading style and behavior
- **Next Move Prediction**: Forecast of likely future trading actions
- **Risk Assessment**: AI-powered risk evaluation
- **Performance Correlation**: Pattern matching with successful traders

**Analysis Process:**
1. **Feature Engineering**: Extracts relevant trading patterns and metrics
2. **Model Training**: Applies trained ML models to the data
3. **Score Generation**: Computes smart scores for each wallet
4. **Tag Assignment**: Assigns predictive tags based on behavior patterns
5. **Prediction Generation**: Forecasts likely future trading moves

### ⚠️ Important Notes
- ML processing may take several minutes depending on data size
- Results are stored in the `ai_insights` sub-object of each wallet document
- Smart scores range from 0-100, with higher scores indicating better performance
- ML tags help categorize wallets by trading style and risk profile
- Visit the **Dashboard** page to see these insights integrated with other data
""")

# --- Instructions ---
st.markdown("---")
st.markdown("""
### 🚀 Instructions
1. Click the **Run ML Processor** button to start the analysis
2. Wait for the ML processing to complete (this may take several minutes)
3. Review the AI insights summary and distribution charts
4. Check the top-ranked wallets and tag analysis
5. Visit the **Dashboard** page to see comprehensive analytics

### 🔄 When to Run
- After updating wallets with new data
- When you want to refresh AI insights and predictions
- Before analyzing copy trading opportunities
- To get the latest smart scores and ML tags
- When you need updated trading predictions
""") 