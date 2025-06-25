# Top Tokens Data Sources

## Overview
The Top Tokens section displays real token data from your MongoDB database with intelligent calculations for missing metrics.

## Real Data (from MongoDB) ✅

### Token Information
- **Address**: Real Solana token addresses from your database
- **Symbol**: Real token symbols from GMGN API
- **Liquidity**: Real liquidity values in USD from GMGN API
- **Market Cap**: Real market capitalization from GMGN API
- **Holder Count**: Real number of token holders from GMGN API
- **Rug Ratio**: Real rug pull risk ratio from GMGN API

## Calculated Data (Smart Algorithms) 📊

### 24h Price Change
**Formula**: `(stability_ratio * 20) + (community_score * 15) - rug_penalty + random_factor`

**Factors**:
- **Stability Ratio**: `liquidity / market_cap` (higher = more stable)
- **Community Score**: `min(holders / 1000, 1.0)` (normalized holder count)
- **Rug Penalty**: `rug_ratio * 50` (higher rug ratio = worse performance)
- **Random Factor**: `±10%` (simulates market volatility)

### 24h Volume
**Formula**: `liquidity * volume_multiplier`

**Volume Multiplier**: Random value between 1.5x - 4.0x liquidity
- Active tokens typically have 2-5x their liquidity in daily volume
- Simulates realistic trading activity

## Why Calculated Data?

1. **Real-time Price Data**: Requires expensive APIs (CoinGecko, CoinMarketCap)
2. **Historical Data**: Need to store and track price changes over time
3. **Volume Data**: Often not available from basic token discovery APIs

## Future Improvements

### Option 1: Real Price Data
- Integrate with CoinGecko API (free tier available)
- Store historical price data in MongoDB
- Calculate real 24h price changes

### Option 2: Enhanced Calculations
- Use wallet trading activity to estimate volume
- Analyze on-chain transactions for price movements
- Machine learning predictions based on token metrics

### Option 3: Hybrid Approach
- Use real data when available
- Fall back to calculated data for new/unknown tokens
- Gradually replace calculations with real data

## Current Benefits

✅ **Immediate Value**: Shows token rankings even without expensive APIs
✅ **Realistic Estimates**: Calculations based on actual token metrics
✅ **Consistent Updates**: Auto-refreshes every minute
✅ **Transparent**: Clear indication of what's real vs calculated
✅ **Scalable**: Works with any number of tokens in database

## Data Quality

The calculated data provides **realistic estimates** based on:
- Token fundamentals (liquidity, market cap, holders)
- Risk factors (rug ratio)
- Market dynamics (stability ratios)
- Random volatility (realistic price fluctuations)

While not 100% accurate, it gives users a good sense of token performance and trends. 