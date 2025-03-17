@echo off
setlocal enabledelayedexpansion

echo Checking prerequisites...
echo Current directory: %CD%

:: Check for Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)

:: Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check for Python
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

:: Check for Chocolatey
where choco >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing Chocolatey...
    @powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))"
    if !errorlevel! neq 0 (
        echo Error: Failed to install Chocolatey
        pause
        exit /b 1
    )
    :: Refresh environment variables
    refreshenv
)

echo Installing Windows Security Tools...

:: Check and install ClamAV if not present
where clamscan >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing ClamAV...
    choco install clamav -y
    if !errorlevel! neq 0 (
        echo Warning: Failed to install ClamAV
    ) else (
        :: Create ClamAV config directory if it doesn't exist
        if not exist "C:\ProgramData\clamav" mkdir "C:\ProgramData\clamav"
        
        :: Create freshclam.conf if it doesn't exist
        if not exist "C:\ProgramData\clamav\freshclam.conf" (
            echo DatabaseMirror database.clamav.net > "C:\ProgramData\clamav\freshclam.conf"
            echo DatabaseDirectory C:\ProgramData\clamav >> "C:\ProgramData\clamav\freshclam.conf"
        )
        
        echo Updating ClamAV database...
        freshclam --config-file="C:\ProgramData\clamav\freshclam.conf"
    )
)

:: Check and install Sysinternals if not present
if not exist "C:\Windows\System32\PsExec.exe" (
    echo Installing Sysinternals...
    choco install sysinternals -y
)

:: Check and install Nmap if not present
where nmap >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing Nmap...
    choco install nmap -y
)

echo Checking for environment files...

:: Backend environment file
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env"
        echo Generated backend/.env from example
    )
)

:: Frontend environment file
if not exist "frontend\.env.local" (
    if exist "frontend\.env.example" (
        copy "frontend\.env.example" "frontend\.env.local"
        echo Generated frontend/.env.local from example
    )
)

:: AI environment file
if not exist "ai\.env" (
    if exist "ai\.env.example" (
        copy "ai\.env.example" "ai\.env"
        echo Generated ai/.env from example
    )
)

echo Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "data" mkdir data

echo Installing dependencies for all components...

:: Install backend dependencies
echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install backend dependencies
    pause
    exit /b 1
)
cd ..

:: Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install frontend dependencies
    pause
    exit /b 1
)
cd ..

:: Install Python dependencies
echo Installing Python dependencies...
pip install -r ai/requirements.txt
if %errorlevel% neq 0 (
    echo Error: Failed to install Python dependencies
    pause
    exit /b 1
)

echo Starting services...
start "Backend" cmd /c "cd backend && npm run dev"
start "Frontend" cmd /c "cd frontend && npm run dev"
start "Network Monitor" cmd /c "cd ai && python network_monitor.py"

echo.
echo Setup complete! The application is now running:
echo Frontend: http://localhost:3000
echo Backend: http://localhost:5000
echo.
echo Press any key to exit...
pause > nul 