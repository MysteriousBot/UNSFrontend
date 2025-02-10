<template>
  <div class="dashboard">
    <div class="container">
      <div class="dashboard-header">
        <h1>Dashboard</h1>
        <div class="header-actions">
          <button 
            class="btn-timesheet"
            @click="goToTimesheet"
          >
            <i class="fas fa-plus"></i>
            Weekly Timesheet
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
          <div v-if="viewMode === 'summary'" class="chart-container">
            <div class="chart">
              <div class="y-axis">
                <div class="y-axis-label">Time (hours)</div>
                <div v-for="tick in yAxisTicks" :key="tick" class="tick">
                  {{ tick }}
                </div>
              </div>
              <div class="chart-area">
                <div class="grid-lines">
                  <div v-for="tick in yAxisTicks" :key="tick" class="grid-line"></div>
                </div>
                <div class="bars">
                  <div v-for="day in hoursData.daily_hours" :key="day.date" class="bar-column">
                    <div class="bar-value" v-if="day.total > 0">
                      {{ day.total }}
                    </div>
                    <div class="stacked-bar">
                      <div 
                        v-if="day.billable > 0"
                        class="bar billable"
                        :style="{ height: `${(day.billable / maxHours) * 100}%` }"
                      ></div>
                      <div 
                        v-if="day.non_billable > 0"
                        class="bar non-billable"
                        :style="{ 
                          height: `${(day.non_billable / maxHours) * 100}%`,
                          marginTop: `${(day.billable / maxHours) * 100}%`
                        }"
                      ></div>
                    </div>
                    <div class="bar-label">
                      {{ day.day }}<br>
                      {{ formatDate(day.date) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="chart-legend">
              <div class="legend-item">
                <div class="legend-color billable"></div>
                <span>Billable</span>
              </div>
              <div class="legend-item">
                <div class="legend-color non-billable"></div>
                <span>Non-Billable</span>
              </div>
            </div>
            <div class="total-hours">
              Total Hours: <strong>{{ totalHours }}</strong>
            </div>
          </div>

          <!-- Jobs View -->
          <div v-else class="tasks-table">
            <table>
              <thead>
                <tr>
                  <th>Job/Task</th>
                  <th v-for="day in weekDays" :key="day.date">
                    {{ day.shortName }}<br>
                    {{ formatDate(day.date) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="task in taskHours" :key="`${task.job_id}_${task.task_uuid}`">
                  <td class="task-name">
                    <div class="job-name">{{ task.job_id }} - {{ task.job_name }}</div>
                    <div class="task-label">{{ task.task_name }}</div>
                  </td>
                  <td 
                    v-for="hours in task.daily_hours" 
                    :key="hours.date" 
                    class="hours-cell"
                    @click.stop="toggleNotes(task, hours)"
                  >
                    <div class="hours-value">
                      {{ hours.hours || '-' }}
                    </div>
                    <div v-if="hours.notes?.length" class="note-icon"></div>
                    <div v-if="selectedCell === `${task.job_id}_${task.task_uuid}_${hours.date}`" class="notes-dropdown">
                      <div class="notes-content">
                        <div v-for="note in hours.notes" :key="note" class="note-item">
                          {{ note }}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'
import { useRouter } from 'vue-router'

export default {
  name: 'DashboardView',
  setup() {
    const store = useStore()
    const router = useRouter()
    const weekStart = ref(getWeekStart())
    const weekEnd = ref(getWeekEnd(weekStart.value))
    const hoursData = ref({ daily_hours: [] })
    const loading = ref(true)
    const error = ref(null)
    const viewMode = ref('summary')
    const selectedCell = ref(null)
    const selectedTask = ref(null)

    const staffUuid = computed(() => {
      const user = store.state.auth.user
      return user?.profile?.staff_uuid || user?.staff_uuid
    })

    const totalHours = computed(() => {
      if (!hoursData.value.daily_hours) return 0
      return hoursData.value.daily_hours.reduce((sum, day) => sum + day.total, 0)
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

    // Organize hours by task
    const taskHours = computed(() => {
      if (!hoursData.value.task_hours) return []
      
      return Object.values(hoursData.value.task_hours).map(task => ({
        ...task,
        total: task.daily_hours.reduce((sum, day) => sum + (day.hours || 0), 0),
        actual_minutes: task.daily_hours.reduce((sum, day) => sum + ((day.hours || 0) * 60), 0),
        estimated_minutes: task.estimated_minutes || 0
      }))
    })

    // Calculate daily totals
    const dailyTotals = computed(() => {
      return weekDays.value.map(day => ({
        date: day.date,
        hours: taskHours.value.reduce((sum, task) => {
          const dayHours = task.daily_hours.find(d => d.date === day.date)
          return sum + (dayHours?.hours || 0)
        }, 0)
      }))
    })

    const weeklyProductivity = computed(() => {
      // You can implement your productivity calculation logic here
      return '0'
    })

    const maxHours = computed(() => {
      if (!hoursData.value.daily_hours?.length) return 10
      const max = Math.max(...hoursData.value.daily_hours.map(day => day.billable + day.non_billable))
      return Math.ceil(max + 1)
    })

    const yAxisTicks = computed(() => {
      const ticks = []
      const numTicks = 5
      for (let i = numTicks; i >= 0; i--) {
        ticks.push((maxHours.value * i) / numTicks)
      }
      return ticks
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

    function toggleNotes(task, hours) {
      const cellId = `${task.job_id}_${task.task_uuid}_${hours.date}`
      selectedCell.value = selectedCell.value === cellId ? null : cellId
    }

    function hasNotes(task) {
      return task.daily_hours.some(day => day.notes && day.notes.length > 0)
    }

    const goToTimesheet = () => {
      router.push('/timesheet')
    }

    onMounted(() => {
      // Set initial week to current week's Monday
      weekStart.value = getWeekStart()
      weekEnd.value = getWeekEnd(weekStart.value)
      
      if (staffUuid.value) {
        fetchWeeklyHours()
      }
      
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.hours-cell')) {
          selectedCell.value = null
        }
      })
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
      taskHours,
      dailyTotals,
      weeklyProductivity,
      goToJobSummary,
      selectedCell,
      toggleNotes,
      maxHours,
      yAxisTicks,
      hasNotes,
      goToTimesheet
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard {
  padding: 0;
  display: flex;
  justify-content: center;

  .container {
    width: 100%;
    min-width: 768px;

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
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;

          &.btn-primary {
            background: #2E7D32;
            color: white;
            border: none;

            &:hover {
              background: #1B5E20;
            }

            &.active {
              background: #1B5E20;
            }
          }

          &.btn-configure {
            background: white;
            color: #666;
            border: 1px solid #e0e0e0;

            &:hover {
              background: #f5f5f5;
            }

            &.active {
              background: #f5f5f5;
              color: #333;
            }
          }

          &.btn-timesheet {
            background: #43A047;
            color: white;
            border: none;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;

            i {
              font-size: 0.875rem;
            }

            &:hover {
              background: #2E7D32;
            }
          }
        }
      }
    }

    .productivity-card {
      margin: 0;  // Remove the previous margin
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

      .tasks-table {
        margin-top: 1rem;
        
        table {
          width: 100%;
          border-collapse: collapse;
          
          th, td {
            position: relative;  // Add this to position the triangle
            padding: 0.75rem;
            text-align: left;
            border: 1px solid #e0e0e0;
            min-width: 80px;

            &.hours-cell {
              position: relative;
              cursor: pointer;

              .hours-value {
                text-align: center;
              }

              .note-icon {
                position: absolute;
                top: 2px;
                right: 2px;
                width: 0;
                height: 0;
                border-style: solid;
                border-width: 0 8px 8px 0;
                border-color: transparent #2E7D32 transparent transparent;
              }

              .notes-dropdown {
                position: absolute;
                top: 100%;
                left: 0;
                z-index: 10;
                min-width: 200px;
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                margin-top: 4px;

                &::before {
                  content: '';
                  position: absolute;
                  top: -6px;
                  left: 50%;
                  transform: translateX(-50%);
                  border-left: 6px solid transparent;
                  border-right: 6px solid transparent;
                  border-bottom: 6px solid white;
                }

                .notes-content {
                  max-height: 200px;
                  overflow-y: auto;
                  padding: 0.5rem;

                  .note-item {
                    padding: 0.5rem;
                    border-bottom: 1px solid #f0f0f0;
                    font-size: 0.9rem;
                    color: #333;

                    &:last-child {
                      border-bottom: none;
                    }
                  }
                }
              }
            }
          }
        }
      }

      .chart-container {
        padding: 2rem 1rem;
        position: relative;

        .chart {
          display: flex;
          height: 300px;
          margin: 2rem 0;
          padding-bottom: 3rem;
          position: relative;

          .y-axis {
            width: 30px;
            position: relative;
            margin-right: 1rem;
            
            .y-axis-label {
              position: absolute;
              left: -10px;
              top: 50%;
              transform: rotate(-90deg) translateX(50%);
              transform-origin: left;
              font-size: 0.8rem;
              color: #666;
              white-space: nowrap;
            }

            .tick {
              display: none;
            }
          }

          .chart-area {
            flex: 1;
            position: relative;
            border-left: 1px solid #e0e0e0;
            border-bottom: 1px solid #e0e0e0;
            margin-bottom: 20px;

            .grid-lines {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 100%;
              z-index: 1;

              .grid-line {
                position: absolute;
                left: 0;
                right: 0;
                border-top: 1px dashed #e0e0e0;
                height: 1px;

                @for $i from 0 through 5 {
                  &:nth-child(#{$i + 1}) {
                    top: percentage(1 - $i / 5);
                  }
                }
              }
            }

            .bars {
              position: relative;
              z-index: 2;
              height: 100%;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              padding: 0 2rem;

              .bar-column {
                width: 3%;
                height: 100%;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;

                .bar-value {
                  position: absolute;
                  top: -24px;
                  font-size: 0.9rem;
                  color: #666;
                }

                .stacked-bar {
                  position: relative;
                  width: 100%;
                  height: 100%;

                  .bar {
                    width: 100%;
                    position: absolute;
                    bottom: 0;
                    transition: height 0.3s ease;
                    border-radius: 4px 4px 0 0;

                    &.billable {
                      background-color: #2E7D32;  // Green for billable
                    }

                    &.non-billable {
                      background-color: #ef5350;  // Red for non-billable
                    }
                  }
                }

                .bar-label {
                  position: absolute;
                  bottom: -2.5rem;
                  text-align: center;
                  font-size: 0.8rem;
                  color: #666;
                  width: 200%;
                  left: -50%;
                }
              }
            }
          }
        }
      }

      .chart-legend {
        position: absolute;
        bottom: 0;
        left: 4rem;
        display: flex;
        gap: 1.5rem;

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: #666;

          .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 2px;

            &.billable {
              background-color: #2E7D32;
            }

            &.non-billable {
              background-color: #ef5350;
            }
          }
        }
      }

      .total-hours {
        text-align: right;
        font-size: 1rem;
        color: #666;
        margin-top: 1rem;

        strong {
          color: #333;
        }
      }
    }
  }
}

// Add responsive behavior
@media (max-width: 1232px) {  // 1200px + 32px padding
  .dashboard {
    padding: 2rem 1rem;
  }
}

@media (max-width: 800px) {  // 768px + 32px padding
  .dashboard {
    padding: 1rem 0.5rem;
    
    .container {
      min-width: auto;  // Allow container to shrink on very small screens
    }
  }
}

.tasks-table {
  table {
    th, td {
      &.checkbox-col {
        width: 40px;
      }
      
      &.name-col {
        min-width: 300px;
      }

      &.time-col {
        width: 100px;
        text-align: right;
      }

      &.progress-col {
        width: 150px;
      }

      &.actions-col {
        width: 50px;
      }
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

    .action-btn {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 0.5rem;

      &:hover {
        color: #333;
      }
    }
  }
}
</style> 