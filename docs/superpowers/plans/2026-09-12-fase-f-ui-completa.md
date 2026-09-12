# Fase F — UI completa: plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usá `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** que el juego se lea y se juegue como una novela visual: la tirada se entiende sola, el texto se revela y se puede saltar lo ya leído, y la Ficha muestra en castellano lo que el personaje recuerda.

**Arquitectura:** trabajo de UI sobre datos que el motor ya expone. Componentes chicos con una responsabilidad cada uno (`Cajon`, `Dialogo`, `Chips`, `Dados`), tres hooks (`useRevelado`, `useReducedMotion`, `usePrefsCss`) y una derivación pura (`src/ui/memoria.ts`) que los componentes solo dibujan. El único dato nuevo es `Campaign.memories`, con su regla de validador.

**Stack:** Vite 8.3 + React 19 + TypeScript 5.9.3 + Vitest 5 (jsdom, Testing Library) + zod 4 + zustand 5. Las herramientas de `tools/` corren con tsx en Node puro.

## Restricciones globales

- **No se toca `src/engine/`.** Todo lo que este plan necesita ya está expuesto. Si una tarea cree que le falta un dato del motor, que lo diga en su informe en vez de cambiar el motor: casi siempre es que no encontró el campo.
- **TypeScript queda en 5.9.3.** No actualizar: la 7.x elimina `baseUrl` y rompe el `tsconfig`.
- **Ningún `*.module.css` escribe un color ni un tamaño de fuente literal.** Todo sale de `src/app/tokens.css`.
- **Todo el texto que ve el jugador vive en `src/ui/strings.es.ts`.** Ningún componente lleva una cadena en castellano adentro. Castellano rioplatense con voseo, como el resto del juego.
- **La UI nunca muestra un identificador.** Ni un id de flag, ni un id de escena, ni un id de PNJ. Si no hay texto para algo, se omite.
- **Tests en castellano**, con el mismo estilo que los que ya existen: `/** @vitest-environment jsdom */` arriba en los de componentes, `describe`/`it` importados explícitamente de vitest (no hay `globals: true`).
- **Un commit por tarea**, con el mensaje en castellano y la línea `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` al final.
- Antes de dar una tarea por terminada: `npm test` en verde, `npx tsc --noEmit` sin errores y `npm run validate` sin errores en los dos perfiles.

## Mapa de archivos

**Nuevos:**

| Archivo | Responsabilidad |
|---|---|
| `src/content/campaigns/vado/memories.ts` | Una línea de narrador por flag de canon del vado (8) |
| `src/content/campaigns/prueba/memories.ts` | Lo mismo para la campaña de humo (vacío: no tiene canon) |
| `tools/lib/validate/rules/r12_memories.ts` | Regla ERROR que cruza flags de canon con `memories` |
| `src/ui/memoria.ts` | Derivación pura de Recuerdos y crónica canónica |
| `src/ui/components/Cajon.tsx` | Panel lateral accesible reutilizable (foco atrapado, Esc) |
| `src/ui/components/Dialogo.tsx` | Confirmación propia, reemplaza `window.confirm` |
| `src/ui/components/Ficha.tsx` | La hoja de personaje, encima de `Cajon` |
| `src/ui/components/Recuerdos.tsx` | Los cuatro grupos de recuerdos y la crónica |
| `src/ui/components/Chips.tsx` | Chip de modificador, compartido por opciones y tirada |
| `src/ui/components/Dados.tsx` | Los d6 en SVG y su giro |
| `src/ui/hooks/useRevelado.ts` | Máquina de escribir y saltar leído |
| `src/ui/hooks/useReducedMotion.ts` | Preferencia de movimiento, combinando app y sistema |
| `src/ui/hooks/usePrefsCss.ts` | Escala de fuente como variable CSS |

**Tocados:** `src/content/schema.ts`, los dos `campaign.ts`, los cuatro fixtures de `tests/fixtures/campaigns/`, `tools/lib/validate/index.ts`, `src/ui/components/RollPanel.tsx`, `OptionList.tsx`, `TextColumn.tsx`, `Parrafos.tsx`, `StatusBar.tsx`, `Imagen.tsx`, `OpcionesModal.tsx`, `src/ui/screens/EscenaScreen.tsx`, `FinScreen.tsx`, `src/ui/strings.es.ts`, `tests/setup.ts`.

## Contrato de interfaces

Esto es lo que cada tarea puede dar por existente de las anteriores. Los nombres son exactos: no los cambies.

    // src/content/schema.ts — Campaign gana un campo
    memories: Record<string, string>;

    // src/ui/memoria.ts (tarea 2)
    export interface RecuerdoLinea { id: string; texto: string }
    export interface Recuerdos {
      gente: RecuerdoLinea[];
      lugares: RecuerdoLinea[];
      hechos: RecuerdoLinea[];
      mundo: RecuerdoLinea[];
      reliquias: RecuerdoLinea[];
      caidos: RecuerdoLinea[];
    }
    export function derivarRecuerdos(campaign: Campaign, state: GameState): Recuerdos;
    export interface Cronica {
      titulo: string;
      finalCanonico: string | null;
      partidas: number;
      finalesVistos: number;
      finalesTotales: number;
    }
    export function derivarCronica(campaign: Campaign, character: Character): Cronica;

    // src/ui/components/Cajon.tsx (tarea 3)
    export interface CajonProps {
      titulo: string;
      abierto: boolean;
      onCerrar: () => void;
      children: React.ReactNode;
    }
    export function Cajon(props: CajonProps): React.JSX.Element | null;

    // src/ui/components/Dialogo.tsx (tarea 3)
    export interface DialogoProps {
      titulo: string;
      cuerpo: string;
      confirmar: string;
      cancelar: string;
      tono?: 'normal' | 'peligro';
      abierto: boolean;
      onConfirmar: () => void;
      onCancelar: () => void;
    }
    export function Dialogo(props: DialogoProps): React.JSX.Element | null;

    // src/ui/hooks/useReducedMotion.ts (tarea 4)
    export function useReducedMotion(): boolean;

    // src/ui/hooks/usePrefsCss.ts (tarea 4)
    export function usePrefsCss(): void;

    // src/ui/components/Chips.tsx (tarea 6)
    export interface Chip { texto: string; tono: 'neutro' | 'ventaja' | 'desventaja'; tachado: boolean }
    export function chipsDeTirada(preview: RollPreview): Chip[];
    export function Chips({ chips }: { chips: Chip[] }): React.JSX.Element;

    // src/ui/components/Dados.tsx (tarea 7)
    export interface DadosProps { dice: number[]; kept: number[]; girando: boolean; resaltado?: number }
    export function Dados(props: DadosProps): React.JSX.Element;

    // src/ui/hooks/useRevelado.ts (tarea 8)
    export interface Revelado {
      parrafosVisibles: number;
      caracteresVisibles: number;
      terminado: boolean;
      puedeSaltarLeido: boolean;
      avanzar: () => void;
      saltarLeido: () => void;
    }
    export function useRevelado(args: {
      log: LogEntry[];
      seen: SeenMap;
      cps: number;
      instantaneo: boolean;
    }): Revelado;

## Orden de las tareas

1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12. Cada una deja el árbol verde y commiteado.

---

### Tarea 1: `memories` en el esquema, en las campañas y en el validador

**Archivos:**
- Crear: `src/content/campaigns/vado/memories.ts`, `src/content/campaigns/prueba/memories.ts`, `tools/lib/validate/rules/r12_memories.ts`
- Modificar: `src/content/schema.ts` (interfaz `Campaign` y `CampaignSchema`), `src/content/campaigns/vado/campaign.ts`, `src/content/campaigns/prueba/campaign.ts`, `tools/lib/validate/index.ts`, `tests/fixtures/campaigns/minimal.ts`, `memoria.ts`, `tirada.ts`, `broken/base.ts`
- Test: `tests/tools/r12.test.ts`, y el `tests/content/vado.test.ts` que ya existe

**Interfaces:**
- Consume: nada de tareas anteriores.
- Produce: `Campaign.memories: Record<string, string>`, la regla `r12_memories` registrada, y las 8 líneas del vado que la tarea 2 lee.

- [ ] **Paso 1: escribir los fixtures rotos**

Las reglas del validador NO se prueban con archivos sueltos: cada una tiene su fixture roto en `tests/fixtures/campaigns/broken/rNN.ts` y sus casos en `tests/tools/validate.test.ts`, que los corre con el ayudante `soloRegla` (verifica que la campaña rota dispare **esa regla y ninguna otra**). Seguí esa convención.

Creá `tests/fixtures/campaigns/broken/r12.ts`. `campanaBase` tiene `id: 'base'` y declara `char:base.recuerdo`, así que el canon de esta campaña lleva el prefijo `char:base.`:

