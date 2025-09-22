#!/usr/bin/env python3
"""
Setup script to configure local environment variables
"""

import os

def setup_local_env():
    """Guide user through setting up local environment"""
    print("🔧 DFS App Environment Setup")
    print("=" * 40)
    print()
    print("This script helps you set up environment variables for the DFS App.")
    print()
    
    # Check current environment
    print("📋 Current Environment Status:")
    print()
    
    # Check database URL
    db_url = os.getenv("DATABASE_URL") or os.getenv("LOCAL_DATABASE_URL")
    if db_url:
        print("✅ Database URL is set")
        if "neon" in db_url.lower():
            print("   Using Neon PostgreSQL")
        elif "sqlite" in db_url.lower():
            print("   Using SQLite (development)")
        else:
            print("   Using custom database")
    else:
        print("❌ Database URL not set")
    
    # Check OpenAI API key
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        print("✅ OpenAI API Key is set")
    else:
        print("❌ OpenAI API Key not set")
    
    # Check Odds API key
    odds_key = os.getenv("ODDS_API_KEY")
    if odds_key:
        print("✅ Odds API Key is set")
    else:
        print("❌ Odds API Key not set (optional)")
    
    print()
    print("🔧 Setup Options:")
    print()
    print("1. Database Setup (Neon PostgreSQL)")
    print("2. OpenAI API Key Setup")
    print("3. Odds API Key Setup (optional)")
    print("4. Check all environment variables")
    print("5. Create .env file template")
    print()
    
    choice = input("Choose option (1-5): ").strip()
    
    if choice == "1":
        setup_database_env()
    elif choice == "2":
        setup_openai_env()
    elif choice == "3":
        setup_odds_env()
    elif choice == "4":
        check_all_env()
    elif choice == "5":
        create_env_template()
    else:
        print("❌ Invalid choice")

def setup_database_env():
    """Setup database environment variable"""
    print("🗄️  Database Environment Setup")
    print("=" * 35)
    print()
    print("After resetting your Neon password, you'll need to set up your local environment.")
    print()
    print("1. Go to Neon Console: https://console.neon.tech")
    print("2. Navigate to your project")
    print("3. Copy the new connection string")
    print("4. Set the environment variable:")
    print()
    print("   For bash/zsh:")
    print("   echo 'export LOCAL_DATABASE_URL=\"postgresql://your-new-connection-string\"' >> ~/.bashrc")
    print("   source ~/.bashrc")
    print()
    print("   For this session only:")
    print("   export LOCAL_DATABASE_URL=\"postgresql://your-new-connection-string\"")
    print()
    print("5. Restart your development server")

def setup_openai_env():
    """Setup OpenAI API key"""
    print("🔑 OpenAI API Key Setup")
    print("=" * 30)
    print()
    print("Run the dedicated OpenAI setup script:")
    print("   python setup_openai_env.py")
    print()
    print("Or set manually:")
    print("   export OPENAI_API_KEY=\"your-api-key-here\"")

def setup_odds_env():
    """Setup Odds API key"""
    print("🎲 Odds API Key Setup")
    print("=" * 25)
    print()
    print("1. Get your API key from: https://the-odds-api.com/")
    print("2. Set the environment variable:")
    print()
    print("   export ODDS_API_KEY=\"your-api-key-here\"")
    print()
    print("   Or add to your shell profile:")
    print("   echo 'export ODDS_API_KEY=\"your-api-key-here\"' >> ~/.bashrc")

def check_all_env():
    """Check all environment variables"""
    print("🔍 Environment Variables Check")
    print("=" * 35)
    print()
    
    env_vars = [
        ("DATABASE_URL", "Database connection string"),
        ("LOCAL_DATABASE_URL", "Local database connection string"),
        ("OPENAI_API_KEY", "OpenAI API key for ChatGPT Vector Service"),
        ("ODDS_API_KEY", "Odds API key for sports data (optional)"),
    ]
    
    for var, description in env_vars:
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            if "key" in var.lower() or "password" in var.lower():
                masked_value = f"{value[:8]}..." if len(value) > 8 else "***"
                print(f"✅ {var}: {masked_value}")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: Not set")
        print(f"   {description}")
        print()

def create_env_template():
    """Create .env file template"""
    print("📝 Creating .env file template")
    print("=" * 30)
    
    template = """# DFS App Environment Variables

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://username:password@host:port/database
LOCAL_DATABASE_URL=postgresql://username:password@host:port/database

# OpenAI API (for ChatGPT Vector Service)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Odds API (optional - for sports data)
ODDS_API_KEY=your-odds-api-key-here

# API Settings
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=true

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
"""
    
    try:
        with open(".env.template", "w") as f:
            f.write(template)
        print("✅ Created .env.template file")
        print("   Copy to .env and fill in your actual values")
        print("   ⚠️  NEVER commit .env files to git!")
    except Exception as e:
        print(f"❌ Error creating template: {e}")

if __name__ == "__main__":
    setup_local_env()
