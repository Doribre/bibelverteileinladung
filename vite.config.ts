import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // relative Basis: läuft auf GitHub/GitLab Pages auch unter Unterverzeichnis-URLs
  base: "./",
  server: { port: 5173, strictPort: true },
});
