import JSZip from "jszip";
import type { Project } from "../types/project";
import type { DrawingObject } from "../types/object";

export const exportService = {
  /**
   * 1. 고해상도 이미지 (PNG/JPG) 내보내기 (브라우저 다운로드 + exports/png or jpg/ 폴더에 파일 자동 저장)
   */
  async exportMergedImage(
    canvasEl: HTMLCanvasElement,
    filename: string,
    format: "image/png" | "image/jpeg" = "image/png",
    quality: number = 0.95,
    manufacturer?: string,
    model?: string
  ): Promise<void> {
    const dataUrl = canvasEl.toDataURL(format, quality);
    
    // 1) 브라우저 다운로드
    const link = document.createElement("a");
    const ext = format === "image/png" ? "png" : "jpg";
    link.download = `${filename}.${ext}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 2) 로컬 디스크 exports/png 또는 exports/jpg 폴더에 자동 분류 저장
    try {
      await fetch("/api/storage/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: ext,
          filename,
          fileDataBase64: dataUrl,
          manufacturer: manufacturer || "기타",
          model: model || "기본기종",
        }),
      });
    } catch (e) {
      console.warn("Local disk folder export skipped:", e);
    }
  },

  /**
   * 2. PDF 인쇄 보고서 내보내기 (인쇄 창 열기 + exports/pdf/ 폴더에 보관)
   */
  async exportPdfReport(
    canvasEl: HTMLCanvasElement,
    project: Project,
    objectsCount: number
  ): Promise<void> {
    const dataUrl = canvasEl.toDataURL("image/png", 1.0);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("팝업 차단을 해제해 주세요.");
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${project.drawingTitle || project.name} - 도면 분석 보고서</title>
          <style>
            @page {
              size: A3 landscape;
              margin: 10mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif;
              margin: 0;
              padding: 15px;
              background: #ffffff;
              color: #0f172a;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
              border: 2px solid #334155;
            }
            .header-table td, .header-table th {
              border: 1px solid #94a3b8;
              padding: 6px 12px;
              font-size: 13px;
            }
            .header-title {
              font-size: 20px;
              font-weight: bold;
              background: #f1f5f9;
              text-align: center;
            }
            .label-cell {
              background: #f8fafc;
              font-weight: 600;
              width: 120px;
              color: #475569;
            }
            .value-cell {
              font-weight: 500;
              color: #0f172a;
            }
            .drawing-container {
              width: 100%;
              text-align: center;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              overflow: hidden;
              background: #090d16;
            }
            .drawing-image {
              max-width: 100%;
              max-height: 80vh;
              object-fit: contain;
              display: block;
              margin: 0 auto;
            }
            .footer-info {
              margin-top: 8px;
              font-size: 11px;
              color: #64748b;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td colspan="4" class="header-title">
                ${project.drawingTitle || project.name}
              </td>
            </tr>
            <tr>
              <td class="label-cell">제조사</td>
              <td class="value-cell">${project.manufacturer || "미지정"}</td>
              <td class="label-cell">기종/모델</td>
              <td class="value-cell">${project.model || "미지정"}</td>
            </tr>
            <tr>
              <td class="label-cell">계통/부위</td>
              <td class="value-cell">${project.systemCategory || "일반"}</td>
              <td class="label-cell">분석 객체수</td>
              <td class="value-cell">${objectsCount}개 주석 요소</td>
            </tr>
            <tr>
              <td class="label-cell">출력 일시</td>
              <td class="value-cell">${new Date().toLocaleString("ko-KR")}</td>
              <td class="label-cell">작업자</td>
              <td class="value-cell">${project.author || "CAD 도면 분석기"}</td>
            </tr>
          </table>

          <div class="drawing-container">
            <img class="drawing-image" src="${dataUrl}" alt="도면 분석 출력물" />
          </div>

          <div class="footer-info">
            <span>스마트 건설기계 CAD 도면 분석기 (Cross-Platform Drawing Analyzer)</span>
            <span>프로젝트 ID: ${project.id}</span>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // 2) 로컬 디스크 exports/pdf 폴더에도 복사본 저장
    try {
      await fetch("/api/storage/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "pdf",
          filename: `[${project.manufacturer || "제조사"}]_${project.model || "기종"}_${project.drawingTitle || "도면"}`,
          fileDataBase64: dataUrl,
          manufacturer: project.manufacturer || "기타",
          model: project.model || "기본기종",
        }),
      });
    } catch (e) {
      console.warn("Local disk PDF export skipped:", e);
    }
  },

  /**
   * 3. .cadproj 단일 프로젝트 패키지 ZIP 내보내기 (브라우저 다운로드 + exports/cadproj/ 폴더 저장)
   */
  async exportProjectPackage(
    project: Project,
    objects: DrawingObject[],
    originalImageBlobOrDataUrl?: string
  ): Promise<void> {
    const zip = new JSZip();

    // 1) 프로젝트 메타데이터 & 계층 정보
    zip.file("project.json", JSON.stringify(project, null, 2));

    // 2) 주석/도형/배선 데이터
    zip.file("objects.json", JSON.stringify(objects, null, 2));

    // 3) 원본 도면 이미지 에셋
    if (originalImageBlobOrDataUrl) {
      if (originalImageBlobOrDataUrl.startsWith("data:")) {
        const base64Data = originalImageBlobOrDataUrl.split(",")[1];
        zip.file("drawing_asset.png", base64Data, { base64: true });
      } else {
        try {
          const res = await fetch(originalImageBlobOrDataUrl);
          const blob = await res.blob();
          zip.file("drawing_asset.png", blob);
        } catch {
          zip.file("drawing_asset_url.txt", originalImageBlobOrDataUrl);
        }
      }
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    const cleanMaker = (project.manufacturer || "제조사").replace(/[\\/:*?"<>|]/g, "");
    const cleanModel = (project.model || "기종").replace(/[\\/:*?"<>|]/g, "");
    const cleanTitle = (project.drawingTitle || project.name || "도면").replace(/[\\/:*?"<>|]/g, "");

    const zipFilename = `[${cleanMaker}]_${cleanModel}_${cleanTitle}.cadproj`;

    // 1) 브라우저 다운로드
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zipBlob);
    link.download = zipFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    // 2) 로컬 디스크 exports/cadproj/ 폴더에 직접 저장
    try {
      const base64Zip = await zip.generateAsync({ type: "base64" });
      await fetch("/api/storage/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "cadproj",
          filename: zipFilename,
          fileDataBase64: `data:application/zip;base64,${base64Zip}`,
          manufacturer: project.manufacturer || "기타",
          model: project.model || "기본기종",
        }),
      });
    } catch (e) {
      console.warn("Local disk cadproj export skipped:", e);
    }
  },

  /**
   * 4. .cadproj 단일 프로젝트 패키지 가져오기 (Import)
   */
  async importProjectPackage(file: File): Promise<{
    project: Project;
    objects: DrawingObject[];
    drawingImageDataUrl?: string;
  }> {
    const zip = await JSZip.loadAsync(file);

    const projectJsonFile = zip.file("project.json");
    if (!projectJsonFile) {
      throw new Error("올바른 .cadproj 프로젝트 파일 형식이 아닙니다 (project.json 누락)");
    }
    const project: Project = JSON.parse(await projectJsonFile.async("string"));

    const objectsJsonFile = zip.file("objects.json");
    const objects: DrawingObject[] = objectsJsonFile
      ? JSON.parse(await objectsJsonFile.async("string"))
      : [];

    let drawingImageDataUrl: string | undefined;
    const assetFile = zip.file("drawing_asset.png") || zip.file("drawing_asset.jpg");
    if (assetFile) {
      const base64 = await assetFile.async("base64");
      drawingImageDataUrl = `data:image/png;base64,${base64}`;
    }

    return { project, objects, drawingImageDataUrl };
  },
};
