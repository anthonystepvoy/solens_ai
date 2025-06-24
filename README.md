# Solens AI - Trader Discovery Platform

A comprehensive platform for discovering and analyzing cryptocurrency traders using AI-powered insights.

## 🚀 Features

- **Trader Discovery**: Automatically find high-performing traders from top tokens
- **Smart Scoring**: AI-powered copy trading scores for trader evaluation
- **Real-time Analysis**: On-chain analysis of trader performance
- **Modern Web Interface**: React TypeScript frontend with 3D visualizations
- **RESTful API**: FastAPI backend for scalable data processing
- **ML Processing**: Advanced machine learning for trader analysis

## 📁 Project Structure

```
solens_ai/
├── frontend-vite/     # React TypeScript frontend (Vite)
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   ├── assets/       # 3D models and images
│   └── package.json  # Frontend dependencies
├── backend/          # Backend services and scrapers
│   ├── js_scrapers/  # JavaScript scrapers
│   └── python_scripts/ # Python ML and analysis scripts
├── backend-api/      # FastAPI backend service
├── backend_api/      # Alternative API structure
├── config/           # Configuration files
└── data/             # Data storage
```

## 🛠️ Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- Google Cloud Firestore credentials

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
   npm install
   ```

4. **Install Frontend dependencies**
   ```bash
   cd frontend-vite
   npm install
   cd ..
   ```

5. **Configure credentials**
   - Place your Firestore service account key in `config/solensai-service-account.json`
   - Or configure environment variables for deployment

### Running the Application

1. **Start the Frontend (Development)**
   ```bash
   cd frontend-vite
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`

2. **Start the Backend API**
   ```bash
   # Option 1: Using backend-api
   cd backend-api
   python main.py
   
   # Option 2: Using backend_api
   cd backend_api
   python main.py
   ```

3. **Run discovery scripts**
   ```bash
   # Discover traders from top tokens
   node backend/js_scrapers/gmgn_coins_traders.js
   
   # Analyze wallet performance
   node backend/js_scrapers/gmgn_wallet_scraper.js
   
   # Run ML processing
   python backend/python_scripts/ml_processor.py
   
   # Run on-chain analysis
   python backend/python_scripts/on_chain_analyzer.py
   ```

## 🔧 Configuration

The application uses Google Cloud Firestore for data storage. Make sure to:
- Set up a Firestore database
- Configure your service account credentials
- Set appropriate security rules

## 📊 Usage

1. **Discover Traders**: Use the discovery page to find new traders from trending tokens
2. **Analyze Performance**: View detailed trader analysis and copy trading scores
3. **Monitor Activity**: Track trader activity and performance over time
4. **3D Visualization**: Interactive 3D wallet models and data visualization

## 🎨 Frontend Features

- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **Three.js** for 3D visualizations
- **Modern UI** with responsive design
- **Real-time updates** from backend API

## 🔧 Backend Features

- **FastAPI** for high-performance API
- **Machine Learning** processing pipeline
- **On-chain analysis** for trader evaluation
- **Scalable architecture** for production deployment

## 🔒 Security

- Service account keys are excluded from version control
- Sensitive configuration is handled via environment variables
- Data access is controlled through Firestore security rules
- API endpoints are secured with authentication

## 🤝 Contributing

This is a private repository for collaboration. Please coordinate with the project maintainer for contributions.

## 📄 License

Private project - All rights reserved.
