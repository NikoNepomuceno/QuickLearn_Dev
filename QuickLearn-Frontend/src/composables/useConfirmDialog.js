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
    requireText,
    danger = false
  } = {}) {
    if (typeof window === 'undefined') {
      return { isConfirmed: false }
    }

    const modalAppearance = getModalAppearance()

    // Add red color for destructive actions - replace the confirm button class entirely
    if (danger) {
      modalAppearance.customClass.confirmButton = 'swal2-danger-confirm'
    }

    if (requireText) {
      const swalConfig = {
        title,
        text: message,
        icon,
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        confirmButtonColor: danger ? '#dc2626' : undefined,
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
        didOpen: () => {
          if (danger) {
            setTimeout(() => {
              const confirmButton = document.querySelector('.swal2-confirm')
              if (confirmButton) {
                // Force red background using inline styles (inline styles override CSS classes)
                confirmButton.style.background = '#dc2626'
                confirmButton.style.backgroundColor = '#dc2626'
                confirmButton.style.color = '#ffffff'
                confirmButton.style.border = 'none'
                const hoverHandler = () => {
                  confirmButton.style.background = '#b91c1c'
                  confirmButton.style.backgroundColor = '#b91c1c'
                }
                const leaveHandler = () => {
                  confirmButton.style.background = '#dc2626'
                  confirmButton.style.backgroundColor = '#dc2626'
                }
                confirmButton.addEventListener('mouseenter', hoverHandler)
                confirmButton.addEventListener('mouseleave', leaveHandler)
              }
            }, 10)
          }
        },
        ...modalAppearance
      }
      return Swal.fire(swalConfig)
    }

    if (window?.$toast?.confirm) {
      return window.$toast.confirm(title, message, confirmText)
    }

    // For non-requireText cases, use SweetAlert2 directly with danger styling
    const baseConfig = {
      title,
      text: message,
      icon,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: danger ? '#dc2626' : undefined,
      didOpen: () => {
        if (danger) {
          setTimeout(() => {
            const confirmButton = document.querySelector('.swal2-confirm')
            if (confirmButton) {
              // Force red background using inline styles (inline styles override CSS classes)
              confirmButton.style.background = '#dc2626'
              confirmButton.style.backgroundColor = '#dc2626'
              confirmButton.style.color = '#ffffff'
              confirmButton.style.border = 'none'
              const hoverHandler = () => {
                confirmButton.style.background = '#b91c1c'
                confirmButton.style.backgroundColor = '#b91c1c'
              }
              const leaveHandler = () => {
                confirmButton.style.background = '#dc2626'
                confirmButton.style.backgroundColor = '#dc2626'
              }
              confirmButton.addEventListener('mouseenter', hoverHandler)
              confirmButton.addEventListener('mouseleave', leaveHandler)
            }
          }, 10)
        }
      },
      ...modalAppearance
    }

    if (danger) {
      baseConfig.customClass.confirmButton = 'swal2-danger-confirm'
    }

    const result = await Swal.fire(baseConfig)
    return { isConfirmed: result.isConfirmed }
  }

  return { confirmDialog }
}


