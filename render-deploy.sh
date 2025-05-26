#!/bin/bash

echo "🚀 Preparing TaskFlow for Render Deployment"
echo "============================================"

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
    git branch -M main
fi

# Create .gitignore if not exists
if [ ! -f ".gitignore" ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << 'EOF'
# Environment files
.env
.env.local
.env.production

# Dependencies
node_modules/
*/node_modules/

# Build outputs
build/
dist/
target/

# IDE files
.idea/
.vscode/
*.iml

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Cache
.cache/
__pycache__/
*.pyc
*.pyo

# AI Service specific
backend/AI-Service/models/
backend/AI-Service/.cache/
EOF
fi

# Add all files
echo "📦 Adding files to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Prepare for Render deployment" || echo "No changes to commit"

# Check remote
if ! git remote get-url origin &> /dev/null; then
    echo "⚠️ No remote repository found."
    echo "Please add your GitHub repository:"
    echo "git remote add origin https://github.com/yourusername/your-repo.git"
    echo "Then run: git push -u origin main"
else
    echo "📤 Pushing to remote repository..."
    git push origin main
fi

echo ""
echo "✅ Repository prepared for Render deployment!"
echo ""
echo "Next steps:"
echo "1. Go to https://render.com"
echo "2. Connect your GitHub repository"
echo "3. Follow the RENDER_DEPLOYMENT.md guide"
echo ""
echo "Services to deploy:"
echo "- 📊 Database (PostgreSQL)"
echo "- 🤖 AI Service (Python FastAPI)"
echo "- 👤 User Service (Java Spring Boot)"
echo "- 📋 Tasks Service (Java Spring Boot)"
echo "- 📁 Projects Service (Java Spring Boot)"
echo "- 🌐 Frontend (React)" 