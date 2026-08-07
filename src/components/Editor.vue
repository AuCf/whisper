<template>
  <div class="editor-wrap" v-show="store.showEditor">
    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, shallowRef } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, dropCursor } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching, indentOnInput, foldGutter } from '@codemirror/language'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { useEditorStore } from '../stores/editorStore.js'
import { getClipboardImage, saveClipboardImage } from '../composables/useClipboardImage.js'

const props = defineProps({ tabId: String })
const emit = defineEmits(['update', 'scroll-el'])

const store = useEditorStore()
const editorContainer = ref(null)
const view = shallowRef(null)
let syncingExternalContent = false

function updateCursorPosition(state) {
  const head = state.selection.main.head
  const line = state.doc.lineAt(head)
  store.setCursorPosition(line.number, head - line.from + 1)
}

// ── Dark theme ────────────────────────────────────────────────
const editorTheme = EditorView.theme({
  '&': {
    backgroundColor: 'var(--editor-bg)',
    color: 'var(--text-primary)',
    height: '100%',
    fontFamily: 'var(--editor-font)',
    fontSize: 'var(--editor-size)',
  },
  '.cm-content': {
    padding: '16px 0',
    caretColor: 'var(--accent)',
    lineHeight: 'var(--editor-line-height)',
  },
  '.cm-scroller': {
    overflow: 'auto',
    fontFamily: 'var(--editor-font)',
  },
  '.cm-line': { padding: '0 20px' },
  '.cm-cursor': { borderLeftColor: 'var(--accent)', borderLeftWidth: '2px' },
  '.cm-activeLine': { backgroundColor: 'rgba(88,166,255,0.04)' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(88,166,255,0.04)' },
  '.cm-gutters': {
    backgroundColor: 'var(--editor-bg)',
    borderRight: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    minWidth: '44px',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 4px', minWidth: '36px', textAlign: 'right' },
  '.cm-foldGutter .cm-gutterElement': { padding: '0 4px' },
  '.cm-selectionBackground, ::selection': { backgroundColor: 'rgba(88,166,255,0.25) !important' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(88,166,255,0.2)', outline: '1px solid var(--accent)' },
  '.cm-searchMatch': { backgroundColor: 'rgba(210,153,34,0.3)', outline: '1px solid var(--yellow)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'rgba(88,166,255,0.3)' },
  '.cm-selectionMatch': { backgroundColor: 'rgba(88,166,255,0.15)' },
  // Markdown syntax colours
  '.tok-heading': { color: '#79c0ff', fontWeight: '700' },
  '.tok-heading1': { fontSize: '1.2em', color: '#58a6ff' },
  '.tok-heading2': { color: '#79b8ff' },
  '.tok-strong': { color: '#e6edf3', fontWeight: '700' },
  '.tok-emphasis': { color: '#d2a8ff', fontStyle: 'italic' },
  '.tok-link': { color: '#58a6ff' },
  '.tok-url': { color: '#58a6ff', textDecoration: 'underline' },
  '.tok-monospace': { color: '#ffa657', fontFamily: 'var(--editor-font)', backgroundColor: 'rgba(255,166,87,0.08)', borderRadius: '3px', padding: '0 2px' },
  '.tok-quote': { color: '#8b949e', fontStyle: 'italic' },
  '.tok-list': { color: '#7ee787' },
  '.tok-comment': { color: '#8b949e', fontStyle: 'italic' },
  '.tok-string': { color: '#a5d6ff' },
  '.tok-keyword': { color: '#ff7b72' },
  '.tok-number': { color: '#79c0ff' },
  '.tok-operator': { color: '#ff7b72' },
  '.tok-variableName': { color: '#ffa657' },
  '.tok-typeName': { color: '#ffa657' },
  '.tok-propertyName': { color: '#79c0ff' },
  '.tok-punctuation': { color: 'rgba(139, 148, 158, 0.45)' },
  '.tok-meta': { color: 'rgba(139, 148, 158, 0.5)' },
  '.tok-atom': { color: '#79c0ff' },
}, { dark: true })

// ── Format insertion ──────────────────────────────────────────
function insertFormat(type) {
  if (!view.value) return
  const v = view.value
  const { from, to } = v.state.selection.main
  const selectedText = v.state.sliceDoc(from, to)

  const formatMap = {
    bold:          { wrap: '**', placeholder: '加粗文字' },
    italic:        { wrap: '_',  placeholder: '斜体文字' },
    strikethrough: { wrap: '~~', placeholder: '删除文字' },
    inlineCode:    { wrap: '`',  placeholder: 'code' },
  }

  const lineInserts = {
    h1:        '# ',
    h2:        '## ',
    h3:        '### ',
    ul:        '- ',
    ol:        '1. ',
    task:      '- [ ] ',
    quote:     '> ',
  }

  const blockInserts = {
    hr:        '\n---\n',
    codeBlock: '```\n' + (selectedText || 'code') + '\n```',
    link:      `[${selectedText || '链接文字'}](url)`,
    image:     `![${selectedText || '图片描述'}](url)`,
    table:     '\n| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |\n',
  }

  let changes, cursor

  if (formatMap[type]) {
    const { wrap, placeholder } = formatMap[type]
    const text = selectedText || placeholder
    changes = { from, to, insert: `${wrap}${text}${wrap}` }
    cursor = from + wrap.length + text.length + wrap.length
  } else if (lineInserts[type]) {
    const line = v.state.doc.lineAt(from)
    changes = { from: line.from, to: line.from, insert: lineInserts[type] }
    cursor = line.from + lineInserts[type].length
  } else if (blockInserts[type]) {
    changes = { from, to, insert: blockInserts[type] }
    cursor = from + blockInserts[type].length
  }

  if (changes) {
    v.dispatch({
      changes,
      selection: { anchor: cursor },
      scrollIntoView: true,
    })
    v.focus()
  }
}

// ── Setup CodeMirror ─────────────────────────────────────────
function createEditor(initialContent) {
  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    highlightSelectionMatches(),
    drawSelection(),
    dropCursor(),
    bracketMatching(),
    indentOnInput(),
    foldGutter(),
    history(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      indentWithTab,
      { key: 'Ctrl-b', run: () => { insertFormat('bold'); return true } },
      { key: 'Ctrl-i', run: () => { insertFormat('italic'); return true } },
      { key: 'Ctrl-s', run: () => { store.saveActiveFile(); return true } },
    ]),
    EditorView.updateListener.of(update => {
      if (update.selectionSet || update.docChanged) {
        updateCursorPosition(update.state)
      }
      if (update.docChanged && !syncingExternalContent) {
        const content = update.state.doc.toString()
        emit('update', content)
        store.updateContent(props.tabId, content)
        store.scheduleAutoSave(props.tabId)
      }
    }),
    EditorView.domEventHandlers({
      paste(event, editorView) {
        const image = getClipboardImage(event)
        if (!image) return false

        event.preventDefault()
        const tab = store.tabs.find(item => item.id === props.tabId)
        if (!tab) return true

        ;(async () => {
          if (!tab.path) {
            const saved = await store.saveFileAs(tab.id)
            if (!saved) return
          }

          const inserted = await saveClipboardImage(image, editorView, tab.path)
          if (inserted) await store.saveFile(tab.id)
        })()

        return true
      },
    }),
    EditorView.lineWrapping,
    editorTheme,
  ]

  const state = EditorState.create({
    doc: initialContent || '',
    extensions,
  })

  return new EditorView({ state, parent: editorContainer.value })
}

function scrollToLine(lineNo) {
  if (!view.value) return
  const line = view.value.state.doc.line(Math.min(lineNo, view.value.state.doc.lines))
  view.value.dispatch({
    selection: { anchor: line.from, head: line.to },
    scrollIntoView: true,
  })
  view.value.focus()
}

// ── Expose for parent ─────────────────────────────────────────
defineExpose({ insertFormat, scrollToLine, getScrollEl: () => view.value?.scrollDOM })

onMounted(() => {
  const tab = store.tabs.find(t => t.id === props.tabId)
  view.value = createEditor(tab?.content || '')
  updateCursorPosition(view.value.state)
  emit('scroll-el', view.value.scrollDOM)
})

// Update content when tab switches
watch(
  () => store.activeTab?.content,
  (newContent) => {
    if (!view.value) return
    const current = view.value.state.doc.toString()
    if (newContent !== undefined && newContent !== current) {
      syncingExternalContent = true
      try {
        view.value.dispatch({
          changes: { from: 0, to: current.length, insert: newContent },
          selection: { anchor: 0 },
        })
      } finally {
        syncingExternalContent = false
      }
    }
  },
  { flush: 'post' }
)

onUnmounted(() => view.value?.destroy())
</script>

<style scoped>
.editor-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--border);
}
.editor-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.editor-container :deep(.cm-editor) {
  height: 100%;
  outline: none;
}
.editor-container :deep(.cm-scroller) {
  overflow: auto;
  flex: 1;
}
</style>
