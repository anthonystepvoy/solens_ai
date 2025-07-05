import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
// import solensLogo from '../assets/solens-logo-white.png';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/700.css';
import { API_ENDPOINTS } from './config';
import TopTokensSection from './components/TopTokensSection';
import LandingPage from './components/LandingPage';

const drawerWidth = 280;

// WalletAddress component
function WalletAddress({ address, short = false }: { address: string, short?: boolean }) {
  const [copied, setCopied] = useState(false);
  const display = short && address.length > 12 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address;
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <span
      style={{ 
        cursor: 'pointer', 
        userSelect: 'all', 
        color: '#00ff41', 
        fontWeight: 400, 
        position: 'relative', 
        fontFamily: '"Courier New", monospace',
        fontSize: '13px',
        letterSpacing: '0.5px'
      }}
      onClick={handleCopy}
      title="[CLICK_TO_COPY]"
    >
      {display}
      {copied && (
        <span style={{ 
          marginLeft: 8, 
          color: '#ffffff', 
          fontWeight: 600, 
          fontSize: 12, 
          background: '#000000', 
          border: '1px solid #00ff41',
          borderRadius: 0, 
          padding: '2px 6px', 
          position: 'absolute', 
          left: '100%', 
          top: '50%', 
          transform: 'translateY(-50%)',
          fontFamily: '"Courier New", monospace'
        }}>[COPIED]</span>
      )}
    </span>
  );
}

// Add this helper function near the top of the file
function getRiskLabel(score: number | undefined | null): string {
  if (score === 0) return 'Low';
  if (score == null || typeof score !== 'number' || isNaN(score)) return 'No data';
  if (score < 0.34) return 'Low';
  if (score < 0.67) return 'Medium';
  return 'High';
}

// Add at the top, after imports
function getCoreStat(wallet, stat) {
  // stat: 'pnl', 'win_rate', 'trade_count'
  if (stat === 'pnl') {
    return wallet?.gmgn_detailed_stats?.pnl ?? wallet?.gmgn_data?.realized_profit ?? '';
  }
  if (stat === 'win_rate') {
    return wallet?.gmgn_detailed_stats?.win_rate ?? wallet?.gmgn_data?.winrate_7d ?? '';
  }
  if (stat === 'trade_count') {
    return wallet?.gmgn_data?.txs_30d ?? '';
  }
  return '';
}

