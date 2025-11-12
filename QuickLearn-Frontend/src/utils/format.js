// Lightweight, UI-friendly date/time helpers
export function formatUpdatedAt(timestamp) {
  if (!timestamp) return '—'
  try {
    const date = new Date(timestamp)
    // Prefer the user's locale; fall back to en-US
    const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US'
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date)
  } catch {
    return '—'
  }
}

export function formatDateOnly(timestamp) {
  if (!timestamp) return '—'
  try {
    const date = new Date(timestamp)
    const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US'
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date)
  } catch {
    return '—'
  }
}

