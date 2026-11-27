@echo off
chcp 65001 >nul
title 기사단 방치기 - 세이브 GitHub 업로드
cd /d "%~dp0"

if not exist "save.json" (
  echo [안내] save.json 파일이 아직 생성되지 않았습니다.
  echo 먼저 브라우저에서 게임 화면(http://localhost:5200^)을 한 번 새로고침 하거나 [지금 저장]을 눌러주세요!
  pause
  exit /b 1
)

echo [1/3] save.json 파일 확인 중...
git add save.json
git diff --cached --quiet save.json
if %errorlevel%==0 (
  echo [안내] save.json 변경 사항이 없습니다. 이미 최신 상태입니다.
) else (
  echo [2/3] 세이브 커밋 생성 중...
  git commit -m "chore: sync save.json"
  if errorlevel 1 (
    echo [오류] 커밋에 실패했습니다.
    pause
    exit /b 1
  )
)

echo [3/3] GitHub에 푸시 중...
git push origin main
if errorlevel 1 (
  echo [오류] GitHub 푸시에 실패했습니다. 네트워크 또는 로그인 상태를 확인하세요.
  pause
  exit /b 1
)

echo.
echo [완료] save.json 이 GitHub에 안전하게 업로드되었습니다!
pause