```ts
import type { Campaign } from '@/content/schema';
import { campanaBase } from './base';

/** El flag de canon está declarado, pero el jugador no tiene qué leer de él. */
export const rotaR12FaltaLinea: Campaign = { ...campanaBase, memories: {} };

/** Hay línea para un flag que nadie declaró. */
export const rotaR12LineaHuerfana: Campaign = {
  ...campanaBase,
  memories: { ...campanaBase.memories, 'char:base.fantasma': 'Nadie escribió este flag.' },
};

/** Línea sobre un flag `run:`, que muere con la partida y no se lee nunca en la Ficha. */
export const rotaR12LineaDeRun: Campaign = {
  ...campanaBase,
  memories: { ...campanaBase.memories, 'run:b_hablo': 'Hablaste con el guía.' },
};

/** Línea sobre un espacio compartido: eso lo deriva el motor y se muestra con el nombre del PNJ. */
export const rotaR12LineaCompartida: Campaign = {
  ...campanaBase,
  memories: { ...campanaBase.memories, 'char:met.b_guia': 'Conociste al guía.' },
};
```

- [ ] **Paso 2: escribir los casos en `validate.test.ts`**

En `tests/tools/validate.test.ts`, importá los cuatro fixtures y agregá al final:

```ts
describe('r12_memories', () => {
  it('flag de canon sin línea', () => {
    const issues = soloRegla(rotaR12FaltaLinea, 'r12_memories');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('char:base.recuerdo');
  });
  it('línea sin flag declarado', () => {
    const issues = soloRegla(rotaR12LineaHuerfana, 'r12_memories');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('char:base.fantasma');
  });
  it('línea sobre un flag run:', () => {
    const issues = soloRegla(rotaR12LineaDeRun, 'r12_memories');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('run:b_hablo');
  });
  it('línea sobre un espacio compartido del mundo', () => {
    const issues = soloRegla(rotaR12LineaCompartida, 'r12_memories');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('char:met.b_guia');
  });
});
```

Y actualizá el caso que ya existe, que hoy dice `it('RULES expone las once reglas en orden')` y compara la lista de claves: pasa a **doce**, con `'r12_memories'` al final.

- [ ] **Paso 2b: correr y verificar que falla**

Comando: `npx vitest run tests/tools/validate.test.ts`
Esperado: falla al importar los fixtures y `r12_memories`, que todavía no existen.

- [ ] **Paso 3: agregar `memories` al esquema**

En `src/content/schema.ts`, dentro de `interface Campaign`, después de `flags`:

```ts
  /**
   * Lo que el jugador lee de cada flag de canon en la Ficha y al terminar la partida.
   * Una línea por flag `char:<campaña>.*` y `world:<campaña>.*`, en voz del narrador,
   * segunda persona, pasado. Las descripciones de `flags` son para el autor y no sirven acá.
   * La simetría la exige r12: ni flag sin línea, ni línea sin flag.
   */
  memories: Record<string, string>;
```

Y en `CampaignSchema`, junto a `flags`:

```ts
  memories: z.record(z.string(), z.string()),
```

- [ ] **Paso 4: escribir las líneas del vado**

Creá `src/content/campaigns/vado/memories.ts`:

```ts
/**
 * Lo que el personaje recuerda del vado, en voz del narrador. Una línea por flag de canon
 * declarado en `flags.ts` (6 del personaje, 2 del mundo), que es lo que exige r12.
 *
 * Estas líneas las lee el jugador en la Ficha meses después, cuando ya no se acuerda de
 * la partida: dicen QUÉ pasó, nunca cómo se prendió el flag ni qué escena lo escribió.
 */
export const memories: Record<string, string> = {
  'char:vado.sabe_del_sello':
    'Supiste qué era en realidad el sello del vado: no la piedra, sino lo que la crecida guarda debajo.',
  'char:vado.tome_enterrado': 'Le diste sepultura a Tomé en la vega, con el agua subiéndote a las botas.',
  'char:vado.sello_hundido': 'Devolviste el sello a su piedra y viste bajar el río.',
  'char:vado.vendido': 'Dejaste que el sello cruzara el río en el carro de un mercader.',
  'char:vado.vinculo_ilse': 'Abriste el sello junto a Ilse, y en Aldamar todavía se dice que fueron los dos.',
  'char:vado.heredero': 'Te llevaste el sello del vado, y nadie en Aldamar sabe que lo tenés.',
  'world:vado.aldamar_inundada': 'La vega de Aldamar quedó bajo el agua. El vado no se cruza más.',
  'world:vado.sello_perdido': 'El sello ya no está en el vado.',
};
```

Creá `src/content/campaigns/prueba/memories.ts`:

```ts
/** La campaña de humo no escribe canon: no tiene flags `char:prueba.*` ni `world:prueba.*`. */
export const memories: Record<string, string> = {};
```

- [ ] **Paso 5: enchufar `memories` en las dos campañas y en los fixtures**

En los dos `campaign.ts`, importá `memories` y agregalo al objeto junto a `flags`.

**Ojo con los fixtures: no alcanza con `memories: {}`.** Los cuatro declaran flags de canon, así que r12 los rechazaría. Cada uno necesita su línea real, y de paso el contenido sirve para los tests de la tarea 2:

| Fixture | Flag de canon declarado | Línea a agregar |
|---|---|---|
| `broken/base.ts` (`id: 'base'`) | `char:base.recuerdo` | `'Viste la luz que sale de la cripta.'` |
| `minimal.ts` (`id: 'minimal'`) | `char:minimal.trepo` | `'Trepaste el risco y llegaste arriba.'` |
| `memoria.ts` (`id: 'memoria'`) | `char:memoria.vio_la_cripta` | `'Bajaste a la cripta de la torre vieja.'` |
| `tirada.ts` (`id: 'tirada'`) | `char:tirada.entro`, `world:tirada.alarma` | `'Entraste sin que te vieran.'` y `'Sonó la alarma y el pueblo se enteró.'` |

Antes de escribirlas, confirmá la lista con `grep -n "char:\|world:" tests/fixtures/campaigns/*.ts tests/fixtures/campaigns/broken/base.ts` y descartá los espacios compartidos (`char:met.*`, `char:place.*`, `char:origen.*`, `char:leyenda`, `world:caido.*`), que no llevan línea. Si aparece un flag de canon que esta tabla no lista, agregale la suya.

- [ ] **Paso 6: escribir la regla**

Creá `tools/lib/validate/rules/r12_memories.ts`. Usá `r11_reward.ts` como modelo de estilo: el mensaje explica el borde, no solo marca.

```ts
import { error, type Rule, type ValidationIssue } from '../types';

const RULE = 'r12_memories';

/**
 * Simetría entre los flags de canon y lo que el jugador lee de ellos.
 *
 * Las descripciones de `campaign.flags` están escritas para el autor ("lo enciende tal opción,
 * lo limpia tal otra"): no se le pueden mostrar a nadie. `campaign.memories` es la otra cara,
 * una línea de narrador por flag de canon, y es lo único que la Ficha y la pantalla de fin
 * tienen para decir qué recuerda el personaje.
 *
 * Por eso la regla va en los dos sentidos:
 *   - Todo `char:<campaña>.*` y `world:<campaña>.*` declarado en `flags` tiene su línea.
 *   - Toda clave de `memories` es uno de esos flags: los `run:` mueren con la partida y no se
 *     leen nunca, y los espacios compartidos (`char:met.*`, `char:place.*`, …) los deriva el
 *     motor y se muestran con el nombre del PNJ o del lugar, no con una línea escrita.
 */
export const r12_memories: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  const prefijos = [`char:${campaign.id}.`, `world:${campaign.id}.`];
  const esCanon = (flag: string): boolean => prefijos.some((p) => flag.startsWith(p));

  for (const flag of Object.keys(campaign.flags)) {
    if (esCanon(flag) && campaign.memories[flag] === undefined) {
      issues.push(
        error(
          RULE,
          `El flag de canon ${flag} no tiene línea en memories: es lo que el jugador lee en la Ficha, y sin ella el recuerdo se omite en silencio`,
        ),
      );
    }
  }

  for (const flag of Object.keys(campaign.memories)) {
    if (!esCanon(flag)) {
      issues.push(
        error(
          RULE,
          `memories tiene una línea para ${flag}, que no es un flag de canon de esta campaña: solo se muestran los char:${campaign.id}. y world:${campaign.id}., porque son los únicos que sobreviven a la partida`,
        ),
      );
      continue;
    }
    if (campaign.flags[flag] === undefined) {
      issues.push(
        error(
          RULE,
          `memories tiene una línea para ${flag}, que no está declarado en flags: o falta la declaración, o la línea quedó de un flag que se borró`,
        ),
      );
    }
  }

  return issues;
};
```

- [ ] **Paso 7: registrar la regla**

En `tools/lib/validate/index.ts`, importá `r12_memories` y agregala a la lista, después de `r11_reward`. Si hay un comentario o un test que dice "once reglas", actualizalo a doce: `grep -rn "once reglas\|11 reglas" --include=*.ts --include=*.md .` y corregí lo que aparezca.

- [ ] **Paso 8: correr todo**

```bash
npx vitest run tests/tools/r12.test.ts
npm test
npm run validate
npx tsc --noEmit
```
Esperado: todo verde. Si `validate` se queja del vado, es que falta una línea: agregala, no relajes la regla.

- [ ] **Paso 9: commit**

```bash
git add -A
git commit -m "feat(contenido): memories, lo que el jugador lee de cada flag de canon"
```

---

### Tarea 2: derivación de Recuerdos y crónica

