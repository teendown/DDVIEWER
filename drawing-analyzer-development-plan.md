# 중장비 전기·유압 도면 분석 및 관리 프로그램
## 실제 개발 착수용 종합 기술 설계서 v1.0

> 목표: 중장비 전기 배선도·유압 회로도 이미지를 불러와 확대/축소·팬·마킹·객체 관리·From-To 연결관계 기록·도면 비교·프로젝트 저장/공유를 수행하는 **오프라인 우선(Offline-First) 웹 애플리케이션**을 구축한다.
>
> 핵심 철학: **AI가 도면을 억지로 해석하는 프로그램이 아니라, 정비사가 도면을 빠르고 정확하게 추적하고 기록하는 전문 도구를 먼저 만든다.**

---

# 1. 프로젝트 목표

## 1.1 최종 목표

다음 작업을 하나의 프로그램에서 수행한다.

- PDF/JPG/PNG 등 도면 자료 등록
- 초대형 도면 확대/축소
- 마우스/터치 기반 팬
- 전기 배선 및 유압 라인 표시
- 선/화살표/사각형/원/텍스트/라벨 추가
- 도면 객체 선택 및 하이라이트
- 부품/커넥터/핀/배선 정보 관리
- From-To 연결관계 관리
- 특정 선에서 연결된 다른 객체 추적
- 도면 여러 장 동시 비교
- 도면 간 관련 회로 연결
- 자동 저장
- Undo/Redo
- 프로젝트 파일 내보내기/가져오기
- 완전 오프라인 사용
- 향후 AI/OCR/검색 기능 확장

---

# 2. 개발 원칙

## 2.1 가장 중요한 원칙

### 원칙 1. 원본 도면은 절대 수정하지 않는다.

원본 이미지와 사용자가 추가한 분석 데이터는 완전히 분리한다.

```text
원본 도면
    +
사용자 분석 객체
    +
연결관계
    +
메모
    =
프로젝트
```

### 원칙 2. 화면 좌표와 데이터 좌표를 분리한다.

Fabric.js의 현재 화면 좌표를 그대로 DB에 저장하지 않는다.

기본 저장 좌표는 도면 원본 크기에 대한 정규화 좌표를 사용한다.

```text
X = 0.0 ~ 1.0
Y = 0.0 ~ 1.0
```

예:

```json
{
  "x": 0.3521,
  "y": 0.7812
}
```

### 원칙 3. 객체와 연결관계를 분리한다.

```text
Wire
  ↓
Connection
  ↓
From Component
  ↓
To Component
```

### 원칙 4. IndexedDB를 기본 저장소로 사용한다.

인터넷이나 서버가 없어도 프로젝트를 열고 수정할 수 있어야 한다.

### 원칙 5. UI와 비즈니스 로직을 분리한다.

React 컴포넌트 안에 DB 처리, 파일 압축, 도면 분석 로직을 넣지 않는다.

---

# 3. 기술 스택

| 영역 | 기술 |
|---|---|
| Language | TypeScript |
| Frontend | React |
| Build | Vite |
| CSS | Tailwind CSS |
| Canvas | Fabric.js |
| Local DB | IndexedDB |
| DB Wrapper | Dexie.js |
| File Package | JSZip |
| PWA | vite-plugin-pwa |
| 상태관리 | Zustand |
| UUID | uuid |
| PDF 처리 | pdfjs-dist |
| 테스트 | Vitest |
| UI 테스트 | React Testing Library |
| 코드 품질 | ESLint + Prettier |
| 패키지 관리 | npm |
| 개발 환경 | VS Code |
| Git | GitHub |

---

# 4. 초기 개발 환경

## 4.1 Node.js

LTS 버전을 사용한다.

권장:

```text
Node.js 22 LTS 이상
npm 10 이상
```

확인:

```bash
node -v
npm -v
```

---

# 5. 프로젝트 생성

Windows PowerShell 기준:

```bash
npm create vite@latest drawing-analyzer -- --template react-ts
cd drawing-analyzer
npm install
```

---

# 6. 필수 패키지 설치

## 6.1 핵심 패키지

```bash
npm install fabric dexie jszip zustand uuid pdfjs-dist
```

## 6.2 Tailwind CSS

프로젝트의 Tailwind CSS 공식 설치 방식에 맞춰 설치한다.

```bash
npm install tailwindcss @tailwindcss/vite
```

Vite 설정에 Tailwind 플러그인을 연결한다.

---

# 7. 개발 도구 설치

```bash
npm install -D vitest
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D eslint prettier
```

---

# 8. 권장 폴더 구조

