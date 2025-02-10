<template>
  <div class="login-page">
    <div class="login-card">
      <div class="logo-section">
        <img src="@/assets/logo.png" alt="NeoMatrix Logo" class="logo">
      </div>
      
      <h1>{{ isRegistering ? 'Create Account' : 'Log in to NeoMatrix' }}<br>Timetracking Portal</h1>

      <!-- Login Form -->
      <form v-if="!isRegistering" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="login-username">Username</label>
          <input 
            id="login-username"
            type="text"
            v-model="loginForm.username"
            required
            placeholder="Enter your username"
            class="form-input"
          >
        </div>
        <div class="form-group">
          <label for="login-password">Password</label>
          <input 
            id="login-password"
            type="password" 
            v-model="loginForm.password" 
            required
            placeholder="Enter your password"
            class="form-input"
          >
        </div>
        <div class="form-options">
          <label class="remember-me">
            <input type="checkbox" v-model="loginForm.rememberMe">
            <span>Remember me</span>
          </label>
          <a href="#" class="forgot-password">Forgotten password?</a>
        </div>
        <button 
          type="submit" 
          :disabled="loading" 
          class="submit-button"
          @click="console.log('Login button clicked')"
        >
          {{ loading ? 'Logging in...' : 'Log In' }}
        </button>
        <div class="toggle-text">
          Don't have an account? <a href="#" @click.prevent="isRegistering = true">Register</a>
        </div>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </form>

      <!-- Registration Form -->
      <form v-else @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="reg-firstname">First Name</label>
          <input 
            id="reg-firstname"
            type="text" 
            v-model="registerForm.firstName" 
            required
            placeholder="Enter your first name"
            class="form-input"
          >
        </div>
        <div class="form-group">
          <label for="reg-lastname">Last Name</label>
          <input 
            id="reg-lastname"
            type="text" 
            v-model="registerForm.lastName" 
            required
            placeholder="Enter your last name"
            class="form-input"
          >
        </div>
        <div class="form-group">
          <label for="reg-username">Username</label>
          <input 
            id="reg-username"
            type="text" 
            v-model="registerForm.username" 
            required
            placeholder="Choose a username"
            class="form-input"
          >
        </div>
        <div class="form-group">
          <label for="reg-email">Work Email</label>
          <input 
            id="reg-email"
            type="email" 
            v-model="registerForm.email" 
            required
            placeholder="Enter your work email"
            class="form-input"
            @blur="() => checkStaffEmail(registerForm.email)"
          >
          <div v-if="error && error.includes('staff')" class="input-error">
            {{ error }}
          </div>
        </div>
        <div class="form-group">
          <label for="reg-password">Password</label>
          <input 
            id="reg-password"
            type="password" 
            v-model="registerForm.password" 
            required
            placeholder="Create a password"
            class="form-input"
          >
        </div>
        <div class="form-group">
          <label for="reg-confirm-password">Confirm Password</label>
          <input 
            id="reg-confirm-password"
            type="password" 
            v-model="registerForm.confirmPassword" 
            required
            placeholder="Confirm your password"
            class="form-input"
          >
        </div>
        <button type="submit" :disabled="loading" class="submit-button">
          Register
        </button>
        <div class="toggle-text">
          Already have an account? <a href="#" @click.prevent="isRegistering = false">Login</a>
        </div>
        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </form>

      <div class="footer-links">
        <a href="#">Help</a>
        <a href="#">Privacy</a>
        <a href="#">Terms</a>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'
import axios from 'axios'

