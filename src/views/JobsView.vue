<template>
  <div class="jobs-container">
    <div class="jobs-header">
      <h1>Job Manager</h1>
    </div>

    <div class="jobs-tabs">
      <button 
        class="tab-button active"
        @click="currentTab = 'my-jobs'"
      >
        My Jobs
      </button>
      <button 
        class="tab-button"
        @click="currentTab = 'all-jobs'"
        disabled
      >
        All Jobs
      </button>
    </div>

    <div class="jobs-content">
      <div v-if="loading" class="loading">
        Loading jobs...
      </div>
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      <div v-else class="jobs-table">
        <table>
          <thead>
            <tr>
              <th>Job No.</th>
              <th>Client</th>
              <th>Job Name</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="job in myJobs" 
              :key="job.id"
              @click="goToJobDetail(job.job_number)"
              class="job-row"
            >
              <td>{{ job.job_number }}</td>
              <td>{{ job.client_name }}</td>
              <td>{{ job.name }}</td>
              <td>{{ job.status }}</td>
              <td>{{ formatDate(job.due_date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'
import { useRouter } from 'vue-router'

export default {
  name: 'JobsView',
  setup() {
    const store = useStore()
    const router = useRouter()
    const currentTab = ref('my-jobs')
    const myJobs = ref([])
    const loading = ref(true)
    const error = ref(null)

    const fetchMyJobs = async () => {
      try {
        loading.value = true
        error.value = null
        
        const user = store.getters['auth/getUser']
        console.log('Current user:', user)  // Debug log
        
        if (!user?.profile?.staff_uuid) {
          console.error('Missing user data:', {
            user: user,
            profile: user?.profile,
            staff_uuid: user?.profile?.staff_uuid
          })
          throw new Error('No staff UUID found')
        }

        const url = `/api/jobs/my-jobs/${user.profile.staff_uuid}/`
        console.log('Fetching jobs from:', url)  // Debug log
        
        const response = await axios.get(url)
        console.log('Jobs response:', response.data)  // Debug log
        myJobs.value = response.data
      } catch (err) {
        console.error('Error fetching jobs:', err)
        error.value = err.message || 'Failed to load jobs'
      } finally {
        loading.value = false
      }
    }

    const formatDate = (dateString) => {
      if (!dateString) return ''
      return new Date(dateString).toLocaleDateString()
    }

    const goToJobDetail = (jobId) => {
      router.push(`/jobs/${jobId}`)
    }

    onMounted(fetchMyJobs)

    return {
      currentTab,
      myJobs,
      loading,
      error,
      formatDate,
      goToJobDetail
    }
  }
}
</script>

<style lang="scss" scoped>
.jobs-container {
  padding: 2rem;

  .jobs-header {
    margin-bottom: 2rem;
    h1 {
      font-size: 1.8rem;
      color: #333;
    }
  }

  .jobs-tabs {
    margin-bottom: 1rem;
    border-bottom: 1px solid #e0e0e0;

    .tab-button {
      padding: 0.75rem 1.5rem;
      border: none;
      background: none;
      font-size: 1rem;
      cursor: pointer;
      color: #666;
      border-bottom: 2px solid transparent;
      margin-right: 1rem;

      &.active {
        color: #2E7D32;
        border-bottom-color: #2E7D32;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }

  .jobs-table {
    background: white;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow-x: auto;

    table {
      width: 100%;
      border-collapse: collapse;

      th, td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #e0e0e0;
      }

      th {
        background: #f5f5f5;
        font-weight: 500;
        color: #333;
      }

      tr:hover {
        background: #f9f9f9;
      }
    }
  }

  .loading, .error {
    padding: 2rem;
    text-align: center;
    color: #666;
  }

  .error {
    color: #d32f2f;
  }

  .job-row {
    cursor: pointer;
    
    &:hover {
      background: #f5f5f5;
    }
  }
}
</style> 