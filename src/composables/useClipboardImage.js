import { invoke } from '@tauri-apps/api/core'

/**
 * 80KB Threshold Image Handler for Whisper Markdown Editor
 * 
 * - Images <= 80KB: Directly converted to Base64 data URI and inserted into Markdown.
 *   Zero file system pollution, 100% portable, no folders created!
 * - Images > 80KB: Saved to local image storage directory (~/.assets or AppData/whisper/images)
 *   and inserted using local file URL syntax.
 */

const THRESHOLD_BYTES = 80 * 1024 // 80 KB = 81,920 bytes

const IMAGE_EXTENSIONS = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
}

function generateImageFilename(mimeType) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const rand = Math.random().toString(36).slice(2, 6)
  const extension = IMAGE_EXTENSIONS[mimeType] || 'png'
  return `img_${date}_${time}_${rand}.${extension}`
}

function pathSep(path) {
  return path?.includes('\\') ? '\\' : '/'
}

function getHiddenAssetsDir(filePath) {
  if (!filePath) return null
  const sep = pathSep(filePath)
  const parts = filePath.split(/[\\/]/)
  parts.pop() // remove filename
  return parts.join(sep) + sep + '.assets'
}

/**
 * Extract image File/Blob from paste or drop event
 */
export function getClipboardImage(event) {
  if (event.clipboardData) {
    const items = Array.from(event.clipboardData.items || [])
    const imageItem = items.find(item => item.type.startsWith('image/'))
    const imageFile = imageItem?.getAsFile()
    if (imageFile) return imageFile

    const files = Array.from(event.clipboardData.files || [])
    const fileItem = files.find(file => file.type.startsWith('image/'))
    if (fileItem) return fileItem
  }

  if (event.dataTransfer) {
    const files = Array.from(event.dataTransfer.files || [])
    const fileItem = files.find(file => file.type.startsWith('image/'))
    if (fileItem) return fileItem
  }

  return null
}

/**
 * Process and save image (clipboard paste or drop)
 * @param {Blob|File} blob - Image file or blob
 * @param {EditorView} view - CodeMirror EditorView instance
 * @param {string|null} filePath - Current document file path (if saved)
 */
export async function saveClipboardImage(blob, view, filePath) {
  if (!blob || !view) return false

  const selection = view.state.selection.main

  // ─────────────────────────────────────────────────────────────
  // STRATEGY 1: Small image (<= 80KB) -> Direct Base64 Inline
  // Zero folder pollution! 100% portable!
  // ─────────────────────────────────────────────────────────────
  if (blob.size <= THRESHOLD_BYTES) {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64Url = reader.result
        const imageMarkdown = `![image](${base64Url})`

        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: imageMarkdown },
          selection: { anchor: selection.from + imageMarkdown.length },
          scrollIntoView: true,
        })
        resolve(true)
      }
      reader.onerror = (err) => {
        console.error('Base64 read failed:', err)
        resolve(false)
      }
      reader.readAsDataURL(blob)
    })
  }

  // ─────────────────────────────────────────────────────────────
  // STRATEGY 2: Large image (> 80KB) -> Local Storage
  // Save to hidden .assets folder or AppData storage
  // ─────────────────────────────────────────────────────────────
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const fileName = generateImageFilename(blob.type)

    let targetPath = ''
    let relativeMarkdownPath = ''

    if (filePath) {
      const hiddenDir = getHiddenAssetsDir(filePath)
      const sep = pathSep(filePath)
      targetPath = hiddenDir + sep + fileName
      relativeMarkdownPath = `./.assets/${fileName}`
    } else {
      // Unsaved draft: save to app data directory
      let appImgDir = ''
      try {
        appImgDir = await invoke('get_app_image_dir')
      } catch (e) {
        console.warn('Get app image dir failed, fallback to path', e)
      }

      if (appImgDir) {
        const sep = pathSep(appImgDir)
        targetPath = appImgDir + sep + fileName
        // Normalize file URL for markdown rendering
        const fileUrl = targetPath.replace(/\\/g, '/')
        relativeMarkdownPath = fileUrl.startsWith('/') ? `file://${fileUrl}` : `file:///${fileUrl}`
      } else {
        // Ultimate fallback to Base64 if path fails
        const reader = new FileReader()
        return new Promise((resolve) => {
          reader.onload = () => {
            const base64Url = reader.result
            const imageMarkdown = `![image](${base64Url})`
            view.dispatch({
              changes: { from: selection.from, to: selection.to, insert: imageMarkdown },
              selection: { anchor: selection.from + imageMarkdown.length },
              scrollIntoView: true,
            })
            resolve(true)
          }
          reader.readAsDataURL(blob)
        })
      }
    }

    await invoke('write_binary_file', {
      path: targetPath,
      data: Array.from(uint8Array),
    })

    const imageMarkdown = `![image](${relativeMarkdownPath})`

    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: imageMarkdown },
      selection: { anchor: selection.from + imageMarkdown.length },
      scrollIntoView: true,
    })

    return true
  } catch (err) {
    console.error('Save image failed:', err)
    alert(`保存图片失败：${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}