```text
drawing-analyzer/
│
├── public/
│   ├── icons/
│   └── samples/
│
├── src/
│   │
│   ├── app/
│   │   ├── App.tsx
│   │   └── routes.ts
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── LeftToolbar.tsx
│   │   │   ├── RightSidebar.tsx
│   │   │   └── StatusBar.tsx
│   │   │
│   │   ├── drawing/
│   │   │   ├── DrawingCanvas.tsx
│   │   │   ├── CanvasToolbar.tsx
│   │   │   ├── DrawingViewport.tsx
│   │   │   └── ObjectHighlight.tsx
│   │   │
│   │   ├── project/
│   │   │   ├── ProjectList.tsx
│   │   │   ├── ProjectEditor.tsx
│   │   │   └── ProjectSettings.tsx
│   │   │
│   │   ├── connection/
│   │   │   ├── ConnectionPanel.tsx
│   │   │   ├── ConnectionList.tsx
│   │   │   └── ConnectionDetail.tsx
│   │   │
│   │   └── multi-view/
│   │       ├── MultiView.tsx
│   │       └── DrawingWindow.tsx
│   │
│   ├── features/
│   │   ├── drawing/
│   │   ├── connection/
│   │   ├── project/
│   │   ├── annotation/
│   │   └── search/
│   │
│   ├── services/
│   │   ├── db.ts
│   │   ├── projectService.ts
│   │   ├── drawingService.ts
│   │   ├── fileManager.ts
│   │   └── imageService.ts
│   │
│   ├── store/
│   │   ├── projectStore.ts
│   │   ├── drawingStore.ts
│   │   ├── uiStore.ts
│   │   └── historyStore.ts
│   │
│   ├── types/
│   │   ├── project.ts
│   │   ├── drawing.ts
│   │   ├── object.ts
│   │   ├── connection.ts
│   │   └── schema.ts
│   │
│   ├── utils/
│   │   ├── coordinates.ts
│   │   ├── geometry.ts
│   │   ├── ids.ts
│   │   └── validation.ts
│   │
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── drawing.ts
│   │   └── app.ts
│   │
│   ├── main.tsx
│   └── index.css
│
├── tests/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

# 9. 전체 아키텍처

```text
┌─────────────────────────────────────────────┐
│                  React UI                   │
├─────────────────────────────────────────────┤
│ Header / Toolbar / Sidebar / Multi View     │
├─────────────────────────────────────────────┤
│             Zustand State Layer             │
├─────────────────────────────────────────────┤
│             Feature / Service Layer         │
│ Drawing / Connection / Project / File       │
├─────────────────────────────────────────────┤
│ Fabric.js       Dexie.js       JSZip        │
├─────────────────────────────────────────────┤
│ IndexedDB       Browser Cache    File       │
└─────────────────────────────────────────────┘
```

---

# 10. 데이터 모델

## 10.1 Project

```ts
export interface Project {
  id: string;
  name: string;

  maker?: string;
  model?: string;
  serialNumber?: string;

  description?: string;

  createdAt: string;
  updatedAt: string;

  schemaVersion: number;
  appVersion: string;
}
```

---

# 11. Drawing 데이터

```ts
export interface Drawing {
  id: string;

  projectId: string;

  number?: string;
  title?: string;

  type: "electrical" | "hydraulic" | "mechanical" | "other";

  imagePath: string;

  originalWidth: number;
  originalHeight: number;

  createdAt: string;
  updatedAt: string;
}
```

---

# 12. 도면 객체

모든 객체에는 반드시 `drawingId`를 넣는다.

```ts
export type DrawingObjectType =
  | "line"
  | "polyline"
  | "arrow"
  | "rectangle"
  | "circle"
  | "text"
  | "component"
  | "connector"
  | "pin"
  | "note";
```

```ts
export interface DrawingObject {
  id: string;

  projectId: string;
  drawingId: string;

  type: DrawingObjectType;

  label?: string;

  x?: number;
  y?: number;

  width?: number;
  height?: number;

  points?: Array<{
    x: number;
    y: number;
  }>;

  rotation?: number;

  strokeColor?: string;
  fillColor?: string;

  strokeWidth?: number;

  visible: boolean;
  locked: boolean;

  createdAt: string;
  updatedAt: string;
}
```

---

# 13. 정규화 좌표

원본 도면 크기가

```text
4000 × 3000
```

이고 객체가

```text
X = 2000
Y = 1500
```

이라면 저장값은

```text
X = 0.5
Y = 0.5
```

이다.

변환 함수 개념:

```ts
export function normalizeX(x: number, width: number) {
  return x / width;
}

export function normalizeY(y: number, height: number) {
  return y / height;
}
```

복원:

```ts
export function denormalizeX(x: number, width: number) {
  return x * width;
}

export function denormalizeY(y: number, height: number) {
  return y * height;
}
```

---

# 14. Component 데이터

전기 도면에서는 부품을 별도 데이터로 관리한다.

```ts
export interface Component {
  id: string;

  projectId: string;
  drawingId: string;

  type:
    | "ecu"
    | "relay"
    | "sensor"
    | "switch"
    | "motor"
    | "solenoid"
    | "fuse"
    | "connector"
    | "ground"
    | "other";

  name: string;

  reference?: string;

  x: number;
  y: number;

  description?: string;
}
```

예:

```text
ECU-A12
Relay-K3
Sensor-S12
Connector-C102
```

---

# 15. Wire 데이터

```ts
export interface Wire {
  id: string;

