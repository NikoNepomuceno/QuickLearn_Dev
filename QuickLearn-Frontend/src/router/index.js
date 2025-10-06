import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../views/LandingPage.vue'
import UploadQuiz from '../views/UploadQuiz.vue'
import TakeQuiz from '../views/TakeQuiz.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import ForgotPassword from '../views/ForgotPassword.vue'
import ResetPassword from '../views/ResetPassword.vue'
import MyQuizzes from '../views/MyQuizzes.vue'
import QuizResults from '../views/QuizResults.vue'
import { getCurrentUser } from '../services/authService'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: LandingPage },
    { path: '/upload', name: 'upload', component: UploadQuiz, meta: { requiresAuth: true } },
    { path: '/quiz/:quizId?', name: 'quiz', component: TakeQuiz, meta: { requiresAuth: true } },
    { path: '/quiz/:quizId/results', name: 'quiz-results', component: QuizResults, meta: { requiresAuth: true } },
    { path: '/my-quizzes', name: 'my-quizzes', component: MyQuizzes, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: Register, meta: { guestOnly: true } },
    { path: '/forgot-password', name: 'forgot-password', component: ForgotPassword, meta: { guestOnly: true } },
    { path: '/reset-password', name: 'reset-password', component: ResetPassword, meta: { guestOnly: true } }
  ],
})

router.beforeEach(async (to, from) => {
  // Skip auth check for routes that don't require it
  const needsCheck = to.meta?.requiresAuth || to.meta?.guestOnly
  if (!needsCheck) return

  let user = null

  // Only check auth status if we actually need to know
  // For guest-only routes, we only need to check if coming from a non-guest route
  // or if we need to redirect authenticated users
  const shouldCheckAuth = to.meta?.requiresAuth ||
    (to.meta?.guestOnly && (!from.meta?.guestOnly || from.name === undefined))

  if (shouldCheckAuth) {
    try {
      user = await getCurrentUser()
    } catch {
      user = null
    }
  }

  // Redirect unauthenticated users away from protected routes
  if (to.meta?.requiresAuth && !user) {
    return { name: 'login', replace: true }
  }

  // Redirect authenticated users away from guest-only routes
  if (user && (to.meta?.guestOnly || to.name === 'home')) {
    return { name: 'upload', replace: true }
  }
})

export default router
