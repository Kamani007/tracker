#!/bin/bash

# Azure Web App startup script for Python Flask application
# This script is executed when the container starts

echo "🚀 Starting Rayleigh Solar Backend on Azure Web App..."

# Navigate to the application directory
cd /home/site/wwwroot

# Set Python path
export PYTHONPATH="/home/site/wwwroot:$PYTHONPATH"

# Print environment info for debugging
echo "📍 Current directory: $(pwd)"
echo "🐍 Python version: $(python --version)"
echo "📦 Pip version: $(pip --version)"

# List files to verify deployment
echo "📁 Files in wwwroot:"
ls -la

# Install dependencies if requirements.txt exists
if [ -f "requirements.txt" ]; then
    echo "📦 Installing dependencies..."
    pip install -r requirements.txt
else
    echo "⚠️ No requirements.txt found"
fi

# Start the application with Gunicorn
echo "🌟 Starting Flask application with Gunicorn..."
gunicorn --bind 0.0.0.0:$PORT --timeout 600 --workers 1 --preload app:app