import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// VITE_BASE lets the same build run at the root (Vercel/Netlify) or under a sub-path (GitHub Pages).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
});
