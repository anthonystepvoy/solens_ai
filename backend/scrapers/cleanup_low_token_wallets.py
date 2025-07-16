#!/usr/bin/env python3
"""
Script to remove wallets from the database that have traded less than 3 unique tokens in the last 7 days.
This helps maintain database quality by keeping only active traders.
"""

import os
import sys
from pymongo import MongoClient
from datetime import datetime

# Add the parent directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

from backend.config.config import MONGO_URI

def cleanup_low_token_wallets():
    """Remove wallets with less than 3 unique tokens traded in the last 7 days"""
    
    print("=== WALLET CLEANUP: REMOVING LOW TOKEN COUNT WALLETS ===")
    
    try:
        # Connect to MongoDB
        client = MongoClient(MONGO_URI)
        db = client["solens_ai"]
        wallets_collection = db.wallets
        
        print("✓ Connected to MongoDB")
        
        # Get total count before cleanup
        total_wallets_before = wallets_collection.count_documents({})
        print(f"Total wallets before cleanup: {total_wallets_before}")
        
        # Find wallets with less than 3 unique tokens traded in 7 days
        low_token_wallets = list(wallets_collection.find({
            "$or": [
                {"unique_tokens_bought_7d": {"$lt": 3}},
                {"unique_tokens_bought_7d": {"$exists": False}},
                {"unique_tokens_bought_7d": None}
            ]
        }))
        
        print(f"Found {len(low_token_wallets)} wallets with less than 3 tokens traded in 7 days")
        
        if not low_token_wallets:
            print("✓ No wallets to remove. All wallets meet the minimum token requirement.")
            return
        
        # Show some examples of wallets being removed
        print("\nExamples of wallets being removed:")
        for i, wallet in enumerate(low_token_wallets[:5]):
            token_count = wallet.get('unique_tokens_bought_7d', 'N/A')
            address = wallet.get('_id', 'Unknown')
            print(f"  {i+1}. {address[:8]}... - Tokens traded: {token_count}")
        
        if len(low_token_wallets) > 5:
            print(f"  ... and {len(low_token_wallets) - 5} more")
        
        # Confirm deletion
        confirm = input(f"\n⚠️  Are you sure you want to remove {len(low_token_wallets)} wallets? (yes/no): ").lower().strip()
        if confirm not in ['yes', 'y']:
            print("❌ Cleanup cancelled")
            return
        
        # Remove the wallets
        wallet_addresses = [w['_id'] for w in low_token_wallets]
        result = wallets_collection.delete_many({"_id": {"$in": wallet_addresses}})
        
        # Get count after cleanup
        total_wallets_after = wallets_collection.count_documents({})
        
        print(f"✅ Successfully removed {result.deleted_count} wallets")
        print(f"Total wallets after cleanup: {total_wallets_after}")
        print(f"Database space freed: {total_wallets_before - total_wallets_after} wallet records")
        
        # Show some stats about remaining wallets
        remaining_wallets = list(wallets_collection.find({}))
        if remaining_wallets:
            avg_tokens = sum(w.get('unique_tokens_bought_7d', 0) for w in remaining_wallets) / len(remaining_wallets)
            print(f"Average tokens traded by remaining wallets: {avg_tokens:.1f}")
        
        print("=== CLEANUP COMPLETE ===")
        
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    cleanup_low_token_wallets() 