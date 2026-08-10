<template>
  <div class="tab-bar" v-if="store.tabs.length > 0">
    <div
      ref="tabsScroll"
      class="tabs-scroll"
      role="tablist"
      aria-label="已打开的文件"
      @wheel="handleTabsWheel"
    >
      <div
        v-for="tab in store.tabs"
        :key="tab.id"
        :data-tab-id="tab.id"
        class="tab"
        :class="{ active: tab.id === store.activeTabId, dirty: tab.isDirty }"
        role="tab"
        :aria-selected="tab.id === store.activeTabId"
        :tabindex="tab.id === store.activeTabId ? 0 : -1"
        :title="tab.path || tab.name"
        @click="activateTab(tab.id)"
        @keydown.enter.prevent="activateTab(tab.id)"
        @keydown.space.prevent="activateTab(tab.id)"
        @mousedown.middle.prevent.stop="store.closeTab(tab.id)"
        @contextmenu.prevent="openContextMenu($event, tab)"
      >
        <span class="tab-icon" aria-hidden="true">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </span>
        <span class="tab-name">{{ tab.name }}</span>
        <span v-if="tab.isDirty" class="tab-dirty-dot" title="未保存"></span>
        <button
          class="tab-close"
          type="button"
          @click.stop="closeTabs([tab.id])"
          :aria-label="`关闭 ${tab.name}`"
          :title="`关闭 ${tab.name}`"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <div class="tab-actions">
      <button
        ref="allTabsButton"
        class="icon-btn tab-list-btn"
        type="button"
        data-tooltip="全部标签"
        aria-label="全部标签"
        :aria-expanded="showAllTabs"
        @click="toggleAllTabs"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 10 5 5 5-5"/><path d="M5 5h14"/></svg>
        <span v-if="hasOverflow" class="tab-count">{{ store.tabs.length }}</span>
      </button>
      <button class="icon-btn" type="button" data-tooltip="新建文件" aria-label="新建文件" @click="newDocument">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
  </div>

  <div class="tab-bar tab-bar-empty" v-else>
    <button class="tab-new-btn" type="button" @click="store.newDocument()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      新建文件
    </button>
  </div>

  <Teleport to="body">
    <div
      v-if="showAllTabs"
      ref="allTabsMenu"
      class="tabs-menu"
      :style="allTabsMenuStyle"
      role="dialog"
      aria-label="全部标签"
    >
      <div class="tabs-menu-head">
        <span>已打开 {{ store.tabs.length }} 个文件</span>
        <button type="button" class="menu-close-all" @click="closeTabs(store.tabs.map(tab => tab.id))">全部关闭</button>
      </div>
      <div v-if="store.tabs.length > 7" class="tab-search-wrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input ref="searchInput" v-model="tabQuery" class="tab-search" aria-label="查找已打开的文件" placeholder="查找已打开的文件" />
      </div>
      <div class="tabs-menu-list">
        <div
          v-for="tab in filteredTabs"
          :key="tab.id"
          class="tabs-menu-item"
          :class="{ active: tab.id === store.activeTabId }"
          :title="tab.path || tab.name"
          role="button"
          tabindex="0"
          @click="activateFromMenu(tab.id)"
          @keydown.enter.prevent="activateFromMenu(tab.id)"
          @keydown.space.prevent="activateFromMenu(tab.id)"
        >
          <span class="menu-active-mark" aria-hidden="true"></span>
          <span class="menu-tab-copy">
            <span class="menu-tab-name">{{ tab.name }}</span>
            <span class="menu-tab-location">{{ tabLocation(tab) }}</span>
          </span>
          <span v-if="tab.isDirty" class="tab-dirty-dot" title="未保存"></span>
          <button
            type="button"
            class="menu-item-close"
            :aria-label="`关闭 ${tab.name}`"
            @click.stop="closeTabs([tab.id])"
          >×</button>
        </div>
        <div v-if="filteredTabs.length === 0" class="tabs-menu-empty">没有匹配的文件</div>
      </div>
    </div>

    <div
      v-if="contextTab"
      ref="contextMenu"
      class="tab-context-menu"
      :style="contextMenuStyle"
      role="menu"
    >
      <div class="context-tab-name">{{ contextTab.name }}</div>
      <button type="button" role="menuitem" @click="closeTabs([contextTab.id])">关闭</button>
      <button type="button" role="menuitem" :disabled="store.tabs.length < 2" @click="closeOtherTabs">关闭其他标签</button>
      <button type="button" role="menuitem" :disabled="!hasTabsToRight" @click="closeTabsToRight">关闭右侧标签</button>
      <div class="context-separator"></div>
      <button type="button" role="menuitem" @click="closeTabs(store.tabs.map(tab => tab.id))">关闭全部标签</button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '../stores/editorStore.js'
