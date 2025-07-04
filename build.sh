#!/bin/bash

echo "Installing Node.js dependencies..."
cd backend/scrapers && npm install

echo "Installing Python dependencies..."
cd ../..
pip install -r requirements.txt

echo "Build complete!" 