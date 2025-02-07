<template>
  <div class="job-detail">
    <div class="container">
      <div class="job-header">
        <h1>{{ jobId }} - {{ jobName }}</h1>
      </div>

      <div class="tasks-section">
        <h2>Tasks</h2>
        <div class="tasks-table">
          <table>
            <thead>
              <tr>
                <th class="name-col">Task Name</th>
                <th>Estimated Time</th>
                <th>Actual Time</th>
                <th>Remaining Time</th>
                <th>Status</th>
                <th class="actions-col"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task in tasks" :key="task.uuid">
                <td class="task-name">{{ task.name }}</td>
                <td class="time-col">{{ formatMinutes(task.estimated_minutes) }}</td>
                <td class="time-col">{{ formatMinutes(task.actual_minutes) }}</td>
                <td class="time-col">{{ formatMinutes(task.remaining_minutes) }}</td>
                <td class="status-col">
                  <div class="progress-bar-container">
                    <div 
                      class="progress-bar" 
                      :style="{ width: `${calculateProgress(task)}%` }"
                      :class="{ 'over-time': task.actual_minutes > task.estimated_minutes }"
                    ></div>
                  </div>
                </td>
                <td class="actions-col">
                  <button class="action-btn">
                    <i class="fas fa-ellipsis-v"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total</strong></td>
                <td class="time-col"><strong>{{ formatMinutes(totalEstimated) }}</strong></td>
                <td class="time-col"><strong>{{ formatMinutes(totalActual) }}</strong></td>
                <td class="time-col"><strong>{{ formatMinutes(totalRemaining) }}</strong></td>
                <td colspan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

export default {
  name: 'JobDetailView',
  setup() {
    const route = useRoute()
    const jobId = ref(route.params.jobId)
    const jobName = ref('')
    const tasks = ref([])
    const loading = ref(true)
    const error = ref(null)

    const totalEstimated = computed(() => 
      tasks.value.reduce((sum, task) => sum + (task.estimated_minutes || 0), 0)
    )

    const totalActual = computed(() => 
      tasks.value.reduce((sum, task) => sum + (task.actual_minutes || 0), 0)
    )

    const totalRemaining = computed(() => 
      tasks.value.reduce((sum, task) => sum + (task.remaining_minutes || 0), 0)
    )

    function formatMinutes(minutes) {
      if (!minutes) return '-'
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours}:${mins.toString().padStart(2, '0')}`
    }

    function calculateProgress(task) {
      if (!task.estimated_minutes) return 0
      const progress = (task.actual_minutes / task.estimated_minutes) * 100
      return Math.min(progress, 100)
    }

    async function fetchJobDetail() {
      try {
        loading.value = true
        const { data } = await axios.get(`/api/jobs/${jobId.value}/`)
        tasks.value = data.tasks
        jobName.value = data.job_name
      } catch (err) {
        error.value = 'Failed to load job details'
        console.error(err)
      } finally {
        loading.value = false
      }
    }

    onMounted(fetchJobDetail)

    return {
      jobId,
      jobName,
      tasks,
      loading,
      error,
      formatMinutes,
      calculateProgress,
      totalEstimated,
      totalActual,
      totalRemaining
    }
  }
}
</script>

<style lang="scss" scoped>
.job-detail {
  padding: 0;
  display: flex;
  justify-content: center;

  .container {
    width: 100%;
    min-width: 768px;

    .job-header {
      margin-bottom: 2rem;

      h1 {
        font-size: 2rem;
        color: #333;
      }
    }

    .tasks-section {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);

      h2 {
        font-size: 1.5rem;
        color: #333;
        margin-bottom: 1.5rem;
      }

      table {
        width: 100%;
        border-collapse: collapse;

        th, td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;

          &.name-col { min-width: 300px; }
          &.time-col { 
            width: 100px;
            text-align: right;
          }
          &.status-col { width: 150px; }
          &.actions-col { width: 50px; }
        }

        th {
          font-weight: 500;
          color: #666;
          background: #f5f5f5;
        }

        .progress-bar-container {
          width: 100%;
          height: 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;

          .progress-bar {
            height: 100%;
            background-color: #2E7D32;
            transition: width 0.3s ease;

            &.over-time {
              background-color: #ef5350;
            }
          }
        }

        tfoot {
          background: #f9f9f9;
        }
      }
    }
  }
}
</style> 