import { useModal } from '../composables/useModal.js'

const store = useEditorStore()
const modal = useModal()
const tabsScroll = ref(null)
const allTabsButton = ref(null)
const allTabsMenu = ref(null)
const contextMenu = ref(null)
const searchInput = ref(null)
const showAllTabs = ref(false)
const contextTab = ref(null)
const tabQuery = ref('')
const hasOverflow = ref(false)
const allTabsMenuStyle = ref({})
const contextMenuStyle = ref({})
let resizeObserver

const filteredTabs = computed(() => {
  const query = tabQuery.value.trim().toLowerCase()
  if (!query) return store.tabs
  return store.tabs.filter(tab =>
    tab.name.toLowerCase().includes(query) || tab.path?.toLowerCase().includes(query)
  )
})

const contextTabIndex = computed(() =>
  contextTab.value ? store.tabs.findIndex(tab => tab.id === contextTab.value.id) : -1
)
const hasTabsToRight = computed(() =>
  contextTabIndex.value >= 0 && contextTabIndex.value < store.tabs.length - 1
)

function updateOverflow() {
  const element = tabsScroll.value
  hasOverflow.value = Boolean(element && element.scrollWidth > element.clientWidth + 1)
}

function scrollActiveTabIntoView(behavior = 'smooth') {
  const element = tabsScroll.value
  if (!element) return
  const active = Array.from(element.querySelectorAll('.tab'))
    .find(tab => tab.dataset.tabId === store.activeTabId)
  active?.scrollIntoView({ behavior, block: 'nearest', inline: 'nearest' })
}

function activateTab(id) {
  store.setActiveTab(id)
  closeMenus()
}

function activateFromMenu(id) {
  store.setActiveTab(id)
  showAllTabs.value = false
}

function handleTabsWheel(event) {
  const element = tabsScroll.value
  if (!element || element.scrollWidth <= element.clientWidth) return
  const movement = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (!movement) return
  element.scrollLeft += movement
  event.preventDefault()
}

function positionAllTabsMenu() {
  const rect = allTabsButton.value?.getBoundingClientRect()
  if (!rect) return
  allTabsMenuStyle.value = {
    top: `${rect.bottom + 5}px`,
    right: `${Math.max(8, window.innerWidth - rect.right)}px`,
  }
}

async function toggleAllTabs() {
  contextTab.value = null
  showAllTabs.value = !showAllTabs.value
  tabQuery.value = ''
  if (!showAllTabs.value) return
  await nextTick()
  positionAllTabsMenu()
  searchInput.value?.focus()
}

function openContextMenu(event, tab) {
  showAllTabs.value = false
  contextTab.value = tab
  const menuWidth = 190
  const menuHeight = 174
  contextMenuStyle.value = {
    left: `${Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8))}px`,
    top: `${Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8))}px`,
  }
}

function closeMenus() {
  showAllTabs.value = false
  contextTab.value = null
}

