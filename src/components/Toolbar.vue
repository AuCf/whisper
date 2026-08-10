<template>
  <div class="toolbar" :class="{ hidden: store.focusMode }">
    <div class="titlebar-brand" data-tauri-drag-region>
      <span class="brand-mark" data-tauri-drag-region aria-hidden="true">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6M8 13h8M8 17h5"/>
        </svg>
      </span>
      <span class="brand-name" data-tauri-drag-region>Whisper</span>
      <span class="titlebar-separator" data-tauri-drag-region>/</span>
      <span class="document-name" data-tauri-drag-region>{{ documentTitle }}</span>
      <span v-if="store.activeTab?.isDirty" class="dirty-dot" title="未保存">●</span>
    </div>

    <!-- Left: Format actions -->
    <div class="toolbar-group toolbar-format">
      <button class="icon-btn" data-tooltip="加粗 (Ctrl+B)" @click="format('bold')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>
      </button>
      <button class="icon-btn" data-tooltip="斜体 (Ctrl+I)" @click="format('italic')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>
      </button>
      <button class="icon-btn" data-tooltip="删除线" @click="format('strikethrough')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>
      </button>

      <div class="divider"></div>

      <button class="icon-btn" data-tooltip="标题 1" @click="format('h1')">
        <span style="font-weight:700;font-size:13px;">H1</span>
      </button>
      <button class="icon-btn" data-tooltip="标题 2" @click="format('h2')">
        <span style="font-weight:700;font-size:12px;">H2</span>
      </button>
      <button class="icon-btn" data-tooltip="标题 3" @click="format('h3')">
        <span style="font-weight:700;font-size:11px;">H3</span>
      </button>

      <div class="divider"></div>

      <button class="icon-btn" data-tooltip="无序列表" @click="format('ul')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
      </button>
      <button class="icon-btn" data-tooltip="有序列表" @click="format('ol')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
      </button>
      <button class="icon-btn" data-tooltip="任务列表" @click="format('task')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      </button>

      <div class="divider"></div>

      <button class="icon-btn" data-tooltip="引用" @click="format('quote')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
      </button>
      <button class="icon-btn" data-tooltip="行内代码" @click="format('inlineCode')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
      </button>
      <button class="icon-btn" data-tooltip="代码块" @click="format('codeBlock')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
      </button>

      <div class="divider"></div>

      <button class="icon-btn" data-tooltip="分隔线" @click="format('hr')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <button class="icon-btn" data-tooltip="插入链接" @click="format('link')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
      <button class="icon-btn" data-tooltip="插入图片" @click="format('image')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </button>
      <button class="icon-btn" data-tooltip="插入表格" @click="format('table')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
      </button>
    </div>

    <div class="titlebar-drag" data-tauri-drag-region></div>

    <!-- Right: View / File actions -->
    <div class="toolbar-group toolbar-right">
      <!-- Sync scroll toggle -->
      <button
        class="icon-btn"
        :class="{ active: syncScroll }"
        data-tooltip="同步滚动"
        @click="$emit('toggle-sync')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
      </button>

      <div class="divider"></div>

      <!-- Layout toggles -->
      <button class="icon-btn" :class="{ active: store.showEditor && !store.showPreview }" data-tooltip="仅编辑" @click="setLayout('editor')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      </button>
      <button class="icon-btn" :class="{ active: store.showEditor && store.showPreview }" data-tooltip="分栏视图" @click="setLayout('split')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
      </button>
      <button class="icon-btn" :class="{ active: !store.showEditor && store.showPreview }" data-tooltip="仅预览" @click="setLayout('preview')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>
      </button>
      <button class="icon-btn" :class="{ active: store.showMindmap }" data-tooltip="思维导图" @click="store.showMindmap = !store.showMindmap">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 9V3"/><path d="M12 15v6"/><path d="M15 12h6"/><path d="M9 12H3"/><path d="M16.24 7.76l4.24-4.24"/><path d="M7.76 16.24l-4.24 4.24"/><path d="M16.24 16.24l4.24 4.24"/><path d="M7.76 7.76L3.52 3.52"/></svg>
      </button>

      <div class="divider"></div>

      <!-- Fullscreen focus mode -->
      <button class="icon-btn" :class="{ active: store.focusMode }" data-tooltip="专注模式 (F11)" @click="store.focusMode = !store.focusMode">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
      </button>

      <div class="divider"></div>

      <!-- Theme toggle -->
      <div class="dropdown-wrap">
        <button class="icon-btn" data-tooltip="切换主题" @click="showThemeMenu = !showThemeMenu">
          <svg v-if="store.theme === 'dark'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg v-else-if="store.theme === 'light'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <div v-if="showThemeMenu" class="dropdown-menu" @mouseleave="showThemeMenu = false">
          <div class="dropdown-item" :class="{ active: store.theme === 'dark' }" @click="switchTheme('dark')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            深色
          </div>
          <div class="dropdown-item" :class="{ active: store.theme === 'light' }" @click="switchTheme('light')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>
            浅色
          </div>
          <div class="dropdown-item" :class="{ active: store.theme === 'solarized' }" @click="switchTheme('solarized')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
            Solarized
          </div>
        </div>
      </div>

      <!-- Preview style preset dropdown -->
      <div class="dropdown-wrap">
        <button class="icon-btn" data-tooltip="排版风格" @click="showStyleMenu = !showStyleMenu">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 1 0 7 7"/></svg>
        </button>
        <div v-if="showStyleMenu" class="dropdown-menu" @mouseleave="showStyleMenu = false">
          <div class="dropdown-item" :class="{ active: store.previewStyle === 'github' }" @click="switchStyle('github')">
            <span style="font-weight:700;">🐙</span> GitHub 简约
          </div>
          <div class="dropdown-item" :class="{ active: store.previewStyle === 'vitepress' }" @click="switchStyle('vitepress')">
            <span style="font-weight:700;">⚡</span> VitePress 科技
          </div>
          <div class="dropdown-item" :class="{ active: store.previewStyle === 'editorial' }" @click="switchStyle('editorial')">
            <span style="font-weight:700;">📰</span> Editorial 杂志
          </div>
          <div class="dropdown-item" :class="{ active: store.previewStyle === 'morandi' }" @click="switchStyle('morandi')">
            <span style="font-weight:700;">🌸</span> Morandi 莫兰迪
          </div>
          <div class="dropdown-item" :class="{ active: store.previewStyle === 'wechat' }" @click="switchStyle('wechat')">
            <span style="font-weight:700;">📱</span> WeChat 微信排版
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Export dropdown -->
      <div class="dropdown-wrap">
        <button class="toolbar-btn export-btn" data-tooltip="导出" @click="showExportMenu = !showExportMenu">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          <span class="button-label">导出</span>
        </button>
        <div v-if="showExportMenu" class="dropdown-menu" @mouseleave="showExportMenu = false">
          <div class="dropdown-item" @click="doExport('html')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            导出 HTML
          </div>
          <div class="dropdown-item" @click="doExport('pdf')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            导出 PDF
          </div>
          <div class="dropdown-item" @click="doExport('png')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            导出 PNG
          </div>
        </div>
      </div>

      <!-- Check for updates -->
      <button class="icon-btn" :class="{ spinning: isChecking }" data-tooltip="检查软件更新" @click="checkForUpdates(true)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
      </button>

      <div class="divider"></div>

      <!-- Save -->
      <button class="toolbar-btn save-btn" data-tooltip="保存 (Ctrl+S)" @click="store.saveActiveFile()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        <span class="button-label">保存</span>
      </button>
    </div>

    <WindowControls />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useEditorStore } from '../stores/editorStore.js'
