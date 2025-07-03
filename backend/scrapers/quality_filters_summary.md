# Wallet Quality Filtering Improvements

## Overview
This document outlines the quality filtering criteria implemented to save MongoDB space and focus on high-performing traders while allowing for ongoing discovery.

## Token Quality Criteria
Only tokens meeting these criteria are processed:
- **Minimum Liquidity**: $5,000 (reduced from $10,000)
- **Minimum Holders**: 50 (reduced from 100)
- **Minimum Market Cap**: $25,000 (reduced from $50,000)
- **Maximum Rug Ratio**: 50% (increased from 30%)

## Wallet Quality Criteria
Only wallets meeting these criteria are stored in MongoDB:

### Profit Requirements
- **Must have positive profit** (no losing trades)
- **Minimum profit**: 0.05 SOL per trade (reduced from 0.1 SOL)
- **Profit change**: >10% if available (reduced from 20%)

### Storage Limits
- **Top 20 wallets per token** (sorted by profit)
- **Deduplication**: No duplicate wallet addresses per token

### Quality Metadata Added
Each wallet now includes:
- `quality_score`: Profit amount as quality metric
- `quality_tier`: 'high' (>1.0 SOL), 'medium' (>0.5 SOL), 'low' (0.05-0.5 SOL)
- `profit_threshold_passed`: Boolean flag
- `significant_profit`: Boolean flag for >0.05 SOL

## Discovery Improvements
- **Time period**: 24h (increased from 1h) for more discovery opportunities
- **Re-discovery**: Tokens can be re-processed after 7 days to find new wallets
- **Less restrictive filtering**: Allows more tokens and wallets to be discovered

## On-Chain Analysis Filtering
The on-chain analyzer now only processes wallets that:
- Have `significant_profit: true`
- Have `profit_threshold_passed: true`
- Have `quality_score > 0.05`

## Expected Results
- **Better discovery**: More tokens and wallets found
- **Ongoing updates**: Re-discovery of tokens after 7 days
- **Balanced quality**: Less restrictive but still quality-focused
- **Improved performance**: More data for analysis while maintaining standards

## Monitoring
Check the debug logs to see:
- How many tokens are filtered out
- How many wallets are filtered out per token
- Quality distribution of stored wallets
- Re-discovery of previously processed tokens 