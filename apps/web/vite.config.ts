import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    conditions: ["source"],
    alias: [
      {
        find: /^@constants\/(.*)$/,
        replacement: path.resolve(__dirname, '../../consts/$1'),
      },
    ],
  },
  plugins: [tailwindcss(), react(), babel({ presets: [reactCompilerPreset()] })],
})
