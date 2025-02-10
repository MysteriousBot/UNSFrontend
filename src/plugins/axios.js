import axios from 'axios'
import store from '@/store'

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

// Add response interceptor to handle token refresh
axios.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config
    
    // If the error is 401 and we haven't tried to refresh yet
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      try {
        const tokens = JSON.parse(localStorage.getItem('tokens'))
        if (tokens?.refresh) {
          // Try to refresh the token
          const response = await axios.post('/auth/jwt/refresh/', {
            refresh: tokens.refresh
          })
          
          // Update the tokens
          const newTokens = {
            ...tokens,
            access: response.data.access
          }
          localStorage.setItem('tokens', JSON.stringify(newTokens))
          
          // Retry the original request
          originalRequest.headers.Authorization = `JWT ${response.data.access}`
          return axios(originalRequest)
        }
      } catch (refreshError) {
        // If refresh fails, clear auth and redirect to login
        store.commit('auth/CLEAR_AUTH')
        localStorage.removeItem('tokens')
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

export default axios 