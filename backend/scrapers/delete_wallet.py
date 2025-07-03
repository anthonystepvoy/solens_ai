#!/usr/bin/env python3
"""
Interactive script to delete specific wallets from the MongoDB database
"""

from backend.config.config import MONGO_URI
from backend.database.database import get_client, get_db, get_wallets_collection
from datetime import datetime

client = get_client()
db = get_db()
wallets_collection = get_wallets_collection()

def delete_wallet(wallet_address):
    """Delete a specific wallet from the database"""
    print(f"\nAttempting to delete wallet: {wallet_address}")
    try:
        existing_wallet = wallets_collection.find_one({"_id": wallet_address})
        if not existing_wallet:
            print(f"❌ Wallet {wallet_address} not found in database")
            return False
        print(f"✅ Found wallet in database")
        print(f"   Discovered by: {existing_wallet.get('discovered_by', 'Unknown')}")
        print(f"   Last updated: {existing_wallet.get('updated_at', 'Unknown')}")
        if 'gmgn_data' in existing_wallet:
            gmgn_data = existing_wallet['gmgn_data']
            print(f"   Token: {gmgn_data.get('source_token_symbol', 'Unknown')}")
            print(f"   Profit: {gmgn_data.get('profit', 'Unknown')} SOL")
        confirm = input(f"\n⚠️  Are you sure you want to delete wallet {wallet_address}? (yes/no): ").lower().strip()
        if confirm not in ['yes', 'y']:
            print("❌ Deletion cancelled")
            return False
        result = wallets_collection.delete_one({"_id": wallet_address})
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
        success = delete_wallet(wallet_address)
        if success:
            print(f"\n🎉 Wallet {wallet_address} has been successfully deleted!")
        another = input("\nDelete another wallet? (yes/no): ").lower().strip()
        if another not in ['yes', 'y']:
            print("👋 Goodbye!")
            break
    print("=" * 60)

if __name__ == "__main__":
    main() 