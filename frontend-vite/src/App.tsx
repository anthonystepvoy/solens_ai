import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import solensLogo from '../assets/solens-logo-white.png';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/700.css';
import Hero3DBackground from './assets/Hero3DBackground';
import TopTokensSection from './components/TopTokensSection';

const drawerWidth = 220;

// WalletAddress component
function WalletAddress({ address, short = false }: { address: string, short?: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const display = short && address.length > 12 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address;
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <span
      style={{ cursor: 'pointer', userSelect: 'all', color: '#42a5f5', fontWeight: 500, position: 'relative' }}
      onClick={handleCopy}
      title="Click to copy"
    >
      {display}
      {copied && (
        <span style={{ marginLeft: 8, color: '#42a5f5', fontWeight: 600, fontSize: 14, background: '#232b3a', borderRadius: 4, padding: '2px 6px', position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)' }}>Copied!</span>
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

// Dashboard Page
function DashboardPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [metrics, setMetrics] = React.useState<any[]>([]);
  const [topWallets, setTopWallets] = React.useState<any[]>([]);
  const [onFireWallets, setOnFireWallets] = React.useState<any[]>([]);
  const [trendingTokens, setTrendingTokens] = React.useState<any[]>([]);
  const [mlTags, setMlTags] = React.useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = React.useState<string | null>(null);
  const [nextUpdate, setNextUpdate] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:8000/dashboard-summary')
      .then(res => {
        const d = res.data;
        setMetrics(d.metrics || []);
        setTopWallets(d.topWallets || []);
        setOnFireWallets(d.onFireWallets || []);
        setTrendingTokens(d.trendingTokens || []);
        setMlTags(d.mlTags || []);
        setLoading(false);
        if (d.lastUpdate) setLastUpdate(d.lastUpdate);
        if (d.lastUpdate) {
          const last = new Date(d.lastUpdate);
          const next = new Date(last.getTime() + 60 * 60 * 1000);
          const now = new Date();
          const diff = Math.max(0, next.getTime() - now.getTime());
          const min = Math.floor(diff / 60000);
          setNextUpdate(min > 0 ? `in ${min} min` : 'soon');
        } else {
          setNextUpdate(null);
        }
      })
      .catch(() => {
        // Fallback to mock data
        setMetrics([
          { label: 'Total Wallets Tracked', value: '1,452' },
          { label: 'New Wallets Today', value: '+56' },
          { label: 'Total PnL Tracked', value: '$1.2M' },
          { label: 'Most Profitable Token (24h)', value: '$WIF' },
        ]);
        setTopWallets([
          { address: '3AFgYGwEFZ27QGQzGGVL...', pnl: '120,000', winRate: '92%', smartScore: 98 },
          { address: '7iW5tkdAnR3LjoEkxqmF...', pnl: '110,000', winRate: '88%', smartScore: 95 },
          { address: '5hWMw6Krhc2Bf1e2SM3g...', pnl: '95,000', winRate: '85%', smartScore: 93 },
          { address: 'Qws8DG9HEPsgZB9AmCcw...', pnl: '80,000', winRate: '90%', smartScore: 91 },
          { address: 'Bbv4mbAAy4o71z1VogHs...', pnl: '75,000', winRate: '87%', smartScore: 90 },
        ]);
        setOnFireWallets([
          { address: '3AFgYGwEFZ27QGQzGGVL...', pnl: '12,000', trades: 14 },
          { address: '7iW5tkdAnR3LjoEkxqmF...', pnl: '11,000', trades: 12 },
          { address: '5hWMw6Krhc2Bf1e2SM3g...', pnl: '9,500', trades: 10 },
          { address: 'Qws8DG9HEPsgZB9AmCcw...', pnl: '8,000', trades: 9 },
          { address: 'Bbv4mbAAy4o71z1VogHs...', pnl: '7,500', trades: 8 },
        ]);
        setTrendingTokens([
          { token: '$WIF', volume: 120000 },
          { token: '$BONK', volume: 95000 },
          { token: '$SOL', volume: 87000 },
          { token: '$JUP', volume: 65000 },
          { token: '$DOG', volume: 54000 },
        ]);
        setMlTags(['Pro Trader', 'Meme Coin Sniper', 'High Volume', 'Long-Term Holder', 'Scalper']);
        setLoading(false);
        setError('Failed to load live dashboard data. Showing mock data.');
        setLastUpdate(null);
        setNextUpdate(null);
      });
  }, []);

  function getRelativeTime(iso: string | null) {
    if (!iso) return 'unknown';
    const now = new Date();
    const then = new Date(iso);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return then.toUTCString();
  }

  return (
    <div style={{ marginTop: 32, position: 'relative', maxWidth: 1200, margin: '32px auto 0', padding: '0 24px' }}>
      {/* Floating Info Bar */}
      <div style={{
        position: 'fixed',
        top: 24,
        right: 32,
        zIndex: 10,
        minWidth: 320,
        maxWidth: 420,
        background: '#26304a',
        color: '#e3f2fd',
        borderRadius: 8,
        border: '1px solid #3a4663',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontSize: 15,
        alignItems: 'flex-start',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <span style={{ color: '#42a5f5', marginRight: 8 }}>ℹ️</span>
          <span style={{ fontWeight: 600, color: '#b3e5fc', fontSize: 15 }}>Auto-updates every hour</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 14 }}>
          <span><b>Last update:</b> <span style={{ color: '#fff' }}>{getRelativeTime(lastUpdate)}</span> <span style={{ color: '#b0bec5', fontSize: 13, marginLeft: 6 }}>({lastUpdate ? new Date(lastUpdate).toUTCString() : 'unknown'})</span></span>
          <span><b>Next update:</b> <span style={{ color: '#fff' }}>{nextUpdate || 'unknown'}</span></span>
        </div>
      </div>

      <h1 style={{ color: '#fff', marginBottom: 24, fontSize: 32, fontWeight: 700 }}>Dashboard</h1>
      
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <div style={{ color: '#42a5f5', fontSize: 18 }}>Loading...</div>
        </div>
      ) : (
        <div>
          {error && <div style={{ color: '#f44336', marginBottom: 16 }}>{error}</div>}
          
          {/* Key Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
            {metrics.map((m, i) => (
              <div key={i} style={{ 
                background: '#181f2a', 
                color: '#fff', 
                borderRadius: 12, 
                padding: 24, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                border: '1px solid #232b3a'
              }}>
                <div style={{ fontWeight: 700, fontSize: 24, marginBottom: 8 }}>{m.value}</div>
                <div style={{ color: '#b0bec5', fontSize: 14 }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Leaderboards */}
            <div>
              <div style={{ 
                background: '#181f2a', 
                color: '#fff', 
                borderRadius: 12, 
                padding: 24, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                border: '1px solid #232b3a',
                marginBottom: 16
              }}>
                <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Top 5 Most Profitable Wallets (All Time)</h3>
                <table style={{ width: '100%', color: '#fff', fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #232b3a' }}>Wallet</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #232b3a' }}>PnL</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #232b3a' }}>Win Rate</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #232b3a' }}>Smart Score</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #232b3a' }}>Risk Score</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #232b3a' }}>ML Tags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topWallets.map((w, i) => (
                      <tr key={w.address || i}>
                        <td style={{ textAlign: 'left', padding: 8 }}><WalletAddress address={w.address} short /></td>
                        <td style={{ textAlign: 'right', padding: 8 }}>{w.pnl}</td>
                        <td style={{ textAlign: 'right', padding: 8 }}>{w.winRate}</td>
                        <td style={{ textAlign: 'right', padding: 8 }}>{w.smartScore}</td>
                        <td style={{ textAlign: 'right', padding: 8 }}>{getRiskLabel(w.riskScore ?? w.ai_insights?.risk_score)}</td>
                        <td style={{ textAlign: 'right', padding: 8 }}>{w.mlTags ?? (w.ai_insights?.tags_ml?.join(', ') ?? w.quality_tier ?? '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ 
                background: '#181f2a', 
                color: '#fff', 
                borderRadius: 12, 
                padding: 24, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                border: '1px solid #232b3a'
              }}>
                <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Top 5 "On Fire" Wallets (24h)</h3>
                <table style={{ width: '100%', color: '#fff', fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #232b3a' }}>Wallet</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #232b3a' }}>PnL (24h)</th>
                      <th style={{ textAlign: 'right', padding: 8, borderBottom: '1px solid #232b3a' }}>Trades</th>
                    </tr>
                  </thead>
                  <tbody>
                    {onFireWallets.map((w, i) => (
                      <tr key={i} style={{ cursor: 'pointer', transition: 'background 0.2s' }} 
                        onClick={() => {
                          navigator.clipboard.writeText(w.address);
                        }}
                        onMouseEnter={e => e.currentTarget.style.background='#232b3a'} 
                        onMouseLeave={e => e.currentTarget.style.background=''}
                      >
                        <td style={{ textAlign: 'left', padding: 8 }}>
                          <WalletAddress address={w.address} short />
                        </td>
                        <td style={{ textAlign: 'right', padding: 8 }}>{w.pnl}</td>
                        <td style={{ textAlign: 'right', padding: 8 }}>{w.trades}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Market Trends */}
            <div>
              <div style={{ 
                background: '#181f2a', 
                color: '#fff', 
                borderRadius: 12, 
                padding: 24, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                border: '1px solid #232b3a',
                marginBottom: 16
              }}>
                <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Trending Tokens by Volume</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: 8 }}>
                  {trendingTokens.map((t, i) => (
                    <div key={i} style={{ width: 36, textAlign: 'center' }}>
                      <div style={{ 
                        background: '#42a5f5', 
                        height: `${t.volume / 1500}px`, 
                        borderRadius: 4, 
                        marginBottom: 8, 
                        transition: 'height 0.3s' 
                      }} />
                      <div style={{ color: '#fff', fontSize: 12 }}>{t.token}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ 
                background: '#181f2a', 
                color: '#fff', 
                borderRadius: 12, 
                padding: 24, 
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                border: '1px solid #232b3a'
              }}>
                <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 600 }}>ML Tag Cloud</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {mlTags.map((tag, i) => (
                    <div key={i} style={{ 
                      background: '#26304a', 
                      color: '#42a5f5', 
                      padding: '4px 12px', 
                      borderRadius: 8, 
                      fontWeight: 600, 
                      fontSize: 14 
                    }}>{tag}</div>
                  ))}
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
  const [minLiquidity, setMinLiquidity] = React.useState(1000);
  const [minHolderCount, setMinHolderCount] = React.useState(10);
  const [minMarketCap, setMinMarketCap] = React.useState(3000);
  const [maxRugRatio, setMaxRugRatio] = React.useState(0.9);
  const [filters, setFilters] = React.useState({
    renounced: false,
    frozen: false,
    verified: true,
    audited: false,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:8000/settings')
      .then(res => {
        setMinLiquidity(res.data.minLiquidity);
        setMinHolderCount(res.data.minHolderCount);
        setMinMarketCap(res.data.minMarketCap);
        setMaxRugRatio(res.data.maxRugRatio);
        const filterArr = res.data.filters || [];
        setFilters({
          renounced: filterArr.includes('renounced'),
          frozen: filterArr.includes('frozen'),
          verified: filterArr.includes('verified'),
          audited: filterArr.includes('audited'),
        });
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load settings from backend.');
        setLoading(false);
      });
  }, []);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [event.target.name]: event.target.checked });
  };

  const handleSave = () => {
    setSuccess(false);
    setError(null);
    const selectedFilters = Object.keys(filters).filter(key => filters[key as keyof typeof filters]);
    axios.post('http://localhost:8000/settings', {
      minLiquidity,
      minHolderCount,
      minMarketCap,
      maxRugRatio,
      filters: selectedFilters,
    })
      .then(() => setSuccess(true))
      .catch(() => setError('Failed to save settings.'));
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 800, margin: '32px auto 0', padding: '0 24px' }}>
      <h1 style={{ color: '#fff', marginBottom: 16, fontSize: 32, fontWeight: 700 }}>Settings</h1>
      <p style={{ color: '#b0bec5', marginBottom: 24 }}>Configure your discovery thresholds and filters here.</p>
      
      {loading ? (
        <div style={{ color: '#b0bec5' }}>Loading...</div>
      ) : error ? (
        <div style={{ color: '#f44336' }}>{error}</div>
      ) : (
        <div style={{ maxWidth: 400 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8 }}>Min Liquidity</label>
            <input
              type="number"
              value={minLiquidity}
              onChange={e => setMinLiquidity(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #232b3a',
                background: '#181f2a',
                color: '#fff',
                fontSize: 16
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8 }}>Min Holder Count</label>
            <input
              type="number"
              value={minHolderCount}
              onChange={e => setMinHolderCount(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #232b3a',
                background: '#181f2a',
                color: '#fff',
                fontSize: 16
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8 }}>Min Market Cap</label>
            <input
              type="number"
              value={minMarketCap}
              onChange={e => setMinMarketCap(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 8,
                border: '1px solid #232b3a',
                background: '#181f2a',
                color: '#fff',
                fontSize: 16
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 8 }}>Max Rug Ratio: {maxRugRatio}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={maxRugRatio}
              onChange={e => setMaxRugRatio(Number(e.target.value))}
              style={{
                width: '100%',
                height: 8,
                borderRadius: 4,
                background: '#232b3a',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#fff', marginBottom: 12 }}>Filters:</label>
            {Object.keys(filters).map((key) => (
              <div key={key} style={{ marginBottom: 8 }}>
                <label style={{ display: 'flex', alignItems: 'center', color: '#fff', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filters[key as keyof typeof filters]}
                    onChange={handleFilterChange}
                    name={key}
                    style={{ marginRight: 8 }}
                  />
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </label>
              </div>
            ))}
          </div>

          <button
            onClick={handleSave}
            style={{
              background: '#42a5f5',
              color: '#fff',
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1976d2'}
            onMouseLeave={e => e.currentTarget.style.background = '#42a5f5'}
          >
            Save
          </button>

          {success && <div style={{ color: '#4caf50', marginTop: 16 }}>Settings saved!</div>}
        </div>
      )}
    </div>
  );
}

// Discovery Page
function DiscoveryPage() {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleRunDiscovery = () => {
    setLoading(true);
    setStatus(null);
    setError(null);
    axios.post('http://localhost:8000/run-discovery')
      .then(res => {
        const out = res.data.stdout || '';
        let coins = 0;
        let wallets = 0;
        const coinMatch = out.match(/Found (\d+) new good quality coins to process\./i);
        if (coinMatch) coins = parseInt(coinMatch[1]);
        const walletMatches = [...out.matchAll(/DEBUG: Found (\d+) unique, profitable traders for /gi)];
        wallets = walletMatches.reduce((sum, m) => sum + (parseInt(m[1]) || 0), 0);
        let msg = '';
        if (coins === 0 && wallets === 0) {
          msg = 'No new coins or wallets found. Try again later!';
        } else {
          msg = `Discovery complete: ${coins} new coin${coins !== 1 ? 's' : ''}, ${wallets} new wallet${wallets !== 1 ? 's' : ''} found!`;
        }
        setStatus(msg);
        setLoading(false);
      })
      .catch(() => {
        setError('Something went wrong. Please try again later.');
        setLoading(false);
      });
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 800, margin: '32px auto 0', padding: '0 24px' }}>
      <h1 style={{ color: '#fff', marginBottom: 16, fontSize: 32, fontWeight: 700 }}>Discovery</h1>
      <p style={{ color: '#b0bec5', marginBottom: 24 }}>Find new tokens and wallets automatically. Click below to run discovery.</p>
      
      <button
        onClick={handleRunDiscovery}
        disabled={loading}
        style={{
          background: loading ? '#666' : '#42a5f5',
          color: '#fff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
          marginBottom: 24
        }}
      >
        {loading ? 'Running...' : 'Run Discovery'}
      </button>

      {loading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#fff', marginBottom: 8 }}>Running discovery...</div>
          <div style={{ 
            width: '100%', 
            height: 8, 
            background: '#232b3a', 
            borderRadius: 4, 
            overflow: 'hidden' 
          }}>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: '#42a5f5', 
              animation: 'pulse 2s infinite' 
            }} />
          </div>
        </div>
      )}

      {error && <div style={{ color: '#f44336', marginBottom: 16 }}>{error}</div>}
      
      {status && !loading && (
        <div style={{ 
          marginBottom: 16, 
          padding: 16, 
          background: '#232b3a', 
          color: '#fff', 
          borderRadius: 8, 
          fontWeight: 600, 
          fontSize: 16, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)' 
        }}>
          {status}
        </div>
      )}
    </div>
  );
}

