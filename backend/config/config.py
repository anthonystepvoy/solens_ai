import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/solens_ai')
HELIUS_API_KEY = os.getenv('HELIUS_API_KEY', '')
# Add other settings as needed, e.g.:
# SCRAPER_INTERVAL = int(os.getenv('SCRAPER_INTERVAL', '60'))

# Example usage:
# from backend.config.config import MONGO_URI, HELIUS_API_KEY 