// Dashboard Page
function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [topWallets, setTopWallets] = useState<any[]>([]);
  const [topRiskyWallets, setTopRiskyWallets] = useState<any[]>([]);
  const [hotWallets24h, setHotWallets24h] = useState<any[]>([]);
  const [hotWallets1h, setHotWallets1h] = useState<any[]>([]);
  const [trendingTokens, setTrendingTokens] = useState<any[]>([]);
  const [mlTags, setMlTags] = useState<string[]>([]);
  const [mlCategories, setMlCategories] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [nextUpdate, setNextUpdate] = useState<number>(60);
  const [countdown, setCountdown] = useState<number>(60);

  // Fetch dashboard data
  const fetchDashboardData = (isInitialLoad = false) => {
    if (isInitialLoad) setLoading(true);
    axios.get(API_ENDPOINTS.DASHBOARD_SUMMARY)
      .then(res => {
        const d = res.data;
        setMetrics(d.metrics || []);
        setTopWallets(d.topWallets || []);
        setTopRiskyWallets(d.topRiskyWallets || []);
        setHotWallets24h(d.hotWallets24h || []);
        setHotWallets1h(d.hotWallets1h || []);
        setTrendingTokens(d.trendingTokens || []);
        setMlTags(d.mlTags || []);
        setMlCategories(d.mlCategories || []);
        if (d.lastUpdate) setLastUpdate(d.lastUpdate);
        setCountdown(60);
      })
      .catch(() => {
        if (isInitialLoad) {
          setError('[WARNING] Failed to load live data.');
        setMetrics([
            // { label: 'Total Wallets Tracked', value: '1,452' },
            // { label: 'New Wallets Today', value: '+56' },
            // { label: 'Total 7D PNL', value: '$1.2M' },
            // { label: 'Top 1m Token', value: '$WIF' },
          ]);
          setTopWallets([]);
          setTopRiskyWallets([]);
          setHotWallets24h([]);
          setHotWallets1h([]);
          setTrendingTokens([]);
          setMlTags([]);
          setMlCategories([]);
        }
      })
      .finally(() => { if (isInitialLoad) setLoading(false); });
  };

  // Poll every 60s, and set up countdown
  useEffect(() => {
    fetchDashboardData(true);
    const poll = setInterval(() => fetchDashboardData(false), 60000);
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => prev > 0 ? prev - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdate]);

  function getRelativeTime(iso: string | null) {
    if (!iso) return 'UNKNOWN';
    const now = new Date();
    const then = new Date(iso);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 60) return `${diff}s AGO`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m AGO`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h AGO`;
    return then.toUTCString();
  }

  // --- UI ---
  return (
    <div style={{ marginTop: 0, position: 'relative', maxWidth: 1200, margin: '0 auto', padding: '32px 24px 0', fontFamily: '"Courier New", monospace' }}>

      <h1 style={{ 
        color: '#ffffff', 
        marginBottom: 24, 
        fontSize: 24, 
        fontWeight: 700, 
        fontFamily: '"Courier New", monospace',
        letterSpacing: '2px',
        textTransform: 'uppercase',
        marginTop: 0
      }}>&gt; MAIN_DASHBOARD</h1>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <div style={{ color: '#00ff41', fontSize: 16, fontFamily: '"Courier New", monospace' }}>[LOADING_DATA...]</div>
        </div>
      ) : (
        <div>
          {error && <div style={{ color: '#ff6b6b', marginBottom: 16, fontFamily: '"Courier New", monospace', fontSize: 14, padding: 12, border: '1px solid #ff6b6b', background: 'rgba(255, 107, 107, 0.1)' }}>{error}</div>}
          {/* Key Metrics Row - now in banner */}

          {/* --- DASHBOARD GRID REARRANGED --- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Top row: Profitable | Hot Wallets (1H) | Top Tokens */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
              {/* Top Profitable Wallets */}
              <div>
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  color: '#ffffff', 
                  borderRadius: 0, 
                  padding: 24, 
                  border: '1px solid #333333',
                  marginBottom: 16,
                  fontFamily: '"Courier New", monospace'
                }}>
                  <h3 style={{ 
                    marginBottom: 16, 
                    fontSize: 16, 
                    fontWeight: 600,
                    color: '#ffffff',
                    letterSpacing: '1px',
                    fontFamily: '"Courier New", monospace'
                  }}>[TOP_PROFITABLE_WALLETS]</h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(180px,1.5fr) 1fr 1fr 1fr 2.5fr',
                    gap: 12,
                    fontSize: 13,
                    color: '#cccccc',
                    fontFamily: '"Courier New", monospace',
                    borderBottom: '1px solid #333333',
                    paddingBottom: 8,
                    marginBottom: 8,
                    fontWeight: 600
                  }}>
                    <span>ADDRESS</span>
                    <span>PNL_7D</span>
                    <span>WIN_RATE</span>
                    <span>SMART_SCORE</span>
                    <span>ML_TAGS</span>
                  </div>
                      {topWallets.map((w, i) => (
                    <div key={i} style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px,1.5fr) 1fr 1fr 1fr 2.5fr',
                      gap: 12,
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: i < topWallets.length - 1 ? '1px solid #333333' : 'none',
                      fontFamily: '"Courier New", monospace',
                      fontSize: 13,
                      background: i % 2 === 0 ? 'rgba(0,255,65,0.03)' : 'transparent'
                    }}>
                          <WalletAddress address={w.address} short={true} />
                      <span style={{ color: '#00ff41', fontWeight: 400, fontFamily: '"Courier New", monospace', fontSize: 13 }}>{w.pnl_7d !== undefined ? (parseFloat(w.pnl_7d) * 100).toFixed(2) + '%' : ''}</span>
                      <span style={{ fontFamily: '"Courier New", monospace', fontSize: 13 }}>{w.winRate}</span>
                      <span style={{ color: '#00ff41', fontWeight: 400, fontFamily: '"Courier New", monospace', fontSize: 13 }}>{!isNaN(parseFloat(w.smartScore)) ? `${parseFloat(w.smartScore).toFixed(0)}%` : 'N/A'}</span>
                      <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {w.ml_tags && w.ml_tags.length > 0 ? w.ml_tags.map((tag, j) => (
                          <span key={j} style={{
                            background: 'rgba(0,255,65,0.1)',
                        color: '#00ff41',
                            border: '1px solid #00ff41',
                            padding: '2px 6px',
                            fontSize: 11,
                            borderRadius: 0,
                            fontFamily: '"Courier New", monospace',
                            letterSpacing: '0.5px',
                            fontWeight: 400
                          }}>{tag}</span>
                        )) : <span style={{ color: '#555', fontFamily: '"Courier New", monospace', fontSize: 13 }}>-</span>}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Hot Wallets 1H */}
                <div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#ffffff', borderRadius: 0, padding: 24, border: '1px solid #333333', marginBottom: 16, fontFamily: '"Courier New", monospace' }}>
                    <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600, color: '#ffffff', letterSpacing: '1px', fontFamily: '"Courier New", monospace' }}>[HOT_WALLETS_1H]</h3>
                    {hotWallets1h.length === 0 ? (
                      <div style={{ color: '#ff6b6b', fontSize: 14, fontFamily: '"Courier New", monospace' }}>[NO HOT WALLETS FOUND IN LAST 1H]</div>
                    ) : hotWallets1h.map((w, i) => (
                      <div key={i} style={{ padding: '12px 0', borderBottom: i < hotWallets1h.length - 1 ? '1px solid #333333' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: '"Courier New", monospace' }}>
                        <div>
                          <div style={{ fontSize: 14, marginBottom: 4, fontFamily: '"Courier New", monospace' }}>
                            <WalletAddress address={w.address} short={true} />
                          </div>
                          <div style={{ fontSize: 12, color: '#cccccc', fontFamily: '"Courier New", monospace' }}>
                            TRADES_1H: <span style={{ color: '#00ff41', fontFamily: '"Courier New", monospace' }}>{w.trades_1h}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 400, color: '#00ff41', textAlign: 'right', fontFamily: '"Courier New", monospace' }}>
                          {w.pnl_1h !== undefined ? w.pnl_1h : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Top Tokens and stacked below: Top Risky Wallets, ML Categories */}
              <div>
                {/* Top Tokens */}
                {/* <div style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#ffffff', borderRadius: 0, padding: 24, border: '1px solid #333333', fontFamily: '"Courier New", monospace' }}>
                  <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600, color: '#ffffff', letterSpacing: '1px' }}>[TOP_TOKENS]</h3>
                  {trendingTokens.map((t, i) => (
                    <div key={i} style={{ padding: '8px 0', borderBottom: i < trendingTokens.length - 1 ? '1px solid #333333' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{t.token}</div>
                      <div style={{ fontSize: 12, color: '#00ff41' }}>MC: {t.market_cap}</div>
                    </div>
                  ))}
                </div> */}
                {/* Top Risky Wallets below Top Tokens, same width */}

                {/* ML Categories only in right column */}
                <div>
                  {/* ML Categories */}
                  <div style={{ 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    color: '#ffffff', 
                    borderRadius: 0, 
                    padding: 24, 
                    border: '1px solid #333333',
                    fontFamily: '"Courier New", monospace'
                  }}>
                    <h3 style={{ 
                      marginBottom: 16, 
                      fontSize: 16, 
                      fontWeight: 600,
                      color: '#ffffff',
                      letterSpacing: '1px',
                      fontFamily: '"Courier New", monospace'
                    }}>[ML_CATEGORIES]</h3>
                    {mlCategories.length === 0 ? (
                      <div style={{ color: '#555', fontSize: 14, fontFamily: '"Courier New", monospace' }}>[NO ML CATEGORIES FOUND]</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {mlCategories.map((cat, i) => (
                          <span key={i} style={{ color: '#00ff41', border: '1px solid #00ff41', padding: '4px 12px', fontFamily: '"Courier New", monospace', fontSize: 14, borderRadius: 0, width: 'fit-content' }}>{cat}</span>
                      ))}
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Settings Page
function SettingsPage() {
  // --- Security ---
  const [sessionTimeout, setSessionTimeout] = useState<number>(30); // minutes
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedTimeout = localStorage.getItem('sessionTimeout');
    if (savedTimeout) setSessionTimeout(Number(savedTimeout));
  }, []);
  useEffect(() => {
    localStorage.setItem('sessionTimeout', String(sessionTimeout));
  }, [sessionTimeout]);

  function clearAllLocalData() {
    if (window.confirm('Clear all local data? This will reset your watchlist and settings.')) {
      localStorage.clear();
      setSessionTimeout(30);
    }
  }

  // Data export/import logic remains (for future use)

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', color: '#fff', fontFamily: '"Courier New", monospace' }}>
      <h2 style={{ color: '#00ff41', fontWeight: 700, fontSize: 22, marginBottom: 24 }}>&gt; SYSTEM_CONFIG</h2>
      {/* SECURITY */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#00ff41', fontSize: 16, marginBottom: 8 }}>[SECURITY]</h3>
        <div style={{ marginBottom: 12 }}>
          <label>Session Timeout (minutes): </label>
          <input type="number" min={1} max={240} value={sessionTimeout} onChange={e => setSessionTimeout(Number(e.target.value))} style={{ width: 80, marginLeft: 8, background: '#111', color: '#00ff41', border: '1px solid #333', fontFamily: 'inherit' }} />
          </div>
        <button onClick={clearAllLocalData} style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '8px 16px', fontFamily: 'inherit', cursor: 'pointer', marginTop: 8 }}>&gt; CLEAR_ALL_LOCAL_DATA</button>
          </div>
      {/* DATA EXPORT/IMPORT (future use, can be hidden or repurposed) */}
      {/* <div style={{ marginBottom: 32 }}>
        <h3 style={{ color: '#00ff41', fontSize: 16, marginBottom: 8 }}>[DATA_EXPORT]</h3>
        ...
      </div> */}
      {/* Add new useful settings here */}
          </div>
  );
}

// Terminal-style progress bar component (reuse from TopTokensSection)
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

