import { beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import { App } from '@/app/App';
import { S } from '@/ui/strings.es';

beforeEach(() => {
  localStorage.clear();
});

describe('App (humo)', () => {
  it('muestra el título del prototipo en un encabezado de nivel 1', () => {
    render(createElement(App));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(S.titulo);
  });
});

describe('main.tsx (humo)', () => {
  it('monta la aplicación dentro de #root con el título del prototipo', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    await act(async () => {
      await import('@/main');
    });

    expect(within(root).getByRole('heading', { level: 1 })).toHaveTextContent(S.titulo);
    root.remove();
  });
});