import { reinitMermaid } from '../composables/useMarkdown.js'
import { useUpdater } from '../composables/useUpdater.js'
import WindowControls from './WindowControls.vue'

defineProps({
  syncScroll: Boolean,
})
const emit = defineEmits(['toggle-sync', 'insert', 'export'])

const store = useEditorStore()
const { checkForUpdates, isChecking } = useUpdater()
const showThemeMenu = ref(false)
const showStyleMenu = ref(false)
const showExportMenu = ref(false)
const documentTitle = computed(() => store.activeTab?.name || '新建文档')

function setLayout(mode) {
  if (mode === 'editor') {
    store.showEditor = true
    store.showPreview = false
  } else if (mode === 'preview') {
    store.showEditor = false
    store.showPreview = true
  } else {
    store.showEditor = true
    store.showPreview = true
  }
}

function format(type) {
  emit('insert', type)
}

function switchTheme(name) {
  store.setTheme(name)
  reinitMermaid(name)
  showThemeMenu.value = false
}

function switchStyle(name) {
  store.setPreviewStyle(name)
  showStyleMenu.value = false
}

function doExport(format) {
  showExportMenu.value = false
  emit('export', format)
}
</script>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--toolbar-height);
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--border);
  padding: 0;
  flex-shrink: 0;
  gap: 0;
  transition: opacity var(--transition-slow), transform var(--transition-slow);
  position: relative;
  z-index: 10;
}
.titlebar-brand {
  align-self: stretch;
  display: flex;
  align-items: center;
  flex: 0 1 230px;
  min-width: 128px;
  padding: 0 12px;
  gap: 7px;
  border-right: 1px solid var(--border-subtle);
  overflow: hidden;
  color: var(--text-secondary);
}
.titlebar-brand > * { pointer-events: none; }
.brand-mark {
  display: flex;
  flex-shrink: 0;
  color: var(--accent);
}
.brand-name {
  flex-shrink: 0;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2px;
}
.titlebar-separator { color: var(--text-muted); }
.document-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
}
.dirty-dot {
  flex-shrink: 0;
  color: var(--accent);
  font-size: 7px;
}
.toolbar.hidden {
  opacity: 0;
  pointer-events: none;
  height: 0;
  overflow: hidden;
}
.toolbar-group {
  display: flex;
  align-items: center;
  gap: 1px;
}
.toolbar-format {
  min-width: 0;
  padding-left: 8px;
  flex-shrink: 1;
  white-space: nowrap;
}
.titlebar-drag {
  align-self: stretch;
  flex: 1 1 24px;
  min-width: 12px;
}
.toolbar-right {
  margin-left: auto;
  flex-shrink: 0;
}
.toolbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all var(--transition);
}
.toolbar-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.save-btn {
  background: var(--accent-muted);
  color: var(--accent);
  border: 1px solid rgba(88, 166, 255, 0.2);
}
.save-btn:hover {
  background: var(--accent);
  color: white;
}
.export-btn {
  color: var(--text-secondary);
}
.export-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.toolbar [data-tooltip]::after {
  top: calc(100% + 6px);
  bottom: auto;
}

@media (max-width: 1180px) {
  .titlebar-brand { flex-basis: 108px; min-width: 108px; }
  .titlebar-separator,
  .document-name,
  .dirty-dot { display: none; }
  .toolbar-format > :nth-child(n + 12) { display: none; }
}

@media (max-width: 980px) {
  .button-label { display: none; }
  .toolbar-btn { padding: 4px 7px; }
  .titlebar-brand { flex-basis: 92px; min-width: 92px; padding: 0 9px; }
}

/* ─── Dropdown menu ──────────────────────────────────────── */
.dropdown-wrap {
  position: relative;
}
.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  z-index: 100;
  min-width: 140px;
  animation: fadeIn 150ms ease;
}
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--transition);
}
.dropdown-item:hover {
  background: var(--bg-hover);
}
.dropdown-item.active {
  color: var(--accent);
  background: var(--accent-muted);
}
</style>
