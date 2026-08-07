<template>
  <aside class="outline-panel" :class="{ hidden: !store.showOutline || store.focusMode }">
    <div class="outline-header">
      <span class="outline-title">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        大纲
      </span>
      <button class="icon-btn" data-tooltip="关闭大纲" @click="store.showOutline = false">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="outline-content">
      <div v-if="headings.length === 0" class="outline-empty">
        <p>无标题</p>
      </div>
      <div
        v-for="(h, i) in headings"
        :key="i"
        class="outline-item"
        :class="`outline-h${h.level}`"
        :style="{ paddingLeft: (h.level - 1) * 10 + 8 + 'px' }"
        @click="scrollTo(h.id)"
      >
        <span class="outline-level-badge">H{{ h.level }}</span>
        <span class="outline-text">{{ h.text }}</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '../stores/editorStore.js'
import { createHeadingSlugger } from '../markdown/headingAnchors.js'

const store = useEditorStore()

const headings = computed(() => {
  const content = store.activeContent
  if (!content) return []
  const lines = content.split('\n')
  const result = []
  const slugger = createHeadingSlugger()
  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim()
      const id = slugger.slug(text)
      result.push({ level, text, id })
    }
  }
  return result
})

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<style scoped>
.outline-panel {
  width: var(--outline-width);
  background: var(--sidebar-bg);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-slow), opacity var(--transition-slow);
  overflow: hidden;
}
.outline-panel.hidden {
  width: 0;
  opacity: 0;
  pointer-events: none;
}
.outline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.outline-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.outline-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 16px;
}
.outline-empty {
  padding: 20px 12px;
  text-align: center;
}
.outline-empty p { font-size: 12px; color: var(--text-muted); }
.outline-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
  transition: background var(--transition), color var(--transition);
  white-space: nowrap;
  overflow: hidden;
}
.outline-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.outline-level-badge {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  flex-shrink: 0;
  font-family: var(--editor-font);
}
.outline-h1 .outline-level-badge { color: var(--accent); }
.outline-h2 .outline-level-badge { color: #79b8ff; }
.outline-h3 .outline-level-badge { color: var(--purple); }
.outline-text {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
</style>
