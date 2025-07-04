import React, { useState } from 'react';

import { API_ENDPOINTS } from '../config';

const retroBox: React.CSSProperties = {
  border: '2px solid #00ff41',
  borderRadius: 8,
  padding: '32px',
  margin: '40px auto',
  maxWidth: 700,
  background: '#181c24',
  color: '#00ff41',
  fontFamily: 'Courier New, monospace',
  fontSize: '1.1em',
  letterSpacing: 1,
};

const inputStyle: React.CSSProperties = {
  background: '#181c24',
  color: '#00ff41',
  border: '2px solid #00ff41',
  borderRadius: 4,
  padding: '8px 16px',
  fontFamily: 'Courier New, monospace',
  fontSize: '1em',
  marginRight: 12,
};

const buttonStyle: React.CSSProperties = {
  background: '#181c24',
  color: '#00ff41',
  border: '2px solid #00ff41',
  borderRadius: 4,
  padding: '8px 24px',
  fontFamily: 'Courier New, monospace',
  fontWeight: 'bold',
  cursor: 'pointer',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  marginTop: 24,
};
const thStyle: React.CSSProperties = {
  borderBottom: '2px solid #00ff41',
  padding: '8px',
  textAlign: 'left',
};
const tdStyle: React.CSSProperties = {
  borderBottom: '1px solid #00ff41',
  padding: '8px',
};

const CopytradeFinder: React.FC = () => {
  const [wallet, setWallet] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setSearched(false);
    try {
      const res = await fetch(API_ENDPOINTS.COPYTRADE_ANALYZE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: wallet.trim() }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'API error');
      }
      const data = await res.json();
      setResults(data.results || []);
      setSearched(true);
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={retroBox}>
      <div style={{ fontWeight: 'bold', fontSize: '1.5em', marginBottom: 16 }}>&gt; COPYTRADE_FINDER</div>
      <div style={{ marginBottom: 24, color: '#00ff41', opacity: 0.8, fontSize: '1em' }}>
        [ADVANCED_PATTERN_RECOGNITION_SYSTEM]
      </div>
      <input
        style={inputStyle}
        type="text"
        placeholder="Enter wallet address..."
        value={wallet}
        onChange={e => setWallet(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
        disabled={loading}
      />
      <button style={buttonStyle} onClick={handleSearch} disabled={loading || !wallet.trim()}>
        {loading ? 'SEARCHING...' : '> SEARCH'}
      </button>
      {error && <div style={{ color: '#ff4141', marginTop: 24, fontWeight: 'bold' }}>[ERROR] {error}</div>}
      {searched && !loading && results.length === 0 && !error && (
        <div style={{ color: '#00ff41', marginTop: 24, fontWeight: 'bold', border: '1px solid #00ff41', borderRadius: 4, padding: 16 }}>
          [ANALYSIS_COMPLETE] No new copytrade patterns identified in this run.
        </div>
      )}
      {results.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 12 }}>[ANALYSIS_COMPLETE] Copytrader patterns found:</div>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Trader</th>
                <th style={thStyle}>Signature</th>
                <th style={thStyle}>Block Delay</th>
                <th style={thStyle}>Bot Used</th>
                <th style={thStyle}>Fee Paid</th>
                <th style={thStyle}>SOL Bought</th>
                <th style={thStyle}>Profit/PNL</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{row.Trader || row.trader || '-'}</td>
                  <td style={tdStyle}>{row.Signature || row.signature || '-'}</td>
                  <td style={tdStyle}>{row['Block Delay'] || row.blockDelay || '-'}</td>
                  <td style={tdStyle}>{row['Bot Used'] || row.botUsed || '-'}</td>
                  <td style={tdStyle}>{row['Fee Paid'] || row.feePaid || '-'}</td>
                  <td style={tdStyle}>{row['SOL Spent'] || row.solAmountBought || '-'}</td>
                  <td style={tdStyle}>{row['Profit/USD'] || row.profitPNL || '-'}</td>
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