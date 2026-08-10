<template>
  <Teleport to="body">
    <div v-if="isOpen" class="modal-overlay" @click.self="onCancel">
      <div class="modal-card" @keydown.escape="onCancel" @keydown.enter="onConfirm">
        <div class="modal-header">
          <h3 class="modal-title">{{ options.title }}</h3>
          <button class="modal-close" @click="onCancel">×</button>
        </div>

        <div class="modal-body">
          <p v-if="options.message" class="modal-message">{{ options.message }}</p>
          <input
            v-if="options.type === 'prompt'"
            ref="inputEl"
            v-model="inputValue"
            class="modal-input"
            :placeholder="options.placeholder"
            @keydown.enter.prevent="onConfirm"
          />
        </div>

        <div class="modal-footer">
          <button class="modal-btn cancel" @click="onCancel">{{ options.cancelText || '取消' }}</button>
          <button class="modal-btn primary" @click="onConfirm">{{ options.confirmText || '确定' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const isOpen = ref(false)
const inputValue = ref('')
const inputEl = ref(null)
const options = ref({
  type: 'prompt', // 'prompt' | 'confirm'
  title: '',
  message: '',
  defaultValue: '',
  placeholder: '',
  confirmText: '确定',
  cancelText: '取消'
})

let resolvePromise = null

function showPrompt(titleOrOpts, message = '', defaultValue = '', placeholder = '') {
  if (typeof titleOrOpts === 'object' && titleOrOpts !== null) {
    options.value = {
      type: 'prompt',
      title: titleOrOpts.title || '',
      message: titleOrOpts.message || '',
      defaultValue: titleOrOpts.defaultValue || '',
      placeholder: titleOrOpts.placeholder || '',
      confirmText: titleOrOpts.confirmText || '确定',
      cancelText: titleOrOpts.cancelText || '取消'
    }
  } else {
    options.value = {
      type: 'prompt',
      title: titleOrOpts,
      message,
      defaultValue,
      placeholder,
      confirmText: '确定',
      cancelText: '取消'
    }
  }
  inputValue.value = options.value.defaultValue
  isOpen.value = true

  nextTick(() => {
    if (inputEl.value) {
      inputEl.value.focus()
      inputEl.value.select()
    }
  })

  return new Promise(resolve => {
    resolvePromise = resolve
  })
}

function showConfirm(titleOrOpts, message = '') {
  if (typeof titleOrOpts === 'object' && titleOrOpts !== null) {
    options.value = {
      type: 'confirm',
      title: titleOrOpts.title || '',
      message: titleOrOpts.message || '',
      confirmText: titleOrOpts.confirmText || '确定',
      cancelText: titleOrOpts.cancelText || '取消'
    }
  } else {
    options.value = {
      type: 'confirm',
      title: titleOrOpts,
      message,
      confirmText: '确定',
      cancelText: '取消'
    }
  }
  isOpen.value = true

  return new Promise(resolve => {
    resolvePromise = resolve
  })
}

function onConfirm() {
  isOpen.value = false
  if (resolvePromise) {
    if (options.value.type === 'prompt') {
      resolvePromise(inputValue.value)
    } else {
      resolvePromise(true)
    }
    resolvePromise = null
  }
}

function onCancel() {
  isOpen.value = false
  if (resolvePromise) {
    if (options.value.type === 'prompt') {
      resolvePromise(null)
    } else {
      resolvePromise(false)
    }
    resolvePromise = null
  }
}

defineExpose({ showPrompt, showConfirm })
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.15s ease-out;
}

.modal-card {
  width: 90%;
  max-width: 400px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
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
  from { opacity: 0; transform: scale(0.95) translateY(-8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
}

.modal-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 3px;
  transition: all var(--transition);
}
.modal-close:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.modal-body {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal-message {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
}

.modal-input {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  font-family: var(--editor-font);
  background: var(--bg-base);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  box-sizing: border-box;
  transition: all var(--transition);
}
.modal-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-glow);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-surface);
}

.modal-btn {
  padding: 6px 16px;
  border-radius: var(--radius-md);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text-primary);
  transition: all var(--transition);
}
.modal-btn:hover {
  background: var(--bg-hover);
}
.modal-btn.primary {
  background: var(--accent);
  color: white;
  border-color: var(--accent);
}
.modal-btn.primary:hover {
  background: var(--accent-hover);
  border-color: var(--accent-hover);
}
</style>
