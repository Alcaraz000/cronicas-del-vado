import type { ReactElement } from 'react';

// Versión mínima de la Fase A, paso 1: solo demuestra que el pipeline
// (Vite + React + tests + Pages) funciona. La tarea 14 la reemplaza por la
// App que monta ScreenRouter dentro de un ErrorBoundary.
export function App(): ReactElement {
  return (
    <main>
      <h1>Hola</h1>
    </main>
  );
}
