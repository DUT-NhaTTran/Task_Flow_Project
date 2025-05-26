#!/bin/bash

echo "🚀 Preparing TaskFlow for Render Deployment"
echo "============================================"
echo "📁 Repository Structure:"
echo "   ├── backend/ (Java services + AI-Service)"
echo "   └── frontend/ (React app)"
echo ""

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

# Verify project structure
echo "🔍 Verifying project structure..."
if [ ! -d "backend" ]; then
    echo "❌ backend/ directory not found!"
    exit 1
fi

if [ ! -d "frontend" ]; then
    echo "❌ frontend/ directory not found!"
    exit 1
fi

if [ ! -d "backend/AI-Service" ]; then
    echo "❌ backend/AI-Service/ directory not found!"
    exit 1
fi

if [ ! -f "backend/pom.xml" ]; then
    echo "❌ backend/pom.xml not found!"
    exit 1
fi

echo "✅ Project structure verified"

# Check Dockerfiles for Java services
echo "🐳 Checking Docker configuration..."
services=("User-Service" "Accounts-Service" "Projects-Service" "Tasks-Service" "File-Service" "Sprints-Service" "Notifications-Service")
all_dockerfiles_exist=true

for service in "${services[@]}"; do
    if [ -f "backend/$service/Dockerfile" ]; then
        echo "✅ backend/$service/Dockerfile found"
    else
        echo "❌ backend/$service/Dockerfile missing!"
        all_dockerfiles_exist=false
    fi
done

if [ "$all_dockerfiles_exist" = false ]; then
    echo "⚠️ Some Dockerfiles are missing. Java services need Docker for Render deployment."
    echo "Please ensure all Java services have Dockerfiles before deploying."
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
*/target/

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
git commit -m "Prepare TaskFlow for Render deployment - Docker + Python services" || echo "No changes to commit"

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
echo "📋 Services ready to deploy:"
echo "   📊 Database (PostgreSQL)"
echo "   🤖 AI Service (backend/AI-Service - Python FastAPI)"
echo "   🐳 User Service (backend/User-Service - Docker)"
echo "   🐳 Accounts Service (backend/Accounts-Service - Docker)"
echo "   🐳 Projects Service (backend/Projects-Service - Docker)"
echo "   🐳 Tasks Service (backend/Tasks-Service - Docker)"
echo "   🐳 File Service (backend/File-Service - Docker)"
echo "   🐳 Sprints Service (backend/Sprints-Service - Docker)"
echo "   🐳 Notifications Service (backend/Notifications-Service - Docker)"
echo "   🌐 Frontend (frontend/ - Next.js)"
echo ""
echo "📖 Next steps:"
echo "1. Go to https://render.com"
echo "2. Connect your GitHub repository"
echo "3. Use the render.yaml blueprint to deploy all services"
echo "4. For Java services, select 'Docker' environment"
echo "5. Follow the RENDER_DEPLOYMENT.md guide for detailed instructions" 