# CIPHER: Solana Blockchain Intelligence Platform

CIPHER is a full-stack intelligence platform for Solana, featuring real-time copytrader analysis, wallet and token discovery, and advanced analytics. Built with a FastAPI backend, MongoDB Atlas, and a modern React (Vite) frontend.

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
├── backend_api/            # FastAPI backend (main API server)
├── frontend-vite/          # React (Vite) frontend
│   └── public/assets/      # Static assets (logo, bgvid.webm, etc.)
├── venv/                   # Python virtual environment (not tracked)
├── .env                    # Environment variables (Mongo URI, API keys, etc.)
├── README.md               # This file
```

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/solens_ai.git
cd solens_ai
```

### 2. Environment Setup

- Copy `.env.example` to `.env` and fill in your MongoDB URI and any API keys.

#### Python (Backend & Scrapers)

```bash
cd backend_api
python -m venv ../venv
source ../venv/bin/activate  # or ../venv/Scripts/activate on Windows
pip install -r requirements.txt
```

#### Node.js (Scrapers & Frontend)

```bash
cd frontend-vite
npm install
cd ../backend/scrapers
npm install
```

### 3. Running the Backend

```bash
cd backend_api
uvicorn main:app --reload
```

- The backend will start the API server and all background jobs (scrapers, ML processor, etc.).

### 4. Running the Frontend

```bash
cd frontend-vite
npm run dev
```

- Visit [http://localhost:5173](http://localhost:5173) to view the app.

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

## Troubleshooting

- **MongoDB Connection Issues:**  
  Ensure your IP is whitelisted in MongoDB Atlas and your `.env` is correct.
- **No New Wallets:**  
  Try relaxing quality filters or check logs for errors.
- **Frontend Video Not Loading:**  
  Make sure the path in `LandingPage.tsx` matches the file location in `public/assets/`.

---

## License

MIT

---

## Credits

- Built by [Your Name or Team]
- Powered by Solana, MongoDB Atlas, FastAPI, React, and Vite.
