import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ALEPH_ImageEditor/',
  plugins: [react()],
});
