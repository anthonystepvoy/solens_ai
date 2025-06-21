import streamlit as st
import pandas as pd
import json
import sys # Using sys to print to stderr for better visibility in logs

def format_value(value, key=''):
    """Formats values for display based on key hints or type."""
    try:
        key = key.lower()
        
        # Handle list/dict types first to avoid ambiguity
        if isinstance(value, (dict, list)):
            if ('tags' in key or 'source' in key) and isinstance(value, list):
                return ", ".join(map(str, value))
            return json.dumps(value)

        # Handle scalars
        if pd.isna(value):
            return "N/A"
        
        if not isinstance(value, (int, float, bool)): # Allow booleans through
            return value # Not a number, return as is

        # Formatting based on column name (key)
        if key == '% pnl' or 'rate' in key or 'ratio' in key:
            return f"{value:.2%}"
        
        if key == 'pnl (sol)' or 'balance' in key:
            return f"{value:,.4f} SOL"
            
        if 'score' in key:
            return f"{value:.0f}"

        # Default float format
        if isinstance(value, float):
            return f"{value:,.4f}"
            
        return value
    except Exception as e:
        # If any formatting fails, print to stderr and return the raw value as a string
        print(f"DEBUG_FORMAT_ERROR: Failed to format value '{value}' (type: {type(value)}) for key '{key}'. Error: {e}", file=sys.stderr)
        return str(value)

def display_firestore_table(documents, title="Data Overview"):
    """
    Displays a list of Firestore documents in a clean, user-friendly table.
    Expands nested JSON, renames columns, and formats values.
    This version intelligently merges data from different sources.
    """
    if not documents:
        st.info(f"No data to display for '{title}'.")
        return

    st.subheader(title)

    data = [doc.to_dict() for doc in documents]
    df = pd.json_normalize(data, sep='.')

    # Define a mapping for column renaming and the priority of data sources
    rename_map = {
        "id": "Wallet Address",
        "sol_balance_change": "SOL Balance",
        "win_rate": "% PnL",
        "pnl_sol": "PnL (SOL)",
        "overall_smart_score": "Smart Score",
        "tags_ml": "ML Tags",
        "total_trades": "Total Trades",
        "token_num_7d": "Tokens (7d)",
        "discovered_by": "Source",
        "updated_at": "Last Updated",
        "fast_tx_ratio": "Fast Tx Ratio",
        "rug_ratio": "Rug Ratio",
        "bad_token_ratio": "Bad Token Ratio",
    }
    source_priority = ['on_chain_data', 'gmgn_data', 'ai_insights', 'risk']
    
    # Create a new DataFrame to hold the cleaned and merged data
    final_df = pd.DataFrame()

    # Process columns based on the rename map and source priority
    for original_key, final_name in rename_map.items():
        found_key = None
        # Check for prefixed versions first, according to priority
        for source in source_priority:
            source_key = f"{source}.{original_key}"
            if source_key in df.columns:
                found_key = source_key
                break
        
        # If no prefixed version was found, check for a non-prefixed version
        if not found_key and original_key in df.columns:
            found_key = original_key
        
        # If a key was found, add it to our final DataFrame with the new name
        if found_key:
            final_df[final_name] = df[found_key]

    # Apply formatting to all columns in our new, clean DataFrame
    for col in final_df.columns:
        final_df[col] = final_df[col].apply(lambda x: format_value(x, key=col))

    # Define the desired order and select only existing columns
    desired_cols = ["Wallet Address", "SOL Balance", "% PnL", "PnL (SOL)", "Smart Score", "Total Trades", "Tokens (7d)", "ML Tags", "Source", "Last Updated"]
    display_cols = [col for col in desired_cols if col in final_df.columns]
    
    if not display_cols:
        st.warning("No data available for the selected columns. Try running the scrapers and analyzers.")
        return

    st.dataframe(final_df[display_cols], use_container_width=True) 