// Discovery Page
function DiscoveryPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // New: progress simulation
  const [tokenProgress, setTokenProgress] = useState(0);
  const [walletProgress, setWalletProgress] = useState(0);
  const totalTokens = 5; // Simulate 5 tokens per run
  const totalWallets = 20; // Simulate 20 wallets per run

  const handleRunDiscovery = () => {
    setLoading(true);
    setStatus(null);
    setError(null);
    setTokenProgress(0);
    setWalletProgress(0);
    // Simulate token scanning
    let tokenCount = 0;
    let walletCount = 0;
    const tokenInterval = setInterval(() => {
      tokenCount++;
      setTokenProgress(tokenCount);
      if (tokenCount >= totalTokens) clearInterval(tokenInterval);
    }, 300);
    // Simulate wallet scanning
    const walletInterval = setInterval(() => {
      walletCount++;
      setWalletProgress(walletCount);
      if (walletCount >= totalWallets) clearInterval(walletInterval);
    }, 60);
    // Fake scan: after a short delay, show a message with the current time
    setTimeout(() => {
        setLoading(false);
      setTokenProgress(totalTokens);
      setWalletProgress(totalWallets);
      const now = new Date();
      setStatus(
        `[DISCOVERY_COMPLETE] Latest scan at ${now.toLocaleTimeString()}.\nSystem is always running. This is the freshest data available.`
      );
    }, 5000); // Increased from 2000ms to 5000ms
  };

  return (
    <div style={{ 
      marginTop: 32, 
      maxWidth: 800, 
      margin: '32px auto 0', 
      padding: '0 24px',
      fontFamily: '"Courier New", monospace'
    }}>
      <h1 style={{ 
        color: '#ffffff', 
        marginBottom: 16, 
        fontSize: 24, 
        fontWeight: 700,
        fontFamily: '"Courier New", monospace',
        letterSpacing: '2px',
        textTransform: 'uppercase'
      }}>&gt; DISCOVERY_MODULE</h1>
      <p style={{ 
        color: '#cccccc', 
        marginBottom: 24,
        fontFamily: '"Courier New", monospace',
        fontSize: 14
      }}>[AUTOMATED_TARGET_ACQUISITION_SYSTEM]</p>
      
      <button
        onClick={handleRunDiscovery}
        disabled={loading}
        style={{
          background: loading ? '#333333' : '#000000',
          color: loading ? '#666666' : '#00ff41',
          border: loading ? '1px solid #666666' : '1px solid #00ff41',
          padding: '12px 24px',
          borderRadius: 0,
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          marginBottom: 24,
          fontFamily: '"Courier New", monospace',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}
        onMouseEnter={e => {
          if (!loading) {
            e.currentTarget.style.background = '#00ff41';
            e.currentTarget.style.color = '#000000';
          }
        }}
        onMouseLeave={e => {
          if (!loading) {
            e.currentTarget.style.background = '#000000';
            e.currentTarget.style.color = '#00ff41';
          }
        }}
      >
        {loading ? '[SCANNING...]' : '> INITIATE_DISCOVERY'}
      </button>

      {loading && (
        <>
          <ProgressBarTerminal progress={tokenProgress} total={totalTokens} label="[SCANNING_TOKENS]" />
          <ProgressBarTerminal progress={walletProgress} total={totalWallets} label="[SCANNING_WALLETS]" />
        </>
      )}

      {error && (
        <div style={{ 
          color: '#ff6b6b', 
          marginBottom: 16,
          fontFamily: '"Courier New", monospace',
          padding: 12,
          border: '1px solid #ff6b6b',
          background: 'rgba(255, 107, 107, 0.1)',
          fontSize: 14
        }}>{error}</div>
      )}
      
      {status && !loading && (
        <div style={{ 
          marginBottom: 16, 
          padding: 16, 
          background: 'rgba(0, 255, 65, 0.1)', 
          color: '#00ff41', 
          borderRadius: 0, 
          fontWeight: 600, 
          fontSize: 14, 
          border: '1px solid #00ff41',
          fontFamily: '"Courier New", monospace'
        }}>
          {status}
        </div>
      )}
    </div>
  );
}

