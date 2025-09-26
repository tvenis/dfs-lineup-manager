#!/usr/bin/env python3
"""
Test script to debug deployment issues
"""

import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("Testing imports...")
    
    print("1. Testing load_env...")
    from load_env import load_env_file
    load_env_file()
    print("   ✅ load_env imported successfully")
    
    print("2. Testing database...")
    from app.database import engine, get_database_url
    print(f"   ✅ Database URL: {get_database_url()[:50]}...")
    
    print("3. Testing models...")
    from app.models import Base, Comment
    print("   ✅ Models imported successfully")
    
    print("4. Testing schemas...")
    from app.schemas import Comment as CommentSchema, QuickNote
    print("   ✅ Schemas imported successfully")
    
    print("5. Testing routers...")
    from app.routers import comments
    print("   ✅ Comments router imported successfully")
    
    print("6. Testing main app...")
    from main import app
    print("   ✅ Main app imported successfully")
    
    print("\n🎉 All imports successful! The issue might be runtime-related.")
    
except Exception as e:
    print(f"\n❌ Error during import: {e}")
    import traceback
    traceback.print_exc()