**Archivos:**
- Crear: `src/ui/memoria.ts`
- Test: `tests/ui/memoria.test.ts`

**Interfaces:**
- Consume: `Campaign.memories` (tarea 1).
- Produce: `derivarRecuerdos`, `derivarCronica`, `Recuerdos`, `RecuerdoLinea`, `Cronica`, tal cual el contrato de arriba. Los usa la tarea 5 (Ficha) y la tarea 11 (fin).

- [ ] **Paso 1: escribir el test que falla**

Creá `tests/ui/memoria.test.ts`. `tests/fixtures/state.ts` ya tiene `makeState`, `makeCharacter` y `makeWorld`: usalos en vez de armar objetos a mano. Los nombres esperados salen del propio fixture (`minimal.npcs.m_guia.name`), así que el test no se rompe si alguien le cambia el nombre al guía.

```ts
import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/content/schema';
import { derivarCronica, derivarRecuerdos } from '@/ui/memoria';
import { minimal } from '../fixtures/campaigns/minimal';
import { makeCharacter, makeState, makeWorld } from '../fixtures/state';

/** La campaña del fixture, más una reliquia y una línea de canon del mundo. */
const campana: Campaign = {
  ...minimal,
  items: {
    ...minimal.items,
    m_talisman: {
      id: 'm_talisman', name: 'Talismán de hueso', icon: 'm_talisman',
      description: 'Liviano, tibio, y nunca deja de estarlo.', relic: true,
    },
  },
  memories: {
    'char:minimal.trepo': 'Trepaste el risco y llegaste arriba.',
    'world:minimal.derrumbe': 'El risco se vino abajo y el sendero ya no existe.',
  },
};

describe('derivarRecuerdos', () => {
  it('traduce char:met.<id> al nombre del PNJ', () => {
    const state = makeState({ character: { flags: ['char:met.m_guia'] } });
    expect(derivarRecuerdos(campana, state).gente).toEqual([
      { id: 'char:met.m_guia', texto: minimal.npcs.m_guia!.name },
    ]);
  });

  it('traduce char:place.<id> al nombre del lugar', () => {
    const state = makeState({ character: { flags: ['char:place.m_claro'] } });
    expect(derivarRecuerdos(campana, state).lugares[0]?.texto).toBe(minimal.places.m_claro!.name);
  });

  it('muestra la línea de memories del canon del personaje', () => {
    const state = makeState({ character: { flags: ['char:minimal.trepo'] } });
    expect(derivarRecuerdos(campana, state).hechos[0]?.texto).toBe(campana.memories['char:minimal.trepo']);
  });

  it('muestra la línea de memories del canon del mundo', () => {
    const state = makeState({ world: makeWorld({ flags: ['world:minimal.derrumbe'] }) });
    expect(derivarRecuerdos(campana, state).mundo[0]?.texto).toBe(campana.memories['world:minimal.derrumbe']);
  });

  it('omite en silencio el flag de canon sin línea: nunca un id a la vista', () => {
    const state = makeState({ character: { flags: ['char:minimal.sin_linea'] } });
    expect(derivarRecuerdos(campana, state).hechos).toEqual([]);
  });

  it('ignora los flags run:, que no son del personaje', () => {
    const state = makeState({ character: { flags: ['run:algo'] } });
    const r = derivarRecuerdos(campana, state);
    expect([...r.gente, ...r.lugares, ...r.hechos, ...r.mundo]).toEqual([]);
  });

  it('lista las reliquias con su nombre y su descripción', () => {
    const state = makeState({ character: { relics: ['m_talisman'] } });
    const linea = derivarRecuerdos(campana, state).reliquias[0]?.texto ?? '';
    expect(linea).toContain('Talismán de hueso');
    expect(linea).toContain('nunca deja de estarlo');
  });

  it('lista los Caídos con nombre, clase, nivel y campaña', () => {
    const state = makeState({
      world: makeWorld({
        fallen: [{ name: 'Vera', classId: 'guerrero', level: 2, campaign: 'minimal', scene: 'm_risco' }],
      }),
    });
    const linea = derivarRecuerdos(campana, state).caidos[0]?.texto ?? '';
    expect(linea).toContain('Vera');
    expect(linea).toContain('2');
  });
});

describe('derivarCronica', () => {
  it('trae título, final canónico, partidas y finales vistos', () => {
    const character = makeCharacter({
      campaignLog: { minimal: { runs: 3, wins: 1, endings: ['m_fin'], milestones: [], canonEnding: 'm_fin' } },
    });
    const cronica = derivarCronica(campana, character);
    expect(cronica.titulo).toBe(minimal.title);
    expect(cronica.finalCanonico).toBe(minimal.endings.m_fin!.title);
    expect(cronica.partidas).toBe(3);
    expect(cronica.finalesVistos).toBe(1);
    expect(cronica.finalesTotales).toBe(Object.keys(minimal.endings).length);
  });

  it('devuelve finalCanonico null si el personaje nunca ganó', () => {
    const character = makeCharacter({
      campaignLog: { minimal: { runs: 2, wins: 0, endings: [], milestones: [] } },
    });
    expect(derivarCronica(campana, character).finalCanonico).toBeNull();
  });

  it('con una campaña que el personaje nunca jugó, todo en cero', () => {
    expect(derivarCronica(campana, makeCharacter()).partidas).toBe(0);
  });
});
```

- [ ] **Paso 2: correr el test y verificar que falla**

Comando: `npx vitest run tests/ui/memoria.test.ts`
Esperado: falla porque `@/ui/memoria` no existe.

- [ ] **Paso 3: escribir la derivación**

Creá `src/ui/memoria.ts`:

```ts
import { CLASSES } from '@/content/catalog';
import type { Campaign } from '@/content/schema';
import type { Character, GameState } from '@/engine/types';
import { S } from '@/ui/strings.es';

export interface RecuerdoLinea {
  id: string;
  texto: string;
}

export interface Recuerdos {
  gente: RecuerdoLinea[];
  lugares: RecuerdoLinea[];
  hechos: RecuerdoLinea[];
  mundo: RecuerdoLinea[];
  reliquias: RecuerdoLinea[];
  caidos: RecuerdoLinea[];
}

/**
 * Lo que el personaje recuerda, listo para dibujar. Derivación pura: no toca el store.
 *
 * Dos cosas que parecen detalles y no lo son:
 *  - `run.stagedFlags` NO entra. Durante la partida el canon está apostado, y una derrota
 *    no lo escribe: mostrarlo sería prometer un recuerdo que el jugador puede perder.
 *  - Un flag de canon sin línea en `memories` se omite. r12 hace que eso no llegue a
 *    producción, pero si llegara, la Ficha calla en vez de mostrar un identificador.
 */
export function derivarRecuerdos(campaign: Campaign, state: GameState): Recuerdos {
  const { character, world } = state;
  const canon = (prefijo: string): RecuerdoLinea[] =>
    (prefijo.startsWith('world:') ? world.flags : character.flags)
      .filter((f) => f.startsWith(prefijo))
      .map((f) => ({ id: f, texto: campaign.memories[f] ?? '' }))
      .filter((l) => l.texto !== '');

  const porPrefijo = (prefijo: string, nombre: (id: string) => string | undefined): RecuerdoLinea[] =>
    character.flags
      .filter((f) => f.startsWith(prefijo))
      .map((f) => ({ id: f, texto: nombre(f.slice(prefijo.length)) ?? '' }))
      .filter((l) => l.texto !== '');

  return {
    gente: porPrefijo('char:met.', (id) => campaign.npcs[id]?.name),
    lugares: porPrefijo('char:place.', (id) => campaign.places[id]?.name),
    hechos: canon(`char:${campaign.id}.`),
    mundo: canon(`world:${campaign.id}.`),
    // flatMap y no filter+map: con noUncheckedIndexedAccess, el filter no estrecha el tipo
    // y el map de después quedaría con item posiblemente undefined.
    reliquias: character.relics.flatMap((id) => {
      const item = campaign.items[id];
      return item === undefined ? [] : [{ id, texto: `${item.name}: ${item.description}` }];
    }),
    caidos: world.fallen.map((f) => ({
      id: `${f.name}-${f.campaign}`,
      texto: S.ficha.caido(f.name, CLASSES[f.classId].name, f.level, f.campaign),
    })),
  };
}

export interface Cronica {
  titulo: string;
  finalCanonico: string | null;
  partidas: number;
  finalesVistos: number;
  finalesTotales: number;
}

/** La crónica de ESTA campaña para este personaje. La Ficha solo se abre en partida. */
export function derivarCronica(campaign: Campaign, character: Character): Cronica {
  const entrada = character.campaignLog[campaign.id];
  const canon = entrada?.canonEnding;
  return {
    titulo: campaign.title,
    finalCanonico: canon !== undefined ? (campaign.endings[canon]?.title ?? null) : null,
    partidas: entrada?.runs ?? 0,
    finalesVistos: entrada?.endings.length ?? 0,
    finalesTotales: Object.keys(campaign.endings).length,
  };
}
```

- [ ] **Paso 4: agregar la cadena del Caído**

En `src/ui/strings.es.ts`, creá la sección `ficha` (la van a llenar las tareas 5 y 6) con, por ahora:

