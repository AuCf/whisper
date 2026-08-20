import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { save } from '@tauri-apps/plugin-dialog'

const WORKSPACES_KEY = 'whisper-workspaces'
const LEGACY_WORKSPACE_KEY = 'whisper-last-workspace'
const TABS_SESSION_KEY = 'whisper-tabs-session'
const VIEW_STATE_KEY = 'whisper-view-state'

export const useEditorStore = defineStore('editor', () => {
  // ── Files & Workspace ──────────────────────────────────────
  const workspaces = ref([]) // [{ path, name, isExpanded, tree }]
  const workspacePath = ref(null)
  const tabs = ref([])        // [{ id, path, name, content, isDirty }]
  const activeTabId = ref(null)

  // ── UI State ───────────────────────────────────────────────
  const showSidebar = ref(true)
  const showOutline = ref(true)
  const focusMode = ref(false)
  const showPreview = ref(true)
  const showEditor = ref(true)
  const cursorLine = ref(1)
  const cursorColumn = ref(1)
  const theme = ref('dark') // 'dark' | 'light' | 'solarized'
  const previewStyle = ref('github') // 'github' | 'vitepress' | 'editorial' | 'morandi' | 'wechat'
  const sidebarMini = ref(false)
  const showMindmap = ref(false)

  // ── Computed ───────────────────────────────────────────────
  const activeTab = computed(() =>
    tabs.value.find(t => t.id === activeTabId.value) ?? null
  )
  const activeContent = computed(() => activeTab.value?.content ?? '')
  const activeWorkspace = computed(() =>
    workspaces.value.find(workspace => workspace.path === workspacePath.value) ?? null
  )
  const fileTree = computed(() => activeWorkspace.value?.tree ?? [])

  // ── View state persistence ─────────────────────────────────
  const persistedViewRefs = {
    showSidebar,
    showOutline,
    focusMode,
    showPreview,
    showEditor,
    sidebarMini,
    showMindmap,
  }
  let restoringViewState = false

  function persistViewState() {
    if (restoringViewState) return
    try {
      const state = Object.fromEntries(
        Object.entries(persistedViewRefs).map(([key, value]) => [key, value.value])
      )
      localStorage.setItem(VIEW_STATE_KEY, JSON.stringify(state))
    } catch (err) {
      console.warn('保存视图状态失败:', err)
    }
  }

  function initViewState() {
    let saved
    try {
      saved = JSON.parse(localStorage.getItem(VIEW_STATE_KEY) || 'null')
    } catch (err) {
      console.warn('读取视图状态失败:', err)
    }

    if (!saved || typeof saved !== 'object') {
      persistViewState()
      return
    }

    restoringViewState = true
    for (const [key, target] of Object.entries(persistedViewRefs)) {
      if (typeof saved[key] === 'boolean') target.value = saved[key]
    }
    if (!showEditor.value && !showPreview.value) {
      showEditor.value = true
      showPreview.value = true
    }
    restoringViewState = false
    persistViewState()
  }

  watch(
    Object.values(persistedViewRefs),
    persistViewState,
    { flush: 'sync' }
  )

  // ── Tab management ─────────────────────────────────────────
  function createTabId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2)
  }

  function openTab(path, name, content) {
    const existing = tabs.value.find(t => t.path === path)
    if (existing) {
      activeTabId.value = existing.id
      persistTabsSession()
      return existing
    }
    const tab = { id: createTabId(), path, name, content, isDirty: false }
    tabs.value.push(tab)
    activeTabId.value = tab.id
    persistTabsSession()
    return tab
  }

  const autoSaveTimers = new Map()

  function closeTab(id, force = false) {
    const idx = tabs.value.findIndex(t => t.id === id)
    if (idx === -1) return
    const tab = tabs.value[idx]
    if (!force && tab.isDirty && !confirm(`“${tab.name}”尚未保存，确定放弃更改并关闭吗？`)) {
      return false
    }
    clearAutoSave(id)
    tabs.value.splice(idx, 1)
    if (activeTabId.value === id) {
      const next = tabs.value[Math.min(idx, tabs.value.length - 1)]
      activeTabId.value = next?.id ?? null
    }
    persistTabsSession()
    return true
  }

  function closeActiveTab() {
    if (!activeTabId.value) return false
    return closeTab(activeTabId.value)
  }

  function setActiveTab(id) {
    activeTabId.value = id
    persistTabsSession()
  }

  function updateContent(id, content) {
    const tab = tabs.value.find(t => t.id === id)
    if (tab) {
      tab.content = content
      tab.isDirty = true
      persistTabsSession()
    }
  }

  function setCursorPosition(line, column) {
    cursorLine.value = line
    cursorColumn.value = column
  }

  function notifyError(action, err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error(`${action}:`, err)
    globalThis.alert?.(`${action}失败：${detail}`)
  }

  function pathSeparator(path) {
    return path?.includes('\\') ? '\\' : '/'
  }

  function joinPath(dirPath, name) {
    const separator = pathSeparator(dirPath)
    return `${dirPath.replace(/[\\/]+$/, '')}${separator}${name}`
  }

  function isSameOrChildPath(path, parentPath) {
    const normalizedPath = path.replace(/\\/g, '/').toLowerCase()
    const normalizedParent = parentPath.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase()
    return normalizedPath === normalizedParent || normalizedPath.startsWith(normalizedParent + '/')
  }

  function validateEntryName(name) {
    if (!name || /[\\/:*?"<>|]/.test(name) || name === '.' || name === '..') {
      throw new Error('名称不能为空，且不能包含 \\ / : * ? " < > |')
    }
  }

  // ── File Operations ────────────────────────────────────────
  async function openFile(path) {
    try {
      const content = await invoke('read_file', { path })
      const name = path.split(/[\\/]/).pop()
      return openTab(path, name, content)
    } catch (err) {
      notifyError('打开文件', err)
      return false
    }
  }

  async function reloadFile(id) {
    const tab = tabs.value.find(t => t.id === id)
    if (!tab?.path) return false
    try {
      const content = await invoke('read_file', { path: tab.path })
      clearAutoSave(id)
      tab.content = content
      tab.isDirty = false
      persistTabsSession()
      return true
    } catch (err) {
      notifyError('刷新文件', err)
      return false
    }
  }

  async function saveFile(id) {
    const tab = tabs.value.find(t => t.id === id)
    if (!tab) return false
    if (!tab.path) return saveFileAs(id)
    try {
      await invoke('write_file', { path: tab.path, content: tab.content })
      tab.isDirty = false
      clearAutoSave(id)
      return true
    } catch (err) {
      notifyError('保存文件', err)
      return false
    }
  }

  async function saveFileAs(id) {
    const tab = tabs.value.find(t => t.id === id)
    if (!tab) return false
    const defaultPath = workspacePath.value
      ? joinPath(workspacePath.value, tab.name)
      : tab.name
    let selected
    try {
      selected = await save({
        defaultPath,
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdx', 'txt'] }],
      })
      if (!selected) return false
      await invoke('write_file', { path: selected, content: tab.content })
      tab.path = selected
      tab.name = selected.split(/[\\/]/).pop()
      tab.isDirty = false
      clearAutoSave(id)
      await refreshWorkspaceForPath(selected)
      return true
    } catch (err) {
      notifyError('另存文件', err)
      return false
    }
  }

  async function saveActiveFile() {
    if (activeTabId.value) {
      await saveFile(activeTabId.value)
    }
  }

  async function createNewFile(dirPath, fileName) {
    try {
      validateEntryName(fileName)
      const path = joinPath(dirPath, fileName)
      await invoke('create_file', { path })
      await refreshWorkspaceForPath(dirPath)
      await openFile(path)
    } catch (err) {
      notifyError('新建文件', err)
      throw err
    }
  }

  async function createNewDir(dirPath, dirName) {
    try {
      validateEntryName(dirName)
      const path = joinPath(dirPath, dirName)
      await invoke('create_dir', { path })
      await refreshWorkspaceForPath(dirPath)
    } catch (err) {
      notifyError('新建文件夹', err)
      throw err
    }
  }

  async function deletePath(path, isDir = false) {
    try {
      await invoke(isDir ? 'delete_dir' : 'delete_file', { path })
      const affectedTabs = tabs.value.filter(tab =>
        tab.path && (isDir ? isSameOrChildPath(tab.path, path) : tab.path === path)
      )
      for (const tab of affectedTabs) closeTab(tab.id, true)
      await refreshWorkspaceForPath(path)
    } catch (err) {
      notifyError(isDir ? '删除文件夹' : '删除文件', err)
      throw err
    }
  }

  async function renamePath(oldPath, newPath) {
    try {
      validateEntryName(newPath.split(/[\\/]/).pop())
      await invoke('rename_path', { oldPath, newPath })
      for (const tab of tabs.value) {
        if (tab.path && isSameOrChildPath(tab.path, oldPath)) {
          tab.path = newPath + tab.path.slice(oldPath.length)
          tab.name = tab.path.split(/[\\/]/).pop()
        }
      }
      await refreshWorkspaceForPath(newPath)
    } catch (err) {
      notifyError('重命名', err)
      throw err
    }
  }

  function workspaceName(path) {
    return path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || path
  }

  function normalizePath(path) {
    return path.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase()
  }

  function persistWorkspaces() {
    const value = {
      activePath: workspacePath.value,
      items: workspaces.value.map(workspace => ({
        path: workspace.path,
        isExpanded: workspace.isExpanded,
        remark: workspace.remark || '',
      })),
    }
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(value))
    localStorage.removeItem(LEGACY_WORKSPACE_KEY)
  }

  function findWorkspaceForPath(path) {
    return workspaces.value
      .filter(workspace => isSameOrChildPath(path, workspace.path))
      .sort((a, b) => b.path.length - a.path.length)[0] ?? null
  }

  function setActiveWorkspace(path) {
    if (!workspaces.value.some(workspace => workspace.path === path)) return
    workspacePath.value = path
    persistWorkspaces()
  }

  function setWorkspaceExpanded(path, isExpanded) {
    const workspace = workspaces.value.find(item => item.path === path)
    if (!workspace) return
    workspace.isExpanded = isExpanded
    workspacePath.value = path
    persistWorkspaces()
  }

  function setWorkspaceRemark(path, remark) {
    const workspace = workspaces.value.find(item => item.path === path)
    if (!workspace) return
    workspace.remark = remark?.trim() || ''
    persistWorkspaces()
  }

  function removeWorkspace(path) {
    const index = workspaces.value.findIndex(workspace => workspace.path === path)
    if (index < 0) return
    workspaces.value.splice(index, 1)
    if (workspacePath.value === path) {
      workspacePath.value = workspaces.value[Math.min(index, workspaces.value.length - 1)]?.path ?? null
    }
    persistWorkspaces()
  }

  async function openWorkspace(path) {
    const existing = workspaces.value.find(workspace => normalizePath(workspace.path) === normalizePath(path))
    if (existing) {
      existing.isExpanded = true
      workspacePath.value = existing.path
      const refreshed = await refreshFileTree(existing.path)
      if (refreshed) persistWorkspaces()
      return refreshed
    }

    try {
      const tree = await invoke('read_dir', { path })
      workspaces.value.push({ path, name: workspaceName(path), isExpanded: true, tree })
      workspacePath.value = path
      persistWorkspaces()
      return true
    } catch (err) {
      notifyError('读取工作区', err)
      return false
    }
  }

  async function restoreWorkspaces() {
    let saved
    try {
      saved = JSON.parse(localStorage.getItem(WORKSPACES_KEY) || 'null')
    } catch (err) {
      console.warn('工作区记录格式无效，已忽略:', err)
    }

    if (!saved?.items?.length) {
      const legacyPath = localStorage.getItem(LEGACY_WORKSPACE_KEY)
      saved = legacyPath
        ? { activePath: legacyPath, items: [{ path: legacyPath, isExpanded: true }] }
        : { activePath: null, items: [] }
    }

    const restored = await Promise.all(saved.items.map(async item => {
      if (!item?.path) return null
      try {
        const tree = await invoke('read_dir', { path: item.path })
        return {
          path: item.path,
          name: workspaceName(item.path),
          isExpanded: item.isExpanded !== false,
          remark: item.remark || '',
          tree,
        }
      } catch (err) {
        console.warn(`工作区已失效，移除记录：${item.path}`, err)
        return null
      }
    }))

    workspaces.value = restored.filter(Boolean)
    workspacePath.value = workspaces.value.some(workspace => workspace.path === saved.activePath)
      ? saved.activePath
      : workspaces.value[0]?.path ?? null
    persistWorkspaces()
    return workspaces.value.length > 0
  }

  async function refreshFileTree(path = workspacePath.value, silent = false) {
    if (!path) return false
    const workspace = workspaces.value.find(item => item.path === path)
    if (!workspace) return false
    try {
      workspace.tree = await invoke('read_dir', { path })
      return true
    } catch (err) {
      if (!silent) notifyError('读取工作区', err)
      return false
    }
  }

  async function refreshWorkspaceForPath(path) {
    const workspace = findWorkspaceForPath(path)
    return refreshFileTree(workspace?.path)
  }

  async function refreshAllWorkspaces() {
    await Promise.all(workspaces.value.map(workspace => refreshFileTree(workspace.path, true)))
  }

  // ── New unsaved document ───────────────────────────────────
  function newDocument() {
    const id = createTabId()
    const tab = {
      id,
      path: null,
      name: 'Untitled.md',
      content: '# Untitled\n\n',
      isDirty: true,
    }
    tabs.value.push(tab)
    activeTabId.value = tab.id
    persistTabsSession()
  }

  // ── Auto-save ──────────────────────────────────────────────
  function clearAutoSave(id) {
    const timer = autoSaveTimers.get(id)
    if (timer) clearTimeout(timer)
    autoSaveTimers.delete(id)
  }

  function cancelPendingAutoSave(id) {
    clearAutoSave(id)
  }

  function scheduleAutoSave(id) {
    clearAutoSave(id)
    const tab = tabs.value.find(t => t.id === id)
    if (!tab?.path) return
    const timer = setTimeout(() => {
      const currentTab = tabs.value.find(t => t.id === id)
      if (currentTab?.isDirty && currentTab.path) saveFile(id)
    }, 2000)
    autoSaveTimers.set(id, timer)
  }

  // ── Theme ───────────────────────────────────────────────────
  function initTheme() {
    const saved = localStorage.getItem('whisper-theme') || 'dark'
    setTheme(saved)
  }

  function setTheme(name) {
    const validThemes = ['dark', 'light', 'solarized']
    if (!validThemes.includes(name)) name = 'dark'
    theme.value = name
    if (name === 'dark') {
      delete document.documentElement.dataset.theme
    } else {
      document.documentElement.dataset.theme = name
    }
    localStorage.setItem('whisper-theme', name)

    const windowTheme = name === 'light' ? 'light' : 'dark'
    getCurrentWindow().setTheme(windowTheme).catch(err => {
      console.error('同步窗口标题栏主题失败:', err)
    })
  }

  // ── Preview Style Preset ─────────────────────────────────────
  function initPreviewStyle() {
    const saved = localStorage.getItem('whisper-preview-style') || 'github'
    setPreviewStyle(saved)
  }

  function setPreviewStyle(name) {
    const validStyles = ['github', 'vitepress', 'editorial', 'morandi', 'wechat']
    if (!validStyles.includes(name)) name = 'github'
    previewStyle.value = name
    localStorage.setItem('whisper-preview-style', name)
  }

  function toggleSidebarMini() {
    sidebarMini.value = !sidebarMini.value
  }

  // ── Tabs Session Persistence & Restoration ────────────────────
  function persistTabsSession() {
    try {
      const session = {
        activeTabId: activeTabId.value,
        activeTabPath: activeTab.value?.path ?? null,
        tabs: tabs.value.map(t => ({
          id: t.id,
          path: t.path,
          name: t.name,
          isDirty: t.isDirty,
          content: t.path ? null : t.content,
        })),
      }
      localStorage.setItem(TABS_SESSION_KEY, JSON.stringify(session))
    } catch (err) {
      console.warn('保存标签页会话失败:', err)
    }
  }

  async function restoreTabsSession() {
    let saved
    try {
      saved = JSON.parse(localStorage.getItem(TABS_SESSION_KEY) || 'null')
    } catch (err) {
      console.warn('读取标签页会话记录失败:', err)
    }

    if (!saved?.tabs?.length) return false

    const restoredTabs = []
    let activeIdToSet = null

    for (const item of saved.tabs) {
      if (item.path) {
        try {
          const content = await invoke('read_file', { path: item.path })
          const tab = {
            id: item.id,
            path: item.path,
            name: item.name || item.path.split(/[\\/]/).pop(),
            content,
            isDirty: false,
          }
          restoredTabs.push(tab)
          if (item.id === saved.activeTabId || item.path === saved.activeTabPath) {
            activeIdToSet = tab.id
          }
        } catch (err) {
          console.warn(`本地文件不存在或读取失败，忽略还原：${item.path}`, err)
        }
      } else {
        // Unsaved draft document
        const tab = {
          id: item.id,
          path: null,
          name: item.name || 'Untitled.md',
          content: item.content || '# Untitled\n\n',
          isDirty: item.isDirty !== false,
        }
        restoredTabs.push(tab)
        if (item.id === saved.activeTabId) {
          activeIdToSet = tab.id
        }
      }
    }

    if (restoredTabs.length > 0) {
      tabs.value = restoredTabs
      activeTabId.value = activeIdToSet || restoredTabs[0].id
      persistTabsSession()
      return true
    }

    return false
  }

  return {
    // State
    workspaces, workspacePath, activeWorkspace, fileTree, tabs, activeTabId, activeTab, activeContent,
    showSidebar, showOutline, focusMode, showPreview, showEditor, showMindmap,
    cursorLine, cursorColumn, theme, previewStyle, sidebarMini,
    // Tab actions
    openTab, closeTab, closeActiveTab, setActiveTab, updateContent, setCursorPosition,
    // File actions
    openFile, reloadFile, saveFile, saveFileAs, saveActiveFile,
    createNewFile, createNewDir, deletePath,
    renamePath, openWorkspace, restoreWorkspaces, refreshFileTree, refreshAllWorkspaces,
    setActiveWorkspace, setWorkspaceExpanded, setWorkspaceRemark, removeWorkspace, newDocument,
    scheduleAutoSave, cancelPendingAutoSave,
    // Session & Theme
    initTheme, setTheme, initPreviewStyle, setPreviewStyle, initViewState, persistViewState,
    toggleSidebarMini, restoreTabsSession, persistTabsSession,
  }
})
