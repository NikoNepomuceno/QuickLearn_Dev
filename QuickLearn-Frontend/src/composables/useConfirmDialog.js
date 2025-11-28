import Swal from 'sweetalert2'

function getModalAppearance() {
  const isDark = typeof document !== 'undefined' && document.body.classList.contains('dark')

  return {
    background: isDark ? '#0f172a' : '#ffffff',
    color: isDark ? '#e5e7eb' : '#1f2937',
    customClass: {
      popup: isDark ? 'swal2-dark-modal' : 'swal2-light-modal',
      confirmButton: isDark ? 'swal2-dark-confirm' : 'swal2-light-confirm',
      cancelButton: isDark ? 'swal2-dark-cancel' : 'swal2-light-cancel'
    }
  }
}

export function useConfirmDialog() {
  async function confirmDialog({
    title = 'Are you sure?',
    message = '',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    icon = 'warning',
    requireText
  } = {}) {
    if (typeof window === 'undefined') {
      return { isConfirmed: false }
    }

    if (requireText) {
      return Swal.fire({
        title,
        text: message,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        input: 'text',
        inputPlaceholder: requireText.placeholder ?? '',
        inputAttributes: {
          autocapitalize: 'off'
        },
        preConfirm: value => {
          if (value !== requireText.value) {
            Swal.showValidationMessage(requireText.validationMessage ?? `Please type "${requireText.value}" to continue.`)
            return false
          }
          return value
        },
        ...getModalAppearance()
      })
    }

    if (window?.$toast?.confirm) {
      return window.$toast.confirm(title, message, confirmText)
    }

    const isConfirmed = window.confirm(`${title}\n\n${message}`)
    return { isConfirmed }
  }

  return { confirmDialog }
}


