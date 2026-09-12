import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import { App } from '@/app/App';

describe('App (humo)', () => {
  it('muestra un encabezado de nivel 1 con el texto "Hola"', () => {
    render(createElement(App));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hola');
  });
});
