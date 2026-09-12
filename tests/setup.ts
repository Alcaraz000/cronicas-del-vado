// Se ejecuta antes de cada archivo de test (vite.config.ts → test.setupFiles).
// 1) Matchers de jest-dom sobre `expect` de Vitest: toBeInTheDocument, toHaveTextContent, toBeDisabled…
// 2) Limpieza del DOM entre tests: Testing Library solo la hace sola con `globals: true`,
//    y acá los tests importan `describe/it/expect` explícitamente.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
