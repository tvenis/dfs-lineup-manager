#!/usr/bin/env python3
"""
Verify vector store contents and test functionality
"""

import asyncio
import os
from pathlib import Path
from app.chatgpt_vector import ChatGPTVectorService

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

async def verify_tvenis_vector_store():
    """Verify tvenis's vector store and its contents"""
    
    print("🔍 Verifying tvenis's Vector Store")
    print("=" * 40)
    
    # Load environment variables
    load_env_file()
    
    # Check if API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found!")
        return False
    
    print("✅ OpenAI API key found")
    
    try:
        # Initialize service for user "tvenis"
        service = ChatGPTVectorService("tvenis")
        
        # Find the user's vector store
        print("🔍 Looking for tvenis's vector store...")
        store_info = await service.find_user_vector_store()
        
        if not store_info:
            print("❌ No vector store found for user 'tvenis'")
            print("   Run: python create_tvenis_store.py")
            return False
        
        print(f"✅ Found vector store: {store_info['name']}")
        print(f"   Store ID: {store_info['id']}")
        print(f"   Status: {store_info['status']}")
        print(f"   Files: {store_info['file_counts']}")
        print(f"   Created: {store_info['created_at']}")
        
        # Test a simple query
        print("\n🧪 Testing query functionality...")
        test_question = "What files do you have access to?"
        
        try:
            response = await service.chat_with_file_search(test_question, store_info['id'])
            print("✅ Query test successful!")
            print(f"Response: {response[:200]}...")
        except Exception as e:
            print(f"⚠️  Query test failed: {e}")
            print("   This might be normal if the file is still processing")
        
        return True
        
    except Exception as e:
        print(f"❌ Error verifying vector store: {e}")
        return False

async def list_all_vector_stores():
    """List all vector stores to see what's available"""
    
    print("📋 Listing All Vector Stores")
    print("=" * 30)
    
    # Load environment variables
    load_env_file()
    
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found!")
        return
    
    try:
        service = ChatGPTVectorService("tvenis")
        stores = await service.list_vector_stores()
        
        if not stores:
            print("📭 No vector stores found")
            return
        
        print(f"Found {len(stores)} vector store(s):")
        print("-" * 50)
        
        for store in stores:
            print(f"📦 {store['name']}")
            print(f"   ID: {store['id']}")
            print(f"   Status: {store['status']}")
            print(f"   Files: {store['file_counts']}")
            print(f"   Created: {store['created_at']}")
            print()
            
    except Exception as e:
        print(f"❌ Error listing vector stores: {e}")

async def test_simple_query():
    """Test a simple query to see if everything is working"""
    
    print("🧪 Testing Simple Query")
    print("=" * 25)
    
    # Load environment variables
    load_env_file()
    
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found!")
        return
    
    try:
        service = ChatGPTVectorService("tvenis")
        vs_id = await service.get_or_create_user_vector_store()
        
        # Simple test query
        question = "Hello, can you see my uploaded files?"
        print(f"Question: {question}")
        
        response = await service.chat_with_file_search(question, vs_id)
        print(f"Response: {response}")
        
    except Exception as e:
        print(f"❌ Query test failed: {e}")
        print("   This might indicate the file is still processing or there's an issue")

async def main():
    """Main verification function"""
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "list":
        await list_all_vector_stores()
    elif len(sys.argv) > 1 and sys.argv[1] == "test":
        await test_simple_query()
    else:
        # Full verification
        success = await verify_tvenis_vector_store()
        
        if success:
            print("\n🎉 Vector store verification successful!")
            print("\n💡 Next steps:")
            print("   - Try querying your data: python query_vector_store.py")
            print("   - Upload more files: python upload_file_to_vector.py")
            print("   - Check OpenAI platform UI for file status")
        else:
            print("\n❌ Vector store verification failed")
            print("   - Check your API key")
            print("   - Try creating the store: python create_tvenis_store.py")

if __name__ == "__main__":
    asyncio.run(main())
