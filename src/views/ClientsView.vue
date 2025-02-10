<template>
  <div class="clients-container">
    <div class="clients-header">
      <h1>Clients</h1>
    </div>

    <div class="clients-tabs">
      <div class="tab-buttons">
        <button 
          class="tab-button"
          :class="{ active: currentTab === 'clients' }"
          @click="currentTab = 'clients'"
        >
          Clients <span class="count">{{ clients.length }}</span>
        </button>
        <button 
          class="tab-button"
          :class="{ active: currentTab === 'contacts' }"
          @click="currentTab = 'contacts'"
        >
          Contacts <span class="count">{{ contacts.length }}</span>
        </button>
      </div>

      <div class="view-controls">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search..."
            class="search-input"
          >
        </div>
      </div>
    </div>

    <!-- Clients Table -->
    <div v-if="currentTab === 'clients'" class="clients-table">
      <table>
        <thead>
          <tr>
            <th @click="sort('name')">
              Name
              <i class="fas" :class="getSortIcon('name')"></i>
            </th>
            <th @click="sort('status')">
              Status
              <i class="fas" :class="getSortIcon('status')"></i>
            </th>
            <th @click="sort('phone')">
              Phone
              <i class="fas" :class="getSortIcon('phone')"></i>
            </th>
            <th @click="sort('address')">
              Default Address
              <i class="fas" :class="getSortIcon('address')"></i>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="client in paginatedClients" 
            :key="client.uuid"
            @click="goToClientDetail(client.uuid)"
            class="clickable-row"
          >
            <td>{{ client.name }}</td>
            <td>
              <span class="status-badge" :class="client.status.toLowerCase()">
                {{ client.status }}
              </span>
            </td>
            <td>{{ client.phone || '-' }}</td>
            <td>{{ client.address || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Contacts Table -->
    <div v-else class="clients-table">
      <table>
        <thead>
          <tr>
            <th @click="sort('name')">
              Name
              <i class="fas" :class="getSortIcon('name')"></i>
            </th>
            <th @click="sort('client')">
              Client(s)
              <i class="fas" :class="getSortIcon('client')"></i>
            </th>
            <th @click="sort('phone')">
              Phone
              <i class="fas" :class="getSortIcon('phone')"></i>
            </th>
            <th @click="sort('email')">
              Email
              <i class="fas" :class="getSortIcon('email')"></i>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="contact in paginatedContacts" :key="contact.uuid">
            <td>{{ contact.name }}</td>
            <td>
              <span class="client-badge">{{ contact.client }}</span>
            </td>
            <td>{{ contact.phone || '-' }}</td>
            <td>{{ contact.email || '-' }}</td>
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
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

export default {
  name: 'ClientsView',
  setup() {
    const clients = ref([])
    const loading = ref(true)
    const error = ref(null)
    const currentTab = ref('clients')
    const viewType = ref('active')
    const searchQuery = ref('')
    const sortBy = ref('name')
    const sortDesc = ref(false)
    
    // Pagination
    const currentPage = ref(1)
    const itemsPerPage = ref(10)

    const contacts = ref([])

    const router = useRouter()

    const fetchClients = async () => {
      try {
        loading.value = true
        const { data } = await axios.get('/api/clients/')
        clients.value = data
      } catch (err) {
        error.value = 'Failed to load clients'
        console.error('Error:', err)
      } finally {
        loading.value = false
      }
    }

    const fetchContacts = async () => {
      try {
        loading.value = true
        const { data } = await axios.get('/api/contacts/')
        contacts.value = data
      } catch (err) {
        error.value = 'Failed to load contacts'
        console.error('Error:', err)
      } finally {
        loading.value = false
      }
    }

    const filteredItems = computed(() => {
      const items = currentTab.value === 'clients' ? clients.value : contacts.value
      if (!searchQuery.value) return items

      const query = searchQuery.value.toLowerCase()
      return items.filter(item => {
        if (currentTab.value === 'clients') {
          return item.name.toLowerCase().includes(query)
        } else {
          return (
            item.name.toLowerCase().includes(query) ||
            item.client.toLowerCase().includes(query) ||
            (item.email || '').toLowerCase().includes(query) ||
            (item.phone || '').toLowerCase().includes(query)
          )
        }
      })
    })

    const paginatedItems = computed(() => {
      return filteredItems.value.slice(startIndex.value, endIndex.value)
    })

    const paginatedClients = computed(() => {
      if (currentTab.value !== 'clients') return []
      return paginatedItems.value
    })

    const paginatedContacts = computed(() => {
      if (currentTab.value !== 'contacts') return []
      return paginatedItems.value
    })

    // Pagination computed properties
    const totalItems = computed(() => filteredItems.value.length)
    const totalPages = computed(() => Math.ceil(totalItems.value / itemsPerPage.value))
    const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value)
    const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, totalItems.value))

    const displayedPages = computed(() => {
      const pages = []
      const maxPages = 5
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

    // Pagination methods
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

    const goToClientDetail = (clientId) => {
      router.push(`/clients/${clientId}`)
    }

    // Load both clients and contacts on mount
    onMounted(async () => {
      await Promise.all([
        fetchClients(),
        fetchContacts()
      ])
    })

    // Watch for tab changes
    watch(currentTab, () => {
      currentPage.value = 1
    })

    return {
      clients,
      loading,
      error,
      currentTab,
      viewType,
      searchQuery,
      currentPage,
      itemsPerPage,
      totalItems,
      totalPages,
      startIndex,
      endIndex,
      paginatedClients,
      paginatedContacts,
      displayedPages,
      nextPage,
      previousPage,
      goToPage,
      sort,
      getSortIcon,
      contacts,
      goToClientDetail
    }
  }
}
</script>

<style lang="scss" scoped>
.clients-container {
  padding: 2rem;

  h1 {
    font-size: 1.8rem;
    color: #333;
    margin-bottom: 2rem;
  }

  .clients-tabs {
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

  .filter-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: white;
    cursor: pointer;

    &:hover {
      background: #f5f5f5;
    }
  }

  .clients-table {
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

      .favorite-col {
        width: 40px;
      }

      .star-btn {
        background: none;
        border: none;
        color: #ffd700;
        cursor: pointer;
        padding: 0.25rem;
      }

      .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.9rem;

        &.active {
          background: #e8f5e9;
          color: #2e7d32;
        }

        &.archived {
          background: #f5f5f5;
          color: #666;
        }
      }
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

  .client-badge {
    background: #f0f0f0;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.9rem;
    color: #666;
  }

  .clickable-row {
    cursor: pointer;
    
    &:hover {
      background: #f5f5f5;
    }
  }
}
</style>