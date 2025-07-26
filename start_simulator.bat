@echo off
echo Starting Digital Logic Simulator...
echo.
echo Opening simulator in your default browser...
echo.
echo If the browser doesn't open automatically, navigate to:
echo http://localhost:8000
echo.

REM Check if Python is available
python --version >nul 2>&1
if %errorlevel% == 0 (
    echo Starting Python HTTP server...
    python -m http.server 8000
) else (
    REM Check if Python3 is available
    python3 --version >nul 2>&1
    if %errorlevel% == 0 (
        echo Starting Python3 HTTP server...
        python3 -m http.server 8000
    ) else (
        echo Python is not installed or not in PATH.
        echo Please install Python or open index.html directly in your browser.
        pause
        exit /b 1
    )
)

pause
