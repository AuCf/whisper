import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'

/**
 * Export utilities for Whisper Markdown editor.
 * Supports exporting rendered markdown as HTML, PDF, and PNG.
 */

/**
 * Collect all CSS styles needed for a standalone HTML export.
 * Gathers from stylesheets and inline styles.
 */
function collectStyles() {
  const styles = []
  for (const sheet of document.styleSheets) {
    try {
      const rules = Array.from(sheet.cssRules || [])
      styles.push(rules.map(r => r.cssText).join('\n'))
    } catch {
      // Skip cross-origin stylesheets
    }
  }
  return styles.join('\n')
}

/**
 * Get the current theme's CSS variable values for standalone export
 */
function getComputedCSSVariables() {
  const root = document.documentElement
  const style = getComputedStyle(root)
  const vars = [
    '--bg-base', '--bg-surface', '--bg-overlay', '--bg-elevated', '--bg-hover',
    '--border', '--border-subtle', '--border-focus',
    '--text-primary', '--text-secondary', '--text-muted', '--text-disabled',
    '--accent', '--accent-hover', '--accent-muted', '--accent-glow',
    '--green', '--green-muted', '--yellow', '--red', '--red-muted', '--purple', '--orange',
    '--editor-bg', '--editor-font', '--editor-size', '--editor-line-height',
    '--preview-bg', '--preview-font', '--preview-size', '--preview-line-height', '--preview-max-width',
    '--radius-sm', '--radius-md', '--radius-lg',
    '--shadow-sm', '--shadow-md', '--shadow-lg',
  ]
  return vars.map(v => `${v}: ${style.getPropertyValue(v)};`).join('\n  ')
}

/**
 * Build a complete standalone HTML document from rendered markdown content.
 */
