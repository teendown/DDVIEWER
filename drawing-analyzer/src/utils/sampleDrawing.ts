/**
 * 초기 실행 시 즉시 테스트 가능한 정밀 전기/유압 배선도 샘플 이미지 생성기
 */
export function generateSampleDrawingDataUrl(
  _type: "electrical" | "hydraulic" = "electrical",
  width: number = 1600,
  height: number = 1200
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // 1. 도면 배경 (미색 엔지니어링 용지 느낌)
  ctx.fillStyle = "#0c1322";
  ctx.fillRect(0, 0, width, height);

  // 2. 배경 그리드 (미세 그리드 + 메이저 그리드)
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#162238";
  for (let x = 0; x < width; x += 25) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 25) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#1e2e4a";
  for (let x = 0; x < width; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 100) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. 순수 CAD 다크 그리드 배경 완성 (파란색 테두리 및 표제란 박스 제거)
  return canvas.toDataURL("image/png");
}
