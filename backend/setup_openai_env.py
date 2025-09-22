#!/usr/bin/env python3
"""
Setup script to configure OpenAI API key environment variable
"""

import os

def setup_openai_env():
    """Guide user through setting up OpenAI API key environment variable"""
    print("🔑 OpenAI API Key Environment Setup")
    print("=" * 40)
    print()
    print("This script will help you set up the OPENAI_API_KEY environment variable")
    print("for the ChatGPT Vector Service.")
    print()
    
    # Check if already set
    current_key = os.getenv("OPENAI_API_KEY")
    if current_key:
        print("✅ OPENAI_API_KEY is already set in your environment")
        print(f"   Key starts with: {current_key[:8]}...")
        print()
        
        response = input("Do you want to update it? (y/n): ").lower().strip()
        if response != 'y':
            print("✅ Keeping existing API key")
            return
    
    print("📋 Setup Instructions:")
    print()
    print("1. Get your OpenAI API key:")
    print("   - Go to: https://platform.openai.com/api-keys")
    print("   - Sign in to your OpenAI account")
    print("   - Click 'Create new secret key'")
    print("   - Copy the generated key")
    print()
    
    # Get API key from user
    api_key = input("2. Enter your OpenAI API key: ").strip()
    
    if not api_key:
        print("❌ No API key provided. Exiting.")
        return
    
    if not api_key.startswith('sk-'):
        print("⚠️  Warning: OpenAI API keys typically start with 'sk-'")
        response = input("Continue anyway? (y/n): ").lower().strip()
        if response != 'y':
            print("❌ Setup cancelled")
            return
    
    print()
    print("3. Choose setup method:")
    print("   a) Set for current session only")
    print("   b) Set permanently in shell profile")
    print("   c) Create .env file")
    print()
    
    choice = input("Choose option (a/b/c): ").lower().strip()
    
    if choice == 'a':
        # Set for current session
        os.environ["OPENAI_API_KEY"] = api_key
        print("✅ OPENAI_API_KEY set for current session")
        print("   Note: This will be lost when you close the terminal")
        
    elif choice == 'b':
        # Set permanently
        shell_profile = os.path.expanduser("~/.zshrc") if os.path.exists(os.path.expanduser("~/.zshrc")) else os.path.expanduser("~/.bashrc")
        
        env_line = f'export OPENAI_API_KEY="{api_key}"'
        
        print(f"📝 Adding to {shell_profile}")
        print("   Run this command:")
        print(f"   echo '{env_line}' >> {shell_profile}")
        print("   source {shell_profile}")
        
        # Ask if user wants us to do it
        response = input("Should I add it automatically? (y/n): ").lower().strip()
        if response == 'y':
            try:
                with open(shell_profile, "a") as f:
                    f.write(f"\n# OpenAI API Key for DFS App\n{env_line}\n")
                print(f"✅ Added to {shell_profile}")
                print("   Run 'source {shell_profile}' or restart your terminal")
            except Exception as e:
                print(f"❌ Error writing to {shell_profile}: {e}")
                print("   Please add manually:")
                print(f"   echo '{env_line}' >> {shell_profile}")
        
    elif choice == 'c':
        # Create .env file
        env_file = ".env"
        env_content = f"# OpenAI API Key for DFS App\nOPENAI_API_KEY={api_key}\n"
        
        try:
            with open(env_file, "w") as f:
                f.write(env_content)
            print(f"✅ Created {env_file} file")
            print("   Note: Make sure to load this file in your application")
            print("   Add 'python-dotenv' to requirements.txt if not already present")
        except Exception as e:
            print(f"❌ Error creating .env file: {e}")
            print("   Please create manually:")
            print(f"   echo '{env_content}' > {env_file}")
    
    else:
        print("❌ Invalid choice")
        return
    
    print()
    print("🔧 Additional Setup:")
    print()
    print("4. For Railway deployment:")
    print("   - The API key should already be set in Railway")
    print("   - Verify in Railway dashboard under Environment Variables")
    print()
    print("5. Test the setup:")
    print("   - Run: python -c \"import os; print('API Key set:', bool(os.getenv('OPENAI_API_KEY')))\"")
    print("   - Or test the vector service directly")
    print()
    print("⚠️  Security Notes:")
    print("   - NEVER commit API keys to git")
    print("   - Use environment variables for all sensitive data")
    print("   - Rotate keys regularly")
    print()
    print("✅ Setup complete! You can now use the ChatGPT Vector Service.")

def check_openai_setup():
    """Check if OpenAI API key is properly configured"""
    print("🔍 Checking OpenAI API Key Setup")
    print("=" * 35)
    
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("❌ OPENAI_API_KEY not found")
        print("   Run this script to set it up")
        return False
    
    print(f"✅ OPENAI_API_KEY is set")
    print(f"   Key starts with: {api_key[:8]}...")
    
    # Test import
    try:
        from openai import OpenAI
        print("✅ OpenAI package is installed")
        
        # Test API connection (optional - requires actual API call)
        response = input("Test API connection? (y/n): ").lower().strip()
        if response == 'y':
            try:
                client = OpenAI(api_key=api_key)
                # Simple test - list models (this is a lightweight API call)
                models = client.models.list()
                print("✅ API connection successful")
                print(f"   Available models: {len(models.data)} models")
            except Exception as e:
                print(f"❌ API connection failed: {e}")
                print("   Check your API key and internet connection")
    except ImportError:
        print("❌ OpenAI package not installed")
        print("   Run: pip install openai")
        return False
    
    return True

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        check_openai_setup()
    else:
        setup_openai_env()
