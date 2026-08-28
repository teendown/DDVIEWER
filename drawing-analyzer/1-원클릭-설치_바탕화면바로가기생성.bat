@echo off
chcp 65001 >nul
title 스마트 도면 분석기 - 원클릭 바탕화면 설치기
echo ======================================================================
echo          [스마트 도면 분석기] 원클릭 바탕화면 설치 & 실행
echo ======================================================================
echo.
echo  [1/3] 오프라인 정적 패키지 점검 중...

cd /d "%~dp0"

if not exist "dist\index.html" (
    echo        - 최초 빌드를 진행합니다. 잠시만 기다려주세요...
    call npm run build >nul 2>&1
)

echo  [2/3] 윈도우 바탕화면에 '스마트 도면 분석기' 바로가기 생성 중...

:: PowerShell을 이용해 바탕화면에 고유한 바로가기(.lnk) 생성
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = New-Object -ComObject WScript.Shell;" ^
    "$desktop = [Environment]::GetFolderPath('Desktop');" ^
    "$shortcutPath = Join-Path $desktop '스마트 도면 분석기.lnk';" ^
    "$target = Join-Path (Get-Location) '스마트_도면분석기_실행.vbs';" ^
    "$sc = $ws.CreateShortcut($shortcutPath);" ^
    "$sc.TargetPath = 'wscript.exe';" ^
    "$sc.Arguments = '\"' + $target + '\"';" ^
    "$sc.WorkingDirectory = (Get-Location).Path;" ^
    "$sc.Description = '스마트 도면 분석기 (오프라인 독립 실행)';" ^
    "$iconPath = Join-Path (Get-Location) 'public\favicon.svg';" ^
    "$sc.Save();" ^
    "Write-Host '       - 바탕화면 바로가기 생성 완료!' -ForegroundColor Green;"

echo  [3/3] 프로그램을 즉시 실행합니다...
echo.
echo ======================================================================
echo   ★ 설치가 완료되었습니다!
echo   ★ 앞으로는 바탕화면의 [스마트 도면 분석기] 아이콘만 누르시면
echo     인터넷 없이도 언제든지 바로 실행됩니다.
echo ======================================================================
echo.

:: 즉시 백그라운드 런처 실행
start "" wscript.exe "%~dp0스마트_도면분석기_실행.vbs"

timeout /t 3 >nul
exit
