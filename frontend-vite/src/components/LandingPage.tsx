import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Matrix-style text scrambling component
const MatrixText: React.FC<{ 
  children: string; 
  isHovered: boolean; 
  style?: React.CSSProperties;
  onClick?: () => void;
  buttonStyle?: React.CSSProperties;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}> = ({ children, isHovered, style, onClick, buttonStyle, onMouseEnter, onMouseLeave }) => {
  const [displayText, setDisplayText] = useState(children);
  const characters = '█▄▀▐░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌';
  
  useEffect(() => {
    if (!isHovered) {
      setDisplayText(children);
      return;
    }

    let iterations = 0;
    const maxIterations = 15;
    
    const interval = setInterval(() => {
      setDisplayText((prevText) => {
        return children
          .split('')
          .map((char, index) => {
            if (char === ' ' || char === '>' || char === '[' || char === ']') return char;
            if (iterations < maxIterations - 5 || Math.random() < 0.7) {
              return characters[Math.floor(Math.random() * characters.length)];
            }
            return children[index];
          })
          .join('');
      });
      
      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setDisplayText(children);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isHovered, children]);

  if (buttonStyle) {
    return (
      <button 
        style={buttonStyle} 
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <span style={style}>{displayText}</span>
      </button>
    );
  }

  return <span style={style}>{displayText}</span>;
};

const JUICY_STATS = [
  { label: 'TOP TOKEN (1M)', value: 'SOLAPE', extra: '+27.8%' },
  { label: 'TOP WALLET (7D PNL)', value: '0xA1B...C9F', extra: '+$42,000' },
  { label: 'WALLETS TRACKED', value: '2,847,392' },
  { label: 'TOKENS TRACKED', value: '18,201' },
  { label: 'ML SCORES', value: 'LIVE' },
  { label: 'TRENDING', value: 'DOGE, BONK, JUP' },
];

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  // Live stats state
  const [stats, setStats] = useState<any>(null);
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:8000/dashboard-summary');
        setStats(res.data);
      } catch {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
      minHeight: '70vh', 
      background: '#000000',
      fontFamily: '"Courier New", monospace',
      color: '#00ff41',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Video Background - only for top section */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '70vh',
        zIndex: 0,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
          height: '100%',
        }}>
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              filter: 'contrast(1.2) brightness(0.9)'
            }}
          >
            <source src="/bgvid.webm" type="video/webm" />
          </video>
        </div>
      </div>
      
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
          <span style={{ 
            fontSize: 18, 
            fontWeight: 700, 
            color: '#ffffff',
            fontFamily: '"Courier New", monospace',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            <span>&gt;</span> CIPHER
          </span>
        </div>
        <MatrixText
          isHovered={hoveredButton === 'header'}
          buttonStyle={{
            background: 'transparent',
            color: '#ffffff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 0,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s',
            fontFamily: '"Courier New", monospace',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
          onClick={() => navigate('/dashboard')}
          onMouseEnter={() => setHoveredButton('header')}
          onMouseLeave={() => setHoveredButton(null)}
        >
          &gt; INITIALIZE_SYSTEM
        </MatrixText>
      </header>

      {/* Hero Section */}
      <section style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'left',
        padding: '440px 24px 50px',
        maxWidth: 1200,
        margin: '0 auto',
        marginLeft: '-10px',
      }}>
        <h1 style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 24,
          color: '#ffffff',
          fontFamily: '"Courier New", monospace',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          {/* Next gen on-chain intelligence */}
        </h1>
        <div style={{
          fontSize: 'clamp(16px, 3vw, 20px)',
          color: '#ffffff',
          marginBottom: 16,
          fontFamily: '"Courier New", monospace',
          letterSpacing: '1px'
        }}>
          {/* [SYSTEM_STATUS: ONLINE] */}
        </div> 
        <p style={{
          fontSize: 'clamp(18px, 4vw, 24px)',
          color: '#cccccc',
          marginBottom: 48,
          maxWidth: 800,
          marginLeft: 'auto',
          marginRight: 'auto',
          lineHeight: 1.6,
          fontFamily: '"Courier New", monospace'
        }}>
          {/* &gt; SCAN<br/>
          &gt; ANALYZE<br/>
          &gt; IDENTIFY */}
        </p>
        <div style={{justifyContent: 'center', margin: 'auto'}}>
          {/* <MatrixText
            isHovered={hoveredButton === 'execute'}
            buttonStyle={{
              background: 'transparent',
              color: '#ffffff',
              border: 'none',
            //   padding: '16px 32px',
              borderRadius: 0,
              fontSize: 18,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.3s',
              fontFamily: '"Courier New", monospace',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onClick={() => navigate('/dashboard')}
            onMouseEnter={() => setHoveredButton('execute')}
            onMouseLeave={() => setHoveredButton(null)}
          >
            &gt; EXECUTE_SCAN
          </MatrixText> */}
        </div> 
      </section>

      {/* Juicy Live Stats Bar */}
      <div style={{
        width: '100%',
        background: '#000',
        borderBottom: '2px solid #00ff41',
        color: '#00ff41',
        fontFamily: '"Courier New", monospace',
        fontSize: 15,
        fontWeight: 700,
        letterSpacing: 1,
        padding: '18px 0 10px 0',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 36,
        position: 'relative',
        zIndex: 11,
        boxShadow: '0 2px 12px #000',
        marginLeft: 40,
        marginRight: 40,
        borderLeft: '2px solid #00ff41',
        borderRight: '2px solid #00ff41',
      }}>
        {stats ? (
          <>
            <span style={{ color: '#00ff41', fontWeight: 900, fontSize: 16, marginRight: 18 }}>
              [TOP TOKEN (1M): <span style={{ color: '#fff' }}>{stats.trendingTokens?.[0]?.token || 'N/A'}</span> {stats.trendingTokens?.[0]?.market_cap ? <span style={{ color: '#00ff41', marginLeft: 4 }}>{stats.trendingTokens[0].market_cap}</span> : null}]
            </span>
            <span style={{ color: '#00ff41', fontWeight: 900, fontSize: 16, marginRight: 18 }}>
              [TOP WALLET (7D PNL): <span style={{ color: '#fff' }}>{stats.topWallets?.[0]?.address?.slice(0, 6)}...{stats.topWallets?.[0]?.address?.slice(-4)}</span> <span style={{ color: '#00ff41', marginLeft: 4 }}>+{stats.topWallets?.[0]?.pnl_7d}</span>]
            </span>
            <span style={{ color: '#00ff41', fontWeight: 900, fontSize: 16, marginRight: 18 }}>
              [WALLETS TRACKED: <span style={{ color: '#fff' }}>{stats.metrics?.find((m:any) => m.label.toLowerCase().includes('wallet'))?.value || 'N/A'}</span>]
            </span>
            <span style={{ color: '#00ff41', fontWeight: 900, fontSize: 16, marginRight: 18 }}>
              [TOKENS TRACKED: <span style={{ color: '#fff' }}>{stats.trendingTokens?.length ? stats.trendingTokens.length : 'N/A'}</span>]
            </span>
            <span style={{ color: '#00ff41', fontWeight: 900, fontSize: 16, marginRight: 18 }}>
              [ML SCORES: <span style={{ color: '#fff' }}>LIVE</span>]
            </span>
            <span style={{ color: '#00ff41', fontWeight: 900, fontSize: 16, marginRight: 18 }}>
              [TRENDING: <span style={{ color: '#fff' }}>{stats.trendingTokens?.map((t:any) => t.token).join(', ')}</span>]
            </span>
          </>
        ) : (
          <span style={{ color: '#00ff41', fontWeight: 900, fontSize: 16 }}>[LOADING LIVE STATS...]</span>
        )}
      </div>

      {/* Features Section */}
       <section style={{
        position: 'relative',
        zIndex: 10,
        padding: '40px 24px 120px',
        maxWidth: 1400,
        margin: '100px auto 0',
        background: '#000000'
      }}>
        {/* Live Stats Bar (real data) */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '60px',
          padding: '20px 40px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderTop: '1px solid #333333',
          borderBottom: '1px solid #333333'
        }}>
          <div style={{ fontFamily: '"Courier New", monospace', color: '#cccccc', fontSize: '12px' }}>
            <span style={{ color: '#ffffff', marginRight: '8px' }}>[NETWORK_STATUS]</span>
            ONLINE • 99.97% UPTIME
          </div>
          <div style={{ fontFamily: '"Courier New", monospace', color: '#cccccc', fontSize: '12px' }}>
            <span style={{ color: '#ffffff', marginRight: '8px' }}>[WALLETS_SCANNED]</span>
            {stats ? (stats.metrics?.find((m:any) => m.label.toLowerCase().includes('wallet'))?.value || 'N/A') : 'N/A'}
          </div>
          <div style={{ fontFamily: '"Courier New", monospace', color: '#cccccc', fontSize: '12px' }}>
            <span style={{ color: '#ffffff', marginRight: '8px' }}>[ACTIVE_ALERTS]</span>
            <span style={{ color: '#00ff41' }}>N/A</span>
          </div>
        </div>

        <h2 style={{
          fontSize: 32,
          fontWeight: 700,
          textAlign: 'left',
          marginBottom: 80,
          color: '#ffffff',
          fontFamily: '"Courier New", monospace',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          paddingLeft: '40px'
        }}>
          &gt; SYSTEM_MODULES
        </h2>
        
        {/* Modern asymmetric layout */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: '40px',
          paddingLeft: '40px',
          paddingRight: '40px'
        }}>
          
          {/* Row 1 */}
          <div style={{ display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
            <ModuleCard idx={1} title="WALLET_DISCOVERY" desc="Real-time wallet discovery and ranking powered by GMGN. Instantly find top, new, and risky wallets." stats="LIVE • 2.8M+ WALLETS • 7D PNL, RISK, ML TAGS" />
            <ModuleCard idx={2} title="TOKEN_DISCOVERY" desc="Live trending tokens, 1-minute and 7-day rankings, and token analytics. All data from GMGN." stats="LIVE • 18K+ TOKENS • 1M/7D RANKINGS" />
          </div>

          {/* Row 2 */}
          <div style={{ display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
            <ModuleCard idx={3} title="ML_PROCESSOR" desc="Automated ML scoring and tagging for every wallet. Risk, smart score, and ML tags updated in real time." stats="LIVE • 2.8M SCORED • 91.8% CONFIDENCE" />
            <ModuleCard idx={4} title="COPYTRADE_FINDER" desc="Detects unique copytraders and patterns. CSV/JSON export, robust frontend integration." stats="LIVE • UNIQUE COPYTRADERS • CSV/JSON EXPORT" />
          </div>

          {/* Row 3 */}
          <div style={{ display: 'flex', gap: '60px', alignItems: 'flex-start' }}>
            <ModuleCard idx={5} title="WATCHLIST" desc="Add, remove, and monitor wallets/tokens. Local, persistent, and synced across pages. Export/import supported." stats="LIVE • LOCAL STORAGE • EXPORT/IMPORT" />
            <ModuleCard idx={6} title="API_SERVICE" desc="Public API endpoints for programmatic access to all analytics. Docs and keys coming soon." stats="COMING SOON" comingSoon />
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section style={{
        position: 'relative',
        zIndex: 10,
        padding: '80px 24px',
        maxWidth: 1400,
        margin: '0 auto',
        background: '#000000',
        borderTop: '1px solid #333333',
        marginTop: 60
      }}>
        <h2 style={{ color: '#00ff41', fontSize: 24, fontWeight: 700, letterSpacing: 2, fontFamily: '"Courier New", monospace', marginBottom: 32 }}>&gt; ROADMAP</h2>
        <ul style={{ color: '#fff', fontFamily: '"Courier New", monospace', fontSize: 16, listStyle: 'none', padding: 0, margin: 0 }}>
          <li style={{ marginBottom: 18 }}><span style={{ color: '#00ff41' }}>[NEXT]</span> API Service <span style={{ color: '#cccccc', fontSize: 13 }}>(public endpoints, docs, keys)</span></li>
          <li style={{ marginBottom: 18 }}><span style={{ color: '#00ff41' }}>[SOON]</span> Phone App <span style={{ color: '#cccccc', fontSize: 13 }}>(follow wallets/tokens, push alerts)</span></li>
          <li style={{ marginBottom: 18 }}><span style={{ color: '#00ff41' }}>[SOON]</span> Real-Time Token Analysis <span style={{ color: '#cccccc', fontSize: 13 }}>(sub-second updates, advanced stats)</span></li>
          <li style={{ marginBottom: 18 }}><span style={{ color: '#00ff41' }}>[SECRET]</span> Secret Integration <span style={{ color: '#cccccc', fontSize: 13 }}>(major partnership with a top project—details soon!)</span></li>
        </ul>
      </section>

      {/* Security & Compliance Section */}
      <section style={{
        position: 'relative',
        zIndex: 10,
        padding: '80px 24px',
        maxWidth: 1400,
        margin: '0 auto',
        background: '#000000',
        borderTop: '1px solid #333333'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '40px',
          paddingLeft: '40px',
          paddingRight: '40px'
        }}>          
          
          
          <div style={{
            textAlign: 'center',
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid #333333'
          }}>
            <div style={{
              fontSize: '14px',
              fontFamily: '"Courier New", monospace',
              color: '#00ff41',
              marginBottom: '8px',
              letterSpacing: '1px'
            }}>
              [API_PERFORMANCE]
            </div>
            <div style={{
              fontSize: '12px',
              fontFamily: '"Courier New", monospace',
              color: '#cccccc'
            }}>
              RESPONSE TIME: 12ms<br/>
              RATE LIMIT: 10K/MIN<br/>
              UPTIME: 99.97%
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid #333333'
          }}>
            <div style={{
              fontSize: '14px',
              fontFamily: '"Courier New", monospace',
              color: '#00ff41',
              marginBottom: '8px',
              letterSpacing: '1px'
            }}>
              [VERSION_INFO]
            </div>
            <div style={{
              fontSize: '12px',
              fontFamily: '"Courier New", monospace',
              color: '#cccccc'
            }}>
              CORE: v3.2.1<br/>
              API: v2.7.4<br/>
              BUILD: 20240312.1847
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        textAlign: 'center',
        padding: '48px 24px',
        borderTop: '1px solid #333333',
        color: '#666666',
        background: '#000000',
        fontFamily: '"Courier New", monospace',
        fontSize: '12px'
      }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ color: '#ffffff' }}>&gt; CIPHER_SYSTEMS</span> • ADVANCED ON-CHAIN INTELLIGENCE PLATFORM
        </div>
        <div style={{ opacity: 0.7 }}>
          [OPERATIONAL_STATUS: ONLINE] •• [DATA_CLASSIFICATION: OPEN]
        </div>
        <div style={{ marginTop: '16px', opacity: 0.5 }}>
          © 2024 CIPHER SYSTEMS. ALL RIGHTS RESERVED.
        </div>
      </footer>

      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