function buildStandaloneHTML(htmlContent, title = 'Whisper Export') {
  const cssVars = getComputedCSSVariables()

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.17.0/dist/katex.min.css">
  <style>
    :root {
      ${cssVars}
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: var(--preview-bg);
      color: var(--text-primary);
      font-family: var(--preview-font);
    }
    .markdown-body {
      color: var(--text-primary);
      font-family: var(--preview-font);
      font-size: var(--preview-size);
      line-height: var(--preview-line-height);
      word-wrap: break-word;
      padding: 40px;
      max-width: var(--preview-max-width);
      margin: 0 auto;
    }
    .markdown-body h1, .markdown-body h2, .markdown-body h3,
    .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      margin-top: 1.5em; margin-bottom: 0.5em; font-weight: 600; line-height: 1.35;
    }
    .markdown-body h1 { font-size: 2em; padding-bottom: 0.4em; border-bottom: 1px solid var(--border); }
    .markdown-body h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid var(--border); }
    .markdown-body h3 { font-size: 1.25em; }
    .markdown-body p { margin-bottom: 1em; }
    .markdown-body a { color: var(--accent); text-decoration: none; }
    .markdown-body a:hover { text-decoration: underline; }
    .markdown-body img { max-width: 100%; border-radius: 6px; display: block; margin: 1em auto; }
    .markdown-body blockquote {
      margin: 1em 0; padding: 0.5em 1em;
      border-left: 4px solid var(--accent);
      background: var(--accent-glow);
      color: var(--text-secondary);
      border-radius: 0 6px 6px 0;
    }
    .markdown-body blockquote p { margin-bottom: 0; }
    .markdown-body ul, .markdown-body ol { margin: 0.5em 0 1em; padding-left: 1.8em; }
    .markdown-body li { margin: 0.25em 0; }
    .markdown-body hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
    .markdown-body table {
      width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 14px;
      border: 1px solid var(--border); border-radius: 6px; overflow: hidden;
    }
    .markdown-body thead { background: var(--bg-elevated); }
    .markdown-body th { padding: 10px 14px; text-align: left; font-weight: 600; border-bottom: 2px solid var(--border); }
    .markdown-body td { padding: 8px 14px; border-bottom: 1px solid var(--border-subtle); }
    .markdown-body code:not(pre code) {
      font-family: var(--editor-font); font-size: 0.875em;
      background: var(--bg-elevated); color: var(--orange);
      padding: 2px 6px; border-radius: 4px;
    }
    .markdown-body .code-block {
      margin: 1em 0; border-radius: 6px; overflow: hidden;
      background: var(--bg-base); border: 1px solid var(--border);
    }
    .markdown-body .code-block-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 14px; background: var(--bg-elevated);
      border-bottom: 1px solid var(--border);
      font-family: var(--editor-font); font-size: 12px; color: var(--text-secondary);
    }
    .markdown-body .code-block pre { margin: 0; background: transparent; border: none; }
    .markdown-body .code-block pre code {
      display: block; padding: 16px; overflow-x: auto;
      font-family: var(--editor-font); font-size: 13px; line-height: 1.65;
      background: transparent; color: var(--text-primary); border: none;
    }
    .markdown-body .code-copy-btn { display: none; }
    .heading-anchor { display: none; }
    .markdown-body .katex-display { margin: 1.2em 0; overflow-x: auto; padding: 0.5em 0; }
    .markdown-body .mermaid {
      display: flex; justify-content: center; margin: 1.5em 0;
      background: var(--bg-elevated); border: 1px solid var(--border);
      border-radius: 6px; padding: 20px;
    }
    /* highlight.js tokens */
    .hljs { background: transparent; color: #c9d1d9; }
    .hljs-keyword { color: #ff7b72; }
    .hljs-built_in { color: #ffa657; }
    .hljs-string { color: #a5d6ff; }
    .hljs-comment { color: #8b949e; font-style: italic; }
    .hljs-function, .hljs-title { color: #d2a8ff; }
    .hljs-number, .hljs-literal { color: #79c0ff; }
    .hljs-variable { color: #ffa657; }
    .hljs-tag { color: #7ee787; }
    .hljs-attr { color: #79c0ff; }
    .hljs-meta { color: #8b949e; }
    @media print {
      body { background: white; }
      .markdown-body { max-width: 100%; padding: 0; color: #1f2328; }
      .markdown-body h1, .markdown-body h2 { border-color: #d0d7de; }
      .markdown-body a { color: #0969da; }
      .markdown-body code:not(pre code) { background: #f6f8fa; color: #1f2328; }
      .markdown-body .code-block { border-color: #d0d7de; }
      .markdown-body .code-block-header { background: #f6f8fa; border-color: #d0d7de; }
      .markdown-body blockquote { border-color: #0969da; background: #f0f6ff; color: #656d76; }
      .markdown-body table, .markdown-body th, .markdown-body td { border-color: #d0d7de; }
      .markdown-body thead { background: #f6f8fa; }
    }
  </style>
</head>
<body>
  <div class="markdown-body">${htmlContent}</div>
</body>
</html>`
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Export the current document as a standalone HTML file.
 * @param {string} htmlContent - The rendered HTML content from marked.js
 * @param {string} fileName - The base filename (without extension)
 */
export async function exportAsHTML(htmlContent, fileName = 'document') {
  const title = fileName.replace(/\.\w+$/, '')
  const fullHTML = buildStandaloneHTML(htmlContent, title)

  const selected = await save({
    defaultPath: `${title}.html`,
    filters: [{ name: 'HTML', extensions: ['html', 'htm'] }],
  })
  if (!selected) return false

  await invoke('write_file', { path: selected, content: fullHTML })
  return true
}

async function waitForPreviewAssets(previewElement) {
  await document.fonts?.ready
  const images = Array.from(previewElement.querySelectorAll('img'))
  await Promise.all(images.map(image => {
    if (image.complete) return Promise.resolve()
    return new Promise(resolve => {
      image.addEventListener('load', resolve, { once: true })
      image.addEventListener('error', resolve, { once: true })
    })
  }))
}

const EMPTY_STYLE_DEFAULTS = {
  'animation-duration': '0s',
  'background-clip': 'border-box',
  'background-color': 'transparent',
  'background-image': 'none',
  'background-origin': 'padding-box',
  'background-position': '0% 0%',
  'background-repeat': 'repeat',
  'background-size': 'auto',
  'border-top-color': 'transparent',
  'border-right-color': 'transparent',
  'border-bottom-color': 'transparent',
  'border-left-color': 'transparent',
  'border-top-left-radius': '0px',
  'border-top-right-radius': '0px',
  'border-bottom-right-radius': '0px',
  'border-bottom-left-radius': '0px',
  'border-top-style': 'none',
  'border-right-style': 'none',
  'border-bottom-style': 'none',
  'border-left-style': 'none',
  'border-top-width': '0px',
  'border-right-width': '0px',
  'border-bottom-width': '0px',
  'border-left-width': '0px',
  'box-shadow': 'none',
  'color': '#000000',
  'counter-increment': 'none',
  'counter-reset': 'none',
  'direction': 'ltr',
  'display': 'inline',
  'float': 'none',
  'font-family': 'sans-serif',
  'font-size': '16px',
  'font-style': 'normal',
  'font-variant': 'normal',
  'font-weight': '400',
  'letter-spacing': 'normal',
  'line-break': 'auto',
  'line-height': 'normal',
  'list-style-image': 'none',
  'list-style-position': 'outside',
  'list-style-type': 'disc',
  'margin-top': '0px',
  'margin-right': '0px',
  'margin-bottom': '0px',
  'margin-left': '0px',
  'opacity': '1',
  'overflow': 'visible',
  'overflow-wrap': 'normal',
  'padding-top': '0px',
  'padding-right': '0px',
  'padding-bottom': '0px',
  'padding-left': '0px',
  'paint-order': 'normal',
  'position': 'static',
  'text-align': 'start',
  'text-decoration-color': 'transparent',
  'text-decoration-line': 'none',
  'text-shadow': 'none',
  'text-transform': 'none',
  'transform': 'none',
  'transform-origin': '0px 0px',
  'visibility': 'visible',
  '-webkit-text-stroke-color': 'transparent',
  '-webkit-text-stroke-width': '0px',
  'word-break': 'normal',
  'z-index': 'auto',
}

const EXPORT_SAFETY_CLASS = 'whisper-export-capture'

function installExportSafetyStyles() {
  const style = document.createElement('style')
  style.dataset.whisperExportSafety = 'true'
  style.textContent = `
    .${EXPORT_SAFETY_CLASS},
    .${EXPORT_SAFETY_CLASS} body,
    .${EXPORT_SAFETY_CLASS} body * {
      counter-increment: none !important;
      counter-reset: none !important;
    }
    .${EXPORT_SAFETY_CLASS}::before,
    .${EXPORT_SAFETY_CLASS}::after,
    .${EXPORT_SAFETY_CLASS} body::before,
    .${EXPORT_SAFETY_CLASS} body::after,
    .${EXPORT_SAFETY_CLASS} body *::before,
    .${EXPORT_SAFETY_CLASS} body *::after {
      content: none !important;
      quotes: auto !important;
      counter-increment: none !important;
      counter-reset: none !important;
    }
  `
  document.head.appendChild(style)
  document.documentElement.classList.add(EXPORT_SAFETY_CLASS)

  return () => {
    document.documentElement.classList.remove(EXPORT_SAFETY_CLASS)
    style.remove()
  }
}

function sanitizeCloneStyles(clonedDocument) {
  const view = clonedDocument.defaultView
  if (!view) return

  for (const element of clonedDocument.querySelectorAll('.markdown-body, .markdown-body *')) {
    const computed = view.getComputedStyle(element)
    for (const [property, fallback] of Object.entries(EMPTY_STYLE_DEFAULTS)) {
      const value = computed.getPropertyValue(property).trim()
      const opens = (value.match(/\(/g) || []).length
      const closes = (value.match(/\)/g) || []).length
      if (!value || opens !== closes) element.style.setProperty(property, fallback, 'important')
    }
  }
}

async function capturePreview(previewElement) {
  if (!previewElement) throw new Error('预览区域不可用')
  await waitForPreviewAssets(previewElement)

  const layoutWidth = Math.ceil(previewElement.getBoundingClientRect().width)
  const width = Math.max(layoutWidth, Math.ceil(previewElement.scrollWidth))
  const height = Math.ceil(previewElement.scrollHeight)
  if (!width || !height) throw new Error('预览内容为空')

  const maxDimension = 30000
  const maxPixels = 80_000_000
  const scale = Math.max(0.5, Math.min(
    2,
    maxDimension / width,
    maxDimension / height,
    Math.sqrt(maxPixels / (width * height))
  ))
  const html2canvas = (await import('html2canvas')).default
  const elementBackground = getComputedStyle(previewElement).backgroundColor
  const themeBackground = getComputedStyle(document.documentElement)
    .getPropertyValue('--preview-bg').trim() || '#161b22'
  const backgroundColor = elementBackground === 'rgba(0, 0, 0, 0)'
    ? themeBackground
    : elementBackground || themeBackground

  const removeSafetyStyles = installExportSafetyStyles()
  previewElement.dataset.whisperExportTarget = 'true'
  try {
    return await html2canvas(previewElement, {
      backgroundColor,
      scale,
      useCORS: true,
      logging: false,
      width,
      height,
      windowWidth: Math.max(window.innerWidth, document.documentElement.clientWidth),
      windowHeight: Math.max(window.innerHeight, document.documentElement.clientHeight, height),
      scrollX: 0,
      scrollY: 0,
      onclone: clonedDocument => {
        const clonedTarget = clonedDocument.querySelector('[data-whisper-export-target="true"]')
        if (clonedTarget) {
          clonedTarget.style.setProperty('box-sizing', 'border-box', 'important')
          clonedTarget.style.setProperty('width', `${layoutWidth}px`, 'important')
          clonedTarget.style.setProperty('min-width', `${layoutWidth}px`, 'important')
          clonedTarget.style.setProperty('max-width', `${layoutWidth}px`, 'important')
        }
        sanitizeCloneStyles(clonedDocument)
        clonedDocument.querySelectorAll('.code-copy-btn, .heading-anchor').forEach(element => {
          element.style.display = 'none'
        })
      },
    })
  } finally {
    delete previewElement.dataset.whisperExportTarget
    removeSafetyStyles()
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('无法生成导出文件'))
    }, type, quality)
  })
}

async function writeBlob(blob, path) {
  const data = new Uint8Array(await blob.arrayBuffer())
  await invoke('write_binary_file', { path, data: Array.from(data) })
}

function concatBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const result = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }
  return result
}

async function createPdf(canvas) {
  const encoder = new TextEncoder()
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 28.35
  const contentWidth = pageWidth - margin * 2
  const contentHeight = pageHeight - margin * 2
  const pointScale = contentWidth / canvas.width
  const sliceHeight = Math.max(1, Math.floor(contentHeight / pointScale))
  const pages = []

  for (let offsetY = 0; offsetY < canvas.height; offsetY += sliceHeight) {
    const height = Math.min(sliceHeight, canvas.height - offsetY)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = height
    const context = pageCanvas.getContext('2d')
    context.drawImage(canvas, 0, offsetY, canvas.width, height, 0, 0, canvas.width, height)
    const jpeg = await canvasToBlob(pageCanvas, 'image/jpeg', 0.92)
    pages.push({ width: pageCanvas.width, height, data: new Uint8Array(await jpeg.arrayBuffer()) })
  }

  const objectCount = 2 + pages.length * 3
  const objects = new Array(objectCount + 1)
  const pageReferences = pages.map((_, index) => `${3 + index * 3} 0 R`).join(' ')
  objects[1] = encoder.encode('<< /Type /Catalog /Pages 2 0 R >>')
  objects[2] = encoder.encode(`<< /Type /Pages /Kids [${pageReferences}] /Count ${pages.length} >>`)

  pages.forEach((page, index) => {
    const pageObject = 3 + index * 3
    const imageObject = pageObject + 1
    const contentObject = pageObject + 2
    const renderedHeight = page.height * pointScale
    const y = pageHeight - margin - renderedHeight
    const commands = `q\n${contentWidth.toFixed(2)} 0 0 ${renderedHeight.toFixed(2)} ${margin.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`
    const commandBytes = encoder.encode(commands)
    const imageHeader = encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.data.length} >>\nstream\n`)

    objects[pageObject] = encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`)
    objects[imageObject] = concatBytes([imageHeader, page.data, encoder.encode('\nendstream')])
    objects[contentObject] = concatBytes([
      encoder.encode(`<< /Length ${commandBytes.length} >>\nstream\n`),
      commandBytes,
      encoder.encode('endstream'),
    ])
  })

  const parts = [encoder.encode('%PDF-1.4\n')]
  const offsets = new Array(objectCount + 1).fill(0)
  let byteOffset = parts[0].length
  for (let index = 1; index <= objectCount; index += 1) {
    const objectBytes = concatBytes([
      encoder.encode(`${index} 0 obj\n`),
      objects[index],
      encoder.encode('\nendobj\n'),
    ])
    offsets[index] = byteOffset
    parts.push(objectBytes)
    byteOffset += objectBytes.length
  }

  const xrefOffset = byteOffset
  const xref = [
    `xref\n0 ${objectCount + 1}\n`,
    '0000000000 65535 f \n',
    ...offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`),
    `trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
  ].join('')
  parts.push(encoder.encode(xref))
  return new Blob([concatBytes(parts)], { type: 'application/pdf' })
}

/** Export the rendered preview directly to an A4 PDF file. */
export async function exportAsPDF(previewElement, fileName = 'document') {
  try {
    const title = fileName.replace(/\.\w+$/, '')
    const selected = await save({
      defaultPath: `${title}.pdf`,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    })
    if (!selected) return false

    const canvas = await capturePreview(previewElement)
    const pdf = await createPdf(canvas)
    await writeBlob(pdf, selected)
    return true
  } catch (err) {
    console.error('PDF export failed:', err)
    alert(`PDF 导出失败：${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}

/**
 * Export as PNG using html2canvas.
 * @param {HTMLElement} previewElement - The preview container DOM element
 * @param {string} fileName - The base filename
 */
export async function exportAsPNG(previewElement, fileName = 'document') {
  try {
    const title = fileName.replace(/\.\w+$/, '')
    const selected = await save({
      defaultPath: `${title}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    })
    if (!selected) return false

    const canvas = await capturePreview(previewElement)
    const blob = await canvasToBlob(canvas, 'image/png')
    await writeBlob(blob, selected)
    return true
  } catch (err) {
    console.error('PNG export failed:', err)
    alert(`PNG 导出失败：${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}
