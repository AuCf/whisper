<template>
  <div class="window-controls">
    <button class="window-control" title="最小化" aria-label="最小化窗口" @click="minimize">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M1 5.5h8" />
      </svg>
    </button>
    <button
      class="window-control"
      :title="isMaximized ? '还原' : '最大化'"
      :aria-label="isMaximized ? '还原窗口' : '最大化窗口'"
      @click="toggleMaximize"
    >
      <svg v-if="isMaximized" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M3 1.5h5.5V7H7M1.5 3H7v5.5H1.5z" />
      </svg>
      <svg v-else width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <rect x="1.5" y="1.5" width="7" height="7" />
      </svg>
    </button>
    <button class="window-control close" title="关闭" aria-label="关闭窗口" @click="closeWindow">
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M1.5 1.5l7 7m0-7l-7 7" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'

const appWindow = getCurrentWindow()
const isMaximized = ref(false)
let unlistenResize = null

async function syncWindowState() {
  try {
    isMaximized.value = await appWindow.isMaximized()
  } catch (err) {
    console.error('读取窗口状态失败:', err)
  }
}

async function minimize() {
  try {
    await appWindow.minimize()
  } catch (err) {
    console.error('最小化窗口失败:', err)
  }
}

async function toggleMaximize() {
  try {
    await appWindow.toggleMaximize()
    await syncWindowState()
  } catch (err) {
    console.error('切换窗口大小失败:', err)
  }
}

async function closeWindow() {
  try {
    await appWindow.close()
  } catch (err) {
    console.error('关闭窗口失败:', err)
  }
}

onMounted(async () => {
  await syncWindowState()
  unlistenResize = await appWindow.onResized(syncWindowState)
})

onUnmounted(() => unlistenResize?.())
</script>

<style scoped>
.window-controls {
  align-self: stretch;
  display: flex;
  flex-shrink: 0;
  margin-left: 8px;
}
.window-control {
  width: 46px;
  height: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  color: var(--text-secondary);
  transition: background var(--transition), color var(--transition);
}
.window-control svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1;
  shape-rendering: crispEdges;
}
.window-control:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}
.window-control.close:hover {
  background: #c42b1c;
  color: #fff;
}
.window-control:focus-visible {
  outline-offset: -2px;
}
</style>