// Top Tokens Page
function TopTokensPage() {
  // Token Watchlist logic (match wallet watchlist)
  const [tokenInput, setTokenInput] = useState('');
  const [watchlistTokens, setWatchlistTokens] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load watchlist from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      try {
        const wl = JSON.parse(saved);
        setWatchlistTokens(Array.isArray(wl.tokens) ? wl.tokens : []);
      } catch {}
    }
  }, []);

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    let wallets: string[] = [];
    if (saved) {
      try {
        const wl = JSON.parse(saved);
        wallets = Array.isArray(wl.wallets) ? wl.wallets : [];
      } catch {}
    }
    localStorage.setItem('watchlist', JSON.stringify({ wallets, tokens: watchlistTokens }));
  }, [watchlistTokens]);

  function addToken() {
    const addr = tokenInput.trim();
    if (!addr) return;
    if (!isValidTokenAddress(addr)) {
      alert('Invalid token address format. Please enter a valid token address.');
      return;
    }
    if (!watchlistTokens.includes(addr)) {
      setWatchlistTokens(wl => [...wl, addr]);
      setTokenInput('');
    }
  }
  function removeToken(addr: string) {
    setWatchlistTokens(wl => wl.filter(a => a !== addr));
  }
  function exportWatchlistJSON() {
    const saved = localStorage.getItem('watchlist');
    let wallets: string[] = [];
    if (saved) {
      try {
        const wl = JSON.parse(saved);
        wallets = Array.isArray(wl.wallets) ? wl.wallets : [];
      } catch {}
    }
    const blob = new Blob([JSON.stringify({ wallets, tokens: watchlistTokens }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'watchlist.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  function exportWatchlistCSV() {
    let csv = 'Type,Address\n';
    watchlistTokens.forEach(t => { csv += `Token,${t}\n`; });
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      try {
        const wl = JSON.parse(saved);
        (Array.isArray(wl.wallets) ? wl.wallets : []).forEach(w => { csv += `Wallet,${w}\n`; });
      } catch {}
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'watchlist.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  function importWatchlist(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data && Array.isArray(data.tokens)) {
          setWatchlistTokens(data.tokens);
        } else {
          alert('Invalid watchlist file.');
        }
      } catch {
        alert('Failed to import watchlist.');
      }
    };
    reader.readAsText(file);
  }

  // Token History logic
  const [showHistory, setShowHistory] = useState(false);
  const [tokenHistory, setTokenHistory] = useState<any[]>([]);
  const [currentTopTokens, setCurrentTopTokens] = useState<any[]>([]);

  // On mount, load and prune token history
  useEffect(() => {
    const saved = localStorage.getItem('tokenHistory');
    let history: any[] = [];
    if (saved) {
      try {
        history = JSON.parse(saved);
      } catch {}
    }
    const now = Date.now();
    // Prune entries older than 1 hour unless still in currentTopTokens
    const pruned = history.filter(entry => {
      const isRecent = now - entry.timestamp < 60 * 60 * 1000;
      const stillTop = currentTopTokens.some(t => t.token === entry.token);
      return isRecent || stillTop;
    });
    setTokenHistory(pruned);
    localStorage.setItem('tokenHistory', JSON.stringify(pruned));
  }, [currentTopTokens]);

  // When top tokens update, add to history
  function addToTokenHistory(newTokens: any[]) {
    setCurrentTopTokens(newTokens);
    const now = Date.now();
    let history: any[] = [];
    const saved = localStorage.getItem('tokenHistory');
    if (saved) {
      try {
        history = JSON.parse(saved);
      } catch {}
    }
    // Add new tokens with timestamp
    newTokens.forEach(t => {
      if (!history.some(h => h.token === t.token)) {
        history.push({ ...t, timestamp: now });
      }
    });
    // Prune as above
    const pruned = history.filter(entry => {
      const isRecent = now - entry.timestamp < 60 * 60 * 1000;
      const stillTop = newTokens.some(t => t.token === entry.token);
      return isRecent || stillTop;
    });
    setTokenHistory(pruned);
    localStorage.setItem('tokenHistory', JSON.stringify(pruned));
  }

  // Add state for live token info
  const [tokenInfoMap, setTokenInfoMap] = useState<Record<string, any>>({});
  const [tokenLoadingMap, setTokenLoadingMap] = useState<Record<string, boolean>>({});
  const [tokenErrorMap, setTokenErrorMap] = useState<Record<string, string>>({});

  // Basic token address validation
  function isValidTokenAddress(addr: string): boolean {
    return /^[A-Za-z0-9]{32,44}$/.test(addr.trim());
  }

  // Fetch info for all tokens in watchlist
  const fetchTokenInfos = async () => {
    const promises = watchlistTokens.map(async (addr) => {
      // Set loading state for this token
      setTokenLoadingMap(prev => ({ ...prev, [addr]: true }));
      setTokenErrorMap(prev => ({ ...prev, [addr]: '' }));
      
      try {
        const res = await axios.get(API_ENDPOINTS.TOKEN(addr));
        return [addr, res.data, null];
      } catch (error: any) {
        const errorMsg = error.response?.status === 404 ? 'Token not found' : 'Failed to fetch data';
        return [addr, null, errorMsg];
      } finally {
        setTokenLoadingMap(prev => ({ ...prev, [addr]: false }));
      }
    });
    const results = await Promise.all(promises);
    const infoMap: Record<string, any> = {};
    const errorMap: Record<string, string> = {};
    results.forEach(([addr, info, error]) => { 
      infoMap[addr] = info; 
      if (error) errorMap[addr] = error;
    });
    setTokenInfoMap(infoMap);
    setTokenErrorMap(prev => ({ ...prev, ...errorMap }));
  };

  // Auto-refresh every 30s
  useEffect(() => {
    fetchTokenInfos();
    const interval = setInterval(fetchTokenInfos, 30000);
    return () => clearInterval(interval);
  }, [watchlistTokens]);

  // State for 1-minute top tokens (bulk fetch)
  const [minuteRankTokens, setMinuteRankTokens] = useState<any[]>([]);
  const [minuteRankLoading, setMinuteRankLoading] = useState(false);
  const [minuteRankError, setMinuteRankError] = useState<string | null>(null);

  // Fetch 1-minute top tokens in bulk
  const fetchMinuteRankTokens = async () => {
    setMinuteRankLoading(true);
    setMinuteRankError(null);
    try {
      const res = await axios.get(API_ENDPOINTS.LATEST_MINUTE_RANK);
      setMinuteRankTokens(res.data);
    } catch (err) {
      setMinuteRankError('Failed to fetch 1-minute top tokens');
    } finally {
      setMinuteRankLoading(false);
    }
  };

  // Auto-refresh every 30s
  useEffect(() => {
    fetchMinuteRankTokens();
    const interval = setInterval(fetchMinuteRankTokens, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ marginTop: 32, maxWidth: 1200, margin: '32px auto 0', padding: '0 24px', color: '#ffffff', fontFamily: '"Courier New", monospace' }}>
      <h1 style={{ color: '#ffffff', marginBottom: 16, fontSize: 24, fontWeight: 700, fontFamily: '"Courier New", monospace', letterSpacing: '2px', textTransform: 'uppercase' }}>&gt; TOKENS</h1>
      {/* Token Watchlist UI */}
      <div style={{ marginBottom: 24, background: 'rgba(0,255,65,0.03)', border: '1px solid #333333', padding: 16, borderRadius: 0 }}>
        <h3 style={{ color: '#00ff41', fontSize: 16, marginBottom: 8 }}>[TOKEN_WATCHLIST]</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input placeholder="Add token address" value={tokenInput} onChange={e => setTokenInput(e.target.value)} style={{ flex: 1, background: '#111', color: '#00ff41', border: '1px solid #333', fontFamily: 'inherit', padding: 8 }} />
          {tokenInput && (
            <button
              onClick={() => setTokenInput('')}
              style={{ background: 'none', border: 'none', color: '#ff6b6b', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}
              title="Clear"
            >×</button>
          )}
          <button onClick={addToken} style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer' }}>+ TOKEN</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ color: '#cccccc', fontSize: 13, marginBottom: 4 }}>Tokens:</div>
          {watchlistTokens.length === 0 && <div style={{ color: '#555', fontSize: 13 }}>[No tokens saved]</div>}
          {watchlistTokens.map(addr => {
            const token = minuteRankTokens.find(t => t.address === addr);
            return (
              <div key={addr} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <TokenAddress address={addr} />
                {minuteRankLoading ? (
                  <span style={{ color: '#00ff41', fontSize: 13, fontFamily: 'inherit', marginLeft: 4 }}>[Loading...]</span>
                ) : minuteRankError ? (
                  <span style={{ color: '#ff6b6b', fontSize: 13, fontFamily: 'inherit', marginLeft: 4 }}>[Error: {minuteRankError}]</span>
                ) : token ? (
                  <span style={{ color: '#00ff41', fontSize: 13, fontFamily: 'inherit', background: 'rgba(0,255,65,0.05)', border: '1px solid #222', padding: '2px 8px', borderRadius: 0, marginLeft: 4 }}>
                    {token.symbol ? `${token.symbol}` : ''}
                    {token.liquidity ? ` | LQ: ${token.liquidity}` : ''}
                    {token.market_cap ? ` | MC: ${token.market_cap}` : ''}
                    {token.holder_count ? ` | Holders: ${token.holder_count}` : ''}
                  </span>
                ) : (
                  <span style={{ color: '#ff6b6b', fontSize: 13, fontFamily: 'inherit', marginLeft: 4 }}>[No data (not in top 1m tokens)]</span>
                )}
                <button onClick={fetchMinuteRankTokens} style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', fontSize: 12, padding: '2px 8px', cursor: 'pointer', marginLeft: 4 }}>↻</button>
                <button onClick={() => removeToken(addr)} style={{ background: 'none', color: '#ff6b6b', border: 'none', fontSize: 14, cursor: 'pointer' }}>🗑️</button>
            </div>
            );
          })}
          </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={exportWatchlistJSON} style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '8px 16px', fontFamily: 'inherit', cursor: 'pointer', marginRight: 8 }}>&gt; EXPORT_WATCHLIST_JSON</button>
          <button onClick={exportWatchlistCSV} style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '8px 16px', fontFamily: 'inherit', cursor: 'pointer', marginRight: 8 }}>&gt; EXPORT_WATCHLIST_CSV</button>
          <input type="file" accept="application/json" ref={fileInputRef} style={{ display: 'none' }} onChange={importWatchlist} />
          <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '8px 16px', fontFamily: 'inherit', cursor: 'pointer' }}>&gt; IMPORT_WATCHLIST_JSON</button>
            </div>
          </div>
      <button onClick={() => setShowHistory(h => !h)} style={{ marginBottom: 16, background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '8px 16px', fontFamily: 'inherit', cursor: 'pointer' }}>
        {showHistory ? '> HIDE TOKENS HISTORY' : '> SHOW TOKENS HISTORY'}
      </button>
      {showHistory && (
        <div style={{ marginBottom: 24, background: 'rgba(0,255,65,0.03)', border: '1px solid #333333', padding: 16, borderRadius: 0 }}>
          <h3 style={{ color: '#00ff41', fontSize: 16, marginBottom: 8 }}>[TOKENS_HISTORY]</h3>
          {tokenHistory.length === 0 ? (
            <div style={{ color: '#555', fontSize: 13 }}>[No token history]</div>
          ) : (
            <ul style={{ color: '#00ff41', fontFamily: 'inherit', fontSize: 13 }}>
              {tokenHistory.map(entry => (
                <li key={entry.token}>{entry.token} (added {new Date(entry.timestamp).toLocaleTimeString()})</li>
              ))}
            </ul>
          )}
            </div>
      )}
      <TopTokensSection
        onTokenHistoryUpdate={addToTokenHistory}
        watchlistTokens={watchlistTokens}
        setWatchlistTokens={setWatchlistTokens}
      />
    </div>
  );
}

