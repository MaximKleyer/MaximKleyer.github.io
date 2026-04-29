import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // IMPORTANT: This "base" path must match the subfolder where your built
  // files will live on GitHub Pages. When someone visits
  // maximkleyer.github.io/gm-sim/, the browser needs to know that all
  // asset URLs (JS bundles, CSS, images) are relative to /gm-sim/,
  // not the root /. Without this, every asset request would 404.
  base: '/gm-sim/',

  build: {
    // Output the built files into a folder called "gm-sim" one level
    // up from this project — i.e., right inside your main repo root.
    // After running "npm run build", you'll see a gm-sim/ folder appear
    // in maximkleyer.github.io/ with index.html, assets/, etc.
    outDir: '../gm-sim',
  },
});
