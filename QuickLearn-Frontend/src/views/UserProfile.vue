<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Sidebar from '@/components/Sidebar.vue';
import { useRoute, useRouter } from 'vue-router';
import BeatLoader from 'vue-spinner/src/BeatLoader.vue';

const router = useRouter()

</script>

<template>
  <div class="layout">
    <Sidebar />
    <div class="content">
      <div class="header">
        <h1>Profile</h1>
        <p class="subtitle">Manage your profile here.</p>
      </div>

      <!-- Loading State -->
       <div v-if="isLoading" class="loading">
        <BeatLoader
          :loading="true"
          text="Loading..."
          color="#667eea"
          size="20px"
        />
       </div>


    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  max-height: 100vh;
}

.content {
  flex: 1;
  padding: 24px;
}
</style>
