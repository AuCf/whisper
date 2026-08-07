<template>
  <div class="preview-wrap" v-show="store.showPreview">
    <div
      ref="previewEl"
      class="preview-scroll"
    >
      <div
        ref="contentEl"
        class="markdown-body"
        v-html="renderedHtml"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useEditorStore } from '../stores/editorStore.js'
import { useMarkdown } from '../composables/useMarkdown.js'
import { useLocalImages } from '../composables/useLocalImages.js'

const emit = defineEmits(['scroll-el'])
const store = useEditorStore()
const { render, postProcess } = useMarkdown()
const { resolveLocalImages, cleanup: cleanupLocalImages } = useLocalImages()

const previewEl = ref(null)
const contentEl = ref(null)

const renderedHtml = computed(() => render(store.activeContent))

async function processPreview() {
  await nextTick()
  await Promise.all([
    postProcess(contentEl.value),
    resolveLocalImages(contentEl.value, store.activeTab?.path),
  ])
}

watch([renderedHtml, () => store.activeTab?.path], processPreview)

onMounted(() => {
  emit('scroll-el', previewEl.value)
  processPreview()
})

onUnmounted(cleanupLocalImages)

defineExpose({
  getScrollEl: () => previewEl.value,
  getContentEl: () => contentEl.value,
})
</script>

<style scoped>
.preview-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: var(--preview-bg);
  overflow: hidden;
}
.preview-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
