import { defineStore } from 'pinia'
import { fetchLeaderboard } from '../services/leaderboard.api'

function normalizeCategoryKey(label) {
  if (!label) return 'general'
  return String(label)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 190) || 'general'
}

function deriveCategoriesFromLeaders(leaders = []) {
  const categoryMap = new Map()

  leaders.forEach(entry => {
    const breakdown = Array.isArray(entry?.categoryBreakdown) ? entry.categoryBreakdown : []
    breakdown.forEach(cat => {
      const label = cat.categoryLabel || cat.topic || cat.subject || 'General'
      const key = cat.categoryKey || normalizeCategoryKey(label)
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryKey: key,
          categoryLabel: label,
          totalPoints: 0,
          participants: new Set()
        })
      }
      const bucket = categoryMap.get(key)
      bucket.totalPoints += Number(cat.totalPoints) || 0
      if (entry?.userId) {
        bucket.participants.add(entry.userId)
      }
    })
  })

  return Array.from(categoryMap.values())
    .map(bucket => ({
      categoryKey: bucket.categoryKey,
      categoryLabel: bucket.categoryLabel,
      totalPoints: bucket.totalPoints,
      participants: bucket.participants.size
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints)
}

export const useLeaderboardStore = defineStore('leaderboard', {
  state: () => ({
    leaders: [],
    availableCategories: [],
    activeCategoryKey: null,
    activeCategory: null,
    isLoading: false,
    error: null,
    lastUpdatedIso: null
  }),

  getters: {
    leadersWithFallback(state) {
      return state.leaders || []
    },
    hasCategories(state) {
      return (state.availableCategories || []).length > 0
    },
    lastUpdated(state) {
      if (!state.lastUpdatedIso) return null
      return new Date(state.lastUpdatedIso)
    }
  },

  actions: {
    async loadLeaderboard(categoryKey = null) {
      this.isLoading = true
      this.error = null
      try {
        const response = await fetchLeaderboard({
          categoryKey: categoryKey || undefined
        })
        this.leaders = response.data || []
        const apiCategories = response.availableCategories || []
        const derivedCategories = deriveCategoriesFromLeaders(this.leaders)
        this.availableCategories = apiCategories.length > 0 ? apiCategories : derivedCategories
        this.activeCategoryKey = response.categoryKey || null
        this.activeCategory =
          response.activeCategory ||
          this.availableCategories.find(cat => cat.categoryKey === this.activeCategoryKey) ||
          null
        this.lastUpdatedIso = new Date().toISOString()
      } catch (error) {
        this.error = error?.message || 'Failed to load leaderboard'
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async setCategory(categoryKey) {
      if ((categoryKey || null) === this.activeCategoryKey && this.leaders.length) {
        return
      }
      await this.loadLeaderboard(categoryKey)
    }
  }
})