  projectId: string;
  drawingId: string;

  label?: string;

  colorCode?: string;

  strokeColor: string;
  strokeWidth: number;

  points: Array<{
    x: number;
    y: number;
  }>;

  description?: string;
}
```

---

# 16. Connection 데이터

From-To의 핵심 데이터다.

```ts
export interface Connection {
  id: string;

  projectId: string;

  drawingId?: string;

  wireId?: string;

  fromObjectId: string;
  toObjectId: string;

  fromPin?: string;
  toPin?: string;

  signalName?: string;

  description?: string;

  createdAt: string;
  updatedAt: string;
}
```

예:

```json
{
  "id": "conn_001",
  "projectId": "proj_001",
  "drawingId": "dwg_001",
  "wireId": "wire_001",
  "fromObjectId": "ecu_a12",
  "toObjectId": "relay_k3",
  "fromPin": "A12",
  "toPin": "85",
  "signalName": "START"
}
```

---

# 17. Annotation

정비사의 메모를 별도 객체로 관리한다.

```ts
export interface Annotation {
  id: string;

  projectId: string;
  drawingId: string;

  type: "text" | "arrow" | "rectangle" | "highlight";

  text?: string;

  x: number;
  y: number;

  width?: number;
  height?: number;

  color?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

# 18. IndexedDB 구조

Dexie.js를 사용한다.

```text
DB: DrawingAnalyzerDB

projects
drawings
objects
components
wires
connections
annotations
settings
```

예상 구조:

```ts
import Dexie, { type Table } from "dexie";

export class DrawingDatabase extends Dexie {
  projects!: Table<Project, string>;
  drawings!: Table<Drawing, string>;
  objects!: Table<DrawingObject, string>;
  components!: Table<Component, string>;
  wires!: Table<Wire, string>;
  connections!: Table<Connection, string>;
  annotations!: Table<Annotation, string>;

  constructor() {
    super("DrawingAnalyzerDB");

    this.version(1).stores({
      projects: "id, updatedAt",
      drawings: "id, projectId, updatedAt",
      objects: "id, projectId, drawingId, type",
      components: "id, projectId, drawingId, type",
      wires: "id, projectId, drawingId",
      connections: "id, projectId, drawingId, fromObjectId, toObjectId",
      annotations: "id, projectId, drawingId"
    });
  }
}

export const db = new DrawingDatabase();
```

---

# 19. 상태관리

Zustand를 사용한다.

## projectStore

```text
현재 프로젝트
프로젝트 목록
프로젝트 열기
프로젝트 생성
프로젝트 닫기
```

## drawingStore

```text
현재 도면
열린 도면
현재 선택 객체
줌
팬
도면 모드
```

## uiStore

```text
sidebar 열림/닫힘
toolbar 상태
멀티뷰 상태
다크모드
```

## historyStore

```text
Undo Stack
Redo Stack
```

---

# 20. 뷰어 모드

기본 모드는 Viewer다.

```text
VIEWER
```

기능:

- 팬
- 줌
- 객체 선택
- 연결관계 확인
- 검색
- 하이라이트

Viewer에서는 실수로 객체가 움직이지 않도록 한다.

---

# 21. 편집 모드

```text
EDITOR
```

기능:

- 선 생성
- 폴리라인 생성
- 화살표
- 사각형
- 원
- 텍스트
- 부품
- 커넥터
- 핀
- 메모
- 객체 이동
- 객체 삭제
- 속성 수정

---

# 22. 모드 전환

```ts
type EditorMode = "viewer" | "editor";
```

UI:

```text
[ 보기 ] [ 편집 ]
```

기본값:

```text
viewer
```

---

# 23. Fabric.js 캔버스 설계

Fabric Canvas는 다음 계층으로 생각한다.

```text
Canvas
│
├── Background Image
│
├── Original Drawing Layer
│
├── Analysis Object Layer
│
├── Connection Highlight Layer
│
└── Selection Layer
```

원본 도면은 별도의 잠금된 객체로 관리한다.

```text
selectable = false
evented = false
```

---

# 24. 줌

권장 초기 범위:

```text
최소 10%
최대 5000%
```

단, 실제 최대값은 이미지 크기에 따라 조정한다.

마우스 휠:

```text
Wheel Up   → Zoom In
Wheel Down → Zoom Out
```

줌 중심점은 마우스 위치를 기준으로 한다.

---

# 25. 팬

Viewer 모드에서는:

```text
마우스 드래그 → Pan
```

또는

```text
Space + Drag → Pan
```

을 지원한다.

---

# 26. 정밀 히트 테스트

전기 배선도에서는 선이 매우 얇다.

따라서 실제 선 두께와 클릭 영역을 분리한다.

```text
표시 선
──────────
    ↑
클릭 영역은 더 넓게
```

Fabric.js의 hit testing 옵션을 활용한다.

목표:

```text
선 두께 = 2px
클릭 인식 영역 = 약 10~20px
```

단, 실제 수치는 줌 배율에 따라 동적으로 조정한다.

---

# 27. 객체 선택

객체 선택 시:

```text
도면 객체
      ↓
선택
      ↓
Highlight
      ↓
Right Sidebar
      ↓
속성 표시
```

예:

```text
선 정보

W-001

Color Code
R/B

From
ECU-A12

To
Relay-K3

Signal
START
```

---

# 28. From-To 추적

핵심 기능이다.

사용자가 선을 선택하면:

```text
W-001
   ↓
Connection 검색
   ↓
ECU-A12
   ↓
Relay-K3
```

연결된 객체들을 모두 하이라이트한다.

---

# 29. 역방향 추적

Relay-K3를 선택했을 때도

```text
Relay-K3
   ↓
W-001
   ↓
ECU-A12
```

를 표시한다.

---

# 30. 연결 그래프

향후에는 내부적으로 Graph 구조를 사용한다.

```text
ECU-A12
   │
   │ W-001
   ▼
Relay-K3
   │
   │ W-002
   ▼
Starter Motor
```

이를 통해 향후 다음 기능을 구현한다.

```text
경로 추적
연결된 부품 찾기
중간 노드 찾기
전원 → 부품 경로 분석
```

---

# 31. 멀티 도면

기본 모드:

```text
┌────────────────────────────┐
│          Drawing A         │
└────────────────────────────┘
```

2분할:

```text
┌──────────────┬──────────────┐
│  Drawing A   │  Drawing B   │
│              │              │
└──────────────┴──────────────┘
```

4분할:

```text
┌──────────────┬──────────────┐
│ Drawing A    │ Drawing B    │
├──────────────┼──────────────┤
│ Drawing C    │ Drawing D    │
└──────────────┴──────────────┘
```

초기 버전에서는 CSS Grid 기반 커스텀 MultiView를 권장한다.

복잡한 창 이동 기능은 후속 단계에서 추가한다.

---

# 32. 동기화 줌

선택사항으로:

```text
[ ] Zoom Sync
[ ] Pan Sync
```

Zoom Sync가 켜져 있으면 여러 도면의 확대 배율을 동기화한다.

Pan Sync는 도면 크기와 좌표계가 다를 수 있으므로 별도 매핑 로직을 둔다.

---

# 33. 오토 세이브

다음 이벤트가 발생하면 저장 예약:

```text
객체 생성
객체 수정
객체 삭제
연결 생성
연결 수정
연결 삭제
메모 수정
도면 추가
```

단, 이벤트마다 즉시 DB를 쓰지 않고 debounce를 적용한다.

권장:

```text
변경 발생
   ↓
500ms~1000ms 대기
   ↓
추가 변경이 없으면 저장
```

---

# 34. 저장 상태 표시

화면 상단 또는 하단에 표시한다.

```text
● 저장됨
● 저장 중...
● 저장 필요
⚠ 저장 오류
```

---

# 35. Undo / Redo

모든 편집 명령은 Command 형태로 관리하는 것을 권장한다.

```text
CREATE_OBJECT
UPDATE_OBJECT
DELETE_OBJECT

CREATE_CONNECTION
UPDATE_CONNECTION
DELETE_CONNECTION
```

Undo:

```text
Ctrl + Z
```

Redo:

```text
Ctrl + Y
```

---

# 36. 프로젝트 파일 형식

확장자:

```text
.ddschema
```

실제로는 ZIP 기반 패키지다.

```text
project.ddschema
│
├── project.json
│
├── drawings/
│   ├── drawing_001.jpg
│   ├── drawing_002.jpg
│   └── drawing_003.png
│
├── thumbnails/
│   ├── drawing_001.jpg
│   └── drawing_002.jpg
│
└── metadata/
    └── manifest.json
```

---

# 37. project.json

권장 최종 구조:

```json
{
  "schemaVersion": 1,
  "appVersion": "0.1.0",

  "projectInfo": {
    "id": "proj_ec60e_001",
    "maker": "볼보건설기계",
    "model": "EC60E",
    "serialNumber": "",
    "author": "",
    "description": "",
    "createdAt": "2026-08-26T00:00:00Z",
    "updatedAt": "2026-08-26T00:00:00Z"
  },

  "drawings": [],

  "components": [],

  "wires": [],

  "connections": [],

  "objects": [],

  "annotations": []
}
```

---

# 38. JSZip Export

개념:

```ts
const zip = new JSZip();

zip.file(
  "project.json",
  JSON.stringify(projectData, null, 2)
);

zip.file(
  "drawings/drawing_001.jpg",
  imageBlob
);

const blob = await zip.generateAsync({
  type: "blob"
});
```

그리고:

```text
project.ddschema
```

파일로 다운로드한다.

---

# 39. Import

사용자가:

```text
프로젝트 열기
```

를 누르면:

```text
.ddschema 선택
      ↓
JSZip 압축 해제
      ↓
project.json 읽기
      ↓
schemaVersion 확인
      ↓
데이터 검증
      ↓
IndexedDB 저장
      ↓
프로젝트 화면 표시
```

---

# 40. Schema Validation

가져온 프로젝트는 반드시 검증한다.

검증 대상:

```text
schemaVersion
projectInfo
drawings
components
wires
connections
objects
annotations
```

잘못된 파일:

```text
불러오기 실패
↓
오류 내용 표시
```

앱이 충돌하면 안 된다.

---

# 41. 버전 마이그레이션

향후:

```text
Schema v1
Schema v2
Schema v3
```

로 발전할 수 있다.

예:

```text
v1 프로젝트
   ↓
Migration
   ↓
v2 데이터
```

따라서 초기부터 `schemaVersion`을 반드시 저장한다.

---

# 42. 이미지 처리

도면 이미지는 원본과 미리보기를 분리한다.

```text
Original
    ↓
Thumbnail
    ↓
Canvas
```

원본:

```text
원본 해상도 유지
```

썸네일:

```text
프로젝트 목록 / 도면 선택 화면용
```

---

# 43. 대형 이미지 대응

초기 버전:

```text
Image → Fabric Canvas
```

로 시작한다.

그러나 대형 도면에서 성능 문제가 발생하면 다음 단계로 확장한다.

```text
원본
 ↓
Tile Generator
 ↓
256 / 512 / 1024px Tile
 ↓
현재 Viewport에 필요한 Tile만 로드
```

장기적으로는 OpenSeadragon 같은 타일 기반 뷰어 도입도 검토한다.

중요:

**처음부터 복잡한 타일 시스템을 구현하지 않는다.**

MVP가 완성된 뒤 실제 성능을 측정하고 결정한다.

---

# 44. PDF 지원

PDF 도면은 `pdfjs-dist`를 이용한다.

처리:

```text
PDF
 ↓
페이지 목록
 ↓
사용자 선택
 ↓
Canvas/Image 변환
 ↓
Drawing 등록
```

원본 PDF 자체도 프로젝트 패키지에 보관할 수 있도록 구조를 열어둔다.

---

# 45. 도면 번호

예:

```text
SCH01
SCH02
SCH03
HYD01
HYD02
```

검색 가능하게 한다.

```text
SCH02 검색
↓
시동 회로
```

---

# 46. 검색 기능

초기 검색 대상:

```text
도면 번호
도면 제목
부품명
부품 번호
커넥터
핀 번호
Wire 번호
Signal
메모
```

예:

```text
검색: ECU-A12
```

결과:

```text
ECU-A12
├── SCH02
├── W-001
├── W-015
└── W-021
```

---

# 47. 하이라이트 시스템

검색 결과를 클릭하면:

```text
검색 결과
   ↓
해당 객체 검색
   ↓
Drawing 이동
   ↓
객체 위치로 이동
   ↓
Zoom
   ↓
Highlight
```

---

# 48. 전기 도면 색상

기본 색상은 프로젝트 설정으로 관리한다.

예:

```text
R   = Red
B   = Black
W   = White
Y   = Yellow
G   = Green
BL  = Blue
R/B = Red/Black
```

색상 코드는 실제 제조사 도면 표기와 별개로 저장한다.

---

# 49. 유압 도면

유압도 전기와 동일한 객체 시스템을 사용하되 타입을 확장한다.

```text
pump
valve
cylinder
motor
tank
filter
accumulator
hose
port
other
```

예:

```text
Pump P-01
    ↓
Valve V-02
    ↓
Cylinder C-03
```

---

# 50. 시스템 타입

프로젝트 또는 도면에 다음 타입을 지정한다.

```ts
type DrawingSystem =
  | "electrical"
  | "hydraulic"
  | "mechanical"
  | "other";
```

향후:

```text
전기
유압
엔진
주행
작업장치
에어컨
후처리
통신
```

등으로 확장할 수 있다.

---

# 51. UI 기본 레이아웃

```text
┌──────────────────────────────────────────────────────────┐
│ Logo │ Project │ Drawing │ View/Edit │ Save │ Import     │
├──────┬───────────────────────────────────────┬───────────┤
│      │                                       │           │
│ Tool │                                       │ Connection│
│ bar  │             Drawing Canvas            │ / Object  │
│      │                                       │ Panel     │
│      │                                       │           │
├──────┴───────────────────────────────────────┴───────────┤
│ Zoom 100% │ Drawing: SCH02 │ Objects: 128 │ Saved       │
└──────────────────────────────────────────────────────────┘
```

---

# 52. 왼쪽 Toolbar

초기:

```text
Select
Pan
Line
Polyline
Arrow
Rectangle
Circle
Text
Component
Connector
Highlight
Delete
```

---

# 53. 오른쪽 Sidebar

선택 객체에 따라 동적으로 바뀐다.

예:

```text
OBJECT

ID
W-001

TYPE
Wire

LABEL
Main Start Signal

COLOR
R/B

FROM
ECU-A12

TO
Relay-K3

SIGNAL
START
```

---

# 54. 프로젝트 화면

```text
Projects

[ + 새 프로젝트 ]

EC60E
전기
수정: 2026-08-26

EC300E
유압
수정: 2026-08-25
```

---

# 55. 새 프로젝트 생성

필수:

```text
제조사
모델
프로젝트 이름
```

선택:

```text
시리얼 번호
작성자
설명
```

생성 후:

```text
프로젝트
 ↓
도면 추가
```

---

# 56. 도면 추가

지원:

```text
PNG
JPG
JPEG
WEBP
PDF
```

처리:

```text
파일 선택
 ↓
파일 검증
 ↓
이미지 크기 확인
 ↓
Thumbnail 생성
 ↓
IndexedDB 저장
 ↓
Drawing 등록
```

---

# 57. 파일 용량 정책

초기에는 브라우저 저장 한도를 직접 가정하지 않는다.

앱 시작 시:

```ts
navigator.storage?.estimate()
```

로 저장공간을 확인한다.

사용 가능한 저장공간이 부족하면 사용자에게 경고한다.

---

# 58. PWA

PWA를 적용한다.

목표:

```text
웹 브라우저
 ↓
홈 화면 설치
 ↓
인터넷 없음
 ↓
프로그램 실행
 ↓
기존 프로젝트 작업
```

---

# 59. 오프라인 정책

인터넷 연결이 없어도 다음 기능은 동작해야 한다.

```text
프로젝트 열기
도면 보기
확대/축소
객체 편집
연결관계 편집
검색
저장
Import
Export
```

---

# 60. 서버 의존성

MVP에서는 서버를 사용하지 않는다.

```text
React
+
IndexedDB
+
Browser
```

구조로 완성한다.

향후 서버가 필요해지면:

```text
Local DB
   ↕
Sync Engine
   ↕
Cloud Database
```

를 추가한다.

---

# 61. AI 도입 계획

AI는 Phase 1에서 넣지 않는다.

1차:

```text
수동 객체 생성
수동 연결관계
```

2차:

```text
OCR
```

3차:

```text
도면 기호 인식
```

4차:

```text
선 추적
```

5차:

```text
AI 회로 분석
```

---

# 62. OCR

향후 OCR 기능:

```text
도면 이미지
 ↓
OCR
 ↓
텍스트 후보
 ↓
사용자 확인
 ↓
Component / Wire / Pin 등록
```

AI가 자동으로 확정하지 않는다.

**사용자 확인 단계가 반드시 존재해야 한다.**

---

# 63. 자동 선 추적

향후:

```text
사용자가 선 클릭
       ↓
이미지 분석
       ↓
선의 방향 추정
       ↓
연결 후보 탐색
       ↓
사용자 확인
```

AI/컴퓨터 비전은 **후보를 제시하는 역할**로 시작한다.

---

# 64. 보안

오프라인 앱이므로 서버 계정은 초기에는 필요하지 않다.

프로젝트 파일을 외부로 내보낼 때 사용자가 직접 파일을 관리한다.

향후 클라우드 동기화가 추가되면:

```text
인증
암호화
권한
프로젝트 공유
```

를 별도 설계한다.

---

# 65. 테스트 전략

## Unit Test

대상:

```text
좌표 변환
데이터 검증
파일 변환
Connection 검색
Graph 탐색
```

## Integration Test

```text
도면 추가
객체 생성
저장
프로젝트 재로드
```

## E2E

최종 단계에서:

```text
프로젝트 생성
→ 도면 추가
→ 선 생성
→ From-To 입력
→ 저장
→ 프로그램 재시작
→ 데이터 복구
```

를 테스트한다.

---

# 66. Git 전략

브랜치:

```text
main
develop
feature/*
fix/*
```

예:

```text
feature/canvas-viewer
feature/connection
feature/indexeddb
feature/project-file
```

---

# 67. 커밋 규칙

예:

```text
feat: add drawing viewer
feat: add wire object
feat: add connection panel
fix: fix canvas zoom
fix: fix project import
refactor: split drawing service
docs: update architecture
```

---

# 68. 개발 Phase

## Phase 0 — 환경 구축

목표:

```text
프로젝트 실행
React
TypeScript
Tailwind
Fabric.js
Git
```

완료 조건:

```text
npm run dev
```

로 정상 실행.

---

# 69. Phase 1 — 기본 도면 뷰어

구현:

- 이미지 불러오기
- Canvas 표시
- Zoom
- Pan
- Fit to Screen
- 원본 크기 표시

완료 조건:

```text
고해상도 도면을 열고
확대/축소/이동할 수 있다.
```

---

# 70. Phase 2 — 편집 기능

구현:

- Line
- Polyline
- Rectangle
- Circle
- Arrow
- Text
- Delete
- Select
- Move

완료 조건:

```text
도면 위에 객체를 만들고 수정할 수 있다.
```

---

# 71. Phase 3 — 데이터 모델

구현:

```text
Project
Drawing
Object
Component
Wire
Connection
Annotation
```

완료 조건:

```text
화면 객체가 새로고침 후에도 복구된다.
```

---

# 72. Phase 4 — IndexedDB

구현:

```text
Dexie
Auto Save
Load Project
Delete Project
```

완료 조건:

```text
브라우저를 종료했다가 다시 열어도 데이터가 유지된다.
```

---

# 73. Phase 5 — From-To

구현:

```text
Wire 선택
From 지정
To 지정
Pin 지정
Signal 지정
Connection 저장
```

완료 조건:

```text
W-001

ECU-A12
   ↓
Relay-K3
```

가 표시된다.

---

# 74. Phase 6 — 검색/하이라이트

구현:

```text
부품 검색
Wire 검색
Connector 검색
Pin 검색
Signal 검색
```

검색 결과 클릭:

```text
도면 자동 이동
객체 Highlight
정보 Sidebar 표시
```

---

# 75. Phase 7 — 프로젝트 파일

구현:

```text
Export .ddschema
Import .ddschema
Validation
Schema Version
Migration
```

완료 조건:

```text
A PC에서 Export
↓
B PC에서 Import
↓
동일한 프로젝트 복원
```

---

# 76. Phase 8 — 멀티뷰

구현:

```text
1 View
2 View
4 View
```

향후:

```text
Zoom Sync
Pan Sync
Cross Highlight
```

---

# 77. Phase 9 — PWA

구현:

```text
Service Worker
Manifest
Offline Cache
Install
```

완료 조건:

```text
인터넷 연결을 끊어도 앱이 실행된다.
```

---

# 78. Phase 10 — 고급 기능

후속:

```text
OCR
도면 텍스트 검색
자동 선 추적
회로 Graph
Cross Drawing Connection
PDF 자동 분리
AI 분석
```

---

# 79. MVP 완료 기준

다음 기능이 모두 되면 첫 번째 버전 완료로 본다.

```text
[ ] 프로젝트 생성
[ ] 도면 추가
[ ] 도면 표시
[ ] Zoom
[ ] Pan
[ ] Viewer Mode
[ ] Editor Mode
[ ] 선 그리기
[ ] 텍스트
[ ] 객체 선택
[ ] 객체 삭제
[ ] From 지정
[ ] To 지정
[ ] Connection 저장
[ ] 검색
[ ] Highlight
[ ] Undo
[ ] Redo
[ ] Auto Save
[ ] IndexedDB
[ ] Export
[ ] Import
[ ] PWA
```

---

# 80. 첫 번째 화면 구현 순서

처음부터 모든 기능을 만들지 않는다.

첫 번째 화면은 다음만 만든다.

```text
┌─────────────────────────────────────┐
│ Drawing Analyzer                    │
├─────────────────────────────────────┤
│                                     │
│         도면을 불러오세요            │
│                                     │
│          [ 도면 열기 ]              │
│                                     │
└─────────────────────────────────────┘
```

그 다음:

```text
도면 열기
 ↓
Fabric Canvas
 ↓
Zoom / Pan
```

을 구현한다.

---

# 81. 첫 번째 개발 목표

최초 목표는 아래 코드 수준이다.

```text
npm install
npm run dev
```

실행 후:

```text
도면 파일 선택
      ↓
화면 표시
      ↓
마우스 휠 Zoom
      ↓
마우스 Drag Pan
```

여기까지 먼저 완성한다.

---

# 82. 절대 하지 말아야 할 것

초기 개발에서 다음을 한꺼번에 구현하지 않는다.

```text
AI
OCR
자동 회로 분석
서버
로그인
클라우드
실시간 협업
복잡한 타일 엔진
```

먼저 핵심 엔진을 완성한다.

```text
도면
 ↓
객체
 ↓
Wire
 ↓
From-To
 ↓
저장
```

---

# 83. 향후 최종 모습

```text
                 Drawing Analyzer
┌────────────────────────────────────────────────────────────┐
│ Project │ Drawing │ View │ Edit │ Search │ Save │ Export   │
├─────────┬──────────────────────────────────────┬───────────┤
│         │                                      │           │
│ TOOL    │                                      │ OBJECT    │
│         │                                      │           │
│ Select  │          HIGH RESOLUTION             │ Wire      │
│ Line    │             DRAWING                 │ Component │
│ Arrow   │                                      │ Connection│
│ Text    │                                      │           │
│ Mark    │                                      │ From      │
│         │                                      │ To        │
│         │                                      │           │
├─────────┴──────────────────────────────────────┴───────────┤
│ SCH02 │ Zoom 250% │ Objects 182 │ Connections 73 │ Saved   │
└────────────────────────────────────────────────────────────┘
```

---

# 84. 장기 확장 아키텍처

최종적으로 다음 구조를 목표로 한다.

```text
                  ┌─────────────────┐
                  │  Drawing Files  │
                  └────────┬────────┘
                           ↓
                  ┌─────────────────┐
                  │ Drawing Engine  │
                  └────────┬────────┘
                           ↓
               ┌───────────────────────┐
               │ Structured Data Model │
               └───────────┬───────────┘
                           ↓
             ┌─────────────┼─────────────┐
             ↓             ↓             ↓
          Objects       Wires        Components
             └─────────────┼─────────────┘
                           ↓
                     Connections
                           ↓
                      Graph Engine
                           ↓
              ┌────────────┼────────────┐
              ↓            ↓            ↓
           Search       Highlight      Trace
                           ↓
                     AI Assistant
```

---

# 85. 개발 시작 체크리스트

- [ ] Node.js 설치
- [ ] VS Code 설치
- [ ] Git 설치
- [ ] GitHub Repository 생성
- [ ] Vite 프로젝트 생성
- [ ] React + TypeScript 확인
- [ ] Tailwind 설치
- [ ] Fabric.js 설치
- [ ] Dexie.js 설치
- [ ] JSZip 설치
- [ ] Zustand 설치
- [ ] pdfjs-dist 설치
- [ ] 기본 폴더 생성
- [ ] 타입 정의
- [ ] IndexedDB 생성
- [ ] 기본 Canvas 생성
- [ ] 첫 번째 도면 표시

---

# 86. 첫 실행 명령

프로젝트 폴더에서:

```bash
npm install
npm run dev
```

브라우저에서 Vite가 출력하는 로컬 주소를 연다.

---

# 87. 개발 진행 원칙

AI 코딩 도구를 사용할 경우에도 한 번에 전체 프로그램을 만들도록 지시하지 않는다.

권장 방식:

```text
1. 환경 구축
2. Canvas
3. Zoom/Pan
4. Drawing Object
5. DB
6. Auto Save
7. Connection
8. Search
9. Import/Export
10. Multi View
11. PWA
```

각 단계가 정상 동작하는지 확인한 뒤 다음 단계로 이동한다.

---

# 88. AI 코딩 도구에 전달할 기본 규칙

AI에게 코드를 작성시킬 때 다음 원칙을 유지한다.

```text
- 기존 기능을 임의로 삭제하지 않는다.
- 기존 데이터 구조와 호환성을 유지한다.
- TypeScript strict mode를 유지한다.
- React 컴포넌트와 비즈니스 로직을 분리한다.
- IndexedDB 접근은 service 계층에서만 처리한다.
- Fabric.js 접근은 drawing 관련 모듈에서 관리한다.
- UI 컴포넌트에서 직접 DB를 호출하지 않는다.
- 하나의 파일에 과도한 코드를 작성하지 않는다.
- 기능별 파일을 분리한다.
- 변경 전 기존 기능을 확인한다.
- 작업 후 TypeScript 오류를 확인한다.
- 작업 후 npm run build를 실행한다.
- 기존 프로젝트 파일의 schemaVersion 호환성을 유지한다.
```

---

# 89. 개발 완료 후 검증

최종적으로 다음 명령이 정상 실행되어야 한다.

```bash
npm run build
```

그리고:

```bash
npm run test
```

도 정상 통과해야 한다.

---

# 90. 결론

이 프로젝트의 핵심은 단순한 이미지 뷰어가 아니다.

최종적으로는 다음과 같은 **도면 데이터 분석 플랫폼**을 목표로 한다.

```text
도면 이미지
    ↓
도면 객체
    ↓
부품
    ↓
배선
    ↓
From-To
    ↓
연결 Graph
    ↓
검색
    ↓
경로 추적
    ↓
정비 분석
```

그리고 AI는 이 구조 위에 추가한다.

```text
기본 엔진
    ↓
정확한 구조화 데이터
    ↓
OCR
    ↓
자동 객체 인식
    ↓
자동 선 추적
    ↓
AI 회로 분석
```

따라서 **첫 개발 목표는 AI가 아니라 안정적인 도면 뷰어 + 데이터 모델 + 저장 시스템**이다.

이 구조를 기반으로 개발하면 이후 전기 회로뿐만 아니라 유압 회로, 엔진 회로, 주행 회로, 작업장치 회로 등으로 확장할 수 있다.

---

# 91. 다음 실제 작업

이 문서를 기준으로 실제 개발을 시작할 때는 아래 순서로 진행한다.

```text
STEP 1
Vite + React + TypeScript 프로젝트 생성

↓

STEP 2
Tailwind CSS 설정

↓

STEP 3
Fabric.js 설치 및 Canvas 생성

↓

STEP 4
JPG/PNG 도면 한 장 표시

↓

STEP 5
Zoom / Pan 구현

↓

STEP 6
Viewer / Editor 모드 구현

↓

STEP 7
Line / Polyline 객체 구현

↓

STEP 8
TypeScript 데이터 모델 작성

↓

STEP 9
Dexie IndexedDB 연결

↓

STEP 10
Auto Save

↓

STEP 11
From-To Connection

↓

STEP 12
Search / Highlight

↓

STEP 13
.ddschema Export / Import

↓

STEP 14
Multi View

↓

STEP 15
PWA

↓

STEP 16
OCR / AI 확장
```

**여기까지가 실제 개발을 시작하기 위한 기준 문서다.**
