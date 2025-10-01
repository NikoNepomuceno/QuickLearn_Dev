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

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
