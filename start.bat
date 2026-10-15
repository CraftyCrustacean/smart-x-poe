@echo off
cd /d "%~dp0"

docker info >nul 2>&1
if errorlevel 1 (
    echo Docker Desktop is not running. Start it, wait for "Engine running", then try again.
    pause
    exit /b 1
)

if not exist .env copy .env.example .env >nul

echo Starting Smart-X. The first run builds images and can take a few minutes...
docker compose up -d --build
if errorlevel 1 (
    echo Startup failed. Run "docker compose logs backend" to see why.
    pause
    exit /b 1
)

start "" http://localhost:3000
echo Running. Logs: docker compose logs -f backend   Stop: double-click stop.bat
pause