async function closeTabs(ids) {
  const idSet = new Set(ids)
  const targets = store.tabs.filter(tab => idSet.has(tab.id))
  if (!targets.length) return
  const dirtyTabs = targets.filter(tab => tab.isDirty)
  if (dirtyTabs.length) {
    const confirmed = await modal.confirm(
      '关闭未保存的标签',
      dirtyTabs.length === 1
        ? `“${dirtyTabs[0].name}”尚未保存，关闭将丢失修改。`
        : `其中 ${dirtyTabs.length} 个文件尚未保存，关闭将丢失这些修改。`
    )
    if (!confirmed) return
  }
  for (const tab of targets) store.closeTab(tab.id, true)
  closeMenus()
}

function closeOtherTabs() {
  if (!contextTab.value) return
  return closeTabs(store.tabs.filter(tab => tab.id !== contextTab.value.id).map(tab => tab.id))
}

function closeTabsToRight() {
  if (!hasTabsToRight.value) return
  return closeTabs(store.tabs.slice(contextTabIndex.value + 1).map(tab => tab.id))
}

function tabLocation(tab) {
  if (!tab.path) return '未保存'
  const workspace = store.workspaces.find(item =>
    tab.path.toLowerCase().startsWith(item.path.toLowerCase())
  )
  const parts = tab.path.split(/[\\/]/)
  const parent = parts.length > 1 ? parts[parts.length - 2] : ''
  return [workspace?.name, parent && parent !== workspace?.name ? parent : '']
    .filter(Boolean)
    .join(' · ') || tab.path
}

function newDocument() {
  closeMenus()
  store.newDocument()
}

function handleDocumentPointerDown(event) {
  if (
    allTabsMenu.value?.contains(event.target) ||
    allTabsButton.value?.contains(event.target) ||
    contextMenu.value?.contains(event.target)
  ) return
  closeMenus()
}

function handleEscape(event) {
  if (event.key === 'Escape') closeMenus()
}

function handleWindowResize() {
  updateOverflow()
  if (showAllTabs.value) positionAllTabsMenu()
  contextTab.value = null
}

watch(() => store.activeTabId, async () => {
  await nextTick()
  scrollActiveTabIntoView()
})

watch(() => store.tabs.length, async () => {
  await nextTick()
  updateOverflow()
  scrollActiveTabIntoView('auto')
})

onMounted(() => {
  resizeObserver = new ResizeObserver(updateOverflow)
  if (tabsScroll.value) resizeObserver.observe(tabsScroll.value)
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleEscape)
  window.addEventListener('resize', handleWindowResize)
  nextTick(() => {
    updateOverflow()
    scrollActiveTabIntoView('auto')
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleEscape)
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<style scoped>
.tab-bar {
  display: flex;
  align-items: stretch;
  height: var(--tab-height);
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  overflow: hidden;
}
.tab-bar-empty {
  align-items: center;
  padding: 0 8px;
}
.tabs-scroll {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  flex: 1;
  min-width: 0;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
}
.tabs-scroll::-webkit-scrollbar { display: none; }

.tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px 0 10px;
  border-right: 1px solid var(--border-subtle);
  min-width: 90px;
  width: clamp(90px, 12vw, 180px);
  max-width: 180px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 12.5px;
  position: relative;
  transition: background var(--transition), color var(--transition);
  flex-shrink: 0;
  user-select: none;
  outline: none;
}
.tab:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}
.tab.active {
  background: var(--bg-base);
  color: var(--text-primary);
  box-shadow: inset 0 -2px var(--accent);
}
.tab:focus-visible { box-shadow: inset 0 0 0 1px var(--accent), inset 0 -2px var(--accent); }
.tab-icon {
  flex-shrink: 0;
  color: var(--text-muted);
  display: flex;
  align-items: center;
}
.tab.active .tab-icon { color: var(--accent); }
.tab-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tab-dirty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--orange);
  flex-shrink: 0;
}
.tab-close {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--text-muted);
  flex-shrink: 0;
  opacity: 0;
  transition: background var(--transition), color var(--transition), opacity var(--transition);
}
.tab:hover .tab-close,
.tab.active .tab-close,
.tab:focus-within .tab-close { opacity: 1; }
.tab-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tab-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 5px;
  border-left: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  z-index: 1;
}
.tab-list-btn { position: relative; }
.tab-count {
  position: absolute;
  top: 1px;
  right: 0;
  min-width: 12px;
  height: 12px;
  padding: 0 3px;
  border-radius: 6px;
  background: var(--accent);
  color: white;
  font-size: 8px;
  line-height: 12px;
  font-weight: 700;
  box-shadow: 0 0 0 2px var(--bg-surface);
}