```ts
  ficha: {
    caido: (nombre: string, clase: string, nivel: number, campana: string): string =>
      `${nombre}, ${clase} de nivel ${nivel}, murió en ${campana}`,
  },
```

Ojo: `Fallen.campaign` guarda el **id** de la campaña. Si el id no es legible, pasale el título desde el llamador en la tarea 5 cuando la campaña esté cargada; para los Caídos de otras campañas no tenemos el título y el id es lo único que hay. Si el id no es presentable, omití el Caído antes que mostrar un identificador.

- [ ] **Paso 5: correr los tests**

Comando: `npx vitest run tests/ui/memoria.test.ts`
Esperado: PASA.

- [ ] **Paso 6: commit**

```bash
git add -A
git commit -m "feat(ui): derivacion de Recuerdos y cronica canonica"
```
---

### Tarea 3: `Cajon` y `Dialogo`, las dos superficies accesibles

**Archivos:**
- Crear: `src/ui/components/Cajon.tsx`, `Cajon.module.css`, `src/ui/components/Dialogo.tsx`, `Dialogo.module.css`
- Modificar: `src/ui/strings.es.ts`
- Test: `tests/ui/Cajon.test.tsx`, `tests/ui/Dialogo.test.tsx`

**Interfaces:**
- Consume: nada.
- Produce: `Cajon` y `Dialogo` con las props del contrato. Los usan las tareas 5, 6 y 7.

Hoy el juego usa `window.confirm` en dos lugares: la escena mortal (`OptionList`) y abandonar (`StatusBar`). Un `confirm` del navegador es un cuadro gris que el jugador cierra sin leer, y la confirmación de la escena mortal es la mitigación del riesgo 9 de la spec: tiene que verse y leerse.

- [ ] **Paso 1: escribir el test del cajón**

Creá `tests/ui/Cajon.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Cajon } from '@/ui/components/Cajon';

describe('Cajon', () => {
  it('no dibuja nada cuando está cerrado', () => {
    render(
      <Cajon titulo="Ficha" abierto={false} onCerrar={vi.fn()}>
        <p>contenido</p>
      </Cajon>,
    );
    expect(screen.queryByText('contenido')).not.toBeInTheDocument();
  });

  it('es un diálogo con nombre accesible', () => {
    render(
      <Cajon titulo="Ficha" abierto onCerrar={vi.fn()}>
        <p>contenido</p>
      </Cajon>,
    );
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveAttribute('aria-modal', 'true');
    expect(dialogo).toHaveAccessibleName('Ficha');
  });

  it('Esc lo cierra', () => {
    const onCerrar = vi.fn();
    render(
      <Cajon titulo="Ficha" abierto onCerrar={onCerrar}>
        <button type="button">algo</button>
      </Cajon>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCerrar).toHaveBeenCalledOnce();
  });

  it('al abrirse mueve el foco adentro y al cerrarse lo devuelve', () => {
    const disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();
    expect(document.activeElement).toBe(disparador);

    const { rerender } = render(
      <Cajon titulo="Ficha" abierto onCerrar={vi.fn()}>
        <button type="button">adentro</button>
      </Cajon>,
    );
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);

    rerender(
      <Cajon titulo="Ficha" abierto={false} onCerrar={vi.fn()}>
        <button type="button">adentro</button>
      </Cajon>,
    );
    expect(document.activeElement).toBe(disparador);
    disparador.remove();
  });

  it('Tab no se escapa del cajón', () => {
    render(
      <Cajon titulo="Ficha" abierto onCerrar={vi.fn()}>
        <button type="button">uno</button>
        <button type="button">dos</button>
      </Cajon>,
    );
    const dentro = screen.getAllByRole('button');
    dentro[dentro.length - 1]?.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
  });
});
```

- [ ] **Paso 2: correr el test y verificar que falla**

Comando: `npx vitest run tests/ui/Cajon.test.tsx`
Esperado: falla porque `@/ui/components/Cajon` no existe.

- [ ] **Paso 3: escribir el cajón**

Creá `src/ui/components/Cajon.tsx`. Sin librerías: son pocas líneas y las queremos exactas.

```tsx
import { useCallback, useEffect, useId, useRef } from 'react';
import { S } from '@/ui/strings.es';
import styles from './Cajon.module.css';

export interface CajonProps {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: React.ReactNode;
}

const ENFOCABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Panel lateral sobre la escena. Atrapa el foco mientras está abierto, se cierra con Esc y
 * devuelve el foco a donde estaba: un cajón que se abre con una tecla tiene que poder
 * cerrarse con otra sin tocar el mouse.
 */
export function Cajon({ titulo, abierto, onCerrar, children }: CajonProps) {
  const panel = useRef<HTMLDivElement>(null);
  const anterior = useRef<HTMLElement | null>(null);
  const tituloId = useId();

  useEffect(() => {
    if (!abierto) return;
    anterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const primero = panel.current?.querySelector<HTMLElement>(ENFOCABLE);
    (primero ?? panel.current)?.focus();
    return () => {
      anterior.current?.focus();
    };
  }, [abierto]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCerrar();
        return;
      }
      if (event.key !== 'Tab') return;
      const enfocables = [...(panel.current?.querySelectorAll<HTMLElement>(ENFOCABLE) ?? [])];
      if (enfocables.length === 0) return;
      const primero = enfocables[0]!;
      const ultimo = enfocables[enfocables.length - 1]!;
      const activo = document.activeElement;
      if (event.shiftKey && (activo === primero || !panel.current?.contains(activo))) {
        event.preventDefault();
        ultimo.focus();
      } else if (!event.shiftKey && (activo === ultimo || !panel.current?.contains(activo))) {
        event.preventDefault();
        primero.focus();
      }
    },
    [onCerrar],
  );

  useEffect(() => {
    if (!abierto) return;
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [abierto, onKeyDown]);

  if (!abierto) return null;

  return (
    <div className={styles.fondo} onClick={onCerrar}>
      <div
        ref={panel}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.encabezado}>
          <h2 id={tituloId} className={styles.titulo}>{titulo}</h2>
          <button type="button" className={styles.cerrar} onClick={onCerrar}>
            {S.comun.cerrar}
          </button>
        </header>
        <div className={styles.cuerpo}>{children}</div>
      </div>
    </div>
  );
}
```

El `.module.css`: `fondo` cubre la pantalla con un velo oscuro, `panel` es una columna a la derecha con `max-width` y scroll propio. Colores y espaciados de `tokens.css`, ni un literal.

- [ ] **Paso 4: agregar las cadenas comunes**

En `src/ui/strings.es.ts`, sección nueva:

```ts
  comun: {
    cerrar: 'Cerrar',
    cancelar: 'Cancelar',
    confirmar: 'Confirmar',
  },
```

- [ ] **Paso 5: correr el test del cajón**

Comando: `npx vitest run tests/ui/Cajon.test.tsx`
Esperado: PASA.

- [ ] **Paso 6: escribir el test del diálogo**

Creá `tests/ui/Dialogo.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { Dialogo } from '@/ui/components/Dialogo';

function props(over = {}) {
  return {
    titulo: 'El vado crecido',
    cuerpo: 'Estás Malherido: un Fallo acá te mata.',
    confirmar: 'Cruzar igual',
    cancelar: 'Volver',
    abierto: true,
    onConfirmar: vi.fn(),
    onCancelar: vi.fn(),
    ...over,
  };
}

describe('Dialogo', () => {
  it('muestra título y cuerpo, y es un diálogo modal', () => {
    const p = props();
    render(<Dialogo {...p} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText(p.cuerpo)).toBeInTheDocument();
  });

  it('el foco arranca en cancelar, no en confirmar', () => {
    const p = props();
    render(<Dialogo {...p} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: p.cancelar }));
  });

  it('confirmar y cancelar avisan al llamador', () => {
    const p = props();
    render(<Dialogo {...p} />);
    fireEvent.click(screen.getByRole('button', { name: p.confirmar }));
    expect(p.onConfirmar).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: p.cancelar }));
    expect(p.onCancelar).toHaveBeenCalledOnce();
  });

  it('Esc cancela', () => {
    const p = props();
    render(<Dialogo {...p} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(p.onCancelar).toHaveBeenCalledOnce();
    expect(p.onConfirmar).not.toHaveBeenCalled();
  });

  it('cerrado no dibuja nada', () => {
    const p = props({ abierto: false });
    render(<Dialogo {...p} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Paso 7: correr el test y verificar que falla**

Comando: `npx vitest run tests/ui/Dialogo.test.tsx`
Esperado: falla porque el componente no existe.

- [ ] **Paso 8: escribir el diálogo**

`src/ui/components/Dialogo.tsx`, con la misma mecánica de foco y Esc que `Cajon` (Esc cancela). **El foco arranca en cancelar**: es una decisión, no un descuido — si el jugador aprieta Enter sin leer, no se muere. `tono: 'peligro'` pinta el borde con `--color-peligro`.

- [ ] **Paso 9: correr todo y commitear**

```bash
npx vitest run tests/ui/Cajon.test.tsx tests/ui/Dialogo.test.tsx
npm test
git add -A
git commit -m "feat(ui): cajon y dialogo accesibles, con foco atrapado y Esc"
```

---

### Tarea 4: preferencias vivas (movimiento, escala de fuente, velocidad)

**Archivos:**
- Crear: `src/ui/hooks/useReducedMotion.ts`, `src/ui/hooks/usePrefsCss.ts`
- Modificar: `tests/setup.ts`, `src/ui/components/OpcionesModal.tsx`, `src/ui/strings.es.ts`, `src/app/tokens.css`, `src/app/App.tsx` (o donde viva la raíz de la app)
- Test: `tests/ui/prefs.test.tsx`

**Interfaces:**
- Consume: nada.
- Produce: `useReducedMotion(): boolean` y `usePrefsCss(): void`. Los usan las tareas 7, 9 y 12.

`Prefs { cps, showOdds, fontScale, reducedMotion }` existe desde la Fase A y **no tiene un solo lector** salvo `showOdds`. Esta tarea le pone lectores y controles.

- [ ] **Paso 1: el shim de `matchMedia`**

jsdom no implementa `window.matchMedia`: sin esto, cualquier componente que lo llame explota en los tests. En `tests/setup.ts`, agregá:

```ts
/**
 * jsdom no implementa matchMedia. El shim devuelve "sin preferencia" por defecto;
 * un test que quiera la otra rama lo sobrescribe con vi.stubGlobal.
 */
