<template>
  <div class="timesheet-container">
    <div class="timesheet-header">
      <div class="header-left">
        <h1>Enter Weekly Timesheet</h1>
        <div class="breadcrumbs">
          <span>Timesheets</span>
          <span class="separator">/</span>
          <span>{{ staffName }}</span>
          <span class="separator">/</span>
          <span>Enter Weekly Timesheet</span>
        </div>
      </div>
      <div class="header-right">
        <button class="add-task-btn" @click="openTaskDialog">
          Add Task
        </button>
        <button class="save-btn" @click="submitTimesheet">
          Save
        </button>
      </div>
    </div>

    <div class="timesheet-content">
      <div class="week-selector">
        <h2>Weekly Summary - {{ formatDateRange(weekStart, weekEnd) }}</h2>
        <div class="week-controls">
          <button @click="changeWeek(-1)" class="week-btn">
            <i class="fas fa-chevron-left"></i>
          </button>
          <button @click="changeWeek(1)" class="week-btn" :disabled="isCurrentWeek">
            <i class="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>

      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="timesheet-table">
        <table>
          <thead>
            <tr>
              <th class="task-col">Job / Task</th>
              <th v-for="day in weekDays" :key="day.date">
                {{ day.dayName }}<br>
                {{ formatDate(day.date) }}
              </th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="task in taskHours" :key="`${task.job_id}_${task.task_uuid}`">
              <!-- Task Row -->
              <tr>
                <td class="task-info">
                  <div class="job-name">{{ task.job_id }} - {{ task.job_name }}</div>
                  <div class="task-name">{{ task.task_name }}</div>
                  <div class="client-name">{{ task.client_name }}</div>
                </td>
                <td 
                  v-for="hours in task.daily_hours" 
                  :key="hours.date"
                  class="time-cell"
                  @click="toggleNotes(task, hours.date)"
                >
                  <input 
                    type="number" 
                    v-model="hours.hours" 
                    class="time-input"
                    step="0.25"
                    min="0"
                  >
                  <div class="notes-indicator" v-if="hours.notes?.length">
                    <i class="fas fa-comment"></i>
                  </div>
                </td>
                <td class="total-col">
                  {{ calculateTaskTotal(task) }}
                </td>
              </tr>
              <!-- Notes Row -->
              <tr v-if="task === selectedTask" class="notes-row">
                <td colspan="9">
                  <div class="notes-section">
                    <label>Notes</label>
                    <textarea 
                      v-model="currentNotes"
                      placeholder="Add note..."
                      rows="4"
                      class="notes-input"
                      @blur="saveNotes"
                    ></textarea>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
          <tfoot>
            <tr>
              <td>Daily Total</td>
              <td v-for="day in weekDays" :key="day.date">
                {{ calculateDayTotal(day.date) }}
              </td>
              <td>{{ calculateWeekTotal() }}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Task Selection Dialog -->
    <div v-if="showTaskDialog" class="dialog-overlay">
      <div class="dialog">
        <div class="dialog-header">
          <h3>Add Task</h3>
          <button class="close-btn" @click="closeTaskDialog">×</button>
        </div>
        <div class="dialog-content">
          <div class="form-group">
            <label>Job*</label>
            <div class="custom-select">
              <div 
                class="select-input" 
                @click="toggleJobDropdown"
                :class="{ active: showJobDropdown }"
              >
                {{ selectedJob ? `${selectedJob.job_number} - ${selectedJob.name}` : 'Select Job' }}
                <i class="fas fa-chevron-down"></i>
              </div>
              <div 
                v-if="showJobDropdown" 
                class="select-dropdown"
              >
                <div class="search-box">
                  <input 
                    type="text" 
                    v-model="jobSearch" 
                    placeholder="Search Job"
                    @input="filterJobs"
                  >
                </div>
                <div class="options-list">
                  <div 
                    v-for="job in filteredJobs" 
                    :key="job.job_number"
                    class="option"
                    @click="selectJob(job)"
                  >
                    <div class="job-number">{{ job.job_number }}</div>
                    <div class="job-name">{{ job.name }}</div>
                  </div>
                </div>
                <div class="results-count">{{ filteredJobs.length }} of {{ availableJobs.length }} records</div>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>Task*</label>
            <div class="custom-select">
              <div 
                class="select-input"
                @click="toggleTaskDropdown"
                :class="{ active: showTaskDropdown, disabled: !selectedJob }"
              >
                {{ selectedTask ? selectedTask.name : 'Select Task' }}
                <i class="fas fa-chevron-down"></i>
              </div>
              <div v-if="showTaskDropdown" class="select-dropdown" ref="taskDropdownRef">
                <div class="search-box">
                  <input 
                    type="text" 
                    v-model="taskSearch" 
                    placeholder="Search Task..."
                    @input="filterTasks"
                  >
                </div>
                <div class="options-list">
                  <div 
                    v-for="task in filteredTasks" 
                    :key="task.id"
                    class="option"
                    @click="selectTask(task)"
                  >
                    {{ task.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="cancel-btn" @click="closeTaskDialog">Cancel</button>
          <button 
            class="add-btn" 
            @click="addTask"
            :disabled="!selectedJob || !selectedTask"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useStore } from 'vuex'
import axios from 'axios'

export default {
  name: 'WeeklyTimesheetView',
  setup() {
    const store = useStore()
    const staffUuid = computed(() => store.getters['auth/getUser']?.profile?.staff_uuid)
    const staffName = computed(() => `${store.getters['auth/getUser']?.first_name} ${store.getters['auth/getUser']?.last_name}`)
    
    const weekStart = ref(getWeekStart(new Date()))
    const weekEnd = ref(getEndOfWeek(new Date()))
    const taskHours = ref([])
    const availableJobs = ref([])
    const loading = ref(true)
    const error = ref(null)
    
    // Dialog states
    const showTaskDialog = ref(false)
    const selectedTask = ref(null)
    const selectedDate = ref(null)
    const currentNotes = ref('')
    const selectedJobId = ref('')
    const selectedTaskId = ref('')
    const availableTasks = ref([])

    // Add these refs at the top with other refs
    const jobDropdownRef = ref(null)
    const taskDropdownRef = ref(null)

    const weekDays = computed(() => {
      if (!weekStart.value) return []
      return getWeekDays(weekStart.value)
    })

    const filteredJobs = computed(() => {
      if (!jobSearch.value) return availableJobs.value
      const search = jobSearch.value.toLowerCase()
      return availableJobs.value.filter(job => 
        job.job_number.toLowerCase().includes(search) ||
        job.name.toLowerCase().includes(search)
      )
    })

    const isCurrentWeek = computed(() => {
      const currentWeekStart = getWeekStart(new Date())
      return weekStart.value.getTime() >= currentWeekStart.getTime()
    })

    // Fetch functions
    const fetchWeeklyHours = async () => {
      try {
        loading.value = true
        error.value = null
        
        const formattedDate = weekStart.value.toISOString().split('T')[0]
        const { data } = await axios.get(`/api/staff/${staffUuid.value}/weekly-hours/${formattedDate}/`)
        
        // Transform the data to match our table structure
        taskHours.value = Object.values(data.task_hours || {}).map(task => ({
          ...task,
          daily_hours: task.daily_hours.map(day => ({
            ...day,
            hours: day.hours || '',
            notes: day.notes || []
          }))
        }))
      } catch (err) {
        console.error('Error fetching weekly hours:', err)
        error.value = 'Failed to load timesheet data'
      } finally {
        loading.value = false
      }
    }

    const fetchMyJobs = async () => {
      try {
        console.log('Fetching jobs for staff:', staffUuid.value)
        const { data } = await axios.get(`/api/jobs/my-jobs/${staffUuid.value}/`)
        console.log('Received jobs:', data)
        availableJobs.value = data
      } catch (err) {
        console.error('Error fetching jobs:', err)
        error.value = 'Failed to load jobs'
      }
    }

    const fetchTasksForJob = async (jobId) => {
        try {
            console.log('Fetching tasks for job:', jobId);
            const { data } = await axios.get(`/api/jobs/${jobId}/tasks/`);
            console.log('Fetched tasks:', data);
            availableTasks.value = data;
        } catch (err) {
            console.error('Error fetching tasks:', err);
            error.value = 'Failed to load tasks';
        }
    };

    // Dialog functions
    const openTaskDialog = () => {
      console.log('Opening task dialog')
      showTaskDialog.value = true
    }

    const closeTaskDialog = () => {
      showTaskDialog.value = false
      selectedJobId.value = ''
      selectedTaskId.value = ''
      availableTasks.value = []
    }

    const handleJobChange = () => {
      console.log('Job changed:', selectedJobId.value)
      selectedTaskId.value = ''
      if (selectedJobId.value) {
        const job = availableJobs.value.find(j => j.job_number === selectedJobId.value)
        console.log('Found job:', job)
        fetchTasksForJob(selectedJobId.value)
      } else {
        availableTasks.value = []
      }
    }

    const addTask = async () => {
        if (!selectedJob || !selectedTask) {
            console.error('No job or task selected');
            return;
        }
        
        console.log('Adding task:', {
            selectedJob: selectedJob.value,
            selectedTask: selectedTask.value
        });

        // Create a new task entry
        const newTask = {
            job_id: selectedJob.value.job_number,
            job_name: selectedJob.value.name,
            task_uuid: selectedTask.value.uuid,
            task_name: selectedTask.value.name,
            client_name: selectedJob.value.client_name,
            daily_hours: weekDays.value.map(day => ({
                date: day.date,
                hours: '',
                notes: []
            }))
        };

        console.log('New task entry:', newTask);

        // Check if task already exists
        const taskExists = taskHours.value.some(
            task => task.job_id === newTask.job_id && task.task_uuid === newTask.task_uuid
        );

        if (taskExists) {
            error.value = 'This task has already been added';
            return;
        }

        // Add the new task to the timesheet
        taskHours.value = [...taskHours.value, newTask];
        console.log('Updated taskHours:', taskHours.value);

        // Close the dialog and reset selections
        closeTaskDialog();
    };

    // Utility functions
    const calculateTaskTotal = (task) => {
      return task.daily_hours.reduce((sum, hours) => sum + (Number(hours.hours) || 0), 0)
    }

    const calculateDayTotal = (date) => {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0]
      return taskHours.value.reduce((sum, task) => {
        const dayHours = task.daily_hours.find(h => h.date === dateStr)
        return sum + (Number(dayHours?.hours) || 0)
      }, 0)
    }

    const calculateWeekTotal = () => {
      return taskHours.value.reduce((sum, task) => sum + calculateTaskTotal(task), 0)
    }

    const formatDate = (date) => {
      const d = new Date(date)
      return `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`
    }

    const formatDateRange = (start, end) => {
      if (!start || !end) return ''
      const startStr = formatDate(start)
      const endStr = formatDate(end)
      return `${startStr} - ${endStr}`
    }

    const changeWeek = (offset) => {
      if (offset > 0 && isCurrentWeek.value) return
      
      const newStart = new Date(weekStart.value)
      newStart.setDate(newStart.getDate() + (offset * 7))
      weekStart.value = newStart
      weekEnd.value = getEndOfWeek(newStart)
      fetchWeeklyHours()
    }

    // New dialog states
    const showJobDropdown = ref(false)
    const showTaskDropdown = ref(false)
    const jobSearch = ref('')
    const taskSearch = ref('')
    const selectedJob = ref(null)

    const toggleJobDropdown = () => {
      showJobDropdown.value = !showJobDropdown.value;
      showTaskDropdown.value = false;
    }

    const toggleTaskDropdown = () => {
      if (!selectedJob.value) return;
      showTaskDropdown.value = !showTaskDropdown.value;
      showJobDropdown.value = false;
    }

    const selectJob = async (job) => {
        console.log('Selected job:', job);
        selectedJob.value = job;
        showJobDropdown.value = false;
        
        // Fetch tasks for the selected job
        await fetchTasksForJob(job.job_number);
    };

    const selectTask = (task) => {
        console.log('Selected task:', task);
        selectedTask.value = task;
        showTaskDropdown.value = false;
    };

    const filteredTasks = computed(() => {
      if (!taskSearch.value) return availableTasks.value
      const search = taskSearch.value.toLowerCase()
      return availableTasks.value.filter(task => 
        task.name.toLowerCase().includes(search)
      )
    })

    const toggleNotes = (task, date) => {
      selectedDate.value = date
      if (selectedTask.value === task) {
        selectedTask.value = null
        currentNotes.value = ''
      } else {
        selectedTask.value = task
        const dayHours = task.daily_hours.find(h => h.date === date)
        currentNotes.value = dayHours?.notes?.join('\n') || ''
      }
    }

    const saveNotes = () => {
      if (selectedTask.value) {
        const dayHours = selectedTask.value.daily_hours.find(h => h.date === selectedDate.value)
        if (dayHours) {
          dayHours.notes = currentNotes.value ? [currentNotes.value] : []
        } else {
          selectedTask.value.daily_hours.push({
            date: selectedDate.value,
            hours: 0,
            notes: currentNotes.value ? [currentNotes.value] : []
          })
        }
      }
    }

    // Add the submit function
    const submitTimesheet = async () => {
      try {
        loading.value = true;
        
        // Format the UUID with hyphens
        const formattedUuid = staffUuid.value?.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
        
        // Filter tasks to only include those with hours > 0
        const submittableEntries = taskHours.value.flatMap(task => {
            const entriesWithHours = task.daily_hours.filter(day => 
                day.hours && parseFloat(day.hours) > 0
            );
            
            if (entriesWithHours.length === 0) return [];
            
            return [{
                task_uuid: task.task_uuid,
                job_id: task.job_id,
                entries: entriesWithHours.map(day => ({
                    date: day.date,
                    hours: parseFloat(day.hours),
                    notes: day.notes
                }))
            }];
        });

        if (submittableEntries.length === 0) {
            error.value = 'No hours entered to submit';
            return;
        }

        // Log the data being sent
        console.log('Submitting timesheet data:', {
            staff_uuid: formattedUuid,
            entries: submittableEntries
        });

        // Log each task UUID being submitted
        submittableEntries.forEach(entry => {
            console.log('Task UUID:', entry.task_uuid);
            console.log('Job ID:', entry.job_id);
        });

        await axios.post(`/api/staff/${formattedUuid}/weekly-hours/`, {
            entries: submittableEntries
        });

        // Show success message
        store.dispatch('showMessage', {
            message: 'Timesheet submitted successfully',
            type: 'success'
        });

        // Refresh the data
        await fetchWeeklyHours();
      } catch (err) {
        console.error('Error submitting timesheet:', err);
        console.error('Error details:', err.response?.data);
        error.value = 'Failed to submit timesheet';
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      if (staffUuid.value) {
        try {
          loading.value = true
          await Promise.all([
            fetchWeeklyHours(),
            fetchMyJobs()
          ])
        } catch (err) {
          error.value = 'Failed to load data'
          console.error(err)
        } finally {
          loading.value = false
        }
      }
    })

    return {
      staffName,
      weekStart,
      weekEnd,
      weekDays,
      taskHours,
      showTaskDialog,
      selectedTask,
      selectedDate,
      currentNotes,
      selectedJobId,
      selectedTaskId,
      availableTasks,
      handleJobChange,
      addTask,
      calculateTaskTotal,
      calculateDayTotal,
      calculateWeekTotal,
      formatDate,
      formatDateRange,
      changeWeek,
      loading,
      error,
      isCurrentWeek,
      filteredJobs,
      openTaskDialog,
      closeTaskDialog,
      availableJobs,
      showJobDropdown,
      showTaskDropdown,
      jobSearch,
      taskSearch,
      selectedJob,
      toggleJobDropdown,
      toggleTaskDropdown,
      selectJob,
      selectTask,
      filteredTasks,
      jobDropdownRef,
      taskDropdownRef,
      toggleNotes,
      saveNotes,
      submitTimesheet
    }
  }
}