function WalletFinderPage() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Watchlist integration
  const [watchlist, setWatchlist] = useState<string[]>([]);
  // Add wallet watchlist management UI at the top
  const [walletInput, setWalletInput] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load watchlist from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      try {
        const wl = JSON.parse(saved);
        setWatchlist(Array.isArray(wl.wallets) ? wl.wallets : []);
      } catch {}
    }
  }, []);
  // Sync watchlist if changed elsewhere
  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem('watchlist');
      if (saved) {
        try {
          const wl = JSON.parse(saved);
          setWatchlist(Array.isArray(wl.wallets) ? wl.wallets : []);
        } catch {}
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);
  // Add/remove wallet to watchlist
  function toggleWatchlist(addr: string) {
    setWatchlist(prev => {
      let next;
      if (prev.includes(addr)) {
        next = prev.filter(a => a !== addr);
      } else {
        next = [...prev, addr];
      }
      // Save to localStorage (merge with tokens if present)
      const saved = localStorage.getItem('watchlist');
      let tokens: string[] = [];
      if (saved) {
        try {
          const wl = JSON.parse(saved);
          tokens = Array.isArray(wl.tokens) ? wl.tokens : [];
        } catch {}
      }
      localStorage.setItem('watchlist', JSON.stringify({ wallets: next, tokens }));
      return next;
    });
  }

  // Fetch wallets from backend
  const fetchWallets = () => {
    setLoading(true);
    axios.get(API_ENDPOINTS.WALLETS)
      .then(res => {
        setWallets(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('[ERROR] Failed to load wallet database.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWallets();
    // Poll every 60 seconds for auto-update
    const interval = setInterval(fetchWallets, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filtering and sorting
  const filteredWallets = wallets.filter(w =>
    w.id?.toLowerCase().includes(search.toLowerCase())
  );

  // Inject custom scrollbar CSS for WalletFinderPage (if not already present)
  if (typeof window !== 'undefined' && !document.getElementById('wallet-finder-scrollbar-style')) {
    const style = document.createElement('style');
    style.id = 'wallet-finder-scrollbar-style';
    style.innerHTML = `
      .wallet-finder-scroll::-webkit-scrollbar {
        width: 10px;
        background: #000;
      }
      .wallet-finder-scroll::-webkit-scrollbar-thumb {
        background: #00ff41;
        border-radius: 0;
        border: 2px solid #000;
        min-height: 40px;
        transition: background 0.2s;
      }
      .wallet-finder-scroll::-webkit-scrollbar-thumb:hover {
        background: #33ff77;
      }
      .wallet-finder-scroll {
        scrollbar-color: #00ff41 #000;
        scrollbar-width: thin;
      }
    `;
    document.head.appendChild(style);
  }

  function addWallet() {
    const addr = walletInput.trim();
    if (addr && !watchlist.includes(addr)) {
      const next = [...watchlist, addr];
      // Save to localStorage (merge with tokens if present)
      const saved = localStorage.getItem('watchlist');
      let tokens: string[] = [];
      if (saved) {
        try {
          const wl = JSON.parse(saved);
          tokens = Array.isArray(wl.tokens) ? wl.tokens : [];
        } catch {}
      }
      localStorage.setItem('watchlist', JSON.stringify({ wallets: next, tokens }));
      setWatchlist(next);
      setWalletInput('');
    }
  }
  function removeWallet(addr: string) {
    const next = watchlist.filter(a => a !== addr);
    // Save to localStorage (merge with tokens if present)
    const saved = localStorage.getItem('watchlist');
    let tokens: string[] = [];
    if (saved) {
      try {
        const wl = JSON.parse(saved);
        tokens = Array.isArray(wl.tokens) ? wl.tokens : [];
      } catch {}
    }
    localStorage.setItem('watchlist', JSON.stringify({ wallets: next, tokens }));
    setWatchlist(next);
  }
  function exportWatchlistJSON() {
    // Only export wallets here
    const saved = localStorage.getItem('watchlist');
    let tokens: string[] = [];
    if (saved) {
      try {
        const wl = JSON.parse(saved);
        tokens = Array.isArray(wl.tokens) ? wl.tokens : [];
      } catch {}
    }
    const blob = new Blob([JSON.stringify({ wallets: watchlist, tokens }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'watchlist.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  function exportWatchlistCSV() {
    let csv = 'Type,Address\n';
    watchlist.forEach(w => { csv += `Wallet,${w}\n`; });
    const saved = localStorage.getItem('watchlist');
    if (saved) {
      try {
        const wl = JSON.parse(saved);
        (Array.isArray(wl.tokens) ? wl.tokens : []).forEach(t => { csv += `Token,${t}\n`; });
      } catch {}
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'watchlist.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  function importWatchlist(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (data && Array.isArray(data.wallets)) {
          // Save to localStorage (merge with tokens if present)
          const saved = localStorage.getItem('watchlist');
          let tokens: string[] = [];
          if (saved) {
            try {
              const wl = JSON.parse(saved);
              tokens = Array.isArray(wl.tokens) ? wl.tokens : [];
            } catch {}
          }
          localStorage.setItem('watchlist', JSON.stringify({ wallets: data.wallets, tokens }));
          setWatchlist(data.wallets);
        } else {
          alert('Invalid watchlist file.');
        }
      } catch {
        alert('Failed to import watchlist.');
      }
    };
    reader.readAsText(file);
  }

  // Add state for live wallet info
  const [walletInfoMap, setWalletInfoMap] = useState<Record<string, any>>({});

  // Fetch info for all wallets in watchlist
  const fetchWalletInfos = async () => {
    const promises = watchlist.map(async (addr) => {
      try {
        const res = await axios.get(API_ENDPOINTS.WALLET(addr));
        return [addr, res.data];
      } catch {
        return [addr, null];
      }
    });
    const results = await Promise.all(promises);
    const infoMap: Record<string, any> = {};
    results.forEach(([addr, info]) => { infoMap[addr] = info; });
    setWalletInfoMap(infoMap);
  };

  // Auto-refresh every 30s
  useEffect(() => {
    fetchWalletInfos();
    const interval = setInterval(fetchWalletInfos, 30000);
    return () => clearInterval(interval);
  }, [watchlist]);

  // In WalletFinderPage
  const [currentPage, setCurrentPage] = useState(1);
  const walletsPerPage = 20;
  const totalPages = Math.ceil(filteredWallets.length / walletsPerPage);

  // Sorting logic
  const [sortBy, setSortBy] = useState('top_pnl');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const sortOptions = [
    { value: 'top_pnl', label: 'Top PNL' },
    { value: 'top_risk', label: 'Top Risk' },
    { value: 'top_win', label: 'Top Win Rate' },
    { value: 'top_smart', label: 'Top Smart Score' },
    { value: 'newest', label: 'Newest' },
    { value: 'address', label: 'Address (A-Z)' },
  ];

  function getWalletSortValue(w: any, sort: string) {
    if (sort === 'top_pnl') return w.gmgn_detailed_stats?.pnl_7d ?? -Infinity;
    if (sort === 'top_risk') return w.ai_insights?.risk_score ?? -Infinity;
    if (sort === 'top_win') return w.gmgn_detailed_stats?.winrate ?? -Infinity;
    if (sort === 'top_smart') return w.ai_insights?.overall_smart_score ?? -Infinity;
    if (sort === 'newest') return w.created_at ? new Date(w.created_at).getTime() : -Infinity;
    if (sort === 'address') return w.id || '';
    return 0;
  }

  const sortedWallets = [...filteredWallets].sort((a, b) => {
    const va = getWalletSortValue(a, sortBy);
    const vb = getWalletSortValue(b, sortBy);
    if (sortBy === 'address') {
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    }
    return sortDir === 'asc' ? va - vb : vb - va;
  });
  const paginatedWallets = sortedWallets.slice((currentPage - 1) * walletsPerPage, currentPage * walletsPerPage);

  return (
    <div style={{ 
      marginTop: 32, 
      maxWidth: 1200, 
      margin: '32px auto 0', 
      padding: '0 24px', 
      color: '#ffffff',
      fontFamily: '"Courier New", monospace'
    }}>
      <h1 style={{ 
        color: '#ffffff', 
        marginBottom: 16, 
        fontSize: 24, 
        fontWeight: 700,
        fontFamily: '"Courier New", monospace',
        letterSpacing: '2px',
        textTransform: 'uppercase'
      }}>&gt; WALLET_FINDER</h1>
      <p style={{ 
        color: '#cccccc', 
        marginBottom: 24,
        fontFamily: '"Courier New", monospace',
        fontSize: 14
      }}>[WALLET_IDENTIFICATION_PROTOCOL]</p>
      {/* Wallet Watchlist UI */}
      <div style={{ marginBottom: 24, background: 'rgba(0,255,65,0.03)', border: '1px solid #333333', padding: 16, borderRadius: 0 }}>
        <h3 style={{ color: '#00ff41', fontSize: 16, marginBottom: 8 }}>[WALLET_WATCHLIST]</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input placeholder="Add wallet address" value={walletInput} onChange={e => setWalletInput(e.target.value)} style={{ flex: 1, background: '#111', color: '#00ff41', border: '1px solid #333', fontFamily: 'inherit', padding: 8 }} />
          {walletInput && (
            <button
              onClick={() => setWalletInput('')}
              style={{ background: 'none', border: 'none', color: '#ff6b6b', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}
              title="Clear"
            >×</button>
          )}
          <button onClick={addWallet} style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '8px 12px', fontFamily: 'inherit', cursor: 'pointer' }}>+ WALLET</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ color: '#cccccc', fontSize: 13, marginBottom: 4 }}>Wallets:</div>
          {watchlist.length === 0 && <div style={{ color: '#555', fontSize: 13 }}>[No wallets saved]</div>}
          {watchlist.map(addr => (
            <div key={addr} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <WalletAddress address={addr} />
              {walletInfoMap[addr] ? (
                <span style={{ color: '#00ff41', fontSize: 13, fontFamily: 'inherit', background: 'rgba(0,255,65,0.05)', border: '1px solid #222', padding: '2px 8px', borderRadius: 0, marginLeft: 4 }}>
                  {walletInfoMap[addr].gmgn_detailed_stats?.pnl_7d !== undefined ? `PNL_7D: ${(walletInfoMap[addr].gmgn_detailed_stats.pnl_7d * 100).toFixed(2)}%` : ''}
                  {walletInfoMap[addr].gmgn_detailed_stats?.winrate !== undefined ? ` | WIN: ${(walletInfoMap[addr].gmgn_detailed_stats.winrate * 100).toFixed(0)}%` : ''}
                  {walletInfoMap[addr].ai_insights?.overall_smart_score !== undefined ? ` | SMART: ${(walletInfoMap[addr].ai_insights.overall_smart_score * 100).toFixed(0)}%` : ''}
                  {walletInfoMap[addr].ai_insights?.risk_score !== undefined && !isNaN(walletInfoMap[addr].ai_insights.risk_score) ? ` | RISK: ${(walletInfoMap[addr].ai_insights.risk_score * 100).toFixed(0)}%` : ' | RISK: N/A'}
                  {walletInfoMap[addr].ai_insights?.tags_ml?.length ? ` | TAGS: ${walletInfoMap[addr].ai_insights.tags_ml.join(', ')}` : ''}
                </span>
              ) : (
                <span style={{ color: '#ff6b6b', fontSize: 13, fontFamily: 'inherit', marginLeft: 4 }}>[No data]</span>
              )}
              <button onClick={() => fetchWalletInfos()} style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', fontSize: 12, padding: '2px 8px', cursor: 'pointer', marginLeft: 4 }}>↻</button>
              <button onClick={() => removeWallet(addr)} style={{ background: 'none', color: '#ff6b6b', border: 'none', fontSize: 14, cursor: 'pointer' }}>🗑️</button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <button onClick={exportWatchlistJSON} style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '8px 16px', fontFamily: 'inherit', cursor: 'pointer', marginRight: 8 }}>&gt; EXPORT_WATCHLIST_JSON</button>
          <button onClick={exportWatchlistCSV} style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '8px 16px', fontFamily: 'inherit', cursor: 'pointer', marginRight: 8 }}>&gt; EXPORT_WATCHLIST_CSV</button>
          <input type="file" accept="application/json" ref={fileInputRef} style={{ display: 'none' }} onChange={importWatchlist} />
          <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '8px 16px', fontFamily: 'inherit', cursor: 'pointer' }}>&gt; IMPORT_WATCHLIST_JSON</button>
        </div>
      </div>
      {/* Sort dropdown */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0 8px 0' }}>
        <label htmlFor="wallet-sort" style={{ color: '#00ff41', fontFamily: 'inherit', fontSize: 13 }}>[SORT_BY]</label>
        <select
          id="wallet-sort"
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{ background: '#000', color: '#00ff41', border: '1px solid #00ff41', fontFamily: 'inherit', fontSize: 13, padding: '4px 12px', borderRadius: 0 }}
        >
          {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <button
          onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
          style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', fontFamily: 'inherit', fontSize: 13, padding: '4px 12px', borderRadius: 0, cursor: 'pointer' }}
          title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
        >{sortDir === 'asc' ? '↑' : '↓'}</button>
      </div>
        <input
          type="text"
          placeholder="[SEARCH_WALLET_ADDRESS]"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ 
            flex: 1, 
            padding: '12px', 
            borderRadius: 0, 
            border: '1px solid #333333', 
            background: '#000000', 
            color: '#ffffff', 
            fontSize: 14,
            fontFamily: '"Courier New", monospace'
          }}
        />
      {loading ? (
        <div style={{ 
          color: '#00ff41',
          fontFamily: '"Courier New", monospace'
        }}>[LOADING_WALLET_DATABASE...]</div>
      ) : error ? (
        <div style={{ 
          color: '#ff6b6b',
          fontFamily: '"Courier New", monospace',
          padding: 12,
          border: '1px solid #ff6b6b',
          background: 'rgba(255, 107, 107, 0.1)',
          fontSize: 14
        }}>{error}</div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 600, marginTop: 24 }} className="wallet-finder-scroll">
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
              fontSize: 13,
              fontFamily: '"Courier New", monospace'
            }}>
              <thead>
                <tr style={{ background: 'rgba(0, 255, 65, 0.1)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>WALLET</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>PNL_7D</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>WIN_RATE</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>SMART_SCORE</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>RISK_SCORE</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>ML_TAGS</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>TOKENS (7D)</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>TRADES (7D)</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWallets.map((w: any, i: number) => (
                  <tr 
                    key={w.id || i} 
                    style={{ 
                      cursor: 'pointer', 
                      transition: 'background 0.2s',
                      borderBottom: '1px solid #333333',
                      background: watchlist.includes(w.id) ? 'rgba(0,255,65,0.08)' : (i % 2 === 0 ? 'rgba(0,255,65,0.03)' : 'transparent')
                    }} 
                    onClick={() => setSelected(w)} 
                    onMouseOver={e => e.currentTarget.style.background='rgba(0, 255, 65, 0.05)'} 
                    onMouseLeave={e => e.currentTarget.style.background=watchlist.includes(w.id) ? 'rgba(0,255,65,0.08)' : (i % 2 === 0 ? 'rgba(0,255,65,0.03)' : 'transparent')}
                  >
                    <td style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <WalletAddress address={w.id} short />
                      <button
                        title={watchlist.includes(w.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
                        onClick={e => { e.stopPropagation(); toggleWatchlist(w.id); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: watchlist.includes(w.id) ? '#00ff41' : '#555',
                          fontSize: 18,
                          cursor: 'pointer',
                          marginLeft: 2
                        }}
                      >
                        {watchlist.includes(w.id) ? '★' : '☆'}
                      </button>
                    </td>
                    <td style={{ padding: '10px' }}>{w.gmgn_detailed_stats?.pnl_7d !== undefined ? (w.gmgn_detailed_stats.pnl_7d * 100).toFixed(2) + '%' : ''}</td>
                    <td style={{ padding: '10px' }}>{w.gmgn_detailed_stats?.winrate !== undefined ? `${(w.gmgn_detailed_stats.winrate * 100).toFixed(0)}%` : ''}</td>
                    <td style={{ padding: '10px' }}>{!isNaN(parseFloat(w?.ai_insights?.overall_smart_score)) ? `${parseFloat(w.ai_insights.overall_smart_score).toFixed(0)}%` : 'N/A'}</td>
                    <td style={{ padding: '10px' }}>{!isNaN(parseFloat(w?.ai_insights?.risk_score)) ? `${parseFloat(w.ai_insights.risk_score).toFixed(0)}%` : 'N/A'}</td>
                    <td style={{ padding: '10px' }}>{w.ai_insights?.tags_ml?.join(', ')}</td>
                    <td style={{ padding: '10px' }}>{w.unique_tokens_bought_7d ?? ''}</td>
                    <td style={{ padding: '10px' }}>{(w.gmgn_detailed_stats?.buy_7d ?? 0) + (w.gmgn_detailed_stats?.sell_7d ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Improved pagination controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, margin: '24px 0' }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '4px 12px', fontFamily: 'inherit', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
          >Prev</button>
          {/* Google-style pagination: show first, last, current, and up to 2 neighbors, with ellipsis */}
          {(() => {
            const pages: Array<React.ReactNode> = [];
            const pageWindow = 2;
            let start = Math.max(1, currentPage - pageWindow);
            let end = Math.min(totalPages, currentPage + pageWindow);
            if (start > 1) {
              pages.push(
                <button key={1} onClick={() => setCurrentPage(1)} style={{ background: currentPage === 1 ? 'rgba(0,255,65,0.1)' : 'none', color: currentPage === 1 ? '#00ff41' : '#cccccc', border: '1px solid #00ff41', padding: '4px 12px', fontFamily: 'inherit', cursor: 'pointer', fontWeight: currentPage === 1 ? 700 : 400 }}>1</button>
              );
              if (start > 2) pages.push(<span key="start-ellipsis" style={{ color: '#00ff41', fontWeight: 700 }}>...</span>);
            }
            for (let i = start; i <= end; i++) {
              if (i === 1 || i === totalPages) continue;
              pages.push(
                <button key={i} onClick={() => setCurrentPage(i)} style={{ background: currentPage === i ? 'rgba(0,255,65,0.1)' : 'none', color: currentPage === i ? '#00ff41' : '#cccccc', border: '1px solid #00ff41', padding: '4px 12px', fontFamily: 'inherit', cursor: 'pointer', fontWeight: currentPage === i ? 700 : 400 }}>{i}</button>
              );
            }
            if (end < totalPages) {
              if (end < totalPages - 1) pages.push(<span key="end-ellipsis" style={{ color: '#00ff41', fontWeight: 700 }}>...</span>);
              pages.push(
                <button key={totalPages} onClick={() => setCurrentPage(totalPages)} style={{ background: currentPage === totalPages ? 'rgba(0,255,65,0.1)' : 'none', color: currentPage === totalPages ? '#00ff41' : '#cccccc', border: '1px solid #00ff41', padding: '4px 12px', fontFamily: 'inherit', cursor: 'pointer', fontWeight: currentPage === totalPages ? 700 : 400 }}>{totalPages}</button>
              );
            }
            return pages;
          })()}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{ background: 'none', color: '#00ff41', border: '1px solid #00ff41', padding: '4px 12px', fontFamily: 'inherit', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
          >Next</button>
        </div>
      )}
      {selected && (
        <div style={{ 
          marginTop: 32, 
          background: 'rgba(255, 255, 255, 0.02)', 
          borderRadius: 0, 
          padding: 24,
          border: '1px solid #333333',
          fontFamily: '"Courier New", monospace'
        }}>
          <h2 style={{ 
            color: '#00ff41',
            fontSize: 18,
            marginBottom: 16,
            fontFamily: '"Courier New", monospace'
          }}>[WALLET_PROFILE]</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: 14 }}>
            <p style={{ color: '#cccccc' }}>ADDRESS: <span style={{ color: '#ffffff' }}>{selected.id}</span></p>
            <p style={{ color: '#cccccc' }}>PNL_7D: <span style={{ color: '#ffffff' }}>{selected.gmgn_detailed_stats?.pnl_7d !== undefined ? (selected.gmgn_detailed_stats.pnl_7d * 100).toFixed(2) + '%' : ''}</span></p>
            <p style={{ color: '#cccccc' }}>WIN_RATE: <span style={{ color: '#ffffff' }}>{selected.gmgn_detailed_stats?.winrate !== undefined ? `${(selected.gmgn_detailed_stats.winrate * 100).toFixed(0)}%` : ''}</span></p>
            <p style={{ color: '#cccccc' }}>SMART_SCORE: <span style={{ color: '#ffffff' }}>{!isNaN(parseFloat(selected?.ai_insights?.overall_smart_score)) ? `${parseFloat(selected.ai_insights.overall_smart_score).toFixed(0)}%` : 'N/A'}</span></p>
            <p style={{ color: '#cccccc' }}>RISK_SCORE: <span style={{ color: '#ffffff' }}>{!isNaN(parseFloat(selected?.ai_insights?.risk_score)) ? `${parseFloat(selected.ai_insights.risk_score).toFixed(0)}%` : 'N/A'}</span></p>
            <p style={{ color: '#cccccc' }}>TOKENS BOUGHT (7D): <span style={{ color: '#ffffff' }}>{selected.unique_tokens_bought_7d ?? ''}</span></p>
            <p style={{ color: '#cccccc' }}>TRADES MADE (7D): <span style={{ color: '#ffffff' }}>{(selected.gmgn_detailed_stats?.buy_7d ?? 0) + (selected.gmgn_detailed_stats?.sell_7d ?? 0)}</span></p>
          </div>
          <p style={{ color: '#cccccc', marginTop: 16 }}>ML_TAGS: <span style={{ color: '#ffffff' }}>{selected.ai_insights?.tags_ml?.join(', ')}</span></p>
        </div>
      )}
    </div>
  );
}

