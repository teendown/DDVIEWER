import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const analyzerDir = path.join(rootDir, 'drawing-analyzer');
const distDir = path.join(analyzerDir, 'dist');
const zipOutPath = path.join(rootDir, '스마트_도면분석기_카카오톡전송용_설치팩.zip');

console.log('======================================================');
console.log(' [1/3] 카카오톡 전송용 설치 패키지 준비 중...');
console.log('======================================================');

// 1. 빌드 확인
if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  execSync('npm run build', { cwd: analyzerDir, stdio: 'inherit' });
}

// 2. 임시 폴더 구성
const stageDir = path.join(process.env.TEMP || '.', 'kakaotalk_dwg_pack');
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.mkdirSync(stageDir, { recursive: true });

// 3. 필수 파일 복사
fs.cpSync(path.join(analyzerDir, 'dist'), path.join(stageDir, 'dist'), { recursive: true });
fs.copyFileSync(path.join(analyzerDir, 'run-offline.bat'), path.join(stageDir, 'run-offline.bat'));
fs.copyFileSync(path.join(analyzerDir, '스마트_도면분석기_실행.vbs'), path.join(stageDir, '스마트_도면분석기_실행.vbs'));
if (fs.existsSync(path.join(analyzerDir, 'public'))) {
  fs.cpSync(path.join(analyzerDir, 'public'), path.join(stageDir, 'public'), { recursive: true });
}
if (fs.existsSync(path.join(rootDir, '스마트_도면분석기_원스톱설치기.bat'))) {
  fs.copyFileSync(path.join(rootDir, '스마트_도면분석기_원스톱설치기.bat'), path.join(stageDir, '1-원클릭_설치(바탕화면아이콘생성).bat'));
}

// 4. [필독] 사용 설명서.txt 생성
const readmeContent = `======================================================================
         ★ 스마트 도면 분석기 (오프라인 전용) 설치 및 사용법 ★
======================================================================

[초간단 1초 설치 방법]

1. 압축을 푼 폴더에서 [ 1-원클릭_설치(바탕화면아이콘생성).bat ] 파일을 더블클릭합니다.

2. 윈도우 바탕화면에 [ 스마트 도면 분석기 ] 바로가기 아이콘이 자동 생성됩니다.

3. 설치가 완료되면 프로그램이 즉시 실행됩니다.

----------------------------------------------------------------------
[오프라인 사용 안내]
- 인터넷(Wi-Fi / 유선랜)이 연결되지 않는 공장, 현장에서도 100% 정상 작동합니다.
- 이후에는 바탕화면의 [ 스마트 도면 분석기 ] 아이콘만 누르시면 언제든지 열립니다.
- 도면, 주석, 프로젝트 데이터는 사용자의 PC 내부 저장소에 안전하게 영구 보관됩니다.
======================================================================
`;
fs.writeFileSync(path.join(stageDir, '[필독]_설치_및_사용_설명서.txt'), readmeContent, 'utf-8');

// 5. ZIP 압축 생성
if (fs.existsSync(zipOutPath)) {
  fs.rmSync(zipOutPath, { force: true });
}

execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${stageDir}\\*' -DestinationPath '${zipOutPath}' -CompressionLevel Optimal"`);

// 임시 폴더 삭제
fs.rmSync(stageDir, { recursive: true, force: true });

const stat = fs.statSync(zipOutPath);
console.log('\n[성공] 카카오톡 전송용 ZIP 압축 파일 생성 완료!');
console.log('파일 경로:', zipOutPath);
console.log('파일 크기:', (stat.size / 1024 / 1024).toFixed(2), 'MB');
