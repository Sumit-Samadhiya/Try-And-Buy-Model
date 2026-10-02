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
    build: { outDir: 'build', target: 'es2015' },
    server: { host: '127.0.0.1', port: 3000 },
    preview: { host: '127.0.0.1', port: 4173 },
  };
});
