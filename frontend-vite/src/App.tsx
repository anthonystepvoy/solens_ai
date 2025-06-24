import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import TableChartIcon from '@mui/icons-material/TableChart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import MemoryIcon from '@mui/icons-material/Memory';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Slider from '@mui/material/Slider';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import Stack from '@mui/material/Stack';
import axios from 'axios';
import { DataGrid } from '@mui/x-data-grid';
import type { GridColDef } from '@mui/x-data-grid';
import solensLogo from '../assets/solens-logo-white.png';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/700.css';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinearProgress from '@mui/material/LinearProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Tooltip from '@mui/material/Tooltip';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Fade from '@mui/material/Fade';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Paper from '@mui/material/Paper';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import Hero3DBackground from './assets/Hero3DBackground';

const drawerWidth = 220;

// Add WalletAddress component at the top (after imports)
function WalletAddress({ address, short = false }: { address: string, short?: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const display = short && address.length > 12 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address;
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <span
      style={{ cursor: 'pointer', userSelect: 'all', color: '#42a5f5', fontWeight: 500, position: 'relative' }}
      onClick={handleCopy}
      title="Click to copy"
    >
      {display}
      {copied && (
        <span style={{ marginLeft: 8, color: '#42a5f5', fontWeight: 600, fontSize: 14, background: '#232b3a', borderRadius: 4, padding: '2px 6px', position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)' }}>Copied!</span>
      )}
    </span>
  );
}

function DashboardPage() {
  // State for dashboard data
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [metrics, setMetrics] = React.useState<any[]>([]);
  const [topWallets, setTopWallets] = React.useState<any[]>([]);
  const [onFireWallets, setOnFireWallets] = React.useState<any[]>([]);
  const [trendingTokens, setTrendingTokens] = React.useState<any[]>([]);
  const [mlTags, setMlTags] = React.useState<string[]>([]);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailWalletId, setDetailWalletId] = React.useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = React.useState<string | null>(null);
  const [nextUpdate, setNextUpdate] = React.useState<string | null>(null);
  // Add state for copied wallet
  const [copiedWallet, setCopiedWallet] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:8000/dashboard-summary')
      .then(res => {
        const d = res.data;
        setMetrics(d.metrics || []);
        setTopWallets(d.topWallets || []);
        setOnFireWallets(d.onFireWallets || []);
        setTrendingTokens(d.trendingTokens || []);
        setMlTags(d.mlTags || []);
        setLoading(false);
        // Try to get last update info if present
        if (d.lastUpdate) setLastUpdate(d.lastUpdate);
        // Calculate next update (assume hourly for now)
        if (d.lastUpdate) {
          const last = new Date(d.lastUpdate);
          const next = new Date(last.getTime() + 60 * 60 * 1000);
          const now = new Date();
          const diff = Math.max(0, next.getTime() - now.getTime());
          const min = Math.floor(diff / 60000);
          setNextUpdate(min > 0 ? `in ${min} min` : 'soon');
        } else {
          setNextUpdate(null);
        }
      })
      .catch(() => {
        // Fallback to mock data
        setMetrics([
          { label: 'Total Wallets Tracked', value: '1,452' },
          { label: 'New Wallets Today', value: '+56' },
          { label: 'Total PnL Tracked', value: '$1.2M' },
          { label: 'Most Profitable Token (24h)', value: '$WIF' },
        ]);
        setTopWallets([
          { address: '3AFgYGwEFZ27QGQzGGVL...', pnl: '120,000', winRate: '92%', smartScore: 98 },
          { address: '7iW5tkdAnR3LjoEkxqmF...', pnl: '110,000', winRate: '88%', smartScore: 95 },
          { address: '5hWMw6Krhc2Bf1e2SM3g...', pnl: '95,000', winRate: '85%', smartScore: 93 },
          { address: 'Qws8DG9HEPsgZB9AmCcw...', pnl: '80,000', winRate: '90%', smartScore: 91 },
          { address: 'Bbv4mbAAy4o71z1VogHs...', pnl: '75,000', winRate: '87%', smartScore: 90 },
        ]);
        setOnFireWallets([
          { address: '3AFgYGwEFZ27QGQzGGVL...', pnl: '12,000', trades: 14 },
          { address: '7iW5tkdAnR3LjoEkxqmF...', pnl: '11,000', trades: 12 },
          { address: '5hWMw6Krhc2Bf1e2SM3g...', pnl: '9,500', trades: 10 },
          { address: 'Qws8DG9HEPsgZB9AmCcw...', pnl: '8,000', trades: 9 },
          { address: 'Bbv4mbAAy4o71z1VogHs...', pnl: '7,500', trades: 8 },
        ]);
        setTrendingTokens([
          { token: '$WIF', volume: 120000 },
          { token: '$BONK', volume: 95000 },
          { token: '$SOL', volume: 87000 },
          { token: '$JUP', volume: 65000 },
          { token: '$DOG', volume: 54000 },
        ]);
        setMlTags(['Pro Trader', 'Meme Coin Sniper', 'High Volume', 'Long-Term Holder', 'Scalper']);
        setLoading(false);
        setError('Failed to load live dashboard data. Showing mock data.');
        setLastUpdate(null);
        setNextUpdate(null);
      });
  }, []);

  // Helper for relative time
  function getRelativeTime(iso: string | null) {
    if (!iso) return 'unknown';
    const now = new Date();
    const then = new Date(iso);
    const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
    if (diff < 60) return `${diff} seconds ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return then.toUTCString();
  }

  return (
    <Container sx={{ mt: 4, position: 'relative' }}>
      {/* Floating Info Bar */}
      <Box sx={{
        position: 'fixed',
        top: 24,
        right: 32,
        zIndex: 10,
        minWidth: 320,
        maxWidth: 420,
        bgcolor: '#26304a',
        color: '#e3f2fd',
        borderRadius: 2,
        border: '1px solid #3a4663',
        boxShadow: 6,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        fontSize: 15,
        alignItems: 'flex-start',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <InfoOutlinedIcon sx={{ color: '#42a5f5', mr: 1 }} />
          <span style={{ fontWeight: 600, color: '#b3e5fc', fontSize: 15 }}>Auto-updates every hour</span>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, fontSize: 14 }}>
          <span><b>Last update:</b> <span style={{ color: '#fff' }}>{getRelativeTime(lastUpdate)}</span> <span style={{ color: '#b0bec5', fontSize: 13, marginLeft: 6 }}>({lastUpdate ? new Date(lastUpdate).toUTCString() : 'unknown'})</span></span>
          <span><b>Next update:</b> <span style={{ color: '#fff' }}>{nextUpdate || 'unknown'}</span></span>
        </Box>
      </Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Fade in timeout={600}>
          <Box>
            {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
            {/* Key Metrics Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {metrics.map((m, i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Fade in timeout={400 + i * 100}>
                    <Card sx={{ bgcolor: '#181f2a', color: '#fff', borderRadius: 3, boxShadow: 3 }}>
                      <CardContent>
                        <Tooltip title={m.label} arrow>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>{m.value}</Typography>
                        </Tooltip>
                        <Typography variant="body2" color="grey.400">{m.label}</Typography>
                      </CardContent>
                    </Card>
                  </Fade>
                </Grid>
              ))}
            </Grid>
            <Grid container spacing={4}>
              {/* Leaderboards */}
              <Grid item xs={12} md={6}>
                <Fade in timeout={700}>
                  <Card sx={{ bgcolor: '#181f2a', color: '#fff', borderRadius: 3, boxShadow: 3, mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>Top 5 Most Profitable Wallets (All Time)</Typography>
                      <table style={{ width: '100%', color: '#fff', fontSize: 15 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: 6 }}>Wallet</th>
                            <th style={{ textAlign: 'right', padding: 6 }}>PnL</th>
                            <th style={{ textAlign: 'right', padding: 6 }}>Win Rate</th>
                            <th style={{ textAlign: 'right', padding: 6 }}>Smart Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topWallets.map((w, i) => (
                            <tr key={i}
                              style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                              onClick={() => {
                                navigator.clipboard.writeText(w.address);
                                setCopiedWallet(w.address);
                                setTimeout(() => setCopiedWallet(null), 1200);
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#232b3a'}
                              onMouseLeave={e => e.currentTarget.style.background = ''}
                            >
                              <td style={{ textAlign: 'left', padding: 6, position: 'relative' }}>
                                <WalletAddress address={w.address} short />
                              </td>
                              <td style={{ textAlign: 'right', padding: 6 }}>{w.pnl}</td>
                              <td style={{ textAlign: 'right', padding: 6 }}>{w.winRate}</td>
                              <td style={{ textAlign: 'right', padding: 6 }}>{w.smartScore}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </Fade>
                <Fade in timeout={900}>
                  <Card sx={{ bgcolor: '#181f2a', color: '#fff', borderRadius: 3, boxShadow: 3 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>Top 5 "On Fire" Wallets (24h)</Typography>
                      <table style={{ width: '100%', color: '#fff', fontSize: 15 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: 6 }}>Wallet</th>
                            <th style={{ textAlign: 'right', padding: 6 }}>PnL (24h)</th>
                            <th style={{ textAlign: 'right', padding: 6 }}>Trades</th>
                          </tr>
                        </thead>
                        <tbody>
                          {onFireWallets.map((w, i) => (
                            <tr key={i} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => {
                              navigator.clipboard.writeText(w.address);
                              setCopiedWallet(w.address);
                              setTimeout(() => setCopiedWallet(null), 1200);
                            }} onMouseEnter={e => e.currentTarget.style.background='#232b3a'} onMouseLeave={e => e.currentTarget.style.background=''}>
                              <td style={{ textAlign: 'left', padding: 6, position: 'relative' }}>
                                <WalletAddress address={w.address} short />
                              </td>
                              <td style={{ textAlign: 'right', padding: 6 }}>{w.pnl}</td>
                              <td style={{ textAlign: 'right', padding: 6 }}>{w.trades}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
              {/* Market Trends */}
              <Grid item xs={12} md={6}>
                <Fade in timeout={1100}>
                  <Card sx={{ bgcolor: '#181f2a', color: '#fff', borderRadius: 3, boxShadow: 3, mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>Trending Tokens by Volume</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: 2 }}>
                        {trendingTokens.map((t, i) => (
                          <Tooltip key={i} title={`Volume: ${t.volume}`} arrow>
                            <Box sx={{ width: 36, textAlign: 'center' }}>
                              <Box sx={{ bgcolor: '#42a5f5', height: `${t.volume / 1500}px`, borderRadius: 1, mb: 1, transition: 'height 0.3s' }} />
                              <Typography variant="caption" sx={{ color: '#fff' }}>{t.token}</Typography>
                            </Box>
                          </Tooltip>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
                <Fade in timeout={1300}>
                  <Card sx={{ bgcolor: '#181f2a', color: '#fff', borderRadius: 3, boxShadow: 3 }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>ML Tag Cloud</Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        {mlTags.map((tag, i) => (
                          <Box key={i} sx={{ bgcolor: '#26304a', color: '#42a5f5', px: 2, py: 0.5, borderRadius: 2, fontWeight: 600, fontSize: 15 }}>{tag}</Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            </Grid>
            {/* Wallet Detail Modal for leaderboard click */}
            <WalletDetailModal open={detailOpen} onClose={() => setDetailOpen(false)} walletId={detailWalletId} />
          </Box>
        </Fade>
      )}
    </Container>
  );
}

function SettingsPage() {
  const [minLiquidity, setMinLiquidity] = React.useState(1000);
  const [minHolderCount, setMinHolderCount] = React.useState(10);
  const [minMarketCap, setMinMarketCap] = React.useState(3000);
  const [maxRugRatio, setMaxRugRatio] = React.useState(0.9);
  const [filters, setFilters] = React.useState({
    renounced: false,
    frozen: false,
    verified: true,
    audited: false,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:8000/settings')
      .then(res => {
        setMinLiquidity(res.data.minLiquidity);
        setMinHolderCount(res.data.minHolderCount);
        setMinMarketCap(res.data.minMarketCap);
        setMaxRugRatio(res.data.maxRugRatio);
        const filterArr = res.data.filters || [];
        setFilters({
          renounced: filterArr.includes('renounced'),
          frozen: filterArr.includes('frozen'),
          verified: filterArr.includes('verified'),
          audited: filterArr.includes('audited'),
        });
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load settings from backend.');
        setLoading(false);
      });
  }, []);

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [event.target.name]: event.target.checked });
  };

  const handleSave = () => {
    setSuccess(false);
    setError(null);
    const selectedFilters = Object.keys(filters).filter(key => filters[key as keyof typeof filters]);
    axios.post('http://localhost:8000/settings', {
      minLiquidity,
      minHolderCount,
      minMarketCap,
      maxRugRatio,
      filters: selectedFilters,
    })
      .then(() => setSuccess(true))
      .catch(() => setError('Failed to save settings.'));
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Settings</Typography>
      <Typography gutterBottom>Configure your discovery thresholds and filters here.</Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Box component="form" sx={{ mt: 4, maxWidth: 400 }}>
          <Stack spacing={3}>
            <TextField
              label="Min Liquidity"
              type="number"
              value={minLiquidity}
              onChange={e => setMinLiquidity(Number(e.target.value))}
              fullWidth
            />
            <TextField
              label="Min Holder Count"
              type="number"
              value={minHolderCount}
              onChange={e => setMinHolderCount(Number(e.target.value))}
              fullWidth
            />
            <TextField
              label="Min Market Cap"
              type="number"
              value={minMarketCap}
              onChange={e => setMinMarketCap(Number(e.target.value))}
              fullWidth
            />
            <Box>
              <Typography gutterBottom>Max Rug Ratio: {maxRugRatio}</Typography>
              <Slider
                value={maxRugRatio}
                min={0}
                max={1}
                step={0.01}
                onChange={(_, val) => setMaxRugRatio(Number(val))}
                valueLabelDisplay="auto"
              />
            </Box>
            <FormGroup>
              <Typography gutterBottom>Filters:</Typography>
              {Object.keys(filters).map((key) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Checkbox
                      checked={filters[key as keyof typeof filters]}
                      onChange={handleFilterChange}
                      name={key}
                    />
                  }
                  label={key.charAt(0).toUpperCase() + key.slice(1)}
                />
              ))}
            </FormGroup>
            <Button variant="contained" color="primary" onClick={handleSave}>
              Save
            </Button>
            {success && <Typography color="success.main">Settings saved!</Typography>}
          </Stack>
        </Box>
      )}
    </Container>
  );
}

function DiscoveryPage() {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleRunDiscovery = () => {
    setLoading(true);
    setStatus(null);
    setError(null);
    axios.post('http://localhost:8000/run-discovery')
      .then(res => {
        const out = res.data.stdout || '';
        // Parse new coins
        let coins = 0;
        let wallets = 0;
        const coinMatch = out.match(/Found (\d+) new good quality coins to process\./i);
        if (coinMatch) coins = parseInt(coinMatch[1]);
        // Parse all trader lines and sum
        const walletMatches = [...out.matchAll(/DEBUG: Found (\d+) unique, profitable traders for /gi)];
        wallets = walletMatches.reduce((sum, m) => sum + (parseInt(m[1]) || 0), 0);
        let msg = '';
        if (coins === 0 && wallets === 0) {
          msg = 'No new coins or wallets found. Try again later!';
        } else {
          msg = `Discovery complete: ${coins} new coin${coins !== 1 ? 's' : ''}, ${wallets} new wallet${wallets !== 1 ? 's' : ''} found!`;
        }
        setStatus(msg);
        setLoading(false);
      })
      .catch(() => {
        setError('Something went wrong. Please try again later.');
        setLoading(false);
      });
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Discovery</Typography>
      <Typography gutterBottom>Find new tokens and wallets automatically. Click below to run discovery.</Typography>
      <Button variant="contained" color="primary" onClick={handleRunDiscovery} disabled={loading} sx={{ mb: 3 }}>
        {loading ? 'Running...' : 'Run Discovery'}
      </Button>
      {loading && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ mb: 1 }}>Running discovery...</Typography>
          <LinearProgress sx={{ height: 8, borderRadius: 2, background: '#222', '& .MuiLinearProgress-bar': { background: '#42a5f5' } }} />
        </Box>
      )}
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      {status && !loading && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#232b3a', color: '#fff', borderRadius: 2, fontWeight: 600, fontSize: 16, boxShadow: 2 }}>
          {status}
        </Box>
      )}
    </Container>
  );
}

function AnalyticsPage() {
  const [tokens, setTokens] = React.useState<any[]>([]);
  const [wallets, setWallets] = React.useState<any[]>([]);
  const [traders, setTraders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get('http://localhost:8000/tokens'),
      axios.get('http://localhost:8000/wallets'),
      axios.get('http://localhost:8000/traders'),
    ])
      .then(([tokensRes, walletsRes, tradersRes]) => {
        setTokens(tokensRes.data);
        setWallets(walletsRes.data);
        setTraders(tradersRes.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load analytics data.');
        setLoading(false);
      });
  }, []);

  // Define columns for each table (customize as needed)
  const tokenCols: GridColDef[] = [
    { field: 'address', headerName: 'Address', width: 220, renderCell: (params) => <WalletAddress address={params.value} short /> },
    { field: 'symbol', headerName: 'Symbol', width: 120 },
    { field: 'liquidity', headerName: 'Liquidity', width: 120 },
    { field: 'holder_count', headerName: 'Holders', width: 100 },
    { field: 'market_cap', headerName: 'Market Cap', width: 120 },
  ];
  const walletCols: GridColDef[] = [
    { field: 'id', headerName: 'Wallet', width: 220, renderCell: (params) => <WalletAddress address={params.value} short /> },
    { field: 'pnl_sol', headerName: 'PnL (SOL)', width: 120, valueGetter: (params: any) => (params && params.row && params.row.on_chain_data && params.row.on_chain_data.pnl_sol !== undefined ? params.row.on_chain_data.pnl_sol : '') },
    { field: 'win_rate', headerName: 'Win Rate', width: 120, valueGetter: (params: any) => (params && params.row && params.row.on_chain_data && params.row.on_chain_data.win_rate !== undefined ? params.row.on_chain_data.win_rate : '') },
    { field: 'total_trades', headerName: 'Trades', width: 100, valueGetter: (params: any) => (params && params.row && params.row.on_chain_data && params.row.on_chain_data.total_trades !== undefined ? params.row.on_chain_data.total_trades : '') },
  ];
  const traderCols: GridColDef[] = [
    { field: 'wallet_address', headerName: 'Wallet', width: 220, renderCell: (params) => <WalletAddress address={params.value} short /> },
    { field: 'copy_trading_score', headerName: 'Smart Score', width: 120 },
    { field: 'token_num_7d', headerName: 'Tokens (7d)', width: 120 },
    { field: 'pnl_sol_7d', headerName: 'PnL (7d)', width: 120 },
  ];

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Analytics</Typography>
      <Typography gutterBottom>View tokens, traders, and wallet analytics here.</Typography>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Tokens</Typography>
            <DataGrid rows={(tokens || []).map((t, i) => ({ id: t?.address || i, ...t }))} columns={tokenCols} autoHeight pageSizeOptions={[5, 10, 25]} />
          </Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Wallets</Typography>
            <DataGrid rows={(wallets || []).map((w, i) => ({ id: w?.id || i, ...w }))} columns={walletCols} autoHeight pageSizeOptions={[5, 10, 25]} />
          </Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6">Traders</Typography>
            <DataGrid rows={(traders || []).map((t, i) => ({ id: t?.wallet_address || i, ...t }))} columns={traderCols} autoHeight pageSizeOptions={[5, 10, 25]} />
          </Box>
        </>
      )}
    </Container>
  );
}

function WalletFinderPage() {
  const [wallets, setWallets] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [selected, setSelected] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [progressStep, setProgressStep] = React.useState<number>(0);
  const progressSteps = [
    'Running Discovery...',
    'Running On-Chain Analyzer...',
    'Running ML Processor...',
    'Refreshing wallet data...'
  ];

  const fetchWallets = () => {
    setLoading(true);
    axios.get('http://localhost:8000/wallets')
      .then(res => {
        setWallets(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load wallets.');
        setLoading(false);
      });
  };

  React.useEffect(() => {
    fetchWallets();
  }, []);

  const runAllAnalyzers = async () => {
    setProgressStep(0);
    setProgress(progressSteps[0]);
    setError(null);
    try {
      await axios.post('http://localhost:8000/run-discovery');
      setProgressStep(1);
      setProgress(progressSteps[1]);
      await axios.post('http://localhost:8000/run-onchain-analysis');
      setProgressStep(2);
      setProgress(progressSteps[2]);
      await axios.post('http://localhost:8000/ml-process');
      setProgressStep(3);
      setProgress(progressSteps[3]);
      await new Promise(res => setTimeout(res, 800)); // brief pause for backend to update
      fetchWallets();
      setProgressStep(0);
      setProgress(null);
    } catch (e) {
      setError('Failed to run all analyzers.');
      setProgressStep(0);
      setProgress(null);
    }
  };

  // Filtering and sorting
  const filteredWallets = wallets.filter(w =>
    w.id?.toLowerCase().includes(search.toLowerCase())
  );
  const score = (w: any) => {
    const pnl = typeof w?.on_chain_data?.pnl_sol === 'number' ? w.on_chain_data.pnl_sol : 0;
    const trades = typeof w?.on_chain_data?.total_trades === 'number' ? w.on_chain_data.total_trades : 0;
    return pnl * Math.log2(1 + trades);
  };
  const validWallets = (filteredWallets || []).filter(w => {
    const trades = typeof w?.on_chain_data?.total_trades === 'number' ? w.on_chain_data.total_trades : 0;
    const pnl = typeof w?.on_chain_data?.pnl_sol === 'number';
    return trades >= 2 && pnl;
  });
  const sortedWallets = [...validWallets].sort((a, b) => score(b) - score(a));

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Wallet Finder</Typography>
      <Typography gutterBottom>Search and explore wallets. Click a row to view details.</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Search by Wallet Address"
          value={search}
          onChange={e => setSearch(e.target.value)}
          fullWidth
        />
        <Button variant="contained" color="secondary" onClick={runAllAnalyzers} disabled={!!progress}>
          Run All Analyzers
        </Button>
      </Box>
      {progress && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ mb: 1 }}>{progress}</Typography>
          <LinearProgress variant="determinate" value={progressStep * 33.33 + 10} sx={{ height: 8, borderRadius: 2, background: '#222', '& .MuiLinearProgress-bar': { background: progressStep === 0 ? '#42a5f5' : progressStep === 1 ? '#7e57c2' : progressStep === 2 ? '#66bb6a' : '#ffa726' } }} />
        </Box>
      )}
      {loading ? (
        <Typography>Loading...</Typography>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Box sx={{
          overflowX: 'auto',
          maxHeight: 500,
          '&::-webkit-scrollbar': { width: 10, background: '#181f2a' },
          '&::-webkit-scrollbar-thumb': { background: '#222b3a', borderRadius: 8 },
          '&::-webkit-scrollbar-thumb:hover': { background: '#2e3a5c' },
          scrollbarColor: '#222b3a #181f2a',
          scrollbarWidth: 'thin',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(0,0,0,0.1)', tableLayout: 'fixed', fontSize: 15 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 40, textAlign: 'center' }}></th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 220, textAlign: 'left' }}>Wallet</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 100, textAlign: 'right' }}>PnL (SOL)</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 100, textAlign: 'right' }}>Win Rate</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 110, textAlign: 'right' }}>Smart Score</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 160, textAlign: 'left' }}>ML Tags</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 80, textAlign: 'right' }}>Trades</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 120, textAlign: 'right' }}>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {/* Selected wallet row at the top */}
              {selected && (
                <tr key={selected?.id} style={{ cursor: 'pointer', background: '#2e3a5c', borderLeft: '4px solid #42a5f5' }}>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', fontWeight: 600 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <WalletAddress address={selected?.id} short />
                    </span>
                  </td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', fontWeight: 600, textAlign: 'right' }}>{typeof selected?.on_chain_data?.pnl_sol === 'number' ? selected.on_chain_data.pnl_sol.toFixed(2) : ''}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', fontWeight: 600, textAlign: 'right' }}>{typeof selected?.on_chain_data?.win_rate === 'number' ? selected.on_chain_data.win_rate.toFixed(2) : ''}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', fontWeight: 600, textAlign: 'right' }}>{typeof selected?.on_chain_data?.total_trades === 'number' ? selected.on_chain_data.total_trades : ''}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', fontWeight: 600, textAlign: 'right' }}>{typeof selected?.ai_insights?.overall_smart_score === 'number' ? selected.ai_insights.overall_smart_score.toFixed(2) : ''}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', fontWeight: 600, textAlign: 'right' }}>{typeof selected?.ai_insights?.risk_score === 'number' ? selected.ai_insights.risk_score.toFixed(2) : ''}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', fontWeight: 600 }}>{selected?.ai_insights?.tags_ml ? selected.ai_insights.tags_ml.join(', ') : ''}</td>
                </tr>
              )}
              {/* Other wallets, excluding selected */}
              {sortedWallets.filter(w => !selected || w.id !== selected.id).map((w, i) => (
                <tr key={w?.id || i} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => setSelected(w)} onMouseOver={e => e.currentTarget.style.background='#232b3e'} onMouseLeave={e => e.currentTarget.style.background=''}>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                      <WalletAddress address={w?.id} short />
                    </span>
                  </td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', textAlign: 'right' }}>{typeof w?.on_chain_data?.pnl_sol === 'number' ? w.on_chain_data.pnl_sol.toFixed(2) : ''}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', textAlign: 'right' }}>{typeof w?.on_chain_data?.win_rate === 'number' ? w.on_chain_data.win_rate.toFixed(2) : ''}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', textAlign: 'right' }}>{typeof w?.on_chain_data?.total_trades === 'number' ? w.on_chain_data.total_trades : ''}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', textAlign: 'right' }}>{typeof w?.ai_insights?.overall_smart_score === 'number' ? w.ai_insights.overall_smart_score.toFixed(2) : ''}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', textAlign: 'right' }}>{typeof w?.ai_insights?.risk_score === 'number' ? w.ai_insights.risk_score.toFixed(2) : ''}</td>
                  <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff' }}>{w?.ai_insights?.tags_ml ? w.ai_insights.tags_ml.join(', ') : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
      {selected && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">Wallet: {selected.id}</Typography>
          {selected.on_chain_data ? (
            <Box sx={{ mt: 2 }}>
              <Typography>PnL (SOL): {selected.on_chain_data.pnl_sol}</Typography>
              <Typography>Win Rate: {selected.on_chain_data.win_rate}</Typography>
              <Typography>Total Trades: {selected.on_chain_data.total_trades}</Typography>
              <Typography>Total Volume (SOL): {selected.on_chain_data.total_volume_sol}</Typography>
            </Box>
          ) : (
            <Typography>No on-chain analytics available for this wallet.</Typography>
          )}
        </Box>
      )}
    </Container>
  );
}

function CopytradeFinderPage() {
  const [address, setAddress] = React.useState('');
  const [results, setResults] = React.useState<any[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stderr, setStderr] = React.useState<string | null>(null);
  const [stdout, setStdout] = React.useState<string | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);

  const handleAnalyze = () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setStderr(null);
    setStdout(null);
    setParseError(null);
    fetch('http://localhost:8000/copytrade-analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: address })
    })
      .then(res => res.json())
      .then(data => {
        if (data.results) {
          setResults(data.results);
        } else if (data.raw) {
          setError('Analysis completed, but could not parse results.');
          setStdout(data.raw);
          setStderr(data.stderr || null);
          setParseError(data.parse_error || null);
        } else if (data.stderr || data.stdout || data.returncode !== undefined) {
          let msg = '';
          if (data.stderr) msg += `Stderr:\n${data.stderr}\n`;
          if (data.stdout) msg += `Stdout:\n${data.stdout}\n`;
          if (data.returncode !== undefined) msg += `Return code: ${data.returncode}\n`;
          setError(msg.trim() || 'Backend error.');
          setStderr(data.stderr || null);
          setStdout(data.stdout || null);
        } else if (data.error) {
          setError(data.error);
        } else if (data.parse_error) {
          setError('Parse Error: ' + data.parse_error);
        } else {
          setError('Unknown error.\nRaw response:\n' + JSON.stringify(data, null, 2));
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to run copytrade analysis.');
        setLoading(false);
      });
  };

  const columns: GridColDef[] = [
    { field: 'Trader', headerName: 'Trader', width: 220, valueGetter: (params: any) => { const v = params?.row?.Trader; return (v === undefined || v === null || String(v).toLowerCase() === 'nan') ? 'N/A' : v; } },
    { field: 'Signature', headerName: 'Signature', width: 120, valueGetter: (params: any) => { const v = params?.row?.Signature; return (v === undefined || v === null || String(v).toLowerCase() === 'nan') ? 'N/A' : v; } },
    { field: 'Block Delay', headerName: 'Block Delay', width: 120, valueGetter: (params: any) => { const v = params?.row?.['Block Delay']; return (v === undefined || v === null || String(v).toLowerCase() === 'nan') ? 'N/A' : v; } },
    { field: 'Bot Used', headerName: 'Bot Used', width: 120, valueGetter: (params: any) => { const v = params?.row?.['Bot Used']; return (v === undefined || v === null || String(v).toLowerCase() === 'nan') ? 'N/A' : v; } },
    { field: 'Tx Processor/Fee Wallet', headerName: 'Fee Wallet', width: 160, valueGetter: (params: any) => { const v = params?.row?.['Tx Processor/Fee Wallet']; return (v === undefined || v === null || String(v).toLowerCase() === 'nan') ? 'N/A' : v; } },
    { field: 'Fee Paid', headerName: 'Fee Paid', width: 120, valueGetter: (params: any) => { const v = params?.row?.['Fee Paid']; return (v === undefined || v === null || String(v).toLowerCase() === 'nan') ? 'N/A' : v; } },
    { field: 'SOL Bought', headerName: 'SOL Bought', width: 120, valueGetter: (params: any) => { const v = params?.row?.['SOL Bought']; return (v === undefined || v === null || String(v).toLowerCase() === 'nan') ? 'N/A' : v; } },
    { field: 'Profit/USD', headerName: 'Profit (USD)', width: 120, valueGetter: (params: any) => { const v = params?.row?.['Profit/USD']; return (v === undefined || v === null || String(v).toLowerCase() === 'nan') ? 'N/A' : v; } },
    { field: 'Profit/%', headerName: 'Profit (%)', width: 120, valueGetter: (params: any) => { const v = params?.row?.['Profit/%']; return (v === undefined || v === null || String(v).toLowerCase() === 'nan') ? 'N/A' : v; } },
  ];

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Copytrade Finder</Typography>
      <Typography gutterBottom>Analyze a wallet to find copy traders here.</Typography>
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <TextField
          label="Wallet Address"
          value={address}
          onChange={e => setAddress(e.target.value)}
          fullWidth
        />
        <Button variant="contained" color="primary" onClick={handleAnalyze} disabled={loading || !address}>
          Analyze
        </Button>
      </Box>
      {loading && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress />
          <Typography sx={{ mt: 1 }}>Running analysis...</Typography>
        </Box>
      )}
      {error && <Typography color="error" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>{error}</Typography>}
      {parseError && <Typography color="error" sx={{ mt: 2, whiteSpace: 'pre-wrap' }}>Parse Error: {parseError}</Typography>}
      {stderr && <Box sx={{ mt: 2 }}><Typography color="error">Stderr:</Typography><Box component="pre" sx={{ bgcolor: '#222', color: '#f44336', p: 2, borderRadius: 1, overflowX: 'auto' }}>{stderr}</Box></Box>}
      {stdout && <Box sx={{ mt: 2 }}><Typography>Stdout:</Typography><Box component="pre" sx={{ bgcolor: '#222', color: '#90caf9', p: 2, borderRadius: 1, overflowX: 'auto' }}>{stdout}</Box></Box>}
      {results && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="h6">Copytrade Analysis Results</Typography>
          {results.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(0,0,0,0.1)' }}>
                <thead>
                  <tr>
                    {Object.keys(results[0]).map((key) => (
                      <th key={key} style={{ border: '1px solid #333', padding: 8, background: '#181f2a', color: '#fff' }}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i}>
                      {Object.keys(results[0]).map((key) => (
                        <td key={key} style={{ border: '1px solid #333', padding: 8, color: '#fff' }}>{(row[key] === undefined || row[key] === null || String(row[key]).toLowerCase() === 'nan') ? 'N/A' : row[key]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          ) : (
            <Typography sx={{ mt: 2, color: 'grey.400' }}>No copytraders detected for this wallet in the scanned blocks.</Typography>
          )}
        </Box>
      )}
    </Container>
  );
}

function MLProcessorPage() {
  const [loading, setLoading] = React.useState(false);
  const [stdout, setStdout] = React.useState('');
  const [stderr, setStderr] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<any>(null);

  const handleRunML = () => {
    setLoading(true);
    setStdout('');
    setStderr('');
    setError(null);
    setResult(null);
    fetch('http://localhost:8000/ml-process', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setStdout(data.stdout);
        setStderr(data.stderr);
        setResult(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to run ML Processor.');
        setLoading(false);
      });
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>ML Processor</Typography>
      <Typography gutterBottom>Run ML analysis and view smart scores here.</Typography>
      <Button variant="contained" color="primary" onClick={handleRunML} disabled={loading} sx={{ mt: 2 }}>
        {loading ? 'Running...' : 'Run ML Processor'}
      </Button>
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      {stdout && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1">Stdout:</Typography>
          <Box component="pre" sx={{ bgcolor: '#222', color: '#90caf9', p: 2, borderRadius: 1, overflowX: 'auto' }}>{stdout}</Box>
        </Box>
      )}
      {stderr && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" color="error">Stderr:</Typography>
          <Box component="pre" sx={{ bgcolor: '#222', color: '#f44336', p: 2, borderRadius: 1, overflowX: 'auto' }}>{stderr}</Box>
        </Box>
      )}
    </Container>
  );
}

function OnChainAnalyzerPage() {
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<string | null>(null);
  React.useEffect(() => {
    let timer1: any, timer2: any;
    if (loading) {
      setStep('Preparing...');
      timer1 = setTimeout(() => setStep('Analyzing wallets...'), 1200);
      timer2 = setTimeout(() => setStep('Finalizing...'), 4200);
    } else {
      setStep(null);
    }
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [loading]);

  const handleRunOnChain = () => {
    setLoading(true);
    setStatus(null);
    setError(null);
    fetch('http://localhost:8000/run-onchain-analysis', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        const out = data.stdout || '';
        let analyzed = 0;
        const match = out.match(/Analyzed (\d+) wallets?/i);
        if (match) analyzed = parseInt(match[1]);
        else {
          const lines = out.split(/\r?\n/);
          analyzed = lines.filter((l: string) => /Analyzing wallet/i.test(l)).length;
        }
        let msg = analyzed > 0 ? `Analysis complete! ${analyzed} wallet${analyzed !== 1 ? 's' : ''} analyzed.` : 'Analysis complete!';
        setStatus(msg);
        setLoading(false);
      })
      .catch(() => {
        setError('Something went wrong. Please try again later.');
        setLoading(false);
      });
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>On-Chain Analyzer</Typography>
      <Typography gutterBottom>Run on-chain analysis for all wallets and update their analytics.</Typography>
      <Button variant="contained" color="primary" onClick={handleRunOnChain} disabled={loading} sx={{ mt: 2 }}>
        {loading ? 'Running...' : 'Run On-Chain Analyzer'}
      </Button>
      {loading && (
        <Box sx={{ mb: 2, mt: 2 }}>
          <Typography sx={{ mb: 1 }}>Analyzing wallets...</Typography>
          <LinearProgress sx={{ height: 8, borderRadius: 2, background: '#222', '& .MuiLinearProgress-bar': { background: '#42a5f5' } }} />
          {step && <Typography sx={{ mt: 1, fontSize: 15, color: '#b0bec5' }}>{step}</Typography>}
        </Box>
      )}
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
      {status && !loading && (
        <Box sx={{ mb: 2, p: 2, bgcolor: '#232b3a', color: '#fff', borderRadius: 2, fontWeight: 600, fontSize: 16, boxShadow: 2 }}>
          {status}
        </Box>
      )}
    </Container>
  );
}

function LandingPage() {
  // Mock stats for now
  const stats = [
    { label: 'Wallets Tracked', value: '1,452' },
    { label: 'Tokens Analyzed', value: '320' },
    { label: 'Total PnL', value: '1,200,000 SOL' },
    { label: 'Active Users', value: '87' },
  ];
  const features = [
    { icon: <SearchIcon sx={{ fontSize: 40, color: '#fff' }} />, title: 'Discovery', desc: 'Find new tokens and wallets automatically.' },
    { icon: <TableChartIcon sx={{ fontSize: 40, color: '#fff' }} />, title: 'Analyzer', desc: 'Analyze wallet performance, trades, and PnL.' },
    { icon: <StarIcon sx={{ fontSize: 40, color: '#fff' }} />, title: 'Watchlist', desc: 'Track your favorite wallets and get updates.' },
    { icon: <DashboardIcon sx={{ fontSize: 40, color: '#fff' }} />, title: 'Dashboard', desc: 'See live stats, leaderboards, and trends.' },
  ];
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#101624', color: '#fff', display: 'flex', flexDirection: 'column', width: '100vw', fontFamily: 'DM Sans, sans-serif' }}>
      {/* Logo Header */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, width: '100%', px: { xs: 2, sm: 4 }, py: { xs: 1, sm: 2 }, display: 'flex', alignItems: 'center', zIndex: 10, background: 'rgba(16,22,36,0.92)', boxShadow: 2 }}>
        <img src={solensLogo} alt="SoLens Logo" style={{ height: 44 }} />
      </Box>
      {/* Hero Section */}
      <Box sx={{
        minHeight: { xs: '60vh', md: '75vh' },
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        textAlign: 'center',
        background: 'radial-gradient(ellipse at top, #26304a 0%, #101624 100%)',
      }}>
        {/* <Hero3DBackground /> */}
        <Box sx={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 3, letterSpacing: 0.5, color: '#fff', fontFamily: 'DM Sans, sans-serif', fontSize: { xs: 20, sm: 28, md: 36 } }}>
            The modern analytics platform for Solana traders, wallets, and tokens.
          </Typography>
          <Button variant="contained" color="primary" size="large" sx={{ px: 7, py: 2.5, fontSize: 26, borderRadius: 3, boxShadow: 3, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }} href="/dashboard">
            Launch
          </Button>
        </Box>
        <Hero3DBackground />
      </Box>
      {/* Live Stats */}
      <Container sx={{ mt: -5, mb: 6, maxWidth: '900px !important', px: 0, display: 'flex', justifyContent: 'center' }}>
        <Paper elevation={3} sx={{ bgcolor: 'rgba(24,31,42,0.85)', borderRadius: 3, p: 3, display: 'flex', justifyContent: 'center', gap: 6, boxShadow: 4, backdropFilter: 'blur(8px)', width: '100%', maxWidth: 900, mx: 'auto' }}>
          {stats.map((s, i) => (
            <Box key={i} sx={{ textAlign: 'center', fontFamily: 'DM Sans, sans-serif' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', fontFamily: 'DM Sans, sans-serif' }}>{s.value}</Typography>
              <Typography sx={{ color: '#e0e0e0', fontSize: 18, fontFamily: 'DM Sans, sans-serif' }}>{s.label}</Typography>
            </Box>
          ))}
        </Paper>
      </Container>
      {/* Features - Glassy Squares */}
      <Container sx={{ mb: 8, maxWidth: '100vw !important' }}>
        <Grid container spacing={4} justifyContent="center">
          {features.map((f, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Paper
                elevation={4}
                sx={{
                  bgcolor: 'rgba(36, 45, 65, 0.55)',
                  color: '#fff',
                  borderRadius: 4,
                  p: 4,
                  textAlign: 'center',
                  height: '100%',
                  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.18)',
                  backdropFilter: 'blur(12px)',
                  border: '1.5px solid rgba(255,255,255,0.08)',
                  transition: 'transform 0.18s, box-shadow 0.18s',
                  fontWeight: 600,
                  fontFamily: 'DM Sans, sans-serif',
                  '&:hover': {
                    transform: 'translateY(-6px) scale(1.04)',
                    boxShadow: '0 16px 40px 0 rgba(31, 38, 135, 0.22)',
                    border: '1.5px solid #42a5f5',
                  },
                }}
              >
                {f.icon}
                <Typography variant="h6" sx={{ mt: 2, fontWeight: 800, color: '#fff', letterSpacing: 0.5, fontFamily: 'DM Sans, sans-serif' }}>{f.title}</Typography>
                <Typography sx={{ color: '#fff', mt: 1, fontWeight: 400, fontFamily: 'DM Sans, sans-serif' }}>{f.desc}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>
      {/* Why SoLens? - Centered */}
      <Container sx={{ mb: 8, maxWidth: 600, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, color: '#fff', fontFamily: 'DM Sans, sans-serif', textAlign: 'center' }}>Why SoLens?</Typography>
        <ul style={{ color: '#fff', fontSize: 18, margin: '0 auto', fontWeight: 400, fontFamily: 'DM Sans, sans-serif', textAlign: 'left', display: 'inline-block' }}>
          <li>All-in-one analytics for Solana wallets, tokens, and trades</li>
          <li>Modern, fast, and user-friendly interface</li>
          <li>Advanced discovery and filtering tools</li>
          <li>Live stats, leaderboards, and watchlists</li>
          <li>Open source and community-driven</li>
        </ul>
      </Container>
      {/* Footer */}
      <Box sx={{ bgcolor: '#181f2a', color: '#b0bec5', py: 3, mt: 'auto', textAlign: 'center', fontSize: 16, fontFamily: 'DM Sans, sans-serif' }}>
        <span>© {new Date().getFullYear()} SoLens &nbsp;|&nbsp; </span>
        <a href="https://github.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#42a5f5', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>GitHub</a>
        <span> &nbsp;|&nbsp; </span>
        <a href="https://discord.gg/" target="_blank" rel="noopener noreferrer" style={{ color: '#42a5f5', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>Discord</a>
        <span> &nbsp;|&nbsp; </span>
        <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#42a5f5', textDecoration: 'none', fontFamily: 'DM Sans, sans-serif' }}>Twitter</a>
      </Box>
    </Box>
  );
}

// New navigation structure
const mainNavItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Wallet Explorer', icon: <SearchIcon />, path: '/wallet-explorer' },
  { text: 'Watchlists', icon: <PeopleAltIcon />, path: '/watchlists' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];
const advancedNavItems = [
  { text: 'Discovery', icon: <SearchIcon />, path: '/discovery' },
  { text: 'On-Chain Analyzer', icon: <MemoryIcon />, path: '/onchain-analyzer' },
  { text: 'ML Processor', icon: <MemoryIcon />, path: '/ml-processor' },
  { text: 'Copytrade Finder', icon: <PeopleAltIcon />, path: '/copytrade-finder' },
];

// Placeholder components for new pages
function WatchlistsPage() {
  const [wallets, setWallets] = React.useState<any[]>([]);
  const [watchlist, setWatchlist] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Load watchlist from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('solens_watchlist');
    setWatchlist(stored ? JSON.parse(stored) : []);
  }, []);

  // Fetch all wallets and filter to watchlist
  React.useEffect(() => {
    setLoading(true);
    fetch('http://localhost:8000/wallets')
      .then(res => res.json())
      .then(data => {
        setWallets(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Remove wallet from watchlist
  const removeFromWatchlist = (walletId: string) => {
    const updated = watchlist.filter(id => id !== walletId);
    setWatchlist(updated);
    localStorage.setItem('solens_watchlist', JSON.stringify(updated));
  };

  // Only show wallets in watchlist
  const watchedWallets = wallets.filter(w => watchlist.includes(w.id));

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Watchlist</Typography>
      <Typography gutterBottom>Track wallets of interest here.</Typography>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
          <CircularProgress />
        </Box>
      ) : watchedWallets.length === 0 ? (
        <Typography sx={{ mt: 4, color: '#b0bec5', fontSize: 18 }}>Your watchlist is empty. Add wallets from the Explorer!</Typography>
      ) : (
        <Box sx={{ mt: 3 }}>
          <table style={{ width: '100%', background: '#181f2a', color: '#fff', borderRadius: 8, overflow: 'hidden', fontSize: 16 }}>
            <thead>
              <tr style={{ background: '#232b3a', fontWeight: 700 }}>
                <th style={{ padding: 12, textAlign: 'left' }}>Wallet</th>
                <th>PnL (SOL)</th>
                <th>Win Rate</th>
                <th>Trades</th>
                <th>Smart Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {watchedWallets.map(w => (
                <tr key={w.id} style={{ borderBottom: '1px solid #232b3a' }}>
                  <td style={{ padding: 10, fontFamily: 'monospace' }}>{w.id}</td>
                  <td style={{ textAlign: 'center' }}>{w.on_chain_data?.pnl_sol ?? 'N/A'}</td>
                  <td style={{ textAlign: 'center' }}>{w.on_chain_data?.win_rate ?? 'N/A'}</td>
                  <td style={{ textAlign: 'center' }}>{w.on_chain_data?.total_trades ?? 'N/A'}</td>
                  <td style={{ textAlign: 'center' }}>{w.ai_insights?.overall_smart_score ?? 'N/A'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <Button color="error" size="small" onClick={() => removeFromWatchlist(w.id)}>Remove</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      )}
    </Container>
  );
}

function WalletDetailModal({ open, onClose, walletId }: { open: boolean, onClose: () => void, walletId: string | null }) {
  const [wallet, setWallet] = React.useState<any | null>(null);
  const [tab, setTab] = React.useState(0);
  const [copyOpen, setCopyOpen] = React.useState(false);
  React.useEffect(() => {
    if (open && walletId) {
      setWallet(null); // Reset for spinner
      axios.get(`http://localhost:8000/wallets/${walletId}`)
        .then(res => setWallet(res.data))
        .catch(() => setWallet(null));
    }
  }, [open, walletId]);
  const handleCopy = () => {
    if (walletId) {
      navigator.clipboard.writeText(walletId);
      setCopyOpen(true);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Wallet: <span style={{ fontFamily: 'monospace', marginLeft: 4 }}>{walletId}</span>
          <Tooltip title="Copy Wallet Address">
            <IconButton size="small" onClick={handleCopy}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </span>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        {!wallet ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1">PnL (SOL): {wallet.on_chain_data?.pnl_sol ?? 'N/A'}</Typography>
              <Typography variant="subtitle1">Win Rate: {wallet.on_chain_data?.win_rate ?? 'N/A'}</Typography>
              <Typography variant="subtitle1">Total Trades: {wallet.on_chain_data?.total_trades ?? 'N/A'}</Typography>
              <Typography variant="subtitle1">Total Volume (SOL): {wallet.on_chain_data?.total_volume_sol ?? 'N/A'}</Typography>
            </Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
              <Tab label="Overview" />
              <Tab label="Trade History" />
              <Tab label="Portfolio" />
              <Tab label="Copytraders" />
            </Tabs>
            {tab === 0 && (
              <Box>
                <Typography>Overview charts and stats coming soon.</Typography>
              </Box>
            )}
            {tab === 1 && (
              <Box>
                <Typography>Trade history table coming soon.</Typography>
              </Box>
            )}
            {tab === 2 && (
              <Box>
                <Typography>Portfolio details coming soon.</Typography>
              </Box>
            )}
            {tab === 3 && (
              <Box>
                <Typography>Copytrader scan and results coming soon.</Typography>
              </Box>
            )}
          </>
        )}
        <Snackbar
          open={copyOpen}
          autoHideDuration={1200}
          onClose={() => setCopyOpen(false)}
          message="Wallet address copied!"
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        />
      </DialogContent>
    </Dialog>
  );
}

