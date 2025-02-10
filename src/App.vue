<template>
  <AppLayout>
    <router-view></router-view>
  </AppLayout>
</template>

<script>
import AppLayout from '@/components/AppLayout.vue'
import { useStore } from 'vuex'
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from '@/utils/axios'  // Import configured axios

export default {
  name: 'App',
  components: {
    AppLayout
  },
  setup() {
    const store = useStore()
    const router = useRouter()

    onMounted(async () => {
      // Set document title
      document.title = 'Timekeeper'
      
      try {
        // Try to initialize auth state
        await store.dispatch('auth/initializeAuth')
      } catch (error) {
        console.error('Auth initialization failed:', error)
        // If initialization fails, redirect to login
        if (router.currentRoute.value.path !== '/login') {
          router.push('/login')
        }
      }
    })
  }
}
</script>

<style lang="scss">
// Reset and base styles
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f5f5f5;
}

#app {
  min-height: 100vh;
}

// Top Navigation
.top-nav {
  background-color: #2E7D32;
  color: white;
  padding: 0.75rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .nav-left {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: 250px;

    .nav-logo {
      height: 30px;
    }

    .org-label {
      color: white;
      padding: 0.5rem;
      font-size: 1.1rem;
    }
  }

  .nav-center {
    display: flex;
    gap: 2rem;
    justify-content: center;
    flex: 1;
    margin: 0 1rem;

    a {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1rem;
      font-size: 1.2rem;
      font-weight: 500;
      
      &.router-link-active {
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 4px;
      }
    }
  }

  .nav-right {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 200px;

    .user-menu {
      margin-left: auto;
      height: 100%;
      display: flex;
      align-items: center;
      position: relative;

      .user-btn {
        background: #E1BEE7;
        color: #4A148C;
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        font-size: 1.1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;

        &:hover {
          background: #CE93D8;
        }
      }

      .dropdown-menu {
        position: absolute;
        top: calc(100% + 0.5rem);
        right: 0;
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        min-width: 150px;
        z-index: 1000;

        .dropdown-item {
          width: 100%;
          padding: 0.75rem 1rem;
          text-align: left;
          border: none;
          background: none;
          cursor: pointer;
          color: #333;

          &:hover {
            background: #f5f5f5;
          }
        }
      }
    }
  }
}
</style>
