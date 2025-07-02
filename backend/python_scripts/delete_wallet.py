#!/usr/bin/env python3
"""
Interactive script to delete specific wallets from the MongoDB database
"""

import pymongo
from datetime import datetime
import os

# MONGO_URI should be set in your environment or .env file
MONGO_URI = os.environ.get('MONGO_URI')
client = pymongo.MongoClient(MONGO_URI)
db = client.solens_ai

def delete_wallet(wallet_address):
    """Delete a specific wallet from the database"""
    print(f"\nAttempting to delete wallet: {wallet_address}")
    
    try:
        # Check if wallet exists first
        existing_wallet = db.wallets.find_one({"_id": wallet_address})
        if not existing_wallet:
            print(f"❌ Wallet {wallet_address} not found in database")
            return False
        
        print(f"✅ Found wallet in database")
        print(f"   Discovered by: {existing_wallet.get('discovered_by', 'Unknown')}")
        print(f"   Last updated: {existing_wallet.get('updated_at', 'Unknown')}")
        
        # Show wallet details if available
        if 'gmgn_data' in existing_wallet:
            gmgn_data = existing_wallet['gmgn_data']
            print(f"   Token: {gmgn_data.get('source_token_symbol', 'Unknown')}")
            print(f"   Profit: {gmgn_data.get('profit', 'Unknown')} SOL")
        
        # Ask for confirmation
        confirm = input(f"\n⚠️  Are you sure you want to delete wallet {wallet_address}? (yes/no): ").lower().strip()
        if confirm not in ['yes', 'y']:
            print("❌ Deletion cancelled")
            return False
        
        # Delete the wallet
        result = db.wallets.delete_one({"_id": wallet_address})
        
        if result.deleted_count > 0:
            print(f"✅ Successfully deleted wallet: {wallet_address}")
            return True
        else:
            print(f"❌ Failed to delete wallet: {wallet_address}")
            return False
            
    except Exception as e:
        print(f"❌ Error deleting wallet: {e}")
        return False

def main():
    print("=" * 60)
    print("INTERACTIVE WALLET DELETION SCRIPT")
    print("=" * 60)
    
    # Test MongoDB connection
    try:
        client.admin.command('ping')
        print("✅ MongoDB connection successful")
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        return
    
    while True:
        print("\n" + "-" * 40)
        print("Enter wallet address to delete (or 'quit' to exit):")
        wallet_address = input("> ").strip()
        
        if wallet_address.lower() in ['quit', 'exit', 'q']:
            print("👋 Goodbye!")
            break
        
        if not wallet_address:
            print("❌ Please enter a valid wallet address")
            continue
        
        # Delete the wallet
        success = delete_wallet(wallet_address)
        
        if success:
            print(f"\n🎉 Wallet {wallet_address} has been successfully deleted!")
        
        # Ask if user wants to delete another wallet
        another = input("\nDelete another wallet? (yes/no): ").lower().strip()
        if another not in ['yes', 'y']:
            print("👋 Goodbye!")
            break
    
    client.close()
    print("=" * 60)

if __name__ == "__main__":
    main() 