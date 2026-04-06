import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Set base to your GitHub Pages repo name
  // e.g., if your repo is github.com/youruser/pocket-summoner
  // then base should be '/pocket-summoner/'
  base: "/pocket-summoner/",
});
