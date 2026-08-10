<template>
  <div class="status-bar" :class="{ hidden: store.focusMode }">
    <!-- Left -->
    <div class="status-group">
      <span class="status-item status-filename" v-if="store.activeTab" :title="store.activeTab.path || '尚未保存'">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
        {{ store.activeTab.path || store.activeTab.name }}
        <span v-if="store.activeTab.isDirty" class="status-dirty">●</span>
      </span>
    </div>

    <!-- Right -->
    <div class="status-group">
      <span class="status-item" title="中英文字数">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/></svg>
        {{ wordCount }} 字
      </span>
      <span class="status-separator">|</span>
      <span class="status-item" title="预计阅读时间">⏱️ {{ readingTime }}</span>
      <span class="status-separator">|</span>
      <span class="status-item" title="字符数">{{ charCount }} 字符</span>
      <span class="status-separator">|</span>
      <span class="status-item" title="行数">{{ lineCount }} 行</span>
      <span class="status-separator">|</span>
      <span class="status-item" title="光标位置">行 {{ store.cursorLine }}，列 {{ store.cursorColumn }}</span>
      <span class="status-separator">|</span>
      <span class="status-item" title="文件编码">UTF-8</span>
      <span class="status-separator">|</span>

      <!-- Toggle outline -->
      <button
        class="status-btn"
        :class="{ active: store.showOutline }"
        @click="store.showOutline = !store.showOutline"
        title="大纲"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/></svg>
        大纲
      </button>

      <!-- Toggle sidebar -->
      <button
        class="status-btn"
        :class="{ active: store.showSidebar }"
        @click="store.showSidebar = !store.showSidebar"
        title="文件树"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        文件树
      </button>

      <span class="status-separator">|</span>
      <span
        class="status-item status-version"
        :class="{ 'has-new-update': hasUpdate }"
        :title="hasUpdate ? `点击升级至新版本 v${newVersion}` : `Whisper v${currentVersion}`"
        @click="hasUpdate && checkForUpdates(true)"
      >
        <span class="version-tag">v{{ currentVersion }}</span>
        <span v-if="hasUpdate" class="status-update-badge">● 🚀 v{{ newVersion }} 可用</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorStore } from '../stores/editorStore.js'
import { useUpdater } from '../composables/useUpdater.js'

const store = useEditorStore()
const { currentVersion, hasUpdate, newVersion, checkForUpdates } = useUpdater()

const content = computed(() => store.activeContent || '')

const charCount = computed(() => content.value.length)

const wordCount = computed(() => {
  const text = content.value.trim()
  if (!text) return 0
  // Count CJK characters as individual words
  const cjk = (text.match(/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]/g) || []).length
  const latin = (text.match(/[a-zA-Z0-9]+/g) || []).length
  return cjk + latin
})

const lineCount = computed(() => {
  if (!content.value) return 0
  return content.value.split('\n').length
})

const readingTime = computed(() => {
  const words = wordCount.value
  if (!words) return '0 分钟'
  const minutes = Math.max(1, Math.ceil(words / 350))
  return `${minutes} 分钟`
})
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--statusbar-height);
  background: var(--accent);
  padding: 0 10px;
  flex-shrink: 0;
  font-size: 11.5px;
  color: rgba(255,255,255,0.85);
  transition: height var(--transition-slow), opacity var(--transition-slow);
}
.status-bar.hidden {
  height: 0;
  opacity: 0;
  overflow: hidden;
  pointer-events: none;
}
.status-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  opacity: 0.85;
}
.status-filename {
  font-weight: 500;
  opacity: 1;
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.status-dirty { color: #ffd070; font-size: 14px; line-height: 1; }
.status-separator { opacity: 0.35; }
.status-brand {
  font-weight: 600;
  opacity: 0.7;
  letter-spacing: 0.5px;
}
.status-version {
  font-weight: 500;
  opacity: 0.85;
  letter-spacing: 0.3px;
  user-select: none;
}
.status-version.has-new-update {
  cursor: pointer;
  opacity: 1;
  background: rgba(255, 208, 112, 0.2);
  padding: 1px 6px;
  border-radius: 4px;
  transition: all var(--transition);
}
.status-version.has-new-update:hover {
  background: rgba(255, 208, 112, 0.35);
}
.version-tag {
  font-family: var(--editor-font);
}
.status-update-badge {
  color: #ffd070;
  font-size: 11px;
  font-weight: 600;
  margin-left: 2px;
  animation: pulseText 1.5s infinite;
}
@keyframes pulseText {
  0% { opacity: 0.7; }
  50% { opacity: 1; }
  100% { opacity: 0.7; }
}
.status-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11.5px;
  color: rgba(255,255,255,0.8);
  background: none;
  border: none;
  cursor: pointer;
  transition: background var(--transition);
}
.status-btn:hover { background: rgba(255,255,255,0.15); }
.status-btn.active { background: rgba(255,255,255,0.2); color: white; }
</style>
