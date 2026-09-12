import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// `base` la fija el workflow de GitHub Pages con VITE_BASE=/<repo>/.
// En desarrollo y en un build local sin la variable, la app vive en '/'.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    css: {
      // Los CSS Modules se procesan y sus clases conservan el nombre de la clave
      // (styles.fila === 'fila'), así los tests de UI pueden consultarlas.
      // El resto de los .css se reemplaza por una cadena vacía.
      include: [/\.module\.css$/],
      modules: { classNameStrategy: 'non-scoped' },
    },
  },
});
