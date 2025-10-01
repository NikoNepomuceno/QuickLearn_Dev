import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../views/LandingPage.vue'
import UploadQuiz from '../views/UploadQuiz.vue'
import TakeQuiz from '../views/TakeQuiz.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import { getCurrentUser } from '../services/authService'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: LandingPage },
    { path: '/upload', name: 'upload', component: UploadQuiz, meta: { requiresAuth: true } },
    { path: '/quiz/:quizId?', name: 'quiz', component: TakeQuiz, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: Register, meta: { guestOnly: true } }
  ],
})

router.beforeEach(async (to) => {
  const needsCheck = to.meta?.requiresAuth || to.meta?.guestOnly
  if (!needsCheck) return

  let user = null
  try {
    user = await getCurrentUser()
  } catch {
    user = null
  }

  if (to.meta?.requiresAuth && !user) {
    return { name: 'login', replace: true }
  }
  if (user && (to.meta?.guestOnly || to.name === 'home')) {
    return { name: 'upload', replace: true }
  }
})

export default router
