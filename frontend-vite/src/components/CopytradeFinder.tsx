import React from 'react';

import { API_ENDPOINTS } from '../config';

// CopytradeFinder - Feature Under Development v2.0

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
  return (
    <div style={retroBox}>
      <div style={{ fontWeight: 'bold', fontSize: '1.5em', marginBottom: 16 }}>&gt; COPYTRADE_FINDER</div>
      <div style={{ marginBottom: 24, color: '#00ff41', opacity: 0.8, fontSize: '1em' }}>
        [ADVANCED_PATTERN_RECOGNITION_SYSTEM]
      </div>
      
      {/* EMERGENCY CACHE CLEAR TEST - Feature Under Development Message */}
      <div style={{ 
        border: '4px solid #ff0000', 
        borderRadius: 12, 
        padding: '32px', 
        margin: '24px 0',
        background: '#330000',
        color: '#ff0000',
        textAlign: 'center',
        fontSize: '1.5em',
        fontWeight: 'bold',
        boxShadow: '0 0 20px #ff0000'
      }}>
        <div style={{ fontSize: '2.5em', marginBottom: '16px' }}>🚨 ON THE WORKS 🚨</div>
        <div style={{ marginBottom: '12px', fontSize: '1.3em' }}>COPYTRADE ANALYZER IS UNDER DEVELOPMENT</div>
        <div style={{ fontSize: '1em', opacity: 0.9, color: '#ffaaaa' }}>
          This feature is currently being enhanced with advanced blockchain analysis capabilities.
          <br />Check back soon for the full copy trader detection system!
          <br /><strong>Version: 2024-07-04 CACHE_CLEAR_TEST</strong>
        </div>
      </div>
      
      {/* Disabled Input Fields */}
      <input
        style={{
          ...inputStyle,
          opacity: 0.5,
          cursor: 'not-allowed',
          backgroundColor: '#0f1114'
        }}
        type="text"
        placeholder="Feature coming soon..."
        disabled={true}
        readOnly
      />
      <button 
        style={{
          ...buttonStyle,
          opacity: 0.5,
          cursor: 'not-allowed',
          backgroundColor: '#0f1114'
        }} 
        disabled={true}
      >
        DISABLED
      </button>
      
      <div style={{ 
        color: '#666', 
        marginTop: 24, 
        fontSize: '0.9em',
        fontStyle: 'italic',
        textAlign: 'center'
      }}>
        💡 Meanwhile, explore our other powerful features: Smart Wallet Discovery and AI Analysis!
      </div>
    </div>
  );
};

export default CopytradeFinder; 