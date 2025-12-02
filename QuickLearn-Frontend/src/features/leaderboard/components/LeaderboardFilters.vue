<script setup>
import { ref, computed, watch } from 'vue'
import BaseCard from '@/components/ui/BaseCard.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Filter, X, ChevronDown, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  selectedCategoryKey: {
    type: String,
    default: null
  },
  groupedCategories: {
    type: Array,
    default: () => []
  },
  hasCategories: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select-category', 'clear-filter'])

const expandedParents = ref(new Set())

// Auto-expand parent of selected category
watch(() => props.selectedCategoryKey, (newKey) => {
  if (newKey && props.groupedCategories.length > 0) {
    const selectedGroup = props.groupedCategories.find(group =>
      group.categories.some(cat => cat.categoryKey === newKey)
    )
    if (selectedGroup) {
      expandedParents.value.add(selectedGroup.parentName)
    }
  }
}, { immediate: true })

function toggleParent(parentName) {
  if (expandedParents.value.has(parentName)) {
    expandedParents.value.delete(parentName)
  } else {
    expandedParents.value.add(parentName)
  }
}

function isParentExpanded(parentName) {
  return expandedParents.value.has(parentName)
}

function selectCategory(categoryKey) {
  emit('select-category', categoryKey)
}

function clearFilter() {
  emit('clear-filter')
}

const hasActiveFilter = computed(() => {
  return props.selectedCategoryKey !== null
})
</script>

<template>
  <BaseCard padding="lg" class="filters-card">
    <div class="filters-header">
      <div class="filters-header__title">
        <Filter :size="18" />
        <h3>Filters</h3>
      </div>
      <BaseButton
        v-if="hasActiveFilter"
        variant="outline"
        size="sm"
        @click="clearFilter"
      >
        <X :size="14" />
        Clear
      </BaseButton>
    </div>

    <div class="filters-content">
      <!-- Overall Option -->
      <div class="filter-group">
        <label class="filter-label">Focus</label>
        <button
          class="filter-option"
          :class="{ active: !selectedCategoryKey }"
          type="button"
          @click="selectCategory(null)"
        >
          <span>Overall</span>
        </button>
      </div>

      <!-- Category Groups -->
      <div v-if="hasCategories" class="filter-group">
        <label class="filter-label">Categories</label>
        <div class="category-groups">
          <div
            v-for="group in groupedCategories"
            :key="group.parentName"
            class="category-group"
          >
            <button
              class="category-parent"
              :class="{
                active: selectedCategoryKey && group.categories.some(c => c.categoryKey === selectedCategoryKey),
                expanded: isParentExpanded(group.parentName)
              }"
              type="button"
              @click="toggleParent(group.parentName)"
            >
              <span class="parent-icon">
                <ChevronRight
                  v-if="!isParentExpanded(group.parentName)"
                  :size="16"
                />
                <ChevronDown
                  v-else
                  :size="16"
                />
              </span>
              <span class="parent-name">{{ group.parentName }}</span>
            </button>
            <Transition name="category-expand">
              <div
                v-if="isParentExpanded(group.parentName)"
                class="category-children"
              >
                <button
                  v-for="category in group.categories"
                  :key="category.categoryKey"
                  class="category-child"
                  :class="{ active: selectedCategoryKey === category.categoryKey }"
                  type="button"
                  @click="selectCategory(category.categoryKey)"
                >
                  <span class="child-name">{{ category.categoryLabel }}</span>
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <div v-else class="filter-empty">
        <p>No specialty categories yet. Keep taking categorized quizzes to unlock comparisons.</p>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.filters-card {
  /* Sticky positioning is handled by parent .leaderboard-sidebar */
  height: 100%;
  /* Subtle scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.3) transparent;
}

.filters-card::-webkit-scrollbar {
  width: 6px;
}

.filters-card::-webkit-scrollbar-track {
  background: transparent;
}

.filters-card::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
  transition: background 0.2s ease;
}

.filters-card::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
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
  gap: 24px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.filter-option {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-option:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-emphasis);
  color: var(--color-primary);
}

.filter-option.active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-color: var(--color-primary);
  box-shadow: var(--primary-glow);
}

.category-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-group {
  display: flex;
  flex-direction: column;
}

.category-parent {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 14px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-parent:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-emphasis);
  color: var(--color-primary);
}

.category-parent.active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-color: var(--color-primary);
  box-shadow: var(--primary-glow);
}

.parent-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: transform var(--transition-base);
}

.category-parent.expanded .parent-icon {
  transform: rotate(0deg);
}

.parent-name {
  flex: 1;
  text-align: left;
  font-weight: 600;
}

.category-children {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
  margin-left: 24px;
  padding-left: 12px;
  border-left: 2px solid var(--color-border);
}

.category-child {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface-subtle);
  color: var(--color-text);
  font-size: 13px;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.category-child:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-emphasis);
  color: var(--color-primary);
}

.category-child.active {
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  border-color: var(--color-primary);
}

.child-name {
  flex: 1;
  text-align: left;
}

.filter-empty {
  padding: 12px;
  background: var(--color-surface-subtle);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.filter-empty p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.5;
}

/* Expand/collapse animation */
.category-expand-enter-active,
.category-expand-leave-active {
  transition: all var(--transition-base);
  overflow: hidden;
}

.category-expand-enter-from,
.category-expand-leave-to {
  opacity: 0;
  max-height: 0;
  margin-top: 0;
  padding-top: 0;
  padding-bottom: 0;
}

.category-expand-enter-to,
.category-expand-leave-from {
  opacity: 1;
  max-height: 500px;
}

/* Dark mode */
body.dark .filter-option,
body.dark .category-parent,
body.dark .category-child {
  background: var(--color-surface);
  border-color: var(--color-border);
  color: var(--color-text);
}

body.dark .filter-option:hover,
body.dark .category-parent:hover,
body.dark .category-child:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-emphasis);
  color: var(--color-primary-soft);
}

body.dark .category-child {
  background: var(--color-surface-subtle);
}

body.dark .category-children {
  border-left-color: var(--color-border);
}

body.dark .filter-empty {
  background: var(--color-surface-subtle);
  border-color: var(--color-border);
}

body.dark .filters-card {
  scrollbar-color: rgba(148, 163, 184, 0.2) transparent;
}

body.dark .filters-card::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.2);
}

body.dark .filters-card::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.4);
}
</style>

