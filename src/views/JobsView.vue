<template>
  <div class="jobs-container">
    <div class="jobs-header">
      <h1>Job Manager</h1>
    </div>

    <div class="jobs-tabs">
      <button 
        class="tab-button"
        :class="{ active: currentTab === 'my-jobs' }"
        @click="currentTab = 'my-jobs'"
      >
        My Jobs
      </button>
      <button 
        class="tab-button"
        :class="{ active: currentTab === 'all-jobs' }"
        @click="currentTab = 'all-jobs'"
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
              v-for="job in processedJobs" 
              :key="job.uuid"
              @click="goToJobDetail(job.job_number)"
              class="job-row"
            >
              <td>{{ job.job_number }}</td>
              <td>{{ job.client ? job.client.name : 'Unknown Client' }}</td>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { mqttJobsService } from '@/services/mqtt-jobs'

export default {
  name: 'JobsView',
  setup() {
    const store = useStore()
    const router = useRouter()
    const currentTab = ref('my-jobs')
    const loading = ref(true)
    const error = ref(null)

    // Use the getMyJobs computed property from the service
    const myJobs = mqttJobsService.getMyJobs()

    const allJobs = mqttJobsService.getAllJobs()

    const displayedJobs = computed(() => {
      return currentTab.value === 'my-jobs' ? myJobs.value : allJobs.value
    })

    // Process jobs to clean up display
    const processedJobs = computed(() => {
      return displayedJobs.value.map(job => ({
        uuid: job.uuid,
        job_number: job.job_number,
        name: job.name,
        client: job.client,
        status: job.status,
        due_date: job.due_date
      }))
    })

    const formatDate = (dateString) => {
      if (!dateString) return ''
      return new Date(dateString).toLocaleDateString()
    }

    const goToJobDetail = (jobId) => {
      router.push(`/jobs/${jobId}`)
    }

    onMounted(() => {
      if (mqttJobsService.jobs.value.length === 0) {
        mqttJobsService.connect()
      }
      loading.value = false
    })

    onUnmounted(() => {
      mqttJobsService.disconnect()
    })

    return {
      currentTab,
      processedJobs,
      loading,
      error,
      formatDate,
      goToJobDetail,
      mqttJobsService
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