if (typeof window !== 'undefined' && window.matchMedia === undefined) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
```

- [ ] **Paso 2: escribir el test que falla**

Creá `tests/ui/prefs.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useReducedMotion } from '@/ui/hooks/useReducedMotion';
import { usePrefsCss } from '@/ui/hooks/usePrefsCss';
import { useStore } from '@/state/store';

function conMedia(matches: boolean): void {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  useStore.getState().setPrefs({ reducedMotion: 'auto', fontScale: 1, cps: 40 });
});

describe('useReducedMotion', () => {
  it('con prefs en auto sigue al sistema', () => {
    conMedia(true);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
    conMedia(false);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });

  it('con prefs en on ignora al sistema', () => {
    conMedia(false);
    useStore.getState().setPrefs({ reducedMotion: 'on' });
    expect(renderHook(() => useReducedMotion()).result.current).toBe(true);
  });

  it('sin matchMedia en el entorno no explota y devuelve false', () => {
    vi.stubGlobal('matchMedia', undefined);
    expect(renderHook(() => useReducedMotion()).result.current).toBe(false);
  });
});

describe('usePrefsCss', () => {
  it('escribe la escala de fuente como variable CSS en la raíz', () => {
    useStore.getState().setPrefs({ fontScale: 1.25 });
    renderHook(() => usePrefsCss());
    expect(document.documentElement.style.getPropertyValue('--escala-fuente')).toBe('1.25');
  });
});
```

- [ ] **Paso 3: correr el test y verificar que falla**

Comando: `npx vitest run tests/ui/prefs.test.tsx`
Esperado: falla porque los hooks no existen.

- [ ] **Paso 4: escribir los hooks**

`src/ui/hooks/useReducedMotion.ts`:

```ts
import { useEffect, useState } from 'react';
import { useStore } from '@/state/store';

const CONSULTA = '(prefers-reduced-motion: reduce)';

/**
 * ¿Hay que mostrar el resultado sin animarlo? `prefs.reducedMotion` en 'on' manda siempre;
 * en 'auto' decide el sistema. jsdom no implementa matchMedia: la guarda es necesaria, no
 * defensiva de más.
 */
export function useReducedMotion(): boolean {
  const preferencia = useStore((s) => s.prefs.reducedMotion);
  const [sistema, setSistema] = useState<boolean>(() => window.matchMedia?.(CONSULTA).matches ?? false);

  useEffect(() => {
    const mq = window.matchMedia?.(CONSULTA);
    if (mq === undefined) return;
    const alCambiar = (e: MediaQueryListEvent): void => setSistema(e.matches);
    mq.addEventListener('change', alCambiar);
    setSistema(mq.matches);
    return () => mq.removeEventListener('change', alCambiar);
  }, []);

  return preferencia === 'on' || sistema;
}
```

`src/ui/hooks/usePrefsCss.ts` escribe `--escala-fuente` en `document.documentElement` cada vez que cambia `prefs.fontScale`. Llamalo una sola vez, en la raíz de la app.

En `tokens.css`, la fuente de juego pasa a multiplicarse por la variable, con `--escala-fuente: 1` por defecto en `:root`.

- [ ] **Paso 5: los controles en Opciones**

`OpcionesModal` hoy solo exporta e importa. Agregale un bloque de preferencias con cuatro controles, todos leyendo y escribiendo con `setPrefs`:

- **Máquina de escribir**: "Normal (40 cps)" / "Instantáneo" → `cps: 40 | 0`.
- **Tamaño de letra**: 100 % / 125 % / 150 % → `fontScale`.
- **Movimiento**: "Según el sistema" / "Reducido siempre" → `reducedMotion`.
- **Mostrar probabilidades**: sí / no → `showOdds` (ya existe el dato, nunca tuvo control).

Textos nuevos en `S.ajustes`. Cada control es un grupo de radios con `fieldset`/`legend`, no un `select`: son dos o tres valores y tienen que verse todos.

- [ ] **Paso 6: probar los controles**

Agregá a `tests/ui/OpcionesModal.test.tsx` un caso que cambie el tamaño de letra y verifique que `useStore.getState().prefs.fontScale` quedó en 1.25.

- [ ] **Paso 7: correr todo y commitear**

```bash
npm test
npx tsc --noEmit
git add -A
git commit -m "feat(ui): preferencias de lectura con lectores reales"
```

---

### Tarea 5: la Ficha

**Archivos:**
- Crear: `src/ui/components/Ficha.tsx`, `Ficha.module.css`, `src/ui/components/Recuerdos.tsx`, `Recuerdos.module.css`
- Modificar: `src/ui/components/StatusBar.tsx` (botón Ficha y abandono con `Dialogo`), `src/ui/screens/EscenaScreen.tsx` (tecla C y montaje del cajón), `src/ui/strings.es.ts`
- Test: `tests/ui/Ficha.test.tsx`, y ajustar `tests/ui/StatusBar.test.tsx`

**Interfaces:**
- Consume: `Cajon` y `Dialogo` (tarea 3), `derivarRecuerdos` y `derivarCronica` (tarea 2).
- Produce: `Ficha` montada en `EscenaScreen`; nadie más la usa.

- [ ] **Paso 1: escribir el test que falla**

Creá `tests/ui/Ficha.test.tsx`. Montá la `Ficha` con un `GameState` armado a mano (mirá `tests/fixtures/state.ts`) y cubrí:

```tsx
  it('muestra atributos, clase con su Poder y su Debilidad, rasgos y habilidades', () => {});
  it('muestra Heridas con su etiqueta y las condiciones activas', () => {});
  it('muestra XP y nivel CON el tope de la campaña', () => {
    // topeDeNivel(campaign.levelRange) tiene que estar a la vista: es la regla que
    // explica por qué rejugar deja de subir de nivel.
  });
  it('muestra los objetos de la partida y las reliquias del personaje', () => {});
  it('muestra los Recuerdos derivados, nunca un id crudo', () => {
    // buscá que NO aparezca ningún texto que empiece con 'char:' o 'world:'
  });
  it('con un personaje nuevo los Recuerdos están vacíos y lo dice con una frase', () => {});
```

Y en `tests/ui/EscenaScreen.test.tsx`:

```tsx
  it('la tecla C abre la Ficha y Esc la cierra', () => {});
  it('la tecla C no abre la Ficha si el foco está en un campo de texto', () => {});
```

- [ ] **Paso 2: correr los tests y verificar que fallan**

Comando: `npx vitest run tests/ui/Ficha.test.tsx`
Esperado: falla porque `@/ui/components/Ficha` no existe.

- [ ] **Paso 3: escribir `Recuerdos.tsx`**

Componente tonto: recibe `Recuerdos` y `Cronica` y los dibuja en secciones con título. Un grupo vacío **no se dibuja**. Si los seis grupos están vacíos, muestra `S.ficha.sinRecuerdos` ("Todavía no hay nada que recordar. Esto se llena solo, jugando.").

- [ ] **Paso 4: escribir `Ficha.tsx`**

Encima de `Cajon`. Lee del store con `selectGameState` y `ui.campaign`; llama a `derivarRecuerdos` y `derivarCronica`. El nivel se muestra como `nivel 2 de 4` usando `topeDeNivel(campaign.levelRange)` de `@/engine/progression`, y la XP como `xp / xpDelNivel(nivel + 1)`.

- [ ] **Paso 5: el botón y la tecla**

En `StatusBar`, un botón "Ficha" con `title` que mencione la tecla C. En `EscenaScreen`, el estado `fichaAbierta` y un `keydown` con la tecla `c`/`C` que no dispara si el foco está en un campo de texto. `OptionList` ya tiene esa guarda (`esCampoDeTexto`): **movela a `src/ui/teclado.ts`** y que la usen las dos, en vez de duplicarla.

- [ ] **Paso 6: cambiar el `confirm` de abandonar por `Dialogo`**

`StatusBar` deja de llamar a `window.confirm`. Ahora muestra un `Dialogo` con tono `peligro`, título "Abandonar la partida" y el cuerpo que ya está en `S.barra.confirmarAbandono`. Actualizá `tests/ui/StatusBar.test.tsx`, que hoy espía `window.confirm`.

- [ ] **Paso 7: correr todo y commitear**

```bash
npm test
npx tsc --noEmit
git add -A
git commit -m "feat(ui): la Ficha con Recuerdos y cronica, en un cajon con tecla C"
```

---

### Tarea 6: `Chips`, el modificador que se ve igual en los dos lados

**Archivos:**
- Crear: `src/ui/components/Chips.tsx`, `Chips.module.css`
- Modificar: `src/ui/components/OptionList.tsx` (usa `Chips` y `Dialogo`), `src/ui/strings.es.ts`
- Test: `tests/ui/Chips.test.tsx`, y ajustar `tests/ui/OptionList.test.tsx`

**Interfaces:**
- Consume: `Dialogo` (tarea 3).
- Produce: `Chip`, `chipsDeTirada(preview)`, `Chips`. Los usa la tarea 7.

Un modificador tiene que verse igual cuando lo mirás para decidir y cuando lo mirás en el resultado. Hoy `OptionList` arma los chips a mano y `RollPanel` no muestra ninguno.

- [ ] **Paso 1: escribir el test que falla**

Creá `tests/ui/Chips.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chips, chipsDeTirada } from '@/ui/components/Chips';
import type { RollPreview } from '@/engine/types';

