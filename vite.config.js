import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from "@cloudflare/vite-plugin";

const buildTimestamp = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig({
  // Pinned: Google Sign-In only accepts origins listed on the OAuth client
  // (project day-ai-agents-499920), and http://localhost:5199 is the one
  // authorized for local dev. strictPort fails loudly instead of silently
  // hopping to another (unauthorized) port when 5199 is busy.
  server: {
    port: 5199,
    strictPort: true,
  },
  plugins: [
    react(),
    cloudflare(),
    {
      name: 'generate-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: buildTimestamp })
        });
      }
    }
  ],
  define: {
    __APP_VERSION__: JSON.stringify(buildTimestamp),
  }
});