#!/bin/bash

echo "🚀 Starting git push process..."

# Add all files
echo "📦 Adding all files..."
git add -A

# Show what will be committed
echo ""
echo "📋 Files to be committed:"
git status --short

# Commit
echo ""
echo "💾 Committing files..."
git commit -m "Initial project commit - Full CompetitorPulse app"

# Set merge strategy
echo ""
echo "⚙️  Configuring git..."
git config pull.rebase false

# Pull first (merge if needed)
echo ""
echo "⬇️  Pulling from remote..."
git pull origin main --allow-unrelated-histories --no-edit || echo "Pull completed or no conflicts"

# Push to GitHub
echo ""
echo "⬆️  Pushing to GitHub..."
git push -u origin main

echo ""
echo "✅ Done! Check your GitHub repository now."

