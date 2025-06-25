import React, { useState } from 'react';
import axios from 'axios';

const CopytradeFinder: React.FC = () => {
  const [wallet, setWallet] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async () => {
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const response = await axios.post('/copytrade-analyze', { wallet_address: wallet });
      if (response.data && response.data.results) {
        setResults(response.data.results);
      } else {
        setError('No results found.');
      }
    } catch (err: any) {
      setError('Error analyzing wallet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <h2>Copytrade Finder</h2>
      <p>Analyze a wallet to find copy traders here.</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          value={wallet}
          onChange={e => setWallet(e.target.value)}
          placeholder="Enter wallet address"
          style={{ flex: 1, padding: 8, borderRadius: 4, border: '1px solid #444', background: '#181c24', color: '#fff' }}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !wallet}
          style={{ padding: '8px 20px', borderRadius: 4, border: 'none', background: '#3399ff', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      {results.length > 0 && (
        <div style={{ margin: '16px 0', fontWeight: 'bold', fontSize: '1.1em' }}>
          This wallet has {results.length} possible copytrader{results.length !== 1 ? 's' : ''}!
        </div>
      )}
      {results.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181c24', color: '#fff' }}>
            <thead>
              <tr>
                <th style={thStyle}>Trader</th>
                <th style={thStyle}>Signature</th>
                <th style={thStyle}>Block Delay</th>
                <th style={thStyle}>Bot Used</th>
                <th style={thStyle}>Tx Processor/Fee Wallet</th>
                <th style={thStyle}>Fee Paid</th>
                <th style={thStyle}>SOL Bought</th>
                <th style={thStyle}>Profit/USD</th>
                <th style={thStyle}>Profit/%</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row, idx) => (
                <tr key={idx}>
                  <td style={tdStyle}>{row['Trader']}</td>
                  <td style={tdStyle}>{row['Signature']}</td>
                  <td style={tdStyle}>{row['Block Delay']}</td>
                  <td style={tdStyle}>{row['Bot Used']}</td>
                  <td style={tdStyle}>{row['Tx Processor/Fee Wallet']}</td>
                  <td style={tdStyle}>{row['Fee Paid']}</td>
                  <td style={tdStyle}>{row['SOL Bought']}</td>
                  <td style={tdStyle}>{row['Profit/USD'] ?? 'N/A'}</td>
                  <td style={tdStyle}>{row['Profit/%'] ?? 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#23293a',
  borderBottom: '2px solid #333',
  textAlign: 'left',
};
const tdStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #222',
};

export default CopytradeFinder; 