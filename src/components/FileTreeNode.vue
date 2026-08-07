<template>
  <div class="file-tree-node">
    <!-- Directory -->
    <div
      v-if="node.is_dir"
      class="tree-item tree-dir"
      :style="{ paddingLeft: depth * 14 + 4 + 'px' }"
      @click="toggleExpand"
      @contextmenu.prevent="onCtx($event)"
    >
      <span class="tree-arrow" :class="{ expanded: isExpanded }">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="9 18 15 12 9 6"/></svg>
      </span>
      <span class="tree-icon dir-icon">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      </span>
      <span class="tree-name">{{ node.name }}</span>
      <button class="tree-action-btn" @click.stop="startNewFile" title="新建文件">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>

      <!-- File -->
      <div
        class="tree-item tree-file"
        :class="[{ active: isActiveFile }, `ext-${fileExt}`]"
        :style="{ paddingLeft: depth * 14 + 18 + 'px' }"
        @click="openFile"
        @contextmenu.prevent="onCtx($event)"
      >
        <span class="tree-icon file-icon" :class="`icon-${fileExt}`">
          <!-- Markdown icon -->
          <svg v-if="['md', 'markdown', 'mdx'].includes(fileExt)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 13v-3l2 2 2-2v3"/></svg>
          <!-- Image icon -->
          <svg v-else-if="['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(fileExt)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <!-- Default file icon -->
          <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </span>
        <span class="tree-name">{{ node.name }}</span>
      </div>

    <!-- Children -->
    <template v-if="node.is_dir && isExpanded">
      <!-- Inline new-file input -->
      <div
        v-if="isCreatingFile"
        class="tree-new-file-row"
        :style="{ paddingLeft: (depth + 1) * 14 + 18 + 'px' }"
      >
        <input
          ref="newFileInputEl"
          v-model="newFileName"
          placeholder="文件名.md"
          @keydown.enter="confirmNewFile"
          @keydown.escape="isCreatingFile = false"
          @blur="isCreatingFile = false"
        />
      </div>

      <FileTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :workspace-path="workspacePath"
        @context-menu="$emit('context-menu', $event)"
      />

      <div
        v-if="!node.children?.length && !isCreatingFile"
        class="tree-empty"
        :style="{ paddingLeft: (depth + 1) * 14 + 18 + 'px' }"
      >空目录</div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, defineAsyncComponent } from 'vue'
import { useEditorStore } from '../stores/editorStore.js'

// Self-referencing: works in Vue 3 SFCs via component name
const FileTreeNode = defineAsyncComponent(() =>
  import('./FileTreeNode.vue')
)

const props = defineProps({
  node: { type: Object, required: true },
  depth: { type: Number, default: 0 },
  workspacePath: { type: String, required: true },
})
const emit = defineEmits(['context-menu'])

const store = useEditorStore()
const isExpanded = ref(props.depth === 0)
const isCreatingFile = ref(false)
const newFileName = ref('')
const newFileInputEl = ref(null)

const isActiveFile = computed(() =>
  store.activeTab?.path === props.node.path
)

const fileExt = computed(() => {
  if (props.node.is_dir) return ''
  const parts = props.node.name.split('.')
  return parts.length > 1 ? parts.pop().toLowerCase() : ''
})

function toggleExpand() {
  store.setActiveWorkspace(props.workspacePath)
  isExpanded.value = !isExpanded.value
}

function openFile() {
  store.setActiveWorkspace(props.workspacePath)
  store.openFile(props.node.path)
}

async function startNewFile() {
  store.setActiveWorkspace(props.workspacePath)
  isExpanded.value = true
  isCreatingFile.value = true
  newFileName.value = ''
  await nextTick()
  newFileInputEl.value?.focus()
}

async function confirmNewFile() {
  const name = newFileName.value.trim()
  if (!name) { isCreatingFile.value = false; return }
  const finalName = name.includes('.') ? name : name + '.md'
  try {
    await store.createNewFile(props.node.path, finalName)
  } catch (e) { /* ignore */ }
  isCreatingFile.value = false
  newFileName.value = ''
}

function onCtx(event) {
  store.setActiveWorkspace(props.workspacePath)
  emit('context-menu', { event, node: props.node })
}
</script>

<style scoped>
.file-tree-node { display: flex; flex-direction: column; }

.tree-item {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-top: 3px;
  padding-bottom: 3px;
  padding-right: 8px;
  cursor: pointer;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  color: var(--text-secondary);
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  transition: background var(--transition), color var(--transition);
  min-height: 24px;
}
.tree-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.tree-item:hover .tree-action-btn { opacity: 1; }
.tree-file.active {
  background: var(--accent-muted);
  color: var(--accent);
  font-weight: 500;
}
.tree-file.active .file-icon { color: var(--accent); }

.tree-arrow {
  flex-shrink: 0;
  width: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: transform var(--transition);
  transform: rotate(0deg);
}
.tree-arrow.expanded { transform: rotate(90deg); }

.tree-icon { flex-shrink: 0; display: flex; align-items: center; }
.dir-icon { color: #79b8ff; }
.file-icon { color: var(--text-muted); }

/* Extension-specific icon colors */
.icon-md, .icon-markdown, .icon-mdx { color: var(--accent); }
.icon-png, .icon-jpg, .icon-jpeg, .icon-gif, .icon-svg, .icon-webp { color: var(--green); }
.icon-json { color: var(--yellow); }
.icon-txt { color: var(--text-secondary); }

.tree-name { flex: 1; overflow: hidden; text-overflow: ellipsis; }

.tree-action-btn {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--text-muted);
  opacity: 0;
  transition: all var(--transition);
}
.tree-action-btn:hover { background: var(--bg-elevated); color: var(--accent); opacity: 1 !important; }

.tree-empty {
  font-size: 11px;
  color: var(--text-muted);
  padding: 3px 0;
  font-style: italic;
}
.tree-new-file-row {
  padding: 3px 8px 3px 0;
}
.tree-new-file-row input {
  width: 100%;
  font-size: 12px;
  padding: 2px 6px;
  background: var(--bg-elevated);
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  outline: none;
  font-family: var(--editor-font);
}
</style>