function preview(over: Partial<RollPreview> = {}): RollPreview {
  return {
    attr: 'saber', attrValue: 2, difficulty: 'dificil', difficultyMod: -1,
    veteranMod: 0, totalMod: 1, mode: 'normal', sources: [],
    odds: { success: 0.3, partial: 0.4, failure: 0.3 }, risk: 'arriesgado',
    targetLine: 'Necesitás 8+', ...over,
  };
}

describe('chipsDeTirada', () => {
  it('arma el chip del atributo con su valor y el de la dificultad', () => {
    const chips = chipsDeTirada(preview());
    expect(chips[0]?.texto).toContain('Saber');
    expect(chips[0]?.texto).toContain('+2');
    expect(chips.some((c) => c.texto.includes('Difícil'))).toBe(true);
  });

  it('omite el chip de Veterano cuando el modificador es cero', () => {
    expect(chipsDeTirada(preview()).some((c) => c.texto.includes('Veterano'))).toBe(false);
    expect(chipsDeTirada(preview({ veteranMod: -1 })).some((c) => c.texto.includes('Veterano'))).toBe(true);
  });

  it('marca tachado el origen anulado y le pone el tono que le toca', () => {
    const chips = chipsDeTirada(
      preview({
        mode: 'cancelled',
        sources: [
          { kind: 'advantage', label: 'Aprendiz de escriba', origin: 'trait', cancelled: true },
          { kind: 'disadvantage', label: 'Exhausto', origin: 'condition', cancelled: true },
        ],
      }),
    );
    const ventaja = chips.find((c) => c.texto.includes('Aprendiz de escriba'));
    const desventaja = chips.find((c) => c.texto.includes('Exhausto'));
    expect(ventaja?.tachado).toBe(true);
    expect(ventaja?.tono).toBe('ventaja');
    expect(desventaja?.tachado).toBe(true);
    expect(desventaja?.tono).toBe('desventaja');
  });
});

describe('Chips', () => {
  it('dibuja el tachado con data-tachado, no solo con color', () => {
    render(<Chips chips={[{ texto: 'Exhausto', tono: 'desventaja', tachado: true }]} />);
    expect(screen.getByText('Exhausto')).toHaveAttribute('data-tachado', 'true');
  });
});
```

- [ ] **Paso 2: correr el test y verificar que falla**

Comando: `npx vitest run tests/ui/Chips.test.tsx`
Esperado: falla porque el componente no existe.

- [ ] **Paso 3: escribir `Chips.tsx`**

`chipsDeTirada` arma, en orden: atributo con su valor (`ATTR_NAMES`), dificultad (`DIFFICULTY_NAMES`) si `difficultyMod !== 0`, Veterano si `veteranMod !== 0`, y después cada `RollSource` con `▲`/`▼` según `kind` y `tachado: source.cancelled`. El texto sale de `S.tirada.chip.*`; los números llevan signo explícito (`+2`, `-1`).

El componente dibuja `<span data-tono data-tachado>`. El tachado es `text-decoration: line-through` **más** el atributo: nunca solo el color.

- [ ] **Paso 4: que `OptionList` use `Chips`**

Reemplazá el armado a mano de `formatAttrChip` y del `.map` de `sources` por `<Chips chips={chipsDeTirada(c.preview)} />`. `formatAttrChip` se borra; si algún test lo importa, actualizalo.

- [ ] **Paso 5: la confirmación de escena mortal con `Dialogo`**

`OptionList` deja de llamar a `window.confirm`. Ahora guarda en estado la opción pendiente de confirmar y muestra un `Dialogo` con tono `peligro`, el cuerpo de `S.opciones.confirmMortal[wounds]` (que ya existe y ya distingue Sano / Herido / Malherido) y los botones "Seguir igual" / "Volver". Confirmar llama a `onPick`; cancelar no hace nada. Actualizá `tests/ui/OptionList.test.tsx`, que hoy espía `window.confirm`.

- [ ] **Paso 6: correr todo y commitear**

```bash
npm test
npx tsc --noEmit
git add -A
git commit -m "feat(ui): chips de modificador compartidos y confirmacion mortal propia"
```

---

### Tarea 7: la tirada animada

**Archivos:**
- Crear: `src/ui/components/Dados.tsx`, `Dados.module.css`
- Modificar: `src/ui/components/RollPanel.tsx`, `RollPanel.module.css`, `src/ui/strings.es.ts`
- Test: `tests/ui/Dados.test.tsx`, `tests/ui/RollPanel.test.tsx` (reescribir)

**Interfaces:**
- Consume: `Chips` y `chipsDeTirada` (tarea 6), `useReducedMotion` (tarea 4).
- Produce: `Dados`. Nadie más lo usa.

Este es el criterio de listo número 1 de la fase: **una tirada con Fortuna se entiende sin que nadie te la explique**.

- [ ] **Paso 1: escribir el test de los dados**

Creá `tests/ui/Dados.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dados } from '@/ui/components/Dados';

describe('Dados', () => {
  it('dibuja un dado por valor, con su cara accesible', () => {
    render(<Dados dice={[6, 2, 5]} kept={[0, 2]} girando={false} />);
    expect(screen.getByTestId('dado-0')).toHaveAccessibleName('6');
    expect(screen.getByTestId('dado-1')).toHaveAccessibleName('2');
  });

  it('marca cuál se conserva y cuál se descarta', () => {
    render(<Dados dice={[6, 2, 5]} kept={[0, 2]} girando={false} />);
    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-kept', 'true');
    expect(screen.getByTestId('dado-1')).toHaveAttribute('data-kept', 'false');
  });

  it('mientras gira no muestra el valor final', () => {
    render(<Dados dice={[6, 2, 5]} kept={[0, 2]} girando />);
    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-girando', 'true');
  });

  it('resalta solo el dado repetido', () => {
    render(<Dados dice={[6, 2, 5]} kept={[0, 2]} girando={false} resaltado={1} />);
    expect(screen.getByTestId('dado-1')).toHaveAttribute('data-resaltado', 'true');
    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-resaltado', 'false');
  });
});
```

- [ ] **Paso 2: correr y verificar que falla; después escribir `Dados.tsx`**

Cada dado es un SVG de cara de d6 (los puntos según el valor), con `role="img"` y `aria-label` con el número. El giro es una animación CSS de 700 ms sobre `data-girando="true"`, definida en el `.module.css` y envuelta en `@media (prefers-reduced-motion: reduce) { animation: none }` además del control por prop.

- [ ] **Paso 3: reescribir el test del `RollPanel`**

`tests/ui/RollPanel.test.tsx` existe y hay que reescribirlo. Conservá el ayudante `pendiente()` que ya tiene. Casos:

```tsx
  it('con movimiento reducido muestra el resultado completo de una', () => {
    // sin timers: total, sello y botones visibles en el primer render
  });

  it('anima y después se asienta: primero giran los dados, después el total', async () => {
    vi.useFakeTimers();
    // al montar: data-girando true y el total NO está
    // tras 700 ms: el total y el sello están
  });

  it('un clic salta la animación', () => {});

  it('muestra los chips del preview, con los anulados tachados', () => {
    // preview con mode 'cancelled' y dos sources cancelled
  });

  it('el sello lleva icono Y texto, no solo color', () => {});

  it('los botones de Fortuna y Poder aparecen recién cuando la tirada se asentó', () => {});

  it('al repetir un dado con Fortuna solo re-anima ese dado', () => {
    // rerolls: [1] → <Dados resaltado={1}> y los otros dos sin data-girando
  });
