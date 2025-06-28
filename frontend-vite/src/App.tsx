import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import solensLogo from '../assets/solens-logo-white.png';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/700.css';
import Hero3DBackground from './assets/Hero3DBackground';
import TopTokensSection from './components/TopTokensSection';
import LandingPage from './components/LandingPage';

const drawerWidth = 280;

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
      style={{ 
        cursor: 'pointer', 
        userSelect: 'all', 
        color: '#00ff41', 
        fontWeight: 600, 
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
          { label: 'TOTAL_WALLETS_TRACKED', value: '1,452' },
          { label: 'NEW_WALLETS_TODAY', value: '+56' },
          { label: 'TOTAL_PNL_TRACKED', value: '$1.2M' },
          { label: 'TOP_TOKEN_24H', value: '$WIF' },
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
        setMlTags(['PRO_TRADER', 'MEME_SNIPER', 'HIGH_VOLUME', 'LONG_TERM', 'SCALPER']);
        setLoading(false);
        setError('[WARNING] Failed to load live data. Displaying mock dataset.');
        setLastUpdate(null);
        setNextUpdate(null);
      });
  }, []);

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

  return (
    <div style={{ marginTop: 32, position: 'relative', maxWidth: 1200, margin: '32px auto 0', padding: '0 24px', fontFamily: '"Courier New", monospace' }}>
      {/* Status Info Bar */}
      <div style={{
        position: 'fixed',
        top: 24,
        right: 32,
        zIndex: 10,
        minWidth: 320,
        maxWidth: 420,
        background: 'rgba(0, 0, 0, 0.9)',
        color: '#ffffff',
        borderRadius: 0,
        border: '1px solid #333333',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontSize: 12,
        alignItems: 'flex-start',
        fontFamily: '"Courier New", monospace'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          <span style={{ color: '#00ff41', marginRight: 8 }}>[SYS]</span>
          <span style={{ fontWeight: 600, color: '#ffffff', fontSize: 14 }}>AUTO_UPDATE_ACTIVE</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
          <span><span style={{ color: '#cccccc' }}>LAST_UPDATE:</span> <span style={{ color: '#00ff41' }}>{getRelativeTime(lastUpdate)}</span></span>
          <span><span style={{ color: '#cccccc' }}>NEXT_UPDATE:</span> <span style={{ color: '#00ff41' }}>{nextUpdate || 'UNKNOWN'}</span></span>
        </div>
      </div>

      <h1 style={{ 
        color: '#ffffff', 
        marginBottom: 24, 
        fontSize: 24, 
        fontWeight: 700, 
        fontFamily: '"Courier New", monospace',
        letterSpacing: '2px',
        textTransform: 'uppercase'
      }}>&gt; MAIN_DASHBOARD</h1>
      
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <div style={{ 
            color: '#00ff41', 
            fontSize: 16,
            fontFamily: '"Courier New", monospace'
          }}>[LOADING_DATA...]</div>
        </div>
      ) : (
        <div>
          {error && <div style={{ 
            color: '#ff6b6b', 
            marginBottom: 16,
            fontFamily: '"Courier New", monospace',
            fontSize: 14,
            padding: 12,
            border: '1px solid #ff6b6b',
            background: 'rgba(255, 107, 107, 0.1)'
          }}>{error}</div>}
          
          {/* Key Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
            {metrics.map((m, i) => (
              <div key={i} style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                color: '#ffffff', 
                borderRadius: 0, 
                padding: 24, 
                border: '1px solid #333333',
                fontFamily: '"Courier New", monospace',
                transition: 'border-color 0.3s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = '#00ff41'}
              onMouseLeave={e => e.currentTarget.style.borderColor = '#333333'}
              >
                <div style={{ fontWeight: 700, fontSize: 20, marginBottom: 8, color: '#00ff41' }}>{m.value}</div>
                <div style={{ color: '#cccccc', fontSize: 12, letterSpacing: '1px' }}>[{m.label}]</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Top Wallets */}
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
                  letterSpacing: '1px'
                }}>[TOP_PROFITABLE_WALLETS]</h3>
                    {topWallets.map((w, i) => (
                  <div key={i} style={{ 
                    padding: '12px 0', 
                    borderBottom: i < topWallets.length - 1 ? '1px solid #333333' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 14, marginBottom: 4 }}>
                        <WalletAddress address={w.address} short={true} />
                      </div>
                      <div style={{ fontSize: 12, color: '#cccccc' }}>
                        SCORE: <span style={{ color: '#00ff41' }}>{w.smartScore}</span> | 
                        WIN_RATE: <span style={{ color: '#00ff41' }}>{w.winRate}</span>
                      </div>
                    </div>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 700, 
                      color: '#00ff41',
                      textAlign: 'right'
                    }}>
                      ${w.pnl}
                    </div>
                  </div>
                ))}
              </div>

              {/* Trending Tokens */}
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
                  letterSpacing: '1px'
                }}>[TRENDING_TOKENS]</h3>
                {trendingTokens.map((t, i) => (
                  <div key={i} style={{ 
                    padding: '8px 0', 
                    borderBottom: i < trendingTokens.length - 1 ? '1px solid #333333' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{t.token}</div>
                    <div style={{ fontSize: 12, color: '#00ff41' }}>VOL: ${t.volume.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* On Fire Wallets & ML Tags */}
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
                  letterSpacing: '1px'
                }}>[HOT_WALLETS_24H]</h3>
                {onFireWallets.map((w, i) => (
                  <div key={i} style={{ 
                    padding: '12px 0', 
                    borderBottom: i < onFireWallets.length - 1 ? '1px solid #333333' : 'none',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: 14, marginBottom: 4 }}>
                        <WalletAddress address={w.address} short={true} />
                      </div>
                      <div style={{ fontSize: 12, color: '#cccccc' }}>
                        TRADES: <span style={{ color: '#00ff41' }}>{w.trades}</span>
                      </div>
                    </div>
                      <div style={{ 
                      fontSize: 14, 
                      fontWeight: 700, 
                      color: '#00ff41',
                      textAlign: 'right'
                    }}>
                      ${w.pnl}
                    </div>
                    </div>
                  ))}
              </div>

              {/* ML Tags */}
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
                  letterSpacing: '1px'
                }}>[ML_CATEGORIES]</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {mlTags.map((tag, i) => (
                    <span key={i} style={{ 
                      background: 'rgba(0, 255, 65, 0.1)', 
                      color: '#00ff41', 
                      padding: '6px 12px', 
                      fontSize: 12,
                      border: '1px solid #00ff41',
                      letterSpacing: '1px'
                    }}>
                      {tag}
                    </span>
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
    <div style={{ marginTop: 32, maxWidth: 800, margin: '32px auto 0', padding: '0 24px', fontFamily: '"Courier New", monospace' }}>
      <h1 style={{ 
        color: '#ffffff', 
        marginBottom: 16, 
        fontSize: 24, 
        fontWeight: 700,
        fontFamily: '"Courier New", monospace',
        letterSpacing: '2px',
        textTransform: 'uppercase'
      }}>&gt; SYSTEM_CONFIG</h1>
      <p style={{ color: '#cccccc', marginBottom: 24, fontFamily: '"Courier New", monospace', fontSize: 14 }}>[CONFIGURE_DISCOVERY_PARAMETERS]</p>
      
      {loading ? (
        <div style={{ color: '#b0bec5' }}>Loading...</div>
      ) : error ? (
        <div style={{ color: '#f44336' }}>{error}</div>
      ) : (
        <div style={{ maxWidth: 400 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ 
              display: 'block', 
              color: '#ffffff', 
              marginBottom: 8,
              fontFamily: '"Courier New", monospace',
              fontSize: 14,
              letterSpacing: '1px'
            }}>[MIN_LIQUIDITY]</label>
            <input
              type="number"
              value={minLiquidity}
              onChange={e => setMinLiquidity(Number(e.target.value))}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 0,
                border: '1px solid #333333',
                background: '#000000',
                color: '#ffffff',
                fontSize: 14,
                fontFamily: '"Courier New", monospace'
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
              background: '#000000',
              color: '#00ff41',
              border: '1px solid #00ff41',
              padding: '12px 24px',
              borderRadius: 0,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontFamily: '"Courier New", monospace',
              letterSpacing: '1px',
              textTransform: 'uppercase'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#00ff41';
              e.currentTarget.style.color = '#000000';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#000000';
              e.currentTarget.style.color = '#00ff41';
            }}
          >
            &gt; SAVE_CONFIG
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
          msg = '[STATUS] No new targets found. System will retry automatically.';
        } else {
          msg = `[DISCOVERY_COMPLETE] ${coins} new tokens, ${wallets} new wallets acquired.`;
        }
        setStatus(msg);
        setLoading(false);
      })
      .catch(() => {
        setError('[ERROR] Discovery module failed. System malfunction detected.');
        setLoading(false);
      });
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
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            color: '#00ff41', 
            marginBottom: 8,
            fontFamily: '"Courier New", monospace',
            fontSize: 14
          }}>[DISCOVERY_IN_PROGRESS]</div>
          <div style={{ 
            width: '100%', 
            height: 4, 
            background: '#333333', 
            borderRadius: 0, 
            overflow: 'hidden',
            border: '1px solid #333333'
          }}>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: '#00ff41', 
              animation: 'pulse 2s infinite' 
            }} />
          </div>
        </div>
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
  return (
    <div style={{ 
      marginTop: 32, 
      maxWidth: 1200, 
      margin: '32px auto 0', 
      padding: '0 24px',
      fontFamily: '"Courier New", monospace'
    }}>
      <h1 style={{ 
        color: '#ffffff', 
        marginBottom: 24, 
        fontSize: 24, 
        fontWeight: 700,
        fontFamily: '"Courier New", monospace',
        letterSpacing: '2px',
        textTransform: 'uppercase'
      }}>&gt; TOP_TOKENS</h1>
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
        setError('[ERROR] Failed to load analytics data.');
        setLoading(false);
      });
  }, []);

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
      }}>&gt; ANALYTICS_MODULE</h1>
      <p style={{ 
        color: '#cccccc', 
        marginBottom: 24, 
        fontFamily: '"Courier New", monospace', 
        fontSize: 14 
      }}>[DATA_ANALYSIS_INTERFACE]</p>
      {loading ? (
        <div style={{ 
          color: '#00ff41', 
          fontFamily: '"Courier New", monospace'
        }}>[LOADING_ANALYTICS...]</div>
      ) : error ? (
        <div style={{ 
          color: '#ff6b6b',
          fontFamily: '"Courier New", monospace',
          padding: 12,
          border: '1px solid #ff6b6b',
          background: 'rgba(255, 107, 107, 0.1)'
        }}>{error}</div>
      ) : (
        <>
          <div style={{ marginTop: 32 }}>
            <h2 style={{ 
              color: '#ffffff',
              fontFamily: '"Courier New", monospace',
              fontSize: 18,
              letterSpacing: '1px',
              marginBottom: 16
            }}>[TOKEN_REGISTRY]</h2>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid #333333',
              borderRadius: 0,
              overflow: 'hidden'
            }}>
              <table style={{ 
                width: '100%', 
                color: '#ffffff', 
                fontSize: 13, 
                marginBottom: 0,
                fontFamily: '"Courier New", monospace'
              }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 255, 65, 0.1)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>ADDRESS</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>SYMBOL</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>LIQUIDITY</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>HOLDERS</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>MARKET_CAP</th>
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #333333' }}>
                      <td style={{ padding: '10px' }}><WalletAddress address={t.address || t.id} short /></td>
                      <td style={{ padding: '10px' }}>{t.symbol}</td>
                      <td style={{ padding: '10px' }}>{t.liquidity}</td>
                      <td style={{ padding: '10px' }}>{t.holder_count}</td>
                      <td style={{ padding: '10px' }}>{t.market_cap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div style={{ marginTop: 32 }}>
            <h2 style={{ 
              color: '#ffffff',
              fontFamily: '"Courier New", monospace',
              fontSize: 18,
              letterSpacing: '1px',
              marginBottom: 16
            }}>[WALLET_DATABASE]</h2>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid #333333',
              borderRadius: 0,
              overflow: 'hidden'
            }}>
              <table style={{ 
                width: '100%', 
                color: '#ffffff', 
                fontSize: 13, 
                marginBottom: 0,
                fontFamily: '"Courier New", monospace'
              }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 255, 65, 0.1)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>WALLET</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>PNL_SOL</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>WIN_RATE</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>TRADES</th>
                  </tr>
                </thead>
                <tbody>
                  {wallets.map((w: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #333333' }}>
                      <td style={{ padding: '10px' }}><WalletAddress address={w.id} short /></td>
                      <td style={{ padding: '10px' }}>{w.on_chain_data?.pnl_sol ?? ''}</td>
                      <td style={{ padding: '10px' }}>{w.on_chain_data?.win_rate ?? ''}</td>
                      <td style={{ padding: '10px' }}>{w.on_chain_data?.total_trades ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div style={{ marginTop: 32 }}>
            <h2 style={{ 
              color: '#ffffff',
              fontFamily: '"Courier New", monospace',
              fontSize: 18,
              letterSpacing: '1px',
              marginBottom: 16
            }}>[TRADER_PROFILES]</h2>
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid #333333',
              borderRadius: 0,
              overflow: 'hidden'
            }}>
              <table style={{ 
                width: '100%', 
                color: '#ffffff', 
                fontSize: 13,
                fontFamily: '"Courier New", monospace'
              }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 255, 65, 0.1)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>WALLET</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>SMART_SCORE</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>TOKENS_7D</th>
                    <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>PNL_7D</th>
                  </tr>
                </thead>
                <tbody>
                  {traders.map((t: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #333333' }}>
                      <td style={{ padding: '10px' }}><WalletAddress address={t.wallet_address} short /></td>
                      <td style={{ padding: '10px' }}>{t.copy_trading_score}</td>
                      <td style={{ padding: '10px' }}>{t.token_num_7d}</td>
                      <td style={{ padding: '10px' }}>{t.pnl_sol_7d}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
    '[DISCOVERY_SCAN]',
    '[CHAIN_ANALYSIS]',
    '[ML_PROCESSING]',
    '[DATA_REFRESH]'
  ];

  const fetchWallets = () => {
    setLoading(true);
    axios.get('http://localhost:8000/wallets')
      .then(res => {
        setWallets(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('[ERROR] Failed to load wallet database.');
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
      setError('[ERROR] Analysis pipeline failure detected.');
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
      
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
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
        <button
          onClick={runAllAnalyzers}
          disabled={!!progress}
          style={{ 
            background: !!progress ? '#333333' : '#000000',
            color: !!progress ? '#666666' : '#00ff41',
            border: !!progress ? '1px solid #666666' : '1px solid #00ff41',
            borderRadius: 0, 
            padding: '12px 18px', 
            fontWeight: 700, 
            fontSize: 14, 
            cursor: !!progress ? 'not-allowed' : 'pointer',
            fontFamily: '"Courier New", monospace',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => {
            if (!progress) {
              e.currentTarget.style.background = '#00ff41';
              e.currentTarget.style.color = '#000000';
            }
          }}
          onMouseLeave={e => {
            if (!progress) {
              e.currentTarget.style.background = '#000000';
              e.currentTarget.style.color = '#00ff41';
            }
          }}
        >
          &gt; RUN_ALL_ANALYZERS
        </button>
      </div>
      
      {progress && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            color: '#00ff41', 
            marginBottom: 8,
            fontFamily: '"Courier New", monospace',
            fontSize: 14
          }}>{progress}</div>
          <div style={{ 
            width: '100%', 
            height: 4, 
            background: '#333333', 
            borderRadius: 0, 
            overflow: 'hidden',
            border: '1px solid #333333'
          }}>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: '#00ff41', 
              animation: 'pulse 2s infinite' 
            }} />
          </div>
        </div>
      )}
      
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
        <div style={{ overflowX: 'auto', maxHeight: 600 }}>
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
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>PNL_SOL</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>WIN_RATE</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>TRADES</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>SMART_SCORE</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>RISK_SCORE</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>ML_TAGS</th>
                </tr>
              </thead>
              <tbody>
                {sortedWallets.map((w, i) => (
                  <tr 
                    key={w.id || i} 
                    style={{ 
                      cursor: 'pointer', 
                      transition: 'background 0.2s',
                      borderBottom: '1px solid #333333'
                    }} 
                    onClick={() => setSelected(w)} 
                    onMouseOver={e => e.currentTarget.style.background='rgba(0, 255, 65, 0.05)'} 
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                  >
                    <td style={{ padding: '10px' }}><WalletAddress address={w.id} short /></td>
                    <td style={{ padding: '10px' }}>{typeof w?.on_chain_data?.pnl_sol === 'number' ? w.on_chain_data.pnl_sol.toFixed(2) : ''}</td>
                    <td style={{ padding: '10px' }}>{typeof w?.on_chain_data?.win_rate === 'number' ? w.on_chain_data.win_rate.toFixed(2) : ''}</td>
                    <td style={{ padding: '10px' }}>{typeof w?.on_chain_data?.total_trades === 'number' ? w.on_chain_data.total_trades : ''}</td>
                    <td style={{ padding: '10px' }}>{typeof w?.ai_insights?.overall_smart_score === 'number' ? w.ai_insights.overall_smart_score.toFixed(2) : ''}</td>
                    <td style={{ padding: '10px' }}>{typeof w?.ai_insights?.risk_score === 'number' ? w.ai_insights.risk_score.toFixed(2) : ''}</td>
                    <td style={{ padding: '10px' }}>{w?.ai_insights?.tags_ml ? w.ai_insights.tags_ml.join(', ') : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <p style={{ color: '#cccccc' }}>PNL_SOL: <span style={{ color: '#ffffff' }}>{selected.on_chain_data?.pnl_sol}</span></p>
            <p style={{ color: '#cccccc' }}>WIN_RATE: <span style={{ color: '#ffffff' }}>{selected.on_chain_data?.win_rate}</span></p>
            <p style={{ color: '#cccccc' }}>TOTAL_TRADES: <span style={{ color: '#ffffff' }}>{selected.on_chain_data?.total_trades}</span></p>
            <p style={{ color: '#cccccc' }}>SMART_SCORE: <span style={{ color: '#ffffff' }}>{selected.ai_insights?.overall_smart_score}</span></p>
            <p style={{ color: '#cccccc' }}>RISK_SCORE: <span style={{ color: '#ffffff' }}>{selected.ai_insights?.risk_score}</span></p>
          </div>
          <p style={{ color: '#cccccc', marginTop: 16 }}>ML_TAGS: <span style={{ color: '#ffffff' }}>{selected.ai_insights?.tags_ml?.join(', ')}</span></p>
        </div>
      )}
    </div>
  );
}

function CopytradeFinderPage() {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleAnalyze = () => {
    setLoading(true);
    setStatus(null);
    setError(null);
    axios.post('http://localhost:8000/run-copytrade-analyzer')
      .then(res => {
        setStatus('[ANALYSIS_COMPLETE] Copytrade patterns identified.');
        setLoading(false);
      })
      .catch(() => {
        setError('[ERROR] Copytrade analysis module failed.');
        setLoading(false);
      });
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
      }}>&gt; COPYTRADE_FINDER</h1>
      <p style={{ 
        color: '#cccccc', 
        marginBottom: 24,
        fontFamily: '"Courier New", monospace',
        fontSize: 14
      }}>[ADVANCED_PATTERN_RECOGNITION_SYSTEM]</p>
      
      <button
        onClick={handleAnalyze}
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
        {loading ? '[ANALYZING...]' : '> EXECUTE_COPYTRADE_SCAN'}
      </button>

      {loading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            color: '#00ff41', 
            marginBottom: 8,
            fontFamily: '"Courier New", monospace',
            fontSize: 14
          }}>[COPYTRADE_SCAN_IN_PROGRESS]</div>
          <div style={{ 
            width: '100%', 
            height: 4, 
            background: '#333333', 
            borderRadius: 0, 
            overflow: 'hidden',
            border: '1px solid #333333'
          }}>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: '#00ff41', 
              animation: 'pulse 2s infinite' 
            }} />
          </div>
        </div>
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

function OnChainAnalyzerPage() {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleRunOnChain = () => {
    setLoading(true);
    setStatus(null);
    setError(null);
    axios.post('http://localhost:8000/run-onchain-analysis')
      .then(res => {
        setStatus('[ANALYSIS_COMPLETE] On-chain data processed successfully.');
        setLoading(false);
      })
      .catch(() => {
        setError('[ERROR] On-chain analysis system failure.');
        setLoading(false);
      });
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
      }}>&gt; ONCHAIN_ANALYZER</h1>
      <p style={{ 
        color: '#cccccc', 
        marginBottom: 24,
        fontFamily: '"Courier New", monospace',
        fontSize: 14
      }}>[BLOCKCHAIN_DATA_ANALYSIS_ENGINE]</p>
      
      <button
        onClick={handleRunOnChain}
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
        {loading ? '[PROCESSING...]' : '> INITIATE_CHAIN_SCAN'}
      </button>

      {loading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            color: '#00ff41', 
            marginBottom: 8,
            fontFamily: '"Courier New", monospace',
            fontSize: 14
          }}>[ONCHAIN_ANALYSIS_IN_PROGRESS]</div>
          <div style={{ 
            width: '100%', 
            height: 4, 
            background: '#333333', 
            borderRadius: 0, 
            overflow: 'hidden',
            border: '1px solid #333333'
          }}>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: '#00ff41', 
              animation: 'pulse 2s infinite' 
            }} />
          </div>
        </div>
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

