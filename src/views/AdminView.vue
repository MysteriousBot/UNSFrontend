<template>
  <div class="admin-container">
    <div class="admin-header">
      <h1>Staff Management</h1>
      <div class="header-actions">
        <div class="search-box">
          <i class="fas fa-search"></i>
          <input 
            type="text" 
            v-model="searchQuery" 
            placeholder="Search staff..."
          >
        </div>
      </div>
    </div>

    <div class="staff-table">
      <div v-if="loading" class="loading">Loading staff data...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else>
        <table>
          <thead>
            <tr>
              <th @click="sort('name')">
                Name
                <i class="fas" :class="getSortIcon('name')"></i>
              </th>
              <th @click="sort('email')">
                Email
                <i class="fas" :class="getSortIcon('email')"></i>
              </th>
              <th @click="sort('phone')">
                Phone
                <i class="fas" :class="getSortIcon('phone')"></i>
              </th>
              <th @click="sort('payroll_code')">
                Payroll Code
                <i class="fas" :class="getSortIcon('payroll_code')"></i>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="member in sortedStaff" 
              :key="member.uuid"
              @click="viewStaffDetails(member.uuid)"
              class="staff-row"
            >
              <td>{{ member.name }}</td>
              <td>{{ member.email }}</td>
              <td>{{ member.phone || member.mobile || '-' }}</td>
              <td>{{ member.payroll_code || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

export default {
  name: 'AdminView',
  setup() {
    const router = useRouter()
    const staff = ref([])
    const loading = ref(true)
    const error = ref(null)
    const searchQuery = ref('')
    const sortBy = ref('name')
    const sortDesc = ref(false)

    const sortedStaff = computed(() => {
      let filtered = staff.value
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase()
        filtered = filtered.filter(s => 
          s.name.toLowerCase().includes(query) ||
          s.email.toLowerCase().includes(query) ||
          (s.payroll_code && s.payroll_code.toLowerCase().includes(query))
        )
      }

      return filtered.sort((a, b) => {
        const aVal = a[sortBy.value] || ''
        const bVal = b[sortBy.value] || ''
        return sortDesc.value 
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal)
      })
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

    const fetchStaff = async () => {
      try {
        loading.value = true
        const { data } = await axios.get('/api/admin/staff/')
        staff.value = data
      } catch (err) {
        console.error('Error fetching staff:', err)
        error.value = 'Failed to load staff data'
      } finally {
        loading.value = false
      }
    }

    const viewStaffDetails = (uuid) => {
      router.push(`/admin/staff/${uuid}`)
    }

    onMounted(fetchStaff)

    return {
      staff,
      loading,
      error,
      searchQuery,
      sortedStaff,
      sort,
      getSortIcon,
      viewStaffDetails
    }
  }
}
</script>

<style lang="scss" scoped>
.admin-container {
  padding: 2rem;

  .admin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;

    h1 {
      font-size: 1.8rem;
      color: #333;
    }

    .search-box {
      position: relative;
      
      i {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #666;
      }

      input {
        padding: 0.75rem 1rem 0.75rem 2.5rem;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        width: 300px;
        font-size: 1rem;

        &:focus {
          outline: none;
          border-color: #2E7D32;
        }
      }
    }
  }

  .staff-table {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);

    table {
      width: 100%;
      border-collapse: collapse;

      th {
        background: #f5f5f5;
        padding: 1rem;
        text-align: left;
        font-weight: 500;
        color: #666;
        cursor: pointer;
        user-select: none;

        i {
          margin-left: 0.5rem;
        }

        &:hover {
          background: #e0e0e0;
        }
      }

      td {
        padding: 1rem;
        border-bottom: 1px solid #e0e0e0;
      }

      .staff-row {
        cursor: pointer;

        &:hover {
          background: #f5f5f5;
        }
      }
    }
  }
}
</style> 