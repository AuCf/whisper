<template>
  <aside
    class="sidebar"
    :class="{ hidden: !store.showSidebar || store.focusMode, mini: store.sidebarMini }"
    @click="store.sidebarMini ? store.toggleSidebarMini() : null"
  >
    <!-- Sidebar header -->
    <div class="sidebar-header">
      <span class="sidebar-title">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <span class="title-text">工作区</span>
      </span>
      <div class="sidebar-actions">
        <button class="icon-btn" data-tooltip="新建文件" @click="createRootFile">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="icon-btn" data-tooltip="新建文件夹" @click="createRootDir">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
        </button>
        <button class="icon-btn" data-tooltip="打开文件夹" @click="openFolder">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </button>
        <button class="icon-btn" data-tooltip="刷新全部" @click="store.refreshAllWorkspaces()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
        <button class="icon-btn" :data-tooltip="store.sidebarMini ? '展开工作区' : '折叠为窄边栏'" @click.stop="store.toggleSidebarMini()">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
        </button>
      </div>
    </div>

    <!-- Mini sidebar mode list -->
    <div v-if="store.sidebarMini" class="sidebar-mini-list">
      <div
        v-for="workspace in store.workspaces"
        :key="workspace.path"
        class="mini-workspace-item"
        :class="{ active: store.workspacePath === workspace.path }"
        :data-tooltip="workspace.remark ? `${workspace.remark} (${workspace.name})` : workspace.name"
        @click.stop="openWorkspaceFromMini(workspace)"
      >
        <svg class="mini-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <span class="mini-letter">{{ (workspace.remark || workspace.name).slice(0, 2).toUpperCase() }}</span>
      </div>
      <button class="mini-add-btn" data-tooltip="打开文件夹" @click.stop="openFolder">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>

    <!-- File tree -->
    <div v-else class="sidebar-content" @click.self="clearSelection">
      <!-- No workspace open -->
      <div v-if="store.workspaces.length === 0" class="sidebar-empty">
        <div class="empty-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </div>
        <p>尚未打开工作区</p>
        <button class="open-folder-btn" @click="openFolder">打开文件夹</button>
      </div>

      <!-- Multiple workspace roots -->
      <template v-else>
        <section
          v-for="workspace in store.workspaces"
          :key="workspace.path"
          class="workspace-group"
        >
          <div
            class="workspace-row"
            :class="{ active: store.workspacePath === workspace.path }"
            :title="workspace.remark ? `${workspace.remark} (${workspace.name})\n${workspace.path}` : workspace.path"
            @click="toggleWorkspace(workspace)"
            @contextmenu.prevent="onWorkspaceCtx($event, workspace)"
          >
            <span class="workspace-arrow" :class="{ expanded: workspace.isExpanded }">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
            </span>
            <svg class="workspace-icon" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            
            <template v-if="workspace.remark">
              <span class="workspace-primary-name">{{ workspace.remark }}</span>
              <span class="workspace-secondary-name">({{ workspace.name }})</span>
            </template>
            <template v-else>
              <span class="workspace-name">{{ workspace.name }}</span>
            </template>

            <button
              class="workspace-edit-remark"
              title="修改备注"
              @click.stop="editWorkspaceRemark(workspace)"
            >✎</button>
            <button
              class="workspace-remove"
              title="从工作区移除"
              @click.stop="removeWorkspace(workspace)"
            >×</button>
          </div>

          <div v-if="workspace.isExpanded" class="workspace-tree">
            <FileTreeNode
              v-for="node in workspace.tree"
              :key="node.path"
              :node="node"
              :depth="0"
              :workspace-path="workspace.path"
              @context-menu="payload => onContextMenu(payload, workspace.path)"
            />
            <div v-if="workspace.tree.length === 0" class="workspace-empty">
              此目录中没有 Markdown 文件
            </div>
          </div>
        </section>
      </template>
    </div>

    <!-- Context menu -->
    <Teleport to="body">
      <div
        v-if="ctxMenu.visible"
        class="context-menu"
        :style="{ top: ctxMenu.y + 'px', left: ctxMenu.x + 'px' }"
        @click.stop
      >
        <div v-if="!ctxMenu.node.is_dir" class="context-menu-item" @click="ctxOpen">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
          打开
        </div>
        <div v-if="ctxMenu.node.is_dir" class="context-menu-item" @click="ctxCreateFile">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          新建文件
        </div>
        <div v-if="ctxMenu.node.is_dir" class="context-menu-item" @click="ctxCreateDir">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/></svg>
          新建文件夹
        </div>
        <div class="context-menu-item" @click="ctxRename">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          重命名
        </div>
        <div class="context-menu-item danger" @click="ctxDelete">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          删除
        </div>
      </div>
      <!-- Click outside to close -->
      <div
        v-if="ctxMenu.visible"
        class="ctx-overlay"
        @click="ctxMenu.visible = false"
        @contextmenu.prevent="ctxMenu.visible = false"
      ></div>
    </Teleport>
  </aside>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { open } from '@tauri-apps/plugin-dialog'
