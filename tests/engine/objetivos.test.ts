import { describe, expect, it } from 'vitest';
import { parseCampaign, type Campaign, type Objetivo } from '@/content/schema';
import { objetivoActivo } from '@/engine/objetivos';
import { minimal } from '../fixtures/campaigns/minimal';
import { makeState } from '../fixtures/state';

/**
 * Una copia de `minimal` con la lista de objetivos que pida el caso. `minimal` no se toca nunca
 * (lo dice su propio comentario de cabecera) y además la gracia de la mitad de estos casos es
 * que una campaña SIN objetivos siga siendo válida.
 */
function conObjetivos(objetivos?: Objetivo[]): Campaign {
  const copia = JSON.parse(JSON.stringify(minimal)) as Campaign;
  if (objetivos !== undefined) copia.objetivos = objetivos;
  return copia;
}

/** Estado de la campaña `minimal` con los flags que pida el caso. */
function estadoCon(flags: string[] = []) {
  return makeState({ run: { campaignId: minimal.id, contentVersion: minimal.contentVersion, flags } });
}

describe('objetivoActivo', () => {
  it('una campaña sin `objetivos` no tiene objetivo activo', () => {
    expect(objetivoActivo(conObjetivos(), estadoCon())).toBeNull();
  });

  it('una lista vacía tampoco', () => {
    expect(objetivoActivo(conObjetivos([]), estadoCon())).toBeNull();
  });

  it('sin `when`, el objetivo está en juego desde el principio', () => {
    const campaign = conObjetivos([{ id: 'o1', texto: 'Hablá con el guía' }]);
    expect(objetivoActivo(campaign, estadoCon())?.id).toBe('o1');
  });

  it('elige el PRIMERO de la lista cuyo `when` se cumple, y saltea los que no', () => {
    const campaign = conObjetivos([
      { id: 'o_cerrado', texto: 'Todavía no', when: { flag: 'run:nunca' } },
      { id: 'o_abierto', texto: 'Subí al risco', when: { flag: 'run:partio' } },
      { id: 'o_tercero', texto: 'Y después bajá', when: { flag: 'run:partio' } },
    ]);
    expect(objetivoActivo(campaign, estadoCon(['run:partio']))?.id).toBe('o_abierto');
  });

  it('saltea los que ya tienen el `hecho` cumplido y sigue con el que viene', () => {
    const campaign = conObjetivos([
      { id: 'o_hecho', texto: 'Recogé la piedra', hecho: { flag: 'run:tiene_piedra' } },
      { id: 'o_pendiente', texto: 'Subí al risco' },
    ]);
    expect(objetivoActivo(campaign, estadoCon(['run:tiene_piedra']))?.id).toBe('o_pendiente');
    // Y antes de cumplirlo, el primero es el que manda.
    expect(objetivoActivo(campaign, estadoCon([]))?.id).toBe('o_hecho');
  });

  it('un objetivo cumplido no vuelve aunque su `when` siga valiendo', () => {
    const campaign = conObjetivos([
      { id: 'o_unico', texto: 'Recogé la piedra', when: { flag: 'run:partio' }, hecho: { flag: 'run:tiene_piedra' } },
    ]);
    expect(objetivoActivo(campaign, estadoCon(['run:partio', 'run:tiene_piedra']))).toBeNull();
  });

  it('con todos los objetivos cumplidos o cerrados, no hay objetivo activo', () => {
    const campaign = conObjetivos([
      { id: 'o_hecho', texto: 'Ya está', hecho: { flag: 'run:partio' } },
      { id: 'o_cerrado', texto: 'Todavía no', when: { flag: 'run:nunca' } },
    ]);
    expect(objetivoActivo(campaign, estadoCon(['run:partio']))).toBeNull();
  });

  /**
   * El orden de la lista es la prioridad, y lo decide el autor. Este caso es el que lo fija: los
   * dos objetivos están habilitados a la vez, y gana el que está PRIMERO EN LA LISTA aunque en la
   * ficción se haya habilitado después. Sin esto, una implementación que devolviera "el último
   * habilitado" o que ordenara por otra cosa pasaría todo lo demás.
   */
  it('el orden de la lista manda sobre el orden en que se habilitaron', () => {
    const urgente: Objetivo = { id: 'o_urgente', texto: 'Apagá el fuego', when: { flag: 'run:incendio' } };
    const viejo: Objetivo = { id: 'o_viejo', texto: 'Buscá al guía', when: { flag: 'run:partio' } };
    const state = estadoCon(['run:partio', 'run:incendio']);
    // El urgente se habilitó SEGUNDO en la ficción; puesto primero en la lista, gana.
    expect(objetivoActivo(conObjetivos([urgente, viejo]), state)?.id).toBe('o_urgente');
    // Y la lista al revés devuelve el otro: lo único que decide es el orden.
    expect(objetivoActivo(conObjetivos([viejo, urgente]), state)?.id).toBe('o_viejo');
  });

  it('devuelve el objetivo entero, con su texto: es lo que la barra dibuja', () => {
    const campaign = conObjetivos([{ id: 'o1', texto: 'Hablá con Berta, la alcaldesa' }]);
    expect(objetivoActivo(campaign, estadoCon())).toEqual({ id: 'o1', texto: 'Hablá con Berta, la alcaldesa' });
  });

  it('es pura: no toca la campaña ni el estado', () => {
    const campaign = conObjetivos([{ id: 'o1', texto: 'Hablá con el guía', hecho: { flag: 'run:partio' } }]);
    const state = estadoCon(['run:partio']);
    const antesCampaign = JSON.stringify(campaign);
    const antesState = JSON.stringify(state);
    objetivoActivo(campaign, state);
    expect(JSON.stringify(campaign)).toBe(antesCampaign);
    expect(JSON.stringify(state)).toBe(antesState);
  });
});

