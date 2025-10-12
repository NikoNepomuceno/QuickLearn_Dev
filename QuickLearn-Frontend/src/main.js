import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import './styles.css'

// One-time cleanup of legacy token storage from older builds
try {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
} catch {}


try {
  const savedTheme = localStorage.getItem('theme')
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = savedTheme || (prefersDark ? 'dark' : 'light')
  if (theme === 'dark') {
    document.body.classList.add('dark')
  } else {
    document.body.classList.remove('dark')
  }
  if (typeof window !== 'undefined') {
    window.$theme = {
      get: () => (document.body.classList.contains('dark') ? 'dark' : 'light'),
      set: (t) => {
        if (t === 'dark') document.body.classList.add('dark')
        else document.body.classList.remove('dark')
        localStorage.setItem('theme', t)
      },
      toggle: () => {
        const next = document.body.classList.contains('dark') ? 'light' : 'dark'
        if (next === 'dark') document.body.classList.add('dark')
        else document.body.classList.remove('dark')
        localStorage.setItem('theme', next)
        return next
      }
    }
  }
} catch {}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