```

- [ ] **Paso 4: reescribir `RollPanel.tsx`**

Estructura: `targetLine` → `<Dados>` → `<Chips chips={chipsDeTirada(pending.preview)} />` → total y sello → acciones. Un estado local `asentado` que arranca en `true` si `useReducedMotion()` y si no pasa a `true` a los 700 ms; un `onClick` en el panel que lo fuerza a `true`. El dado resaltado sale de `pending.rerolls[pending.rerolls.length - 1]`.

El sello lleva icono y texto (`S.tirada.banda` ya tiene los textos; agregá `S.tirada.icono` con un símbolo por banda).

- [ ] **Paso 5: correr todo y commitear**

```bash
npm test
npx tsc --noEmit
git add -A
git commit -m "feat(ui): la tirada se ve y se entiende, con dados, chips y sello"
```
---

### Tarea 8: `useRevelado`, la máquina de escribir

**Archivos:**
- Crear: `src/ui/hooks/useRevelado.ts`
- Test: `tests/ui/useRevelado.test.ts`

**Interfaces:**
- Consume: nada (recibe todo por argumento, a propósito: así se prueba sin store).
- Produce: `useRevelado` y `Revelado`, tal cual el contrato. Los usan las tareas 9 y 10.

Definiciones, para que el test y la implementación digan lo mismo:

- `parrafosVisibles` = cuántos párrafos de la última entrada se muestran **completos**. Los párrafos `0 … parrafosVisibles - 1` están enteros.
- `caracteresVisibles` = cuántos caracteres se muestran del párrafo **en curso**, que es el de índice `parrafosVisibles`.
- `terminado` = `parrafosVisibles === cantidad de párrafos de la entrada`.
- Solo se anima la **última** entrada del log. Si la última entrada es `choice` o `roll` (que no llevan prosa), no hay nada que animar: `terminado` es `true`.

- [ ] **Paso 1: escribir el test que falla**

Creá `tests/ui/useRevelado.test.ts`:

```ts
/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRevelado } from '@/ui/hooks/useRevelado';
import type { LogEntry, SeenMap } from '@/engine/types';

const escena = (paragraphs: string[], hashes: string[]): LogEntry => ({
  kind: 'scene',
  sceneId: 'm_inicio',
  paragraphs: paragraphs.map((text) => ({ text })),
  hashes,
});

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); });

describe('useRevelado', () => {
  it('instantáneo muestra todo desde el primer render', () => {
    const log = [escena(['uno', 'dos'], ['h1', 'h2'])];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: true }));
    expect(result.current.parrafosVisibles).toBe(2);
    expect(result.current.terminado).toBe(true);
  });

  it('revela carácter por carácter al ritmo de cps', () => {
    const log = [escena(['abcdefgh'], ['h1'])];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: false }));
    expect(result.current.caracteresVisibles).toBe(0);
    act(() => { vi.advanceTimersByTime(100); }); // 4 caracteres a 40 cps
    expect(result.current.caracteresVisibles).toBe(4);
    expect(result.current.terminado).toBe(false);
  });

  it('avanzar completa el párrafo en curso y el segundo avanza al siguiente', () => {
    const log = [escena(['abcdefgh', 'segundo'], ['h1', 'h2'])];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: false }));
    act(() => { result.current.avanzar(); });
    expect(result.current.parrafosVisibles).toBe(0);
    expect(result.current.caracteresVisibles).toBe(8);
    act(() => { result.current.avanzar(); });
    expect(result.current.parrafosVisibles).toBe(1);
    expect(result.current.caracteresVisibles).toBe(0);
  });

  it('al terminar el último párrafo queda terminado', () => {
    const log = [escena(['ab'], ['h1'])];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: false }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.terminado).toBe(true);
    expect(result.current.parrafosVisibles).toBe(1);
  });

  it('una entrada nueva en el log reinicia el revelado', () => {
    const primera = [escena(['ab'], ['h1'])];
    const { result, rerender } = renderHook((props: { log: LogEntry[] }) =>
      useRevelado({ log: props.log, seen: {}, cps: 40, instantaneo: false }), { initialProps: { log: primera } });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current.terminado).toBe(true);
    rerender({ log: [...primera, escena(['cdef'], ['h2'])] });
    expect(result.current.terminado).toBe(false);
    expect(result.current.caracteresVisibles).toBe(0);
  });

  it('si la última entrada no lleva prosa, no hay nada que revelar', () => {
    const log: LogEntry[] = [
      escena(['ab'], ['h1']),
      { kind: 'choice', sceneId: 'm_inicio', choiceId: 'partir', label: 'Partir' },
    ];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: false }));
    expect(result.current.terminado).toBe(true);
  });

  it('ofrece saltar leído solo si el párrafo en curso ya se leyó antes', () => {
    const seen: SeenMap = { m_inicio: ['h1'] };
    const sinLeer = renderHook(() => useRevelado({ log: [escena(['ab'], ['hX'])], seen, cps: 40, instantaneo: false }));
    expect(sinLeer.result.current.puedeSaltarLeido).toBe(false);
    const leido = renderHook(() => useRevelado({ log: [escena(['ab'], ['h1'])], seen, cps: 40, instantaneo: false }));
    expect(leido.result.current.puedeSaltarLeido).toBe(true);
  });

  it('saltar leído frena EXACTAMENTE en el primer párrafo no leído', () => {
    const seen: SeenMap = { m_inicio: ['h1', 'h2'] };
    const log = [escena(['viejo uno', 'viejo dos', 'variante nueva', 'viejo tres'], ['h1', 'h2', 'hNUEVO', 'h3'])];
    const { result } = renderHook(() => useRevelado({ log, seen, cps: 40, instantaneo: false }));
    act(() => { result.current.saltarLeido(); });
    expect(result.current.parrafosVisibles).toBe(2);
    expect(result.current.caracteresVisibles).toBe(0);
    expect(result.current.terminado).toBe(false);
  });

  it('si toda la entrada ya se leyó, saltar leído la muestra entera', () => {
    const seen: SeenMap = { m_inicio: ['h1', 'h2'] };
    const { result } = renderHook(() =>
      useRevelado({ log: [escena(['uno', 'dos'], ['h1', 'h2'])], seen, cps: 40, instantaneo: false }));
    act(() => { result.current.saltarLeido(); });
    expect(result.current.terminado).toBe(true);
  });

  it('una entrada de desenlace no ofrece saltar leído: no lleva hashes', () => {
    const log: LogEntry[] = [{ kind: 'outcome', paragraphs: [{ text: 'Cae la piedra.' }] }];
    const { result } = renderHook(() => useRevelado({ log, seen: {}, cps: 40, instantaneo: false }));
    expect(result.current.puedeSaltarLeido).toBe(false);
  });
});
```

- [ ] **Paso 2: correr el test y verificar que falla**

Comando: `npx vitest run tests/ui/useRevelado.test.ts`
Esperado: falla porque el hook no existe.

- [ ] **Paso 3: escribir el hook**

`src/ui/hooks/useRevelado.ts`. Guía de implementación:

- Un `useState` con `{ entrada: number; parrafos: number; caracteres: number }`.
- Un `useEffect` con dependencia en `log.length` que reinicia el estado cuando llega una entrada nueva: a todo revelado si `instantaneo`, a cero si no.
- Un `useEffect` con `setInterval(1000 / cps)` que suma un carácter por tic. Cuando el párrafo en curso se completa, el tic siguiente pasa al próximo párrafo. El intervalo se limpia cuando `terminado`.
- `avanzar()`: si el párrafo en curso está incompleto, lo completa; si no, pasa al siguiente.
- `saltarLeido()`: avanza mientras `hashes[i]` esté en `seen[sceneId]`, dejando esos párrafos completos, y frena con `caracteres: 0` en el primero que no esté.
- `puedeSaltarLeido`: la entrada es `scene`, no está terminada, y `hashes[parrafos]` está en `seen[sceneId]`.

Documentá arriba del archivo **por qué** `seen` sirve para esto: el motor lo deriva al SALIR de la escena (`engine/memory.ts`), así que mientras la leés todavía tiene los hashes de la visita anterior. Si alguien alguna vez mueve esa derivación a la entrada, este hook deja de funcionar en silencio.

- [ ] **Paso 4: correr los tests y commitear**

```bash
npx vitest run tests/ui/useRevelado.test.ts
npm test
git add -A
git commit -m "feat(ui): useRevelado, maquina de escribir y salto de lo leido"
```

---

### Tarea 9: el texto se revela en la columna

**Archivos:**
- Modificar: `src/ui/components/TextColumn.tsx`, `Parrafos.tsx`, `src/ui/screens/EscenaScreen.tsx`, sus `.module.css`
- Test: ampliar `tests/ui/EscenaScreen.test.tsx`

**Interfaces:**
- Consume: `useRevelado` (tarea 8), `useReducedMotion` (tarea 4).
- Produce: la columna revelada. La tarea 10 le agrega el botón de saltar.

- [ ] **Paso 1: escribir los tests que fallan**

En `tests/ui/EscenaScreen.test.tsx`:

```tsx
  it('con cps 0 el texto aparece entero y las opciones también', () => {});

  it('mientras se revela no hay opciones, y aparecen al terminar', () => {
    // vi.useFakeTimers(); al montar, queryAllByRole('button') de la lista está vacío
    // tras avanzar el tiempo, las opciones están
  });

  it('un clic en la columna completa el párrafo en curso', () => {});

  it('Enter y Espacio hacen lo mismo que el clic', () => {});

  it('con movimiento reducido no hay revelado', () => {});
