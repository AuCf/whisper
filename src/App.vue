<template>
  <div id="app-root" :class="{ 'focus-mode': store.focusMode }">
    <!-- Toolbar -->
    <Toolbar
      :sync-scroll="syncScroll.isSyncing.value"
      @toggle-sync="syncScroll.toggleSync()"
      @insert="onInsert"
      @export="onExport"
    />

    <!-- Main content area -->
    <div class="main-area">
      <!-- Sidebar / File tree -->
      <FileTree />

      <!-- Editor + Preview pane -->
      <div class="content-pane" ref="contentPane">
        <!-- Tab bar inside content pane -->
        <TabBar />

        <div class="pane-body">
          <!-- Editor -->
          <Editor
            v-if="store.activeTab"
            :key="store.activeTabId"
            ref="editorRef"
            :tab-id="store.activeTabId"
            @update="onContentUpdate"
            @scroll-el="onEditorScrollEl"
          />

          <!-- Divider (only in split mode) -->
          <div
            v-if="store.activeTab && store.showEditor && store.showPreview"
            class="pane-divider"
            title="拖拽调整宽度，双击恢复 50% 平分"
            @mousedown="startResize"
            @dblclick="resetResize"
          ></div>

          <!-- Preview -->
          <Preview
            v-if="store.activeTab"
            ref="previewRef"
            @scroll-el="onPreviewScrollEl"
          />

          <!-- Welcome screen when no tab is open -->
          <div v-if="!store.activeTab" class="welcome-screen">
            <div class="welcome-content">
              <div class="welcome-logo">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="url(#grad)" stroke-width="1.5">
                  <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style="stop-color:#388bfd"/>
                      <stop offset="100%" style="stop-color:#58a6ff"/>
                    </linearGradient>
                  </defs>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h2 class="welcome-title">Whisper Markdown</h2>
              <p class="welcome-subtitle">离线、高颜值的全平台 Markdown 编辑器</p>
              <div class="welcome-actions">
                <button class="welcome-btn primary" @click="store.newDocument()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  新建文档
                </button>
                <button class="welcome-btn" @click="openFolder">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  打开文件夹
                </button>
              </div>
              <div class="welcome-shortcuts">
                <div class="shortcut"><kbd>Ctrl+S</kbd><span>保存</span></div>
                <div class="shortcut"><kbd>Ctrl+B</kbd><span>加粗</span></div>
                <div class="shortcut"><kbd>Ctrl+I</kbd><span>斜体</span></div>
                <div class="shortcut"><kbd>F11</kbd><span>专注模式</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Outline panel -->
      <Outline />
    </div>

    <!-- Status bar -->
    <StatusBar />

    <!-- Global Modal Dialog -->
    <ModalDialog ref="modalEl" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { open } from '@tauri-apps/plugin-dialog'
import { useEditorStore } from './stores/editorStore.js'
import { useSyncScroll } from './composables/useSyncScroll.js'
import { useMarkdown } from './composables/useMarkdown.js'
import { exportAsHTML, exportAsPDF, exportAsPNG } from './composables/useExport.js'
import { registerModal, useModal } from './composables/useModal.js'
import Toolbar from './components/Toolbar.vue'
import TabBar from './components/TabBar.vue'
import FileTree from './components/FileTree.vue'
import Editor from './components/Editor.vue'
import Preview from './components/Preview.vue'
import Outline from './components/Outline.vue'
import StatusBar from './components/StatusBar.vue'
import ModalDialog from './components/ModalDialog.vue'

const store = useEditorStore()
const syncScroll = useSyncScroll()
const { render: renderMarkdown } = useMarkdown()
const appWindow = getCurrentWindow()

const modalEl = ref(null)
const editorRef = ref(null)
const previewRef = ref(null)
const contentPane = ref(null)

let editorScrollEl = null
let previewScrollEl = null
let cleanupSync = null
let cleanupCloseRequested = null

function onEditorScrollEl(el) {
  editorScrollEl = el
  tryBindSync()
}
function onPreviewScrollEl(el) {
  previewScrollEl = el
  tryBindSync()
}
function tryBindSync() {
  if (editorScrollEl && previewScrollEl) {
    if (cleanupSync) cleanupSync()
    cleanupSync = syncScroll.bindSync(editorScrollEl, previewScrollEl)
  }
}

// Format insertion relay to Editor
function onInsert(type) {
  editorRef.value?.insertFormat(type)
}

