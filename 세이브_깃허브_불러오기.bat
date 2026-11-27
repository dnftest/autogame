@echo off
chcp 65001 >nul
title 기사단 방치기 - GitHub 최신 코드/세이브 받기
cd /d "%~dp0"

echo [1/1] GitHub에서 최신 코드 및 save.json 내려받는 중...
git pull origin main
if errorlevel 1 (
  echo [오류] git pull 에 실패했습니다. 충돌이 있는지 확인해주세요.
  pause
  exit /b 1
)

echo.
echo [완료] 최신 버전과 save.json 동기화가 끝났습니다! 게임_실행.bat 을 실행하세요.
pause
