#!/bin/bash

echo "Starting Digital Logic Simulator..."
echo ""
echo "Opening simulator in your default browser..."
echo ""
echo "If the browser doesn't open automatically, navigate to:"
echo "http://localhost:8000"
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "Starting Python3 HTTP server..."
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    echo "Starting Python HTTP server..."
    python -m http.server 8000
else
    echo "Python is not installed or not in PATH."
    echo "Please install Python or open index.html directly in your browser."
    read -p "Press enter to continue..."
    exit 1
fi
