<script setup>
import BeatLoader from 'vue-spinner/src/BeatLoader.vue'

defineProps({
  loading: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: '#667eea'
  },
  size: {
    type: String,
    default: '15px'
  },
  margin: {
    type: String,
    default: '2px'
  },
  overlay: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: ''
  }
})
</script>

<template>
  <div v-if="loading" class="beat-loader-container" :class="{ overlay: overlay }">
    <div class="beat-loader-content">
      <BeatLoader 
        :color="color" 
        :size="size" 
        :margin="margin"
      />
      <p v-if="text" class="beat-loader-text">{{ text }}</p>
    </div>
  </div>
</template>

<style scoped>
.beat-loader-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.beat-loader-container.overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  padding: 0;
}

.beat-loader-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.beat-loader-text {
  margin: 0;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
}

/* Dark mode styles */
body.dark .beat-loader-container.overlay {
  background: rgba(15, 23, 42, 0.7);
}

body.dark .beat-loader-text {
  color: #9ca3af;
}
</style>
