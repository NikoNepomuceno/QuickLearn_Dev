<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isLoading = ref(false)
const loadingText = ref('')

// Global loading state management
const showLoader = (text = 'Loading...') => {
  loadingText.value = text
  isLoading.value = true
}

const hideLoader = () => {
  isLoading.value = false
  loadingText.value = ''
}

// Expose methods globally
onMounted(() => {
  window.$loader = {
    show: showLoader,
    hide: hideLoader
  }
})

onUnmounted(() => {
  if (window.$loader) {
    delete window.$loader
  }
})
</script>

<template>
  <BeatLoader 
    v-if="isLoading"
    :loading="isLoading"
    :text="loadingText"
    color="#667eea"
    size="20px"
    :overlay="true"
  />
</template>

<style scoped>
/* BeatLoader overlay styles are handled in the component */
</style>