function MLProcessorPage() {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleRunML = () => {
    setLoading(true);
    setStatus(null);
    setError(null);
    axios.post('http://localhost:8000/ml-process')
      .then(res => {
        setStatus('[PROCESSING_COMPLETE] Machine learning algorithms executed.');
        setLoading(false);
      })
      .catch(() => {
        setError('[ERROR] ML processor core malfunction detected.');
        setLoading(false);
      });
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
      }}>&gt; ML_PROCESSOR</h1>
      <p style={{ 
        color: '#cccccc', 
        marginBottom: 24,
        fontFamily: '"Courier New", monospace',
        fontSize: 14
      }}>[ARTIFICIAL_INTELLIGENCE_CORE]</p>
      
      <button
        onClick={handleRunML}
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
        {loading ? '[COMPUTING...]' : '> EXECUTE_ML_PROTOCOL'}
      </button>

      {loading && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ 
            color: '#00ff41', 
            marginBottom: 8,
            fontFamily: '"Courier New", monospace',
            fontSize: 14
          }}>[ML_PROCESSING_IN_PROGRESS]</div>
          <div style={{ 
            width: '100%', 
            height: 4, 
            background: '#333333', 
            borderRadius: 0, 
            overflow: 'hidden',
            border: '1px solid #333333'
          }}>
            <div style={{ 
              width: '100%', 
              height: '100%', 
              background: '#00ff41', 
              animation: 'pulse 2s infinite' 
            }} />
          </div>
        </div>
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

