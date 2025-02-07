import axios from 'axios'

export default {
  namespaced: true,
  
  state: {
    tokens: JSON.parse(localStorage.getItem('tokens')) || null,
    user: null
  },

  getters: {
    isAuthenticated: state => !!state.tokens,
    getUser: state => state.user
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
    }
  }
} 