import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const lastUpdated = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "Asia/Singapore",
})

// https://vite.dev/config/
export default defineConfig({
  base: "/design-prompts/",
  plugins: [react(), tailwindcss()],
  define: {
    __LAST_UPDATED__: JSON.stringify(lastUpdated),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
