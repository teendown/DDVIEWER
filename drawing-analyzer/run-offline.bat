@echo off
chcp 65001 >nul
title 스마트 도면 분석기 (오프라인 포터블 실행기)
echo ========================================================
echo   [스마트 도면 분석기] 오프라인 전용 독립 실행기
echo   - 인터넷 연결 없이 100%% 독립 실행됩니다.
echo ========================================================
echo.

cd /d "%~dp0"

:: 1. dist 빌드 폴더 존재 여부 확인
if not exist "dist\index.html" (
    echo [알림] 오프라인 정적 파일이 빌드되지 않았습니다.
    echo 처음 1회 빌드를 시작합니다...
    call npm run build
    if not exist "dist\index.html" (
        echo [오류] 빌드에 실패했습니다. Node.js 환경을 확인해주세요.
        pause
        exit /b 1
    )
)

echo [1/2] 로컬 오프라인 서버 시작 중... (포트: 8899)
echo [2/2] 기본 웹 브라우저를 실행합니다...
echo.
echo ========================================================
echo   * 창을 닫으면 도면 분석기 오프라인 서버가 종료됩니다.
echo   * 주소: http://localhost:8899
echo ========================================================
echo.

:: PowerShell 내장 HttpListener로 0-디펜던시 로컬 웹서버 구동 & 브라우저 자동 오픈
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$port = 8899;" ^
    "$dist = Join-Path (Get-Location) 'dist';" ^
    "$listener = New-Object System.Net.HttpListener;" ^
    "$listener.Prefixes.Add('http://localhost:' + $port + '/');" ^
    "$listener.Start();" ^
    "Write-Host '[성공] 스마트 도면 분석기가 정상 구동되었습니다!' -ForegroundColor Green;" ^
    "Start-Process ('http://localhost:' + $port + '/');" ^
    "while ($listener.IsListening) {" ^
    "    $context = $listener.GetContext();" ^
    "    $req = $context.Request;" ^
    "    $res = $context.Response;" ^
    "    $path = $req.Url.LocalPath.TrimStart('/');" ^
    "    if ([string]::IsNullOrEmpty($path)) { $path = 'index.html'; }" ^
    "    $filePath = Join-Path $dist $path;" ^
    "    if (-not (Test-Path $filePath)) { $filePath = Join-Path $dist 'index.html'; }" ^
    "    $ext = [System.IO.Path]::GetExtension($filePath).ToLower();" ^
    "    $mime = switch ($ext) {" ^
    "        '.html' { 'text/html; charset=utf-8' }" ^
    "        '.js'   { 'application/javascript; charset=utf-8' }" ^
    "        '.css'  { 'text/css; charset=utf-8' }" ^
    "        '.svg'  { 'image/svg+xml' }" ^
    "        '.png'  { 'image/png' }" ^
    "        '.jpg'  { 'image/jpeg' }" ^
    "        '.jpeg' { 'image/jpeg' }" ^
    "        '.json' { 'application/json' }" ^
    "        '.wasm' { 'application/wasm' }" ^
    "        Default { 'application/octet-stream' }" ^
    "    };" ^
    "    try {" ^
    "        $bytes = [System.IO.File]::ReadAllBytes($filePath);" ^
    "        $res.ContentType = $mime;" ^
    "        $res.ContentLength64 = $bytes.Length;" ^
    "        $res.OutputStream.Write($bytes, 0, $bytes.Length);" ^
    "    } catch {" ^
    "        $res.StatusCode = 500;" ^
    "    } finally {" ^
    "        $res.OutputStream.Close();" ^
    "    }" ^
    "}"
