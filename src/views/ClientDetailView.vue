<template>
  <div class="client-detail">
    <div class="client-header">
      <h1>{{ client.name }}</h1>
    </div>

    <div class="tabs-container">
      <div class="tab-buttons">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="['tab-button', { active: currentTab === tab.id }]"
          @click="currentTab = tab.id"
        >
          {{ tab.name }}
        </button>
      </div>

      <!-- Overview Tab -->
      <div v-if="currentTab === 'overview'" class="tab-content">
        <div class="info-grid">
          <div class="info-section">
            <h3>Contact Information</h3>
            <div class="info-row">
              <span class="label">Phone:</span>
              <span>{{ client.phone || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Email:</span>
              <span>{{ client.email || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Website:</span>
              <span>{{ client.website || '-' }}</span>
            </div>
          </div>
          <div class="info-section">
            <h3>Address</h3>
            <div class="info-row">
              <span>{{ client.address || '-' }}</span>
            </div>
          </div>
          <div class="info-section">
            <h3>Management</h3>
            <div class="info-row">
              <span class="label">Account Manager:</span>
              <span>{{ client.account_manager || '-' }}</span>
            </div>
            <div class="info-row">
              <span class="label">Job Manager:</span>
              <span>{{ client.job_manager || '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Jobs Tab -->
      <div v-else-if="currentTab === 'jobs'" class="tab-content">
        <table>
          <thead>
            <tr>
              <th>Job No.</th>
              <th>Name</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            <tr 
              v-for="job in clientJobs" 
              :key="job.job_number"
              @click="goToJob(job.job_number)"
              class="clickable-row"
            >
              <td>{{ job.job_number }}</td>
              <td>{{ job.name }}</td>
              <td>{{ job.status }}</td>
              <td>{{ formatDate(job.due_date) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Contacts Tab -->
      <div v-else-if="currentTab === 'contacts'" class="tab-content">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contact in clientContacts" :key="contact.uuid">
              <td>{{ contact.name }}</td>
              <td>{{ contact.phone || '-' }}</td>
              <td>{{ contact.email || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

export default {
  name: 'ClientDetailView',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const clientId = route.params.clientId
    const currentTab = ref('overview')
    const client = ref({})
    const clientJobs = ref([])
    const clientContacts = ref([])
    const loading = ref(true)
    const error = ref(null)
    const clientNumericId = ref(null)

    const tabs = [
      { id: 'overview', name: 'Overview' },
      { id: 'jobs', name: 'Jobs' },
      { id: 'contacts', name: 'Contacts' }
    ]

    const fetchClientDetails = async () => {
      try {
        const { data } = await axios.get(`/api/clients/${clientId}/`)
        client.value = data
        clientNumericId.value = data.id
      } catch (err) {
        error.value = 'Failed to load client details'
        console.error(err)
      }
    }

    const fetchClientJobs = async () => {
      try {
        const { data } = await axios.get(`/api/clients/${clientId}/jobs/`)
        clientJobs.value = data
      } catch (err) {
        console.error(err)
      }
    }

    const fetchClientContacts = async () => {
      try {
        const { data } = await axios.get(`/api/clients/${clientNumericId.value}/contacts/`)
        clientContacts.value = data
      } catch (err) {
        console.error(err)
      }
    }

    const goToJob = (jobId) => {
      router.push(`/jobs/${jobId}`)
    }

    const formatDate = (dateString) => {
      if (!dateString) return '-'
      return new Date(dateString).toLocaleDateString()
    }

    onMounted(async () => {
      try {
        loading.value = true
        await fetchClientDetails()
        await Promise.all([
          fetchClientJobs(),
          clientNumericId.value ? fetchClientContacts() : Promise.resolve([])
        ])
      } catch (err) {
        error.value = 'Failed to load client information'
      } finally {
        loading.value = false
      }
    })

    return {
      client,
      clientJobs,
      clientContacts,
      currentTab,
      tabs,
      loading,
      error,
      goToJob,
      formatDate,
      clientNumericId
    }
  }
}
</script>

<style lang="scss" scoped>
.client-detail {
  padding: 2rem;

  .client-header {
    margin-bottom: 2rem;
    h1 {
      font-size: 2rem;
      color: #333;
    }
  }

  .tabs-container {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    overflow: hidden;

    .tab-buttons {
      display: flex;
      border-bottom: 1px solid #e0e0e0;
      background: #f5f5f5;
      padding: 0 1rem;

      .tab-button {
        padding: 1rem 1.5rem;
        border: none;
        background: none;
        cursor: pointer;
        color: #666;
        font-size: 1rem;
        
        &.active {
          color: #2E7D32;
          border-bottom: 2px solid #2E7D32;
          margin-bottom: -1px;
        }

        &:hover:not(.active) {
          color: #333;
        }
      }
    }

    .tab-content {
      padding: 1.5rem;

      .info-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;

        .info-section {
          h3 {
            color: #333;
            margin-bottom: 1rem;
            font-size: 1.2rem;
          }

          .info-row {
            margin-bottom: 0.5rem;
            
            .label {
              color: #666;
              margin-right: 0.5rem;
            }
          }
        }
      }

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
          background: #f5f5f5;
        }

        .clickable-row {
          cursor: pointer;
          
          &:hover {
            background: #f5f5f5;
          }
        }
      }
    }
  }
}
</style> 