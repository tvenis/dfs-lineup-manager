#!/usr/bin/env python3
"""
Setup script to configure local database environment variable
"""

import os

def setup_local_env():
    """Guide user through setting up local environment"""
    print("🔧 Database Environment Setup")
    print("=" * 40)
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
    print()
    print("⚠️  NEVER commit database credentials to git again!")
    print("✅ Always use environment variables for sensitive data")

if __name__ == "__main__":
    setup_local_env()
