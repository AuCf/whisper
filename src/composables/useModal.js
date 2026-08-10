import { ref } from 'vue'

const modalRef = ref(null)

export function registerModal(refInstance) {
  modalRef.value = refInstance
}

export function useModal() {
  async function prompt(titleOrOpts, defaultValue = '', placeholder = '') {
    if (modalRef.value) {
      return modalRef.value.showPrompt(titleOrOpts, defaultValue, placeholder)
    }
    const title = typeof titleOrOpts === 'object' ? titleOrOpts.title : titleOrOpts
    const def = typeof titleOrOpts === 'object' ? titleOrOpts.defaultValue : defaultValue
    return window.prompt(title, def)
  }

  async function confirm(titleOrOpts, message = '') {
    if (modalRef.value) {
      return modalRef.value.showConfirm(titleOrOpts, message)
    }
    if (typeof titleOrOpts === 'object' && titleOrOpts !== null) {
      return window.confirm(titleOrOpts.message ? `${titleOrOpts.title}\n${titleOrOpts.message}` : titleOrOpts.title)
    }
    return window.confirm(message ? `${titleOrOpts}\n${message}` : titleOrOpts)
  }

  return { prompt, confirm }
}
