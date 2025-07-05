// Version 2.0 - Fixed crashes and added comprehensive error handling
import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

interface CopytradeResult {
  trader_address?: string;
  signature?: string;
  block_delay?: number;
  bot_used?: string;
}

interface Progress {
  current: number;
  total: number;
  label: string;
}

const CopytradeFinder: React.FC = () => {
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [results, setResults] = useState<CopytradeResult[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);

  // Always enable the feature for testing
  const isLocal = true;

  const ProgressBarTerminal: React.FC<{ progress: number; total: number; label: string }> = ({ 
    progress, 
    total, 
    label 
  }) => {
    const percentage = Math.min((progress / total) * 100, 100);
    const filledWidth = Math.max(0, Math.min(percentage, 100));
    
    return (
      <div style={{ width: '100%', marginBottom: 8 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: 4,
          fontSize: '12px',
          color: '#00ff41'
        }}>
          <span>{label || 'Processing...'}</span>
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

  const resetState = useCallback(() => {
    setError(null);
    setStatus(null);
    setResults([]);
    setProgress(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!wallet?.trim()) {
      setError('Please enter a wallet address');
      return;
    }
    
    setLoading(true);
    resetState();

    let progressInterval: NodeJS.Timeout | null = null;

    try {
      // Determine API URL
      const apiUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8001' 
        : 'https://solensai-production.up.railway.app';
      
      console.log('[COPYTRADE] Starting analysis for wallet:', wallet);
      console.log('[COPYTRADE] Using API URL:', apiUrl);
      
      // Start progress simulation
      setProgress({ current: 0, total: 100, label: 'INITIALIZING_ANALYSIS' });
      
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (!prev) return null;
          const newCurrent = Math.min(prev.current + Math.random() * 10 + 5, 90);
          let newLabel = 'PROCESSING';
          
          if (newCurrent < 20) newLabel = 'FINDING_BUY_TRANSACTIONS';
          else if (newCurrent < 40) newLabel = 'SCANNING_BLOCKS';
          else if (newCurrent < 60) newLabel = 'ANALYZING_COPYTRADERS';
          else if (newCurrent < 80) newLabel = 'DETECTING_BOTS';
          else newLabel = 'FINALIZING_RESULTS';
          
          return { current: newCurrent, total: 100, label: newLabel };
        });
      }, 800);
      
      // Make API call with timeout
      const response = await axios.post(
        `${apiUrl}/copytrade-analyze`, 
        { wallet_address: wallet },
        { timeout: 30000 } // 30 second timeout
      );
      
      console.log('[COPYTRADE] Response received:', response);
      
      // Clear progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      // Complete progress
      setProgress({ current: 100, total: 100, label: 'ANALYSIS_COMPLETE' });
      
      // Process response safely
      const responseData = response?.data;
      console.log('[COPYTRADE] Processing response data:', responseData);
      
      if (!responseData) {
        throw new Error('No data received from server');
      }
      
      // Handle different response formats
      let processedResults: CopytradeResult[] = [];
      
      if ((responseData as any)?.status === 'feature_in_development') {
        setError('Feature is under development. Please try again later.');
        return;
      }
      
      // Extract results array safely
      if (Array.isArray(responseData)) {
        processedResults = responseData;
      } else if ((responseData as any)?.results && Array.isArray((responseData as any).results)) {
        processedResults = (responseData as any).results;
      } else if ((responseData as any)?.results && typeof (responseData as any).results === 'object') {
        processedResults = [(responseData as any).results];
      } else {
        processedResults = [];
      }
      
      // Validate results structure
      const validResults = processedResults.filter(result => 
        result && typeof result === 'object'
      );
      
      console.log('[COPYTRADE] Processed results:', validResults);
      
      setResults(validResults);
      setStatus(`Analysis complete. Found ${validResults.length} potential copytraders.`);
      
    } catch (err: any) {
      console.error('[COPYTRADE] Error during analysis:', err);
      
      // Clear progress interval on error
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      
      setProgress(null);
      
      // Handle different error types
      let errorMessage = 'An error occurred during analysis.';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.response?.status === 404) {
        errorMessage = 'API endpoint not found. Please check the server.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
    } finally {
      setLoading(false);
      
      // Clear progress after delay
      setTimeout(() => {
        setProgress(null);
      }, 2000);
    }
  }, [wallet, resetState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setLoading(false);
      resetState();
    };
  }, [resetState]);

  const handleWalletChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setWallet(e.target.value);
    if (error) setError(null); // Clear error when user starts typing
  }, [error]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading && wallet.trim()) {
      handleAnalyze();
    }
  }, [handleAnalyze, loading, wallet]);

  return (
    <div style={{ 
      marginTop: 32, 
      maxWidth: 900, 
      margin: '32px auto 0', 
      padding: '0 24px', 
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
      
      {/* Input Section */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={wallet}
          onChange={handleWalletChange}
          onKeyPress={handleKeyPress}
          placeholder="Enter wallet address to analyze"
          disabled={loading}
          style={{
            background: '#000',
            color: '#00ff41',
            fontFamily: '"Courier New", monospace',
            border: '1px solid #00ff41',
            borderRadius: 0,
            padding: '10px 16px',
            fontSize: 16,
            minWidth: 340,
            outline: 'none',
            flex: 1,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'text'
          }}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !wallet.trim()}
          style={{ 
            padding: '12px 24px', 
            borderRadius: 0, 
            border: '1px solid #00ff41', 
            background: loading ? '#222' : '#000', 
            color: loading ? '#666' : '#00ff41', 
            fontWeight: 700, 
            fontFamily: 'inherit', 
            fontSize: 14, 
            cursor: loading || !wallet.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !wallet.trim() ? 0.7 : 1
          }}
        >
          {loading ? '[ANALYZING...]' : '> ANALYZE'}
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <div style={{ 
          color: '#ff6b6b', 
          marginBottom: 16, 
          fontFamily: 'inherit', 
          padding: 12, 
          border: '1px solid #ff6b6b', 
          background: 'rgba(255, 107, 107, 0.1)', 
          fontSize: 14 
        }}>
          [ERROR] {error}
        </div>
      )}
      
      {/* Progress Bar */}
      {progress && (
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
      
      {/* Status Message */}
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
          [STATUS] {status}
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && !loading && (
        <div style={{ width: '100%', marginBottom: 32 }}>
          <div style={{ 
            marginBottom: 16, 
            color: '#00ff41', 
            fontFamily: 'inherit', 
            fontSize: 14,
            fontWeight: 600 
          }}>
            [RESULTS] {results.length} copytraders detected
          </div>
          
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            color: '#fff', 
            fontFamily: 'inherit', 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid #333333' 
          }}>
            <thead style={{ background: 'rgba(0, 255, 65, 0.1)' }}>
              <tr>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  color: '#00ff41', 
                  borderBottom: '1px solid #333333' 
                }}>
                  Trader
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  color: '#00ff41', 
                  borderBottom: '1px solid #333333' 
                }}>
                  Signature
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  color: '#00ff41', 
                  borderBottom: '1px solid #333333' 
                }}>
                  Block Delay
                </th>
                <th style={{ 
                  padding: '12px', 
                  textAlign: 'left', 
                  color: '#00ff41', 
                  borderBottom: '1px solid #333333' 
                }}>
                  Bot Used
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #333333' }}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #333333' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {result?.trader_address 
                        ? `${result.trader_address.slice(0, 4)}...${result.trader_address.slice(-4)}`
                        : 'N/A'
                      }
                    </span>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #333333' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {result?.signature 
                        ? `${result.signature.slice(0, 8)}...${result.signature.slice(-8)}`
                        : 'N/A'
                      }
                    </span>
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #333333' }}>
                    {result?.block_delay ?? 'N/A'}
                  </td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #333333' }}>
                    {result?.bot_used || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* No Results Message */}
      {!loading && results.length === 0 && status && (
        <div style={{ 
          padding: 16, 
          background: 'rgba(255, 255, 255, 0.05)', 
          color: '#cccccc', 
          borderRadius: 0, 
          fontSize: 14, 
          border: '1px solid #333333',
          fontFamily: '"Courier New", monospace',
          textAlign: 'center'
        }}>
          No copytraders detected for this wallet.
        </div>
      )}
    </div>
  );
};

export default CopytradeFinder; 