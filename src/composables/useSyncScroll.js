import { ref, watch } from 'vue'

const SYNC_SCROLL_KEY = 'whisper-sync-scroll'

function restoreSyncScrollState() {
  try {
    const saved = localStorage.getItem(SYNC_SCROLL_KEY)
    return saved === null ? true : saved === 'true'
  } catch (err) {
    console.warn('读取同步滚动状态失败:', err)
    return true
  }
}

export function useSyncScroll() {
  const isSyncing = ref(restoreSyncScrollState())
  let isScrollingEditor = false
  let isScrollingPreview = false

  function bindSync(editorScrollEl, previewScrollEl) {
    if (!editorScrollEl || !previewScrollEl) return

    const onEditorScroll = () => {
      if (!isSyncing.value || isScrollingPreview) return
      isScrollingEditor = true

      const editorScrollRatio =
        editorScrollEl.scrollTop /
        (editorScrollEl.scrollHeight - editorScrollEl.clientHeight || 1)

      previewScrollEl.scrollTop =
        editorScrollRatio *
        (previewScrollEl.scrollHeight - previewScrollEl.clientHeight)

      requestAnimationFrame(() => { isScrollingEditor = false })
    }

    const onPreviewScroll = () => {
      if (!isSyncing.value || isScrollingEditor) return
      isScrollingPreview = true

      const previewScrollRatio =
        previewScrollEl.scrollTop /
        (previewScrollEl.scrollHeight - previewScrollEl.clientHeight || 1)

      editorScrollEl.scrollTop =
        previewScrollRatio *
        (editorScrollEl.scrollHeight - editorScrollEl.clientHeight)

      requestAnimationFrame(() => { isScrollingPreview = false })
    }

    editorScrollEl.addEventListener('scroll', onEditorScroll, { passive: true })
    previewScrollEl.addEventListener('scroll', onPreviewScroll, { passive: true })

    return () => {
      editorScrollEl.removeEventListener('scroll', onEditorScroll)
      previewScrollEl.removeEventListener('scroll', onPreviewScroll)
    }
  }

  function toggleSync() {
    isSyncing.value = !isSyncing.value
  }

  watch(isSyncing, value => {
    try {
      localStorage.setItem(SYNC_SCROLL_KEY, String(value))
    } catch (err) {
      console.warn('保存同步滚动状态失败:', err)
    }
  }, { flush: 'sync' })

  return { isSyncing, bindSync, toggleSync }
}
