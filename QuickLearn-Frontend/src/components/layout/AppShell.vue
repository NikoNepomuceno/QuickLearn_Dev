<script setup>
import { computed } from 'vue'
import Sidebar from '@/components/Sidebar.vue'

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  contentWidth: {
    type: String,
    default: 'default' // default, narrow, full
  }
})

const contentClass = computed(() => {
  switch (props.contentWidth) {
    case 'narrow':
      return 'app-shell__content app-shell__content--narrow'
    case 'wide':
      return 'app-shell__content app-shell__content--wide'
    case 'full':
      return 'app-shell__content app-shell__content--full'
    default:
      return 'app-shell__content'
  }
})
</script>

<template>
  <div class="app-shell">
    <Sidebar class="app-shell__sidebar" />
    <div class="app-shell__main">
      <main :class="contentClass">
        <slot />
      </main>

      <footer v-if="$slots.footer" class="app-shell__footer">
        <slot name="footer" />
      </footer>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  gap: 0;
  background: transparent;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

@supports (height: 100dvh) {
  .app-shell {
    min-height: 100dvh;
    height: 100dvh;
    max-height: 100dvh;
  }
}

.app-shell__sidebar {
  flex-shrink: 0;
  width: var(--sidebar-width);
}

.app-shell__main {
  flex: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  background: transparent;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-gutter: stable;
}

.app-shell__content {
  flex: 1;
  width: 100%;
  max-width: var(--layout-max-width);
  margin: var(--space-8) auto;
  padding: 0 var(--layout-gutter) var(--space-12);
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.app-shell__content--wide {
  max-width: var(--layout-wide-width);
}

.app-shell__content--narrow {
  max-width: 880px;
}

.app-shell__content--full {
  max-width: none;
}

.app-shell__footer {
  padding: 0 var(--layout-gutter) var(--space-8);
  margin: 0 auto;
  width: 100%;
  max-width: var(--layout-wide-width);
}

@media (max-width: 1280px) {
  .app-shell__sidebar {
    width: 240px;
  }
}

@media (max-width: 640px) {
  .app-shell {
    height: auto;
    max-height: none;
    flex-direction: column;
  }

  .app-shell__sidebar {
    width: 100%;
  }

  .app-shell__main {
    min-height: auto;
    height: auto;
    overflow: visible;
  }

  .app-shell__content {
    padding-bottom: var(--space-10);
  }
}

@media (max-width: 768px) {
  .app-shell__content {
    padding-bottom: var(--space-8);
    gap: var(--space-5);
  }
}
</style>

