import { describe, expect, it } from 'vitest';
import { hashParagraph } from '@/engine/text';
import { hash32 } from '@/engine/rng';

describe('hashParagraph', () => {
  it('devuelve el hash32 del texto expresado en base36', () => {
    const texto = 'El puente viejo está cerrado con tablones y barriles.';
    expect(hashParagraph(texto)).toBe(hash32(texto).toString(36));
  });

  it('solo contiene dígitos y letras minúsculas (base36)', () => {
    expect(hashParagraph('Aldamar de noche huele a humo viejo.')).toMatch(/^[0-9a-z]+$/);
  });

  it('es estable: el mismo texto da siempre el mismo hash', () => {
    const texto = 'Nadie te saluda; tampoco nadie te cierra la puerta.';
    expect(hashParagraph(texto)).toBe(hashParagraph(texto));
  });

  it('es distinto para textos distintos, incluso si difieren en un carácter', () => {
    expect(hashParagraph('Cruzás la plaza.')).not.toBe(hashParagraph('Cruzás la plaza,'));
    expect(hashParagraph('a')).not.toBe(hashParagraph('b'));
    expect(hashParagraph('')).not.toBe(hashParagraph(' '));
  });
});
