import streamlit as st
import os

# --- Page Configuration ---
st.set_page_config(
    page_title="SOLENS AI",
    page_icon="frontend/assets/solens-logo-white.png",
    layout="wide",
    initial_sidebar_state="expanded",
)

# --- CSS Styling ---
def load_css(file_name):
    """Loads a CSS file from the current directory."""
    css_path = os.path.join(os.path.dirname(__file__), file_name)
    if os.path.exists(css_path):
        with open(css_path) as f:
            st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

load_css("style.css")

# --- Logo ---
logo_path = os.path.join(os.path.dirname(__file__), "assets", "solens-logo-white.png")
if os.path.exists(logo_path):
    st.sidebar.image(logo_path, width=150)
else:
    st.sidebar.title("SOLENS AI")


# --- Main Page Content ---
st.title("Welcome to SOLENS AI")
st.subheader("Your Intelligent Solana Analytics Hub")

st.markdown("""
This platform provides a suite of tools to analyze the Solana blockchain, track smart money wallets, and uncover investment opportunities using AI-driven insights.

**Navigate through the tools using the sidebar on the left:**

- **Dashboard:** Get a high-level overview of all tracked wallets, key performance metrics, and AI-powered insights.
- **Update Wallets:** Refresh the list of "smart money" wallets from external sources.
- **Update Traders:** Refresh the list of top traders for specific tokens.
- **On-Chain Analyzer:** Process raw wallet data to calculate performance metrics like PnL and win rates.
- **Copy Trader Analyzer:** Deep-dive into a specific wallet to analyze its trading patterns.
- **ML Processor:** Run machine learning models to generate smart scores and predictive tags for wallets.

Select a page from the sidebar to begin your analysis.
""")

st.info("For the best experience, start by visiting the **Dashboard**.", icon="⭐") 