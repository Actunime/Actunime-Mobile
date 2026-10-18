import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    // Même origine que les pages de test : `history.replaceState` refuse une autre origine.
    environmentOptions: { jsdom: { url: 'https://manhwa.example/' } },
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', 'android/**'],
  },
});