function ModuleCard({ idx, title, desc, stats, comingSoon }: { idx: number, title: string, desc: string, stats: string, comingSoon?: boolean }) {
  return (
    <div
      style={{
        flex: '1',
        maxWidth: '400px',
        background: comingSoon ? 'rgba(0,255,65,0.03)' : 'rgba(255,255,255,0.02)',
        padding: '32px',
        borderLeft: comingSoon ? '2px dashed #00ff41' : '2px solid #333333',
        marginTop: idx % 2 === 0 ? '20px' : undefined,
        transition: 'all 0.3s ease',
        cursor: comingSoon ? 'not-allowed' : 'pointer',
        opacity: comingSoon ? 0.7 : 1
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ color: '#ffffff', fontSize: '14px', fontFamily: '"Courier New", monospace', letterSpacing: '1px', opacity: 0.7 }}>[{String(idx).padStart(2, '0')}]</div>
        <div style={{ color: comingSoon ? '#cccccc' : '#00ff41', fontSize: '12px', fontFamily: '"Courier New", monospace', letterSpacing: '1px' }}>{comingSoon ? 'COMING SOON' : 'ACTIVE'}</div>
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#ffffff', fontFamily: '"Courier New", monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>{title}</h3>
      <p style={{ color: '#cccccc', lineHeight: 1.6, fontFamily: '"Courier New", monospace', fontSize: '13px', opacity: 0.8, marginBottom: '16px' }}>{desc}</p>
      <div style={{ fontSize: '11px', fontFamily: '"Courier New", monospace', color: comingSoon ? '#00ff41' : '#666666', borderTop: '1px solid #222222', paddingTop: '12px' }}>{stats}</div>
    </div>
  );
}

export default LandingPage; 