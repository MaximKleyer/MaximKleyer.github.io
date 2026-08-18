import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
// This site is served from the repo root (classic branch-based GitHub
// Pages), so the built app is committed into a root-level folder and
// served from there — same pattern as gm-sim-react.
//
// The output folder is suffixed "-app" because this project's SOURCE
// directory is already called pocket-summoner/ at the repo root;
// building into ../pocket-summoner would overwrite the source.
export default defineConfig({
  plugins: [react()],
  base: "/pocket-summoner-app/",
  build: {
    outDir: "../pocket-summoner-app",
    emptyOutDir: true,
  },
});
