import { invoke } from '@tauri-apps/api/core'

const MIME_TYPES = {
  avif: 'image/avif',
  bmp: 'image/bmp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  svg: 'image/svg+xml',
  webp: 'image/webp',
}

function decodeImagePath(source) {
  const pathWithoutSuffix = source.split(/[?#]/, 1)[0]
  try {
    return decodeURIComponent(pathWithoutSuffix)
  } catch {
    return pathWithoutSuffix
  }
}

function resolveImagePath(source, documentPath) {
  if (!source || /^(?:data:|blob:|https?:|tauri:|asset:)/i.test(source) || source.startsWith('//')) {
    return null
  }

  const imagePath = decodeImagePath(source)
  if (/^[a-zA-Z]:[\\/]/.test(imagePath) || imagePath.startsWith('\\\\') || imagePath.startsWith('/')) {
    return imagePath
  }
  if (!documentPath) return null

  const separator = documentPath.includes('\\') ? '\\' : '/'
  const directoryEnd = Math.max(documentPath.lastIndexOf('/'), documentPath.lastIndexOf('\\'))
  if (directoryEnd < 0) return null

  const directory = documentPath.slice(0, directoryEnd)
  const relativePath = imagePath.replace(/[\\/]/g, separator)
  return `${directory}${separator}${relativePath}`
}

function imageMimeType(path) {
  const extension = path.split('.').pop()?.toLowerCase()
  return MIME_TYPES[extension] || 'application/octet-stream'
}

export function useLocalImages() {
  let objectUrls = []
  let renderVersion = 0

  function cleanup() {
    renderVersion += 1
    for (const url of objectUrls) URL.revokeObjectURL(url)
    objectUrls = []
  }

  async function resolveLocalImages(container, documentPath) {
    cleanup()
    if (!container) return

    const currentVersion = renderVersion
    const images = Array.from(container.querySelectorAll('img[src]'))

    await Promise.all(images.map(async (image) => {
      const source = image.getAttribute('src')
      const localPath = resolveImagePath(source, documentPath)
      if (!localPath) return

      try {
        const data = await invoke('read_binary_file', { path: localPath })
        if (currentVersion !== renderVersion || !image.isConnected) return

        const objectUrl = URL.createObjectURL(
          new Blob([new Uint8Array(data)], { type: imageMimeType(localPath) })
        )
        objectUrls.push(objectUrl)
        image.src = objectUrl
      } catch (err) {
        console.warn(`无法预览本地图片：${localPath}`, err)
      }
    }))
  }

  return { resolveLocalImages, cleanup }
}
