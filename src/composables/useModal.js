import { ref } from 'vue'

const modalRef = ref(null)

export function registerModal(refInstance) {
  modalRef.value = refInstance
}

export function useModal() {
  async function prompt(title, defaultValue = '', placeholder = '') {
    if (modalRef.value) {
      return modalRef.value.showPrompt({ title, defaultValue, placeholder })
    }
    // Fallback if not registered
    return window.prompt(title, defaultValue)
  }

  async function confirm(title, message = '') {
    if (modalRef.value) {
      return modalRef.value.showConfirm({ title, message })
    }
    // Fallback if not registered
    return window.confirm(message ? `${title}\n${message}` : title)
  }

  return { prompt, confirm }
}
