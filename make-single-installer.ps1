# 스마트 도면 분석기 - 단일 원스톱 자동 설치 파일 생성기
$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }
$analyzerDir = Join-Path $root "drawing-analyzer"
$distDir = Join-Path $analyzerDir "dist"
$tempZip = Join-Path $env:TEMP "drawing_analyzer_bundle.zip"
$installerPath = Join-Path $root "스마트_도면분석기_원스톱설치기.bat"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host " [1/4] 프로덕션 빌드 상태 확인 및 빌드..." -ForegroundColor Yellow
Write-Host "======================================================" -ForegroundColor Cyan

Set-Location $analyzerDir
if (-not (Test-Path (Join-Path $distDir "index.html"))) {
    npm run build
}

Write-Host "`n[2/4] 오프라인 필수 파일들을 압축 번들링 중..." -ForegroundColor Yellow

# 임시 스테이징 폴더 생성
$stageDir = Join-Path $env:TEMP "smart_dwg_stage"
if (Test-Path $stageDir) { Remove-Item -Recurse -Force $stageDir }
New-Item -ItemType Directory -Path $stageDir | Out-Null

# 필수 파일 복사 (dist, run-offline.bat, 스마트_도면분석기_실행.vbs, public)
Copy-Item -Recurse (Join-Path $analyzerDir "dist") (Join-Path $stageDir "dist")
Copy-Item (Join-Path $analyzerDir "run-offline.bat") (Join-Path $stageDir "run-offline.bat")
Copy-Item (Join-Path $analyzerDir "스마트_도면분석기_실행.vbs") (Join-Path $stageDir "스마트_도면분석기_실행.vbs")
if (Test-Path (Join-Path $analyzerDir "public")) {
    Copy-Item -Recurse (Join-Path $analyzerDir "public") (Join-Path $stageDir "public")
}

# ZIP 압축
if (Test-Path $tempZip) { Remove-Item -Force $tempZip }
Compress-Archive -Path "$stageDir\*" -DestinationPath $tempZip -CompressionLevel Optimal

# Base64 인코딩
Write-Host "`n[3/4] 단일 파일 내장용 Base64 변환 중..." -ForegroundColor Yellow
$zipBytes = [System.IO.File]::ReadAllBytes($tempZip)
$base64 = [Convert]::ToBase64String($zipBytes)

# 단일 자동 설치 배치 파일 템플릿 생성
Write-Host "`n[4/4] 단 1개의 '스마트_도면분석기_원스톱설치기.bat' 생성 중..." -ForegroundColor Yellow

$headerContent = @'
@echo off
chcp 65001 >nul
title 스마트 도면 분석기 - 원스톱 자동 설치기
echo ======================================================================
echo          [스마트 도면 분석기] 원스톱 자동 압축해제 & 설치
echo ======================================================================
echo.
echo  [1/3] 프로그램 파일을 로컬 컴퓨터에 자동 압축 해제 중...
echo.

set "TARGET_DIR=%LOCALAPPDATA%\SmartDrawingAnalyzer"

if not exist "%TARGET_DIR%" (
    mkdir "%TARGET_DIR%"
)

set "SELF=%~f0"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$self = $env:SELF;" ^
    "$targetDir = $env:TARGET_DIR;" ^
    "$lines = [System.IO.File]::ReadAllLines($self);" ^
    "$b64Start = $false;" ^
    "$sb = New-Object System.Text.StringBuilder;" ^
    "foreach ($line in $lines) {" ^
    "    if ($line.Trim() -eq '__PAYLOAD_START__') { $b64Start = $true; continue }" ^
    "    if ($b64Start) { [void]$sb.Append($line) }" ^
    "}" ^
    "$bytes = [Convert]::FromBase64String($sb.ToString());" ^
    "$zipPath = Join-Path $env:TEMP 'smart_dwg_payload.zip';" ^
    "[System.IO.File]::WriteAllBytes($zipPath, $bytes);" ^
    "Expand-Archive -Path $zipPath -DestinationPath $targetDir -Force;" ^
    "Remove-Item -Force $zipPath;" ^
    "Write-Host '  - 파일 압축 해제 완료!' -ForegroundColor Green;" ^
    "Write-Host '  [2/3] 윈도우 바탕화면에 바로가기 아이콘 생성 중...';" ^
    "$ws = New-Object -ComObject WScript.Shell;" ^
    "$desktop = [Environment]::GetFolderPath('Desktop');" ^
    "$shortcutPath = Join-Path $desktop '스마트 도면 분석기.lnk';" ^
    "$vbsTarget = Join-Path $targetDir '스마트_도면분석기_실행.vbs';" ^
    "$sc = $ws.CreateShortcut($shortcutPath);" ^
    "$sc.TargetPath = 'wscript.exe';" ^
    "$sc.Arguments = '\"' + $vbsTarget + '\"';" ^
    "$sc.WorkingDirectory = $targetDir;" ^
    "$sc.Description = '스마트 도면 분석기 (오프라인 독립 실행)';" ^
    "$sc.Save();" ^
    "Write-Host '  - 바탕화면 바로가기 생성 완료!' -ForegroundColor Green;"

echo.
echo  [3/3] 프로그램을 즉시 실행합니다...
echo.
echo ======================================================================
echo   ★ 원스톱 설치가 완벽하게 완료되었습니다!
echo   ★ 앞으로는 바탕화면의 [스마트 도면 분석기] 아이콘만 누르시면
echo     인터넷 없이도 언제든지 바로 실행됩니다.
echo ======================================================================
echo.

start "" wscript.exe "%LOCALAPPDATA%\SmartDrawingAnalyzer\스마트_도면분석기_실행.vbs"

timeout /t 3 >nul
exit /b 0

__PAYLOAD_START__
'@

$finalText = $headerContent.TrimEnd() + "`r`n" + $base64
Set-Content -LiteralPath $installerPath -Value $finalText -Encoding utf8

# 정리
Remove-Item -Recurse -Force $stageDir
Remove-Item -Force $tempZip

Set-Location $root

$len = (Get-Item -LiteralPath $installerPath).Length / 1MB
Write-Host "`n[성공] 단 1개의 원스톱 설치 파일 생성 완료!" -ForegroundColor Green
Write-Host "파일 경로: $installerPath" -ForegroundColor Cyan
Write-Host "파일 크기: $([Math]::Round($len, 2)) MB" -ForegroundColor Cyan
