"""
Vercel-compatible entry point for FastAPI backend
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Import your existing app
from main import app

# Configure for Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # More permissive for Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Export for Vercel
handler = app
