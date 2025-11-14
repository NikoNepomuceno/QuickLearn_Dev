<script setup>
import { ref, computed, watch } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Search, X, Filter } from 'lucide-vue-next'

const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  availableTopics: {
    type: Array,
    default: () => []
  },
  availableCategories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update-filters', 'clear-filters'])

const localFilters = ref({
  topic: props.filters.topic || null,
  category: props.filters.category || null,
  difficulty: [...(props.filters.difficulty || [])],
  type: [...(props.filters.type || [])],
  search: props.filters.search || ''
})

const difficultyOptions = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
]

const typeOptions = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True/False' },
  { value: 'identification', label: 'Identification' },
  { value: 'enumeration', label: 'Enumeration' }
]

const hasActiveFilters = computed(() => {
  return (
    localFilters.value.topic ||
    localFilters.value.category ||
    localFilters.value.difficulty.length > 0 ||
    localFilters.value.type.length > 0 ||
    localFilters.value.search.trim().length > 0
  )
})

watch(() => props.filters, (newFilters) => {
  localFilters.value = {
    topic: newFilters.topic || null,
    category: newFilters.category || null,
    difficulty: [...(newFilters.difficulty || [])],
    type: [...(newFilters.type || [])],
    search: newFilters.search || ''
  }
}, { deep: true })

function toggleDifficulty(difficulty) {
  const index = localFilters.value.difficulty.indexOf(difficulty)
  if (index > -1) {
    localFilters.value.difficulty.splice(index, 1)
  } else {
    localFilters.value.difficulty.push(difficulty)
  }
  applyFilters()
}

function toggleType(type) {
  const index = localFilters.value.type.indexOf(type)
  if (index > -1) {
    localFilters.value.type.splice(index, 1)
  } else {
    localFilters.value.type.push(type)
  }
  applyFilters()
}

function applyFilters() {
  emit('update-filters', { ...localFilters.value })
}

function clearFilters() {
  localFilters.value = {
    topic: null,
    category: null,
    difficulty: [],
    type: [],
    search: ''
  }
  emit('clear-filters')
}

function handleSearchInput() {
  // Debounce search - apply after user stops typing
  clearTimeout(window.searchTimeout)
  window.searchTimeout = setTimeout(() => {
    applyFilters()
  }, 500)
}
</script>

<template>
  <BaseCard padding="lg" class="filters-card">
    <div class="filters-header">
      <div class="filters-header__title">
        <Filter :size="18" />
        <h3>Filters</h3>
      </div>
      <BaseButton
        v-if="hasActiveFilters"
        variant="outline"
        size="sm"
        @click="clearFilters"
      >
        <X :size="14" />
        Clear
      </BaseButton>
    </div>

    <div class="filters-content">
      <!-- Search -->
      <div class="filter-group">
        <label class="filter-label">Search</label>
        <div class="search-input-wrapper">
          <Search :size="16" class="search-icon" />
          <input
            v-model="localFilters.search"
            type="text"
            placeholder="Search questions..."
            class="search-input"
            @input="handleSearchInput"
          />
        </div>
      </div>

      <!-- Topic -->
      <div class="filter-group">
        <label class="filter-label">Topic</label>
        <select
          v-model="localFilters.topic"
          class="filter-select"
          @change="applyFilters"
        >
          <option :value="null">All Topics</option>
          <option
            v-for="topic in availableTopics"
            :key="topic"
            :value="topic"
          >
            {{ topic }}
          </option>
        </select>
      </div>

      <!-- Category -->
      <div class="filter-group">
        <label class="filter-label">Category</label>
        <select
          v-model="localFilters.category"
          class="filter-select"
          @change="applyFilters"
        >
          <option :value="null">All Categories</option>
          <option
            v-for="category in availableCategories"
            :key="category"
            :value="category"
          >
            {{ category }}
          </option>
        </select>
      </div>

      <!-- Difficulty -->
      <div class="filter-group">
        <label class="filter-label">Difficulty</label>
        <div class="checkbox-group">
          <label
            v-for="option in difficultyOptions"
            :key="option.value"
            class="checkbox-label"
          >
            <input
              type="checkbox"
              :checked="localFilters.difficulty.includes(option.value)"
              @change="toggleDifficulty(option.value)"
            />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </div>

      <!-- Question Type -->
      <div class="filter-group">
        <label class="filter-label">Question Type</label>
        <div class="checkbox-group">
          <label
            v-for="option in typeOptions"
            :key="option.value"
            class="checkbox-label"
          >
            <input
              type="checkbox"
              :checked="localFilters.type.includes(option.value)"
              @change="toggleType(option.value)"
            />
            <span>{{ option.label }}</span>
          </label>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.filters-card {
  position: sticky;
  top: 20px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
}

.filters-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}

.filters-header__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.filters-header__title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.filters-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.search-input-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-surface);
  color: var(--color-text);
  transition: border-color 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.filter-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text);
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.checkbox-label:hover {
  color: var(--color-primary);
}

/* Dark mode */
body.dark .search-input,
body.dark .filter-select {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
  color: var(--color-text);
}
</style>