export default {
  name: 'LoginView',
  setup() {
    const isRegistering = ref(false)
    const loading = ref(false)
    const error = ref('')
    const router = useRouter()
    const store = useStore()

    const loginForm = reactive({
      username: '',
      password: '',
      rememberMe: false
    })

    const registerForm = ref({
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      staff_uuid: null  // Will store the UUID if email is valid
    })

    const handleLogin = async () => {
      try {
        console.log('Login handler called')
        loading.value = true
        error.value = ''

        // Use the store for login
        await store.dispatch('auth/login', {
          username: loginForm.username,
          password: loginForm.password
        })
        
        console.log('Login successful, redirecting...')
        router.push('/dashboard')
      } catch (err) {
        console.error('Login error:', err.response?.data)
        error.value = err.response?.data?.detail || 
                      Object.values(err.response?.data || {})[0]?.[0] ||
                      'Login failed'
      } finally {
        loading.value = false
      }
    }

    async function checkStaffEmail(email) {
      if (!email) return false
      
      try {
        const { data } = await axios.post('/auth/check-staff-email/', { email })
        if (data.exists) {
          registerForm.value.staff_uuid = data.staff_uuid
          error.value = null // Clear any previous errors
          return true
        }
        error.value = 'Email not found in staff records. Please contact your administrator.'
        return false
      } catch (err) {
        error.value = 'Error checking staff email.'
        return false
      }
    }

    async function handleRegister() {
      try {
        loading.value = true
        error.value = null

        // Validate passwords match
        if (registerForm.value.password !== registerForm.value.confirmPassword) {
          error.value = 'Passwords do not match'
          return
        }

        // Check staff email first
        const { data: staffCheck } = await axios.post('/auth/check-staff-email/', {
          email: registerForm.value.email
        })

        if (!staffCheck.exists) {
          error.value = 'Email not found in staff records. Please contact your administrator.'
          return
        }

        // Store staff UUID
        registerForm.value.staff_uuid = staffCheck.staff_uuid

        // Proceed with registration
        await store.dispatch('auth/register', {
          username: registerForm.value.username,
          email: registerForm.value.email,
          password: registerForm.value.password,
          staff_uuid: registerForm.value.staff_uuid
        })
        
        // After successful registration, log in automatically
        await store.dispatch('auth/login', {
          username: registerForm.value.username,
          password: registerForm.value.password
        })

        // Redirect to dashboard on success
        router.push('/dashboard')
        
      } catch (err) {
        console.error('Registration error:', err)
        error.value = err.response?.data?.email || 
                     err.response?.data?.detail || 
                     'Registration failed. Please try again.'
      } finally {
        loading.value = false
      }
    }

    // Add this test function
    const testBackendConnection = async () => {
      try {
        console.log('Testing backend connection...')
        const response = await axios.get('/auth/users/me/')
        console.log('Backend response:', response)
      } catch (error) {
        console.log('Backend error:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        })
      }
    }

    // Call it when component mounts
    onMounted(() => {
      testBackendConnection()
    })

    return {
      isRegistering,
      loginForm,
      registerForm,
      loading,
      error,
      handleLogin,
      handleRegister,
      checkStaffEmail
    }
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #2E7D32;
  padding: 2rem;
}

.login-card {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

  .logo-section {
    margin-bottom: 1.5rem;
    
    .logo {
      height: 40px;
    }
  }

  h1 {
    font-size: 1.5rem;
    color: #333;
    margin-bottom: 2rem;
    line-height: 1.4;
    font-weight: 500;
  }

  .form-group {
    margin-bottom: 1.5rem;
    text-align: left;

    label {
      display: block;
      margin-bottom: 0.6rem;
      color: #333;
      font-size: 0.9rem;
      font-weight: 500;

      &::after {
        content: ':';
        margin-left: 2px;
      }
    }

    .form-input {
      width: 100%;
      padding: 0.75rem 1rem;
      background-color: #f8f9fa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 1rem;
      transition: all 0.2s;

      &:focus {
        outline: none;
        border-color: #43a047;
        background-color: #fff;
      }
    }
  }

  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;

    .remember-me {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #666;
      cursor: pointer;

      input[type="checkbox"] {
        accent-color: #43a047;
      }
    }

    .forgot-password {
      color: #43a047;
      text-decoration: none;
      font-size: 0.9rem;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .submit-button {
    width: 100%;
    padding: 0.75rem;
    background: #43a047;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background: #2E7D32;
    }

    &:disabled {
      background: #9e9e9e;
      cursor: not-allowed;
    }
  }

  .toggle-text {
    margin-top: 1rem;
    color: #666;
    font-size: 0.9rem;

    a {
      color: #43a047;
      text-decoration: none;
      font-weight: 500;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .error-message {
    margin-top: 1rem;
    color: #d32f2f;
    font-size: 0.9rem;
  }

  .footer-links {
    margin-top: 2rem;
    display: flex;
    justify-content: center;
    gap: 1.5rem;

    a {
      color: #666;
      text-decoration: none;
      font-size: 0.9rem;

      &:hover {
        text-decoration: underline;
      }
    }
  }
}

.input-error {
  color: #d32f2f;
  font-size: 0.8rem;
  margin-top: 0.25rem;
  text-align: left;
}
</style> 