// Content updated from editor
function onContentUpdate(content) {
  // handled in store already
}

// Export handler
async function onExport(format) {
  const tab = store.activeTab
  if (!tab) return
  const fileName = tab.name || 'document'
  const htmlContent = renderMarkdown(tab.content)

  if (format === 'html') {
    await exportAsHTML(htmlContent, fileName)
  } else if (format === 'pdf') {
    const previewContentEl = previewRef.value?.getContentEl()
    await exportAsPDF(previewContentEl, fileName)
  } else if (format === 'png') {
    const previewContentEl = previewRef.value?.getContentEl()
    await exportAsPNG(previewContentEl, fileName)
  }
}

// Open folder shortcut
async function openFolder() {
  const selected = await open({ directory: true, multiple: false })
  if (selected) await store.openWorkspace(selected)
}

// ── Pane resizing ────────────────────────────────────────────
let isResizing = false
let startX = 0
let startEditorWidth = 0

function startResize(e) {
  isResizing = true
  startX = e.clientX
  const pane = contentPane.value?.querySelector('.pane-body')
  const editorEl = pane?.querySelector('.editor-wrap')
  if (editorEl) startEditorWidth = editorEl.offsetWidth
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onResize(e) {
  if (!isResizing) return
  const pane = contentPane.value?.querySelector('.pane-body')
  const editorEl = pane?.querySelector('.editor-wrap')
  if (!editorEl || !pane) return
  const dx = e.clientX - startX
  const newWidth = Math.max(200, Math.min(startEditorWidth + dx, pane.offsetWidth - 200))
  editorEl.style.flex = 'none'
  editorEl.style.width = newWidth + 'px'
}

function stopResize() {
  isResizing = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function resetResize() {
  const pane = contentPane.value?.querySelector('.pane-body')
  const editorEl = pane?.querySelector('.editor-wrap')
  if (editorEl) {
    editorEl.style.flex = '1'
    editorEl.style.width = ''
  }
}

// ── Keyboard shortcuts ────────────────────────────────────────
function onKeydown(e) {
  const key = e.key.toLowerCase()
  if (e.key === 'Escape' && store.focusMode) {
    e.preventDefault()
    store.focusMode = false
    return
  }
  if (e.key === 'F11') {
    e.preventDefault()
    store.focusMode = !store.focusMode
  }
  if (e.ctrlKey && e.key === '\\') {
    e.preventDefault()
    store.showSidebar = !store.showSidebar
  }
  if (e.ctrlKey && key === 's' && !e.defaultPrevented) {
    e.preventDefault()
    store.saveActiveFile()
  }
  if (e.ctrlKey && key === 'w') {
    e.preventDefault()
    store.closeActiveTab()
  }
}

onMounted(async () => {
  registerModal(modalEl.value)
  store.initTheme()
  store.initPreviewStyle()
  await store.restoreWorkspaces()
  const restored = await store.restoreTabsSession()
  window.addEventListener('keydown', onKeydown)
  const modal = useModal()
  appWindow.onCloseRequested(async (event) => {
    event.preventDefault()
    const hasUnsavedChanges = store.tabs.some(tab => tab.isDirty)
    if (hasUnsavedChanges) {
      const confirmed = await modal.confirm('仍有未保存的内容', '关闭 Whisper 将导致修改丢失，确定要退出吗？')
      if (!confirmed) return
    }

    try {
      await appWindow.destroy()
    } catch (err) {
      console.error('Close window failed:', err)
      alert(`关闭窗口失败：${err}`)
    }
  }).then((unlisten) => {
    cleanupCloseRequested = unlisten
  })
  // If no tabs session was restored, create welcome document
  if (!restored && store.tabs.length === 0) {
    store.newDocument()
    // Populate with demo content
    nextTick(() => {
      const tab = store.activeTab
      if (tab) {
        const demo = `# 欢迎使用 Whisper ✨

一个优雅、高效的 Markdown 编辑与预览工具。

## 功能特性

- **实时预览** — 左侧编辑，右侧即时渲染
- **代码高亮** — 支持 100+ 编程语言
- **数学公式** — KaTeX 渲染 LaTeX 公式
- **Mermaid 图表** — 流程图、时序图、甘特图
- **多标签页** — 同时管理多个文件
- **文件树** — 打开整个工作区文件夹
- **排版风格预设** — 顶部工具栏 🎨 支持 GitHub、VitePress、Editorial、Morandi、WeChat 五大精美风格

---

> [!NOTE]
> 提示：Whisper 支持 GitHub 风格的 Alert 告警提示框！

> [!TIP]
> 建议：按 \`F11\` 进入专注模式，隐藏工具栏专注写作。

> [!WARNING]
> 警告：未保存的文件标签页上会有黄色小圆点提示。

---

## 代码高亮示例

\`\`\`python
def fibonacci(n: int) -> list[int]:
    """生成斐波那契数列"""
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result

print(fibonacci(10))
\`\`\`

\`\`\`javascript
const greet = (name) => \`Hello, \${name}! 🎉\`
console.log(greet('Whisper'))
\`\`\`

---

## 数学公式

行内公式：$E = mc^2$，$\\\\pi \\\\approx 3.14159$

块级公式：

$$
\\\\int_{-\\\\infty}^{\\\\infty} e^{-x^2} dx = \\\\sqrt{\\\\pi}
$$

$$
\\\\sum_{n=1}^{\\\\infty} \\\\frac{1}{n^2} = \\\\frac{\\\\pi^2}{6}
$$

---

## Mermaid 流程图

\`\`\`mermaid
graph LR
    A[打开文件] --> B[编辑 Markdown]
    B --> C{实时预览}
    C --> D[保存文件]
    D --> E[分享 / 导出]
\`\`\`

---

## 表格

| 功能 | 支持 | 说明 |
|------|------|------|
| 代码高亮 | ✅ | highlight.js |
| 数学公式 | ✅ | KaTeX |
| 流程图 | ✅ | Mermaid |
| 同步滚动 | ✅ | 比例联动 |
| 多标签页 | ✅ | 支持中键关闭 |

---

## 任务列表

- [x] 初始化 Tauri 项目
- [x] 集成 CodeMirror 6
- [x] Markdown 渲染
- [x] 代码高亮
- [x] KaTeX 数学公式
- [ ] 导出 PDF

> **提示**：按 \`F11\` 进入专注模式，隐藏所有工具栏，让你专注写作。

---

*开始你的写作之旅吧！* 🚀
`
        store.updateContent(tab.id, demo)
        tab.isDirty = false
      }
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (cleanupSync) cleanupSync()
  cleanupCloseRequested?.()
})
</script>

<style>
#app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-base);
}

.main-area {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.content-pane {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg-base);
  overflow: hidden;
}
.pane-body {
  flex: 1;
  min-height: 0;
  display: flex;
  position: relative;
  overflow: hidden;
}

/* Pane divider */
.pane-divider {
  width: 4px;
  background: var(--border);
  cursor: col-resize;
  flex-shrink: 0;
  transition: all var(--transition);
  position: relative;
  z-index: 5;
}
.pane-divider:hover,
.pane-divider:active {
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
}
.pane-divider::after {
  content: '';
  position: absolute;
  top: 0;
  left: -4px;
  right: -4px;
  bottom: 0;
}

/* ─── Welcome screen ──────────────────────────────────────── */
.welcome-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-base);
  overflow: auto;
}
.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px;
  text-align: center;
  animation: fadeIn 0.5s both;
}
.welcome-logo {
  filter: drop-shadow(0 0 24px rgba(88,166,255,0.4));
  margin-bottom: 8px;
}
.welcome-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}
.welcome-subtitle {
  font-size: 15px;
  color: var(--text-secondary);
  margin-top: -8px;
}
.welcome-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
.welcome-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  background: var(--bg-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border);
  transition: all var(--transition);
}
.welcome-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  color: var(--accent);
}
.welcome-btn.primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.welcome-btn.primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
  color: white;
}
.welcome-shortcuts {
  display: flex;
  gap: 20px;
  margin-top: 12px;
  flex-wrap: wrap;
  justify-content: center;
}
.shortcut {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}
.shortcut kbd {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  font-family: var(--editor-font);
  font-size: 11px;
  color: var(--text-primary);
  box-shadow: 0 1px 0 var(--border);
}

/* ─── Focus mode transition ───────────────────────────────── */
.focus-mode .sidebar,
.focus-mode .outline-panel {
  width: 0 !important;
}
.focus-mode .tab-bar {
  height: 0;
  opacity: 0;
  pointer-events: none;
  border-bottom: 0;
}
</style>
