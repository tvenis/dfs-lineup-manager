#!/usr/bin/env python3
"""
Query tvenis's vector store with natural language questions
"""

import asyncio
import os
import sys
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

async def query_tvenis_vector_store(question):
    """Query tvenis's vector store with a natural language question"""
    
    print("🤖 Querying tvenis's Vector Store")
    print("=" * 40)
    print(f"Question: {question}")
    print("-" * 40)
    
    # Load environment variables
    load_env_file()
    
    # Check if API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found!")
        print("   Please set your OpenAI API key first:")
        print("   export OPENAI_API_KEY=\"sk-your-api-key-here\"")
        return None
    
    try:
        # Initialize service for user "tvenis"
        service = ChatGPTVectorService("tvenis")
        
        # Get vector store
        vs_id = await service.get_or_create_user_vector_store()
        
        # Query the data
        print("🔍 Searching vector store...")
        response = await service.chat_with_file_search(question, vs_id)
        
        print("📝 Response:")
        print("-" * 40)
        print(response)
        print("-" * 40)
        
        return response
        
    except Exception as e:
        print(f"❌ Error querying vector store: {e}")
        return None

async def interactive_query():
    """Interactive query mode"""
    print("🤖 Interactive Query Mode")
    print("=" * 30)
    print("Ask questions about your uploaded data!")
    print("Type 'quit' or 'exit' to stop")
    print()
    
    while True:
        question = input("❓ Your question: ").strip()
        
        if question.lower() in ['quit', 'exit', 'q']:
            print("👋 Goodbye!")
            break
        
        if not question:
            continue
        
        await query_tvenis_vector_store(question)
        print()

async def main():
    """Main function"""
    if len(sys.argv) > 1:
        # Command line usage
        question = " ".join(sys.argv[1:])
        await query_tvenis_vector_store(question)
    else:
        # Interactive mode
        await interactive_query()

if __name__ == "__main__":
    asyncio.run(main())
