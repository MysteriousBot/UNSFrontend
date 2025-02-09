<template>
  <div class="clients-container">
    <h1>Clients</h1>

    <div class="clients-tabs">
      <div class="tab-buttons">
        <button 
          class="tab-button"
          :class="{ active: currentTab === 'clients' }"
          @click="currentTab = 'clients'"
        >
          Clients <span class="count">{{ mqttService.clients.value.length }}</span>
        </button>
        <button 
          class="tab-button"
          :class="{ active: currentTab === 'groups' }"
          @click="currentTab = 'groups'"
          disabled
        >
          Groups <span class="count">0</span>
        </button>
        <button 
          class="tab-button"
          :class="{ active: currentTab === 'contacts' }"
          @click="currentTab = 'contacts'"
          disabled
        >
          Contacts <span class="count">430</span>
        </button>
      </div>

      <div class="view-controls">
        <div class="search-box">
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search"
            class="search-input"
          >
        </div>
        <button class="filter-btn">Filter</button>
      </div>
    </div>

    <div class="view-tabs">
      <button 
        :class="{ active: viewType === 'active' }"
        @click="viewType = 'active'"
      >
        Active
      </button>
      <button 
        :class="{ active: viewType === 'favourites' }"
        @click="viewType = 'favourites'"
      >
        Favourites
      </button>
      <button 
        :class="{ active: viewType === 'archived' }"
        @click="viewType = 'archived'"
      >
        Archived
      </button>
    </div>

    <div class="clients-table">
      <table>
        <thead>
          <tr>
            <th class="favorite-col"></th>
            <th @click="sort('name')">Name</th>
            <th @click="sort('status')">Status</th>
            <th @click="sort('phone')">Phone</th>
            <th @click="sort('address.street')">Default Address</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in filteredClients" :key="client.uuid">
            <td>
              <button class="star-btn" @click="toggleArchive(client)">
                <i class="fas" :class="client.status === 'archived' ? 'fa-archive' : 'fa-check-circle'"></i>
              </button>
            </td>
            <td>{{ client.name }}</td>
            <td>
              <span class="status-badge" :class="client.status">
                {{ client.status }}
              </span>
            </td>
            <td>{{ client.phone || '-' }}</td>
            <td>{{ client.address?.street || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { mqttService } from '@/services/mqtt'

export default {
  name: 'ClientsView',
  setup() {
    const currentTab = ref('clients')
    const viewType = ref('active')
    const searchQuery = ref('')
    const sortField = ref('name')
    const sortDirection = ref('asc')

    const filteredClients = computed(() => {
      return mqttService.clients.value
        .filter(client => {
          if (viewType.value === 'active' && client.status !== 'active') return false
          if (viewType.value === 'archived' && client.status !== 'archived') return false
          
          if (searchQuery.value) {
            const query = searchQuery.value.toLowerCase()
            return client.name.toLowerCase().includes(query) ||
                   client.address?.street?.toLowerCase().includes(query) ||
                   client.phone?.toLowerCase().includes(query) ||
                   client.email?.toLowerCase().includes(query)
          }
          return true
        })
        .sort((a, b) => {
          const aVal = a[sortField.value]
          const bVal = b[sortField.value]
          return sortDirection.value === 'asc' 
            ? (aVal > bVal ? 1 : -1)
            : (aVal < bVal ? 1 : -1)
        })
    })

    const sort = (field) => {
      if (sortField.value === field) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
      } else {
        sortField.value = field
        sortDirection.value = 'asc'
      }
    }

    const toggleArchive = async (client) => {
      try {
        await axios.patch(`/api/clients/${client.uuid}/favorite/`)
        client.status = client.status === 'Active' ? 'Archived' : 'Active'
      } catch (err) {
        console.error('Error toggling archive status:', err)
      }
    }

    const updateClient = async (client, updates) => {
      try {
        await mqttService.updateClient(client.uuid, updates)
      } catch (err) {
        console.error('Error updating client:', err)
        // You might want to add error handling UI here
      }
    }

    onMounted(() => {
      if (mqttService.clients.value.length === 0) {
        mqttService.connect()
      }
    })

    onUnmounted(() => {
      mqttService.disconnect()
    })

    return {
      currentTab,
      viewType,
      searchQuery,
      filteredClients,
      sort,
      toggleArchive,
      mqttService,
      updateClient
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

  .search-input {
    padding: 0.5rem 1rem;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    width: 300px;
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

  .view-tabs {
    margin-bottom: 1rem;
    border-bottom: 1px solid #e0e0e0;

    button {
      padding: 0.75rem 1.5rem;
      border: none;
      background: none;
      cursor: pointer;
      color: #666;
      border-bottom: 2px solid transparent;

      &.active {
        color: #2E7D32;
        border-bottom-color: #2E7D32;
      }
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

        &:hover {
          background: #eee;
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
}
</style> 