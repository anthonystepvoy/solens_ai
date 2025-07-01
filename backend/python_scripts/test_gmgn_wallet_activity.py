import requests
import json

wallet = "21vJn8G48d1mToiwx2PL4WSVMhmcP7CxNRYuT8dqBw68"  # Example wallet, replace as needed
url = f"https://gmgn.ai/vas/api/v1/wallet_activity/sol?type=buy&type=sell&device_id=b4e58a50-81f0-4ffb-850e-f433598a8c51&client_id=gmgn_web_20250701-623-affa2c7&from_app=gmgn&app_ver=20250701-623-affa2c7&tz_name=America%2FMontevideo&tz_offset=-10800&app_lang=en-US&fp_did=535415de390d0e8ab5b33b8fd73b2830&os=web&wallet={wallet}&limit=50&cost=10"

resp = requests.get(url, headers={"accept": "application/json"})
try:
    data = resp.json()
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"Failed to parse response: {e}")
    print(resp.text) 