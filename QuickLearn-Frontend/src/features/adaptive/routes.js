/**
 * Adaptive quiz feature routes
 */

export const adaptiveRoutes = [
  {
    path: '/adaptive/:sessionId',
    name: 'adaptive-quiz',
    component: () => import('./pages/AdaptiveQuiz.vue'),
    meta: {
      requiresAuth: true
    }
  },
  {
    path: '/adaptive/:sessionId/summary',
    name: 'adaptive-summary',
    component: () => import('./pages/AdaptiveQuizSummary.vue'),
    meta: {
      requiresAuth: true
    }
  }
]

