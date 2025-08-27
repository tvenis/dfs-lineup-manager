#!/bin/bash

# DFS Lineup Manager - Deployment Setup Script
# This script helps set up the initial deployment configuration

set -e

echo "🚀 DFS Lineup Manager - Deployment Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if required tools are installed
check_requirements() {
    print_info "Checking requirements..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python 3.11+ first."
        exit 1
    fi
    
    print_status "All requirements are met!"
}

# Setup Git repository
setup_git() {
    print_info "Setting up Git repository..."
    
    if [ ! -d ".git" ]; then
        print_error "Git repository not found. Please run 'git init' first."
        exit 1
    fi
    
    # Check if remote origin is set
    if ! git remote get-url origin &> /dev/null; then
        print_warning "No remote origin set. You'll need to add it manually:"
        echo "git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
        echo ""
    else
        print_status "Git remote origin is configured"
    fi
}

# Setup Vercel
setup_vercel() {
    print_info "Setting up Vercel deployment..."
    
    if ! command -v vercel &> /dev/null; then
        print_info "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    print_info "Vercel CLI is installed. To deploy:"
    echo "1. cd web"
    echo "2. vercel"
    echo "3. Follow the prompts to connect to GitHub"
    echo "4. Set the root directory to 'web'"
    echo ""
}

# Setup environment files
setup_environment() {
    print_info "Setting up environment files..."
    
    # Frontend environment
    if [ ! -f "web/.env.local" ]; then
        cat > web/.env.local << EOF
# Frontend Environment Variables
NEXT_PUBLIC_API_URL=http://localhost:8000

# Add your production API URL here when deploying
# NEXT_PUBLIC_API_URL=https://your-backend.railway.app
EOF
        print_status "Created web/.env.local"
    else
        print_info "web/.env.local already exists"
    fi
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        cat > backend/.env << EOF
# Backend Environment Variables
DATABASE_URL=sqlite:///./dfs_app.db
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
ENVIRONMENT=development

# Production settings (update when deploying)
# DATABASE_URL=postgresql://username:password@host:port/database
# CORS_ORIGINS=https://your-frontend.vercel.app
# ENVIRONMENT=production
EOF
        print_status "Created backend/.env"
    else
        print_info "backend/.env already exists"
    fi
}

# Setup development scripts
setup_scripts() {
    print_info "Setting up development scripts..."
    
    # Make start_dev.sh executable
    chmod +x start_dev.sh
    
    # Create package.json scripts for the root
    if [ ! -f "package.json" ]; then
        cat > package.json << EOF
{
  "name": "dfs-lineup-manager",
  "version": "1.0.0",
  "description": "A full-stack web application for managing Daily Fantasy Sports lineups",
  "scripts": {
    "dev": "./start_dev.sh",
    "dev:frontend": "cd web && npm run dev",
    "dev:backend": "cd backend && python main.py",
    "build": "cd web && npm run build",
    "install:all": "npm install && cd web && npm install && cd ../backend && pip install -r requirements.txt",
    "setup": "chmod +x start_dev.sh && npm install && cd web && npm install && cd ../backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
  },
  "keywords": ["dfs", "fantasy-sports", "lineup-manager", "nextjs", "fastapi"],
  "author": "Your Name",
  "license": "MIT"
}
EOF
        print_status "Created root package.json with development scripts"
    fi
}

# Display next steps
show_next_steps() {
    echo ""
    echo "🎉 Setup Complete! Here are your next steps:"
    echo ""
    echo "1. 📝 Update the README.md with your information"
    echo "2. 🚀 Create a GitHub repository and push your code:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git"
    echo "   git push -u origin main"
    echo ""
    echo "3. 🌐 Deploy to Vercel:"
    echo "   cd web"
    echo "   vercel"
    echo ""
    echo "4. 🗄️  Deploy backend to Railway:"
    echo "   - Connect your GitHub repo to Railway"
    echo "   - Set environment variables"
    echo "   - Deploy automatically"
    echo ""
    echo "5. 🔄 Set up GitHub Actions secrets:"
    echo "   - VERCEL_TOKEN"
    echo "   - ORG_ID"
    echo "   - PROJECT_ID"
    echo "   - NEXT_PUBLIC_API_URL"
    echo ""
    echo "📚 For detailed instructions, see docs/DEVELOPMENT_WORKFLOW.md"
}

# Main execution
main() {
    check_requirements
    setup_git
    setup_vercel
    setup_environment
    setup_scripts
    show_next_steps
}

# Run the script
main
