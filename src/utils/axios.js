import axios from 'axios'

// Create axios instance with default config
const instance = axios.create({
  baseURL: process.env.VUE_APP_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
})

// Add request interceptor to add auth token
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `JWT ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

export default instance 