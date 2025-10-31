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
import Trash from '../views/Trash.vue'
import { getCurrentUser } from '../services/authService'
import VerifyEmail from '../views/VerifyEmail.vue'
import SettingsPage from '@/views/SettingsPage.vue'
import UserProfile from '@/views/UserProfile.vue'
import NotesPage from '@/views/NotesPage.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: LandingPage },
    { path: '/upload', name: 'upload', component: UploadQuiz, meta: { requiresAuth: true } },
    { path: '/quiz/:quizId?', name: 'quiz', component: TakeQuiz, meta: { requiresAuth: true } },
    { path: '/quiz/:quizId/results', name: 'quiz-results', component: QuizResults, meta: { requiresAuth: true } },
    { path: '/my-quizzes', name: 'my-quizzes', component: MyQuizzes, meta: { requiresAuth: true } },
    { path: '/trash', name: 'trash', component: Trash, meta: { requiresAuth: true } },
    { path: '/login', name: 'login', component: Login, meta: { guestOnly: true } },
    { path: '/register', name: 'register', component: Register, meta: { guestOnly: true } },
    { path: '/forgot-password', name: 'forgot-password', component: ForgotPassword, meta: { guestOnly: true } },
    { path: '/reset-password', name: 'reset-password', component: ResetPassword, meta: { guestOnly: true } },
    { path: '/verify-email', name: 'verify-email', component: VerifyEmail, meta: { guestOnly: true } },
    { path: '/settings', name: 'settings', component: SettingsPage, meta: { requiresAuth: true }},
    { path: '/user-profile', name: 'user-profile', component: UserProfile, meta: { requiresAuth: true } },
    { path: '/notes', name: 'notes', component: NotesPage, meta: { requiresAuth: true } }
  ],
})

router.beforeEach(async (to, from) => {
  const needsCheck = to.meta?.requiresAuth || to.meta?.guestOnly
  if (!needsCheck) return

  let user = null

  const shouldCheckAuth = to.meta?.requiresAuth ||
    (to.meta?.guestOnly && (!from.meta?.guestOnly || from.name === undefined))

  if (shouldCheckAuth) {
    try {
      user = await getCurrentUser()
    } catch {
      user = null
    }
  }

  if (to.meta?.requiresAuth && !user) {
    return { name: 'login', replace: true }
  }

  if (to.name === 'verify-email') {
    try {
      const flag = sessionStorage.getItem('verifyEmailPending')
      const cameFromRegister = from.name === 'register'
      if (!flag && !cameFromRegister) {
        return { name: 'register', replace: true }
      }
    } catch {}
  }

  if (user && (to.meta?.guestOnly || to.name === 'home')) {
    return { name: 'upload', replace: true }
  }
})

export default router
