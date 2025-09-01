#!/bin/bash

# Start the DFS App backend server with virtual environment

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating one..."
    python3 -m venv venv
    source venv/bin/activate
    pip install --upgrade pip
    pip install -r requirements.txt
else
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

echo "Starting backend server..."
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
