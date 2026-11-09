import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/script-to-video-studio-app/',
  plugins: [react()],
});