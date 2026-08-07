import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/index.css'
import './styles/markdown.css'
import './styles/themes.css'
import 'katex/dist/katex.min.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
