import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_ENDPOINTS } from '../config';

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
  const characters = '█▄▀▐░▒▓│┤╡╢╖╕╣║╗╝╜╛ΣΔΓΛΧΞΘΠΦΨ┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌ΣΨΩΦΧΘΠΔΛΞΓΠΘΜΞΩΦΨΣΩΧΓΛΔΞΘΠΦΨΣΩΧΓΛΔ';
  
  useEffect(() => {
    if (!isHovered) {
      setDisplayText(children);
      return;
    }

    let iterations = 0;
    const maxIterations = 8;
    
    const interval = setInterval(() => {
      setDisplayText((prevText) => {
        return children
          .split('')
          .map((char, index) => {
            if (char === ' ' || char === '>' || char === '[' || char === ']') return char;
            
            // Make the effect more dramatic - more random characters for longer
            if (iterations < maxIterations - 3) {
              return characters[Math.floor(Math.random() * characters.length)];
            } else if (iterations < maxIterations - 1) {
              // Gradually reveal characters
              if (Math.random() < 0.5) {
                return children[index];
              } else {
                return characters[Math.floor(Math.random() * characters.length)];
              }
            } else {
              // Final reveal
              return children[index];
            }
          })
          .join('');
      });
      
      iterations++;
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setDisplayText(children);
      }
    }, 20);

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
  const [isMobile, setIsMobile] = useState(false);
  // Live stats state
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(API_ENDPOINTS.DASHBOARD_SUMMARY);
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
          <source src="/assets/bgvid.webm" type="video/webm" />
        </video>
      </div>
      
      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: isMobile ? '16px 24px' : '24px 48px',
        maxWidth: 1400,
        margin: '0 auto',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '16px' : '0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ 
            fontSize: isMobile ? 16 : 18, 
            fontWeight: 700, 
            color: '#ffffff',
            fontFamily: '"Courier New", monospace',
            textTransform: 'uppercase',
            letterSpacing: '2px'
          }}>
            <span>&gt;</span> CYPHER
          </span>
        </div>
        <MatrixText
          isHovered={hoveredButton === 'header'}
          buttonStyle={{
            background: 'transparent',
            color: '#ffffff',
            border: 'none',
            padding: isMobile ? '8px 16px' : '12px 24px',
            borderRadius: 0,
            fontSize: isMobile ? 14 : 16,
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
        padding: isMobile ? '300px 16px 30px' : '440px 24px 50px',
        maxWidth: 1200,
        margin: '0 auto',
        marginLeft: isMobile ? '0' : '-10px',
      }}>
        <h1 style={{
          fontSize: isMobile ? 16 : 20,
          fontWeight: 700,
          marginBottom: isMobile ? 16 : 24,
          color: '#ffffff',
          fontFamily: '"Courier New", monospace',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          {/* Next gen on-chain intelligence */}
        </h1>
        <div style={{
          fontSize: 'clamp(14px, 3vw, 20px)',
          color: '#ffffff',
          marginBottom: isMobile ? 12 : 16,
          fontFamily: '"Courier New", monospace',
          letterSpacing: '1px'
        }}>
          {/* [SYSTEM_STATUS: ONLINE] */}
        </div> 
        <p style={{
          fontSize: 'clamp(16px, 4vw, 24px)',
          color: '#cccccc',
          marginBottom: isMobile ? 32 : 48,
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

      {/* Features Section */}
       <section style={{
        position: 'relative',
        zIndex: 10,
        padding: isMobile ? '20px 16px 60px' : '40px 24px 120px',
        maxWidth: 1120,
        margin: isMobile ? '50px auto 0' : '100px auto 0',
        background: '#000000'
      }}>
        {/* Live Stats Bar (real data) */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'flex-start' : 'center',
          marginBottom: isMobile ? '40px' : '60px',
          padding: isMobile ? '16px 20px' : '20px 40px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderTop: '1px solid #333333',
          borderBottom: '1px solid #333333',
          gap: isMobile ? '12px' : '0'
        }}>
          <div style={{ fontFamily: '"Courier New", monospace', color: '#cccccc', fontSize: isMobile ? '10px' : '12px' }}>
            <span style={{ color: '#ffffff', marginRight: '8px' }}>[NETWORK_STATUS]</span>
            ONLINE • 99.97% UPTIME
          </div>
          <div style={{ fontFamily: '"Courier New", monospace', color: '#cccccc', fontSize: isMobile ? '10px' : '12px' }}>
            <span style={{ color: '#ffffff', marginRight: '8px' }}>[WALLETS_OBTAINED]</span>
            {stats ? (stats.metrics?.find((m:any) => m.label.toLowerCase().includes('wallet'))?.value || 'N/A') : 'N/A'}
          </div>
          <div style={{ fontFamily: '"Courier New", monospace', color: '#cccccc', fontSize: isMobile ? '10px' : '12px' }}>
            <span style={{ color: '#ffffff', marginRight: '8px' }}>[ACTIVE_ALERTS]</span>
            <span style={{ color: '#00ff41' }}>N/A</span>
          </div>
        </div>

        <h2 style={{
          fontSize: isMobile ? 24 : 32,
          fontWeight: 700,
          textAlign: 'left',
          marginBottom: isMobile ? 40 : 80,
          color: '#ffffff',
          fontFamily: '"Courier New", monospace',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          paddingLeft: isMobile ? '20px' : '40px'
        }}>
          &gt; SYSTEM_MODULES
        </h2>
        
        {/* Modern asymmetric layout */}
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: isMobile ? '24px' : '40px',
          paddingLeft: isMobile ? '20px' : '40px',
          paddingRight: isMobile ? '20px' : '40px'
        }}>
          
          {/* Row 1 */}
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '24px' : '60px', 
            alignItems: 'flex-start' 
          }}>
            <ModuleCard idx={1} title="WALLET_DISCOVERY" desc="Real-time wallet discovery and ranking. Instantly find top, new, and risky wallets." stats="LIVE  • 7D PNL, RISK, ML TAGS" isMobile={isMobile} />
            <ModuleCard idx={2} title="AI_PROCESSOR" desc="Automated ML scoring and tagging for every wallet. Risk, smart score, and ML tags updated in real time." stats="LIVE • 91.8% CONFIDENCE" isMobile={isMobile} />
          </div>

          {/* Row 2 */}
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '24px' : '60px', 
            alignItems: 'flex-start' 
          }}>
            <ModuleCard idx={3} title="COPYTRADE_FINDER" desc="Detects unique copytraders and patterns. CSV/JSON export, robust frontend integration." stats="LIVE • UNIQUE COPYTRADERS • CSV/JSON EXPORT" isMobile={isMobile} />
            <ModuleCard idx={4} title="WATCHLIST" desc="Add, remove, and monitor wallets/tokens. Local, persistent, and synced across pages. Export/import supported." stats="LIVE • LOCAL STORAGE • EXPORT/IMPORT" isMobile={isMobile} />
          </div>

          {/* Row 3 */}
          <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '24px' : '60px', 
            alignItems: 'flex-start' 
          }}>
            <ModuleCard idx={5} title="API_SERVICE" desc="Public API endpoints for programmatic access to all analytics. Docs and keys coming soon." stats="COMING SOON" comingSoon isMobile={isMobile} />
          </div>
        </div>
      </section>

      {/* Security & Compliance Section */}
      <section style={{
        position: 'relative',
        zIndex: 10,
        padding: isMobile ? '40px 16px' : '80px 24px',
        maxWidth: 1120,
        margin: '0 auto',
        background: '#000000',
        borderTop: '1px solid #333333'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: isMobile ? '24px' : '40px',
          paddingLeft: isMobile ? '20px' : '40px',
          paddingRight: isMobile ? '20px' : '40px'
        }}>          
          
          
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '16px' : '24px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid #333333'
          }}>
            <div style={{
              fontSize: isMobile ? '12px' : '14px',
              fontFamily: '"Courier New", monospace',
              color: '#00ff41',
              marginBottom: '8px',
              letterSpacing: '1px'
            }}>
              [API_PERFORMANCE]
            </div>
            <div style={{
              fontSize: isMobile ? '10px' : '12px',
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
            padding: isMobile ? '16px' : '24px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid #333333'
          }}>
            <div style={{
              fontSize: isMobile ? '12px' : '14px',
              fontFamily: '"Courier New", monospace',
              color: '#00ff41',
              marginBottom: '8px',
              letterSpacing: '1px'
            }}>
              [VERSION_INFO]
            </div>
            <div style={{
              fontSize: isMobile ? '10px' : '12px',
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
        padding: isMobile ? '32px 16px' : '48px 24px',
        borderTop: '1px solid #333333',
        color: '#666666',
        background: '#000000',
        fontFamily: '"Courier New", monospace',
        fontSize: isMobile ? '10px' : '12px'
      }}>
        <div style={{ marginBottom: '16px' }}>
                      <span style={{ color: '#ffffff' }}>&gt; CYPHER_SYSTEMS</span> • ADVANCED ON-CHAIN INTELLIGENCE PLATFORM
        </div>
        <div style={{ opacity: 0.7 }}>
          [OPERATIONAL_STATUS: ONLINE] •• [DATA_CLASSIFICATION: OPEN]
        </div>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <a 
            href="https://twitter.com/CypherSysSOL" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#00ff41',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: '"Courier New", monospace',
              fontSize: isMobile ? '10px' : '12px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
            onMouseLeave={e => e.currentTarget.style.color = '#00ff41'}
          >
            <span style={{ fontSize: isMobile ? '12px' : '14px' }}>𝕏</span>
            @CypherSysSOL
          </a>
        </div>
        <div style={{ marginTop: '16px', opacity: 0.5 }}>
                      © 2024 CYPHER SYSTEMS. ALL RIGHTS RESERVED.
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

