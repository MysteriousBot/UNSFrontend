<template>
  <div class="staff-detail">
    <div class="staff-header">
      <h1>{{ staff?.name || 'Loading...' }}</h1>
    </div>

    <div class="tabs-container">
      <div class="tab-buttons">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab-button', { active: currentTab === tab.id }]"
          @click="currentTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </div>

      <!-- Dashboard Tab -->
      <div v-if="currentTab === 'dashboard'" class="tab-content">
        <DashboardView :staff-uuid="staffId" :admin-view="true" />
      </div>

      <!-- Timesheet Tab -->
      <div v-else-if="currentTab === 'timesheet'" class="tab-content">
        <WeeklyTimesheetView :staff-uuid="staffId" :admin-view="true" />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import DashboardView from './DashboardView.vue'
import WeeklyTimesheetView from './WeeklyTimesheetView.vue'

export default {
  name: 'StaffDetailView',
  components: {
    DashboardView,
    WeeklyTimesheetView
  },
  setup() {
    const route = useRoute()
    const staffId = route.params.staffId
    const staff = ref(null)
    const currentTab = ref('dashboard')
    const loading = ref(true)
    const error = ref(null)

    const tabs = [
      { id: 'dashboard', name: 'Dashboard' },
      { id: 'timesheet', name: 'Timesheet' }
    ]

    const fetchStaffDetails = async () => {
      try {
        const { data } = await axios.get(`/api/admin/staff/${staffId}/`)
        staff.value = data
      } catch (err) {
        console.error('Error fetching staff details:', err)
        error.value = 'Failed to load staff details'
      } finally {
        loading.value = false
      }
    }

    onMounted(fetchStaffDetails)

    return {
      staff,
      staffId,
      currentTab,
      tabs,
      loading,
      error
    }
  }
}
</script>

<style lang="scss" scoped>
.staff-detail {
  .staff-header {
    margin-bottom: 2rem;
    h1 {
      font-size: 1.8rem;
      color: #333;
    }
  }

  .tabs-container {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);

    .tab-buttons {
      display: flex;
      border-bottom: 1px solid #e0e0e0;
      background: #f5f5f5;
      padding: 0 1rem;

      .tab-button {
        padding: 1rem 1.5rem;
        border: none;
        background: none;
        cursor: pointer;
        color: #666;
        font-size: 1rem;
        
        &.active {
          color: #2E7D32;
          border-bottom: 2px solid #2E7D32;
          margin-bottom: -1px;
        }

        &:hover:not(.active) {
          color: #333;
        }
      }
    }

    .tab-content {
      padding: 1.5rem;
    }
  }
}
</style> 