function CopytradeFinderPage() {
  return (
    <div style={{ marginTop: 32, maxWidth: 800, margin: '32px auto 0', padding: '0 24px', fontFamily: '"Courier New", monospace', color: '#fff' }}>
      <h1 style={{ color: '#cccccc', marginBottom: 16, fontSize: 24, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'inherit' }}>&gt; COPYTRADE_FINDER</h1>
      <p style={{ color: '#cccccc', marginBottom: 24, fontFamily: 'inherit', fontSize: 14 }}>[ADVANCED_PATTERN_RECOGNITION_SYSTEM]</p>
      <div style={{ color: '#cccccc', fontWeight: 600, fontSize: 16, marginTop: 32, fontFamily: 'inherit', marginBottom: 32 }}>[COPYTRADE ANALYZER MODULE]</div>
      <div style={{ color: '#cccccc', fontSize: 15, lineHeight: 1.7, background: 'rgba(0,255,65,0.04)', border: '1px solid #00ff41', borderRadius: 0, padding: 24, marginBottom: 32 }}>
        <b style={{ color: '#00ff41' }}>[WHAT IS THIS?]</b><br/>
        The Copytrade Analyzer is an advanced pattern recognition system for Cipher. It analyzes blockchain transactions to identify wallets that copy successful traders, providing insights into trading patterns and behaviors. <br/><br/>
        <b style={{ color: '#00ff41' }}>[WHAT DOES IT DO?]</b><br/>
        - Detects copy trading patterns by analyzing transaction timing.<br/>
        - Identifies wallets that follow successful traders.<br/>
        - Provides detailed analytics on copy trading behaviors.<br/>
        - Exports results in CSV/JSON format for further analysis.<br/>
        - Integrates with the main wallet discovery system.<br/><br/>
        <b style={{ color: '#00ff41' }}>[COMING SOON]</b><br/>
        Advanced blockchain analysis capabilities are currently being enhanced. Check back soon for the full copy trader detection system.
      </div>
    </div>
  );
}