// Top Tokens Page
function TopTokensPage() {
  return (
    <div style={{ marginTop: 32, maxWidth: 1200, margin: '32px auto 0', padding: '0 24px' }}>
      <h1 style={{ color: '#fff', marginBottom: 24, fontSize: 32, fontWeight: 700 }}>Top Tokens</h1>
      <TopTokensSection />
    </div>
  );
}

function AnalyticsPage() {
  const [tokens, setTokens] = React.useState<any[]>([]);
  const [wallets, setWallets] = React.useState<any[]>([]);
  const [traders, setTraders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('http://localhost:8000/tokens'),
      axios.get('http://localhost:8000/wallets'),
      axios.get('http://localhost:8000/traders'),
    ])
      .then(([tokensRes, walletsRes, tradersRes]) => {
        setTokens(tokensRes.data);
        setWallets(walletsRes.data);
        setTraders(tradersRes.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load analytics data.');
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ marginTop: 32, maxWidth: 1200, margin: '32px auto 0', padding: '0 24px', color: '#fff' }}>
      <h1>Analytics</h1>
      <p>View tokens, traders, and wallet analytics here.</p>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: '#f44336' }}>{error}</div>
      ) : (
        <>
          <div style={{ marginTop: 32 }}>
            <h2>Tokens</h2>
            <table style={{ width: '100%', color: '#fff', fontSize: 15, marginBottom: 32 }}>
              <thead>
                <tr>
                  <th>Address</th>
                  <th>Symbol</th>
                  <th>Liquidity</th>
                  <th>Holders</th>
                  <th>Market Cap</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t: any, i: number) => (
                  <tr key={i}>
                    <td><WalletAddress address={t.address || t.id} short /></td>
                    <td>{t.symbol}</td>
                    <td>{t.liquidity}</td>
                    <td>{t.holder_count}</td>
                    <td>{t.market_cap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 32 }}>
            <h2>Wallets</h2>
            <table style={{ width: '100%', color: '#fff', fontSize: 15, marginBottom: 32 }}>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>PnL (SOL)</th>
                  <th>Win Rate</th>
                  <th>Trades</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w: any, i: number) => (
                  <tr key={i}>
                    <td><WalletAddress address={w.id} short /></td>
                    <td>{w.on_chain_data?.pnl_sol ?? ''}</td>
                    <td>{w.on_chain_data?.win_rate ?? ''}</td>
                    <td>{w.on_chain_data?.total_trades ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 32 }}>
            <h2>Traders</h2>
            <table style={{ width: '100%', color: '#fff', fontSize: 15 }}>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Smart Score</th>
                  <th>Tokens (7d)</th>
                  <th>PnL (7d)</th>
                </tr>
              </thead>
              <tbody>
                {traders.map((t: any, i: number) => (
                  <tr key={i}>
                    <td><WalletAddress address={t.wallet_address} short /></td>
                    <td>{t.copy_trading_score}</td>
                    <td>{t.token_num_7d}</td>
                    <td>{t.pnl_sol_7d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function WalletFinderPage() {
  const [wallets, setWallets] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [progressStep, setProgressStep] = React.useState<number>(0);
  const progressSteps = [
    'Running Discovery...',
    'Running On-Chain Analyzer...',
    'Running ML Processor...',
    'Refreshing wallet data...'
  ];

  const fetchWallets = () => {
    setLoading(true);
    axios.get('http://localhost:8000/wallets')
      .then(res => {
        setWallets(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load wallets.');
        setLoading(false);
      });
  };

  React.useEffect(() => {
    fetchWallets();
  }, []);

  const runAllAnalyzers = async () => {
    setProgressStep(0);
    setProgress(progressSteps[0]);
    setError(null);
    try {
      await axios.post('http://localhost:8000/run-discovery');
      setProgressStep(1);
      setProgress(progressSteps[1]);
      await axios.post('http://localhost:8000/run-onchain-analysis');
      setProgressStep(2);
      setProgress(progressSteps[2]);
      await axios.post('http://localhost:8000/ml-process');
      setProgressStep(3);
      setProgress(progressSteps[3]);
      await new Promise(res => setTimeout(res, 800)); // brief pause for backend to update
      fetchWallets();
      setProgressStep(0);
      setProgress(null);
    } catch (e) {
      setError('Failed to run all analyzers.');
      setProgressStep(0);
      setProgress(null);
    }
  };

  // Filtering and sorting
  const filteredWallets = wallets.filter(w =>
    w.id?.toLowerCase().includes(search.toLowerCase())
  );
  const score = (w: any) => {
    const pnl = typeof w?.on_chain_data?.pnl_sol === 'number' ? w.on_chain_data.pnl_sol : 0;
    const trades = typeof w?.on_chain_data?.total_trades === 'number' ? w.on_chain_data.total_trades : 0;
    return pnl * Math.log2(1 + trades);
  };
  const validWallets = (filteredWallets || []).filter(w => {
    const trades = typeof w?.on_chain_data?.total_trades === 'number' ? w.on_chain_data.total_trades : 0;
    const pnl = typeof w?.on_chain_data?.pnl_sol === 'number';
    return trades >= 2 && pnl;
  });
  const sortedWallets = [...validWallets].sort((a, b) => score(b) - score(a));

  return (
    <div style={{ marginTop: 32, maxWidth: 1200, margin: '32px auto 0', padding: '0 24px', color: '#fff' }}>
      <h1>Wallet Finder</h1>
      <p>Search and explore wallets. Click a row to view details.</p>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Search by Wallet Address"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #232b3a', background: '#181f2a', color: '#fff', fontSize: 16 }}
        />
        <button
          onClick={runAllAnalyzers}
          disabled={!!progress}
          style={{ background: '#e040fb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', fontWeight: 700, fontSize: 16, cursor: !!progress ? 'not-allowed' : 'pointer' }}
        >
          RUN ALL ANALYZERS
        </button>
      </div>
      {progress && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#fff', marginBottom: 8 }}>{progress}</div>
          <div style={{ width: '100%', height: 8, background: '#232b3a', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: '#42a5f5', 
              animation: 'pulse 2s infinite' 
            }} />
          </div>
        </div>
      )}
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div style={{ color: '#f44336' }}>{error}</div>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: 600 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181f2a', color: '#fff', fontSize: 15 }}>
            <thead>
              <tr>
                <th style={{ padding: 8, textAlign: 'left' }}>Wallet</th>
                <th>PnL (SOL)</th>
                <th>Win Rate</th>
                <th>Trades</th>
                <th>Smart Score</th>
                <th>Risk Score</th>
                <th>ML Tags</th>
              </tr>
            </thead>
            <tbody>
              {sortedWallets.map((w, i) => (
                <tr key={w.id || i} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setSelected(w)} onMouseOver={e => e.currentTarget.style.background='#232b3e'} onMouseLeave={e => e.currentTarget.style.background=''}>
                  <td style={{ padding: 8 }}><WalletAddress address={w.id} short /></td>
                  <td>{typeof w?.on_chain_data?.pnl_sol === 'number' ? w.on_chain_data.pnl_sol.toFixed(2) : ''}</td>
                  <td>{typeof w?.on_chain_data?.win_rate === 'number' ? w.on_chain_data.win_rate.toFixed(2) : ''}</td>
                  <td>{typeof w?.on_chain_data?.total_trades === 'number' ? w.on_chain_data.total_trades : ''}</td>
                  <td>{typeof w?.ai_insights?.overall_smart_score === 'number' ? w.ai_insights.overall_smart_score.toFixed(2) : ''}</td>
                  <td>{typeof w?.ai_insights?.risk_score === 'number' ? w.ai_insights.risk_score.toFixed(2) : ''}</td>
                  <td>{w?.ai_insights?.tags_ml ? w.ai_insights.tags_ml.join(', ') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <div style={{ marginTop: 32, background: '#232b3a', borderRadius: 8, padding: 24 }}>
          <h2>Wallet: {selected.id}</h2>
          <p>PnL (SOL): {selected.on_chain_data?.pnl_sol}</p>
          <p>Win Rate: {selected.on_chain_data?.win_rate}</p>
          <p>Total Trades: {selected.on_chain_data?.total_trades}</p>
          <p>Smart Score: {selected.ai_insights?.overall_smart_score}</p>
          <p>Risk Score: {selected.ai_insights?.risk_score}</p>
          <p>ML Tags: {selected.ai_insights?.tags_ml?.join(', ')}</p>
          <button onClick={() => setSelected(null)} style={{ marginTop: 16, background: '#42a5f5', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>Close</button>
        </div>
      )}
    </div>
  );
}

function CopytradeFinderPage() {
  const [address, setAddress] = React.useState('');
  const [results, setResults] = React.useState<any[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stderr, setStderr] = React.useState<string | null>(null);
  const [stdout, setStdout] = React.useState<string | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);

  const handleAnalyze = () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setStderr(null);
    setStdout(null);
    setParseError(null);
    fetch('http://localhost:8000/copytrade-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: address })
    })
      .then(res => res.json())
      .then(data => {
        if (data.results) {
          setResults(data.results);
        } else if (data.raw) {
          setError('Analysis completed, but could not parse results.');
          setStdout(data.raw);
          setStderr(data.stderr || null);
          setParseError(data.parse_error || null);
        } else if (data.stderr || data.stdout || data.returncode !== undefined) {
          let msg = '';
          if (data.stderr) msg += `Stderr:\n${data.stderr}\n`;
          if (data.stdout) msg += `Stdout:\n${data.stdout}\n`;
          if (data.returncode !== undefined) msg += `Return code: ${data.returncode}\n`;
          setError(msg.trim() || 'Backend error.');
          setStderr(data.stderr || null);
          setStdout(data.stdout || null);
        } else if (data.error) {
          setError(data.error);
        } else if (data.parse_error) {
          setError('Parse Error: ' + data.parse_error);
        } else {
          setError('Unknown error.\nRaw response:\n' + JSON.stringify(data, null, 2));
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to run copytrade analysis.');
        setLoading(false);
      });
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 1200, margin: '32px auto 0', padding: '0 24px', color: '#fff' }}>
      <h1>Copytrade Finder</h1>
      <p>Analyze a wallet to find copy traders here.</p>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Wallet Address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #232b3a', background: '#181f2a', color: '#fff', fontSize: 16 }}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !address}
          style={{ background: '#42a5f5', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', fontWeight: 700, fontSize: 16, cursor: loading || !address ? 'not-allowed' : 'pointer' }}
        >
          Analyze
        </button>
      </div>
      {loading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#fff', marginBottom: 8 }}>Running analysis...</div>
          <div style={{ width: '100%', height: 8, background: '#232b3a', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', background: '#42a5f5', animation: 'pulse 2s infinite' }} />
          </div>
        </div>
      )}
      {error && <div style={{ color: '#f44336', marginBottom: 16, whiteSpace: 'pre-wrap' }}>{error}</div>}
      {parseError && <div style={{ color: '#f44336', marginBottom: 16, whiteSpace: 'pre-wrap' }}>Parse Error: {parseError}</div>}
      {stderr && <div style={{ marginBottom: 16 }}><div style={{ color: '#f44336' }}>Stderr:</div><pre style={{ background: '#222', color: '#f44336', padding: 12, borderRadius: 6, overflowX: 'auto' }}>{stderr}</pre></div>}
      {stdout && <div style={{ marginBottom: 16 }}><div style={{ color: '#42a5f5' }}>Stdout:</div><pre style={{ background: '#222', color: '#90caf9', padding: 12, borderRadius: 6, overflowX: 'auto' }}>{stdout}</pre></div>}
      {results && (
        <div style={{ marginTop: 32 }}>
          <h2>Copytrade Analysis Results</h2>
          {results.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181f2a', color: '#fff', fontSize: 15 }}>
                <thead>
                  <tr>
                    {Object.keys(results[0]).map((key) => (
                      <th key={key} style={{ border: '1px solid #333', padding: 8, background: '#181f2a', color: '#fff' }}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i}>
                      {Object.keys(results[0]).map((key) => (
                        <td key={key} style={{ border: '1px solid #333', padding: 8, color: '#fff' }}>{(row[key] === undefined || row[key] === null || String(row[key]).toLowerCase() === 'nan') ? 'N/A' : row[key]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ marginTop: 16, color: '#b0bec5' }}>No copytraders detected for this wallet in the scanned blocks.</div>
          )}
        </div>
      )}
    </div>
  );
}

function OnChainAnalyzerPage() {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<number>(0);
  const [currentWallet, setCurrentWallet] = React.useState<string | null>(null);
  const [totalWallets, setTotalWallets] = React.useState<number | null>(null);
  const [jobStatus, setJobStatus] = React.useState<string | null>(null);
  const [intervalId, setIntervalId] = React.useState<any>(null);

  // Poll job status
  React.useEffect(() => {
    let poller: any;
    if (loading) {
      poller = setInterval(() => {
        axios.get('http://localhost:8000/job-status/onchain-analyzer')
          .then(res => {
            const d = res.data;
            setProgress(d.percent || 0);
            setCurrentWallet(d.current_wallet || null);
            setTotalWallets(d.total_wallets || null);
            setJobStatus(d.status || null);
            if (d.status === 'complete' || (d.percent === 100)) {
              setLoading(false);
              setStatus('Analysis complete!');
              clearInterval(poller);
            } else if (d.status && d.status.startsWith('error')) {
              setLoading(false);
              setError(d.status);
              clearInterval(poller);
            }
          })
          .catch(() => {});
      }, 2000);
      setIntervalId(poller);
    }
    return () => { if (poller) clearInterval(poller); };
  }, [loading]);

  const handleRunOnChain = () => {
    setLoading(true);
    setStatus(null);
    setError(null);
    setStep(null);
    setProgress(0);
    setCurrentWallet(null);
    setTotalWallets(null);
    setJobStatus('running');
    axios.post('http://localhost:8000/run-onchain-analysis')
      .then(res => {
        // The polling will handle status updates
      })
      .catch(() => {
        setError('Something went wrong. Please try again later.');
        setLoading(false);
      });
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 800, margin: '32px auto 0', padding: '0 24px', color: '#fff' }}>
      <h1>On-Chain Analyzer</h1>
      <p>Run on-chain analysis for all wallets and update their analytics.</p>
      <button
        onClick={handleRunOnChain}
        disabled={loading}
        style={{ background: loading ? '#666' : '#42a5f5', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 24 }}
      >
        {loading ? 'Running...' : 'Run On-Chain Analyzer'}
      </button>
      {loading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#fff', marginBottom: 8 }}>
            {jobStatus === 'running' || (progress > 0 && progress < 100)
              ? `Analyzing wallets... (${progress}%${totalWallets ? `, ${totalWallets} total` : ''})`
              : jobStatus}
          </div>
          <div style={{ width: '100%', height: 12, background: '#232b3a', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#42a5f5', transition: 'width 0.3s' }} />
          </div>
          {currentWallet && (
            <div style={{ color: '#b0bec5', fontSize: 15 }}>
              <span>Current wallet: </span>
              <WalletAddress address={currentWallet} short />
            </div>
          )}
        </div>
      )}
      {error && <div style={{ color: '#f44336', marginBottom: 16 }}>{error}</div>}
      {status && !loading && (
        <div style={{ marginBottom: 16, padding: 16, background: '#232b3a', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>{status}</div>
      )}
    </div>
  );
}

function MLProcessorPage() {
  const [loading, setLoading] = React.useState(false);
  const [stdout, setStdout] = React.useState('');
  const [stderr, setStderr] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<any>(null);

  const handleRunML = () => {
    setLoading(true);
    setStdout('');
    setStderr('');
    setError(null);
    setResult(null);
    fetch('http://localhost:8000/ml-process', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setStdout(data.stdout);
        setStderr(data.stderr);
        setResult(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to run ML Processor.');
        setLoading(false);
      });
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 800, margin: '32px auto 0', padding: '0 24px', color: '#fff' }}>
      <h1>ML Processor</h1>
      <p>Run ML analysis and view smart scores here.</p>
      <button
        onClick={handleRunML}
        disabled={loading}
        style={{ background: loading ? '#666' : '#42a5f5', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', fontWeight: 700, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 24 }}
      >
        {loading ? 'Running...' : 'Run ML Processor'}
      </button>
      {error && <div style={{ color: '#f44336', marginBottom: 16 }}>{error}</div>}
      {stdout && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: '#42a5f5' }}>Stdout:</div>
          <pre style={{ background: '#222', color: '#90caf9', padding: 12, borderRadius: 6, overflowX: 'auto' }}>{stdout}</pre>
        </div>
      )}
      {stderr && (
        <div style={{ marginTop: 16 }}>
          <div style={{ color: '#f44336' }}>Stderr:</div>
          <pre style={{ background: '#222', color: '#f44336', padding: 12, borderRadius: 6, overflowX: 'auto' }}>{stderr}</pre>
        </div>
      )}
    </div>
  );
}

// Landing Page
function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'radial-gradient(ellipse at 60% 40%, #101a2b 0%, #0a1220 60%, #050a18 100%)',
      fontFamily: '"DM Sans", sans-serif',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Animation */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 60% 40%, #101a2b 0%, #0a1220 60%, #050a18 100%)',
        zIndex: 0
      }} />
      
      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '24px 48px',
        maxWidth: 1400,
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={solensLogo} alt="Solens" style={{ height: 40 }} />
          <span style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>Solens AI</span>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: '#42a5f5',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#1976d2'}
          onMouseLeave={e => e.currentTarget.style.background = '#42a5f5'}
        >
          Launch App
        </button>
      </header>

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        padding: '120px 24px 80px',
        maxWidth: 1200,
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 72px)',
          fontWeight: 700,
          marginBottom: 24,
          background: 'linear-gradient(135deg, #42a5f5 0%, #e040fb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          AI-Powered Wallet Discovery
        </h1>
        <p style={{
          fontSize: 'clamp(18px, 4vw, 24px)',
          color: '#b0bec5',
          marginBottom: 48,
          maxWidth: 800,
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: 1.6
        }}>
          Discover profitable wallets, analyze trading patterns, and find the best copy trading opportunities on Solana
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
              color: '#fff',
              border: 'none',
              padding: '16px 32px',
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: '0 8px 32px rgba(66, 165, 245, 0.3)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(66, 165, 245, 0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(66, 165, 245, 0.3)';
            }}
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/wallet-finder')}
            style={{
              background: 'transparent',
              color: '#42a5f5',
              border: '2px solid #42a5f5',
              padding: '16px 32px',
              borderRadius: 12,
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.2s, color 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#42a5f5';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#42a5f5';
            }}
          >
            Explore Wallets
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        position: 'relative',
        zIndex: 10,
        padding: '80px 24px',
        maxWidth: 1200,
        margin: '0 auto'
      }}>
        <h2 style={{
          fontSize: 48,
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: 64,
          color: '#fff'
        }}>
          Powerful Features
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 32
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 32,
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: '#fff' }}>Smart Discovery</h3>
            <p style={{ color: '#b0bec5', lineHeight: 1.6 }}>
              Automatically discover new tokens and profitable wallets using advanced algorithms
            </p>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 32,
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
            <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: '#fff' }}>On-Chain Analytics</h3>
            <p style={{ color: '#b0bec5', lineHeight: 1.6 }}>
              Deep analysis of wallet performance, PnL, win rates, and trading patterns
            </p>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 32,
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
            <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: '#fff' }}>AI Insights</h3>
            <p style={{ color: '#b0bec5', lineHeight: 1.6 }}>
              Machine learning powered smart scores and risk assessment for every wallet
            </p>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 32,
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
            <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: '#fff' }}>Copy Trading</h3>
            <p style={{ color: '#b0bec5', lineHeight: 1.6 }}>
              Find the best copy trading opportunities and track successful traders
            </p>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 32,
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
            <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: '#fff' }}>Real-Time Data</h3>
            <p style={{ color: '#b0bec5', lineHeight: 1.6 }}>
              Live updates on token prices, wallet performance, and market trends
            </p>
          </div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            padding: 32,
            borderRadius: 16,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <h3 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: '#fff' }}>Advanced Filtering</h3>
            <p style={{ color: '#b0bec5', lineHeight: 1.6 }}>
              Filter wallets by performance metrics, risk levels, and trading strategies
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        padding: '48px 24px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        color: '#b0bec5'
      }}>
        <p>&copy; 2024 Solens AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

