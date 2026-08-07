<template>
  <Teleport to="body">
    <div v-if="isOpen" class="quick-overlay" @click.self="close">
      <div class="quick-card" @keydown.escape="close" @keydown.up.prevent="moveSelection(-1)" @keydown.down.prevent="moveSelection(1)" @keydown.enter.prevent="selectCurrent">
        <div class="quick-search-box">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            ref="inputEl"
            v-model="query"
            placeholder="搜索工作区文件 (Ctrl+P)..."
          />
          <span class="quick-badge">Ctrl+P</span>
        </div>

        <div class="quick-results-list">
          <div v-if="filteredFiles.length === 0" class="quick-empty">
            没有找到匹配的文件
          </div>
          <div
            v-for="(file, index) in filteredFiles"
            :key="file.path"
            class="quick-item"
            :class="{ active: index === selectedIndex }"
            @click="openFile(file.path)"
            @mouseenter="selectedIndex = index"
          >
            <span class="quick-item-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </span>
            <div class="quick-item-info">
              <span class="quick-item-name">{{ file.name }}</span>
              <span class="quick-item-path">{{ file.relativePath }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useEditorStore } from '../stores/editorStore.js'

const props = defineProps({
  isOpen: Boolean,
})
const emit = defineEmits(['close'])

const store = useEditorStore()
const query = ref('')
const selectedIndex = ref(0)
const inputEl = ref(null)

// Flatten all files from open workspaces
const allFiles = computed(() => {
  const list = []
  function traverse(nodes, rootPath) {
    if (!nodes) return
    for (const n of nodes) {
      if (n.is_dir) {
        traverse(n.children, rootPath)
      } else {
        const rel = n.path.replace(rootPath, '').replace(/^[\\/]/, '')
        list.push({ name: n.name, path: n.path, relativePath: rel })
      }
    }
  }
  for (const ws of store.workspaces) {
    traverse(ws.tree, ws.path)
  }
  return list
})

const filteredFiles = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return allFiles.value.slice(0, 20)
  return allFiles.value
    .filter(f => f.name.toLowerCase().includes(q) || f.relativePath.toLowerCase().includes(q))
    .slice(0, 25)
})

watch(() => props.isOpen, (val) => {
  if (val) {
    query.value = ''
    selectedIndex.value = 0
    nextTick(() => inputEl.value?.focus())
  }
})

watch(filteredFiles, () => {
  selectedIndex.value = 0
})

function moveSelection(delta) {
  if (filteredFiles.value.length === 0) return
  const count = filteredFiles.value.length
  selectedIndex.value = (selectedIndex.value + delta + count) % count
}

function openFile(path) {
  store.openFile(path)
  emit('close')
}

function selectCurrent() {
  const current = filteredFiles.value[selectedIndex.value]
  if (current) {
    openFile(current.path)
  }
}

function close() {
  emit('close')
}
</script>

<style scoped>
.quick-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  animation: fadeIn 0.15s ease-out;
}

.quick-card {
  width: 90%;
  max-width: 560px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes popIn {
  from { opacity: 0; transform: scale(0.96) translateY(-10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.quick-search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
  color: var(--text-muted);
}
.quick-search-box input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 14px;
  font-family: var(--editor-font);
  color: var(--text-primary);
}
.quick-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.quick-results-list {
  max-height: 360px;
  overflow-y: auto;
  padding: 6px;
}

.quick-empty {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.quick-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition);
}
.quick-item:hover,
.quick-item.active {
  background: var(--accent-muted);
}
.quick-item.active .quick-item-name {
  color: var(--accent);
}
.quick-item-icon {
  color: var(--accent);
  display: flex;
  align-items: center;
}
.quick-item-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.quick-item-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.quick-item-path {
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
