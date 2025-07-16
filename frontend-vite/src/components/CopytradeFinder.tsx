import React, { useState } from 'react';

const CopytradeFinder: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!walletAddress.trim()) {
      setError('Please enter a wallet address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      // Simulate analysis delay
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Mock results
      setResults([
        {
          trader: "LUNARCc6FmA3hzPrwmXW3z6RNX1MYXhKS4opYoqCm9P",
          signature: "5KJp9X2m...",
          blockDelay: 2,
          botUsed: "Jupiter",
          feePaid: "0.001234",
          solBought: "0.5"
        },
        {
          trader: "vs1ongEMwP15z6RKykbUbWwAf8WXFKNTLkfEr5JN6K7",
          signature: "3mNq8vX...",
          blockDelay: 3,
          botUsed: "Raydium",
          feePaid: "0.000987",
          solBought: "0.3"
        },
        {
          trader: "BSfD6SHZigAfDWSjzD5Q41jw8LmKwtmjskPH9XW1mrRW",
          signature: "7hK2pL9...",
          blockDelay: 1,
          botUsed: "Manual",
          feePaid: "0.002156",
          solBought: "1.2"
        }
      ]);
    } catch (err) {
      setError('Analysis failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ 
      marginTop: isMobile ? 16 : 32, 
      maxWidth: isMobile ? '100%' : 800, 
      margin: isMobile ? '16px 0 0 0' : '32px auto 0', 
      padding: isMobile ? '0 4px' : '0 24px', 
      fontFamily: '"Courier New", monospace', 
      color: '#fff'
    }}>
      <h1 style={{ 
        color: '#cccccc', 
        marginBottom: 16, 
        fontSize: 24, 
        fontWeight: 700, 
        letterSpacing: '2px', 
        textTransform: 'uppercase', 
        fontFamily: 'inherit' 
      }}>
        &gt; COPYTRADE_FINDER
      </h1>
      
      <p style={{ 
        color: '#cccccc', 
        marginBottom: 24, 
        fontFamily: 'inherit', 
        fontSize: 14 
      }}>
        [ADVANCED_PATTERN_RECOGNITION_SYSTEM]
      </p>
        
      <div style={{ marginBottom: isMobile ? 20 : 32, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 12, alignItems: isMobile ? 'stretch' : 'center' }}>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter wallet address..."
          style={{ 
            padding: isMobile ? '6px 8px' : '8px 12px', 
            fontSize: isMobile ? 14 : 16, 
            border: '1px solid #00ff41', 
            borderRadius: 0, 
            background: '#111', 
            color: '#00ff41', 
            width: isMobile ? '100%' : 340, 
            fontFamily: 'inherit' 
          }}
          disabled={isLoading}
        />
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          style={{ 
            background: isLoading ? '#666' : '#00ff41', 
            color: isLoading ? '#ccc' : '#000', 
            border: 'none', 
            fontWeight: 700, 
            fontSize: isMobile ? 14 : 16, 
            padding: isMobile ? '6px 12px' : '8px 24px', 
            cursor: isLoading ? 'not-allowed' : 'pointer', 
            borderRadius: 0, 
            width: isMobile ? '100%' : undefined
          }}
        >
          {isLoading ? 'ANALYZING...' : 'ANALYZE'}
        </button>
      </div>

      {isLoading && (
        <div style={{ 
          background: 'rgba(0,255,65,0.04)', 
          border: '1px solid #00ff41', 
          borderRadius: 0, 
          padding: 24, 
          marginBottom: 24 
        }}>
          <div style={{ 
            color: '#00ff41', 
            fontFamily: 'inherit', 
            fontSize: 16, 
            fontWeight: 700, 
            marginBottom: 16,
            letterSpacing: '1px'
          }}>
            [ANALYSIS_IN_PROGRESS]
          </div>
          <div style={{ 
            background: '#222', 
            height: 8, 
            borderRadius: 0, 
            marginBottom: 16,
            overflow: 'hidden'
          }}>
            <div style={{ 
              background: 'linear-gradient(90deg, #00ff41, #00aa2e)',
              height: '100%',
              width: '60%',
              animation: 'pulse 2s infinite'
            }} />
          </div>
          <div style={{ 
            color: '#cccccc', 
            fontSize: 13,
            fontFamily: 'inherit'
          }}>
            Scanning blockchain for copytraders...
          </div>
        </div>
      )}

      {error && (
        <div style={{ 
          color: '#ff4d4f', 
          marginBottom: 24, 
          fontFamily: 'inherit',
          background: 'rgba(255,77,79,0.1)',
          border: '1px solid #ff4d4f',
          padding: 16,
          borderRadius: 0
        }}>
          [ERROR] {error}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ 
          background: 'rgba(0,255,65,0.04)', 
          border: '1px solid #00ff41', 
          borderRadius: 0, 
          padding: isMobile ? 12 : 24, 
          marginBottom: isMobile ? 20 : 32 
        }}>
          <b style={{ color: '#00ff41' }}>[COPYTRADER RESULTS]</b><br/>
          <div style={{ 
            marginTop: 16,
            color: '#fff', 
            fontFamily: 'inherit', 
            fontSize: 13
          }}>
            {results.map((result, index) => (
              <div key={index} style={{ 
                background: 'rgba(0,255,65,0.02)', 
                border: '1px solid #333', 
                marginBottom: 16,
                padding: 16,
                borderRadius: 0
              }}>
                <div style={{ 
                  color: '#00ff41', 
                  fontWeight: 'bold', 
                  marginBottom: 12,
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  COPYTRADER #{index + 1}: 
                  <span style={{ cursor: 'pointer', textDecoration: 'underline dotted' }}
                    title="Click to copy address"
                    onClick={() => copyToClipboard(result.trader)}
                  >
                    {`${result.trader.slice(0, 8)}...${result.trader.slice(-8)}`}
                  </span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? 8 : 12 }}>
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#888' }}>Signature:</span>{' '}
                      <span style={{ color: '#00ff41', fontFamily: '"Courier New", monospace' }}>
                        {result.signature}
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#888' }}>Block Delay:</span>{' '}
                      <span style={{ color: '#ffaa00' }}>
                        {result.blockDelay} blocks
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#888' }}>Bot Used:</span>{' '}
                      <span style={{ color: '#ff9800' }}>
                        {result.botUsed}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#888' }}>Fee Paid:</span>{' '}
                      <span style={{ color: '#f44336' }}>
                        {result.feePaid} SOL
                      </span>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ color: '#888' }}>SOL Bought:</span>{' '}
                      <span style={{ color: '#4caf50' }}>
                        {result.solBought} SOL
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ 
        color: '#cccccc', 
        fontSize: 15, 
        lineHeight: 1.7, 
        background: 'rgba(0,255,65,0.04)', 
        border: '1px solid #00ff41', 
        borderRadius: 0, 
        padding: 24, 
        marginBottom: 32 
      }}>
        <b style={{ color: '#00ff41' }}>[WHAT IS THIS?]</b><br/>
        The Copytrade Analyzer is an advanced pattern recognition system for Cypher. It analyzes blockchain transactions to identify wallets that copy successful traders, providing insights into trading patterns and behaviors. <br/><br/>
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
};

export default CopytradeFinder; 