// Main App Layout
function MainAppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Top Tokens', path: '/top-tokens', icon: '⭐' },
    { label: 'Settings', path: '/settings', icon: '⚙️' },
    { label: 'Discovery', path: '/discovery', icon: '🔍' },
    { label: 'Analytics', path: '/analytics', icon: '📈' },
    { label: 'Wallet Finder', path: '/wallet-finder', icon: '👛' },
    { label: 'Copytrade Finder', path: '/copytrade-finder', icon: '🤖' },
    { label: 'On-Chain Analyzer', path: '/onchain-analyzer', icon: '🔗' },
    { label: 'ML Processor', path: '/ml-processor', icon: '🧠' },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      fontFamily: '"DM Sans", sans-serif', 
      minHeight: '100vh', 
      minWidth: '100vw', 
      height: '100vh', 
      width: '100vw', 
      boxSizing: 'border-box' 
    }}>
      {/* Sidebar */}
      <div style={{
        width: drawerWidth,
        background: 'radial-gradient(ellipse at 60% 40%, #101a2b 0%, #0a1220 60%, #050a18 100%)',
        color: '#fff',
        borderRight: 'none',
        padding: 0,
        fontFamily: '"DM Sans", sans-serif',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          padding: '24px 16px', 
          marginBottom: 16 
        }}>
          <img 
            src={solensLogo} 
            alt="Solens Logo" 
            style={{ height: 48, marginBottom: 8, cursor: 'pointer' }} 
            onClick={() => navigate('/dashboard')} 
          />
          <div style={{ 
            color: '#b0bec5', 
            fontWeight: 500, 
            fontSize: 14, 
            letterSpacing: 1, 
            fontFamily: '"DM Sans", sans-serif', 
            marginTop: 8, 
            textAlign: 'center' 
          }}>
            AI Powered Wallet Finder
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <div key={item.label}>
                <Link
                  to={item.path}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    color: isActive ? '#42a5f5' : '#fff',
                    textDecoration: 'none',
                    background: isActive ? 'rgba(33, 150, 243, 0.15)' : 'none',
                    fontWeight: isActive ? 700 : 400,
                    transition: 'background 0.2s, color 0.2s',
                    fontFamily: '"DM Sans", sans-serif',
                    fontSize: 16
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(33, 150, 243, 0.10)'}
                  onMouseLeave={e => e.currentTarget.style.background = isActive ? 'rgba(33, 150, 243, 0.15)' : 'none'}
                >
                  <span style={{ marginRight: 12, fontSize: 20 }}>{item.icon}</span>
                  {item.label}
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        minHeight: '100vh', 
        minWidth: 0, 
        background: 'radial-gradient(ellipse at 60% 40%, #101a2b 0%, #0a1220 60%, #050a18 100%)', 
        position: 'relative', 
        fontFamily: '"DM Sans", sans-serif', 
        display: 'flex', 
        flexDirection: 'column', 
        boxSizing: 'border-box' 
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: 'radial-gradient(ellipse at 60% 40%, #101a2b 0%, #0a1220 60%, #050a18 100%)',
          pointerEvents: 'none',
        }} />
        
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
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/top-tokens" element={<TopTokensPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/discovery" element={<DiscoveryPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/wallet-finder" element={<WalletFinderPage />} />
            <Route path="/copytrade-finder" element={<CopytradeFinderPage />} />
            <Route path="/onchain-analyzer" element={<OnChainAnalyzerPage />} />
            <Route path="/ml-processor" element={<MLProcessorPage />} />
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

export default App;
