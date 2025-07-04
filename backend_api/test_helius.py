#!/usr/bin/env python3

import os
import sys

print(f"[DEBUG] HELIUS_API_KEY: {os.getenv('HELIUS_API_KEY')}")
print(f"[DEBUG] HELIUS_RPC_URL: {os.getenv('HELIUS_RPC_URL')}")
print(f"[DEBUG] HELIUS_API_BASE_URL: {os.getenv('HELIUS_API_BASE_URL')}")
print(f"[DEBUG] Working directory: {os.getcwd()}")
print(f"[DEBUG] Script location: {__file__}")
print(f"[DEBUG] Args: {sys.argv}")

# Test if script can be found relative to main.py
script_dir = os.path.dirname(__file__)
target_script = os.path.join(script_dir, '../backend/scrapers/copy_trader_analyzer.py')
print(f"[DEBUG] Target script path: {target_script}")
print(f"[DEBUG] Target script exists: {os.path.exists(target_script)}")

if len(sys.argv) > 1:
    wallet_address = sys.argv[1]
    print(f"[DEBUG] Wallet address: {wallet_address}")

print("Test completed successfully!") 