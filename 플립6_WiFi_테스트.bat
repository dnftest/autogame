@echo off
chcp 65001 >nul
title 기사단 방치기 - 플립6 Wi-Fi 테스트
cd /d "%~dp0"

if not exist "node_modules" (
  echo [초기 설정] 필요한 패키지를 설치하는 중입니다...
  call npm install
)

echo ==================================================
echo   플립6와 PC가 같은 Wi-Fi에 연결되어 있어야 합니다.
echo   아래에 표시되는 Network: http://...:5200 주소를
echo   플립6 크롬 브라우저에 입력해 접속하세요.
echo   (Windows 방화벽 창이 뜨면 허용을 눌러주세요)
echo ==================================================
echo.
call npm run dev:mobile
pause
