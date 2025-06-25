#!/usr/bin/env python3
"""
Test script for the on-chain analyzer to help identify hanging issues.
This script will test individual components and provide detailed logging.
"""

import asyncio
import time
import sys
import os

# Add the current directory to the path so we can import the analyzer
sys.path.append(os.path.dirname(__file__))

from on_chain_analyzer import (
    get_transactions_in_time_window,
    analyze_wallet,
    discover_traders_with_helius,
    HELIUS_API_KEY,
    HELIUS_RPC_URL
)

async def test_helius_connection():
    """Test basic Helius API connectivity"""
    print("Testing Helius API connection...")
    
    try:
        from solana.rpc.async_api import AsyncClient
        from solders.pubkey import Pubkey
        
        # Test with a known wallet
        test_wallet = "9YWvyobhP6u4Dd5b2vm1CBujiSwUnZtqgZR5o34oKgrR"
        wallet_pubkey = Pubkey.from_string(test_wallet)
        
        async with AsyncClient(HELIUS_RPC_URL) as client:
            print("  Testing RPC connection...")
            sig_result = await asyncio.wait_for(
                client.get_signatures_for_address(wallet_pubkey, limit=5),
                timeout=10
            )
            print(f"  ✓ RPC connection successful, got {len(sig_result.value)} signatures")
            
            # Test transaction parsing
            if sig_result.value:
                import requests
                url = f"https://api.helius.xyz/v0/transactions/?api-key={HELIUS_API_KEY}"
                test_sig = str(sig_result.value[0].signature)
                
                print("  Testing transaction parsing...")
                response = requests.post(url, json={"transactions": [test_sig]}, timeout=10)
                response.raise_for_status()
                parsed_txs = response.json()
                print(f"  ✓ Transaction parsing successful, got {len(parsed_txs)} transactions")
                
    except Exception as e:
        print(f"  ✗ Helius connection failed: {e}")
        return False
    
    return True

async def test_single_wallet_analysis():
    """Test analyzing a single wallet with detailed logging"""
    print("\nTesting single wallet analysis...")
    
    # Use a wallet from your config
    test_wallet = "9YWvyobhP6u4Dd5b2vm1CBujiSwUnZtqgZR5o34oKgrR"
    
    try:
        print(f"  Analyzing wallet: {test_wallet}")
        start_time = time.time()
        
        result = await asyncio.wait_for(
            analyze_wallet(test_wallet, days_history=1, ui_callback=print),
            timeout=120  # 2 minutes timeout
        )
        
        elapsed = time.time() - start_time
        print(f"  ✓ Analysis completed in {elapsed:.1f}s")
        
        if result:
            print(f"  Results: PnL={result.get('pnl_sol', 'N/A')} SOL, "
                  f"Win Rate={result.get('win_rate', 'N/A')}%, "
                  f"Trades={result.get('total_trades', 'N/A')}")
        else:
            print("  ⚠ No analysis result returned")
            
    except asyncio.TimeoutError:
        print("  ✗ Analysis timed out after 2 minutes")
        return False
    except Exception as e:
        print(f"  ✗ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

async def test_transaction_fetching():
    """Test just the transaction fetching part"""
    print("\nTesting transaction fetching...")
    
    test_wallet = "9YWvyobhP6u4Dd5b2vm1CBujiSwUnZtqgZR5o34oKgrR"
    
    try:
        print(f"  Fetching transactions for: {test_wallet}")
        start_time = time.time()
        
        transactions = await asyncio.wait_for(
            get_transactions_in_time_window(test_wallet, days_history=1, ui_callback=print),
            timeout=60  # 1 minute timeout
        )
        
        elapsed = time.time() - start_time
        print(f"  ✓ Fetched {len(transactions)} transactions in {elapsed:.1f}s")
        
    except asyncio.TimeoutError:
        print("  ✗ Transaction fetching timed out after 1 minute")
        return False
    except Exception as e:
        print(f"  ✗ Transaction fetching failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

async def main():
    """Run all tests"""
    print("="*60)
    print("ON-CHAIN ANALYZER DIAGNOSTIC TESTS")
    print("="*60)
    
    tests = [
        ("Helius Connection", test_helius_connection),
        ("Transaction Fetching", test_transaction_fetching),
        ("Single Wallet Analysis", test_single_wallet_analysis),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*40}")
        print(f"Running: {test_name}")
        print(f"{'='*40}")
        
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"  ✗ Test failed with exception: {e}")
            results.append((test_name, False))
    
    print(f"\n{'='*60}")
    print("TEST RESULTS SUMMARY")
    print(f"{'='*60}")
    
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{test_name}: {status}")
    
    all_passed = all(result for _, result in results)
    print(f"\nOverall: {'✓ ALL TESTS PASSED' if all_passed else '✗ SOME TESTS FAILED'}")
    
    if not all_passed:
        print("\nRecommendations:")
        print("1. Check your Helius API key and rate limits")
        print("2. Verify MongoDB connection")
        print("3. Check network connectivity")
        print("4. Consider reducing the analysis time window")

if __name__ == "__main__":
    asyncio.run(main()) 