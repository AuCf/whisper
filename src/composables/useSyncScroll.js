import { ref } from 'vue'

export function useSyncScroll() {
  const isSyncing = ref(true)
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

  return { isSyncing, bindSync, toggleSync }
}
