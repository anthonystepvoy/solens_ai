import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Token {
  symbol: string;
  address: string;
  liquidity: number;
  market_cap: number;
  holders: number;
  rug_ratio: number;
  price_change_24h: number;
  volume_24h: number;
}

interface TopTokensData {
  top_by_liquidity: Token[];
  top_by_market_cap: Token[];
  top_by_holders: Token[];
  top_performers: Token[];
  last_update: string;
}

const tabOptions = [
  { label: 'Top Performers', key: 'top_performers' },
  { label: 'By Liquidity', key: 'top_by_liquidity' },
  { label: 'By Market Cap', key: 'top_by_market_cap' },
  { label: 'By Holders', key: 'top_by_holders' },
];

const TopTokensSection: React.FC = () => {
  const [tokensData, setTokensData] = useState<TopTokensData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [tab, setTab] = useState(tabOptions[0].key);

  const fetchTopTokens = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/top-tokens');
      setTokensData(response.data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch top tokens data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopTokens();
    const interval = setInterval(fetchTopTokens, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number): string => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatCurrency = (num: number): string => {
    return `$${formatNumber(num)}`;
  };

  const getRugRatioColor = (ratio: number): string => {
    if (ratio < 0.1) return '#4caf50';
    if (ratio < 0.3) return '#ff9800';
    return '#f44336';
  };

  const getPriceChangeColor = (change: number): string => {
    return change >= 0 ? '#4caf50' : '#f44336';
  };

  const renderTable = (tokens: Token[]) => (
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181f2a', color: '#fff', borderRadius: 8, overflow: 'hidden' }}>
        <thead style={{ background: '#232b3a' }}>
          <tr>
            <th style={{ padding: 10, textAlign: 'left' }}>Rank</th>
            <th style={{ padding: 10, textAlign: 'left' }}>Token</th>
            <th style={{ padding: 10 }}>Liquidity</th>
            <th style={{ padding: 10 }}>Market Cap</th>
            <th style={{ padding: 10 }}>Holders</th>
            <th style={{ padding: 10 }}>24h Change</th>
            <th style={{ padding: 10 }}>Rug Ratio</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token, idx) => (
            <tr key={token.address} style={{ borderBottom: '1px solid #232b3a', background: idx % 2 === 0 ? '#181f2a' : '#1e2533' }}>
              <td style={{ padding: 10, fontWeight: 700 }}>#{idx + 1}</td>
              <td style={{ padding: 10 }}>
                <div style={{ fontWeight: 600 }}>{token.symbol}</div>
                <div style={{ fontSize: 12, color: '#b0bec5' }}>{token.address.slice(0, 6)}...{token.address.slice(-4)}</div>
              </td>
              <td style={{ padding: 10, textAlign: 'right' }}>{formatCurrency(token.liquidity)}</td>
              <td style={{ padding: 10, textAlign: 'right' }}>{formatCurrency(token.market_cap)}</td>
              <td style={{ padding: 10, textAlign: 'right' }}>{formatNumber(token.holders)}</td>
              <td style={{ padding: 10, textAlign: 'right', color: getPriceChangeColor(token.price_change_24h), fontWeight: 600 }}>
                {token.price_change_24h >= 0 ? '+' : ''}{token.price_change_24h.toFixed(1)}%
              </td>
              <td style={{ padding: 10, textAlign: 'right' }}>
                <span style={{ background: getRugRatioColor(token.rug_ratio), color: '#fff', borderRadius: 6, padding: '2px 8px', fontWeight: 600, fontSize: 13 }}>
                  {(token.rug_ratio * 100).toFixed(1)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ background: '#101a2b', borderRadius: 10, padding: 24, boxShadow: '0 2px 16px 0 #0004', margin: '0 auto', maxWidth: 1100 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#fff', fontWeight: 800, fontSize: 28 }}>Top Tokens</h2>
        <div style={{ fontSize: 13, color: '#b0bec5' }}>
          Last updated: {lastRefresh.toLocaleTimeString()} <span title="✅ Real: Address, Symbol, Liquidity, Market Cap, Holders, Rug Ratio | 📊 Calculated: 24h Price Change, Volume" style={{ color: '#42a5f5', border: '1px solid #42a5f5', borderRadius: 4, padding: '2px 8px', marginLeft: 8, cursor: 'help', background: '#181f2a' }}>Real + Calculated</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {tabOptions.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px',
              borderRadius: 6,
              border: 'none',
              background: tab === t.key ? '#42a5f5' : '#232b3a',
              color: tab === t.key ? '#fff' : '#b0bec5',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {loading && <div style={{ color: '#b0bec5', padding: 24, textAlign: 'center' }}>Loading top tokens...</div>}
      {error && <div style={{ color: '#f44336', padding: 24, textAlign: 'center' }}>{error}</div>}
      {tokensData && renderTable(tokensData[tab as keyof TopTokensData] as Token[])}
    </div>
  );
};

export default TopTokensSection; 