from pymongo import MongoClient
from backend.config.config import MONGO_URI

client = None

def get_client():
    global client
    if client is None:
        try:
            client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000, connectTimeoutMS=10000)
            # Test connection
            client.admin.command('ping')
        except Exception as e:
            print(f"[DB ERROR] Could not connect to MongoDB: {e}")
            raise
    return client

def get_db(db_name="solens_ai"):
    return get_client()[db_name]

def get_wallets_collection():
    return get_db()["wallets"]

def get_transactions_collection():
    return get_db()["transactions"]

def get_tokens_collection():
    return get_db()["tokens"] 