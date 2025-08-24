# 🔍 SOLENS: Solana Blockchain Intelligence Platform

<div align="center">

![Solana](https://img.shields.io/badge/Solana-9945FF?style=for-the-badge&logo=solana&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)

</div>

**SOLENS** is a comprehensive intelligence platform for Solana blockchain analysis, featuring real-time copytrader detection, wallet discovery, and advanced ML-powered analytics. Built with FastAPI, MongoDB Atlas, and modern React frontend.

---

## ✨ Features

🔄 **Real-Time Discovery**  
&nbsp;&nbsp;&nbsp;&nbsp;Automated scrapers analyze top Solana tokens and wallets every minute, hour, and day

🎯 **Copytrader Detection**  
&nbsp;&nbsp;&nbsp;&nbsp;Advanced algorithms detect and rank wallets based on profit patterns and trading behavior

🔍 **Quality Filtering**  
&nbsp;&nbsp;&nbsp;&nbsp;Intelligent filters ensure only high-quality tokens and wallets with sufficient liquidity and activity

🤖 **ML-Powered Analytics**  
&nbsp;&nbsp;&nbsp;&nbsp;Machine learning pipeline generates smart scores, risk assessments, and behavioral clusters

💻 **Modern Interface**  
&nbsp;&nbsp;&nbsp;&nbsp;Sleek React dashboard with real-time updates and terminal-inspired design

---
<div align="center">
<img width="1400" height="493" alt="image" src="https://github.com/user-attachments/assets/10f1fc9d-d1a5-47b7-bfaa-07d47d8d35c8" />

<img width="796" height="436" alt="image" src="https://github.com/user-attachments/assets/f6bdc0d4-8b9e-49e7-8ee4-a582d2341294" />

<img width="1069" height="925" alt="image" src="https://github.com/user-attachments/assets/34632661-202e-4043-83e1-af8280240fc0" />

</div>

## 📁 Project Structure

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

## 📋 Prerequisites

🐍 **Python 3.8+** with pip  
📦 **Node.js 18+** with npm  
🍃 **MongoDB Atlas** account (or local MongoDB)  
🔧 **Git** version control

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/anthonystepvoy/solens_ai.git
cd solens_ai
```

### 2️⃣ Environment Setup

Create a `.env` file in the root directory with the following variables:

```bash
MONGODB_URI=your_mongodb_connection_string
MONGO_URI=your_mongodb_connection_string  # Alternative name for compatibility
# Add other environment variables as needed
```

### 3️⃣ Install Dependencies

#### 🐍 Python (Backend API)

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt
```

#### ⚛️ React Frontend

```bash
cd frontend-vite
npm install
```

#### 🔄 Data Scrapers

```bash
cd backend/scrapers
npm install
```

### 4️⃣ Running the Application

#### 🖥️ Start the Backend API

```bash
cd backend_api
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`

#### 🌐 Start the Frontend

```bash
cd frontend-vite
npm run dev
```

The frontend will be available at `http://localhost:5173`

#### 🏗️ Production Build

```bash
# Build frontend for production
cd frontend-vite
npm run build

# Serve production build
npm run preview
```

---

## 🔧 Common Issues & Solutions

### ❌ "vite" command not found
💡 **Solution:** Run `npm install` in the `frontend-vite` directory

### ❌ "Cannot find package 'puppeteer-extra'"
💡 **Solution:** Run `npm install` in the `backend/scrapers` directory

### ❌ MongoDB Connection Issues
💡 **Solutions:**
- Ensure your IP is whitelisted in MongoDB Atlas
- Verify `.env` file contains correct MongoDB URI
- Check network connectivity and firewall settings

---

## 🔌 API Endpoints

### 🎯 Core Endpoints
- `GET /` — API health check
- `GET /dashboard-summary` — Dashboard analytics and metrics
- `GET /wallets` — List all tracked wallets
- `GET /wallet/{address}` — Get specific wallet details
- `GET /tokens` — List all tracked tokens
- `GET /top-tokens` — Get top performing tokens

### 📊 Analysis Endpoints
- `POST /copytrade-analyze` — Analyze wallet for copytrading patterns
- `GET /api/copytrade-analyze-progress` — Check analysis progress
- `GET /api/copytrade-analyze-result` — Get analysis results
- `POST /api/copytrade-cluster-analyze` — Cluster analysis for multiple wallets

### 🗄️ Data Management
- `POST /run-discovery` — Trigger manual data discovery
- `POST /ml-process` — Run ML processing on wallet data
- `GET /recent-activity` — Get recent platform activity

---

## 🏗️ Architecture

### 🔧 Backend Components
- **FastAPI Server** (`backend_api/main.py`) - Main API server with REST endpoints
- **Data Scrapers** (`backend/scrapers/`) - Node.js scripts for blockchain data collection
- **ML Processor** - Machine learning pipeline for wallet analysis and scoring
- **MongoDB Integration** - Data persistence and querying

### 🎨 Frontend Components
- **React + Vite** - Modern frontend framework with fast development
- **Dashboard** - Real-time analytics and wallet monitoring
- **Wallet Finder** - Search and analyze individual wallets
- **Copytrade Analyzer** - Pattern recognition for copy trading detection
- **Token Tracker** - Monitor and analyze token performance

### 🔄 Data Flow
1. **Collection**: Scrapers fetch data from Solana blockchain and external APIs
2. **Processing**: ML algorithms analyze and score wallet behavior
3. **Storage**: Processed data stored in MongoDB
4. **API**: FastAPI serves data to frontend
5. **Visualization**: React frontend displays analytics and insights

---

## 👨‍💻 Development Workflow

### 🛠️ Local Development
1. **Database**: Ensure MongoDB is running and accessible
2. **Backend**: `cd backend_api && uvicorn main:app --reload`
3. **Frontend**: `cd frontend-vite && npm run dev`
4. **Scrapers**: Run individual scrapers as needed for data collection

### 📂 Code Structure
```
solens_ai/
├── backend_api/          # FastAPI server
│   └── main.py          # Main API application
├── backend/             # Data collection and processing
│   ├── scrapers/        # Blockchain data scrapers
│   ├── database/        # Database utilities
│   └── config/          # Configuration files
├── frontend-vite/       # React frontend
│   ├── src/            # Source code
│   ├── public/         # Static assets
│   └── dist/           # Built application
└── requirements.txt     # Python dependencies
```

---

## 🤝 Contributing

This is a personal project showcasing Solana blockchain analytics capabilities. While not actively seeking contributions, feedback and suggestions are welcome through issues or discussions.

## 📄 License

MIT License - see LICENSE file for details

## 📞 Contact

<div align="center">

**👨‍💻 Developer:** Anthony Stepvoy  
**🐙 GitHub:** [@anthonystepvoy](https://github.com/anthonystepvoy)  
**🐦 X/Twitter:** [@anthonystepvoy](https://x.com/anthonystepvoy)  
**🚀 Project:** [solens_ai](https://github.com/anthonystepvoy/solens_ai)

</div>

## 🛠️ Technology Stack

<div align="center">

| Category | Technologies |
|----------|-------------|
| 🔗 **Blockchain** | Solana |
| 🗄️ **Database** | MongoDB Atlas |
| 🔧 **Backend** | FastAPI, Python |
| 🎨 **Frontend** | React, TypeScript, Vite |
| 💅 **Styling** | Custom CSS (Terminal Theme) |
| 📊 **Processing** | Node.js, Python ML |
| 🚀 **Deployment** | Railway, Vercel Compatible |

</div>

---

<div align="center">

**Note**: This project was originally built for personal use and is now being shared publicly to contribute to the developer community.

**⭐ Star this repo if you find it useful!**

*Built with ❤️ for the Solana ecosystem*

</div>
