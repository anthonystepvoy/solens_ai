# Solens AI - Trader Discovery Platform

A comprehensive platform for discovering and analyzing cryptocurrency traders using AI-powered insights.

## 🚀 Features

- **Trader Discovery**: Automatically find high-performing traders from top tokens
- **Smart Scoring**: AI-powered copy trading scores for trader evaluation
- **Real-time Analysis**: On-chain analysis of trader performance
- **Web Interface**: Streamlit-based dashboard for easy interaction

## 📁 Project Structure

```
solens_ai/
├── frontend/           # Streamlit web application
│   ├── pages/         # Multi-page dashboard
│   └── assets/        # Static assets
├── backend/           # Backend services and scrapers
│   └── js_scrapers/   # JavaScript scrapers
├── config/            # Configuration files
└── data/              # Data storage
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

4. **Configure credentials**
   - Place your Firestore service account key in `config/solensai-service-account.json`
   - Or configure Streamlit secrets for deployment

### Running the Application

1. **Start the Streamlit app**
   ```bash
   streamlit run frontend/pages/1_Home.py
   ```

2. **Run discovery scripts**
   ```bash
   # Discover traders from top tokens
   node backend/js_scrapers/gmgn_coins_traders.js
   
   # Analyze wallet performance
   node backend/js_scrapers/gmgn_wallet_scraper.js
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

## 🔒 Security

- Service account keys are excluded from version control
- Sensitive configuration is handled via environment variables
- Data access is controlled through Firestore security rules

## 🤝 Contributing

This is a private repository for collaboration. Please coordinate with the project maintainer for contributions.

## 📄 License

Private project - All rights reserved.