// Utility functions
function getWeekStart(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  
  // Get previous Monday
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is Sunday
  d.setDate(diff)
  
  return d
}

function getWeekDays(startDate) {
  const days = []
  const currentDate = new Date(startDate)

  for (let i = 0; i < 7; i++) {
    days.push({
      date: currentDate.toISOString().split('T')[0],
      dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: currentDate.getDate(),
      month: currentDate.toLocaleDateString('en-US', { month: 'short' })
    })
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return days
}

function getEndOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? 0 : 7)
  return new Date(d.setDate(diff))
}
</script>

<style lang="scss" scoped>
.timesheet-container {
  padding: 2rem;

  .timesheet-header {
    margin-bottom: 2rem;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;

    .header-left {
      h1 {
        font-size: 2rem;
        color: #333;
        margin-bottom: 0.5rem;
      }

      .breadcrumbs {
        color: #666;
        font-size: 0.9rem;

        .separator {
          margin: 0 0.5rem;
          color: #999;
        }
      }
    }

    .header-right {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .add-task-btn {
      padding: 0.75rem 1.5rem;
      background: #f5f5f5;  /* Light grey background */
      color: #333;  /* Dark text */
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }

    .add-task-btn:hover {
      background: #e0e0e0;
    }

    .save-btn {
      padding: 0.75rem 1.5rem;
      background: #2E7D32;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }

    .save-btn:hover {
      background: #1B5E20;
    }
  }

  .timesheet-content {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    overflow: hidden;

    .week-selector {
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #e0e0e0;

      h2 {
        font-size: 1.2rem;
        color: #333;
      }

      .week-controls {
        display: flex;
        gap: 0.5rem;

        .week-btn {
          padding: 0.5rem;
          border: 1px solid #e0e0e0;
          background: white;
          border-radius: 4px;
          cursor: pointer;

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          &:hover:not(:disabled) {
            background: #f5f5f5;
          }
        }
      }
    }

    .timesheet-table {
      overflow-x: auto;

      table {
        width: 100%;
        border-collapse: collapse;

        th, td {
          padding: 1rem;
          border: 1px solid #e0e0e0;
          text-align: left;
        }

        th {
          background: #f5f5f5;
          font-weight: 500;
        }

        .task-col {
          min-width: 300px;
        }

        .task-info {
          .job-name {
            font-weight: 500;
          }

          .task-name {
            color: #666;
            font-size: 0.9rem;
          }

          .client-name {
            color: #999;
            font-size: 0.9rem;
          }
        }

        .time-cell {
          position: relative;
          padding: 0.5rem;
          width: 100px;

          .time-input {
            width: 100%;
            padding: 0.5rem;
            border: 1px solid transparent;
            text-align: center;
            background: none;

            &:focus {
              outline: none;
              border-color: #2E7D32;
              background: white;
            }

            &:empty {
              background: none;
            }
          }

          .notes-indicator {
            position: absolute;
            top: 0.25rem;
            right: 0.25rem;
            color: #666;
            font-size: 0.8rem;
          }
        }

        .total-col {
          background: #f5f5f5;
          font-weight: 500;
        }

        tfoot {
          background: #f5f5f5;
          font-weight: 500;
        }

        .notes-row {
          background: #f8f9fa;

          td {
            padding: 1rem;
            border-top: none;
          }

          .notes-section {
            label {
              display: block;
              color: #666;
              margin-bottom: 0.5rem;
              font-weight: 500;
            }

            .notes-input {
              width: 100%;
              padding: 0.75rem;
              border: 1px solid #e0e0e0;
              border-radius: 4px;
              font-size: 0.9rem;
              resize: vertical;
              min-height: 100px;

              &:focus {
                outline: none;
                border-color: #2E7D32;
              }

              &::placeholder {
                color: #999;
              }
            }
          }
        }
      }
    }

    .loading {
      padding: 1.5rem;
      text-align: center;
    }

    .error {
      padding: 1.5rem;
      text-align: center;
      color: red;
    }
  }
}

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;

  .dialog {
    background: white;
    border-radius: 8px;
    width: 90%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;

    .dialog-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;

      h3 {
        margin: 0;
        font-size: 1.2rem;
        color: #333;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #666;
        cursor: pointer;

        &:hover {
          color: #333;
        }
      }
    }

    .dialog-content {
      padding: 1.5rem;
      position: relative;
      overflow: visible;

      .form-group {
        margin-bottom: 1.5rem;
        position: relative;

        label {
          display: block;
          margin-bottom: 0.5rem;
          color: #333;
          font-weight: 500;
        }

        .custom-select {
          position: relative;
          width: 100%;

          .select-input {
            padding: 0.75rem 1rem;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            background: white;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            color: #333;

            &.active {
              border-color: #2E7D32;
            }

            &.disabled {
              background: #f5f5f5;
              cursor: not-allowed;
            }

            i {
              color: #666;
              transition: transform 0.2s;
            }

            &.active i {
              transform: rotate(180deg);
            }
          }

          .select-dropdown {
            position: absolute;
            top: calc(100% + 4px);
            left: 0;
            width: 100%;
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            z-index: 1001;
            max-height: calc(40vh);
            display: flex;
            flex-direction: column;

            .search-box {
              padding: 0.5rem;
              border-bottom: 1px solid #e0e0e0;
              position: relative;

              &::before {
                content: '\f002';
                font-family: 'Font Awesome 5 Free';
                font-weight: 900;
                position: absolute;
                left: 1rem;
                top: 50%;
                transform: translateY(-50%);
                color: #666;
              }

              input {
                width: 100%;
                padding: 0.5rem 0.75rem 0.5rem 2rem;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
                font-size: 0.9rem;
                background: #f8f9fa;

                &:focus {
                  outline: none;
                  border-color: #2E7D32;
                  background: white;
                }

                &::placeholder {
                  color: #999;
                }
              }
            }

            .options-list {
              flex: 1;
              overflow-y: auto;
              min-height: 0;
              max-height: 250px;

              .option {
                padding: 0.75rem 1rem;
                cursor: pointer;

                &:hover {
                  background: #f5f5f5;
                }

                .job-number {
                  font-weight: 500;
                  margin-bottom: 0.25rem;
                }

                .job-name {
                  color: #666;
                  font-size: 0.9rem;
                }
              }
            }

            .results-count {
              padding: 0.5rem;
              text-align: center;
              color: #666;
              font-size: 0.9rem;
              border-top: 1px solid #e0e0e0;
            }
          }
        }
      }
    }

    .dialog-footer {
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 1rem;

      button {
        padding: 0.75rem 1.5rem;
        border-radius: 4px;
        cursor: pointer;

        &.cancel-btn {
          background: white;
          border: 1px solid #e0e0e0;
          color: #666;

          &:hover {
            background: #f5f5f5;
          }
        }

        &.add-btn {
          background: #2E7D32;
          border: none;
          color: white;

          &:hover {
            background: #1B5E20;
          }

          &:disabled {
            background: #9e9e9e;
            cursor: not-allowed;
          }
        }
      }
    }
  }
}
</style> 