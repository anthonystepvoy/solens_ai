import React, { useState } from 'react';
import axios from 'axios';

const CopytradeFinder: React.FC = () => {
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [progress, setProgress] = useState<{current: number, total: number, label: string} | null>(null);

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const ProgressBarTerminal: React.FC<{ progress: number; total: number; label: string }> = ({ progress, total, label }) => {
    const percentage = (progress / total) * 100;
    const filledWidth = Math.min(percentage, 100);
    
    return (
      <div style={{ width: '100%', marginBottom: 8 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: 4,
          fontSize: '12px',
          color: '#00ff41'
        }}>
          <span>{label}</span>
          <span>{Math.round(percentage)}%</span>
        </div>
        <div style={{ 
          width: '100%', 
          height: 8, 
          backgroundColor: '#1a1a1a', 
          borderRadius: 4,
          overflow: 'hidden',
          border: '1px solid #00ff41'
        }}>
          <div style={{ 
            width: `${filledWidth}%`, 
            height: '100%', 
            backgroundColor: '#00ff41',
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    );
  };

  const handleAnalyze = async () => {
    if (!wallet.trim()) return;
    
    setLoading(true);
    setError('');
    setStatus(null);
    setResults([]);
    setProgress(null);

    try {
      const apiUrl = isLocal ? 'http://localhost:8001' : 'https://solensai-production.up.railway.app';
      
      // Start progress tracking with simulation
      setProgress({current: 0, total: 100, label: 'INITIALIZING_ANALYSIS'});
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (!prev) return null;
          const newCurrent = Math.min(prev.current + Math.random() * 15, 90);
          let newLabel = prev.label;
          
          if (newCurrent < 20) newLabel = 'FINDING_BUY_TRANSACTIONS';
          else if (newCurrent < 40) newLabel = 'SCANNING_BLOCKS';
          else if (newCurrent < 60) newLabel = 'ANALYZING_COPYTRADERS';
          else if (newCurrent < 80) newLabel = 'DETECTING_BOTS';
          else newLabel = 'FINALIZING_RESULTS';
          
          return {current: newCurrent, total: 100, label: newLabel};
        });
      }, 500);
      
      const response = await axios.post(`${apiUrl}/copytrade-analyze`, { wallet_address: wallet });
      
      // Clear progress simulation
      clearInterval(progressInterval);
      setProgress({current: 100, total: 100, label: 'ANALYSIS_COMPLETE'});
      
      // Handle different response formats
      if ((response.data as any).status === 'feature_in_development') {
        setError('Feature is under development on the live site. Use local development for testing.');
        return;
      }
      
      const results = (response.data as any).results || response.data || [];
      setResults(Array.isArray(results) ? results : []);
      setStatus(`[ANALYSIS_COMPLETE] Found ${results.length} potential copytraders.`);
    } catch (err: any) {
      console.error('Copytrade analysis error:', err);
      setError(err.response?.data || err.message || 'Error analyzing wallet.');
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(null), 2000); // Keep progress bar for 2 seconds after completion
    }
  };

  return (
    <div style={{ marginTop: 32, maxWidth: 900, margin: '32px auto 0', padding: '0 24px', fontFamily: '"Courier New", monospace', color: '#fff' }}>
      <h1 style={{ color: '#cccccc', marginBottom: 16, fontSize: 24, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'inherit' }}>&gt; COPYTRADE_FINDER</h1>
      <p style={{ color: '#cccccc', marginBottom: 24, fontFamily: 'inherit', fontSize: 14 }}>[ADVANCED_PATTERN_RECOGNITION_SYSTEM]</p>
      
      {/* Show development notice if not local */}
      {!isLocal && (
        <div style={{ 
          border: '2px solid #00ff41', 
          borderRadius: 0, 
          padding: '24px', 
          margin: '24px 0',
          background: 'rgba(0, 0, 0, 0.6)',
          color: '#00ff41',
          fontFamily: '"Courier New", monospace'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#00ff41' }}>
            [COPYTRADE_ANALYZER MODULE]
          </div>
          
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#00ff41' }}>
            [WHAT IS THIS?]
          </div>
          <div style={{ fontSize: '14px', marginBottom: '20px', color: '#cccccc', lineHeight: '1.6' }}>
            The Copytrade Analyzer is an advanced pattern recognition system for Cipher. It analyzes blockchain transactions to identify wallets that copy successful traders, providing insights into trading patterns and behaviors.
          </div>
          
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#00ff41' }}>
            [WHAT DOES IT DO?]
          </div>
          <div style={{ fontSize: '14px', marginBottom: '20px', color: '#cccccc' }}>
            - Detects copy trading patterns by analyzing transaction timing.<br />
            - Identifies wallets that follow successful traders.<br />
            - Provides detailed analytics on copy trading behaviors.<br />
            - Exports results in CSV/JSON format for further analysis.<br />
            - Integrates with the main wallet discovery system.
          </div>
          
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', color: '#00ff41' }}>
            [COMING SOON]
          </div>
          <div style={{ fontSize: '14px', color: '#cccccc', lineHeight: '1.6' }}>
            Advanced blockchain analysis capabilities are currently being enhanced. Check back soon for the full copy trader detection system.
          </div>
        </div>
      )}
      
      {/* Working interface for local development */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={wallet}
          onChange={e => setWallet(e.target.value)}
          placeholder={isLocal ? "Enter wallet address to analyze" : "Feature coming soon..."}
          disabled={!isLocal || loading}
          style={{
            background: isLocal ? '#000' : '#0f1114',
            color: isLocal ? '#00ff41' : '#666', 
            fontFamily: '"Courier New", monospace',
            border: `1px solid ${isLocal ? '#00ff41' : '#333'}`,
            borderRadius: 0,
            padding: '10px 16px',
            fontSize: 16,
            minWidth: 340,
            outline: 'none',
            flex: 1,
            opacity: isLocal ? 1 : 0.5,
            cursor: isLocal && !loading ? 'text' : 'not-allowed'
          }}
        />
        <button
          onClick={handleAnalyze}
          disabled={!isLocal || loading || !wallet}
          style={{ 
            padding: '12px 24px', 
            borderRadius: 0, 
            border: `1px solid ${isLocal ? '#00ff41' : '#333'}`, 
            background: isLocal ? (loading ? '#222' : '#000') : '#0f1114', 
            color: isLocal ? (loading ? '#666' : '#00ff41') : '#666', 
            fontWeight: 700, 
            fontFamily: 'inherit', 
            fontSize: 14, 
            cursor: isLocal && !loading && wallet ? 'pointer' : 'not-allowed',
            opacity: isLocal ? 1 : 0.5
          }}
        >
          {loading ? '[SCANNING...]' : isLocal ? '> SEARCH' : 'DISABLED'}
        </button>
      </div>
      
      {/* Status and Error Messages */}
      {error && <div style={{ color: '#ff6b6b', marginBottom: 16, fontFamily: 'inherit', padding: 12, border: '1px solid #ff6b6b', background: 'rgba(255, 107, 107, 0.1)', fontSize: 14 }}>{error}</div>}
      
      {/* Progress Bar */}
      {loading && progress && (
        <div style={{ 
          marginBottom: 16, 
          padding: 16, 
          background: 'rgba(0, 255, 65, 0.05)', 
          border: '1px solid #00ff41',
          borderRadius: 0,
          fontFamily: '"Courier New", monospace'
        }}>
          <ProgressBarTerminal 
            progress={progress.current} 
            total={progress.total} 
            label={progress.label}
          />
          <div style={{ 
            color: '#00ff41', 
            fontSize: 12, 
            marginTop: 8, 
            textAlign: 'center',
            fontFamily: '"Courier New", monospace'
          }}>
            [ANALYZING_BLOCKCHAIN_TRANSACTIONS]
          </div>
        </div>
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

      {/* Results Table */}
      {results.length > 0 && !loading && (
        <div style={{ width: '100%', marginBottom: 32 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff', fontFamily: 'inherit', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid #333333' }}>
            <thead style={{ background: 'rgba(0, 255, 65, 0.1)' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>Trader</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>Signature</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>Block Delay</th>
                <th style={{ padding: '12px', textAlign: 'left', color: '#00ff41', borderBottom: '1px solid #333333' }}>Bot Used</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #333333' }}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #333333' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {result.trader_address ? `${result.trader_address.slice(0, 4)}...${result.trader_address.slice(-4)}` : 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #333333' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {result.signature ? `${result.signature.slice(0, 8)}...${result.signature.slice(-8)}` : 'N/A'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #333333' }}>
                    {result.block_delay || 'N/A'}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #333333' }}>
                    {result.bot_used || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CopytradeFinder; 