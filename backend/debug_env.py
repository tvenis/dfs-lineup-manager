#!/usr/bin/env python3
"""
Debug environment variables in production
"""

import os

print("Environment variables:")
print("=" * 50)

# Check for database-related environment variables
db_vars = [
    'DATABASE_URL',
    'DATABASE_DATABASE_URL', 
    'STORAGE_URL',
    'LOCAL_DATABASE_URL'
]

for var in db_vars:
    value = os.getenv(var)
    if value:
        print(f"✅ {var}: {value[:50]}...")
    else:
        print(f"❌ {var}: Not set")

print("\nAll environment variables:")
print("=" * 50)
for key, value in os.environ.items():
    if 'DATABASE' in key or 'STORAGE' in key or 'URL' in key:
        print(f"{key}: {value[:50]}...")
