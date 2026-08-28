import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'

function localFileStoragePlugin(): Plugin {
  return {
    name: 'local-file-storage-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''

        // 1. 프로젝트 폴더 생성 및 저장 (POST /api/storage/save)
        if (url.startsWith('/api/storage/save') && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body)
              const project = data.project || {}
              const objects = data.objects || []
              const assetBase64 = data.assetBase64

              const clean = (s: string) => (s || '기타').replace(/[\\/:*?"<>|]/g, '_').trim()
              const maker = clean(project.manufacturer)
              const model = clean(project.model)
              const category = clean(project.systemCategory)
              const title = clean(project.drawingTitle || project.name || '무제_도면')

              // 프로젝트 폴더 경로: saved_projects/제조사/기종/계통_부위/도면명
              const baseDir = path.resolve(process.cwd(), 'saved_projects', maker, model, category, title)
              fs.mkdirSync(baseDir, { recursive: true })

              // 1) project.json 메타데이터 저장
              const projectMeta = {
                ...project,
                diskFolder: baseDir,
                savedAt: new Date().toISOString(),
              }
              fs.writeFileSync(path.join(baseDir, 'project.json'), JSON.stringify(projectMeta, null, 2), 'utf-8')

              // 2) objects.json 주석/도형 데이터 저장
              fs.writeFileSync(path.join(baseDir, 'objects.json'), JSON.stringify(objects, null, 2), 'utf-8')

              // 3) 원본 도면 이미지 비파괴 저장
              if (assetBase64 && typeof assetBase64 === 'string') {
                const base64Data = assetBase64.replace(/^data:image\/\w+;base64,/, '')
                fs.writeFileSync(path.join(baseDir, 'original_drawing.png'), Buffer.from(base64Data, 'base64'))
              }

              // 4) 스냅샷 이력 폴더에 시간별 보관
              const snapDir = path.join(baseDir, 'snapshots')
              fs.mkdirSync(snapDir, { recursive: true })
              const snapTime = new Date().toISOString().replace(/[:.]/g, '-')
              fs.writeFileSync(path.join(snapDir, `snapshot_${snapTime}.json`), JSON.stringify(objects, null, 2), 'utf-8')

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, diskPath: baseDir }))
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        // 2. 저장된 프로젝트 목록 조회 (GET /api/storage/list)
        if (url.startsWith('/api/storage/list') && req.method === 'GET') {
          try {
            const baseDir = path.resolve(process.cwd(), 'saved_projects')
            const projectList: any[] = []

            const findProjects = (dir: string) => {
              if (!fs.existsSync(dir)) return
              const entries = fs.readdirSync(dir, { withFileTypes: true })
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name)
                if (entry.isDirectory()) {
                  const metaFile = path.join(fullPath, 'project.json')
                  if (fs.existsSync(metaFile)) {
                    try {
                      const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'))
                      projectList.push(meta)
                    } catch {}
                  } else {
                    findProjects(fullPath)
                  }
                }
              }
            }

            findProjects(baseDir)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true, projects: projectList }))
          } catch (err: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
          }
          return
        }

        // 3. 내보내기 형식별 폴더 자동 생성 및 저장 (POST /api/storage/export)
        if (url.startsWith('/api/storage/export') && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const data = JSON.parse(body)
              const format = (data.format || 'png').toLowerCase()
              const filename = data.filename || 'export'
              const fileData = data.fileDataBase64
              const maker = (data.manufacturer || '기타').replace(/[\\/:*?"<>|]/g, '_').trim()
              const model = (data.model || '기본기종').replace(/[\\/:*?"<>|]/g, '_').trim()

              // 내보내기 폴더 경로: exports/형식(png,jpg,pdf,cadproj)/제조사/기종/
              const exportDir = path.resolve(process.cwd(), 'exports', format, maker, model)
              fs.mkdirSync(exportDir, { recursive: true })

              const ext = format === 'cadproj' ? '.cadproj' : format === 'pdf' ? '.pdf' : format === 'jpg' ? '.jpg' : '.png'
              const fullFilePath = path.join(exportDir, `${filename}${filename.endsWith(ext) ? '' : ext}`)

              if (fileData) {
                const base64Data = fileData.replace(/^data:[^;]+;base64,/, '')
                fs.writeFileSync(fullFilePath, Buffer.from(base64Data, 'base64'))
              }

              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ success: true, diskPath: fullFilePath, folderPath: exportDir }))
            } catch (err: any) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
          return
        }

        next()
      })
    },
  }
}

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    localFileStoragePlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: '스마트 도면 분석기 (Industrial Drawing Analyzer)',
        short_name: '도면분석기',
        description: '중장비 및 산업용 전기/유압 도면 오프라인 정밀 분석기',
        theme_color: '#090d16',
        background_color: '#070b14',
        display: 'standalone',
        orientation: 'any',
        icons: [
          {
            src: '/favicon.svg',
            sizes: '48x48 72x72 96x96 128x128 192x192 256x256 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,wasm}'],
        maximumFileSizeToCacheInBytes: 25000000, // 25MB 대용량 번들 오프라인 캐시
        navigateFallback: 'index.html',
      },
    }),
  ],
})