```

- [ ] **Paso 2: correr y verificar que fallan**

Comando: `npx vitest run tests/ui/EscenaScreen.test.tsx`

- [ ] **Paso 3: pasar el revelado por la columna**

`Parrafos` gana dos props opcionales: `visibles?: number` y `caracteres?: number`. Sin ellas se comporta como hoy (la usa `FinScreen`, que no anima). Con ellas, muestra los primeros `visibles` párrafos completos, el de índice `visibles` cortado en `caracteres`, y ninguno más.

`TextColumn` recibe el `Revelado` y se lo pasa **solo a la última entrada**. El resto se dibuja como hoy.

`EscenaScreen` llama a `useRevelado({ log: gs.run.log, seen: gs.seen, cps: prefs.cps, instantaneo: prefs.cps === 0 || reducida })` y:

- pasa el revelado a `TextColumn`;
- pone un `onClick` en la columna que llama a `avanzar()`;
- escucha Enter y Espacio (con la guarda de campo de texto de `src/ui/teclado.ts`) para lo mismo;
- **oculta `OptionList` y `RollPanel` hasta que `terminado` sea `true`**.

Ojo con el `scrollIntoView` que `TextColumn` ya hace con `log.length`: ahora también tiene que seguir el texto que crece, o el párrafo en curso queda debajo del borde. Agregá el efecto sobre `caracteresVisibles` además del de `log.length`.

Ojo con el teclado 1-9 de `OptionList`: si la lista está oculta, el listener no está montado y no hay riesgo de elegir a ciegas. Verificalo con un test.

- [ ] **Paso 4: correr todo y commitear**

```bash
npm test
npx tsc --noEmit
git add -A
git commit -m "feat(ui): el texto se revela y las opciones esperan a que termine"
```

---

### Tarea 10: saltar leído, de punta a punta

**Archivos:**
- Modificar: `src/ui/screens/EscenaScreen.tsx`, `src/ui/strings.es.ts`, `EscenaScreen.module.css`
- Test: `tests/ui/saltar-leido.test.tsx`

**Interfaces:**
- Consume: `useRevelado` (tarea 8) y el revelado ya enchufado (tarea 9).
- Produce: el criterio de listo número 2 de la fase.

- [ ] **Paso 1: escribir el test de integración con el motor real**

Creá `tests/ui/saltar-leido.test.tsx`. Este no usa un log inventado: arma el store, juega con el motor real una escena que tiene variante por `visited`, vuelve a entrar y verifica el frenado. Usá la campaña de fixture `tests/fixtures/campaigns/memoria.ts`, que ya tiene variantes por visita; si le falta un párrafo nuevo intercalado, agregáselo ahí (es un fixture, no contenido de producción).

```tsx
  it('en la segunda visita, saltar leído frena en la variante nueva', () => {
    // 1. store con personaje y run en la campaña de memoria
    // 2. jugar la escena entera una vez (los hashes quedan en seen al salir)
    // 3. volver a entrar
    // 4. el botón "Saltar leído" está visible
    // 5. clic: el párrafo repetido está entero en pantalla
    // 6. el párrafo NUEVO está cortado (se está tipeando), no completo
  });

  it('en la primera visita el botón no existe', () => {});

  it('el botón desaparece cuando ya no queda nada leído por saltar', () => {});
```

- [ ] **Paso 2: correr y verificar que falla**

Comando: `npx vitest run tests/ui/saltar-leido.test.tsx`

- [ ] **Paso 3: el botón**

En `EscenaScreen`, arriba de la columna: un botón `S.escena.saltarLeido` ("Saltar lo leído") visible **solo** cuando `revelado.puedeSaltarLeido`. `title` que explique qué hace: "Adelanta hasta lo que todavía no leíste".

- [ ] **Paso 4: verificarlo a mano**

```bash
npm run dev
```
Jugá una escena, volvé a entrar y usá el botón. Tiene que frenar en la línea nueva, no antes ni después. Anotá en el informe de la tarea qué escena usaste y qué línea la frenó.

- [ ] **Paso 5: commitear**

```bash
npm test
git add -A
git commit -m "feat(ui): saltar lo leido, que frena en la variante nueva"
```

---

### Tarea 11: la pantalla de fin dice lo que el mundo recordará

**Archivos:**
- Modificar: `src/ui/screens/FinScreen.tsx`, `FinScreen.module.css`, `src/ui/strings.es.ts`
- Test: ampliar `tests/ui/FinScreen.test.tsx`

**Interfaces:**
- Consume: `Campaign.memories` (tarea 1), `derivarCronica` (tarea 2).
- Produce: nada para tareas posteriores.

`EndSummary.canonFlags` existe desde la Fase C y **no se muestra en ninguna parte**. Es el momento exacto en que el juego te dice qué quedó escrito, y hoy está mudo.

- [ ] **Paso 1: escribir los tests que fallan**

En `tests/ui/FinScreen.test.tsx`:

```tsx
  it('lista lo que el mundo recordará, con la línea de memories de cada flag de canon', () => {});

  it('no muestra los flags descartados', () => {
    // endSummary.discardedFlags no aparece: se perdieron, no son canon
  });

  it('un flag de canon sin línea se omite, y no se ve ningún identificador', () => {});

  it('muestra los finales vistos y los no vistos en silueta', () => {
    // el título del final visto se lee; el del no visto NO se lee (silueta),
    // pero se ve que existe: la cuenta dice "2 de 4"
  });

  it('una derrota no lista canon, porque no escribió ninguno', () => {});
```

- [ ] **Paso 2: correr y verificar que fallan**

Comando: `npx vitest run tests/ui/FinScreen.test.tsx`

- [ ] **Paso 3: implementar**

Una sección "Lo que el mundo recordará" con `endSummary.canonFlags.map((f) => campaign.memories[f])`, filtrando los que no tienen línea. Debajo, los finales: los vistos con su título, los no vistos como silueta (`●●●●` o un guion largo, **nunca** el título ni el id), y la cuenta "2 de 4" que ya sale de `derivarCronica`.

Un final `hidden` que no se vio se muestra igual en silueta: saber que existe es parte del gancho para rejugar, y el título lo revelaría.

- [ ] **Paso 4: correr todo y commitear**

```bash
npm test
git add -A
git commit -m "feat(ui): el fin dice que quedo escrito y que finales faltan"
```

---

### Tarea 12: fundidos, accesibilidad y cierre de la fase

**Archivos:**
- Modificar: `src/ui/components/Imagen.tsx`, `Imagen.module.css`, `src/app/tokens.css`, `src/ui/components/TextColumn.tsx`
- Test: ampliar `tests/ui/Imagen.test.tsx`

**Interfaces:**
- Consume: `useReducedMotion` (tarea 4).
- Produce: el cierre de la fase.

- [ ] **Paso 1: el fundido cruzado**

`Imagen` ya precarga. Falta que el cambio de fondo no parpadee: cuando cambia el `id`, esperá a `img.decode()` y recién ahí cambiá la imagen visible, con una transición de opacidad. Con `useReducedMotion()` en `true`, corte seco.

Test: al cambiar el `id`, la imagen vieja sigue en el DOM hasta que la nueva resolvió `decode()`. En jsdom `decode` no existe: usá una guarda (`img.decode?.() ?? Promise.resolve()`) y en el test resolvé a mano.

- [ ] **Paso 2: `aria-live` en la columna**

La columna de texto lleva `aria-live="polite"` y `aria-atomic="false"` para que un lector de pantalla anuncie el texto que va apareciendo. No se lo pongas al panel de tirada: ese cambia muchas veces en un segundo y sería ruido.

- [ ] **Paso 3: foco visible**

En `tokens.css`, una regla global `:focus-visible` con contorno de `--color-acento` y 2 px de offset. Revisá que ningún `.module.css` haga `outline: none` sin reemplazo; si lo hace, arreglalo.

- [ ] **Paso 4: contraste**

Verificá el contraste de `--color-texto-suave` sobre `--color-superficie` y de las tres etiquetas de riesgo sobre su fondo. Si alguna baja de 4,5:1, subile la luminosidad **en `tokens.css`**, no en el componente. Anotá en el informe los pares que mediste y su ratio.

- [ ] **Paso 5: la partida entera**

```bash
npm run dev
```

Jugá **una partida completa** de "El vado de Aldamar", con la consola abierta. Verificá, y anotá en el informe:

1. Una tirada con Fortuna: se ve de dónde salió cada punto y qué se anuló.
2. Saltar leído frena en una variante nueva.
3. La Ficha muestra Recuerdos legibles; ningún identificador a la vista.
4. La confirmación de escena mortal dice lo que corresponde a tus Heridas.
5. **Cero errores en la consola.**

- [ ] **Paso 6: el circuito completo**

```bash
npm test
npx tsc --noEmit
npm run validate
npm run build
```
Todo verde.

- [ ] **Paso 7: commit final**

```bash
git add -A
git commit -m "feat(ui): fundidos, foco visible y accesibilidad de la columna"
```
