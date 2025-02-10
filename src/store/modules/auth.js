import axios from 'axios'

export default {
  namespaced: true,
  
  state: {
    tokens: JSON.parse(localStorage.getItem('tokens')) || null,
    user: null,
    loading: false,
    error: null
  },

  getters: {
    isAuthenticated: state => !!state.tokens,
    getUser: state => state.user,
    isAdmin: state => state.user?.profile?.role === 'ADMIN'
  },

  mutations: {
    SET_TOKENS(state, tokens) {
      state.tokens = tokens
      localStorage.setItem('tokens', JSON.stringify(tokens))
    },
    SET_USER(state, user) {
      state.user = user
      console.log('Setting user in auth store:', user)
    },
    CLEAR_AUTH(state) {
      state.tokens = null
      state.user = null
      localStorage.removeItem('tokens')
    }
  },

  actions: {
    async login({ commit }, credentials) {
      try {
        console.log('Auth store login called with:', { 
          ...credentials, 
          password: '****' 
        })

        // Get JWT tokens
        const { data: tokens } = await axios.post('/auth/jwt/create/', {
          username: credentials.username,
          password: credentials.password
        })
        
        // Set token in axios headers
        axios.defaults.headers.common['Authorization'] = `JWT ${tokens.access}`
        
        // Save tokens
        commit('SET_TOKENS', tokens)

        // Get user data with profile
        const { data: user } = await axios.get('/auth/users/me/')
        console.log('Received user data:', user)
        
        // Get staff UUID from user profile
        const staffUuid = user.profile?.staff_uuid
        commit('SET_USER', { ...user, staff_uuid: staffUuid })

        return tokens
      } catch (error) {
        console.error('Auth store login error:', error.response?.data)
        commit('CLEAR_AUTH')
        throw error
      }
    },

    async logout({ commit }) {
      commit('CLEAR_AUTH')
    },

    async fetchUser({ commit }) {
      try {
        const { data } = await axios.get('/auth/users/me/')
        commit('SET_USER', data)
        return data
      } catch (error) {
        commit('CLEAR_AUTH')
        throw error
      }
    },

    async register({ commit }, userData) {
      try {
        // Register the user
        const { data: registerData } = await axios.post('/auth/users/', {
          username: userData.username,
          email: userData.email,
          password: userData.password
        })

        // After registration, immediately login
        const { data: loginData } = await axios.post('/auth/jwt/create/', {
          username: userData.username,
          password: userData.password
        })

        // Set the tokens
        commit('SET_TOKENS', {
          access: loginData.access,
          refresh: loginData.refresh
        })

        return registerData
      } catch (error) {
        console.error('Registration error:', error.response?.data)
        throw error
      }
    },

    async initializeAuth({ commit, state }) {
      if (state.tokens) {
        try {
          const response = await axios.get('/auth/users/me/')
          commit('SET_USER', response.data)
          return response.data
        } catch (error) {
          console.error('Failed to load user profile:', error)
          // If we get a 401, clear the tokens and user
          if (error.response?.status === 401) {
            commit('CLEAR_AUTH')
            localStorage.removeItem('tokens')
          }
          throw error
        }
      }
    }
  }
} 