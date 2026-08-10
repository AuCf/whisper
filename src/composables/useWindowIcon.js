import { Image as TauriImage } from '@tauri-apps/api/image'
import { getCurrentWindow } from '@tauri-apps/api/window'

export async function applyWindowIcon(source = '/app-icon.png') {
  const response = await fetch(source)
  if (!response.ok) throw new Error(`图标资源加载失败：${response.status}`)

  const bitmap = await createImageBitmap(await response.blob())
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    bitmap.close()
    throw new Error('无法创建图标画布')
  }

  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
  const rgba = new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength)
  const icon = await TauriImage.new(rgba, canvas.width, canvas.height)
  try {
    await getCurrentWindow().setIcon(icon)
  } finally {
    await icon.close()
  }
}
