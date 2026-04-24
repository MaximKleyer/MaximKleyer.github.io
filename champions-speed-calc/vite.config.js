import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// For GitHub Pages: set `base` to '/YOUR-REPO-NAME/'
// Change this to match the name you use on GitHub.
export default defineConfig({
  plugins: [react()],
  base: '/champions-speed-calc/',
  build: {
    outDir: 'dist',
  },
});
