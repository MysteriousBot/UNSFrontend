<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <h1>Dashboard</h1>
      <div class="header-actions">
        <button 
          class="btn-primary"
          :class="{ active: viewMode === 'summary' }"
          @click="viewMode = 'summary'"
        >
          Summary
        </button>
        <button 
          class="btn-configure"
          :class="{ active: viewMode === 'jobs' }"
          @click="viewMode = 'jobs'"
        >
          Jobs
        </button>
      </div>
    </div>

    <div class="productivity-card">
      <div class="card-header">
        <div class="title-section">
          <h2>My Productivity Summary</h2>
          <div class="weekly-productivity">
            Weekly Productivity
            <span class="percentage">{{ weeklyProductivity }}%</span>
          </div>
        </div>
        <div class="date-controls">
          <button @click="changeWeek(-1)">
            <i class="fas fa-chevron-left"></i>
          </button>
          <span>{{ formatDateRange(weekStart, weekEnd) }}</span>
          <button @click="changeWeek(1)" :disabled="isCurrentWeek">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
      
      <div v-if="loading" class="loading">
        Loading...
      </div>
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      <div v-else>
        <!-- Summary View -->
        <div v-if="viewMode === 'summary'" class="hours-table">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Date</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in hoursData.daily_hours" :key="day.date">
                <td>{{ day.day }}</td>
                <td>{{ formatDate(day.date) }}</td>
                <td>{{ day.hours }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>Total Hours</strong></td>
                <td><strong>{{ totalHours }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Jobs View -->
        <div v-else class="jobs-table">
          <table>
            <thead>
              <tr>
                <th>Job / Task</th>
                <th v-for="day in weekDays" :key="day.date">
                  {{ day.shortName }}<br>
                  {{ formatDate(day.date) }}
                </th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="job in jobHours" :key="job.job_id">
                <td class="job-name">
                  {{ job.job_id }} - {{ job.name }}
                  <div class="client-name">{{ job.client_name }}</div>
                </td>
                <td v-for="hours in job.daily_hours" :key="hours.date">
                  {{ hours.hours || '' }}
                </td>
                <td><strong>{{ job.total }}</strong></td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td><strong>Total Hours</strong></td>
                <td v-for="total in dailyTotals" :key="total.date">
                  <strong>{{ total.hours }}</strong>
                </td>
                <td><strong>{{ totalHours }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'

export default {
  name: 'DashboardView',
  setup() {
    const store = useStore()
    const weekStart = ref(getWeekStart())
    const weekEnd = ref(getWeekEnd(weekStart.value))
    const hoursData = ref({ daily_hours: [] })
    const loading = ref(true)
    const error = ref(null)
    const viewMode = ref('summary')

    const staffUuid = computed(() => {
      const user = store.state.auth.user
      return user?.profile?.staff_uuid || user?.staff_uuid
    })

    const totalHours = computed(() => {
      if (!hoursData.value.daily_hours) return 0
      return hoursData.value.daily_hours.reduce((sum, day) => sum + (day.hours || 0), 0)
    })

    const isCurrentWeek = computed(() => {
      const currentWeekStart = getWeekStart()
      return weekStart.value.getTime() >= currentWeekStart.getTime()
    })

    // Generate array of week days from start date
    const weekDays = computed(() => {
      const days = []
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart.value)
        date.setDate(date.getDate() + i)
        days.push({
          date: date.toISOString().split('T')[0],
          shortName: date.toLocaleDateString('en-US', { weekday: 'short' })
        })
      }
      return days
    })

    // Organize hours by job
    const jobHours = computed(() => {
      if (!hoursData.value.job_hours) return []
      
      return Object.values(hoursData.value.job_hours).map(job => ({
        ...job,
        total: job.daily_hours.reduce((sum, day) => sum + (day.hours || 0), 0)
      }))
    })

    // Calculate daily totals
    const dailyTotals = computed(() => {
      return weekDays.value.map(day => ({
        date: day.date,
        hours: jobHours.value.reduce((sum, job) => {
          const dayHours = job.daily_hours.find(d => d.date === day.date)
          return sum + (dayHours?.hours || 0)
        }, 0)
      }))
    })

    const weeklyProductivity = computed(() => {
      // You can implement your productivity calculation logic here
      return '0'
    })

    function formatDate(dateString) {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })
    }

    function getWeekStart(date = new Date()) {
      const d = new Date(date)
      // Get current day (0 = Sunday, 1 = Monday, etc.)
      const currentDay = d.getDay()
      
      // Calculate days to subtract to get to Monday
      // If Sunday (0), go back 6 days
      // If Monday (1), go back 0 days
      // If Tuesday (2), go back 1 day, etc.
      const daysToSubtract = currentDay === 0 ? 6 : currentDay - 1
      
      // Set to start of day
      d.setHours(0, 0, 0, 0)
      // Go back to Monday
      d.setDate(d.getDate() - daysToSubtract)
      
      return d
    }

    function getWeekEnd(startDate) {
      const d = new Date(startDate)
      return new Date(d.setDate(d.getDate() + 6))
    }

    function formatDateRange(start, end) {
      const options = { month: 'short', day: 'numeric' }
      return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`
    }

    async function fetchWeeklyHours() {
      try {
        if (!staffUuid.value) {
          error.value = 'Staff ID not found. Please try logging in again.'
          return
        }

        loading.value = true
        error.value = null
        
        const formattedDate = weekStart.value.toISOString().split('T')[0]
        const { data } = await axios.get(`/api/staff/${staffUuid.value}/weekly-hours/${formattedDate}/`)
        hoursData.value = data
      } catch (err) {
        console.error('Error fetching weekly hours:', err.response || err)
        error.value = err.response?.data?.error || 'Failed to load productivity data'
      } finally {
        loading.value = false
      }
    }

    function changeWeek(offset) {
      if (offset > 0 && isCurrentWeek.value) return
      
      const newStart = new Date(weekStart.value)
      newStart.setDate(newStart.getDate() + (offset * 7))
      weekStart.value = newStart
      weekEnd.value = getWeekEnd(newStart)
      fetchWeeklyHours()
    }

    function goToJobSummary() {
      // Implement navigation to job summary page
      console.log('Navigate to job summary')
    }

    onMounted(() => {
      // Set initial week to current week's Monday
      weekStart.value = getWeekStart()
      weekEnd.value = getWeekEnd(weekStart.value)
      
      if (staffUuid.value) {
        fetchWeeklyHours()
      }
    })

    return {
      weekStart,
      weekEnd,
      hoursData,
      loading,
      error,
      formatDateRange,
      formatDate,
      changeWeek,
      isCurrentWeek,
      totalHours,
      viewMode,
      weekDays,
      jobHours,
      dailyTotals,
      weeklyProductivity,
      goToJobSummary
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard {
  padding: 2rem;

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;

    h1 {
      font-size: 2rem;
      color: #333;
      margin: 0;
    }

    .header-actions {
      display: flex;
      gap: 1rem;

      button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1.25rem;
        border-radius: 4px;
        font-weight: 500;
        cursor: pointer;

        &.active {
          background-color: #2E7D32;
          color: white;
          border: none;

          &:hover {
            background-color: #1B5E20;
          }
        }
      }

      .btn-primary {
        background-color: white;
        border: 1px solid #e0e0e0;
        color: #666;

        &:hover:not(.active) {
          background-color: #f5f5f5;
        }
      }

      .btn-configure {
        background-color: white;
        border: 1px solid #e0e0e0;
        color: #666;

        &:hover:not(.active) {
          background-color: #f5f5f5;
        }
      }
    }
  }

  .productivity-card {
    background: white;
    border-radius: 8px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);

    .hours-table {
      margin-top: 1rem;
      
      table {
        width: 100%;
        border-collapse: collapse;
        
        th, td {
          padding: 0.75rem;
          text-align: left;
          border-bottom: 1px solid #e0e0e0;
        }

        th {
          font-weight: 500;
          color: #666;
          background: #f5f5f5;
        }

        td {
          color: #333;
        }

        tfoot {
          tr {
            background: #f9f9f9;
            
            td {
              font-weight: 500;
            }
          }
        }
      }
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;

      .title-section {
        h2 {
          font-size: 1.5rem;
          color: #333;
          margin: 0 0 0.5rem 0;
        }

        .weekly-productivity {
          font-size: 0.9rem;
          color: #666;

          .percentage {
            font-weight: 500;
            color: #333;
          }
        }
      }
    }

    .date-controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      
      button {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0.5rem;
        color: #666;
        
        &:hover:not(:disabled) {
          color: #333;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      span {
        font-size: 1rem;
        color: #666;
      }
    }

    .loading, .error {
      text-align: center;
      padding: 2rem;
      color: #666;
    }

    .error {
      color: #d32f2f;
    }

    .jobs-table {
      margin-top: 1rem;
      
      table {
        width: 100%;
        border-collapse: collapse;
        
        th, td {
          padding: 0.75rem;
          text-align: left;
          border: 1px solid #e0e0e0;
          min-width: 80px;
        }

        th {
          font-weight: 500;
          color: #666;
          background: #f5f5f5;
          text-align: center;
        }

        td {
          color: #333;
          text-align: center;

          &.job-name {
            text-align: left;
            min-width: 200px;
          }
        }

        .client-name {
          font-size: 0.9rem;
          color: #666;
        }

        tfoot {
          tr {
            background: #f9f9f9;
          }
        }
      }
    }
  }
}
</style> 