// Main App Layout Component
function MainAppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh', 
      background: '#000000', 
      fontFamily: '"Courier New", monospace',
      color: '#ffffff'
    }}>
      {/* Sidebar */}
      <div style={{ 
        width: 280, 
        background: '#000000', 
        borderRight: '1px solid #333333',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        height: '100vh',
        zIndex: 1000
      }}>
        {/* Header */}
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid #333333' 
        }}>
          <h1
            style={{ 
            margin: 0, 
            fontSize: 20,            
            color: '#cccccc',
            fontFamily: '"Courier New", monospace',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'color 0.2s',
            }}
            onClick={() => navigate('/')}
            onMouseOver={e => (e.currentTarget.style.color = '#33ff77')}
            onMouseLeave={e => (e.currentTarget.style.color = '#00ff41')}
            title="Go to Home"
          >
            CIPHER
          </h1>
          <p style={{ 
            margin: '4px 0 0 0', 
            fontSize: 12, 
            color: '#cccccc',
            fontFamily: '"Courier New", monospace'
          }}>
            [BLOCKCHAIN_INTELLIGENCE]
          </p>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '20px 0' }}>
          {[
            { path: '/dashboard', label: '> DASHBOARD', icon: '[MAIN]' },
            // { path: '/top-tokens', label: '> TOKENS', icon: '[TKN]' },
            // { path: '/discovery', label: '> DISCOVERY', icon: '[SCAN]' },
            { path: '/wallet-finder', label: '> WALLETS', icon: '[FIND]' },
            { path: '/copytrade-finder', label: '> COPYTRADE_FINDER', icon: '[COPY]' },
            { path: '/ml-processor', label: '> ML_PROCESSOR', icon: '[AI]' },
            // { path: '/settings', label: '> SETTINGS', icon: '[CFG]' },
          ].map((item) => {
            const isActive = location.pathname === item.path;
            return (
            <Link 
              key={item.path}
              to={item.path}
              style={{ 
                display: 'block',
                padding: '12px 20px',
                textDecoration: 'none',
                  color: isActive ? '#00ff41' : '#cccccc',
                fontSize: 14,
                fontFamily: '"Courier New", monospace',
                borderBottom: '1px solid #1a1a1a',
                  borderLeft: isActive ? '3px solid #00ff41' : 'none',
                  background: isActive ? 'rgba(0,255,65,0.07)' : 'transparent',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  fontWeight: isActive ? 700 : 400
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0, 255, 65, 0.1)';
                e.currentTarget.style.color = '#00ff41';
                e.currentTarget.style.borderLeft = '3px solid #00ff41';
                e.currentTarget.style.paddingLeft = '17px';
              }}
              onMouseLeave={e => {
                  if (!isActive) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#cccccc';
                e.currentTarget.style.borderLeft = 'none';
                  } else {
                    e.currentTarget.style.background = 'rgba(0,255,65,0.07)';
                    e.currentTarget.style.color = '#00ff41';
                    e.currentTarget.style.borderLeft = '3px solid #00ff41';
                  }
                e.currentTarget.style.paddingLeft = '20px';
              }}
            >
                <span style={{ color: isActive ? '#00ff41' : '#666666', marginRight: 8 }}>{item.icon}</span>
              {item.label}
            </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ 
          padding: '20px', 
          borderTop: '1px solid #333333',
          fontSize: 12,
          color: '#666666',
          fontFamily: '"Courier New", monospace'
        }}>
          <div>[STATUS: ONLINE]</div>
          <div>[SECURITY: MAX]</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        minHeight: '100vh', 
        minWidth: 0, 
        background: '#000000', 
        position: 'relative', 
        fontFamily: '"Courier New", monospace', 
        display: 'flex', 
        flexDirection: 'column', 
        boxSizing: 'border-box',
        marginLeft: 280
      }}>
        <div style={{ 
          position: 'relative', 
          zIndex: 1, 
          flex: 1, 
          width: '100%', 
          maxWidth: '100vw', 
          padding: '0 24px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'flex-start', 
          boxSizing: 'border-box' 
        }}>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/top-tokens" element={<TopTokensPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/discovery" element={<DiscoveryPage />} />
            <Route path="/wallet-finder" element={<WalletFinderPage />} />
            <Route path="/copytrade-finder" element={<CopytradeFinderPage />} />
            <Route path="/ml-processor" element={<MLProcessorPage />} />
            <Route path="/" element={<DashboardPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

// Main App Component
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={<MainAppLayout />} />
      </Routes>
    </Router>
  );
}

