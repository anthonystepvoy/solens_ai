import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

// Inject custom scrollbar CSS
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    .token-leaderboard-scroll::-webkit-scrollbar {
      width: 10px;
      background: #000;
    }
    .token-leaderboard-scroll::-webkit-scrollbar-thumb {
      background: #00ff41;
      border-radius: 0;
      border: 2px solid #000;
      min-height: 40px;
      transition: background 0.2s;
    }
    .token-leaderboard-scroll::-webkit-scrollbar-thumb:hover {
      background: #33ff77;
    }
    .token-leaderboard-scroll {
      scrollbar-color: #00ff41 #000;
      scrollbar-width: thin;
    }
  `;
  document.head.appendChild(style);
}

interface Token {
  address: string;
  symbol: string;
  logo: string;
  liquidity: string;
  market_cap: string;
  holder_count: string;
}

interface TopTokensData {
  top_by_liquidity: Token[];
  top_by_market_cap: Token[];
  top_by_holders: Token[];
  last_update: string;
}

interface TopTokensSectionProps {
  onTokenHistoryUpdate?: (newTokens: any[]) => void;
  watchlistTokens: string[];
  setWatchlistTokens: (tokens: string[]) => void;
}

const tabOptions = [
  { label: '[BY_LIQUIDITY]', key: 'top_by_liquidity' },
  { label: '[BY_MARKET_CAP]', key: 'top_by_market_cap' },
  { label: '[BY_HOLDERS]', key: 'top_by_holders' },
];

// Terminal-style progress bar component
const ProgressBarTerminal: React.FC<{ progress: number; total: number; label: string }> = ({ progress, total, label }) => {
  const percent = Math.round((progress / total) * 100);
  return (
    <div style={{ margin: '16px 0', width: '100%' }}>
      <div style={{
        color: '#00ff41',
        fontFamily: '"Courier New", monospace',
        fontSize: 14,
        marginBottom: 4,
        letterSpacing: 1,
        textAlign: 'center',
        textTransform: 'uppercase',
        fontWeight: 700
      }}>{label} {progress}/{total}</div>
      <div style={{
        width: '100%',
        height: 6,
        background: '#222',
        border: '1px solid #00ff41',
        borderRadius: 0,
        overflow: 'hidden',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          background: '#00ff41',
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
};

// TokenAddress component for copy-to-clipboard with feedback
const TokenAddress: React.FC<{ address: string }> = ({ address }) => {
  const [copied, setCopied] = useState(false);
  const short = address.slice(0, 6) + '...' + address.slice(-4);
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <span
      onClick={handleCopy}
      style={{
        cursor: 'pointer',
        color: '#00ff41',
        fontFamily: '"Courier New", monospace',
        fontSize: 11,
        background: copied ? 'rgba(0,255,65,0.08)' : 'none',
        border: copied ? '1px solid #00ff41' : 'none',
        borderRadius: 0,
        padding: copied ? '1px 4px' : 0,
        marginLeft: 4,
        transition: 'all 0.2s',
        userSelect: 'all',
        textDecoration: copied ? 'underline' : 'none',
      }}
      title={address + (copied ? ' (copied)' : ' (click to copy)')}
    >
      {short} {copied && '[COPIED]'}
    </span>
  );
};

const leaderboardBoxStyle = {
  background: 'rgba(255, 255, 255, 0.02)',
  border: '1px solid #333333',
  borderRadius: 0,
  overflow: 'hidden',
  height: '100%',
  width: '100%',
  boxSizing: 'border-box' as const,
  display: 'flex',
  flexDirection: 'column' as const,
};

const leaderboardTableStyle = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  background: 'transparent',
  color: '#ffffff',
  fontFamily: '"Courier New", monospace',
};

const TopTokensSection: React.FC<TopTokensSectionProps> = ({ onTokenHistoryUpdate, watchlistTokens, setWatchlistTokens }) => {
  const [tokensData, setTokensData] = useState<TopTokensData | null>(null);
  const [minuteRank, setMinuteRank] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [minuteLoading, setMinuteLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minuteError, setMinuteError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [minuteRefresh, setMinuteRefresh] = useState<Date>(new Date());
  const [tab, setTab] = useState(tabOptions[0].key);
  // New: progress simulation
  const [tokenProgress, setTokenProgress] = useState(0);
  const [minuteProgress, setMinuteProgress] = useState(0);

  const fetchTopTokens = async () => {
    if (!tokensData) {
      setLoading(true);
    }
    try {
      const response = await axios.get(API_ENDPOINTS.TOP_TOKENS);
      setTokensData(response.data);
      setLastRefresh(new Date());
      setError(null);
      // Call onTokenHistoryUpdate with the new tokens
      if (onTokenHistoryUpdate) {
        const allTokens = [
          ...(response.data.top_by_liquidity || []),
          ...(response.data.top_by_market_cap || []),
          ...(response.data.top_by_holders || [])
        ];
        onTokenHistoryUpdate(allTokens);
      }
    } catch (err) {
      setError('[ERROR] Failed to fetch token database');
    } finally {
      setLoading(false);
    }
  };

  const fetchMinuteRank = async () => {
    setMinuteLoading(true);
    try {
      const response = await axios.get(API_ENDPOINTS.LATEST_MINUTE_RANK);
      setMinuteRank(response.data);
      setMinuteRefresh(new Date());
      setMinuteError(null);
      // Call onTokenHistoryUpdate with the new minute rank tokens
      if (onTokenHistoryUpdate) {
        onTokenHistoryUpdate(response.data);
      }
    } catch (err) {
      setMinuteError('[ERROR] Failed to fetch 1-minute token rank');
    } finally {
      setMinuteLoading(false);
    }
  };

  // Simulate loading progress for Top Tokens
  useEffect(() => {
    if (loading && !error) {
      setTokenProgress(0);
      let count = 0;
      const total = 20;
      const interval = setInterval(() => {
        count++;
        setTokenProgress(count);
        if (count >= total) clearInterval(interval);
      }, 40);
      return () => clearInterval(interval);
    }
  }, [loading, error]);

  // Simulate loading progress for 1-Minute Rank
  useEffect(() => {
    if (minuteLoading && !minuteError) {
      setMinuteProgress(0);
      let count = 0;
      const total = 20;
      const interval = setInterval(() => {
        count++;
        setMinuteProgress(count);
        if (count >= total) clearInterval(interval);
      }, 40);
      return () => clearInterval(interval);
    }
  }, [minuteLoading, minuteError]);

  useEffect(() => {
    fetchTopTokens();
    fetchMinuteRank();
    const interval1 = setInterval(fetchTopTokens, 60000);
    const interval2 = setInterval(fetchMinuteRank, 60000);
    return () => { clearInterval(interval1); clearInterval(interval2); };
  }, []);

  function toggleTokenWatchlist(addr: string) {
    let next;
    if (watchlistTokens.includes(addr)) {
      next = watchlistTokens.filter(a => a !== addr);
    } else {
      next = [...watchlistTokens, addr];
    }
    setWatchlistTokens(next);
    
    // Immediately update localStorage (merge with wallets if present)
    const saved = localStorage.getItem('watchlist');
    let wallets: string[] = [];
    if (saved) {
      try {
        const wl = JSON.parse(saved);
        wallets = Array.isArray(wl.wallets) ? wl.wallets : [];
      } catch {}
    }
    localStorage.setItem('watchlist', JSON.stringify({ wallets, tokens: next }));
  }

  const renderTable = (tokens: Token[]) => {
    // Deduplicate by address
    const uniqueTokens = Array.from(new Map(tokens.map(t => [t.address, t])).values());
    return (
      <div style={{ ...leaderboardBoxStyle, maxHeight: 700, overflowY: 'auto', marginTop: 0 }} className="token-leaderboard-scroll">
        <table style={leaderboardTableStyle}>
          <thead style={{ background: 'rgba(0, 255, 65, 0.1)' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>RANK</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>TOKEN</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>LIQUIDITY</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>MARKET_CAP</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>HOLDERS</th>
            </tr>
          </thead>
          <tbody>
            {uniqueTokens.map((token, idx) => (
              <tr key={token.address} style={{ borderBottom: '1px solid #333333', background: 'transparent' }}>
                <td style={{ padding: '10px', fontWeight: 700, fontSize: 13 }}>#{idx + 1}</td>
                <td style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={token.logo} alt={token.symbol} style={{ width: 24, height: 24, marginRight: 12, borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {token.symbol}
                      <button
                        title={watchlistTokens.includes(token.address) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                        onClick={e => { e.stopPropagation(); toggleTokenWatchlist(token.address); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: watchlistTokens.includes(token.address) ? '#00ff41' : '#555',
                          fontSize: 18,
                          cursor: 'pointer',
                          marginLeft: 2
                        }}
                      >
                        {watchlistTokens.includes(token.address) ? '★' : '☆'}
                      </button>
                    </div>
                    <TokenAddress address={token.address} />
                  </div>
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 13 }}>{token.liquidity}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 13 }}>{token.market_cap}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 13 }}>{token.holder_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderMinuteRankTable = (tokens: Token[]) => {
    // Deduplicate by address
    const uniqueTokens = Array.from(new Map(tokens.map(t => [t.address, t])).values());
    return (
      <div style={{ ...leaderboardBoxStyle, maxHeight: 700, overflowY: 'auto', marginBottom: 0 }} className="token-leaderboard-scroll">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #00ff41' }}>
          <h3 style={{ margin: 0, color: '#00ff41', fontWeight: 700, fontSize: 16, fontFamily: '"Courier New", monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>[1-MINUTE RANKING]</h3>
          <span style={{ fontSize: 11, color: '#00ff41', fontFamily: '"Courier New", monospace' }}>LAST_UPDATE: {minuteRefresh.toLocaleTimeString()}</span>
        </div>
        <table style={leaderboardTableStyle}>
          <thead style={{ background: 'rgba(0, 255, 65, 0.1)' }}>
            <tr>
              <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>RANK</th>
              <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>TOKEN</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>LIQUIDITY</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>MARKET_CAP</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#00ff41', borderBottom: '1px solid #333333', fontSize: 13 }}>HOLDERS</th>
            </tr>
          </thead>
          <tbody>
            {uniqueTokens.map((token, idx) => (
              <tr key={token.address} style={{ borderBottom: '1px solid #333333', background: 'transparent' }}>
                <td style={{ padding: '10px', fontWeight: 700, fontSize: 13 }}>#{idx + 1}</td>
                <td style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {token.logo && <img src={token.logo} alt={token.symbol} style={{ width: 24, height: 24, marginRight: 12, borderRadius: '50%' }} />}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                      {token.symbol}
                      <button
                        title={watchlistTokens.includes(token.address) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                        onClick={e => { e.stopPropagation(); toggleTokenWatchlist(token.address); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: watchlistTokens.includes(token.address) ? '#00ff41' : '#555',
                          fontSize: 18,
                          cursor: 'pointer',
                          marginLeft: 2
                        }}
                      >
                        {watchlistTokens.includes(token.address) ? '★' : '☆'}
                      </button>
                    </div>
                    <TokenAddress address={token.address} />
                  </div>
                </td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 13 }}>{token.liquidity || '-'}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 13 }}>{token.market_cap || '-'}</td>
                <td style={{ padding: '10px', textAlign: 'right', fontSize: 13 }}>{token.holder_count || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {minuteLoading && <div style={{ color: '#00ff41', padding: 12, fontFamily: '"Courier New", monospace', fontSize: 13 }}>[LOADING_1M_RANK...]</div>}
        {minuteError && <div style={{ color: '#ff6b6b', padding: 12, fontFamily: '"Courier New", monospace', fontSize: 13 }}>{minuteError}</div>}
      </div>
    );
  };

  return (
    <div style={{ 
      background: 'rgba(255, 255, 255, 0.02)', 
      borderRadius: 0, 
      padding: 24, 
      border: '1px solid #333333',
      margin: '0 auto', 
      maxWidth: 1600,
      fontFamily: '"Courier New", monospace'
    }}>
      <div style={{ display: 'flex', gap: 48, flexWrap: 'nowrap', justifyContent: 'center', alignItems: 'stretch', minHeight: 720 }}>
        <div style={{ flex: 1, minWidth: 420, maxWidth: 700, height: '100%' }}>{minuteLoading ? (
          <ProgressBarTerminal progress={minuteProgress} total={20} label="[LOADING_TOP_1M_TOKENS]" />
        ) : renderMinuteRankTable(minuteRank)}</div>
        <div style={{ flex: 1, minWidth: 420, maxWidth: 900, height: '100%' }}>
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
          {loading ? (
            <ProgressBarTerminal progress={tokenProgress} total={20} label="[LOADING_TOP_TOKENS]" />
          ) : error ? (
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
          ) : (
            tokensData && renderTable(tokensData[tab as keyof TopTokensData] as Token[])
          )}
        </div>
      </div>
    </div>
  );
};

export default TopTokensSection; 