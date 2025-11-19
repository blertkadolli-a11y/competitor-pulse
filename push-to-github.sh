#!/bin/bash

echo "🚀 Pushing CompetitorPulse to GitHub..."
echo ""

cd /Users/blerti/webapp01

# Initialize git if needed
if [ ! -d .git ]; then
    echo "Initializing git repository..."
    git init
fi

# Add all files
echo "Adding all files..."
git add .

# Check status
echo ""
echo "Files to be committed:"
git status --short | head -20

echo ""
echo "📝 Committing files..."
git commit -m "Initial commit - CompetitorPulse SaaS app with full UI"

# Set main branch
git branch -M main

echo ""
echo "✅ Local commit complete!"
echo ""
echo "Next steps:"
echo "1. Get your GitHub repository URL (from GitHub: Code button → HTTPS URL)"
echo "2. Run this command (replace YOUR_USERNAME and YOUR_REPO_NAME):"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
echo "   git push -u origin main"
echo ""
echo "Or if you already added the remote:"
echo "   git push -u origin main"
echo ""