function WalletExplorerPage() {
  const [wallets, setWallets] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<any | null>(null);
  // Advanced filter state
  const [pnlRange, setPnlRange] = React.useState<[number, number]>([0, 100]);
  const [winRateRange, setWinRateRange] = React.useState<[number, number]>([0, 100]);
  const [smartScoreRange, setSmartScoreRange] = React.useState<[number, number]>([0, 100]);
  const [selectedTags, setSelectedTags] = React.useState<string[]>([]);
  const [lastActive, setLastActive] = React.useState<string>('');
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailWalletId, setDetailWalletId] = React.useState<string | null>(null);
  const [watchlist, setWatchlist] = React.useState<string[]>([]);
  const [progress, setProgress] = React.useState<string | null>(null);
  const [progressStep, setProgressStep] = React.useState<number>(0);
  const progressSteps = [
    'Running Discovery...',
    'Running On-Chain Analyzer...',
    'Running ML Processor...',
    'Refreshing wallet data...'
  ];

  // Placeholder: fetch wallets from backend
  const fetchWallets = () => {
    setLoading(true);
    axios.get('http://localhost:8000/wallets')
      .then(res => {
        setWallets(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load wallets.');
        setLoading(false);
      });
  };

  React.useEffect(() => {
    fetchWallets();
  }, []);

  // Extract all ML tags from data for checkboxes
  const allTags = Array.from(new Set(wallets.flatMap(w => w?.ai_insights?.tags_ml || []))).filter(Boolean);

  // Action handlers (real backend calls)
  const handleDiscover = async () => {
    setProgressStep(0);
    setProgress(progressSteps[0]);
    setError(null);
    try {
      await axios.post('http://localhost:8000/run-discovery');
      setProgressStep(1);
      setProgress(progressSteps[1]);
      await axios.post('http://localhost:8000/run-onchain-analysis');
      setProgressStep(2);
      setProgress(progressSteps[2]);
      await axios.post('http://localhost:8000/ml-process');
      setProgressStep(3);
      setProgress(progressSteps[3]);
      await new Promise(res => setTimeout(res, 800));
      fetchWallets();
      setProgressStep(0);
      setProgress(null);
    } catch (e) {
      setError('Failed to run discovery and analysis.');
      setProgressStep(0);
      setProgress(null);
    }
  };
  const handleRefreshAnalytics = async () => {
    setProgressStep(1);
    setProgress(progressSteps[1]);
    setError(null);
    try {
      await axios.post('http://localhost:8000/run-onchain-analysis');
      setProgressStep(2);
      setProgress(progressSteps[2]);
      await axios.post('http://localhost:8000/ml-process');
      setProgressStep(3);
      setProgress(progressSteps[3]);
      await new Promise(res => setTimeout(res, 800));
      fetchWallets();
      setProgressStep(0);
      setProgress(null);
    } catch (e) {
      setError('Failed to refresh analytics.');
      setProgressStep(0);
      setProgress(null);
    }
  };

  // Filtered wallets
  const filteredWallets = wallets.filter(w => {
    // Search
    if (search && !w.id?.toLowerCase().includes(search.toLowerCase())) return false;
    // PnL
    const pnl = typeof w?.on_chain_data?.pnl_sol === 'number' ? w.on_chain_data.pnl_sol : 0;
    if (pnl < pnlRange[0] || pnl > pnlRange[1]) return false;
    // Win Rate
    const winRate = typeof w?.on_chain_data?.win_rate === 'number' ? w.on_chain_data.win_rate : 0;
    if (winRate < winRateRange[0] || winRate > winRateRange[1]) return false;
    // Smart Score
    const smartScore = typeof w?.ai_insights?.overall_smart_score === 'number' ? w.ai_insights.overall_smart_score : 0;
    if (smartScore < smartScoreRange[0] || smartScore > smartScoreRange[1]) return false;
    // ML Tags
    if (selectedTags.length > 0 && !(w?.ai_insights?.tags_ml || []).some((tag: string) => selectedTags.includes(tag))) return false;
    // Last Active (simple string match for now)
    if (lastActive && (!w?.on_chain_data?.last_active || !w.on_chain_data.last_active.includes(lastActive))) return false;
    return true;
  });

  // Load watchlist from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem('solens_watchlist');
    setWatchlist(stored ? JSON.parse(stored) : []);
  }, []);

  // Add/remove from watchlist (local only for now, and persist to localStorage)
  const toggleWatchlist = (walletId: string) => {
    setWatchlist(prev => {
      let updated;
      if (prev.includes(walletId)) {
        updated = prev.filter(id => id !== walletId);
      } else {
        updated = [...prev, walletId];
      }
      localStorage.setItem('solens_watchlist', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Wallet Explorer</Typography>
      {/* Action Bar */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          label="Search by Wallet Address"
          value={search}
          onChange={e => setSearch(e.target.value)}
          fullWidth
        />
        <Button variant="contained" color="primary" onClick={handleDiscover} disabled={loading || !!progress}>
          Discover New Wallets
        </Button>
        <Button variant="contained" color="secondary" onClick={handleRefreshAnalytics} disabled={loading || !!progress}>
          Refresh Analytics
        </Button>
      </Box>
      {/* Progress Bar */}
      {progress && (
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ mb: 1 }}>{progress}</Typography>
          <LinearProgress variant="determinate" value={progressStep * 33.33 + 10} sx={{ height: 8, borderRadius: 2, background: '#222', '& .MuiLinearProgress-bar': { background: progressStep === 0 ? '#42a5f5' : progressStep === 1 ? '#7e57c2' : progressStep === 2 ? '#66bb6a' : '#ffa726' } }} />
        </Box>
      )}
      {/* Advanced Filters Panel */}
      <Box sx={{ display: 'flex', gap: 4, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <Box sx={{ minWidth: 200 }}>
          <Typography gutterBottom>PnL (SOL)</Typography>
          <Slider
            value={pnlRange}
            onChange={(_, v) => setPnlRange(v as [number, number])}
            min={Math.min(0, ...wallets.map(w => w?.on_chain_data?.pnl_sol ?? 0))}
            max={Math.max(100, ...wallets.map(w => w?.on_chain_data?.pnl_sol ?? 100))}
            valueLabelDisplay="auto"
          />
        </Box>
        <Box sx={{ minWidth: 200 }}>
          <Typography gutterBottom>Win Rate (%)</Typography>
          <Slider
            value={winRateRange}
            onChange={(_, v) => setWinRateRange(v as [number, number])}
            min={0}
            max={100}
            valueLabelDisplay="auto"
          />
        </Box>
        <Box sx={{ minWidth: 200 }}>
          <Typography gutterBottom>Smart Score</Typography>
          <Slider
            value={smartScoreRange}
            onChange={(_, v) => setSmartScoreRange(v as [number, number])}
            min={0}
            max={100}
            valueLabelDisplay="auto"
          />
        </Box>
        <Box>
          <Typography gutterBottom>ML Tags</Typography>
          <FormGroup row>
            {allTags.map(tag => (
              <FormControlLabel
                key={tag}
                control={<Checkbox checked={selectedTags.includes(tag)} onChange={e => {
                  if (e.target.checked) setSelectedTags([...selectedTags, tag]);
                  else setSelectedTags(selectedTags.filter(t => t !== tag));
                }} />}
                label={tag}
              />
            ))}
          </FormGroup>
        </Box>
        <Box>
          <Typography gutterBottom>Last Active</Typography>
          <TextField
            select
            value={lastActive}
            onChange={e => setLastActive(e.target.value)}
            SelectProps={{ native: true }}
            size="small"
            sx={{ minWidth: 120 }}
          >
            <option value="">Any</option>
            <option value="24h">Last 24h</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </TextField>
        </Box>
      </Box>
      {loading ? (
        <Typography>Loading...</Typography>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto', maxHeight: 500 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: 'rgba(0,0,0,0.1)', tableLayout: 'fixed', fontSize: 15 }}>
            <thead>
              <tr>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 40, textAlign: 'center' }}></th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 220, textAlign: 'left' }}>Wallet</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 100, textAlign: 'right' }}>PnL (SOL)</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 100, textAlign: 'right' }}>Win Rate</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 110, textAlign: 'right' }}>Smart Score</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 160, textAlign: 'left' }}>ML Tags</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 80, textAlign: 'right' }}>Trades</th>
                <th style={{ position: 'sticky', top: 0, zIndex: 2, border: '1px solid #333', padding: '6px 8px', background: '#181f2a', color: '#fff', width: 120, textAlign: 'right' }}>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredWallets.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#b0bec5', padding: 24 }}>
                    No results found. Try adjusting your filters.
                  </td>
                </tr>
              ) : filteredWallets.map((w, i) => {
                const isSelected = detailWalletId === w.id && detailOpen;
                return (
                  <tr
                    key={w?.id || i}
                    style={{
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      background: isSelected ? '#26304a' : undefined,
                    }}
                    onClick={() => { setDetailWalletId(w.id); setDetailOpen(true); }}
                    onMouseOver={e => e.currentTarget.style.background='#232b3e'}
                    onMouseOut={e => e.currentTarget.style.background=''}
                  >
                    <td style={{ border: '1px solid #333', padding: '6px 8px', textAlign: 'center' }} onClick={e => { e.stopPropagation(); toggleWatchlist(w.id); }}>
                      <Tooltip title={watchlist.includes(w.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}>
                        {watchlist.includes(w.id)
                          ? <StarIcon sx={{ color: '#ffd600', cursor: 'pointer' }} />
                          : <StarBorderIcon sx={{ color: '#b0bec5', cursor: 'pointer', '&:hover': { color: '#ffd600' } }} />
                        }
                      </Tooltip>
                    </td>
                    <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff' }}>
                      <Tooltip title={w?.id}><span>{w?.id?.slice(0, 20)}...</span></Tooltip>
                    </td>
                    <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', textAlign: 'right' }}>{typeof w?.on_chain_data?.pnl_sol === 'number' ? w.on_chain_data.pnl_sol.toFixed(2) : ''}</td>
                    <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', textAlign: 'right' }}>{typeof w?.on_chain_data?.win_rate === 'number' ? w.on_chain_data.win_rate.toFixed(2) : ''}</td>
                    <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', textAlign: 'right' }}>{typeof w?.ai_insights?.overall_smart_score === 'number' ? w.ai_insights.overall_smart_score.toFixed(2) : ''}</td>
                    <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff' }}>
                      <Tooltip title={w?.ai_insights?.tags_ml?.join(', ')}><span>{w?.ai_insights?.tags_ml ? w.ai_insights.tags_ml.join(', ') : ''}</span></Tooltip>
                    </td>
                    <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', textAlign: 'right' }}>
                      <Tooltip title={w?.on_chain_data?.total_trades}><span>{typeof w?.on_chain_data?.total_trades === 'number' ? w.on_chain_data.total_trades : ''}</span></Tooltip>
                    </td>
                    <td style={{ border: '1px solid #333', padding: '6px 8px', color: '#fff', textAlign: 'right' }}>
                      <Tooltip title={w?.on_chain_data?.last_active}><span>{w?.on_chain_data?.last_active ? w.on_chain_data.last_active : ''}</span></Tooltip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Box>
      )}
      {/* Wallet Detail Modal */}
      <WalletDetailModal open={detailOpen} onClose={() => setDetailOpen(false)} walletId={detailWalletId} />
    </Container>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/*" element={<MainAppLayout />} />
      </Routes>
    </Router>
  );
}

function MainAppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <Box sx={{ display: 'flex', fontFamily: '"DM Sans", sans-serif', minHeight: '100vh', minWidth: '100vw', height: '100vh', width: '100vw', boxSizing: 'border-box' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: { xs: 70, sm: drawerWidth },
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: { xs: 70, sm: drawerWidth },
            boxSizing: 'border-box',
            background: 'radial-gradient(ellipse at 60% 40%, #101a2b 0%, #0a1220 60%, #050a18 100%)',
            color: '#fff',
            borderRight: 'none',
            px: 0,
            pt: 0,
            fontFamily: '"DM Sans", sans-serif',
            minHeight: '100vh',
          },
        }}
      >
        {/* Logo at the top */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: { xs: 2, sm: 3 }, mb: 2 }}>
          <img src={solensLogo} alt="Solens Logo" style={{ height: 48, marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate('/')} />
          <Typography variant="subtitle2" sx={{ color: '#b0bec5', fontWeight: 500, fontSize: 14, letterSpacing: 1, fontFamily: '"DM Sans", sans-serif', mt: 1, display: { xs: 'none', sm: 'block' } }}>
            AI Powered Wallet Finder
          </Typography>
        </Box>
        {/* Main navigation */}
        <List sx={{ mt: 2 }}>
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  sx={{
                    borderRadius: 2,
                    mx: 2,
                    py: 1.2,
                    background: isActive ? 'rgba(33, 150, 243, 0.15)' : 'none',
                    color: isActive ? '#4fc3f7' : '#fff',
                    fontWeight: isActive ? 700 : 400,
                    '&:hover': {
                      background: 'rgba(33, 150, 243, 0.10)',
                      color: '#4fc3f7',
                    },
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? '#4fc3f7' : '#fff', minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} sx={{ '.MuiTypography-root': { fontFamily: '"DM Sans", sans-serif', fontWeight: isActive ? 700 : 400, fontSize: 18, display: { xs: 'none', sm: 'block' } } }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        {/* Advanced Tools section */}
        <Box sx={{ mt: 4, mb: 1, px: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#7e8ba3', fontWeight: 700, fontSize: 13, letterSpacing: 1, mb: 1, textTransform: 'uppercase' }}>
            Advanced Tools
          </Typography>
        </Box>
        <List>
          {advancedNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  sx={{
                    borderRadius: 2,
                    mx: 2,
                    py: 1.2,
                    background: isActive ? 'rgba(33, 150, 243, 0.15)' : 'none',
                    color: isActive ? '#4fc3f7' : '#fff',
                    fontWeight: isActive ? 700 : 400,
                    '&:hover': {
                      background: 'rgba(33, 150, 243, 0.10)',
                      color: '#4fc3f7',
                    },
                    fontFamily: '"DM Sans", sans-serif',
                  }}
                >
                  <ListItemIcon sx={{ color: isActive ? '#4fc3f7' : '#fff', minWidth: 36 }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} sx={{ '.MuiTypography-root': { fontFamily: '"DM Sans", sans-serif', fontWeight: isActive ? 700 : 400, fontSize: 18, display: { xs: 'none', sm: 'block' } } }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, minHeight: '100vh', minWidth: 0, bgcolor: 'radial-gradient(ellipse at 60% 40%, #101a2b 0%, #0a1220 60%, #050a18 100%)', position: 'relative', fontFamily: '"DM Sans", sans-serif', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        {/* Glowing background for main content */}
        <Box sx={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background: 'radial-gradient(ellipse at 60% 40%, #101a2b 0%, #0a1220 60%, #050a18 100%)',
          pointerEvents: 'none',
        }} />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, background: 'transparent', boxShadow: 'none', color: '#fff', fontFamily: '"DM Sans", sans-serif' }}>
          <Toolbar />
        </AppBar>
        <Toolbar />
        <Box sx={{ position: 'relative', zIndex: 1, flex: 1, width: '100%', maxWidth: '100vw', p: { xs: 1, sm: 2, md: 6 }, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', boxSizing: 'border-box' }}>
          <ThemeProvider theme={muiTheme}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/wallet-explorer" element={<WalletExplorerPage />} />
              <Route path="/watchlists" element={<WatchlistsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/discovery" element={<DiscoveryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/wallet-finder" element={<WalletFinderPage />} />
              <Route path="/copytrade-finder" element={<CopytradeFinderPage />} />
              <Route path="/onchain-analyzer" element={<OnChainAnalyzerPage />} />
              <Route path="/ml-processor" element={<MLProcessorPage />} />
            </Routes>
          </ThemeProvider>
        </Box>
      </Box>
    </Box>
  );
}

// Add a custom MUI theme for light gray placeholder
const muiTheme = createTheme({
  typography: {
    fontFamily: '"DM Sans", sans-serif',
  },
  components: {
    MuiInputBase: {
      styleOverrides: {
        input: {
          '::placeholder': {
            color: '#b0bec5',
            opacity: 1,
          },
          color: '#b0bec5',
          fontFamily: '"DM Sans", sans-serif',
        },
        root: {
          'input::placeholder': {
            color: '#b0bec5',
            opacity: 1,
          },
          color: '#b0bec5',
          fontFamily: '"DM Sans", sans-serif',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        input: {
          '::placeholder': {
            color: '#b0bec5',
            opacity: 1,
          },
          color: '#b0bec5',
          fontFamily: '"DM Sans", sans-serif',
        },
        root: {
          color: '#b0bec5',
          fontFamily: '"DM Sans", sans-serif',
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: '#b0bec5',
          fontFamily: '"DM Sans", sans-serif',
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: '#b0bec5',
          fontFamily: '"DM Sans", sans-serif',
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          color: '#b0bec5',
          fontFamily: '"DM Sans", sans-serif',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: '#fff',
          fontFamily: '"DM Sans", sans-serif',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'transparent',
          boxShadow: 'none',
        },
      },
    },
  },
});

export default App;
