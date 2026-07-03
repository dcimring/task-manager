import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from "@cloudflare/vite-plugin";

const buildTimestamp = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig({
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