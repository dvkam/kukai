import react from '@vitejs/plugin-react';
import { defineConfig, type ConfigEnv } from 'vite';

export default defineConfig(({ mode }: Readonly<ConfigEnv>) => ({
  plugins: [react({ compiler: { logDiagnostics: true } })],
  ...(mode === 'profiling' && {
    build: { outDir: 'dist-profile' },
    resolve: { alias: [{ find: /^react-dom\/client$/, replacement: 'react-dom/profiling' }] }
  })
}));
