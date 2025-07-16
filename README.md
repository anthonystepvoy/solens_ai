# CYPHER: Solana Blockchain Intelligence Platform

CYPHER is a full-stack intelligence platform for Solana, featuring real-time copytrader analysis, wallet and token discovery, and advanced analytics. Built with a FastAPI backend, MongoDB Atlas, and a modern React (Vite) frontend.

---

## Features

- **Real-Time Token & Wallet Discovery:**  
  Automated scrapers fetch and analyze the top Solana tokens and wallets every minute, hour, and day.
- **Copytrader Analysis:**  
  Detects and ranks wallets based on profit, activity, and copytrading behavior.
- **Quality Filtering:**  
  Only high-quality tokens and wallets are stored, using customizable filters for liquidity, holders, profit, and more.
- **ML-Driven Insights:**  
  Automated machine learning processor tags wallets with smart/risk scores and clusters.
- **Modern Frontend:**  
  Beautiful, responsive React (Vite) UI with live stats and hero video.

---

## Project Structure

```
solens_ai/
│
├── backend/                # Scrapers, database, and utility modules
│   └── scrapers/          # Node.js scrapers with puppeteer
├── backend_api/            # FastAPI backend (main API server)
├── frontend-vite/          # React (Vite) frontend
│   └── public/assets/      # Static assets (logo, bgvid.webm, etc.)
├── venv/                   # Python virtual environment (not tracked)
├── .env                    # Environment variables (Mongo URI, API keys, etc.)
├── README.md               # This file
```

---

## Prerequisites

- **Python 3.8+** with pip
- **Node.js 18+** with npm
- **MongoDB Atlas** account (or local MongoDB)
- **Git**

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/solens_ai.git
cd solens_ai
```

### 2. Environment Setup

- Copy `.env.example` to `.env` and fill in your MongoDB URI and any API keys.

### 3. Install Dependencies

#### Python (Backend API)

```bash
cd backend_api
python -m venv ../venv
source ../venv/bin/activate  # or ../venv/Scripts/activate on Windows
pip install -r requirements.txt
```

#### Node.js (Frontend)

```bash
cd frontend-vite
npm install
```

#### Node.js (Scrapers)

```bash
cd backend/scrapers
npm install
```

### 4. Running the Backend

```bash
cd backend_api
uvicorn main:app --reload
```

- The backend will start the API server and all background jobs (scrapers, ML processor, etc.).
- The scheduler will automatically start scraping and processing data.
- API will be available at `http://127.0.0.1:8000`

### 5. Running the Frontend

```bash
cd frontend-vite
npm run dev
```

- Visit [http://localhost:5173](http://localhost:5173) to view the app.

---

## Common Issues & Solutions

### "vite" command not found
- **Solution:** Run `npm install` in the `frontend-vite` directory

### "Cannot find package 'puppeteer-extra'"
- **Solution:** Run `npm install` in the `backend/scrapers` directory

### MongoDB Connection Issues
- Ensure your IP is whitelisted in MongoDB Atlas
- Check that your `.env` file has the correct MongoDB URI

---

## API Endpoints

- `GET /wallets` — List all discovered wallets
- `GET /wallet/{address}` — Get details for a specific wallet
- `GET /dashboard-summary` — Get summary stats for the dashboard

---

## Customization

- **Quality Filters:**  
  Adjust filtering logic in `backend/scrapers/gmgn_coins_traders.js` and related scripts.
- **ML Processor:**  
  Tweak or extend the ML logic in the backend as needed.
- **Frontend Assets:**  
  Place new images/videos in `frontend-vite/public/assets/` and update references in your React components.

---

## Development Workflow

1. **Start Backend:** `cd backend_api && uvicorn main:app --reload`
2. **Start Frontend:** `cd frontend-vite && npm run dev`
3. **Monitor Logs:** The backend will show scheduler activity and API requests
4. **Data Flow:** Scrapers → MongoDB → API → Frontend

---

## License

MIT

---

## Credits

- Built by [Your Name or Team]
- Powered by Solana, MongoDB Atlas, FastAPI, React, and Vite.
