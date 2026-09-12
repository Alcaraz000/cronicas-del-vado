// Se ejecuta antes de cada archivo de test (vite.config.ts → test.setupFiles).
// 1) Matchers de jest-dom sobre `expect` de Vitest: toBeInTheDocument, toHaveTextContent, toBeDisabled…
// 2) Limpieza del DOM entre tests: Testing Library solo la hace sola con `globals: true`,
//    y acá los tests importan `describe/it/expect` explícitamente.
// 3) Marca el entorno como apto para `act()`: a diferencia de Jest, Vitest no lo hace solo,
//    y sin esto cualquier `act()` fuera del `render()` de Testing Library (por ejemplo, al
//    importar dinámicamente src/main.tsx) imprime "The current testing environment is not
//    configured to support act(...)" aunque el test pase.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

declare global {
  // eslint-disable-next-line no-var -- augmentar `globalThis` requiere `var`, no `let`/`const`.
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
});
