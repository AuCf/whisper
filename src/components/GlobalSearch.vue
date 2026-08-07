<template>
  <aside class="search-panel" :class="{ hidden: !showSearch }">
    <div class="search-header">
      <span class="search-title">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        工作区搜索
      </span>
      <button class="icon-btn" title="关闭搜索" @click="closeSearch">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>

    <div class="search-box-wrap">
      <div class="search-input-box">
        <input
          ref="searchInputEl"
          v-model="query"
          placeholder="搜索工作区 (Ctrl+Shift+F)..."
          @input="onSearchInput"
          @keydown.escape="closeSearch"
        />
        <span v-if="isSearching" class="searching-spinner"></span>
      </div>
    </div>

    <div class="search-results-content">
      <div v-if="!store.workspacePath" class="search-empty">
        <p>未打开任何工作区文件夹</p>
      </div>

      <div v-else-if="query.trim().length === 0" class="search-empty">
        <p>输入关键字在工作区中搜索</p>
      </div>

      <div v-else-if="!isSearching && searchResults.length === 0" class="search-empty">
        <p>未找到与 “{{ query }}” 匹配的内容</p>
      </div>

      <div v-else class="results-list">
        <div class="results-summary">找到 {{ totalMatches }} 处匹配 ({{ searchResults.length }} 个文件)</div>

        <div
          v-for="file in searchResults"
          :key="file.file_path"
          class="file-result-group"
        >
          <div class="file-result-header" @click="openFile(file.file_path)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span class="file-name">{{ file.file_name }}</span>
            <span class="match-count">{{ file.matches.length }}</span>
          </div>

          <div class="match-list">
            <div
              v-for="(match, idx) in file.matches"
              :key="idx"
              class="match-item"
              @click="jumpToMatch(file.file_path, match.line_number)"
            >
              <span class="line-no">{{ match.line_number }}</span>
              <span class="line-text" v-html="highlightKeyword(match.line_text, query)"></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useEditorStore } from '../stores/editorStore.js'

const props = defineProps({
  showSearch: Boolean,
})
const emit = defineEmits(['close', 'jump-line'])

const store = useEditorStore()
const query = ref('')
const searchResults = ref([])
const isSearching = ref(false)
const searchInputEl = ref(null)
let debounceTimer = null

const totalMatches = computed(() => {
  return searchResults.value.reduce((acc, file) => acc + file.matches.length, 0)
})

watch(() => props.showSearch, (val) => {
  if (val) {
    nextTick(() => searchInputEl.value?.focus())
  }
})

function onSearchInput() {
  clearTimeout(debounceTimer)
  const q = query.value.trim()
  if (!q || !store.workspacePath) {
    searchResults.value = []
    isSearching.value = false
    return
  }
  isSearching.value = true
  debounceTimer = setTimeout(async () => {
    try {
      searchResults.value = await invoke('search_workspace', {
        path: store.workspacePath,
        query: q,
      })
    } catch (err) {
      console.error('Search failed:', err)
      searchResults.value = []
    } finally {
      isSearching.value = false
    }
  }, 250)
}

function highlightKeyword(text, keyword) {
  if (!keyword) return text
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  return text.replace(re, '<mark class="search-kw">$1</mark>')
}

function openFile(path) {
  store.openFile(path)
}

async function jumpToMatch(path, lineNumber) {
  await store.openFile(path)
  emit('jump-line', lineNumber)
}

function closeSearch() {
  emit('close')
}
</script>

<style scoped>
.search-panel {
  width: 280px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width var(--transition-slow), opacity var(--transition-slow);
  overflow: hidden;
}
.search-panel.hidden {
  width: 0;
  opacity: 0;
  pointer-events: none;
}

.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 12px;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}
.search-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.search-box-wrap {
  padding: 8px 10px;
  border-bottom: 1px solid var(--border-subtle);
}
.search-input-box {
  position: relative;
  display: flex;
  align-items: center;
}
.search-input-box input {
  width: 100%;
  padding: 6px 10px;
  font-size: 12.5px;
  font-family: var(--editor-font);
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  outline: none;
  transition: all var(--transition);
}
.search-input-box input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

.search-results-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}
.search-empty {
  padding: 30px 12px;
  text-align: center;
}
.search-empty p {
  font-size: 12px;
  color: var(--text-muted);
}

.results-summary {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 8px;
  padding: 0 4px;
}

.file-result-group {
  margin-bottom: 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.file-result-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-elevated);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
}
.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.match-count {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--accent-glow);
  color: var(--accent);
}

.match-list {
  display: flex;
  flex-direction: column;
}
.match-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 11.5px;
  line-height: 1.4;
  color: var(--text-secondary);
  transition: background var(--transition);
}
.match-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.line-no {
  font-family: var(--editor-font);
  font-size: 10.5px;
  color: var(--text-muted);
  flex-shrink: 0;
  min-width: 22px;
}
.line-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

<style>
mark.search-kw {
  background: var(--yellow);
  color: #000;
  border-radius: 2px;
  padding: 0 2px;
}
</style>
