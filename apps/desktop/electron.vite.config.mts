import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';

export default defineConfig({
  main: {
    // A dev build's control server (ADR 0023): bundled in `electron-vite dev`, or in a build asked for it with
    // OMS_DEV_CONTROL=1 (scripts/test-dev-control.mjs); never in the build `pnpm package` ships.
    define: {
      'import.meta.env.OMS_DEV_CONTROL': JSON.stringify(process.env.NODE_ENV_ELECTRON_VITE === 'development' || process.env.OMS_DEV_CONTROL === '1'),
    },
  },
  preload: {},
  renderer: {
    plugins: [react()],
  },
});
