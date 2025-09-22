#!/usr/bin/env python3
"""
Simple script to create a vector store for user "tvenis"
"""

import asyncio
import os
from pathlib import Path
from app.chatgpt_vector import ChatGPTVectorService, get_user_dfs_vector_store

def load_env_file():
    """Load .env file if it exists"""
    env_file = Path(".env")
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"').strip("'")
                    os.environ[key] = value

async def create_tvenis_vector_store():
    """Create or get vector store for user tvenis"""
    
    print("🔧 Creating Vector Store for tvenis")
    print("=" * 40)
    
    # Try to load from .env file first
    load_env_file()
    
    # Check if API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found!")
        print("   Please set your OpenAI API key first:")
        print("   export OPENAI_API_KEY=\"sk-your-api-key-here\"")
        print("   Or create a .env file with: OPENAI_API_KEY=sk-your-api-key-here")
        print("   Or run: python setup_openai_env.py")
        return None
    
    print("✅ OpenAI API key found")
    
    try:
        # Initialize service for user "tvenis"
        service = ChatGPTVectorService("tvenis")
        
        # Check if store already exists
        existing_store = await service.find_user_vector_store()
        if existing_store:
            print(f"✅ Found existing vector store: {existing_store['name']}")
            print(f"   Store ID: {existing_store['id']}")
            print(f"   Status: {existing_store['status']}")
            print(f"   Files: {existing_store['file_counts']}")
            return existing_store['id']
        
        # Create new store
        print("📦 Creating new vector store...")
        vs_id = await service.create_vector_store()
        print(f"✅ Created vector store for tvenis: {vs_id}")
        print(f"   Store name: tvenis-dfs")
        
        return vs_id
        
    except Exception as e:
        print(f"❌ Error creating vector store: {e}")
        return None

async def main():
    """Main function"""
    vs_id = await create_tvenis_vector_store()
    
    if vs_id:
        print()
        print("🎉 Success! Your vector store is ready.")
        print(f"   Store ID: {vs_id}")
        print()
        print("📋 Next steps:")
        print("   1. Upload files: await service.upload_file('your-file.csv', vs_id)")
        print("   2. Query data: await service.chat_with_file_search('Your question?', vs_id)")
        print()
        print("💡 Example usage:")
        print("   from app.chatgpt_vector import ChatGPTVectorService")
        print("   service = ChatGPTVectorService('tvenis')")
        print("   # The service will automatically find your store")
    else:
        print("❌ Failed to create vector store")

if __name__ == "__main__":
    asyncio.run(main())
