@echo off
chcp 65001 >nul
echo.
echo ====================================
echo   POS ERP - O'rnatish
echo ====================================
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [XATO] Node.js topilmadi!
    echo nodejs.org dan LTS yuklab o'rnating, keyin qayta ishga tushiring.
    pause
    exit /b 1
)

echo [OK] Node.js:
node --version

:: Clean old node_modules (better-sqlite3 qoldiqlari)
if exist "%~dp0backend\node_modules" (
    echo [*] Eski node_modules tozalanmoqda...
    rmdir /s /q "%~dp0backend\node_modules"
)

echo.
echo [1/2] Backend paketlari o'rnatilmoqda...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo [XATO] Backend o'rnatilmadi
    pause
    exit /b 1
)

echo.
echo [2/2] Frontend paketlari o'rnatilmoqda...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo [XATO] Frontend o'rnatilmadi
    pause
    exit /b 1
)

echo.
echo ====================================
echo  Tayyor! Endi start.bat ni ishga tushiring
echo ====================================
echo.
pause
