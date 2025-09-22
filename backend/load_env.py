#!/usr/bin/env python3
"""
Load environment variables from .env file if it exists
"""

import os
from pathlib import Path

def load_env_file():
    """Load .env file if it exists"""
    env_file = Path(".env")
    if env_file.exists():
        print("📁 Found .env file, loading environment variables...")
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"').strip("'")
                    os.environ[key] = value
                    if 'KEY' in key.upper():
                        # Mask sensitive values
                        masked_value = f"{value[:8]}..." if len(value) > 8 else "***"
                        print(f"   ✅ {key}: {masked_value}")
                    else:
                        print(f"   ✅ {key}: {value}")
        return True
    else:
        print("📁 No .env file found")
        return False

if __name__ == "__main__":
    load_env_file()