import { useEditorStore } from '../stores/editorStore.js'
import FileTreeNode from './FileTreeNode.vue'

const store = useEditorStore()

async function createFileIn(dirPath) {
  const name = prompt('新建 Markdown 文件：', 'Untitled.md')?.trim()
  if (!name) return
  const finalName = name.includes('.') ? name : `${name}.md`
  try {
    await store.createNewFile(dirPath, finalName)
  } catch (_) {
    // The store already reports the native file-system error to the user.
  }
}

async function createDirIn(dirPath) {
  const name = prompt('新建文件夹：', '新建文件夹')?.trim()
  if (!name) return
  try {
    await store.createNewDir(dirPath, name)
  } catch (_) {
    // The store already reports the native file-system error to the user.
  }
}

async function createRootFile() {
  if (!store.workspacePath) {
    store.newDocument()
    return
  }
  await createFileIn(store.workspacePath)
}

async function createRootDir() {
  if (!store.workspacePath) {
    alert('请先打开一个工作区文件夹。')
    return
  }
  await createDirIn(store.workspacePath)
}

async function openFolder() {
  try {
    const selected = await open({ directory: true, multiple: false })
    if (selected) {
      await store.openWorkspace(selected)
    }
  } catch (err) {
    console.error('Failed to open folder:', err)
  }
}

function toggleWorkspace(workspace) {
  store.setWorkspaceExpanded(workspace.path, !workspace.isExpanded)
}

function openWorkspaceFromMini(workspace) {
  store.setActiveWorkspace(workspace.path)
  store.setWorkspaceExpanded(workspace.path, true)
  store.sidebarMini = false
}

function removeWorkspace(workspace) {
  if (!confirm(`从工作区列表移除“${workspace.name}”？\n不会删除磁盘上的文件。`)) return
  store.removeWorkspace(workspace.path)
}

function editWorkspaceRemark(workspace) {
  const remark = prompt(`为项目“${workspace.name}”设置备注/说明：`, workspace.remark || '')
  if (remark !== null) {
    store.setWorkspaceRemark(workspace.path, remark)
  }
}

function clearSelection() {}

// ─── Context Menu ──────────────────────────────────────────
const ctxMenu = ref({ visible: false, x: 0, y: 0, node: null })

function onWorkspaceCtx(event, workspace) {
  store.setActiveWorkspace(workspace.path)
  editWorkspaceRemark(workspace)
}

function onContextMenu({ event, node }, workspacePath) {
  store.setActiveWorkspace(workspacePath)
  ctxMenu.value = { visible: true, x: event.clientX, y: event.clientY, node }
}

function ctxOpen() {
  store.openFile(ctxMenu.value.node.path)
  ctxMenu.value.visible = false
}

async function ctxCreateFile() {
  const dirPath = ctxMenu.value.node.path
  ctxMenu.value.visible = false
  await createFileIn(dirPath)
}

async function ctxCreateDir() {
  const dirPath = ctxMenu.value.node.path
  ctxMenu.value.visible = false
  await createDirIn(dirPath)
}

