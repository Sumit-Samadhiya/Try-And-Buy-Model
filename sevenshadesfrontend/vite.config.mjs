import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Preserve existing public Vercel settings without exposing server secrets.
  const publicEnv = loadEnv(mode, process.cwd(), 'REACT_APP_');
  const define = Object.fromEntries(Object.entries(publicEnv).map(([key, value]) => [
    `process.env.${key}`, JSON.stringify(value),
  ]));
  return {
    plugins: [react()],
    define: { ...define, 'process.env': '{}' },
    build: {
      outDir: 'build',
      target: 'es2015',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@mui/material') || id.includes('@emotion')) {
                return 'vendor-mui';
              }
              if (id.includes('@mui/icons-material')) {
                return 'vendor-mui-icons';
              }
              if (id.includes('leaflet')) {
                return 'vendor-maps';
              }
              if (id.includes('three')) {
                return 'vendor-three';
              }
            }
          },
        },
      },
    },
    server: { host: '127.0.0.1', port: 3000 },
    preview: { host: '127.0.0.1', port: 4173 },
  };
});
