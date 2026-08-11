import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { devAuthPlugin } from './dev/devAuthPlugin.ts';

export default defineConfig(({ mode }) => {
  const usePhp = loadEnv(mode, process.cwd(), '').HACKER_USE_PHP === 'true';
  return {
    base: '/hacker/',
    plugins: [react(), ...(!usePhp ? [devAuthPlugin()] : [])],
    server: {
      proxy: usePhp ? {
        '/hacker/api': {
          target: 'http://127.0.0.1:8787',
          changeOrigin: false,
          rewrite: (path) => path.replace(/^\/hacker/, ''),
        },
      } : undefined,
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
    },
  };
});
