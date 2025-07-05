import React from 'react';

const CopytradeFinder: React.FC = () => {
  return (
    <div style={{ marginTop: 32, maxWidth: 800, margin: '32px auto 0', padding: '0 24px', fontFamily: '"Courier New", monospace', color: '#fff' }}>
      <h1 style={{ color: '#cccccc', marginBottom: 16, fontSize: 24, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'inherit' }}>&gt; COPYTRADE_FINDER</h1>
      <p style={{ color: '#cccccc', marginBottom: 24, fontFamily: 'inherit', fontSize: 14 }}>[ADVANCED_PATTERN_RECOGNITION_SYSTEM]</p>
      <div style={{ color: '#cccccc', fontWeight: 600, fontSize: 16, marginTop: 32, fontFamily: 'inherit', marginBottom: 32 }}>[COPYTRADE ANALYZER MODULE]</div>
      <div style={{ color: '#cccccc', fontSize: 15, lineHeight: 1.7, background: 'rgba(0,255,65,0.04)', border: '1px solid #00ff41', borderRadius: 0, padding: 24, marginBottom: 32 }}>
        <b style={{ color: '#00ff41' }}>[WHAT IS THIS?]</b><br/>
        The Copytrade Analyzer is an advanced pattern recognition system for Cipher. It analyzes blockchain transactions to identify wallets that copy successful traders, providing insights into trading patterns and behaviors. <br/><br/>
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