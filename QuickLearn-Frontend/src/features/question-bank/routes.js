/**
 * Question Bank feature routes
 */

export const questionBankRoutes = [
  {
    path: '/question-bank',
    name: 'question-bank',
    component: () => import('./pages/QuestionBank.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/question-bank/build',
    name: 'custom-quiz-builder',
    component: () => import('./pages/CustomQuizBuilder.vue'),
    meta: {
      requiresAuth: true
    }
  }
]

