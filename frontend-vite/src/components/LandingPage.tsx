import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

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
        overflow: 'hidden'
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
          <source src="/bgvid.mp4" type="video/mp4" />
        </video>
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

      {/* Features Section */}
       <section style={{
        position: 'relative',
        zIndex: 10,
        padding: '40px 24px 120px',
        maxWidth: 1400,
        margin: '100px auto 0',
        background: '#000000'
      }}>
        {/* Live Stats Bar */}
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
            2,847,392
          </div>
          <div style={{ fontFamily: '"Courier New", monospace', color: '#cccccc', fontSize: '12px' }}>
            <span style={{ color: '#ffffff', marginRight: '8px' }}>[ACTIVE_ALERTS]</span>
            <span style={{ color: '#00ff41' }}>147</span>
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
          
          {/* Row 1 - Two modules */}
          <div style={{ 
            display: 'flex', 
            gap: '60px',
            alignItems: 'flex-start'
          }}>
            <div 
              style={{
                flex: '1',
                maxWidth: '400px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '32px',
                borderLeft: '2px solid #333333',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderLeftColor = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderLeftColor = '#333333';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px',
                  opacity: 0.7
                }}>
                  [01]
                </div>
                <div style={{
                  color: '#00ff41',
                  fontSize: '12px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px'
                }}>
                  ACTIVE
                </div>
              </div>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                marginBottom: 16, 
                color: '#ffffff',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                NEURAL_SCANNER
              </h3>
              <p style={{ 
                color: '#cccccc', 
                lineHeight: 1.6,
                fontFamily: '"Courier New", monospace',
                fontSize: '13px',
                opacity: 0.8,
                marginBottom: '16px'
              }}>
                Advanced AI algorithms detect profitable wallet patterns in real-time blockchain data streams
              </p>
              <div style={{
                fontSize: '11px',
                fontFamily: '"Courier New", monospace',
                color: '#666666',
                borderTop: '1px solid #222222',
                paddingTop: '12px'
              }}>
                ACCURACY: 94.7% • PROCESSED: 847K WALLETS • ALERTS: 23
              </div>
            </div>
            
            <div 
              style={{
                flex: '1',
                maxWidth: '400px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '32px',
                borderLeft: '2px solid #333333',
                marginTop: '20px',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderLeftColor = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderLeftColor = '#333333';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px',
                  opacity: 0.7
                }}>
                  [02]
                </div>
                <div style={{
                  color: '#00ff41',
                  fontSize: '12px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px'
                }}>
                  ACTIVE
                </div>
              </div>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                marginBottom: 16, 
                color: '#ffffff',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                CHAIN_ANALYZER
              </h3>
              <p style={{ 
                color: '#cccccc', 
                lineHeight: 1.6,
                fontFamily: '"Courier New", monospace',
                fontSize: '13px',
                opacity: 0.8,
                marginBottom: '16px'
              }}>
                Deep analysis of on-chain metrics, PnL calculations, and risk assessment protocols
              </p>
              <div style={{
                fontSize: '11px',
                fontFamily: '"Courier New", monospace',
                color: '#666666',
                borderTop: '1px solid #222222',
                paddingTop: '12px'
              }}>
                TRANSACTIONS: 2.1M • PNL TRACKED: $847M • RISK SCORE: 0.23
              </div>
            </div>
          </div>

          {/* Row 2 - Two modules */}
          <div style={{ 
            display: 'flex', 
            gap: '60px',
            alignItems: 'flex-start'
          }}>
            <div 
              style={{
                flex: '1',
                maxWidth: '400px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '32px',
                borderLeft: '2px solid #333333',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderLeftColor = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderLeftColor = '#333333';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px',
                  opacity: 0.7
                }}>
                  [03]
                </div>
                <div style={{
                  color: '#00ff41',
                  fontSize: '12px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px'
                }}>
                  ACTIVE
                </div>
              </div>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                marginBottom: 16, 
                color: '#ffffff',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                COPY_PROTOCOL
              </h3>
              <p style={{ 
                color: '#cccccc', 
                lineHeight: 1.6,
                fontFamily: '"Courier New", monospace',
                fontSize: '13px',
                opacity: 0.8,
                marginBottom: '16px'
              }}>
                Automated detection of high-performance traders and mirror trading opportunities
              </p>
              <div style={{
                fontSize: '11px',
                fontFamily: '"Courier New", monospace',
                color: '#666666',
                borderTop: '1px solid #222222',
                paddingTop: '12px'
              }}>
                TOP TRADERS: 1,247 • AVG ROI: +284% • SUCCESS RATE: 87.3%
              </div>
            </div>
            
            <div 
              style={{
                flex: '1',
                maxWidth: '400px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '32px',
                borderLeft: '2px solid #333333',
                marginTop: '40px',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderLeftColor = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderLeftColor = '#333333';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px',
                  opacity: 0.7
                }}>
                  [04]
                </div>
                <div style={{
                  color: '#00ff41',
                  fontSize: '12px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px'
                }}>
                  ACTIVE
                </div>
              </div>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                marginBottom: 16, 
                color: '#ffffff',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                LIVE_FEED
              </h3>
              <p style={{ 
                color: '#cccccc', 
                lineHeight: 1.6,
                fontFamily: '"Courier New", monospace',
                fontSize: '13px',
                opacity: 0.8,
                marginBottom: '16px'
              }}>
                Real-time data streams from Solana network with millisecond precision updates
              </p>
              <div style={{
                fontSize: '11px',
                fontFamily: '"Courier New", monospace',
                color: '#666666',
                borderTop: '1px solid #222222',
                paddingTop: '12px'
              }}>
                LATENCY: 12ms • THROUGHPUT: 847 TPS • BLOCKS: 234,891,476
              </div>
            </div>
          </div>

          {/* Row 3 - Two modules */}
          <div style={{ 
            display: 'flex', 
            gap: '60px',
            alignItems: 'flex-start'
          }}>
            <div 
              style={{
                flex: '1',
                maxWidth: '400px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '32px',
                borderLeft: '2px solid #333333',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderLeftColor = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderLeftColor = '#333333';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px',
                  opacity: 0.7
                }}>
                  [05]
                </div>
                <div style={{
                  color: '#00ff41',
                  fontSize: '12px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px'
                }}>
                  ACTIVE
                </div>
              </div>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                marginBottom: 16, 
                color: '#ffffff',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                AI_CORE
              </h3>
              <p style={{ 
                color: '#cccccc', 
                lineHeight: 1.6,
                fontFamily: '"Courier New", monospace',
                fontSize: '13px',
                opacity: 0.8,
                marginBottom: '16px'
              }}>
                Machine learning models generate smart scores and predictive trading insights
              </p>
              <div style={{
                fontSize: '11px',
                fontFamily: '"Courier New", monospace',
                color: '#666666',
                borderTop: '1px solid #222222',
                paddingTop: '12px'
              }}>
                MODEL: v2.7.4 • PREDICTIONS: 98.2K • CONFIDENCE: 91.8%
              </div>
            </div>
            
            <div 
              style={{
                flex: '1',
                maxWidth: '400px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '32px',
                borderLeft: '2px solid #333333',
                marginTop: '40px',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderLeftColor = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderLeftColor = '#333333';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px',
                  opacity: 0.7
                }}>
                  [06]
                </div>
                <div style={{
                  color: '#00ff41',
                  fontSize: '12px',
                  fontFamily: '"Courier New", monospace',
                  letterSpacing: '1px'
                }}>
                  ACTIVE
                </div>
              </div>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                marginBottom: 16, 
                color: '#ffffff',
                fontFamily: '"Courier New", monospace',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
                FILTER_MATRIX
              </h3>
              <p style={{ 
                color: '#cccccc', 
                lineHeight: 1.6,
                fontFamily: '"Courier New", monospace',
                fontSize: '13px',
                opacity: 0.8,
                marginBottom: '16px'
              }}>
                Advanced filtering system based on performance metrics and risk parameters
              </p>
              <div style={{
                fontSize: '11px',
                fontFamily: '"Courier New", monospace',
                color: '#666666',
                borderTop: '1px solid #222222',
                paddingTop: '12px'
              }}>
                FILTERS: 47 ACTIVE • PROCESSED: 2.8M • FALSE POSITIVE: 0.12%
              </div>
            </div>
          </div>
        </div>
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

export default LandingPage; 