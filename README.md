# ⚡ DDVIEWER (스마트 중장비 도면 분석기 & 뷰어)

> **중장비 전기 배선도 및 유압 회로도 전문 분석/편집/오프라인 뷰어 시스템**

---

## 🚀 초간편 다운로드 & 설치 가이드 (10초 원스톱)

인터넷이 되지 않는 현장이나 다른 컴퓨터에서도 **단 한 번의 클릭**으로 즉시 설치 및 실행할 수 있습니다.

### 방법 1. 원스톱 자동 설치 파일 다운로드 (추천 ⭐)
1. 상단 파일 목록 또는 릴리즈에서 **`스마트_도면분석기_원스톱설치기.bat`** 또는 **`스마트_도면분석기_카카오톡전송용_설치팩.zip`** 파일을 다운로드합니다.
2. 다운로드한 파일을 더블클릭하여 실행합니다.
3. 바탕화면에 **`⚡ 스마트 도면분석기 (DDVIEWER)`** 바로가기가 자동으로 생성되며 프로그램이 즉시 실행됩니다!

---

## 💻 개발자 및 소스코드 직접 실행 방법

Node.js 환경이 설치되어 있는 경우 소스코드로 직접 실행할 수 있습니다:

```bash
# 1. 저장소 복제 (Clone)
git clone https://github.com/teendown/DDVIEWER.git

# 2. 프로젝트 폴더로 이동
cd DDVIEWER/drawing-analyzer

# 3. 의존성 패키지 설치
npm install

# 4. 개발 서버 실행
npm run dev
```
> 실행 후 브라우저에서 `http://localhost:5173` 으로 접속합니다.

---

## ✨ 핵심 주요 기능

* 📐 **CAD급 초정밀 벡터 캔버스**: 0.01mm 오차 없는 Fabric.js v6 기반 고성능 렌더링
* 📑 **다중 시트 (Multi-Sheet) 지원**: 여러 장의 도면 동시 로드, 시트 회전/반전/자르기
* 🔗 **스마트 커넥터 2.0**: 1:N, N:1, Chain 자동 직각 배선 라우팅 및 스마트 자동 그룹화
* ✏️ **인터랙티브 꺾임점 수정**: 선 더블클릭으로 꺾임점 드래그 이동 및 `➕ 꺾임점 추가`
* 👤 **엔지니어 작업자 인증 허브**: 작업자 카드 원클릭 전환, PIN 인증, 안전 로그아웃
* ⌨️ **전문가용 CAD 단축키**: `V(선택)`, `A(화살표)`, `C/W(배선)`, `Space(패닝)`, `Ctrl+0(맞춤)`, `F1(단축키 도움말)`
* 🌐 **100% 오프라인 PWA 지원**: 인터넷 연결 없는 현장에서도 완벽 단독 구동

---

## 🛠️ 기술 스택
* **Frontend**: React 19, TypeScript, Vite, TailwindCSS
* **Graphics Core**: Fabric.js v6 (HTML5 Canvas Vector Engine)
* **Offline Engine**: Vite PWA (Service Worker & Cache Storage)
* **Packaging**: Windows VBScript & Batch Automation
