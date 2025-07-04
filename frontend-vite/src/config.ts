// API Configuration
const API_BASE_URL = 'https://solensai-production.up.railway.app';

export const API_ENDPOINTS = {
  DASHBOARD_SUMMARY: `${API_BASE_URL}/dashboard-summary`,
  TOP_TOKENS: `${API_BASE_URL}/top-tokens`,
  LATEST_MINUTE_RANK: `${API_BASE_URL}/tokens/latest-minute-rank`,
  WALLETS: `${API_BASE_URL}/wallets`,
  COPYTRADE_ANALYZE: `${API_BASE_URL}/copytrade-analyze`,
  TOKEN: (address: string) => `${API_BASE_URL}/token/${address}`,
  WALLET: (address: string) => `${API_BASE_URL}/wallet/${address}`,
};

export default API_BASE_URL; 