/**
 * El campo es OPCIONAL a propósito: las fixtures y la campaña de humo tienen que seguir validando
 * sin tocarse. `CampaignSchema` no es `.strict()`, así que agregarlo es puramente aditivo — pero
 * eso se comprueba, no se asume.
 */
describe('el esquema de `objetivos`', () => {
  it('una campaña SIN objetivos sigue validando', () => {
    expect(() => parseCampaign(minimal)).not.toThrow();
    expect(parseCampaign(minimal).objetivos).toBeUndefined();
  });

  it('una campaña CON objetivos valida y el campo sobrevive al parseo (no se descarta)', () => {
    const campaign = conObjetivos([
      { id: 'o1', texto: 'Hablá con el guía' },
      { id: 'o2', texto: 'Subí al risco', when: { flag: 'run:partio' }, hecho: { visited: 'm_risco' } },
    ]);
    const parseada = parseCampaign(campaign);
    expect(parseada.objetivos).toHaveLength(2);
    expect(parseada.objetivos?.[1]).toEqual({
      id: 'o2',
      texto: 'Subí al risco',
      when: { flag: 'run:partio' },
      hecho: { visited: 'm_risco' },
    });
  });

  it('un objetivo sin texto no valida', () => {
    const roto = conObjetivos([{ id: 'o1' } as unknown as Objetivo]);
    expect(() => parseCampaign(roto)).toThrow();
  });

  it('un objetivo con el texto VACÍO tampoco: sería un cartel en blanco en la barra', () => {
    // Un `texto: ''` pasa el tipo y pasaría un `z.string()` pelado, y lo que dibuja es una línea
    // vacía debajo del lugar — un hueco con la forma exacta de lo que esta tarea prometió no
    // dibujar. El `.min(1)` es lo que lo corta, igual que en `label` de las opciones.
    const roto = conObjetivos([{ id: 'o1', texto: '' }]);
    expect(() => parseCampaign(roto)).toThrow();
  });

  it('una condición inventada en `when` no valida', () => {
    const roto = conObjetivos([{ id: 'o1', texto: 'x', when: { inventada: true } as never }]);
    expect(() => parseCampaign(roto)).toThrow();
  });
});
