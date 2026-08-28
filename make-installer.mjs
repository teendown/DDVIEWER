import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const analyzerDir = path.join(rootDir, 'drawing-analyzer');
const distDir = path.join(analyzerDir, 'dist');
const installerPath = path.join(rootDir, '스마트_도면분석기_원스톱설치기.bat');

console.log('======================================================');
console.log(' [1/3] 오프라인 프로덕션 빌드 확인...');
console.log('======================================================');

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  execSync('npm run build', { cwd: analyzerDir, stdio: 'inherit' });
}

console.log('\n[2/3] 오프라인 패키지 압축 및 Base64 인코딩 중...');

// 1. 임시 ZIP 파일 생성
const tempZipPath = path.join(process.env.TEMP || '.', 'smart_dwg_bundle.zip');
const output = fs.createWriteStream(tempZipPath);

// archiver 대신 powershell Compress-Archive 실행
const stageDir = path.join(process.env.TEMP || '.', 'smart_dwg_stage');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

// 필수 파일 복사 (dist, run-offline.bat, 스마트_도면분석기_실행.vbs, public)
fs.cpSync(path.join(analyzerDir, 'dist'), path.join(stageDir, 'dist'), { recursive: true });
fs.copyFileSync(path.join(analyzerDir, 'run-offline.bat'), path.join(stageDir, 'run-offline.bat'));
fs.copyFileSync(path.join(analyzerDir, '스마트_도면분석기_실행.vbs'), path.join(stageDir, '스마트_도면분석기_실행.vbs'));
if (fs.existsSync(path.join(analyzerDir, 'public'))) {
  fs.cpSync(path.join(analyzerDir, 'public'), path.join(stageDir, 'public'), { recursive: true });
}

if (fs.existsSync(tempZipPath)) {
  fs.rmSync(tempZipPath, { force: true });
}

// 윈도우 PowerShell Compress-Archive로 압축
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${tempZipPath}' -CompressionLevel Optimal"`);

const zipBuffer = fs.readFileSync(tempZipPath);
const base64Data = zipBuffer.toString('base64');

console.log('\n[3/3] 단 1개의 단독 원스톱 설치 파일 생성 중...');

const headerContent = `@echo off
chcp 65001 >nul
title 스마트 도면 분석기 - 원스톱 자동 설치기
echo ======================================================================
echo          [스마트 도면 분석기] 원스톱 자동 압축해제 ^& 설치
echo ======================================================================
echo.
echo  [1/3] 프로그램 파일을 로컬 컴퓨터에 자동 압축 해제 중...
echo.

set "TARGET_DIR=%LOCALAPPDATA%\\SmartDrawingAnalyzer"

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

start "" wscript.exe "%LOCALAPPDATA%\\SmartDrawingAnalyzer\\스마트_도면분석기_실행.vbs"

timeout /t 3 >nul
exit /b 0

__PAYLOAD_START__
`;

const finalFileContent = headerContent + base64Data;
fs.writeFileSync(installerPath, finalFileContent, 'utf-8');

// 임시 파일 정리
fs.rmSync(stageDir, { recursive: true, force: true });
fs.rmSync(tempZipPath, { force: true });

const stat = fs.statSync(installerPath);
console.log('\n[성공] 단 1개의 원스톱 설치 파일 생성 완료!');
console.log('파일 경로:', installerPath);
console.log('파일 크기:', (stat.size / 1024 / 1024).toFixed(2), 'MB');
