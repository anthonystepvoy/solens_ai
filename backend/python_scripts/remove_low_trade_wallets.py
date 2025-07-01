from pymongo import MongoClient

MONGO_URI = "mongodb+srv://santowastaken:DGsmWd4ikXVNxA8@cluster0.vxseyuu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client["solens_ai"]

count = 0
for w in db.wallets.find({}):
    stats = w.get('gmgn_detailed_stats', {})
    trades_7d = stats.get('buy_7d', 0) + stats.get('sell_7d', 0)
    if trades_7d < 5:
        db.wallets.delete_one({'_id': w['_id']})
        count += 1

print(f"Deleted {count} wallets with less than 5 trades in the last 7 days.") 