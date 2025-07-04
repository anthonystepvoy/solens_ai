#!/bin/bash

echo "🚀 Railway Deployment Setup for Solens AI"
echo "=========================================="

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ No remote origin found. Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/yourusername/your-repo.git"
    echo "   git push -u origin main"
    exit 1
fi

echo "✅ Git repository configured"

# Check for required files
echo "📋 Checking required files..."

required_files=(
    "railway.json"
    "nixpacks.toml"
    "Procfile"
    "backend_api/main.py"
    "backend_api/requirements.txt"
    "backend/scrapers/package.json"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (missing)"
    fi
done

echo ""
echo "🎯 Next Steps:"
echo "1. Push your code to GitHub:"
echo "   git add ."
echo "   git commit -m 'Add Railway deployment config'"
echo "   git push"
echo ""
echo "2. Go to https://railway.app and create a new project"
echo "3. Connect your GitHub repository"
echo "4. Set environment variables (MONGO_URI, etc.)"
echo "5. Deploy!"
echo ""
echo "📖 See RAILWAY_DEPLOYMENT.md for detailed instructions" 