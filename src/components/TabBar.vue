<template>
  <div class="tab-bar" v-if="store.tabs.length > 0">
    <div class="tabs-scroll">
      <div
        v-for="tab in store.tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: tab.id === store.activeTabId, dirty: tab.isDirty }"
        @click="store.setActiveTab(tab.id)"
        @mousedown.middle.prevent="store.closeTab(tab.id)"
      >
        <span class="tab-icon">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </span>
        <span class="tab-name">{{ tab.name }}</span>
        <span v-if="tab.isDirty" class="tab-dirty-dot"></span>
        <button
          class="tab-close"
          @click.stop="store.closeTab(tab.id)"
          :title="`关闭 ${tab.name}`"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>

    <div class="tab-actions">
      <button class="icon-btn" data-tooltip="新建文件" @click="store.newDocument()">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
  </div>

  <!-- Empty state: no tabs open -->
  <div class="tab-bar tab-bar-empty" v-else>
    <button class="tab-new-btn" @click="store.newDocument()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      新建文件
    </button>
  </div>
</template>

<script setup>
import { useEditorStore } from '../stores/editorStore.js'
const store = useEditorStore()
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
  scrollbar-width: none;
}
.tabs-scroll::-webkit-scrollbar { display: none; }

.tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px 0 10px;
  border-right: 1px solid var(--border-subtle);
  min-width: 100px;
  max-width: 180px;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 12.5px;
  position: relative;
  transition: background var(--transition), color var(--transition);
  flex-shrink: 0;
  user-select: none;
}
.tab:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}
.tab.active {
  background: var(--bg-base);
  color: var(--text-primary);
  border-bottom: 2px solid var(--accent);
}
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
  transition: all var(--transition);
}
.tab:hover .tab-close,
.tab.active .tab-close { opacity: 1; }
.tab-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tab-actions {
  display: flex;
  align-items: center;
  padding: 0 6px;
  border-left: 1px solid var(--border-subtle);
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
</style>
