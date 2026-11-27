@echo off
chcp 65001 >nul
title 기사단 방치기 - PC 실행
cd /d "%~dp0"

if not exist "node_modules" (
  echo [초기 설정] 필요한 패키지를 설치하는 중입니다...
  call npm install
)

echo ==================================================
echo   기사단 방치기 실행 중... (http://localhost:5200)
echo   잠시 후 브라우저가 자동으로 열립니다.
echo   게임을 종료하려면 이 창을 닫으세요.
echo ==================================================
echo.
call npm run dev -- --open
pause
