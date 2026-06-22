import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the API runs on port 4000. These paths are proxied to it so the
// browser makes same origin requests and the session cookie is sent normally.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/auth': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
});