function ModuleCard({ idx, title, desc, stats, comingSoon, isMobile }: { idx: number, title: string, desc: string, stats: string, comingSoon?: boolean, isMobile?: boolean }) {
  return (
    <div
      style={{
        flex: '1',
        maxWidth: isMobile ? 'none' : '400px',
        background: comingSoon ? 'rgba(0,255,65,0.03)' : 'rgba(255,255,255,0.02)',
        padding: isMobile ? '24px' : '32px',
        borderLeft: '2px solid #333333',
        marginTop: isMobile ? '0' : (idx % 2 === 0 ? '20px' : undefined),
        transition: 'all 0.3s ease',
        cursor: comingSoon ? 'not-allowed' : 'pointer',
        opacity: comingSoon ? 0.7 : 1
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ color: '#ffffff', fontSize: isMobile ? '12px' : '14px', fontFamily: '"Courier New", monospace', letterSpacing: '1px', opacity: 0.7 }}>[{String(idx).padStart(2, '0')}]</div>
        <div style={{ color: comingSoon ? '#cccccc' : '#00ff41', fontSize: isMobile ? '10px' : '12px', fontFamily: '"Courier New", monospace', letterSpacing: '1px' }}>{comingSoon ? 'COMING SOON' : 'ACTIVE'}</div>
      </div>
      <h3 style={{ fontSize: isMobile ? 16 : 18, fontWeight: 700, marginBottom: 16, color: '#ffffff', fontFamily: '"Courier New", monospace', letterSpacing: '1px', textTransform: 'uppercase' }}>{title}</h3>
      <p style={{ color: '#cccccc', lineHeight: 1.6, fontFamily: '"Courier New", monospace', fontSize: isMobile ? '12px' : '13px', opacity: 0.8, marginBottom: '16px' }}>{desc}</p>
      <div style={{ fontSize: isMobile ? '10px' : '11px', fontFamily: '"Courier New", monospace', color: comingSoon ? '#00ff41' : '#666666', borderTop: '1px solid #222222', paddingTop: '12px' }}>{stats}</div>
    </div>
  );
}

export default LandingPage; 