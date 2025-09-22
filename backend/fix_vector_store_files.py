#!/usr/bin/env python3
"""
Fix vector store file attachments - check uploaded files and attach them properly
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

async def list_uploaded_files():
    """List all uploaded files in OpenAI storage"""
    print("📁 Checking Uploaded Files in OpenAI Storage")
    print("=" * 50)
    
    load_env_file()
    
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found!")
        return []
    
    try:
        service = ChatGPTVectorService("tvenis")
        
        # List all files
        files = await service.async_client.files.list()
        
        if not files.data:
            print("📭 No files found in OpenAI storage")
            return []
        
        print(f"Found {len(files.data)} file(s) in OpenAI storage:")
        print("-" * 50)
        
        uploaded_files = []
        for file in files.data:
            print(f"📄 {file.filename}")
            print(f"   ID: {file.id}")
            print(f"   Size: {file.bytes / 1024:.1f} KB")
            print(f"   Purpose: {file.purpose}")
            print(f"   Created: {file.created_at}")
            print()
            
            uploaded_files.append({
                'id': file.id,
                'filename': file.filename,
                'size': file.bytes,
                'purpose': file.purpose
            })
        
        return uploaded_files
        
    except Exception as e:
        print(f"❌ Error listing files: {e}")
        return []

async def attach_files_to_vector_store(file_ids=None):
    """Attach files to the tvenis vector store"""
    print("🔗 Attaching Files to Vector Store")
    print("=" * 35)
    
    load_env_file()
    
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found!")
        return False
    
    try:
        service = ChatGPTVectorService("tvenis")
        
        # Get or create vector store
        vs_id = await service.get_or_create_user_vector_store()
        print(f"✅ Using vector store: {vs_id}")
        
        # If no file IDs provided, get all uploaded files
        if not file_ids:
            files = await service.async_client.files.list()
            file_ids = [f.id for f in files.data if f.purpose == "assistants"]
        
        if not file_ids:
            print("❌ No files to attach")
            return False
        
        print(f"📎 Attaching {len(file_ids)} file(s) to vector store...")
        
        attached_count = 0
        for file_id in file_ids:
            try:
                # Attach file to vector store
                vector_store_file = await service.async_client.vector_stores.files.create(
                    vector_store_id=vs_id,
                    file_id=file_id
                )
                print(f"✅ Attached file: {file_id}")
                attached_count += 1
                
            except Exception as e:
                print(f"⚠️  Failed to attach file {file_id}: {e}")
        
        print(f"\n🎉 Successfully attached {attached_count}/{len(file_ids)} files")
        
        if attached_count > 0:
            print("⏳ Files may take a few minutes to process")
            print("   Check OpenAI platform UI for status updates")
        
        return attached_count > 0
        
    except Exception as e:
        print(f"❌ Error attaching files: {e}")
        return False

async def reupload_file_to_vector_store(file_path):
    """Re-upload a file directly to the vector store"""
    print(f"📤 Re-uploading File: {file_path}")
    print("=" * 40)
    
    load_env_file()
    
    if not os.getenv("OPENAI_API_KEY"):
        print("❌ OPENAI_API_KEY not found!")
        return False
    
    file_path_obj = Path(file_path)
    if not file_path_obj.exists():
        print(f"❌ File not found: {file_path}")
        return False
    
    try:
        service = ChatGPTVectorService("tvenis")
        vs_id = await service.get_or_create_user_vector_store()
        
        print(f"📁 File: {file_path_obj.name}")
        print(f"📏 Size: {file_path_obj.stat().st_size / 1024:.1f} KB")
        print(f"🎯 Vector Store: {vs_id}")
        
        # Upload file directly to vector store
        print("📤 Uploading file...")
        
        with open(file_path_obj, "rb") as f:
            file_obj = await service.async_client.files.create(
                file=f,
                purpose="assistants"
            )
        
        # Attach to vector store
        vector_store_file = await service.async_client.vector_stores.files.create(
            vector_store_id=vs_id,
            file_id=file_obj.id
        )
        
        print(f"✅ File uploaded and attached successfully!")
        print(f"   File ID: {file_obj.id}")
        print(f"   Vector Store File ID: {vector_store_file.id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error re-uploading file: {e}")
        return False

async def main():
    """Main function to fix vector store file attachments"""
    print("🔧 Vector Store File Attachment Fix")
    print("=" * 40)
    print()
    
    # Step 1: Check what files are uploaded
    uploaded_files = await list_uploaded_files()
    
    if not uploaded_files:
        print("❌ No files found. Please upload a file first:")
        print("   python upload_file_to_vector.py")
        return
    
    print()
    print("🔧 Fix Options:")
    print("1. Attach existing uploaded files to vector store")
    print("2. Re-upload a specific file")
    print("3. Just verify current status")
    print()
    
    choice = input("Choose option (1-3): ").strip()
    
    if choice == "1":
        # Attach existing files
        await attach_files_to_vector_store()
    elif choice == "2":
        # Re-upload specific file
        file_path = input("Enter file path: ").strip()
        await reupload_file_to_vector_store(file_path)
    elif choice == "3":
        # Just verify
        print("✅ Verification complete")
    else:
        print("❌ Invalid choice")
        return
    
    print()
    print("💡 Next steps:")
    print("   - Check OpenAI platform UI for updated file status")
    print("   - Wait a few minutes for files to process")
    print("   - Test queries: python query_vector_store.py")

if __name__ == "__main__":
    asyncio.run(main())
