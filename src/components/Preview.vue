<template>
  <div class="preview-wrap" v-show="store.showPreview">
    <!-- Standard Markdown preview -->
    <div
      v-show="!store.showMindmap"
      ref="previewEl"
      class="preview-scroll"
    >
      <div
        ref="contentEl"
        class="markdown-body"
        :data-preview-style="store.previewStyle"
        v-html="renderedHtml"
      ></div>
    </div>

    <!-- Mindmap View -->
    <div v-show="store.showMindmap" class="mindmap-container">
      <div class="mindmap-header">
        <div class="mindmap-title">
          <span>🧠 文章结构思维导图</span>
          <span class="mindmap-hint">（按住拖拽移动，滚轮缩放，点击节点跳转）</span>
        </div>

        <div class="mindmap-controls">
          <button class="mindmap-btn" title="缩小" @click="zoomOut">-</button>
          <span class="zoom-level">{{ Math.round(zoomScale * 100) }}%</span>
          <button class="mindmap-btn" title="放大" @click="zoomIn">+</button>
          <button class="mindmap-btn" title="重置位置" @click="resetZoom">重置</button>
          <div class="divider-v"></div>
          <button class="mindmap-back-btn" @click="store.showMindmap = false">
            ← 返回文档预览
          </button>
        </div>
      </div>

      <div
        ref="mindmapViewport"
        class="mindmap-viewport"
        @wheel.prevent="onWheel"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
      >
        <div
          ref="mindmapEl"
          class="mindmap-content"
          :style="{
            transform: `translate(${panX}px, ${panY}px) scale(${zoomScale})`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue'
import mermaid from 'mermaid'
import { useEditorStore } from '../stores/editorStore.js'
import { useMarkdown, generateMindmapCode } from '../composables/useMarkdown.js'
import { useLocalImages } from '../composables/useLocalImages.js'

const emit = defineEmits(['scroll-el', 'jump-line'])
const store = useEditorStore()
const { render, postProcess } = useMarkdown()
const { resolveLocalImages, cleanup: cleanupLocalImages } = useLocalImages()

const previewEl = ref(null)
const contentEl = ref(null)
const mindmapViewport = ref(null)
const mindmapEl = ref(null)

const zoomScale = ref(1)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
let dragStartX = 0
let dragStartY = 0

function resetZoom() {
  zoomScale.value = 1
  panX.value = 0
  panY.value = 0
}

function zoomIn() {
  zoomScale.value = Math.min(3, zoomScale.value + 0.15)
}

function zoomOut() {
  zoomScale.value = Math.max(0.4, zoomScale.value - 0.15)
}

function onWheel(e) {
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

function onMouseDown(e) {
  if (e.target.closest('button')) return
  isDragging.value = true
  dragStartX = e.clientX - panX.value
  dragStartY = e.clientY - panY.value
}

function onMouseMove(e) {
  if (!isDragging.value) return
  panX.value = e.clientX - dragStartX
  panY.value = e.clientY - dragStartY
}

function onMouseUp() {
  isDragging.value = false
}

const renderedHtml = computed(() => render(store.activeContent))

function bindNodeClickEvents() {
  if (!mindmapEl.value) return
  const svgEl = mindmapEl.value.querySelector('svg')
  if (!svgEl) return

  const nodes = svgEl.querySelectorAll('g.node, .mindmap-node, g[class*="node"]')
  nodes.forEach(node => {
    node.style.cursor = 'pointer'
    node.addEventListener('click', (e) => {
      e.stopPropagation()
      const rawText = node.textContent?.trim() || ''
      if (!rawText) return

      // Exit mindmap mode and smooth scroll preview pane to target heading element
      store.showMindmap = false
      nextTick(() => {
        if (contentEl.value) {
          const headings = contentEl.value.querySelectorAll('h1, h2, h3, h4, h5, h6')
          for (const h of headings) {
            const hText = h.textContent?.replace('#', '').trim() || ''
            if (hText.includes(rawText) || rawText.includes(hText)) {
              h.scrollIntoView({ behavior: 'smooth', block: 'start' })
              h.classList.add('heading-highlight-flash')
              setTimeout(() => h.classList.remove('heading-highlight-flash'), 1500)
              break
            }
          }
        }
      })

      // Also scroll editor to line
      const lines = (store.activeContent || '').split('\n')
      for (let idx = 0; idx < lines.length; idx++) {
        const line = lines[idx]
        if (line.match(/^#{1,6}\s+/) && line.includes(rawText)) {
          emit('jump-line', idx + 1)
          break
        }
      }
    })
  })
}

async function renderMindmapDiagram() {
  if (!store.showMindmap || !mindmapEl.value) return
  const mindmapCode = generateMindmapCode(store.activeContent)
  try {
    mindmapEl.value.innerHTML = '<div class="mindmap-loading">正在生成思维导图...</div>'
    const id = `mindmap-${Date.now()}`
    const { svg } = await mermaid.render(id, mindmapCode)
    mindmapEl.value.innerHTML = svg
    nextTick(bindNodeClickEvents)
  } catch (err) {
    console.error('Render mindmap failed:', err)
    mindmapEl.value.innerHTML = `<div class="mindmap-error">思维导图生成失败：${err.message}</div>`
  }
}

async function processPreview() {
  await nextTick()
  if (store.showMindmap) {
    await renderMindmapDiagram()
  } else {
    await Promise.all([
      postProcess(contentEl.value),
      resolveLocalImages(contentEl.value, store.activeTab?.path),
    ])
  }
}

watch([renderedHtml, () => store.activeTab?.path, () => store.showMindmap], processPreview)

onMounted(() => {
  emit('scroll-el', previewEl.value)
  processPreview()
})

onUnmounted(cleanupLocalImages)

defineExpose({
  getScrollEl: () => previewEl.value,
  getContentEl: () => contentEl.value,
})
</script>

<style scoped>
.preview-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--preview-bg);
  overflow: hidden;
}
.preview-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px 32px 40px;
  display: flex;
  justify-content: center;
}

.mindmap-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
  overflow: hidden;
}
.mindmap-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  flex-shrink: 0;
}
.mindmap-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mindmap-hint {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
}
.mindmap-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}
.mindmap-btn {
  padding: 3px 8px;
  font-size: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition);
}
.mindmap-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  color: var(--accent);
}
.zoom-level {
  font-size: 11px;
  font-family: var(--editor-font);
  color: var(--text-secondary);
  min-width: 36px;
  text-align: center;
}
.divider-v {
  width: 1px;
  height: 14px;
  background: var(--border);
  margin: 0 4px;
}

.mindmap-back-btn {
  font-size: 12px;
  padding: 5px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: all var(--transition);
}
.mindmap-back-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--bg-hover);
}

.mindmap-viewport {
  flex: 1;
  overflow: hidden;
  position: relative;
  user-select: none;
  background: var(--bg-base);
}

.mindmap-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  transition: transform 0.05s ease-out;
}
.mindmap-content svg {
  max-width: 90%;
  max-height: 90%;
}
.mindmap-loading,
.mindmap-error {
  font-size: 13px;
  color: var(--text-muted);
}
</style>
