<template>
  <div class="job-detail">
    <div v-if="loading" class="loading">
      Loading job details...
    </div>
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    <div v-else>
      <div class="job-header">
        <h1>{{ job.job_number }} - {{ job.name }}</h1>
      </div>

      <div class="tasks-section">
        <h2>Tasks</h2>
        <div v-if="!job.tasks?.length" class="no-tasks">
          No tasks found for this job.
        </div>
        <div v-else class="tasks-table">
          <table>
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in job.tasks" :key="task.id">
                <td>{{ task.name }}</td>
                <td>
                  <span :class="['status', task.complete ? 'complete' : 'incomplete']">
                    {{ task.complete ? 'Complete' : 'Incomplete' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

export default {
  name: 'JobDetailView',
  setup() {
    const route = useRoute()
    const job = ref({})
    const loading = ref(true)
    const error = ref(null)

    const fetchJobDetail = async () => {
      try {
        loading.value = true
        error.value = null
        console.log('Fetching job:', route.params.jobId)
        
        const { data } = await axios.get(`/api/jobs/${route.params.jobId}/`)
        console.log('Job data:', data)
        job.value = data
      } catch (err) {
        console.error('Error fetching job:', err)
        error.value = err.response?.data?.error || 'Failed to load job details'
      } finally {
        loading.value = false
      }
    }

    onMounted(fetchJobDetail)

    return {
      job,
      loading,
      error
    }
  }
}
</script>

<style lang="scss" scoped>
.job-detail {
  padding: 2rem;

  .loading, .error {
    text-align: center;
    padding: 2rem;
    color: #666;
  }

  .error {
    color: #d32f2f;
  }

  .job-header {
    margin-bottom: 2rem;
    h1 {
      font-size: 1.8rem;
      color: #333;
    }
  }

  .tasks-section {
    background: white;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;

    h2 {
      margin-bottom: 1rem;
      font-size: 1.2rem;
      color: #333;
    }

    .no-tasks {
      text-align: center;
      padding: 2rem;
      color: #666;
    }

    .tasks-table {
      table {
        width: 100%;
        border-collapse: collapse;

        th, td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        th {
          font-weight: 500;
          color: #666;
        }

        .status {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.9rem;

          &.complete {
            background: #e8f5e9;
            color: #2e7d32;
          }

          &.incomplete {
            background: #fafafa;
            color: #666;
          }
        }
      }
    }
  }
}
</style> 