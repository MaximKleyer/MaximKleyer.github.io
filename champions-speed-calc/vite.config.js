import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// This site is served from the repo root (classic branch-based GitHub
// Pages), so the built app is committed into a root-level folder and
// served from there — same pattern as gm-sim-react.
//
// The output folder is suffixed "-app" because this project's SOURCE
// directory is already called champions-speed-calc/ at the repo root;
// building into ../champions-speed-calc would overwrite the source.
export default defineConfig({
  plugins: [react()],
  base: '/champions-speed-calc-app/',
  build: {
    outDir: '../champions-speed-calc-app',
    emptyOutDir: true,
  },
});
