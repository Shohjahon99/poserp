@echo off
REM ============================================================
REM  POS ERP — Cloudflare Tunnel (telefondan skaner qilish uchun)
REM ============================================================
REM  Bu skript:
REM   1. Frontend'ni build qiladi (dist/ papkasiga)
REM   2. Backend'ni 3001 portda ishga tushiradi (frontend'ni ham serve qiladi)
REM   3. Cloudflare tunnel orqali HTTPS URL beradi
REM ============================================================

echo.
echo [1/3] Frontend build qilinmoqda...
cd /d "%~dp0frontend"
call npm run build
if errorlevel 1 (
  echo [XATO] Build muvaffaqiyatsiz!
  pause
  exit /b 1
)

echo.
echo [2/3] Backend ishga tushirilmoqda (port 3001)...
cd /d "%~dp0backend"
start "POS Backend" cmd /k "npm start"

REM Serverni yuklanishini kutish
timeout /t 4 /nobreak > nul

echo.
echo [3/3] Cloudflare tunnel ochilmoqda...
echo.
echo  ==========================================================
echo   Pastdagi HTTPS URL'ni telefon brauzeriga kiriting!
echo   (masalan: https://XXXX-XXXX.trycloudflare.com)
echo  ==========================================================
echo.

where cloudflared >nul 2>&1
if errorlevel 1 (
  echo [XATO] cloudflared topilmadi!
  echo.
  echo O'rnatish uchun PowerShell'ni admin sifatida oching va:
  echo    winget install --id Cloudflare.cloudflared
  echo.
  echo Yoki qo'lda yuklab oling:
  echo    https://github.com/cloudflare/cloudflared/releases/latest
  echo.
  pause
  exit /b 1
)

cloudflared tunnel --url http://localhost:3001
