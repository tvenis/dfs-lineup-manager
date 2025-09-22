#!/usr/bin/env python3
"""
Upload a file from local Downloads directory to tvenis's vector store
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

def find_file_in_downloads(filename):
    """Find a file in the Downloads directory"""
    # Common Downloads directory paths
    downloads_paths = [
        Path.home() / "Downloads",
        Path.home() / "downloads",
        Path("/Users") / os.getenv("USER", "tvenis") / "Downloads"
    ]
    
    for downloads_path in downloads_paths:
        if downloads_path.exists():
            file_path = downloads_path / filename
            if file_path.exists():
                return file_path
    
    return None

async def upload_file_to_tvenis_store(filename=None, file_path=None):
    """Upload a file to tvenis's vector store"""
    
    print("📤 Uploading File to tvenis's Vector Store")
    print("=" * 45)
    
    # Load environment variables
    load_env_file()
    
    # Check if API key is set
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found!")
        print("   Please set your OpenAI API key first:")
        print("   export OPENAI_API_KEY=\"sk-your-api-key-here\"")
        print("   Or create a .env file with: OPENAI_API_KEY=sk-your-api-key-here")
        return None
    
    print("✅ OpenAI API key found")
    
    # Determine file path
    if file_path:
        file_path_obj = Path(file_path)
        if not file_path_obj.exists():
            print(f"❌ File not found: {file_path}")
            return None
    elif filename:
        # Look in Downloads directory
        file_path_obj = find_file_in_downloads(filename)
        if not file_path_obj:
            print(f"❌ File '{filename}' not found in Downloads directory")
            print("   Searched in:")
            for path in [Path.home() / "Downloads", Path.home() / "downloads"]:
                print(f"   - {path}")
            return None
    else:
        print("❌ No filename or file path provided")
        return None
    
    print(f"📁 Found file: {file_path_obj}")
    print(f"   Size: {file_path_obj.stat().st_size / 1024:.1f} KB")
    
    try:
        # Initialize service for user "tvenis"
        service = ChatGPTVectorService("tvenis")
        
        # Get or create vector store
        print("🔍 Getting tvenis's vector store...")
        vs_id = await service.get_or_create_user_vector_store()
        print(f"✅ Using vector store: {vs_id}")
        
        # Upload the file
        print("📤 Uploading file...")
        try:
            file_id = await service.upload_file(str(file_path_obj), vs_id)
            print(f"✅ File uploaded successfully!")
            print(f"   File ID: {file_id}")
            print(f"   Vector Store: {vs_id}")
            print(f"   File: {file_path_obj.name}")
            
            # Note about processing time
            print("\n⏳ Note: File may take a few minutes to process")
            print("   You can check status in OpenAI platform UI")
            print("   Or run: python verify_vector_store.py")
            
            return file_id
        except Exception as upload_error:
            print(f"⚠️  Upload may have succeeded despite this error: {upload_error}")
            print("   Check OpenAI platform UI to confirm")
            print("   Run: python verify_vector_store.py")
            return "upload_attempted"
        
    except Exception as e:
        print(f"❌ Error uploading file: {e}")
        return None

async def list_downloads_files():
    """List files in Downloads directory"""
    downloads_path = Path.home() / "Downloads"
    
    if not downloads_path.exists():
        print("❌ Downloads directory not found")
        return []
    
    print(f"📁 Files in {downloads_path}:")
    print("-" * 50)
    
    files = []
    for file_path in downloads_path.iterdir():
        if file_path.is_file():
            size_kb = file_path.stat().st_size / 1024
            files.append(file_path)
            print(f"📄 {file_path.name} ({size_kb:.1f} KB)")
    
    if not files:
        print("   No files found")
    
    return files

async def main():
    """Main function with interactive options"""
    import sys
    
    if len(sys.argv) > 1:
        # Command line usage
        filename = sys.argv[1]
        file_id = await upload_file_to_tvenis_store(filename=filename)
    else:
        # Interactive mode
        print("🔧 Upload File to tvenis's Vector Store")
        print("=" * 45)
        print()
        print("Options:")
        print("1. List files in Downloads directory")
        print("2. Upload specific file from Downloads")
        print("3. Upload file from custom path")
        print()
        
        choice = input("Choose option (1-3): ").strip()
        
        if choice == "1":
            await list_downloads_files()
        elif choice == "2":
            filename = input("Enter filename from Downloads: ").strip()
            file_id = await upload_file_to_tvenis_store(filename=filename)
        elif choice == "3":
            file_path = input("Enter full file path: ").strip()
            file_id = await upload_file_to_tvenis_store(file_path=file_path)
        else:
            print("❌ Invalid choice")
            return
    
    if 'file_id' in locals() and file_id:
        print()
        print("🎉 Upload successful!")
        print()
        print("💡 Next steps:")
        print("   You can now query your data:")
        print("   python query_vector_store.py \"Your question about the data\"")
        print()
        print("📋 Example queries:")
        print("   - \"What are the key insights from this data?\"")
        print("   - \"Summarize the main trends\"")
        print("   - \"Who are the top performers?\"")
    else:
        print("❌ Upload failed")

if __name__ == "__main__":
    asyncio.run(main())
