<template>
  <div class="app-layout">
    <nav class="navbar">
      <div class="container">
        <div class="nav-left">
          <img src="@/assets/logo.png" alt="NeoMatrix" class="logo" />
          <span class="company-name">NeoMatrix, Inc.</span>
        </div>
        <div class="nav-center">
          <router-link 
            to="/dashboard"
            :class="{ active: $route.meta.activeNav === 'dashboard' || $route.path === '/dashboard' }"
          >
            Dashboard
          </router-link>
          <router-link 
            to="/clients"
            :class="{ active: $route.meta.activeNav === 'clients' || $route.path === '/clients' }"
          >
            Clients
          </router-link>
          <router-link 
            to="/jobs"
            :class="{ active: $route.meta.activeNav === 'jobs' || $route.path.startsWith('/jobs') }"
          >
            Jobs
          </router-link>
        </div>
        <div class="nav-right">
          <div v-if="isAuthenticated" class="user-menu">
            <button @click="toggleDropdown" class="user-btn">
              {{ userInitials }}
            </button>
            <div v-if="showDropdown" class="dropdown-menu">
              <button @click="handleLogout" class="dropdown-item">
                Log out
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
    <main class="main-content">
      <div class="container">
        <slot></slot>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'

export default {
  name: 'AppLayout',
  setup() {
    const store = useStore()
    const router = useRouter()
    const showDropdown = ref(false)

    const isAuthenticated = computed(() => store.getters['auth/isAuthenticated'])
    const user = computed(() => store.getters['auth/getUser'])
    const userInitials = computed(() => {
      const firstName = user.value?.first_name || ''
      const lastName = user.value?.last_name || ''
      if (firstName && lastName) {
        return (firstName[0] + lastName[0]).toUpperCase()
      }
      return user.value?.username?.[0].toUpperCase() || '?'
    })

    const toggleDropdown = () => {
      showDropdown.value = !showDropdown.value
    }

    const handleLogout = async () => {
      await store.dispatch('auth/logout')
      router.push('/login')
    }

    // Close dropdown when clicking outside
    const closeDropdown = (e) => {
      if (!e.target.closest('.user-menu')) {
        showDropdown.value = false
      }
    }

    // Add/remove click listener
    if (typeof window !== 'undefined') {
      window.addEventListener('click', closeDropdown)
    }

    return {
      isAuthenticated,
      userInitials,
      showDropdown,
      toggleDropdown,
      handleLogout
    }
  }
}
</script>

<style lang="scss" scoped>
.app-layout {
  min-height: 100vh;
  background-color: #f5f5f5;

  .container {
    max-width: 1200px;
    margin: 0 auto;
    width: 100%;
    padding: 0 1rem;
  }

  .navbar {
    background-color: #2E7D32;
    padding: 0.75rem 0;
    color: white;

    .container {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .nav-left {
      display: flex;
      align-items: center;
      gap: 1rem;
      width: 200px;

      .logo {
        height: 32px;
      }

      .company-name {
        font-weight: 500;
      }
    }

    .nav-center {
      flex: 1;
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin: 0 2rem;

      a {
        color: white;
        text-decoration: none;
        font-weight: 500;
        padding: 0.5rem 0;

        &.active {
          border-bottom: 2px solid white;
        }

        &:hover {
          opacity: 0.9;
        }
      }
    }

    .nav-right {
      width: 200px;
      display: flex;
      justify-content: flex-end;

      .user-menu {
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

  .main-content {
    padding: 2rem 0;
  }
}

// Add responsive behavior
@media (max-width: 1232px) {
  .app-layout {
    .container {
      padding: 0 2rem;
    }
  }
}

@media (max-width: 800px) {
  .app-layout {
    .container {
      padding: 0 1rem;
      min-width: auto;
    }
  }
}
</style> 