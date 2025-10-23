import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isElectronBuild = process.env.BUILD_TARGET === 'electron';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: isElectronBuild ? './' : '/',
});