.tab-new-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-secondary);
  background: none;
  border: none;
  cursor: pointer;
  transition: all var(--transition);
}
.tab-new-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tabs-menu,
.tab-context-menu {
  position: fixed;
  z-index: 10000;
  color: var(--text-primary);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}
.tabs-menu {
  width: min(340px, calc(100vw - 16px));
  overflow: hidden;
}
.tabs-menu-head {
  height: 36px;
  padding: 0 10px 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-secondary);
  font-size: 11.5px;
  border-bottom: 1px solid var(--border-subtle);
}
.menu-close-all {
  color: var(--text-muted);
  font-size: 11px;
  padding: 3px 6px;
  border-radius: var(--radius-sm);
}
.menu-close-all:hover { color: var(--text-primary); background: var(--bg-hover); }
.tab-search-wrap {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 8px;
  padding: 0 9px;
  height: 30px;
  color: var(--text-muted);
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.tab-search {
  flex: 1;
  min-width: 0;
  color: var(--text-primary);
  font-size: 12px;
  background: transparent;
  border: none;
  outline: none;
}
.tab-search::placeholder { color: var(--text-muted); }
.tabs-menu-list {
  max-height: min(390px, calc(100vh - 100px));
  overflow-y: auto;
  padding: 4px;
}
.tabs-menu-item {
  width: 100%;
  min-height: 42px;
  padding: 5px 6px;
  display: flex;
  align-items: center;
  gap: 7px;
  border-radius: var(--radius-sm);
  text-align: left;
  color: var(--text-secondary);
}
.tabs-menu-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.tabs-menu-item.active { background: var(--accent-muted); color: var(--text-primary); }
.menu-active-mark {
  width: 3px;
  height: 18px;
  border-radius: 2px;
  background: transparent;
  flex-shrink: 0;
}
.tabs-menu-item.active .menu-active-mark { background: var(--accent); }
.menu-tab-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.menu-tab-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12.5px; }
.menu-tab-location { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-muted); font-size: 10.5px; }
.menu-item-close {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 4px;
  color: var(--text-muted);
  opacity: 0;
}
.tabs-menu-item:hover .menu-item-close,
.tabs-menu-item.active .menu-item-close { opacity: 1; }
.menu-item-close:hover { color: var(--text-primary); background: var(--bg-surface); }
.tabs-menu-empty { padding: 26px 12px; text-align: center; color: var(--text-muted); font-size: 12px; }

.tab-context-menu {
  width: 190px;
  padding: 5px;
}
.context-tab-name {
  padding: 5px 8px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-muted);
  font-size: 10.5px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 4px;
}
.tab-context-menu button {
  width: 100%;
  height: 30px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 12px;
  text-align: left;
}
.tab-context-menu button:hover:not(:disabled) { background: var(--bg-hover); color: var(--text-primary); }
.tab-context-menu button:disabled { opacity: 0.38; cursor: default; }
.context-separator { height: 1px; margin: 4px 3px; background: var(--border-subtle); }

@media (prefers-reduced-motion: reduce) {
  .tab, .tab-close { transition: none; }
}
</style>