async function ctxRename() {
  const node = ctxMenu.value.node
  ctxMenu.value.visible = false
  const newName = prompt('重命名为：', node.name)
  if (!newName || newName === node.name) return
  const dir = node.path.substring(0, node.path.lastIndexOf('\\') + 1) ||
               node.path.substring(0, node.path.lastIndexOf('/') + 1)
  await store.renamePath(node.path, dir + newName)
}

async function ctxDelete() {
  const node = ctxMenu.value.node
  ctxMenu.value.visible = false
  if (!confirm(`确认删除 "${node.name}"？`)) return
  try {
    if (node.is_dir) {
      await store.deletePath(node.path, true)
    } else {
      await store.deletePath(node.path, false)
    }
  } catch (err) {
    console.error(err)
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') ctxMenu.value.visible = false
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-slow), opacity var(--transition-slow);
  overflow: hidden;
}
.sidebar.hidden {
  width: 0;
  opacity: 0;
  pointer-events: none;
}
.sidebar.mini {
  width: 52px;
  cursor: default;
}
.sidebar.mini .title-text,
.sidebar.mini .sidebar-actions > button:not(:last-child) {
  display: none;
}
.sidebar.mini .sidebar-header {
  padding: 8px 6px;
  justify-content: center;
}
.sidebar.mini .sidebar-title {
  gap: 0;
}

/* Mini Sidebar List */
.sidebar-mini-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  flex: 1;
  overflow-y: auto;
}
.mini-workspace-item {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  cursor: pointer;
  position: relative;
  transition: all var(--transition);
}
.mini-workspace-item:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  transform: translateY(-1px);
}
.mini-workspace-item.active {
  background: var(--accent-muted);
  border-color: var(--accent);
  box-shadow: 0 0 8px rgba(88, 166, 255, 0.3);
}
.mini-icon {
  color: var(--accent);
}
.mini-letter {
  font-size: 9px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1;
  margin-top: 1px;
}
.mini-add-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface);
  border: 1px dashed var(--border);
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition);
  margin-top: 6px;
}
.mini-add-btn:hover {
  background: var(--accent-muted);
  border-color: var(--accent);
  color: var(--accent);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.sidebar-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.sidebar-actions {
  display: flex;
  align-items: center;
  gap: 1px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 4px 16px;
}

.workspace-group + .workspace-group {
  margin-top: 2px;
}
.workspace-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: background var(--transition), color var(--transition);
}
.workspace-row:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.workspace-row.active {
  color: var(--accent);
}
.workspace-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform var(--transition);
}
.workspace-arrow.expanded { transform: rotate(90deg); }
.workspace-icon { flex-shrink: 0; color: #79b8ff; }
.workspace-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.workspace-primary-name {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.workspace-secondary-name {
  font-size: 11px;
  font-weight: 400;
  color: var(--text-muted);
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-right: 4px;
}
.workspace-edit-remark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1;
  opacity: 0;
  transition: opacity var(--transition), background var(--transition), color var(--transition);
}
.workspace-row:hover .workspace-edit-remark { opacity: 1; }
.workspace-edit-remark:hover { background: var(--bg-hover); color: var(--accent); }
.workspace-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1;
  opacity: 0;
  transition: opacity var(--transition), background var(--transition), color var(--transition);
}
.workspace-row:hover .workspace-remove { opacity: 1; }
.workspace-remove:hover { background: var(--red-muted); color: var(--red); }
.workspace-tree { padding-left: 8px; }
.workspace-empty {
  padding: 5px 8px 7px 30px;
  color: var(--text-muted);
  font-size: 11px;
  font-style: italic;
}

.sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  gap: 12px;
  text-align: center;
}
.empty-icon { color: var(--text-muted); }
.sidebar-empty p { font-size: 12.5px; color: var(--text-secondary); }
.open-folder-btn {
  padding: 6px 14px;
  border-radius: var(--radius-md);
  background: var(--accent-muted);
  color: var(--accent);
  border: 1px solid rgba(88,166,255,0.2);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--transition);
}
.open-folder-btn:hover { background: var(--accent); color: white; }

.ctx-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
}
</style>