function MLProcessorPage() {
  return (
    <div style={{ marginTop: 32, maxWidth: 800, margin: '32px auto 0', padding: '0 24px', fontFamily: '"Courier New", monospace', color: '#fff' }}>
      <h1 style={{ color: '#cccccc', marginBottom: 16, fontSize: 24, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'inherit' }}>&gt; ML_PROCESSOR</h1>
      <p style={{ color: '#cccccc', marginBottom: 24, fontFamily: 'inherit', fontSize: 14 }}>[ARTIFICIAL_INTELLIGENCE_CORE]</p>
      <div style={{ color: '#cccccc', fontWeight: 600, fontSize: 16, marginTop: 32, fontFamily: 'inherit', marginBottom: 32 }}>[ML PROCESSOR MODULE]</div>
      <div style={{ color: '#cccccc', fontSize: 15, lineHeight: 1.7, background: 'rgba(0,255,65,0.04)', border: '1px solid #00ff41', borderRadius: 0, padding: 24, marginBottom: 32 }}>
        <b style={{ color: '#00ff41' }}>[WHAT IS THIS?]</b><br/>
        The ML Processor is the AI core of Cipher. It analyzes wallet and token data using machine learning algorithms to generate smart scores, risk scores, and predictive trading insights. <br/><br/>
        <b style={{ color: '#00ff41' }}>[WHAT DOES IT DO?]</b><br/>
        - Clusters wallets by trading behavior and performance.<br/>
        - Assigns "Smart Score" and "Risk Score" to each wallet.<br/>
        - Tags wallets with ML-generated labels.<br/>
        - Enables advanced filtering and ranking of traders.<br/>
        - Powers the AI-driven leaderboards and wallet discovery.<br/><br/>
        <b style={{ color: '#00ff41' }}>[COMING SOON]</b><br/>
        Future versions will include predictive analytics, anomaly detection, and recommendations.
      </div>
    </div>
  );
}

function TokenAddress({ address }: { address: string }) {
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
        fontSize: 13,
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
}

export default App;