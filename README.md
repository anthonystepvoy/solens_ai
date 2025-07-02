# CIPHER - Blockchain Intelligence Platform

A real-time blockchain intelligence platform for discovering, analyzing, and tracking wallets and tokens with advanced ML scoring and a retro terminal-inspired UI.

## 🚀 Features

- **Real-Time Wallet & Token Discovery**: Now powered by a dynamic pipeline that always discovers the freshest tokens and wallets from the latest 1-minute rank snapshot
- **1-Minute Token Ranking**: Live top tokens, updated every minute
- **ML-Based Scoring**: Automated risk and smart scores for every wallet
- **Copytrade Finder**: Detects unique copytraders and patterns
- **Wallet & Token Watchlists**: Add, remove, and monitor, with local persistence and export/import
- **Settings & Security**: Session timeout, clear data, export/import watchlists
- **Retro/Terminal UI**: Fast, keyboard-friendly, and visually unique
- **FastAPI Backend**: Robust API, MongoDB Atlas for scalable data
- **Vite + React Frontend**: Modern, fast, and easy to develop
- **Smart Token Filtering**: Only the highest-quality tokens (by liquidity, market cap, holders, rug ratio) are processed for wallet discovery
- **Wallet Info Enrichment**: Each discovered wallet is enriched with detailed info for better analytics
- **Fully Real-Time Dashboard**: Frontend and backend always reflect the latest data after each discovery run
- **Roadmap**: API service, phone app, real-time token analysis, secret integration

## 🗂️ Project Structure

```
cipher-ai/
├── frontend-vite/     # Vite + React frontend (retro terminal UI)
│   ├── src/          # Source code
│   ├── public/       # Static assets (bgvid.webm, favicon.ico, etc)
│   └── package.json  # Frontend dependencies
├── backend/          # Scrapers and ML scripts
│   ├── js_scrapers/  # Node.js scrapers (GMGN, tokens, wallets)
│   └── python_scripts/ # Python ML and analysis scripts
├── backend_api/      # FastAPI backend service
├── config/           # Configuration files (MongoDB, etc)
└── data/             # Data storage (if any)
```

## 🛠️ Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- MongoDB Atlas account/URI

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd solens_ai
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Node.js dependencies**
   ```bash
   cd backend/js_scrapers
   npm install
   cd ../../..
   cd frontend-vite
   npm install
   cd ..
   ```

4. **Configure MongoDB**
   - Create a `.env` file in the project root with your MongoDB Atlas URI:
     ```env
     MONGO_URI="your-mongodb-uri-here"
     ```
   - Both the Node.js scrapers and the FastAPI backend will automatically load this variable from `.env` (using `dotenv` and `python-dotenv`).
   - **Do not commit your `.env` file to git** (it is already in `.gitignore`).

### Running the Application

1. **Start the Frontend**
   ```bash
   cd frontend-vite
   npm run dev
   # Visit http://localhost:5173
   ```

2. **Start the Backend API**
   ```bash
   cd backend_api
   uvicorn main:app --reload
   # API at http://localhost:8000
   ```

3. **Run Scrapers & ML Jobs**
   ```bash
   # 1-minute token ranking (auto-updates MongoDB)
   node backend/js_scrapers/fetch_minute_rank.js

   # GMGN wallet/token discovery (now uses latest 1-minute snapshot and smart filtering)
   node backend/js_scrapers/gmgn_coins_traders.js

   # Wallet info enrichment (fetches detailed info for each discovered wallet)
   node backend/js_scrapers/gmgn_wallet_scraper.js

   # ML scoring
   python backend/python_scripts/ml_processor.py
   ```

4. **(Optional) On-chain analysis**
   ```bash
   python backend/python_scripts/on_chain_analyzer.py
   ```

## ⚡ Key Features & Pages

- **Dashboard**: Live stats, top/risky/hot wallets, trending tokens (always up-to-date)
- **Tokens**: 1-minute ranking, registry, watchlist, history
- **Wallets**: Search, sort, watchlist, ML scores, copyable addresses
- **Copytrade Finder**: Unique copytrader detection, CSV/JSON export
- **Settings**: Security, export/import, session timeout, clear data
- **Retro UI**: Terminal-style, keyboard-friendly, custom scrollbars

## 🧠 ML & Analytics
- **ML Processor**: Auto-runs after discovery, tags/risk/smart scores
- **All scoring and tags are based on GMGN and on-chain data**
- **No on-chain analyzer logic in frontend—backend only**

## 🔄 Real-Time Pipeline Improvements
- **Discovery script now always processes the freshest tokens from the latest 1-minute snapshot**
- **Smart filtering ensures only high-quality tokens are processed**
- **Wallet info is enriched immediately after discovery**
- **Frontend dashboard and all token lists always reflect the latest data**

## 🔒 Security & Data
- All sensitive config (MongoDB URI, etc) is in `config/` or env vars
- Local watchlists are stored in browser localStorage
- No user data leaves your device unless you export it

## 📱 Roadmap
- **API Service**: Public endpoints for analytics (coming soon)
- **Phone App**: Follow wallets/tokens from your phone
- **Real-Time Token Analysis**: Sub-second updates, advanced stats
- **Secret Integration**: Major partnership (details soon!)

## 🤝 Contributing
- Private repo. For access or contributions, contact the maintainer.
- PRs and issues are welcome for bugfixes and improvements.

## 📄 License
Private project – All rights reserved.
