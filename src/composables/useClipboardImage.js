import { invoke } from '@tauri-apps/api/core'

/**
 * Handles clipboard image paste in the CodeMirror editor.
 * When a user pastes an image from clipboard, it:
 * 1. Reads the image data as ArrayBuffer
 * 2. Saves it to a local `assets/` directory next to the current file
 * 3. Inserts markdown image syntax at the cursor position
 */

/**
 * Generate a timestamped image filename
 */
const IMAGE_EXTENSIONS = {
  'image/avif': 'avif',
  'image/bmp': 'bmp',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
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
  return `image_${date}_${time}_${rand}.${extension}`
}

/**
 * Determine the directory separator used in a path
 */
function pathSep(path) {
  return path?.includes('\\') ? '\\' : '/'
}

/**
 * Build the assets directory path relative to the current file
 */
function getAssetsDir(filePath) {
  const sep = pathSep(filePath)
  const parts = filePath.split(/[\\/]/)
  parts.pop() // remove filename
  return parts.join(sep) + sep + 'assets'
}

/**
 * Handle paste event from CodeMirror editor
 * @param {ClipboardEvent} event - The paste event
 * @param {EditorView} view - The CodeMirror EditorView instance
 * @param {string|null} filePath - The current file's path (null if unsaved)
 * @returns {boolean} true if an image was handled, false otherwise
 */
export function getClipboardImage(event) {
  if (!event.clipboardData) return null
  const items = Array.from(event.clipboardData.items || [])
  const imageItem = items.find(item => item.type.startsWith('image/'))
  const imageFile = imageItem?.getAsFile()
  if (imageFile) return imageFile

  return Array.from(event.clipboardData.files || [])
    .find(file => file.type.startsWith('image/')) || null
}

export async function saveClipboardImage(blob, view, filePath) {
  if (!blob || !view || !filePath) return false

  const selection = view.state.selection.main

  try {
    const arrayBuffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // Generate file paths
    const assetsDir = getAssetsDir(filePath)
    const fileName = generateImageFilename(blob.type)
    const sep = pathSep(filePath)
    const fullImagePath = assetsDir + sep + fileName

    // Write image file via Tauri command
    await invoke('write_binary_file', {
      path: fullImagePath,
      data: Array.from(uint8Array),
    })

    // Insert markdown image syntax at cursor
    const relativePath = `./assets/${fileName}`
    const imageMarkdown = `![image](${relativePath})`

    view.dispatch({
      changes: { from: selection.from, to: selection.to, insert: imageMarkdown },
      selection: { anchor: selection.from + imageMarkdown.length },
      scrollIntoView: true,
    })

    return true
  } catch (err) {
    console.error('粘贴图片失败:', err)
    alert(`粘贴图片失败：${err instanceof Error ? err.message : String(err)}`)
    return false
  }
}
