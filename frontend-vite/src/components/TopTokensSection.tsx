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
  { label: '[TOP_PERFORMERS]', key: 'top_performers' },
  { label: '[BY_LIQUIDITY]', key: 'top_by_liquidity' },
  { label: '[BY_MARKET_CAP]', key: 'top_by_market_cap' },
  { label: '[BY_HOLDERS]', key: 'top_by_holders' },
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
      setError('[ERROR] Failed to fetch token database');
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
    if (ratio < 0.1) return '#00ff41';
    if (ratio < 0.3) return '#ffff00';
    return '#ff6b6b';
  };

  const getPriceChangeColor = (change: number): string => {
    return change >= 0 ? '#00ff41' : '#ff6b6b';
  };

  const renderTable = (tokens: Token[]) => (
    <div style={{ overflowX: 'auto', marginTop: 16 }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid #333333',
        borderRadius: 0,
        overflow: 'hidden'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          background: 'transparent', 
          color: '#ffffff',
          fontFamily: '"Courier New", monospace'
        }}>
          <thead style={{ background: 'rgba(0, 255, 65, 0.1)' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>RANK</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>TOKEN</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>LIQUIDITY</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>MARKET_CAP</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>HOLDERS</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>24H_CHANGE</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>RUG_RATIO</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token, idx) => (
              <tr key={token.address} style={{ 
                borderBottom: '1px solid #333333',
                background: 'transparent'
              }}>
                <td style={{ padding: '10px', fontWeight: 700, fontSize: 13 }}>#{idx + 1}</td>
                <td style={{ padding: '10px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{token.symbol}</div>
                  <div style={{ fontSize: 11, color: '#cccccc' }}>{token.address.slice(0, 6)}...{token.address.slice(-4)}</div>
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 13 }}>{formatCurrency(token.liquidity)}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 13 }}>{formatCurrency(token.market_cap)}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 13 }}>{formatNumber(token.holders)}</td>
                <td style={{ 
                  padding: '10px', 
                  textAlign: 'right', 
                  color: getPriceChangeColor(token.price_change_24h), 
                  fontWeight: 600,
                  fontSize: 13
                }}>
                  {token.price_change_24h >= 0 ? '+' : ''}{token.price_change_24h.toFixed(1)}%
                </td>
                <td style={{ padding: '10px', textAlign: 'right' }}>
                  <span style={{ 
                    background: getRugRatioColor(token.rug_ratio), 
                    color: '#000000', 
                    borderRadius: 0, 
                    padding: '2px 6px', 
                    fontWeight: 600, 
                    fontSize: 11,
                    border: `1px solid ${getRugRatioColor(token.rug_ratio)}`,
                    fontFamily: '"Courier New", monospace'
                  }}>
                    {(token.rug_ratio * 100).toFixed(1)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.02)', 
      borderRadius: 0, 
      padding: 24, 
      border: '1px solid #333333',
      margin: '0 auto', 
      maxWidth: 1100,
      fontFamily: '"Courier New", monospace'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ 
          margin: 0, 
          color: '#00ff41', 
          fontWeight: 700, 
          fontSize: 20,
          fontFamily: '"Courier New", monospace',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>[TOKEN_REGISTRY]</h2>
        <div style={{ fontSize: 11, color: '#cccccc', fontFamily: '"Courier New", monospace' }}>
          LAST_UPDATE: {lastRefresh.toLocaleTimeString()} 
          <span 
            title="Real Data: Address, Symbol, Liquidity, Market Cap, Holders, Rug Ratio | Calculated: 24h Price Change, Volume" 
            style={{ 
              color: '#00ff41', 
              border: '1px solid #00ff41', 
              borderRadius: 0, 
              padding: '2px 6px', 
              marginLeft: 8, 
              cursor: 'help', 
              background: 'rgba(0, 255, 65, 0.1)',
              fontSize: 10
            }}
          >
            [REAL+CALC]
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {tabOptions.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 0,
              border: tab === t.key ? '1px solid #00ff41' : '1px solid #333333',
              background: tab === t.key ? 'rgba(0, 255, 65, 0.1)' : '#000000',
              color: tab === t.key ? '#00ff41' : '#cccccc',
              fontWeight: 600,
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: '"Courier New", monospace',
            }}
            onMouseEnter={e => {
              if (tab !== t.key) {
                e.currentTarget.style.background = 'rgba(0, 255, 65, 0.05)';
                e.currentTarget.style.color = '#00ff41';
              }
            }}
            onMouseLeave={e => {
              if (tab !== t.key) {
                e.currentTarget.style.background = '#000000';
                e.currentTarget.style.color = '#cccccc';
              }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      
      {loading && (
        <div style={{ 
          color: '#00ff41', 
          padding: 24, 
          textAlign: 'center',
          fontFamily: '"Courier New", monospace',
          fontSize: 14
        }}>
          [LOADING_TOKEN_DATABASE...]
        </div>
      )}
      
      {error && (
        <div style={{ 
          color: '#ff6b6b', 
          padding: 24, 
          textAlign: 'center',
          fontFamily: '"Courier New", monospace',
          fontSize: 14,
          border: '1px solid #ff6b6b',
          background: 'rgba(255, 107, 107, 0.1)'
        }}>
          {error}
        </div>
      )}
      
      {tokensData && renderTable(tokensData[tab as keyof TopTokensData] as Token[])}
    </div>
  );
};

export default TopTokensSection; 