<template>
  <div class="jobs-container">
    <div class="jobs-header">
      <h1>Job Manager</h1>
    </div>

    <div class="jobs-tabs">
      <div class="tab-buttons">
        <button 
          class="tab-button"
          :class="{ active: currentTab === 'my-jobs' }"
          @click="currentTab = 'my-jobs'"
        >
          My Jobs <span class="count">{{ myJobsCount }}</span>
        </button>
        <button 
          class="tab-button"
          :class="{ active: currentTab === 'all-jobs' }"
          @click="currentTab = 'all-jobs'"
        >
          All Jobs <span class="count">{{ allJobsCount }}</span>
        </button>
      </div>

      <div class="view-controls">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search jobs..."
            class="search-input"
          >
        </div>
      </div>
    </div>

    <div class="jobs-content">
      <div v-if="loading" class="loading">
        Loading jobs...
      </div>
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      <div v-else>
        <div class="jobs-table">
          <table>
            <thead>
              <tr>
                <th @click="sort('job_number')">
                  Job No.
                  <i class="fas" :class="getSortIcon('job_number')"></i>
                </th>
                <th @click="sort('client_name')">
                  Client
                  <i class="fas" :class="getSortIcon('client_name')"></i>
                </th>
                <th @click="sort('name')">
                  Job Name
                  <i class="fas" :class="getSortIcon('name')"></i>
                </th>
                <th @click="sort('status')">
                  Status
                  <i class="fas" :class="getSortIcon('status')"></i>
                </th>
                <th @click="sort('due_date')">
                  Due Date
                  <i class="fas" :class="getSortIcon('due_date')"></i>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="job in paginatedJobs" 
                :key="job.id"
                @click="goToJobDetail(job.job_number || job.job_id)"
                class="job-row"
              >
                <td>{{ job.job_number || job.job_id }}</td>
                <td>{{ job.client_name }}</td>
                <td>{{ job.name }}</td>
                <td>{{ job.status }}</td>
                <td>{{ formatDate(job.due_date) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination-controls">
          <div class="items-per-page">
            <span>{{ startIndex + 1 }}-{{ endIndex }} of {{ totalItems }} items</span>
            <select v-model="itemsPerPage" class="per-page-select">
              <option value="10">10 items per page</option>
              <option value="20">20 items per page</option>
              <option value="50">50 items per page</option>
            </select>
          </div>
          <div class="pagination-buttons">
            <button 
              @click="previousPage" 
              :disabled="currentPage === 1"
              class="page-btn"
            >
              Previous
            </button>
            <div class="page-numbers">
              <button 
                v-for="page in displayedPages" 
                :key="page"
                @click="goToPage(page)"
                :class="['page-number', { active: currentPage === page }]"
              >
                {{ page }}
              </button>
            </div>
            <button 
              @click="nextPage" 
              :disabled="currentPage >= totalPages"
              class="page-btn"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
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
    const allJobs = ref([])
    const loading = ref(true)
    const error = ref(null)

    const currentPage = ref(1)
    const itemsPerPage = ref(10)

    const searchQuery = ref('')
    const sortBy = ref('job_number')
    const sortDesc = ref(false)

    const displayedJobs = computed(() => {
      return currentTab.value === 'my-jobs' ? myJobs.value : allJobs.value
    })

    // Filter and sort jobs first
    const filteredJobs = computed(() => {
      let filtered = displayedJobs.value

      // Apply search filter
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(job => 
          (job.job_number || '').toLowerCase().includes(query) ||
          (job.client_name || '').toLowerCase().includes(query) ||
          (job.name || '').toLowerCase().includes(query)
        )
      }

      // Apply sorting
      return [...filtered].sort((a, b) => {
        let aVal = a[sortBy.value]
        let bVal = b[sortBy.value]

        // Handle special cases for sorting
        if (sortBy.value === 'due_date') {
          aVal = aVal ? new Date(aVal) : new Date(0)
          bVal = bVal ? new Date(bVal) : new Date(0)
        }

        if (aVal === bVal) return 0
        const comparison = aVal > bVal ? 1 : -1
        return sortDesc.value ? -comparison : comparison
      })
    })

    // Then derive other computed properties from filteredJobs
    const totalItems = computed(() => filteredJobs.value.length)
    const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))
    const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
    const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, totalItems.value))
    const paginatedJobs = computed(() => filteredJobs.value.slice(startIndex.value, endIndex.value))

    const displayedPages = computed(() => {
      const pages = []
      const maxPages = 5 // Show max 5 page numbers
      let start = Math.max(1, currentPage.value - 2)
      let end = Math.min(totalPages.value, start + maxPages - 1)
      
      if (end - start + 1 < maxPages) {
        start = Math.max(1, end - maxPages + 1)
      }

      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      return pages
    })

    const fetchMyJobs = async () => {
      try {
        loading.value = true
        error.value = null
        
        const user = store.getters['auth/getUser']
        if (!user?.profile?.staff_uuid) {
          throw new Error('No staff UUID found')
        }

        const response = await axios.get(`/api/jobs/my-jobs/${user.profile.staff_uuid}/`)
        myJobs.value = response.data
      } catch (err) {
        console.error('Error fetching my jobs:', err)
        error.value = err.message || 'Failed to load jobs'
      } finally {
        loading.value = false
      }
    }

    const fetchAllJobs = async () => {
      try {
        loading.value = true
        error.value = null
        
        const response = await axios.get('/api/jobs/all/')
        allJobs.value = response.data
      } catch (err) {
        console.error('Error fetching all jobs:', err)
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

    const nextPage = () => {
      if (currentPage.value < totalPages.value) {
        currentPage.value++
      }
    }

    const previousPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--
      }
    }

    const goToPage = (page) => {
      currentPage.value = page
    }

    // Watch for tab changes to load appropriate data
    watch(currentTab, async (newTab) => {
      if (newTab === 'my-jobs') {
        await fetchMyJobs()
      } else if (newTab === 'all-jobs') {
        await fetchAllJobs()
      }
    })

    // Reset to first page when changing items per page
    watch(itemsPerPage, () => {
      currentPage.value = 1
    })

    // Reset to first page when changing tabs
    watch(currentTab, () => {
      currentPage.value = 1
    })

    const sort = (field) => {
      if (sortBy.value === field) {
        sortDesc.value = !sortDesc.value
      } else {
        sortBy.value = field
        sortDesc.value = false
      }
    }

    const getSortIcon = (field) => {
      if (sortBy.value !== field) return 'fa-sort'
      return sortDesc.value ? 'fa-sort-down' : 'fa-sort-up'
    }

    // Reset pagination when search changes
    watch(searchQuery, () => {
      currentPage.value = 1
    })

    // Add these computed properties
    const myJobsCount = computed(() => myJobs.value?.length || 0)
    const allJobsCount = computed(() => allJobs.value?.length || 0)

    onMounted(async () => {
      try {
        loading.value = true
        // Load both My Jobs and All Jobs in parallel
        await Promise.all([
          fetchMyJobs(),
          fetchAllJobs()
        ])
      } catch (err) {
        console.error('Error loading jobs:', err)
        error.value = 'Failed to load jobs'
      } finally {
        loading.value = false
      }
    })

    return {
      currentTab,
      displayedJobs,
      loading,
      error,
      formatDate,
      goToJobDetail,
      currentPage,
      itemsPerPage,
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      paginatedJobs,
      displayedPages,
      nextPage,
      previousPage,
      goToPage,
      searchQuery,
      sort,
      getSortIcon,
      filteredJobs,
      myJobsCount,
      allJobsCount,
      myJobs,
      allJobs
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;

    .tab-buttons {
      display: flex;
      gap: 1rem;
    }

    .view-controls {
      display: flex;
      gap: 1rem;
    }
  }

  .tab-button {
    padding: 0.5rem 1rem;
    border: none;
    background: none;
    cursor: pointer;
    color: #666;
    font-size: 1rem;

    &.active {
      color: #2E7D32;
      border-bottom: 2px solid #2E7D32;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .count {
      background: #f0f0f0;
      padding: 0.2rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      margin-left: 0.5rem;
    }
  }

  .search-box {
    position: relative;

    i {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #666;
    }

    .search-input {
      padding: 0.75rem 1rem 0.75rem 2.5rem;
      width: 300px;
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
        cursor: pointer;
        user-select: none;
        white-space: nowrap;

        i {
          margin-left: 0.5rem;
          font-size: 0.8rem;
        }

        &:hover {
          background: #e8e8e8;
        }
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

  .pagination-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    background: white;
    border-top: 1px solid #e0e0e0;

    .items-per-page {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: #666;

      .per-page-select {
        padding: 0.5rem;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        background: white;
        color: #333;
        cursor: pointer;

        &:focus {
          outline: none;
          border-color: #2E7D32;
        }
      }
    }

    .pagination-buttons {
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .page-btn {
        padding: 0.5rem 1rem;
        border: 1px solid #e0e0e0;
        background: white;
        color: #333;
        cursor: pointer;
        border-radius: 4px;

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &:hover:not(:disabled) {
          background: #f5f5f5;
        }
      }

      .page-numbers {
        display: flex;
        gap: 0.25rem;

        .page-number {
          padding: 0.5rem 1rem;
          border: 1px solid #e0e0e0;
          background: white;
          color: #333;
          cursor: pointer;
          border-radius: 4px;

          &.active {
            background: #2E7D32;
            color: white;
            border-color: #2E7D32;
          }

          &:hover:not(.active) {
            background: #f5f5f5;
          }
        }
      }
    }
  }
}
</style> 