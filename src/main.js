import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import axios from './plugins/axios'
import '@fortawesome/fontawesome-free/css/all.css'

const app = createApp(App)
app.config.globalProperties.$axios = axios
app.use(store).use(router).mount('#app')
