#!/usr/bin/env python3
"""
Script to run wallet cleanup process.
This can be scheduled to run periodically to maintain database quality.
"""

import os
import sys
import requests
import time

# Add the parent directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))

def run_cleanup_via_api():
    """Run cleanup via the API endpoint"""
    try:
        # Try to get API URL from environment or use default
        api_base = os.environ.get('API_BASE_URL', 'http://localhost:8000')
        cleanup_url = f"{api_base}/cleanup-low-token-wallets"
        
        print("=== RUNNING WALLET CLEANUP VIA API ===")
        print(f"API URL: {cleanup_url}")
        
        response = requests.post(cleanup_url, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ {result.get('message', 'Cleanup completed')}")
            if 'removed_count' in result:
                print(f"📊 Removed {result['removed_count']} wallets")
                print(f"📊 Total remaining: {result['total_remaining']} wallets")
        else:
            print(f"❌ API request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
    except Exception as e:
        print(f"❌ Error during cleanup: {e}")

def run_cleanup_direct():
    """Run cleanup directly using the cleanup script"""
    try:
        print("=== RUNNING WALLET CLEANUP DIRECT ===")
        
        # Import and run the cleanup function
        from cleanup_low_token_wallets import cleanup_low_token_wallets
        cleanup_low_token_wallets()
        
    except Exception as e:
        print(f"❌ Error during direct cleanup: {e}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Run wallet cleanup process')
    parser.add_argument('--method', choices=['api', 'direct'], default='api',
                       help='Method to run cleanup: api (via API endpoint) or direct (using cleanup script)')
    
    args = parser.parse_args()
    
    if args.method == 'api':
        run_cleanup_via_api()
    else:
        run_cleanup_direct()
    
    print("=== CLEANUP PROCESS COMPLETE ===") 