// Main App Layout Component
function MainAppLayout() {
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
          <h1 style={{ 
            margin: 0, 
            fontSize: 20, 
            fontWeight: 700, 
            color: '#00ff41',
            fontFamily: '"Courier New", monospace',
            letterSpacing: '2px'
          }}>
            &gt;CIPHER
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
            { path: '/top-tokens', label: '> TOP_TOKENS', icon: '[TKN]' },
            { path: '/settings', label: '> SETTINGS', icon: '[CFG]' },
            { path: '/discovery', label: '> DISCOVERY', icon: '[SCAN]' },
            { path: '/analytics', label: '> ANALYTICS', icon: '[DATA]' },
            { path: '/wallet-finder', label: '> WALLET_FINDER', icon: '[FIND]' },
            { path: '/copytrade-finder', label: '> COPYTRADE_FINDER', icon: '[COPY]' },
            { path: '/onchain-analyzer', label: '> ONCHAIN_ANALYZER', icon: '[CHAIN]' },
            { path: '/ml-processor', label: '> ML_PROCESSOR', icon: '[AI]' }
          ].map((item) => (
            <Link 
              key={item.path}
              to={item.path}
              style={{ 
                display: 'block',
                padding: '12px 20px',
                textDecoration: 'none',
                color: '#cccccc',
                fontSize: 14,
                fontFamily: '"Courier New", monospace',
                borderBottom: '1px solid #1a1a1a',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(0, 255, 65, 0.1)';
                e.currentTarget.style.color = '#00ff41';
                e.currentTarget.style.borderLeft = '3px solid #00ff41';
                e.currentTarget.style.paddingLeft = '17px';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#cccccc';
                e.currentTarget.style.borderLeft = 'none';
                e.currentTarget.style.paddingLeft = '20px';
              }}
            >
              <span style={{ color: '#666666', marginRight: 8 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
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
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/wallet-finder" element={<WalletFinderPage />} />
            <Route path="/copytrade-finder" element={<CopytradeFinderPage />} />
            <Route path="/onchain-analyzer" element={<OnChainAnalyzerPage />} />
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

export default App;
