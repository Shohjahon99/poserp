@echo off
chcp 65001 >nul
echo.
echo ====================================
echo   POS ERP Tizimi Ishga Tushmoqda...
echo ====================================
echo.

:: Check backend node_modules
if not exist "%~dp0backend\node_modules" (
    echo [XATO] Avval setup.bat ni ishga tushiring!
    pause
    exit /b 1
)

echo [*] Backend ishga tushmoqda (port 3001)...
start "POS Backend" cmd /k "cd /d "%~dp0backend" && node src/server.js"

echo [*] 2 soniya kutilmoqda...
timeout /t 2 /nobreak >nul

echo [*] Frontend ishga tushmoqda (port 5173)...
start "POS Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo [*] 3 soniya kutilmoqda...
timeout /t 3 /nobreak >nul

echo.
echo ====================================
echo   Brauzerda oching:
echo   http://localhost:5173
echo ====================================
echo.

:: Open browser
start "" "http://localhost:5173"

echo Dasturni yopish uchun ikkala terminal oynasini yoping.
pause
