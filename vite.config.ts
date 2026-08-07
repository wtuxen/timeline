import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `base: './'` mantém os assets relativos, então o mesmo build funciona em
// GitHub Pages (usuário ou projeto), Vercel, Netlify ou abrindo via file://.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
