import axios from 'axios'

// Set base URL for API requests
axios.defaults.baseURL = process.env.VUE_APP_API_URL || 'http://localhost:8000'
axios.defaults.withCredentials = true

// Add interceptor to handle authentication
axios.interceptors.request.use(config => {
  const tokens = JSON.parse(localStorage.getItem('tokens'))
  if (tokens) {
    config.headers.Authorization = `JWT ${tokens.access}`
  }
  return config
})

export default axios 