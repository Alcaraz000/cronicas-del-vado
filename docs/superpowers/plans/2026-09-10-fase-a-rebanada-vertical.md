# Plan de implementación: Fase A, rebanada vertical

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** Dejar jugable en el navegador, de punta a punta y con persistencia, la campaña de humo `prueba` (10 escenas con placeholders grises) sobre el motor de reglas completo, el esquema de contenido validado por 10 reglas y el store persistido; al recargar en medio de una tirada, la partida continúa con los mismos dados, y la primera visita a una escena nunca muestra "otra vez".

**Arquitectura:** Sitio estático Vite + React 19 + TypeScript strict sin backend. Tres capas con dependencias en un solo sentido: `src/content` (solo datos tipados: catálogo, esquema zod y campañas como módulos con `import()` dinámico), `src/engine` (funciones puras sobre `GameState = { world, character, run, seen }`: dados deterministas por hash, condiciones, efectos, texto con variantes, memoria derivada, modificadores y resolución de escenas) y `src/state` + `src/ui` (Zustand con `persist` en localStorage y pantallas React que solo llaman al store). `tools/validate.ts` corre en Node con `tsx` y valida el contenido antes del build.

**Stack:** Vite 8+, React 19, TypeScript 5 `strict`, Vitest 3+ (jsdom, Testing Library), zod 4, zustand 5, tsx, npm-run-all2, CSS Modules. Node 24, npm 11, Windows 11 (PowerShell o Git Bash). Sin router, sin Tailwind, sin librería de componentes, sin audio, sin Motion en esta fase.

**Spec de referencia:** [docs/superpowers/specs/2026-09-10-juegorol-design.md](../specs/2026-09-10-juegorol-design.md), secciones 2 (arquitectura), 3 (modelo de datos), 4 (reglas), 5 (memoria), 9 (guardado), 10 (testing) y 12 (fase A).

## Restricciones globales

Toda tarea las cumple aunque no las repita.

- **Stack fijo (spec §2):** Vite 8 + React 19 + TypeScript 5 (`strict`), Zustand 5 con `persist`, zod 4, Vitest, `tsx` para scripts. CSS Modules con tokens; sin Tailwind ni librería de componentes. Sin router: máquina de estados de pantallas en el store. Sin audio en la v1.
- **Capas (spec §2):** `engine` no importa React ni el store. `ui` no evalúa reglas: llama al motor y muestra su resultado. `content` es solo datos y referencia assets por id; nunca importa imágenes ni nada de Vite. `tools/*.ts` corren con `tsx` en Node puro.
- **Contenido en TypeScript, no JSON (spec §2):** cada escena se declara con `satisfies Scene`. Datos declarativos, nunca expresiones en strings (spec §3).
- **Ids (spec §3):** `snake_case` sin acentos, con prefijo de acto en escenas (`p_` en la campaña de humo). Flags con prefijo `run:`, `char:<campaña>.`, `world:<campaña>.`; espacios compartidos `char:met.*`, `char:place.*`, `char:origen.*`, `char:leyenda`, `world:caido.*`.
- **Opciones (spec §3, regla 3):** toda escena no final tiene entre 4 y 9 opciones, al menos 4 sin `requires`; `ending` tiene 0.
- **Dados (spec §4):** `2d6 + Atributo + Dificultad` (Fácil +1, Normal 0, Difícil −1, Muy difícil −2, Extrema −3). Ventaja: 3d6 conservando los 2 mayores; desventaja: los 2 menores; si hay ambas se anulan. Naturales priman: doble 6 conservado = Crítico, doble 1 = Fallo grave; luego total ≥ 10 Éxito, 7-9 Éxito con costo, ≤ 6 Fallo.
- **Orden del motor (spec §2):** `enter` resuelve `redirect` (tope 8) → `onEnter` de la escena final → `render` evalúa contra el estado sin la derivación de memoria de esta escena → al elegir se deriva memoria (`met`, `place`, `visited`, hashes vistos), se aplican efectos y se entra a la siguiente. Las escenas atravesadas por `redirect` no cuentan como visitadas.
- **Dados deterministas (spec §2):** cada tirada sale de `hash(run.rngSeed, sceneId, choiceId, visitas, intento)` con mulberry32; `run.pending = { choiceId, rerolls, powerUsed }` se persiste al mostrar los dados y se reconstruye al rehidratar.
- **Muerte (spec §4):** `{ lethal: true }` aplica 2 Heridas; Malherido → muere; Herido → Caído; Sano → Malherido y sigue. Solo en outcomes de tirada de escenas `lethal`.
- **Guardado (spec §9):** localStorage, una sola clave `juegorol`, `persist` de Zustand con `partialize` (todo menos `ui`), `version` 1, `migrations.ts` como arreglo de funciones puras. Try/catch en todo acceso.
- **Build (spec §2):** `npm run build` = `validate → test → vite build`. Deploy con GitHub Actions a Pages; `base` desde `VITE_BASE`.
- **Idioma:** todo texto de juego y de UI en español rioplatense (voseo en diálogos, narración en segunda persona y presente), centralizado en `src/ui/strings.es.ts`. Identificadores en español sin acentos.
- **Commits:** mensaje en español con prefijo convencional (`feat:`, `test:`, `chore:`, `docs:`), y la línea final `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Commit pequeño por ciclo test → implementación.
- **TypeScript:** sin `any` (usar `unknown` y narrowing), sin non-null assertions fuera de tests, exports con tipos explícitos. Alias `@/` → `src/`.
- **Windows:** comandos con `npm`/`npx`, uno por línea; nada de `&&` de bash dentro de `package.json` (encadenar con `run-s`); rutas con barra normal dentro del código.

---

## Estructura de archivos e interfaces (contrato de la Fase A)

Este contrato es la fuente de verdad para nombres de archivos, tipos y firmas. Cada tarea usa exactamente estos nombres; lo que una tarea agrega lo declara en su bloque "Produce".

### A. Entorno

- Node 24, npm 11, Windows 11 (los comandos deben funcionar en PowerShell y en Git Bash; usar `npx`/`npm run`; en `package.json` no usar `&&` con sintaxis de bash: encadenar con `npm-run-all2` (`run-s`)).
- Vite (major 8 o superior) + React 19 + TypeScript 5.x `strict` + Vitest (major 3 o superior) + `tsx` + `zod` 4 + `zustand` 5 + `@testing-library/react` + `@testing-library/jest-dom` + `jsdom`. Sin router, sin Tailwind, sin librería de componentes. CSS Modules con tokens en `src/app/tokens.css`. Sin audio, sin Motion (la animación de dados es Fase F).
- Alias de import: `@/` → `src/` (configurado en `vite.config.ts` con `resolve.alias` y en `tsconfig.json` con `paths`; Vitest lo hereda vía `vite.config.ts`; `tsx` lo resuelve leyendo `tsconfig.json` paths).
- Scripts en `package.json`: `dev`, `build` (= `run-s validate test:run typecheck` y luego `vite build`), `preview`, `test` (vitest en watch), `test:run` (`vitest run`), `typecheck` (`tsc --noEmit -p tsconfig.json`), `validate` (`tsx tools/validate.ts`).
- Deploy: GitHub Actions `.github/workflows/deploy.yml` → `actions/checkout@v4`, `actions/setup-node@v4` (node 24, cache npm), `npm ci`, `npm run build` con `VITE_BASE=/<repo>/`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3` (dist), `actions/deploy-pages@v4`. `base` de Vite = `process.env.VITE_BASE ?? '/'`. `.gitattributes` con `* text=auto eol=lf`.

### B. Estructura de archivos (Fase A)

```
.gitattributes, .gitignore, package.json, tsconfig.json, tsconfig.node.json, vite.config.ts, index.html, README.md
.github/workflows/deploy.yml
src/main.tsx
src/app/App.tsx            // monta ScreenRouter dentro de un ErrorBoundary; escucha vite:preloadError y recarga una vez (flag en sessionStorage)
src/app/ScreenRouter.tsx   // switch por store.ui.screen
src/app/tokens.css         // variables CSS (colores, tipografía, espaciado) + reset mínimo
src/content/catalog.ts     // constantes del sistema: atributos, tags, dificultades, clases, rasgos, habilidades, condiciones, límites
src/content/schema.ts      // tipos de contenido + esquemas zod espejo
src/content/world/npcs.ts, places.ts, items.ts, flags.ts, index.ts   // mínimos en Fase A (objetos vacíos tipados) + WORLD
src/content/campaigns/index.ts          // registro de campañas (meta estática + load() dinámico)
src/content/campaigns/prueba/meta.ts    // CampaignMeta de la campaña de humo
src/content/campaigns/prueba/campaign.ts// Campaign completa (importa scenes/*, npcs, places, items, flags)
src/content/campaigns/prueba/npcs.ts, places.ts, items.ts, flags.ts
src/content/campaigns/prueba/scenes/acto1.ts, acto2.ts
src/engine/types.ts        // tipos de estado y de salida del motor
src/engine/dice.ts         // distribuciones exactas, bandas, etiqueta de riesgo
src/engine/rng.ts          // hash determinista → dados
src/engine/conditions.ts   // evaluate(condition, ctx)
src/engine/effects.ts      // applyEffects(effects, ctx)
src/engine/text.ts         // resolveText, hashParagraph (FNV-1a base36)
src/engine/memory.ts       // deriveMemory
src/engine/modifiers.ts    // fuentes de ventaja/desventaja, anulación, modificador total, RollPreview
src/engine/progression.ts  // campaignLabel, veteranModifier, fortuneMax (XP y niveles = Fase C)
src/engine/resolve.ts      // getScene, enter, render, choose, beginRoll, rerollDie, usePower, usePlegaria, restorePending, commitRoll, endRun
src/state/store.ts         // Zustand + persist; slices persistidos y slice ui no persistido
src/state/migrations.ts    // MIGRATIONS: Array<(s: unknown) => unknown>; vacío en v1
src/state/selectors.ts     // selectGameState, writeGameState
src/ui/strings.es.ts       // todos los textos de UI en español (objeto S)
src/ui/screens/InicioScreen.tsx, EscenaScreen.tsx, FinScreen.tsx, CargandoScreen.tsx, ErrorScreen.tsx
src/ui/components/TextColumn.tsx, OptionList.tsx, RollPanel.tsx, StatusBar.tsx, Placeholder.tsx
src/ui/components/*.module.css, src/ui/screens/*.module.css
tools/validate.ts          // CLI: `tsx tools/validate.ts [--profile smoke|release] [--campaign id]`
tools/lib/validate/index.ts        // validateCampaign(campaign, ctx): ValidationIssue[]
tools/lib/validate/rules/r01_targets.ts … r10_todo.ts   // una regla por archivo
tools/lib/validate/reach.ts        // alcanzabilidad optimista por clase
tests/engine/*.test.ts, tests/content/*.test.ts, tests/tools/*.test.ts, tests/state/*.test.ts, tests/ui/*.test.tsx
tests/fixtures/campaigns/*.ts      // campañas mínimas rotas, una por regla ERROR, + `minimal.ts` válida
tests/setup.ts                     // importa @testing-library/jest-dom/vitest
```

Reglas de capas: `src/engine` importa solo de `src/engine` y `src/content/{catalog,schema}`; nunca React ni el store. `src/content` es solo datos: nunca importa imágenes ni nada de Vite. `tools/*` corre con `tsx` en Node puro e importa `src/content/**` y `src/engine/**` con el alias `@/`. `src/ui` no evalúa reglas: llama al store, que llama al motor.

### C. `src/content/catalog.ts` (constantes; exporta tipos derivados)

```ts
export const ATTRS = ['vigor', 'astucia', 'saber', 'presencia'] as const;
export type Attr = (typeof ATTRS)[number];
export const ATTR_NAMES: Record<Attr, string> = { vigor: 'Vigor', astucia: 'Astucia', saber: 'Saber', presencia: 'Presencia' };
export const TAGS = ['fisico','sigilo','percepcion','social','engano','saber','magia','fe','supervivencia','huida'] as const;
export type Tag = (typeof TAGS)[number];
export const DIFFICULTIES = { facil: 1, normal: 0, dificil: -1, muy_dificil: -2, extrema: -3 } as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const DIFFICULTY_NAMES: Record<Difficulty, string> = { facil: 'Fácil', normal: 'Normal', dificil: 'Difícil', muy_dificil: 'Muy difícil', extrema: 'Extrema' };
export type PowerScope = { kind: 'tags'; tags: readonly Tag[] } | { kind: 'any' } | { kind: 'sheet' };
export interface ClassDef { name: string; attr: Attr; weakness: Tag; power: { id: string; name: string; description: string; scope: PowerScope } }
export const CLASSES = {
  guerrero:   { name: 'Guerrero',   attr: 'vigor',     weakness: 'sigilo',  power: { id: 'furia',    name: 'Furia',    description: 'Convierte un Fallo en Éxito con costo en una tirada física.', scope: { kind: 'tags', tags: ['fisico'] } } },
  explorador: { name: 'Explorador', attr: 'astucia',   weakness: 'social',  power: { id: 'sombra',   name: 'Sombra',   description: 'Convierte un Fallo en Éxito con costo en sigilo, huida o supervivencia.', scope: { kind: 'tags', tags: ['sigilo','huida','supervivencia'] } } },
  mago:       { name: 'Mago',       attr: 'saber',     weakness: 'fisico',  power: { id: 'conjuro',  name: 'Conjuro',  description: 'Convierte un Fallo en Éxito con costo en cualquier tirada; quedás Agotado.', scope: { kind: 'any' } } },
  clerigo:    { name: 'Clérigo',    attr: 'presencia', weakness: 'engano',  power: { id: 'plegaria', name: 'Plegaria', description: 'Cura 1 Herida y limpia todas las condiciones. Se usa desde la ficha.', scope: { kind: 'sheet' } } },
} as const satisfies Record<string, ClassDef>;
export type ClassId = keyof typeof CLASSES;
export interface TraitDef { name: string; tag: Tag; description: string }
export const TRAITS = {
  hijo_de_la_frontera:  { name: 'Hijo de la frontera',  tag: 'supervivencia', description: 'Creciste donde el mapa se acaba; el monte no te asusta.' },
  criado_en_el_templo:  { name: 'Criado en el templo',  tag: 'fe',            description: 'Sabés qué se dice y qué se calla delante de un altar.' },
  desertor:             { name: 'Desertor',             tag: 'fisico',        description: 'Serviste, peleaste y te fuiste. Todavía sabés parar un golpe.' },
  huerfano_de_la_peste: { name: 'Huérfano de la peste', tag: 'percepcion',    description: 'Aprendiste a mirar antes de entrar a una casa.' },
  aprendiz_de_escriba:  { name: 'Aprendiz de escriba',  tag: 'saber',         description: 'Leés rápido, incluso lo que no está escrito para vos.' },
  contrabandista:       { name: 'Contrabandista',       tag: 'engano',        description: 'Mentir con cara de piedra fue tu oficio.' },
  cazador_furtivo:      { name: 'Cazador furtivo',      tag: 'sigilo',        description: 'Sabés moverte sin que el bosque ni el guardabosque te oigan.' },
  hijo_de_molinero:     { name: 'Hijo de molinero',     tag: 'social',        description: 'Conocés a la gente de pueblo porque sos de pueblo.' },
} as const satisfies Record<string, TraitDef>;
export type TraitId = keyof typeof TRAITS;
export interface SkillDef { name: string; tag: Tag }
export const SKILLS = {
  veterano: { name: 'Veterano', tag: 'fisico' }, intimidante: { name: 'Intimidante', tag: 'social' }, orador: { name: 'Orador', tag: 'social' },
  rastreador: { name: 'Rastreador', tag: 'percepcion' }, ojo_avizor: { name: 'Ojo avizor', tag: 'percepcion' }, escurridizo: { name: 'Escurridizo', tag: 'huida' },
  erudito_de_runas: { name: 'Erudito de runas', tag: 'saber' }, vista_arcana: { name: 'Vista arcana', tag: 'magia' }, voz_del_templo: { name: 'Voz del templo', tag: 'fe' },
  curandero: { name: 'Curandero', tag: 'supervivencia' }, superviviente: { name: 'Superviviente', tag: 'supervivencia' }, manos_ligeras: { name: 'Manos ligeras', tag: 'sigilo' },
} as const satisfies Record<string, SkillDef>;
export type SkillId = keyof typeof SKILLS;
export interface ConditionDef { name: string; tag: Tag | 'all' }
export const CONDITIONS = {
  envenenado: { name: 'Envenenado', tag: 'all' }, asustado: { name: 'Asustado', tag: 'social' }, exhausto: { name: 'Exhausto', tag: 'fisico' },
  empapado: { name: 'Empapado', tag: 'sigilo' }, perseguido: { name: 'Perseguido', tag: 'huida' }, agotado: { name: 'Agotado', tag: 'magia' },
} as const satisfies Record<string, ConditionDef>;
export type ConditionId = keyof typeof CONDITIONS;
export const FUMBLE_DEFAULT_CONDITION: ConditionId = 'exhausto';
export const LIMITS = { maxItems: 6, maxConditions: 3, maxRedirects: 8, maxLog: 400, fortuneBase: 3, fortuneFromLevel5: 4, maxWounds: 3, maxAttr: 5, maxLevel: 10, xpPerLevel: 60, minChoices: 4, maxChoices: 9, maxCharacters: 3 } as const;
export const WOUND_LABELS = ['Sano', 'Herido', 'Malherido', 'Caído'] as const;
export function isTraitAllowed(classId: ClassId, traitId: TraitId): boolean;   // false si TRAITS[traitId].tag === CLASSES[classId].weakness
export function isSkillAllowed(classId: ClassId, skillId: SkillId): boolean;   // ídem con SKILLS
```

### D. `src/content/schema.ts` (tipos de contenido + zod)

```ts
import { z } from 'zod';
import { ATTRS, TAGS, DIFFICULTIES, CLASSES, TRAITS, SKILLS, CONDITIONS, type Attr, type Tag, type Difficulty, type ClassId, type TraitId, type SkillId, type ConditionId } from './catalog';
export type FlagId = `run:${string}` | `char:${string}` | `world:${string}`;
export type SceneKind = 'normal' | 'hub' | 'encounter' | 'rest' | 'ending';
export type Condition =
  | { flag: FlagId } | { not: Condition } | { all: Condition[] } | { any: Condition[] }
  | { class: ClassId } | { trait: TraitId } | { skill: SkillId } | { item: string }
  | { attr: Attr; gte: number } | { wounds: { gte?: number; lte?: number } } | { condition: ConditionId }
  | { visited: string; min?: number } | { met: string } | { knows: string }
  | { clock: string; gte: number } | { endingSeen: string };
export type Effect =
  | { set: FlagId } | { clear: FlagId } | { give: string } | { take: string }
  | { wound: 1 | 2 } | { heal: 1 } | { addCondition: ConditionId } | { removeCondition: ConditionId | 'all' }
  | { clock: string; delta: number } | { milestone: string } | { fortune: number } | { lethal: true };
export interface TextVariant { when?: Condition; text: string }
export interface Paragraph { speaker?: string; variants: TextVariant[] }
export type Text = (string | Paragraph)[];
export interface Outcome { text?: Text; effects?: Effect[]; next: string }
export interface Roll { attr: Attr; difficulty: Difficulty; tags: Tag[]; advantageIf?: Condition; disadvantageIf?: Condition;
  outcomes: { success: Outcome; partial: Outcome; failure: Outcome; crit?: Outcome; fumble?: Outcome } }
export interface Choice { id: string; label: string; requires?: Condition; lockedHint?: string; roll?: Roll; outcome?: Outcome }
export interface Redirect { when: Condition; to: string }
export interface Scene { id: string; kind: SceneKind; lethal?: true; place: string; variant?: string; cg?: string; npcs?: string[];
  redirect?: Redirect[]; onEnter?: Effect[]; text: Text; choices: Choice[]; ending?: { id: string; epilogue: Text } }
export interface Npc   { id: string; name: string; portrait: string; voice: string; canonPrompt: string }
export interface Place { id: string; name: string; background: string; variants?: Record<string, string>; canonPrompt: string }
export interface Item  { id: string; name: string; icon: string; description: string; advantageTags?: Tag[]; relic?: true }
export interface CampaignMeta { id: string; contentVersion: number; title: string; premise: string; cover: string;
  levelRange: [number, number]; durationMin: [number, number]; lethalScenes: number; lintProfile: 'smoke' | 'release'; hidden?: true }
export interface Campaign extends CampaignMeta { start: string;
  scenes: Record<string, Scene>; npcs: Record<string, Npc>; places: Record<string, Place>; items: Record<string, Item>;
  flags: Record<string, string>; milestones: Record<string, { label: string }>;
  clocks: Record<string, { max: number; label: string }>; endings: Record<string, { title: string; hidden?: true; reward?: Effect[] }> }
export interface WorldContent { npcs: Record<string, Npc>; places: Record<string, Place>; items: Record<string, Item>; flags: Record<string, string> }
// zod exportados: ConditionSchema (z.lazy), EffectSchema, TextSchema, OutcomeSchema, RollSchema, ChoiceSchema, RedirectSchema, SceneSchema, NpcSchema, PlaceSchema, ItemSchema, CampaignMetaSchema, CampaignSchema, WorldContentSchema
// Los tipos se declaran a mano (legibles) y un test con expectTypeOf comprueba que z.infer<typeof CampaignSchema> es asignable a Campaign y viceversa.
export function parseCampaign(data: unknown): Campaign;   // CampaignSchema.parse
```

Ids de flags de contenido: `run:<nombre>`, `char:<campaña>.<nombre>`, `world:<campaña>.<nombre>`. Espacios compartidos (solo los deriva el motor o los declara `world/flags.ts`): `char:met.<npc>`, `char:place.<lugar>`, `char:origen.<rasgo>`, `char:leyenda`, `world:caido.<campaña>`.

### E. `src/engine/types.ts`

```ts
import type { Attr, ClassId, TraitId, SkillId, ConditionId, Difficulty } from '@/content/catalog';
import type { Campaign, SceneKind } from '@/content/schema';
export interface Fallen { name: string; classId: ClassId; level: number; campaign: string; scene: string }
export interface WorldState { flags: string[]; fallen: Fallen[] }
export interface CampaignLogEntry { runs: number; wins: number; endings: string[]; milestones: string[]; canonEnding?: string }
export interface Character { id: string; name: string; portrait: string; classId: ClassId; attrs: Record<Attr, number>;
  traits: TraitId[]; skills: SkillId[]; level: number; xp: number; flags: string[]; memoryNames: Record<string, { name: string; campaign: string }>;
  relics: string[]; scars: string[]; campaignLog: Record<string, CampaignLogEntry>; run: Run | null; dead?: { campaign: string; scene: string } }
export type RollMode = 'normal' | 'advantage' | 'disadvantage' | 'cancelled';   // cancelled = había ambas, se tiran 2d6
export type Band = 'crit' | 'success' | 'partial' | 'failure' | 'fumble';
export type Risk = 'seguro' | 'arriesgado' | 'peligroso';
export interface ResolvedParagraph { speaker?: string; text: string }
export type LogEntry =
  | { kind: 'scene'; sceneId: string; paragraphs: ResolvedParagraph[]; hashes: string[] }
  | { kind: 'choice'; sceneId: string; choiceId: string; label: string }
  | { kind: 'roll'; dice: number[]; kept: number[]; mode: RollMode; total: number; band: Band; fortuneSpent: number; powerUsed: boolean }
  | { kind: 'outcome'; paragraphs: ResolvedParagraph[] };
export type RunOutcome = { kind: 'ending'; endingId: string } | { kind: 'defeat' } | { kind: 'death' };
export interface PendingPersisted { choiceId: string; rerolls: number[]; powerUsed: boolean }  // rerolls = índices de dado repetidos, en orden
export interface Run { campaignId: string; contentVersion: number; sceneId: string; flags: string[]; stagedFlags: string[];
  visited: Record<string, number>; items: string[]; wounds: 0 | 1 | 2 | 3; conditions: ConditionId[]; fortune: number; powerUsed: boolean;
  clocks: Record<string, number>; milestones: string[]; log: LogEntry[]; rngSeed: number; pending?: PendingPersisted; outcome?: RunOutcome }
export type SeenMap = Record<string, string[]>;          // sceneId → hashes de párrafo (de la campaña actual)
export interface GameState { world: WorldState; character: Character; run: Run; seen: SeenMap }
export interface EvalContext { campaign: Campaign; state: GameState }
export interface RollSource { kind: 'advantage' | 'disadvantage'; label: string; origin: 'trait' | 'skill' | 'item' | 'class' | 'condition' | 'wound' | 'scene'; cancelled: boolean }
export interface RollPreview { attr: Attr; attrValue: number; difficulty: Difficulty; difficultyMod: number; veteranMod: number; totalMod: number;
  mode: RollMode; sources: RollSource[]; odds: { success: number; partial: number; failure: number }; risk: Risk; targetLine: string }
export interface RenderedChoice { id: string; label: string; visible: boolean; enabled: boolean; badge?: string; lockedHint?: string;
  preview?: RollPreview; leadsToLethal: boolean; alreadySeen: boolean }
export interface RenderedScene { sceneId: string; kind: SceneKind; lethal: boolean; place: string; variant?: string; cg?: string; portraitNpc?: string;
  paragraphs: ResolvedParagraph[]; choices: RenderedChoice[]; ending?: { id: string; title: string; epilogue: ResolvedParagraph[] } }
export interface PendingRoll { choiceId: string; sceneId: string; preview: RollPreview; dice: number[]; kept: number[]; total: number; band: Band;
  rerolls: number[]; powerUsed: boolean; canReroll: boolean; canUsePower: boolean }
export interface EndSummary { outcome: RunOutcome; canonFlags: string[]; discardedFlags: string[] }
```

### F. Firmas del motor (todas puras; nunca mutan la entrada; devuelven objetos nuevos)

```ts
// dice.ts
export function keepDice(dice: number[], mode: RollMode): number[];                 // índices conservados (siempre 2): advantage → los 2 mayores; disadvantage → los 2 menores; normal/cancelled → [0,1]
export function classify(kept: number[], totalMod: number): Band;                   // kept = valores; naturales primero: [6,6] crit, [1,1] fumble; luego total = suma+mod: ≥10 success, 7-9 partial, ≤6 failure
export function bandOdds(totalMod: number, mode: RollMode): { crit: number; success: number; partial: number; failure: number; fumble: number };
  // enumeración exhaustiva de 36 (normal/cancelled) o 216 (advantage/disadvantage) casos; valores como number exactos (p. ej. 6/36)
export function odds(totalMod: number, mode: RollMode): { success: number; partial: number; failure: number };  // success = crit+success, failure = failure+fumble
export function riskLabel(o: { success: number; partial: number; failure: number }): Risk;  // seguro: failure ≤ 0.20 && success ≥ 0.40; si no arriesgado: failure ≤ 0.45; si no peligroso
export function targetLine(totalMod: number): string;  // "10+ éxito · 7+ con costo · doble 1 siempre falla · doble 6 siempre crítico" expresado en dados: con mod m, "necesitás {10-m}+ en los dados para éxito, {7-m}+ con costo"
// Valores esperados (redondeados a 0,1 %): normal mod 0 → 16,7/41,7/41,7; mod +2 → 41,7/41,7/16,7; advantage mod 0 → 35,6/44,9/19,4; advantage +2 → 68,1/26,9/5,1; disadvantage mod 0 → 5,1/26,9/68,1; crit normal 2,8 %, crit advantage 7,4 %, fumble disadvantage 7,4 %, fumble advantage 0,5 %.
// rng.ts
export function hash32(...parts: (string | number)[]): number;          // FNV-1a de 32 bits (offset 2166136261, prime 16777619) sobre parts.join('|'), resultado >>> 0
export function mulberry32(seed: number): () => number;                  // generador [0,1)
export function rollDice(seed: number, sceneId: string, choiceId: string, visits: number, attempt: number, count: number): number[]; // mulberry32(hash32(seed, sceneId, choiceId, visits, attempt)) → count enteros 1-6
export function newSeed(entropy: string): number;                         // hash32(entropy); el store pasa `${Date.now()}|${Math.random()}`
// conditions.ts
export function hasFlag(state: GameState, flag: string): boolean;        // run: en run.flags; char: en character.flags ∪ run.stagedFlags; world: en world.flags ∪ run.stagedFlags
export function evaluate(cond: Condition | undefined, ctx: EvalContext): boolean;
  // undefined → true. visited: (run.visited[x] ?? 0) ≥ (min ?? 1). met: hasFlag `char:met.<x>`. knows: hasFlag `char:place.<x>`. clock: (run.clocks[x] ?? 0) ≥ gte. endingSeen: character.campaignLog[campaign.id]?.endings incluye x. attr: character.attrs[a] ≥ gte. wounds: run.wounds dentro de gte/lte. condition: run.conditions incluye. item: run.items incluye. class/trait/skill: del personaje.
// effects.ts
export function applyEffects(effects: Effect[] | undefined, ctx: EvalContext): GameState;
  // set/clear: `run:` → run.flags; `char:`/`world:` → run.stagedFlags (dedup). give: ignora si run.items.length ≥ LIMITS.maxItems o ya lo tiene. take: quita si está.
  // wound n: min(3, wounds+n). heal: max(0, wounds-1). addCondition: dedup; si ya hay 3, reemplaza la más antigua (índice 0). removeCondition: id o 'all'.
  // clock: clamp 0..campaign.clocks[name].max. milestone: dedup en run.milestones. fortune n: clamp 0..fortuneMax(character.level).
  // lethal: aplica wound 2 y, si wounds previas ≥ 2, marca run.outcome = { kind: 'death' }.
  // Tras aplicar todos, si run.wounds === 3 y no hay outcome → run.outcome = { kind: 'defeat' }.
// text.ts
export function hashParagraph(text: string): string;                      // hash32(text).toString(36)
export function resolveText(text: Text, ctx: EvalContext): ResolvedParagraph[];   // string → { text } (narrador); Paragraph → primera variante cuyo when cumple (sin when = siempre); si ninguna cumple, se omite el párrafo
// memory.ts
export function deriveMemory(ctx: EvalContext, sceneId: string, hashes: string[]): GameState;
  // character.flags ∪= `char:met.<npc>` por cada scene.npcs y `char:place.<scene.place>`; run.visited[sceneId] = (prev ?? 0) + 1; seen[sceneId] ∪= hashes
// modifiers.ts
export function rollSources(roll: Roll, ctx: EvalContext): RollSource[];
  // ventaja: cada rasgo (TRAITS[t].tag ∈ roll.tags, origin 'trait', label = nombre), habilidad ('skill'), objeto en run.items con advantageTags ∩ tags ('item'), advantageIf cumple ('scene', label 'Situación').
  // desventaja: Debilidad de clase ∈ tags ('class', label `Debilidad: ${nombre de clase}`), cada condición con tag ∈ tags o 'all' ('condition'), wounds === 1 y 'fisico' ∈ tags ('wound', 'Herido'), wounds === 2 ('wound', 'Malherido'), disadvantageIf ('scene', 'Situación').
  // Si hay al menos una de cada tipo → todas cancelled = true (ventaja y desventaja se anulan; no se acumulan).
export function rollMode(sources: RollSource[]): RollMode;                // sin fuentes → normal; solo ventaja → advantage; solo desventaja → disadvantage; ambas → cancelled
export function buildPreview(roll: Roll, ctx: EvalContext): RollPreview;   // veteranMod = veteranModifier(campaignLabel(campaign.levelRange, character.level)); totalMod = attrs[attr] + DIFFICULTIES[difficulty] + veteranMod; odds/risk/targetLine desde dice.ts
// progression.ts
export type CampaignLabel = 'mortal' | 'exigente' | 'pareja' | 'tranquila' | 'paseo';
export function campaignLabel(levelRange: [number, number], level: number): CampaignLabel;  // level ≤ min-2 → mortal; min-1 → exigente; [min,max] → pareja; ≤ max+2 → tranquila; else paseo
export function veteranModifier(label: CampaignLabel): number;             // tranquila -1, paseo -2, resto 0
export function fortuneMax(level: number): number;                          // level ≥ 5 ? LIMITS.fortuneFromLevel5 : LIMITS.fortuneBase
// resolve.ts
export function getScene(campaign: Campaign, sceneId: string): Scene;      // throw new Error(`Escena desconocida: ${sceneId}`)
export function enter(campaign: Campaign, state: GameState, sceneId: string): GameState;
  // 1) sigue redirect (primera cuyo when cumple) repetidamente; más de LIMITS.maxRedirects saltos → throw; 2) applyEffects(onEnter) de la escena final; 3) resolveText(scene.text) → LogEntry 'scene' con hashes (si kind 'ending', también resuelve ending.epilogue y lo agrega al mismo párrafo array después del texto); 4) run.sceneId = final; recorta run.log a los últimos LIMITS.maxLog; si kind === 'ending' → run.outcome = { kind: 'ending', endingId: scene.ending.id }
export function render(campaign: Campaign, state: GameState): RenderedScene;
  // paragraphs = del último LogEntry 'scene' cuyo sceneId === run.sceneId (si no hay, resolveText en el momento). choices: requires falla → lockedHint ? visible=true,enabled=false : visible=false; badge: { class } → CLASSES[x].name; { trait } → TRAITS[x].name; { skill } → SKILLS[x].name; { item } → nombre del objeto (campaign.items ∪ world); { met } | { knows } | { endingSeen } | { flag: 'char:…' } → 'Recuerdo'; all/any → badge del primer hijo que dé badge. preview = buildPreview si roll. leadsToLethal = choice.outcome?.next apunta a escena con lethal. alreadySeen = choice.outcome?.next tiene hashes en seen. portraitNpc = speaker del último párrafo con speaker; si no, scene.npcs?.[0]. ending = { id, title: campaign.endings[id].title, epilogue: resolveText(scene.ending.epilogue) } si kind 'ending'.
export function choose(campaign: Campaign, state: GameState, choiceId: string): GameState;
  // solo opciones con outcome (sin roll; si tiene roll → throw). Orden: deriveMemory(escena actual, hashes del log) → log 'choice' → applyEffects(outcome.effects) → log 'outcome' si outcome.text → si run.outcome (defeat/death) devuelve sin entrar; si no enter(outcome.next)
export function beginRoll(campaign: Campaign, state: GameState, choiceId: string): PendingRoll;
  // preview = buildPreview; count = 3 si mode es advantage|disadvantage, si no 2; dice = rollDice(run.rngSeed, run.sceneId, choiceId, run.visited[run.sceneId] ?? 0, 0, count); kept = keepDice; total = suma de kept + totalMod; band = classify; rerolls = []; powerUsed = false; canReroll = run.fortune > 0; canUsePower según usePower. NO toca state.
export function rerollDie(campaign: Campaign, state: GameState, pending: PendingRoll, dieIndex: number): PendingRoll;
  // si !canReroll → throw. dice[dieIndex] = rollDice(seed, sceneId, choiceId, visits, pending.rerolls.length + 1, 1)[0]; rerolls = [...rerolls, dieIndex]; recalcula kept/total/band; canReroll = run.fortune - rerolls.length > 0; band tras power se recalcula (si powerUsed y nueva band ∈ {failure,fumble} → partial)
export function usePower(campaign: Campaign, state: GameState, pending: PendingRoll): PendingRoll;
  // canUsePower = !run.powerUsed && !pending.powerUsed && band ∈ {failure, fumble} && scope aplica (tags: intersección con roll.tags no vacía; any: siempre; sheet: nunca). Resultado: band = 'partial', powerUsed = true, canUsePower = false
export function usePlegaria(campaign: Campaign, state: GameState): GameState;  // clase clerigo y !run.powerUsed: heal 1, conditions = [], powerUsed = true; si no aplica → devuelve state sin cambios
export function restorePending(campaign: Campaign, state: GameState): PendingRoll | null;  // desde run.pending: beginRoll + rerollDie por cada índice en orden + usePower si powerUsed
export function commitRoll(campaign: Campaign, state: GameState, pending: PendingRoll): GameState;
  // deriveMemory → log 'choice' → log 'roll' (fortuneSpent = rerolls.length) → outcome por band (crit: outcomes.crit ?? outcomes.success; fumble: outcomes.fumble ?? outcomes.failure; resto directo) → applyEffects(outcome.effects) → si band === 'crit' fortune + 1 (clamp) → si band === 'fumble' y no hay outcomes.fumble: addCondition FUMBLE_DEFAULT_CONDITION → fortune -= rerolls.length → si pending.powerUsed: run.powerUsed = true y si clase mago addCondition 'agotado' → log 'outcome' si outcome.text → run.pending = undefined → si run.outcome devuelve; si no enter(outcome.next)
export function endRun(campaign: Campaign, state: GameState): { world: WorldState; character: Character; summary: EndSummary };
  // ending: character.flags = (flags sin `char:<campaña>.*`) ∪ (stagedFlags que empiezan con `char:<campaña>.`); world.flags ídem con `world:<campaña>.`; campaignLog[campaña]: runs+1, wins+1, endings ∪ id, milestones ∪ run.milestones, canonEnding = id; canonFlags = staged aplicados.
  // defeat: runs+1, milestones ∪ run.milestones; discardedFlags = stagedFlags. death: como defeat + character.dead = { campaign, scene: run.sceneId }, world.fallen.push({ name, classId, level, campaign, scene }), world.flags ∪ `world:caido.<campaña>`. En todos: character.run = null.
```

### G. `src/state/store.ts`

```ts
export interface Prefs { cps: number; showOdds: boolean; fontScale: 1 | 1.25 | 1.5; reducedMotion: 'auto' | 'on' }
export type Screen = 'inicio' | 'cargando' | 'escena' | 'fin' | 'error';
export interface PersistedSlice { characters: Character[]; activeCharacterId: string | null; world: WorldState; seen: Record<string, SeenMap>; prefs: Prefs }
export interface UiSlice { screen: Screen; campaign: Campaign | null; pending: PendingRoll | null; error: string | null; endSummary: EndSummary | null }
export interface Actions {
  createCharacter(input: { name: string; classId: ClassId; portrait: string; traits: TraitId[]; attrs: Record<Attr, number> }): string; // devuelve id (crypto.randomUUID()); nivel 1, xp 0; lo activa
  createTestCharacter(): string;            // Fase A: 'Prueba', mago nivel 3, attrs saber 2 / astucia 1 / presencia 1 / vigor 0, rasgos aprendiz_de_escriba + cazador_furtivo, portrait 'mago_01'
  startRun(campaignId: string): Promise<void>;   // screen 'cargando' → CAMPAIGNS[id].load() → run nuevo (contentVersion, fortune = fortuneMax(level), rngSeed = newSeed(...), wounds 0, etc.) → enter(start) → 'escena'; catch → ui.error, screen 'error'
  continueRun(): Promise<void>;             // carga la campaña de character.run.campaignId, ui.pending = restorePending → 'escena'
  choose(choiceId: string): void;           // engine.choose → writeGameState → si run.outcome → 'fin'
  beginRoll(choiceId: string): void;        // ui.pending = engine.beginRoll; run.pending = { choiceId, rerolls: [], powerUsed: false }
  rerollDie(dieIndex: number): void;        // actualiza ui.pending y run.pending.rerolls
  usePower(): void;                         // actualiza ui.pending y run.pending.powerUsed
  commitRoll(): void;                       // engine.commitRoll(ui.pending) → ui.pending = null → si run.outcome → 'fin'
  finishRun(): void;                        // desde 'fin': endRun → escribe world/character, ui.endSummary → screen 'inicio'
  abandonRun(): void;                       // run.outcome = { kind: 'defeat' } → finishRun
  retry(): void;                            // desde 'error': si hay run → continueRun, si no → 'inicio'
  setPrefs(p: Partial<Prefs>): void;
}
export type Store = PersistedSlice & { ui: UiSlice } & Actions;
export const useStore: UseBoundStore<StoreApi<Store>>;
// persist: name 'juegorol', version 1, partialize = todo menos `ui` y las acciones, storage = localStorage envuelto en try/catch (createJSONStorage), migrate = (s, v) => MIGRATIONS.slice(v).reduce(...). Prefs por defecto: cps 40, showOdds true, fontScale 1, reducedMotion 'auto'.
// selectors.ts: selectGameState(s: Store): GameState | null (null si no hay personaje activo o no tiene run); writeGameState(s: Store, gs: GameState): Partial<PersistedSlice> (world, characters con el personaje reemplazado, seen con seen[gs.run.campaignId] = gs.seen).
```

### H. Registro de campañas `src/content/campaigns/index.ts` y `src/content/world/index.ts`

```ts
export interface CampaignEntry { meta: CampaignMeta; load: () => Promise<Campaign> }
export const CAMPAIGNS: Record<string, CampaignEntry>;   // { prueba: { meta: pruebaMeta, load: () => import('./prueba/campaign').then(m => m.campaign) } }
export function listCampaigns(includeHidden: boolean): CampaignMeta[];
// world/index.ts: export const WORLD: WorldContent = { npcs, places, items, flags }  (flags declara los espacios compartidos con su descripción: 'char:met.*', 'char:place.*', 'char:origen.*', 'char:leyenda', 'world:caido.*')
```

### I. Campaña de humo `prueba` (Fase A; `lintProfile: 'smoke'`, `hidden: true`, `levelRange: [3, 5]`, `durationMin: [5, 10]`, `lethalScenes: 1`, `contentVersion: 1`)

Diez escenas con texto corto real en español (2 a 4 párrafos, sin placeholders), ids con prefijo `p_`:
- `p_umbral` (kind hub, start): párrafo con variante `{ visited: 'p_umbral', min: 1 }` ("otra vez"), párrafo con variante `{ knows: 'torre_abandonada' }` en narrador; onEnter `{ milestone: 'entrar_a_la_torre' }`; redirect `{ when: { flag: 'run:centinela_vencido' }, to: 'p_escalera' }`. 4 opciones: `leer_inscripcion` (roll saber normal, tags ['saber'] → success da `{ give: 'llave_de_hierro' }` + `{ set: 'run:tiene_pista' }`, next p_biblioteca; partial next p_biblioteca con `{ addCondition: 'asustado' }`; failure next p_biblioteca con `{ clock: 'pelea', delta: 0 }`), `forzar_puerta` (roll vigor dificil, tags ['fisico'] → mago con desventaja; success p_biblioteca, partial p_biblioteca + wound 1, failure p_patio + wound 1), `rodear_patio` (outcome next p_patio), `descansar_capilla` (outcome next p_capilla).
- `p_biblioteca` (normal): PNJ `centinela` habla (párrafo con speaker); 4 opciones: `hablar` (roll presencia normal ['social'] → success set `run:centinela_vencido` next p_escalera; partial next p_patio; failure next p_patio + addCondition 'perseguido'), `esconderse` (roll astucia normal ['sigilo'] → success next p_escalera; partial next p_escalera + empapado; failure next p_patio), `volver` (outcome next p_umbral), `capilla` (outcome next p_capilla).
- `p_patio` (encounter, ronda 1, npcs ['centinela']): 4 opciones con ≥2 atributos: `golpear` (vigor normal ['fisico']: success clock pelea +1 next p_patio_2; partial clock +1 + wound 1 next p_patio_2; failure wound 1 next p_patio_2), `engañar` (astucia normal ['engano']: success clock +1 next p_patio_2; partial clock +1 + asustado next p_patio_2; failure wound 1 next p_patio_2), `rendirse` (outcome sin tirada: next p_capilla con `{ addCondition: 'asustado' }`), `huir` (roll astucia normal ['huida']: success next p_capilla; partial next p_capilla + wound 1; failure wound 1 next p_patio_2).
- `p_patio_2` (encounter, ronda 2): redirect `{ when: { clock: 'pelea', gte: 2 }, to: 'p_victoria' }`; 4 opciones: `rematar` (requires `{ clock: 'pelea', gte: 1 }`, lockedHint 'Todavía no lo tenés contra las cuerdas'; vigor normal ['fisico']: success clock +1 next p_patio_2; partial clock +1 + wound 1 next p_patio_2; failure wound 1 next p_patio_2), `llave` (requires `{ item: 'llave_de_hierro' }`, lockedHint 'Necesitás algo con qué trabar la puerta'; outcome: set `run:centinela_vencido`, next p_escalera), `rendirse` (outcome next p_capilla + asustado), `huir` (astucia normal ['huida']: success next p_capilla; partial next p_capilla + wound 1; failure wound 1 next p_patio_2). Rondas posteriores: la opción con requires sobre reloj cumple la regla 6.
- `p_victoria` (normal): onEnter `{ set: 'run:centinela_vencido' }`; 4 opciones sin tirada: `subir` (next p_escalera), `descansar` (next p_capilla), `registrar` (next p_biblioteca), `salir` (next p_fin_huida).
- `p_capilla` (rest): onEnter `[{ heal: 1 }, { removeCondition: 'all' }]`; 4 opciones sin tirada: `volver_umbral` (p_umbral), `ir_biblioteca` (p_biblioteca), `subir` (requires `{ flag: 'run:centinela_vencido' }`, lockedHint 'El centinela sigue en el patio'; next p_escalera), `salir` (p_fin_huida).
- `p_escalera` (normal): anuncia la escena mortal en el texto ("Un fallo acá te puede matar"); 4 opciones: `bajar_cripta` (outcome sin tirada, next p_cripta), `volver` (next p_capilla), `salir` (next p_fin_huida), `estudiar_runas` (requires `{ trait: 'aprendiz_de_escriba' }`, lockedHint ausente = oculta; outcome set `char:prueba.vio_la_cripta`, next p_cripta).
- `p_cripta` (normal, lethal: true): 4 opciones: `cruzar` (vigor muy_dificil ['fisico']: success next p_fin_tesoro; partial wound 1 next p_fin_tesoro; failure `{ lethal: true }` next p_fin_huida), `conjurar` (saber dificil ['magia']: success next p_fin_tesoro; partial addCondition agotado next p_fin_tesoro; failure `{ lethal: true }` next p_fin_huida), `tantear` (astucia normal ['percepcion'], sin lethal: success next p_fin_tesoro; partial wound 1 next p_fin_tesoro; failure wound 1 next p_escalera), `retroceder` (outcome sin tirada next p_escalera).
- `p_fin_tesoro` (ending, ending { id: 'fin_tesoro', epilogue }), `p_fin_huida` (ending { id: 'fin_huida', epilogue }).
Lugar `torre_abandonada` (variants: noche, cripta); PNJ `centinela`; objeto `llave_de_hierro` (advantageTags ['sigilo']); flags declarados: `run:tiene_pista`, `run:centinela_vencido`, `char:prueba.vio_la_cripta`; reloj `pelea` max 2; hito `entrar_a_la_torre`; endings `fin_tesoro` ('El tesoro de la torre'), `fin_huida` ('Con vida').

### J. Validador `tools/lib/validate`

```ts
export interface ValidationIssue { level: 'error' | 'warning'; rule: string; sceneId?: string; message: string }
export interface ValidateContext { world: WorldContent; profile: 'smoke' | 'release' }
export type Rule = (campaign: Campaign, ctx: ValidateContext) => ValidationIssue[];
export function validateCampaign(campaign: Campaign, ctx: ValidateContext): ValidationIssue[];   // CampaignSchema.safeParse primero; si falla, devuelve un único error rule 'schema' con el mensaje de zod y no corre reglas
export const RULES: Record<string, Rule>;   // claves: r01_targets, r02_reach, r03_choices, r04_choice_shape, r05_lethal, r06_encounter, r07_ids, r08_memory_frame, r09_extreme, r10_todo
// reach.ts
export function reachableScenes(campaign: Campaign, classId: ClassId | null): Set<string>;
  // BFS optimista desde start: toda condición se considera satisfacible salvo { class: X } que se evalúa contra classId (con null, también true); `not`/`all`/`any` se evalúan recursivamente con esa semántica. Aristas: redirect.to, choice.outcome.next, y los 5 outcomes posibles de choice.roll.
```
Reglas ERROR (spec sección 3), mensajes en español:
- r01_targets: todo `next`, `to` y `start` existe en scenes; ciclos de redirect sin `onEnter` con efectos entre medio (detectar ciclo en el grafo de redirects).
- r02_reach: toda escena alcanzable desde start (classId null); todo `ending` (incluidos hidden) alcanzable para cada ClassId.
- r03_choices: escena no-ending: entre LIMITS.minChoices y maxChoices opciones y ≥ 4 sin `requires`; ending: 0 opciones.
- r04_choice_shape: exactamente uno de roll/outcome; roll con success, partial y failure.
- r05_lethal: `{ lethal: true }` solo en outcomes de roll de escenas lethal; a una escena lethal solo se entra por `outcome.next` de opciones SIN roll (ningún roll outcome ni redirect apunta a ella); tiene ≥ 1 opción sin lethal en ninguno de sus outcomes; tiene ≥ 1 opción con roll cuyos tags no incluyen 'fisico'; `meta.lethalScenes` === cantidad de escenas lethal.
- r06_encounter: kind encounter: ≥ 2 atributos distintos entre sus rolls, ≥ 1 opción sin roll, ≥ 1 roll con tag 'huida'; si la escena es alcanzada desde otra encounter (ronda posterior): tiene ≥ 1 opción con `requires` que usa clock, wounds o flag `run:`, o tiene redirect.
- r07_ids: todo flag usado (set/clear/flag) está en campaign.flags o world.flags (los espacios compartidos `char:met.*`, `char:place.*`, `char:origen.*`, `world:caido.*`, `char:leyenda` se aceptan por prefijo); npcs/places/items usados existen en campaign ∪ world; milestone/clock/endings/condition/tag/trait/skill/class existen; prefijos: flags `char:`/`world:` de la campaña llevan `<campaignId>.` salvo los compartidos; ningún id de world redefinido en la campaña; `relic` solo en world.items; todo `speaker` está en `scene.npcs`.
- r08_memory_frame: párrafo con `speaker` que sea PNJ de la campaña (no de world) no puede tener variantes con `met`, `knows`, `endingSeen` ni `flag: 'char:<campaignId>.…'` (recursivo en all/any/not); toda Paragraph termina en una variante sin `when`.
- r09_extreme: difficulty 'extrema' prohibida si levelRange[0] < 3.
- r10_todo: en profile 'release', ningún texto (text, variants, labels, epilogue, outcome.text) contiene 'TODO'.

CLI `tools/validate.ts`: `tsx tools/validate.ts [--profile smoke|release] [--campaign id]`; carga `CAMPAIGNS`, hace `await load()` de cada una (o la indicada), usa `meta.lintProfile` salvo `--profile`, imprime `campaña › escena › [regla] mensaje` por issue, resume `N errores, M avisos`, `process.exit(1)` si hay errores.

### K. UI Fase A (mínima, placeholders grises)

- `Placeholder.tsx`: caja gris con etiqueta de texto (props `label`, `aspect: '16:9' | '3:4'`).
- `EscenaScreen`: grid de dos columnas (izquierda 60 % con `Placeholder` del fondo `${place}.${variant}` y `Placeholder` del retrato si `portraitNpc`; derecha 40 % con la columna de texto). `StatusBar` arriba: nombre del lugar, Heridas (3 marcas, `WOUND_LABELS[wounds]`), Fortuna (gemas: `fortune`/`fortuneMax`), condiciones por nombre, botón "Abandonar" (con `window.confirm`). `TextColumn` renderiza `run.log` completo (scene: párrafos con speaker en negrita; choice: "› label"; roll: dados, total y banda; outcome: párrafos) y hace scroll al final con `useEffect`. `OptionList` al pie: filas numeradas 1-9; cada fila: label, badge entre corchetes, chip `${ATTR_NAMES[attr]} ${totalMod >= 0 ? '+' : ''}${totalMod} · ${DIFFICULTY_NAMES[difficulty]}`, chips de fuentes (`▲`/`▼` + label; `text-decoration: line-through` si cancelled), etiqueta de riesgo (texto + color por clase CSS), porcentajes `Éxito X % · Con costo Y % · Fallo Z %` si `prefs.showOdds`; bloqueadas: `disabled` y `lockedHint` debajo; `alreadySeen`: marca "· ya elegida"; `leadsToLethal`: icono ☠ y `window.confirm` con texto según wounds (0: "Estás sano: un Fallo te deja Malherido.", 1: "Estás Herido: un Fallo te deja fuera de la campaña.", 2: "Estás Malherido: un Fallo acá te mata."). Teclas 1-9 (listener `keydown` en window) eligen la opción visible y habilitada número N. Al elegir: si tiene preview → `beginRoll`, si no → `choose`.
- `RollPanel` (inline, debajo de las opciones, reemplazándolas mientras hay `ui.pending`): objetivo (`targetLine`), dados como números grandes (los no conservados con opacidad 0,4), total, sello de banda ('¡Crítico!', 'Éxito', 'Con costo', 'Fallo', 'Fallo grave'); botones "Fortuna: repetir dado N" (uno por dado) si `canReroll`, "Usar Poder (nombre)" si `canUsePower`, "Continuar" → `commitRoll`.
- `InicioScreen`: título `S.titulo` ("Crónicas del Vado — prototipo"), botón "Continuar" (si el personaje activo tiene run), botón "Nueva partida de prueba" (`createTestCharacter()` si no hay personaje activo, luego `startRun('prueba')`).
- `FinScreen`: según `run.outcome` del personaje activo antes de `finishRun` (o `ui.endSummary` después): ending → título del final + epílogo (último LogEntry 'scene'); defeat → "Caíste. La campaña se pierde, tu personaje sigue."; death → "Tu personaje ha muerto."; botón "Volver al inicio" → `finishRun()`.
- `CargandoScreen`: texto "Cargando…". `ErrorScreen`: mensaje `ui.error` y botón "Reintentar" → `retry()`.
- Todas las cadenas de UI en `strings.es.ts` (`export const S = { … } as const`).


---

## Tareas

### Tarea 1: Bootstrap del repositorio y deploy de "Hola"

Objetivo: dejar el proyecto "Crónicas del Vado" creado desde cero (Vite + React 19 + TypeScript strict + Vitest), con el alias `@/`, los scripts de `package.json` que usan todas las tareas siguientes, un componente `App` que muestra `<h1>Hola</h1>`, un test de humo que lo verifica, los tokens CSS base y un workflow de GitHub Actions que publica la app en GitHub Pages. Al terminar, la URL de Pages muestra "Hola".

Contexto que necesitás saber: el directorio `C:\Users\Gabriel Agustin\Desktop\Local\JuegoRol` ya es un repositorio git con un único commit de documentación (`docs/`). No hay código. Trabajás en Windows 11 con Node 24 y npm 11; todos los comandos de abajo funcionan tanto en PowerShell como en Git Bash salvo donde se indica una variante por shell. No uses `npm create vite`: creamos los archivos a mano para controlar cada línea.

**Archivos:**
- Crear: `.gitignore`
- Crear: `.gitattributes`
- Crear: `package.json` (los campos `dependencies` y `devDependencies` los completa `npm install`)
- Crear: `package-lock.json` (lo genera `npm install`; se commitea)
- Crear: `tsconfig.json`
- Crear: `tsconfig.node.json`
- Crear: `vite.config.ts`
- Crear: `index.html`
- Crear: `src/main.tsx`
- Crear: `src/app/App.tsx` (versión mínima; la tarea 14 la reemplaza por la que monta `ScreenRouter`)
- Crear: `src/app/tokens.css`
- Crear: `tests/setup.ts`
- Crear: `README.md`
- Crear: `.github/workflows/deploy.yml`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Consume: nada (es la primera tarea).
- Produce:
  - Scripts de `package.json`: `dev`, `build` (= `run-s test:run typecheck build:vite`; la tarea 12 agrega `validate` al principio), `build:vite` (= `vite build`), `preview`, `test` (vitest en watch), `test:run` (`vitest run`), `typecheck` (`tsc --noEmit -p tsconfig.json`), `validate` (`tsx tools/validate.ts`; el archivo lo crea la tarea 12, hasta entonces el script falla si se invoca y eso es esperado).
  - Alias `@/` → `src/` en `vite.config.ts` (`resolve.alias`) y en `tsconfig.json` (`paths`). Vitest lo hereda; `tsx` lo lee de `tsconfig.json`.
  - Vitest configurado con `environment: 'jsdom'`, `setupFiles: ['tests/setup.ts']`, `include: ['tests/**/*.test.{ts,tsx}']` y CSS Modules sin scope en tests (`styles.foo === 'foo'`).
  - `tests/setup.ts`: importa `@testing-library/jest-dom/vitest` (matchers como `toHaveTextContent`) y registra `afterEach(cleanup)` de Testing Library.
  - `src/app/App.tsx`: `export function App(): ReactElement` (versión "Hola").
  - `src/main.tsx`: monta `<App />` dentro de `<StrictMode>` en `#root`; lanza `Error('No se encontró el elemento #root en index.html')` si no existe.
  - `src/app/tokens.css`: variables CSS `--color-fondo`, `--color-superficie`, `--color-superficie-alta`, `--color-borde`, `--color-texto`, `--color-texto-suave`, `--color-acento`, `--color-acento-suave`, `--color-peligro`, `--color-exito`, `--color-aviso`, `--color-seguro`, `--color-arriesgado`, `--color-peligroso`, `--fuente-juego` (serif), `--fuente-ui` (sans), `--fuente-mono`, `--tam-texto-juego`, `--tam-ui`, `--tam-ui-chico`, `--interlineado-juego`, `--esp-1` … `--esp-7`, `--radio`, `--ancho-columna-max`, `--escala-fuente`; más un reset mínimo. La tarea 14 las consume desde sus `*.module.css`.
  - `.github/workflows/deploy.yml`: build y deploy a GitHub Pages con `VITE_BASE=/<repo>/`.

---

#### Ciclo 1: esqueleto del proyecto, dependencias y test de humo de `App`

- [ ] **Paso 1: Verificar el entorno y el estado del repo**

Corré, desde el directorio del proyecto:

```
node -v
npm -v
git status
git log --oneline
```

Esperado: `node -v` imprime `v24.x.x`; `npm -v` imprime `11.x.x`; `git status` dice que el árbol está limpio (o solo muestra archivos de `docs/` sin seguimiento, que no tocamos); `git log --oneline` muestra exactamente un commit (el de docs). Si `node -v` no es 24, instalá Node 24 antes de seguir: el workflow de CI usa Node 24 y el `package-lock.json` debe generarse con el mismo npm.

- [ ] **Paso 2: Crear `.gitignore`**

Creá `.gitignore` en la raíz del proyecto con este contenido completo:

```
# dependencias y salidas de build
node_modules/
dist/
.vite/
*.tsbuildinfo

# registros
npm-debug.log*
*.log

# editores y sistema
.vscode/*
!.vscode/extensions.json
.idea/
.DS_Store
Thumbs.db

# másteres de arte (fase G; se respaldan fuera de git)
art/masters/
```

- [ ] **Paso 3: Crear `.gitattributes`**

Creá `.gitattributes` en la raíz con este contenido completo (git normaliza todos los archivos de texto a LF en el repositorio, aunque el editor de Windows escriba CRLF):

```
* text=auto eol=lf
```

- [ ] **Paso 4: Crear `package.json` sin dependencias**

Creá `package.json` en la raíz con este contenido completo. No escribas versiones de paquetes a mano: las agrega `npm install` en los pasos 5 y 6.

```json
{
  "name": "juegorol",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "description": "Crónicas del Vado: RPG narrativo tipo novela visual, rejugable, en el navegador",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "vite",
    "build": "run-s test:run typecheck build:vite",
    "build:vite": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "validate": "tsx tools/validate.ts"
  }
}
```

Notas sobre los scripts: `run-s` viene de `npm-run-all2` y encadena scripts en serie sin usar `&&`, que PowerShell 5.1 no acepta; `build` corre tests y tipos antes de `vite build`, así un build roto nunca llega a Pages; `validate` apunta a `tools/validate.ts`, que recién existe en la tarea 12 (por eso `build` todavía no lo incluye).

- [ ] **Paso 5: Instalar las dependencias de ejecución**

```
npm install react react-dom zod zustand
```

Esperado: npm agrega `dependencies` a `package.json` con rangos `^` y crea `package-lock.json` y `node_modules/`. Majors esperados: `react` 19, `react-dom` 19, `zod` 4, `zustand` 5. Si `zod` resolviera a un major distinto de 4 o `zustand` a uno distinto de 5, instalá explícitamente `npm install zod@4 zustand@5`: el contrato fija esos majors.

- [ ] **Paso 6: Instalar las dependencias de desarrollo**

```
npm install -D vite @vitejs/plugin-react typescript @types/react @types/react-dom @types/node vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom tsx npm-run-all2
```

Majors esperados: `vite` 8 (el contrato exige 8 o superior), `@vitejs/plugin-react` 5 o superior, `typescript` 5, `@types/react` 19, `@types/react-dom` 19, `@types/node` 24, `vitest` 4 (el contrato acepta 3 o superior), `jsdom` 27 o superior, `@testing-library/react` 16, `@testing-library/dom` 10 (es dependencia par de `@testing-library/react` 16 y hay que instalarla explícitamente), `@testing-library/jest-dom` 6, `tsx` 4, `npm-run-all2` 8. Verificá con:

```
npm ls --depth=0
```

Esperado: la lista muestra los 18 paquetes sin líneas `UNMET DEPENDENCY` ni `invalid`. Si `vite` resolvió a un major menor que 8, corré `npm install -D vite@latest` y volvé a verificar.

- [ ] **Paso 7: Revisar el `package.json` resultante**

Abrí `package.json`. Debe verse así (los números exactos después de `^` los decidió npm y pueden diferir; lo que importa es el major de cada uno, indicado en los pasos 5 y 6):

```json
{
  "name": "juegorol",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "description": "Crónicas del Vado: RPG narrativo tipo novela visual, rejugable, en el navegador",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "vite",
    "build": "run-s test:run typecheck build:vite",
    "build:vite": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "validate": "tsx tools/validate.ts"
  },
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "zod": "^4.1.0",
    "zustand": "^5.0.8"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.8.0",
    "@testing-library/react": "^16.3.0",
    "@types/node": "^24.5.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^5.0.0",
    "jsdom": "^27.0.0",
    "npm-run-all2": "^8.0.4",
    "tsx": "^4.20.0",
    "typescript": "^5.9.0",
    "vite": "^8.0.0",
    "vitest": "^4.0.0"
  }
}
```

No edites las versiones a mano. Si el orden de las claves difiere, no importa.

- [ ] **Paso 8: Crear `tsconfig.json`**

Creá `tsconfig.json` en la raíz con este contenido completo. Incluye `src`, `tests` y `tools` (la carpeta `tools` todavía no existe; TypeScript no se queja de un directorio de `include` vacío mientras haya algún archivo que compilar).

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite/client", "node"]
  },
  "include": ["src", "tests", "tools"]
}
```

Qué hace cada opción que importa para las tareas siguientes: `strict` activa todas las comprobaciones estrictas; `verbatimModuleSyntax` obliga a escribir `import type { X }` o `import { type X }` para tipos (el contrato ya lo hace así); `paths` habilita `@/…`; `types` trae `import.meta.env` (Vite) y `process` (Node, para `tools/`); `jsx: react-jsx` evita importar React en cada archivo con JSX.

- [ ] **Paso 9: Crear `tsconfig.node.json`**

Creá `tsconfig.node.json` en la raíz con este contenido completo. Solo cubre `vite.config.ts`, que corre en Node y no en el navegador; el editor lo usa para tipar ese archivo (el script `typecheck` no lo compila: Vite lo compila al arrancar).

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Paso 10: Crear `vite.config.ts`**

Creá `vite.config.ts` en la raíz con este contenido completo:

```ts
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
```

`defineConfig` de `vitest/config` acepta toda la configuración de Vite más la clave `test`, así un solo archivo sirve para `vite`, `vite build` y `vitest`.

- [ ] **Paso 11: Crear `tests/setup.ts`**

Creá `tests/setup.ts` con este contenido completo:

```ts
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
```

- [ ] **Paso 12: Escribir el test que falla**

Creá `tests/smoke.test.ts` con este contenido completo. Es un archivo `.ts` (no `.tsx`), por eso se usa `createElement(App)` en vez de JSX:

```ts
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
```

- [ ] **Paso 13: Correr el test y verificar que falla**

```
npx vitest run tests/smoke.test.ts
```

Esperado: el archivo falla al cargar con un error de resolución, porque `src/app/App.tsx` no existe todavía:

```
FAIL  tests/smoke.test.ts [ tests/smoke.test.ts ]
Error: Failed to resolve import "@/app/App" from "tests/smoke.test.ts". Does the file exist?
```

Si en cambio ves un error de configuración (por ejemplo `Cannot find package 'jsdom'` o `Cannot find module '@testing-library/jest-dom/vitest'`), volvé al paso 6: falta una dependencia.

- [ ] **Paso 14: Implementación mínima de `App`**

Creá `src/app/App.tsx` con este contenido completo:

```tsx
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
```

Con React 19 el namespace global `JSX` ya no existe: el tipo de retorno correcto es `ReactElement` (o `React.JSX.Element`), nunca `JSX.Element` a secas.

- [ ] **Paso 15: Correr el test y verificar que pasa**

```
npx vitest run tests/smoke.test.ts
```

Esperado:

```
✓ tests/smoke.test.ts (1 test)
Test Files  1 passed (1)
     Tests  1 passed (1)
```

- [ ] **Paso 16: Commit**

```bash
git add .gitignore .gitattributes package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts tests/setup.ts tests/smoke.test.ts src/app/App.tsx
git commit -m "chore: bootstrap de Vite, React 19, TypeScript strict y Vitest con App de humo" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Antes del commit, `git status` no debe listar `node_modules/` ni `dist/`: si aparecen, revisá el `.gitignore` del paso 2.

---

#### Ciclo 2: montaje en el navegador (`index.html`, `main.tsx`, `tokens.css`)

- [ ] **Paso 17: Escribir el test que falla**

Reemplazá `tests/smoke.test.ts` entero por este contenido. Se agrega un segundo `describe` que simula lo que hace el navegador: crea `<div id="root">`, importa `src/main.tsx` y espera encontrar el `<h1>` dentro de ese `div`. `act` de React garantiza que el render de `createRoot` termine antes de la aserción.

```ts
import { describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import { App } from '@/app/App';

describe('App (humo)', () => {
  it('muestra un encabezado de nivel 1 con el texto "Hola"', () => {
    render(createElement(App));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Hola');
  });
});

describe('main.tsx (humo)', () => {
  it('monta la aplicación dentro de #root', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    await act(async () => {
      await import('@/main');
    });

    expect(within(root).getByRole('heading', { level: 1 })).toHaveTextContent('Hola');
    root.remove();
  });
});
```

- [ ] **Paso 18: Correr el test y verificar que falla**

```
npx vitest run tests/smoke.test.ts
```

Esperado: el primer test pasa y el segundo falla porque `src/main.tsx` no existe:

```
✓ App (humo) > muestra un encabezado de nivel 1 con el texto "Hola"
× main.tsx (humo) > monta la aplicación dentro de #root
Error: Failed to load url @/main (resolved id: @/main) in tests/smoke.test.ts. Does the file exist?
Test Files  1 failed (1)
     Tests  1 failed | 1 passed (2)
```

- [ ] **Paso 19: Crear `src/app/tokens.css`**

Creá `src/app/tokens.css` con este contenido completo. Tema oscuro único (no hay modo claro en la v1); fuente serif para el texto de juego, sans para la interfaz; nombres de variables en español sin acentos.

```css
/* Tokens de diseño de Crónicas del Vado.
   Tema oscuro único. Todo componente toma colores, fuentes y espaciados de acá;
   ningún *.module.css escribe un color literal. */

:root {
  color-scheme: dark;

  /* Colores de base */
  --color-fondo: #14120f;
  --color-superficie: #201c17;
  --color-superficie-alta: #2b2620;
  --color-borde: #3d362e;
  --color-texto: #e8e0d1;
  --color-texto-suave: #a89f8e;
  --color-acento: #c9a24a;
  --color-acento-suave: #8a6d2b;

  /* Colores semánticos */
  --color-peligro: #b5443a;
  --color-exito: #5f9e5a;
  --color-aviso: #d19a3a;

  /* Etiquetas de riesgo de una tirada (Seguro / Arriesgado / Peligroso) */
  --color-seguro: #5f9e5a;
  --color-arriesgado: #d19a3a;
  --color-peligroso: #b5443a;

  /* Tipografía */
  --fuente-juego: Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif;
  --fuente-ui: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  --fuente-mono: ui-monospace, Consolas, 'Courier New', monospace;
  --tam-texto-juego: 19px;
  --tam-ui: 15px;
  --tam-ui-chico: 13px;
  --interlineado-juego: 1.6;
  --escala-fuente: 1; /* prefs.fontScale: 1, 1.25 o 1.5 (la UI lo escribe en <html>) */

  /* Espaciado y forma */
  --esp-1: 4px;
  --esp-2: 8px;
  --esp-3: 12px;
  --esp-4: 16px;
  --esp-5: 24px;
  --esp-6: 32px;
  --esp-7: 48px;
  --radio: 6px;
  --ancho-columna-max: 720px;
}

/* Reset mínimo */
*,
*::before,
*::after {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

body {
  background: var(--color-fondo);
  color: var(--color-texto);
  font-family: var(--fuente-ui);
  font-size: calc(var(--tam-ui) * var(--escala-fuente));
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

h1,
h2,
h3 {
  margin: 0;
  font-family: var(--fuente-juego);
  font-weight: 600;
}

p {
  margin: 0;
}

button {
  font: inherit;
  color: inherit;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

:focus-visible {
  outline: 2px solid var(--color-acento);
  outline-offset: 2px;
}
```

- [ ] **Paso 20: Crear `index.html`**

Creá `index.html` en la raíz con este contenido completo. Vite lo usa como punto de entrada y reescribe la ruta del script según `base`:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="color-scheme" content="dark" />
    <meta name="description" content="Crónicas del Vado: RPG narrativo tipo novela visual, rejugable, en el navegador." />
    <title>Crónicas del Vado</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Paso 21: Crear `src/main.tsx`**

Creá `src/main.tsx` con este contenido completo:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import '@/app/tokens.css';

const root = document.getElementById('root');
if (root === null) {
  throw new Error('No se encontró el elemento #root en index.html');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Paso 22: Correr el test y verificar que pasa**

```
npx vitest run tests/smoke.test.ts
```

Esperado:

```
✓ tests/smoke.test.ts (2 tests)
Test Files  1 passed (1)
     Tests  2 passed (2)
```

No debe aparecer ningún aviso de React sobre `act(...)`: el `await act(async () => …)` del test lo evita. Si aparece `Warning: An update to App inside a test was not wrapped in act(...)`, revisá que el `import('@/main')` esté dentro del callback de `act`.

- [ ] **Paso 23: Verificar tipos, build y vista previa en el navegador**

```
npm run typecheck
npm run build
```

Esperado de `typecheck`: termina sin salida y con código 0. Esperado de `build`: corre `test:run` (2 tests en verde), luego `typecheck`, luego `vite build`, que imprime algo como:

```
dist/index.html                  0.5x kB
dist/assets/index-XXXXXXXX.css   1.xx kB
dist/assets/index-XXXXXXXX.js  19x.xx kB
✓ built in NNNms
```

Después:

```
npm run preview
```

Abrí en el navegador la URL que imprime (`http://localhost:4173/`). Debe verse "Hola" en serif clara sobre fondo oscuro. Cerrá el servidor con `Ctrl+C`.

Comprobación de `VITE_BASE` (la usa el workflow de Pages). En PowerShell:

```
$env:VITE_BASE = '/JuegoRol/'
npm run build:vite
Remove-Item Env:VITE_BASE
```

En Git Bash:

```
MSYS_NO_PATHCONV=1 VITE_BASE=/JuegoRol/ npm run build:vite
```

`MSYS_NO_PATHCONV=1` es obligatorio en Git Bash: MSYS2 convierte los valores de variables que parecen rutas POSIX al lanzar un ejecutable nativo (`node.exe`), y sin esa variable `/JuegoRol/` le llegaría a Vite como `C:/Program Files/Git/JuegoRol/`, con lo que `dist/index.html` tendría un `base` incorrecto. Alternativa equivalente: `MSYS2_ENV_CONV_EXCL=VITE_BASE VITE_BASE=/JuegoRol/ npm run build:vite`. El workflow de GitHub Actions no necesita nada de esto (corre en Ubuntu).

Esperado en ambos shells: `dist/index.html` contiene `src="/JuegoRol/assets/index-` (y no `src="/assets/` ni `src="C:/Program Files/Git/JuegoRol/assets/`). Podés verlo con `Get-Content dist/index.html` (PowerShell) o `cat dist/index.html` (Git Bash). `dist/` está en `.gitignore`, así que no ensucia el repo.

- [ ] **Paso 24: Commit**

```bash
git add index.html src/main.tsx src/app/tokens.css tests/smoke.test.ts
git commit -m "feat: index.html, main.tsx y tokens CSS base; la app muestra Hola en el navegador" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: workflow de GitHub Pages y README

Este ciclo no tiene un test de Vitest (no hay lógica que testear); la verificación es el build local, la revisión de atributos de git y, al final, la ejecución del workflow en GitHub.

- [ ] **Paso 25: Crear `.github/workflows/deploy.yml`**

Creá `.github/workflows/deploy.yml` con este contenido completo. Publica en cada push a `main` y a pedido (`workflow_dispatch`). `VITE_BASE` se arma con el nombre del repositorio, que es la ruta bajo la que Pages sirve un repo de proyecto (`https://<usuario>.github.io/<repo>/`).

```yaml
name: Deploy a GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Node 24
        uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm

      - name: Instalar dependencias
        run: npm ci

      - name: Tests, tipos y build
        run: npm run build
        env:
          VITE_BASE: /${{ github.event.repository.name }}/

      - name: Configurar Pages
        uses: actions/configure-pages@v5

      - name: Subir dist
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Publicar
        id: deployment
        uses: actions/deploy-pages@v4
```

Si el repositorio se llamara `<usuario>.github.io` (página de usuario, no de proyecto), la línea de `VITE_BASE` debería ser `VITE_BASE: /`. Para este proyecto (`JuegoRol`) queda como está.

- [ ] **Paso 26: Crear `README.md`**

Creá `README.md` en la raíz con este contenido completo:

```markdown
# Crónicas del Vado

RPG narrativo tipo novela visual, de fantasía medieval, que corre en el navegador sin servidor. Un personaje persistente atraviesa campañas cortas, ramificadas y resueltas con dados (2d6 con éxito parcial); el mundo lo recuerda dentro de la partida, entre partidas y entre campañas.

El diseño aprobado está en `docs/superpowers/specs/2026-09-10-juegorol-design.md`.

## Requisitos

- Node 24 y npm 11.
- Windows 11 con PowerShell o Git Bash (los scripts no dependen del shell).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm install` | instala las dependencias |
| `npm run dev` | servidor de desarrollo con recarga en caliente |
| `npm test` | Vitest en modo watch |
| `npm run test:run` | corre todos los tests una vez |
| `npm run typecheck` | `tsc --noEmit` sobre `src`, `tests` y `tools` |
| `npm run validate` | valida el contenido de las campañas (`tools/validate.ts`) |
| `npm run build` | tests + tipos + `vite build` a `dist/` |
| `npm run preview` | sirve `dist/` en local |

## Estructura

- `src/app/` arranque de la app y tokens CSS.
- `src/engine/` motor puro de reglas (sin React ni store).
- `src/content/` catálogo, esquema y campañas (solo datos).
- `src/state/` store de Zustand con persistencia en `localStorage`.
- `src/ui/` pantallas y componentes.
- `tools/` scripts de Node (validador de contenido).
- `tests/` tests de Vitest (`tests/**/*.test.{ts,tsx}`).

Alias de import: `@/` apunta a `src/`.

## Deploy

Cada push a `main` ejecuta `.github/workflows/deploy.yml`: instala, corre `npm run build` con `VITE_BASE=/<repo>/` y publica `dist/` en GitHub Pages. Requisito único por repositorio: en *Settings → Pages → Build and deployment → Source* elegir **GitHub Actions**.

## Guardado

La partida se guarda en `localStorage` bajo la clave `juegorol` en cada cambio de estado. Safari e iOS borran ese almacenamiento tras 7 días sin visitas; en esos navegadores conviene exportar la partida (opción disponible en fases posteriores).
```

- [ ] **Paso 27: Verificar atributos de git y nombre de la rama**

```
git check-attr text eol -- src/main.tsx
git branch --show-current
```

Esperado de la primera línea: `src/main.tsx: text: auto` y `src/main.tsx: eol: lf`. Esperado de la segunda: `main`. Si imprime `master` u otro nombre, renombrá la rama (el workflow escucha `main`):

```
git branch -M main
```

Por último confirmá que el build sigue en verde con el README y el workflow agregados (no cambian nada del código, pero es la comprobación de cierre del ciclo):

```
npm run build
```

Esperado: 2 tests en verde, typecheck sin errores, `vite build` termina con `✓ built`.

- [ ] **Paso 28: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "chore: workflow de deploy a GitHub Pages y README" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Paso 29: Publicar y verificar el deploy**

Primero comprobá si el repo ya tiene remoto:

```
git remote -v
```

Si no imprime nada, creá un repositorio vacío en GitHub llamado `JuegoRol` (sin README ni `.gitignore` iniciales) y conectalo:

```
git remote add origin https://github.com/<usuario>/JuegoRol.git
```

Después, en el sitio de GitHub, en *Settings → Pages → Build and deployment → Source*, elegí **GitHub Actions** (sin este paso el job `deploy` falla con un error de permisos de Pages). Luego:

```
git push -u origin main
```

Abrí la pestaña *Actions* del repositorio: el workflow "Deploy a GitHub Pages" debe terminar en verde en ambos jobs (`build` y `deploy`). El job `deploy` muestra la URL, del estilo `https://<usuario>.github.io/JuegoRol/`. Abrila: debe mostrar "Hola" en serif clara sobre fondo oscuro, sin errores en la consola del navegador (F12 → Console). Si la página carga en blanco y la consola dice que no encuentra `/assets/index-….js`, el `base` es incorrecto: revisá que el paso `Tests, tipos y build` del workflow tenga el `env: VITE_BASE` y que el nombre del repo coincida con la ruta.

---

#### Verificación de la tarea

- [ ] **Paso 30: Verificación final**

Desde la raíz del proyecto:

```
npx vitest run
npx tsc --noEmit -p tsconfig.json
npm run build
git status
git log --oneline
```

Esperado: `vitest run` reporta `Test Files 1 passed (1)` y `Tests 2 passed (2)`; `tsc` no imprime nada y sale con 0; `npm run build` termina con `✓ built`; `git status` muestra el árbol limpio; `git log --oneline` muestra 4 commits (docs + los 3 de esta tarea).

Criterio de aceptación: la URL de GitHub Pages del repositorio muestra "Hola", y en local `npm run build` pasa en verde con el alias `@/` funcionando en Vite, Vitest y `tsc`, de modo que la tarea 2 puede crear `src/content/catalog.ts` y su test sin tocar ninguna configuración.

---

### Tarea 2: Catálogo del sistema (catalog.ts)

**Qué es esto (contexto para quien no conoce el dominio).** "Crónicas del Vado" es un RPG narrativo: el jugador tiene un personaje con una *clase* (Guerrero, Explorador, Mago, Clérigo), cuatro *atributos* numéricos (Vigor, Astucia, Saber, Presencia), dos *rasgos de origen* y, con el tiempo, *habilidades*. Cada acción arriesgada es una tirada de dados etiquetada con *tags* (`fisico`, `sigilo`, `social`, …). Un rasgo o una habilidad dan ventaja en un tag; cada clase tiene una *Debilidad* (desventaja permanente en un tag) y un *Poder* de un uso por partida. Las *condiciones* (Envenenado, Asustado, …) son penalizaciones temporales, también etiquetadas por tag. El **catálogo** es el archivo que declara todas esas constantes en un solo lugar, de forma que el resto del código derive sus tipos de ahí (`type TraitId = keyof typeof TRAITS`) y nunca haya un id escrito a mano en dos lugares. Es puro dato: no importa nada y no contiene lógica de juego salvo dos funciones triviales de la **regla de identidad**: no se puede elegir un rasgo ni una habilidad cuyo tag coincida con la Debilidad de la clase.

Esta tarea implementa exactamente la sección C del contrato de la Fase A. Todo nombre de este documento (archivos, constantes, tipos, funciones) es el del contrato y no se cambia.

**Archivos:**
- Crear: `src/content/catalog.ts`
- Modificar: `tsconfig.json` (solo si su array `include` no contiene `"tests"`; se verifica en el paso 1)
- Test: `tests/content/catalog.test.ts`

**Interfaces:**
- Consume: nada del código del proyecto. Depende únicamente de la infraestructura de la Tarea 1: alias `@/` → `src/` en `vite.config.ts` y `tsconfig.json`, Vitest configurado, scripts `test:run` y `typecheck` en `package.json`.
- Produce (todo exportado desde `src/content/catalog.ts`, firmas exactas del contrato):
  - `export const ATTRS = ['vigor', 'astucia', 'saber', 'presencia'] as const;`
  - `export type Attr = (typeof ATTRS)[number];`
  - `export const ATTR_NAMES: Record<Attr, string>;`
  - `export const TAGS = ['fisico','sigilo','percepcion','social','engano','saber','magia','fe','supervivencia','huida'] as const;`
  - `export type Tag = (typeof TAGS)[number];`
  - `export const DIFFICULTIES = { facil: 1, normal: 0, dificil: -1, muy_dificil: -2, extrema: -3 } as const;`
  - `export type Difficulty = keyof typeof DIFFICULTIES;`
  - `export const DIFFICULTY_NAMES: Record<Difficulty, string>;`
  - `export type PowerScope = { kind: 'tags'; tags: readonly Tag[] } | { kind: 'any' } | { kind: 'sheet' };`
  - `export interface ClassDef { name: string; attr: Attr; weakness: Tag; power: { id: string; name: string; description: string; scope: PowerScope } }`
  - `export const CLASSES: { guerrero, explorador, mago, clerigo } as const satisfies Record<string, ClassDef>;`
  - `export type ClassId = keyof typeof CLASSES;`
  - `export interface TraitDef { name: string; tag: Tag; description: string }`
  - `export const TRAITS: 8 rasgos as const satisfies Record<string, TraitDef>;`
  - `export type TraitId = keyof typeof TRAITS;`
  - `export interface SkillDef { name: string; tag: Tag }`
  - `export const SKILLS: 12 habilidades as const satisfies Record<string, SkillDef>;`
  - `export type SkillId = keyof typeof SKILLS;`
  - `export interface ConditionDef { name: string; tag: Tag | 'all' }`
  - `export const CONDITIONS: 6 condiciones as const satisfies Record<string, ConditionDef>;`
  - `export type ConditionId = keyof typeof CONDITIONS;`
  - `export const FUMBLE_DEFAULT_CONDITION: ConditionId = 'exhausto';`
  - `export const LIMITS = { maxItems: 6, maxConditions: 3, maxRedirects: 8, maxLog: 400, fortuneBase: 3, fortuneFromLevel5: 4, maxWounds: 3, maxAttr: 5, maxLevel: 10, xpPerLevel: 60, minChoices: 4, maxChoices: 9, maxCharacters: 3 } as const;`
  - `export const WOUND_LABELS = ['Sano', 'Herido', 'Malherido', 'Caído'] as const;`
  - `export function isTraitAllowed(classId: ClassId, traitId: TraitId): boolean;`
  - `export function isSkillAllowed(classId: ClassId, skillId: SkillId): boolean;`

Las tareas posteriores que consumen esto: Tarea 3 (`schema.ts` importa `ATTRS`, `TAGS`, `DIFFICULTIES`, `CLASSES`, `TRAITS`, `SKILLS`, `CONDITIONS` y los tipos), Tarea 6 (`LIMITS`, `FUMBLE_DEFAULT_CONDITION`), Tarea 8 (`TRAITS`, `SKILLS`, `CLASSES`, `CONDITIONS`, `DIFFICULTIES`, `LIMITS`), Tarea 10 (`CLASSES[...].power.scope`), Tarea 13 (`isTraitAllowed` en la creación de personaje) y Tarea 14 (`ATTR_NAMES`, `DIFFICULTY_NAMES`, `WOUND_LABELS`).

**Convenciones que aplican a toda la tarea.** TypeScript `strict`, sin `any`, sin `!` fuera de tests. Los tests importan con el alias `@/content/catalog`. Los identificadores van en español sin acentos (`engano`, `clerigo`, `muy_dificil`); los textos visibles llevan acentos (`'Fácil'`, `'Clérigo'`, `'Caído'`). Los comandos se ejecutan desde la raíz del proyecto (`C:\Users\Gabriel Agustin\Desktop\Local\JuegoRol`) en PowerShell o Git Bash; ambos aceptan `npx vitest run tests/content/catalog.test.ts`.

---

- [ ] **Paso 1: Verificar que `tsconfig.json` compila los tests**

Abrí `tsconfig.json` y mirá el array `include`. Tiene que contener `"tests"` para que `npx tsc --noEmit -p tsconfig.json` verifique también los tests (la Tarea 3 usa `expectTypeOf`, que solo tiene valor si `tsc` lee los tests; esta tarea también lo usa). Si ya está, no toques nada. Si no está, agregá el string `"tests"` al array existente sin quitar ningún otro elemento. Por ejemplo, si estaba así:

```json
"include": ["src"]
```

tiene que quedar así:

```json
"include": ["src", "tests"]
```

Confirmá que sigue compilando el proyecto tal como quedó en la Tarea 1:

```
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: sin salida y código de salida 0.

---

## Ciclo 1: atributos, tags, dificultades, límites y etiquetas de heridas

- [ ] **Paso 2: Escribir el test que falla**

Creá el archivo `tests/content/catalog.test.ts` con este contenido completo:

```ts
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  ATTRS,
  ATTR_NAMES,
  TAGS,
  DIFFICULTIES,
  DIFFICULTY_NAMES,
  LIMITS,
  WOUND_LABELS,
  type Attr,
  type Tag,
  type Difficulty,
} from '@/content/catalog';

describe('catalog: atributos, tags y dificultades', () => {
  it('declara los 4 atributos en orden y con su nombre visible', () => {
    expect(ATTRS).toEqual(['vigor', 'astucia', 'saber', 'presencia']);
    expect(ATTR_NAMES).toEqual({ vigor: 'Vigor', astucia: 'Astucia', saber: 'Saber', presencia: 'Presencia' });
    expectTypeOf<Attr>().toEqualTypeOf<'vigor' | 'astucia' | 'saber' | 'presencia'>();
  });

  it('declara los 10 tags sin repetidos', () => {
    expect(TAGS).toEqual([
      'fisico', 'sigilo', 'percepcion', 'social', 'engano',
      'saber', 'magia', 'fe', 'supervivencia', 'huida',
    ]);
    expect(new Set(TAGS).size).toBe(TAGS.length);
    expectTypeOf<Tag>().toEqualTypeOf<
      'fisico' | 'sigilo' | 'percepcion' | 'social' | 'engano' | 'saber' | 'magia' | 'fe' | 'supervivencia' | 'huida'
    >();
  });

  it('las dificultades valen +1, 0, -1, -2, -3 y tienen nombre visible', () => {
    expect(DIFFICULTIES).toEqual({ facil: 1, normal: 0, dificil: -1, muy_dificil: -2, extrema: -3 });
    expect(DIFFICULTY_NAMES).toEqual({
      facil: 'Fácil', normal: 'Normal', dificil: 'Difícil', muy_dificil: 'Muy difícil', extrema: 'Extrema',
    });
    expectTypeOf<Difficulty>().toEqualTypeOf<'facil' | 'normal' | 'dificil' | 'muy_dificil' | 'extrema'>();
  });
});

describe('catalog: límites y etiquetas de heridas', () => {
  it('LIMITS tiene exactamente los valores del diseño', () => {
    expect(LIMITS).toEqual({
      maxItems: 6,
      maxConditions: 3,
      maxRedirects: 8,
      maxLog: 400,
      fortuneBase: 3,
      fortuneFromLevel5: 4,
      maxWounds: 3,
      maxAttr: 5,
      maxLevel: 10,
      xpPerLevel: 60,
      minChoices: 4,
      maxChoices: 9,
      maxCharacters: 3,
    });
  });

  it('WOUND_LABELS tiene una etiqueta por cada valor de Heridas, de 0 a maxWounds', () => {
    expect(WOUND_LABELS).toEqual(['Sano', 'Herido', 'Malherido', 'Caído']);
    expect(WOUND_LABELS).toHaveLength(LIMITS.maxWounds + 1);
  });
});
```

- [ ] **Paso 3: Correr el test y verificar que falla**

```
npx vitest run tests/content/catalog.test.ts
```

Resultado esperado: el archivo no se puede cargar porque el módulo no existe. El error dice algo como `Error: Failed to resolve import "@/content/catalog" from "tests/content/catalog.test.ts". Does the file exist?` y el resumen marca `Test Files 1 failed`. Si en cambio ves `Cannot find module '@/content/catalog'` es lo mismo. Si el error habla del alias (`@/` no resuelto) y no de que el archivo falta, el alias de la Tarea 1 no está bien configurado: revisá `resolve.alias` en `vite.config.ts` antes de seguir.

- [ ] **Paso 4: Implementación mínima**

Creá `src/content/catalog.ts` con este contenido completo:

```ts
// Catálogo del sistema de reglas de "Crónicas del Vado".
// Solo constantes y tipos derivados de ellas. No importa nada: el motor,
// el esquema de contenido, las herramientas y la UI derivan sus ids de acá.

export const ATTRS = ['vigor', 'astucia', 'saber', 'presencia'] as const;
export type Attr = (typeof ATTRS)[number];
export const ATTR_NAMES: Record<Attr, string> = {
  vigor: 'Vigor',
  astucia: 'Astucia',
  saber: 'Saber',
  presencia: 'Presencia',
};

export const TAGS = [
  'fisico',
  'sigilo',
  'percepcion',
  'social',
  'engano',
  'saber',
  'magia',
  'fe',
  'supervivencia',
  'huida',
] as const;
export type Tag = (typeof TAGS)[number];

// Modificador que la dificultad suma a la tirada 2d6 + atributo.
export const DIFFICULTIES = { facil: 1, normal: 0, dificil: -1, muy_dificil: -2, extrema: -3 } as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
  extrema: 'Extrema',
};

export const LIMITS = {
  maxItems: 6,          // ranuras de objetos por partida
  maxConditions: 3,     // condiciones simultáneas; la cuarta reemplaza a la más antigua
  maxRedirects: 8,      // saltos de redirect encadenados antes de considerar un ciclo
  maxLog: 400,          // entradas del historial de la partida que se conservan
  fortuneBase: 3,       // Fortuna por partida
  fortuneFromLevel5: 4, // Fortuna por partida desde nivel 5
  maxWounds: 3,         // 3 Heridas = Caído
  maxAttr: 5,           // techo de cada atributo
  maxLevel: 10,
  xpPerLevel: 60,
  minChoices: 4,        // opciones mínimas por escena no final
  maxChoices: 9,        // opciones máximas (teclas 1-9)
  maxCharacters: 3,     // personajes por perfil
} as const;

// Índice = cantidad de Heridas (0..maxWounds).
export const WOUND_LABELS = ['Sano', 'Herido', 'Malherido', 'Caído'] as const;
```

- [ ] **Paso 5: Correr el test y verificar que pasa**

```
npx vitest run tests/content/catalog.test.ts
```

Resultado esperado: `Test Files 1 passed`, `Tests 5 passed`.

- [ ] **Paso 6: Commit**

```bash
git add src/content/catalog.ts tests/content/catalog.test.ts tsconfig.json
git commit -m "feat(catalog): atributos, tags, dificultades y límites del sistema" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

(Si en el paso 1 no hizo falta tocar `tsconfig.json`, `git add` lo ignora sin error porque no tiene cambios.)

---

## Ciclo 2: clases con atributo, Debilidad y Poder

- [ ] **Paso 7: Escribir el test que falla**

En `tests/content/catalog.test.ts`, reemplazá el bloque `import { ... } from '@/content/catalog';` completo por este:

```ts
import {
  ATTRS,
  ATTR_NAMES,
  TAGS,
  DIFFICULTIES,
  DIFFICULTY_NAMES,
  CLASSES,
  LIMITS,
  WOUND_LABELS,
  type Attr,
  type Tag,
  type Difficulty,
  type ClassId,
} from '@/content/catalog';
```

y agregá al final del archivo este bloque `describe`:

```ts
describe('catalog: clases', () => {
  const classIds = Object.keys(CLASSES) as ClassId[];

  it('hay exactamente 4 clases, cada una con su atributo principal', () => {
    expect(classIds).toEqual(['guerrero', 'explorador', 'mago', 'clerigo']);
    expectTypeOf<ClassId>().toEqualTypeOf<'guerrero' | 'explorador' | 'mago' | 'clerigo'>();
    expect(CLASSES.guerrero.attr).toBe('vigor');
    expect(CLASSES.explorador.attr).toBe('astucia');
    expect(CLASSES.mago.attr).toBe('saber');
    expect(CLASSES.clerigo.attr).toBe('presencia');
    for (const id of classIds) {
      expect(ATTRS).toContain(CLASSES[id].attr);
    }
  });

  it('cada clase tiene nombre visible en español', () => {
    expect(CLASSES.guerrero.name).toBe('Guerrero');
    expect(CLASSES.explorador.name).toBe('Explorador');
    expect(CLASSES.mago.name).toBe('Mago');
    expect(CLASSES.clerigo.name).toBe('Clérigo');
  });

  it('cada Debilidad de clase es un Tag del catálogo', () => {
    for (const id of classIds) {
      expect(TAGS).toContain(CLASSES[id].weakness);
    }
  });

  it('las Debilidades son las del diseño: sigilo, social, fisico, engano', () => {
    expect(CLASSES.guerrero.weakness).toBe('sigilo');
    expect(CLASSES.explorador.weakness).toBe('social');
    expect(CLASSES.mago.weakness).toBe('fisico');
    expect(CLASSES.clerigo.weakness).toBe('engano');
  });

  it('cada Poder tiene id único, nombre y descripción no vacíos', () => {
    const powerIds = classIds.map((id) => CLASSES[id].power.id);
    expect(powerIds).toEqual(['furia', 'sombra', 'conjuro', 'plegaria']);
    expect(new Set(powerIds).size).toBe(powerIds.length);
    for (const id of classIds) {
      const { power } = CLASSES[id];
      expect(power.name.length).toBeGreaterThan(0);
      expect(power.description.length).toBeGreaterThan(0);
    }
    expect(CLASSES.guerrero.power.name).toBe('Furia');
    expect(CLASSES.explorador.power.name).toBe('Sombra');
    expect(CLASSES.mago.power.name).toBe('Conjuro');
    expect(CLASSES.clerigo.power.name).toBe('Plegaria');
  });

  it('los alcances de Poder coinciden con el diseño y solo usan tags del catálogo', () => {
    expect(CLASSES.guerrero.power.scope).toEqual({ kind: 'tags', tags: ['fisico'] });
    expect(CLASSES.explorador.power.scope).toEqual({ kind: 'tags', tags: ['sigilo', 'huida', 'supervivencia'] });
    expect(CLASSES.mago.power.scope).toEqual({ kind: 'any' });
    expect(CLASSES.clerigo.power.scope).toEqual({ kind: 'sheet' });
    for (const id of classIds) {
      const { scope } = CLASSES[id].power;
      if (scope.kind === 'tags') {
        expect(scope.tags.length).toBeGreaterThan(0);
        for (const tag of scope.tags) {
          expect(TAGS).toContain(tag);
        }
      }
    }
  });
});
```

- [ ] **Paso 8: Correr el test y verificar que falla**

```
npx vitest run tests/content/catalog.test.ts
```

Resultado esperado: el archivo falla al recolectar las suites porque `CLASSES` es `undefined` y `Object.keys(undefined)` lanza `TypeError: Cannot convert undefined or null to object`. El resumen marca `Test Files 1 failed`. (Los 5 tests del ciclo 1 no se reportan como pasados porque el archivo entero falla al cargarse; es lo esperado.)

- [ ] **Paso 9: Implementación mínima**

Reemplazá `src/content/catalog.ts` por este contenido completo (es el del ciclo 1 más el bloque de clases):

```ts
// Catálogo del sistema de reglas de "Crónicas del Vado".
// Solo constantes y tipos derivados de ellas. No importa nada: el motor,
// el esquema de contenido, las herramientas y la UI derivan sus ids de acá.

export const ATTRS = ['vigor', 'astucia', 'saber', 'presencia'] as const;
export type Attr = (typeof ATTRS)[number];
export const ATTR_NAMES: Record<Attr, string> = {
  vigor: 'Vigor',
  astucia: 'Astucia',
  saber: 'Saber',
  presencia: 'Presencia',
};

export const TAGS = [
  'fisico',
  'sigilo',
  'percepcion',
  'social',
  'engano',
  'saber',
  'magia',
  'fe',
  'supervivencia',
  'huida',
] as const;
export type Tag = (typeof TAGS)[number];

// Modificador que la dificultad suma a la tirada 2d6 + atributo.
export const DIFFICULTIES = { facil: 1, normal: 0, dificil: -1, muy_dificil: -2, extrema: -3 } as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
  extrema: 'Extrema',
};

// Alcance del Poder de clase:
// - tags: convierte un Fallo en Éxito con costo si la tirada comparte algún tag.
// - any: lo mismo en cualquier tirada.
// - sheet: no actúa sobre tiradas; se usa desde la ficha (Plegaria).
export type PowerScope = { kind: 'tags'; tags: readonly Tag[] } | { kind: 'any' } | { kind: 'sheet' };

export interface ClassDef {
  name: string;
  attr: Attr;
  weakness: Tag;
  power: { id: string; name: string; description: string; scope: PowerScope };
}

export const CLASSES = {
  guerrero: {
    name: 'Guerrero',
    attr: 'vigor',
    weakness: 'sigilo',
    power: {
      id: 'furia',
      name: 'Furia',
      description: 'Convierte un Fallo en Éxito con costo en una tirada física.',
      scope: { kind: 'tags', tags: ['fisico'] },
    },
  },
  explorador: {
    name: 'Explorador',
    attr: 'astucia',
    weakness: 'social',
    power: {
      id: 'sombra',
      name: 'Sombra',
      description: 'Convierte un Fallo en Éxito con costo en sigilo, huida o supervivencia.',
      scope: { kind: 'tags', tags: ['sigilo', 'huida', 'supervivencia'] },
    },
  },
  mago: {
    name: 'Mago',
    attr: 'saber',
    weakness: 'fisico',
    power: {
      id: 'conjuro',
      name: 'Conjuro',
      description: 'Convierte un Fallo en Éxito con costo en cualquier tirada; quedás Agotado.',
      scope: { kind: 'any' },
    },
  },
  clerigo: {
    name: 'Clérigo',
    attr: 'presencia',
    weakness: 'engano',
    power: {
      id: 'plegaria',
      name: 'Plegaria',
      description: 'Cura 1 Herida y limpia todas las condiciones. Se usa desde la ficha.',
      scope: { kind: 'sheet' },
    },
  },
} as const satisfies Record<string, ClassDef>;
export type ClassId = keyof typeof CLASSES;

export const LIMITS = {
  maxItems: 6,          // ranuras de objetos por partida
  maxConditions: 3,     // condiciones simultáneas; la cuarta reemplaza a la más antigua
  maxRedirects: 8,      // saltos de redirect encadenados antes de considerar un ciclo
  maxLog: 400,          // entradas del historial de la partida que se conservan
  fortuneBase: 3,       // Fortuna por partida
  fortuneFromLevel5: 4, // Fortuna por partida desde nivel 5
  maxWounds: 3,         // 3 Heridas = Caído
  maxAttr: 5,           // techo de cada atributo
  maxLevel: 10,
  xpPerLevel: 60,
  minChoices: 4,        // opciones mínimas por escena no final
  maxChoices: 9,        // opciones máximas (teclas 1-9)
  maxCharacters: 3,     // personajes por perfil
} as const;

// Índice = cantidad de Heridas (0..maxWounds).
export const WOUND_LABELS = ['Sano', 'Herido', 'Malherido', 'Caído'] as const;
```

Nota sobre `as const satisfies Record<string, ClassDef>`: `as const` congela los literales (así `ClassId` es la unión `'guerrero' | 'explorador' | 'mago' | 'clerigo'` y `CLASSES.mago.weakness` es el literal `'fisico'`), y `satisfies` hace que `tsc` verifique cada entrada contra `ClassDef` sin ensanchar los tipos. Si escribís un tag inexistente en `weakness`, el error aparece en el editor.

- [ ] **Paso 10: Correr el test y verificar que pasa**

```
npx vitest run tests/content/catalog.test.ts
```

Resultado esperado: `Test Files 1 passed`, `Tests 11 passed`.

- [ ] **Paso 11: Commit**

```bash
git add src/content/catalog.ts tests/content/catalog.test.ts
git commit -m "feat(catalog): clases con atributo, Debilidad y Poder" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Ciclo 3: rasgos, habilidades y condiciones

- [ ] **Paso 12: Escribir el test que falla**

En `tests/content/catalog.test.ts`, reemplazá el bloque `import { ... } from '@/content/catalog';` completo por este:

```ts
import {
  ATTRS,
  ATTR_NAMES,
  TAGS,
  DIFFICULTIES,
  DIFFICULTY_NAMES,
  CLASSES,
  TRAITS,
  SKILLS,
  CONDITIONS,
  FUMBLE_DEFAULT_CONDITION,
  LIMITS,
  WOUND_LABELS,
  type Attr,
  type Tag,
  type Difficulty,
  type ClassId,
  type TraitId,
  type SkillId,
  type ConditionId,
} from '@/content/catalog';
```

y agregá al final del archivo este bloque `describe`:

```ts
describe('catalog: rasgos, habilidades y condiciones', () => {
  const traitIds = Object.keys(TRAITS) as TraitId[];
  const skillIds = Object.keys(SKILLS) as SkillId[];
  const conditionIds = Object.keys(CONDITIONS) as ConditionId[];

  it('los ids no se repiten entre rasgos, habilidades y condiciones', () => {
    const all = [...traitIds, ...skillIds, ...conditionIds];
    expect(new Set(all).size).toBe(all.length);
  });

  it('hay 8 rasgos en el orden del diseño', () => {
    expect(traitIds).toEqual([
      'hijo_de_la_frontera',
      'criado_en_el_templo',
      'desertor',
      'huerfano_de_la_peste',
      'aprendiz_de_escriba',
      'contrabandista',
      'cazador_furtivo',
      'hijo_de_molinero',
    ]);
  });

  it('ningún rasgo repite tag con otro rasgo: 8 rasgos, 8 tags distintos, todos del catálogo', () => {
    const tags = traitIds.map((id) => TRAITS[id].tag);
    expect(tags).toHaveLength(8);
    expect(new Set(tags).size).toBe(8);
    for (const tag of tags) {
      expect(TAGS).toContain(tag);
    }
  });

  it('los tags de los rasgos son los del diseño', () => {
    expect(TRAITS.hijo_de_la_frontera.tag).toBe('supervivencia');
    expect(TRAITS.criado_en_el_templo.tag).toBe('fe');
    expect(TRAITS.desertor.tag).toBe('fisico');
    expect(TRAITS.huerfano_de_la_peste.tag).toBe('percepcion');
    expect(TRAITS.aprendiz_de_escriba.tag).toBe('saber');
    expect(TRAITS.contrabandista.tag).toBe('engano');
    expect(TRAITS.cazador_furtivo.tag).toBe('sigilo');
    expect(TRAITS.hijo_de_molinero.tag).toBe('social');
  });

  it('cada rasgo tiene nombre y descripción no vacíos', () => {
    for (const id of traitIds) {
      expect(TRAITS[id].name.length).toBeGreaterThan(0);
      expect(TRAITS[id].description.length).toBeGreaterThan(0);
    }
    expect(TRAITS.desertor.name).toBe('Desertor');
    expect(TRAITS.huerfano_de_la_peste.name).toBe('Huérfano de la peste');
  });

  it('hay 12 habilidades con nombre y con tag del catálogo', () => {
    expect(skillIds).toEqual([
      'veterano', 'intimidante', 'orador', 'rastreador', 'ojo_avizor', 'escurridizo',
      'erudito_de_runas', 'vista_arcana', 'voz_del_templo', 'curandero', 'superviviente', 'manos_ligeras',
    ]);
    for (const id of skillIds) {
      expect(SKILLS[id].name.length).toBeGreaterThan(0);
      expect(TAGS).toContain(SKILLS[id].tag);
    }
    expect(SKILLS.veterano.tag).toBe('fisico');
    expect(SKILLS.manos_ligeras.tag).toBe('sigilo');
    expect(SKILLS.intimidante.tag).toBe('social');
    expect(SKILLS.orador.tag).toBe('social');
    expect(SKILLS.vista_arcana.tag).toBe('magia');
  });

  it('hay 6 condiciones; su tag es un Tag del catálogo o "all"', () => {
    expect(conditionIds).toEqual(['envenenado', 'asustado', 'exhausto', 'empapado', 'perseguido', 'agotado']);
    for (const id of conditionIds) {
      const tag = CONDITIONS[id].tag;
      expect(tag === 'all' || TAGS.includes(tag)).toBe(true);
    }
    expect(CONDITIONS.envenenado.tag).toBe('all');
    expect(CONDITIONS.asustado.tag).toBe('social');
    expect(CONDITIONS.exhausto.tag).toBe('fisico');
    expect(CONDITIONS.empapado.tag).toBe('sigilo');
    expect(CONDITIONS.perseguido.tag).toBe('huida');
    expect(CONDITIONS.agotado.tag).toBe('magia');
  });

  it('la condición por defecto del Fallo grave es exhausto y existe en el catálogo', () => {
    expect(FUMBLE_DEFAULT_CONDITION).toBe('exhausto');
    expect(conditionIds).toContain(FUMBLE_DEFAULT_CONDITION);
  });
});
```

- [ ] **Paso 13: Correr el test y verificar que falla**

```
npx vitest run tests/content/catalog.test.ts
```

Resultado esperado: el archivo falla al recolectar porque `TRAITS` es `undefined`: `TypeError: Cannot convert undefined or null to object`. `Test Files 1 failed`.

- [ ] **Paso 14: Implementación mínima**

Reemplazá `src/content/catalog.ts` por este contenido completo (el del ciclo 2 más rasgos, habilidades y condiciones):

```ts
// Catálogo del sistema de reglas de "Crónicas del Vado".
// Solo constantes y tipos derivados de ellas. No importa nada: el motor,
// el esquema de contenido, las herramientas y la UI derivan sus ids de acá.

export const ATTRS = ['vigor', 'astucia', 'saber', 'presencia'] as const;
export type Attr = (typeof ATTRS)[number];
export const ATTR_NAMES: Record<Attr, string> = {
  vigor: 'Vigor',
  astucia: 'Astucia',
  saber: 'Saber',
  presencia: 'Presencia',
};

export const TAGS = [
  'fisico',
  'sigilo',
  'percepcion',
  'social',
  'engano',
  'saber',
  'magia',
  'fe',
  'supervivencia',
  'huida',
] as const;
export type Tag = (typeof TAGS)[number];

// Modificador que la dificultad suma a la tirada 2d6 + atributo.
export const DIFFICULTIES = { facil: 1, normal: 0, dificil: -1, muy_dificil: -2, extrema: -3 } as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
  extrema: 'Extrema',
};

// Alcance del Poder de clase:
// - tags: convierte un Fallo en Éxito con costo si la tirada comparte algún tag.
// - any: lo mismo en cualquier tirada.
// - sheet: no actúa sobre tiradas; se usa desde la ficha (Plegaria).
export type PowerScope = { kind: 'tags'; tags: readonly Tag[] } | { kind: 'any' } | { kind: 'sheet' };

export interface ClassDef {
  name: string;
  attr: Attr;
  weakness: Tag;
  power: { id: string; name: string; description: string; scope: PowerScope };
}

export const CLASSES = {
  guerrero: {
    name: 'Guerrero',
    attr: 'vigor',
    weakness: 'sigilo',
    power: {
      id: 'furia',
      name: 'Furia',
      description: 'Convierte un Fallo en Éxito con costo en una tirada física.',
      scope: { kind: 'tags', tags: ['fisico'] },
    },
  },
  explorador: {
    name: 'Explorador',
    attr: 'astucia',
    weakness: 'social',
    power: {
      id: 'sombra',
      name: 'Sombra',
      description: 'Convierte un Fallo en Éxito con costo en sigilo, huida o supervivencia.',
      scope: { kind: 'tags', tags: ['sigilo', 'huida', 'supervivencia'] },
    },
  },
  mago: {
    name: 'Mago',
    attr: 'saber',
    weakness: 'fisico',
    power: {
      id: 'conjuro',
      name: 'Conjuro',
      description: 'Convierte un Fallo en Éxito con costo en cualquier tirada; quedás Agotado.',
      scope: { kind: 'any' },
    },
  },
  clerigo: {
    name: 'Clérigo',
    attr: 'presencia',
    weakness: 'engano',
    power: {
      id: 'plegaria',
      name: 'Plegaria',
      description: 'Cura 1 Herida y limpia todas las condiciones. Se usa desde la ficha.',
      scope: { kind: 'sheet' },
    },
  },
} as const satisfies Record<string, ClassDef>;
export type ClassId = keyof typeof CLASSES;

// Rasgo de origen: ventaja permanente en UN tag + flag `char:origen.<id>` (lo escribe el store al crear el personaje).
export interface TraitDef {
  name: string;
  tag: Tag;
  description: string;
}

export const TRAITS = {
  hijo_de_la_frontera: {
    name: 'Hijo de la frontera',
    tag: 'supervivencia',
    description: 'Creciste donde el mapa se acaba; el monte no te asusta.',
  },
  criado_en_el_templo: {
    name: 'Criado en el templo',
    tag: 'fe',
    description: 'Sabés qué se dice y qué se calla delante de un altar.',
  },
  desertor: {
    name: 'Desertor',
    tag: 'fisico',
    description: 'Serviste, peleaste y te fuiste. Todavía sabés parar un golpe.',
  },
  huerfano_de_la_peste: {
    name: 'Huérfano de la peste',
    tag: 'percepcion',
    description: 'Aprendiste a mirar antes de entrar a una casa.',
  },
  aprendiz_de_escriba: {
    name: 'Aprendiz de escriba',
    tag: 'saber',
    description: 'Leés rápido, incluso lo que no está escrito para vos.',
  },
  contrabandista: {
    name: 'Contrabandista',
    tag: 'engano',
    description: 'Mentir con cara de piedra fue tu oficio.',
  },
  cazador_furtivo: {
    name: 'Cazador furtivo',
    tag: 'sigilo',
    description: 'Sabés moverte sin que el bosque ni el guardabosque te oigan.',
  },
  hijo_de_molinero: {
    name: 'Hijo de molinero',
    tag: 'social',
    description: 'Conocés a la gente de pueblo porque sos de pueblo.',
  },
} as const satisfies Record<string, TraitDef>;
export type TraitId = keyof typeof TRAITS;

// Habilidad: ventaja permanente en un tag. Se gana una en los niveles 3, 5, 7 y 9.
export interface SkillDef {
  name: string;
  tag: Tag;
}

export const SKILLS = {
  veterano: { name: 'Veterano', tag: 'fisico' },
  intimidante: { name: 'Intimidante', tag: 'social' },
  orador: { name: 'Orador', tag: 'social' },
  rastreador: { name: 'Rastreador', tag: 'percepcion' },
  ojo_avizor: { name: 'Ojo avizor', tag: 'percepcion' },
  escurridizo: { name: 'Escurridizo', tag: 'huida' },
  erudito_de_runas: { name: 'Erudito de runas', tag: 'saber' },
  vista_arcana: { name: 'Vista arcana', tag: 'magia' },
  voz_del_templo: { name: 'Voz del templo', tag: 'fe' },
  curandero: { name: 'Curandero', tag: 'supervivencia' },
  superviviente: { name: 'Superviviente', tag: 'supervivencia' },
  manos_ligeras: { name: 'Manos ligeras', tag: 'sigilo' },
} as const satisfies Record<string, SkillDef>;
export type SkillId = keyof typeof SKILLS;

// Condición: desventaja temporal en un tag, o en todas las tiradas ('all').
export interface ConditionDef {
  name: string;
  tag: Tag | 'all';
}

export const CONDITIONS = {
  envenenado: { name: 'Envenenado', tag: 'all' },
  asustado: { name: 'Asustado', tag: 'social' },
  exhausto: { name: 'Exhausto', tag: 'fisico' },
  empapado: { name: 'Empapado', tag: 'sigilo' },
  perseguido: { name: 'Perseguido', tag: 'huida' },
  agotado: { name: 'Agotado', tag: 'magia' },
} as const satisfies Record<string, ConditionDef>;
export type ConditionId = keyof typeof CONDITIONS;

// Condición que aplica un Fallo grave (doble 1) cuando la tirada no define un outcome `fumble` propio.
export const FUMBLE_DEFAULT_CONDITION: ConditionId = 'exhausto';

export const LIMITS = {
  maxItems: 6,          // ranuras de objetos por partida
  maxConditions: 3,     // condiciones simultáneas; la cuarta reemplaza a la más antigua
  maxRedirects: 8,      // saltos de redirect encadenados antes de considerar un ciclo
  maxLog: 400,          // entradas del historial de la partida que se conservan
  fortuneBase: 3,       // Fortuna por partida
  fortuneFromLevel5: 4, // Fortuna por partida desde nivel 5
  maxWounds: 3,         // 3 Heridas = Caído
  maxAttr: 5,           // techo de cada atributo
  maxLevel: 10,
  xpPerLevel: 60,
  minChoices: 4,        // opciones mínimas por escena no final
  maxChoices: 9,        // opciones máximas (teclas 1-9)
  maxCharacters: 3,     // personajes por perfil
} as const;

// Índice = cantidad de Heridas (0..maxWounds).
export const WOUND_LABELS = ['Sano', 'Herido', 'Malherido', 'Caído'] as const;
```

- [ ] **Paso 15: Correr el test y verificar que pasa**

```
npx vitest run tests/content/catalog.test.ts
```

Resultado esperado: `Test Files 1 passed`, `Tests 19 passed`.

- [ ] **Paso 16: Commit**

```bash
git add src/content/catalog.ts tests/content/catalog.test.ts
git commit -m "feat(catalog): rasgos, habilidades y condiciones con sus tags" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Ciclo 4: regla de identidad (isTraitAllowed, isSkillAllowed)

La regla (spec, sección 4): no se puede elegir un rasgo ni una habilidad cuyo tag coincida con la Debilidad de la clase. El motor no tiene lógica extra por esto; solo estas dos funciones, que la UI de creación de personaje (Tarea 13/14 y Fase C) usa para ocultar las opciones incompatibles.

- [ ] **Paso 17: Escribir el test que falla**

En `tests/content/catalog.test.ts`, reemplazá el bloque `import { ... } from '@/content/catalog';` completo por este:

```ts
import {
  ATTRS,
  ATTR_NAMES,
  TAGS,
  DIFFICULTIES,
  DIFFICULTY_NAMES,
  CLASSES,
  TRAITS,
  SKILLS,
  CONDITIONS,
  FUMBLE_DEFAULT_CONDITION,
  LIMITS,
  WOUND_LABELS,
  isTraitAllowed,
  isSkillAllowed,
  type Attr,
  type Tag,
  type Difficulty,
  type ClassId,
  type TraitId,
  type SkillId,
  type ConditionId,
} from '@/content/catalog';
```

y agregá al final del archivo este bloque `describe`:

```ts
describe('catalog: regla de identidad', () => {
  const classIds = Object.keys(CLASSES) as ClassId[];
  const traitIds = Object.keys(TRAITS) as TraitId[];
  const skillIds = Object.keys(SKILLS) as SkillId[];

  it('un rasgo cuyo tag es la Debilidad de la clase no está permitido', () => {
    expect(isTraitAllowed('mago', 'desertor')).toBe(false); // desertor = fisico = Debilidad del Mago
    expect(isTraitAllowed('guerrero', 'cazador_furtivo')).toBe(false); // sigilo
    expect(isTraitAllowed('explorador', 'hijo_de_molinero')).toBe(false); // social
    expect(isTraitAllowed('clerigo', 'contrabandista')).toBe(false); // engano
  });

  it('cualquier otro rasgo sí está permitido', () => {
    expect(isTraitAllowed('guerrero', 'desertor')).toBe(true);
    expect(isTraitAllowed('mago', 'aprendiz_de_escriba')).toBe(true);
    expect(isTraitAllowed('mago', 'cazador_furtivo')).toBe(true);
    expect(isTraitAllowed('clerigo', 'criado_en_el_templo')).toBe(true);
  });

  it('cada clase tiene exactamente 7 rasgos permitidos (8 rasgos, 8 tags distintos, 1 Debilidad)', () => {
    for (const classId of classIds) {
      const allowed = traitIds.filter((traitId) => isTraitAllowed(classId, traitId));
      expect(allowed).toHaveLength(7);
      for (const traitId of allowed) {
        expect(TRAITS[traitId].tag).not.toBe(CLASSES[classId].weakness);
      }
    }
  });

  it('una habilidad cuyo tag es la Debilidad de la clase no está permitida', () => {
    expect(isSkillAllowed('guerrero', 'manos_ligeras')).toBe(false); // sigilo
    expect(isSkillAllowed('mago', 'veterano')).toBe(false); // fisico
    expect(isSkillAllowed('explorador', 'intimidante')).toBe(false); // social
    expect(isSkillAllowed('explorador', 'orador')).toBe(false); // social
  });

  it('cualquier otra habilidad sí está permitida', () => {
    expect(isSkillAllowed('guerrero', 'veterano')).toBe(true);
    expect(isSkillAllowed('mago', 'erudito_de_runas')).toBe(true);
    expect(isSkillAllowed('explorador', 'escurridizo')).toBe(true);
  });

  it('las habilidades permitidas por clase son las 12 menos las que comparten tag con la Debilidad', () => {
    const forbiddenCount = (classId: ClassId): number =>
      skillIds.filter((skillId) => SKILLS[skillId].tag === CLASSES[classId].weakness).length;
    for (const classId of classIds) {
      const allowed = skillIds.filter((skillId) => isSkillAllowed(classId, skillId));
      expect(allowed).toHaveLength(skillIds.length - forbiddenCount(classId));
    }
    // Ninguna habilidad de la v1 usa el tag engano: el Clérigo puede elegir las 12.
    expect(skillIds.every((skillId) => isSkillAllowed('clerigo', skillId))).toBe(true);
  });
});
```

- [ ] **Paso 18: Correr el test y verificar que falla**

```
npx vitest run tests/content/catalog.test.ts
```

Resultado esperado: los 19 tests anteriores pasan y los 6 nuevos fallan con `TypeError: isTraitAllowed is not a function` (o `isSkillAllowed is not a function`). Resumen: `Tests 6 failed | 19 passed`.

- [ ] **Paso 19: Implementación mínima**

Agregá al final de `src/content/catalog.ts`, después de la línea de `WOUND_LABELS`, estas dos funciones. El archivo completo queda como se muestra a continuación (es el del ciclo 3 más el bloque final):

```ts
// Catálogo del sistema de reglas de "Crónicas del Vado".
// Solo constantes y tipos derivados de ellas. No importa nada: el motor,
// el esquema de contenido, las herramientas y la UI derivan sus ids de acá.

export const ATTRS = ['vigor', 'astucia', 'saber', 'presencia'] as const;
export type Attr = (typeof ATTRS)[number];
export const ATTR_NAMES: Record<Attr, string> = {
  vigor: 'Vigor',
  astucia: 'Astucia',
  saber: 'Saber',
  presencia: 'Presencia',
};

export const TAGS = [
  'fisico',
  'sigilo',
  'percepcion',
  'social',
  'engano',
  'saber',
  'magia',
  'fe',
  'supervivencia',
  'huida',
] as const;
export type Tag = (typeof TAGS)[number];

// Modificador que la dificultad suma a la tirada 2d6 + atributo.
export const DIFFICULTIES = { facil: 1, normal: 0, dificil: -1, muy_dificil: -2, extrema: -3 } as const;
export type Difficulty = keyof typeof DIFFICULTIES;
export const DIFFICULTY_NAMES: Record<Difficulty, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
  muy_dificil: 'Muy difícil',
  extrema: 'Extrema',
};

// Alcance del Poder de clase:
// - tags: convierte un Fallo en Éxito con costo si la tirada comparte algún tag.
// - any: lo mismo en cualquier tirada.
// - sheet: no actúa sobre tiradas; se usa desde la ficha (Plegaria).
export type PowerScope = { kind: 'tags'; tags: readonly Tag[] } | { kind: 'any' } | { kind: 'sheet' };

export interface ClassDef {
  name: string;
  attr: Attr;
  weakness: Tag;
  power: { id: string; name: string; description: string; scope: PowerScope };
}

export const CLASSES = {
  guerrero: {
    name: 'Guerrero',
    attr: 'vigor',
    weakness: 'sigilo',
    power: {
      id: 'furia',
      name: 'Furia',
      description: 'Convierte un Fallo en Éxito con costo en una tirada física.',
      scope: { kind: 'tags', tags: ['fisico'] },
    },
  },
  explorador: {
    name: 'Explorador',
    attr: 'astucia',
    weakness: 'social',
    power: {
      id: 'sombra',
      name: 'Sombra',
      description: 'Convierte un Fallo en Éxito con costo en sigilo, huida o supervivencia.',
      scope: { kind: 'tags', tags: ['sigilo', 'huida', 'supervivencia'] },
    },
  },
  mago: {
    name: 'Mago',
    attr: 'saber',
    weakness: 'fisico',
    power: {
      id: 'conjuro',
      name: 'Conjuro',
      description: 'Convierte un Fallo en Éxito con costo en cualquier tirada; quedás Agotado.',
      scope: { kind: 'any' },
    },
  },
  clerigo: {
    name: 'Clérigo',
    attr: 'presencia',
    weakness: 'engano',
    power: {
      id: 'plegaria',
      name: 'Plegaria',
      description: 'Cura 1 Herida y limpia todas las condiciones. Se usa desde la ficha.',
      scope: { kind: 'sheet' },
    },
  },
} as const satisfies Record<string, ClassDef>;
export type ClassId = keyof typeof CLASSES;

// Rasgo de origen: ventaja permanente en UN tag + flag `char:origen.<id>` (lo escribe el store al crear el personaje).
export interface TraitDef {
  name: string;
  tag: Tag;
  description: string;
}

export const TRAITS = {
  hijo_de_la_frontera: {
    name: 'Hijo de la frontera',
    tag: 'supervivencia',
    description: 'Creciste donde el mapa se acaba; el monte no te asusta.',
  },
  criado_en_el_templo: {
    name: 'Criado en el templo',
    tag: 'fe',
    description: 'Sabés qué se dice y qué se calla delante de un altar.',
  },
  desertor: {
    name: 'Desertor',
    tag: 'fisico',
    description: 'Serviste, peleaste y te fuiste. Todavía sabés parar un golpe.',
  },
  huerfano_de_la_peste: {
    name: 'Huérfano de la peste',
    tag: 'percepcion',
    description: 'Aprendiste a mirar antes de entrar a una casa.',
  },
  aprendiz_de_escriba: {
    name: 'Aprendiz de escriba',
    tag: 'saber',
    description: 'Leés rápido, incluso lo que no está escrito para vos.',
  },
  contrabandista: {
    name: 'Contrabandista',
    tag: 'engano',
    description: 'Mentir con cara de piedra fue tu oficio.',
  },
  cazador_furtivo: {
    name: 'Cazador furtivo',
    tag: 'sigilo',
    description: 'Sabés moverte sin que el bosque ni el guardabosque te oigan.',
  },
  hijo_de_molinero: {
    name: 'Hijo de molinero',
    tag: 'social',
    description: 'Conocés a la gente de pueblo porque sos de pueblo.',
  },
} as const satisfies Record<string, TraitDef>;
export type TraitId = keyof typeof TRAITS;

// Habilidad: ventaja permanente en un tag. Se gana una en los niveles 3, 5, 7 y 9.
export interface SkillDef {
  name: string;
  tag: Tag;
}

export const SKILLS = {
  veterano: { name: 'Veterano', tag: 'fisico' },
  intimidante: { name: 'Intimidante', tag: 'social' },
  orador: { name: 'Orador', tag: 'social' },
  rastreador: { name: 'Rastreador', tag: 'percepcion' },
  ojo_avizor: { name: 'Ojo avizor', tag: 'percepcion' },
  escurridizo: { name: 'Escurridizo', tag: 'huida' },
  erudito_de_runas: { name: 'Erudito de runas', tag: 'saber' },
  vista_arcana: { name: 'Vista arcana', tag: 'magia' },
  voz_del_templo: { name: 'Voz del templo', tag: 'fe' },
  curandero: { name: 'Curandero', tag: 'supervivencia' },
  superviviente: { name: 'Superviviente', tag: 'supervivencia' },
  manos_ligeras: { name: 'Manos ligeras', tag: 'sigilo' },
} as const satisfies Record<string, SkillDef>;
export type SkillId = keyof typeof SKILLS;

// Condición: desventaja temporal en un tag, o en todas las tiradas ('all').
export interface ConditionDef {
  name: string;
  tag: Tag | 'all';
}

export const CONDITIONS = {
  envenenado: { name: 'Envenenado', tag: 'all' },
  asustado: { name: 'Asustado', tag: 'social' },
  exhausto: { name: 'Exhausto', tag: 'fisico' },
  empapado: { name: 'Empapado', tag: 'sigilo' },
  perseguido: { name: 'Perseguido', tag: 'huida' },
  agotado: { name: 'Agotado', tag: 'magia' },
} as const satisfies Record<string, ConditionDef>;
export type ConditionId = keyof typeof CONDITIONS;

// Condición que aplica un Fallo grave (doble 1) cuando la tirada no define un outcome `fumble` propio.
export const FUMBLE_DEFAULT_CONDITION: ConditionId = 'exhausto';

export const LIMITS = {
  maxItems: 6,          // ranuras de objetos por partida
  maxConditions: 3,     // condiciones simultáneas; la cuarta reemplaza a la más antigua
  maxRedirects: 8,      // saltos de redirect encadenados antes de considerar un ciclo
  maxLog: 400,          // entradas del historial de la partida que se conservan
  fortuneBase: 3,       // Fortuna por partida
  fortuneFromLevel5: 4, // Fortuna por partida desde nivel 5
  maxWounds: 3,         // 3 Heridas = Caído
  maxAttr: 5,           // techo de cada atributo
  maxLevel: 10,
  xpPerLevel: 60,
  minChoices: 4,        // opciones mínimas por escena no final
  maxChoices: 9,        // opciones máximas (teclas 1-9)
  maxCharacters: 3,     // personajes por perfil
} as const;

// Índice = cantidad de Heridas (0..maxWounds).
export const WOUND_LABELS = ['Sano', 'Herido', 'Malherido', 'Caído'] as const;

// Regla de identidad (spec, sección 4): no se puede elegir un rasgo ni una habilidad
// cuyo tag coincida con la Debilidad de la clase. La UI de creación oculta los
// incompatibles con el motivo; el motor no necesita lógica extra.
export function isTraitAllowed(classId: ClassId, traitId: TraitId): boolean {
  return TRAITS[traitId].tag !== CLASSES[classId].weakness;
}

export function isSkillAllowed(classId: ClassId, skillId: SkillId): boolean {
  return SKILLS[skillId].tag !== CLASSES[classId].weakness;
}
```

- [ ] **Paso 20: Correr el test y verificar que pasa**

```
npx vitest run tests/content/catalog.test.ts
```

Resultado esperado: `Test Files 1 passed`, `Tests 25 passed`.

- [ ] **Paso 21: Commit**

```bash
git add src/content/catalog.ts tests/content/catalog.test.ts
git commit -m "feat(catalog): regla de identidad isTraitAllowed e isSkillAllowed" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

- [ ] **Paso 22: Verificación de la tarea**

Corré la suite completa y el chequeo de tipos desde la raíz del proyecto:

```
npx vitest run
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: Vitest reporta todos los archivos de test en verde (los de la Tarea 1 más `tests/content/catalog.test.ts` con 25 tests); `tsc` termina sin salida y con código 0. Si `tsc` marca un error en `tests/content/catalog.test.ts` del tipo `Cannot find module '@/content/catalog'`, faltan los `paths` del alias en `tsconfig.json` (Tarea 1): tiene que existir `"baseUrl": "."` (o equivalente) y `"paths": { "@/*": ["src/*"] }`. Si marca un error en un `expectTypeOf(...).toEqualTypeOf<...>()`, es que alguna unión literal del catálogo no coincide con el contrato: compará la constante señalada carácter por carácter con la sección C.

Confirmá también que el árbol de trabajo quedó limpio:

```
git status
```

Resultado esperado: `nothing to commit, working tree clean`, con 4 commits nuevos por encima del último commit de la Tarea 1.

**Criterio de aceptación:** `src/content/catalog.ts` exporta exactamente los nombres y firmas de la sección C del contrato, sin imports, con 4 clases, 8 rasgos de tags distintos, 12 habilidades y 6 condiciones, y `tests/content/catalog.test.ts` verifica en verde (25 tests, `tsc` sin errores) que los ids son únicos, que toda Debilidad y todo tag de rasgo/habilidad/condición pertenece a `TAGS`, que `LIMITS` tiene los valores del diseño, y que `isTraitAllowed`/`isSkillAllowed` rechazan solo el rasgo o la habilidad cuyo tag coincide con la Debilidad de la clase.

---

### Tarea 3: Esquema de contenido (schema.ts) con zod

**Objetivo.** Definir en `src/content/schema.ts` los tipos TypeScript de todo el contenido del juego (condiciones, efectos, texto con variantes, tiradas, opciones, escenas, PNJ, lugares, objetos, campañas) escritos a mano y legibles, más un esquema zod espejo de cada uno para validar en tiempo de ejecución la forma de una campaña. Además, crear el fixture `tests/fixtures/campaigns/minimal.ts`: una campaña válida de 3 escenas que las tareas 5, 6, 7, 9, 10, 12 y 13 reutilizan en sus tests.

El validador de contenido (Tarea 12) verifica reglas semánticas (que `next` exista, que haya 4 opciones, etc.); esta tarea solo verifica la **forma** de los datos. Tres reglas de forma sí viven acá porque son locales a un objeto: un flag debe empezar con `run:`, `char:` o `world:`; una opción tiene exactamente uno de `roll` u `outcome`; una escena `ending` tiene el campo `ending` y cero opciones.

**Archivos:**
- Crear: `src/content/schema.ts`
- Crear: `tests/content/schema.test.ts`
- Crear: `tests/fixtures/campaigns/minimal.ts`
- Modificar: `tsconfig.json` (solo si su `include` no abarca la carpeta `tests`; con la tarea 1 hecha no hace falta tocarlo; ver "Notas previas")
- Test: `tests/content/schema.test.ts`

**Interfaces:**
- Consume (de la Tarea 2, `src/content/catalog.ts`):
  - `export const ATTRS = ['vigor', 'astucia', 'saber', 'presencia'] as const;` y `export type Attr = (typeof ATTRS)[number];`
  - `export const TAGS = ['fisico','sigilo','percepcion','social','engano','saber','magia','fe','supervivencia','huida'] as const;` y `export type Tag = (typeof TAGS)[number];`
  - `export const DIFFICULTIES = { facil: 1, normal: 0, dificil: -1, muy_dificil: -2, extrema: -3 } as const;` y `export type Difficulty = keyof typeof DIFFICULTIES;`
  - `export const CLASSES`, `export type ClassId = keyof typeof CLASSES;` (claves `guerrero | explorador | mago | clerigo`)
  - `export const TRAITS`, `export type TraitId = keyof typeof TRAITS;` (8 claves, p. ej. `aprendiz_de_escriba`)
  - `export const SKILLS`, `export type SkillId = keyof typeof SKILLS;` (12 claves, p. ej. `rastreador`)
  - `export const CONDITIONS`, `export type ConditionId = keyof typeof CONDITIONS;` (claves `envenenado | asustado | exhausto | empapado | perseguido | agotado`)
  - Paquete `zod` 4 (instalado en la Tarea 1).
- Produce (para las tareas 4 a 14):
  - Tipos exportados desde `@/content/schema`: `FlagId`, `SceneKind`, `Condition`, `Effect`, `TextVariant`, `Paragraph`, `Text`, `Outcome`, `Roll`, `Choice`, `Redirect`, `Scene`, `Npc`, `Place`, `Item`, `CampaignMeta`, `Campaign`, `WorldContent` (firmas exactas en la sección D del contrato; reproducidas en el código de esta tarea).
  - Esquemas zod exportados: `ConditionSchema` (con `z.lazy`), `EffectSchema`, `TextSchema`, `OutcomeSchema`, `RollSchema`, `ChoiceSchema`, `RedirectSchema`, `SceneSchema`, `NpcSchema`, `PlaceSchema`, `ItemSchema`, `CampaignMetaSchema`, `CampaignSchema`, `WorldContentSchema`.
  - Esquemas zod adicionales (no estaban en el contrato; se declaran acá): `FlagIdSchema` (string que cumple `^(run|char|world):`, tipado como `FlagId`), `TextVariantSchema`, `ParagraphSchema`.
  - `export function parseCampaign(data: unknown): Campaign;` — `CampaignSchema.parse(data)`; lanza `ZodError` si la forma no es válida.
  - Fixture `tests/fixtures/campaigns/minimal.ts`: `export const minimal: Campaign;` — campaña `minimal` con `start: 'm_inicio'`, escenas `m_inicio` (normal, 5 opciones: 4 sin tirada, `trepar` con tirada de vigor), `m_descanso` (rest, 4 opciones sin tirada) y `m_final` (ending `m_fin`); PNJ `m_guia`, lugar `m_claro`, objeto `m_piedra`, flags `run:partio` y `char:minimal.trepo`, hito `m_llegar`, reloj `m_noche` (max 3), final `m_fin`.

**Notas previas (leer antes de empezar):**
1. Todo import de código del proyecto usa el alias `@/` (`@/content/schema`, `@/content/catalog`). El fixture vive en `tests/`, fuera de `src/`, así que el test lo importa por ruta relativa: `../fixtures/campaigns/minimal`.
2. zod 4: `z.record` necesita dos argumentos (`z.record(z.string(), X)`); `z.custom<T>(fn, { message })` produce un esquema cuyo tipo inferido es `T`; `.refine(fn, { message, path })` agrega una regla con mensaje propio; `ZodError.message` es el JSON de los issues, por lo que un `toThrow(/texto/)` encuentra el mensaje de un `refine`.
3. Los tests de tipos con `expectTypeOf` no fallan en tiempo de ejecución: los verifica `npx tsc --noEmit -p tsconfig.json`. Abrí `tsconfig.json` y comprobá que `include` abarque la carpeta `tests` (sirve tanto `"tests"` como `"tests/**/*"`). Con la tarea 1 ya está: quedó `"include": ["src", "tests", "tools"]` y no hay que tocar nada. Solo si por algún motivo `tests` no figura, agregá `"tests"` a esa lista: es la única modificación permitida a ese archivo en esta tarea.
4. Ninguna función de esta tarea muta su entrada: `parseCampaign` devuelve un objeto nuevo (zod construye una copia). En los tests, las campañas "rotas" se construyen clonando el fixture con `JSON.parse(JSON.stringify(minimal))` y modificando el clon, nunca el fixture.

---

#### Ciclo 1: FlagId, ConditionSchema y EffectSchema

- [ ] **Paso 1: Escribir el test que falla** → crear `tests/content/schema.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import { ConditionSchema, EffectSchema } from '@/content/schema';

describe('ConditionSchema', () => {
  it('acepta una condición anidada con all/any/not y todas las hojas', () => {
    const condicion: unknown = {
      all: [
        { flag: 'run:centinela_vencido' },
        { flag: 'char:prueba.vio_la_cripta' },
        { flag: 'world:caido.prueba' },
        { any: [{ class: 'mago' }, { trait: 'aprendiz_de_escriba' }, { skill: 'rastreador' }] },
        { not: { condition: 'asustado' } },
        { attr: 'saber', gte: 2 },
        { wounds: { gte: 1, lte: 2 } },
        { visited: 'p_umbral', min: 1 },
        { visited: 'p_umbral' },
        { met: 'centinela' },
        { knows: 'torre_abandonada' },
        { clock: 'pelea', gte: 1 },
        { endingSeen: 'fin_tesoro' },
        { item: 'llave_de_hierro' },
      ],
    };
    expect(ConditionSchema.safeParse(condicion).success).toBe(true);
  });

  it('rechaza un flag sin prefijo run:, char: o world:', () => {
    expect(ConditionSchema.safeParse({ flag: 'centinela_vencido' }).success).toBe(false);
  });

  it('rechaza un flag con prefijo desconocido', () => {
    expect(ConditionSchema.safeParse({ flag: 'global:centinela' }).success).toBe(false);
  });

  it('rechaza una clave desconocida', () => {
    expect(ConditionSchema.safeParse({ visitado: 'p_umbral' }).success).toBe(false);
  });

  it('rechaza ids que no están en el catálogo', () => {
    expect(ConditionSchema.safeParse({ class: 'paladin' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ trait: 'noble' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ skill: 'herrero' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ condition: 'dormido' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ attr: 'fuerza', gte: 1 }).success).toBe(false);
  });

  it('rechaza una condición anidada inválida dentro de not', () => {
    expect(ConditionSchema.safeParse({ not: { flag: 'sin_prefijo' } }).success).toBe(false);
  });
});

describe('EffectSchema', () => {
  it('acepta cada tipo de efecto', () => {
    const efectos: unknown[] = [
      { set: 'run:tiene_pista' },
      { clear: 'char:prueba.vio_la_cripta' },
      { give: 'llave_de_hierro' },
      { take: 'llave_de_hierro' },
      { wound: 1 },
      { wound: 2 },
      { heal: 1 },
      { addCondition: 'asustado' },
      { removeCondition: 'perseguido' },
      { removeCondition: 'all' },
      { clock: 'pelea', delta: 1 },
      { clock: 'pelea', delta: -2 },
      { milestone: 'entrar_a_la_torre' },
      { fortune: -1 },
      { lethal: true },
    ];
    for (const efecto of efectos) {
      expect(EffectSchema.safeParse(efecto).success, JSON.stringify(efecto)).toBe(true);
    }
  });

  it('rechaza valores fuera de rango', () => {
    expect(EffectSchema.safeParse({ wound: 3 }).success).toBe(false);
    expect(EffectSchema.safeParse({ wound: 0 }).success).toBe(false);
    expect(EffectSchema.safeParse({ heal: 2 }).success).toBe(false);
    expect(EffectSchema.safeParse({ lethal: false }).success).toBe(false);
  });

  it('rechaza un flag sin prefijo en set y clear', () => {
    expect(EffectSchema.safeParse({ set: 'tiene_pista' }).success).toBe(false);
    expect(EffectSchema.safeParse({ clear: 'tiene_pista' }).success).toBe(false);
  });

  it('rechaza una condición desconocida', () => {
    expect(EffectSchema.safeParse({ addCondition: 'dormido' }).success).toBe(false);
    expect(EffectSchema.safeParse({ removeCondition: 'dormido' }).success).toBe(false);
  });

  it('rechaza un delta de reloj no entero', () => {
    expect(EffectSchema.safeParse({ clock: 'pelea', delta: 0.5 }).success).toBe(false);
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```
npx vitest run tests/content/schema.test.ts
```

Resultado esperado: el archivo falla al cargarse con `Error: Failed to resolve import "@/content/schema" from "tests/content/schema.test.ts". Does the file exist?` (todavía no existe `src/content/schema.ts`). Ningún test pasa.

- [ ] **Paso 3: Implementación mínima** → crear `src/content/schema.ts` con este contenido completo (todos los tipos a mano ya van acá; los esquemas zod se agregan de a poco en los ciclos siguientes):

```ts
import { z } from 'zod';
import {
  ATTRS,
  TAGS,
  DIFFICULTIES,
  CLASSES,
  TRAITS,
  SKILLS,
  CONDITIONS,
  type Attr,
  type Tag,
  type Difficulty,
  type ClassId,
  type TraitId,
  type SkillId,
  type ConditionId,
} from '@/content/catalog';

// ---------------------------------------------------------------------------
// Tipos de contenido (escritos a mano; los esquemas zod de abajo los espejan y
// un test con expectTypeOf comprueba que coinciden en los dos sentidos).
// ---------------------------------------------------------------------------

export type FlagId = `run:${string}` | `char:${string}` | `world:${string}`;

export type SceneKind = 'normal' | 'hub' | 'encounter' | 'rest' | 'ending';

export type Condition =
  | { flag: FlagId }
  | { not: Condition }
  | { all: Condition[] }
  | { any: Condition[] }
  | { class: ClassId }
  | { trait: TraitId }
  | { skill: SkillId }
  | { item: string }
  | { attr: Attr; gte: number }
  | { wounds: { gte?: number; lte?: number } }
  | { condition: ConditionId }
  | { visited: string; min?: number }
  | { met: string }
  | { knows: string }
  | { clock: string; gte: number }
  | { endingSeen: string };

export type Effect =
  | { set: FlagId }
  | { clear: FlagId }
  | { give: string }
  | { take: string }
  | { wound: 1 | 2 }
  | { heal: 1 }
  | { addCondition: ConditionId }
  | { removeCondition: ConditionId | 'all' }
  | { clock: string; delta: number }
  | { milestone: string }
  | { fortune: number }
  | { lethal: true };

export interface TextVariant {
  when?: Condition;
  text: string;
}

export interface Paragraph {
  speaker?: string;
  variants: TextVariant[];
}

export type Text = (string | Paragraph)[];

export interface Outcome {
  text?: Text;
  effects?: Effect[];
  next: string;
}

export interface Roll {
  attr: Attr;
  difficulty: Difficulty;
  tags: Tag[];
  advantageIf?: Condition;
  disadvantageIf?: Condition;
  outcomes: { success: Outcome; partial: Outcome; failure: Outcome; crit?: Outcome; fumble?: Outcome };
}

export interface Choice {
  id: string;
  label: string;
  requires?: Condition;
  lockedHint?: string;
  roll?: Roll;
  outcome?: Outcome;
}

export interface Redirect {
  when: Condition;
  to: string;
}

// Orden fijo del motor (Tarea 9): enter resuelve `redirect` sobre el estado de
// entrada; aplica `onEnter` de la escena final; render evalúa `when`, `requires`
// y `advantageIf` contra ese estado (todavía sin la memoria de esta escena); al
// elegir se deriva la memoria (visited, met, place, párrafos vistos), se aplican
// efectos y se entra a la siguiente escena.
export interface Scene {
  id: string;
  kind: SceneKind;
  lethal?: true;
  place: string;
  variant?: string;
  cg?: string;
  npcs?: string[];
  redirect?: Redirect[];
  onEnter?: Effect[];
  text: Text;
  choices: Choice[];
  ending?: { id: string; epilogue: Text };
}

export interface Npc {
  id: string;
  name: string;
  portrait: string;
  voice: string;
  canonPrompt: string;
}

export interface Place {
  id: string;
  name: string;
  background: string;
  variants?: Record<string, string>;
  canonPrompt: string;
}

export interface Item {
  id: string;
  name: string;
  icon: string;
  description: string;
  advantageTags?: Tag[];
  relic?: true;
}

export interface CampaignMeta {
  id: string;
  contentVersion: number;
  title: string;
  premise: string;
  cover: string;
  levelRange: [number, number];
  durationMin: [number, number];
  lethalScenes: number;
  lintProfile: 'smoke' | 'release';
  hidden?: true;
}

export interface Campaign extends CampaignMeta {
  start: string;
  scenes: Record<string, Scene>;
  npcs: Record<string, Npc>;
  places: Record<string, Place>;
  items: Record<string, Item>;
  flags: Record<string, string>;
  milestones: Record<string, { label: string }>;
  clocks: Record<string, { max: number; label: string }>;
  endings: Record<string, { title: string; hidden?: true; reward?: Effect[] }>;
}

export interface WorldContent {
  npcs: Record<string, Npc>;
  places: Record<string, Place>;
  items: Record<string, Item>;
  flags: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Esquemas zod espejo
// ---------------------------------------------------------------------------

const FLAG_REGEX = /^(run|char|world):/;

export const FlagIdSchema = z.custom<FlagId>(
  (value) => typeof value === 'string' && FLAG_REGEX.test(value),
  { message: 'El flag debe empezar con run:, char: o world:' },
);

const AttrSchema = z.enum(ATTRS);
const TagSchema = z.enum(TAGS);
const DifficultySchema = z.enum(Object.keys(DIFFICULTIES) as [Difficulty, ...Difficulty[]]);
const ClassIdSchema = z.enum(Object.keys(CLASSES) as [ClassId, ...ClassId[]]);
const TraitIdSchema = z.enum(Object.keys(TRAITS) as [TraitId, ...TraitId[]]);
const SkillIdSchema = z.enum(Object.keys(SKILLS) as [SkillId, ...SkillId[]]);
const ConditionIdSchema = z.enum(Object.keys(CONDITIONS) as [ConditionId, ...ConditionId[]]);

const idSchema = z.string().min(1);

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ flag: FlagIdSchema }),
    z.object({ not: ConditionSchema }),
    z.object({ all: z.array(ConditionSchema) }),
    z.object({ any: z.array(ConditionSchema) }),
    z.object({ class: ClassIdSchema }),
    z.object({ trait: TraitIdSchema }),
    z.object({ skill: SkillIdSchema }),
    z.object({ item: idSchema }),
    z.object({ attr: AttrSchema, gte: z.number().int() }),
    z.object({ wounds: z.object({ gte: z.number().int().optional(), lte: z.number().int().optional() }) }),
    z.object({ condition: ConditionIdSchema }),
    z.object({ visited: idSchema, min: z.number().int().min(1).optional() }),
    z.object({ met: idSchema }),
    z.object({ knows: idSchema }),
    z.object({ clock: idSchema, gte: z.number().int() }),
    z.object({ endingSeen: idSchema }),
  ]),
);

export const EffectSchema = z.union([
  z.object({ set: FlagIdSchema }),
  z.object({ clear: FlagIdSchema }),
  z.object({ give: idSchema }),
  z.object({ take: idSchema }),
  z.object({ wound: z.union([z.literal(1), z.literal(2)]) }),
  z.object({ heal: z.literal(1) }),
  z.object({ addCondition: ConditionIdSchema }),
  z.object({ removeCondition: z.union([ConditionIdSchema, z.literal('all')]) }),
  z.object({ clock: idSchema, delta: z.number().int() }),
  z.object({ milestone: idSchema }),
  z.object({ fortune: z.number().int() }),
  z.object({ lethal: z.literal(true) }),
]);
```

Explicación para quien no conoce zod: `z.union([...])` prueba cada alternativa en orden y acepta la primera que coincide; como cada variante de `Condition` y de `Effect` tiene una clave propia y obligatoria (`flag`, `not`, `all`, …), no hay ambigüedad. `z.lazy` permite que `ConditionSchema` se refiera a sí mismo (`not`, `all`, `any`); la anotación `z.ZodType<Condition>` es obligatoria en un esquema recursivo. `z.custom<FlagId>` es la forma de darle a zod un tipo que TypeScript expresa como plantilla de string (`` `run:${string}` ``) y que zod no puede inferir por sí solo.

- [ ] **Paso 4: Correr el test y verificar que pasa**

```
npx vitest run tests/content/schema.test.ts
```

Resultado esperado: `Test Files 1 passed (1)`, `Tests 11 passed (11)`.

- [ ] **Paso 5: Commit**

```bash
git add src/content/schema.ts tests/content/schema.test.ts
git commit -m "feat(content): tipos de contenido y esquemas zod de condiciones y efectos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 2: TextSchema, OutcomeSchema, RollSchema y ChoiceSchema (exactamente uno de roll/outcome)

- [ ] **Paso 6: Escribir el test que falla** → en `tests/content/schema.test.ts`, reemplazar la línea de import por:

```ts
import { ConditionSchema, EffectSchema, TextSchema, OutcomeSchema, RollSchema, ChoiceSchema } from '@/content/schema';
```

y agregar al final del archivo estos bloques:

```ts
describe('TextSchema y OutcomeSchema', () => {
  it('acepta strings de narrador y párrafos con variantes', () => {
    const texto: unknown = [
      'Llegás al claro.',
      {
        variants: [
          { when: { visited: 'm_inicio', min: 1 }, text: 'El claro otra vez.' },
          { text: 'Un claro entre pinos.' },
        ],
      },
      { speaker: 'm_guia', variants: [{ text: '—Por acá.' }] },
    ];
    expect(TextSchema.safeParse(texto).success).toBe(true);
  });

  it('rechaza un párrafo sin variantes', () => {
    expect(TextSchema.safeParse([{ speaker: 'm_guia', variants: [] }]).success).toBe(false);
  });

  it('acepta un outcome con solo next y uno completo', () => {
    expect(OutcomeSchema.safeParse({ next: 'm_final' }).success).toBe(true);
    expect(
      OutcomeSchema.safeParse({ text: ['Subís.'], effects: [{ set: 'run:partio' }], next: 'm_final' }).success,
    ).toBe(true);
  });

  it('rechaza un outcome sin next', () => {
    expect(OutcomeSchema.safeParse({ text: ['Subís.'] }).success).toBe(false);
  });
});

describe('RollSchema', () => {
  const tirada: unknown = {
    attr: 'vigor',
    difficulty: 'normal',
    tags: ['fisico'],
    advantageIf: { item: 'm_piedra' },
    outcomes: {
      success: { next: 'm_final' },
      partial: { effects: [{ wound: 1 }], next: 'm_final' },
      failure: { effects: [{ wound: 1 }], next: 'm_descanso' },
    },
  };

  it('acepta una tirada con success, partial y failure', () => {
    expect(RollSchema.safeParse(tirada).success).toBe(true);
  });

  it('rechaza una tirada sin failure', () => {
    const sinFailure = {
      ...(tirada as Record<string, unknown>),
      outcomes: { success: { next: 'm_final' }, partial: { next: 'm_final' } },
    };
    expect(RollSchema.safeParse(sinFailure).success).toBe(false);
  });

  it('rechaza dificultad o tag fuera del catálogo', () => {
    expect(RollSchema.safeParse({ ...(tirada as Record<string, unknown>), difficulty: 'imposible' }).success).toBe(false);
    expect(RollSchema.safeParse({ ...(tirada as Record<string, unknown>), tags: ['cocina'] }).success).toBe(false);
  });
});

describe('ChoiceSchema', () => {
  const tirada: unknown = {
    attr: 'vigor',
    difficulty: 'normal',
    tags: ['fisico'],
    outcomes: { success: { next: 'm_final' }, partial: { next: 'm_final' }, failure: { next: 'm_descanso' } },
  };

  it('acepta una opción con outcome', () => {
    expect(ChoiceSchema.safeParse({ id: 'partir', label: 'Partir', outcome: { next: 'm_final' } }).success).toBe(true);
  });

  it('acepta una opción con roll', () => {
    expect(ChoiceSchema.safeParse({ id: 'trepar', label: 'Trepar el risco', roll: tirada }).success).toBe(true);
  });

  it('acepta requires y lockedHint', () => {
    const opcion: unknown = {
      id: 'contar',
      label: 'Contarle al guía lo que viste',
      requires: { met: 'm_guia' },
      lockedHint: 'Todavía no conocés al guía',
      outcome: { next: 'm_inicio' },
    };
    expect(ChoiceSchema.safeParse(opcion).success).toBe(true);
  });

  it('rechaza una opción con roll y outcome a la vez', () => {
    const resultado = ChoiceSchema.safeParse({ id: 'trepar', label: 'Trepar', roll: tirada, outcome: { next: 'm_final' } });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => /exactamente uno/.test(issue.message))).toBe(true);
    }
  });

  it('rechaza una opción sin roll ni outcome', () => {
    expect(ChoiceSchema.safeParse({ id: 'nada', label: 'Nada' }).success).toBe(false);
  });
});
```

- [ ] **Paso 7: Correr el test y verificar que falla**

```
npx vitest run tests/content/schema.test.ts
```

Resultado esperado: los 11 tests del ciclo 1 pasan; los nuevos fallan con `TypeError: Cannot read properties of undefined (reading 'safeParse')` porque `TextSchema`, `OutcomeSchema`, `RollSchema` y `ChoiceSchema` todavía no se exportan.

- [ ] **Paso 8: Implementación mínima** → agregar al final de `src/content/schema.ts` (después de `EffectSchema`):

```ts
export const TextVariantSchema = z.object({
  when: ConditionSchema.optional(),
  text: z.string(),
});

export const ParagraphSchema = z.object({
  speaker: idSchema.optional(),
  variants: z.array(TextVariantSchema).min(1),
});

export const TextSchema = z.array(z.union([z.string(), ParagraphSchema]));

export const OutcomeSchema = z.object({
  text: TextSchema.optional(),
  effects: z.array(EffectSchema).optional(),
  next: idSchema,
});

export const RollSchema = z.object({
  attr: AttrSchema,
  difficulty: DifficultySchema,
  tags: z.array(TagSchema),
  advantageIf: ConditionSchema.optional(),
  disadvantageIf: ConditionSchema.optional(),
  outcomes: z.object({
    success: OutcomeSchema,
    partial: OutcomeSchema,
    failure: OutcomeSchema,
    crit: OutcomeSchema.optional(),
    fumble: OutcomeSchema.optional(),
  }),
});

export const ChoiceSchema = z
  .object({
    id: idSchema,
    label: z.string().min(1),
    requires: ConditionSchema.optional(),
    lockedHint: z.string().min(1).optional(),
    roll: RollSchema.optional(),
    outcome: OutcomeSchema.optional(),
  })
  .refine((choice) => (choice.roll !== undefined) !== (choice.outcome !== undefined), {
    message: 'Una opción debe tener exactamente uno de roll u outcome',
    path: ['roll'],
  });
```

El `refine` compara dos booleanos con `!==`: es un XOR. Si la opción tiene los dos campos o ninguno, falla con ese mensaje.

- [ ] **Paso 9: Correr el test y verificar que pasa**

```
npx vitest run tests/content/schema.test.ts
```

Resultado esperado: `Tests 23 passed (23)`.

- [ ] **Paso 10: Commit**

```bash
git add src/content/schema.ts tests/content/schema.test.ts
git commit -m "feat(content): esquemas zod de texto, outcome, roll y choice con regla de exclusion" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: RedirectSchema y SceneSchema (ending exige `ending` y 0 opciones)

- [ ] **Paso 11: Escribir el test que falla** → en `tests/content/schema.test.ts`, reemplazar la línea de import por:

```ts
import {
  ConditionSchema,
  EffectSchema,
  TextSchema,
  OutcomeSchema,
  RollSchema,
  ChoiceSchema,
  RedirectSchema,
  SceneSchema,
} from '@/content/schema';
```

y agregar al final del archivo:

```ts
describe('RedirectSchema', () => {
  it('acepta when + to', () => {
    expect(RedirectSchema.safeParse({ when: { flag: 'run:partio' }, to: 'm_final' }).success).toBe(true);
  });

  it('rechaza un redirect sin when', () => {
    expect(RedirectSchema.safeParse({ to: 'm_final' }).success).toBe(false);
  });
});

describe('SceneSchema', () => {
  const opcion = { id: 'partir', label: 'Partir', outcome: { next: 'm_final' } };

  it('acepta una escena normal con redirect, onEnter, npcs y opciones', () => {
    const escena: unknown = {
      id: 'm_inicio',
      kind: 'normal',
      place: 'm_claro',
      variant: 'noche',
      npcs: ['m_guia'],
      redirect: [{ when: { flag: 'run:partio' }, to: 'm_final' }],
      onEnter: [{ milestone: 'm_llegar' }],
      text: ['Llegás al claro.'],
      choices: [opcion],
    };
    expect(SceneSchema.safeParse(escena).success).toBe(true);
  });

  it('acepta una escena lethal', () => {
    const escena: unknown = { id: 'm_cripta', kind: 'normal', lethal: true, place: 'm_claro', text: ['Oscuro.'], choices: [opcion] };
    expect(SceneSchema.safeParse(escena).success).toBe(true);
  });

  it('acepta un ending con ending y sin opciones', () => {
    const escena: unknown = {
      id: 'm_final',
      kind: 'ending',
      place: 'm_claro',
      text: ['Dejás el claro atrás.'],
      choices: [],
      ending: { id: 'm_fin', epilogue: ['El sendero te lleva de vuelta.'] },
    };
    expect(SceneSchema.safeParse(escena).success).toBe(true);
  });

  it('rechaza un ending con opciones', () => {
    const escena: unknown = {
      id: 'm_final',
      kind: 'ending',
      place: 'm_claro',
      text: ['Dejás el claro atrás.'],
      choices: [opcion],
      ending: { id: 'm_fin', epilogue: ['El sendero te lleva de vuelta.'] },
    };
    const resultado = SceneSchema.safeParse(escena);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => /no puede tener opciones/.test(issue.message))).toBe(true);
    }
  });

  it('rechaza un ending sin el campo ending', () => {
    const escena: unknown = { id: 'm_final', kind: 'ending', place: 'm_claro', text: ['Fin.'], choices: [] };
    const resultado = SceneSchema.safeParse(escena);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => /necesita el campo ending/.test(issue.message))).toBe(true);
    }
  });

  it('rechaza kind y lethal con valores inválidos', () => {
    expect(SceneSchema.safeParse({ id: 'x', kind: 'boss', place: 'm_claro', text: [], choices: [] }).success).toBe(false);
    expect(SceneSchema.safeParse({ id: 'x', kind: 'normal', lethal: false, place: 'm_claro', text: [], choices: [] }).success).toBe(false);
  });
});
```

- [ ] **Paso 12: Correr el test y verificar que falla**

```
npx vitest run tests/content/schema.test.ts
```

Resultado esperado: 23 tests pasan; los 8 nuevos fallan con `TypeError: Cannot read properties of undefined (reading 'safeParse')` (no existen `RedirectSchema` ni `SceneSchema`).

- [ ] **Paso 13: Implementación mínima** → agregar al final de `src/content/schema.ts` (después de `ChoiceSchema`):

```ts
const SceneKindSchema = z.enum(['normal', 'hub', 'encounter', 'rest', 'ending']);

export const RedirectSchema = z.object({
  when: ConditionSchema,
  to: idSchema,
});

export const SceneSchema = z
  .object({
    id: idSchema,
    kind: SceneKindSchema,
    lethal: z.literal(true).optional(),
    place: idSchema,
    variant: idSchema.optional(),
    cg: idSchema.optional(),
    npcs: z.array(idSchema).optional(),
    redirect: z.array(RedirectSchema).optional(),
    onEnter: z.array(EffectSchema).optional(),
    text: TextSchema,
    choices: z.array(ChoiceSchema),
    ending: z.object({ id: idSchema, epilogue: TextSchema }).optional(),
  })
  .refine((scene) => scene.kind !== 'ending' || scene.ending !== undefined, {
    message: 'Una escena de tipo ending necesita el campo ending',
    path: ['ending'],
  })
  .refine((scene) => scene.kind !== 'ending' || scene.choices.length === 0, {
    message: 'Una escena de tipo ending no puede tener opciones',
    path: ['choices'],
  });
```

La cantidad de opciones de una escena no final (4 a 9) no se verifica acá: es la regla `r03_choices` del validador (Tarea 12), porque depende de `LIMITS` y se reporta con contexto de escena.

- [ ] **Paso 14: Correr el test y verificar que pasa**

```
npx vitest run tests/content/schema.test.ts
```

Resultado esperado: `Tests 31 passed (31)`.

- [ ] **Paso 15: Commit**

```bash
git add src/content/schema.ts tests/content/schema.test.ts
git commit -m "feat(content): esquema zod de escenas y redirects con reglas de ending" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: CampaignSchema, parseCampaign, fixture `minimal` y test de tipos

- [ ] **Paso 16: Crear el fixture** → crear `tests/fixtures/campaigns/minimal.ts` con este contenido completo:

```ts
import type { Campaign } from '@/content/schema';

// Campaña mínima válida de 3 escenas. La reutilizan los tests de las tareas
// 5 a 13. Todo id lleva el prefijo m_ para que no choque con la campaña real.
// No la modifiques: si un test necesita otra forma, cloná y modificá el clon.
export const minimal: Campaign = {
  id: 'minimal',
  contentVersion: 1,
  title: 'Campaña mínima',
  premise: 'Un claro, un guía y un risco. Solo sirve para probar el motor.',
  cover: 'minimal',
  levelRange: [1, 3],
  durationMin: [1, 2],
  lethalScenes: 0,
  lintProfile: 'smoke',
  hidden: true,
  start: 'm_inicio',
  scenes: {
    m_inicio: {
      id: 'm_inicio',
      kind: 'normal',
      place: 'm_claro',
      npcs: ['m_guia'],
      onEnter: [{ milestone: 'm_llegar' }],
      text: [
        {
          variants: [
            { when: { visited: 'm_inicio', min: 1 }, text: 'El claro otra vez. La piedra plana sigue ahí, y el sendero que sube al risco también.' },
            { text: 'Llegás a un claro entre pinos. Hay una piedra plana en el centro y un sendero que sube hacia el risco.' },
          ],
        },
        {
          speaker: 'm_guia',
          variants: [
            { when: { trait: 'aprendiz_de_escriba' }, text: '—Vos tenés cara de haber leído más de un mapa. El risco está por ahí, si te animás.' },
            { text: '—El risco está por ahí, si te animás. Yo me quedo acá abajo.' },
          ],
        },
      ],
      choices: [
        { id: 'descansar', label: 'Sentarse junto a la piedra a descansar', outcome: { next: 'm_descanso' } },
        {
          id: 'partir',
          label: 'Partir por el sendero sin mirar atrás',
          outcome: { text: ['Dejás al guía con la palabra en la boca.'], effects: [{ set: 'run:partio' }], next: 'm_final' },
        },
        {
          id: 'recoger_piedra',
          label: 'Recoger una piedra lisa del arroyo',
          outcome: { text: ['Fría y pesada. Cabe en el puño.'], effects: [{ give: 'm_piedra' }], next: 'm_inicio' },
        },
        {
          id: 'esperar',
          label: 'Esperar a que baje el sol',
          outcome: { effects: [{ clock: 'm_noche', delta: 1 }], next: 'm_inicio' },
        },
        {
          id: 'trepar',
          label: 'Trepar el risco a pulso',
          roll: {
            attr: 'vigor',
            difficulty: 'normal',
            tags: ['fisico'],
            outcomes: {
              success: { text: ['Llegás arriba sin un rasguño y ves el camino real a lo lejos.'], effects: [{ set: 'char:minimal.trepo' }], next: 'm_final' },
              partial: { text: ['Llegás arriba, pero una laja suelta te abre la mano.'], effects: [{ wound: 1 }, { set: 'char:minimal.trepo' }], next: 'm_final' },
              failure: { text: ['Resbalás a mitad de camino y caés sobre la piedra plana.'], effects: [{ wound: 1 }], next: 'm_descanso' },
            },
          },
        },
      ],
    },
    m_descanso: {
      id: 'm_descanso',
      kind: 'rest',
      place: 'm_claro',
      variant: 'noche',
      onEnter: [{ heal: 1 }, { removeCondition: 'all' }],
      text: [
        'Te sentás contra la piedra. La noche baja fría y el guía se queda callado, mirando el fuego.',
        'Cuando abrís los ojos, el dolor es menos.',
      ],
      choices: [
        { id: 'volver', label: 'Volver al centro del claro', outcome: { next: 'm_inicio' } },
        { id: 'partir', label: 'Partir por el sendero', outcome: { effects: [{ set: 'run:partio' }], next: 'm_final' } },
        { id: 'dormir', label: 'Dormir un rato más', outcome: { effects: [{ clock: 'm_noche', delta: 1 }], next: 'm_descanso' } },
        { id: 'mirar_cielo', label: 'Mirar el cielo hasta contar diez estrellas', outcome: { text: ['Contás doce.'], next: 'm_descanso' } },
      ],
    },
    m_final: {
      id: 'm_final',
      kind: 'ending',
      place: 'm_claro',
      text: ['Dejás el claro atrás. El guía no te saluda; tampoco te lo esperabas.'],
      choices: [],
      ending: {
        id: 'm_fin',
        epilogue: ['El sendero te lleva de vuelta al camino real antes del amanecer.'],
      },
    },
  },
  npcs: {
    m_guia: {
      id: 'm_guia',
      name: 'El guía',
      portrait: 'm_guia',
      voice: 'Seco, de pocas palabras; nunca pregunta dos veces.',
      canonPrompt: 'hombre mayor de barba corta, capa de lana gris, mirada cansada',
    },
  },
  places: {
    m_claro: {
      id: 'm_claro',
      name: 'El claro',
      background: 'm_claro',
      variants: { noche: 'm_claro.noche' },
      canonPrompt: 'claro entre pinos, piedra plana en el centro, sendero hacia un risco',
    },
  },
  items: {
    m_piedra: {
      id: 'm_piedra',
      name: 'Piedra lisa',
      icon: 'm_piedra',
      description: 'Una piedra del arroyo, pulida y fría. Cabe en el puño.',
      advantageTags: ['sigilo'],
    },
  },
  flags: {
    'run:partio': 'Elegiste partir sin descansar.',
    'char:minimal.trepo': 'Trepaste el risco alguna vez.',
  },
  milestones: {
    m_llegar: { label: 'Llegar al claro' },
  },
  clocks: {
    m_noche: { max: 3, label: 'La noche avanza' },
  },
  endings: {
    m_fin: { title: 'De vuelta al camino' },
  },
};
```

El fixture cumple también las reglas del validador de la Tarea 12: todo `next` existe, las escenas no finales tienen al menos 4 opciones sin `requires`, los flags `char:` llevan el prefijo `minimal.`, el `speaker` `m_guia` está en `npcs` de su escena, el párrafo con `speaker` solo reacciona a un rasgo (no a memoria) y toda `Paragraph` termina en una variante sin `when`.

- [ ] **Paso 17: Escribir el test que falla** → reemplazar `tests/content/schema.test.ts` entero por esta versión final (conserva todo lo anterior y agrega `parseCampaign`, `CampaignSchema`, `WorldContentSchema` y los tests de tipos):

```ts
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import {
  ConditionSchema,
  EffectSchema,
  TextSchema,
  OutcomeSchema,
  RollSchema,
  ChoiceSchema,
  RedirectSchema,
  SceneSchema,
  CampaignSchema,
  WorldContentSchema,
  parseCampaign,
  type Campaign,
  type FlagId,
  type WorldContent,
} from '@/content/schema';
import { minimal } from '../fixtures/campaigns/minimal';

describe('ConditionSchema', () => {
  it('acepta una condición anidada con all/any/not y todas las hojas', () => {
    const condicion: unknown = {
      all: [
        { flag: 'run:centinela_vencido' },
        { flag: 'char:prueba.vio_la_cripta' },
        { flag: 'world:caido.prueba' },
        { any: [{ class: 'mago' }, { trait: 'aprendiz_de_escriba' }, { skill: 'rastreador' }] },
        { not: { condition: 'asustado' } },
        { attr: 'saber', gte: 2 },
        { wounds: { gte: 1, lte: 2 } },
        { visited: 'p_umbral', min: 1 },
        { visited: 'p_umbral' },
        { met: 'centinela' },
        { knows: 'torre_abandonada' },
        { clock: 'pelea', gte: 1 },
        { endingSeen: 'fin_tesoro' },
        { item: 'llave_de_hierro' },
      ],
    };
    expect(ConditionSchema.safeParse(condicion).success).toBe(true);
  });

  it('rechaza un flag sin prefijo run:, char: o world:', () => {
    expect(ConditionSchema.safeParse({ flag: 'centinela_vencido' }).success).toBe(false);
  });

  it('rechaza un flag con prefijo desconocido', () => {
    expect(ConditionSchema.safeParse({ flag: 'global:centinela' }).success).toBe(false);
  });

  it('rechaza una clave desconocida', () => {
    expect(ConditionSchema.safeParse({ visitado: 'p_umbral' }).success).toBe(false);
  });

  it('rechaza ids que no están en el catálogo', () => {
    expect(ConditionSchema.safeParse({ class: 'paladin' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ trait: 'noble' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ skill: 'herrero' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ condition: 'dormido' }).success).toBe(false);
    expect(ConditionSchema.safeParse({ attr: 'fuerza', gte: 1 }).success).toBe(false);
  });

  it('rechaza una condición anidada inválida dentro de not', () => {
    expect(ConditionSchema.safeParse({ not: { flag: 'sin_prefijo' } }).success).toBe(false);
  });
});

describe('EffectSchema', () => {
  it('acepta cada tipo de efecto', () => {
    const efectos: unknown[] = [
      { set: 'run:tiene_pista' },
      { clear: 'char:prueba.vio_la_cripta' },
      { give: 'llave_de_hierro' },
      { take: 'llave_de_hierro' },
      { wound: 1 },
      { wound: 2 },
      { heal: 1 },
      { addCondition: 'asustado' },
      { removeCondition: 'perseguido' },
      { removeCondition: 'all' },
      { clock: 'pelea', delta: 1 },
      { clock: 'pelea', delta: -2 },
      { milestone: 'entrar_a_la_torre' },
      { fortune: -1 },
      { lethal: true },
    ];
    for (const efecto of efectos) {
      expect(EffectSchema.safeParse(efecto).success, JSON.stringify(efecto)).toBe(true);
    }
  });

  it('rechaza valores fuera de rango', () => {
    expect(EffectSchema.safeParse({ wound: 3 }).success).toBe(false);
    expect(EffectSchema.safeParse({ wound: 0 }).success).toBe(false);
    expect(EffectSchema.safeParse({ heal: 2 }).success).toBe(false);
    expect(EffectSchema.safeParse({ lethal: false }).success).toBe(false);
  });

  it('rechaza un flag sin prefijo en set y clear', () => {
    expect(EffectSchema.safeParse({ set: 'tiene_pista' }).success).toBe(false);
    expect(EffectSchema.safeParse({ clear: 'tiene_pista' }).success).toBe(false);
  });

  it('rechaza una condición desconocida', () => {
    expect(EffectSchema.safeParse({ addCondition: 'dormido' }).success).toBe(false);
    expect(EffectSchema.safeParse({ removeCondition: 'dormido' }).success).toBe(false);
  });

  it('rechaza un delta de reloj no entero', () => {
    expect(EffectSchema.safeParse({ clock: 'pelea', delta: 0.5 }).success).toBe(false);
  });
});

describe('TextSchema y OutcomeSchema', () => {
  it('acepta strings de narrador y párrafos con variantes', () => {
    const texto: unknown = [
      'Llegás al claro.',
      {
        variants: [
          { when: { visited: 'm_inicio', min: 1 }, text: 'El claro otra vez.' },
          { text: 'Un claro entre pinos.' },
        ],
      },
      { speaker: 'm_guia', variants: [{ text: '—Por acá.' }] },
    ];
    expect(TextSchema.safeParse(texto).success).toBe(true);
  });

  it('rechaza un párrafo sin variantes', () => {
    expect(TextSchema.safeParse([{ speaker: 'm_guia', variants: [] }]).success).toBe(false);
  });

  it('acepta un outcome con solo next y uno completo', () => {
    expect(OutcomeSchema.safeParse({ next: 'm_final' }).success).toBe(true);
    expect(
      OutcomeSchema.safeParse({ text: ['Subís.'], effects: [{ set: 'run:partio' }], next: 'm_final' }).success,
    ).toBe(true);
  });

  it('rechaza un outcome sin next', () => {
    expect(OutcomeSchema.safeParse({ text: ['Subís.'] }).success).toBe(false);
  });
});

describe('RollSchema', () => {
  const tirada: unknown = {
    attr: 'vigor',
    difficulty: 'normal',
    tags: ['fisico'],
    advantageIf: { item: 'm_piedra' },
    outcomes: {
      success: { next: 'm_final' },
      partial: { effects: [{ wound: 1 }], next: 'm_final' },
      failure: { effects: [{ wound: 1 }], next: 'm_descanso' },
    },
  };

  it('acepta una tirada con success, partial y failure', () => {
    expect(RollSchema.safeParse(tirada).success).toBe(true);
  });

  it('rechaza una tirada sin failure', () => {
    const sinFailure = {
      ...(tirada as Record<string, unknown>),
      outcomes: { success: { next: 'm_final' }, partial: { next: 'm_final' } },
    };
    expect(RollSchema.safeParse(sinFailure).success).toBe(false);
  });

  it('rechaza dificultad o tag fuera del catálogo', () => {
    expect(RollSchema.safeParse({ ...(tirada as Record<string, unknown>), difficulty: 'imposible' }).success).toBe(false);
    expect(RollSchema.safeParse({ ...(tirada as Record<string, unknown>), tags: ['cocina'] }).success).toBe(false);
  });
});

describe('ChoiceSchema', () => {
  const tirada: unknown = {
    attr: 'vigor',
    difficulty: 'normal',
    tags: ['fisico'],
    outcomes: { success: { next: 'm_final' }, partial: { next: 'm_final' }, failure: { next: 'm_descanso' } },
  };

  it('acepta una opción con outcome', () => {
    expect(ChoiceSchema.safeParse({ id: 'partir', label: 'Partir', outcome: { next: 'm_final' } }).success).toBe(true);
  });

  it('acepta una opción con roll', () => {
    expect(ChoiceSchema.safeParse({ id: 'trepar', label: 'Trepar el risco', roll: tirada }).success).toBe(true);
  });

  it('acepta requires y lockedHint', () => {
    const opcion: unknown = {
      id: 'contar',
      label: 'Contarle al guía lo que viste',
      requires: { met: 'm_guia' },
      lockedHint: 'Todavía no conocés al guía',
      outcome: { next: 'm_inicio' },
    };
    expect(ChoiceSchema.safeParse(opcion).success).toBe(true);
  });

  it('rechaza una opción con roll y outcome a la vez', () => {
    const resultado = ChoiceSchema.safeParse({ id: 'trepar', label: 'Trepar', roll: tirada, outcome: { next: 'm_final' } });
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => /exactamente uno/.test(issue.message))).toBe(true);
    }
  });

  it('rechaza una opción sin roll ni outcome', () => {
    expect(ChoiceSchema.safeParse({ id: 'nada', label: 'Nada' }).success).toBe(false);
  });
});

describe('RedirectSchema', () => {
  it('acepta when + to', () => {
    expect(RedirectSchema.safeParse({ when: { flag: 'run:partio' }, to: 'm_final' }).success).toBe(true);
  });

  it('rechaza un redirect sin when', () => {
    expect(RedirectSchema.safeParse({ to: 'm_final' }).success).toBe(false);
  });
});

describe('SceneSchema', () => {
  const opcion = { id: 'partir', label: 'Partir', outcome: { next: 'm_final' } };

  it('acepta una escena normal con redirect, onEnter, npcs y opciones', () => {
    const escena: unknown = {
      id: 'm_inicio',
      kind: 'normal',
      place: 'm_claro',
      variant: 'noche',
      npcs: ['m_guia'],
      redirect: [{ when: { flag: 'run:partio' }, to: 'm_final' }],
      onEnter: [{ milestone: 'm_llegar' }],
      text: ['Llegás al claro.'],
      choices: [opcion],
    };
    expect(SceneSchema.safeParse(escena).success).toBe(true);
  });

  it('acepta una escena lethal', () => {
    const escena: unknown = { id: 'm_cripta', kind: 'normal', lethal: true, place: 'm_claro', text: ['Oscuro.'], choices: [opcion] };
    expect(SceneSchema.safeParse(escena).success).toBe(true);
  });

  it('acepta un ending con ending y sin opciones', () => {
    const escena: unknown = {
      id: 'm_final',
      kind: 'ending',
      place: 'm_claro',
      text: ['Dejás el claro atrás.'],
      choices: [],
      ending: { id: 'm_fin', epilogue: ['El sendero te lleva de vuelta.'] },
    };
    expect(SceneSchema.safeParse(escena).success).toBe(true);
  });

  it('rechaza un ending con opciones', () => {
    const escena: unknown = {
      id: 'm_final',
      kind: 'ending',
      place: 'm_claro',
      text: ['Dejás el claro atrás.'],
      choices: [opcion],
      ending: { id: 'm_fin', epilogue: ['El sendero te lleva de vuelta.'] },
    };
    const resultado = SceneSchema.safeParse(escena);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => /no puede tener opciones/.test(issue.message))).toBe(true);
    }
  });

  it('rechaza un ending sin el campo ending', () => {
    const escena: unknown = { id: 'm_final', kind: 'ending', place: 'm_claro', text: ['Fin.'], choices: [] };
    const resultado = SceneSchema.safeParse(escena);
    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues.some((issue) => /necesita el campo ending/.test(issue.message))).toBe(true);
    }
  });

  it('rechaza kind y lethal con valores inválidos', () => {
    expect(SceneSchema.safeParse({ id: 'x', kind: 'boss', place: 'm_claro', text: [], choices: [] }).success).toBe(false);
    expect(SceneSchema.safeParse({ id: 'x', kind: 'normal', lethal: false, place: 'm_claro', text: [], choices: [] }).success).toBe(false);
  });
});

// Clon profundo del fixture: el fixture no tiene valores undefined ni funciones,
// así que el viaje por JSON es sin pérdidas. Los tests modifican el clon, nunca `minimal`.
function clonarMinimal(): Campaign {
  return JSON.parse(JSON.stringify(minimal)) as Campaign;
}

describe('parseCampaign', () => {
  it('devuelve una campaña igual al fixture minimal (y un objeto nuevo)', () => {
    const parseada = parseCampaign(minimal);
    expect(parseada).toEqual(minimal);
    expect(parseada).not.toBe(minimal);
  });

  it('CampaignSchema.safeParse acepta el fixture', () => {
    expect(CampaignSchema.safeParse(minimal).success).toBe(true);
  });

  it('falla si una opción tiene roll y outcome', () => {
    const roto = clonarMinimal();
    const trepar = roto.scenes['m_inicio']!.choices.find((choice) => choice.id === 'trepar')!;
    trepar.outcome = { next: 'm_final' };
    expect(() => parseCampaign(roto)).toThrow(/exactamente uno/);
  });

  it('falla si una opción no tiene ni roll ni outcome', () => {
    const roto = clonarMinimal();
    const partir = roto.scenes['m_inicio']!.choices.find((choice) => choice.id === 'partir')!;
    delete partir.outcome;
    expect(() => parseCampaign(roto)).toThrow(/exactamente uno/);
  });

  it('falla si un flag no tiene prefijo válido', () => {
    const roto = clonarMinimal();
    const partir = roto.scenes['m_inicio']!.choices.find((choice) => choice.id === 'partir')!;
    // El cast es deliberado: queremos un dato mal formado que TypeScript no dejaría escribir.
    partir.outcome!.effects = [{ set: 'partio' as unknown as FlagId }];
    expect(() => parseCampaign(roto)).toThrow(/run:, char: o world:/);
  });

  it('falla si un ending tiene choices', () => {
    const roto = clonarMinimal();
    roto.scenes['m_final']!.choices = [{ id: 'volver', label: 'Volver al claro', outcome: { next: 'm_inicio' } }];
    expect(() => parseCampaign(roto)).toThrow(/no puede tener opciones/);
  });

  it('falla si falta un campo obligatorio de la meta', () => {
    const { start: _start, ...sinStart } = clonarMinimal();
    expect(() => parseCampaign(sinStart)).toThrow();
  });

  it('falla con datos que no son un objeto', () => {
    expect(() => parseCampaign(null)).toThrow();
    expect(() => parseCampaign('minimal')).toThrow();
  });

  it('no muta la entrada', () => {
    const copia = clonarMinimal();
    parseCampaign(copia);
    expect(copia).toEqual(minimal);
  });
});

describe('WorldContentSchema', () => {
  it('acepta un mundo vacío y uno con contenido', () => {
    const vacio: unknown = { npcs: {}, places: {}, items: {}, flags: {} };
    expect(WorldContentSchema.safeParse(vacio).success).toBe(true);
    const conContenido: unknown = {
      npcs: { orell: { id: 'orell', name: 'Orell', portrait: 'orell', voice: 'Grave.', canonPrompt: 'sargento de barba gris' } },
      places: {},
      items: { sello_del_vado: { id: 'sello_del_vado', name: 'Sello del vado', icon: 'sello', description: 'Frío.', relic: true } },
      flags: { 'char:met.*': 'PNJ conocidos' },
    };
    expect(WorldContentSchema.safeParse(conContenido).success).toBe(true);
  });

  it('rechaza un mundo sin flags', () => {
    expect(WorldContentSchema.safeParse({ npcs: {}, places: {}, items: {} }).success).toBe(false);
  });
});

describe('tipos inferidos por zod', () => {
  it('z.infer<typeof CampaignSchema> y Campaign son intercambiables', () => {
    expectTypeOf<z.infer<typeof CampaignSchema>>().toMatchTypeOf<Campaign>();
    expectTypeOf<Campaign>().toMatchTypeOf<z.infer<typeof CampaignSchema>>();
  });

  it('z.infer<typeof WorldContentSchema> y WorldContent son intercambiables', () => {
    expectTypeOf<z.infer<typeof WorldContentSchema>>().toMatchTypeOf<WorldContent>();
    expectTypeOf<WorldContent>().toMatchTypeOf<z.infer<typeof WorldContentSchema>>();
  });

  it('parseCampaign devuelve Campaign', () => {
    expectTypeOf(parseCampaign).returns.toEqualTypeOf<Campaign>();
  });
});
```

- [ ] **Paso 18: Correr el test y verificar que falla**

```
npx vitest run tests/content/schema.test.ts
```

Resultado esperado: los 31 tests anteriores pasan; los de `parseCampaign` fallan con `TypeError: parseCampaign is not a function`, los de `WorldContentSchema` y `CampaignSchema.safeParse` con `TypeError: Cannot read properties of undefined (reading 'safeParse')`. Los tres tests de tipos "pasan" en runtime (no hacen nada en ejecución); su verificación real es el paso 20.

- [ ] **Paso 19: Implementación mínima** → agregar al final de `src/content/schema.ts` (después de `SceneSchema`):

```ts
export const NpcSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  portrait: idSchema,
  voice: z.string(),
  canonPrompt: z.string(),
});

export const PlaceSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  background: idSchema,
  variants: z.record(z.string(), z.string()).optional(),
  canonPrompt: z.string(),
});

export const ItemSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  icon: idSchema,
  description: z.string(),
  advantageTags: z.array(TagSchema).optional(),
  relic: z.literal(true).optional(),
});

export const CampaignMetaSchema = z.object({
  id: idSchema,
  contentVersion: z.number().int().min(1),
  title: z.string().min(1),
  premise: z.string(),
  cover: idSchema,
  levelRange: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  durationMin: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  lethalScenes: z.number().int().min(0),
  lintProfile: z.enum(['smoke', 'release']),
  hidden: z.literal(true).optional(),
});

export const CampaignSchema = CampaignMetaSchema.extend({
  start: idSchema,
  scenes: z.record(z.string(), SceneSchema),
  npcs: z.record(z.string(), NpcSchema),
  places: z.record(z.string(), PlaceSchema),
  items: z.record(z.string(), ItemSchema),
  flags: z.record(z.string(), z.string()),
  milestones: z.record(z.string(), z.object({ label: z.string().min(1) })),
  clocks: z.record(z.string(), z.object({ max: z.number().int().min(1), label: z.string().min(1) })),
  endings: z.record(
    z.string(),
    z.object({
      title: z.string().min(1),
      hidden: z.literal(true).optional(),
      reward: z.array(EffectSchema).optional(),
    }),
  ),
});

export const WorldContentSchema = z.object({
  npcs: z.record(z.string(), NpcSchema),
  places: z.record(z.string(), PlaceSchema),
  items: z.record(z.string(), ItemSchema),
  flags: z.record(z.string(), z.string()),
});

export function parseCampaign(data: unknown): Campaign {
  return CampaignSchema.parse(data);
}
```

Para control, este es el **archivo `src/content/schema.ts` completo** al terminar el paso (debe coincidir con la suma de los pasos 3, 8, 13 y 19):

```ts
import { z } from 'zod';
import {
  ATTRS,
  TAGS,
  DIFFICULTIES,
  CLASSES,
  TRAITS,
  SKILLS,
  CONDITIONS,
  type Attr,
  type Tag,
  type Difficulty,
  type ClassId,
  type TraitId,
  type SkillId,
  type ConditionId,
} from '@/content/catalog';

// ---------------------------------------------------------------------------
// Tipos de contenido (escritos a mano; los esquemas zod de abajo los espejan y
// un test con expectTypeOf comprueba que coinciden en los dos sentidos).
// ---------------------------------------------------------------------------

export type FlagId = `run:${string}` | `char:${string}` | `world:${string}`;

export type SceneKind = 'normal' | 'hub' | 'encounter' | 'rest' | 'ending';

export type Condition =
  | { flag: FlagId }
  | { not: Condition }
  | { all: Condition[] }
  | { any: Condition[] }
  | { class: ClassId }
  | { trait: TraitId }
  | { skill: SkillId }
  | { item: string }
  | { attr: Attr; gte: number }
  | { wounds: { gte?: number; lte?: number } }
  | { condition: ConditionId }
  | { visited: string; min?: number }
  | { met: string }
  | { knows: string }
  | { clock: string; gte: number }
  | { endingSeen: string };

export type Effect =
  | { set: FlagId }
  | { clear: FlagId }
  | { give: string }
  | { take: string }
  | { wound: 1 | 2 }
  | { heal: 1 }
  | { addCondition: ConditionId }
  | { removeCondition: ConditionId | 'all' }
  | { clock: string; delta: number }
  | { milestone: string }
  | { fortune: number }
  | { lethal: true };

export interface TextVariant {
  when?: Condition;
  text: string;
}

export interface Paragraph {
  speaker?: string;
  variants: TextVariant[];
}

export type Text = (string | Paragraph)[];

export interface Outcome {
  text?: Text;
  effects?: Effect[];
  next: string;
}

export interface Roll {
  attr: Attr;
  difficulty: Difficulty;
  tags: Tag[];
  advantageIf?: Condition;
  disadvantageIf?: Condition;
  outcomes: { success: Outcome; partial: Outcome; failure: Outcome; crit?: Outcome; fumble?: Outcome };
}

export interface Choice {
  id: string;
  label: string;
  requires?: Condition;
  lockedHint?: string;
  roll?: Roll;
  outcome?: Outcome;
}

export interface Redirect {
  when: Condition;
  to: string;
}

// Orden fijo del motor (Tarea 9): enter resuelve `redirect` sobre el estado de
// entrada; aplica `onEnter` de la escena final; render evalúa `when`, `requires`
// y `advantageIf` contra ese estado (todavía sin la memoria de esta escena); al
// elegir se deriva la memoria (visited, met, place, párrafos vistos), se aplican
// efectos y se entra a la siguiente escena.
export interface Scene {
  id: string;
  kind: SceneKind;
  lethal?: true;
  place: string;
  variant?: string;
  cg?: string;
  npcs?: string[];
  redirect?: Redirect[];
  onEnter?: Effect[];
  text: Text;
  choices: Choice[];
  ending?: { id: string; epilogue: Text };
}

export interface Npc {
  id: string;
  name: string;
  portrait: string;
  voice: string;
  canonPrompt: string;
}

export interface Place {
  id: string;
  name: string;
  background: string;
  variants?: Record<string, string>;
  canonPrompt: string;
}

export interface Item {
  id: string;
  name: string;
  icon: string;
  description: string;
  advantageTags?: Tag[];
  relic?: true;
}

export interface CampaignMeta {
  id: string;
  contentVersion: number;
  title: string;
  premise: string;
  cover: string;
  levelRange: [number, number];
  durationMin: [number, number];
  lethalScenes: number;
  lintProfile: 'smoke' | 'release';
  hidden?: true;
}

export interface Campaign extends CampaignMeta {
  start: string;
  scenes: Record<string, Scene>;
  npcs: Record<string, Npc>;
  places: Record<string, Place>;
  items: Record<string, Item>;
  flags: Record<string, string>;
  milestones: Record<string, { label: string }>;
  clocks: Record<string, { max: number; label: string }>;
  endings: Record<string, { title: string; hidden?: true; reward?: Effect[] }>;
}

export interface WorldContent {
  npcs: Record<string, Npc>;
  places: Record<string, Place>;
  items: Record<string, Item>;
  flags: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Esquemas zod espejo
// ---------------------------------------------------------------------------

const FLAG_REGEX = /^(run|char|world):/;

export const FlagIdSchema = z.custom<FlagId>(
  (value) => typeof value === 'string' && FLAG_REGEX.test(value),
  { message: 'El flag debe empezar con run:, char: o world:' },
);

const AttrSchema = z.enum(ATTRS);
const TagSchema = z.enum(TAGS);
const DifficultySchema = z.enum(Object.keys(DIFFICULTIES) as [Difficulty, ...Difficulty[]]);
const ClassIdSchema = z.enum(Object.keys(CLASSES) as [ClassId, ...ClassId[]]);
const TraitIdSchema = z.enum(Object.keys(TRAITS) as [TraitId, ...TraitId[]]);
const SkillIdSchema = z.enum(Object.keys(SKILLS) as [SkillId, ...SkillId[]]);
const ConditionIdSchema = z.enum(Object.keys(CONDITIONS) as [ConditionId, ...ConditionId[]]);

const idSchema = z.string().min(1);

export const ConditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ flag: FlagIdSchema }),
    z.object({ not: ConditionSchema }),
    z.object({ all: z.array(ConditionSchema) }),
    z.object({ any: z.array(ConditionSchema) }),
    z.object({ class: ClassIdSchema }),
    z.object({ trait: TraitIdSchema }),
    z.object({ skill: SkillIdSchema }),
    z.object({ item: idSchema }),
    z.object({ attr: AttrSchema, gte: z.number().int() }),
    z.object({ wounds: z.object({ gte: z.number().int().optional(), lte: z.number().int().optional() }) }),
    z.object({ condition: ConditionIdSchema }),
    z.object({ visited: idSchema, min: z.number().int().min(1).optional() }),
    z.object({ met: idSchema }),
    z.object({ knows: idSchema }),
    z.object({ clock: idSchema, gte: z.number().int() }),
    z.object({ endingSeen: idSchema }),
  ]),
);

export const EffectSchema = z.union([
  z.object({ set: FlagIdSchema }),
  z.object({ clear: FlagIdSchema }),
  z.object({ give: idSchema }),
  z.object({ take: idSchema }),
  z.object({ wound: z.union([z.literal(1), z.literal(2)]) }),
  z.object({ heal: z.literal(1) }),
  z.object({ addCondition: ConditionIdSchema }),
  z.object({ removeCondition: z.union([ConditionIdSchema, z.literal('all')]) }),
  z.object({ clock: idSchema, delta: z.number().int() }),
  z.object({ milestone: idSchema }),
  z.object({ fortune: z.number().int() }),
  z.object({ lethal: z.literal(true) }),
]);

export const TextVariantSchema = z.object({
  when: ConditionSchema.optional(),
  text: z.string(),
});

export const ParagraphSchema = z.object({
  speaker: idSchema.optional(),
  variants: z.array(TextVariantSchema).min(1),
});

export const TextSchema = z.array(z.union([z.string(), ParagraphSchema]));

export const OutcomeSchema = z.object({
  text: TextSchema.optional(),
  effects: z.array(EffectSchema).optional(),
  next: idSchema,
});

export const RollSchema = z.object({
  attr: AttrSchema,
  difficulty: DifficultySchema,
  tags: z.array(TagSchema),
  advantageIf: ConditionSchema.optional(),
  disadvantageIf: ConditionSchema.optional(),
  outcomes: z.object({
    success: OutcomeSchema,
    partial: OutcomeSchema,
    failure: OutcomeSchema,
    crit: OutcomeSchema.optional(),
    fumble: OutcomeSchema.optional(),
  }),
});

export const ChoiceSchema = z
  .object({
    id: idSchema,
    label: z.string().min(1),
    requires: ConditionSchema.optional(),
    lockedHint: z.string().min(1).optional(),
    roll: RollSchema.optional(),
    outcome: OutcomeSchema.optional(),
  })
  .refine((choice) => (choice.roll !== undefined) !== (choice.outcome !== undefined), {
    message: 'Una opción debe tener exactamente uno de roll u outcome',
    path: ['roll'],
  });

const SceneKindSchema = z.enum(['normal', 'hub', 'encounter', 'rest', 'ending']);

export const RedirectSchema = z.object({
  when: ConditionSchema,
  to: idSchema,
});

export const SceneSchema = z
  .object({
    id: idSchema,
    kind: SceneKindSchema,
    lethal: z.literal(true).optional(),
    place: idSchema,
    variant: idSchema.optional(),
    cg: idSchema.optional(),
    npcs: z.array(idSchema).optional(),
    redirect: z.array(RedirectSchema).optional(),
    onEnter: z.array(EffectSchema).optional(),
    text: TextSchema,
    choices: z.array(ChoiceSchema),
    ending: z.object({ id: idSchema, epilogue: TextSchema }).optional(),
  })
  .refine((scene) => scene.kind !== 'ending' || scene.ending !== undefined, {
    message: 'Una escena de tipo ending necesita el campo ending',
    path: ['ending'],
  })
  .refine((scene) => scene.kind !== 'ending' || scene.choices.length === 0, {
    message: 'Una escena de tipo ending no puede tener opciones',
    path: ['choices'],
  });

export const NpcSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  portrait: idSchema,
  voice: z.string(),
  canonPrompt: z.string(),
});

export const PlaceSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  background: idSchema,
  variants: z.record(z.string(), z.string()).optional(),
  canonPrompt: z.string(),
});

export const ItemSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  icon: idSchema,
  description: z.string(),
  advantageTags: z.array(TagSchema).optional(),
  relic: z.literal(true).optional(),
});

export const CampaignMetaSchema = z.object({
  id: idSchema,
  contentVersion: z.number().int().min(1),
  title: z.string().min(1),
  premise: z.string(),
  cover: idSchema,
  levelRange: z.tuple([z.number().int().min(1), z.number().int().min(1)]),
  durationMin: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
  lethalScenes: z.number().int().min(0),
  lintProfile: z.enum(['smoke', 'release']),
  hidden: z.literal(true).optional(),
});

export const CampaignSchema = CampaignMetaSchema.extend({
  start: idSchema,
  scenes: z.record(z.string(), SceneSchema),
  npcs: z.record(z.string(), NpcSchema),
  places: z.record(z.string(), PlaceSchema),
  items: z.record(z.string(), ItemSchema),
  flags: z.record(z.string(), z.string()),
  milestones: z.record(z.string(), z.object({ label: z.string().min(1) })),
  clocks: z.record(z.string(), z.object({ max: z.number().int().min(1), label: z.string().min(1) })),
  endings: z.record(
    z.string(),
    z.object({
      title: z.string().min(1),
      hidden: z.literal(true).optional(),
      reward: z.array(EffectSchema).optional(),
    }),
  ),
});

export const WorldContentSchema = z.object({
  npcs: z.record(z.string(), NpcSchema),
  places: z.record(z.string(), PlaceSchema),
  items: z.record(z.string(), ItemSchema),
  flags: z.record(z.string(), z.string()),
});

export function parseCampaign(data: unknown): Campaign {
  return CampaignSchema.parse(data);
}
```

Sobre los tipos: `parseCampaign` declara que devuelve `Campaign` y adentro devuelve `z.infer<typeof CampaignSchema>`. Si algún esquema se desvía del tipo escrito a mano (por ejemplo, si `lethal` se escribiera como `z.boolean()`), `tsc` falla en esa línea o en los `expectTypeOf` del test: esa es la red que garantiza que tipo y esquema no se separen.

- [ ] **Paso 20: Correr el test y verificar que pasa**

```
npx vitest run tests/content/schema.test.ts
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: `Tests 45 passed (45)` y `tsc` termina sin salida ni errores (los `expectTypeOf` compilan en los dos sentidos). Si `tsc` reporta `Cannot find name 'expectTypeOf'` o no reporta nada de `tests/`, el `include` del `tsconfig.json` no abarca la carpeta `tests` (con la tarea 1 debería ser `["src", "tests", "tools"]`): volvé a la nota previa 3.

- [ ] **Paso 21: Commit**

```bash
git add src/content/schema.ts tests/content/schema.test.ts tests/fixtures/campaigns/minimal.ts
git commit -m "feat(content): CampaignSchema, parseCampaign y fixture de campania minimal" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Solo si tuviste que modificar `tsconfig.json` en la nota previa 3 (no debería pasar con la tarea 1 hecha), agregalo al `git add` de este commit.

---

#### Verificación de la tarea

- [ ] **Paso 22: Verificación completa**

```
npx vitest run
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: todos los archivos de test del repo en verde (los de las tareas 1 y 2 más los 45 de esta) y `tsc` sin errores.

**Criterio de aceptación:** `parseCampaign(minimal)` devuelve un objeto nuevo igual al fixture; una opción con `roll` y `outcome`, un flag sin prefijo `run:`/`char:`/`world:` o una escena `ending` con opciones hacen que `parseCampaign` lance un error con mensaje en español; y `tsc` acepta que `z.infer<typeof CampaignSchema>` y `Campaign` son asignables en ambos sentidos.

---

### Tarea 4: Dados deterministas y probabilidades exactas (dice.ts, rng.ts)

**Contexto para quien no conoce el proyecto.** "Crónicas del Vado" resuelve cada acción con una tirada de **2d6 + modificador**: 10 o más es Éxito, 7 a 9 es Éxito con costo ("partial"), 6 o menos es Fallo. Los **naturales priman**: un doble 6 en los dados conservados siempre es Crítico y un doble 1 siempre es Fallo grave ("fumble"), sin importar el modificador. Con **ventaja** se tiran 3d6 y se conservan los 2 mayores; con **desventaja**, los 2 menores; si hay ventaja y desventaja a la vez se anulan (`'cancelled'`) y se tiran 2d6 normales. Antes de tirar, la UI muestra la probabilidad **exacta** de cada banda (enumerando los 36 o 216 casos posibles) y una etiqueta de riesgo. Los dados no salen de `Math.random()`: se derivan de un hash determinista de (semilla de la partida, escena, opción, visitas, intento), así recargar la página y repetir la misma opción da los mismos dados. Esta tarea implementa exactamente eso, sin tocar estado ni contenido.

Esta tarea también crea `src/engine/types.ts`, el archivo de tipos del motor (sección E del contrato). No tiene lógica: `dice.ts` necesita `RollMode`, `Band` y `Risk` de ahí, y todas las tareas siguientes del motor lo importan.

**Archivos:**
- Crear: `src/engine/types.ts` (tipos del estado y de la salida del motor; solo tipos)
- Crear: `src/engine/dice.ts` (bandas, probabilidades exactas, etiqueta de riesgo, línea de objetivo)
- Crear: `src/engine/rng.ts` (FNV-1a, mulberry32, dados deterministas, semilla nueva)
- Test: `tests/engine/dice.test.ts`
- Test: `tests/engine/rng.test.ts`

**Interfaces:**
- Consume (solo tipos, con `import type`):
  - De `@/content/catalog` (Tarea 2): `type Attr`, `type ClassId`, `type TraitId`, `type SkillId`, `type ConditionId`, `type Difficulty`.
  - De `@/content/schema` (Tarea 3): `type Campaign`, `type SceneKind`.
  - `dice.ts` y `rng.ts` no consumen ninguna función de tareas anteriores.
- Produce:
  - `src/engine/types.ts`: todos los tipos de la sección E del contrato, con esos nombres exactos: `Fallen`, `WorldState`, `CampaignLogEntry`, `Character`, `RollMode`, `Band`, `Risk`, `ResolvedParagraph`, `LogEntry`, `RunOutcome`, `PendingPersisted`, `Run`, `SeenMap`, `GameState`, `EvalContext`, `RollSource`, `RollPreview`, `RenderedChoice`, `RenderedScene`, `PendingRoll`, `EndSummary`.
  - `src/engine/dice.ts`:
    - `export interface BandOdds { crit: number; success: number; partial: number; failure: number; fumble: number }` (nuevo: nombre para el retorno de `bandOdds`)
    - `export interface Odds { success: number; partial: number; failure: number }` (nuevo: nombre para el retorno de `odds` y el parámetro de `riskLabel`; es estructuralmente igual a `RollPreview['odds']`)
    - `export function keepDice(dice: number[], mode: RollMode): number[]` → índices conservados (siempre 2, en orden ascendente de índice)
    - `export function classify(kept: number[], totalMod: number): Band` → `kept` son VALORES de los dados conservados
    - `export function bandOdds(totalMod: number, mode: RollMode): BandOdds`
    - `export function odds(totalMod: number, mode: RollMode): Odds`
    - `export function riskLabel(o: Odds): Risk`
    - `export function targetLine(totalMod: number): string`
  - `src/engine/rng.ts`:
    - `export function hash32(...parts: (string | number)[]): number`
    - `export function mulberry32(seed: number): () => number`
    - `export function rollDice(seed: number, sceneId: string, choiceId: string, visits: number, attempt: number, count: number): number[]`
    - `export function newSeed(entropy: string): number`

**Decisiones fijadas en esta tarea (las tareas 9 y 10 dependen de ellas):**
- `keepDice` devuelve **índices**, no valores. `classify` recibe **valores**. Quien tira hace `keepDice(dice, mode).map((i) => dice[i])` para obtener los valores conservados.
- `PendingRoll.kept` y `LogEntry('roll').kept` guardan **índices** (exactamente lo que devuelve `keepDice`), no valores: la tarea 10 hace `kept = keepDice(dice, mode)` y la 14 (RollPanel) resalta el dado `i` con `pending.kept.includes(i)`.
- Desempate de `keepDice`: entre dados de igual valor se conserva el de **menor índice**; el resultado siempre se devuelve ordenado de menor a mayor índice. Ejemplo: `[3, 5, 3]` con ventaja → `[0, 1]`; con desventaja → `[0, 2]`.
- `hash32` corre FNV-1a de 32 bits sobre los code units UTF-16 de `parts.join('|')` (`charCodeAt`), sin pasar por UTF-8. `hash32('a')` es el vector conocido `0xe40c292c` = `3826002220`.
- `targetLine(m)` devuelve exactamente: `Necesitás {10-m}+ en los dados para éxito, {7-m}+ con costo · doble 1 siempre falla · doble 6 siempre crítico`.

---

#### Ciclo 1: tipos del motor, `keepDice` y `classify`

- [ ] **Paso 1: Escribir el test que falla** → crear `tests/engine/dice.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import { classify, keepDice } from '@/engine/dice';

describe('keepDice', () => {
  it('normal y cancelled conservan siempre los índices 0 y 1', () => {
    expect(keepDice([1, 6], 'normal')).toEqual([0, 1]);
    expect(keepDice([1, 6], 'cancelled')).toEqual([0, 1]);
    expect(keepDice([1, 6, 3], 'normal')).toEqual([0, 1]);
  });

  it('advantage conserva los índices de los dos mayores', () => {
    expect(keepDice([2, 6, 4], 'advantage')).toEqual([1, 2]);
    expect(keepDice([6, 1, 5], 'advantage')).toEqual([0, 2]);
    expect(keepDice([1, 2, 6], 'advantage')).toEqual([1, 2]);
  });

  it('disadvantage conserva los índices de los dos menores', () => {
    expect(keepDice([2, 6, 4], 'disadvantage')).toEqual([0, 2]);
    expect(keepDice([6, 1, 5], 'disadvantage')).toEqual([1, 2]);
    expect(keepDice([1, 2, 6], 'disadvantage')).toEqual([0, 1]);
  });

  it('con empates elige el índice menor y devuelve los índices ordenados', () => {
    expect(keepDice([3, 5, 3], 'advantage')).toEqual([0, 1]);
    expect(keepDice([3, 5, 3], 'disadvantage')).toEqual([0, 2]);
    expect(keepDice([4, 4, 4], 'advantage')).toEqual([0, 1]);
    expect(keepDice([4, 4, 4], 'disadvantage')).toEqual([0, 1]);
    expect(keepDice([5, 3, 5], 'advantage')).toEqual([0, 2]);
  });

  it('con dos dados en advantage o disadvantage conserva ambos', () => {
    expect(keepDice([2, 5], 'advantage')).toEqual([0, 1]);
    expect(keepDice([2, 5], 'disadvantage')).toEqual([0, 1]);
  });

  it('no muta la entrada y devuelve un array nuevo', () => {
    const dice = [3, 5, 3];
    const copia = [...dice];
    const kept = keepDice(dice, 'advantage');
    expect(dice).toEqual(copia);
    expect(kept).not.toBe(dice);
  });
});

describe('classify', () => {
  it('clasifica por el total (suma de conservados + modificador)', () => {
    expect(classify([5, 5], 0)).toBe('success'); // 10
    expect(classify([6, 5], 0)).toBe('success'); // 11
    expect(classify([4, 5], 1)).toBe('success'); // 10
    expect(classify([4, 3], 0)).toBe('partial'); // 7
    expect(classify([4, 5], 0)).toBe('partial'); // 9
    expect(classify([1, 2], 5)).toBe('partial'); // 8
    expect(classify([3, 3], 0)).toBe('failure'); // 6
    expect(classify([6, 3], -3)).toBe('failure'); // 6
    expect(classify([1, 2], 0)).toBe('failure'); // 3
  });

  it('doble 6 natural es crit aunque el total sea bajo', () => {
    expect(classify([6, 6], -5)).toBe('crit');
    expect(classify([6, 6], 0)).toBe('crit');
  });

  it('doble 1 natural es fumble aunque el total sea alto', () => {
    expect(classify([1, 1], 9)).toBe('fumble');
    expect(classify([1, 1], 0)).toBe('fumble');
  });

  it('otros dobles no son naturales', () => {
    expect(classify([5, 5], 0)).toBe('success');
    expect(classify([4, 4], 0)).toBe('partial');
    expect(classify([2, 2], 0)).toBe('failure');
  });

  it('no muta la entrada', () => {
    const kept = [6, 6];
    classify(kept, 0);
    expect(kept).toEqual([6, 6]);
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/dice.test.ts
```

Resultado esperado: el archivo de test falla al cargar con un error del tipo `Error: Failed to resolve import "@/engine/dice" from "tests/engine/dice.test.ts". Does the file exist?` (el módulo todavía no existe). Si en cambio ves `Cannot find module`, es el mismo problema con otro texto.

- [ ] **Paso 3: Implementación mínima (parte 1: tipos)** → crear `src/engine/types.ts` con este contenido completo (es la sección E del contrato, sin cambios de nombres):

```ts
import type { Attr, ClassId, TraitId, SkillId, ConditionId, Difficulty } from '@/content/catalog';
import type { Campaign, SceneKind } from '@/content/schema';

/** Personaje muerto en una campaña; vive en el perfil (world.fallen). */
export interface Fallen {
  name: string;
  classId: ClassId;
  level: number;
  campaign: string;
  scene: string;
}

/** Estado del mundo (perfil): flags `world:` y Caídos. */
export interface WorldState {
  flags: string[];
  fallen: Fallen[];
}

export interface CampaignLogEntry {
  runs: number;
  wins: number;
  endings: string[];
  milestones: string[];
  canonEnding?: string;
}

export interface Character {
  id: string;
  name: string;
  portrait: string;
  classId: ClassId;
  attrs: Record<Attr, number>;
  traits: TraitId[];
  skills: SkillId[];
  level: number;
  xp: number;
  /** Flags `char:`. */
  flags: string[];
  memoryNames: Record<string, { name: string; campaign: string }>;
  relics: string[];
  /** Reservado para la v2. */
  scars: string[];
  campaignLog: Record<string, CampaignLogEntry>;
  run: Run | null;
  dead?: { campaign: string; scene: string };
}

/** cancelled = había ventaja y desventaja a la vez: se anulan y se tiran 2d6. */
export type RollMode = 'normal' | 'advantage' | 'disadvantage' | 'cancelled';

export type Band = 'crit' | 'success' | 'partial' | 'failure' | 'fumble';

export type Risk = 'seguro' | 'arriesgado' | 'peligroso';

export interface ResolvedParagraph {
  speaker?: string;
  text: string;
}

export type LogEntry =
  | { kind: 'scene'; sceneId: string; paragraphs: ResolvedParagraph[]; hashes: string[] }
  | { kind: 'choice'; sceneId: string; choiceId: string; label: string }
  /** `kept` son ÍNDICES dentro de `dice` (lo que devuelve keepDice); los valores son kept.map((i) => dice[i]). */
  | { kind: 'roll'; dice: number[]; kept: number[]; mode: RollMode; total: number; band: Band; fortuneSpent: number; powerUsed: boolean }
  | { kind: 'outcome'; paragraphs: ResolvedParagraph[] };

export type RunOutcome = { kind: 'ending'; endingId: string } | { kind: 'defeat' } | { kind: 'death' };

/** Tupla mínima persistida al mostrar los dados; rerolls = índices de dado repetidos, en orden. */
export interface PendingPersisted {
  choiceId: string;
  rerolls: number[];
  powerUsed: boolean;
}

export interface Run {
  campaignId: string;
  contentVersion: number;
  sceneId: string;
  /** Flags `run:`. */
  flags: string[];
  /** Flags `char:<campaña>.*` y `world:<campaña>.*` apostados hasta terminar por un final. */
  stagedFlags: string[];
  visited: Record<string, number>;
  items: string[];
  wounds: 0 | 1 | 2 | 3;
  conditions: ConditionId[];
  fortune: number;
  powerUsed: boolean;
  clocks: Record<string, number>;
  milestones: string[];
  log: LogEntry[];
  rngSeed: number;
  pending?: PendingPersisted;
  outcome?: RunOutcome;
}

/** sceneId → hashes de párrafo vistos (de la campaña actual). */
export type SeenMap = Record<string, string[]>;

export interface GameState {
  world: WorldState;
  character: Character;
  run: Run;
  seen: SeenMap;
}

export interface EvalContext {
  campaign: Campaign;
  state: GameState;
}

export interface RollSource {
  kind: 'advantage' | 'disadvantage';
  label: string;
  origin: 'trait' | 'skill' | 'item' | 'class' | 'condition' | 'wound' | 'scene';
  cancelled: boolean;
}

export interface RollPreview {
  attr: Attr;
  attrValue: number;
  difficulty: Difficulty;
  difficultyMod: number;
  veteranMod: number;
  totalMod: number;
  mode: RollMode;
  sources: RollSource[];
  odds: { success: number; partial: number; failure: number };
  risk: Risk;
  targetLine: string;
}

export interface RenderedChoice {
  id: string;
  label: string;
  visible: boolean;
  enabled: boolean;
  badge?: string;
  lockedHint?: string;
  preview?: RollPreview;
  leadsToLethal: boolean;
  alreadySeen: boolean;
}

export interface RenderedScene {
  sceneId: string;
  kind: SceneKind;
  lethal: boolean;
  place: string;
  variant?: string;
  cg?: string;
  portraitNpc?: string;
  paragraphs: ResolvedParagraph[];
  choices: RenderedChoice[];
  ending?: { id: string; title: string; epilogue: ResolvedParagraph[] };
}

export interface PendingRoll {
  choiceId: string;
  sceneId: string;
  preview: RollPreview;
  dice: number[];
  /** Índices (dentro de `dice`) de los 2 dados conservados, como devuelve keepDice; los valores son kept.map((i) => dice[i]). */
  kept: number[];
  total: number;
  band: Band;
  /** Índices de dado repetidos con Fortuna, en orden. */
  rerolls: number[];
  powerUsed: boolean;
  canReroll: boolean;
  canUsePower: boolean;
}

export interface EndSummary {
  outcome: RunOutcome;
  canonFlags: string[];
  discardedFlags: string[];
}
```

- [ ] **Paso 4: Implementación mínima (parte 2: dice.ts)** → crear `src/engine/dice.ts` con este contenido completo:

```ts
import type { Band, Risk, RollMode } from '@/engine/types';

/** Probabilidad exacta de cada banda (fracciones sobre 36 o 216 casos). */
export interface BandOdds {
  crit: number;
  success: number;
  partial: number;
  failure: number;
  fumble: number;
}

/** Las tres bandas que ve el jugador: success = crit + success, failure = failure + fumble. */
export interface Odds {
  success: number;
  partial: number;
  failure: number;
}

/**
 * Índices de los dados que se conservan (siempre 2, ordenados de menor a mayor índice).
 * advantage → los 2 mayores; disadvantage → los 2 menores; normal/cancelled → [0, 1].
 * Empates: gana el índice menor. No muta `dice`.
 */
export function keepDice(dice: number[], mode: RollMode): number[] {
  if (mode !== 'advantage' && mode !== 'disadvantage') return [0, 1];
  const direction = mode === 'advantage' ? -1 : 1;
  const ordered = dice
    .map((_, index) => index)
    .sort((a, b) => {
      const byValue = ((dice[a] ?? 0) - (dice[b] ?? 0)) * direction;
      return byValue !== 0 ? byValue : a - b;
    });
  return ordered.slice(0, 2).sort((a, b) => a - b);
}

/**
 * Banda de una tirada. `kept` son los VALORES de los 2 dados conservados.
 * Los naturales priman: [6, 6] → crit y [1, 1] → fumble sin mirar el total.
 * Luego total = suma + totalMod: ≥ 10 success, 7-9 partial, ≤ 6 failure.
 */
export function classify(kept: number[], totalMod: number): Band {
  const isDouble = (face: number): boolean => kept.length === 2 && kept.every((d) => d === face);
  if (isDouble(6)) return 'crit';
  if (isDouble(1)) return 'fumble';
  const total = kept.reduce((sum, d) => sum + d, 0) + totalMod;
  if (total >= 10) return 'success';
  if (total >= 7) return 'partial';
  return 'failure';
}
```

- [ ] **Paso 5: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/dice.test.ts
```

Resultado esperado: `Test Files 1 passed (1)` y `Tests 11 passed (11)` (6 de `keepDice` + 5 de `classify`).

- [ ] **Paso 6: Commit**

```bash
git add src/engine/types.ts src/engine/dice.ts tests/engine/dice.test.ts
git commit -m "feat(engine): tipos del motor, keepDice y classify con naturales que priman" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 2: probabilidades exactas (`bandOdds`, `odds`)

- [ ] **Paso 7: Escribir el test que falla** → en `tests/engine/dice.test.ts`, reemplazar la segunda línea (el `import` de `@/engine/dice`) por:

```ts
import { bandOdds, classify, keepDice, odds } from '@/engine/dice';
```

y agregar al final del archivo (después del `describe('classify', …)`) este bloque:

```ts
/** Porcentaje redondeado a un decimal, como lo muestra la UI. */
const pct = (p: number): number => Math.round(p * 1000) / 10;

describe('bandOdds', () => {
  it('normal: fracciones exactas sobre 36 casos', () => {
    const b = bandOdds(0, 'normal');
    expect(b.crit).toBe(1 / 36);
    expect(b.success).toBe(5 / 36);
    expect(b.partial).toBe(15 / 36);
    expect(b.failure).toBe(14 / 36);
    expect(b.fumble).toBe(1 / 36);
  });

  it('cancelled se calcula igual que normal', () => {
    expect(bandOdds(0, 'cancelled')).toEqual(bandOdds(0, 'normal'));
    expect(bandOdds(2, 'cancelled')).toEqual(bandOdds(2, 'normal'));
  });

  it('advantage: fracciones exactas sobre 216 casos', () => {
    const b = bandOdds(0, 'advantage');
    expect(b.crit).toBe(16 / 216);
    expect(b.success).toBe(61 / 216);
    expect(b.partial).toBe(97 / 216);
    expect(b.failure).toBe(41 / 216);
    expect(b.fumble).toBe(1 / 216);
  });

  it('disadvantage: fracciones exactas sobre 216 casos', () => {
    const b = bandOdds(0, 'disadvantage');
    expect(b.crit).toBe(1 / 216);
    expect(b.success).toBe(10 / 216);
    expect(b.partial).toBe(58 / 216);
    expect(b.failure).toBe(131 / 216);
    expect(b.fumble).toBe(16 / 216);
  });

  it('las cinco bandas suman 1 en todos los modos y modificadores', () => {
    const modes = ['normal', 'advantage', 'disadvantage', 'cancelled'] as const;
    for (const mode of modes) {
      for (let mod = -4; mod <= 4; mod += 1) {
        const b = bandOdds(mod, mode);
        expect(b.crit + b.success + b.partial + b.failure + b.fumble).toBeCloseTo(1, 12);
      }
    }
  });

  it('dobles: crit 2,8 % normal y 7,4 % con ventaja; fumble 7,4 % con desventaja y 0,5 % con ventaja', () => {
    expect(pct(bandOdds(0, 'normal').crit)).toBeCloseTo(2.8, 3);
    expect(pct(bandOdds(0, 'normal').fumble)).toBeCloseTo(2.8, 3);
    expect(pct(bandOdds(0, 'advantage').crit)).toBeCloseTo(7.4, 3);
    expect(pct(bandOdds(0, 'disadvantage').fumble)).toBeCloseTo(7.4, 3);
    expect(pct(bandOdds(0, 'advantage').fumble)).toBeCloseTo(0.5, 3);
  });

  it('los naturales no dependen del modificador', () => {
    expect(bandOdds(-5, 'normal').crit).toBe(1 / 36);
    expect(bandOdds(9, 'normal').fumble).toBe(1 / 36);
  });
});

describe('odds', () => {
  it('normal mod 0 → 16,7 / 41,7 / 41,7', () => {
    const o = odds(0, 'normal');
    expect(pct(o.success)).toBeCloseTo(16.7, 3);
    expect(pct(o.partial)).toBeCloseTo(41.7, 3);
    expect(pct(o.failure)).toBeCloseTo(41.7, 3);
  });

  it('normal mod +2 → 41,7 / 41,7 / 16,7', () => {
    const o = odds(2, 'normal');
    expect(pct(o.success)).toBeCloseTo(41.7, 3);
    expect(pct(o.partial)).toBeCloseTo(41.7, 3);
    expect(pct(o.failure)).toBeCloseTo(16.7, 3);
  });

  it('advantage mod 0 → 35,6 / 44,9 / 19,4', () => {
    const o = odds(0, 'advantage');
    expect(pct(o.success)).toBeCloseTo(35.6, 3);
    expect(pct(o.partial)).toBeCloseTo(44.9, 3);
    expect(pct(o.failure)).toBeCloseTo(19.4, 3);
  });

  it('advantage mod +2 → 68,1 / 26,9 / 5,1', () => {
    const o = odds(2, 'advantage');
    expect(pct(o.success)).toBeCloseTo(68.1, 3);
    expect(pct(o.partial)).toBeCloseTo(26.9, 3);
    expect(pct(o.failure)).toBeCloseTo(5.1, 3);
  });

  it('disadvantage mod 0 → 5,1 / 26,9 / 68,1', () => {
    const o = odds(0, 'disadvantage');
    expect(pct(o.success)).toBeCloseTo(5.1, 3);
    expect(pct(o.partial)).toBeCloseTo(26.9, 3);
    expect(pct(o.failure)).toBeCloseTo(68.1, 3);
  });

  it('success = crit + success y failure = failure + fumble', () => {
    const b = bandOdds(0, 'advantage');
    const o = odds(0, 'advantage');
    expect(o.success).toBeCloseTo(b.crit + b.success, 12);
    expect(o.partial).toBe(b.partial);
    expect(o.failure).toBeCloseTo(b.failure + b.fumble, 12);
  });

  it('las tres bandas suman 1', () => {
    const o = odds(-1, 'disadvantage');
    expect(o.success + o.partial + o.failure).toBeCloseTo(1, 12);
  });
});
```

- [ ] **Paso 8: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/dice.test.ts
```

Resultado esperado: los 11 tests anteriores siguen en verde y los 14 nuevos fallan con `TypeError: bandOdds is not a function` (o un mensaje equivalente indicando que `@/engine/dice` no exporta `bandOdds`/`odds`).

- [ ] **Paso 9: Implementación mínima** → reemplazar `src/engine/dice.ts` por este contenido completo:

```ts
import type { Band, Risk, RollMode } from '@/engine/types';

/** Probabilidad exacta de cada banda (fracciones sobre 36 o 216 casos). */
export interface BandOdds {
  crit: number;
  success: number;
  partial: number;
  failure: number;
  fumble: number;
}

/** Las tres bandas que ve el jugador: success = crit + success, failure = failure + fumble. */
export interface Odds {
  success: number;
  partial: number;
  failure: number;
}

const FACES: readonly number[] = [1, 2, 3, 4, 5, 6];

/**
 * Índices de los dados que se conservan (siempre 2, ordenados de menor a mayor índice).
 * advantage → los 2 mayores; disadvantage → los 2 menores; normal/cancelled → [0, 1].
 * Empates: gana el índice menor. No muta `dice`.
 */
export function keepDice(dice: number[], mode: RollMode): number[] {
  if (mode !== 'advantage' && mode !== 'disadvantage') return [0, 1];
  const direction = mode === 'advantage' ? -1 : 1;
  const ordered = dice
    .map((_, index) => index)
    .sort((a, b) => {
      const byValue = ((dice[a] ?? 0) - (dice[b] ?? 0)) * direction;
      return byValue !== 0 ? byValue : a - b;
    });
  return ordered.slice(0, 2).sort((a, b) => a - b);
}

/**
 * Banda de una tirada. `kept` son los VALORES de los 2 dados conservados.
 * Los naturales priman: [6, 6] → crit y [1, 1] → fumble sin mirar el total.
 * Luego total = suma + totalMod: ≥ 10 success, 7-9 partial, ≤ 6 failure.
 */
export function classify(kept: number[], totalMod: number): Band {
  const isDouble = (face: number): boolean => kept.length === 2 && kept.every((d) => d === face);
  if (isDouble(6)) return 'crit';
  if (isDouble(1)) return 'fumble';
  const total = kept.reduce((sum, d) => sum + d, 0) + totalMod;
  if (total >= 10) return 'success';
  if (total >= 7) return 'partial';
  return 'failure';
}

/** Todas las combinaciones ordenadas de `count` dados: 36 para 2, 216 para 3. */
function allCombos(count: number): number[][] {
  if (count === 0) return [[]];
  const shorter = allCombos(count - 1);
  return FACES.flatMap((face) => shorter.map((rest) => [face, ...rest]));
}

/** Enumeración exhaustiva: cuenta en qué banda cae cada combinación posible. */
export function bandOdds(totalMod: number, mode: RollMode): BandOdds {
  const count = mode === 'advantage' || mode === 'disadvantage' ? 3 : 2;
  const combos = allCombos(count);
  const counts: Record<Band, number> = { crit: 0, success: 0, partial: 0, failure: 0, fumble: 0 };
  for (const dice of combos) {
    const kept = keepDice(dice, mode).map((i) => dice[i] ?? 0);
    counts[classify(kept, totalMod)] += 1;
  }
  const total = combos.length;
  return {
    crit: counts.crit / total,
    success: counts.success / total,
    partial: counts.partial / total,
    failure: counts.failure / total,
    fumble: counts.fumble / total,
  };
}

/** Las tres bandas visibles: success incluye crit; failure incluye fumble. */
export function odds(totalMod: number, mode: RollMode): Odds {
  const b = bandOdds(totalMod, mode);
  return { success: b.crit + b.success, partial: b.partial, failure: b.failure + b.fumble };
}
```

- [ ] **Paso 10: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/dice.test.ts
```

Resultado esperado: `Tests 25 passed (25)` (11 anteriores + 7 de `bandOdds` + 7 de `odds`).

- [ ] **Paso 11: Commit**

```bash
git add src/engine/dice.ts tests/engine/dice.test.ts
git commit -m "feat(engine): probabilidades exactas por enumeracion de 2d6 y 3d6" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: etiqueta de riesgo y línea de objetivo (`riskLabel`, `targetLine`)

- [ ] **Paso 12: Escribir el test que falla** → en `tests/engine/dice.test.ts`, reemplazar la línea de `import` de `@/engine/dice` por:

```ts
import { bandOdds, classify, keepDice, odds, riskLabel, targetLine } from '@/engine/dice';
```

y agregar al final del archivo este bloque:

```ts
describe('riskLabel', () => {
  it('seguro en los bordes inclusivos: fallo 0,20 y éxito 0,40', () => {
    expect(riskLabel({ success: 0.4, partial: 0.4, failure: 0.2 })).toBe('seguro');
    expect(riskLabel({ success: 0.7, partial: 0.25, failure: 0.05 })).toBe('seguro');
  });

  it('no es seguro si el éxito no llega a 0,40 aunque el fallo sea bajo', () => {
    expect(riskLabel({ success: 0.3, partial: 0.6, failure: 0.1 })).toBe('arriesgado');
    expect(riskLabel({ success: 0.399, partial: 0.401, failure: 0.2 })).toBe('arriesgado');
  });

  it('arriesgado hasta fallo 0,45 inclusive', () => {
    expect(riskLabel({ success: 0.3, partial: 0.25, failure: 0.45 })).toBe('arriesgado');
    expect(riskLabel({ success: 0.5, partial: 0.29, failure: 0.21 })).toBe('arriesgado');
  });

  it('peligroso desde fallo 0,451', () => {
    expect(riskLabel({ success: 0.3, partial: 0.249, failure: 0.451 })).toBe('peligroso');
    expect(riskLabel({ success: 0.05, partial: 0.27, failure: 0.68 })).toBe('peligroso');
  });

  it('funciona con las probabilidades reales de odds', () => {
    expect(riskLabel(odds(2, 'normal'))).toBe('seguro');
    expect(riskLabel(odds(1, 'advantage'))).toBe('seguro');
    expect(riskLabel(odds(2, 'advantage'))).toBe('seguro');
    expect(riskLabel(odds(0, 'normal'))).toBe('arriesgado');
    expect(riskLabel(odds(1, 'normal'))).toBe('arriesgado');
    // fallo 19,4 % (≤ 20) pero éxito 35,6 % (< 40): no alcanza para seguro
    expect(riskLabel(odds(0, 'advantage'))).toBe('arriesgado');
    expect(riskLabel(odds(-1, 'normal'))).toBe('peligroso');
    expect(riskLabel(odds(0, 'disadvantage'))).toBe('peligroso');
  });
});

describe('targetLine', () => {
  it('mod 0: 10+ éxito, 7+ con costo', () => {
    expect(targetLine(0)).toBe(
      'Necesitás 10+ en los dados para éxito, 7+ con costo · doble 1 siempre falla · doble 6 siempre crítico',
    );
  });

  it('mod +2 baja los umbrales en los dados', () => {
    expect(targetLine(2)).toBe(
      'Necesitás 8+ en los dados para éxito, 5+ con costo · doble 1 siempre falla · doble 6 siempre crítico',
    );
  });

  it('mod -1 los sube', () => {
    expect(targetLine(-1)).toBe(
      'Necesitás 11+ en los dados para éxito, 8+ con costo · doble 1 siempre falla · doble 6 siempre crítico',
    );
  });
});
```

- [ ] **Paso 13: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/dice.test.ts
```

Resultado esperado: los 25 tests anteriores en verde; los 8 nuevos fallan con `TypeError: riskLabel is not a function` / `targetLine is not a function`.

- [ ] **Paso 14: Implementación mínima** → agregar al final de `src/engine/dice.ts` (después de `odds`) estas dos funciones; el archivo completo queda así:

```ts
import type { Band, Risk, RollMode } from '@/engine/types';

/** Probabilidad exacta de cada banda (fracciones sobre 36 o 216 casos). */
export interface BandOdds {
  crit: number;
  success: number;
  partial: number;
  failure: number;
  fumble: number;
}

/** Las tres bandas que ve el jugador: success = crit + success, failure = failure + fumble. */
export interface Odds {
  success: number;
  partial: number;
  failure: number;
}

const FACES: readonly number[] = [1, 2, 3, 4, 5, 6];

/**
 * Índices de los dados que se conservan (siempre 2, ordenados de menor a mayor índice).
 * advantage → los 2 mayores; disadvantage → los 2 menores; normal/cancelled → [0, 1].
 * Empates: gana el índice menor. No muta `dice`.
 */
export function keepDice(dice: number[], mode: RollMode): number[] {
  if (mode !== 'advantage' && mode !== 'disadvantage') return [0, 1];
  const direction = mode === 'advantage' ? -1 : 1;
  const ordered = dice
    .map((_, index) => index)
    .sort((a, b) => {
      const byValue = ((dice[a] ?? 0) - (dice[b] ?? 0)) * direction;
      return byValue !== 0 ? byValue : a - b;
    });
  return ordered.slice(0, 2).sort((a, b) => a - b);
}

/**
 * Banda de una tirada. `kept` son los VALORES de los 2 dados conservados.
 * Los naturales priman: [6, 6] → crit y [1, 1] → fumble sin mirar el total.
 * Luego total = suma + totalMod: ≥ 10 success, 7-9 partial, ≤ 6 failure.
 */
export function classify(kept: number[], totalMod: number): Band {
  const isDouble = (face: number): boolean => kept.length === 2 && kept.every((d) => d === face);
  if (isDouble(6)) return 'crit';
  if (isDouble(1)) return 'fumble';
  const total = kept.reduce((sum, d) => sum + d, 0) + totalMod;
  if (total >= 10) return 'success';
  if (total >= 7) return 'partial';
  return 'failure';
}

/** Todas las combinaciones ordenadas de `count` dados: 36 para 2, 216 para 3. */
function allCombos(count: number): number[][] {
  if (count === 0) return [[]];
  const shorter = allCombos(count - 1);
  return FACES.flatMap((face) => shorter.map((rest) => [face, ...rest]));
}

/** Enumeración exhaustiva: cuenta en qué banda cae cada combinación posible. */
export function bandOdds(totalMod: number, mode: RollMode): BandOdds {
  const count = mode === 'advantage' || mode === 'disadvantage' ? 3 : 2;
  const combos = allCombos(count);
  const counts: Record<Band, number> = { crit: 0, success: 0, partial: 0, failure: 0, fumble: 0 };
  for (const dice of combos) {
    const kept = keepDice(dice, mode).map((i) => dice[i] ?? 0);
    counts[classify(kept, totalMod)] += 1;
  }
  const total = combos.length;
  return {
    crit: counts.crit / total,
    success: counts.success / total,
    partial: counts.partial / total,
    failure: counts.failure / total,
    fumble: counts.fumble / total,
  };
}

/** Las tres bandas visibles: success incluye crit; failure incluye fumble. */
export function odds(totalMod: number, mode: RollMode): Odds {
  const b = bandOdds(totalMod, mode);
  return { success: b.crit + b.success, partial: b.partial, failure: b.failure + b.fumble };
}

/**
 * seguro: fallo ≤ 20 % Y éxito ≥ 40 %; si no, arriesgado: fallo ≤ 45 %; si no, peligroso.
 * Los bordes son inclusivos.
 */
export function riskLabel(o: Odds): Risk {
  if (o.failure <= 0.2 && o.success >= 0.4) return 'seguro';
  if (o.failure <= 0.45) return 'arriesgado';
  return 'peligroso';
}

/** Objetivo expresado en los dados: con modificador m hace falta 10-m para éxito y 7-m con costo. */
export function targetLine(totalMod: number): string {
  const success = 10 - totalMod;
  const partial = 7 - totalMod;
  return `Necesitás ${success}+ en los dados para éxito, ${partial}+ con costo · doble 1 siempre falla · doble 6 siempre crítico`;
}
```

- [ ] **Paso 15: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/dice.test.ts
```

Resultado esperado: `Tests 33 passed (33)` (25 anteriores + 5 de `riskLabel` + 3 de `targetLine`).

- [ ] **Paso 16: Commit**

```bash
git add src/engine/dice.ts tests/engine/dice.test.ts
git commit -m "feat(engine): etiqueta de riesgo y linea de objetivo en los dados" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: hash FNV-1a y generador mulberry32 (`hash32`, `mulberry32`)

- [ ] **Paso 17: Escribir el test que falla** → crear `tests/engine/rng.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import { hash32, mulberry32 } from '@/engine/rng';

describe('hash32', () => {
  it('es FNV-1a de 32 bits: hash32("a") = 0xe40c292c', () => {
    expect(hash32('a')).toBe(3826002220);
    expect(hash32('a')).toBe(0xe40c292c);
  });

  it('la cadena vacía devuelve el offset basis', () => {
    expect(hash32('')).toBe(2166136261);
    expect(hash32()).toBe(2166136261);
  });

  it('une las partes con | antes de hashear (strings y numbers)', () => {
    expect(hash32('a', 'b')).toBe(hash32('a|b'));
    expect(hash32(42, 'p_umbral')).toBe(hash32('42|p_umbral'));
    expect(hash32(1, 2, 3)).toBe(hash32('1|2|3'));
  });

  it('devuelve un entero sin signo de 32 bits, estable entre llamadas', () => {
    const h = hash32('Crónicas del Vado');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
    expect(hash32('Crónicas del Vado')).toBe(h);
  });

  it('entradas distintas dan hashes distintos', () => {
    expect(hash32('a')).not.toBe(hash32('b'));
    expect(hash32('a', 'b')).not.toBe(hash32('b', 'a'));
    expect(hash32(7, 'x', 0, 0)).not.toBe(hash32(7, 'x', 0, 1));
  });
});

describe('mulberry32', () => {
  it('es reproducible: la misma semilla da la misma secuencia', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('devuelve números en [0, 1)', () => {
    const next = mulberry32(3826002220);
    for (let i = 0; i < 1000; i += 1) {
      const v = next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('semillas distintas dan secuencias distintas', () => {
    const seq1 = Array.from({ length: 10 }, mulberry32(1));
    const seq2 = Array.from({ length: 10 }, mulberry32(2));
    expect(seq1).not.toEqual(seq2);
  });

  it('la semilla se reduce a 32 bits sin signo', () => {
    const seq1 = Array.from({ length: 5 }, mulberry32(5));
    const seq2 = Array.from({ length: 5 }, mulberry32(2 ** 32 + 5));
    expect(seq1).toEqual(seq2);
  });
});
```

- [ ] **Paso 18: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/rng.test.ts
```

Resultado esperado: `Error: Failed to resolve import "@/engine/rng" from "tests/engine/rng.test.ts". Does the file exist?`

- [ ] **Paso 19: Implementación mínima** → crear `src/engine/rng.ts` con este contenido completo:

```ts
const FNV_OFFSET_BASIS = 0x811c9dc5; // 2166136261
const FNV_PRIME = 0x01000193; // 16777619

/**
 * FNV-1a de 32 bits sobre los code units UTF-16 de parts.join('|').
 * Resultado como entero sin signo (>>> 0). Estable: hash32('a') === 0xe40c292c.
 */
export function hash32(...parts: (string | number)[]): number {
  const text = parts.join('|');
  let h = FNV_OFFSET_BASIS;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

/** Generador mulberry32: devuelve una función que produce números en [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

- [ ] **Paso 20: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/rng.test.ts
```

Resultado esperado: `Tests 9 passed (9)`.

- [ ] **Paso 21: Commit**

```bash
git add src/engine/rng.ts tests/engine/rng.test.ts
git commit -m "feat(engine): hash FNV-1a de 32 bits y generador mulberry32" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 5: dados deterministas y semilla nueva (`rollDice`, `newSeed`)

- [ ] **Paso 22: Escribir el test que falla** → en `tests/engine/rng.test.ts`, reemplazar la línea de `import` de `@/engine/rng` por:

```ts
import { hash32, mulberry32, newSeed, rollDice } from '@/engine/rng';
```

y agregar al final del archivo este bloque:

```ts
describe('rollDice', () => {
  const seed = 3826002220;

  it('devuelve `count` enteros entre 1 y 6', () => {
    for (const count of [1, 2, 3, 20]) {
      const dice = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, count);
      expect(dice).toHaveLength(count);
      for (const d of dice) {
        expect(Number.isInteger(d)).toBe(true);
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(6);
      }
    }
  });

  it('count 0 devuelve un array vacío', () => {
    expect(rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 0)).toEqual([]);
  });

  it('los mismos argumentos dan los mismos dados (recargar y repetir = mismos dados)', () => {
    const a = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 3);
    const b = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 3);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('el primer dado no depende de count (base de la repetición con Fortuna)', () => {
    const uno = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 1, 1);
    const dos = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 1, 2);
    expect(uno[0]).toBe(dos[0]);
  });

  it('cambiar attempt cambia los dados', () => {
    const intento0 = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 20);
    const intento1 = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 1, 20);
    expect(intento0).not.toEqual(intento1);
  });

  it('cambiar visits cambia los dados', () => {
    const visita0 = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 20);
    const visita1 = rollDice(seed, 'p_umbral', 'leer_inscripcion', 1, 0, 20);
    expect(visita0).not.toEqual(visita1);
  });

  it('cambiar la semilla, la escena o la opción cambia los dados', () => {
    const base = rollDice(seed, 'p_umbral', 'leer_inscripcion', 0, 0, 20);
    expect(rollDice(seed + 1, 'p_umbral', 'leer_inscripcion', 0, 0, 20)).not.toEqual(base);
    expect(rollDice(seed, 'p_biblioteca', 'leer_inscripcion', 0, 0, 20)).not.toEqual(base);
    expect(rollDice(seed, 'p_umbral', 'forzar_puerta', 0, 0, 20)).not.toEqual(base);
  });

  it('usa mulberry32(hash32(seed, sceneId, choiceId, visits, attempt))', () => {
    const next = mulberry32(hash32(seed, 'p_umbral', 'leer_inscripcion', 2, 1));
    const esperado = [Math.floor(next() * 6) + 1, Math.floor(next() * 6) + 1];
    expect(rollDice(seed, 'p_umbral', 'leer_inscripcion', 2, 1, 2)).toEqual(esperado);
  });

  it('a lo largo de muchas semillas salen las seis caras', () => {
    const caras = new Set<number>();
    for (let s = 0; s < 200; s += 1) {
      for (const d of rollDice(s, 'p_umbral', 'leer_inscripcion', 0, 0, 3)) caras.add(d);
    }
    expect([...caras].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('newSeed', () => {
  it('es hash32 de la entropía', () => {
    expect(newSeed('a')).toBe(3826002220);
    expect(newSeed('1700000000000|0.123')).toBe(hash32('1700000000000|0.123'));
  });

  it('entropías distintas dan semillas distintas', () => {
    expect(newSeed('1700000000000|0.123')).not.toBe(newSeed('1700000000000|0.124'));
    expect(newSeed('1700000000000|0.123')).not.toBe(newSeed('1700000000001|0.123'));
  });

  it('devuelve un entero sin signo de 32 bits', () => {
    const s = newSeed('cualquier cosa');
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2 ** 32);
  });
});
```

- [ ] **Paso 23: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/rng.test.ts
```

Resultado esperado: los 9 tests anteriores en verde; los 12 nuevos fallan con `TypeError: rollDice is not a function` / `newSeed is not a function`.

- [ ] **Paso 24: Implementación mínima** → reemplazar `src/engine/rng.ts` por este contenido completo:

```ts
const FNV_OFFSET_BASIS = 0x811c9dc5; // 2166136261
const FNV_PRIME = 0x01000193; // 16777619

/**
 * FNV-1a de 32 bits sobre los code units UTF-16 de parts.join('|').
 * Resultado como entero sin signo (>>> 0). Estable: hash32('a') === 0xe40c292c.
 */
export function hash32(...parts: (string | number)[]): number {
  const text = parts.join('|');
  let h = FNV_OFFSET_BASIS;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, FNV_PRIME);
  }
  return h >>> 0;
}

/** Generador mulberry32: devuelve una función que produce números en [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Dados deterministas: mulberry32(hash32(seed, sceneId, choiceId, visits, attempt)) → `count` enteros 1-6.
 * attempt 0 es la tirada inicial; cada repetición con Fortuna usa attempt + 1 y count 1.
 */
export function rollDice(
  seed: number,
  sceneId: string,
  choiceId: string,
  visits: number,
  attempt: number,
  count: number,
): number[] {
  const next = mulberry32(hash32(seed, sceneId, choiceId, visits, attempt));
  return Array.from({ length: count }, () => Math.floor(next() * 6) + 1);
}

/** Semilla de una partida nueva; el store pasa `${Date.now()}|${Math.random()}`. */
export function newSeed(entropy: string): number {
  return hash32(entropy);
}
```

- [ ] **Paso 25: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/rng.test.ts
```

Resultado esperado: `Tests 21 passed (21)`.

- [ ] **Paso 26: Commit**

```bash
git add src/engine/rng.ts tests/engine/rng.test.ts
git commit -m "feat(engine): dados deterministas por hash de semilla, escena, opcion, visitas e intento" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Verificación de la tarea

- [ ] **Paso 27: Verificación de la tarea** → correr, uno por línea:

```bash
npx vitest run
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: todos los archivos de test del proyecto en verde (incluidos `tests/engine/dice.test.ts` con 33 tests y `tests/engine/rng.test.ts` con 21) y `tsc` sin ninguna línea de error (sin `any`, sin `!` fuera de los tests, con `import type` para todo lo que viene de `@/content/catalog` y `@/content/schema`).

Criterio de aceptación: `odds(0, 'normal')`, `odds(0, 'advantage')` y `odds(0, 'disadvantage')` reproducen exactamente 16,7/41,7/41,7, 35,6/44,9/19,4 y 5,1/26,9/68,1 por enumeración exhaustiva; los naturales priman en `classify`; `hash32('a')` vale 3826002220; y `rollDice` devuelve los mismos dados para los mismos argumentos y otros distintos al cambiar `attempt` o `visits`.

---

### Tarea 5: Evaluación de condiciones (conditions.ts)

**Qué es esto (contexto de dominio en cuatro líneas).** El contenido del juego describe requisitos con objetos declarativos llamados `Condition` (por ejemplo `{ flag: 'run:puerta_abierta' }` o `{ all: [{ class: 'mago' }, { visited: 'p_umbral', min: 1 }] }`). El motor los evalúa contra el estado de juego (`GameState`) para decidir qué opciones se muestran, qué variante de texto se lee, si una tirada tiene ventaja, etc. Los flags tienen tres alcances por prefijo: `run:` vive en la partida (`run.flags`), `char:` en el personaje (`character.flags`) y `world:` en el perfil (`world.flags`). Durante una partida, los `set` de `char:`/`world:` se "apuestan" en `run.stagedFlags` y, para las condiciones de esa misma partida, cuentan como si ya estuvieran puestos; un flag `run:` nunca se busca en `stagedFlags`.

Esta tarea entrega dos funciones puras (`hasFlag` y `evaluate`) y un archivo de fixtures de estado reutilizable por todas las tareas siguientes del motor.

**Archivos:**
- Crear: `src/engine/conditions.ts`
- Crear: `tests/fixtures/state.ts`
- Modificar: ninguno
- Test: `tests/engine/conditions.test.ts`

**Interfaces:**
- Consume:
  - De la tarea 3 (`src/content/schema.ts`): `type Condition` (unión de 16 variantes: `{ flag: FlagId } | { not: Condition } | { all: Condition[] } | { any: Condition[] } | { class: ClassId } | { trait: TraitId } | { skill: SkillId } | { item: string } | { attr: Attr; gte: number } | { wounds: { gte?: number; lte?: number } } | { condition: ConditionId } | { visited: string; min?: number } | { met: string } | { knows: string } | { clock: string; gte: number } | { endingSeen: string }`) y `interface Campaign`.
  - De la tarea 3 (`tests/fixtures/campaigns/minimal.ts`): `export const minimal: Campaign` (campaña válida mínima). Si la tarea 3 la exportó con otro nombre, usá ese nombre en los dos imports de esta tarea (`tests/fixtures/state.ts` y el test); no renombres nada en `minimal.ts`.
  - De la tarea 4 (`src/engine/types.ts`, creado en su Paso 3 junto con `dice.ts`; es la sección E del contrato): `interface GameState { world: WorldState; character: Character; run: Run; seen: SeenMap }`, `interface EvalContext { campaign: Campaign; state: GameState }`, `interface Character`, `interface Run`, `interface WorldState`, `type SeenMap`.
- Produce:
  - `src/engine/conditions.ts`:
    - `export function hasFlag(state: GameState, flag: string): boolean` — `run:` en `run.flags`; `char:` en `character.flags ∪ run.stagedFlags`; `world:` en `world.flags ∪ run.stagedFlags`; cualquier otro prefijo → `false`.
    - `export function evaluate(cond: Condition | undefined, ctx: EvalContext): boolean` — `undefined` → `true`; el resto según la sección F del contrato.
  - `tests/fixtures/state.ts` (nuevo; lo usan las tareas 6, 7, 8, 9, 10 y 13):
    - `export interface StateOverrides { world?: Partial<WorldState>; character?: Partial<Character>; run?: Partial<Run>; seen?: SeenMap }`
    - `export function makeWorld(overrides?: Partial<WorldState>): WorldState`
    - `export function makeCharacter(overrides?: Partial<Character>): Character` — por defecto el personaje de prueba del contrato: `'Prueba'`, mago nivel 3, `attrs { vigor: 0, astucia: 1, saber: 2, presencia: 1 }`, rasgos `['aprendiz_de_escriba', 'cazador_furtivo']`, retrato `'mago_01'`.
    - `export function makeRun(overrides?: Partial<Run>): Run` — por defecto una partida recién empezada de la campaña `minimal` (`campaignId = minimal.id`, `sceneId = minimal.start`, sin flags, sin objetos, 0 heridas, fortuna 3, `rngSeed 12345`).
    - `export function makeState(overrides?: StateOverrides): GameState` — arma `world`, `character` y `run` con los tres helpers; `character.run` apunta al mismo `run`.
    - `export function makeCtx(campaign?: Campaign, stateOverrides?: StateOverrides): EvalContext` — `campaign` por defecto `minimal`; el `run` toma `campaignId`, `contentVersion` y `sceneId` de la campaña dada salvo que `stateOverrides.run` los pise.

**Reglas que aplican a todo el código de esta tarea:** TypeScript `strict`, sin `any`, sin `!`; los helpers de fixtures devuelven objetos nuevos en cada llamada (nunca compartas un array literal entre llamadas); `evaluate` y `hasFlag` no mutan nada; imports desde `src` con alias `@/`, imports entre archivos de `tests/` con rutas relativas.

---

#### Ciclo 1: fixtures de estado y `hasFlag`

- [ ] **Paso 1: Escribir el test que falla** → crear `tests/fixtures/state.ts` con este contenido completo:

```ts
import type { Campaign } from '@/content/schema';
import type { Character, EvalContext, GameState, Run, SeenMap, WorldState } from '@/engine/types';
import { minimal } from './campaigns/minimal';

/**
 * Sobrescrituras parciales por capa. Cada capa acepta un objeto parcial
 * (o uno completo, que también es válido como parcial).
 */
export interface StateOverrides {
  world?: Partial<WorldState>;
  character?: Partial<Character>;
  run?: Partial<Run>;
  seen?: SeenMap;
}

export function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    flags: [],
    fallen: [],
    ...overrides,
  };
}

/** Personaje de prueba del contrato: 'Prueba', mago nivel 3. */
export function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'pj_prueba',
    name: 'Prueba',
    portrait: 'mago_01',
    classId: 'mago',
    attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
    traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
    skills: [],
    level: 3,
    xp: 120,
    flags: [],
    memoryNames: {},
    relics: [],
    scars: [],
    campaignLog: {},
    run: null,
    ...overrides,
  };
}

/** Partida recién empezada en la campaña `minimal`. */
export function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    campaignId: minimal.id,
    contentVersion: minimal.contentVersion,
    sceneId: minimal.start,
    flags: [],
    stagedFlags: [],
    visited: {},
    items: [],
    wounds: 0,
    conditions: [],
    fortune: 3,
    powerUsed: false,
    clocks: {},
    milestones: [],
    log: [],
    rngSeed: 12345,
    ...overrides,
  };
}

export function makeState(overrides: StateOverrides = {}): GameState {
  const world = makeWorld(overrides.world);
  const run = makeRun(overrides.run);
  // character.run apunta al mismo run para que el estado sea coherente;
  // una sobrescritura explícita de character.run gana.
  const character = makeCharacter({ run, ...overrides.character });
  return { world, character, run, seen: overrides.seen ?? {} };
}

export function makeCtx(campaign: Campaign = minimal, stateOverrides: StateOverrides = {}): EvalContext {
  const state = makeState({
    ...stateOverrides,
    run: {
      campaignId: campaign.id,
      contentVersion: campaign.contentVersion,
      sceneId: campaign.start,
      ...stateOverrides.run,
    },
  });
  return { campaign, state };
}
```

Y crear `tests/engine/conditions.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import { hasFlag } from '@/engine/conditions';
import { makeState } from '../fixtures/state';

describe('hasFlag', () => {
  it('run: se busca en run.flags', () => {
    const state = makeState({ run: { flags: ['run:puerta_abierta'] } });
    expect(hasFlag(state, 'run:puerta_abierta')).toBe(true);
    expect(hasFlag(state, 'run:otra_cosa')).toBe(false);
  });

  it('run: NO se lee de run.stagedFlags ni de character.flags ni de world.flags', () => {
    const state = makeState({
      run: { stagedFlags: ['run:apostado'] },
      character: { flags: ['run:en_personaje'] },
      world: { flags: ['run:en_mundo'] },
    });
    expect(hasFlag(state, 'run:apostado')).toBe(false);
    expect(hasFlag(state, 'run:en_personaje')).toBe(false);
    expect(hasFlag(state, 'run:en_mundo')).toBe(false);
  });

  it('char: se lee de character.flags', () => {
    const state = makeState({ character: { flags: ['char:m.secreto'] } });
    expect(hasFlag(state, 'char:m.secreto')).toBe(true);
    expect(hasFlag(state, 'char:m.otro')).toBe(false);
  });

  it('char: también se lee de run.stagedFlags (apostado en esta partida)', () => {
    const state = makeState({ run: { stagedFlags: ['char:m.apostado'] } });
    expect(hasFlag(state, 'char:m.apostado')).toBe(true);
  });

  it('world: se lee de world.flags', () => {
    const state = makeState({ world: { flags: ['world:m.inundada'] } });
    expect(hasFlag(state, 'world:m.inundada')).toBe(true);
    expect(hasFlag(state, 'world:m.seca')).toBe(false);
  });

  it('world: también se lee de run.stagedFlags', () => {
    const state = makeState({ run: { stagedFlags: ['world:m.apostado'] } });
    expect(hasFlag(state, 'world:m.apostado')).toBe(true);
  });

  it('char: y world: no se leen de run.flags (los alcances no se mezclan)', () => {
    const state = makeState({ run: { flags: ['char:m.colado', 'world:m.colado'] } });
    expect(hasFlag(state, 'char:m.colado')).toBe(false);
    expect(hasFlag(state, 'world:m.colado')).toBe(false);
  });

  it('un flag con prefijo desconocido nunca está', () => {
    const state = makeState({
      run: { flags: ['sin_prefijo'], stagedFlags: ['sin_prefijo'] },
      character: { flags: ['sin_prefijo'] },
      world: { flags: ['sin_prefijo'] },
    });
    expect(hasFlag(state, 'sin_prefijo')).toBe(false);
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla** → desde la raíz del proyecto:

```bash
npx vitest run tests/engine/conditions.test.ts
```

Se espera un fallo de carga del módulo, no de aserción: `Error: Failed to resolve import "@/engine/conditions" from "tests/engine/conditions.test.ts". Does the file exist?` (el archivo `src/engine/conditions.ts` todavía no existe). Si en cambio el error menciona `./campaigns/minimal` o el nombre `minimal`, revisá el nombre del export en `tests/fixtures/campaigns/minimal.ts` (ver "Consume") antes de seguir.

- [ ] **Paso 3: Implementación mínima** → crear `src/engine/conditions.ts` con este contenido completo:

```ts
import type { GameState } from '@/engine/types';

/**
 * Busca un flag según su prefijo (alcance):
 * - `run:`   solo en run.flags (lo apostado en stagedFlags nunca es de partida).
 * - `char:`  en character.flags o en run.stagedFlags (apuestas de esta partida).
 * - `world:` en world.flags o en run.stagedFlags.
 * Cualquier otro prefijo → false.
 */
export function hasFlag(state: GameState, flag: string): boolean {
  const { run, character, world } = state;
  if (flag.startsWith('run:')) {
    return run.flags.includes(flag);
  }
  if (flag.startsWith('char:')) {
    return character.flags.includes(flag) || run.stagedFlags.includes(flag);
  }
  if (flag.startsWith('world:')) {
    return world.flags.includes(flag) || run.stagedFlags.includes(flag);
  }
  return false;
}
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/conditions.test.ts
```

Resultado esperado: `Test Files 1 passed (1)`, `Tests 8 passed (8)`.

- [ ] **Paso 5: Commit**

```bash
git add src/engine/conditions.ts tests/engine/conditions.test.ts tests/fixtures/state.ts
git commit -m "feat: hasFlag con tres alcances y fixtures de estado para tests del motor" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 2: `evaluate` con `undefined`, `flag`, `not`, `all` y `any`

- [ ] **Paso 6: Escribir el test que falla** → en `tests/engine/conditions.test.ts`, reemplazar las tres líneas de import del principio por estas cinco:

```ts
import { describe, expect, it } from 'vitest';
import type { Condition } from '@/content/schema';
import { evaluate, hasFlag } from '@/engine/conditions';
import { minimal } from '../fixtures/campaigns/minimal';
import { makeCtx, makeState } from '../fixtures/state';
```

y agregar al FINAL del archivo (después del `});` que cierra `describe('hasFlag', …)`) este bloque:

```ts
describe('evaluate: casos base y combinadores', () => {
  it('undefined → true (una opción o variante sin condición siempre aplica)', () => {
    expect(evaluate(undefined, makeCtx())).toBe(true);
  });

  it('flag run: lee run.flags', () => {
    const ctx = makeCtx(minimal, { run: { flags: ['run:tiene_pista'] } });
    expect(evaluate({ flag: 'run:tiene_pista' }, ctx)).toBe(true);
    expect(evaluate({ flag: 'run:centinela_vencido' }, ctx)).toBe(false);
  });

  it('flag char: lee character.flags y run.stagedFlags', () => {
    const ctx = makeCtx(minimal, {
      character: { flags: ['char:m.de_antes'] },
      run: { stagedFlags: ['char:m.de_ahora'] },
    });
    expect(evaluate({ flag: 'char:m.de_antes' }, ctx)).toBe(true);
    expect(evaluate({ flag: 'char:m.de_ahora' }, ctx)).toBe(true);
    expect(evaluate({ flag: 'char:m.nunca' }, ctx)).toBe(false);
  });

  it('flag world: lee world.flags y run.stagedFlags', () => {
    const ctx = makeCtx(minimal, {
      world: { flags: ['world:m.de_antes'] },
      run: { stagedFlags: ['world:m.de_ahora'] },
    });
    expect(evaluate({ flag: 'world:m.de_antes' }, ctx)).toBe(true);
    expect(evaluate({ flag: 'world:m.de_ahora' }, ctx)).toBe(true);
    expect(evaluate({ flag: 'world:m.nunca' }, ctx)).toBe(false);
  });

  it('not invierte el resultado', () => {
    const ctx = makeCtx(minimal, { run: { flags: ['run:a'] } });
    expect(evaluate({ not: { flag: 'run:a' } }, ctx)).toBe(false);
    expect(evaluate({ not: { flag: 'run:b' } }, ctx)).toBe(true);
  });

  it('all: vacío es true; todas verdaderas es true', () => {
    const ctx = makeCtx(minimal, { run: { flags: ['run:a', 'run:b'] } });
    expect(evaluate({ all: [] }, ctx)).toBe(true);
    expect(evaluate({ all: [{ flag: 'run:a' }, { flag: 'run:b' }] }, ctx)).toBe(true);
  });

  it('all: con una falsa es false', () => {
    const ctx = makeCtx(minimal, { run: { flags: ['run:a'] } });
    expect(evaluate({ all: [{ flag: 'run:a' }, { flag: 'run:b' }] }, ctx)).toBe(false);
  });

  it('any: vacío es false; con una verdadera es true', () => {
    const ctx = makeCtx(minimal, { run: { flags: ['run:b'] } });
    expect(evaluate({ any: [] }, ctx)).toBe(false);
    expect(evaluate({ any: [{ flag: 'run:a' }, { flag: 'run:b' }] }, ctx)).toBe(true);
  });

  it('any: con todas falsas es false', () => {
    const ctx = makeCtx();
    expect(evaluate({ any: [{ flag: 'run:a' }, { flag: 'run:b' }] }, ctx)).toBe(false);
  });

  it('combinadores anidados: all → not → any', () => {
    // Verdadero cuando hay run:a y NO hay (run:b o run:c).
    const cond: Condition = { all: [{ flag: 'run:a' }, { not: { any: [{ flag: 'run:b' }, { flag: 'run:c' }] } }] };
    expect(evaluate(cond, makeCtx(minimal, { run: { flags: ['run:a'] } }))).toBe(true);
    expect(evaluate(cond, makeCtx(minimal, { run: { flags: ['run:a', 'run:c'] } }))).toBe(false);
    expect(evaluate(cond, makeCtx(minimal, { run: { flags: [] } }))).toBe(false);
  });
});
```

- [ ] **Paso 7: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/conditions.test.ts
```

Se espera que los 8 tests de `hasFlag` pasen y los 10 nuevos fallen con `TypeError: evaluate is not a function` (el módulo existe pero todavía no exporta `evaluate`).

- [ ] **Paso 8: Implementación mínima** → reemplazar `src/engine/conditions.ts` por este contenido completo:

```ts
import type { Condition } from '@/content/schema';
import type { EvalContext, GameState } from '@/engine/types';

/**
 * Busca un flag según su prefijo (alcance):
 * - `run:`   solo en run.flags (lo apostado en stagedFlags nunca es de partida).
 * - `char:`  en character.flags o en run.stagedFlags (apuestas de esta partida).
 * - `world:` en world.flags o en run.stagedFlags.
 * Cualquier otro prefijo → false.
 */
export function hasFlag(state: GameState, flag: string): boolean {
  const { run, character, world } = state;
  if (flag.startsWith('run:')) {
    return run.flags.includes(flag);
  }
  if (flag.startsWith('char:')) {
    return character.flags.includes(flag) || run.stagedFlags.includes(flag);
  }
  if (flag.startsWith('world:')) {
    return world.flags.includes(flag) || run.stagedFlags.includes(flag);
  }
  return false;
}

/**
 * Evalúa una condición de contenido contra el estado. Pura: no muta nada.
 * `undefined` significa "sin condición" y siempre es true.
 */
export function evaluate(cond: Condition | undefined, ctx: EvalContext): boolean {
  if (cond === undefined) {
    return true;
  }
  const { state } = ctx;

  if ('flag' in cond) {
    return hasFlag(state, cond.flag);
  }
  if ('not' in cond) {
    return !evaluate(cond.not, ctx);
  }
  if ('all' in cond) {
    return cond.all.every((c) => evaluate(c, ctx));
  }
  if ('any' in cond) {
    return cond.any.some((c) => evaluate(c, ctx));
  }
  // Las demás variantes se implementan en los ciclos siguientes.
  return false;
}
```

- [ ] **Paso 9: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/conditions.test.ts
```

Resultado esperado: `Tests 18 passed (18)`.

- [ ] **Paso 10: Commit**

```bash
git add src/engine/conditions.ts tests/engine/conditions.test.ts
git commit -m "feat: evaluate con undefined, flag y combinadores not/all/any" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: condiciones sobre el personaje y la partida (`class`, `trait`, `skill`, `item`, `attr`, `wounds`, `condition`)

- [ ] **Paso 11: Escribir el test que falla** → agregar al FINAL de `tests/engine/conditions.test.ts`:

```ts
describe('evaluate: personaje y partida', () => {
  it('class compara con character.classId', () => {
    const ctx = makeCtx(minimal, { character: { classId: 'mago' } });
    expect(evaluate({ class: 'mago' }, ctx)).toBe(true);
    expect(evaluate({ class: 'guerrero' }, ctx)).toBe(false);
  });

  it('trait busca en character.traits', () => {
    const ctx = makeCtx(minimal, { character: { traits: ['aprendiz_de_escriba', 'cazador_furtivo'] } });
    expect(evaluate({ trait: 'aprendiz_de_escriba' }, ctx)).toBe(true);
    expect(evaluate({ trait: 'desertor' }, ctx)).toBe(false);
  });

  it('skill busca en character.skills', () => {
    const ctx = makeCtx(minimal, { character: { skills: ['rastreador'] } });
    expect(evaluate({ skill: 'rastreador' }, ctx)).toBe(true);
    expect(evaluate({ skill: 'orador' }, ctx)).toBe(false);
  });

  it('item busca en run.items', () => {
    const ctx = makeCtx(minimal, { run: { items: ['llave_de_hierro'] } });
    expect(evaluate({ item: 'llave_de_hierro' }, ctx)).toBe(true);
    expect(evaluate({ item: 'carta_lacrada' }, ctx)).toBe(false);
  });

  it('attr gte compara character.attrs[attr] >= gte', () => {
    const ctx = makeCtx(minimal, { character: { attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 } } });
    expect(evaluate({ attr: 'saber', gte: 2 }, ctx)).toBe(true);
    expect(evaluate({ attr: 'saber', gte: 3 }, ctx)).toBe(false);
    expect(evaluate({ attr: 'vigor', gte: 0 }, ctx)).toBe(true);
    expect(evaluate({ attr: 'vigor', gte: 1 }, ctx)).toBe(false);
  });

  it('wounds gte solo', () => {
    expect(evaluate({ wounds: { gte: 1 } }, makeCtx(minimal, { run: { wounds: 0 } }))).toBe(false);
    expect(evaluate({ wounds: { gte: 1 } }, makeCtx(minimal, { run: { wounds: 1 } }))).toBe(true);
    expect(evaluate({ wounds: { gte: 1 } }, makeCtx(minimal, { run: { wounds: 3 } }))).toBe(true);
  });

  it('wounds lte solo', () => {
    expect(evaluate({ wounds: { lte: 1 } }, makeCtx(minimal, { run: { wounds: 0 } }))).toBe(true);
    expect(evaluate({ wounds: { lte: 1 } }, makeCtx(minimal, { run: { wounds: 1 } }))).toBe(true);
    expect(evaluate({ wounds: { lte: 1 } }, makeCtx(minimal, { run: { wounds: 2 } }))).toBe(false);
  });

  it('wounds gte y lte a la vez (rango cerrado)', () => {
    const cond: Condition = { wounds: { gte: 1, lte: 2 } };
    expect(evaluate(cond, makeCtx(minimal, { run: { wounds: 0 } }))).toBe(false);
    expect(evaluate(cond, makeCtx(minimal, { run: { wounds: 1 } }))).toBe(true);
    expect(evaluate(cond, makeCtx(minimal, { run: { wounds: 2 } }))).toBe(true);
    expect(evaluate(cond, makeCtx(minimal, { run: { wounds: 3 } }))).toBe(false);
  });

  it('wounds sin gte ni lte es siempre true', () => {
    expect(evaluate({ wounds: {} }, makeCtx(minimal, { run: { wounds: 0 } }))).toBe(true);
    expect(evaluate({ wounds: {} }, makeCtx(minimal, { run: { wounds: 3 } }))).toBe(true);
  });

  it('condition busca en run.conditions', () => {
    const ctx = makeCtx(minimal, { run: { conditions: ['asustado', 'empapado'] } });
    expect(evaluate({ condition: 'asustado' }, ctx)).toBe(true);
    expect(evaluate({ condition: 'envenenado' }, ctx)).toBe(false);
  });
});
```

- [ ] **Paso 12: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/conditions.test.ts
```

Se espera: 18 pasan y los 10 nuevos fallan, todos con `AssertionError: expected false to be true` (cada uno tiene al menos una expectativa `true` y la implementación actual devuelve `false` para estas variantes). Ningún error de tipo `is not a function`.

- [ ] **Paso 13: Implementación mínima** → reemplazar `src/engine/conditions.ts` por este contenido completo:

```ts
import type { Condition } from '@/content/schema';
import type { EvalContext, GameState } from '@/engine/types';

/**
 * Busca un flag según su prefijo (alcance):
 * - `run:`   solo en run.flags (lo apostado en stagedFlags nunca es de partida).
 * - `char:`  en character.flags o en run.stagedFlags (apuestas de esta partida).
 * - `world:` en world.flags o en run.stagedFlags.
 * Cualquier otro prefijo → false.
 */
export function hasFlag(state: GameState, flag: string): boolean {
  const { run, character, world } = state;
  if (flag.startsWith('run:')) {
    return run.flags.includes(flag);
  }
  if (flag.startsWith('char:')) {
    return character.flags.includes(flag) || run.stagedFlags.includes(flag);
  }
  if (flag.startsWith('world:')) {
    return world.flags.includes(flag) || run.stagedFlags.includes(flag);
  }
  return false;
}

/**
 * Evalúa una condición de contenido contra el estado. Pura: no muta nada.
 * `undefined` significa "sin condición" y siempre es true.
 */
export function evaluate(cond: Condition | undefined, ctx: EvalContext): boolean {
  if (cond === undefined) {
    return true;
  }
  const { state } = ctx;
  const { character, run } = state;

  // Flags y combinadores lógicos.
  if ('flag' in cond) {
    return hasFlag(state, cond.flag);
  }
  if ('not' in cond) {
    return !evaluate(cond.not, ctx);
  }
  if ('all' in cond) {
    return cond.all.every((c) => evaluate(c, ctx));
  }
  if ('any' in cond) {
    return cond.any.some((c) => evaluate(c, ctx));
  }

  // Personaje.
  if ('class' in cond) {
    return character.classId === cond.class;
  }
  if ('trait' in cond) {
    return character.traits.includes(cond.trait);
  }
  if ('skill' in cond) {
    return character.skills.includes(cond.skill);
  }
  if ('attr' in cond) {
    return character.attrs[cond.attr] >= cond.gte;
  }

  // Partida.
  if ('item' in cond) {
    return run.items.includes(cond.item);
  }
  if ('wounds' in cond) {
    const { gte, lte } = cond.wounds;
    const cumpleMin = gte === undefined || run.wounds >= gte;
    const cumpleMax = lte === undefined || run.wounds <= lte;
    return cumpleMin && cumpleMax;
  }
  if ('condition' in cond) {
    return run.conditions.includes(cond.condition);
  }

  // Memoria y relojes: se implementan en el ciclo siguiente.
  return false;
}
```

- [ ] **Paso 14: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/conditions.test.ts
```

Resultado esperado: `Tests 28 passed (28)`.

- [ ] **Paso 15: Commit**

```bash
git add src/engine/conditions.ts tests/engine/conditions.test.ts
git commit -m "feat: evaluate con class, trait, skill, item, attr, wounds y condition" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: memoria y relojes (`visited`, `met`, `knows`, `clock`, `endingSeen`) e inmutabilidad

- [ ] **Paso 16: Escribir el test que falla** → agregar al FINAL de `tests/engine/conditions.test.ts`:

```ts
describe('evaluate: memoria y relojes', () => {
  it('visited sin min equivale a min 1 (una visita previa completa)', () => {
    expect(evaluate({ visited: 'p_umbral' }, makeCtx(minimal, { run: { visited: {} } }))).toBe(false);
    expect(evaluate({ visited: 'p_umbral' }, makeCtx(minimal, { run: { visited: { p_umbral: 0 } } }))).toBe(false);
    expect(evaluate({ visited: 'p_umbral' }, makeCtx(minimal, { run: { visited: { p_umbral: 1 } } }))).toBe(true);
  });

  it('visited con min exige al menos esa cantidad de visitas', () => {
    const cond: Condition = { visited: 'p_umbral', min: 2 };
    expect(evaluate(cond, makeCtx(minimal, { run: { visited: { p_umbral: 1 } } }))).toBe(false);
    expect(evaluate(cond, makeCtx(minimal, { run: { visited: { p_umbral: 2 } } }))).toBe(true);
    expect(evaluate(cond, makeCtx(minimal, { run: { visited: { p_umbral: 5 } } }))).toBe(true);
    // Otra escena visitada no cuenta.
    expect(evaluate(cond, makeCtx(minimal, { run: { visited: { p_patio: 9 } } }))).toBe(false);
  });

  it('met es azúcar de flag char:met.<npc> (personaje o apostado)', () => {
    expect(evaluate({ met: 'orell' }, makeCtx(minimal, { character: { flags: ['char:met.orell'] } }))).toBe(true);
    expect(evaluate({ met: 'orell' }, makeCtx(minimal, { run: { stagedFlags: ['char:met.orell'] } }))).toBe(true);
    expect(evaluate({ met: 'orell' }, makeCtx(minimal, { character: { flags: ['char:met.ilse'] } }))).toBe(false);
    expect(evaluate({ met: 'orell' }, makeCtx())).toBe(false);
  });

  it('knows es azúcar de flag char:place.<lugar> (personaje o apostado)', () => {
    expect(evaluate({ knows: 'vado_oculto' }, makeCtx(minimal, { character: { flags: ['char:place.vado_oculto'] } }))).toBe(true);
    expect(evaluate({ knows: 'vado_oculto' }, makeCtx(minimal, { run: { stagedFlags: ['char:place.vado_oculto'] } }))).toBe(true);
    expect(evaluate({ knows: 'vado_oculto' }, makeCtx(minimal, { character: { flags: ['char:place.puente_viejo'] } }))).toBe(false);
    expect(evaluate({ knows: 'vado_oculto' }, makeCtx())).toBe(false);
  });

  it('clock gte compara run.clocks[nombre] >= gte', () => {
    const ctx = makeCtx(minimal, { run: { clocks: { pelea: 2 } } });
    expect(evaluate({ clock: 'pelea', gte: 1 }, ctx)).toBe(true);
    expect(evaluate({ clock: 'pelea', gte: 2 }, ctx)).toBe(true);
    expect(evaluate({ clock: 'pelea', gte: 3 }, ctx)).toBe(false);
  });

  it('clock ausente vale 0', () => {
    const ctx = makeCtx(minimal, { run: { clocks: {} } });
    expect(evaluate({ clock: 'sospecha', gte: 0 }, ctx)).toBe(true);
    expect(evaluate({ clock: 'sospecha', gte: 1 }, ctx)).toBe(false);
  });

  it('endingSeen lee character.campaignLog[campaign.id].endings', () => {
    const ctx = makeCtx(minimal, {
      character: {
        campaignLog: { [minimal.id]: { runs: 2, wins: 1, endings: ['fin_crecida'], milestones: [] } },
      },
    });
    expect(evaluate({ endingSeen: 'fin_crecida' }, ctx)).toBe(true);
    expect(evaluate({ endingSeen: 'fin_heredero' }, ctx)).toBe(false);
  });

  it('endingSeen ignora finales de otras campañas y personajes sin registro', () => {
    const otra = makeCtx(minimal, {
      character: {
        campaignLog: { __otra_campania__: { runs: 1, wins: 1, endings: ['fin_crecida'], milestones: [] } },
      },
    });
    expect(evaluate({ endingSeen: 'fin_crecida' }, otra)).toBe(false);
    expect(evaluate({ endingSeen: 'fin_crecida' }, makeCtx(minimal, { character: { campaignLog: {} } }))).toBe(false);
  });

  it('no muta el contexto', () => {
    const ctx = makeCtx(minimal, {
      run: { flags: ['run:a'], visited: { p_umbral: 1 }, clocks: { pelea: 1 }, items: ['llave_de_hierro'] },
      character: { flags: ['char:met.orell'] },
      world: { flags: ['world:m.x'] },
    });
    const antes = JSON.stringify(ctx);
    evaluate(
      {
        all: [
          { flag: 'run:a' },
          { visited: 'p_umbral' },
          { met: 'orell' },
          { clock: 'pelea', gte: 1 },
          { not: { any: [{ item: 'nada' }, { endingSeen: 'fin_x' }, { flag: 'world:m.x' }] } },
        ],
      },
      ctx,
    );
    expect(JSON.stringify(ctx)).toBe(antes);
  });
});
```

- [ ] **Paso 17: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/conditions.test.ts
```

Se espera: 28 pasan; de los 9 nuevos fallan los 7 que contienen alguna expectativa `true` con `AssertionError: expected false to be true` (`visited sin min…`, `visited con min…`, `met…`, `knows…`, `clock gte…`, `clock ausente…`, `endingSeen lee…`); `endingSeen ignora…` y `no muta el contexto` pasan ya (todas sus expectativas son compatibles con `false`).

- [ ] **Paso 18: Implementación mínima** → reemplazar `src/engine/conditions.ts` por este contenido completo (versión final de la tarea):

```ts
import type { Condition } from '@/content/schema';
import type { EvalContext, GameState } from '@/engine/types';

/**
 * Busca un flag según su prefijo (alcance):
 * - `run:`   solo en run.flags (lo apostado en stagedFlags nunca es de partida).
 * - `char:`  en character.flags o en run.stagedFlags (apuestas de esta partida).
 * - `world:` en world.flags o en run.stagedFlags.
 * Cualquier otro prefijo → false.
 */
export function hasFlag(state: GameState, flag: string): boolean {
  const { run, character, world } = state;
  if (flag.startsWith('run:')) {
    return run.flags.includes(flag);
  }
  if (flag.startsWith('char:')) {
    return character.flags.includes(flag) || run.stagedFlags.includes(flag);
  }
  if (flag.startsWith('world:')) {
    return world.flags.includes(flag) || run.stagedFlags.includes(flag);
  }
  return false;
}

/**
 * Evalúa una condición de contenido contra el estado. Pura: no muta nada.
 * `undefined` significa "sin condición" y siempre es true.
 *
 * Semántica (sección F del contrato):
 * - visited: (run.visited[x] ?? 0) >= (min ?? 1); cuenta visitas previas COMPLETAS.
 * - met / knows: azúcar de los flags derivados `char:met.<npc>` / `char:place.<lugar>`.
 * - clock: (run.clocks[x] ?? 0) >= gte.
 * - endingSeen: character.campaignLog[campaign.id]?.endings incluye x.
 */
export function evaluate(cond: Condition | undefined, ctx: EvalContext): boolean {
  if (cond === undefined) {
    return true;
  }
  const { campaign, state } = ctx;
  const { character, run } = state;

  // Flags y combinadores lógicos.
  if ('flag' in cond) {
    return hasFlag(state, cond.flag);
  }
  if ('not' in cond) {
    return !evaluate(cond.not, ctx);
  }
  if ('all' in cond) {
    return cond.all.every((c) => evaluate(c, ctx));
  }
  if ('any' in cond) {
    return cond.any.some((c) => evaluate(c, ctx));
  }

  // Personaje.
  if ('class' in cond) {
    return character.classId === cond.class;
  }
  if ('trait' in cond) {
    return character.traits.includes(cond.trait);
  }
  if ('skill' in cond) {
    return character.skills.includes(cond.skill);
  }
  if ('attr' in cond) {
    return character.attrs[cond.attr] >= cond.gte;
  }

  // Partida.
  if ('item' in cond) {
    return run.items.includes(cond.item);
  }
  if ('wounds' in cond) {
    const { gte, lte } = cond.wounds;
    const cumpleMin = gte === undefined || run.wounds >= gte;
    const cumpleMax = lte === undefined || run.wounds <= lte;
    return cumpleMin && cumpleMax;
  }
  if ('condition' in cond) {
    return run.conditions.includes(cond.condition);
  }

  // Memoria y relojes.
  if ('visited' in cond) {
    const visitas = run.visited[cond.visited] ?? 0;
    return visitas >= (cond.min ?? 1);
  }
  if ('met' in cond) {
    return hasFlag(state, `char:met.${cond.met}`);
  }
  if ('knows' in cond) {
    return hasFlag(state, `char:place.${cond.knows}`);
  }
  if ('clock' in cond) {
    const valor = run.clocks[cond.clock] ?? 0;
    return valor >= cond.gte;
  }
  if ('endingSeen' in cond) {
    const registro = character.campaignLog[campaign.id];
    return registro?.endings.includes(cond.endingSeen) ?? false;
  }

  // Si el tipo Condition gana una variante nueva, esta línea deja de compilar
  // y obliga a implementarla acá.
  const restante: never = cond;
  return restante;
}
```

- [ ] **Paso 19: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/conditions.test.ts
```

Resultado esperado: `Test Files 1 passed (1)`, `Tests 37 passed (37)`.

- [ ] **Paso 20: Commit**

```bash
git add src/engine/conditions.ts tests/engine/conditions.test.ts
git commit -m "feat: evaluate con visited, met, knows, clock y endingSeen; comprobación exhaustiva" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Verificación de la tarea

- [ ] **Paso 21: Verificación de la tarea** → correr desde la raíz del proyecto:

```bash
npx vitest run
npx tsc --noEmit -p tsconfig.json
```

Ambos comandos deben terminar sin errores (`vitest`: todos los archivos de test en verde, incluidos los de las tareas 1 a 4; `tsc`: sin salida, código 0; en particular, ni `src/engine/conditions.ts` ni `tests/fixtures/state.ts` ni `tests/engine/conditions.test.ts` producen errores de tipos con `strict`).

**Criterio de aceptación:** `evaluate` devuelve el valor correcto para las 16 variantes de `Condition` y para `undefined`, `hasFlag` respeta los tres alcances (con `stagedFlags` contando para `char:`/`world:` y nunca para `run:`), ninguna de las dos funciones muta su entrada, y `tests/fixtures/state.ts` exporta `makeWorld`, `makeCharacter`, `makeRun`, `makeState` y `makeCtx` listos para las tareas 6 a 10 y 13.

---

### Tarea 6: Aplicación de efectos (effects.ts)

Esta tarea implementa `applyEffects`, la única función del motor que modifica el estado de la partida a partir de la lista declarativa de efectos que escribe el contenido (`{ set: 'run:x' }`, `{ wound: 1 }`, `{ clock: 'pelea', delta: 1 }`, etc.). La función es pura: recibe el estado dentro de un `EvalContext`, devuelve un `GameState` nuevo y nunca muta la entrada. Todos los topes del sistema (6 objetos, 3 condiciones, 3 Heridas, Fortuna máxima por nivel, relojes con máximo) viven acá, y también la regla de dos pasos de la muerte permanente (`lethal`) y la marca de derrota cuando las Heridas llegan a 3.

Contexto de dominio que hace falta para entender los tests:

- **Flags** son strings con prefijo. `run:` vive en `run.flags` (se borra al terminar la partida). `char:` y `world:` no se escriben directo en el personaje ni en el mundo: durante la partida se "apuestan" en `run.stagedFlags` y solo se consolidan al terminar por un final (eso lo hace `endRun`, tarea 10). `applyEffects` solo decide en qué lista va cada flag.
- **Heridas** (`run.wounds`) van de 0 a 3: 0 Sano, 1 Herido, 2 Malherido, 3 Caído. Llegar a 3 es derrota (se pierde la campaña, el personaje sigue). `{ lethal: true }` aplica 2 Heridas y, si el personaje ya estaba Malherido (2 Heridas previas), muere de verdad: `run.outcome = { kind: 'death' }`. Si estaba Herido (1), llega a 3 y es derrota normal. Si estaba Sano (0), queda Malherido y sigue jugando.
- **Condiciones** (`run.conditions`) son etiquetas como `asustado` o `exhausto`; máximo 3; al agregar una cuarta se descarta la más antigua (la de índice 0).
- **Fortuna** (`run.fortune`) son puntos para repetir dados; el máximo depende del nivel del personaje (`fortuneMax`: 3, y 4 desde nivel 5). Esa función pertenece a `progression.ts` (tarea 8); acá se crea el archivo con solo esa función y la tarea 8 lo completa sin renombrarla.
- **Relojes** (`run.clocks`) son contadores por campaña con un máximo declarado en `campaign.clocks[nombre].max`; se recortan a `0..max`.

**Archivos:**
- Crear: `src/engine/effects.ts`
- Crear: `src/engine/progression.ts` (solo con `fortuneMax`; la tarea 8 agrega `campaignLabel` y `veteranModifier` en este mismo archivo)
- Test: `tests/engine/effects.test.ts`
- Modificar (solo si falta algún helper, ver Paso 1): `tests/fixtures/state.ts` (agregar `makeCharacter`, `makeRun`, `makeState` al final del archivo, sin borrar nada)

**Interfaces:**
- Consume:
  - De `@/content/catalog` (tarea 2): `LIMITS` (`{ maxItems: 6, maxConditions: 3, maxWounds: 3, fortuneBase: 3, fortuneFromLevel5: 4, … } as const`) y el tipo `ConditionId`.
  - De `@/content/schema` (tarea 3): los tipos `Effect`, `FlagId` y `Campaign`.
  - De `@/engine/types` (ya existente): los tipos `EvalContext`, `GameState`, `Run`, `Character`, `WorldState`, `SeenMap`.
  - De `tests/fixtures/state.ts` (tarea 5): `makeCharacter(overrides?: Partial<Character>): Character`, `makeRun(overrides?: Partial<Run>): Run`, `makeState(overrides?: { world?: Partial<WorldState>; character?: Partial<Character>; run?: Partial<Run>; seen?: SeenMap }): GameState`. Los valores por defecto que se asumen: `wounds: 0`, `conditions: []`, `items: []`, `flags: []`, `stagedFlags: []`, `clocks: {}`, `milestones: []`, `fortune: 3`, `outcome` ausente, personaje de nivel 3.
- Produce:
  - `src/engine/effects.ts`: `export function applyEffects(effects: Effect[] | undefined, ctx: EvalContext): GameState`
  - `src/engine/progression.ts`: `export function fortuneMax(level: number): number` (`level >= 5 ? LIMITS.fortuneFromLevel5 : LIMITS.fortuneBase`)

La campaña usada en los tests se arma dentro del propio archivo de test (no se toma del fixture `minimal.ts`) para controlar exactamente qué relojes declara; es un objeto `Campaign` completo y válido para el tipo, con `scenes` vacío porque `applyEffects` nunca mira escenas.

---

- [ ] **Paso 1: Confirmar los helpers del fixture de estado**

Abrir `tests/fixtures/state.ts` (creado en la tarea 5) y verificar que exporta `makeCharacter`, `makeRun` y `makeState` con las firmas de la sección "Consume". Si los tres existen con esos nombres, no tocar el archivo y pasar al Paso 2.

Si falta alguno (la tarea 5 pudo haber creado helpers con otros nombres), agregar **al final del archivo**, sin borrar lo existente, el bloque completo que sigue (si alguno de los tres ya existe con ese nombre exacto, omitir solo esa función para no duplicar el export):

```ts
import type { Character, GameState, Run, SeenMap, WorldState } from '@/engine/types';

export function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'pj_prueba',
    name: 'Prueba',
    portrait: 'mago_01',
    classId: 'mago',
    attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
    traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
    skills: [],
    level: 3,
    xp: 120,
    flags: [],
    memoryNames: {},
    relics: [],
    scars: [],
    campaignLog: {},
    run: null,
    ...overrides,
  };
}

export function makeRun(overrides: Partial<Run> = {}): Run {
  return {
    campaignId: 'prueba',
    contentVersion: 1,
    sceneId: 'p_umbral',
    flags: [],
    stagedFlags: [],
    visited: {},
    items: [],
    wounds: 0,
    conditions: [],
    fortune: 3,
    powerUsed: false,
    clocks: {},
    milestones: [],
    log: [],
    rngSeed: 1,
    ...overrides,
  };
}

export function makeState(
  overrides: { world?: Partial<WorldState>; character?: Partial<Character>; run?: Partial<Run>; seen?: SeenMap } = {},
): GameState {
  return {
    world: { flags: [], fallen: [], ...overrides.world },
    character: makeCharacter(overrides.character),
    run: makeRun(overrides.run),
    seen: overrides.seen ?? {},
  };
}
```

Si el archivo ya tenía una línea `import type … from '@/engine/types'`, unificar los imports en una sola línea en vez de repetirla (TypeScript acepta dos `import type` del mismo módulo, pero queda más limpio uno solo).

---

#### Ciclo 1: flags `set`/`clear`, efectos ausentes e inmutabilidad

- [ ] **Paso 2: Escribir el test que falla (flags e inmutabilidad)**

Crear `tests/engine/effects.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/content/schema';
import type { Character, EvalContext, Run } from '@/engine/types';
import { applyEffects } from '@/engine/effects';
import { makeState } from '../fixtures/state';

const campaign: Campaign = {
  id: 'fx',
  contentVersion: 1,
  title: 'Campaña de efectos',
  premise: 'Campaña mínima para probar la aplicación de efectos.',
  cover: 'fx_portada',
  levelRange: [1, 3],
  durationMin: [1, 2],
  lethalScenes: 0,
  lintProfile: 'smoke',
  hidden: true,
  start: 'inicio',
  scenes: {},
  npcs: {},
  places: {},
  items: {},
  flags: {},
  milestones: { entrar: { label: 'Entrar' } },
  clocks: { pelea: { max: 2, label: 'Pelea' } },
  endings: {},
};

function contexto(run: Partial<Run> = {}, character: Partial<Character> = {}): EvalContext {
  return { campaign, state: makeState({ run, character }) };
}

describe('applyEffects: efectos ausentes', () => {
  it('con undefined devuelve exactamente el mismo estado', () => {
    const ctx = contexto();
    expect(applyEffects(undefined, ctx)).toBe(ctx.state);
  });

  it('con una lista vacía devuelve exactamente el mismo estado', () => {
    const ctx = contexto();
    expect(applyEffects([], ctx)).toBe(ctx.state);
  });
});

describe('applyEffects: flags', () => {
  it('set run: agrega a run.flags y no a stagedFlags', () => {
    const result = applyEffects([{ set: 'run:tiene_pista' }], contexto());
    expect(result.run.flags).toEqual(['run:tiene_pista']);
    expect(result.run.stagedFlags).toEqual([]);
  });

  it('set run: no duplica un flag ya presente', () => {
    const result = applyEffects([{ set: 'run:tiene_pista' }, { set: 'run:tiene_pista' }], contexto());
    expect(result.run.flags).toEqual(['run:tiene_pista']);
  });

  it('set char: y world: van a stagedFlags, no a run.flags', () => {
    const result = applyEffects([{ set: 'char:fx.vio_la_cripta' }, { set: 'world:fx.torre_caida' }], contexto());
    expect(result.run.stagedFlags).toEqual(['char:fx.vio_la_cripta', 'world:fx.torre_caida']);
    expect(result.run.flags).toEqual([]);
  });

  it('set char: no duplica en stagedFlags', () => {
    const ctx = contexto({ stagedFlags: ['char:fx.vio_la_cripta'] });
    const result = applyEffects([{ set: 'char:fx.vio_la_cripta' }], ctx);
    expect(result.run.stagedFlags).toEqual(['char:fx.vio_la_cripta']);
  });

  it('clear run: quita el flag de run.flags', () => {
    const ctx = contexto({ flags: ['run:a', 'run:b'] });
    const result = applyEffects([{ clear: 'run:a' }], ctx);
    expect(result.run.flags).toEqual(['run:b']);
  });

  it('clear char: quita el flag de stagedFlags', () => {
    const ctx = contexto({ stagedFlags: ['char:fx.uno', 'world:fx.dos'] });
    const result = applyEffects([{ clear: 'world:fx.dos' }], ctx);
    expect(result.run.stagedFlags).toEqual(['char:fx.uno']);
  });

  it('clear de un flag ausente deja las listas iguales', () => {
    const ctx = contexto({ flags: ['run:a'] });
    const result = applyEffects([{ clear: 'run:zzz' }], ctx);
    expect(result.run.flags).toEqual(['run:a']);
  });
});

describe('applyEffects: inmutabilidad', () => {
  it('no muta el estado de entrada y devuelve objetos nuevos', () => {
    const ctx = contexto({ flags: ['run:a'] });
    const antes = structuredClone(ctx.state);
    const result = applyEffects([{ set: 'run:b' }, { clear: 'run:a' }], ctx);
    expect(ctx.state).toEqual(antes);
    expect(result).not.toBe(ctx.state);
    expect(result.run).not.toBe(ctx.state.run);
    expect(result.run.flags).not.toBe(ctx.state.run.flags);
    expect(result.run.flags).toEqual(['run:b']);
  });

  it('conserva world, character y seen del estado de entrada', () => {
    const ctx = contexto();
    const result = applyEffects([{ set: 'run:b' }], ctx);
    expect(result.world).toBe(ctx.state.world);
    expect(result.character).toBe(ctx.state.character);
    expect(result.seen).toBe(ctx.state.seen);
  });
});
```

- [ ] **Paso 3: Correr el test y verificar que falla**

```
npx vitest run tests/engine/effects.test.ts
```

Resultado esperado: el archivo falla al cargarse con un error de resolución de módulo, del estilo `Error: Failed to resolve import "@/engine/effects" from "tests/engine/effects.test.ts". Does the file exist?`. Ningún test corre todavía.

- [ ] **Paso 4: Implementación mínima (flags)**

Crear `src/engine/effects.ts` con este contenido completo:

```ts
import type { Effect, FlagId } from '@/content/schema';
import type { EvalContext, GameState, Run } from '@/engine/types';

function addUnique(list: readonly string[], value: string): string[] {
  return list.includes(value) ? [...list] : [...list, value];
}

function setFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: addUnique(run.flags, flag) };
  }
  return { ...run, stagedFlags: addUnique(run.stagedFlags, flag) };
}

function clearFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: run.flags.filter((f) => f !== flag) };
  }
  return { ...run, stagedFlags: run.stagedFlags.filter((f) => f !== flag) };
}

function applyOne(run: Run, effect: Effect): Run {
  if ('set' in effect) return setFlag(run, effect.set);
  if ('clear' in effect) return clearFlag(run, effect.clear);
  return run;
}

export function applyEffects(effects: Effect[] | undefined, ctx: EvalContext): GameState {
  if (effects === undefined || effects.length === 0) return ctx.state;
  const run: Run = effects.reduce<Run>((acc, effect) => applyOne(acc, effect), ctx.state.run);
  return { ...ctx.state, run };
}
```

Nota sobre el narrowing: `Effect` es una unión de objetos cuyas claves no se repiten entre miembros, así que `'set' in effect` reduce el tipo a `{ set: FlagId }` sin necesidad de aserciones. El `return run` final cubre los efectos que todavía no se aplican; los ciclos 2 a 5 reemplazan ese archivo entero con la versión que los aplica.

- [ ] **Paso 5: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/effects.test.ts
```

Resultado esperado: `Test Files 1 passed`, `Tests 11 passed` (2 de efectos ausentes + 7 de flags + 2 de inmutabilidad).

- [ ] **Paso 6: Commit**

```bash
git add src/engine/effects.ts tests/engine/effects.test.ts
git commit -m "feat(engine): applyEffects con flags run/char/world e inmutabilidad" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

Si en el Paso 1 hubo que agregar helpers al fixture, incluirlo en el mismo commit: `git add tests/fixtures/state.ts` antes del `git commit`.

---

#### Ciclo 2: objetos, hitos y relojes

- [ ] **Paso 7: Escribir el test que falla (give/take/milestone/clock)**

Agregar **al final** de `tests/engine/effects.test.ts` los siguientes bloques `describe`:

```ts
describe('applyEffects: objetos', () => {
  it('give agrega el objeto a run.items', () => {
    const result = applyEffects([{ give: 'llave_de_hierro' }], contexto());
    expect(result.run.items).toEqual(['llave_de_hierro']);
  });

  it('give ignora un objeto que ya se tiene', () => {
    const ctx = contexto({ items: ['llave_de_hierro'] });
    const result = applyEffects([{ give: 'llave_de_hierro' }], ctx);
    expect(result.run.items).toEqual(['llave_de_hierro']);
  });

  it('give ignora el objeto si ya hay maxItems (6) objetos', () => {
    const seis = ['o1', 'o2', 'o3', 'o4', 'o5', 'o6'];
    const ctx = contexto({ items: seis });
    const result = applyEffects([{ give: 'o7' }], ctx);
    expect(result.run.items).toEqual(seis);
  });

  it('give con 5 objetos agrega el sexto', () => {
    const ctx = contexto({ items: ['o1', 'o2', 'o3', 'o4', 'o5'] });
    const result = applyEffects([{ give: 'o6' }], ctx);
    expect(result.run.items).toEqual(['o1', 'o2', 'o3', 'o4', 'o5', 'o6']);
  });

  it('take quita el objeto si está', () => {
    const ctx = contexto({ items: ['llave_de_hierro', 'antorcha'] });
    const result = applyEffects([{ take: 'llave_de_hierro' }], ctx);
    expect(result.run.items).toEqual(['antorcha']);
  });

  it('take de un objeto ausente deja la lista igual', () => {
    const ctx = contexto({ items: ['antorcha'] });
    const result = applyEffects([{ take: 'llave_de_hierro' }], ctx);
    expect(result.run.items).toEqual(['antorcha']);
  });

  it('give seguido de take deja la lista vacía (se aplican en orden)', () => {
    const result = applyEffects([{ give: 'llave_de_hierro' }, { take: 'llave_de_hierro' }], contexto());
    expect(result.run.items).toEqual([]);
  });
});

describe('applyEffects: hitos', () => {
  it('milestone agrega el hito a run.milestones', () => {
    const result = applyEffects([{ milestone: 'entrar' }], contexto());
    expect(result.run.milestones).toEqual(['entrar']);
  });

  it('milestone no duplica un hito ya alcanzado', () => {
    const ctx = contexto({ milestones: ['entrar'] });
    const result = applyEffects([{ milestone: 'entrar' }], ctx);
    expect(result.run.milestones).toEqual(['entrar']);
  });
});

describe('applyEffects: relojes', () => {
  it('clock suma delta partiendo de 0 si el reloj no tenía valor', () => {
    const result = applyEffects([{ clock: 'pelea', delta: 1 }], contexto());
    expect(result.run.clocks).toEqual({ pelea: 1 });
  });

  it('clock no supera el max declarado en la campaña', () => {
    const ctx = contexto({ clocks: { pelea: 1 } });
    const result = applyEffects([{ clock: 'pelea', delta: 5 }], ctx);
    expect(result.run.clocks).toEqual({ pelea: 2 });
  });

  it('clock no baja de 0', () => {
    const ctx = contexto({ clocks: { pelea: 1 } });
    const result = applyEffects([{ clock: 'pelea', delta: -3 }], ctx);
    expect(result.run.clocks).toEqual({ pelea: 0 });
  });

  it('clock con delta 0 deja el reloj en su valor (y lo crea en 0 si no existía)', () => {
    const result = applyEffects([{ clock: 'pelea', delta: 0 }], contexto());
    expect(result.run.clocks).toEqual({ pelea: 0 });
  });

  it('clock de un reloj no declarado en la campaña no cambia nada', () => {
    const result = applyEffects([{ clock: 'inexistente', delta: 1 }], contexto());
    expect(result.run.clocks).toEqual({});
  });

  it('clock no muta el objeto clocks de entrada', () => {
    const ctx = contexto({ clocks: { pelea: 1 } });
    const result = applyEffects([{ clock: 'pelea', delta: 1 }], ctx);
    expect(ctx.state.run.clocks).toEqual({ pelea: 1 });
    expect(result.run.clocks).not.toBe(ctx.state.run.clocks);
  });
});
```

- [ ] **Paso 8: Correr el test y verificar que falla**

```
npx vitest run tests/engine/effects.test.ts
```

Resultado esperado: 11 tests pasan (los del ciclo 1) y fallan los nuevos que esperan cambios, con `AssertionError: expected [] to deeply equal [ 'llave_de_hierro' ]` en el primero de objetos, `expected [] to deeply equal [ 'entrar' ]` en hitos y `expected {} to deeply equal { pelea: 1 }` en relojes. Los tests que esperan "sin cambios" (give con 6, take ausente, reloj no declarado, give+take) pasan por casualidad; es normal.

- [ ] **Paso 9: Implementación mínima (objetos, hitos y relojes)**

Reemplazar `src/engine/effects.ts` entero por:

```ts
import { LIMITS } from '@/content/catalog';
import type { Effect, FlagId } from '@/content/schema';
import type { EvalContext, GameState, Run } from '@/engine/types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function addUnique(list: readonly string[], value: string): string[] {
  return list.includes(value) ? [...list] : [...list, value];
}

function setFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: addUnique(run.flags, flag) };
  }
  return { ...run, stagedFlags: addUnique(run.stagedFlags, flag) };
}

function clearFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: run.flags.filter((f) => f !== flag) };
  }
  return { ...run, stagedFlags: run.stagedFlags.filter((f) => f !== flag) };
}

function giveItem(run: Run, itemId: string): Run {
  if (run.items.length >= LIMITS.maxItems || run.items.includes(itemId)) return run;
  return { ...run, items: [...run.items, itemId] };
}

function takeItem(run: Run, itemId: string): Run {
  return { ...run, items: run.items.filter((i) => i !== itemId) };
}

function applyClock(run: Run, name: string, delta: number, ctx: EvalContext): Run {
  const def: { max: number; label: string } | undefined = ctx.campaign.clocks[name];
  if (def === undefined) return run;
  const current: number = run.clocks[name] ?? 0;
  return { ...run, clocks: { ...run.clocks, [name]: clamp(current + delta, 0, def.max) } };
}

function applyOne(run: Run, effect: Effect, ctx: EvalContext): Run {
  if ('set' in effect) return setFlag(run, effect.set);
  if ('clear' in effect) return clearFlag(run, effect.clear);
  if ('give' in effect) return giveItem(run, effect.give);
  if ('take' in effect) return takeItem(run, effect.take);
  if ('clock' in effect) return applyClock(run, effect.clock, effect.delta, ctx);
  if ('milestone' in effect) return { ...run, milestones: addUnique(run.milestones, effect.milestone) };
  return run;
}

export function applyEffects(effects: Effect[] | undefined, ctx: EvalContext): GameState {
  if (effects === undefined || effects.length === 0) return ctx.state;
  const run: Run = effects.reduce<Run>((acc, effect) => applyOne(acc, effect, ctx), ctx.state.run);
  return { ...ctx.state, run };
}
```

La anotación explícita `{ max: number; label: string } | undefined` en `applyClock` funciona tanto si `tsconfig.json` tiene `noUncheckedIndexedAccess` como si no: en ambos casos el acceso a un `Record<string, …>` con una clave arbitraria puede no existir en tiempo de ejecución y el `if (def === undefined)` lo cubre.

- [ ] **Paso 10: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/effects.test.ts
```

Resultado esperado: `Tests 26 passed` (11 del ciclo 1 + 7 de objetos + 2 de hitos + 6 de relojes).

- [ ] **Paso 11: Commit**

```bash
git add src/engine/effects.ts tests/engine/effects.test.ts
git commit -m "feat(engine): applyEffects con objetos, hitos y relojes con tope" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: Heridas y condiciones

- [ ] **Paso 12: Escribir el test que falla (wound/heal/addCondition/removeCondition)**

Agregar **al final** de `tests/engine/effects.test.ts`:

```ts
describe('applyEffects: heridas', () => {
  it('wound 1 desde Sano deja Herido (1)', () => {
    const result = applyEffects([{ wound: 1 }], contexto({ wounds: 0 }));
    expect(result.run.wounds).toBe(1);
  });

  it('wound 2 desde Sano deja Malherido (2)', () => {
    const result = applyEffects([{ wound: 2 }], contexto({ wounds: 0 }));
    expect(result.run.wounds).toBe(2);
  });

  it('wound satura en 3 (Caído)', () => {
    const result = applyEffects([{ wound: 2 }], contexto({ wounds: 2 }));
    expect(result.run.wounds).toBe(3);
  });

  it('heal baja una Herida', () => {
    const result = applyEffects([{ heal: 1 }], contexto({ wounds: 2 }));
    expect(result.run.wounds).toBe(1);
  });

  it('heal no baja de 0', () => {
    const result = applyEffects([{ heal: 1 }], contexto({ wounds: 0 }));
    expect(result.run.wounds).toBe(0);
  });
});

describe('applyEffects: condiciones', () => {
  it('addCondition agrega la condición', () => {
    const result = applyEffects([{ addCondition: 'asustado' }], contexto());
    expect(result.run.conditions).toEqual(['asustado']);
  });

  it('addCondition no duplica una condición ya presente', () => {
    const ctx = contexto({ conditions: ['asustado'] });
    const result = applyEffects([{ addCondition: 'asustado' }], ctx);
    expect(result.run.conditions).toEqual(['asustado']);
  });

  it('addCondition con 3 condiciones reemplaza la más antigua (índice 0)', () => {
    const ctx = contexto({ conditions: ['envenenado', 'asustado', 'exhausto'] });
    const result = applyEffects([{ addCondition: 'empapado' }], ctx);
    expect(result.run.conditions).toEqual(['asustado', 'exhausto', 'empapado']);
  });

  it('addCondition con 3 condiciones y una ya presente no cambia nada', () => {
    const ctx = contexto({ conditions: ['envenenado', 'asustado', 'exhausto'] });
    const result = applyEffects([{ addCondition: 'asustado' }], ctx);
    expect(result.run.conditions).toEqual(['envenenado', 'asustado', 'exhausto']);
  });

  it('removeCondition con id quita solo esa condición', () => {
    const ctx = contexto({ conditions: ['envenenado', 'asustado'] });
    const result = applyEffects([{ removeCondition: 'asustado' }], ctx);
    expect(result.run.conditions).toEqual(['envenenado']);
  });

  it("removeCondition 'all' vacía la lista", () => {
    const ctx = contexto({ conditions: ['envenenado', 'asustado', 'exhausto'] });
    const result = applyEffects([{ removeCondition: 'all' }], ctx);
    expect(result.run.conditions).toEqual([]);
  });

  it('removeCondition de una condición ausente deja la lista igual', () => {
    const ctx = contexto({ conditions: ['envenenado'] });
    const result = applyEffects([{ removeCondition: 'perseguido' }], ctx);
    expect(result.run.conditions).toEqual(['envenenado']);
  });

  it('no muta la lista de condiciones de entrada', () => {
    const ctx = contexto({ conditions: ['envenenado', 'asustado', 'exhausto'] });
    applyEffects([{ addCondition: 'empapado' }], ctx);
    expect(ctx.state.run.conditions).toEqual(['envenenado', 'asustado', 'exhausto']);
  });
});
```

- [ ] **Paso 13: Correr el test y verificar que falla**

```
npx vitest run tests/engine/effects.test.ts
```

Resultado esperado: fallan `wound 1 desde Sano deja Herido (1)` con `AssertionError: expected 0 to be 1`, `heal baja una Herida` con `expected 2 to be 1`, `addCondition agrega la condición` con `expected [] to deeply equal [ 'asustado' ]` y los demás que esperan cambios; los 26 anteriores siguen en verde.

- [ ] **Paso 14: Implementación mínima (heridas y condiciones)**

Reemplazar `src/engine/effects.ts` entero por:

```ts
import { LIMITS } from '@/content/catalog';
import type { ConditionId } from '@/content/catalog';
import type { Effect, FlagId } from '@/content/schema';
import type { EvalContext, GameState, Run } from '@/engine/types';

type Wounds = Run['wounds'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toWounds(value: number): Wounds {
  const w = clamp(value, 0, LIMITS.maxWounds);
  if (w === 0 || w === 1 || w === 2) return w;
  return 3;
}

function addUnique(list: readonly string[], value: string): string[] {
  return list.includes(value) ? [...list] : [...list, value];
}

function setFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: addUnique(run.flags, flag) };
  }
  return { ...run, stagedFlags: addUnique(run.stagedFlags, flag) };
}

function clearFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: run.flags.filter((f) => f !== flag) };
  }
  return { ...run, stagedFlags: run.stagedFlags.filter((f) => f !== flag) };
}

function giveItem(run: Run, itemId: string): Run {
  if (run.items.length >= LIMITS.maxItems || run.items.includes(itemId)) return run;
  return { ...run, items: [...run.items, itemId] };
}

function takeItem(run: Run, itemId: string): Run {
  return { ...run, items: run.items.filter((i) => i !== itemId) };
}

function addCondition(run: Run, id: ConditionId): Run {
  if (run.conditions.includes(id)) return run;
  const base: ConditionId[] =
    run.conditions.length >= LIMITS.maxConditions ? run.conditions.slice(1) : [...run.conditions];
  return { ...run, conditions: [...base, id] };
}

function removeCondition(run: Run, id: ConditionId | 'all'): Run {
  if (id === 'all') return { ...run, conditions: [] };
  return { ...run, conditions: run.conditions.filter((c) => c !== id) };
}

function applyClock(run: Run, name: string, delta: number, ctx: EvalContext): Run {
  const def: { max: number; label: string } | undefined = ctx.campaign.clocks[name];
  if (def === undefined) return run;
  const current: number = run.clocks[name] ?? 0;
  return { ...run, clocks: { ...run.clocks, [name]: clamp(current + delta, 0, def.max) } };
}

function applyOne(run: Run, effect: Effect, ctx: EvalContext): Run {
  if ('set' in effect) return setFlag(run, effect.set);
  if ('clear' in effect) return clearFlag(run, effect.clear);
  if ('give' in effect) return giveItem(run, effect.give);
  if ('take' in effect) return takeItem(run, effect.take);
  if ('wound' in effect) return { ...run, wounds: toWounds(run.wounds + effect.wound) };
  if ('heal' in effect) return { ...run, wounds: toWounds(run.wounds - effect.heal) };
  if ('addCondition' in effect) return addCondition(run, effect.addCondition);
  if ('removeCondition' in effect) return removeCondition(run, effect.removeCondition);
  if ('clock' in effect) return applyClock(run, effect.clock, effect.delta, ctx);
  if ('milestone' in effect) return { ...run, milestones: addUnique(run.milestones, effect.milestone) };
  return run;
}

export function applyEffects(effects: Effect[] | undefined, ctx: EvalContext): GameState {
  if (effects === undefined || effects.length === 0) return ctx.state;
  const run: Run = effects.reduce<Run>((acc, effect) => applyOne(acc, effect, ctx), ctx.state.run);
  return { ...ctx.state, run };
}
```

`toWounds` devuelve el tipo literal `0 | 1 | 2 | 3` sin aserciones: tras el `clamp`, las tres comparaciones estrechan `w` a `0 | 1 | 2` y el único valor restante posible es 3.

- [ ] **Paso 15: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/effects.test.ts
```

Resultado esperado: `Tests 39 passed` (26 anteriores + 5 de heridas + 8 de condiciones).

- [ ] **Paso 16: Commit**

```bash
git add src/engine/effects.ts tests/engine/effects.test.ts
git commit -m "feat(engine): applyEffects con heridas saturadas y condiciones con tope de 3" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: Fortuna con tope por nivel (`fortuneMax` en progression.ts)

- [ ] **Paso 17: Escribir el test que falla (fortune)**

Agregar **al final** de `tests/engine/effects.test.ts`:

```ts
describe('applyEffects: fortuna', () => {
  it('fortune +1 con nivel 3 no supera 3', () => {
    const ctx = contexto({ fortune: 3 }, { level: 3 });
    const result = applyEffects([{ fortune: 1 }], ctx);
    expect(result.run.fortune).toBe(3);
  });

  it('fortune +1 con nivel 5 llega a 4', () => {
    const ctx = contexto({ fortune: 3 }, { level: 5 });
    const result = applyEffects([{ fortune: 1 }], ctx);
    expect(result.run.fortune).toBe(4);
  });

  it('fortune +10 con nivel 5 se recorta a 4', () => {
    const ctx = contexto({ fortune: 2 }, { level: 5 });
    const result = applyEffects([{ fortune: 10 }], ctx);
    expect(result.run.fortune).toBe(4);
  });

  it('fortune +1 con nivel 1 y fortuna 2 llega a 3', () => {
    const ctx = contexto({ fortune: 2 }, { level: 1 });
    const result = applyEffects([{ fortune: 1 }], ctx);
    expect(result.run.fortune).toBe(3);
  });

  it('fortune negativa no baja de 0', () => {
    const ctx = contexto({ fortune: 1 }, { level: 3 });
    const result = applyEffects([{ fortune: -5 }], ctx);
    expect(result.run.fortune).toBe(0);
  });

  it('fortune -1 resta uno', () => {
    const ctx = contexto({ fortune: 3 }, { level: 3 });
    const result = applyEffects([{ fortune: -1 }], ctx);
    expect(result.run.fortune).toBe(2);
  });
});
```

- [ ] **Paso 18: Correr el test y verificar que falla**

```
npx vitest run tests/engine/effects.test.ts
```

Resultado esperado: fallan `fortune +1 con nivel 5 llega a 4` (`AssertionError: expected 3 to be 4`), `fortune +10 con nivel 5 se recorta a 4` (`expected 2 to be 4`), `fortune +1 con nivel 1 y fortuna 2 llega a 3` (`expected 2 to be 3`), `fortune negativa no baja de 0` (`expected 1 to be 0`) y `fortune -1 resta uno` (`expected 3 to be 2`). El primero pasa por casualidad porque el efecto todavía no se aplica.

- [ ] **Paso 19: Implementación mínima (progression.ts con fortuneMax y efecto fortune)**

Crear `src/engine/progression.ts` con este contenido completo (la tarea 8 agrega `campaignLabel` y `veteranModifier` en este mismo archivo y conserva `fortuneMax` tal cual):

```ts
import { LIMITS } from '@/content/catalog';

export function fortuneMax(level: number): number {
  return level >= 5 ? LIMITS.fortuneFromLevel5 : LIMITS.fortuneBase;
}
```

Reemplazar `src/engine/effects.ts` entero por:

```ts
import { LIMITS } from '@/content/catalog';
import type { ConditionId } from '@/content/catalog';
import type { Effect, FlagId } from '@/content/schema';
import { fortuneMax } from '@/engine/progression';
import type { EvalContext, GameState, Run } from '@/engine/types';

type Wounds = Run['wounds'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toWounds(value: number): Wounds {
  const w = clamp(value, 0, LIMITS.maxWounds);
  if (w === 0 || w === 1 || w === 2) return w;
  return 3;
}

function addUnique(list: readonly string[], value: string): string[] {
  return list.includes(value) ? [...list] : [...list, value];
}

function setFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: addUnique(run.flags, flag) };
  }
  return { ...run, stagedFlags: addUnique(run.stagedFlags, flag) };
}

function clearFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: run.flags.filter((f) => f !== flag) };
  }
  return { ...run, stagedFlags: run.stagedFlags.filter((f) => f !== flag) };
}

function giveItem(run: Run, itemId: string): Run {
  if (run.items.length >= LIMITS.maxItems || run.items.includes(itemId)) return run;
  return { ...run, items: [...run.items, itemId] };
}

function takeItem(run: Run, itemId: string): Run {
  return { ...run, items: run.items.filter((i) => i !== itemId) };
}

function addCondition(run: Run, id: ConditionId): Run {
  if (run.conditions.includes(id)) return run;
  const base: ConditionId[] =
    run.conditions.length >= LIMITS.maxConditions ? run.conditions.slice(1) : [...run.conditions];
  return { ...run, conditions: [...base, id] };
}

function removeCondition(run: Run, id: ConditionId | 'all'): Run {
  if (id === 'all') return { ...run, conditions: [] };
  return { ...run, conditions: run.conditions.filter((c) => c !== id) };
}

function applyClock(run: Run, name: string, delta: number, ctx: EvalContext): Run {
  const def: { max: number; label: string } | undefined = ctx.campaign.clocks[name];
  if (def === undefined) return run;
  const current: number = run.clocks[name] ?? 0;
  return { ...run, clocks: { ...run.clocks, [name]: clamp(current + delta, 0, def.max) } };
}

function applyFortune(run: Run, delta: number, ctx: EvalContext): Run {
  const max = fortuneMax(ctx.state.character.level);
  return { ...run, fortune: clamp(run.fortune + delta, 0, max) };
}

function applyOne(run: Run, effect: Effect, ctx: EvalContext): Run {
  if ('set' in effect) return setFlag(run, effect.set);
  if ('clear' in effect) return clearFlag(run, effect.clear);
  if ('give' in effect) return giveItem(run, effect.give);
  if ('take' in effect) return takeItem(run, effect.take);
  if ('wound' in effect) return { ...run, wounds: toWounds(run.wounds + effect.wound) };
  if ('heal' in effect) return { ...run, wounds: toWounds(run.wounds - effect.heal) };
  if ('addCondition' in effect) return addCondition(run, effect.addCondition);
  if ('removeCondition' in effect) return removeCondition(run, effect.removeCondition);
  if ('clock' in effect) return applyClock(run, effect.clock, effect.delta, ctx);
  if ('milestone' in effect) return { ...run, milestones: addUnique(run.milestones, effect.milestone) };
  if ('fortune' in effect) return applyFortune(run, effect.fortune, ctx);
  return run;
}

export function applyEffects(effects: Effect[] | undefined, ctx: EvalContext): GameState {
  if (effects === undefined || effects.length === 0) return ctx.state;
  const run: Run = effects.reduce<Run>((acc, effect) => applyOne(acc, effect, ctx), ctx.state.run);
  return { ...ctx.state, run };
}
```

- [ ] **Paso 20: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/effects.test.ts
```

Resultado esperado: `Tests 45 passed` (39 anteriores + 6 de fortuna).

- [ ] **Paso 21: Commit**

```bash
git add src/engine/progression.ts src/engine/effects.ts tests/engine/effects.test.ts
git commit -m "feat(engine): efecto fortune con tope por nivel y fortuneMax en progression" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 5: `lethal` (regla de dos pasos) y derrota al llegar a 3 Heridas

- [ ] **Paso 22: Escribir el test que falla (lethal, defeat, death)**

Agregar **al final** de `tests/engine/effects.test.ts`:

```ts
describe('applyEffects: lethal y desenlaces', () => {
  it('lethal desde Sano (0) deja Malherido (2) sin outcome', () => {
    const result = applyEffects([{ lethal: true }], contexto({ wounds: 0 }));
    expect(result.run.wounds).toBe(2);
    expect(result.run.outcome).toBeUndefined();
  });

  it('lethal desde Herido (1) deja Caído (3) con outcome defeat', () => {
    const result = applyEffects([{ lethal: true }], contexto({ wounds: 1 }));
    expect(result.run.wounds).toBe(3);
    expect(result.run.outcome).toEqual({ kind: 'defeat' });
  });

  it('lethal desde Malherido (2) deja Caído (3) con outcome death', () => {
    const result = applyEffects([{ lethal: true }], contexto({ wounds: 2 }));
    expect(result.run.wounds).toBe(3);
    expect(result.run.outcome).toEqual({ kind: 'death' });
  });

  it('wound normal hasta 3 marca defeat, nunca death', () => {
    const result = applyEffects([{ wound: 1 }], contexto({ wounds: 2 }));
    expect(result.run.wounds).toBe(3);
    expect(result.run.outcome).toEqual({ kind: 'defeat' });
  });

  it('wound 2 desde Malherido satura en 3 y marca defeat (solo lethal mata)', () => {
    const result = applyEffects([{ wound: 2 }], contexto({ wounds: 2 }));
    expect(result.run.wounds).toBe(3);
    expect(result.run.outcome).toEqual({ kind: 'defeat' });
  });

  it('tres wound 1 seguidos en la misma lista terminan en defeat', () => {
    const result = applyEffects([{ wound: 1 }, { wound: 1 }, { wound: 1 }], contexto({ wounds: 0 }));
    expect(result.run.wounds).toBe(3);
    expect(result.run.outcome).toEqual({ kind: 'defeat' });
  });

  it('wound seguido de heal en la misma lista no marca defeat si termina bajo 3', () => {
    const result = applyEffects([{ wound: 1 }, { heal: 1 }], contexto({ wounds: 2 }));
    expect(result.run.wounds).toBe(2);
    expect(result.run.outcome).toBeUndefined();
  });

  it('sin llegar a 3 Heridas no hay outcome', () => {
    const result = applyEffects([{ wound: 1 }], contexto({ wounds: 0 }));
    expect(result.run.outcome).toBeUndefined();
  });

  it('death no se pisa por la comprobación final de derrota', () => {
    const result = applyEffects([{ lethal: true }, { set: 'run:cayo' }], contexto({ wounds: 2 }));
    expect(result.run.outcome).toEqual({ kind: 'death' });
    expect(result.run.flags).toEqual(['run:cayo']);
  });

  it('un outcome ya presente se conserva aunque haya 3 Heridas', () => {
    const ctx = contexto({ wounds: 3, outcome: { kind: 'ending', endingId: 'fin_huida' } });
    const result = applyEffects([{ set: 'run:x' }], ctx);
    expect(result.run.outcome).toEqual({ kind: 'ending', endingId: 'fin_huida' });
  });
});
```

- [ ] **Paso 23: Correr el test y verificar que falla**

```
npx vitest run tests/engine/effects.test.ts
```

Resultado esperado: fallan `lethal desde Sano (0) deja Malherido (2) sin outcome` con `AssertionError: expected 0 to be 2`, `lethal desde Herido (1) …` con `expected 1 to be 3`, `lethal desde Malherido (2) …` con `expected 2 to be 3`, y los que esperan `{ kind: 'defeat' }` con `expected undefined to deeply equal { kind: 'defeat' }`. Los 45 anteriores siguen en verde.

- [ ] **Paso 24: Implementación final (lethal y comprobación de derrota)**

Reemplazar `src/engine/effects.ts` entero por la versión definitiva:

```ts
import { LIMITS } from '@/content/catalog';
import type { ConditionId } from '@/content/catalog';
import type { Effect, FlagId } from '@/content/schema';
import { fortuneMax } from '@/engine/progression';
import type { EvalContext, GameState, Run } from '@/engine/types';

type Wounds = Run['wounds'];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toWounds(value: number): Wounds {
  const w = clamp(value, 0, LIMITS.maxWounds);
  if (w === 0 || w === 1 || w === 2) return w;
  return 3;
}

function addUnique(list: readonly string[], value: string): string[] {
  return list.includes(value) ? [...list] : [...list, value];
}

function setFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: addUnique(run.flags, flag) };
  }
  return { ...run, stagedFlags: addUnique(run.stagedFlags, flag) };
}

function clearFlag(run: Run, flag: FlagId): Run {
  if (flag.startsWith('run:')) {
    return { ...run, flags: run.flags.filter((f) => f !== flag) };
  }
  return { ...run, stagedFlags: run.stagedFlags.filter((f) => f !== flag) };
}

function giveItem(run: Run, itemId: string): Run {
  if (run.items.length >= LIMITS.maxItems || run.items.includes(itemId)) return run;
  return { ...run, items: [...run.items, itemId] };
}

function takeItem(run: Run, itemId: string): Run {
  return { ...run, items: run.items.filter((i) => i !== itemId) };
}

function addCondition(run: Run, id: ConditionId): Run {
  if (run.conditions.includes(id)) return run;
  const base: ConditionId[] =
    run.conditions.length >= LIMITS.maxConditions ? run.conditions.slice(1) : [...run.conditions];
  return { ...run, conditions: [...base, id] };
}

function removeCondition(run: Run, id: ConditionId | 'all'): Run {
  if (id === 'all') return { ...run, conditions: [] };
  return { ...run, conditions: run.conditions.filter((c) => c !== id) };
}

function applyClock(run: Run, name: string, delta: number, ctx: EvalContext): Run {
  const def: { max: number; label: string } | undefined = ctx.campaign.clocks[name];
  if (def === undefined) return run;
  const current: number = run.clocks[name] ?? 0;
  return { ...run, clocks: { ...run.clocks, [name]: clamp(current + delta, 0, def.max) } };
}

function applyFortune(run: Run, delta: number, ctx: EvalContext): Run {
  const max = fortuneMax(ctx.state.character.level);
  return { ...run, fortune: clamp(run.fortune + delta, 0, max) };
}

// Regla de dos pasos: lethal aplica 2 Heridas. Si el personaje ya estaba Malherido
// (2 o más Heridas previas) muere de verdad; con menos, satura en 3 y la
// comprobación final de applyEffects lo marca como derrota normal.
function applyLethal(run: Run): Run {
  const previas = run.wounds;
  const herido: Run = { ...run, wounds: toWounds(previas + 2) };
  if (previas >= 2) return { ...herido, outcome: { kind: 'death' } };
  return herido;
}

function applyOne(run: Run, effect: Effect, ctx: EvalContext): Run {
  if ('set' in effect) return setFlag(run, effect.set);
  if ('clear' in effect) return clearFlag(run, effect.clear);
  if ('give' in effect) return giveItem(run, effect.give);
  if ('take' in effect) return takeItem(run, effect.take);
  if ('wound' in effect) return { ...run, wounds: toWounds(run.wounds + effect.wound) };
  if ('heal' in effect) return { ...run, wounds: toWounds(run.wounds - effect.heal) };
  if ('addCondition' in effect) return addCondition(run, effect.addCondition);
  if ('removeCondition' in effect) return removeCondition(run, effect.removeCondition);
  if ('clock' in effect) return applyClock(run, effect.clock, effect.delta, ctx);
  if ('milestone' in effect) return { ...run, milestones: addUnique(run.milestones, effect.milestone) };
  if ('fortune' in effect) return applyFortune(run, effect.fortune, ctx);
  return applyLethal(run);
}

export function applyEffects(effects: Effect[] | undefined, ctx: EvalContext): GameState {
  if (effects === undefined || effects.length === 0) return ctx.state;
  const aplicado: Run = effects.reduce<Run>((acc, effect) => applyOne(acc, effect, ctx), ctx.state.run);
  const run: Run =
    aplicado.wounds === LIMITS.maxWounds && aplicado.outcome === undefined
      ? { ...aplicado, outcome: { kind: 'defeat' } }
      : aplicado;
  return { ...ctx.state, run };
}
```

Sobre el último `return applyLethal(run)` de `applyOne`: después de descartar por `in` las once claves anteriores, TypeScript estrecha `effect` a `{ lethal: true }`, el único miembro restante de la unión `Effect`. Si en el futuro se agrega un miembro nuevo a `Effect`, ese `return` lo trataría como `lethal`, así que la tarea que amplíe `Effect` debe agregar su rama acá; por eso conviene que `applyOne` quede como única puerta de entrada de cada efecto.

- [ ] **Paso 25: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/effects.test.ts
```

Resultado esperado: `Test Files 1 passed`, `Tests 55 passed` (45 anteriores + 10 de lethal y desenlaces).

- [ ] **Paso 26: Commit**

```bash
git add src/engine/effects.ts tests/engine/effects.test.ts
git commit -m "feat(engine): lethal con regla de dos pasos y derrota al llegar a 3 Heridas" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

- [ ] **Paso 27: Verificación de la tarea**

Correr, uno por línea:

```
npx vitest run
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: toda la suite en verde (los 55 tests de `effects.test.ts` más los de las tareas 1 a 5) y `tsc` sin errores (sin `any`, sin non-null assertions fuera de tests, exports con tipos explícitos).

Criterio de aceptación: `applyEffects` aplica los doce tipos de efecto del contrato respetando los topes (`maxItems`, `maxConditions`, `maxWounds`, `fortuneMax`, `clocks[x].max`), separa los flags `run:` de los apostados `char:`/`world:`, implementa la regla de dos pasos de `lethal` (Sano → Malherido, Herido → defeat, Malherido → death) y marca `defeat` al terminar con 3 Heridas, todo sin mutar el estado de entrada; y `src/engine/progression.ts` existe con `fortuneMax` lista para que la tarea 8 la complete.

---

### Tarea 7: Texto con variantes y derivación de memoria (text.ts, memory.ts)

**Qué se construye.** Dos módulos puros del motor:

1. `src/engine/text.ts`: convierte el `Text` de una escena (una lista de strings de narrador y de `Paragraph` con variantes condicionadas) en una lista de `ResolvedParagraph` listos para mostrar, y calcula el hash estable (FNV-1a en base36) de un párrafo mostrado. Ese hash es lo que el juego guarda en `seen` para saber qué párrafos ya leyó el jugador ("saltar leído" se frena exactamente en las variantes nuevas).
2. `src/engine/memory.ts`: al salir de una escena por una elección, deriva la memoria automática sin trabajo del autor: marca en el personaje que conoció a los PNJ de la escena (`char:met.<npc>`) y el lugar (`char:place.<lugar>`), cuenta la visita en `run.visited` y agrega a `seen[sceneId]` los hashes de los párrafos mostrados.

Regla de diseño que estas funciones respetan (spec, sección 2 y 5): el texto se resuelve contra el estado **antes** de derivar la memoria de la escena actual; la derivación ocurre al elegir. Por eso `resolveText` solo lee y `deriveMemory` solo escribe; quien las encadena en orden es `resolve.ts` (Tareas 9 y 10). Ambas funciones son puras: nunca mutan la entrada y devuelven objetos nuevos.

**Archivos:**
- Crear: `src/engine/text.ts`
- Crear: `src/engine/memory.ts`
- Test: `tests/engine/text.test.ts`
- Test: `tests/engine/memory.test.ts`

**Interfaces:**
- Consume:
  - De `src/content/schema.ts` (Tarea 3), solo tipos: `Text = (string | Paragraph)[]`, `Paragraph { speaker?: string; variants: TextVariant[] }`, `TextVariant { when?: Condition; text: string }`, `Campaign`, `Scene`.
  - De `src/engine/types.ts` (Tarea 3/4, según dónde lo haya creado el plan; en el contrato es la sección E), solo tipos: `GameState`, `EvalContext { campaign: Campaign; state: GameState }`, `ResolvedParagraph { speaker?: string; text: string }`, `SeenMap = Record<string, string[]>`.
  - De `src/engine/rng.ts` (Tarea 4): `hash32(...parts: (string | number)[]): number` (FNV-1a de 32 bits sobre `parts.join('|')`, resultado `>>> 0`).
  - De `src/engine/conditions.ts` (Tarea 5): `evaluate(cond: Condition | undefined, ctx: EvalContext): boolean` (`undefined` → `true`; `met` consulta `char:met.<x>` en `character.flags ∪ run.stagedFlags`).
  - Fixtures: esta tarea NO depende de `tests/fixtures/campaigns/minimal.ts` ni de `tests/fixtures/state.ts`. Cada archivo de test construye localmente una campaña y un estado mínimos con ids de escena, PNJ y lugar conocidos, para que las aserciones sean exactas. No se crean archivos nuevos en `tests/fixtures/`.
- Produce (para las Tareas 9, 10, 12 y 14):
  - `src/engine/text.ts`:
    - `export function hashParagraph(text: string): string` — `hash32(text).toString(36)`.
    - `export function resolveText(text: Text, ctx: EvalContext): ResolvedParagraph[]` — string → `{ text }` (narrador); `Paragraph` → primera variante cuyo `when` cumple (sin `when` = siempre), conservando `speaker`; si ninguna cumple, el párrafo se omite.
  - `src/engine/memory.ts`:
    - `export function deriveMemory(ctx: EvalContext, sceneId: string, hashes: string[]): GameState` — `character.flags ∪= char:met.<npc>` por cada `scene.npcs` y `char:place.<scene.place>`; `run.visited[sceneId] = (prev ?? 0) + 1`; `seen[sceneId] ∪= hashes`. Si `sceneId` no existe en `campaign.scenes`, lanza `new Error(\`Escena desconocida: ${sceneId}\`)` (mismo mensaje que `getScene` de la Tarea 9).

---

#### Ciclo 1: `hashParagraph`

- [ ] **Paso 1: Escribir el test que falla**

Crear `tests/engine/text.test.ts` con este contenido completo:

```ts
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
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```
npx vitest run tests/engine/text.test.ts
```

Resultado esperado: el archivo falla al cargar con un error del estilo `Error: Failed to resolve import "@/engine/text" from "tests/engine/text.test.ts". Does the file exist?` (el módulo todavía no existe). Ningún test pasa.

- [ ] **Paso 3: Implementación mínima**

Crear `src/engine/text.ts` con este contenido completo:

```ts
import { hash32 } from '@/engine/rng';

/**
 * Hash estable de un párrafo mostrado: FNV-1a de 32 bits expresado en base36.
 * Se guarda en `seen[campaña][escena]` para saber qué párrafos ya leyó el jugador.
 */
export function hashParagraph(text: string): string {
  return hash32(text).toString(36);
}
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/text.test.ts
```

Resultado esperado: `Test Files 1 passed (1)`, `Tests 4 passed (4)`.

- [ ] **Paso 5: Commit**

```bash
git add src/engine/text.ts tests/engine/text.test.ts
git commit -m "feat(engine): hashParagraph con FNV-1a en base36" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 2: `resolveText` con narrador y speaker

- [ ] **Paso 6: Escribir el test que falla**

Reemplazar el bloque de imports al inicio de `tests/engine/text.test.ts` por este (se agregan `resolveText`, los tipos y un fixture local):

```ts
import { describe, expect, it } from 'vitest';
import { hashParagraph, resolveText } from '@/engine/text';
import { hash32 } from '@/engine/rng';
import type { Campaign, Text } from '@/content/schema';
import type { EvalContext, GameState } from '@/engine/types';

/** Campaña mínima solo para dar contexto a `evaluate`; no tiene escenas porque resolveText no las necesita. */
const campania: Campaign = {
  id: 'texto_test',
  contentVersion: 1,
  title: 'Campaña de prueba de texto',
  premise: 'Solo para tests.',
  cover: 'portada_test',
  levelRange: [1, 3],
  durationMin: [1, 2],
  lethalScenes: 0,
  lintProfile: 'smoke',
  start: 'inicio',
  scenes: {},
  npcs: {},
  places: {},
  items: {},
  flags: {},
  milestones: {},
  clocks: {},
  endings: {},
};

interface StateOverrides {
  characterFlags?: string[];
  runFlags?: string[];
  items?: string[];
}

function makeState(over: StateOverrides = {}): GameState {
  return {
    world: { flags: [], fallen: [] },
    character: {
      id: 'pj_1',
      name: 'Prueba',
      portrait: 'mago_01',
      classId: 'mago',
      attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
      traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
      skills: [],
      level: 3,
      xp: 0,
      flags: over.characterFlags ?? [],
      memoryNames: {},
      relics: [],
      scars: [],
      campaignLog: {},
      run: null,
    },
    run: {
      campaignId: campania.id,
      contentVersion: 1,
      sceneId: 'inicio',
      flags: over.runFlags ?? [],
      stagedFlags: [],
      visited: {},
      items: over.items ?? [],
      wounds: 0,
      conditions: [],
      fortune: 3,
      powerUsed: false,
      clocks: {},
      milestones: [],
      log: [],
      rngSeed: 1,
    },
    seen: {},
  };
}

function makeCtx(over: StateOverrides = {}): EvalContext {
  return { campaign: campania, state: makeState(over) };
}
```

Y agregar al final de `tests/engine/text.test.ts` este bloque:

```ts
describe('resolveText: narrador y speaker', () => {
  it('un string se convierte en párrafo de narrador sin speaker', () => {
    const texto: Text = ['La plaza está vacía.'];
    const resultado = resolveText(texto, makeCtx());
    expect(resultado).toStrictEqual([{ text: 'La plaza está vacía.' }]);
    expect('speaker' in resultado[0]!).toBe(false);
  });

  it('un Paragraph con speaker conserva el speaker en el párrafo resuelto', () => {
    const texto: Text = [{ speaker: 'centinela', variants: [{ text: '—Alto ahí.' }] }];
    expect(resolveText(texto, makeCtx())).toStrictEqual([{ speaker: 'centinela', text: '—Alto ahí.' }]);
  });

  it('un Paragraph sin speaker es de narrador', () => {
    const texto: Text = [{ variants: [{ text: 'El centinela te mira.' }] }];
    const resultado = resolveText(texto, makeCtx());
    expect(resultado).toStrictEqual([{ text: 'El centinela te mira.' }]);
    expect('speaker' in resultado[0]!).toBe(false);
  });

  it('respeta el orden de los párrafos mezclando strings y Paragraphs', () => {
    const texto: Text = [
      'Primero.',
      { speaker: 'orell', variants: [{ text: '—Segundo.' }] },
      'Tercero.',
    ];
    expect(resolveText(texto, makeCtx())).toStrictEqual([
      { text: 'Primero.' },
      { speaker: 'orell', text: '—Segundo.' },
      { text: 'Tercero.' },
    ]);
  });

  it('con un Text vacío devuelve una lista vacía', () => {
    expect(resolveText([], makeCtx())).toStrictEqual([]);
  });
});
```

- [ ] **Paso 7: Correr el test y verificar que falla**

```
npx vitest run tests/engine/text.test.ts
```

Resultado esperado: los 4 tests de `hashParagraph` pasan y los 5 de `resolveText: narrador y speaker` fallan con `TypeError: resolveText is not a function` (el export no existe todavía). Si el proyecto tiene `noUncheckedIndexedAccess` desactivado, `tsc` podría avisar que el `!` en `resultado[0]!` es innecesario; es solo un test y no rompe nada.

- [ ] **Paso 8: Implementación mínima**

Reemplazar `src/engine/text.ts` por este contenido completo (todavía toma la primera variante sin evaluar `when`; eso llega en el ciclo 3):

```ts
import type { Text } from '@/content/schema';
import type { EvalContext, ResolvedParagraph } from '@/engine/types';
import { hash32 } from '@/engine/rng';

/**
 * Hash estable de un párrafo mostrado: FNV-1a de 32 bits expresado en base36.
 * Se guarda en `seen[campaña][escena]` para saber qué párrafos ya leyó el jugador.
 */
export function hashParagraph(text: string): string {
  return hash32(text).toString(36);
}

/**
 * Convierte el Text de una escena en párrafos listos para mostrar.
 * - string → párrafo de narrador.
 * - Paragraph → primera variante (el ciclo 3 agrega la evaluación de `when`).
 */
export function resolveText(text: Text, ctx: EvalContext): ResolvedParagraph[] {
  void ctx;
  const resultado: ResolvedParagraph[] = [];
  for (const item of text) {
    if (typeof item === 'string') {
      resultado.push({ text: item });
      continue;
    }
    const variante = item.variants[0];
    if (variante === undefined) {
      continue;
    }
    resultado.push(
      item.speaker === undefined ? { text: variante.text } : { speaker: item.speaker, text: variante.text },
    );
  }
  return resultado;
}
```

- [ ] **Paso 9: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/text.test.ts
```

Resultado esperado: `Tests 9 passed (9)`.

- [ ] **Paso 10: Commit**

```bash
git add src/engine/text.ts tests/engine/text.test.ts
git commit -m "feat(engine): resolveText con narrador y speaker" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: `resolveText` con prioridad de variantes y omisión

- [ ] **Paso 11: Escribir el test que falla**

Agregar al final de `tests/engine/text.test.ts` este bloque:

```ts
describe('resolveText: variantes condicionadas', () => {
  /** La más específica va arriba; la última no tiene `when` y es la de siempre. */
  const parrafoHub: Text = [
    {
      variants: [
        { when: { all: [{ flag: 'run:a' }, { flag: 'run:b' }] }, text: 'Tenés las dos pistas.' },
        { when: { flag: 'run:a' }, text: 'Tenés la pista A.' },
        { when: { flag: 'run:b' }, text: 'Tenés la pista B.' },
        { text: 'No sabés nada todavía.' },
      ],
    },
  ];

  it('gana la primera variante cuyo when se cumple, en orden de escritura', () => {
    expect(resolveText(parrafoHub, makeCtx({ runFlags: ['run:a', 'run:b'] }))).toStrictEqual([
      { text: 'Tenés las dos pistas.' },
    ]);
    expect(resolveText(parrafoHub, makeCtx({ runFlags: ['run:a'] }))).toStrictEqual([{ text: 'Tenés la pista A.' }]);
    expect(resolveText(parrafoHub, makeCtx({ runFlags: ['run:b'] }))).toStrictEqual([{ text: 'Tenés la pista B.' }]);
  });

  it('sin ningún when cumplido cae en la variante sin when', () => {
    expect(resolveText(parrafoHub, makeCtx())).toStrictEqual([{ text: 'No sabés nada todavía.' }]);
  });

  it('una variante sin when siempre gana aunque haya otras después', () => {
    const texto: Text = [
      { variants: [{ text: 'Siempre.' }, { when: { flag: 'run:a' }, text: 'Nunca se muestra.' }] },
    ];
    expect(resolveText(texto, makeCtx({ runFlags: ['run:a'] }))).toStrictEqual([{ text: 'Siempre.' }]);
  });

  it('un párrafo sin variante válida se omite y no deja hueco', () => {
    const texto: Text = [
      'Antes.',
      { variants: [{ when: { flag: 'run:no_existe' }, text: 'Oculto.' }] },
      { variants: [] },
      'Después.',
    ];
    expect(resolveText(texto, makeCtx())).toStrictEqual([{ text: 'Antes.' }, { text: 'Después.' }]);
  });

  it('conserva el speaker de la variante que gana', () => {
    const texto: Text = [
      {
        speaker: 'orell',
        variants: [
          { when: { trait: 'desertor' }, text: '—Un desertor. Se te nota en cómo parás.' },
          { text: '—Nadie cruza hasta que amanezca.' },
        ],
      },
    ];
    expect(resolveText(texto, makeCtx())).toStrictEqual([
      { speaker: 'orell', text: '—Nadie cruza hasta que amanezca.' },
    ]);
  });

  it('las variantes de memoria (met, knows) leen los flags del personaje', () => {
    const texto: Text = [
      {
        variants: [
          { when: { met: 'orell' }, text: 'Lo conocés de otra crónica.' },
          { text: 'Un sargento de barba gris te apunta con la ballesta.' },
        ],
      },
      {
        variants: [
          { when: { knows: 'puente_viejo' }, text: 'El puente viejo, otra vez.' },
          { text: 'El puente viejo está cerrado con tablones.' },
        ],
      },
    ];
    expect(resolveText(texto, makeCtx())).toStrictEqual([
      { text: 'Un sargento de barba gris te apunta con la ballesta.' },
      { text: 'El puente viejo está cerrado con tablones.' },
    ]);
    expect(
      resolveText(texto, makeCtx({ characterFlags: ['char:met.orell', 'char:place.puente_viejo'] })),
    ).toStrictEqual([{ text: 'Lo conocés de otra crónica.' }, { text: 'El puente viejo, otra vez.' }]);
  });

  it('evalúa condiciones que no son flags (item, trait) con el mismo contexto', () => {
    const texto: Text = [
      {
        variants: [
          { when: { item: 'carta_lacrada' }, text: 'Mostrás la carta.' },
          { when: { trait: 'aprendiz_de_escriba' }, text: 'Leés el lacre desde lejos.' },
          { text: 'No tenés nada que mostrar.' },
        ],
      },
    ];
    expect(resolveText(texto, makeCtx({ items: ['carta_lacrada'] }))).toStrictEqual([{ text: 'Mostrás la carta.' }]);
    expect(resolveText(texto, makeCtx())).toStrictEqual([{ text: 'Leés el lacre desde lejos.' }]);
  });
});
```

- [ ] **Paso 12: Correr el test y verificar que falla**

```
npx vitest run tests/engine/text.test.ts
```

Resultado esperado: los 9 tests anteriores pasan; de los 7 nuevos fallan al menos `gana la primera variante cuyo when se cumple`, `sin ningún when cumplido cae en la variante sin when`, `un párrafo sin variante válida se omite`, `conserva el speaker de la variante que gana`, `las variantes de memoria` y `evalúa condiciones que no son flags`, con diferencias del estilo `expected [{ text: 'Tenés las dos pistas.' }] to strictly equal [{ text: 'No sabés nada todavía.' }]` (la implementación actual toma la primera variante sin mirar `when`). `una variante sin when siempre gana` ya pasa; es una guarda de regresión.

- [ ] **Paso 13: Implementación mínima**

Reemplazar `src/engine/text.ts` por este contenido completo (versión final del módulo):

```ts
import type { Text } from '@/content/schema';
import type { EvalContext, ResolvedParagraph } from '@/engine/types';
import { evaluate } from '@/engine/conditions';
import { hash32 } from '@/engine/rng';

/**
 * Hash estable de un párrafo mostrado: FNV-1a de 32 bits expresado en base36.
 * Se guarda en `seen[campaña][escena]` para saber qué párrafos ya leyó el jugador.
 */
export function hashParagraph(text: string): string {
  return hash32(text).toString(36);
}

/**
 * Convierte el Text de una escena en párrafos listos para mostrar.
 * - string → párrafo de narrador (sin speaker).
 * - Paragraph → la PRIMERA variante cuyo `when` se cumple (sin `when` = siempre);
 *   el autor escribe la más específica arriba y cierra con una sin `when`.
 * - Si ninguna variante se cumple, el párrafo se omite.
 * Solo lee el estado: la derivación de memoria de la escena actual ocurre después, al elegir.
 */
export function resolveText(text: Text, ctx: EvalContext): ResolvedParagraph[] {
  const resultado: ResolvedParagraph[] = [];
  for (const item of text) {
    if (typeof item === 'string') {
      resultado.push({ text: item });
      continue;
    }
    const variante = item.variants.find((v) => evaluate(v.when, ctx));
    if (variante === undefined) {
      continue;
    }
    resultado.push(
      item.speaker === undefined ? { text: variante.text } : { speaker: item.speaker, text: variante.text },
    );
  }
  return resultado;
}
```

- [ ] **Paso 14: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/text.test.ts
```

Resultado esperado: `Tests 16 passed (16)`.

- [ ] **Paso 15: Commit**

```bash
git add src/engine/text.ts tests/engine/text.test.ts
git commit -m "feat(engine): resolveText evalúa variantes por prioridad y omite párrafos sin variante válida" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: `deriveMemory` marca PNJ conocidos y lugar sin duplicar

- [ ] **Paso 16: Escribir el test que falla**

Crear `tests/engine/memory.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import { deriveMemory } from '@/engine/memory';
import type { Campaign } from '@/content/schema';
import type { EvalContext, GameState, SeenMap } from '@/engine/types';

/** Campaña mínima con dos escenas: una con PNJ y otra sin PNJ. */
const campania: Campaign = {
  id: 'memoria_test',
  contentVersion: 1,
  title: 'Campaña de prueba de memoria',
  premise: 'Solo para tests.',
  cover: 'portada_test',
  levelRange: [1, 3],
  durationMin: [1, 2],
  lethalScenes: 0,
  lintProfile: 'smoke',
  start: 'plaza',
  scenes: {
    plaza: {
      id: 'plaza',
      kind: 'hub',
      place: 'plaza_mayor',
      npcs: ['orell', 'ilse'],
      text: ['La plaza de noche.'],
      choices: [],
    },
    callejon: {
      id: 'callejon',
      kind: 'normal',
      place: 'callejon_oscuro',
      text: ['El callejón huele a humedad.'],
      choices: [],
    },
  },
  npcs: {
    orell: { id: 'orell', name: 'Orell', portrait: 'orell', voice: 'Seco y cansado.', canonPrompt: 'sargento de barba gris' },
    ilse: { id: 'ilse', name: 'Ilse', portrait: 'ilse', voice: 'Rápida y directa.', canonPrompt: 'joven de pelo oscuro' },
  },
  places: {
    plaza_mayor: { id: 'plaza_mayor', name: 'Plaza mayor', background: 'plaza_mayor', canonPrompt: 'plaza medieval de noche' },
    callejon_oscuro: { id: 'callejon_oscuro', name: 'Callejón oscuro', background: 'callejon_oscuro', canonPrompt: 'callejón estrecho' },
  },
  items: {},
  flags: {},
  milestones: {},
  clocks: {},
  endings: {},
};

interface StateOverrides {
  characterFlags?: string[];
  visited?: Record<string, number>;
  seen?: SeenMap;
}

function makeState(over: StateOverrides = {}): GameState {
  return {
    world: { flags: ['world:caido.otra'], fallen: [] },
    character: {
      id: 'pj_1',
      name: 'Prueba',
      portrait: 'mago_01',
      classId: 'mago',
      attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
      traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
      skills: [],
      level: 3,
      xp: 0,
      flags: over.characterFlags ?? [],
      memoryNames: {},
      relics: [],
      scars: [],
      campaignLog: {},
      run: null,
    },
    run: {
      campaignId: campania.id,
      contentVersion: 1,
      sceneId: 'plaza',
      flags: ['run:pista_a'],
      stagedFlags: ['char:memoria_test.apostado'],
      visited: over.visited ?? {},
      items: ['llave_de_hierro'],
      wounds: 1,
      conditions: ['asustado'],
      fortune: 2,
      powerUsed: false,
      clocks: { pelea: 1 },
      milestones: ['entrar'],
      log: [],
      rngSeed: 42,
    },
    seen: over.seen ?? {},
  };
}

function makeCtx(over: StateOverrides = {}): EvalContext {
  return { campaign: campania, state: makeState(over) };
}

describe('deriveMemory: PNJ conocidos y lugar', () => {
  it('agrega char:met.<npc> por cada PNJ de la escena y char:place.<lugar>', () => {
    const resultado = deriveMemory(makeCtx(), 'plaza', []);
    expect(resultado.character.flags).toEqual(
      expect.arrayContaining(['char:met.orell', 'char:met.ilse', 'char:place.plaza_mayor']),
    );
    expect(resultado.character.flags).toHaveLength(3);
  });

  it('en una escena sin PNJ solo agrega el lugar', () => {
    const resultado = deriveMemory(makeCtx(), 'callejon', []);
    expect(resultado.character.flags).toStrictEqual(['char:place.callejon_oscuro']);
  });

  it('no duplica flags que el personaje ya tenía', () => {
    const ctx = makeCtx({ characterFlags: ['char:met.orell', 'char:origen.desertor'] });
    const resultado = deriveMemory(ctx, 'plaza', []);
    expect(resultado.character.flags).toStrictEqual([
      'char:met.orell',
      'char:origen.desertor',
      'char:met.ilse',
      'char:place.plaza_mayor',
    ]);
  });

  it('derivar dos veces la misma escena deja los mismos flags', () => {
    const primera = deriveMemory(makeCtx(), 'plaza', []);
    const segunda = deriveMemory({ campaign: campania, state: primera }, 'plaza', []);
    expect(segunda.character.flags).toStrictEqual(primera.character.flags);
  });

  it('conserva el resto del personaje, el mundo y la partida', () => {
    const ctx = makeCtx();
    const resultado = deriveMemory(ctx, 'plaza', []);
    expect(resultado.world).toStrictEqual(ctx.state.world);
    expect(resultado.character.name).toBe('Prueba');
    expect(resultado.character.traits).toStrictEqual(['aprendiz_de_escriba', 'cazador_furtivo']);
    expect(resultado.run.flags).toStrictEqual(['run:pista_a']);
    expect(resultado.run.stagedFlags).toStrictEqual(['char:memoria_test.apostado']);
    expect(resultado.run.wounds).toBe(1);
    expect(resultado.run.conditions).toStrictEqual(['asustado']);
    expect(resultado.run.clocks).toStrictEqual({ pelea: 1 });
    expect(resultado.run.sceneId).toBe('plaza');
  });

  it('lanza un error en español si la escena no existe en la campaña', () => {
    expect(() => deriveMemory(makeCtx(), 'no_existe', [])).toThrow('Escena desconocida: no_existe');
  });
});
```

- [ ] **Paso 17: Correr el test y verificar que falla**

```
npx vitest run tests/engine/memory.test.ts
```

Resultado esperado: el archivo falla al cargar con `Error: Failed to resolve import "@/engine/memory" from "tests/engine/memory.test.ts". Does the file exist?`. Ningún test pasa.

- [ ] **Paso 18: Implementación mínima**

Crear `src/engine/memory.ts` con este contenido completo (por ahora solo los flags; visitas y `seen` llegan en el ciclo 5):

```ts
import type { Scene } from '@/content/schema';
import type { EvalContext, GameState } from '@/engine/types';

/** Unión ordenada sin duplicados: conserva `base` y agrega los de `extra` que falten, en orden. */
function unir(base: readonly string[], extra: readonly string[]): string[] {
  const resultado = [...base];
  for (const valor of extra) {
    if (!resultado.includes(valor)) {
      resultado.push(valor);
    }
  }
  return resultado;
}

/**
 * Deriva la memoria automática al salir de una escena por una elección.
 * Marca en el personaje los PNJ conocidos (`char:met.<npc>`) y el lugar (`char:place.<lugar>`).
 */
export function deriveMemory(ctx: EvalContext, sceneId: string, hashes: string[]): GameState {
  void hashes;
  const { campaign, state } = ctx;
  const escena: Scene | undefined = campaign.scenes[sceneId];
  if (escena === undefined) {
    throw new Error(`Escena desconocida: ${sceneId}`);
  }
  const nuevosFlags = [...(escena.npcs ?? []).map((npc) => `char:met.${npc}`), `char:place.${escena.place}`];
  return {
    ...state,
    character: { ...state.character, flags: unir(state.character.flags, nuevosFlags) },
  };
}
```

- [ ] **Paso 19: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/memory.test.ts
```

Resultado esperado: `Tests 6 passed (6)`.

- [ ] **Paso 20: Commit**

```bash
git add src/engine/memory.ts tests/engine/memory.test.ts
git commit -m "feat(engine): deriveMemory marca PNJ conocidos y lugar sin duplicar" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 5: `deriveMemory` cuenta visitas, une hashes en `seen` y no muta la entrada

- [ ] **Paso 21: Escribir el test que falla**

Agregar al final de `tests/engine/memory.test.ts` este bloque:

```ts
describe('deriveMemory: visitas y párrafos vistos', () => {
  it('la primera visita completa pone run.visited[sceneId] en 1', () => {
    const resultado = deriveMemory(makeCtx(), 'plaza', []);
    expect(resultado.run.visited).toStrictEqual({ plaza: 1 });
  });

  it('cada derivación incrementa el contador de esa escena y respeta las otras', () => {
    const resultado = deriveMemory(makeCtx({ visited: { plaza: 2, callejon: 1 } }), 'plaza', []);
    expect(resultado.run.visited).toStrictEqual({ plaza: 3, callejon: 1 });
  });

  it('crea seen[sceneId] con los hashes cuando la escena no estaba', () => {
    const resultado = deriveMemory(makeCtx(), 'plaza', ['h1', 'h2']);
    expect(resultado.seen).toStrictEqual({ plaza: ['h1', 'h2'] });
  });

  it('une los hashes con los ya vistos sin duplicar y conserva las otras escenas', () => {
    const ctx = makeCtx({ seen: { plaza: ['h1'], callejon: ['h9'] } });
    const resultado = deriveMemory(ctx, 'plaza', ['h1', 'h2', 'h2']);
    expect(resultado.seen).toStrictEqual({ plaza: ['h1', 'h2'], callejon: ['h9'] });
  });

  it('con hashes vacíos deja seen[sceneId] como lista vacía si no existía', () => {
    const resultado = deriveMemory(makeCtx(), 'callejon', []);
    expect(resultado.seen).toStrictEqual({ callejon: [] });
  });
});

/** Congela recursivamente: si la implementación mutara la entrada, lanzaría TypeError (los módulos ES corren en modo estricto). */
function congelar<T>(valor: T): T {
  if (valor !== null && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.freeze(valor);
    for (const clave of Object.keys(valor as Record<string, unknown>)) {
      congelar((valor as Record<string, unknown>)[clave]);
    }
  }
  return valor;
}

describe('deriveMemory: pureza y encadenado', () => {
  it('no muta el estado de entrada (congelado) y devuelve objetos nuevos', () => {
    const ctx = makeCtx({ characterFlags: ['char:met.orell'], visited: { plaza: 1 }, seen: { plaza: ['h1'] } });
    congelar(ctx);
    const foto = JSON.stringify(ctx.state);
    const resultado = deriveMemory(ctx, 'plaza', ['h2']);
    expect(JSON.stringify(ctx.state)).toBe(foto);
    expect(resultado).not.toBe(ctx.state);
    expect(resultado.character).not.toBe(ctx.state.character);
    expect(resultado.character.flags).not.toBe(ctx.state.character.flags);
    expect(resultado.run).not.toBe(ctx.state.run);
    expect(resultado.run.visited).not.toBe(ctx.state.run.visited);
    expect(resultado.seen).not.toBe(ctx.state.seen);
    expect(resultado.seen['plaza']).not.toBe(ctx.state.seen['plaza']);
  });

  it('no muta la lista de hashes que recibe', () => {
    const hashes = ['h1', 'h1'];
    deriveMemory(makeCtx(), 'plaza', hashes);
    expect(hashes).toStrictEqual(['h1', 'h1']);
  });

  it('el resultado sirve como entrada de otra derivación (encadenable)', () => {
    const primera = deriveMemory(makeCtx(), 'plaza', ['h1']);
    const segunda = deriveMemory({ campaign: campania, state: primera }, 'callejon', ['h5']);
    expect(segunda.run.visited).toStrictEqual({ plaza: 1, callejon: 1 });
    expect(segunda.seen).toStrictEqual({ plaza: ['h1'], callejon: ['h5'] });
    expect(segunda.character.flags).toStrictEqual([
      'char:met.orell',
      'char:met.ilse',
      'char:place.plaza_mayor',
      'char:place.callejon_oscuro',
    ]);
  });
});
```

- [ ] **Paso 22: Correr el test y verificar que falla**

```
npx vitest run tests/engine/memory.test.ts
```

Resultado esperado: los 6 tests anteriores pasan. De los 8 nuevos fallan 7: los 5 de `visitas y párrafos vistos` con diferencias del estilo `expected {} to strictly equal { plaza: 1 }` y `expected {} to strictly equal { plaza: [ 'h1', 'h2' ] }`; `no muta el estado de entrada` falla en `expect(resultado.run).not.toBe(ctx.state.run)` (la implementación del ciclo 4 reutiliza `run` y `seen` sin copiarlos); y `encadenable` falla en `visited`. Solo `no muta la lista de hashes` pasa ya.

- [ ] **Paso 23: Implementación mínima**

Reemplazar `src/engine/memory.ts` por este contenido completo (versión final del módulo):

```ts
import type { Scene } from '@/content/schema';
import type { EvalContext, GameState } from '@/engine/types';

/** Unión ordenada sin duplicados: conserva `base` y agrega los de `extra` que falten, en orden. */
function unir(base: readonly string[], extra: readonly string[]): string[] {
  const resultado = [...base];
  for (const valor of extra) {
    if (!resultado.includes(valor)) {
      resultado.push(valor);
    }
  }
  return resultado;
}

/**
 * Deriva la memoria automática al salir de una escena por una elección (cero trabajo del autor):
 * - `character.flags ∪= char:met.<npc>` por cada PNJ de `scene.npcs` y `char:place.<scene.place>`;
 * - `run.visited[sceneId] = (previo ?? 0) + 1` (una visita COMPLETA: se cuenta al elegir, no al entrar);
 * - `seen[sceneId] ∪= hashes` (hashes de los párrafos que efectivamente se mostraron).
 * Pura: devuelve un GameState nuevo y no toca la entrada.
 * Lanza `Escena desconocida: <id>` si la escena no existe en la campaña.
 */
export function deriveMemory(ctx: EvalContext, sceneId: string, hashes: string[]): GameState {
  const { campaign, state } = ctx;
  const escena: Scene | undefined = campaign.scenes[sceneId];
  if (escena === undefined) {
    throw new Error(`Escena desconocida: ${sceneId}`);
  }
  const nuevosFlags = [...(escena.npcs ?? []).map((npc) => `char:met.${npc}`), `char:place.${escena.place}`];
  const visitasPrevias = state.run.visited[sceneId] ?? 0;
  const vistosPrevios = state.seen[sceneId] ?? [];
  return {
    ...state,
    character: { ...state.character, flags: unir(state.character.flags, nuevosFlags) },
    run: { ...state.run, visited: { ...state.run.visited, [sceneId]: visitasPrevias + 1 } },
    seen: { ...state.seen, [sceneId]: unir(vistosPrevios, hashes) },
  };
}
```

- [ ] **Paso 24: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/memory.test.ts
```

Resultado esperado: `Tests 14 passed (14)`.

- [ ] **Paso 25: Commit**

```bash
git add src/engine/memory.ts tests/engine/memory.test.ts
git commit -m "feat(engine): deriveMemory cuenta visitas completas, une hashes vistos y devuelve objetos nuevos" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Verificación de la tarea

- [ ] **Paso 26: Verificación de la tarea**

Correr, uno por línea:

```
npx vitest run
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: todos los archivos de test del proyecto en verde (incluidos `tests/engine/text.test.ts` con 16 tests y `tests/engine/memory.test.ts` con 14) y `tsc` sin errores ni salida.

Si algún test de `resolveText: variantes condicionadas` falla o `src/engine/text.ts` todavía contiene `void ctx;`, quedó la versión intermedia del ciclo 2; reemplazarla por la del paso 13. Lo mismo con `void hashes;` en `src/engine/memory.ts` (versión intermedia del ciclo 4; la final es la del paso 23).

Comprobación de capas (regla del contrato): `src/engine/text.ts` y `src/engine/memory.ts` importan solo de `@/engine/*` y de `@/content/schema` (tipos); ninguno importa React, el store ni nada de Vite. Confirmar con:

```
npx tsc --noEmit -p tsconfig.json
git grep -n "from '" -- src/engine/text.ts src/engine/memory.ts
```

Las únicas rutas que deben aparecer son `@/content/schema`, `@/engine/types`, `@/engine/conditions` y `@/engine/rng`.

**Criterio de aceptación:** `resolveText` convierte strings en párrafos de narrador, elige la primera variante cuyo `when` cumple conservando `speaker` y omite los párrafos sin variante válida; `hashParagraph` es base36 estable y distinto para textos distintos; `deriveMemory` agrega `char:met.<npc>` y `char:place.<lugar>` sin duplicar, incrementa `visited`, une hashes en `seen` sin duplicar, lanza `Escena desconocida: <id>` para escenas inexistentes y nunca muta la entrada; todo en verde con `npx vitest run` y `npx tsc --noEmit -p tsconfig.json`.

---

### Tarea 8: Modificadores de tirada y progresión (modifiers.ts, progression.ts)

Esta tarea implementa las dos piezas puras que la UI y el motor usan para decir, ANTES de tirar, con qué modificador y en qué modo (normal, ventaja, desventaja o anulado) se tira, y qué probabilidad exacta tiene cada banda. También implementa la etiqueta de dificultad relativa de una campaña (Mortal, Exigente, Pareja, Tranquila, Paseo), el modificador Veterano que esa etiqueta impone y el máximo de Fortuna según nivel.

Contexto de dominio que necesitás saber (todo está en el contrato, sección F):

- Una tirada (`Roll`) tiene un atributo (`vigor`, `astucia`, `saber`, `presencia`), una dificultad (`facil` +1, `normal` 0, `dificil` -1, `muy_dificil` -2, `extrema` -3) y una lista de `tags` (`fisico`, `sigilo`, `saber`, etc.).
- Las **fuentes de ventaja** son: cada rasgo del personaje cuyo tag está en `roll.tags`, cada habilidad ídem, cada objeto que el personaje lleva en la partida (`run.items`) cuyos `advantageTags` intersecan `roll.tags`, y la condición `advantageIf` de la tirada si se cumple.
- Las **fuentes de desventaja** son: la Debilidad de la clase si su tag está en `roll.tags`, cada condición activa (`run.conditions`) cuyo tag está en `roll.tags` o es `'all'`, estar Herido (`run.wounds === 1`) si la tirada tiene tag `fisico`, estar Malherido (`run.wounds === 2`) en cualquier tirada, y `disadvantageIf` si se cumple.
- Ventaja y desventaja **no se acumulan**: si hay al menos una de cada tipo, todas las fuentes quedan marcadas `cancelled: true` y se tira normal (modo `'cancelled'`, que tira 2d6 igual que `'normal'` pero la UI muestra los chips tachados).
- El modificador total de una tirada es `attrs[attr] + DIFFICULTIES[difficulty] + veteranMod`. El único número extra del sistema es **Veterano**: -1 si la campaña es Tranquila para ese personaje, -2 si es Paseo, 0 en los demás casos.
- La etiqueta de campaña compara `campaign.levelRange = [min, max]` con `character.level`: `level ≤ min-2` → mortal; `level === min-1` → exigente; `min ≤ level ≤ max` → pareja; `level ≤ max+2` → tranquila; más → paseo.
- Fortuna máxima: 3 puntos (`LIMITS.fortuneBase`) y 4 desde nivel 5 (`LIMITS.fortuneFromLevel5`).

El personaje de prueba del contrato (sección G, `createTestCharacter`) es un **mago nivel 3** con `saber 2 / astucia 1 / presencia 1 / vigor 0` y rasgos `aprendiz_de_escriba` (tag `saber`) y `cazador_furtivo` (tag `sigilo`). La Debilidad del mago es `fisico`. Todos los tests usan ese personaje, con overrides puntuales.

**Archivos:**
- Modificar: `src/engine/progression.ts` (creado en la tarea 6, Paso 19, con solo `fortuneMax`; esta tarea agrega `CampaignLabel`, `campaignLabel` y `veteranModifier` en el mismo archivo y conserva `fortuneMax` tal cual, sin renombrarla)
- Crear: `src/engine/modifiers.ts`
- Crear: `tests/fixtures/modifiers.ts` (fixture propio de esta tarea: campaña mínima con objetos y helpers para armar `EvalContext`)
- Test: `tests/engine/progression.test.ts`
- Test: `tests/engine/modifiers.test.ts`

**Interfaces:**
- Consume (de tareas anteriores, firmas exactas del contrato):
  - `src/content/catalog.ts` (tarea 2): `TRAITS`, `SKILLS`, `CLASSES`, `CONDITIONS`, `DIFFICULTIES`, `WOUND_LABELS`, `LIMITS`, y los tipos `Tag`, `Attr`, `Difficulty`.
  - `src/content/schema.ts` (tarea 3): tipos `Roll`, `Item`, `Campaign`, `Outcome`.
  - `src/engine/types.ts` (tarea 4 o anterior, según el plan): `EvalContext`, `GameState`, `Character`, `Run`, `RollSource`, `RollPreview`, `RollMode`.
  - `src/engine/dice.ts` (tarea 4): `odds(totalMod: number, mode: RollMode): { success: number; partial: number; failure: number }`, `riskLabel(o: { success: number; partial: number; failure: number }): Risk`, `targetLine(totalMod: number): string`.
  - `src/engine/conditions.ts` (tarea 5): `evaluate(cond: Condition | undefined, ctx: EvalContext): boolean`.
- Produce (para las tareas 9, 10, 13 y 14):
  - `src/engine/progression.ts`:
    - `export type CampaignLabel = 'mortal' | 'exigente' | 'pareja' | 'tranquila' | 'paseo'` (nuevo)
    - `export function campaignLabel(levelRange: [number, number], level: number): CampaignLabel` (nuevo)
    - `export function veteranModifier(label: CampaignLabel): number` (nuevo)
    - `export function fortuneMax(level: number): number` (ya existe desde la tarea 6; `src/engine/effects.ts` la importa, así que no cambia de nombre ni de firma)
  - `src/engine/modifiers.ts`:
    - `export function rollSources(roll: Roll, ctx: EvalContext): RollSource[]`
    - `export function rollMode(sources: RollSource[]): RollMode`
    - `export function buildPreview(roll: Roll, ctx: EvalContext): RollPreview`
  - `tests/fixtures/modifiers.ts` (solo para tests; no lo importa código de `src/`):
    - `export const campanaModificadores: Campaign` (campaña mínima, `levelRange [3, 5]`, con los objetos `llave_de_hierro` (advantageTags `['sigilo']`), `amuleto_de_runas` (advantageTags `['saber', 'magia']`) y `piedra_lisa` (sin advantageTags), y el flag `run:tiene_pista`)
    - `export function personajeMago(overrides?: Partial<Character>): Character` (el personaje de prueba del contrato)
    - `export function partidaBase(overrides?: Partial<Run>): Run`
    - `export function contextoPrueba(opts?: { character?: Partial<Character>; run?: Partial<Run>; campaign?: Campaign }): EvalContext`

Nota sobre capas: `src/engine/modifiers.ts` importa solo de `src/engine/*` y `src/content/{catalog,schema}`. Los objetos se buscan en `ctx.campaign.items`; el motor no importa `src/content/world` (regla de capas del contrato, sección B). En la Fase A `world.items` está vacío, así que no se pierde nada.

---

#### Ciclo 1: progresión (campaignLabel, veteranModifier, fortuneMax)

- [ ] **Paso 1: Escribir el test que falla**

Crear el archivo `tests/engine/progression.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import { LIMITS } from '@/content/catalog';
import { campaignLabel, fortuneMax, veteranModifier, type CampaignLabel } from '@/engine/progression';

describe('campaignLabel', () => {
  const rango: [number, number] = [3, 5];

  it.each<[number, CampaignLabel]>([
    [1, 'mortal'],
    [2, 'exigente'],
    [3, 'pareja'],
    [4, 'pareja'],
    [5, 'pareja'],
    [6, 'tranquila'],
    [7, 'tranquila'],
    [8, 'paseo'],
    [10, 'paseo'],
  ])('con rango [3, 5] el nivel %i es %s', (level, esperado) => {
    expect(campaignLabel(rango, level)).toBe(esperado);
  });

  it('con rango [1, 3] un personaje nuevo juega en Pareja', () => {
    expect(campaignLabel([1, 3], 1)).toBe('pareja');
  });

  it('con rango [1, 3] los niveles 4 y 5 son Tranquila y el 6 es Paseo', () => {
    expect(campaignLabel([1, 3], 4)).toBe('tranquila');
    expect(campaignLabel([1, 3], 5)).toBe('tranquila');
    expect(campaignLabel([1, 3], 6)).toBe('paseo');
  });

  it('el borde inferior se calcula igual aunque el mínimo sea 1', () => {
    expect(campaignLabel([1, 3], 0)).toBe('exigente');
    expect(campaignLabel([1, 3], -1)).toBe('mortal');
  });

  it('no muta el rango recibido', () => {
    const copia: [number, number] = [3, 5];
    campaignLabel(copia, 1);
    campaignLabel(copia, 9);
    expect(copia).toEqual([3, 5]);
  });
});

describe('veteranModifier', () => {
  it('es 0 en mortal, exigente y pareja', () => {
    expect(veteranModifier('mortal')).toBe(0);
    expect(veteranModifier('exigente')).toBe(0);
    expect(veteranModifier('pareja')).toBe(0);
  });

  it('es -1 en tranquila y -2 en paseo', () => {
    expect(veteranModifier('tranquila')).toBe(-1);
    expect(veteranModifier('paseo')).toBe(-2);
  });
});

describe('fortuneMax', () => {
  it('devuelve fortuneBase por debajo del nivel 5', () => {
    expect(fortuneMax(1)).toBe(LIMITS.fortuneBase);
    expect(fortuneMax(4)).toBe(LIMITS.fortuneBase);
    expect(fortuneMax(1)).toBe(3);
  });

  it('devuelve fortuneFromLevel5 desde el nivel 5', () => {
    expect(fortuneMax(5)).toBe(LIMITS.fortuneFromLevel5);
    expect(fortuneMax(10)).toBe(LIMITS.fortuneFromLevel5);
    expect(fortuneMax(5)).toBe(4);
  });
});
```

Aclaración sobre el tercer test de `campaignLabel`: con `[1, 3]` el nivel 4 está a 1 por encima del máximo, así que es Tranquila. El tope de nivel por campaña (`levelRange[1] + 1`) es una regla de XP de la Fase C y no afecta a la etiqueta; no "corrijas" la aserción. El cuarto test usa niveles 0 y -1 que no existen en el juego: solo verifica que la aritmética del borde inferior no tiene un caso especial.

- [ ] **Paso 2: Correr el test y verificar que falla**

```
npx vitest run tests/engine/progression.test.ts
```

Resultado esperado: el módulo `@/engine/progression` existe desde la tarea 6 (solo con `fortuneMax`), así que el archivo carga sin error de resolución. Los 2 tests de `fortuneMax` pasan; los 13 de `campaignLabel` (los 9 casos del `it.each` más los otros 4) fallan con `TypeError: campaignLabel is not a function` y los 2 de `veteranModifier` con `TypeError: veteranModifier is not a function`. Si Vitest reporta en cambio `SyntaxError: The requested module '@/engine/progression' does not provide an export named 'campaignLabel'`, es la misma causa (el export todavía no existe) y ningún test del archivo corre; ambas formas son el fallo esperado. Si el error fuera `Failed to resolve import "@/engine/progression"`, la tarea 6 no se completó: volvé a su Paso 19 antes de seguir.

- [ ] **Paso 3: Implementación mínima**

Reemplazar TODO el contenido de `src/engine/progression.ts` por este (es el archivo de la tarea 6 con `fortuneMax` idéntica, más `CampaignLabel`, `campaignLabel` y `veteranModifier`):

```ts
import { LIMITS } from '@/content/catalog';

/**
 * Etiqueta de dificultad relativa de una campaña para un personaje.
 * Se calcula contra el nivel del personaje; los umbrales de las escenas nunca escalan.
 */
export type CampaignLabel = 'mortal' | 'exigente' | 'pareja' | 'tranquila' | 'paseo';

/**
 * level ≤ min-2 → mortal; level === min-1 → exigente; min ≤ level ≤ max → pareja;
 * level ≤ max+2 → tranquila; más → paseo.
 */
export function campaignLabel(levelRange: [number, number], level: number): CampaignLabel {
  const [min, max] = levelRange;
  if (level <= min - 2) return 'mortal';
  if (level < min) return 'exigente';
  if (level <= max) return 'pareja';
  if (level <= max + 2) return 'tranquila';
  return 'paseo';
}

/** Modificador Veterano: -1 en tranquila, -2 en paseo, 0 en el resto. */
export function veteranModifier(label: CampaignLabel): number {
  switch (label) {
    case 'tranquila':
      return -1;
    case 'paseo':
      return -2;
    case 'mortal':
    case 'exigente':
    case 'pareja':
      return 0;
  }
}

/** Fortuna máxima por partida: 3 puntos, 4 desde el nivel 5. */
export function fortuneMax(level: number): number {
  return level >= 5 ? LIMITS.fortuneFromLevel5 : LIMITS.fortuneBase;
}
```

El `switch` sin `default` es intencional: como `CampaignLabel` es una unión cerrada y todas las ramas devuelven, TypeScript strict acepta la función; si alguien agrega una etiqueta nueva al tipo, el compilador marca este `switch` como incompleto.

`fortuneMax` queda con el mismo cuerpo que en la tarea 6 (`level >= 5 ? LIMITS.fortuneFromLevel5 : LIMITS.fortuneBase`); solo gana un comentario. `src/engine/effects.ts` la sigue importando sin cambios.

- [ ] **Paso 4: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/progression.test.ts
npx vitest run tests/engine/effects.test.ts
```

Resultado esperado de la primera línea: `Test Files 1 passed (1)` y `Tests 17 passed (17)`: Vitest cuenta cada caso del `it.each` como un test (9) más los otros 4 de `campaignLabel`, 2 de `veteranModifier` y 2 de `fortuneMax`. La segunda línea confirma que `effects.test.ts` (tarea 6) sigue en verde: el reemplazo del archivo no tocó `fortuneMax`.

- [ ] **Paso 5: Commit**

```bash
git add src/engine/progression.ts tests/engine/progression.test.ts
git commit -m "feat(engine): etiqueta de campaña y modificador Veterano junto a fortuneMax en progression

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 2: fixture, rollMode y fuentes por rasgo, habilidad y clase

- [ ] **Paso 6: Escribir el fixture y el test que falla**

Crear `tests/fixtures/modifiers.ts` con este contenido completo. Es una campaña mínima válida para los tipos (no necesita pasar el validador de la tarea 12; solo la usan estos tests) más helpers para armar el estado del personaje de prueba del contrato.

```ts
import type { Campaign } from '@/content/schema';
import type { Character, EvalContext, GameState, Run } from '@/engine/types';

/** Campaña mínima para probar fuentes de ventaja y desventaja. levelRange [3, 5] como la campaña de humo. */
export const campanaModificadores: Campaign = {
  id: 'mod_fixture',
  contentVersion: 1,
  title: 'Campaña de modificadores',
  premise: 'Fixture para probar fuentes de ventaja y desventaja.',
  cover: 'mod_fixture',
  levelRange: [3, 5],
  durationMin: [1, 2],
  lethalScenes: 0,
  lintProfile: 'smoke',
  hidden: true,
  start: 'inicio',
  scenes: {
    inicio: {
      id: 'inicio',
      kind: 'ending',
      place: 'sala',
      text: ['Una sala vacía de piedra fría.'],
      choices: [],
      ending: { id: 'fin', epilogue: ['Y ahí termina.'] },
    },
  },
  npcs: {},
  places: {
    sala: { id: 'sala', name: 'Sala', background: 'sala', canonPrompt: 'una sala vacía de piedra' },
  },
  items: {
    llave_de_hierro: {
      id: 'llave_de_hierro',
      name: 'Llave de hierro',
      icon: 'llave_de_hierro',
      description: 'Una llave pesada y fría.',
      advantageTags: ['sigilo'],
    },
    amuleto_de_runas: {
      id: 'amuleto_de_runas',
      name: 'Amuleto de runas',
      icon: 'amuleto_de_runas',
      description: 'Un amuleto grabado con runas antiguas.',
      advantageTags: ['saber', 'magia'],
    },
    piedra_lisa: {
      id: 'piedra_lisa',
      name: 'Piedra lisa',
      icon: 'piedra_lisa',
      description: 'Una piedra de río sin ningún uso conocido.',
    },
  },
  flags: { 'run:tiene_pista': 'El personaje encontró una pista en la sala.' },
  milestones: {},
  clocks: {},
  endings: { fin: { title: 'Fin' } },
};

/** El personaje de prueba del contrato: mago nivel 3, saber 2, rasgos aprendiz_de_escriba y cazador_furtivo. */
export function personajeMago(overrides: Partial<Character> = {}): Character {
  return {
    id: 'prueba',
    name: 'Prueba',
    portrait: 'mago_01',
    classId: 'mago',
    attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
    traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
    skills: [],
    level: 3,
    xp: 120,
    flags: [],
    memoryNames: {},
    relics: [],
    scars: [],
    campaignLog: {},
    run: null,
    ...overrides,
  };
}

/** Partida recién empezada en la campaña del fixture, sana y sin objetos. */
export function partidaBase(overrides: Partial<Run> = {}): Run {
  return {
    campaignId: campanaModificadores.id,
    contentVersion: 1,
    sceneId: 'inicio',
    flags: [],
    stagedFlags: [],
    visited: {},
    items: [],
    wounds: 0,
    conditions: [],
    fortune: 3,
    powerUsed: false,
    clocks: {},
    milestones: [],
    log: [],
    rngSeed: 1,
    ...overrides,
  };
}

/** Arma un EvalContext completo con overrides parciales de personaje, partida y campaña. */
export function contextoPrueba(
  opts: { character?: Partial<Character>; run?: Partial<Run>; campaign?: Campaign } = {},
): EvalContext {
  const state: GameState = {
    world: { flags: [], fallen: [] },
    character: personajeMago(opts.character),
    run: partidaBase(opts.run),
    seen: {},
  };
  return { campaign: opts.campaign ?? campanaModificadores, state };
}
```

Crear `tests/engine/modifiers.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import type { Attr, Difficulty, Tag } from '@/content/catalog';
import type { Outcome, Roll } from '@/content/schema';
import { rollMode, rollSources } from '@/engine/modifiers';
import type { RollSource } from '@/engine/types';
import { contextoPrueba } from '../fixtures/modifiers';

/** Tirada de prueba: los outcomes no importan para los modificadores, solo attr, dificultad, tags y condiciones. */
function tirada(
  attr: Attr,
  difficulty: Difficulty,
  tags: Tag[],
  extra: Pick<Roll, 'advantageIf' | 'disadvantageIf'> = {},
): Roll {
  const salida: Outcome = { next: 'inicio' };
  return { attr, difficulty, tags, ...extra, outcomes: { success: salida, partial: salida, failure: salida } };
}

function fuente(kind: RollSource['kind'], label: string, origin: RollSource['origin'], cancelled = false): RollSource {
  return { kind, label, origin, cancelled };
}

describe('rollMode', () => {
  it('sin fuentes es normal', () => {
    expect(rollMode([])).toBe('normal');
  });

  it('solo ventajas es advantage', () => {
    expect(rollMode([fuente('advantage', 'Aprendiz de escriba', 'trait')])).toBe('advantage');
    expect(rollMode([fuente('advantage', 'A', 'trait'), fuente('advantage', 'B', 'item')])).toBe('advantage');
  });

  it('solo desventajas es disadvantage', () => {
    expect(rollMode([fuente('disadvantage', 'Debilidad: Mago', 'class')])).toBe('disadvantage');
  });

  it('ventaja y desventaja juntas es cancelled', () => {
    expect(
      rollMode([fuente('advantage', 'A', 'trait', true), fuente('disadvantage', 'B', 'condition', true)]),
    ).toBe('cancelled');
  });

  it('no muta la lista recibida', () => {
    const lista = [fuente('advantage', 'A', 'trait')];
    rollMode(lista);
    expect(lista).toEqual([fuente('advantage', 'A', 'trait')]);
  });
});

describe('rollSources: rasgos, habilidades y clase', () => {
  it('tirada de saber: el rasgo Aprendiz de escriba da una sola ventaja', () => {
    const ctx = contextoPrueba();
    const fuentes = rollSources(tirada('saber', 'normal', ['saber']), ctx);
    expect(fuentes).toEqual([fuente('advantage', 'Aprendiz de escriba', 'trait')]);
    expect(rollMode(fuentes)).toBe('advantage');
  });

  it('tirada de sigilo: el rasgo Cazador furtivo da ventaja', () => {
    const ctx = contextoPrueba();
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo']), ctx);
    expect(fuentes).toEqual([fuente('advantage', 'Cazador furtivo', 'trait')]);
  });

  it('tirada sin tags que coincidan no tiene fuentes', () => {
    const ctx = contextoPrueba();
    const fuentes = rollSources(tirada('presencia', 'normal', ['social']), ctx);
    expect(fuentes).toEqual([]);
    expect(rollMode(fuentes)).toBe('normal');
  });

  it('una tirada con dos tags puede sumar dos rasgos', () => {
    const ctx = contextoPrueba();
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo', 'saber']), ctx);
    expect(fuentes).toHaveLength(2);
    expect(fuentes.map((f) => f.label)).toEqual(['Aprendiz de escriba', 'Cazador furtivo']);
    expect(fuentes.every((f) => f.kind === 'advantage' && !f.cancelled)).toBe(true);
  });

  it('una habilidad cuyo tag coincide da ventaja con origin skill', () => {
    const ctx = contextoPrueba({ character: { traits: [], skills: ['erudito_de_runas'] } });
    const fuentes = rollSources(tirada('saber', 'normal', ['saber']), ctx);
    expect(fuentes).toEqual([fuente('advantage', 'Erudito de runas', 'skill')]);
  });

  it('tirada de vigor con tag fisico: el mago tiene desventaja por su Debilidad', () => {
    const ctx = contextoPrueba();
    const fuentes = rollSources(tirada('vigor', 'dificil', ['fisico']), ctx);
    expect(fuentes).toEqual([fuente('disadvantage', 'Debilidad: Mago', 'class')]);
    expect(rollMode(fuentes)).toBe('disadvantage');
  });

  it('la Debilidad depende de la clase: un guerrero la tiene en sigilo, no en fisico', () => {
    const guerrero = contextoPrueba({ character: { classId: 'guerrero', traits: [] } });
    expect(rollSources(tirada('vigor', 'normal', ['fisico']), guerrero)).toEqual([]);
    expect(rollSources(tirada('astucia', 'normal', ['sigilo']), guerrero)).toEqual([
      fuente('disadvantage', 'Debilidad: Guerrero', 'class'),
    ]);
  });
});
```

- [ ] **Paso 7: Correr el test y verificar que falla**

```
npx vitest run tests/engine/modifiers.test.ts
```

Resultado esperado: error de resolución `Failed to resolve import "@/engine/modifiers" from "tests/engine/modifiers.test.ts"`. Si en cambio falla por `../fixtures/modifiers`, revisá que el fixture se creó en `tests/fixtures/modifiers.ts` (misma carpeta `tests/fixtures/` que `minimal.ts` de la tarea 3).

- [ ] **Paso 8: Implementación mínima**

Crear `src/engine/modifiers.ts` con este contenido completo (todavía sin objetos, condiciones, heridas ni `advantageIf`; eso entra en el ciclo 3):

```ts
import { CLASSES, SKILLS, TRAITS, type Tag } from '@/content/catalog';
import type { Roll } from '@/content/schema';
import type { EvalContext, RollMode, RollSource } from '@/engine/types';

function fuente(kind: RollSource['kind'], label: string, origin: RollSource['origin']): RollSource {
  return { kind, label, origin, cancelled: false };
}

/**
 * Lista todas las fuentes de ventaja y desventaja que aplican a una tirada.
 * Primero las ventajas (rasgos, habilidades), después las desventajas (Debilidad de clase).
 * Si hay al menos una de cada tipo, todas quedan con cancelled = true: no se acumulan, se anulan.
 */
export function rollSources(roll: Roll, ctx: EvalContext): RollSource[] {
  const { character } = ctx.state;
  const tags: readonly Tag[] = roll.tags;
  const ventajas: RollSource[] = [];
  const desventajas: RollSource[] = [];

  for (const traitId of character.traits) {
    const rasgo = TRAITS[traitId];
    if (tags.includes(rasgo.tag)) ventajas.push(fuente('advantage', rasgo.name, 'trait'));
  }
  for (const skillId of character.skills) {
    const habilidad = SKILLS[skillId];
    if (tags.includes(habilidad.tag)) ventajas.push(fuente('advantage', habilidad.name, 'skill'));
  }

  const clase = CLASSES[character.classId];
  if (tags.includes(clase.weakness)) {
    desventajas.push(fuente('disadvantage', `Debilidad: ${clase.name}`, 'class'));
  }

  const cancelled = ventajas.length > 0 && desventajas.length > 0;
  return [...ventajas, ...desventajas].map((s) => ({ ...s, cancelled }));
}

/** sin fuentes → normal; solo ventaja → advantage; solo desventaja → disadvantage; ambas → cancelled. */
export function rollMode(sources: RollSource[]): RollMode {
  const hayVentaja = sources.some((s) => s.kind === 'advantage');
  const hayDesventaja = sources.some((s) => s.kind === 'disadvantage');
  if (hayVentaja && hayDesventaja) return 'cancelled';
  if (hayVentaja) return 'advantage';
  if (hayDesventaja) return 'disadvantage';
  return 'normal';
}
```

- [ ] **Paso 9: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/modifiers.test.ts
```

Resultado esperado: `Test Files 1 passed (1)`, 12 tests en verde (5 de `rollMode` y 7 de `rollSources: rasgos, habilidades y clase`).

- [ ] **Paso 10: Commit**

```bash
git add src/engine/modifiers.ts tests/engine/modifiers.test.ts tests/fixtures/modifiers.ts
git commit -m "feat(engine): fuentes de ventaja por rasgo, habilidad y Debilidad de clase, y modo de tirada

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: objetos, condiciones, heridas, situación y anulación

- [ ] **Paso 11: Escribir el test que falla**

Agregar al FINAL de `tests/engine/modifiers.test.ts` (después del último `describe`, sin tocar lo anterior) estos bloques:

```ts
describe('rollSources: objetos', () => {
  it('un objeto con advantageTags que intersecan los tags da ventaja con su nombre', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { items: ['llave_de_hierro'] } });
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo']), ctx);
    expect(fuentes).toEqual([fuente('advantage', 'Llave de hierro', 'item')]);
  });

  it('un objeto sin advantageTags no aporta nada', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { items: ['piedra_lisa'] } });
    expect(rollSources(tirada('astucia', 'normal', ['sigilo']), ctx)).toEqual([]);
  });

  it('un objeto cuyo advantageTags no coincide no aporta nada', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { items: ['llave_de_hierro'] } });
    expect(rollSources(tirada('saber', 'normal', ['saber']), ctx)).toEqual([]);
  });

  it('un id de objeto que no existe en la campaña se ignora sin lanzar', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { items: ['inexistente'] } });
    expect(rollSources(tirada('astucia', 'normal', ['sigilo']), ctx)).toEqual([]);
  });

  it('objeto y rasgo con el mismo tag son dos fuentes distintas (la UI las muestra las dos)', () => {
    const ctx = contextoPrueba({ run: { items: ['llave_de_hierro'] } });
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo']), ctx);
    expect(fuentes).toEqual([
      fuente('advantage', 'Cazador furtivo', 'trait'),
      fuente('advantage', 'Llave de hierro', 'item'),
    ]);
    expect(rollMode(fuentes)).toBe('advantage');
  });
});

describe('rollSources: condiciones', () => {
  it('una condición cuyo tag está en la tirada da desventaja', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { conditions: ['empapado'] } });
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo']), ctx);
    expect(fuentes).toEqual([fuente('disadvantage', 'Empapado', 'condition')]);
  });

  it('una condición con tag all da desventaja en cualquier tirada', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { conditions: ['envenenado'] } });
    expect(rollSources(tirada('presencia', 'normal', ['social']), ctx)).toEqual([
      fuente('disadvantage', 'Envenenado', 'condition'),
    ]);
    expect(rollSources(tirada('saber', 'normal', ['saber']), ctx)).toEqual([
      fuente('disadvantage', 'Envenenado', 'condition'),
    ]);
  });

  it('una condición con otro tag no aporta nada', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { conditions: ['asustado'] } });
    expect(rollSources(tirada('saber', 'normal', ['saber']), ctx)).toEqual([]);
  });

  it('sigilo con Empapado y Cazador furtivo: ambas fuentes quedan anuladas y el modo es cancelled', () => {
    const ctx = contextoPrueba({ run: { conditions: ['empapado'] } });
    const fuentes = rollSources(tirada('astucia', 'normal', ['sigilo']), ctx);
    expect(fuentes).toEqual([
      fuente('advantage', 'Cazador furtivo', 'trait', true),
      fuente('disadvantage', 'Empapado', 'condition', true),
    ]);
    expect(rollMode(fuentes)).toBe('cancelled');
  });
});

describe('rollSources: heridas', () => {
  it('Herido con tag fisico da desventaja wound "Herido"', () => {
    const ctx = contextoPrueba({ character: { classId: 'guerrero', traits: [] }, run: { wounds: 1 } });
    const fuentes = rollSources(tirada('vigor', 'normal', ['fisico']), ctx);
    expect(fuentes).toEqual([fuente('disadvantage', 'Herido', 'wound')]);
    expect(rollMode(fuentes)).toBe('disadvantage');
  });

  it('Herido sin tag fisico no aporta nada', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { wounds: 1 } });
    expect(rollSources(tirada('saber', 'normal', ['saber']), ctx)).toEqual([]);
  });

  it('Herido + fisico con el mago suma Debilidad y Herido, las dos desventajas', () => {
    const ctx = contextoPrueba({ run: { wounds: 1 } });
    const fuentes = rollSources(tirada('vigor', 'dificil', ['fisico']), ctx);
    expect(fuentes).toEqual([
      fuente('disadvantage', 'Debilidad: Mago', 'class'),
      fuente('disadvantage', 'Herido', 'wound'),
    ]);
    expect(rollMode(fuentes)).toBe('disadvantage');
  });

  it('Malherido da desventaja wound "Malherido" en cualquier tag', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { wounds: 2 } });
    expect(rollSources(tirada('presencia', 'normal', ['social']), ctx)).toEqual([
      fuente('disadvantage', 'Malherido', 'wound'),
    ]);
    expect(rollSources(tirada('saber', 'normal', ['magia']), ctx)).toEqual([
      fuente('disadvantage', 'Malherido', 'wound'),
    ]);
  });

  it('Malherido anula la ventaja del rasgo en una tirada de saber', () => {
    const ctx = contextoPrueba({ run: { wounds: 2 } });
    const fuentes = rollSources(tirada('saber', 'normal', ['saber']), ctx);
    expect(fuentes).toEqual([
      fuente('advantage', 'Aprendiz de escriba', 'trait', true),
      fuente('disadvantage', 'Malherido', 'wound', true),
    ]);
    expect(rollMode(fuentes)).toBe('cancelled');
  });

  it('Sano no aporta ninguna fuente de herida', () => {
    const ctx = contextoPrueba({ character: { classId: 'guerrero', traits: [] }, run: { wounds: 0 } });
    expect(rollSources(tirada('vigor', 'normal', ['fisico']), ctx)).toEqual([]);
  });
});

describe('rollSources: advantageIf y disadvantageIf', () => {
  it('advantageIf que se cumple da ventaja scene "Situación"', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { flags: ['run:tiene_pista'] } });
    const roll = tirada('saber', 'normal', ['saber'], { advantageIf: { flag: 'run:tiene_pista' } });
    expect(rollSources(roll, ctx)).toEqual([fuente('advantage', 'Situación', 'scene')]);
  });

  it('advantageIf que no se cumple no aporta nada', () => {
    const ctx = contextoPrueba({ character: { traits: [] } });
    const roll = tirada('saber', 'normal', ['saber'], { advantageIf: { flag: 'run:tiene_pista' } });
    expect(rollSources(roll, ctx)).toEqual([]);
  });

  it('disadvantageIf que se cumple da desventaja scene "Situación"', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { wounds: 1 } });
    const roll = tirada('saber', 'normal', ['saber'], { disadvantageIf: { wounds: { gte: 1 } } });
    expect(rollSources(roll, ctx)).toEqual([fuente('disadvantage', 'Situación', 'scene')]);
  });

  it('advantageIf y disadvantageIf cumplidos a la vez se anulan', () => {
    const ctx = contextoPrueba({ character: { traits: [] }, run: { flags: ['run:tiene_pista'], wounds: 1 } });
    const roll = tirada('saber', 'normal', ['saber'], {
      advantageIf: { flag: 'run:tiene_pista' },
      disadvantageIf: { wounds: { gte: 1 } },
    });
    const fuentes = rollSources(roll, ctx);
    expect(fuentes).toEqual([
      fuente('advantage', 'Situación', 'scene', true),
      fuente('disadvantage', 'Situación', 'scene', true),
    ]);
    expect(rollMode(fuentes)).toBe('cancelled');
  });
});

describe('rollSources: orden y pureza', () => {
  it('lista primero todas las ventajas y después todas las desventajas', () => {
    const ctx = contextoPrueba({
      character: { skills: ['erudito_de_runas'] },
      run: { items: ['amuleto_de_runas'], conditions: ['envenenado'], wounds: 2, flags: ['run:tiene_pista'] },
    });
    const roll = tirada('saber', 'normal', ['saber'], { advantageIf: { flag: 'run:tiene_pista' } });
    const fuentes = rollSources(roll, ctx);
    expect(fuentes.map((f) => [f.kind, f.origin, f.label])).toEqual([
      ['advantage', 'trait', 'Aprendiz de escriba'],
      ['advantage', 'skill', 'Erudito de runas'],
      ['advantage', 'item', 'Amuleto de runas'],
      ['advantage', 'scene', 'Situación'],
      ['disadvantage', 'condition', 'Envenenado'],
      ['disadvantage', 'wound', 'Malherido'],
    ]);
    expect(fuentes.every((f) => f.cancelled)).toBe(true);
  });

  it('no muta el contexto ni la tirada', () => {
    const ctx = contextoPrueba({ run: { items: ['llave_de_hierro'], conditions: ['empapado'], wounds: 1 } });
    const roll = tirada('astucia', 'normal', ['sigilo', 'fisico'], { advantageIf: { flag: 'run:tiene_pista' } });
    const ctxAntes = JSON.stringify(ctx);
    const rollAntes = JSON.stringify(roll);
    rollSources(roll, ctx);
    expect(JSON.stringify(ctx)).toBe(ctxAntes);
    expect(JSON.stringify(roll)).toBe(rollAntes);
  });

  it('devuelve un arreglo nuevo en cada llamada', () => {
    const ctx = contextoPrueba();
    const roll = tirada('saber', 'normal', ['saber']);
    const a = rollSources(roll, ctx);
    const b = rollSources(roll, ctx);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
  });
});
```

- [ ] **Paso 12: Correr el test y verificar que falla**

```
npx vitest run tests/engine/modifiers.test.ts
```

Resultado esperado: el archivo compila y los 12 tests del ciclo 2 siguen en verde, pero fallan los nuevos que dependen de objetos, condiciones, heridas o situación, con errores de aserción del estilo `AssertionError: expected [] to deeply equal [ { kind: 'advantage', label: 'Llave de hierro', … } ]`. Los tests "que no aporta nada" (objeto sin tags, condición con otro tag, Herido sin fisico, Sano) pasan por casualidad porque la implementación actual devuelve `[]`; está bien.

- [ ] **Paso 13: Implementación mínima**

Reemplazar TODO el contenido de `src/engine/modifiers.ts` por este:

```ts
import { CLASSES, CONDITIONS, SKILLS, TRAITS, WOUND_LABELS, type Tag } from '@/content/catalog';
import type { Item, Roll } from '@/content/schema';
import { evaluate } from '@/engine/conditions';
import type { EvalContext, RollMode, RollSource } from '@/engine/types';

const ETIQUETA_SITUACION = 'Situación';

function fuente(kind: RollSource['kind'], label: string, origin: RollSource['origin']): RollSource {
  return { kind, label, origin, cancelled: false };
}

/** true si el tag de una condición aplica a la tirada: 'all' aplica siempre. */
function tagAplica(tag: Tag | 'all', tags: readonly Tag[]): boolean {
  return tag === 'all' || tags.includes(tag);
}

/**
 * Lista todas las fuentes de ventaja y desventaja que aplican a una tirada.
 * Orden: ventajas (rasgos, habilidades, objetos, advantageIf) y después desventajas
 * (Debilidad de clase, condiciones, heridas, disadvantageIf).
 * Si hay al menos una de cada tipo, todas quedan con cancelled = true: no se acumulan, se anulan.
 */
export function rollSources(roll: Roll, ctx: EvalContext): RollSource[] {
  const { character, run } = ctx.state;
  const tags: readonly Tag[] = roll.tags;
  const ventajas: RollSource[] = [];
  const desventajas: RollSource[] = [];

  for (const traitId of character.traits) {
    const rasgo = TRAITS[traitId];
    if (tags.includes(rasgo.tag)) ventajas.push(fuente('advantage', rasgo.name, 'trait'));
  }
  for (const skillId of character.skills) {
    const habilidad = SKILLS[skillId];
    if (tags.includes(habilidad.tag)) ventajas.push(fuente('advantage', habilidad.name, 'skill'));
  }
  for (const itemId of run.items) {
    const objeto: Item | undefined = ctx.campaign.items[itemId];
    if (objeto === undefined || objeto.advantageTags === undefined) continue;
    if (objeto.advantageTags.some((t) => tags.includes(t))) {
      ventajas.push(fuente('advantage', objeto.name, 'item'));
    }
  }
  if (roll.advantageIf !== undefined && evaluate(roll.advantageIf, ctx)) {
    ventajas.push(fuente('advantage', ETIQUETA_SITUACION, 'scene'));
  }

  const clase = CLASSES[character.classId];
  if (tags.includes(clase.weakness)) {
    desventajas.push(fuente('disadvantage', `Debilidad: ${clase.name}`, 'class'));
  }
  for (const conditionId of run.conditions) {
    const condicion = CONDITIONS[conditionId];
    if (tagAplica(condicion.tag, tags)) desventajas.push(fuente('disadvantage', condicion.name, 'condition'));
  }
  if (run.wounds === 1 && tags.includes('fisico')) {
    desventajas.push(fuente('disadvantage', WOUND_LABELS[1], 'wound'));
  }
  if (run.wounds === 2) {
    desventajas.push(fuente('disadvantage', WOUND_LABELS[2], 'wound'));
  }
  if (roll.disadvantageIf !== undefined && evaluate(roll.disadvantageIf, ctx)) {
    desventajas.push(fuente('disadvantage', ETIQUETA_SITUACION, 'scene'));
  }

  const cancelled = ventajas.length > 0 && desventajas.length > 0;
  return [...ventajas, ...desventajas].map((s) => ({ ...s, cancelled }));
}

/** sin fuentes → normal; solo ventaja → advantage; solo desventaja → disadvantage; ambas → cancelled. */
export function rollMode(sources: RollSource[]): RollMode {
  const hayVentaja = sources.some((s) => s.kind === 'advantage');
  const hayDesventaja = sources.some((s) => s.kind === 'disadvantage');
  if (hayVentaja && hayDesventaja) return 'cancelled';
  if (hayVentaja) return 'advantage';
  if (hayDesventaja) return 'disadvantage';
  return 'normal';
}
```

Dos detalles de tipado que conviene entender y no "arreglar":
- `const objeto: Item | undefined = ctx.campaign.items[itemId]` anota explícitamente `| undefined` porque `Record<string, Item>` no lo agrega solo (salvo con `noUncheckedIndexedAccess`); así el `continue` para ids desconocidos compila en cualquier configuración de `tsconfig`.
- `tagAplica` existe porque `CONDITIONS[x].tag` es `Tag | 'all'` y `tags.includes(...)` solo acepta `Tag`; comparar primero con `'all'` estrecha el tipo.

- [ ] **Paso 14: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/modifiers.test.ts
```

Resultado esperado: `Test Files 1 passed (1)`, 34 tests en verde (12 del ciclo 2 + 5 de objetos + 4 de condiciones + 6 de heridas + 4 de situación + 3 de orden y pureza).

- [ ] **Paso 15: Commit**

```bash
git add src/engine/modifiers.ts tests/engine/modifiers.test.ts
git commit -m "feat(engine): fuentes por objeto, condición, heridas y situación con anulación de ventaja y desventaja

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: buildPreview (modificador total, probabilidades, riesgo y Veterano)

- [ ] **Paso 16: Escribir el test que falla**

Primero, modificar la línea de import de `@/engine/modifiers` al principio de `tests/engine/modifiers.test.ts`. Reemplazar:

```ts
import { rollMode, rollSources } from '@/engine/modifiers';
```

por:

```ts
import { buildPreview, rollMode, rollSources } from '@/engine/modifiers';
```

Y agregar debajo de esa línea (junto a los demás imports) estas dos:

```ts
import { odds, riskLabel, targetLine } from '@/engine/dice';
import { campanaModificadores } from '../fixtures/modifiers';
```

(Si tu editor prefiere una sola línea de import para `../fixtures/modifiers`, combinala: `import { campanaModificadores, contextoPrueba } from '../fixtures/modifiers';`. Cualquiera de las dos formas compila.)

Después, agregar al FINAL del archivo este bloque:

```ts
describe('buildPreview', () => {
  it('saber normal con el mago de prueba: +2, ventaja por rasgo, 68,1 / 26,9 / 5,1 %, seguro', () => {
    const ctx = contextoPrueba();
    const preview = buildPreview(tirada('saber', 'normal', ['saber']), ctx);

    expect(preview.attr).toBe('saber');
    expect(preview.attrValue).toBe(2);
    expect(preview.difficulty).toBe('normal');
    expect(preview.difficultyMod).toBe(0);
    expect(preview.veteranMod).toBe(0);
    expect(preview.totalMod).toBe(2);
    expect(preview.mode).toBe('advantage');
    expect(preview.sources).toEqual([fuente('advantage', 'Aprendiz de escriba', 'trait')]);

    // 3d6 conservando los 2 mayores, con +2: 147, 58 y 11 casos de 216.
    expect(preview.odds.success).toBeCloseTo(147 / 216, 10);
    expect(preview.odds.partial).toBeCloseTo(58 / 216, 10);
    expect(preview.odds.failure).toBeCloseTo(11 / 216, 10);
    expect(Math.round(preview.odds.success * 1000) / 10).toBe(68.1);
    expect(Math.round(preview.odds.partial * 1000) / 10).toBe(26.9);
    expect(Math.round(preview.odds.failure * 1000) / 10).toBe(5.1);
    expect(preview.odds).toEqual(odds(2, 'advantage'));

    expect(preview.risk).toBe('seguro');
    expect(preview.targetLine).toBe(targetLine(2));
  });

  it('vigor dificil con tag fisico: -1, desventaja por Debilidad, probabilidades de desventaja -1, peligroso', () => {
    const ctx = contextoPrueba();
    const preview = buildPreview(tirada('vigor', 'dificil', ['fisico']), ctx);

    expect(preview.attrValue).toBe(0);
    expect(preview.difficultyMod).toBe(-1);
    expect(preview.veteranMod).toBe(0);
    expect(preview.totalMod).toBe(-1);
    expect(preview.mode).toBe('disadvantage');
    expect(preview.sources).toEqual([fuente('disadvantage', 'Debilidad: Mago', 'class')]);

    // 3d6 conservando los 2 menores, con -1: 4, 38 y 174 casos de 216.
    expect(preview.odds).toEqual(odds(-1, 'disadvantage'));
    expect(preview.odds.success).toBeCloseTo(4 / 216, 10);
    expect(preview.odds.partial).toBeCloseTo(38 / 216, 10);
    expect(preview.odds.failure).toBeCloseTo(174 / 216, 10);
    expect(preview.risk).toBe('peligroso');
    expect(preview.targetLine).toBe(targetLine(-1));
  });

  it('sigilo con Empapado y Cazador furtivo: modo cancelled y probabilidades de 2d6 normales', () => {
    const ctx = contextoPrueba({ run: { conditions: ['empapado'] } });
    const preview = buildPreview(tirada('astucia', 'normal', ['sigilo']), ctx);

    expect(preview.totalMod).toBe(1);
    expect(preview.mode).toBe('cancelled');
    expect(preview.sources).toHaveLength(2);
    expect(preview.sources.every((s) => s.cancelled)).toBe(true);

    // 2d6 con +1: 10, 16 y 10 casos de 36. Idéntico a tirar normal.
    expect(preview.odds).toEqual(odds(1, 'normal'));
    expect(preview.odds.success).toBeCloseTo(10 / 36, 10);
    expect(preview.odds.partial).toBeCloseTo(16 / 36, 10);
    expect(preview.odds.failure).toBeCloseTo(10 / 36, 10);
    expect(preview.risk).toBe(riskLabel(odds(1, 'normal')));
  });

  it('la dificultad se suma al atributo: facil +1, extrema -3', () => {
    const ctx = contextoPrueba({ character: { traits: [] } });
    expect(buildPreview(tirada('saber', 'facil', ['saber']), ctx).totalMod).toBe(3);
    expect(buildPreview(tirada('saber', 'extrema', ['saber']), ctx).totalMod).toBe(-1);
    expect(buildPreview(tirada('saber', 'extrema', ['saber']), ctx).difficultyMod).toBe(-3);
  });

  it('Veterano: con levelRange [1, 3] y nivel 5 la campaña es Tranquila y resta 1 al total', () => {
    const campanaFacil = { ...campanaModificadores, levelRange: [1, 3] as [number, number] };
    const ctx = contextoPrueba({ character: { level: 5 }, campaign: campanaFacil });
    const preview = buildPreview(tirada('saber', 'normal', ['saber']), ctx);

    expect(preview.veteranMod).toBe(-1);
    expect(preview.attrValue).toBe(2);
    expect(preview.difficultyMod).toBe(0);
    expect(preview.totalMod).toBe(1);
    expect(preview.mode).toBe('advantage');
    expect(preview.odds).toEqual(odds(1, 'advantage'));
    expect(preview.targetLine).toBe(targetLine(1));
  });

  it('Veterano: con levelRange [1, 3] y nivel 6 la campaña es Paseo y resta 2', () => {
    const campanaFacil = { ...campanaModificadores, levelRange: [1, 3] as [number, number] };
    const ctx = contextoPrueba({ character: { level: 6 }, campaign: campanaFacil });
    const preview = buildPreview(tirada('saber', 'normal', ['saber']), ctx);
    expect(preview.veteranMod).toBe(-2);
    expect(preview.totalMod).toBe(0);
  });

  it('Veterano: en Mortal y Exigente no hay modificador', () => {
    const ctx = contextoPrueba({ character: { level: 1 } });
    expect(buildPreview(tirada('saber', 'normal', ['saber']), ctx).veteranMod).toBe(0);
    const ctx2 = contextoPrueba({ character: { level: 2 } });
    expect(buildPreview(tirada('saber', 'normal', ['saber']), ctx2).veteranMod).toBe(0);
  });

  it('el riesgo sale de riskLabel sobre las mismas probabilidades', () => {
    const ctx = contextoPrueba({ character: { traits: [] } });
    const normal = buildPreview(tirada('saber', 'normal', ['saber']), ctx);
    expect(normal.mode).toBe('normal');
    expect(normal.risk).toBe(riskLabel(normal.odds));
    expect(normal.risk).toBe(riskLabel(odds(2, 'normal')));
  });

  it('no muta el contexto y devuelve un objeto nuevo en cada llamada', () => {
    const ctx = contextoPrueba({ run: { conditions: ['empapado'], wounds: 1 } });
    const roll = tirada('astucia', 'normal', ['sigilo', 'fisico']);
    const antes = JSON.stringify(ctx);
    const a = buildPreview(roll, ctx);
    const b = buildPreview(roll, ctx);
    expect(JSON.stringify(ctx)).toBe(antes);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.sources).not.toBe(b.sources);
  });
});
```

- [ ] **Paso 17: Correr el test y verificar que falla**

```
npx vitest run tests/engine/modifiers.test.ts
```

Resultado esperado: Vitest reporta un error al ejecutar el bloque `buildPreview`: `TypeError: buildPreview is not a function` (o, si `tsc` corre antes en tu configuración, `Module '"@/engine/modifiers"' has no exported member 'buildPreview'`). Los 34 tests anteriores siguen en verde.

- [ ] **Paso 18: Implementación mínima**

Reemplazar TODO el contenido de `src/engine/modifiers.ts` por este (es el archivo del ciclo 3 más `buildPreview` y sus imports):

```ts
import { CLASSES, CONDITIONS, DIFFICULTIES, SKILLS, TRAITS, WOUND_LABELS, type Tag } from '@/content/catalog';
import type { Item, Roll } from '@/content/schema';
import { evaluate } from '@/engine/conditions';
import { odds, riskLabel, targetLine } from '@/engine/dice';
import { campaignLabel, veteranModifier } from '@/engine/progression';
import type { EvalContext, RollMode, RollPreview, RollSource } from '@/engine/types';

const ETIQUETA_SITUACION = 'Situación';

function fuente(kind: RollSource['kind'], label: string, origin: RollSource['origin']): RollSource {
  return { kind, label, origin, cancelled: false };
}

/** true si el tag de una condición aplica a la tirada: 'all' aplica siempre. */
function tagAplica(tag: Tag | 'all', tags: readonly Tag[]): boolean {
  return tag === 'all' || tags.includes(tag);
}

/**
 * Lista todas las fuentes de ventaja y desventaja que aplican a una tirada.
 * Orden: ventajas (rasgos, habilidades, objetos, advantageIf) y después desventajas
 * (Debilidad de clase, condiciones, heridas, disadvantageIf).
 * Si hay al menos una de cada tipo, todas quedan con cancelled = true: no se acumulan, se anulan.
 */
export function rollSources(roll: Roll, ctx: EvalContext): RollSource[] {
  const { character, run } = ctx.state;
  const tags: readonly Tag[] = roll.tags;
  const ventajas: RollSource[] = [];
  const desventajas: RollSource[] = [];

  for (const traitId of character.traits) {
    const rasgo = TRAITS[traitId];
    if (tags.includes(rasgo.tag)) ventajas.push(fuente('advantage', rasgo.name, 'trait'));
  }
  for (const skillId of character.skills) {
    const habilidad = SKILLS[skillId];
    if (tags.includes(habilidad.tag)) ventajas.push(fuente('advantage', habilidad.name, 'skill'));
  }
  for (const itemId of run.items) {
    const objeto: Item | undefined = ctx.campaign.items[itemId];
    if (objeto === undefined || objeto.advantageTags === undefined) continue;
    if (objeto.advantageTags.some((t) => tags.includes(t))) {
      ventajas.push(fuente('advantage', objeto.name, 'item'));
    }
  }
  if (roll.advantageIf !== undefined && evaluate(roll.advantageIf, ctx)) {
    ventajas.push(fuente('advantage', ETIQUETA_SITUACION, 'scene'));
  }

  const clase = CLASSES[character.classId];
  if (tags.includes(clase.weakness)) {
    desventajas.push(fuente('disadvantage', `Debilidad: ${clase.name}`, 'class'));
  }
  for (const conditionId of run.conditions) {
    const condicion = CONDITIONS[conditionId];
    if (tagAplica(condicion.tag, tags)) desventajas.push(fuente('disadvantage', condicion.name, 'condition'));
  }
  if (run.wounds === 1 && tags.includes('fisico')) {
    desventajas.push(fuente('disadvantage', WOUND_LABELS[1], 'wound'));
  }
  if (run.wounds === 2) {
    desventajas.push(fuente('disadvantage', WOUND_LABELS[2], 'wound'));
  }
  if (roll.disadvantageIf !== undefined && evaluate(roll.disadvantageIf, ctx)) {
    desventajas.push(fuente('disadvantage', ETIQUETA_SITUACION, 'scene'));
  }

  const cancelled = ventajas.length > 0 && desventajas.length > 0;
  return [...ventajas, ...desventajas].map((s) => ({ ...s, cancelled }));
}

/** sin fuentes → normal; solo ventaja → advantage; solo desventaja → disadvantage; ambas → cancelled. */
export function rollMode(sources: RollSource[]): RollMode {
  const hayVentaja = sources.some((s) => s.kind === 'advantage');
  const hayDesventaja = sources.some((s) => s.kind === 'disadvantage');
  if (hayVentaja && hayDesventaja) return 'cancelled';
  if (hayVentaja) return 'advantage';
  if (hayDesventaja) return 'disadvantage';
  return 'normal';
}

/**
 * Todo lo que la UI muestra antes de tirar: atributo, modificadores, modo, fuentes,
 * probabilidades exactas, etiqueta de riesgo y línea de objetivo.
 * totalMod = attrs[attr] + DIFFICULTIES[difficulty] + veteranMod, con
 * veteranMod = veteranModifier(campaignLabel(campaign.levelRange, character.level)).
 */
export function buildPreview(roll: Roll, ctx: EvalContext): RollPreview {
  const { campaign, state } = ctx;
  const sources = rollSources(roll, ctx);
  const mode = rollMode(sources);
  const attrValue = state.character.attrs[roll.attr];
  const difficultyMod = DIFFICULTIES[roll.difficulty];
  const veteranMod = veteranModifier(campaignLabel(campaign.levelRange, state.character.level));
  const totalMod = attrValue + difficultyMod + veteranMod;
  const probabilidades = odds(totalMod, mode);
  return {
    attr: roll.attr,
    attrValue,
    difficulty: roll.difficulty,
    difficultyMod,
    veteranMod,
    totalMod,
    mode,
    sources,
    odds: probabilidades,
    risk: riskLabel(probabilidades),
    targetLine: targetLine(totalMod),
  };
}
```

- [ ] **Paso 19: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/modifiers.test.ts
```

Resultado esperado: `Test Files 1 passed (1)`, 43 tests en verde (34 anteriores + 9 de `buildPreview`).

Si el test de 68,1 / 26,9 / 5,1 falla por una diferencia pequeña en `odds`, el problema está en `dice.ts` de la tarea 4, no acá: `odds(2, 'advantage')` debe devolver exactamente `147/216`, `58/216` y `11/216` (distribución de 3d6 conservando los dos mayores: sumas 2..12 con 1, 3, 7, 12, 19, 27, 34, 36, 34, 27 y 16 casos). Reportalo como bug de la tarea 4 en lugar de ajustar la aserción.

- [ ] **Paso 20: Commit**

```bash
git add src/engine/modifiers.ts tests/engine/modifiers.test.ts
git commit -m "feat(engine): buildPreview con modificador total, Veterano, probabilidades exactas y riesgo

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Verificación de la tarea

- [ ] **Paso 21: Verificación completa**

Correr, uno por línea:

```
npx vitest run
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: todos los archivos de test del proyecto en verde (incluidos `tests/engine/progression.test.ts` con sus 17 casos, `tests/engine/modifiers.test.ts` con sus 43 y `tests/engine/effects.test.ts` de la tarea 6, que depende de `fortuneMax`) y `tsc` sin errores ni advertencias (sin `any`, sin non-null assertions en `src/`).

Comprobación manual rápida de capas: `src/engine/modifiers.ts` y `src/engine/progression.ts` importan únicamente de `@/content/catalog`, `@/content/schema` y `@/engine/*`; ningún import de React, del store ni de `@/content/world`.

**Criterio de aceptación:** para el mago de prueba, `buildPreview` de una tirada de saber normal devuelve `totalMod 2`, modo `advantage` con la única fuente "Aprendiz de escriba", probabilidades 68,1 / 26,9 / 5,1 % y riesgo `seguro`; con Empapado y Cazador furtivo en sigilo ambas fuentes quedan tachadas y se tira normal; y con `levelRange [1, 3]` a nivel 5 el chip Veterano resta 1 al total.

---

### Tarea 9: Motor: entrar y renderizar escenas (resolve.ts parte 1)

Esta tarea crea `src/engine/resolve.ts` con las tres primeras funciones del motor de escenas: `getScene` (buscar una escena por id), `enter` (entrar a una escena siguiendo `redirect`, aplicando `onEnter` y registrando el texto en el log) y `render` (convertir el estado actual en algo que la UI pueda dibujar: párrafos, retrato, opciones con badges, bloqueos, previsualización de tirada, final). Las demás funciones de `resolve.ts` (`choose`, `beginRoll`, `rerollDie`, `usePower`, `usePlegaria`, `restorePending`, `commitRoll`, `endRun`) las agrega la Tarea 10 al mismo archivo.

Un punto conceptual que gobierna varios tests: el orden fijo de la spec es `redirect → onEnter → render → derivación de memoria`. La memoria (`visited`, `char:met.*`, `char:place.*`, párrafos vistos) se deriva **al elegir** (Tarea 10 llama a `deriveMemory` desde `choose`/`commitRoll`), no al entrar. Por eso la primera visita de un personaje nuevo nunca muestra la variante "otra vez" ni las variantes `knows`/`met`: cuando `enter` resuelve el texto, todavía no hay memoria de esa escena.

Decisión de esta tarea sobre el nombre de los objetos en el badge `{ item }`: el contrato dice "campaign.items ∪ world", pero la regla de capas prohíbe que `src/engine` importe `src/content/world` (y en la Fase A `WORLD.items` es un objeto vacío). Por eso `render` busca el nombre en `campaign.items` y, si no está, usa el id del objeto como nombre. Cuando la Fase C agregue reliquias de `world/items.ts`, se resolverá pasando el nombre por la campaña cargada; no es trabajo de esta tarea.

**Archivos:**
- Crear: `src/engine/resolve.ts`
- Crear: `tests/fixtures/campaigns/memoria.ts` (campaña de prueba con memoria, redirect, onEnter, escena mortal y finales, más constructores de estado)
- Test: `tests/engine/resolve.enter.test.ts`
- Test: `tests/engine/resolve.render.test.ts`

**Interfaces:**
- Consume:
  - `src/content/catalog.ts` (Tarea 2): `LIMITS` (`maxRedirects: 8`, `maxLog: 400`), `CLASSES`, `TRAITS`, `SKILLS`.
  - `src/content/schema.ts` (Tarea 3): tipos `Campaign`, `Scene`, `Choice`, `Condition`.
  - `src/engine/types.ts` (Tarea 3/5): `GameState`, `EvalContext`, `LogEntry`, `Run`, `ResolvedParagraph`, `RenderedScene`, `RenderedChoice`, `Character`, `WorldState`, `SeenMap`.
  - `src/engine/conditions.ts` (Tarea 5): `evaluate(cond: Condition | undefined, ctx: EvalContext): boolean`.
  - `src/engine/effects.ts` (Tarea 6): `applyEffects(effects: Effect[] | undefined, ctx: EvalContext): GameState`.
  - `src/engine/text.ts` (Tarea 7): `resolveText(text: Text, ctx: EvalContext): ResolvedParagraph[]`, `hashParagraph(text: string): string`.
  - `src/engine/memory.ts` (Tarea 7, solo en tests): `deriveMemory(ctx: EvalContext, sceneId: string, hashes: string[]): GameState`.
  - `src/engine/modifiers.ts` (Tarea 8): `buildPreview(roll: Roll, ctx: EvalContext): RollPreview`.
  - `tests/fixtures/state.ts` (Tarea 5) NO se usa: para no depender de nombres definidos en otra tarea, `memoria.ts` trae sus propios constructores de estado (ver Produce).
- Produce:
  - `src/engine/resolve.ts`:
    - `export function getScene(campaign: Campaign, sceneId: string): Scene`
    - `export function enter(campaign: Campaign, state: GameState, sceneId: string): GameState`
    - `export function render(campaign: Campaign, state: GameState): RenderedScene`
  - `tests/fixtures/campaigns/memoria.ts`:
    - `export const memoria: Campaign` (id `memoria`, 5 escenas: `m_puerta`, `m_sala`, `m_cripta`, `m_fin_tesoro`, `m_fin_huida`)
    - `export const personajeMemoria: Character` (mago nivel 3, rasgos `aprendiz_de_escriba` y `cazador_furtivo`, sin habilidades)
    - `export function crearRunMemoria(parcial?: Partial<Run>): Run`
    - `export function crearEstadoMemoria(parcial?: { run?: Partial<Run>; character?: Partial<Character>; world?: Partial<WorldState>; seen?: SeenMap }): GameState`

---

#### Ciclo 1: fixture `memoria`, `getScene` y `enter` sin redirects

- [ ] **Paso 1: Crear el fixture de campaña `memoria`**

Crear `tests/fixtures/campaigns/memoria.ts` con este contenido completo. Es una campaña pequeña pero con forma válida: `m_puerta` es el hub de inicio (párrafo con variante `visited`, párrafo de narrador con `knows`, PNJ que habla, `onEnter` con hito, `redirect` por flag `run:`); `m_sala` tiene un `onEnter` con reloj (para contar cuántas veces se aplicó) y opciones con `requires` de cada tipo (para los badges); `m_cripta` es la escena mortal a la que se llega por opción sin tirada; `m_fin_tesoro` y `m_fin_huida` son finales.

```ts
import type { Campaign, Scene } from '@/content/schema';
import type { Character, GameState, Run, SeenMap, WorldState } from '@/engine/types';

export const m_puerta = {
  id: 'm_puerta',
  kind: 'hub',
  place: 'torre_vieja',
  npcs: ['guardiana'],
  onEnter: [{ milestone: 'llegar_a_la_puerta' }],
  redirect: [{ when: { flag: 'run:puerta_abierta' }, to: 'm_sala' }],
  text: [
    {
      variants: [
        { when: { visited: 'm_puerta', min: 1 }, text: 'La puerta de la torre, otra vez. La guardiana no se movió de su sitio.' },
        { text: 'La puerta de la torre vieja está cerrada. Una guardiana de capa gris te mira desde el umbral.' },
      ],
    },
    {
      variants: [
        { when: { knows: 'torre_vieja' }, text: 'Conocés esta torre de otra crónica: sabés que la piedra del dintel está floja.' },
        { text: 'Nunca estuviste acá. La torre parece más alta de lo que debería.' },
      ],
    },
    { speaker: 'guardiana', variants: [{ text: '—Nadie pasa sin la llave. Ni vos ni nadie.' }] },
  ],
  choices: [
    { id: 'entrar_cripta', label: 'Bajar a la cripta por la trampilla', outcome: { next: 'm_cripta' } },
    { id: 'abrir', label: 'Abrir la puerta con cuidado', outcome: { effects: [{ set: 'run:puerta_abierta' }], next: 'm_sala' } },
    { id: 'esperar', label: 'Esperar junto a la puerta', outcome: { next: 'm_puerta' } },
    { id: 'irse', label: 'Irse de la torre', outcome: { next: 'm_fin_huida' } },
    {
      id: 'forzar',
      label: 'Forzar la puerta a golpes',
      roll: {
        attr: 'vigor',
        difficulty: 'dificil',
        tags: ['fisico'],
        outcomes: {
          success: { text: ['La puerta cede con un crujido.'], next: 'm_sala' },
          partial: { text: ['La puerta cede, pero te llevás una astilla en el hombro.'], effects: [{ wound: 1 }], next: 'm_sala' },
          failure: { text: ['La puerta no se mueve y vos sí: al suelo.'], effects: [{ wound: 1 }], next: 'm_puerta' },
        },
      },
    },
    {
      id: 'recuerdo',
      label: 'Empujar la piedra floja del dintel',
      requires: { knows: 'torre_vieja' },
      lockedHint: 'No conocés esta torre lo suficiente',
      outcome: { next: 'm_sala' },
    },
    {
      id: 'cronica',
      label: 'Bajar por el camino que ya conocés',
      requires: { flag: 'char:memoria.vio_la_cripta' },
      lockedHint: 'Todavía no viste la cripta',
      outcome: { next: 'm_sala' },
    },
    { id: 'secreto', label: 'Usar el pasadizo secreto', requires: { flag: 'run:secreto' }, outcome: { next: 'm_sala' } },
  ],
} satisfies Scene;

export const m_sala = {
  id: 'm_sala',
  kind: 'normal',
  place: 'torre_vieja',
  variant: 'interior',
  npcs: ['guardiana'],
  onEnter: [{ clock: 'ronda', delta: 1 }],
  redirect: [{ when: { flag: 'run:tesoro_a_la_vista' }, to: 'm_fin_tesoro' }],
  text: [
    'La sala huele a polvo y a cera vieja. La guardiana te siguió hasta adentro sin decir palabra.',
    'Hay una escalera que baja y otra que sube. En el muro, runas gastadas y un cofre cerrado.',
  ],
  choices: [
    { id: 'volver', label: 'Volver a la puerta', outcome: { next: 'm_puerta' } },
    { id: 'salir', label: 'Salir de la torre', outcome: { next: 'm_fin_huida' } },
    { id: 'bajar', label: 'Bajar a la cripta', outcome: { next: 'm_cripta' } },
    { id: 'mirar', label: 'Mirar alrededor', outcome: { next: 'm_sala' } },
    { id: 'magia', label: 'Leer las runas del muro', requires: { class: 'mago' }, lockedHint: 'Solo un mago lee estas runas', outcome: { next: 'm_sala' } },
    {
      id: 'escriba',
      label: 'Descifrar la inscripción del cofre',
      requires: { trait: 'aprendiz_de_escriba' },
      lockedHint: 'Necesitás saber leer escritura antigua',
      outcome: { next: 'm_sala' },
    },
    { id: 'rastrear', label: 'Seguir las huellas del polvo', requires: { skill: 'rastreador' }, lockedHint: 'No sabés leer huellas', outcome: { next: 'm_sala' } },
    { id: 'llave', label: 'Abrir el cofre con la llave', requires: { item: 'llave_vieja' }, lockedHint: 'Necesitás una llave', outcome: { next: 'm_sala' } },
    {
      id: 'combinado',
      label: 'Preguntarle a la guardiana por la última vez',
      requires: { all: [{ wounds: { lte: 2 } }, { met: 'guardiana' }] },
      lockedHint: 'La guardiana no te conoce',
      outcome: { next: 'm_sala' },
    },
  ],
} satisfies Scene;

export const m_cripta = {
  id: 'm_cripta',
  kind: 'normal',
  lethal: true,
  place: 'torre_vieja',
  variant: 'cripta',
  text: [
    'La cripta es un pasillo de losas sueltas sobre un pozo negro. Un fallo acá te puede matar.',
    'Del otro lado brilla algo que podría ser oro.',
  ],
  choices: [
    {
      id: 'cruzar',
      label: 'Cruzar las losas a la carrera',
      roll: {
        attr: 'vigor',
        difficulty: 'muy_dificil',
        tags: ['fisico'],
        outcomes: {
          success: { text: ['Cruzás sin que una sola losa se mueva.'], next: 'm_fin_tesoro' },
          partial: { text: ['Cruzás, pero una losa te muerde el tobillo.'], effects: [{ wound: 1 }], next: 'm_fin_tesoro' },
          failure: { text: ['El suelo se abre bajo tus pies.'], effects: [{ lethal: true }], next: 'm_fin_huida' },
        },
      },
    },
    {
      id: 'tantear',
      label: 'Tantear cada losa antes de pisar',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        outcomes: {
          success: { text: ['Encontrás las losas firmes una por una.'], next: 'm_fin_tesoro' },
          partial: { text: ['Casi todas eran firmes.'], effects: [{ wound: 1 }], next: 'm_fin_tesoro' },
          failure: { text: ['Una losa cede y volvés a la sala con el brazo raspado.'], effects: [{ wound: 1 }], next: 'm_sala' },
        },
      },
    },
    {
      id: 'rezar',
      label: 'Rezar y cruzar con los ojos cerrados',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['fe'],
        outcomes: {
          success: { text: ['Alguien te escuchó. Llegás al otro lado.'], next: 'm_fin_tesoro' },
          partial: { text: ['Llegás, temblando.'], effects: [{ addCondition: 'asustado' }], next: 'm_fin_tesoro' },
          failure: { text: ['Nadie te escuchó.'], effects: [{ lethal: true }], next: 'm_fin_huida' },
        },
      },
    },
    { id: 'retroceder', label: 'Retroceder a la sala', outcome: { next: 'm_sala' } },
  ],
} satisfies Scene;

export const m_fin_tesoro = {
  id: 'm_fin_tesoro',
  kind: 'ending',
  place: 'torre_vieja',
  variant: 'cripta',
  text: ['El cofre del fondo está lleno de monedas viejas y una llave de plata.'],
  choices: [],
  ending: { id: 'fin_tesoro', epilogue: ['Salís de la torre con las mangas pesadas. La guardiana no dice nada.'] },
} satisfies Scene;

export const m_fin_huida = {
  id: 'm_fin_huida',
  kind: 'ending',
  place: 'torre_vieja',
  text: ['Bajás la cuesta sin mirar atrás. La torre queda donde estaba.'],
  choices: [],
  ending: { id: 'fin_huida', epilogue: ['Con vida y sin tesoro. Hay peores maneras de terminar una noche.'] },
} satisfies Scene;

export const memoria: Campaign = {
  id: 'memoria',
  contentVersion: 1,
  title: 'La torre vieja',
  premise: 'Una torre, una guardiana y una cripta que no perdona.',
  cover: 'memoria_portada',
  levelRange: [3, 5],
  durationMin: [2, 5],
  lethalScenes: 1,
  lintProfile: 'smoke',
  hidden: true,
  start: 'm_puerta',
  scenes: { m_puerta, m_sala, m_cripta, m_fin_tesoro, m_fin_huida },
  npcs: {
    guardiana: { id: 'guardiana', name: 'La guardiana', portrait: 'guardiana', voice: 'Seca, de pocas palabras.', canonPrompt: 'Mujer mayor de capa gris.' },
  },
  places: {
    torre_vieja: {
      id: 'torre_vieja',
      name: 'La torre vieja',
      background: 'torre_vieja',
      variants: { interior: 'torre_vieja.interior', cripta: 'torre_vieja.cripta' },
      canonPrompt: 'Torre de piedra abandonada en una colina.',
    },
  },
  items: {
    llave_vieja: { id: 'llave_vieja', name: 'Llave vieja', icon: 'llave_vieja', description: 'Una llave oxidada que abre un cofre que no conocés.' },
  },
  flags: {
    'run:puerta_abierta': 'La puerta de la torre quedó abierta.',
    'run:secreto': 'Descubriste el pasadizo secreto.',
    'run:tesoro_a_la_vista': 'Sabés dónde está el tesoro.',
    'char:memoria.vio_la_cripta': 'Este personaje vio la cripta de la torre vieja.',
  },
  milestones: { llegar_a_la_puerta: { label: 'Llegar a la puerta de la torre' } },
  clocks: { ronda: { max: 3, label: 'Rondas en la sala' } },
  endings: {
    fin_tesoro: { title: 'El tesoro de la torre vieja' },
    fin_huida: { title: 'Con vida' },
  },
};

export const personajeMemoria: Character = {
  id: 'pj_memoria',
  name: 'Prueba',
  portrait: 'mago_01',
  classId: 'mago',
  attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
  traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
  skills: [],
  level: 3,
  xp: 120,
  flags: [],
  memoryNames: {},
  relics: [],
  scars: [],
  campaignLog: {},
  run: null,
};

export function crearRunMemoria(parcial: Partial<Run> = {}): Run {
  return {
    campaignId: 'memoria',
    contentVersion: 1,
    sceneId: 'm_puerta',
    flags: [],
    stagedFlags: [],
    visited: {},
    items: [],
    wounds: 0,
    conditions: [],
    fortune: 3,
    powerUsed: false,
    clocks: {},
    milestones: [],
    log: [],
    rngSeed: 12345,
    ...parcial,
  };
}

export function crearEstadoMemoria(
  parcial: { run?: Partial<Run>; character?: Partial<Character>; world?: Partial<WorldState>; seen?: SeenMap } = {},
): GameState {
  return {
    world: { flags: [], fallen: [], ...parcial.world },
    character: { ...personajeMemoria, ...parcial.character },
    run: crearRunMemoria(parcial.run),
    seen: parcial.seen ?? {},
  };
}
```

- [ ] **Paso 2: Escribir el test que falla (getScene y enter sin redirects)**

Crear `tests/engine/resolve.enter.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import { enter, getScene } from '@/engine/resolve';
import { hashParagraph } from '@/engine/text';
import type { GameState, LogEntry } from '@/engine/types';
import { crearEstadoMemoria, memoria } from '../fixtures/campaigns/memoria';

function ultimaEscenaDelLog(state: GameState): Extract<LogEntry, { kind: 'scene' }> {
  const ultima = state.run.log[state.run.log.length - 1];
  if (ultima === undefined || ultima.kind !== 'scene') {
    throw new Error('El último LogEntry no es de tipo scene');
  }
  return ultima;
}

describe('getScene', () => {
  it('devuelve la escena por id', () => {
    expect(getScene(memoria, 'm_puerta').id).toBe('m_puerta');
    expect(getScene(memoria, 'm_cripta').lethal).toBe(true);
  });

  it('lanza con un id desconocido', () => {
    expect(() => getScene(memoria, 'm_nada')).toThrow('Escena desconocida: m_nada');
  });
});

describe('enter: escena sin redirect', () => {
  it('fija run.sceneId y agrega un LogEntry scene con los párrafos resueltos y sus hashes', () => {
    const resultado = enter(memoria, crearEstadoMemoria(), 'm_puerta');

    expect(resultado.run.sceneId).toBe('m_puerta');
    expect(resultado.run.log).toHaveLength(1);
    const entrada = ultimaEscenaDelLog(resultado);
    expect(entrada.sceneId).toBe('m_puerta');
    expect(entrada.paragraphs).toHaveLength(3);
    expect(entrada.paragraphs[0]?.text).toBe('La puerta de la torre vieja está cerrada. Una guardiana de capa gris te mira desde el umbral.');
    expect(entrada.paragraphs[2]).toEqual({ speaker: 'guardiana', text: '—Nadie pasa sin la llave. Ni vos ni nadie.' });
    expect(entrada.hashes).toEqual(entrada.paragraphs.map((p) => hashParagraph(p.text)));
  });

  it('aplica onEnter una vez por cada entrada', () => {
    const una = enter(memoria, crearEstadoMemoria(), 'm_sala');
    expect(una.run.clocks.ronda).toBe(1);

    const dos = enter(memoria, una, 'm_sala');
    expect(dos.run.clocks.ronda).toBe(2);
    expect(dos.run.log).toHaveLength(2);
  });

  it('el hito de onEnter es idempotente dentro de la partida', () => {
    const una = enter(memoria, crearEstadoMemoria(), 'm_puerta');
    const dos = enter(memoria, una, 'm_puerta');
    expect(una.run.milestones).toEqual(['llegar_a_la_puerta']);
    expect(dos.run.milestones).toEqual(['llegar_a_la_puerta']);
  });

  it('no cuenta visitas ni deriva memoria al entrar', () => {
    const resultado = enter(memoria, crearEstadoMemoria(), 'm_puerta');
    expect(resultado.run.visited).toEqual({});
    expect(resultado.character.flags).toEqual([]);
    expect(resultado.seen).toEqual({});
  });

  it('no muta el estado de entrada', () => {
    const estado = crearEstadoMemoria();
    const antes = JSON.stringify(estado);
    enter(memoria, estado, 'm_sala');
    expect(JSON.stringify(estado)).toBe(antes);
  });
});
```

- [ ] **Paso 3: Correr el test y verificar que falla**

```
npx vitest run tests/engine/resolve.enter.test.ts
```

Resultado esperado: la suite falla al cargar con un error de resolución del tipo `Failed to resolve import "@/engine/resolve"` (el archivo no existe todavía). Si en cambio falla por el fixture, revisar la ruta relativa `../fixtures/campaigns/memoria`.

- [ ] **Paso 4: Implementación mínima (getScene + enter sin redirects)**

Crear `src/engine/resolve.ts` con este contenido completo:

```ts
import { LIMITS } from '@/content/catalog';
import type { Campaign, Scene } from '@/content/schema';
import { applyEffects } from '@/engine/effects';
import { hashParagraph, resolveText } from '@/engine/text';
import type { EvalContext, GameState, LogEntry, Run } from '@/engine/types';

// resolve.ts, parte 1 (Tarea 9): getScene, enter, render.
// La Tarea 10 agrega en este mismo archivo: choose, beginRoll, rerollDie, usePower,
// usePlegaria, restorePending, commitRoll y endRun.

export function getScene(campaign: Campaign, sceneId: string): Scene {
  const scene = campaign.scenes[sceneId];
  if (scene === undefined) {
    throw new Error(`Escena desconocida: ${sceneId}`);
  }
  return scene;
}

export function enter(campaign: Campaign, state: GameState, sceneId: string): GameState {
  const scene = getScene(campaign, sceneId);
  const conEfectos = applyEffects(scene.onEnter, { campaign, state });
  const ctx: EvalContext = { campaign, state: conEfectos };
  const paragraphs = resolveText(scene.text, ctx);
  const entrada: LogEntry = {
    kind: 'scene',
    sceneId: scene.id,
    paragraphs,
    hashes: paragraphs.map((p) => hashParagraph(p.text)),
  };
  const log = [...conEfectos.run.log, entrada].slice(-LIMITS.maxLog);
  const run: Run = { ...conEfectos.run, sceneId: scene.id, log };
  return { ...conEfectos, run };
}
```

- [ ] **Paso 5: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/resolve.enter.test.ts
```

Resultado esperado: `7 passed` (2 de `getScene`, 5 de `enter: escena sin redirect`).

- [ ] **Paso 6: Commit**

```bash
git add tests/fixtures/campaigns/memoria.ts tests/engine/resolve.enter.test.ts src/engine/resolve.ts
git commit -m "feat(motor): getScene y enter sin redirects en resolve.ts, con fixture memoria" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 2: `enter` sigue redirects, marca finales y recorta el log

- [ ] **Paso 7: Escribir el test que falla (redirects, finales, recorte)**

En `tests/engine/resolve.enter.test.ts`, reemplazar el bloque de imports del principio por este (agrega `LIMITS`, `Campaign` y `Scene`):

```ts
import { describe, expect, it } from 'vitest';
import { LIMITS } from '@/content/catalog';
import type { Campaign, Scene } from '@/content/schema';
import { enter, getScene } from '@/engine/resolve';
import { hashParagraph } from '@/engine/text';
import type { GameState, LogEntry } from '@/engine/types';
import { crearEstadoMemoria, memoria } from '../fixtures/campaigns/memoria';
```

Y agregar al final del archivo (después del último `describe`) estos dos bloques:

```ts
function campanaConCadena(largo: number): Campaign {
  const escenas: Record<string, Scene> = {};
  for (let i = 0; i < largo; i += 1) {
    const id = `m_cadena_${i}`;
    const base: Scene = { id, kind: 'normal', place: 'torre_vieja', text: [`Eslabón ${i}.`], choices: [] };
    escenas[id] =
      i < largo - 1
        ? { ...base, redirect: [{ when: { not: { flag: 'run:nunca' } }, to: `m_cadena_${i + 1}` }] }
        : base;
  }
  return { ...memoria, scenes: { ...memoria.scenes, ...escenas } };
}

describe('enter: redirects', () => {
  it('sigue redirects en cadena y no registra las escenas atravesadas', () => {
    const estado = crearEstadoMemoria({ run: { flags: ['run:puerta_abierta', 'run:tesoro_a_la_vista'] } });
    const resultado = enter(memoria, estado, 'm_puerta');

    expect(resultado.run.sceneId).toBe('m_fin_tesoro');
    expect(resultado.run.log.map((e) => (e.kind === 'scene' ? e.sceneId : e.kind))).toEqual(['m_fin_tesoro']);
    expect(resultado.run.visited).toEqual({});
    // Los onEnter de m_puerta (hito) y m_sala (reloj) NO se aplican: solo cuenta la escena final.
    expect(resultado.run.milestones).toEqual([]);
    expect(resultado.run.clocks).toEqual({});
  });

  it('ignora un redirect cuya condición no se cumple', () => {
    const resultado = enter(memoria, crearEstadoMemoria(), 'm_puerta');
    expect(resultado.run.sceneId).toBe('m_puerta');
    expect(resultado.run.milestones).toEqual(['llegar_a_la_puerta']);
  });

  it('evalúa los redirects contra el estado de entrada, antes de cualquier onEnter', () => {
    const estado = crearEstadoMemoria({ run: { flags: ['run:puerta_abierta'] } });
    const resultado = enter(memoria, estado, 'm_puerta');
    expect(resultado.run.sceneId).toBe('m_sala');
    expect(resultado.run.clocks.ronda).toBe(1);
    expect(resultado.run.milestones).toEqual([]);
  });

  it('permite exactamente LIMITS.maxRedirects saltos', () => {
    const campana = campanaConCadena(LIMITS.maxRedirects + 1);
    const resultado = enter(campana, crearEstadoMemoria(), 'm_cadena_0');
    expect(resultado.run.sceneId).toBe(`m_cadena_${LIMITS.maxRedirects}`);
  });

  it('lanza al superar LIMITS.maxRedirects saltos', () => {
    const campana = campanaConCadena(LIMITS.maxRedirects + 2);
    expect(() => enter(campana, crearEstadoMemoria(), 'm_cadena_0')).toThrow(/Demasiados redirects/);
  });

  it('lanza ante dos escenas que se redirigen mutuamente sin condición', () => {
    const bucle: Campaign = {
      ...memoria,
      scenes: {
        ...memoria.scenes,
        m_bucle_a: {
          id: 'm_bucle_a',
          kind: 'normal',
          place: 'torre_vieja',
          redirect: [{ when: { not: { flag: 'run:nunca' } }, to: 'm_bucle_b' }],
          text: ['Bucle A.'],
          choices: [],
        },
        m_bucle_b: {
          id: 'm_bucle_b',
          kind: 'normal',
          place: 'torre_vieja',
          redirect: [{ when: { not: { flag: 'run:nunca' } }, to: 'm_bucle_a' }],
          text: ['Bucle B.'],
          choices: [],
        },
      },
    };
    expect(() => enter(bucle, crearEstadoMemoria(), 'm_bucle_a')).toThrow(/Demasiados redirects/);
  });
});

describe('enter: final y recorte del log', () => {
  it('una escena ending marca run.outcome y agrega el epílogo después del texto', () => {
    const resultado = enter(memoria, crearEstadoMemoria(), 'm_fin_huida');

    expect(resultado.run.outcome).toEqual({ kind: 'ending', endingId: 'fin_huida' });
    const entrada = ultimaEscenaDelLog(resultado);
    expect(entrada.paragraphs.map((p) => p.text)).toEqual([
      'Bajás la cuesta sin mirar atrás. La torre queda donde estaba.',
      'Con vida y sin tesoro. Hay peores maneras de terminar una noche.',
    ]);
    expect(entrada.hashes).toHaveLength(2);
  });

  it('una escena que no es ending no fija outcome', () => {
    const resultado = enter(memoria, crearEstadoMemoria(), 'm_sala');
    expect(resultado.run.outcome).toBeUndefined();
  });

  it('recorta el log a LIMITS.maxLog entradas conservando las últimas', () => {
    const relleno: LogEntry[] = Array.from({ length: LIMITS.maxLog }, (_, i): LogEntry => ({
      kind: 'choice',
      sceneId: 'm_puerta',
      choiceId: `c${i}`,
      label: `Opción ${i}`,
    }));
    const estado = crearEstadoMemoria({ run: { log: relleno } });
    const resultado = enter(memoria, estado, 'm_puerta');

    expect(resultado.run.log).toHaveLength(LIMITS.maxLog);
    expect(resultado.run.log[0]).toEqual(relleno[1]);
    expect(resultado.run.log[LIMITS.maxLog - 1]?.kind).toBe('scene');
  });
});
```

- [ ] **Paso 8: Correr el test y verificar que falla**

```
npx vitest run tests/engine/resolve.enter.test.ts
```

Resultado esperado: fallan `sigue redirects en cadena…` (`expected 'm_puerta' to be 'm_fin_tesoro'`), `evalúa los redirects contra el estado de entrada…`, `permite exactamente…` (queda en `m_cadena_0`), los dos de "lanza…" (no lanza nada) y `una escena ending marca run.outcome…` (`expected undefined to deeply equal { kind: 'ending', … }`). Los tests `ignora un redirect…`, `no fija outcome` y `recorta el log…` ya pasan con el código del Ciclo 1.

- [ ] **Paso 9: Implementación (redirects, final, recorte)**

Reemplazar `src/engine/resolve.ts` por este contenido completo:

```ts
import { LIMITS } from '@/content/catalog';
import type { Campaign, Scene } from '@/content/schema';
import { evaluate } from '@/engine/conditions';
import { applyEffects } from '@/engine/effects';
import { hashParagraph, resolveText } from '@/engine/text';
import type { EvalContext, GameState, LogEntry, Run } from '@/engine/types';

// resolve.ts, parte 1 (Tarea 9): getScene, enter, render.
// La Tarea 10 agrega en este mismo archivo: choose, beginRoll, rerollDie, usePower,
// usePlegaria, restorePending, commitRoll y endRun.

export function getScene(campaign: Campaign, sceneId: string): Scene {
  const scene = campaign.scenes[sceneId];
  if (scene === undefined) {
    throw new Error(`Escena desconocida: ${sceneId}`);
  }
  return scene;
}

/** Sigue la cadena de redirects evaluando siempre contra el estado de entrada (sin aplicar onEnter intermedios). */
function seguirRedirects(campaign: Campaign, state: GameState, sceneId: string): Scene {
  const ctx: EvalContext = { campaign, state };
  let scene = getScene(campaign, sceneId);
  let saltos = 0;
  for (;;) {
    const redirect = (scene.redirect ?? []).find((r) => evaluate(r.when, ctx));
    if (redirect === undefined) {
      return scene;
    }
    saltos += 1;
    if (saltos > LIMITS.maxRedirects) {
      throw new Error(`Demasiados redirects desde ${sceneId}: más de ${LIMITS.maxRedirects} saltos`);
    }
    scene = getScene(campaign, redirect.to);
  }
}

export function enter(campaign: Campaign, state: GameState, sceneId: string): GameState {
  const scene = seguirRedirects(campaign, state, sceneId);
  const ending = scene.kind === 'ending' ? scene.ending : undefined;
  if (scene.kind === 'ending' && ending === undefined) {
    throw new Error(`La escena final ${scene.id} no declara ending`);
  }

  const conEfectos = applyEffects(scene.onEnter, { campaign, state });
  const ctx: EvalContext = { campaign, state: conEfectos };
  const texto = resolveText(scene.text, ctx);
  const epilogo = ending !== undefined ? resolveText(ending.epilogue, ctx) : [];
  const paragraphs = [...texto, ...epilogo];
  const entrada: LogEntry = {
    kind: 'scene',
    sceneId: scene.id,
    paragraphs,
    hashes: paragraphs.map((p) => hashParagraph(p.text)),
  };
  const log = [...conEfectos.run.log, entrada].slice(-LIMITS.maxLog);
  const run: Run = { ...conEfectos.run, sceneId: scene.id, log };

  if (ending !== undefined) {
    return { ...conEfectos, run: { ...run, outcome: { kind: 'ending', endingId: ending.id } } };
  }
  return { ...conEfectos, run };
}
```

- [ ] **Paso 10: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/resolve.enter.test.ts
```

Resultado esperado: `16 passed`.

- [ ] **Paso 11: Commit**

```bash
git add tests/engine/resolve.enter.test.ts src/engine/resolve.ts
git commit -m "feat(motor): enter sigue redirects con tope, marca finales y recorta el log" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: `render` de párrafos, memoria, retrato y final

- [ ] **Paso 12: Escribir el test que falla (render de párrafos)**

Crear `tests/engine/resolve.render.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import { deriveMemory } from '@/engine/memory';
import { enter, render } from '@/engine/resolve';
import type { GameState, LogEntry, RenderedScene } from '@/engine/types';
import { crearEstadoMemoria, memoria } from '../fixtures/campaigns/memoria';

function ultimaEscenaDelLog(state: GameState): Extract<LogEntry, { kind: 'scene' }> {
  const ultima = state.run.log[state.run.log.length - 1];
  if (ultima === undefined || ultima.kind !== 'scene') {
    throw new Error('El último LogEntry no es de tipo scene');
  }
  return ultima;
}

function entrarYRenderizar(state: GameState, sceneId: string): { state: GameState; vista: RenderedScene } {
  const siguiente = enter(memoria, state, sceneId);
  return { state: siguiente, vista: render(memoria, siguiente) };
}

/** Estado tras una primera visita completa a m_puerta: entra, deriva memoria (como haría choose) y vuelve a entrar. */
function segundaVisitaAPuerta(): GameState {
  const primera = enter(memoria, crearEstadoMemoria(), 'm_puerta');
  const entrada = ultimaEscenaDelLog(primera);
  const conMemoria = deriveMemory({ campaign: memoria, state: primera }, 'm_puerta', entrada.hashes);
  return enter(memoria, conMemoria, 'm_puerta');
}

describe('render: párrafos y memoria', () => {
  it('la primera visita con un personaje nuevo no muestra "otra vez" ni la variante knows', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');

    expect(vista.sceneId).toBe('m_puerta');
    expect(vista.paragraphs).toHaveLength(3);
    expect(vista.paragraphs[0]?.text).not.toContain('otra vez');
    expect(vista.paragraphs[0]?.text).toContain('está cerrada');
    expect(vista.paragraphs[1]?.text).toBe('Nunca estuviste acá. La torre parece más alta de lo que debería.');
  });

  it('tras derivar memoria y volver a entrar, muestra "otra vez" y la variante knows', () => {
    const vista = render(memoria, segundaVisitaAPuerta());

    expect(vista.paragraphs[0]?.text).toContain('otra vez');
    expect(vista.paragraphs[1]?.text).toContain('Conocés esta torre');
    expect(vista.paragraphs[2]).toEqual({ speaker: 'guardiana', text: '—Nadie pasa sin la llave. Ni vos ni nadie.' });
  });

  it('usa los párrafos del último LogEntry scene de la escena actual', () => {
    const estado = crearEstadoMemoria({
      run: {
        sceneId: 'm_puerta',
        log: [
          { kind: 'scene', sceneId: 'm_puerta', paragraphs: [{ text: 'Versión vieja.' }], hashes: ['x'] },
          { kind: 'choice', sceneId: 'm_puerta', choiceId: 'esperar', label: 'Esperar junto a la puerta' },
          { kind: 'scene', sceneId: 'm_puerta', paragraphs: [{ text: 'Versión nueva.' }], hashes: ['y'] },
        ],
      },
    });
    expect(render(memoria, estado).paragraphs).toEqual([{ text: 'Versión nueva.' }]);
  });

  it('si no hay LogEntry scene para la escena actual, resuelve el texto en el momento', () => {
    const estado = crearEstadoMemoria({ run: { sceneId: 'm_sala', log: [] } });
    const vista = render(memoria, estado);
    expect(vista.paragraphs).toHaveLength(2);
    expect(vista.paragraphs[0]?.text).toContain('La sala huele a polvo');
  });
});

describe('render: metadatos, retrato y final', () => {
  it('expone sceneId, kind, lethal, place y variant de la escena', () => {
    const { vista: cripta } = entrarYRenderizar(crearEstadoMemoria(), 'm_cripta');
    expect(cripta.kind).toBe('normal');
    expect(cripta.lethal).toBe(true);
    expect(cripta.place).toBe('torre_vieja');
    expect(cripta.variant).toBe('cripta');

    const { vista: puerta } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(puerta.kind).toBe('hub');
    expect(puerta.lethal).toBe(false);
    expect(puerta.variant).toBeUndefined();
  });

  it('portraitNpc es el speaker del último párrafo con speaker', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(vista.portraitNpc).toBe('guardiana');
  });

  it('si ningún párrafo tiene speaker, portraitNpc es el primer PNJ de la escena', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    expect(vista.portraitNpc).toBe('guardiana');
  });

  it('sin speaker ni npcs, portraitNpc queda undefined', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_cripta');
    expect(vista.portraitNpc).toBeUndefined();
  });

  it('una escena que no es final no tiene ending', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    expect(vista.ending).toBeUndefined();
  });

  it('una escena ending expone id, título y epílogo resuelto, y no tiene opciones', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_fin_tesoro');

    expect(vista.kind).toBe('ending');
    expect(vista.ending).toEqual({
      id: 'fin_tesoro',
      title: 'El tesoro de la torre vieja',
      epilogue: [{ text: 'Salís de la torre con las mangas pesadas. La guardiana no dice nada.' }],
    });
    expect(vista.choices).toEqual([]);
  });
});
```

- [ ] **Paso 13: Correr el test y verificar que falla**

```
npx vitest run tests/engine/resolve.render.test.ts
```

Resultado esperado: los 10 tests fallan con `TypeError: render is not a function` (la suite carga; el export todavía no existe, y con la transformación de Vitest un named import ausente llega como `undefined`).

- [ ] **Paso 14: Implementación (render de párrafos, retrato y final; opciones provisorias)**

Reemplazar `src/engine/resolve.ts` por este contenido completo. Las opciones se renderizan por ahora con valores provisorios (todas visibles y habilitadas, sin badge ni preview); el Ciclo 4 las completa.

```ts
import { LIMITS } from '@/content/catalog';
import type { Campaign, Choice, Scene } from '@/content/schema';
import { evaluate } from '@/engine/conditions';
import { applyEffects } from '@/engine/effects';
import { hashParagraph, resolveText } from '@/engine/text';
import type {
  EvalContext,
  GameState,
  LogEntry,
  RenderedChoice,
  RenderedScene,
  ResolvedParagraph,
  Run,
} from '@/engine/types';

// resolve.ts, parte 1 (Tarea 9): getScene, enter, render.
// La Tarea 10 agrega en este mismo archivo: choose, beginRoll, rerollDie, usePower,
// usePlegaria, restorePending, commitRoll y endRun.

export function getScene(campaign: Campaign, sceneId: string): Scene {
  const scene = campaign.scenes[sceneId];
  if (scene === undefined) {
    throw new Error(`Escena desconocida: ${sceneId}`);
  }
  return scene;
}

/** Sigue la cadena de redirects evaluando siempre contra el estado de entrada (sin aplicar onEnter intermedios). */
function seguirRedirects(campaign: Campaign, state: GameState, sceneId: string): Scene {
  const ctx: EvalContext = { campaign, state };
  let scene = getScene(campaign, sceneId);
  let saltos = 0;
  for (;;) {
    const redirect = (scene.redirect ?? []).find((r) => evaluate(r.when, ctx));
    if (redirect === undefined) {
      return scene;
    }
    saltos += 1;
    if (saltos > LIMITS.maxRedirects) {
      throw new Error(`Demasiados redirects desde ${sceneId}: más de ${LIMITS.maxRedirects} saltos`);
    }
    scene = getScene(campaign, redirect.to);
  }
}

export function enter(campaign: Campaign, state: GameState, sceneId: string): GameState {
  const scene = seguirRedirects(campaign, state, sceneId);
  const ending = scene.kind === 'ending' ? scene.ending : undefined;
  if (scene.kind === 'ending' && ending === undefined) {
    throw new Error(`La escena final ${scene.id} no declara ending`);
  }

  const conEfectos = applyEffects(scene.onEnter, { campaign, state });
  const ctx: EvalContext = { campaign, state: conEfectos };
  const texto = resolveText(scene.text, ctx);
  const epilogo = ending !== undefined ? resolveText(ending.epilogue, ctx) : [];
  const paragraphs = [...texto, ...epilogo];
  const entrada: LogEntry = {
    kind: 'scene',
    sceneId: scene.id,
    paragraphs,
    hashes: paragraphs.map((p) => hashParagraph(p.text)),
  };
  const log = [...conEfectos.run.log, entrada].slice(-LIMITS.maxLog);
  const run: Run = { ...conEfectos.run, sceneId: scene.id, log };

  if (ending !== undefined) {
    return { ...conEfectos, run: { ...run, outcome: { kind: 'ending', endingId: ending.id } } };
  }
  return { ...conEfectos, run };
}

type LogScene = Extract<LogEntry, { kind: 'scene' }>;

function ultimaEntradaDeEscena(log: LogEntry[], sceneId: string): LogScene | undefined {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const entrada = log[i];
    if (entrada !== undefined && entrada.kind === 'scene' && entrada.sceneId === sceneId) {
      return entrada;
    }
  }
  return undefined;
}

function ultimoHablante(paragraphs: ResolvedParagraph[]): string | undefined {
  for (let i = paragraphs.length - 1; i >= 0; i -= 1) {
    const speaker = paragraphs[i]?.speaker;
    if (speaker !== undefined) {
      return speaker;
    }
  }
  return undefined;
}

function renderChoice(choice: Choice): RenderedChoice {
  return {
    id: choice.id,
    label: choice.label,
    visible: true,
    enabled: true,
    leadsToLethal: false,
    alreadySeen: false,
  };
}

export function render(campaign: Campaign, state: GameState): RenderedScene {
  const scene = getScene(campaign, state.run.sceneId);
  const ctx: EvalContext = { campaign, state };
  const entrada = ultimaEntradaDeEscena(state.run.log, scene.id);
  const paragraphs = entrada !== undefined ? entrada.paragraphs : resolveText(scene.text, ctx);
  const portraitNpc = ultimoHablante(paragraphs) ?? scene.npcs?.[0];
  const ending =
    scene.kind === 'ending' && scene.ending !== undefined
      ? {
          id: scene.ending.id,
          title: campaign.endings[scene.ending.id]?.title ?? scene.ending.id,
          epilogue: resolveText(scene.ending.epilogue, ctx),
        }
      : undefined;

  return {
    sceneId: scene.id,
    kind: scene.kind,
    lethal: scene.lethal === true,
    place: scene.place,
    ...(scene.variant !== undefined ? { variant: scene.variant } : {}),
    ...(scene.cg !== undefined ? { cg: scene.cg } : {}),
    ...(portraitNpc !== undefined ? { portraitNpc } : {}),
    paragraphs,
    choices: scene.choices.map((choice) => renderChoice(choice)),
    ...(ending !== undefined ? { ending } : {}),
  };
}
```

- [ ] **Paso 15: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/resolve.render.test.ts
```

Resultado esperado: `10 passed`.

- [ ] **Paso 16: Commit**

```bash
git add tests/engine/resolve.render.test.ts src/engine/resolve.ts
git commit -m "feat(motor): render de párrafos, retrato y final desde el log de la partida" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: `render` de opciones (badges, bloqueos, letalidad, ya vista, preview)

- [ ] **Paso 17: Escribir el test que falla (render de opciones)**

Agregar al final de `tests/engine/resolve.render.test.ts` (después del último `describe`) este bloque:

```ts
function opcion(vista: RenderedScene, id: string) {
  const encontrada = vista.choices.find((c) => c.id === id);
  if (encontrada === undefined) {
    throw new Error(`La escena renderizada no tiene la opción ${id}`);
  }
  return encontrada;
}

describe('render: opciones', () => {
  it('sin requires: visible, habilitada, sin badge ni lockedHint', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    const abrir = opcion(vista, 'abrir');
    expect(abrir.visible).toBe(true);
    expect(abrir.enabled).toBe(true);
    expect(abrir.badge).toBeUndefined();
    expect(abrir.lockedHint).toBeUndefined();
    expect(abrir.label).toBe('Abrir la puerta con cuidado');
  });

  it('badge por tipo de requires: clase, rasgo, habilidad y objeto', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    expect(opcion(vista, 'magia').badge).toBe('Mago');
    expect(opcion(vista, 'escriba').badge).toBe('Aprendiz de escriba');
    expect(opcion(vista, 'rastrear').badge).toBe('Rastreador');
    expect(opcion(vista, 'llave').badge).toBe('Llave vieja');
  });

  it('badge Recuerdo para knows, para flag char: y para all/any con un hijo de memoria', () => {
    const { vista: puerta } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(opcion(puerta, 'recuerdo').badge).toBe('Recuerdo');
    expect(opcion(puerta, 'cronica').badge).toBe('Recuerdo');

    const { vista: sala } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    // all: [{ wounds }, { met }] → wounds no da badge; met sí.
    expect(opcion(sala, 'combinado').badge).toBe('Recuerdo');
  });

  it('requires cumplido: visible y habilitada, conserva el lockedHint como dato', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    const magia = opcion(vista, 'magia');
    expect(magia.visible).toBe(true);
    expect(magia.enabled).toBe(true);
    expect(magia.lockedHint).toBe('Solo un mago lee estas runas');
    expect(opcion(vista, 'escriba').enabled).toBe(true);
  });

  it('requires fallido con lockedHint: visible y deshabilitada, con el hint', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_sala');
    const rastrear = opcion(vista, 'rastrear');
    expect(rastrear.visible).toBe(true);
    expect(rastrear.enabled).toBe(false);
    expect(rastrear.lockedHint).toBe('No sabés leer huellas');

    const llave = opcion(vista, 'llave');
    expect(llave.visible).toBe(true);
    expect(llave.enabled).toBe(false);
  });

  it('requires fallido sin lockedHint: invisible y deshabilitada', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    const secreto = opcion(vista, 'secreto');
    expect(secreto.visible).toBe(false);
    expect(secreto.enabled).toBe(false);
  });

  it('la opción Recuerdo se bloquea en la primera visita y se habilita tras derivar memoria', () => {
    const { vista: primera } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(opcion(primera, 'recuerdo').enabled).toBe(false);

    const segunda = render(memoria, segundaVisitaAPuerta());
    expect(opcion(segunda, 'recuerdo').enabled).toBe(true);
  });

  it('leadsToLethal es true solo si outcome.next apunta a una escena lethal', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(opcion(vista, 'entrar_cripta').leadsToLethal).toBe(true);
    expect(opcion(vista, 'abrir').leadsToLethal).toBe(false);
    expect(opcion(vista, 'forzar').leadsToLethal).toBe(false);
  });

  it('alreadySeen es true si la escena destino tiene hashes en seen', () => {
    const sinMemoria = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta').vista;
    expect(opcion(sinMemoria, 'abrir').alreadySeen).toBe(false);

    const conMemoria = entrarYRenderizar(crearEstadoMemoria({ seen: { m_sala: ['abc'] } }), 'm_puerta').vista;
    expect(opcion(conMemoria, 'abrir').alreadySeen).toBe(true);
    expect(opcion(conMemoria, 'entrar_cripta').alreadySeen).toBe(false);
  });

  it('preview solo en opciones con tirada; el mago forzando la puerta tiene desventaja por Debilidad', () => {
    const { vista } = entrarYRenderizar(crearEstadoMemoria(), 'm_puerta');
    expect(opcion(vista, 'abrir').preview).toBeUndefined();

    const preview = opcion(vista, 'forzar').preview;
    expect(preview).toBeDefined();
    expect(preview?.attr).toBe('vigor');
    expect(preview?.attrValue).toBe(0);
    expect(preview?.difficulty).toBe('dificil');
    expect(preview?.totalMod).toBe(-1);
    expect(preview?.mode).toBe('disadvantage');
  });

  it('el estado no se modifica al renderizar', () => {
    const estado = enter(memoria, crearEstadoMemoria(), 'm_sala');
    const antes = JSON.stringify(estado);
    render(memoria, estado);
    expect(JSON.stringify(estado)).toBe(antes);
  });
});
```

- [ ] **Paso 18: Correr el test y verificar que falla**

```
npx vitest run tests/engine/resolve.render.test.ts
```

Resultado esperado: pasan los 10 anteriores y `sin requires…` y `el estado no se modifica…`; fallan `badge por tipo…` (`expected undefined to be 'Mago'`), `badge Recuerdo…`, `requires cumplido…` (`lockedHint` undefined), `requires fallido con lockedHint…` (`enabled` true en vez de false), `requires fallido sin lockedHint…` (`visible` true), `la opción Recuerdo…`, `leadsToLethal…`, `alreadySeen…` y `preview…`.

- [ ] **Paso 19: Implementación (render de opciones completo)**

Reemplazar `src/engine/resolve.ts` por este contenido completo y definitivo para esta tarea:

```ts
import { CLASSES, LIMITS, SKILLS, TRAITS } from '@/content/catalog';
import type { Campaign, Choice, Condition, Scene } from '@/content/schema';
import { evaluate } from '@/engine/conditions';
import { applyEffects } from '@/engine/effects';
import { buildPreview } from '@/engine/modifiers';
import { hashParagraph, resolveText } from '@/engine/text';
import type {
  EvalContext,
  GameState,
  LogEntry,
  RenderedChoice,
  RenderedScene,
  ResolvedParagraph,
  Run,
} from '@/engine/types';

// resolve.ts, parte 1 (Tarea 9): getScene, enter, render.
// La Tarea 10 agrega en este mismo archivo: choose, beginRoll, rerollDie, usePower,
// usePlegaria, restorePending, commitRoll y endRun.

const BADGE_RECUERDO = 'Recuerdo';

export function getScene(campaign: Campaign, sceneId: string): Scene {
  const scene = campaign.scenes[sceneId];
  if (scene === undefined) {
    throw new Error(`Escena desconocida: ${sceneId}`);
  }
  return scene;
}

/** Sigue la cadena de redirects evaluando siempre contra el estado de entrada (sin aplicar onEnter intermedios). */
function seguirRedirects(campaign: Campaign, state: GameState, sceneId: string): Scene {
  const ctx: EvalContext = { campaign, state };
  let scene = getScene(campaign, sceneId);
  let saltos = 0;
  for (;;) {
    const redirect = (scene.redirect ?? []).find((r) => evaluate(r.when, ctx));
    if (redirect === undefined) {
      return scene;
    }
    saltos += 1;
    if (saltos > LIMITS.maxRedirects) {
      throw new Error(`Demasiados redirects desde ${sceneId}: más de ${LIMITS.maxRedirects} saltos`);
    }
    scene = getScene(campaign, redirect.to);
  }
}

export function enter(campaign: Campaign, state: GameState, sceneId: string): GameState {
  const scene = seguirRedirects(campaign, state, sceneId);
  const ending = scene.kind === 'ending' ? scene.ending : undefined;
  if (scene.kind === 'ending' && ending === undefined) {
    throw new Error(`La escena final ${scene.id} no declara ending`);
  }

  const conEfectos = applyEffects(scene.onEnter, { campaign, state });
  const ctx: EvalContext = { campaign, state: conEfectos };
  const texto = resolveText(scene.text, ctx);
  const epilogo = ending !== undefined ? resolveText(ending.epilogue, ctx) : [];
  const paragraphs = [...texto, ...epilogo];
  const entrada: LogEntry = {
    kind: 'scene',
    sceneId: scene.id,
    paragraphs,
    hashes: paragraphs.map((p) => hashParagraph(p.text)),
  };
  const log = [...conEfectos.run.log, entrada].slice(-LIMITS.maxLog);
  const run: Run = { ...conEfectos.run, sceneId: scene.id, log };

  if (ending !== undefined) {
    return { ...conEfectos, run: { ...run, outcome: { kind: 'ending', endingId: ending.id } } };
  }
  return { ...conEfectos, run };
}

type LogScene = Extract<LogEntry, { kind: 'scene' }>;

function ultimaEntradaDeEscena(log: LogEntry[], sceneId: string): LogScene | undefined {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const entrada = log[i];
    if (entrada !== undefined && entrada.kind === 'scene' && entrada.sceneId === sceneId) {
      return entrada;
    }
  }
  return undefined;
}

function ultimoHablante(paragraphs: ResolvedParagraph[]): string | undefined {
  for (let i = paragraphs.length - 1; i >= 0; i -= 1) {
    const speaker = paragraphs[i]?.speaker;
    if (speaker !== undefined) {
      return speaker;
    }
  }
  return undefined;
}

/**
 * Badge que la UI muestra entre corchetes, derivado del requires de la opción.
 * En la Fase A el nombre de un objeto se busca solo en campaign.items (WORLD.items está vacío);
 * si no está, se usa el id.
 */
function badgeDe(cond: Condition, campaign: Campaign): string | undefined {
  if ('class' in cond) {
    return CLASSES[cond.class].name;
  }
  if ('trait' in cond) {
    return TRAITS[cond.trait].name;
  }
  if ('skill' in cond) {
    return SKILLS[cond.skill].name;
  }
  if ('item' in cond) {
    return campaign.items[cond.item]?.name ?? cond.item;
  }
  if ('met' in cond || 'knows' in cond || 'endingSeen' in cond) {
    return BADGE_RECUERDO;
  }
  if ('flag' in cond) {
    return cond.flag.startsWith('char:') ? BADGE_RECUERDO : undefined;
  }
  if ('all' in cond) {
    return primerBadge(cond.all, campaign);
  }
  if ('any' in cond) {
    return primerBadge(cond.any, campaign);
  }
  return undefined;
}

function primerBadge(conds: Condition[], campaign: Campaign): string | undefined {
  for (const cond of conds) {
    const badge = badgeDe(cond, campaign);
    if (badge !== undefined) {
      return badge;
    }
  }
  return undefined;
}

function renderChoice(choice: Choice, ctx: EvalContext): RenderedChoice {
  const cumple = evaluate(choice.requires, ctx);
  const next = choice.outcome?.next;
  const destino = next !== undefined ? ctx.campaign.scenes[next] : undefined;
  const badge = choice.requires !== undefined ? badgeDe(choice.requires, ctx.campaign) : undefined;

  return {
    id: choice.id,
    label: choice.label,
    visible: cumple || choice.lockedHint !== undefined,
    enabled: cumple,
    ...(badge !== undefined ? { badge } : {}),
    ...(choice.lockedHint !== undefined ? { lockedHint: choice.lockedHint } : {}),
    ...(choice.roll !== undefined ? { preview: buildPreview(choice.roll, ctx) } : {}),
    leadsToLethal: destino !== undefined && destino.lethal === true,
    alreadySeen: next !== undefined && (ctx.state.seen[next]?.length ?? 0) > 0,
  };
}

export function render(campaign: Campaign, state: GameState): RenderedScene {
  const scene = getScene(campaign, state.run.sceneId);
  const ctx: EvalContext = { campaign, state };
  const entrada = ultimaEntradaDeEscena(state.run.log, scene.id);
  const paragraphs = entrada !== undefined ? entrada.paragraphs : resolveText(scene.text, ctx);
  const portraitNpc = ultimoHablante(paragraphs) ?? scene.npcs?.[0];
  const ending =
    scene.kind === 'ending' && scene.ending !== undefined
      ? {
          id: scene.ending.id,
          title: campaign.endings[scene.ending.id]?.title ?? scene.ending.id,
          epilogue: resolveText(scene.ending.epilogue, ctx),
        }
      : undefined;

  return {
    sceneId: scene.id,
    kind: scene.kind,
    lethal: scene.lethal === true,
    place: scene.place,
    ...(scene.variant !== undefined ? { variant: scene.variant } : {}),
    ...(scene.cg !== undefined ? { cg: scene.cg } : {}),
    ...(portraitNpc !== undefined ? { portraitNpc } : {}),
    paragraphs,
    choices: scene.choices.map((choice) => renderChoice(choice, ctx)),
    ...(ending !== undefined ? { ending } : {}),
  };
}
```

Notas para quien implementa:
- `'class' in cond` estrecha la unión `Condition` a `{ class: ClassId }` sin `any` ni aserciones; el orden de los `if` no importa porque ninguna variante comparte claves.
- `evaluate(undefined, ctx)` devuelve `true` (contrato), así que una opción sin `requires` siempre queda `visible` y `enabled`.
- `visible` es `true` si el `requires` se cumple o si hay `lockedHint`; `enabled` es solo si se cumple. Una opción con `requires` cumplido conserva su `lockedHint` como dato (la UI solo lo muestra cuando está deshabilitada).
- `leadsToLethal` y `alreadySeen` miran únicamente `choice.outcome?.next`: una opción con tirada nunca "lleva" directamente a una escena mortal (la regla r05 de la Tarea 12 lo garantiza en el contenido).

- [ ] **Paso 20: Correr el test y verificar que pasa**

```
npx vitest run tests/engine/resolve.render.test.ts
```

Resultado esperado: `21 passed`.

- [ ] **Paso 21: Commit**

```bash
git add tests/engine/resolve.render.test.ts src/engine/resolve.ts
git commit -m "feat(motor): render de opciones con badges, bloqueos, letalidad, ya vista y preview" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Verificación de la tarea

- [ ] **Paso 22: Verificación de la tarea**

```
npx vitest run
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: todas las suites del proyecto en verde (incluidas `tests/engine/resolve.enter.test.ts` con 16 tests y `tests/engine/resolve.render.test.ts` con 21) y `tsc` sin errores (sin `any`, sin non-null assertions fuera de tests, exports con tipos explícitos).

Criterio de aceptación: con la campaña `memoria`, `enter` sigue redirects contra el estado de entrada sin registrar las escenas atravesadas, lanza al superar `LIMITS.maxRedirects`, aplica `onEnter` una vez por entrada, registra un `LogEntry` `scene` con hashes, recorta el log a `LIMITS.maxLog` y marca `outcome` en finales; y `render` muestra el texto del log sin variantes de memoria en la primera visita (y con ellas tras `deriveMemory`), con badges, bloqueos visibles u ocultos según `lockedHint`, `leadsToLethal`, `alreadySeen`, `portraitNpc`, `preview` y datos del final, sin mutar nunca el estado.

---

### Tarea 10: Motor: elegir, tirar, consolidar y terminar (resolve.ts parte 2)

**Contexto para quien no conoce el dominio.** El motor (`src/engine`) es un conjunto de funciones puras sobre un `GameState = { world, character, run, seen }`. La tarea 9 dejó en `src/engine/resolve.ts` tres funciones: `getScene` (busca una escena o lanza), `enter` (entra a una escena siguiendo redirecciones, aplica `onEnter`, escribe un `LogEntry` de tipo `'scene'` con los párrafos resueltos y sus hashes, y fija `run.sceneId`) y `render` (arma lo que la UI muestra). Esta tarea agrega el resto del ciclo de juego:

- `choose`: el jugador elige una opción **sin tirada** (tiene `outcome`). Primero se deriva la memoria de la escena que se abandona (`deriveMemory`: flags `char:met.<pnj>` y `char:place.<lugar>`, contador `visited`, hashes de párrafos vistos), después se registra la elección en el log, se aplican los efectos del desenlace y se entra a la escena siguiente. Ese orden es una regla de diseño: el texto de la escena siguiente ya "sabe" que conociste al PNJ de la anterior, pero el texto de la escena que se abandona nunca se vio afectado por su propia derivación.
- `beginRoll`, `rerollDie`, `usePower`: la tirada en dos fases. `beginRoll` calcula los dados de forma determinista (hash de la semilla de la partida, la escena, la opción, las visitas y el intento) y devuelve un `PendingRoll` **sin tocar el estado**. `rerollDie` repite un dado (cuesta 1 Fortuna, que se descuenta recién al consolidar) y `usePower` convierte un Fallo en Éxito con costo si el Poder de la clase aplica. Los tres devuelven un `PendingRoll` nuevo.
- `restorePending`: al recargar la página, el store guardó solo `{ choiceId, rerolls, powerUsed }`; esta función reconstruye el mismo `PendingRoll` repitiendo las mismas llamadas. Como los dados salen de un hash, el resultado es idéntico.
- `commitRoll`: consolida la tirada: deriva memoria, registra `choice`, `roll` y `outcome` en el log, aplica el desenlace de la banda, ajusta Fortuna y Poder, limpia `run.pending` y entra a la escena siguiente (salvo que el desenlace haya dejado al personaje Caído o muerto).
- `usePlegaria`: el Poder del Clérigo, que se usa desde la ficha y no desde una tirada.
- `endRun`: cierra la partida. Con un final, los flags `char:<campaña>.*` y `world:<campaña>.*` apostados en `run.stagedFlags` **reemplazan** a los que tenía el personaje y el mundo para esa campaña (canon); con derrota se descartan; con muerte además se registra al caído.

Bandas de una tirada (`Band`): `'crit'` (doble 6), `'success'` (total ≥ 10), `'partial'` (7-9, "éxito con costo"), `'failure'` (≤ 6), `'fumble'` (doble 1, "fallo grave"). En `PendingRoll` y en el `LogEntry` de tipo `'roll'`, `kept` son **índices** dentro de `dice` (lo que devuelve `keepDice`), no valores; los valores se obtienen con `kept.map(i => dice[i])`.

**Archivos:**
- Crear: `tests/fixtures/campaigns/tirada.ts` (campaña mínima con tiradas, escena mortal y final; más dos helpers de semillas)
- Crear: `tests/engine/resolve.roll.test.ts`
- Crear: `tests/engine/resolve.end.test.ts`
- Modificar: `src/engine/resolve.ts` (agregar imports al bloque de imports existente y agregar funciones al final del archivo; no se toca `getScene`, `enter` ni `render`)
- Test: `tests/engine/resolve.roll.test.ts`, `tests/engine/resolve.end.test.ts`

**Interfaces:**
- Consume:
  - De `@/content/catalog` (tarea 2): `CLASSES` (con `power.scope: PowerScope`), `FUMBLE_DEFAULT_CONDITION: ConditionId` (`'exhausto'`), `LIMITS` (`maxLog: 400`), tipos `ClassId`, `PowerScope`, `Tag`.
  - De `@/content/schema` (tarea 3): tipos `Campaign`, `Choice`, `Outcome`, `Roll`, `Scene`.
  - De `@/engine/types`: `Band`, `CampaignLogEntry`, `Character`, `EndSummary`, `EvalContext`, `Fallen`, `GameState`, `LogEntry`, `PendingRoll`, `Run`, `WorldState`.
  - De `@/engine/dice` (tarea 4): `keepDice(dice: number[], mode: RollMode): number[]` (índices conservados), `classify(kept: number[], totalMod: number): Band` (recibe VALORES).
  - De `@/engine/rng` (tarea 4): `rollDice(seed: number, sceneId: string, choiceId: string, visits: number, attempt: number, count: number): number[]`.
  - De `@/engine/effects` (tarea 6): `applyEffects(effects: Effect[] | undefined, ctx: EvalContext): GameState`.
  - De `@/engine/text` (tarea 7): `resolveText(text: Text, ctx: EvalContext): ResolvedParagraph[]`, `hashParagraph(text: string): string`.
  - De `@/engine/memory` (tarea 7): `deriveMemory(ctx: EvalContext, sceneId: string, hashes: string[]): GameState`.
  - De `@/engine/modifiers` (tarea 8): `buildPreview(roll: Roll, ctx: EvalContext): RollPreview`.
  - De `@/engine/progression` (tareas 6 y 8): `fortuneMax(level: number): number`.
  - De `@/engine/resolve` (tarea 9): `getScene(campaign: Campaign, sceneId: string): Scene`, `enter(campaign: Campaign, state: GameState, sceneId: string): GameState`.
  - De `tests/fixtures/state.ts` (tarea 5): `makeCtx(campaign?: Campaign, stateOverrides?: StateOverrides): EvalContext` y el tipo `StateOverrides` (`{ world?: Partial<WorldState>; character?: Partial<Character>; run?: Partial<Run>; seen?: SeenMap }`). El personaje por defecto es `'Prueba'`, mago nivel 3, `attrs { vigor: 0, astucia: 1, saber: 2, presencia: 1 }`, rasgos `['aprendiz_de_escriba', 'cazador_furtivo']`; la partida por defecto tiene `fortune 3`, `wounds 0`, `rngSeed 12345`, `log []`, `visited {}`.
- Produce (en `src/engine/resolve.ts`, firmas exactas del contrato):
  - `export function choose(campaign: Campaign, state: GameState, choiceId: string): GameState`
  - `export function beginRoll(campaign: Campaign, state: GameState, choiceId: string): PendingRoll`
  - `export function rerollDie(campaign: Campaign, state: GameState, pending: PendingRoll, dieIndex: number): PendingRoll`
  - `export function usePower(campaign: Campaign, state: GameState, pending: PendingRoll): PendingRoll`
  - `export function usePlegaria(campaign: Campaign, state: GameState): GameState`
  - `export function restorePending(campaign: Campaign, state: GameState): PendingRoll | null`
  - `export function commitRoll(campaign: Campaign, state: GameState, pending: PendingRoll): GameState`
  - `export function endRun(campaign: Campaign, state: GameState): { world: WorldState; character: Character; summary: EndSummary }`
- Produce (fixture nuevo `tests/fixtures/campaigns/tirada.ts`, lo puede reutilizar la tarea 13):
  - `export const tirada: Campaign` — campaña `'tirada'` de cuatro escenas (`t_inicio` hub con tres tiradas y una opción sin tirada, `t_sala`, `t_cripta` mortal, `t_final` ending `fin_prueba`).
  - `export function withSeed(state: GameState, seed: number): GameState` — copia del estado con otra `run.rngSeed`.
  - `export function findSeed(build: (state: GameState) => PendingRoll, want: Band, base: GameState, maxSeeds?: number): number` — busca la primera semilla (1..maxSeeds) con la que `build(withSeed(base, semilla)).band === want`; lanza si no hay. Sirve para forzar una banda concreta sin conocer los valores de los dados.

**Errores que lanza el motor (mensajes exactos, en español):** `Opción desconocida: <id> (escena <sceneId>)`, `La opción requiere una tirada: <id>`, `La opción no tiene desenlace: <id>`, `La opción no tiene tirada: <id>`, `No queda Fortuna para repetir un dado`, `Índice de dado inválido: <n>`, `El Poder no se puede usar en esta tirada`, `La tirada pendiente es de otra escena: <sceneId>`, `La partida no terminó todavía`.

**Reglas que aplican a todo el código de esta tarea:** TypeScript `strict` con `noUnusedLocals` y `noUnusedParameters` (un parámetro que no se usa se nombra con guion bajo inicial, p. ej. `_campaign`), sin `any`, sin `!` en `src/` (en tests sí se permite); todas las funciones devuelven objetos nuevos (spread y arrays nuevos) y nunca mutan `state` ni `pending`; imports desde `src` con alias `@/`, imports entre archivos de `tests/` con rutas relativas. Los helpers privados de esta tarea tienen nombres distintivos (`findChoiceOrThrow`, `hashesOfCurrentScene`, `appendLogEntries`, `rollOfChoice`, `evaluateDice`, `powerApplies`, `computeCanUsePower`, `markPowerUsed`, `outcomeForBand`, `withoutPending`, `unionStrings`); si alguno ya existiera en el archivo con el mismo nombre por la tarea 9, `tsc` marca "Duplicate function implementation": en ese caso renombrá el de esta tarea agregando el sufijo `2` y actualizá sus llamadas.

---

#### Ciclo 1: fixture de campaña y `choose`

- [ ] **Paso 1: Escribir el test que falla (fixture + choose)**

Crear `tests/fixtures/campaigns/tirada.ts` con este contenido completo:

```ts
import type { Campaign, Scene } from '@/content/schema';
import type { Band, GameState, PendingRoll } from '@/engine/types';

/**
 * Campaña mínima para probar tiradas, Poder, Fortuna, consolidación y fin de partida.
 * No pasa por el validador (es un fixture del motor), pero respeta la forma de `Campaign`.
 */
const t_inicio = {
  id: 't_inicio',
  kind: 'hub',
  place: 'plaza_de_prueba',
  npcs: ['guardia'],
  text: [
    {
      variants: [
        { when: { visited: 't_inicio', min: 1 }, text: 'La plaza de prueba, otra vez.' },
        { text: 'Una plaza empedrada bajo la lluvia. Un guardia vigila la única puerta.' },
      ],
    },
    {
      variants: [
        { when: { met: 'guardia' }, text: 'Al guardia ya lo conocés de otra noche.' },
        { text: 'Al guardia no lo viste nunca.' },
      ],
    },
  ],
  choices: [
    {
      id: 'saber',
      label: 'Leer la inscripción del dintel',
      roll: {
        attr: 'saber',
        difficulty: 'normal',
        tags: ['saber'],
        outcomes: {
          crit: {
            text: ['Leés hasta lo que no está escrito y encontrás una llave escondida.'],
            effects: [{ give: 'llave' }],
            next: 't_sala',
          },
          success: { text: ['La inscripción cede su sentido.'], effects: [{ set: 'run:leyo' }], next: 't_sala' },
          partial: { text: ['Entendés la mitad.'], next: 't_sala' },
          failure: { text: ['Las letras no dicen nada.'], next: 't_sala' },
          fumble: { text: ['Te lastimás con el dintel.'], effects: [{ wound: 1 }], next: 't_sala' },
        },
      },
    },
    {
      id: 'fuerza',
      label: 'Forzar la puerta',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        outcomes: {
          success: { text: ['La puerta cede.'], next: 't_sala' },
          partial: { text: ['Cede, pero te llevás un golpe.'], effects: [{ wound: 1 }], next: 't_sala' },
          failure: { text: ['La puerta no cede y te lastimás.'], effects: [{ wound: 1 }], next: 't_sala' },
        },
      },
    },
    {
      id: 'mirar',
      label: 'Observar el patio',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        outcomes: {
          success: { next: 't_sala' },
          partial: { next: 't_sala' },
          failure: { next: 't_sala' },
        },
      },
    },
    {
      id: 'pasar',
      label: 'Cruzar la puerta sin más',
      outcome: {
        text: ['Cruzás sin mirar atrás.'],
        effects: [{ set: 'run:paso' }, { set: 'char:tirada.entro' }],
        next: 't_sala',
      },
    },
  ],
} satisfies Scene;

const t_sala = {
  id: 't_sala',
  kind: 'normal',
  place: 'sala',
  npcs: ['guardia'],
  text: [
    {
      variants: [
        { when: { flag: 'run:paso' }, text: 'Entraste sin tirar nada: la sala está en silencio.' },
        { text: 'La sala huele a aceite de lámpara.' },
      ],
    },
    {
      variants: [
        { when: { met: 'guardia' }, text: 'El guardia te sigue con la mirada; ya lo conocés.' },
        { text: 'Un guardia que no conocés te sigue con la mirada.' },
      ],
    },
  ],
  choices: [
    { id: 'volver', label: 'Volver a la plaza', outcome: { next: 't_inicio' } },
    { id: 'bajar', label: 'Bajar a la cripta', outcome: { next: 't_cripta' } },
    {
      id: 'terminar',
      label: 'Salir por la ventana',
      outcome: { effects: [{ set: 'world:tirada.alarma' }], next: 't_final' },
    },
    {
      id: 'rendirse',
      label: 'Rendirse al guardia',
      outcome: { text: ['El guardia no acepta rendiciones.'], effects: [{ wound: 2 }], next: 't_final' },
    },
  ],
} satisfies Scene;

const t_cripta = {
  id: 't_cripta',
  kind: 'normal',
  lethal: true,
  place: 'cripta',
  text: ['Un pozo negro. Un fallo acá te puede matar.'],
  choices: [
    {
      id: 'cruzar',
      label: 'Cruzar el pozo de un salto',
      roll: {
        attr: 'vigor',
        difficulty: 'dificil',
        tags: ['fisico'],
        outcomes: {
          success: { text: ['Llegás al otro lado.'], next: 't_final' },
          partial: { text: ['Llegás, con un golpe.'], effects: [{ wound: 1 }], next: 't_final' },
          failure: { text: ['Caés.'], effects: [{ lethal: true }], next: 't_sala' },
        },
      },
    },
    {
      id: 'tantear',
      label: 'Tantear el borde a oscuras',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        outcomes: {
          success: { next: 't_final' },
          partial: { effects: [{ wound: 1 }], next: 't_final' },
          failure: { effects: [{ wound: 1 }], next: 't_sala' },
        },
      },
    },
    { id: 'retroceder', label: 'Retroceder', outcome: { next: 't_sala' } },
    { id: 'esperar', label: 'Esperar a que los ojos se acostumbren', outcome: { next: 't_sala' } },
  ],
} satisfies Scene;

const t_final = {
  id: 't_final',
  kind: 'ending',
  place: 'sala',
  text: ['Se acabó la prueba.'],
  choices: [],
  ending: { id: 'fin_prueba', epilogue: ['Y eso fue todo.'] },
} satisfies Scene;

export const tirada: Campaign = {
  id: 'tirada',
  contentVersion: 1,
  title: 'Tirada de prueba',
  premise: 'Campaña mínima para probar tiradas, poderes y finales.',
  cover: 'tirada',
  levelRange: [1, 3],
  durationMin: [1, 2],
  lethalScenes: 1,
  lintProfile: 'smoke',
  hidden: true,
  start: 't_inicio',
  scenes: { t_inicio, t_sala, t_cripta, t_final },
  npcs: {
    guardia: {
      id: 'guardia',
      name: 'Guardia',
      portrait: 'guardia',
      voice: 'Seco, cansado.',
      canonPrompt: 'guardia de barba gris con farol',
    },
  },
  places: {
    plaza_de_prueba: {
      id: 'plaza_de_prueba',
      name: 'Plaza de prueba',
      background: 'plaza_de_prueba',
      canonPrompt: 'plaza empedrada bajo la lluvia',
    },
    sala: { id: 'sala', name: 'Sala', background: 'sala', canonPrompt: 'sala de piedra con lámparas de aceite' },
    cripta: { id: 'cripta', name: 'Cripta', background: 'cripta', canonPrompt: 'cripta con un pozo negro' },
  },
  items: {
    llave: {
      id: 'llave',
      name: 'Llave de hierro',
      icon: 'llave',
      description: 'Abre una puerta que todavía no viste.',
      advantageTags: ['sigilo'],
    },
  },
  flags: {
    'run:leyo': 'Leyó la inscripción',
    'run:paso': 'Cruzó sin tirar',
    'char:tirada.entro': 'Entró a la sala',
    'world:tirada.alarma': 'Sonó la alarma',
  },
  milestones: { hito_prueba: { label: 'Hito de prueba' } },
  clocks: {},
  endings: { fin_prueba: { title: 'Fin de la prueba' } },
};

/** Copia del estado con otra semilla de dados. */
export function withSeed(state: GameState, seed: number): GameState {
  return { ...state, run: { ...state.run, rngSeed: seed } };
}

/**
 * Busca la primera semilla (1..maxSeeds) con la que `build` produce la banda pedida.
 * Como los dados salen de un hash, el resultado es determinista entre corridas.
 */
export function findSeed(
  build: (state: GameState) => PendingRoll,
  want: Band,
  base: GameState,
  maxSeeds = 5000,
): number {
  for (let seed = 1; seed <= maxSeeds; seed += 1) {
    if (build(withSeed(base, seed)).band === want) return seed;
  }
  throw new Error(`No se encontró una semilla con banda ${want} en ${maxSeeds} intentos`);
}
```

Crear `tests/engine/resolve.roll.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import { hashParagraph } from '@/engine/text';
import { choose, enter } from '@/engine/resolve';
import type { GameState, LogEntry } from '@/engine/types';
import { makeCtx, type StateOverrides } from '../fixtures/state';
import { tirada as campaign } from '../fixtures/campaigns/tirada';

type SceneEntry = Extract<LogEntry, { kind: 'scene' }>;

/** Estado recién entrado a `sceneId` (con su LogEntry 'scene'), sin memoria derivada todavía. */
function estadoEn(sceneId: string, overrides: StateOverrides = {}): GameState {
  return enter(campaign, makeCtx(campaign, overrides).state, sceneId);
}

function kinds(log: LogEntry[]): string[] {
  return log.map((e) => e.kind);
}

function sceneEntries(log: LogEntry[]): SceneEntry[] {
  return log.filter((e): e is SceneEntry => e.kind === 'scene');
}

function textos(entry: { paragraphs: { text: string }[] }): string[] {
  return entry.paragraphs.map((p) => p.text);
}

describe('choose', () => {
  it('deriva la memoria de la escena actual ANTES de aplicar efectos y entrar', () => {
    const state = estadoEn('t_inicio');
    const antes = JSON.stringify(state);
    const inicio = sceneEntries(state.run.log)[0]!;
    // Primera visita: ni "otra vez" ni "ya lo conocés".
    expect(textos(inicio)).toEqual([
      'Una plaza empedrada bajo la lluvia. Un guardia vigila la única puerta.',
      'Al guardia no lo viste nunca.',
    ]);

    const next = choose(campaign, state, 'pasar');

    expect(JSON.stringify(state)).toBe(antes);
    expect(next.character.flags).toHaveLength(2);
    expect(next.character.flags).toEqual(expect.arrayContaining(['char:met.guardia', 'char:place.plaza_de_prueba']));
    expect(next.run.visited).toEqual({ t_inicio: 1 });
    expect(next.seen).toEqual({ t_inicio: inicio.hashes });
    expect(inicio.hashes).toEqual(textos(inicio).map(hashParagraph));
    expect(next.run.flags).toEqual(['run:paso']);
    expect(next.run.stagedFlags).toEqual(['char:tirada.entro']);
    expect(next.run.sceneId).toBe('t_sala');
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'outcome', 'scene']);
    // La escena siguiente ya ve el flag run:paso y el char:met.guardia derivado.
    const sala = sceneEntries(next.run.log)[1]!;
    expect(textos(sala)).toEqual([
      'Entraste sin tirar nada: la sala está en silencio.',
      'El guardia te sigue con la mirada; ya lo conocés.',
    ]);
  });

  it('al volver, la plaza muestra las variantes de visita previa y de PNJ conocido', () => {
    const s1 = choose(campaign, estadoEn('t_inicio'), 'pasar');
    const s2 = choose(campaign, s1, 'volver');
    expect(s2.run.visited).toEqual({ t_inicio: 1, t_sala: 1 });
    expect(s2.seen.t_sala).toHaveLength(2);
    const entradas = sceneEntries(s2.run.log);
    expect(entradas).toHaveLength(3);
    expect(textos(entradas[2]!)).toEqual(['La plaza de prueba, otra vez.', 'Al guardia ya lo conocés de otra noche.']);
  });

  it('registra la elección y el texto del desenlace en el log', () => {
    const next = choose(campaign, estadoEn('t_inicio'), 'pasar');
    expect(next.run.log[1]).toEqual({ kind: 'choice', sceneId: 't_inicio', choiceId: 'pasar', label: 'Cruzar la puerta sin más' });
    expect(next.run.log[2]).toEqual({ kind: 'outcome', paragraphs: [{ text: 'Cruzás sin mirar atrás.' }] });
  });

  it('sin texto de desenlace no agrega entrada outcome', () => {
    const enSala = choose(campaign, estadoEn('t_inicio'), 'pasar');
    const next = choose(campaign, enSala, 'volver');
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'outcome', 'scene', 'choice', 'scene']);
  });

  it('si el log no tiene la escena actual, calcula los hashes con resolveText', () => {
    const crudo = makeCtx(campaign).state; // sceneId t_inicio, log vacío
    const next = choose(campaign, crudo, 'pasar');
    expect(next.seen.t_inicio).toEqual([
      hashParagraph('Una plaza empedrada bajo la lluvia. Un guardia vigila la única puerta.'),
      hashParagraph('Al guardia no lo viste nunca.'),
    ]);
  });

  it('lanza si la opción tiene tirada o no existe', () => {
    const state = estadoEn('t_inicio');
    expect(() => choose(campaign, state, 'saber')).toThrow('La opción requiere una tirada: saber');
    expect(() => choose(campaign, state, 'nada')).toThrow('Opción desconocida: nada (escena t_inicio)');
  });

  it('si el desenlace deja Caído, no entra a la escena siguiente y run.outcome queda', () => {
    const state = estadoEn('t_sala', { run: { wounds: 1 } });
    const next = choose(campaign, state, 'rendirse');
    expect(next.run.wounds).toBe(3);
    expect(next.run.outcome).toEqual({ kind: 'defeat' });
    expect(next.run.sceneId).toBe('t_sala');
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'outcome']);
    expect(next.run.visited).toEqual({ t_sala: 1 });
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/resolve.roll.test.ts
```

Resultado esperado: los 7 tests de `choose` fallan con `TypeError: choose is not a function` (o, según la versión de Vitest, `SyntaxError: The requested module '@/engine/resolve' does not provide an export named 'choose'`, que hace fallar el archivo entero). Si en cambio falla `tirada.ts` al compilar, revisá el fixture antes de seguir.

- [ ] **Paso 3: Implementación mínima (imports, helpers y `choose`)**

Abrí `src/engine/resolve.ts`. En el bloque de imports de arriba del archivo asegurate de que estén **todos** estos símbolos (agregá los que falten a los imports existentes del mismo módulo; no dupliques líneas de import del mismo módulo):

```ts
import { CLASSES, FUMBLE_DEFAULT_CONDITION, LIMITS, type ClassId, type PowerScope, type Tag } from '@/content/catalog';
import type { Campaign, Choice, Outcome, Roll, Scene } from '@/content/schema';
import { classify, keepDice } from '@/engine/dice';
import { rollDice } from '@/engine/rng';
import { applyEffects } from '@/engine/effects';
import { hashParagraph, resolveText } from '@/engine/text';
import { deriveMemory } from '@/engine/memory';
import { buildPreview } from '@/engine/modifiers';
import { fortuneMax } from '@/engine/progression';
import type {
  Band,
  CampaignLogEntry,
  Character,
  EndSummary,
  EvalContext,
  Fallen,
  GameState,
  LogEntry,
  PendingRoll,
  Run,
  WorldState,
} from '@/engine/types';
```

Nota: con `noUnusedLocals` un import que todavía no se usa hace fallar `tsc`, pero **no** hace fallar Vitest. Los imports se usan todos al terminar el ciclo 5; hasta entonces, `npx tsc --noEmit` puede marcar "is declared but its value is never read" en `resolve.ts`, y eso es esperable dentro de esta tarea. Si preferís evitarlo, agregá cada import en el ciclo que lo usa por primera vez (este ciclo usa `LIMITS`, `Campaign`, `Choice`, `Scene`, `applyEffects`, `hashParagraph`, `resolveText`, `deriveMemory`, `EvalContext`, `GameState`, `LogEntry`).

Después agregá **al final del archivo** este bloque completo:

```ts
// ---------------------------------------------------------------------------
// Parte 2: elegir, tirar, consolidar y terminar
// ---------------------------------------------------------------------------

/** Busca una opción de la escena o lanza con el id y la escena en el mensaje. */
function findChoiceOrThrow(scene: Scene, choiceId: string): Choice {
  const choice = scene.choices.find((c) => c.id === choiceId);
  if (choice === undefined) {
    throw new Error(`Opción desconocida: ${choiceId} (escena ${scene.id})`);
  }
  return choice;
}

/**
 * Hashes de los párrafos que el jugador vio en la escena actual: los del último
 * LogEntry 'scene' con ese sceneId; si no hay (estado armado a mano), se resuelve el texto ahora.
 */
function hashesOfCurrentScene(campaign: Campaign, state: GameState): string[] {
  const { run } = state;
  for (let i = run.log.length - 1; i >= 0; i -= 1) {
    const entry = run.log[i];
    if (entry !== undefined && entry.kind === 'scene' && entry.sceneId === run.sceneId) {
      return [...entry.hashes];
    }
  }
  const scene = getScene(campaign, run.sceneId);
  return resolveText(scene.text, { campaign, state }).map((p) => hashParagraph(p.text));
}

/** Agrega entradas al log y recorta a las últimas LIMITS.maxLog. */
function appendLogEntries(state: GameState, entries: LogEntry[]): GameState {
  const log = [...state.run.log, ...entries];
  const trimmed = log.length > LIMITS.maxLog ? log.slice(log.length - LIMITS.maxLog) : log;
  return { ...state, run: { ...state.run, log: trimmed } };
}

/**
 * Elegir una opción SIN tirada.
 * Orden fijo: deriveMemory(escena actual) → log 'choice' → applyEffects(outcome.effects)
 * → log 'outcome' (si hay texto) → si la partida terminó (defeat/death) se devuelve sin entrar;
 * si no, enter(outcome.next).
 */
export function choose(campaign: Campaign, state: GameState, choiceId: string): GameState {
  const scene = getScene(campaign, state.run.sceneId);
  const choice = findChoiceOrThrow(scene, choiceId);
  if (choice.roll !== undefined) {
    throw new Error(`La opción requiere una tirada: ${choiceId}`);
  }
  const outcome = choice.outcome;
  if (outcome === undefined) {
    throw new Error(`La opción no tiene desenlace: ${choiceId}`);
  }
  const hashes = hashesOfCurrentScene(campaign, state);
  let next = deriveMemory({ campaign, state }, scene.id, hashes);
  next = appendLogEntries(next, [{ kind: 'choice', sceneId: scene.id, choiceId: choice.id, label: choice.label }]);
  next = applyEffects(outcome.effects, { campaign, state: next });
  if (outcome.text !== undefined) {
    const paragraphs = resolveText(outcome.text, { campaign, state: next });
    next = appendLogEntries(next, [{ kind: 'outcome', paragraphs }]);
  }
  if (next.run.outcome !== undefined) {
    return next;
  }
  return enter(campaign, next, outcome.next);
}
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/resolve.roll.test.ts
```

Resultado esperado: `Test Files 1 passed (1)`, `Tests 7 passed (7)`.

- [ ] **Paso 5: Commit**

```bash
git add src/engine/resolve.ts tests/engine/resolve.roll.test.ts tests/fixtures/campaigns/tirada.ts
git commit -m "feat(engine): choose deriva memoria, aplica efectos y entra a la siguiente escena" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 2: `beginRoll` y `rerollDie`

- [ ] **Paso 6: Escribir el test que falla (beginRoll y rerollDie)**

En `tests/engine/resolve.roll.test.ts` reemplazá el bloque de imports del principio por este:

```ts
import { describe, expect, it } from 'vitest';
import { classify, keepDice } from '@/engine/dice';
import { rollDice } from '@/engine/rng';
import { hashParagraph } from '@/engine/text';
import { beginRoll, choose, enter, rerollDie } from '@/engine/resolve';
import type { GameState, LogEntry } from '@/engine/types';
import { makeCtx, type StateOverrides } from '../fixtures/state';
import { tirada as campaign } from '../fixtures/campaigns/tirada';
```

Y agregá **al final del archivo** estos dos bloques `describe`:

```ts
describe('beginRoll', () => {
  it('no muta el estado y es determinista', () => {
    const state = estadoEn('t_inicio');
    const antes = JSON.stringify(state);
    const p1 = beginRoll(campaign, state, 'saber');
    const p2 = beginRoll(campaign, state, 'saber');
    expect(JSON.stringify(state)).toBe(antes);
    expect(p1).toEqual(p2);
    expect(state.run.pending).toBeUndefined();
  });

  it('con ventaja tira 3 dados y deriva kept, total y banda de dice.ts', () => {
    const state = estadoEn('t_inicio');
    const p = beginRoll(campaign, state, 'saber'); // mago con Aprendiz de escriba → ventaja en saber
    expect(p.choiceId).toBe('saber');
    expect(p.sceneId).toBe('t_inicio');
    expect(p.preview.mode).toBe('advantage');
    expect(p.preview.totalMod).toBe(2); // saber 2 + normal 0 + veterano 0 (nivel 3 en rango [1,3])
    expect(p.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'saber', 0, 0, 3));
    expect(p.dice).toHaveLength(3);
    expect(p.kept).toEqual(keepDice(p.dice, 'advantage'));
    const valores = p.kept.map((i) => p.dice[i]!);
    expect(p.total).toBe(valores[0]! + valores[1]! + 2);
    expect(p.band).toBe(classify(valores, 2));
    expect(p.rerolls).toEqual([]);
    expect(p.powerUsed).toBe(false);
    expect(p.canReroll).toBe(true);
  });

  it('con desventaja tira 3 dados y en tirada normal tira 2', () => {
    const state = estadoEn('t_inicio');
    const fuerza = beginRoll(campaign, state, 'fuerza'); // Debilidad del mago: fisico
    expect(fuerza.preview.mode).toBe('disadvantage');
    expect(fuerza.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'fuerza', 0, 0, 3));
    expect(fuerza.kept).toEqual(keepDice(fuerza.dice, 'disadvantage'));
    const mirar = beginRoll(campaign, state, 'mirar'); // percepcion: sin fuentes
    expect(mirar.preview.mode).toBe('normal');
    expect(mirar.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'mirar', 0, 0, 2));
    expect(mirar.kept).toEqual([0, 1]);
  });

  it('usa el contador de visitas de la escena actual en el hash', () => {
    const state = estadoEn('t_inicio', { run: { visited: { t_inicio: 2 } } });
    const p = beginRoll(campaign, state, 'mirar');
    expect(p.dice).toEqual(rollDice(state.run.rngSeed, 't_inicio', 'mirar', 2, 0, 2));
  });

  it('canReroll es falso sin Fortuna', () => {
    const p = beginRoll(campaign, estadoEn('t_inicio', { run: { fortune: 0 } }), 'mirar');
    expect(p.canReroll).toBe(false);
  });

  it('lanza si la opción no tiene tirada o no existe', () => {
    const state = estadoEn('t_inicio');
    expect(() => beginRoll(campaign, state, 'pasar')).toThrow('La opción no tiene tirada: pasar');
    expect(() => beginRoll(campaign, state, 'nada')).toThrow('Opción desconocida: nada (escena t_inicio)');
  });
});

describe('rerollDie', () => {
  it('cambia solo el dado elegido usando attempt = rerolls.length + 1', () => {
    const state = estadoEn('t_inicio');
    const seed = state.run.rngSeed;
    const p0 = beginRoll(campaign, state, 'mirar');
    const p1 = rerollDie(campaign, state, p0, 1);
    expect(p1.dice[0]).toBe(p0.dice[0]);
    expect(p1.dice[1]).toBe(rollDice(seed, 't_inicio', 'mirar', 0, 1, 1)[0]);
    expect(p1.rerolls).toEqual([1]);
    const p2 = rerollDie(campaign, state, p1, 0);
    expect(p2.dice[0]).toBe(rollDice(seed, 't_inicio', 'mirar', 0, 2, 1)[0]);
    expect(p2.dice[1]).toBe(p1.dice[1]);
    expect(p2.rerolls).toEqual([1, 0]);
    // Los pending anteriores y el estado no cambian.
    expect(p0.rerolls).toEqual([]);
    expect(p0.dice).toEqual(rollDice(seed, 't_inicio', 'mirar', 0, 0, 2));
    expect(p1.rerolls).toEqual([1]);
    expect(state.run.fortune).toBe(3);
  });

  it('recalcula kept, total y banda con los dados nuevos', () => {
    const state = estadoEn('t_inicio');
    const p = rerollDie(campaign, state, beginRoll(campaign, state, 'saber'), 2);
    expect(p.kept).toEqual(keepDice(p.dice, 'advantage'));
    const valores = p.kept.map((i) => p.dice[i]!);
    expect(p.total).toBe(valores[0]! + valores[1]! + p.preview.totalMod);
    expect(p.band).toBe(classify(valores, p.preview.totalMod));
  });

  it('gasta Fortuna virtualmente: canReroll se apaga y después lanza', () => {
    const state = estadoEn('t_inicio', { run: { fortune: 1 } });
    const p0 = beginRoll(campaign, state, 'mirar');
    expect(p0.canReroll).toBe(true);
    const p1 = rerollDie(campaign, state, p0, 0);
    expect(p1.canReroll).toBe(false);
    expect(() => rerollDie(campaign, state, p1, 1)).toThrow('No queda Fortuna para repetir un dado');
    expect(state.run.fortune).toBe(1);
  });

  it('lanza con índice de dado inválido', () => {
    const state = estadoEn('t_inicio');
    const p = beginRoll(campaign, state, 'mirar');
    expect(() => rerollDie(campaign, state, p, 2)).toThrow('Índice de dado inválido: 2');
    expect(() => rerollDie(campaign, state, p, -1)).toThrow('Índice de dado inválido: -1');
  });
});
```

- [ ] **Paso 7: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/resolve.roll.test.ts
```

Resultado esperado: los 7 tests de `choose` siguen en verde; los 6 de `beginRoll` y los 4 de `rerollDie` fallan con `TypeError: beginRoll is not a function` / `TypeError: rerollDie is not a function` (o el archivo entero falla por export inexistente).

- [ ] **Paso 8: Implementación mínima (beginRoll y rerollDie)**

Agregá **al final** de `src/engine/resolve.ts`:

```ts
/** Devuelve la opción y su tirada; lanza si la opción no existe o no tiene tirada. */
function rollOfChoice(campaign: Campaign, state: GameState, choiceId: string): { choice: Choice; roll: Roll } {
  const scene = getScene(campaign, state.run.sceneId);
  const choice = findChoiceOrThrow(scene, choiceId);
  if (choice.roll === undefined) {
    throw new Error(`La opción no tiene tirada: ${choiceId}`);
  }
  return { choice, roll: choice.roll };
}

/** ¿El Poder de la clase aplica a estos tags? tags: intersección no vacía; any: siempre; sheet: nunca. */
function powerApplies(classId: ClassId, tags: readonly Tag[]): boolean {
  const scope: PowerScope = CLASSES[classId].power.scope;
  if (scope.kind === 'any') return true;
  if (scope.kind === 'sheet') return false;
  return scope.tags.some((t) => tags.includes(t));
}

/** Regla completa de canUsePower: una vez por partida, una vez por tirada, solo sobre failure/fumble. */
function computeCanUsePower(state: GameState, roll: Roll, band: Band, powerUsed: boolean): boolean {
  if (state.run.powerUsed || powerUsed) return false;
  if (band !== 'failure' && band !== 'fumble') return false;
  return powerApplies(state.character.classId, roll.tags);
}

/**
 * kept (índices), total y banda a partir de los dados. Si el Poder ya se usó,
 * la banda nunca vuelve a failure/fumble: queda en partial.
 */
function evaluateDice(
  dice: number[],
  mode: PendingRoll['preview']['mode'],
  totalMod: number,
  powerUsed: boolean,
): { kept: number[]; total: number; band: Band } {
  const kept = keepDice(dice, mode);
  const valores = kept.map((i) => dice[i] ?? 0);
  const total = valores.reduce((suma, v) => suma + v, 0) + totalMod;
  const cruda = classify(valores, totalMod);
  const band: Band = powerUsed && (cruda === 'failure' || cruda === 'fumble') ? 'partial' : cruda;
  return { kept, total, band };
}

/**
 * Primera fase de una tirada. Calcula preview, dados (hash determinista), kept, total y banda.
 * NO toca el estado: el store persiste aparte `run.pending = { choiceId, rerolls: [], powerUsed: false }`.
 */
export function beginRoll(campaign: Campaign, state: GameState, choiceId: string): PendingRoll {
  const { roll } = rollOfChoice(campaign, state, choiceId);
  const ctx: EvalContext = { campaign, state };
  const preview = buildPreview(roll, ctx);
  const count = preview.mode === 'advantage' || preview.mode === 'disadvantage' ? 3 : 2;
  const { run } = state;
  const visits = run.visited[run.sceneId] ?? 0;
  const dice = rollDice(run.rngSeed, run.sceneId, choiceId, visits, 0, count);
  const { kept, total, band } = evaluateDice(dice, preview.mode, preview.totalMod, false);
  return {
    choiceId,
    sceneId: run.sceneId,
    preview,
    dice,
    kept,
    total,
    band,
    rerolls: [],
    powerUsed: false,
    canReroll: run.fortune > 0,
    canUsePower: computeCanUsePower(state, roll, band, false),
  };
}

/**
 * Repite un dado gastando 1 Fortuna (virtual: se descuenta en commitRoll).
 * El dado nuevo sale del hash con attempt = rerolls.length + 1.
 */
export function rerollDie(campaign: Campaign, state: GameState, pending: PendingRoll, dieIndex: number): PendingRoll {
  if (!pending.canReroll) {
    throw new Error('No queda Fortuna para repetir un dado');
  }
  if (!Number.isInteger(dieIndex) || dieIndex < 0 || dieIndex >= pending.dice.length) {
    throw new Error(`Índice de dado inválido: ${dieIndex}`);
  }
  const { roll } = rollOfChoice(campaign, state, pending.choiceId);
  const { run } = state;
  const visits = run.visited[run.sceneId] ?? 0;
  const attempt = pending.rerolls.length + 1;
  const nuevo = rollDice(run.rngSeed, run.sceneId, pending.choiceId, visits, attempt, 1)[0] ?? 1;
  const dice = pending.dice.map((d, i) => (i === dieIndex ? nuevo : d));
  const rerolls = [...pending.rerolls, dieIndex];
  const { kept, total, band } = evaluateDice(dice, pending.preview.mode, pending.preview.totalMod, pending.powerUsed);
  return {
    ...pending,
    dice,
    kept,
    total,
    band,
    rerolls,
    canReroll: run.fortune - rerolls.length > 0,
    canUsePower: computeCanUsePower(state, roll, band, pending.powerUsed),
  };
}
```

- [ ] **Paso 9: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/resolve.roll.test.ts
```

Resultado esperado: `Tests 17 passed (17)`.

- [ ] **Paso 10: Commit**

```bash
git add src/engine/resolve.ts tests/engine/resolve.roll.test.ts
git commit -m "feat(engine): beginRoll y rerollDie con dados deterministas y Fortuna virtual" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: `usePower`, `usePlegaria` y `restorePending`

- [ ] **Paso 11: Escribir el test que falla (Poder, Plegaria y restauración)**

En `tests/engine/resolve.roll.test.ts` reemplazá el bloque de imports por este:

```ts
import { describe, expect, it } from 'vitest';
import { classify, keepDice } from '@/engine/dice';
import { rollDice } from '@/engine/rng';
import { hashParagraph } from '@/engine/text';
import { beginRoll, choose, enter, rerollDie, restorePending, usePlegaria, usePower } from '@/engine/resolve';
import type { Band, GameState, LogEntry, PendingRoll } from '@/engine/types';
import { makeCtx, type StateOverrides } from '../fixtures/state';
import { findSeed, tirada as campaign, withSeed } from '../fixtures/campaigns/tirada';
```

Debajo de la función `textos` (antes del primer `describe`) agregá estos helpers:

```ts
/** Copia del pending con otra banda: sirve para probar reglas sin depender de los dados. */
function forzar(p: PendingRoll, band: Band): PendingRoll {
  return { ...p, band };
}

const GUERRERO: StateOverrides = {
  character: { classId: 'guerrero', traits: [], attrs: { vigor: 2, astucia: 1, saber: 1, presencia: 0 } },
};

const CLERIGO: StateOverrides = {
  character: { classId: 'clerigo', traits: [], attrs: { vigor: 0, astucia: 1, saber: 1, presencia: 2 } },
};
```

Y agregá **al final del archivo**:

```ts
describe('usePower', () => {
  it('el mago convierte un Fallo en Éxito con costo en cualquier tirada', () => {
    const state = estadoEn('t_inicio');
    const p = forzar(beginRoll(campaign, state, 'mirar'), 'failure');
    const q = usePower(campaign, state, p);
    expect(q.band).toBe('partial');
    expect(q.powerUsed).toBe(true);
    expect(q.canUsePower).toBe(false);
    expect(q.dice).toEqual(p.dice);
    expect(q.rerolls).toEqual(p.rerolls);
    // No muta el pending de entrada.
    expect(p.band).toBe('failure');
    expect(p.powerUsed).toBe(false);
  });

  it('también convierte un Fallo grave', () => {
    const state = estadoEn('t_inicio');
    const q = usePower(campaign, state, forzar(beginRoll(campaign, state, 'saber'), 'fumble'));
    expect(q.band).toBe('partial');
    expect(q.powerUsed).toBe(true);
  });

  it('no aplica sobre éxito, éxito con costo ni crítico', () => {
    const state = estadoEn('t_inicio');
    const p = beginRoll(campaign, state, 'mirar');
    for (const band of ['success', 'partial', 'crit'] as const) {
      expect(() => usePower(campaign, state, forzar(p, band))).toThrow('El Poder no se puede usar en esta tirada');
    }
  });

  it('el guerrero solo puede usar Furia en tiradas con tag fisico', () => {
    const state = estadoEn('t_inicio', GUERRERO);
    const fisica = forzar(beginRoll(campaign, state, 'fuerza'), 'failure');
    expect(usePower(campaign, state, fisica).band).toBe('partial');
    const mental = forzar(beginRoll(campaign, state, 'saber'), 'failure');
    expect(() => usePower(campaign, state, mental)).toThrow('El Poder no se puede usar en esta tirada');
    expect(mental.canUsePower).toBe(false);
  });

  it('el clérigo nunca usa su Poder desde una tirada', () => {
    const state = estadoEn('t_inicio', CLERIGO);
    for (const id of ['saber', 'fuerza', 'mirar']) {
      const p = forzar(beginRoll(campaign, state, id), 'failure');
      expect(() => usePower(campaign, state, p)).toThrow('El Poder no se puede usar en esta tirada');
    }
  });

  it('no se puede usar dos veces: ni en la misma tirada ni si run.powerUsed ya está', () => {
    const state = estadoEn('t_inicio');
    const q = usePower(campaign, state, forzar(beginRoll(campaign, state, 'mirar'), 'failure'));
    expect(() => usePower(campaign, state, forzar(q, 'failure'))).toThrow('El Poder no se puede usar en esta tirada');
    const gastado = estadoEn('t_inicio', { run: { powerUsed: true } });
    const p = beginRoll(campaign, gastado, 'mirar');
    expect(p.canUsePower).toBe(false);
    expect(() => usePower(campaign, gastado, forzar(p, 'failure'))).toThrow('El Poder no se puede usar en esta tirada');
  });

  it('beginRoll deja canUsePower coherente con la banda real', () => {
    const state = estadoEn('t_inicio');
    const p = beginRoll(campaign, state, 'mirar');
    expect(p.canUsePower).toBe(p.band === 'failure' || p.band === 'fumble');
  });

  it('tras usar el Poder, repetir un dado nunca vuelve a Fallo', () => {
    const base = estadoEn('t_inicio');
    const seed = findSeed((s) => beginRoll(campaign, s, 'mirar'), 'failure', base);
    const state = withSeed(base, seed);
    const q = usePower(campaign, state, beginRoll(campaign, state, 'mirar'));
    const r = rerollDie(campaign, state, q, 0);
    const valores = r.kept.map((i) => r.dice[i]!);
    const cruda = classify(valores, r.preview.totalMod);
    expect(r.band).toBe(cruda === 'failure' || cruda === 'fumble' ? 'partial' : cruda);
    expect(r.powerUsed).toBe(true);
    expect(r.canUsePower).toBe(false);
  });
});

describe('usePlegaria', () => {
  it('el clérigo cura 1 Herida, limpia condiciones y gasta el Poder', () => {
    const state = estadoEn('t_inicio', { ...CLERIGO, run: { wounds: 2, conditions: ['asustado', 'empapado'] } });
    const antes = JSON.stringify(state);
    const next = usePlegaria(campaign, state);
    expect(next.run.wounds).toBe(1);
    expect(next.run.conditions).toEqual([]);
    expect(next.run.powerUsed).toBe(true);
    expect(JSON.stringify(state)).toBe(antes);
  });

  it('sano: las Heridas quedan en 0', () => {
    const next = usePlegaria(campaign, estadoEn('t_inicio', { ...CLERIGO, run: { conditions: ['asustado'] } }));
    expect(next.run.wounds).toBe(0);
    expect(next.run.conditions).toEqual([]);
    expect(next.run.powerUsed).toBe(true);
  });

  it('con el Poder ya usado devuelve el mismo estado', () => {
    const state = estadoEn('t_inicio', { ...CLERIGO, run: { wounds: 2, powerUsed: true } });
    expect(usePlegaria(campaign, state)).toBe(state);
  });

  it('otra clase devuelve el mismo estado', () => {
    const state = estadoEn('t_inicio', { run: { wounds: 2, conditions: ['asustado'] } }); // mago
    expect(usePlegaria(campaign, state)).toBe(state);
  });
});

describe('restorePending', () => {
  it('devuelve null si no hay tirada pendiente', () => {
    expect(restorePending(campaign, estadoEn('t_inicio'))).toBeNull();
  });

  it('sin rerolls ni Poder equivale a beginRoll', () => {
    const state = estadoEn('t_inicio', { run: { pending: { choiceId: 'saber', rerolls: [], powerUsed: false } } });
    expect(restorePending(campaign, state)).toEqual(beginRoll(campaign, state, 'saber'));
  });

  it('reproduce exactamente un pending con dos rerolls y Poder (mismos dados y banda)', () => {
    const base = estadoEn('t_inicio');
    const construir = (s: GameState): PendingRoll =>
      rerollDie(campaign, s, rerollDie(campaign, s, beginRoll(campaign, s, 'mirar'), 0), 1);
    const seed = findSeed(construir, 'failure', base);
    const state = withSeed(base, seed);
    const esperado = usePower(campaign, state, construir(state));
    const conPending: GameState = {
      ...state,
      run: { ...state.run, pending: { choiceId: 'mirar', rerolls: [0, 1], powerUsed: true } },
    };
    const restaurado = restorePending(campaign, conPending);
    expect(restaurado).toEqual(esperado);
    expect(restaurado?.dice).toEqual(esperado.dice);
    expect(restaurado?.band).toBe('partial');
    expect(restaurado?.rerolls).toEqual([0, 1]);
    expect(restaurado?.powerUsed).toBe(true);
    expect(restaurado?.canUsePower).toBe(false);
  });

  it('si el Poder se usó y después un dado repetido dio éxito, conserva powerUsed sin cambiar la banda', () => {
    const base = estadoEn('t_inicio');
    const construir = (s: GameState): PendingRoll => rerollDie(campaign, s, beginRoll(campaign, s, 'mirar'), 0);
    const seed = findSeed(construir, 'success', base);
    const state = withSeed(base, seed);
    const conPending: GameState = {
      ...state,
      run: { ...state.run, pending: { choiceId: 'mirar', rerolls: [0], powerUsed: true } },
    };
    const restaurado = restorePending(campaign, conPending);
    expect(restaurado?.band).toBe('success');
    expect(restaurado?.powerUsed).toBe(true);
    expect(restaurado?.canUsePower).toBe(false);
    expect(restaurado?.dice).toEqual(construir(state).dice);
  });
});
```

- [ ] **Paso 12: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/resolve.roll.test.ts
```

Resultado esperado: los 17 anteriores en verde; los 8 de `usePower`, 4 de `usePlegaria` y 4 de `restorePending` fallan con `TypeError: usePower is not a function`, `usePlegaria is not a function`, `restorePending is not a function` (o el archivo entero por export inexistente).

- [ ] **Paso 13: Implementación mínima (usePower, usePlegaria, restorePending)**

Agregá **al final** de `src/engine/resolve.ts`:

```ts
/** Marca el Poder como usado en el pending: failure/fumble pasan a partial; el resto no cambia. */
function markPowerUsed(pending: PendingRoll): PendingRoll {
  const band: Band = pending.band === 'failure' || pending.band === 'fumble' ? 'partial' : pending.band;
  return { ...pending, band, powerUsed: true, canUsePower: false };
}

/**
 * Convierte un Fallo (o Fallo grave) en Éxito con costo si el Poder de la clase aplica.
 * Lanza si no se puede (ya usado en la partida o en esta tirada, banda no es fallo, scope no aplica).
 */
export function usePower(campaign: Campaign, state: GameState, pending: PendingRoll): PendingRoll {
  const { roll } = rollOfChoice(campaign, state, pending.choiceId);
  if (!computeCanUsePower(state, roll, pending.band, pending.powerUsed)) {
    throw new Error('El Poder no se puede usar en esta tirada');
  }
  return markPowerUsed(pending);
}

/**
 * Poder del Clérigo, desde la ficha: cura 1 Herida y limpia todas las condiciones.
 * Si no es clérigo o ya usó el Poder, devuelve el mismo estado.
 */
export function usePlegaria(_campaign: Campaign, state: GameState): GameState {
  const { character, run } = state;
  if (character.classId !== 'clerigo' || run.powerUsed) {
    return state;
  }
  const wounds = Math.max(0, run.wounds - 1) as Run['wounds'];
  return { ...state, run: { ...run, wounds, conditions: [], powerUsed: true } };
}

/**
 * Reconstruye el PendingRoll desde run.pending tras una recarga: beginRoll, un rerollDie por índice
 * en orden y, si powerUsed, el Poder. Si al final la banda ya no es fallo (el jugador usó el Poder y
 * después repitió un dado hasta el éxito), se conserva powerUsed sin tocar la banda.
 */
export function restorePending(campaign: Campaign, state: GameState): PendingRoll | null {
  const persisted = state.run.pending;
  if (persisted === undefined) {
    return null;
  }
  let pending = beginRoll(campaign, state, persisted.choiceId);
  for (const dieIndex of persisted.rerolls) {
    pending = rerollDie(campaign, state, pending, dieIndex);
  }
  if (persisted.powerUsed) {
    pending = pending.canUsePower ? usePower(campaign, state, pending) : markPowerUsed(pending);
  }
  return pending;
}
```

- [ ] **Paso 14: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/resolve.roll.test.ts
```

Resultado esperado: `Tests 33 passed (33)`.

- [ ] **Paso 15: Commit**

```bash
git add src/engine/resolve.ts tests/engine/resolve.roll.test.ts
git commit -m "feat(engine): usePower por clase, usePlegaria del clerigo y restorePending determinista" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: `commitRoll`

- [ ] **Paso 16: Escribir el test que falla (commitRoll)**

En `tests/engine/resolve.roll.test.ts` reemplazá el bloque de imports por este:

```ts
import { describe, expect, it } from 'vitest';
import { FUMBLE_DEFAULT_CONDITION } from '@/content/catalog';
import { classify, keepDice } from '@/engine/dice';
import { rollDice } from '@/engine/rng';
import { hashParagraph } from '@/engine/text';
import {
  beginRoll,
  choose,
  commitRoll,
  enter,
  rerollDie,
  restorePending,
  usePlegaria,
  usePower,
} from '@/engine/resolve';
import type { Band, GameState, LogEntry, PendingRoll } from '@/engine/types';
import { makeCtx, type StateOverrides } from '../fixtures/state';
import { findSeed, tirada as campaign, withSeed } from '../fixtures/campaigns/tirada';
```

Y agregá **al final del archivo**:

```ts
describe('commitRoll', () => {
  it('aplica el desenlace de la banda, deriva memoria, registra el log y entra a next', () => {
    const state = estadoEn('t_inicio');
    const antes = JSON.stringify(state);
    const p = forzar(beginRoll(campaign, state, 'saber'), 'success');

    const next = commitRoll(campaign, state, p);

    expect(JSON.stringify(state)).toBe(antes);
    expect(next.run.flags).toEqual(['run:leyo']);
    expect(next.run.sceneId).toBe('t_sala');
    expect(next.run.visited).toEqual({ t_inicio: 1 });
    expect(next.character.flags).toEqual(expect.arrayContaining(['char:met.guardia', 'char:place.plaza_de_prueba']));
    expect(next.seen.t_inicio).toHaveLength(2);
    expect(next.run.pending).toBeUndefined();
    expect(next.run.fortune).toBe(3);
    expect(next.run.powerUsed).toBe(false);
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'roll', 'outcome', 'scene']);
    expect(next.run.log[1]).toEqual({ kind: 'choice', sceneId: 't_inicio', choiceId: 'saber', label: 'Leer la inscripción del dintel' });
    expect(next.run.log[2]).toEqual({
      kind: 'roll',
      dice: p.dice,
      kept: p.kept,
      mode: 'advantage',
      total: p.total,
      band: 'success',
      fortuneSpent: 0,
      powerUsed: false,
    });
    expect(next.run.log[3]).toEqual({ kind: 'outcome', paragraphs: [{ text: 'La inscripción cede su sentido.' }] });
    // La escena siguiente ya ve la memoria derivada.
    const sala = sceneEntries(next.run.log)[1]!;
    expect(textos(sala)[1]).toBe('El guardia te sigue con la mirada; ya lo conocés.');
  });

  it('sin texto de desenlace no agrega entrada outcome', () => {
    const state = estadoEn('t_inicio');
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'mirar'), 'partial'));
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'roll', 'scene']);
  });

  it('crítico: usa outcomes.crit y suma 1 Fortuna con tope', () => {
    const conUna = estadoEn('t_inicio', { run: { fortune: 1 } });
    const n1 = commitRoll(campaign, conUna, forzar(beginRoll(campaign, conUna, 'saber'), 'crit'));
    expect(n1.run.fortune).toBe(2);
    expect(n1.run.items).toEqual(['llave']);
    expect(n1.run.flags).toEqual([]); // no se aplicó success
    const llena = estadoEn('t_inicio'); // fortuna 3 = fortuneMax(nivel 3)
    const n2 = commitRoll(campaign, llena, forzar(beginRoll(campaign, llena, 'saber'), 'crit'));
    expect(n2.run.fortune).toBe(3);
  });

  it('crítico sin outcomes.crit usa success y aun así suma Fortuna', () => {
    const state = estadoEn('t_inicio', { run: { fortune: 2 } });
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'fuerza'), 'crit'));
    expect(next.run.wounds).toBe(0);
    expect(next.run.fortune).toBe(3);
    expect(next.run.sceneId).toBe('t_sala');
    expect(next.run.log[3]).toEqual({ kind: 'outcome', paragraphs: [{ text: 'La puerta cede.' }] });
  });

  it('fallo grave con outcomes.fumble no agrega la condición por defecto', () => {
    const state = estadoEn('t_inicio');
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'saber'), 'fumble'));
    expect(next.run.wounds).toBe(1);
    expect(next.run.conditions).toEqual([]);
  });

  it('fallo grave sin outcomes.fumble usa failure y agrega FUMBLE_DEFAULT_CONDITION', () => {
    const state = estadoEn('t_inicio');
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'fuerza'), 'fumble'));
    expect(next.run.wounds).toBe(1);
    expect(next.run.conditions).toEqual([FUMBLE_DEFAULT_CONDITION]);
    expect(next.run.log[2]).toMatchObject({ kind: 'roll', band: 'fumble' });
  });

  it('descuenta de la Fortuna los dados repetidos y lo registra en el log', () => {
    const state = estadoEn('t_inicio');
    const p = rerollDie(campaign, state, rerollDie(campaign, state, beginRoll(campaign, state, 'mirar'), 0), 1);
    const next = commitRoll(campaign, state, forzar(p, 'partial'));
    expect(next.run.fortune).toBe(1);
    expect(next.run.log[2]).toMatchObject({ kind: 'roll', fortuneSpent: 2, dice: p.dice });
  });

  it('crítico con un dado repetido: primero suma con tope, después descuenta', () => {
    const state = estadoEn('t_inicio'); // fortuna 3
    const p = rerollDie(campaign, state, beginRoll(campaign, state, 'saber'), 0);
    const next = commitRoll(campaign, state, forzar(p, 'crit'));
    expect(next.run.fortune).toBe(2);
  });

  it('con Poder usado marca run.powerUsed y deja Agotado al mago', () => {
    const state = estadoEn('t_inicio');
    const p = usePower(campaign, state, forzar(beginRoll(campaign, state, 'mirar'), 'failure'));
    const next = commitRoll(campaign, state, p);
    expect(next.run.powerUsed).toBe(true);
    expect(next.run.conditions).toEqual(['agotado']);
    expect(next.run.log[2]).toMatchObject({ kind: 'roll', band: 'partial', powerUsed: true });
    expect(next.run.sceneId).toBe('t_sala');
  });

  it('el guerrero con Furia no queda Agotado', () => {
    const state = estadoEn('t_inicio', GUERRERO);
    const p = usePower(campaign, state, forzar(beginRoll(campaign, state, 'fuerza'), 'failure'));
    const next = commitRoll(campaign, state, p);
    expect(next.run.powerUsed).toBe(true);
    expect(next.run.conditions).toEqual([]);
    expect(next.run.wounds).toBe(1); // partial de 'fuerza'
  });

  it('si el desenlace deja Caído, no entra a next y run.outcome queda', () => {
    const state = estadoEn('t_inicio', { run: { wounds: 2 } });
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'fuerza'), 'failure'));
    expect(next.run.wounds).toBe(3);
    expect(next.run.outcome).toEqual({ kind: 'defeat' });
    expect(next.run.sceneId).toBe('t_inicio');
    expect(kinds(next.run.log)).toEqual(['scene', 'choice', 'roll', 'outcome']);
    expect(next.run.pending).toBeUndefined();
  });

  it('un golpe mortal sobre Malherido mata y no entra a next', () => {
    const state = estadoEn('t_cripta', { run: { wounds: 2 } });
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'cruzar'), 'failure'));
    expect(next.run.wounds).toBe(3);
    expect(next.run.outcome).toEqual({ kind: 'death' });
    expect(next.run.sceneId).toBe('t_cripta');
  });

  it('un golpe mortal sobre Sano deja Malherido y sigue', () => {
    const state = estadoEn('t_cripta');
    const next = commitRoll(campaign, state, forzar(beginRoll(campaign, state, 'cruzar'), 'failure'));
    expect(next.run.wounds).toBe(2);
    expect(next.run.outcome).toBeUndefined();
    expect(next.run.sceneId).toBe('t_sala');
  });

  it('limpia run.pending persistido', () => {
    const state = estadoEn('t_inicio', { run: { pending: { choiceId: 'mirar', rerolls: [], powerUsed: false } } });
    const next = commitRoll(campaign, state, beginRoll(campaign, state, 'mirar'));
    expect(next.run.pending).toBeUndefined();
    expect('pending' in next.run).toBe(false);
  });

  it('lanza si la tirada pendiente es de otra escena', () => {
    const p = beginRoll(campaign, estadoEn('t_inicio'), 'mirar');
    const otra = estadoEn('t_sala');
    expect(() => commitRoll(campaign, otra, p)).toThrow('La tirada pendiente es de otra escena: t_inicio');
  });
});
```

- [ ] **Paso 17: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/resolve.roll.test.ts
```

Resultado esperado: los 33 anteriores en verde; los 15 de `commitRoll` fallan con `TypeError: commitRoll is not a function` (o el archivo entero por export inexistente).

- [ ] **Paso 18: Implementación mínima (commitRoll)**

Agregá **al final** de `src/engine/resolve.ts`:

```ts
/** Desenlace según la banda: crit cae en success y fumble en failure si el autor no escribió el opcional. */
function outcomeForBand(roll: Roll, band: Band): Outcome {
  const o = roll.outcomes;
  if (band === 'crit') return o.crit ?? o.success;
  if (band === 'fumble') return o.fumble ?? o.failure;
  return o[band];
}

/** Copia del run sin la clave `pending`. */
function withoutPending(run: Run): Run {
  const copia: Run = { ...run };
  delete copia.pending;
  return copia;
}

/**
 * Segunda fase de una tirada. Orden fijo:
 * deriveMemory → log 'choice' → log 'roll' → outcome por banda → applyEffects(outcome.effects)
 * → crit: +1 Fortuna (tope fortuneMax) → fumble sin outcomes.fumble: addCondition FUMBLE_DEFAULT_CONDITION
 * → Fortuna -= dados repetidos → Poder usado: run.powerUsed y Agotado si es mago
 * → log 'outcome' si hay texto → limpiar run.pending → si la partida terminó, devolver; si no, enter(next).
 */
export function commitRoll(campaign: Campaign, state: GameState, pending: PendingRoll): GameState {
  if (pending.sceneId !== state.run.sceneId) {
    throw new Error(`La tirada pendiente es de otra escena: ${pending.sceneId}`);
  }
  const { choice, roll } = rollOfChoice(campaign, state, pending.choiceId);
  const hashes = hashesOfCurrentScene(campaign, state);
  let next = deriveMemory({ campaign, state }, state.run.sceneId, hashes);
  next = appendLogEntries(next, [
    { kind: 'choice', sceneId: pending.sceneId, choiceId: choice.id, label: choice.label },
    {
      kind: 'roll',
      dice: [...pending.dice],
      kept: [...pending.kept],
      mode: pending.preview.mode,
      total: pending.total,
      band: pending.band,
      fortuneSpent: pending.rerolls.length,
      powerUsed: pending.powerUsed,
    },
  ]);
  const outcome = outcomeForBand(roll, pending.band);
  next = applyEffects(outcome.effects, { campaign, state: next });
  if (pending.band === 'crit') {
    const max = fortuneMax(next.character.level);
    next = { ...next, run: { ...next.run, fortune: Math.min(max, next.run.fortune + 1) } };
  }
  if (pending.band === 'fumble' && roll.outcomes.fumble === undefined) {
    next = applyEffects([{ addCondition: FUMBLE_DEFAULT_CONDITION }], { campaign, state: next });
  }
  next = { ...next, run: { ...next.run, fortune: Math.max(0, next.run.fortune - pending.rerolls.length) } };
  if (pending.powerUsed) {
    next = { ...next, run: { ...next.run, powerUsed: true } };
    if (next.character.classId === 'mago') {
      next = applyEffects([{ addCondition: 'agotado' }], { campaign, state: next });
    }
  }
  if (outcome.text !== undefined) {
    const paragraphs = resolveText(outcome.text, { campaign, state: next });
    next = appendLogEntries(next, [{ kind: 'outcome', paragraphs }]);
  }
  next = { ...next, run: withoutPending(next.run) };
  if (next.run.outcome !== undefined) {
    return next;
  }
  return enter(campaign, next, outcome.next);
}
```

- [ ] **Paso 19: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/resolve.roll.test.ts
```

Resultado esperado: `Tests 48 passed (48)`.

- [ ] **Paso 20: Commit**

```bash
git add src/engine/resolve.ts tests/engine/resolve.roll.test.ts
git commit -m "feat(engine): commitRoll consolida la tirada, ajusta Fortuna y Poder y entra a la siguiente escena" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 5: `endRun` (final, derrota y muerte)

- [ ] **Paso 21: Escribir el test que falla (endRun)**

Crear `tests/engine/resolve.end.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import { endRun } from '@/engine/resolve';
import type { GameState, RunOutcome } from '@/engine/types';
import { makeCtx } from '../fixtures/state';
import { tirada as campaign } from '../fixtures/campaigns/tirada';

/**
 * Partida terminada con `outcome`, con canon previo de esta campaña y de otra ('otra'),
 * flags apostados en stagedFlags y un hito nuevo y otro repetido.
 */
function terminada(outcome: RunOutcome): GameState {
  return makeCtx(campaign, {
    character: {
      flags: ['char:tirada.viejo', 'char:otra.cosa', 'char:met.guardia'],
      campaignLog: { tirada: { runs: 1, wins: 0, endings: [], milestones: ['hito_z'] } },
    },
    world: { flags: ['world:tirada.viejo', 'world:otra.x'], fallen: [] },
    run: {
      sceneId: 't_cripta',
      stagedFlags: ['char:tirada.entro', 'world:tirada.alarma'],
      milestones: ['hito_prueba', 'hito_z'],
      outcome,
    },
  }).state;
}

const FINAL: RunOutcome = { kind: 'ending', endingId: 'fin_prueba' };

describe('endRun · final', () => {
  it('reemplaza el canon de la campaña por lo apostado y conserva el de otras campañas', () => {
    const state = terminada(FINAL);
    const antes = JSON.stringify(state);
    const { world, character, summary } = endRun(campaign, state);
    expect(JSON.stringify(state)).toBe(antes);
    expect(character.flags).toEqual(['char:otra.cosa', 'char:met.guardia', 'char:tirada.entro']);
    expect(world.flags).toEqual(['world:otra.x', 'world:tirada.alarma']);
    expect(character.campaignLog.tirada).toEqual({
      runs: 2,
      wins: 1,
      endings: ['fin_prueba'],
      milestones: ['hito_z', 'hito_prueba'],
      canonEnding: 'fin_prueba',
    });
    expect(character.run).toBeNull();
    expect(character.dead).toBeUndefined();
    expect(world.fallen).toEqual([]);
    expect(summary).toEqual({
      outcome: FINAL,
      canonFlags: ['char:tirada.entro', 'world:tirada.alarma'],
      discardedFlags: [],
    });
  });

  it('crea la entrada del registro si no existía y no repite finales ya vistos', () => {
    const state = makeCtx(campaign, { run: { outcome: FINAL } }).state;
    const primera = endRun(campaign, state);
    expect(primera.character.campaignLog.tirada).toEqual({
      runs: 1,
      wins: 1,
      endings: ['fin_prueba'],
      milestones: [],
      canonEnding: 'fin_prueba',
    });
    const segundaState: GameState = { ...state, character: primera.character, world: primera.world };
    const segunda = endRun(campaign, segundaState);
    expect(segunda.character.campaignLog.tirada?.endings).toEqual(['fin_prueba']);
    expect(segunda.character.campaignLog.tirada?.runs).toBe(2);
    expect(segunda.character.campaignLog.tirada?.wins).toBe(2);
  });

  it('un final sin flags apostados borra el canon anterior de la campaña', () => {
    const state = makeCtx(campaign, {
      character: { flags: ['char:tirada.viejo', 'char:met.guardia'] },
      world: { flags: ['world:tirada.viejo'], fallen: [] },
      run: { outcome: FINAL },
    }).state;
    const { world, character, summary } = endRun(campaign, state);
    expect(character.flags).toEqual(['char:met.guardia']);
    expect(world.flags).toEqual([]);
    expect(summary.canonFlags).toEqual([]);
  });
});

describe('endRun · derrota', () => {
  it('descarta lo apostado, suma la partida y conserva los hitos', () => {
    const state = terminada({ kind: 'defeat' });
    const { world, character, summary } = endRun(campaign, state);
    expect(character.flags).toEqual(['char:tirada.viejo', 'char:otra.cosa', 'char:met.guardia']);
    expect(world.flags).toEqual(['world:tirada.viejo', 'world:otra.x']);
    expect(character.campaignLog.tirada).toEqual({
      runs: 2,
      wins: 0,
      endings: [],
      milestones: ['hito_z', 'hito_prueba'],
    });
    expect(character.run).toBeNull();
    expect(character.dead).toBeUndefined();
    expect(world.fallen).toEqual([]);
    expect(summary).toEqual({
      outcome: { kind: 'defeat' },
      canonFlags: [],
      discardedFlags: ['char:tirada.entro', 'world:tirada.alarma'],
    });
  });

  it('conserva el canonEnding de una victoria anterior', () => {
    const state = makeCtx(campaign, {
      character: { campaignLog: { tirada: { runs: 1, wins: 1, endings: ['fin_prueba'], milestones: [], canonEnding: 'fin_prueba' } } },
      run: { outcome: { kind: 'defeat' } },
    }).state;
    const { character } = endRun(campaign, state);
    expect(character.campaignLog.tirada).toEqual({
      runs: 2,
      wins: 1,
      endings: ['fin_prueba'],
      milestones: [],
      canonEnding: 'fin_prueba',
    });
  });
});

describe('endRun · muerte', () => {
  it('descarta lo apostado, registra al caído, marca al personaje muerto y escribe world:caido', () => {
    const state = terminada({ kind: 'death' });
    const { world, character, summary } = endRun(campaign, state);
    expect(character.dead).toEqual({ campaign: 'tirada', scene: 't_cripta' });
    expect(character.run).toBeNull();
    expect(character.flags).toEqual(['char:tirada.viejo', 'char:otra.cosa', 'char:met.guardia']);
    expect(character.campaignLog.tirada).toEqual({
      runs: 2,
      wins: 0,
      endings: [],
      milestones: ['hito_z', 'hito_prueba'],
    });
    expect(world.fallen).toEqual([{ name: 'Prueba', classId: 'mago', level: 3, campaign: 'tirada', scene: 't_cripta' }]);
    expect(world.flags).toEqual(['world:tirada.viejo', 'world:otra.x', 'world:caido.tirada']);
    expect(summary).toEqual({
      outcome: { kind: 'death' },
      canonFlags: [],
      discardedFlags: ['char:tirada.entro', 'world:tirada.alarma'],
    });
  });

  it('no duplica world:caido si ya estaba y agrega al caído a la lista existente', () => {
    const state = makeCtx(campaign, {
      world: {
        flags: ['world:caido.tirada'],
        fallen: [{ name: 'Anterior', classId: 'guerrero', level: 1, campaign: 'tirada', scene: 't_cripta' }],
      },
      run: { sceneId: 't_sala', outcome: { kind: 'death' } },
    }).state;
    const { world, character } = endRun(campaign, state);
    expect(world.flags).toEqual(['world:caido.tirada']);
    expect(world.fallen).toHaveLength(2);
    expect(world.fallen[1]).toEqual({ name: 'Prueba', classId: 'mago', level: 3, campaign: 'tirada', scene: 't_sala' });
    expect(character.dead).toEqual({ campaign: 'tirada', scene: 't_sala' });
  });
});

describe('endRun · sin desenlace', () => {
  it('lanza si la partida no terminó', () => {
    expect(() => endRun(campaign, makeCtx(campaign).state)).toThrow('La partida no terminó todavía');
  });
});
```

- [ ] **Paso 22: Correr el test y verificar que falla**

```bash
npx vitest run tests/engine/resolve.end.test.ts
```

Resultado esperado: los 8 tests fallan con `TypeError: endRun is not a function` (o el archivo entero por export inexistente).

- [ ] **Paso 23: Implementación mínima (endRun)**

Agregá **al final** de `src/engine/resolve.ts`:

```ts
/** Unión ordenada sin duplicados: primero `base`, después los de `extra` que no estaban. */
function unionStrings(base: readonly string[], extra: readonly string[]): string[] {
  const out = [...base];
  for (const x of extra) {
    if (!out.includes(x)) out.push(x);
  }
  return out;
}

/**
 * Cierra la partida y devuelve el mundo y el personaje nuevos más un resumen.
 * - ending: los `char:<campaña>.*` del personaje y los `world:<campaña>.*` del mundo se REEMPLAZAN por los
 *   apostados en run.stagedFlags (canon); los de otras campañas y los espacios compartidos se conservan.
 *   campaignLog: runs+1, wins+1, endings ∪ id, milestones ∪ run.milestones, canonEnding = id.
 * - defeat: runs+1, milestones ∪ run.milestones; lo apostado se descarta.
 * - death: como defeat, más character.dead, world.fallen y world:caido.<campaña>.
 * En todos los casos character.run = null.
 */
export function endRun(
  campaign: Campaign,
  state: GameState,
): { world: WorldState; character: Character; summary: EndSummary } {
  const { run, character, world } = state;
  const outcome = run.outcome;
  if (outcome === undefined) {
    throw new Error('La partida no terminó todavía');
  }
  const id = campaign.id;
  const charPrefix = `char:${id}.`;
  const worldPrefix = `world:${id}.`;
  const prev: CampaignLogEntry = character.campaignLog[id] ?? { runs: 0, wins: 0, endings: [], milestones: [] };
  const milestones = unionStrings(prev.milestones, run.milestones);

  if (outcome.kind === 'ending') {
    const stagedChar = run.stagedFlags.filter((f) => f.startsWith(charPrefix));
    const stagedWorld = run.stagedFlags.filter((f) => f.startsWith(worldPrefix));
    const charFlags = [...character.flags.filter((f) => !f.startsWith(charPrefix)), ...stagedChar];
    const worldFlags = [...world.flags.filter((f) => !f.startsWith(worldPrefix)), ...stagedWorld];
    const entry: CampaignLogEntry = {
      runs: prev.runs + 1,
      wins: prev.wins + 1,
      endings: unionStrings(prev.endings, [outcome.endingId]),
      milestones,
      canonEnding: outcome.endingId,
    };
    return {
      world: { ...world, flags: worldFlags, fallen: [...world.fallen] },
      character: { ...character, flags: charFlags, campaignLog: { ...character.campaignLog, [id]: entry }, run: null },
      summary: { outcome, canonFlags: [...stagedChar, ...stagedWorld], discardedFlags: [] },
    };
  }

  const entry: CampaignLogEntry = { ...prev, runs: prev.runs + 1, milestones };
  const baseCharacter: Character = {
    ...character,
    flags: [...character.flags],
    campaignLog: { ...character.campaignLog, [id]: entry },
    run: null,
  };
  const summary: EndSummary = { outcome, canonFlags: [], discardedFlags: [...run.stagedFlags] };

  if (outcome.kind === 'defeat') {
    return {
      world: { ...world, flags: [...world.flags], fallen: [...world.fallen] },
      character: baseCharacter,
      summary,
    };
  }

  const fallen: Fallen = {
    name: character.name,
    classId: character.classId,
    level: character.level,
    campaign: id,
    scene: run.sceneId,
  };
  return {
    world: { ...world, flags: unionStrings(world.flags, [`world:caido.${id}`]), fallen: [...world.fallen, fallen] },
    character: { ...baseCharacter, dead: { campaign: id, scene: run.sceneId } },
    summary,
  };
}
```

- [ ] **Paso 24: Correr el test y verificar que pasa**

```bash
npx vitest run tests/engine/resolve.end.test.ts
```

Resultado esperado: `Test Files 1 passed (1)`, `Tests 8 passed (8)`.

- [ ] **Paso 25: Commit**

```bash
git add src/engine/resolve.ts tests/engine/resolve.end.test.ts
git commit -m "feat(engine): endRun aplica el canon por campaña y registra derrota y muerte" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Verificación de la tarea

- [ ] **Paso 26: Verificación de la tarea**

```bash
npx vitest run
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: todos los archivos de test en verde (los 56 de esta tarea, 48 en `resolve.roll.test.ts` y 8 en `resolve.end.test.ts`, más los de las tareas anteriores) y `tsc` sin errores (en particular, sin "is declared but its value is never read" en `src/engine/resolve.ts`: al terminar el ciclo 5 se usan todos los imports del paso 3; si queda alguno sin usar, borralo).

Si `tsc` marca `Duplicate function implementation` en `resolve.ts`, un helper de la tarea 9 tiene el mismo nombre que uno de esta tarea: renombrá el de esta tarea con sufijo `2` (p. ej. `appendLogEntries2`) y actualizá sus llamadas.

**Criterio de aceptación:** con la campaña de prueba `tirada`, elegir una opción sin tirada o consolidar una tirada deriva la memoria de la escena que se abandona antes de entrar a la siguiente (la siguiente ya ve `met`/`visited`), los dados son deterministas y reproducibles desde `run.pending` tras una recarga, Fortuna y Poder se aplican con las reglas de clase y de tope, un desenlace que deja Caído o muerto no avanza de escena, y `endRun` reemplaza el canon `char:<campaña>.*`/`world:<campaña>.*` solo con un final, descartándolo en derrota y registrando al caído en muerte.

---

### Tarea 11: Contenido: mundo, registro de campañas y campaña de humo "prueba"

Esta tarea escribe **datos**, no lógica: el contenido compartido del mundo (vacío en la Fase A salvo los espacios de flags), la campaña de humo `prueba` completa (10 escenas con texto real en español rioplatense) y el registro de campañas que la UI y el validador consultan. No toca el motor. Todo el contenido es TypeScript tipado: si un `next` apunta a una escena que no existe, lo detecta el test de esta tarea; si una escena no cumple la forma, lo detecta `satisfies Scene` en el editor y `parseCampaign` en el test.

Contexto de dominio mínimo para escribir el contenido (no hace falta saber más):

- Una **escena** tiene `text` (párrafos del narrador o de un PNJ con `speaker`) y `choices` (opciones). Un párrafo puede ser un `string` o una `Paragraph` con `variants`: el motor muestra la primera variante cuyo `when` se cumple; la última variante nunca lleva `when`.
- Una **opción** tiene exactamente uno de `roll` (tirada de dados con tres desenlaces obligatorios `success`, `partial`, `failure`) u `outcome` (sin tirada). Cada desenlace lleva `next` (id de la escena siguiente) y opcionalmente `text` y `effects`.
- `requires` bloquea u oculta una opción: con `lockedHint` se muestra bloqueada con esa pista; sin `lockedHint` se oculta.
- Prosa: segunda persona, presente, narrador en español rioplatense neutro y **voseo** en diálogos (los diálogos empiezan con raya larga `—`). Sin placeholders ni "TODO".
- Marco de memoria: las variantes con `met`, `knows`, `endingSeen` o flags `char:prueba.*` solo van en párrafos del narrador (sin `speaker`), nunca en boca del PNJ `centinela`.

**Archivos:**
- Crear: `src/content/world/npcs.ts`
- Crear: `src/content/world/places.ts`
- Crear: `src/content/world/items.ts`
- Crear: `src/content/world/flags.ts`
- Crear: `src/content/world/index.ts`
- Crear: `src/content/campaigns/prueba/meta.ts`
- Crear: `src/content/campaigns/prueba/npcs.ts`
- Crear: `src/content/campaigns/prueba/places.ts`
- Crear: `src/content/campaigns/prueba/items.ts`
- Crear: `src/content/campaigns/prueba/flags.ts`
- Crear: `src/content/campaigns/prueba/scenes/acto1.ts`
- Crear: `src/content/campaigns/prueba/scenes/acto2.ts`
- Crear: `src/content/campaigns/prueba/campaign.ts`
- Crear: `src/content/campaigns/index.ts`
- Test: `tests/content/registry.test.ts`
- Test: `tests/content/prueba.test.ts`

**Interfaces:**
- Consume (de la Tarea 3, `src/content/schema.ts`): los tipos `Scene`, `Choice`, `Outcome`, `Npc`, `Place`, `Item`, `Campaign`, `CampaignMeta`, `WorldContent` y la función `parseCampaign(data: unknown): Campaign` (es `CampaignSchema.parse`; lanza si el contenido no cumple la forma).
- Consume (de la Tarea 2, `src/content/catalog.ts`): solo indirectamente, a través de los tipos del esquema (`Tag`, `ConditionId`, `TraitId`, `ClassId`); no se importa nada del catálogo en los archivos de contenido.
- Produce (según el contrato, secciones H e I):
  - `src/content/world/npcs.ts`: `export const npcs: Record<string, Npc>` (vacío).
  - `src/content/world/places.ts`: `export const places: Record<string, Place>` (vacío).
  - `src/content/world/items.ts`: `export const items: Record<string, Item>` (vacío).
  - `src/content/world/flags.ts`: `export const flags: Record<string, string>` con las cinco claves `'char:met.*'`, `'char:place.*'`, `'char:origen.*'`, `'char:leyenda'`, `'world:caido.*'`.
  - `src/content/world/index.ts`: `export const WORLD: WorldContent`.
  - `src/content/campaigns/prueba/meta.ts`: `export const pruebaMeta: CampaignMeta`.
  - `src/content/campaigns/prueba/npcs.ts`: `export const npcs: Record<string, Npc>` (con `centinela`).
  - `src/content/campaigns/prueba/places.ts`: `export const places: Record<string, Place>` (con `torre_abandonada`, variantes `noche` y `cripta`).
  - `src/content/campaigns/prueba/items.ts`: `export const items: Record<string, Item>` (con `llave_de_hierro`).
  - `src/content/campaigns/prueba/flags.ts`: `export const flags: Record<string, string>` (con `run:tiene_pista`, `run:centinela_vencido`, `char:prueba.vio_la_cripta`).
  - `src/content/campaigns/prueba/scenes/acto1.ts`: `export const p_umbral`, `p_biblioteca`, `p_patio`, `p_patio_2`, `p_victoria`, `p_capilla` (cada una `satisfies Scene`).
  - `src/content/campaigns/prueba/scenes/acto2.ts`: `export const p_escalera`, `p_cripta`, `p_fin_tesoro`, `p_fin_huida` (cada una `satisfies Scene`).
  - `src/content/campaigns/prueba/campaign.ts`: `export const campaign: Campaign`.
  - `src/content/campaigns/index.ts`: `export interface CampaignEntry { meta: CampaignMeta; load: () => Promise<Campaign> }`, `export const CAMPAIGNS: Record<string, CampaignEntry>`, `export function listCampaigns(includeHidden: boolean): CampaignMeta[]`.
- Produce (decisiones nuevas de esta tarea, declaradas acá porque el contrato no las fija):
  - La sección I del contrato deja a `p_patio_2` (2 opciones sin `requires`), `p_capilla` (3) y `p_escalera` (3) por debajo del mínimo de **4 opciones sin `requires`** que exige la regla r03 de la Tarea 12 y el caso de test obligatorio de esta tarea. Se agregan opciones sin `requires` con estos ids exactos: en `p_patio_2`, `golpear` (vigor normal, `['fisico']`) y `provocar` (presencia normal, `['social']`); en `p_capilla`, `salir_al_patio` (outcome, next `p_patio`); en `p_escalera`, `volver_umbral` (outcome, next `p_umbral`). Todo lo demás de la sección I se respeta tal cual.
  - El id de la opción "engañar" de `p_patio` se escribe **`enganar`** (sin eñe), en línea con la regla de identificadores sin acentos y con el tag `engano` del catálogo.
  - En `p_cripta`, las opciones `cruzar` y `tantear` llevan `advantageIf: { flag: 'char:prueba.vio_la_cripta' }` (ventaja de situación para quien estudió las runas). Es un agregado compatible con el contrato: no cambia atributos, dificultades ni desenlaces.
  - Los archivos de contenido importan siempre con alias `@/` (también el `import()` dinámico del registro).

Sobre los tipos en los tests: las escenas se exportan con `satisfies Scene`, que valida la forma pero **conserva el tipo literal inferido** (no lo ensancha a `Scene`). Consecuencia: si ningún párrafo de una escena tiene `speaker`, o ninguna opción tiene `lockedHint`, esa propiedad no existe en el tipo inferido y acceder a ella da `TS2339` en `tsc` (Vitest no lo detecta porque esbuild no tipa). Por eso los tests **nunca acceden a `speaker`, `requires`, `lockedHint`, `roll`, `outcome` ni `ending` sobre la constante exportada**: primero la asignan a una vista tipada (`const umbral: Scene = p_umbral;`) y hacen las aserciones sobre esa vista. Los accesos a `id` y `kind` sí van directo (existen en todo literal).

Sobre las expectativas de fallo: como el proyecto usa Vite + Vitest, cuando un test importa un módulo que todavía no existe, `npx vitest run` termina con un error del estilo `Error: Failed to resolve import "@/content/..." from "tests/content/...". Does the file exist?` (o `Cannot find module`). Ese es el "fallo esperado" de los pasos de rojo que importan archivos nuevos.

---

#### Ciclo 1: contenido compartido del mundo (`src/content/world/*`)

- [ ] **Paso 1: Escribir el test que falla** → crear `tests/content/registry.test.ts` con este contenido completo:

```ts
import { describe, it, expect } from 'vitest';
import { WORLD } from '@/content/world/index';

describe('WORLD (contenido compartido, Fase A)', () => {
  it('no declara PNJ, lugares ni objetos todavía', () => {
    expect(Object.keys(WORLD.npcs)).toEqual([]);
    expect(Object.keys(WORLD.places)).toEqual([]);
    expect(Object.keys(WORLD.items)).toEqual([]);
  });

  it('declara exactamente los cinco espacios de flags compartidos, con descripción', () => {
    expect(Object.keys(WORLD.flags).sort()).toEqual([
      'char:leyenda',
      'char:met.*',
      'char:origen.*',
      'char:place.*',
      'world:caido.*',
    ]);
    for (const descripcion of Object.values(WORLD.flags)) {
      expect(descripcion.trim().length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla** → comando:

```
npx vitest run tests/content/registry.test.ts
```

Resultado esperado: el archivo de test falla al cargar con `Failed to resolve import "@/content/world/index"` (el módulo todavía no existe). Ningún test pasa.

- [ ] **Paso 3: Implementación mínima** → crear los cinco archivos de `src/content/world/`.

`src/content/world/npcs.ts`:

```ts
import type { Npc } from '@/content/schema';

/** PNJ compartidos entre campañas. Vacío en la Fase A; Orell, Ilse y Halvar llegan con la campaña del Vado. */
export const npcs: Record<string, Npc> = {};
```

`src/content/world/places.ts`:

```ts
import type { Place } from '@/content/schema';

/** Lugares compartidos entre campañas. Vacío en la Fase A. */
export const places: Record<string, Place> = {};
```

`src/content/world/items.ts`:

```ts
import type { Item } from '@/content/schema';

/** Objetos compartidos entre campañas. Solo acá puede haber objetos con `relic: true`. Vacío en la Fase A. */
export const items: Record<string, Item> = {};
```

`src/content/world/flags.ts`:

```ts
/**
 * Espacios de flags compartidos entre campañas. Ninguna campaña los declara en su `flags`:
 * el motor los deriva (met, place, caido) o los escribe la progresión (origen, leyenda).
 * El validador acepta por prefijo cualquier flag que empiece con una de estas claves (sin el asterisco).
 */
export const flags: Record<string, string> = {
  'char:met.*': 'PNJ que el personaje ya conoció: char:met.<idDePnj>. Lo deriva el motor al salir de una escena con ese PNJ.',
  'char:place.*': 'Lugares que el personaje ya visitó: char:place.<idDeLugar>. Lo deriva el motor al salir de una escena en ese lugar.',
  'char:origen.*': 'Rasgos de origen del personaje: char:origen.<idDeRasgo>. Lo escribe la creación de personaje.',
  'char:leyenda': 'El personaje alcanzó el nivel 10.',
  'world:caido.*': 'Un personaje del perfil murió en esa campaña: world:caido.<idDeCampana>. Lo escribe el motor al morir.',
};
```

`src/content/world/index.ts`:

```ts
import type { WorldContent } from '@/content/schema';
import { npcs } from '@/content/world/npcs';
import { places } from '@/content/world/places';
import { items } from '@/content/world/items';
import { flags } from '@/content/world/flags';

/** Contenido compartido por todas las campañas. El motor resuelve PNJ, lugares y objetos contra WORLD ∪ campaña. */
export const WORLD: WorldContent = { npcs, places, items, flags };
```

- [ ] **Paso 4: Correr el test y verificar que pasa** → comando:

```
npx vitest run tests/content/registry.test.ts
```

Resultado esperado: `Test Files 1 passed`, `Tests 2 passed`.

- [ ] **Paso 5: Commit** →

```bash
git add src/content/world/npcs.ts src/content/world/places.ts src/content/world/items.ts src/content/world/flags.ts src/content/world/index.ts tests/content/registry.test.ts
git commit -m "feat(content): contenido compartido del mundo con los espacios de flags

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 2: meta y declaraciones de la campaña `prueba`

- [ ] **Paso 6: Escribir el test que falla** → crear `tests/content/prueba.test.ts` con este contenido completo (crece en los ciclos 3 y 4):

```ts
import { describe, it, expect } from 'vitest';
import { pruebaMeta } from '@/content/campaigns/prueba/meta';
import { npcs } from '@/content/campaigns/prueba/npcs';
import { places } from '@/content/campaigns/prueba/places';
import { items } from '@/content/campaigns/prueba/items';
import { flags } from '@/content/campaigns/prueba/flags';

describe('prueba: meta', () => {
  it('es la campaña de humo oculta, perfil smoke, rango 3-5, una escena mortal', () => {
    expect(pruebaMeta.id).toBe('prueba');
    expect(pruebaMeta.contentVersion).toBe(1);
    expect(pruebaMeta.hidden).toBe(true);
    expect(pruebaMeta.lintProfile).toBe('smoke');
    expect(pruebaMeta.levelRange).toEqual([3, 5]);
    expect(pruebaMeta.durationMin).toEqual([5, 10]);
    expect(pruebaMeta.lethalScenes).toBe(1);
    expect(pruebaMeta.title.length).toBeGreaterThan(0);
    expect(pruebaMeta.premise.length).toBeGreaterThan(0);
  });
});

describe('prueba: declaraciones', () => {
  it('declara al centinela con id coincidente', () => {
    expect(Object.keys(npcs)).toEqual(['centinela']);
    expect(npcs['centinela']?.id).toBe('centinela');
    expect(npcs['centinela']?.name.length).toBeGreaterThan(0);
  });

  it('declara la torre abandonada con variantes noche y cripta', () => {
    expect(Object.keys(places)).toEqual(['torre_abandonada']);
    expect(places['torre_abandonada']?.id).toBe('torre_abandonada');
    expect(Object.keys(places['torre_abandonada']?.variants ?? {}).sort()).toEqual(['cripta', 'noche']);
  });

  it('declara la llave de hierro con ventaja en sigilo y sin relic', () => {
    expect(Object.keys(items)).toEqual(['llave_de_hierro']);
    expect(items['llave_de_hierro']?.id).toBe('llave_de_hierro');
    expect(items['llave_de_hierro']?.advantageTags).toEqual(['sigilo']);
    expect(items['llave_de_hierro']?.relic).toBeUndefined();
  });

  it('declara los tres flags de la campaña con prefijos correctos', () => {
    expect(Object.keys(flags).sort()).toEqual(['char:prueba.vio_la_cripta', 'run:centinela_vencido', 'run:tiene_pista']);
    for (const descripcion of Object.values(flags)) {
      expect(descripcion.trim().length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Paso 7: Correr el test y verificar que falla** → comando:

```
npx vitest run tests/content/prueba.test.ts
```

Resultado esperado: fallo de carga con `Failed to resolve import "@/content/campaigns/prueba/meta"`.

- [ ] **Paso 8: Implementación mínima** → crear los cinco archivos de declaraciones.

`src/content/campaigns/prueba/meta.ts`:

```ts
import type { CampaignMeta } from '@/content/schema';

/** Meta estática de la campaña de humo. El registro la importa sin cargar las escenas. */
export const pruebaMeta: CampaignMeta = {
  id: 'prueba',
  contentVersion: 1,
  title: 'La torre de prueba',
  premise:
    'Una torre abandonada al borde de la aldea, un centinela al que le pagan por no dejar subir a nadie y un tesoro del que todos hablan y nadie vio. Campaña de humo para probar el motor de punta a punta.',
  cover: 'prueba_portada',
  levelRange: [3, 5],
  durationMin: [5, 10],
  lethalScenes: 1,
  lintProfile: 'smoke',
  hidden: true,
};
```

`src/content/campaigns/prueba/npcs.ts`:

```ts
import type { Npc } from '@/content/schema';

export const npcs: Record<string, Npc> = {
  centinela: {
    id: 'centinela',
    name: 'El centinela',
    portrait: 'centinela',
    voice: 'Seco y cansado. Frases cortas, vosea, no levanta la voz ni cuando amenaza. Repite "me pagan por eso".',
    canonPrompt:
      'Hombre de unos cuarenta años, barba rala y canosa, cota de malla que le queda grande, lanza corta, ojeras marcadas, iluminado por un candil desde abajo, fondo de piedra oscura.',
  },
};
```

`src/content/campaigns/prueba/places.ts`:

```ts
import type { Place } from '@/content/schema';

export const places: Record<string, Place> = {
  torre_abandonada: {
    id: 'torre_abandonada',
    name: 'Torre abandonada',
    background: 'torre_abandonada',
    variants: {
      noche: 'torre_abandonada.noche',
      cripta: 'torre_abandonada.cripta',
    },
    canonPrompt:
      'Torre de piedra gris medio derrumbada en un claro, puerta de hierro entornada, ventanas rotas, noche nublada con luna baja, hierba alta y un patio interior con un aljibe seco.',
  },
};
```

`src/content/campaigns/prueba/items.ts`:

```ts
import type { Item } from '@/content/schema';

export const items: Record<string, Item> = {
  llave_de_hierro: {
    id: 'llave_de_hierro',
    name: 'Llave de hierro',
    icon: 'llave_de_hierro',
    description: 'Una llave pesada, con el mismo sello que la inscripción del dintel. Abre la puerta de la escalera y traba lo que haga falta.',
    advantageTags: ['sigilo'],
  },
};
```

`src/content/campaigns/prueba/flags.ts`:

```ts
/** Flags propios de la campaña de humo. Los `run:` mueren con la partida; el `char:prueba.*` se apuesta y se vuelve canon al terminar por un final. */
export const flags: Record<string, string> = {
  'run:tiene_pista': 'Leíste la inscripción del dintel: sabés que la llave de hierro abre la puerta de la escalera.',
  'run:centinela_vencido': 'El centinela ya no bloquea la escalera (lo convenciste, lo venciste o lo trabaste afuera).',
  'char:prueba.vio_la_cripta': 'Estudiaste las runas del escalón y conocés el plano del puente de la cripta.',
};
```

- [ ] **Paso 9: Correr el test y verificar que pasa** → comando:

```
npx vitest run tests/content/prueba.test.ts
```

Resultado esperado: `Tests 5 passed`.

- [ ] **Paso 10: Commit** →

```bash
git add src/content/campaigns/prueba/meta.ts src/content/campaigns/prueba/npcs.ts src/content/campaigns/prueba/places.ts src/content/campaigns/prueba/items.ts src/content/campaigns/prueba/flags.ts tests/content/prueba.test.ts
git commit -m "feat(content): meta y declaraciones de la campaña de humo prueba

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: escenas del acto 1 (umbral, biblioteca, patio en dos rondas, victoria y capilla)

- [ ] **Paso 11: Escribir el test que falla** → editar `tests/content/prueba.test.ts`. Primero, agregar estas dos líneas de import debajo del import de `flags` (línea 6):

```ts
import type { Paragraph, Scene } from '@/content/schema';
import { p_umbral, p_biblioteca, p_patio, p_patio_2, p_victoria, p_capilla } from '@/content/campaigns/prueba/scenes/acto1';
```

Luego, al final del archivo, agregar este bloque completo. Las escenas se leen a través de vistas tipadas `Scene` (`umbral`, `biblioteca`, `patio2`, `capilla`): sobre la constante exportada con `satisfies Scene` el tipo es el literal inferido y, por ejemplo, `p_umbral.text` no tiene `speaker` en ninguno de sus párrafos, así que `p.speaker` daría `TS2339` en `tsc` aunque Vitest pase.

```ts
/** Cantidad de opciones sin `requires` (las que todo personaje ve y puede elegir). */
function sinRequires(scene: Scene): number {
  return scene.choices.filter((c) => c.requires === undefined).length;
}

/** Párrafos estructurados (con variantes) de un texto; descarta los strings del narrador. */
function parrafosDe(scene: Scene): Paragraph[] {
  return scene.text.filter((p): p is Paragraph => typeof p !== 'string');
}

describe('prueba: escenas del acto 1', () => {
  // Vistas tipadas: `satisfies Scene` conserva el tipo literal; asignar a Scene expone todas las propiedades opcionales.
  const umbral: Scene = p_umbral;
  const biblioteca: Scene = p_biblioteca;
  const patio2: Scene = p_patio_2;
  const capilla: Scene = p_capilla;
  const acto1: Scene[] = [p_umbral, p_biblioteca, p_patio, p_patio_2, p_victoria, p_capilla];

  it('tiene los seis ids esperados y cada id coincide con su constante', () => {
    expect(acto1.map((s) => s.id)).toEqual(['p_umbral', 'p_biblioteca', 'p_patio', 'p_patio_2', 'p_victoria', 'p_capilla']);
  });

  it('declara los kinds del contrato', () => {
    expect(p_umbral.kind).toBe('hub');
    expect(p_biblioteca.kind).toBe('normal');
    expect(p_patio.kind).toBe('encounter');
    expect(p_patio_2.kind).toBe('encounter');
    expect(p_victoria.kind).toBe('normal');
    expect(p_capilla.kind).toBe('rest');
  });

  it('toda escena del acto 1 tiene entre 4 y 9 opciones y al menos 4 sin requires', () => {
    for (const scene of acto1) {
      expect(scene.choices.length, scene.id).toBeGreaterThanOrEqual(4);
      expect(scene.choices.length, scene.id).toBeLessThanOrEqual(9);
      expect(sinRequires(scene), scene.id).toBeGreaterThanOrEqual(4);
    }
  });

  it('el umbral es el hub: hito al entrar, redirect al vencer al centinela y variantes de memoria en el narrador', () => {
    expect(umbral.onEnter).toEqual([{ milestone: 'entrar_a_la_torre' }]);
    expect(umbral.redirect).toEqual([{ when: { flag: 'run:centinela_vencido' }, to: 'p_escalera' }]);
    const parrafos = parrafosDe(umbral);
    const conVisited = parrafos.some((p) => p.speaker === undefined && p.variants.some((v) => JSON.stringify(v.when) === JSON.stringify({ visited: 'p_umbral', min: 1 })));
    const conKnows = parrafos.some((p) => p.speaker === undefined && p.variants.some((v) => JSON.stringify(v.when) === JSON.stringify({ knows: 'torre_abandonada' })));
    expect(conVisited).toBe(true);
    expect(conKnows).toBe(true);
  });

  it('la biblioteca hace hablar al centinela y lo lista en npcs', () => {
    expect(biblioteca.npcs).toContain('centinela');
    const habla = parrafosDe(biblioteca).some((p) => p.speaker === 'centinela');
    expect(habla).toBe(true);
  });

  it('el patio (ronda 2) redirige a la victoria con el reloj lleno y bloquea el remate con pista', () => {
    expect(patio2.redirect).toEqual([{ when: { clock: 'pelea', gte: 2 }, to: 'p_victoria' }]);
    const rematar = patio2.choices.find((c) => c.id === 'rematar');
    expect(rematar?.requires).toEqual({ clock: 'pelea', gte: 1 });
    expect(rematar?.lockedHint).toBe('Todavía no lo tenés contra las cuerdas');
    const llave = patio2.choices.find((c) => c.id === 'llave');
    expect(llave?.requires).toEqual({ item: 'llave_de_hierro' });
    expect(llave?.lockedHint).toBe('Necesitás algo con qué trabar la puerta');
  });

  it('la capilla cura al entrar y bloquea la subida con pista', () => {
    expect(capilla.onEnter).toEqual([{ heal: 1 }, { removeCondition: 'all' }]);
    const subir = capilla.choices.find((c) => c.id === 'subir');
    expect(subir?.requires).toEqual({ flag: 'run:centinela_vencido' });
    expect(subir?.lockedHint).toBe('El centinela sigue en el patio');
  });
});
```

- [ ] **Paso 12: Correr el test y verificar que falla** → comando:

```
npx vitest run tests/content/prueba.test.ts
```

Resultado esperado: fallo de carga con `Failed to resolve import "@/content/campaigns/prueba/scenes/acto1"`.

- [ ] **Paso 13: Implementación mínima** → crear `src/content/campaigns/prueba/scenes/acto1.ts` con este contenido completo:

```ts
import type { Scene } from '@/content/schema';

/**
 * Acto 1 de la campaña de humo: entrada a la torre, el centinela, el patio (dos rondas), la victoria y la capilla.
 * Convenciones de prosa: segunda persona, presente, voseo en diálogos; variantes de memoria solo en el narrador.
 */

export const p_umbral = {
  id: 'p_umbral',
  kind: 'hub',
  place: 'torre_abandonada',
  variant: 'noche',
  onEnter: [{ milestone: 'entrar_a_la_torre' }],
  redirect: [{ when: { flag: 'run:centinela_vencido' }, to: 'p_escalera' }],
  text: [
    {
      variants: [
        {
          when: { visited: 'p_umbral', min: 1 },
          text: 'Otra vez el umbral. La puerta de hierro sigue entornada y el viento que baja por la escalera trae el mismo olor a cera vieja y a piedra mojada. La torre no te va a recibir mejor por volver.',
        },
        {
          text: 'La torre abandonada se levanta contra la noche como un diente roto. La puerta de hierro está entornada y, del otro lado, un vestíbulo de losas hundidas reparte tres caminos: una escalera que sube hacia lo oscuro detrás de una puerta cerrada, un pasillo a la izquierda con olor a cera y un arco bajo a la derecha.',
        },
      ],
    },
    {
      variants: [
        {
          when: { knows: 'torre_abandonada' },
          text: 'Conocés este lugar de otra crónica. Recordás la inscripción sobre el dintel, la biblioteca vacía al final del pasillo y que el patio, detrás del arco, nunca está tan solo como parece.',
        },
        {
          text: 'Sobre el dintel hay una inscripción tallada que la lluvia casi borró. El pasillo de la izquierda lleva a lo que fue una biblioteca y, más allá, a una capilla; el arco de la derecha da a un patio en sombras.',
        },
      ],
    },
    'Nadie te espera y nadie te mandó. El tesoro del que hablan en la aldea está arriba, al final de la escalera, o no está en ningún lado.',
  ],
  choices: [
    {
      id: 'leer_inscripcion',
      label: 'Leer la inscripción del dintel',
      roll: {
        attr: 'saber',
        difficulty: 'normal',
        tags: ['saber'],
        outcomes: {
          success: {
            text: [
              'Las letras se dejan leer cuando dejás de mirarlas de frente: «La llave duerme bajo la piedra que llora». A la derecha del dintel una piedra suelta suda humedad; detrás, envuelta en un trapo, hay una llave de hierro. Con ella en la mano seguís por el pasillo hacia la biblioteca.',
            ],
            effects: [{ give: 'llave_de_hierro' }, { set: 'run:tiene_pista' }],
            next: 'p_biblioteca',
          },
          partial: {
            text: [
              'Entendés la mitad: algo sobre una llave y algo sobre alguien que «no duerme». Lo segundo te queda dando vueltas mientras avanzás por el pasillo, y cada crujido te suena a un paso.',
            ],
            effects: [{ addCondition: 'asustado' }],
            next: 'p_biblioteca',
          },
          failure: {
            text: [
              'Las letras son ruido. Perdés un rato largo frotando musgo y no sacás nada en limpio, salvo que hace frío. Seguís por el pasillo hacia la biblioteca.',
            ],
            effects: [{ clock: 'pelea', delta: 0 }],
            next: 'p_biblioteca',
          },
        },
      },
    },
    {
      id: 'forzar_puerta',
      label: 'Forzar a hombros la puerta interior',
      roll: {
        attr: 'vigor',
        difficulty: 'dificil',
        tags: ['fisico'],
        outcomes: {
          success: {
            text: [
              'La madera cede al segundo empujón con un estruendo que retumba por toda la torre. Entrás de golpe en la biblioteca, con el hombro dolorido pero entero.',
            ],
            next: 'p_biblioteca',
          },
          partial: {
            text: [
              'La puerta cede, pero una bisagra suelta te abre la frente al caer. Entrás en la biblioteca limpiándote la sangre de los ojos.',
            ],
            effects: [{ wound: 1 }],
            next: 'p_biblioteca',
          },
          failure: {
            text: [
              'La puerta no se mueve; vos sí. Rebotás contra el marco, te doblás una muñeca y, cuando levantás la vista, hay alguien parado en el arco del patio, mirándote.',
            ],
            effects: [{ wound: 1 }],
            next: 'p_patio',
          },
        },
      },
    },
    {
      id: 'rodear_patio',
      label: 'Rodear por el patio',
      outcome: {
        text: ['Elegís el arco bajo y salís al aire frío del patio.'],
        next: 'p_patio',
      },
    },
    {
      id: 'descansar_capilla',
      label: 'Refugiarte en la capilla',
      outcome: {
        text: ['Seguís el olor a cera por el pasillo, pasás de largo la biblioteca y empujás la puerta de la capilla.'],
        next: 'p_capilla',
      },
    },
  ],
} satisfies Scene;

export const p_biblioteca = {
  id: 'p_biblioteca',
  kind: 'normal',
  place: 'torre_abandonada',
  variant: 'noche',
  npcs: ['centinela'],
  text: [
    'La biblioteca es un cascarón: estantes vacíos, un atril volcado y un candil que alguien encendió hace poco. Demasiado poco.',
    {
      variants: [
        {
          when: { flag: 'run:tiene_pista' },
          text: 'Sabés, por la inscripción, que la llave que llevás abre la puerta de la escalera. Lo que no sabías es que la escalera tiene dueño: del fondo sale un hombre con una lanza corta y una cota que le queda grande.',
        },
        {
          text: 'Del fondo sale un hombre con una lanza corta y una cota que le queda grande. No parece un ladrón; parece alguien a quien le pagan por quedarse.',
        },
      ],
    },
    {
      speaker: 'centinela',
      variants: [
        {
          when: { class: 'mago' },
          text: '—Otro de túnica. Los de túnica siempre quieren subir. Nadie sube, y menos de noche. Date la vuelta.',
        },
        {
          text: '—Nadie sube. Me pagan por eso y no me pagan poco. Date la vuelta o vas a tener que pasar por encima mío.',
        },
      ],
    },
  ],
  choices: [
    {
      id: 'hablar',
      label: 'Convencer al centinela de que te deje subir',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        outcomes: {
          success: {
            text: [
              '—Está bien —dice, después de un silencio largo—. Pero yo no te vi. —Se hace a un lado y te señala la puerta de la escalera con el mentón.',
            ],
            effects: [{ set: 'run:centinela_vencido' }],
            next: 'p_escalera',
          },
          partial: {
            text: ['Duda. Baja la lanza, la vuelve a levantar. —Afuera. Hablamos afuera. —Y te empuja por el pasillo hasta el patio.'],
            next: 'p_patio',
          },
          failure: {
            text: [
              '—Ya te dije. —No espera a que termines: te corre por el pasillo hasta el patio, y con él no viene solo la lanza, viene el silbato.',
            ],
            effects: [{ addCondition: 'perseguido' }],
            next: 'p_patio',
          },
        },
      },
    },
    {
      id: 'esconderse',
      label: 'Esconderte entre los estantes y esperar a que se vaya',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['sigilo'],
        outcomes: {
          success: {
            text: [
              'Te hacés uno con la sombra del estante caído. El centinela pasa a dos palmos, revisa el atril, putea por lo bajo y vuelve a su rincón. Cuando se duerme apoyado en la lanza, te escurrís hasta la escalera.',
            ],
            next: 'p_escalera',
          },
          partial: {
            text: [
              'Te asomás por la ventana rota y bajás por el canalón, que se desprende cuando vas por la mitad. Caés en la cisterna. Llegás a la escalera chorreando agua y con los dientes apretados.',
            ],
            effects: [{ addCondition: 'empapado' }],
            next: 'p_escalera',
          },
          failure: {
            text: ['Un libro cae del estante y el ruido te delata. —Ahí estás. —Salís corriendo por donde podés: al patio.'],
            next: 'p_patio',
          },
        },
      },
    },
    {
      id: 'volver',
      label: 'Volver al umbral',
      outcome: {
        text: ['Retrocedés por el pasillo sin darle la espalda del todo, hasta el umbral.'],
        next: 'p_umbral',
      },
    },
    {
      id: 'capilla',
      label: 'Retirarte a la capilla',
      outcome: {
        text: ['Te retirás despacio, con las manos a la vista, y empujás la puerta de la capilla.'],
        next: 'p_capilla',
      },
    },
  ],
} satisfies Scene;

export const p_patio = {
  id: 'p_patio',
  kind: 'encounter',
  place: 'torre_abandonada',
  variant: 'noche',
  npcs: ['centinela'],
  text: [
    'El patio es un cuadrado de losas rotas con un aljibe seco en el medio. El centinela te sigue hasta acá, o ya estaba: la lanza baja, la cota suena.',
    {
      speaker: 'centinela',
      variants: [{ text: '—Te lo dije por las buenas. Ahora es a mi manera.' }],
    },
    'No hay más que una salida: el arco por donde entraste. Él lo sabe tanto como vos.',
  ],
  choices: [
    {
      id: 'golpear',
      label: 'Golpear primero',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        outcomes: {
          success: {
            text: ['Le entrás por debajo de la lanza y le cruzás la cara con el puño cerrado. Cae contra el aljibe y escupe un diente.'],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'p_patio_2',
          },
          partial: {
            text: ['Le das, y él también: la lanza te abre el brazo mientras tu golpe le parte la ceja.'],
            effects: [{ clock: 'pelea', delta: 1 }, { wound: 1 }],
            next: 'p_patio_2',
          },
          failure: {
            text: ['Amagás, él no. La punta de la lanza te encuentra el muslo antes de que llegues a tocarlo.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
    {
      id: 'enganar',
      label: 'Fingir que te rendís y atacar a traición',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['engano'],
        outcomes: {
          success: {
            text: ['Levantás las manos. Se acerca a atarte y, cuando está a un paso, le metés la rodilla en el estómago. Se dobla sin aire.'],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'p_patio_2',
          },
          partial: {
            text: ['Baja la guardia lo justo: le pegás, pero el brillo de sus ojos cuando se recupera te hiela la sangre.'],
            effects: [{ clock: 'pelea', delta: 1 }, { addCondition: 'asustado' }],
            next: 'p_patio_2',
          },
          failure: {
            text: ['—Ese truco lo hacen todos. —No baja la guardia, y la lanza te encuentra el costado.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
    {
      id: 'rendirse',
      label: 'Rendirte y dejar las manos a la vista',
      outcome: {
        text: [
          'Bajás las manos y las dejás donde las vea. Él no se relaja. —A la capilla. Y no salgas hasta que amanezca. —Entrás con las piernas temblando.',
        ],
        effects: [{ addCondition: 'asustado' }],
        next: 'p_capilla',
      },
    },
    {
      id: 'huir',
      label: 'Escapar por el arco',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['huida'],
        outcomes: {
          success: {
            text: ['Fintás hacia el aljibe, girás y pasás el arco antes de que reaccione. Ya no te sigue: te metés en la capilla.'],
            next: 'p_capilla',
          },
          partial: {
            text: ['Cruzás el arco con la lanza rozándote la espalda: te llevás un tajo de recuerdo hasta la capilla.'],
            effects: [{ wound: 1 }],
            next: 'p_capilla',
          },
          failure: {
            text: ['El arco está más lejos de lo que parecía. Te alcanza y te tira al suelo de un golpe en la nuca.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
  ],
} satisfies Scene;

export const p_patio_2 = {
  id: 'p_patio_2',
  kind: 'encounter',
  place: 'torre_abandonada',
  variant: 'noche',
  npcs: ['centinela'],
  redirect: [{ when: { clock: 'pelea', gte: 2 }, to: 'p_victoria' }],
  text: [
    {
      variants: [
        {
          when: { clock: 'pelea', gte: 1 },
          text: 'El centinela sangra por la ceja y respira con la boca abierta. Retrocede un paso hacia el aljibe: lo tenés cerca de las cuerdas.',
        },
        {
          text: 'El centinela ni se despeinó. Gira la lanza con la calma de quien hizo esto muchas veces y avanza para cerrarte el arco.',
        },
      ],
    },
    {
      variants: [
        { when: { wounds: { gte: 1 } }, text: 'Vos también sangrás. Cada movimiento cuesta un poco más que el anterior.' },
        { text: 'Todavía estás entero. No va a durar si esto sigue.' },
      ],
    },
    {
      speaker: 'centinela',
      variants: [{ text: '—Podés irte. Todavía podés irte.' }],
    },
  ],
  choices: [
    {
      id: 'rematar',
      label: 'Rematarlo contra el aljibe',
      requires: { clock: 'pelea', gte: 1 },
      lockedHint: 'Todavía no lo tenés contra las cuerdas',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        outcomes: {
          success: {
            text: ['Lo agarrás de la cota y lo estrellás contra el brocal. Se queda quieto.'],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'p_patio_2',
          },
          partial: {
            text: ['Lo tirás al suelo, pero te lleva con él y su codo te encuentra las costillas.'],
            effects: [{ clock: 'pelea', delta: 1 }, { wound: 1 }],
            next: 'p_patio_2',
          },
          failure: {
            text: ['Te tirás encima y esquiva: caés contra el brocal y él remata desde arriba.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
    {
      id: 'llave',
      label: 'Cruzar la puerta de la escalera y trabarla con la llave',
      requires: { item: 'llave_de_hierro' },
      lockedHint: 'Necesitás algo con qué trabar la puerta',
      outcome: {
        text: [
          'Retrocedés hasta la puerta de la escalera, entrás y girás la llave de hierro por dentro. Del otro lado el centinela golpea, putea y golpea. La puerta aguanta.',
        ],
        effects: [{ set: 'run:centinela_vencido' }],
        next: 'p_escalera',
      },
    },
    {
      id: 'golpear',
      label: 'Golpear otra vez',
      roll: {
        attr: 'vigor',
        difficulty: 'normal',
        tags: ['fisico'],
        outcomes: {
          success: {
            text: ['Esta vez no amagás: el puño le entra por debajo de la mandíbula y se le doblan las rodillas.'],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'p_patio_2',
          },
          partial: {
            text: ['Cambian golpe por golpe: él escupe sangre, vos también.'],
            effects: [{ clock: 'pelea', delta: 1 }, { wound: 1 }],
            next: 'p_patio_2',
          },
          failure: {
            text: ['Te lee el golpe antes de que salga y te castiga con el asta en las costillas.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
    {
      id: 'provocar',
      label: 'Provocarlo para que se descuide',
      roll: {
        attr: 'presencia',
        difficulty: 'normal',
        tags: ['social'],
        outcomes: {
          success: {
            text: ['—¿Eso es todo lo que te pagan? —Se le va la calma: viene de frente, sin cubrirse, y le entrás por el costado.'],
            effects: [{ clock: 'pelea', delta: 1 }],
            next: 'p_patio_2',
          },
          partial: {
            text: ['Se enfurece, y la furia lo hace rápido: te alcanza antes de que aproveches la abertura, pero deja la guardia abierta y la pagás con creces.'],
            effects: [{ clock: 'pelea', delta: 1 }, { addCondition: 'asustado' }],
            next: 'p_patio_2',
          },
          failure: {
            text: ['Se ríe. —Hablás mucho. —Y te pega.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
    {
      id: 'rendirse',
      label: 'Rendirte y dejar las manos a la vista',
      outcome: {
        text: ['Levantás las manos. Él baja la lanza un dedo, no más. —A la capilla. Ya. —Obedecés.'],
        effects: [{ addCondition: 'asustado' }],
        next: 'p_capilla',
      },
    },
    {
      id: 'huir',
      label: 'Escapar por el arco',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['huida'],
        outcomes: {
          success: {
            text: ['Le tirás una losa suelta a los pies y pasás el arco mientras la esquiva. No te sigue: te metés en la capilla.'],
            next: 'p_capilla',
          },
          partial: {
            text: ['Llegás al arco con la punta de la lanza clavada en el hombro. La capilla te recibe con la sangre goteando.'],
            effects: [{ wound: 1 }],
            next: 'p_capilla',
          },
          failure: {
            text: ['Te corta el paso antes de que llegues al arco y te devuelve al patio de un lanzazo.'],
            effects: [{ wound: 1 }],
            next: 'p_patio_2',
          },
        },
      },
    },
  ],
} satisfies Scene;

export const p_victoria = {
  id: 'p_victoria',
  kind: 'normal',
  place: 'torre_abandonada',
  variant: 'noche',
  npcs: ['centinela'],
  onEnter: [{ set: 'run:centinela_vencido' }],
  text: [
    'El centinela queda tirado contra el aljibe, respirando con un silbido. No lo mataste. Le sacás la lanza de la mano y la tirás dentro del aljibe seco: cae sin ruido.',
    {
      speaker: 'centinela',
      variants: [{ text: '—Andá. Andá y que te sirva. —Cierra los ojos.' }],
    },
    'La puerta de la escalera está a diez pasos. Nada te la cierra ahora, salvo lo que decidas.',
  ],
  choices: [
    {
      id: 'subir',
      label: 'Subir por la escalera',
      outcome: { text: ['Abrís la puerta de la escalera y el frío te sale al encuentro.'], next: 'p_escalera' },
    },
    {
      id: 'descansar',
      label: 'Curarte en la capilla antes de seguir',
      outcome: { text: ['Cruzás el arco y te metés en la capilla arrastrando los pies.'], next: 'p_capilla' },
    },
    {
      id: 'registrar',
      label: 'Registrar la biblioteca',
      outcome: { text: ['Volvés a la biblioteca con el candil del centinela en la mano.'], next: 'p_biblioteca' },
    },
    {
      id: 'salir',
      label: 'Salir de la torre con lo puesto',
      outcome: { text: ['Ya tuviste suficiente. Cruzás el umbral hacia la noche y no mirás atrás.'], next: 'p_fin_huida' },
    },
  ],
} satisfies Scene;

export const p_capilla = {
  id: 'p_capilla',
  kind: 'rest',
  place: 'torre_abandonada',
  variant: 'noche',
  onEnter: [{ heal: 1 }, { removeCondition: 'all' }],
  text: [
    {
      variants: [
        { when: { visited: 'p_capilla', min: 1 }, text: 'La capilla, otra vez. El banco donde te sentaste sigue tibio, o eso te parece.' },
        {
          text: 'La capilla es una sala estrecha con un altar sin santo y dos velas que alguien mantiene encendidas. Acá no llega el viento ni, por lo visto, el centinela.',
        },
      ],
    },
    'Te sentás en el banco, respirás hondo y dejás que la sangre se seque. Cuando te levantás, el cuerpo protesta menos.',
  ],
  choices: [
    {
      id: 'volver_umbral',
      label: 'Volver al umbral',
      outcome: { text: ['Salís de la capilla y desandás el pasillo hasta el umbral.'], next: 'p_umbral' },
    },
    {
      id: 'ir_biblioteca',
      label: 'Ir a la biblioteca',
      outcome: { text: ['Tomás el pasillo hacia la biblioteca, con el olor a cera pegado a la ropa.'], next: 'p_biblioteca' },
    },
    {
      id: 'subir',
      label: 'Subir por la escalera',
      requires: { flag: 'run:centinela_vencido' },
      lockedHint: 'El centinela sigue en el patio',
      outcome: { text: ['Con el camino libre, cruzás hasta la puerta de la escalera y entrás.'], next: 'p_escalera' },
    },
    {
      id: 'salir',
      label: 'Salir de la torre y volver a la aldea',
      outcome: { text: ['Apagás una de las velas por costumbre y salís de la torre. La noche está más tibia afuera.'], next: 'p_fin_huida' },
    },
    {
      id: 'salir_al_patio',
      label: 'Salir al patio',
      outcome: { text: ['Abrís la puerta lateral de la capilla y salís al patio.'], next: 'p_patio' },
    },
  ],
} satisfies Scene;
```

- [ ] **Paso 14: Correr el test y verificar que pasa** → comando:

```
npx vitest run tests/content/prueba.test.ts
```

Resultado esperado: `Tests 12 passed` (5 del ciclo 2 y 7 nuevos).

- [ ] **Paso 15: Commit** →

```bash
git add src/content/campaigns/prueba/scenes/acto1.ts tests/content/prueba.test.ts
git commit -m "feat(content): escenas del acto 1 de la campaña de humo prueba

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: acto 2 (escalera, cripta mortal y finales) y `campaign.ts`

- [ ] **Paso 16: Escribir el test que falla** → editar `tests/content/prueba.test.ts`. Reemplazar la línea `import type { Paragraph, Scene } from '@/content/schema';` por:

```ts
import { parseCampaign, type Paragraph, type Scene, type Choice, type Outcome, type Effect } from '@/content/schema';
import { p_escalera, p_cripta, p_fin_tesoro, p_fin_huida } from '@/content/campaigns/prueba/scenes/acto2';
import { campaign } from '@/content/campaigns/prueba/campaign';
```

Luego agregar al final del archivo este bloque completo. Igual que en el acto 1, las aserciones sobre `requires`, `lockedHint`, `roll`, `outcome` y `ending` se hacen sobre vistas tipadas `Scene` (`escalera`, `cripta`, `finTesoro`, `finHuida`): ninguna opción de `p_escalera` tiene `lockedHint`, así que `runas?.lockedHint` sobre la constante literal daría `TS2339`.

```ts
/** Todos los desenlaces de una opción: el outcome directo o los 3 a 5 outcomes de la tirada. */
function desenlaces(choice: Choice): Outcome[] {
  if (choice.outcome !== undefined) return [choice.outcome];
  if (choice.roll !== undefined) {
    const o = choice.roll.outcomes;
    const lista: Outcome[] = [o.success, o.partial, o.failure];
    if (o.crit !== undefined) lista.push(o.crit);
    if (o.fumble !== undefined) lista.push(o.fumble);
    return lista;
  }
  return [];
}

/** Ids de escena a los que apunta una escena: redirects y todos los next de todas sus opciones. */
function destinos(scene: Scene): string[] {
  const ids: string[] = [];
  for (const r of scene.redirect ?? []) ids.push(r.to);
  for (const c of scene.choices) for (const o of desenlaces(c)) ids.push(o.next);
  return ids;
}

function tieneLethal(effects: Effect[] | undefined): boolean {
  return (effects ?? []).some((e) => 'lethal' in e);
}

describe('prueba: escenas del acto 2', () => {
  // Vistas tipadas: `satisfies Scene` conserva el tipo literal; asignar a Scene expone todas las propiedades opcionales.
  const escalera: Scene = p_escalera;
  const cripta: Scene = p_cripta;
  const finTesoro: Scene = p_fin_tesoro;
  const finHuida: Scene = p_fin_huida;

  it('tiene los cuatro ids esperados', () => {
    expect([p_escalera, p_cripta, p_fin_tesoro, p_fin_huida].map((s) => s.id)).toEqual(['p_escalera', 'p_cripta', 'p_fin_tesoro', 'p_fin_huida']);
  });

  it('la escalera anuncia la escena mortal y esconde la opción de las runas', () => {
    const anuncia = escalera.text.some((p) => typeof p === 'string' && p.includes('Un fallo acá te puede matar'));
    expect(anuncia).toBe(true);
    const runas = escalera.choices.find((c) => c.id === 'estudiar_runas');
    expect(runas?.requires).toEqual({ trait: 'aprendiz_de_escriba' });
    expect(runas?.lockedHint).toBeUndefined();
    expect(runas?.outcome?.effects).toEqual([{ set: 'char:prueba.vio_la_cripta' }]);
    expect(runas?.outcome?.next).toBe('p_cripta');
  });

  it('la cripta es la escena mortal: lethal solo en fallos de cruzar y conjurar', () => {
    expect(cripta.lethal).toBe(true);
    const conLethal = cripta.choices.filter((c) => desenlaces(c).some((o) => tieneLethal(o.effects))).map((c) => c.id);
    expect(conLethal.sort()).toEqual(['conjurar', 'cruzar']);
    const tantear = cripta.choices.find((c) => c.id === 'tantear');
    expect(tantear?.roll?.tags).toEqual(['percepcion']);
    const retroceder = cripta.choices.find((c) => c.id === 'retroceder');
    expect(retroceder?.outcome?.next).toBe('p_escalera');
  });

  it('los finales tienen ending y cero opciones', () => {
    expect(finTesoro.kind).toBe('ending');
    expect(finTesoro.ending?.id).toBe('fin_tesoro');
    expect(finTesoro.choices).toEqual([]);
    expect(finHuida.kind).toBe('ending');
    expect(finHuida.ending?.id).toBe('fin_huida');
    expect(finHuida.choices).toEqual([]);
  });
});

describe('prueba: campaña completa', () => {
  const escenas: Scene[] = Object.values(campaign.scenes);

  it('pasa parseCampaign sin lanzar y conserva su id', () => {
    const parsed = parseCampaign(campaign);
    expect(parsed.id).toBe('prueba');
    expect(Object.keys(parsed.scenes).length).toBe(10);
  });

  it('start existe en scenes y es el umbral', () => {
    expect(campaign.start).toBe('p_umbral');
    expect(campaign.scenes[campaign.start]).toBeDefined();
  });

  it('la clave de cada escena coincide con su id', () => {
    for (const [clave, scene] of Object.entries(campaign.scenes)) {
      expect(scene.id).toBe(clave);
    }
  });

  it('toda escena no-ending tiene entre 4 y 9 opciones y al menos 4 sin requires; los endings tienen 0', () => {
    for (const scene of escenas) {
      if (scene.kind === 'ending') {
        expect(scene.choices.length, scene.id).toBe(0);
        expect(scene.ending, scene.id).toBeDefined();
        expect(campaign.endings[scene.ending?.id ?? ''], scene.id).toBeDefined();
      } else {
        expect(scene.choices.length, scene.id).toBeGreaterThanOrEqual(4);
        expect(scene.choices.length, scene.id).toBeLessThanOrEqual(9);
        expect(sinRequires(scene), scene.id).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('toda opción tiene exactamente uno de roll u outcome', () => {
    for (const scene of escenas) {
      for (const choice of scene.choices) {
        const cuantos = (choice.roll !== undefined ? 1 : 0) + (choice.outcome !== undefined ? 1 : 0);
        expect(cuantos, `${scene.id}/${choice.id}`).toBe(1);
      }
    }
  });

  it('hay exactamente una escena lethal y meta.lethalScenes es 1', () => {
    const letales = escenas.filter((s) => s.lethal === true).map((s) => s.id);
    expect(letales).toEqual(['p_cripta']);
    expect(campaign.lethalScenes).toBe(1);
  });

  it('el efecto lethal solo aparece en outcomes de tirada de la escena lethal', () => {
    for (const scene of escenas) {
      for (const choice of scene.choices) {
        if (choice.outcome !== undefined) {
          expect(tieneLethal(choice.outcome.effects), `${scene.id}/${choice.id}`).toBe(false);
        }
        if (choice.roll !== undefined && scene.lethal !== true) {
          for (const o of desenlaces(choice)) {
            expect(tieneLethal(o.effects), `${scene.id}/${choice.id}`).toBe(false);
          }
        }
      }
    }
  });

  it('a la escena lethal solo se llega por outcome de opciones sin tirada', () => {
    for (const scene of escenas) {
      for (const r of scene.redirect ?? []) expect(r.to, `${scene.id} redirect`).not.toBe('p_cripta');
      for (const choice of scene.choices) {
        if (choice.roll !== undefined) {
          for (const o of desenlaces(choice)) expect(o.next, `${scene.id}/${choice.id}`).not.toBe('p_cripta');
        }
      }
    }
  });

  it('todo next y todo redirect.to apunta a una escena existente', () => {
    for (const scene of escenas) {
      for (const destino of destinos(scene)) {
        expect(campaign.scenes[destino], `${scene.id} -> ${destino}`).toBeDefined();
      }
    }
  });

  it('declara reloj, hito y finales del contrato', () => {
    expect(campaign.clocks['pelea']).toEqual({ max: 2, label: 'Pelea' });
    expect(campaign.milestones['entrar_a_la_torre']?.label.length).toBeGreaterThan(0);
    expect(campaign.endings['fin_tesoro']?.title).toBe('El tesoro de la torre');
    expect(campaign.endings['fin_huida']?.title).toBe('Con vida');
  });
});
```

- [ ] **Paso 17: Correr el test y verificar que falla** → comando:

```
npx vitest run tests/content/prueba.test.ts
```

Resultado esperado: fallo de carga con `Failed to resolve import "@/content/campaigns/prueba/scenes/acto2"`.

- [ ] **Paso 18: Implementación mínima** → crear los dos archivos.

`src/content/campaigns/prueba/scenes/acto2.ts`:

```ts
import type { Scene } from '@/content/schema';

/**
 * Acto 2 de la campaña de humo: la escalera (que anuncia la cripta), la cripta (única escena mortal) y los dos finales.
 * A `p_cripta` solo se entra por opciones sin tirada (`bajar_cripta`, `estudiar_runas`); ningún roll ni redirect apunta a ella.
 */

export const p_escalera = {
  id: 'p_escalera',
  kind: 'normal',
  place: 'torre_abandonada',
  variant: 'noche',
  text: [
    'La escalera sube en caracol y también baja: un tramo estrecho se hunde hacia una cripta de la que sube un aire frío y dulce. Arriba no hay nada; la torre termina en un techo derrumbado y cielo. Lo que hay, está abajo.',
    {
      variants: [
        {
          when: { flag: 'char:prueba.vio_la_cripta' },
          text: 'Sabés lo que hay abajo porque las runas te lo contaron una vez: un puente de piedra sobre un pozo sin fondo y, del otro lado, el arca.',
        },
        { text: 'Alguien talló runas en el primer escalón hacia abajo. No parecen una bienvenida.' },
      ],
    },
    'Un fallo acá te puede matar. Lo sabés antes de bajar: la cripta no perdona un pie en falso.',
  ],
  choices: [
    {
      id: 'bajar_cripta',
      label: 'Bajar a la cripta',
      outcome: { text: ['Bajás con una mano en la pared. El frío sube a tu encuentro.'], next: 'p_cripta' },
    },
    {
      id: 'volver',
      label: 'Volver a la capilla',
      outcome: { text: ['Todavía no. Volvés sobre tus pasos hasta la capilla.'], next: 'p_capilla' },
    },
    {
      id: 'salir',
      label: 'Salir de la torre con lo puesto',
      outcome: { text: ['Decidís que el tesoro puede esperar a otro. Cruzás el umbral hacia la noche.'], next: 'p_fin_huida' },
    },
    {
      id: 'volver_umbral',
      label: 'Volver al umbral',
      outcome: { text: ['Bajás la escalera hasta el vestíbulo y te quedás un momento bajo el dintel.'], next: 'p_umbral' },
    },
    {
      id: 'estudiar_runas',
      label: 'Estudiar las runas del escalón',
      requires: { trait: 'aprendiz_de_escriba' },
      outcome: {
        text: [
          'Las runas no son una advertencia: son un plano. Marcan un puente de piedra sobre un pozo y señalan, con un trazo más hondo, el tercer bloque. Bajás sabiendo dónde no pisar.',
        ],
        effects: [{ set: 'char:prueba.vio_la_cripta' }],
        next: 'p_cripta',
      },
    },
  ],
} satisfies Scene;

export const p_cripta = {
  id: 'p_cripta',
  kind: 'normal',
  lethal: true,
  place: 'torre_abandonada',
  variant: 'cripta',
  text: [
    'La cripta es un puente de piedra de un paso de ancho sobre un pozo que no devuelve el eco. Del otro lado, sobre un pedestal, hay un arca de hierro con el mismo sello del dintel. El aire dulce viene de abajo, y abajo no hay fondo.',
    {
      variants: [
        {
          when: { flag: 'char:prueba.vio_la_cripta' },
          text: 'Las runas no mentían: el tercer bloque del puente está suelto, lo ves desde acá. Sabés dónde no pisar.',
        },
        { text: 'Algunos bloques del puente brillan de humedad. No hay forma de saber cuál aguanta sin pisarlo.' },
      ],
    },
    'Podés volver. Nadie te lo va a reprochar.',
  ],
  choices: [
    {
      id: 'cruzar',
      label: 'Cruzar el puente corriendo',
      roll: {
        attr: 'vigor',
        difficulty: 'muy_dificil',
        tags: ['fisico'],
        advantageIf: { flag: 'char:prueba.vio_la_cripta' },
        outcomes: {
          success: {
            text: ['Cruzás en seis zancadas y el puente ni se entera. El arca está fría y pesada, y es tuya.'],
            next: 'p_fin_tesoro',
          },
          partial: {
            text: [
              'El tercer bloque cede bajo tu pie; te tirás hacia adelante y caés de rodillas del otro lado, con la pierna abierta hasta el hueso. Pero del otro lado.',
            ],
            effects: [{ wound: 1 }],
            next: 'p_fin_tesoro',
          },
          failure: {
            text: [
              'El bloque cede y vos con él. Te agarrás del borde con una mano; la piedra te muerde el pecho al subir. Salís de la cripta a rastras, sin arca y sin aire, y de la torre como podés.',
            ],
            effects: [{ lethal: true }],
            next: 'p_fin_huida',
          },
        },
      },
    },
    {
      id: 'conjurar',
      label: 'Sostener el puente con un conjuro',
      roll: {
        attr: 'saber',
        difficulty: 'dificil',
        tags: ['magia'],
        outcomes: {
          success: {
            text: ['Decís las palabras y la piedra se acuerda de ser entera. Cruzás como quien cruza un salón.'],
            next: 'p_fin_tesoro',
          },
          partial: {
            text: ['El conjuro aguanta; vos no. Llegás al arca con las piernas temblando y las manos vacías de fuerza.'],
            effects: [{ addCondition: 'agotado' }],
            next: 'p_fin_tesoro',
          },
          failure: {
            text: [
              'Las palabras se te desarman en la boca y el puente también. Caés hasta que un saliente te frena con el sonido de algo que se rompe adentro. Trepás sin saber cómo y salís de la torre sin saber cuándo.',
            ],
            effects: [{ lethal: true }],
            next: 'p_fin_huida',
          },
        },
      },
    },
    {
      id: 'tantear',
      label: 'Tantear cada bloque antes de pisar',
      roll: {
        attr: 'astucia',
        difficulty: 'normal',
        tags: ['percepcion'],
        advantageIf: { flag: 'char:prueba.vio_la_cripta' },
        outcomes: {
          success: {
            text: ['Vas despacio, probando cada bloque con la punta del pie. Dos se mueven; los salteás. Llegás al arca con el corazón en la garganta y las manos limpias.'],
            next: 'p_fin_tesoro',
          },
          partial: {
            text: ['Tanteás mal un bloque, se hunde, y te raspás las piernas contra el borde al saltar. Llegás del otro lado sangrando.'],
            effects: [{ wound: 1 }],
            next: 'p_fin_tesoro',
          },
          failure: {
            text: ['A mitad del puente te falla el pulso. Retrocedés a tiempo, con un tobillo torcido, y subís a la escalera con el arca todavía del otro lado.'],
            effects: [{ wound: 1 }],
            next: 'p_escalera',
          },
        },
      },
    },
    {
      id: 'retroceder',
      label: 'Retroceder a la escalera',
      outcome: { text: ['Das un paso atrás, y otro. El aire dulce se queda abajo.'], next: 'p_escalera' },
    },
  ],
} satisfies Scene;

export const p_fin_tesoro = {
  id: 'p_fin_tesoro',
  kind: 'ending',
  place: 'torre_abandonada',
  variant: 'cripta',
  text: [
    'El arca no tiene cerradura: tiene un sello, y el sello cede cuando apoyás la palma. Adentro no hay oro. Hay un libro encuadernado en cuero negro, un anillo de plata sin piedra y una bolsa de monedas viejas que en la aldea van a valer más que el oro, porque nadie las vio nunca.',
    'Cerrás el arca, te la cargás al hombro y volvés a cruzar el puente, esta vez sin apuro.',
  ],
  choices: [],
  ending: {
    id: 'fin_tesoro',
    epilogue: [
      'Volvés a la aldea al amanecer con el arca al hombro. El centinela no está en el patio cuando salís; queda su manta y una mancha oscura en el brocal.',
      {
        variants: [
          { when: { wounds: { gte: 1 } }, text: 'Te cosen las heridas en la taberna y nadie te pregunta de dónde salieron. Con lo que hay en el arca, tampoco hace falta contarlo.' },
          { text: 'Entero y con plata: en la aldea no lo van a creer. No importa. Vos lo sabés.' },
        ],
      },
    ],
  },
} satisfies Scene;

export const p_fin_huida = {
  id: 'p_fin_huida',
  kind: 'ending',
  place: 'torre_abandonada',
  variant: 'noche',
  text: [
    'Cruzás el umbral y la torre queda atrás, negra contra un cielo que empieza a aclarar. El aire del claro es distinto: huele a hierba mojada y no a cera.',
    'No trajiste nada. Trajiste el cuerpo, que ya es bastante.',
  ],
  choices: [],
  ending: {
    id: 'fin_huida',
    epilogue: [
      {
        variants: [
          { when: { wounds: { gte: 2 } }, text: 'Llegás a la aldea a rastras y te desmayás en la puerta de la taberna. Cuando despertás, alguien te vendó y alguien más ya está contando que la torre casi te mata.' },
          { when: { wounds: { gte: 1 } }, text: 'Llegás a la aldea cojeando. Nadie te pregunta por el tesoro; te miran la sangre y sacan sus propias conclusiones.' },
          { text: 'Llegás a la aldea con las primeras luces, entero y con las manos vacías. Habrá otra noche.' },
        ],
      },
      'La torre sigue ahí. Siempre va a estar ahí.',
    ],
  },
} satisfies Scene;
```

`src/content/campaigns/prueba/campaign.ts`:

```ts
import type { Campaign } from '@/content/schema';
import { pruebaMeta } from '@/content/campaigns/prueba/meta';
import { npcs } from '@/content/campaigns/prueba/npcs';
import { places } from '@/content/campaigns/prueba/places';
import { items } from '@/content/campaigns/prueba/items';
import { flags } from '@/content/campaigns/prueba/flags';
import { p_umbral, p_biblioteca, p_patio, p_patio_2, p_victoria, p_capilla } from '@/content/campaigns/prueba/scenes/acto1';
import { p_escalera, p_cripta, p_fin_tesoro, p_fin_huida } from '@/content/campaigns/prueba/scenes/acto2';

/** Campaña de humo completa. El registro la carga con `import()` dinámico; nunca se importa estáticamente desde la UI. */
export const campaign: Campaign = {
  ...pruebaMeta,
  start: 'p_umbral',
  scenes: {
    p_umbral,
    p_biblioteca,
    p_patio,
    p_patio_2,
    p_victoria,
    p_capilla,
    p_escalera,
    p_cripta,
    p_fin_tesoro,
    p_fin_huida,
  },
  npcs,
  places,
  items,
  flags,
  milestones: {
    entrar_a_la_torre: { label: 'Entrar a la torre' },
  },
  clocks: {
    pelea: { max: 2, label: 'Pelea' },
  },
  endings: {
    fin_tesoro: { title: 'El tesoro de la torre' },
    fin_huida: { title: 'Con vida' },
  },
};
```

- [ ] **Paso 19: Correr el test y verificar que pasa** → comando:

```
npx vitest run tests/content/prueba.test.ts
```

Resultado esperado: `Tests 26 passed` (12 anteriores, 4 del acto 2 y 10 de la campaña completa). Si `parseCampaign` lanza, el mensaje de zod indica la ruta exacta del campo que no cumple (por ejemplo `scenes.p_cripta.choices.0.roll.outcomes.failure.effects.0`): corregir el dato, no el esquema.

- [ ] **Paso 20: Commit** →

```bash
git add src/content/campaigns/prueba/scenes/acto2.ts src/content/campaigns/prueba/campaign.ts tests/content/prueba.test.ts
git commit -m "feat(content): acto 2 y campaña completa de la campaña de humo prueba

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 5: registro de campañas (`CAMPAIGNS`, `listCampaigns`, `load()`)

- [ ] **Paso 21: Escribir el test que falla** → editar `tests/content/registry.test.ts`. Debajo del import de `WORLD` (línea 2) agregar:

```ts
import { CAMPAIGNS, listCampaigns } from '@/content/campaigns/index';
import { pruebaMeta } from '@/content/campaigns/prueba/meta';
import { campaign } from '@/content/campaigns/prueba/campaign';
```

Y al final del archivo agregar este bloque completo:

```ts
describe('CAMPAIGNS (registro de campañas)', () => {
  it('registra la campaña prueba con su meta estática', () => {
    const entry = CAMPAIGNS['prueba'];
    expect(entry).toBeDefined();
    expect(entry?.meta).toBe(pruebaMeta);
    expect(entry?.meta.hidden).toBe(true);
  });

  it('listCampaigns(false) no incluye prueba porque es hidden', () => {
    const visibles = listCampaigns(false).map((m) => m.id);
    expect(visibles).not.toContain('prueba');
  });

  it('listCampaigns(true) incluye prueba', () => {
    const todas = listCampaigns(true).map((m) => m.id);
    expect(todas).toContain('prueba');
  });

  it('listCampaigns devuelve un array nuevo en cada llamada (no expone el registro)', () => {
    const a = listCampaigns(true);
    const b = listCampaigns(true);
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('load() devuelve la campaña completa', async () => {
    const entry = CAMPAIGNS['prueba'];
    expect(entry).toBeDefined();
    const loaded = await entry!.load();
    expect(loaded.id).toBe('prueba');
    expect(loaded.start).toBe('p_umbral');
    expect(loaded).toEqual(campaign);
  });
});
```

- [ ] **Paso 22: Correr el test y verificar que falla** → comando:

```
npx vitest run tests/content/registry.test.ts
```

Resultado esperado: fallo de carga con `Failed to resolve import "@/content/campaigns/index"`.

- [ ] **Paso 23: Implementación mínima** → crear `src/content/campaigns/index.ts`:

```ts
import type { Campaign, CampaignMeta } from '@/content/schema';
import { pruebaMeta } from '@/content/campaigns/prueba/meta';

/** Entrada del registro: la meta se importa estáticamente; la campaña completa se carga con `import()` dinámico (un chunk por campaña). */
export interface CampaignEntry {
  meta: CampaignMeta;
  load: () => Promise<Campaign>;
}

/**
 * Registro de campañas. Solo importa `meta.ts` de cada una; `load()` trae escenas, PNJ, lugares y objetos.
 * Ninguna campaña importa a otra.
 */
export const CAMPAIGNS: Record<string, CampaignEntry> = {
  prueba: {
    meta: pruebaMeta,
    load: () => import('@/content/campaigns/prueba/campaign').then((m) => m.campaign),
  },
};

/** Metas de las campañas registradas. Con `includeHidden = false` (producción) se omiten las marcadas `hidden`. */
export function listCampaigns(includeHidden: boolean): CampaignMeta[] {
  return Object.values(CAMPAIGNS)
    .map((entry) => entry.meta)
    .filter((meta) => includeHidden || meta.hidden !== true);
}
```

- [ ] **Paso 24: Correr el test y verificar que pasa** → comando:

```
npx vitest run tests/content/registry.test.ts
```

Resultado esperado: `Tests 7 passed` (2 del ciclo 1 y 5 nuevos).

- [ ] **Paso 25: Commit** →

```bash
git add src/content/campaigns/index.ts tests/content/registry.test.ts
git commit -m "feat(content): registro de campañas con meta estática y carga dinámica

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Verificación de la tarea

- [ ] **Paso 26: Verificación de la tarea** → correr, uno por línea:

```
npx vitest run
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: todos los archivos de test del proyecto en verde (incluidos `tests/content/prueba.test.ts` con 26 tests y `tests/content/registry.test.ts` con 7) y `tsc` sin errores (en particular, ningún `satisfies Scene` marca un literal fuera del esquema, `campaign: Campaign` acepta las diez escenas y los tests no producen `TS2339` porque acceden a `speaker`, `requires`, `lockedHint`, `roll`, `outcome` y `ending` solo a través de vistas tipadas `Scene`).

Criterio de aceptación: `parseCampaign(campaign)` pasa, `CAMPAIGNS.prueba.load()` devuelve la campaña de humo de diez escenas (con `p_cripta` como única escena mortal, todos los `next` resueltos y al menos 4 opciones sin `requires` en toda escena no final), `listCampaigns(false)` la oculta y `listCampaigns(true)` la muestra, dejando el contenido listo para el validador de la Tarea 12 y el flujo completo de la Tarea 14.

---

### Tarea 12: Validador de contenido con 10 reglas ERROR y CLI

Objetivo: implementar la sección J del contrato. `validateCampaign` corre primero el esquema zod y después diez reglas ERROR, cada una en su archivo. `reach.ts` calcula la alcanzabilidad optimista por clase. La CLI `tools/validate.ts` imprime `campaña › escena › [regla] mensaje` y sale con código 1 si hay errores. El script `build` pasa a correr `validate` antes de los tests.

Dos aclaraciones sobre el alcance de las reglas:

- r03 se implementa literal al contrato (sección J): toda escena no final tiene entre `LIMITS.minChoices` y `LIMITS.maxChoices` opciones y **al menos `LIMITS.minChoices` (4) sin `requires`**, en ambos perfiles. El perfil `smoke` no relaja este mínimo (solo relaja r10). La campaña `prueba` de la tarea 11 ya cumple ≥ 4 opciones libres en toda escena (agregó `golpear`/`provocar`, `salir_al_patio` y `volver_umbral` para eso, y su propio test lo verifica), y `minimal.ts` también.
- Dos formas que r03 y r04 detectan (un final con opciones; una opción con `roll` y `outcome` a la vez) también las rechaza `CampaignSchema` de la tarea 3 con sus `refine`. Como `validateCampaign` corre zod primero y, si falla, devuelve solo el issue `schema`, esos dos casos se prueban llamando a la regla directamente (`RULES.r03_choices(...)`, `RULES.r04_choice_shape(...)`), igual que el test `start inexistente`. Las reglas se mantienen igual: cubren el caso si el esquema cambia y documentan la regla completa de la spec.

Convención de imports: `tools/validate.ts` corre con `tsx` en Node puro (sin Vite), así que todos los imports de directorio de esta tarea van con la ruta explícita al `index` (`@/content/campaigns/index`, `@/content/world/index`, `./lib/validate/index`), igual que hace la tarea 11.

**Archivos:**
- Crear: `tools/lib/validate/types.ts` (tipos `ValidationIssue`, `ValidateContext`, `Rule` y fábrica `error`)
- Crear: `tools/lib/validate/walk.ts` (recorridos de escena: outcomes, efectos, condiciones, párrafos, textos)
- Crear: `tools/lib/validate/reach.ts`
- Crear: `tools/lib/validate/rules/r01_targets.ts`, `r02_reach.ts`, `r03_choices.ts`, `r04_choice_shape.ts`, `r05_lethal.ts`, `r06_encounter.ts`, `r07_ids.ts`, `r08_memory_frame.ts`, `r09_extreme.ts`, `r10_todo.ts`
- Crear: `tools/lib/validate/index.ts`
- Crear: `tools/lib/validate/cli.ts` (parseo de argv y formato de salida, testeable sin ejecutar nada)
- Crear: `tools/validate.ts`
- Crear: `tests/fixtures/campaigns/broken/base.ts` (campaña base válida en perfil `release` + helpers de copia)
- Crear: `tests/fixtures/campaigns/broken/r01.ts` … `r10.ts` (una campaña rota por regla; algunos archivos exportan más de una variante rota)
- Test: `tests/tools/reach.test.ts`, `tests/tools/validate.test.ts`, `tests/tools/cli.test.ts`
- Modificar: `package.json` (bloque `scripts`: `build` = `run-s validate test:run typecheck build:vite`)
- Modificar (solo si hace falta): `tsconfig.json` (`include` debe listar `src`, `tests` y `tools`)

**Interfaces:**
- Consume:
  - `@/content/catalog`: `CLASSES`, `TRAITS`, `SKILLS`, `CONDITIONS`, `TAGS`, `LIMITS`, tipos `ClassId`, `Tag`.
  - `@/content/schema`: `CampaignSchema` (zod), `Campaign`, `WorldContent`, `Scene`, `Choice`, `Outcome`, `Condition`, `Effect`, `Paragraph`, `Text`.
  - `@/content/campaigns/index`: `CAMPAIGNS: Record<string, CampaignEntry>` con `{ meta: CampaignMeta; load: () => Promise<Campaign> }` (tarea 11).
  - `@/content/world/index`: `WORLD: WorldContent` (tarea 11).
  - `tests/fixtures/campaigns/minimal.ts` (tarea 3): `export const minimal: Campaign`. Si en la tarea 3 el export quedó con otro nombre, cambiar solo la línea de import del test `minimal.ts pasa`; el resto de fixtures de esta tarea no dependen de él.
- Produce (firmas exactas):
  - `tools/lib/validate/types.ts`: `interface ValidationIssue { level: 'error' | 'warning'; rule: string; sceneId?: string; message: string }`, `interface ValidateContext { world: WorldContent; profile: 'smoke' | 'release' }`, `type Rule = (campaign: Campaign, ctx: ValidateContext) => ValidationIssue[]`, `function error(rule: string, message: string, sceneId?: string): ValidationIssue`.
  - `tools/lib/validate/index.ts`: re-exporta los tres tipos; `function validateCampaign(campaign: Campaign, ctx: ValidateContext): ValidationIssue[]`; `const RULES: Record<string, Rule>` con claves `r01_targets … r10_todo`.
  - `tools/lib/validate/walk.ts`: `function has(obj: object, key: string): boolean`; `function choiceOutcomes(choice: Choice): Outcome[]`; `function rollOutcomes(choice: Choice): Outcome[]`; `function outcomeHasLethal(outcome: Outcome): boolean`; `function sceneEffects(scene: Scene): Effect[]`; `function walkCondition(cond: Condition | undefined, visit: (leaf: Condition) => void): void`; `function sceneConditions(scene: Scene): Condition[]`; `function sceneTexts(scene: Scene): Text[]`; `function paragraphsOf(text: Text): Paragraph[]`; `function stringsOf(text: Text): string[]`.
  - `tools/lib/validate/reach.ts`: `type EdgeVia = 'redirect' | 'outcome' | 'roll'`; `interface Edge { from: string; to: string; via: EdgeVia; choiceId?: string }`; `function sceneEdges(scene: Scene): Edge[]`; `function isClassOnly(cond: Condition): boolean`; `function isSatisfiable(cond: Condition | undefined, classId: ClassId | null): boolean`; `function reachableScenes(campaign: Campaign, classId: ClassId | null): Set<string>`.
  - `tools/lib/validate/rules/r03_choices.ts`: solo la regla `r03_choices`; el mínimo de opciones libres es `LIMITS.minChoices` en ambos perfiles (no hay constante por perfil).
  - `tools/lib/validate/rules/r07_ids.ts`: además de la regla, `function isSharedFlag(flag: string): boolean`.
  - `tools/lib/validate/cli.ts`: `interface CliArgs { profile?: 'smoke' | 'release'; campaign?: string }`; `function parseArgs(argv: readonly string[]): CliArgs`; `function formatIssue(campaignId: string, issue: ValidationIssue): string`; `function summaryLine(issues: readonly ValidationIssue[]): string`.
  - `tests/fixtures/campaigns/broken/base.ts`: `const mundoDePrueba: WorldContent`; escenas `b_inicio, b_ronda1, b_ronda2, b_descanso, b_cripta, b_fin_a, b_fin_b: Scene`; `const campanaBase: Campaign`; helpers `conEscena(base: Campaign, scene: Scene): Campaign`, `opcion(scene: Scene, id: string): Choice`, `conOpcion(scene: Scene, choice: Choice): Scene`, `sinOpcion(scene: Scene, id: string): Scene`.
  - Fixtures rotos (todos `Campaign`): `r01.ts` → `rotaR01Target`, `rotaR01Ciclo`; `r02.ts` → `rotaR02Aislada`, `rotaR02SoloMago`; `r03.ts` → `rotaR03Pocas`, `rotaR03FinalConOpciones`, `rotaR03PocasLibres`; `r04.ts` → `rotaR04Ambos`; `r05.ts` → `rotaR05LethalFuera`, `rotaR05EntradaPorTirada`, `rotaR05Conteo`, `rotaR05SoloFisico`; `r06.ts` → `rotaR06UnAtributo`, `rotaR06SinHuida`, `rotaR06RondaSinEstado`; `r07.ts` → `rotaR07FlagNoDeclarado`, `rotaR07SpeakerFuera`, `rotaR07Reliquia`, `rotaR07RedefineMundo`, `rotaR07Prefijo`; `r08.ts` → `rotaR08PnjRecuerda`, `rotaR08SinDefecto`; `r09.ts` → `rotaR09Extrema`; `r10.ts` → `rotaR10Todo`.

Convención de los tests: `tests/tools/*.test.ts` importan el validador por ruta relativa (`../../tools/lib/validate/index`, `../../tools/lib/validate/reach`, …) porque el alias `@/` apunta solo a `src/`; nunca por directorio.

---

#### Ciclo 1: tipos, recorridos y alcanzabilidad (`reach.ts`)

- [ ] **Paso 1: Escribir el test que falla** → crear `tests/tools/reach.test.ts` completo:

```ts
import { describe, expect, it } from 'vitest';
import type { Campaign, Scene } from '@/content/schema';
import { isSatisfiable, reachableScenes, sceneEdges } from '../../tools/lib/validate/reach';

const escena = (id: string, extra: Partial<Scene> = {}): Scene => ({
  id, kind: 'normal', place: 'lugar', text: ['Texto.'], choices: [], ...extra,
});

const campana = (scenes: Scene[], start = 'inicio'): Campaign => ({
  id: 'reach', contentVersion: 1, title: 'Reach', premise: 'p', cover: 'c', levelRange: [1, 3], durationMin: [1, 2],
  lethalScenes: 0, lintProfile: 'smoke', start,
  scenes: Object.fromEntries(scenes.map((s) => [s.id, s])),
  npcs: {}, places: {}, items: {}, flags: {}, milestones: {}, clocks: {}, endings: {},
});

describe('sceneEdges', () => {
  it('lista redirect, outcome y los cinco outcomes de una tirada', () => {
    const s = escena('a', {
      redirect: [{ when: { flag: 'run:x' }, to: 'r' }],
      choices: [
        { id: 'o', label: 'Ir', outcome: { next: 'o1' } },
        { id: 't', label: 'Tirar', roll: { attr: 'vigor', difficulty: 'normal', tags: ['fisico'], outcomes: {
          success: { next: 's' }, partial: { next: 'p' }, failure: { next: 'f' }, crit: { next: 'c' }, fumble: { next: 'fu' } } } },
      ],
    });
    const edges = sceneEdges(s);
    expect(edges.map((e) => `${e.via}:${e.to}`)).toEqual(['redirect:r', 'outcome:o1', 'roll:s', 'roll:p', 'roll:f', 'roll:c', 'roll:fu']);
    expect(edges[1]?.choiceId).toBe('o');
    expect(edges[0]?.from).toBe('a');
  });
});

describe('isSatisfiable', () => {
  it('undefined y hojas que no son de clase siempre se cumplen', () => {
    expect(isSatisfiable(undefined, 'mago')).toBe(true);
    expect(isSatisfiable({ flag: 'run:x' }, 'mago')).toBe(true);
    expect(isSatisfiable({ not: { flag: 'run:x' } }, 'mago')).toBe(true);
  });
  it('class se evalúa contra la clase dada; con null siempre se cumple', () => {
    expect(isSatisfiable({ class: 'mago' }, 'mago')).toBe(true);
    expect(isSatisfiable({ class: 'mago' }, 'guerrero')).toBe(false);
    expect(isSatisfiable({ class: 'mago' }, null)).toBe(true);
    expect(isSatisfiable({ not: { class: 'mago' } }, 'mago')).toBe(false);
    expect(isSatisfiable({ not: { class: 'mago' } }, 'guerrero')).toBe(true);
    expect(isSatisfiable({ all: [{ class: 'mago' }, { flag: 'run:x' }] }, 'guerrero')).toBe(false);
    expect(isSatisfiable({ any: [{ class: 'mago' }, { flag: 'run:x' }] }, 'guerrero')).toBe(true);
  });
});

describe('reachableScenes', () => {
  const c = campana([
    escena('inicio', { choices: [
      { id: 'a', label: 'A', outcome: { next: 'medio' } },
      { id: 'm', label: 'M', requires: { class: 'mago' }, outcome: { next: 'secreto' } },
    ] }),
    escena('medio', { redirect: [{ when: { clock: 'x', gte: 1 }, to: 'fin' }], choices: [
      { id: 't', label: 'T', roll: { attr: 'saber', difficulty: 'normal', tags: ['saber'], outcomes: {
        success: { next: 'fin' }, partial: { next: 'medio' }, failure: { next: 'inicio' } } } },
    ] }),
    escena('secreto', { choices: [{ id: 'v', label: 'V', outcome: { next: 'fin' } }] }),
    escena('fin', { kind: 'ending', ending: { id: 'fin', epilogue: ['Fin.'] } }),
    escena('aislada'),
  ]);
  it('con null alcanza todo salvo lo que nadie apunta', () => {
    expect(reachableScenes(c, null)).toEqual(new Set(['inicio', 'medio', 'secreto', 'fin']));
  });
  it('con guerrero no entra a la escena que exige mago', () => {
    expect(reachableScenes(c, 'guerrero').has('secreto')).toBe(false);
    expect(reachableScenes(c, 'mago').has('secreto')).toBe(true);
  });
  it('ignora targets inexistentes sin romper', () => {
    const c2 = campana([escena('inicio', { choices: [{ id: 'x', label: 'X', outcome: { next: 'nada' } }] })]);
    expect(reachableScenes(c2, null)).toEqual(new Set(['inicio']));
  });
  it('no muta la campaña', () => {
    const antes = JSON.stringify(c);
    reachableScenes(c, 'clerigo');
    expect(JSON.stringify(c)).toBe(antes);
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```bash
npx vitest run tests/tools/reach.test.ts
```

Error esperado: `Failed to resolve import "../../tools/lib/validate/reach"` (el módulo no existe todavía).

- [ ] **Paso 3: Implementación mínima** → crear `tools/lib/validate/types.ts`:

```ts
import type { Campaign, WorldContent } from '@/content/schema';

export interface ValidationIssue { level: 'error' | 'warning'; rule: string; sceneId?: string; message: string }
export interface ValidateContext { world: WorldContent; profile: 'smoke' | 'release' }
export type Rule = (campaign: Campaign, ctx: ValidateContext) => ValidationIssue[];

export function error(rule: string, message: string, sceneId?: string): ValidationIssue {
  if (sceneId === undefined) return { level: 'error', rule, message };
  return { level: 'error', rule, sceneId, message };
}
```

Crear `tools/lib/validate/walk.ts`:

```ts
import type { Choice, Condition, Effect, Outcome, Paragraph, Scene, Text } from '@/content/schema';

export function has(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function rollOutcomes(choice: Choice): Outcome[] {
  if (!choice.roll) return [];
  const o = choice.roll.outcomes;
  const list: Outcome[] = [o.success, o.partial, o.failure];
  if (o.crit) list.push(o.crit);
  if (o.fumble) list.push(o.fumble);
  return list;
}

export function choiceOutcomes(choice: Choice): Outcome[] {
  const list: Outcome[] = [];
  if (choice.outcome) list.push(choice.outcome);
  return [...list, ...rollOutcomes(choice)];
}

export function outcomeHasLethal(outcome: Outcome): boolean {
  return (outcome.effects ?? []).some((e) => 'lethal' in e);
}

export function sceneEffects(scene: Scene): Effect[] {
  const list: Effect[] = [...(scene.onEnter ?? [])];
  for (const choice of scene.choices) {
    for (const outcome of choiceOutcomes(choice)) list.push(...(outcome.effects ?? []));
  }
  return list;
}

export function walkCondition(cond: Condition | undefined, visit: (leaf: Condition) => void): void {
  if (cond === undefined) return;
  if ('not' in cond) { walkCondition(cond.not, visit); return; }
  if ('all' in cond) { for (const c of cond.all) walkCondition(c, visit); return; }
  if ('any' in cond) { for (const c of cond.any) walkCondition(c, visit); return; }
  visit(cond);
}

export function paragraphsOf(text: Text): Paragraph[] {
  return text.filter((p): p is Paragraph => typeof p !== 'string');
}

export function sceneTexts(scene: Scene): Text[] {
  const list: Text[] = [scene.text];
  for (const choice of scene.choices) {
    for (const outcome of choiceOutcomes(choice)) if (outcome.text) list.push(outcome.text);
  }
  if (scene.ending) list.push(scene.ending.epilogue);
  return list;
}

export function sceneConditions(scene: Scene): Condition[] {
  const list: Condition[] = [];
  for (const r of scene.redirect ?? []) list.push(r.when);
  for (const choice of scene.choices) {
    if (choice.requires) list.push(choice.requires);
    if (choice.roll?.advantageIf) list.push(choice.roll.advantageIf);
    if (choice.roll?.disadvantageIf) list.push(choice.roll.disadvantageIf);
  }
  for (const text of sceneTexts(scene)) {
    for (const p of paragraphsOf(text)) for (const v of p.variants) if (v.when) list.push(v.when);
  }
  return list;
}

export function stringsOf(text: Text): string[] {
  const list: string[] = [];
  for (const p of text) {
    if (typeof p === 'string') list.push(p);
    else for (const v of p.variants) list.push(v.text);
  }
  return list;
}
```

Crear `tools/lib/validate/reach.ts`:

```ts
import type { ClassId } from '@/content/catalog';
import type { Campaign, Condition, Scene } from '@/content/schema';
import { has, rollOutcomes } from './walk';

export type EdgeVia = 'redirect' | 'outcome' | 'roll';
export interface Edge { from: string; to: string; via: EdgeVia; choiceId?: string }

export function sceneEdges(scene: Scene): Edge[] {
  const edges: Edge[] = [];
  for (const r of scene.redirect ?? []) edges.push({ from: scene.id, to: r.to, via: 'redirect' });
  for (const choice of scene.choices) {
    if (choice.outcome) edges.push({ from: scene.id, to: choice.outcome.next, via: 'outcome', choiceId: choice.id });
    for (const outcome of rollOutcomes(choice)) edges.push({ from: scene.id, to: outcome.next, via: 'roll', choiceId: choice.id });
  }
  return edges;
}

export function isClassOnly(cond: Condition): boolean {
  if ('class' in cond) return true;
  if ('not' in cond) return isClassOnly(cond.not);
  if ('all' in cond) return cond.all.every(isClassOnly);
  if ('any' in cond) return cond.any.every(isClassOnly);
  return false;
}

export function isSatisfiable(cond: Condition | undefined, classId: ClassId | null): boolean {
  if (cond === undefined) return true;
  if ('class' in cond) return classId === null || cond.class === classId;
  if ('not' in cond) return isClassOnly(cond.not) ? !isSatisfiable(cond.not, classId) : true;
  if ('all' in cond) return cond.all.every((c) => isSatisfiable(c, classId));
  if ('any' in cond) return cond.any.length === 0 || cond.any.some((c) => isSatisfiable(c, classId));
  return true;
}

export function reachableScenes(campaign: Campaign, classId: ClassId | null): Set<string> {
  const seen = new Set<string>();
  const queue: string[] = [campaign.start];
  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (seen.has(id) || !has(campaign.scenes, id)) continue;
    seen.add(id);
    const scene = campaign.scenes[id] as Scene;
    for (const r of scene.redirect ?? []) if (isSatisfiable(r.when, classId)) queue.push(r.to);
    for (const choice of scene.choices) {
      if (!isSatisfiable(choice.requires, classId)) continue;
      if (choice.outcome) queue.push(choice.outcome.next);
      for (const outcome of rollOutcomes(choice)) queue.push(outcome.next);
    }
  }
  return seen;
}
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

```bash
npx vitest run tests/tools/reach.test.ts
```

Resultado esperado: `Test Files 1 passed`, `Tests 7 passed`.

- [ ] **Paso 5: Commit**

```bash
git add tools/lib/validate/types.ts tools/lib/validate/walk.ts tools/lib/validate/reach.ts tests/tools/reach.test.ts
git commit -m "feat(validate): tipos, recorridos de escena y alcanzabilidad optimista por clase

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 2: campaña base de fixtures, `validateCampaign` con esquema, r01 y r02

- [ ] **Paso 6: Crear la campaña base válida** → crear `tests/fixtures/campaigns/broken/base.ts` completo (es la copia "minimal" propia de esta tarea: válida en perfil `release`, con hub, encuentro de dos rondas, descanso, escena mortal y dos finales; todos los fixtures rotos se derivan de ella con spread):

```ts
import type { Campaign, Choice, Scene, WorldContent } from '@/content/schema';

export const mundoDePrueba: WorldContent = {
  npcs: { viajero: { id: 'viajero', name: 'El viajero', portrait: 'viajero', voice: 'Cansado y amable.', canonPrompt: 'Hombre mayor con capa gris.' } },
  places: {},
  items: { reliquia_de_prueba: { id: 'reliquia_de_prueba', name: 'Reliquia de prueba', icon: 'reliquia', description: 'Un objeto que persiste entre campañas.', relic: true } },
  flags: { 'char:met.*': 'PNJ conocidos', 'char:place.*': 'Lugares conocidos', 'char:origen.*': 'Rasgos de origen', 'char:leyenda': 'Nivel 10', 'world:caido.*': 'Personajes caídos' },
};

export const b_inicio: Scene = {
  id: 'b_inicio', kind: 'hub', place: 'b_plaza', npcs: ['b_guia'],
  onEnter: [{ milestone: 'b_llegar' }],
  text: [
    'Llegás a la plaza con la lluvia en la nuca.',
    { variants: [
      { when: { visited: 'b_inicio', min: 1 }, text: 'Otra vez la plaza.' },
      { when: { knows: 'b_plaza' }, text: 'Conocés esta plaza de otra crónica.' },
      { text: 'La plaza está vacía.' } ] },
    { speaker: 'b_guia', variants: [
      { when: { trait: 'desertor' }, text: '—Un soldado. Se nota en cómo parás.' },
      { text: '—Bienvenido. No te quedes bajo el agua.' } ] },
  ],
  choices: [
    { id: 'pelear', label: 'Encarar al guía', outcome: { next: 'b_ronda1' } },
    { id: 'bajar', label: 'Bajar a la cripta', outcome: { next: 'b_cripta' } },
    { id: 'hablar', label: 'Hablar con el guía', roll: { attr: 'presencia', difficulty: 'normal', tags: ['social'], outcomes: {
      success: { text: ['El guía te entrega una llave.'], effects: [{ set: 'run:b_hablo' }, { give: 'b_llave' }], next: 'b_fin_a' },
      partial: { effects: [{ addCondition: 'asustado' }], next: 'b_fin_a' },
      failure: { text: ['Te da la espalda.'], next: 'b_inicio' } } } },
    { id: 'descansar', label: 'Buscar refugio', outcome: { next: 'b_descanso' } },
    { id: 'recordar', label: 'Ir directo al final que recordás', requires: { flag: 'char:base.recuerdo' }, lockedHint: 'No recordás nada todavía', outcome: { next: 'b_fin_a' } },
  ],
};

const golpe = (next: string): Choice => ({ id: 'golpear', label: 'Golpear', roll: { attr: 'vigor', difficulty: 'normal', tags: ['fisico'], outcomes: {
  success: { effects: [{ clock: 'b_pelea', delta: 1 }], next },
  partial: { effects: [{ clock: 'b_pelea', delta: 1 }, { wound: 1 }], next },
  failure: { effects: [{ wound: 1 }], next } } } });

const engano = (next: string): Choice => ({ id: 'enganar', label: 'Engañar', roll: { attr: 'astucia', difficulty: 'normal', tags: ['engano'], outcomes: {
  success: { effects: [{ clock: 'b_pelea', delta: 1 }], next },
  partial: { effects: [{ clock: 'b_pelea', delta: 1 }, { addCondition: 'asustado' }], next },
  failure: { effects: [{ wound: 1 }], next } } } });

const huida = (next: string): Choice => ({ id: 'huir', label: 'Huir', roll: { attr: 'astucia', difficulty: 'normal', tags: ['huida'], outcomes: {
  success: { next: 'b_descanso' },
  partial: { effects: [{ wound: 1 }], next: 'b_descanso' },
  failure: { effects: [{ wound: 1 }], next } } } });

export const b_ronda1: Scene = {
  id: 'b_ronda1', kind: 'encounter', place: 'b_plaza',
  text: ['El guía saca un cuchillo.'],
  choices: [golpe('b_ronda2'), engano('b_ronda2'), { id: 'ceder', label: 'Ceder', outcome: { next: 'b_descanso' } }, huida('b_ronda2')],
};

export const b_ronda2: Scene = {
  id: 'b_ronda2', kind: 'encounter', place: 'b_plaza',
  redirect: [{ when: { clock: 'b_pelea', gte: 2 }, to: 'b_fin_a' }],
  text: ['Sangra, pero no suelta el cuchillo.'],
  choices: [
    { id: 'rematar', label: 'Rematar', requires: { clock: 'b_pelea', gte: 1 }, lockedHint: 'Todavía está entero', roll: { attr: 'vigor', difficulty: 'normal', tags: ['fisico'], outcomes: {
      success: { effects: [{ clock: 'b_pelea', delta: 1 }], next: 'b_ronda2' },
      partial: { effects: [{ clock: 'b_pelea', delta: 1 }, { wound: 1 }], next: 'b_ronda2' },
      failure: { effects: [{ wound: 1 }], next: 'b_ronda2' } } } },
    golpe('b_ronda2'), engano('b_ronda2'),
    { id: 'ceder', label: 'Ceder', outcome: { next: 'b_descanso' } },
    huida('b_ronda2'),
  ],
};

export const b_descanso: Scene = {
  id: 'b_descanso', kind: 'rest', place: 'b_plaza', npcs: ['viajero'],
  onEnter: [{ heal: 1 }, { removeCondition: 'all' }],
  text: [
    { speaker: 'viajero', variants: [
      { when: { met: 'viajero' }, text: '—Otra vez vos. Sentate.' },
      { text: '—Sentate. El fuego alcanza para dos.' } ] },
  ],
  choices: [
    { id: 'volver', label: 'Volver a la plaza', outcome: { next: 'b_inicio' } },
    { id: 'pelear', label: 'Buscar al guía', outcome: { next: 'b_ronda1' } },
    { id: 'bajar', label: 'Bajar a la cripta', outcome: { next: 'b_cripta' } },
    { id: 'irse', label: 'Irse del pueblo', outcome: { next: 'b_fin_b' } },
    { id: 'mirar', label: 'Mirar el fuego', outcome: { text: ['El fuego sigue.'], next: 'b_descanso' } },
    { id: 'abrir', label: 'Abrir el cofre del viajero', requires: { item: 'b_llave' }, lockedHint: 'Falta la llave', outcome: { next: 'b_fin_a' } },
  ],
};

export const b_cripta: Scene = {
  id: 'b_cripta', kind: 'normal', lethal: true, place: 'b_plaza',
  text: ['La cripta huele a agua vieja. Un fallo acá te puede matar.'],
  choices: [
    { id: 'cruzar', label: 'Cruzar a la fuerza', roll: { attr: 'vigor', difficulty: 'muy_dificil', tags: ['fisico'], outcomes: {
      success: { next: 'b_fin_a' }, partial: { effects: [{ wound: 1 }], next: 'b_fin_a' }, failure: { effects: [{ lethal: true }], next: 'b_fin_b' } } } },
    { id: 'conjurar', label: 'Conjurar una luz', roll: { attr: 'saber', difficulty: 'dificil', tags: ['magia'], outcomes: {
      success: { effects: [{ set: 'char:base.recuerdo' }], next: 'b_fin_a' }, partial: { effects: [{ addCondition: 'agotado' }], next: 'b_fin_a' }, failure: { effects: [{ lethal: true }], next: 'b_fin_b' } } } },
    { id: 'tantear', label: 'Tantear el suelo', roll: { attr: 'astucia', difficulty: 'normal', tags: ['percepcion'], outcomes: {
      success: { next: 'b_fin_a' }, partial: { effects: [{ wound: 1 }], next: 'b_fin_a' }, failure: { effects: [{ wound: 1 }], next: 'b_descanso' } } } },
    { id: 'retroceder', label: 'Retroceder', outcome: { next: 'b_descanso' } },
  ],
};

export const b_fin_a: Scene = { id: 'b_fin_a', kind: 'ending', place: 'b_plaza', text: ['Termina.'], choices: [], ending: { id: 'fin_a', epilogue: ['Ganaste.'] } };
export const b_fin_b: Scene = { id: 'b_fin_b', kind: 'ending', place: 'b_plaza', text: ['Termina.'], choices: [], ending: { id: 'fin_b', epilogue: ['Sobreviviste.'] } };

export const campanaBase: Campaign = {
  id: 'base', contentVersion: 1, title: 'Campaña base de fixtures', premise: 'Una campaña mínima válida para probar el validador.', cover: 'base',
  levelRange: [1, 3], durationMin: [5, 10], lethalScenes: 1, lintProfile: 'release', start: 'b_inicio',
  scenes: { b_inicio, b_ronda1, b_ronda2, b_descanso, b_cripta, b_fin_a, b_fin_b },
  npcs: { b_guia: { id: 'b_guia', name: 'El guía', portrait: 'b_guia', voice: 'Seco.', canonPrompt: 'Hombre delgado con farol.' } },
  places: { b_plaza: { id: 'b_plaza', name: 'La plaza', background: 'b_plaza', canonPrompt: 'Plaza empedrada bajo la lluvia.' } },
  items: { b_llave: { id: 'b_llave', name: 'Llave del guía', icon: 'llave', description: 'Abre un cofre.', advantageTags: ['sigilo'] } },
  flags: { 'run:b_hablo': 'Hablaste con el guía', 'char:base.recuerdo': 'Viste la luz de la cripta' },
  milestones: { b_llegar: { label: 'Llegar a la plaza' } },
  clocks: { b_pelea: { max: 2, label: 'Pelea' } },
  endings: { fin_a: { title: 'Final A' }, fin_b: { title: 'Final B', hidden: true } },
};

export function conEscena(base: Campaign, scene: Scene): Campaign {
  return { ...base, scenes: { ...base.scenes, [scene.id]: scene } };
}

export function opcion(scene: Scene, id: string): Choice {
  const found = scene.choices.find((c) => c.id === id);
  if (!found) throw new Error(`Fixture: la escena ${scene.id} no tiene la opción ${id}`);
  return found;
}

export function conOpcion(scene: Scene, choice: Choice): Scene {
  return { ...scene, choices: scene.choices.map((c) => (c.id === choice.id ? choice : c)) };
}

export function sinOpcion(scene: Scene, id: string): Scene {
  return { ...scene, choices: scene.choices.filter((c) => c.id !== id) };
}
```

- [ ] **Paso 7: Crear los fixtures rotos de r01 y r02** → crear `tests/fixtures/campaigns/broken/r01.ts`:

```ts
import type { Campaign } from '@/content/schema';
import { b_descanso, b_ronda1, b_ronda2, campanaBase, conEscena, conOpcion } from './base';

// Un next apunta a una escena que no existe.
export const rotaR01Target: Campaign = conEscena(campanaBase, conOpcion(b_descanso, { id: 'volver', label: 'Volver a la plaza', outcome: { next: 'b_no_existe' } }));

// Ciclo de redirects entre dos escenas sin onEnter: b_ronda1 → b_ronda2 → b_ronda1.
export const rotaR01Ciclo: Campaign = conEscena(
  conEscena(campanaBase, { ...b_ronda1, redirect: [{ when: { clock: 'b_pelea', gte: 1 }, to: 'b_ronda2' }] }),
  { ...b_ronda2, redirect: [{ when: { flag: 'run:b_hablo' }, to: 'b_ronda1' }] },
);
```

Crear `tests/fixtures/campaigns/broken/r02.ts`:

```ts
import type { Campaign, Scene } from '@/content/schema';
import { b_cripta, b_descanso, campanaBase, conEscena, conOpcion, opcion } from './base';

// Escena válida a la que nadie apunta.
const b_aislada: Scene = {
  id: 'b_aislada', kind: 'normal', place: 'b_plaza', text: ['Nadie llega acá.'],
  choices: [
    { id: 'a', label: 'Volver', outcome: { next: 'b_inicio' } },
    { id: 'b', label: 'Descansar', outcome: { next: 'b_descanso' } },
    { id: 'c', label: 'Pelear', outcome: { next: 'b_ronda1' } },
    { id: 'd', label: 'Bajar', outcome: { next: 'b_cripta' } },
  ],
};
export const rotaR02Aislada: Campaign = conEscena(campanaBase, b_aislada);

// fin_b solo se alcanza con { class: 'mago' }: la cripta ya no manda a fin_b y la salida del descanso exige mago.
const criptaSinFinB: Scene = conOpcion(
  conOpcion(b_cripta, { ...opcion(b_cripta, 'cruzar'), roll: { attr: 'vigor', difficulty: 'muy_dificil', tags: ['fisico'], outcomes: {
    success: { next: 'b_fin_a' }, partial: { effects: [{ wound: 1 }], next: 'b_fin_a' }, failure: { effects: [{ lethal: true }], next: 'b_descanso' } } } }),
  { ...opcion(b_cripta, 'conjurar'), roll: { attr: 'saber', difficulty: 'dificil', tags: ['magia'], outcomes: {
    success: { effects: [{ set: 'char:base.recuerdo' }], next: 'b_fin_a' }, partial: { effects: [{ addCondition: 'agotado' }], next: 'b_fin_a' }, failure: { effects: [{ lethal: true }], next: 'b_descanso' } } } },
);
export const rotaR02SoloMago: Campaign = conEscena(
  conEscena(campanaBase, criptaSinFinB),
  conOpcion(b_descanso, { ...opcion(b_descanso, 'irse'), requires: { class: 'mago' }, lockedHint: 'Solo un mago conoce el camino' }),
);
```

- [ ] **Paso 8: Escribir el test que falla** → crear `tests/tools/validate.test.ts` completo (en los ciclos siguientes se le agregan bloques `describe` al final y líneas de import arriba):

```ts
import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/content/schema';
import { RULES, validateCampaign, type ValidateContext, type ValidationIssue } from '../../tools/lib/validate/index';
import { campanaBase, mundoDePrueba } from '../fixtures/campaigns/broken/base';
import { rotaR01Ciclo, rotaR01Target } from '../fixtures/campaigns/broken/r01';
import { rotaR02Aislada, rotaR02SoloMago } from '../fixtures/campaigns/broken/r02';

export const ctx = (profile: 'smoke' | 'release' = 'release'): ValidateContext => ({ world: mundoDePrueba, profile });
export const reglas = (issues: ValidationIssue[]): string[] => [...new Set(issues.filter((i) => i.level === 'error').map((i) => i.rule))].sort();
export const soloRegla = (campaign: Campaign, rule: string, profile: 'smoke' | 'release' = 'release'): ValidationIssue[] => {
  const issues = validateCampaign(campaign, ctx(profile));
  expect(reglas(issues)).toEqual([rule]);
  return issues;
};

describe('validateCampaign: esquema y campaña base', () => {
  it('la campaña base pasa sin errores en release', () => {
    expect(validateCampaign(campanaBase, ctx('release'))).toEqual([]);
  });
  it('si zod falla devuelve un único error rule schema y no corre reglas', () => {
    const rota = { ...campanaBase, levelRange: 'uno' } as unknown as Campaign;
    const issues = validateCampaign(rota, ctx());
    expect(issues).toHaveLength(1);
    expect(issues[0]?.rule).toBe('schema');
    expect(issues[0]?.level).toBe('error');
    expect(issues[0]?.message).toContain('levelRange');
  });
  it('RULES expone las diez reglas en orden', () => {
    expect(Object.keys(RULES)).toEqual(['r01_targets', 'r02_reach', 'r03_choices', 'r04_choice_shape', 'r05_lethal', 'r06_encounter', 'r07_ids', 'r08_memory_frame', 'r09_extreme', 'r10_todo']);
  });
  it('no muta la campaña', () => {
    const antes = JSON.stringify(campanaBase);
    validateCampaign(campanaBase, ctx());
    expect(JSON.stringify(campanaBase)).toBe(antes);
  });
});

describe('r01_targets', () => {
  it('next inexistente', () => {
    const issues = soloRegla(rotaR01Target, 'r01_targets');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_descanso');
    expect(issues[0]?.message).toContain('b_no_existe');
  });
  it('start inexistente', () => {
    const issues = RULES.r01_targets?.({ ...campanaBase, start: 'nada' }, ctx()) ?? [];
    expect(issues.map((i) => i.message)).toEqual(['start apunta a una escena inexistente: nada']);
  });
  it('ciclo de redirects sin efectos entre medio', () => {
    const issues = soloRegla(rotaR01Ciclo, 'r01_targets');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('b_ronda1 → b_ronda2 → b_ronda1');
  });
});

describe('r02_reach', () => {
  it('escena inalcanzable desde start', () => {
    const issues = soloRegla(rotaR02Aislada, 'r02_reach');
    expect(issues.map((i) => i.sceneId)).toEqual(['b_aislada']);
  });
  it('final alcanzable solo con mago falla para las otras tres clases', () => {
    const issues = soloRegla(rotaR02SoloMago, 'r02_reach');
    expect(issues).toHaveLength(3);
    expect(issues.every((i) => i.sceneId === 'b_fin_b')).toBe(true);
    const texto = issues.map((i) => i.message).join('\n');
    expect(texto).toContain('Guerrero');
    expect(texto).toContain('Explorador');
    expect(texto).toContain('Clérigo');
    expect(texto).not.toContain('Mago');
  });
});
```

- [ ] **Paso 9: Correr el test y verificar que falla**

```bash
npx vitest run tests/tools/validate.test.ts
```

Error esperado: `Failed to resolve import "../../tools/lib/validate/index"`.

- [ ] **Paso 10: Implementación mínima** → crear `tools/lib/validate/rules/r01_targets.ts`:

```ts
import type { Campaign, Scene } from '@/content/schema';
import { sceneEdges, type Edge } from '../reach';
import { error, type Rule, type ValidationIssue } from '../types';
import { has } from '../walk';

const RULE = 'r01_targets';

function describeEdge(e: Edge): string {
  if (e.via === 'redirect') return 'redirect.to';
  if (e.via === 'outcome') return `la opción ${e.choiceId ?? '?'} (outcome.next)`;
  return `la opción ${e.choiceId ?? '?'} (outcome de tirada)`;
}

function redirectCycles(campaign: Campaign): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const reported = new Set<string>();
  const color = new Map<string, 'gris' | 'negro'>();
  const stack: string[] = [];

  const visit = (id: string): void => {
    if (color.get(id) === 'negro') return;
    if (color.get(id) === 'gris') {
      const cycle = stack.slice(stack.indexOf(id));
      const key = [...cycle].sort().join(',');
      if (reported.has(key)) return;
      reported.add(key);
      const conEfectos = cycle.some((s) => ((campaign.scenes[s] as Scene).onEnter?.length ?? 0) > 0);
      if (!conEfectos) {
        issues.push(error(RULE, `Ciclo de redirects sin efectos entre medio: ${[...cycle, id].join(' → ')}`, id));
      }
      return;
    }
    color.set(id, 'gris');
    stack.push(id);
    const scene = campaign.scenes[id] as Scene;
    for (const r of scene.redirect ?? []) if (has(campaign.scenes, r.to)) visit(r.to);
    stack.pop();
    color.set(id, 'negro');
  };

  for (const id of Object.keys(campaign.scenes)) visit(id);
  return issues;
}

export const r01_targets: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  if (!has(campaign.scenes, campaign.start)) {
    issues.push(error(RULE, `start apunta a una escena inexistente: ${campaign.start}`));
  }
  for (const scene of Object.values(campaign.scenes)) {
    for (const e of sceneEdges(scene)) {
      if (!has(campaign.scenes, e.to)) issues.push(error(RULE, `${describeEdge(e)} apunta a una escena inexistente: ${e.to}`, scene.id));
    }
  }
  return [...issues, ...redirectCycles(campaign)];
};
```

Crear `tools/lib/validate/rules/r02_reach.ts`:

```ts
import { CLASSES, type ClassId } from '@/content/catalog';
import { reachableScenes } from '../reach';
import { error, type Rule, type ValidationIssue } from '../types';

const RULE = 'r02_reach';

export const r02_reach: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  const desdeStart = reachableScenes(campaign, null);
  const inalcanzables = new Set<string>();
  for (const id of Object.keys(campaign.scenes)) {
    if (!desdeStart.has(id)) {
      inalcanzables.add(id);
      issues.push(error(RULE, `La escena ${id} no es alcanzable desde start (${campaign.start})`, id));
    }
  }
  const finales = Object.values(campaign.scenes).filter((s) => s.kind === 'ending' && !inalcanzables.has(s.id));
  for (const classId of Object.keys(CLASSES) as ClassId[]) {
    const alcance = reachableScenes(campaign, classId);
    for (const scene of finales) {
      if (!alcance.has(scene.id)) {
        issues.push(error(RULE, `El final ${scene.ending?.id ?? scene.id} (escena ${scene.id}) no es alcanzable para la clase ${CLASSES[classId].name}`, scene.id));
      }
    }
  }
  return issues;
};
```

Crear `tools/lib/validate/index.ts` (por ahora con dos reglas; se completa en los ciclos siguientes, siempre mostrando el archivo entero):

```ts
import { z } from 'zod';
import { CampaignSchema, type Campaign } from '@/content/schema';
import { r01_targets } from './rules/r01_targets';
import { r02_reach } from './rules/r02_reach';
import type { Rule, ValidateContext, ValidationIssue } from './types';

export type { Rule, ValidateContext, ValidationIssue } from './types';

export const RULES: Record<string, Rule> = {
  r01_targets,
  r02_reach,
};

export function validateCampaign(campaign: Campaign, ctx: ValidateContext): ValidationIssue[] {
  const parsed = CampaignSchema.safeParse(campaign);
  if (!parsed.success) {
    return [{ level: 'error', rule: 'schema', message: z.prettifyError(parsed.error) }];
  }
  return Object.values(RULES).flatMap((rule) => rule(campaign, ctx));
}
```

- [ ] **Paso 11: Correr el test y verificar que pasa parcialmente**

```bash
npx vitest run tests/tools/validate.test.ts
```

Resultado esperado: pasan los 9 tests menos `RULES expone las diez reglas en orden` (espera diez claves y hay dos). Es el único rojo y se pone verde en el ciclo 5.

- [ ] **Paso 12: Commit**

```bash
git add tests/fixtures/campaigns/broken/base.ts tests/fixtures/campaigns/broken/r01.ts tests/fixtures/campaigns/broken/r02.ts tests/tools/validate.test.ts tools/lib/validate/index.ts tools/lib/validate/rules/r01_targets.ts tools/lib/validate/rules/r02_reach.ts
git commit -m "feat(validate): validateCampaign con esquema zod, reglas r01 (targets) y r02 (alcanzabilidad) con fixtures

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: r03 (opciones), r04 (forma de la opción) y r05 (escenas mortales)

- [ ] **Paso 13: Crear los fixtures rotos de r03, r04 y r05** → crear `tests/fixtures/campaigns/broken/r03.ts`:

```ts
import type { Campaign } from '@/content/schema';
import { b_fin_a, b_inicio, campanaBase, conEscena, opcion, sinOpcion } from './base';

// Tres opciones en total, las tres libres: dos issues (total y libres) en smoke y en release.
export const rotaR03Pocas: Campaign = conEscena(campanaBase, sinOpcion(sinOpcion(b_inicio, 'hablar'), 'recordar'));

// Un final con una opción. zod la rechaza en validateCampaign (refine de SceneSchema: 'Una escena de tipo ending
// no puede tener opciones'); la regla r03 se prueba llamándola directo.
export const rotaR03FinalConOpciones: Campaign = conEscena(campanaBase, { ...b_fin_a, choices: [{ id: 'volver', label: 'Volver', outcome: { next: 'b_inicio' } }] });

// Cinco opciones pero solo tres libres: falla en ambos perfiles (el mínimo de libres no depende del perfil).
export const rotaR03PocasLibres: Campaign = conEscena(campanaBase, {
  ...sinOpcion(b_inicio, 'hablar'),
  choices: [
    ...sinOpcion(b_inicio, 'hablar').choices,
    { ...opcion(b_inicio, 'hablar'), id: 'hablar_recuerdo', requires: { flag: 'char:base.recuerdo' }, lockedHint: 'No lo recordás' },
  ],
});
```

Crear `tests/fixtures/campaigns/broken/r04.ts`:

```ts
import type { Campaign } from '@/content/schema';
import { b_inicio, campanaBase, conEscena, conOpcion } from './base';

// Una opción con roll y outcome a la vez. zod la rechaza en validateCampaign (refine de ChoiceSchema: 'Una opción
// debe tener exactamente uno de roll u outcome'); la regla r04 se prueba llamándola directo.
export const rotaR04Ambos: Campaign = conEscena(campanaBase, conOpcion(b_inicio, {
  id: 'descansar', label: 'Buscar refugio',
  outcome: { next: 'b_descanso' },
  roll: { attr: 'vigor', difficulty: 'normal', tags: ['fisico'], outcomes: { success: { next: 'b_descanso' }, partial: { next: 'b_descanso' }, failure: { next: 'b_descanso' } } },
}));
```

Crear `tests/fixtures/campaigns/broken/r05.ts`:

```ts
import type { Campaign, Choice, Outcome } from '@/content/schema';
import { b_cripta, b_inicio, campanaBase, conEscena, conOpcion, opcion } from './base';

const hablarCon = (failure: Outcome): Choice => ({
  ...opcion(b_inicio, 'hablar'),
  roll: { attr: 'presencia', difficulty: 'normal', tags: ['social'], outcomes: {
    success: { effects: [{ set: 'run:b_hablo' }, { give: 'b_llave' }], next: 'b_fin_a' },
    partial: { effects: [{ addCondition: 'asustado' }], next: 'b_fin_a' },
    failure,
  } },
});

// { lethal: true } en una escena que no es lethal.
export const rotaR05LethalFuera: Campaign = conEscena(campanaBase, conOpcion(b_inicio, hablarCon({ effects: [{ lethal: true }], next: 'b_inicio' })));

// Un outcome de tirada apunta a la escena mortal.
export const rotaR05EntradaPorTirada: Campaign = conEscena(campanaBase, conOpcion(b_inicio, hablarCon({ next: 'b_cripta' })));

// meta.lethalScenes no coincide con la cantidad de escenas lethal.
export const rotaR05Conteo: Campaign = { ...campanaBase, lethalScenes: 2 };

// La escena mortal solo tiene tiradas con tag fisico.
export const rotaR05SoloFisico: Campaign = conEscena(campanaBase, conOpcion(
  conOpcion(b_cripta, { ...opcion(b_cripta, 'conjurar'), roll: { ...opcion(b_cripta, 'conjurar').roll!, tags: ['fisico'] } }),
  { ...opcion(b_cripta, 'tantear'), roll: { ...opcion(b_cripta, 'tantear').roll!, tags: ['fisico'] } },
));
```

- [ ] **Paso 14: Escribir el test que falla** → agregar arriba de `tests/tools/validate.test.ts`, junto a los otros imports de fixtures:

```ts
import { rotaR03FinalConOpciones, rotaR03Pocas, rotaR03PocasLibres } from '../fixtures/campaigns/broken/r03';
import { rotaR04Ambos } from '../fixtures/campaigns/broken/r04';
import { rotaR05Conteo, rotaR05EntradaPorTirada, rotaR05LethalFuera, rotaR05SoloFisico } from '../fixtures/campaigns/broken/r05';
```

y agregar al final del archivo:

```ts
describe('r03_choices', () => {
  it('menos de LIMITS.minChoices opciones: dos issues (total y libres) en smoke y en release', () => {
    expect(soloRegla(rotaR03Pocas, 'r03_choices', 'smoke').map((i) => i.sceneId)).toEqual(['b_inicio', 'b_inicio']);
    expect(soloRegla(rotaR03Pocas, 'r03_choices', 'release').map((i) => i.sceneId)).toEqual(['b_inicio', 'b_inicio']);
  });
  it('un final con opciones (zod lo rechaza antes; la regla se prueba directo)', () => {
    expect(validateCampaign(rotaR03FinalConOpciones, ctx())[0]?.rule).toBe('schema');
    const issues = RULES.r03_choices?.(rotaR03FinalConOpciones, ctx()) ?? [];
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_fin_a');
    expect(issues[0]?.message).toContain('0 opciones');
  });
  it('pocas opciones libres: falla en release y en smoke', () => {
    const issues = soloRegla(rotaR03PocasLibres, 'r03_choices', 'release');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('sin requires');
    expect(soloRegla(rotaR03PocasLibres, 'r03_choices', 'smoke')).toHaveLength(1);
  });
});

describe('r04_choice_shape', () => {
  it('opción con roll y outcome a la vez (zod lo rechaza antes; la regla se prueba directo)', () => {
    expect(validateCampaign(rotaR04Ambos, ctx())[0]?.rule).toBe('schema');
    const issues = RULES.r04_choice_shape?.(rotaR04Ambos, ctx()) ?? [];
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
    expect(issues[0]?.message).toContain('descansar');
  });
  it('opción sin roll ni outcome y tirada sin failure', () => {
    const sinNada = { ...campanaBase.scenes.b_inicio!, choices: campanaBase.scenes.b_inicio!.choices.map((c) => (c.id === 'descansar' ? { id: 'descansar', label: 'Buscar refugio' } : c)) };
    const rota = { ...campanaBase, scenes: { ...campanaBase.scenes, b_inicio: sinNada } } as unknown as Campaign;
    const issues = RULES.r04_choice_shape?.(rota, ctx()) ?? [];
    expect(issues.map((i) => i.message)).toEqual(['La opción descansar debe tener exactamente uno de roll u outcome (tiene ninguno)']);
  });
});

describe('r05_lethal', () => {
  it('lethal fuera de una escena lethal', () => {
    const issues = soloRegla(rotaR05LethalFuera, 'r05_lethal');
    expect(issues.map((i) => i.sceneId)).toEqual(['b_inicio']);
  });
  it('entrada a la escena mortal por outcome de tirada', () => {
    const issues = soloRegla(rotaR05EntradaPorTirada, 'r05_lethal');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
    expect(issues[0]?.message).toContain('b_cripta');
  });
  it('lethalScenes no coincide', () => {
    const issues = soloRegla(rotaR05Conteo, 'r05_lethal');
    expect(issues[0]?.message).toContain('lethalScenes');
    expect(issues[0]?.sceneId).toBeUndefined();
  });
  it('sin tirada que no sea fisico', () => {
    const issues = soloRegla(rotaR05SoloFisico, 'r05_lethal');
    expect(issues.map((i) => i.sceneId)).toEqual(['b_cripta']);
    expect(issues[0]?.message).toContain('fisico');
  });
});
```

- [ ] **Paso 15: Correr el test y verificar que falla**

```bash
npx vitest run tests/tools/validate.test.ts
```

Error esperado: los tests que pasan por `soloRegla` fallan con `expected [] to deeply equal [ 'r03_choices' ]` (y análogo para r05), porque las reglas no existen y `validateCampaign` devuelve `[]`; los que llaman a la regla directo (`un final con opciones`, los dos de r04) fallan con `expected [] to have a length of 1` o `expected [] to deeply equal [ 'La opción descansar …' ]`, porque `RULES.r03_choices` y `RULES.r04_choice_shape` son `undefined` y el `?? []` devuelve vacío.

- [ ] **Paso 16: Implementación mínima** → crear `tools/lib/validate/rules/r03_choices.ts`:

```ts
import { LIMITS } from '@/content/catalog';
import { error, type Rule, type ValidationIssue } from '../types';

const RULE = 'r03_choices';

// El mínimo de opciones libres es el mismo en smoke y en release (contrato, sección J).
export const r03_choices: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  for (const scene of Object.values(campaign.scenes)) {
    const total = scene.choices.length;
    if (scene.kind === 'ending') {
      if (total !== 0) issues.push(error(RULE, `La escena final ${scene.id} debe tener 0 opciones y tiene ${total}`, scene.id));
      continue;
    }
    if (total < LIMITS.minChoices || total > LIMITS.maxChoices) {
      issues.push(error(RULE, `La escena ${scene.id} tiene ${total} opciones; debe tener entre ${LIMITS.minChoices} y ${LIMITS.maxChoices}`, scene.id));
    }
    const libres = scene.choices.filter((c) => c.requires === undefined).length;
    if (libres < LIMITS.minChoices) {
      issues.push(error(RULE, `La escena ${scene.id} tiene ${libres} opciones sin requires; debe tener al menos ${LIMITS.minChoices}`, scene.id));
    }
  }
  return issues;
};
```

Crear `tools/lib/validate/rules/r04_choice_shape.ts`:

```ts
import type { Roll } from '@/content/schema';
import { error, type Rule, type ValidationIssue } from '../types';

const RULE = 'r04_choice_shape';

export const r04_choice_shape: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  for (const scene of Object.values(campaign.scenes)) {
    for (const choice of scene.choices) {
      const tieneRoll = choice.roll !== undefined;
      const tieneOutcome = choice.outcome !== undefined;
      if (tieneRoll === tieneOutcome) {
        issues.push(error(RULE, `La opción ${choice.id} debe tener exactamente uno de roll u outcome (tiene ${tieneRoll ? 'los dos' : 'ninguno'})`, scene.id));
      }
      if (choice.roll) {
        const outcomes: Partial<Roll['outcomes']> = choice.roll.outcomes;
        for (const banda of ['success', 'partial', 'failure'] as const) {
          if (outcomes[banda] === undefined) issues.push(error(RULE, `La tirada de la opción ${choice.id} no tiene outcome ${banda}`, scene.id));
        }
      }
    }
  }
  return issues;
};
```

Crear `tools/lib/validate/rules/r05_lethal.ts`:

```ts
import { sceneEdges } from '../reach';
import { error, type Rule, type ValidationIssue } from '../types';
import { choiceOutcomes, has, outcomeHasLethal, rollOutcomes } from '../walk';

const RULE = 'r05_lethal';

export const r05_lethal: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  const escenas = Object.values(campaign.scenes);
  const mortales = new Set(escenas.filter((s) => s.lethal === true).map((s) => s.id));

  for (const scene of escenas) {
    if ((scene.onEnter ?? []).some((e) => 'lethal' in e)) {
      issues.push(error(RULE, `onEnter de ${scene.id} usa { lethal: true }; solo va en outcomes de tirada de escenas lethal`, scene.id));
    }
    for (const choice of scene.choices) {
      if (choice.outcome && outcomeHasLethal(choice.outcome)) {
        issues.push(error(RULE, `La opción ${choice.id} sin tirada usa { lethal: true }; solo va en outcomes de tirada de escenas lethal`, scene.id));
      }
      if (!scene.lethal && rollOutcomes(choice).some(outcomeHasLethal)) {
        issues.push(error(RULE, `La opción ${choice.id} usa { lethal: true } pero la escena ${scene.id} no es lethal`, scene.id));
      }
    }
    for (const e of sceneEdges(scene)) {
      if (mortales.has(e.to) && e.via !== 'outcome') {
        const via = e.via === 'redirect' ? 'un redirect' : `un outcome de tirada (opción ${e.choiceId ?? '?'})`;
        issues.push(error(RULE, `A la escena mortal ${e.to} se entra por ${via}; solo se entra por outcome.next de una opción sin tirada`, scene.id));
      }
    }
  }

  for (const id of mortales) {
    if (!has(campaign.scenes, id)) continue;
    const scene = campaign.scenes[id];
    if (!scene) continue;
    const sinLethal = scene.choices.some((c) => !choiceOutcomes(c).some(outcomeHasLethal));
    if (!sinLethal) issues.push(error(RULE, `La escena mortal ${id} no tiene ninguna opción sin { lethal: true } en sus outcomes`, id));
    const noFisico = scene.choices.some((c) => c.roll !== undefined && !c.roll.tags.includes('fisico'));
    if (!noFisico) issues.push(error(RULE, `La escena mortal ${id} no tiene ninguna opción con tirada cuyos tags no incluyan fisico`, id));
  }

  if (campaign.lethalScenes !== mortales.size) {
    issues.push(error(RULE, `meta.lethalScenes es ${campaign.lethalScenes} pero hay ${mortales.size} escenas lethal`));
  }
  return issues;
};
```

Modificar `tools/lib/validate/index.ts` (archivo entero):

```ts
import { z } from 'zod';
import { CampaignSchema, type Campaign } from '@/content/schema';
import { r01_targets } from './rules/r01_targets';
import { r02_reach } from './rules/r02_reach';
import { r03_choices } from './rules/r03_choices';
import { r04_choice_shape } from './rules/r04_choice_shape';
import { r05_lethal } from './rules/r05_lethal';
import type { Rule, ValidateContext, ValidationIssue } from './types';

export type { Rule, ValidateContext, ValidationIssue } from './types';

export const RULES: Record<string, Rule> = {
  r01_targets,
  r02_reach,
  r03_choices,
  r04_choice_shape,
  r05_lethal,
};

export function validateCampaign(campaign: Campaign, ctx: ValidateContext): ValidationIssue[] {
  const parsed = CampaignSchema.safeParse(campaign);
  if (!parsed.success) {
    return [{ level: 'error', rule: 'schema', message: z.prettifyError(parsed.error) }];
  }
  return Object.values(RULES).flatMap((rule) => rule(campaign, ctx));
}
```

- [ ] **Paso 17: Correr el test y verificar que pasa**

```bash
npx vitest run tests/tools/validate.test.ts
```

Resultado esperado: todos en verde salvo `RULES expone las diez reglas en orden` (sigue esperando diez claves).

- [ ] **Paso 18: Commit**

```bash
git add tests/fixtures/campaigns/broken/r03.ts tests/fixtures/campaigns/broken/r04.ts tests/fixtures/campaigns/broken/r05.ts tests/tools/validate.test.ts tools/lib/validate/index.ts tools/lib/validate/rules/r03_choices.ts tools/lib/validate/rules/r04_choice_shape.ts tools/lib/validate/rules/r05_lethal.ts
git commit -m "feat(validate): reglas r03 (cantidad y opciones libres), r04 (forma de la opción) y r05 (escenas mortales)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: r06 (encuentros), r07 (ids declarados) y r08 (marco de memoria)

- [ ] **Paso 19: Crear los fixtures rotos de r06, r07 y r08** → crear `tests/fixtures/campaigns/broken/r06.ts`:

```ts
import type { Campaign, Choice } from '@/content/schema';
import { b_ronda1, b_ronda2, campanaBase, conEscena, conOpcion, opcion } from './base';

const conAtributo = (choice: Choice, attr: 'vigor' | 'astucia'): Choice => ({ ...choice, roll: { ...choice.roll!, attr } });

// Ronda 1 con todas las tiradas de Vigor.
export const rotaR06UnAtributo: Campaign = conEscena(campanaBase, conOpcion(
  conOpcion(b_ronda1, conAtributo(opcion(b_ronda1, 'enganar'), 'vigor')),
  conAtributo(opcion(b_ronda1, 'huir'), 'vigor'),
));

// Ronda 1 sin ninguna tirada con tag huida.
export const rotaR06SinHuida: Campaign = conEscena(campanaBase, conOpcion(b_ronda1, { ...opcion(b_ronda1, 'huir'), roll: { ...opcion(b_ronda1, 'huir').roll!, tags: ['sigilo'] } }));

// Ronda 2 sin redirect y sin ninguna opción con requires sobre el estado.
const { redirect: _redirect, ...ronda2SinRedirect } = b_ronda2;
const { requires: _requires, lockedHint: _hint, ...rematarLibre } = opcion(b_ronda2, 'rematar');
export const rotaR06RondaSinEstado: Campaign = conEscena(campanaBase, conOpcion(ronda2SinRedirect, rematarLibre));
```

Crear `tests/fixtures/campaigns/broken/r07.ts`:

```ts
import type { Campaign } from '@/content/schema';
import { b_inicio, campanaBase, conEscena, conOpcion, mundoDePrueba, opcion } from './base';

// set de un flag que no está declarado.
export const rotaR07FlagNoDeclarado: Campaign = conEscena(campanaBase, conOpcion(b_inicio, {
  ...opcion(b_inicio, 'hablar'),
  roll: { attr: 'presencia', difficulty: 'normal', tags: ['social'], outcomes: {
    success: { effects: [{ set: 'run:b_inventado' }], next: 'b_fin_a' },
    partial: { next: 'b_fin_a' },
    failure: { next: 'b_inicio' } } },
}));

// El speaker b_guia no está en npcs de la escena.
export const rotaR07SpeakerFuera: Campaign = conEscena(campanaBase, { ...b_inicio, npcs: [] });

// relic en un objeto de la campaña.
export const rotaR07Reliquia: Campaign = { ...campanaBase, items: { b_llave: { ...campanaBase.items.b_llave!, relic: true } } };

// La campaña redefine un PNJ de world.
export const rotaR07RedefineMundo: Campaign = { ...campanaBase, npcs: { ...campanaBase.npcs, viajero: { ...mundoDePrueba.npcs.viajero!, name: 'Otro viajero' } } };

// Flag char: declarado con el prefijo de otra campaña.
export const rotaR07Prefijo: Campaign = { ...campanaBase, flags: { ...campanaBase.flags, 'char:otra.cosa': 'Flag de otra campaña' } };
```

Crear `tests/fixtures/campaigns/broken/r08.ts`:

```ts
import type { Campaign } from '@/content/schema';
import { b_inicio, campanaBase, conEscena } from './base';

// Un PNJ de la campaña recuerda otra partida (met en un párrafo con speaker local).
export const rotaR08PnjRecuerda: Campaign = conEscena(campanaBase, { ...b_inicio, text: [
  'Llegás a la plaza con la lluvia en la nuca.',
  { speaker: 'b_guia', variants: [
    { when: { met: 'b_guia' }, text: '—Otra vez vos.' },
    { text: '—Bienvenido.' } ] },
] });

// Un párrafo cuya última variante tiene when.
export const rotaR08SinDefecto: Campaign = conEscena(campanaBase, { ...b_inicio, text: [
  'Llegás a la plaza con la lluvia en la nuca.',
  { variants: [
    { when: { visited: 'b_inicio', min: 1 }, text: 'Otra vez la plaza.' },
    { when: { knows: 'b_plaza' }, text: 'Conocés esta plaza.' } ] },
] });
```

- [ ] **Paso 20: Escribir el test que falla** → agregar a los imports de `tests/tools/validate.test.ts`:

```ts
import { rotaR06RondaSinEstado, rotaR06SinHuida, rotaR06UnAtributo } from '../fixtures/campaigns/broken/r06';
import { rotaR07FlagNoDeclarado, rotaR07Prefijo, rotaR07RedefineMundo, rotaR07Reliquia, rotaR07SpeakerFuera } from '../fixtures/campaigns/broken/r07';
import { rotaR08PnjRecuerda, rotaR08SinDefecto } from '../fixtures/campaigns/broken/r08';
```

y agregar al final del archivo:

```ts
describe('r06_encounter', () => {
  it('un solo atributo', () => {
    const issues = soloRegla(rotaR06UnAtributo, 'r06_encounter');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_ronda1');
    expect(issues[0]?.message).toContain('atributo');
  });
  it('sin tirada de huida', () => {
    const issues = soloRegla(rotaR06SinHuida, 'r06_encounter');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('huida');
  });
  it('ronda posterior sin requires sobre el estado ni redirect', () => {
    const issues = soloRegla(rotaR06RondaSinEstado, 'r06_encounter');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_ronda2');
  });
});

describe('r07_ids', () => {
  it('flag no declarado', () => {
    const issues = soloRegla(rotaR07FlagNoDeclarado, 'r07_ids');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('run:b_inventado');
  });
  it('speaker fuera de npcs de la escena', () => {
    const issues = soloRegla(rotaR07SpeakerFuera, 'r07_ids');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('b_guia');
  });
  it('relic en la campaña', () => {
    expect(soloRegla(rotaR07Reliquia, 'r07_ids')[0]?.message).toContain('relic');
  });
  it('id de world redefinido', () => {
    expect(soloRegla(rotaR07RedefineMundo, 'r07_ids')[0]?.message).toContain('viajero');
  });
  it('prefijo de campaña incorrecto', () => {
    expect(soloRegla(rotaR07Prefijo, 'r07_ids')[0]?.message).toContain('char:otra.cosa');
  });
  it('acepta los espacios compartidos por prefijo', () => {
    const conMet = { ...campanaBase, scenes: { ...campanaBase.scenes, b_inicio: { ...campanaBase.scenes.b_inicio!, onEnter: [{ set: 'char:met.viajero' as const }, { set: 'world:caido.base' as const }] } } };
    expect(validateCampaign(conMet, ctx())).toEqual([]);
  });
});

describe('r08_memory_frame', () => {
  it('un PNJ de la campaña no puede recordar otra partida', () => {
    const issues = soloRegla(rotaR08PnjRecuerda, 'r08_memory_frame');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('met');
  });
  it('un PNJ de world sí puede (la campaña base lo hace con viajero)', () => {
    expect(validateCampaign(campanaBase, ctx())).toEqual([]);
  });
  it('todo párrafo termina en una variante sin when', () => {
    const issues = soloRegla(rotaR08SinDefecto, 'r08_memory_frame');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
  });
});
```

- [ ] **Paso 21: Correr el test y verificar que falla**

```bash
npx vitest run tests/tools/validate.test.ts
```

Error esperado: los tests nuevos de r06, r07 y r08 fallan con `expected [] to deeply equal [ 'r06_encounter' ]` (y análogos).

- [ ] **Paso 22: Implementación mínima** → crear `tools/lib/validate/rules/r06_encounter.ts`:

```ts
import { sceneEdges } from '../reach';
import { error, type Rule, type ValidationIssue } from '../types';
import { walkCondition } from '../walk';

const RULE = 'r06_encounter';

export const r06_encounter: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  const encuentros = Object.values(campaign.scenes).filter((s) => s.kind === 'encounter');
  const rondasPosteriores = new Set<string>();
  for (const s of encuentros) for (const e of sceneEdges(s)) if (e.to !== s.id) rondasPosteriores.add(e.to);

  for (const scene of encuentros) {
    const rolls = scene.choices.flatMap((c) => (c.roll ? [c.roll] : []));
    const atributos = new Set(rolls.map((r) => r.attr));
    if (atributos.size < 2) {
      issues.push(error(RULE, `El encuentro ${scene.id} ofrece ${atributos.size} atributo(s) distinto(s) en sus tiradas; necesita al menos 2`, scene.id));
    }
    if (!scene.choices.some((c) => c.roll === undefined)) {
      issues.push(error(RULE, `El encuentro ${scene.id} no tiene ninguna opción sin tirada`, scene.id));
    }
    if (!rolls.some((r) => r.tags.includes('huida'))) {
      issues.push(error(RULE, `El encuentro ${scene.id} no tiene ninguna tirada con tag huida`, scene.id));
    }
    if (rondasPosteriores.has(scene.id)) {
      const usaEstado = scene.choices.some((c) => {
        let ok = false;
        walkCondition(c.requires, (leaf) => {
          if ('clock' in leaf || 'wounds' in leaf || ('flag' in leaf && leaf.flag.startsWith('run:'))) ok = true;
        });
        return ok;
      });
      const tieneRedirect = (scene.redirect ?? []).length > 0;
      if (!usaEstado && !tieneRedirect) {
        issues.push(error(RULE, `La ronda ${scene.id} sigue a otro encuentro y no tiene ni opción con requires sobre reloj, Heridas o flag run: ni redirect`, scene.id));
      }
    }
  }
  return issues;
};
```

Crear `tools/lib/validate/rules/r07_ids.ts`:

```ts
import { CLASSES, CONDITIONS, SKILLS, TAGS, TRAITS } from '@/content/catalog';
import { error, type Rule, type ValidationIssue } from '../types';
import { has, paragraphsOf, sceneConditions, sceneEffects, sceneTexts, walkCondition } from '../walk';

const RULE = 'r07_ids';
const SHARED_PREFIXES = ['char:met.', 'char:place.', 'char:origen.', 'world:caido.'];
const SHARED_EXACT = ['char:leyenda'];

export function isSharedFlag(flag: string): boolean {
  return SHARED_EXACT.includes(flag) || SHARED_PREFIXES.some((p) => flag.startsWith(p));
}

function prefijoCorrecto(flag: string, campaignId: string): boolean {
  if (flag.startsWith('run:') || isSharedFlag(flag)) return true;
  if (flag.startsWith('char:')) return flag.startsWith(`char:${campaignId}.`);
  if (flag.startsWith('world:')) return flag.startsWith(`world:${campaignId}.`);
  return false;
}

export const r07_ids: Rule = (campaign, ctx) => {
  const issues: ValidationIssue[] = [];
  const { world } = ctx;
  const push = (message: string, sceneId?: string): void => { issues.push(error(RULE, message, sceneId)); };
  const existe = (col: 'npcs' | 'places' | 'items', id: string): boolean => has(campaign[col], id) || has(world[col], id);
  const flagOk = (flag: string, sceneId: string): void => {
    if (!(has(campaign.flags, flag) || has(world.flags, flag) || isSharedFlag(flag))) {
      push(`El flag ${flag} no está declarado en campaign.flags ni en world.flags`, sceneId);
    } else if (!prefijoCorrecto(flag, campaign.id)) {
      push(`El flag ${flag} debe llevar el prefijo de la campaña (char:${campaign.id}. o world:${campaign.id}.)`, sceneId);
    }
  };

  for (const flag of Object.keys(campaign.flags)) {
    if (!prefijoCorrecto(flag, campaign.id)) push(`El flag declarado ${flag} debe llevar el prefijo de la campaña (char:${campaign.id}. o world:${campaign.id}.)`);
  }
  for (const col of ['npcs', 'places', 'items'] as const) {
    for (const id of Object.keys(campaign[col])) if (has(world[col], id)) push(`El id ${id} de ${col} ya existe en world y la campaña no puede redefinirlo`);
  }
  for (const [id, item] of Object.entries(campaign.items)) {
    if (item.relic) push(`El objeto ${id} es relic; las reliquias solo se declaran en world.items`);
  }

  for (const scene of Object.values(campaign.scenes)) {
    const sid = scene.id;
    if (!existe('places', scene.place)) push(`El lugar ${scene.place} no existe en la campaña ni en world`, sid);
    for (const npc of scene.npcs ?? []) if (!existe('npcs', npc)) push(`El PNJ ${npc} no existe en la campaña ni en world`, sid);
    if (scene.kind === 'ending') {
      if (!scene.ending) push(`La escena final ${sid} no declara ending`, sid);
      else if (!has(campaign.endings, scene.ending.id)) push(`El final ${scene.ending.id} no está en campaign.endings`, sid);
    }
    for (const text of sceneTexts(scene)) {
      for (const p of paragraphsOf(text)) {
        if (p.speaker !== undefined && !(scene.npcs ?? []).includes(p.speaker)) push(`El speaker ${p.speaker} no está en npcs de la escena ${sid}`, sid);
      }
    }
    for (const effect of sceneEffects(scene)) {
      if ('set' in effect) flagOk(effect.set, sid);
      else if ('clear' in effect) flagOk(effect.clear, sid);
      else if ('give' in effect) { if (!existe('items', effect.give)) push(`El objeto ${effect.give} (give) no existe`, sid); }
      else if ('take' in effect) { if (!existe('items', effect.take)) push(`El objeto ${effect.take} (take) no existe`, sid); }
      else if ('addCondition' in effect) { if (!has(CONDITIONS, effect.addCondition)) push(`La condición ${effect.addCondition} no existe en el catálogo`, sid); }
      else if ('removeCondition' in effect) { if (effect.removeCondition !== 'all' && !has(CONDITIONS, effect.removeCondition)) push(`La condición ${effect.removeCondition} no existe en el catálogo`, sid); }
      else if ('clock' in effect) { if (!has(campaign.clocks, effect.clock)) push(`El reloj ${effect.clock} no está declarado en campaign.clocks`, sid); }
      else if ('milestone' in effect) { if (!has(campaign.milestones, effect.milestone)) push(`El hito ${effect.milestone} no está declarado en campaign.milestones`, sid); }
    }
    for (const cond of sceneConditions(scene)) {
      walkCondition(cond, (leaf) => {
        if ('flag' in leaf) flagOk(leaf.flag, sid);
        else if ('item' in leaf) { if (!existe('items', leaf.item)) push(`El objeto ${leaf.item} (condición item) no existe`, sid); }
        else if ('met' in leaf) { if (!existe('npcs', leaf.met)) push(`El PNJ ${leaf.met} (condición met) no existe`, sid); }
        else if ('knows' in leaf) { if (!existe('places', leaf.knows)) push(`El lugar ${leaf.knows} (condición knows) no existe`, sid); }
        else if ('clock' in leaf) { if (!has(campaign.clocks, leaf.clock)) push(`El reloj ${leaf.clock} (condición clock) no está declarado`, sid); }
        else if ('endingSeen' in leaf) { if (!has(campaign.endings, leaf.endingSeen)) push(`El final ${leaf.endingSeen} (condición endingSeen) no existe`, sid); }
        else if ('condition' in leaf) { if (!has(CONDITIONS, leaf.condition)) push(`La condición ${leaf.condition} no existe en el catálogo`, sid); }
        else if ('trait' in leaf) { if (!has(TRAITS, leaf.trait)) push(`El rasgo ${leaf.trait} no existe en el catálogo`, sid); }
        else if ('skill' in leaf) { if (!has(SKILLS, leaf.skill)) push(`La habilidad ${leaf.skill} no existe en el catálogo`, sid); }
        else if ('class' in leaf) { if (!has(CLASSES, leaf.class)) push(`La clase ${leaf.class} no existe en el catálogo`, sid); }
      });
    }
    for (const choice of scene.choices) {
      for (const tag of choice.roll?.tags ?? []) {
        if (!(TAGS as readonly string[]).includes(tag)) push(`El tag ${tag} de la opción ${choice.id} no existe en el catálogo`, sid);
      }
    }
  }
  return issues;
};
```

Crear `tools/lib/validate/rules/r08_memory_frame.ts`:

```ts
import type { TextVariant } from '@/content/schema';
import { error, type Rule, type ValidationIssue } from '../types';
import { has, paragraphsOf, sceneTexts, walkCondition } from '../walk';

const RULE = 'r08_memory_frame';

export const r08_memory_frame: Rule = (campaign, ctx) => {
  const issues: ValidationIssue[] = [];
  const prefijoLocal = `char:${campaign.id}.`;
  for (const scene of Object.values(campaign.scenes)) {
    for (const text of sceneTexts(scene)) {
      for (const p of paragraphsOf(text)) {
        const quien = p.speaker === undefined ? 'del narrador' : `de ${p.speaker}`;
        const ultima: TextVariant | undefined = p.variants[p.variants.length - 1];
        if (ultima === undefined || ultima.when !== undefined) {
          issues.push(error(RULE, `Un párrafo ${quien} en ${scene.id} no termina en una variante sin when`, scene.id));
        }
        const pnjLocal = p.speaker !== undefined && has(campaign.npcs, p.speaker) && !has(ctx.world.npcs, p.speaker);
        if (!pnjLocal) continue;
        for (const v of p.variants) {
          walkCondition(v.when, (leaf) => {
            let memoria: string | null = null;
            if ('met' in leaf) memoria = 'met';
            else if ('knows' in leaf) memoria = 'knows';
            else if ('endingSeen' in leaf) memoria = 'endingSeen';
            else if ('flag' in leaf && leaf.flag.startsWith(prefijoLocal)) memoria = `flag ${leaf.flag}`;
            if (memoria !== null) {
              issues.push(error(RULE, `El PNJ ${p.speaker ?? '?'} es de esta campaña y no puede recordar otra partida: variante con ${memoria} en ${scene.id}`, scene.id));
            }
          });
        }
      }
    }
  }
  return issues;
};
```

Modificar `tools/lib/validate/index.ts` (archivo entero):

```ts
import { z } from 'zod';
import { CampaignSchema, type Campaign } from '@/content/schema';
import { r01_targets } from './rules/r01_targets';
import { r02_reach } from './rules/r02_reach';
import { r03_choices } from './rules/r03_choices';
import { r04_choice_shape } from './rules/r04_choice_shape';
import { r05_lethal } from './rules/r05_lethal';
import { r06_encounter } from './rules/r06_encounter';
import { r07_ids } from './rules/r07_ids';
import { r08_memory_frame } from './rules/r08_memory_frame';
import type { Rule, ValidateContext, ValidationIssue } from './types';

export type { Rule, ValidateContext, ValidationIssue } from './types';

export const RULES: Record<string, Rule> = {
  r01_targets,
  r02_reach,
  r03_choices,
  r04_choice_shape,
  r05_lethal,
  r06_encounter,
  r07_ids,
  r08_memory_frame,
};

export function validateCampaign(campaign: Campaign, ctx: ValidateContext): ValidationIssue[] {
  const parsed = CampaignSchema.safeParse(campaign);
  if (!parsed.success) {
    return [{ level: 'error', rule: 'schema', message: z.prettifyError(parsed.error) }];
  }
  return Object.values(RULES).flatMap((rule) => rule(campaign, ctx));
}
```

- [ ] **Paso 23: Correr el test y verificar que pasa**

```bash
npx vitest run tests/tools/validate.test.ts
```

Resultado esperado: todo en verde salvo `RULES expone las diez reglas en orden` (faltan r09 y r10).

- [ ] **Paso 24: Commit**

```bash
git add tests/fixtures/campaigns/broken/r06.ts tests/fixtures/campaigns/broken/r07.ts tests/fixtures/campaigns/broken/r08.ts tests/tools/validate.test.ts tools/lib/validate/index.ts tools/lib/validate/rules/r06_encounter.ts tools/lib/validate/rules/r07_ids.ts tools/lib/validate/rules/r08_memory_frame.ts
git commit -m "feat(validate): reglas r06 (encuentros), r07 (ids declarados y prefijos) y r08 (marco de memoria)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 5: r09 (extrema), r10 (TODO), las diez reglas completas, `minimal.ts` y la campaña `prueba`

- [ ] **Paso 25: Crear los fixtures rotos de r09 y r10** → crear `tests/fixtures/campaigns/broken/r09.ts`:

```ts
import type { Campaign } from '@/content/schema';
import { b_inicio, campanaBase, conEscena, conOpcion, opcion } from './base';

// Dificultad extrema con levelRange[0] = 1.
export const rotaR09Extrema: Campaign = conEscena(campanaBase, conOpcion(b_inicio, {
  ...opcion(b_inicio, 'hablar'),
  roll: { ...opcion(b_inicio, 'hablar').roll!, difficulty: 'extrema' },
}));
```

Crear `tests/fixtures/campaigns/broken/r10.ts`:

```ts
import type { Campaign } from '@/content/schema';
import { b_inicio, campanaBase, conEscena } from './base';

// Un TODO residual en el texto de una escena (solo falla en perfil release).
export const rotaR10Todo: Campaign = conEscena(campanaBase, { ...b_inicio, text: ['TODO: escribir la llegada a la plaza.', ...b_inicio.text.slice(1)] });
```

- [ ] **Paso 26: Escribir el test que falla** → agregar a los imports de `tests/tools/validate.test.ts`:

```ts
import { CAMPAIGNS } from '@/content/campaigns/index';
import { WORLD } from '@/content/world/index';
import { minimal } from '../fixtures/campaigns/minimal';
import { rotaR09Extrema } from '../fixtures/campaigns/broken/r09';
import { rotaR10Todo } from '../fixtures/campaigns/broken/r10';
```

y agregar al final del archivo:

```ts
describe('r09_extreme', () => {
  it('extrema con levelRange[0] < 3', () => {
    const issues = soloRegla(rotaR09Extrema, 'r09_extreme');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
    expect(issues[0]?.message).toContain('hablar');
  });
  it('extrema permitida con levelRange[0] >= 3', () => {
    expect(validateCampaign({ ...rotaR09Extrema, levelRange: [3, 5] }, ctx())).toEqual([]);
  });
});

describe('r10_todo', () => {
  it('TODO residual falla en release y pasa en smoke', () => {
    const issues = soloRegla(rotaR10Todo, 'r10_todo', 'release');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.sceneId).toBe('b_inicio');
    expect(validateCampaign(rotaR10Todo, ctx('smoke'))).toEqual([]);
  });
  it('detecta TODO en labels, lockedHint, outcome.text y epílogo', () => {
    const conTodos: Campaign = {
      ...campanaBase,
      scenes: {
        ...campanaBase.scenes,
        b_fin_a: { ...campanaBase.scenes.b_fin_a!, ending: { id: 'fin_a', epilogue: ['TODO epílogo'] } },
        b_descanso: { ...campanaBase.scenes.b_descanso!, choices: campanaBase.scenes.b_descanso!.choices.map((c) => (c.id === 'mirar'
          ? { ...c, label: 'TODO label', outcome: { text: ['TODO outcome'], next: 'b_descanso' } }
          : c)) },
      },
    };
    const issues = soloRegla(conTodos, 'r10_todo', 'release');
    expect(issues.map((i) => i.sceneId).sort()).toEqual(['b_descanso', 'b_descanso', 'b_fin_a']);
  });
});

describe('campañas reales', () => {
  it('minimal.ts pasa sin errores en release', () => {
    expect(validateCampaign(minimal, { world: WORLD, profile: 'release' })).toEqual([]);
  });
  it('la campaña prueba pasa sin errores con su propio perfil', async () => {
    const entry = CAMPAIGNS['prueba'];
    expect(entry).toBeDefined();
    const campaign = await entry!.load();
    const issues = validateCampaign(campaign, { world: WORLD, profile: entry!.meta.lintProfile });
    expect(issues.filter((i) => i.level === 'error')).toEqual([]);
  });
});
```

Nota: si `minimal.ts pasa` falla, el mensaje del issue dice exactamente qué le falta a ese fixture (por ejemplo un lugar no declarado); `minimal.ts` es una campaña válida por contrato, así que se corrige el fixture de la tarea 3, no la regla.

- [ ] **Paso 27: Correr el test y verificar que falla**

```bash
npx vitest run tests/tools/validate.test.ts
```

Error esperado: los tests de r09 y r10 fallan con `expected [] to deeply equal [ 'r09_extreme' ]` y `[ 'r10_todo' ]`; `RULES expone las diez reglas en orden` sigue en rojo.

- [ ] **Paso 28: Implementación mínima** → crear `tools/lib/validate/rules/r09_extreme.ts`:

```ts
import { error, type Rule, type ValidationIssue } from '../types';

const RULE = 'r09_extreme';

export const r09_extreme: Rule = (campaign) => {
  const issues: ValidationIssue[] = [];
  const minimo = campaign.levelRange[0];
  if (minimo >= 3) return issues;
  for (const scene of Object.values(campaign.scenes)) {
    for (const choice of scene.choices) {
      if (choice.roll?.difficulty === 'extrema') {
        issues.push(error(RULE, `La opción ${choice.id} usa dificultad extrema y levelRange[0] es ${minimo} (se exige 3 o más)`, scene.id));
      }
    }
  }
  return issues;
};
```

Crear `tools/lib/validate/rules/r10_todo.ts`:

```ts
import { error, type Rule, type ValidationIssue } from '../types';
import { choiceOutcomes, stringsOf } from '../walk';

const RULE = 'r10_todo';

export const r10_todo: Rule = (campaign, ctx) => {
  const issues: ValidationIssue[] = [];
  if (ctx.profile !== 'release') return issues;
  for (const scene of Object.values(campaign.scenes)) {
    const textos: { donde: string; texto: string }[] = [];
    for (const s of stringsOf(scene.text)) textos.push({ donde: 'text', texto: s });
    for (const choice of scene.choices) {
      textos.push({ donde: `label de ${choice.id}`, texto: choice.label });
      if (choice.lockedHint !== undefined) textos.push({ donde: `lockedHint de ${choice.id}`, texto: choice.lockedHint });
      for (const outcome of choiceOutcomes(choice)) {
        for (const s of stringsOf(outcome.text ?? [])) textos.push({ donde: `outcome de ${choice.id}`, texto: s });
      }
    }
    if (scene.ending) for (const s of stringsOf(scene.ending.epilogue)) textos.push({ donde: 'epilogue', texto: s });
    for (const { donde, texto } of textos) {
      if (texto.includes('TODO')) issues.push(error(RULE, `TODO residual en ${donde} de la escena ${scene.id}: "${texto.slice(0, 40)}"`, scene.id));
    }
  }
  return issues;
};
```

Modificar `tools/lib/validate/index.ts` (archivo entero, versión final):

```ts
import { z } from 'zod';
import { CampaignSchema, type Campaign } from '@/content/schema';
import { r01_targets } from './rules/r01_targets';
import { r02_reach } from './rules/r02_reach';
import { r03_choices } from './rules/r03_choices';
import { r04_choice_shape } from './rules/r04_choice_shape';
import { r05_lethal } from './rules/r05_lethal';
import { r06_encounter } from './rules/r06_encounter';
import { r07_ids } from './rules/r07_ids';
import { r08_memory_frame } from './rules/r08_memory_frame';
import { r09_extreme } from './rules/r09_extreme';
import { r10_todo } from './rules/r10_todo';
import type { Rule, ValidateContext, ValidationIssue } from './types';

export type { Rule, ValidateContext, ValidationIssue } from './types';

export const RULES: Record<string, Rule> = {
  r01_targets,
  r02_reach,
  r03_choices,
  r04_choice_shape,
  r05_lethal,
  r06_encounter,
  r07_ids,
  r08_memory_frame,
  r09_extreme,
  r10_todo,
};

export function validateCampaign(campaign: Campaign, ctx: ValidateContext): ValidationIssue[] {
  const parsed = CampaignSchema.safeParse(campaign);
  if (!parsed.success) {
    return [{ level: 'error', rule: 'schema', message: z.prettifyError(parsed.error) }];
  }
  return Object.values(RULES).flatMap((rule) => rule(campaign, ctx));
}
```

- [ ] **Paso 29: Correr el test y verificar que pasa**

```bash
npx vitest run tests/tools/validate.test.ts
```

Resultado esperado: `Test Files 1 passed`, todos los tests en verde, incluido `RULES expone las diez reglas en orden`, `minimal.ts pasa sin errores en release` y `la campaña prueba pasa sin errores con su propio perfil`.

- [ ] **Paso 30: Commit**

```bash
git add tests/fixtures/campaigns/broken/r09.ts tests/fixtures/campaigns/broken/r10.ts tests/tools/validate.test.ts tools/lib/validate/index.ts tools/lib/validate/rules/r09_extreme.ts tools/lib/validate/rules/r10_todo.ts
git commit -m "feat(validate): reglas r09 (extrema) y r10 (TODO en release); minimal y prueba pasan las diez reglas

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 6: CLI `tools/validate.ts` y script `build`

- [ ] **Paso 31: Escribir el test que falla** → crear `tests/tools/cli.test.ts` completo:

```ts
import { describe, expect, it } from 'vitest';
import { formatIssue, parseArgs, summaryLine } from '../../tools/lib/validate/cli';

describe('parseArgs', () => {
  it('sin argumentos devuelve un objeto vacío', () => {
    expect(parseArgs([])).toEqual({});
  });
  it('acepta --profile y --campaign separados o con =', () => {
    expect(parseArgs(['--profile', 'release', '--campaign', 'prueba'])).toEqual({ profile: 'release', campaign: 'prueba' });
    expect(parseArgs(['--profile=smoke', '--campaign=vado'])).toEqual({ profile: 'smoke', campaign: 'vado' });
  });
  it('rechaza un perfil inválido y argumentos desconocidos', () => {
    expect(() => parseArgs(['--profile', 'rapido'])).toThrow('Perfil desconocido: rapido (se acepta smoke o release)');
    expect(() => parseArgs(['--profile'])).toThrow('Falta el valor de --profile');
    expect(() => parseArgs(['--assets'])).toThrow('Argumento desconocido: --assets');
  });
});

describe('formatIssue', () => {
  it('imprime campaña › escena › [regla] mensaje', () => {
    expect(formatIssue('prueba', { level: 'error', rule: 'r01_targets', sceneId: 'p_umbral', message: 'falta algo' })).toBe('prueba › p_umbral › [r01_targets] falta algo');
  });
  it('sin sceneId usa un guion', () => {
    expect(formatIssue('prueba', { level: 'error', rule: 'r05_lethal', message: 'meta.lethalScenes es 2' })).toBe('prueba › - › [r05_lethal] meta.lethalScenes es 2');
  });
});

describe('summaryLine', () => {
  it('cuenta errores y avisos', () => {
    expect(summaryLine([])).toBe('0 errores, 0 avisos');
    expect(summaryLine([
      { level: 'error', rule: 'r01_targets', message: 'a' },
      { level: 'error', rule: 'r02_reach', message: 'b' },
      { level: 'warning', rule: 'w01', message: 'c' },
    ])).toBe('2 errores, 1 avisos');
  });
});
```

- [ ] **Paso 32: Correr el test y verificar que falla**

```bash
npx vitest run tests/tools/cli.test.ts
```

Error esperado: `Failed to resolve import "../../tools/lib/validate/cli"`.

- [ ] **Paso 33: Implementación mínima** → crear `tools/lib/validate/cli.ts`:

```ts
import type { ValidationIssue } from './types';

export interface CliArgs { profile?: 'smoke' | 'release'; campaign?: string }

function esPerfil(value: string): value is 'smoke' | 'release' {
  return value === 'smoke' || value === 'release';
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {};
  const tomarValor = (nombre: string, inline: string | undefined, siguiente: string | undefined): { valor: string; salto: number } => {
    if (inline !== undefined) return { valor: inline, salto: 1 };
    if (siguiente === undefined || siguiente.startsWith('--')) throw new Error(`Falta el valor de ${nombre}`);
    return { valor: siguiente, salto: 2 };
  };
  let i = 0;
  while (i < argv.length) {
    const actual = argv[i] ?? '';
    const igual = actual.indexOf('=');
    const nombre = igual === -1 ? actual : actual.slice(0, igual);
    const inline = igual === -1 ? undefined : actual.slice(igual + 1);
    if (nombre === '--profile') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      if (!esPerfil(valor)) throw new Error(`Perfil desconocido: ${valor} (se acepta smoke o release)`);
      args.profile = valor;
      i += salto;
    } else if (nombre === '--campaign') {
      const { valor, salto } = tomarValor(nombre, inline, argv[i + 1]);
      args.campaign = valor;
      i += salto;
    } else {
      throw new Error(`Argumento desconocido: ${actual}`);
    }
  }
  return args;
}

export function formatIssue(campaignId: string, issue: ValidationIssue): string {
  return `${campaignId} › ${issue.sceneId ?? '-'} › [${issue.rule}] ${issue.message}`;
}

export function summaryLine(issues: readonly ValidationIssue[]): string {
  const errores = issues.filter((i) => i.level === 'error').length;
  const avisos = issues.filter((i) => i.level === 'warning').length;
  return `${errores} errores, ${avisos} avisos`;
}
```

Crear `tools/validate.ts`:

```ts
import { CAMPAIGNS } from '@/content/campaigns/index';
import { WORLD } from '@/content/world/index';
import { validateCampaign } from './lib/validate/index';
import { formatIssue, parseArgs, summaryLine } from './lib/validate/cli';
import type { ValidationIssue } from './lib/validate/types';

async function main(argv: readonly string[]): Promise<number> {
  const args = parseArgs(argv);
  const ids = args.campaign !== undefined ? [args.campaign] : Object.keys(CAMPAIGNS);
  const todos: ValidationIssue[] = [];
  for (const id of ids) {
    const entry = CAMPAIGNS[id];
    if (entry === undefined) {
      console.error(`Campaña desconocida: ${id} (registradas: ${Object.keys(CAMPAIGNS).join(', ')})`);
      return 1;
    }
    const campaign = await entry.load();
    const profile = args.profile ?? entry.meta.lintProfile;
    const issues = validateCampaign(campaign, { world: WORLD, profile });
    for (const issue of issues) console.log(formatIssue(id, issue));
    console.log(`${id}: ${summaryLine(issues)} (perfil ${profile})`);
    todos.push(...issues);
  }
  console.log(summaryLine(todos));
  return todos.some((i) => i.level === 'error') ? 1 : 0;
}

main(process.argv.slice(2)).then(
  (code) => { process.exit(code); },
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  },
);
```

- [ ] **Paso 34: Correr el test y verificar que pasa**

```bash
npx vitest run tests/tools/cli.test.ts
npx tsx tools/validate.ts
npx tsx tools/validate.ts --campaign prueba --profile release
```

Resultado esperado: 6 tests en verde. El segundo comando imprime `prueba: 0 errores, 0 avisos (perfil smoke)` y `0 errores, 0 avisos`, y termina con código 0 (`echo $?` en Git Bash o `$LASTEXITCODE` en PowerShell da `0`). El tercero también termina en `prueba: 0 errores, 0 avisos (perfil release)` y código 0 (la campaña `prueba` cumple las diez reglas también en `release`: no tiene `TODO` y todas sus escenas tienen ≥ 4 opciones libres); sirve solo para comprobar que `--profile` sobreescribe `meta.lintProfile` en la línea de resumen. Para ver el formato `campaña › escena › [regla] mensaje` con un error real, se puede editar temporalmente un `next` de `src/content/campaigns/prueba/scenes/acto1.ts` a un id inexistente, correr `npx tsx tools/validate.ts` (imprime `prueba › p_umbral › [r01_targets] la opción … apunta a una escena inexistente: …` y sale con código 1) y revertir el cambio.

Si `npx tsx tools/validate.ts` falla con `Cannot find module '@/content/campaigns/index'`, el `paths` de `tsconfig.json` no está llegando a `tsx`: comprobar que `tsconfig.json` tenga `"baseUrl": "."` y `"paths": { "@/*": ["src/*"] }` en `compilerOptions` (contrato, sección A) y que el comando se ejecute desde la raíz del proyecto.

- [ ] **Paso 35: Agregar `validate` al script `build`** → en `package.json`, dejar el bloque `scripts` así (conservar cualquier otro script que ya exista; solo cambian `build`, `build:vite` y `validate`):

```json
"scripts": {
  "dev": "vite",
  "build": "run-s validate test:run typecheck build:vite",
  "build:vite": "vite build",
  "preview": "vite preview",
  "test": "vitest",
  "test:run": "vitest run",
  "typecheck": "tsc --noEmit -p tsconfig.json",
  "validate": "tsx tools/validate.ts"
}
```

Si `tsconfig.json` tiene `include` y no lista `tools`, dejarlo como `"include": ["src", "tests", "tools"]` para que `typecheck` cubra el validador.

- [ ] **Paso 36: Verificar el build completo**

```bash
npm run build
```

Resultado esperado: corre `validate` (0 errores), después `test:run`, `typecheck` y `vite build`; termina con `✓ built in …` y código 0.

- [ ] **Paso 37: Commit**

```bash
git add tools/lib/validate/cli.ts tools/validate.ts tests/tools/cli.test.ts package.json tsconfig.json
git commit -m "feat(validate): CLI tsx tools/validate.ts con perfil y campaña, y validate en el script build

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

(Si `tsconfig.json` no cambió, quitarlo del `git add`.)

---

#### Verificación de la tarea

- [ ] **Paso 38: Verificación final**

```bash
npx vitest run
npx tsc --noEmit -p tsconfig.json
npx tsx tools/validate.ts
```

Resultado esperado: todos los tests del proyecto en verde (incluidos `tests/tools/reach.test.ts`, `tests/tools/validate.test.ts` y `tests/tools/cli.test.ts`), `tsc` sin errores y el validador termina con `0 errores, 0 avisos` y código 0.

Criterio de aceptación: `validateCampaign` devuelve un único error `schema` cuando zod falla y, si no, aplica las diez reglas `r01_targets … r10_todo` (una por archivo, mensajes en español con `sceneId`); cada fixture roto dispara exactamente su regla (los dos que zod ya rechaza, `rotaR03FinalConOpciones` y `rotaR04Ambos`, disparan `schema` por `validateCampaign` y su regla al llamarla directo), r03 exige ≥ 4 opciones libres en ambos perfiles, `minimal.ts` y la campaña `prueba` pasan sin errores en su perfil (y `prueba` también en `release`), `reachableScenes` detecta un final alcanzable solo por `{ class: 'mago' }`, y `npm run build` corre `tsx tools/validate.ts` antes de los tests y falla con código 1 si hay errores.

---

### Tarea 13: Estado persistido con Zustand (store.ts, selectors.ts, migrations.ts)

Esta tarea construye la capa de estado de la aplicación: un store de Zustand 5 con el middleware `persist` que guarda en `localStorage["juegorol"]` todo menos la porción `ui` y las acciones, más los selectores que convierten el estado guardado en el `GameState` que consume el motor y las migraciones de formato (vacías en la versión 1). Las acciones del store son la única puerta entre la UI (tarea 14) y el motor (tareas 9 y 10): la UI nunca llama al motor directamente.

Ideas clave que el desarrollador tiene que tener presentes:

- El motor es puro y trabaja sobre `GameState = { world, character, run, seen }`. El store guarda `characters[]`, `activeCharacterId`, `world`, `seen[campaña]` y `prefs`; `selectGameState` arma el `GameState` del personaje activo y `writeGameState` vuelve a repartir un `GameState` nuevo en esas porciones (siempre con objetos y arrays nuevos: nada se muta).
- La tirada tiene dos fases. `beginRoll` calcula los dados y los deja en `ui.pending` (objeto completo, no persistido) y en `run.pending` (tupla mínima `{ choiceId, rerolls, powerUsed }`, persistida). Al recargar, `continueRun` reconstruye el mismo `PendingRoll` con `restorePending` porque los dados salen de un hash determinista.
- El acceso a `localStorage` va siempre dentro de `try/catch`: si el navegador lanza `QuotaExceededError` (o no hay almacenamiento), el juego sigue funcionando en memoria.
- Para poder probar la recarga, el store se construye con una factoría `createAppStore()`; `useStore` es simplemente `createAppStore()` y es lo que usa la UI.

**Archivos:**
- Crear: `src/state/migrations.ts`
- Crear: `src/state/selectors.ts`
- Crear: `src/state/store.ts`
- Test: `tests/state/migrations.test.ts`
- Test: `tests/state/store.test.ts`

**Interfaces:**
- Consume:
  - `@/content/catalog`: `LIMITS` (`maxCharacters`, `xpPerLevel`), tipos `Attr`, `ClassId`, `TraitId`.
  - `@/content/schema`: tipo `Campaign`.
  - `@/content/campaigns`: `CAMPAIGNS: Record<string, CampaignEntry>` con `CampaignEntry = { meta: CampaignMeta; load: () => Promise<Campaign> }` (tarea 11).
  - `@/engine/types`: `Character`, `WorldState`, `Run`, `GameState`, `SeenMap`, `PendingRoll`, `PendingPersisted`, `EndSummary`.
  - `@/engine/resolve` (tareas 9 y 10): `enter(campaign, state, sceneId): GameState`, `choose(campaign, state, choiceId): GameState`, `beginRoll(campaign, state, choiceId): PendingRoll`, `rerollDie(campaign, state, pending, dieIndex): PendingRoll`, `usePower(campaign, state, pending): PendingRoll`, `restorePending(campaign, state): PendingRoll | null`, `commitRoll(campaign, state, pending): GameState`, `endRun(campaign, state): { world: WorldState; character: Character; summary: EndSummary }`.
  - `@/engine/progression`: `fortuneMax(level: number): number`.
  - `@/engine/rng`: `newSeed(entropy: string): number`.
  - Campaña real `prueba` (tarea 11): escena inicial `p_umbral` con las opciones `leer_inscripcion` (tirada de Saber, tag `saber`) y `rodear_patio` (sin tirada, lleva a `p_patio`); hito `entrar_a_la_torre` en `onEnter`.
- Produce (todo con estos nombres exactos):
  - `src/state/migrations.ts`: `export type Migration = (state: unknown) => unknown`; `export const MIGRATIONS: Migration[]` (vacío en v1); `export const PERSIST_VERSION: number` (= 1); `export function runMigrations(state: unknown, fromVersion: number, migrations?: readonly Migration[]): unknown` (aplica `migrations.slice(fromVersion)` en orden).
  - `src/state/selectors.ts`: `export function selectGameState(s: Store): GameState | null`; `export function writeGameState(s: Store, gs: GameState): Partial<PersistedSlice>`.
  - `src/state/store.ts`: tipos `Prefs`, `Screen`, `PersistedSlice`, `UiSlice`, `Actions`, `Store` (del contrato, sección G) más `export interface CreateCharacterInput { name: string; classId: ClassId; portrait: string; traits: TraitId[]; attrs: Record<Attr, number> }` y `export type AppStore = UseBoundStore<Mutate<StoreApi<Store>, [['zustand/persist', PersistedSlice]]>>`; constantes `export const STORAGE_KEY = 'juegorol'` y `export const DEFAULT_PREFS: Prefs`; `export function createAppStore(): AppStore`; `export const useStore: AppStore`.

---

#### Ciclo 1: migraciones

- [ ] **Paso 1: Escribir el test que falla**

Crear `tests/state/migrations.test.ts` con este contenido completo:

```ts
import { describe, expect, it } from 'vitest';
import { MIGRATIONS, PERSIST_VERSION, runMigrations, type Migration } from '@/state/migrations';

describe('migrations', () => {
  it('la versión 1 no tiene migraciones', () => {
    expect(PERSIST_VERSION).toBe(1);
    expect(MIGRATIONS).toEqual([]);
  });

  it('runMigrations sin migraciones devuelve el mismo estado', () => {
    const estado: unknown = { prefs: { cps: 20 } };
    expect(runMigrations(estado, 0)).toBe(estado);
    expect(runMigrations(estado, 1)).toBe(estado);
  });

  it('runMigrations aplica en orden solo las migraciones desde la versión guardada', () => {
    const migraciones: Migration[] = [
      (s) => ({ ...(s as object), a: 1 }),
      (s) => ({ ...(s as object), b: 2 }),
    ];
    expect(runMigrations({}, 0, migraciones)).toEqual({ a: 1, b: 2 });
    expect(runMigrations({}, 1, migraciones)).toEqual({ b: 2 });
    expect(runMigrations({ x: 1 }, 2, migraciones)).toEqual({ x: 1 });
  });

  it('runMigrations no muta el estado de entrada', () => {
    const migraciones: Migration[] = [(s) => ({ ...(s as object), a: 1 })];
    const entrada = { x: 1 };
    const salida = runMigrations(entrada, 0, migraciones);
    expect(entrada).toEqual({ x: 1 });
    expect(salida).not.toBe(entrada);
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```
npx vitest run tests/state/migrations.test.ts
```

Error esperado: `Failed to resolve import "@/state/migrations"` (el módulo no existe todavía).

- [ ] **Paso 3: Implementación mínima**

Crear `src/state/migrations.ts` con este contenido completo:

```ts
/**
 * Migraciones del formato de guardado.
 *
 * `MIGRATIONS[i]` convierte un estado guardado con la versión `i` al formato de la versión `i + 1`.
 * `persist` llama a `runMigrations(estadoGuardado, versionGuardada)`, que aplica en orden
 * `MIGRATIONS.slice(versionGuardada)`. En la versión 1 no hay migraciones: cuando se agregue la
 * primera (de v1 a v2), va en el índice 1 (el índice 0 se rellena con la identidad `(s) => s`)
 * y `PERSIST_VERSION` pasa a 2.
 */
export type Migration = (state: unknown) => unknown;

export const PERSIST_VERSION: number = 1;

export const MIGRATIONS: Migration[] = [];

export function runMigrations(
  state: unknown,
  fromVersion: number,
  migrations: readonly Migration[] = MIGRATIONS,
): unknown {
  return migrations.slice(fromVersion).reduce<unknown>((acc, migrate) => migrate(acc), state);
}
```

- [ ] **Paso 4: Correr el test y verificar que pasa**

```
npx vitest run tests/state/migrations.test.ts
```

Resultado esperado: `4 passed`.

- [ ] **Paso 5: Commit**

```bash
git add src/state/migrations.ts tests/state/migrations.test.ts
git commit -m "feat(state): migraciones de guardado vacías en v1 con runMigrations

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 2: store con personajes, preferencias, persistencia segura y selectores

- [ ] **Paso 6: Escribir el test que falla**

Crear `tests/state/store.test.ts` con este contenido completo. La primera línea (`// @vitest-environment jsdom`) hace que Vitest corra este archivo con jsdom, que trae un `localStorage` real en memoria.

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppStore, DEFAULT_PREFS, STORAGE_KEY, type PersistedSlice } from '@/state/store';
import { selectGameState, writeGameState } from '@/state/selectors';
import type { GameState, Run } from '@/engine/types';

interface SavedFile {
  state: PersistedSlice;
  version: number;
}

function readSaved(): SavedFile {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) throw new Error('No hay guardado en localStorage');
  return JSON.parse(raw) as SavedFile;
}

function fakeRun(campaignId: string): Run {
  return {
    campaignId,
    contentVersion: 1,
    sceneId: 'p_umbral',
    flags: [],
    stagedFlags: [],
    visited: {},
    items: [],
    wounds: 0,
    conditions: [],
    fortune: 3,
    powerUsed: false,
    clocks: {},
    milestones: [],
    log: [],
    rngSeed: 7,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('store: valores por defecto y personajes', () => {
  it('arranca en inicio, sin personajes y con las prefs por defecto', () => {
    const store = createAppStore();
    const s = store.getState();
    expect(s.ui).toEqual({ screen: 'inicio', campaign: null, pending: null, error: null, endSummary: null });
    expect(s.characters).toEqual([]);
    expect(s.activeCharacterId).toBeNull();
    expect(s.world).toEqual({ flags: [], fallen: [] });
    expect(s.seen).toEqual({});
    expect(s.prefs).toEqual(DEFAULT_PREFS);
    expect(DEFAULT_PREFS).toEqual({ cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' });
  });

  it('createTestCharacter crea a Prueba (mago nivel 3) y lo activa', () => {
    const store = createAppStore();
    const id = store.getState().createTestCharacter();
    const s = store.getState();
    expect(s.activeCharacterId).toBe(id);
    expect(s.characters).toHaveLength(1);
    const ch = s.characters[0]!;
    expect(ch.id).toBe(id);
    expect(ch.name).toBe('Prueba');
    expect(ch.classId).toBe('mago');
    expect(ch.portrait).toBe('mago_01');
    expect(ch.level).toBe(3);
    expect(ch.xp).toBe(120);
    expect(ch.attrs).toEqual({ vigor: 0, astucia: 1, saber: 2, presencia: 1 });
    expect(ch.traits).toEqual(['aprendiz_de_escriba', 'cazador_furtivo']);
    expect(ch.flags).toEqual(['char:origen.aprendiz_de_escriba', 'char:origen.cazador_furtivo']);
    expect(ch.skills).toEqual([]);
    expect(ch.relics).toEqual([]);
    expect(ch.scars).toEqual([]);
    expect(ch.campaignLog).toEqual({});
    expect(ch.memoryNames).toEqual({});
    expect(ch.run).toBeNull();
  });

  it('createCharacter crea un personaje de nivel 1 con id único, lo activa y respeta el máximo de 3', () => {
    const store = createAppStore();
    const entrada = {
      name: 'Ana',
      classId: 'guerrero' as const,
      portrait: 'guerrero_02',
      traits: ['desertor' as const],
      attrs: { vigor: 2, astucia: 1, saber: 0, presencia: 1 },
    };
    const id1 = store.getState().createCharacter(entrada);
    const id2 = store.getState().createCharacter({ ...entrada, name: 'Bruno' });
    const id3 = store.getState().createCharacter({ ...entrada, name: 'Clara' });
    expect(new Set([id1, id2, id3]).size).toBe(3);
    const s = store.getState();
    expect(s.characters.map((c) => c.name)).toEqual(['Ana', 'Bruno', 'Clara']);
    expect(s.activeCharacterId).toBe(id3);
    expect(s.characters[0]!.level).toBe(1);
    expect(s.characters[0]!.xp).toBe(0);
    expect(s.characters[0]!.flags).toEqual(['char:origen.desertor']);
    expect(() => store.getState().createCharacter({ ...entrada, name: 'Dora' })).toThrow();
    expect(store.getState().characters).toHaveLength(3);
  });
});

describe('store: persistencia', () => {
  it('setPrefs actualiza y persiste en localStorage["juegorol"] sin ui ni acciones', () => {
    const store = createAppStore();
    store.getState().setPrefs({ cps: 80, fontScale: 1.25 });
    expect(store.getState().prefs).toEqual({ cps: 80, showOdds: true, fontScale: 1.25, reducedMotion: 'auto' });
    const saved = readSaved();
    expect(saved.version).toBe(1);
    expect(saved.state.prefs).toEqual({ cps: 80, showOdds: true, fontScale: 1.25, reducedMotion: 'auto' });
    expect(saved.state).not.toHaveProperty('ui');
    expect(saved.state).not.toHaveProperty('setPrefs');
    expect(saved.state).not.toHaveProperty('createCharacter');
    expect(Object.keys(saved.state).sort()).toEqual(['activeCharacterId', 'characters', 'prefs', 'seen', 'world']);
  });

  it('un store nuevo rehidrata lo guardado', async () => {
    const store1 = createAppStore();
    const id = store1.getState().createTestCharacter();
    store1.getState().setPrefs({ showOdds: false });

    const store2 = createAppStore();
    await store2.persist.rehydrate();
    const s = store2.getState();
    expect(s.activeCharacterId).toBe(id);
    expect(s.characters[0]!.name).toBe('Prueba');
    expect(s.prefs.showOdds).toBe(false);
    expect(s.ui.screen).toBe('inicio');
  });

  it('migrate aplica MIGRATIONS desde la versión guardada (v0 → v1 sin cambios)', async () => {
    const guardado: SavedFile = {
      version: 0,
      state: {
        characters: [],
        activeCharacterId: null,
        world: { flags: ['world:viejo'], fallen: [] },
        seen: {},
        prefs: { cps: 20, showOdds: false, fontScale: 1.5, reducedMotion: 'on' },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(guardado));
    const store = createAppStore();
    await store.persist.rehydrate();
    expect(store.getState().prefs).toEqual({ cps: 20, showOdds: false, fontScale: 1.5, reducedMotion: 'on' });
    expect(store.getState().world.flags).toEqual(['world:viejo']);
    expect(readSaved().version).toBe(1);
  });

  it('sigue funcionando si localStorage lanza QuotaExceededError al escribir', () => {
    const store = createAppStore();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Sin espacio', 'QuotaExceededError');
    });
    expect(() => store.getState().setPrefs({ cps: 10 })).not.toThrow();
    expect(store.getState().prefs.cps).toBe(10);
    expect(() => store.getState().createTestCharacter()).not.toThrow();
    expect(store.getState().characters).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
  });

  it('arranca con valores por defecto si localStorage lanza al leer', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Bloqueado', 'SecurityError');
    });
    const store = createAppStore();
    expect(store.getState().prefs).toEqual(DEFAULT_PREFS);
    expect(store.getState().characters).toEqual([]);
  });
});

describe('selectors', () => {
  it('selectGameState devuelve null sin personaje activo o sin run, y el GameState si hay run', () => {
    const store = createAppStore();
    expect(selectGameState(store.getState())).toBeNull();
    store.getState().createTestCharacter();
    expect(selectGameState(store.getState())).toBeNull();

    const s = store.getState();
    store.setState(
      writeGameState(s, { world: s.world, character: s.characters[0]!, run: fakeRun('prueba'), seen: {} }),
    );
    const gs = selectGameState(store.getState());
    expect(gs).not.toBeNull();
    expect(gs!.run.sceneId).toBe('p_umbral');
    expect(gs!.character.name).toBe('Prueba');
    expect(gs!.world).toEqual({ flags: [], fallen: [] });
    expect(gs!.seen).toEqual({});
  });

  it('writeGameState reemplaza el personaje, el mundo y seen de la campaña sin mutar el store', () => {
    const store = createAppStore();
    const id = store.getState().createTestCharacter();
    const s = store.getState();
    const ch = s.characters[0]!;
    const run = fakeRun('prueba');
    const gs: GameState = {
      world: { flags: ['world:x'], fallen: [] },
      character: { ...ch, xp: 999 },
      run,
      seen: { p_umbral: ['abc'] },
    };
    const patch = writeGameState(s, gs);
    expect(patch.world).toEqual({ flags: ['world:x'], fallen: [] });
    expect(patch.characters).toHaveLength(1);
    expect(patch.characters![0]!.id).toBe(id);
    expect(patch.characters![0]!.xp).toBe(999);
    expect(patch.characters![0]!.run).toEqual(run);
    expect(patch.seen).toEqual({ prueba: { p_umbral: ['abc'] } });
    expect(patch.characters).not.toBe(s.characters);
    expect(s.characters[0]!.xp).toBe(120);
    expect(s.characters[0]!.run).toBeNull();
    expect(s.seen).toEqual({});
  });
});
```

- [ ] **Paso 7: Correr el test y verificar que falla**

```
npx vitest run tests/state/store.test.ts
```

Error esperado: `Failed to resolve import "@/state/store"` (ni `store.ts` ni `selectors.ts` existen).

- [ ] **Paso 8: Implementación mínima (selectores)**

Crear `src/state/selectors.ts` con este contenido completo. Importa solo tipos de `store.ts`, así que no hay ciclo en tiempo de ejecución aunque `store.ts` importe estas funciones.

```ts
import type { Character, GameState } from '@/engine/types';
import type { PersistedSlice, Store } from '@/state/store';

/** Arma el GameState del personaje activo, o null si no hay personaje activo o no tiene partida en curso. */
export function selectGameState(s: Store): GameState | null {
  const character = s.characters.find((c) => c.id === s.activeCharacterId);
  if (!character || !character.run) return null;
  return {
    world: s.world,
    character,
    run: character.run,
    seen: s.seen[character.run.campaignId] ?? {},
  };
}

/** Reparte un GameState nuevo en las porciones persistidas del store. No muta nada. */
export function writeGameState(s: Store, gs: GameState): Partial<PersistedSlice> {
  const character: Character = { ...gs.character, run: gs.run };
  return {
    world: gs.world,
    characters: s.characters.map((c) => (c.id === character.id ? character : c)),
    seen: { ...s.seen, [gs.run.campaignId]: gs.seen },
  };
}
```

- [ ] **Paso 9: Implementación mínima (store, primera versión)**

Crear `src/state/store.ts` con este contenido completo. En este ciclo la interfaz `Actions` solo tiene las tres acciones que se prueban; los ciclos 3 y 4 la completan reescribiendo el archivo entero.

Nota sobre los genéricos de `persist`: en zustand 5 la firma es `persist<T, Mps, Mcs, U>` (`Mps`/`Mcs` son las listas de mutadores previos y propios, `U` el tipo persistido). Hay que escribir los cuatro, `persist<Store, [], [], PersistedSlice>(…)`: con `persist<Store, PersistedSlice>` `tsc` falla con TS2344 (`PersistedSlice` no cumple `[StoreMutatorIdentifier, unknown][]`) y sin genéricos `U` se infiere como `unknown` y el resultado no coincide con `AppStore`. Vitest no chequea tipos, así que ese error solo se vería en `npx tsc --noEmit` y en `npm run build`.

```ts
import { create, type Mutate, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { LIMITS, type Attr, type ClassId, type TraitId } from '@/content/catalog';
import type { Campaign } from '@/content/schema';
import type { Character, EndSummary, PendingRoll, SeenMap, WorldState } from '@/engine/types';
import { PERSIST_VERSION, runMigrations } from '@/state/migrations';

export interface Prefs {
  cps: number;
  showOdds: boolean;
  fontScale: 1 | 1.25 | 1.5;
  reducedMotion: 'auto' | 'on';
}

export type Screen = 'inicio' | 'cargando' | 'escena' | 'fin' | 'error';

export interface PersistedSlice {
  characters: Character[];
  activeCharacterId: string | null;
  world: WorldState;
  seen: Record<string, SeenMap>;
  prefs: Prefs;
}

export interface UiSlice {
  screen: Screen;
  campaign: Campaign | null;
  pending: PendingRoll | null;
  error: string | null;
  endSummary: EndSummary | null;
}

export interface CreateCharacterInput {
  name: string;
  classId: ClassId;
  portrait: string;
  traits: TraitId[];
  attrs: Record<Attr, number>;
}

export interface Actions {
  createCharacter(input: CreateCharacterInput): string;
  createTestCharacter(): string;
  setPrefs(p: Partial<Prefs>): void;
}

export type Store = PersistedSlice & { ui: UiSlice } & Actions;

export type AppStore = UseBoundStore<Mutate<StoreApi<Store>, [['zustand/persist', PersistedSlice]]>>;

export const STORAGE_KEY = 'juegorol';

export const DEFAULT_PREFS: Prefs = { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' };

const INITIAL_UI: UiSlice = { screen: 'inicio', campaign: null, pending: null, error: null, endSummary: null };

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** localStorage envuelto en try/catch: sin almacenamiento o sin cuota, el juego sigue en memoria. */
const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return globalThis.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      globalThis.localStorage.setItem(name, value);
    } catch (e) {
      console.warn(`No se pudo guardar la partida (${errorMessage(e)}). Exportá tu guardado desde Opciones.`);
    }
  },
  removeItem: (name: string): void => {
    try {
      globalThis.localStorage.removeItem(name);
    } catch {
      // Sin almacenamiento no hay nada que borrar.
    }
  },
};

function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function buildCharacter(input: CreateCharacterInput, level: number): Character {
  return {
    id: newId(),
    name: input.name,
    portrait: input.portrait,
    classId: input.classId,
    attrs: { ...input.attrs },
    traits: [...input.traits],
    skills: [],
    level,
    xp: LIMITS.xpPerLevel * (level - 1),
    flags: input.traits.map((t) => `char:origen.${t}`),
    memoryNames: {},
    relics: [],
    scars: [],
    campaignLog: {},
    run: null,
  };
}

/** Pide al navegador que no borre el almacenamiento; falla en silencio donde no existe. */
function requestPersistentStorage(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      void navigator.storage.persist();
    }
  } catch {
    // No disponible: no importa.
  }
}

function partialize(s: Store): PersistedSlice {
  return {
    characters: s.characters,
    activeCharacterId: s.activeCharacterId,
    world: s.world,
    seen: s.seen,
    prefs: s.prefs,
  };
}

export function createAppStore(): AppStore {
  return create<Store>()(
    persist<Store, [], [], PersistedSlice>(
      (set, get) => {
        const addCharacter = (character: Character): void => {
          set((s) => ({ characters: [...s.characters, character], activeCharacterId: character.id }));
        };

        return {
          characters: [],
          activeCharacterId: null,
          world: { flags: [], fallen: [] },
          seen: {},
          prefs: { ...DEFAULT_PREFS },
          ui: { ...INITIAL_UI },

          createCharacter(input) {
            if (get().characters.length >= LIMITS.maxCharacters) {
              throw new Error(`No se pueden tener más de ${LIMITS.maxCharacters} personajes`);
            }
            const character = buildCharacter(input, 1);
            addCharacter(character);
            requestPersistentStorage();
            return character.id;
          },

          createTestCharacter() {
            const character = buildCharacter(
              {
                name: 'Prueba',
                classId: 'mago',
                portrait: 'mago_01',
                traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
                attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
              },
              3,
            );
            addCharacter(character);
            return character.id;
          },

          setPrefs(p) {
            set((s) => ({ prefs: { ...s.prefs, ...p } }));
          },
        };
      },
      {
        name: STORAGE_KEY,
        version: PERSIST_VERSION,
        storage: createJSONStorage(() => safeStorage),
        partialize,
        migrate: (persisted, version) => runMigrations(persisted, version) as PersistedSlice,
      },
    ),
  );
}

export const useStore: AppStore = createAppStore();
```

- [ ] **Paso 10: Correr el test y verificar que pasa**

```
npx vitest run tests/state/store.test.ts
```

Resultado esperado: `10 passed` (3 de personajes, 5 de persistencia, 2 de selectores).

- [ ] **Paso 11: Commit**

```bash
git add src/state/store.ts src/state/selectors.ts tests/state/store.test.ts
git commit -m "feat(state): store con persist seguro, personajes, prefs y selectores de GameState

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: empezar, continuar, elegir, abandonar y terminar una partida

- [ ] **Paso 12: Escribir el test que falla**

Agregar al FINAL de `tests/state/store.test.ts` este bloque (después del `describe('selectors', …)`):

```ts
describe('store: ciclo de partida sin dados', () => {
  it('startRun("prueba") carga la campaña, crea el run y entra a la escena inicial', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    const promesa = store.getState().startRun('prueba');
    expect(store.getState().ui.screen).toBe('cargando');
    await promesa;

    const s = store.getState();
    expect(s.ui.screen).toBe('escena');
    expect(s.ui.error).toBeNull();
    expect(s.ui.pending).toBeNull();
    expect(s.ui.campaign?.id).toBe('prueba');

    const gs = selectGameState(s);
    expect(gs).not.toBeNull();
    expect(gs!.run.campaignId).toBe('prueba');
    expect(gs!.run.contentVersion).toBe(1);
    expect(gs!.run.fortune).toBe(3);
    expect(gs!.run.wounds).toBe(0);
    expect(gs!.run.powerUsed).toBe(false);
    expect(gs!.run.sceneId).toBe('p_umbral');
    expect(gs!.run.milestones).toContain('entrar_a_la_torre');
    expect(gs!.run.log).toHaveLength(1);
    expect(gs!.run.log[0]).toMatchObject({ kind: 'scene', sceneId: 'p_umbral' });
    expect(typeof gs!.run.rngSeed).toBe('number');

    expect(readSaved().state.characters[0]!.run?.sceneId).toBe('p_umbral');
  });

  it('dos partidas seguidas tienen semillas distintas', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');
    const seed1 = selectGameState(store.getState())!.run.rngSeed;
    await store.getState().startRun('prueba');
    const seed2 = selectGameState(store.getState())!.run.rngSeed;
    expect(seed1).not.toBe(seed2);
  });

  it('startRun con campaña desconocida va a error y retry vuelve a inicio si no hay run', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('no_existe');
    expect(store.getState().ui.screen).toBe('error');
    expect(store.getState().ui.error).toContain('no_existe');
    store.getState().retry();
    expect(store.getState().ui.screen).toBe('inicio');
    expect(store.getState().ui.error).toBeNull();
  });

  it('startRun sin personaje activo va a error', async () => {
    const store = createAppStore();
    await store.getState().startRun('prueba');
    expect(store.getState().ui.screen).toBe('error');
    expect(store.getState().ui.error).toBe('No hay personaje activo');
  });

  it('choose avanza a la escena siguiente, registra la elección y persiste', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');
    store.getState().choose('rodear_patio');

    const gs = selectGameState(store.getState())!;
    expect(store.getState().ui.screen).toBe('escena');
    expect(gs.run.sceneId).toBe('p_patio');
    expect(gs.run.visited).toEqual({ p_umbral: 1 });
    expect(gs.run.log.some((e) => e.kind === 'choice' && e.choiceId === 'rodear_patio')).toBe(true);
    expect(gs.run.log[gs.run.log.length - 1]).toMatchObject({ kind: 'scene', sceneId: 'p_patio' });
    expect(gs.character.flags).toContain('char:place.torre_abandonada');
    expect(readSaved().state.characters[0]!.run?.sceneId).toBe('p_patio');
    expect(Object.keys(readSaved().state.seen.prueba ?? {})).toContain('p_umbral');
  });

  it('continueRun retoma la partida guardada en un store nuevo', async () => {
    const store1 = createAppStore();
    store1.getState().createTestCharacter();
    await store1.getState().startRun('prueba');
    store1.getState().choose('rodear_patio');

    const store2 = createAppStore();
    await store2.persist.rehydrate();
    expect(store2.getState().ui.screen).toBe('inicio');
    expect(store2.getState().ui.campaign).toBeNull();
    await store2.getState().continueRun();
    const s = store2.getState();
    expect(s.ui.screen).toBe('escena');
    expect(s.ui.campaign?.id).toBe('prueba');
    expect(s.ui.pending).toBeNull();
    expect(selectGameState(s)!.run.sceneId).toBe('p_patio');
  });

  it('continueRun sin partida en curso vuelve a inicio', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().continueRun();
    expect(store.getState().ui.screen).toBe('inicio');
  });

  it('abandonRun marca derrota y finishRun deja run null, registra la partida y vuelve a inicio', async () => {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');
    store.getState().abandonRun();

    const s = store.getState();
    expect(s.ui.screen).toBe('inicio');
    expect(s.ui.campaign).toBeNull();
    expect(s.ui.pending).toBeNull();
    expect(s.ui.endSummary?.outcome).toEqual({ kind: 'defeat' });
    expect(s.characters[0]!.run).toBeNull();
    expect(s.characters[0]!.campaignLog.prueba).toMatchObject({ runs: 1, wins: 0 });
    expect(s.characters[0]!.campaignLog.prueba?.milestones).toContain('entrar_a_la_torre');
    expect(selectGameState(s)).toBeNull();
    expect(readSaved().state.characters[0]!.run).toBeNull();
  });
});
```

- [ ] **Paso 13: Correr el test y verificar que falla**

```
npx vitest run tests/state/store.test.ts
```

Error esperado: los 8 tests nuevos fallan con `TypeError: store.getState().startRun is not a function` (y variantes para `continueRun` y `abandonRun`); los 10 anteriores siguen pasando.

- [ ] **Paso 14: Implementación mínima (store, segunda versión)**

Reemplazar `src/state/store.ts` entero por este contenido:

```ts
import { create, type Mutate, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { LIMITS, type Attr, type ClassId, type TraitId } from '@/content/catalog';
import type { Campaign } from '@/content/schema';
import { CAMPAIGNS } from '@/content/campaigns/index';
import type { Character, EndSummary, GameState, PendingRoll, Run, SeenMap, WorldState } from '@/engine/types';
import * as engine from '@/engine/resolve';
import { fortuneMax } from '@/engine/progression';
import { newSeed } from '@/engine/rng';
import { PERSIST_VERSION, runMigrations } from '@/state/migrations';
import { selectGameState, writeGameState } from '@/state/selectors';

export interface Prefs {
  cps: number;
  showOdds: boolean;
  fontScale: 1 | 1.25 | 1.5;
  reducedMotion: 'auto' | 'on';
}

export type Screen = 'inicio' | 'cargando' | 'escena' | 'fin' | 'error';

export interface PersistedSlice {
  characters: Character[];
  activeCharacterId: string | null;
  world: WorldState;
  seen: Record<string, SeenMap>;
  prefs: Prefs;
}

export interface UiSlice {
  screen: Screen;
  campaign: Campaign | null;
  pending: PendingRoll | null;
  error: string | null;
  endSummary: EndSummary | null;
}

export interface CreateCharacterInput {
  name: string;
  classId: ClassId;
  portrait: string;
  traits: TraitId[];
  attrs: Record<Attr, number>;
}

export interface Actions {
  createCharacter(input: CreateCharacterInput): string;
  createTestCharacter(): string;
  startRun(campaignId: string): Promise<void>;
  continueRun(): Promise<void>;
  choose(choiceId: string): void;
  finishRun(): void;
  abandonRun(): void;
  retry(): void;
  setPrefs(p: Partial<Prefs>): void;
}

export type Store = PersistedSlice & { ui: UiSlice } & Actions;

export type AppStore = UseBoundStore<Mutate<StoreApi<Store>, [['zustand/persist', PersistedSlice]]>>;

export const STORAGE_KEY = 'juegorol';

export const DEFAULT_PREFS: Prefs = { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' };

const INITIAL_UI: UiSlice = { screen: 'inicio', campaign: null, pending: null, error: null, endSummary: null };

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** localStorage envuelto en try/catch: sin almacenamiento o sin cuota, el juego sigue en memoria. */
const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return globalThis.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      globalThis.localStorage.setItem(name, value);
    } catch (e) {
      console.warn(`No se pudo guardar la partida (${errorMessage(e)}). Exportá tu guardado desde Opciones.`);
    }
  },
  removeItem: (name: string): void => {
    try {
      globalThis.localStorage.removeItem(name);
    } catch {
      // Sin almacenamiento no hay nada que borrar.
    }
  },
};

function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function buildCharacter(input: CreateCharacterInput, level: number): Character {
  return {
    id: newId(),
    name: input.name,
    portrait: input.portrait,
    classId: input.classId,
    attrs: { ...input.attrs },
    traits: [...input.traits],
    skills: [],
    level,
    xp: LIMITS.xpPerLevel * (level - 1),
    flags: input.traits.map((t) => `char:origen.${t}`),
    memoryNames: {},
    relics: [],
    scars: [],
    campaignLog: {},
    run: null,
  };
}

/** Pide al navegador que no borre el almacenamiento; falla en silencio donde no existe. */
function requestPersistentStorage(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      void navigator.storage.persist();
    }
  } catch {
    // No disponible: no importa.
  }
}

function activeCharacter(s: PersistedSlice): Character | null {
  return s.characters.find((c) => c.id === s.activeCharacterId) ?? null;
}

async function loadCampaign(campaignId: string): Promise<Campaign> {
  const entry = CAMPAIGNS[campaignId];
  if (!entry) throw new Error(`Campaña desconocida: ${campaignId}`);
  return entry.load();
}

function newRun(campaign: Campaign, character: Character): Run {
  return {
    campaignId: campaign.id,
    contentVersion: campaign.contentVersion,
    sceneId: campaign.start,
    flags: [],
    stagedFlags: [],
    visited: {},
    items: [],
    wounds: 0,
    conditions: [],
    fortune: fortuneMax(character.level),
    powerUsed: false,
    clocks: {},
    milestones: [],
    log: [],
    rngSeed: newSeed(`${Date.now()}|${Math.random()}`),
  };
}

function partialize(s: Store): PersistedSlice {
  return {
    characters: s.characters,
    activeCharacterId: s.activeCharacterId,
    world: s.world,
    seen: s.seen,
    prefs: s.prefs,
  };
}

export function createAppStore(): AppStore {
  return create<Store>()(
    persist<Store, [], [], PersistedSlice>(
      (set, get) => {
        const addCharacter = (character: Character): void => {
          set((s) => ({ characters: [...s.characters, character], activeCharacterId: character.id }));
        };
        const setUi = (patch: Partial<UiSlice>): void => {
          set((s) => ({ ui: { ...s.ui, ...patch } }));
        };
        const fail = (e: unknown): void => {
          setUi({ screen: 'error', error: errorMessage(e) });
        };
        /** Campaña cargada y GameState del personaje activo con partida; null si falta alguno. */
        const playing = (): { campaign: Campaign; gs: GameState } | null => {
          const st = get();
          const gs = selectGameState(st);
          return st.ui.campaign && gs ? { campaign: st.ui.campaign, gs } : null;
        };

        return {
          characters: [],
          activeCharacterId: null,
          world: { flags: [], fallen: [] },
          seen: {},
          prefs: { ...DEFAULT_PREFS },
          ui: { ...INITIAL_UI },

          createCharacter(input) {
            if (get().characters.length >= LIMITS.maxCharacters) {
              throw new Error(`No se pueden tener más de ${LIMITS.maxCharacters} personajes`);
            }
            const character = buildCharacter(input, 1);
            addCharacter(character);
            requestPersistentStorage();
            return character.id;
          },

          createTestCharacter() {
            const character = buildCharacter(
              {
                name: 'Prueba',
                classId: 'mago',
                portrait: 'mago_01',
                traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
                attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
              },
              3,
            );
            addCharacter(character);
            return character.id;
          },

          async startRun(campaignId) {
            setUi({ screen: 'cargando', error: null, pending: null, endSummary: null });
            try {
              const campaign = await loadCampaign(campaignId);
              const st = get();
              const character = activeCharacter(st);
              if (!character) throw new Error('No hay personaje activo');
              const run = newRun(campaign, character);
              const seen = st.seen[campaign.id] ?? {};
              const entered = engine.enter(campaign, { world: st.world, character, run, seen }, campaign.start);
              set((s) => ({
                ...writeGameState(s, entered),
                ui: { ...s.ui, screen: entered.run.outcome ? 'fin' : 'escena', campaign, pending: null },
              }));
            } catch (e) {
              fail(e);
            }
          },

          async continueRun() {
            const character = activeCharacter(get());
            if (!character || !character.run) {
              setUi({ screen: 'inicio' });
              return;
            }
            setUi({ screen: 'cargando', error: null });
            try {
              const campaign = await loadCampaign(character.run.campaignId);
              const gs = selectGameState(get());
              if (!gs) throw new Error('La partida ya no existe');
              setUi({ screen: gs.run.outcome ? 'fin' : 'escena', campaign, pending: null });
            } catch (e) {
              fail(e);
            }
          },

          choose(choiceId) {
            const ctx = playing();
            if (!ctx) return;
            const next = engine.choose(ctx.campaign, ctx.gs, choiceId);
            set((s) => ({
              ...writeGameState(s, next),
              ui: { ...s.ui, screen: next.run.outcome ? 'fin' : 'escena' },
            }));
          },

          finishRun() {
            const ctx = playing();
            if (!ctx) {
              setUi({ screen: 'inicio', campaign: null, pending: null });
              return;
            }
            const { world, character, summary } = engine.endRun(ctx.campaign, ctx.gs);
            set((s) => ({
              world,
              characters: s.characters.map((c) => (c.id === character.id ? character : c)),
              ui: { ...s.ui, screen: 'inicio', campaign: null, pending: null, endSummary: summary },
            }));
          },

          abandonRun() {
            const ctx = playing();
            if (!ctx) return;
            const run: Run = { ...ctx.gs.run, outcome: { kind: 'defeat' } };
            set((s) => ({
              ...writeGameState(s, { ...ctx.gs, run }),
              ui: { ...s.ui, pending: null, screen: 'fin' },
            }));
            get().finishRun();
          },

          retry() {
            const character = activeCharacter(get());
            if (character?.run) {
              void get().continueRun();
            } else {
              setUi({ screen: 'inicio', error: null });
            }
          },

          setPrefs(p) {
            set((s) => ({ prefs: { ...s.prefs, ...p } }));
          },
        };
      },
      {
        name: STORAGE_KEY,
        version: PERSIST_VERSION,
        storage: createJSONStorage(() => safeStorage),
        partialize,
        migrate: (persisted, version) => runMigrations(persisted, version) as PersistedSlice,
      },
    ),
  );
}

export const useStore: AppStore = createAppStore();
```

- [ ] **Paso 15: Correr el test y verificar que pasa**

```
npx vitest run tests/state/store.test.ts
```

Resultado esperado: `18 passed` (los 10 anteriores más los 8 del ciclo de partida).

- [ ] **Paso 16: Commit**

```bash
git add src/state/store.ts tests/state/store.test.ts
git commit -m "feat(state): acciones de partida: startRun, continueRun, choose, finishRun, abandonRun y retry

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: tirada en dos fases, pending persistido y recarga

- [ ] **Paso 17: Escribir el test que falla**

Agregar al FINAL de `tests/state/store.test.ts` este bloque. Necesita el tipo `AppStore`: cambiar la primera línea de importación del archivo por

```ts
import { createAppStore, DEFAULT_PREFS, STORAGE_KEY, type AppStore, type PersistedSlice } from '@/state/store';
```

y agregar al final:

```ts
describe('store: tirada en dos fases y recarga', () => {
  async function enUmbral(): Promise<AppStore> {
    const store = createAppStore();
    store.getState().createTestCharacter();
    await store.getState().startRun('prueba');
    return store;
  }

  it('beginRoll deja ui.pending completo y run.pending mínimo persistido', async () => {
    const store = await enUmbral();
    store.getState().beginRoll('leer_inscripcion');

    const s = store.getState();
    expect(s.ui.screen).toBe('escena');
    const pending = s.ui.pending;
    expect(pending).not.toBeNull();
    expect(pending!.choiceId).toBe('leer_inscripcion');
    expect(pending!.sceneId).toBe('p_umbral');
    expect(pending!.preview.attr).toBe('saber');
    expect(pending!.preview.mode).toBe('advantage');
    expect(pending!.dice).toHaveLength(3);
    expect(pending!.kept).toHaveLength(2);
    expect(pending!.rerolls).toEqual([]);
    expect(pending!.powerUsed).toBe(false);
    expect(pending!.canReroll).toBe(true);

    const esperado = { choiceId: 'leer_inscripcion', rerolls: [], powerUsed: false };
    expect(selectGameState(s)!.run.pending).toEqual(esperado);
    expect(selectGameState(s)!.run.sceneId).toBe('p_umbral');
    expect(readSaved().state.characters[0]!.run?.pending).toEqual(esperado);
  });

  it('rerollDie repite solo ese dado y registra el índice en run.pending.rerolls', async () => {
    const store = await enUmbral();
    store.getState().beginRoll('leer_inscripcion');
    const antes = store.getState().ui.pending!;
    store.getState().rerollDie(1);

    const s = store.getState();
    const despues = s.ui.pending!;
    expect(despues.rerolls).toEqual([1]);
    expect(despues.dice[0]).toBe(antes.dice[0]);
    expect(despues.dice[2]).toBe(antes.dice[2]);
    expect(despues.canReroll).toBe(true);
    expect(selectGameState(s)!.run.pending).toEqual({ choiceId: 'leer_inscripcion', rerolls: [1], powerUsed: false });
    expect(selectGameState(s)!.run.fortune).toBe(3);
    expect(readSaved().state.characters[0]!.run?.pending?.rerolls).toEqual([1]);

    store.getState().rerollDie(0);
    expect(store.getState().ui.pending!.rerolls).toEqual([1, 0]);
    expect(selectGameState(store.getState())!.run.pending?.rerolls).toEqual([1, 0]);
  });

  it('usePower actualiza ui.pending y run.pending.powerUsed solo cuando aplica', async () => {
    const store = await enUmbral();
    store.getState().beginRoll('leer_inscripcion');
    const antes = store.getState().ui.pending!;
    store.getState().usePower();
    const despues = store.getState().ui.pending!;
    if (antes.canUsePower) {
      expect(despues.band).toBe('partial');
      expect(despues.powerUsed).toBe(true);
      expect(despues.canUsePower).toBe(false);
      expect(selectGameState(store.getState())!.run.pending?.powerUsed).toBe(true);
    } else {
      expect(despues).toEqual(antes);
      expect(selectGameState(store.getState())!.run.pending?.powerUsed).toBe(false);
    }
  });

  it('tras recargar, continueRun reconstruye el mismo pending (mismos dados y repeticiones)', async () => {
    const store1 = await enUmbral();
    store1.getState().beginRoll('leer_inscripcion');
    store1.getState().rerollDie(2);
    store1.getState().rerollDie(0);
    const antes = store1.getState().ui.pending!;
    expect(antes.rerolls).toEqual([2, 0]);

    const saved = readSaved();
    expect(saved.version).toBe(1);
    expect(saved.state.characters[0]!.run?.pending).toEqual({ choiceId: 'leer_inscripcion', rerolls: [2, 0], powerUsed: false });

    const store2 = createAppStore();
    await store2.persist.rehydrate();
    expect(store2.getState().ui.pending).toBeNull();
    await store2.getState().continueRun();

    const s = store2.getState();
    expect(s.ui.screen).toBe('escena');
    const despues = s.ui.pending;
    expect(despues).not.toBeNull();
    expect(despues!.choiceId).toBe('leer_inscripcion');
    expect(despues!.dice).toEqual(antes.dice);
    expect(despues!.kept).toEqual(antes.kept);
    expect(despues!.total).toBe(antes.total);
    expect(despues!.band).toBe(antes.band);
    expect(despues!.rerolls).toEqual([2, 0]);
    expect(despues!.canReroll).toBe(true);
    expect(despues!.preview).toEqual(antes.preview);
  });

  it('commitRoll limpia pending, gasta la Fortuna usada, registra la tirada y avanza', async () => {
    const store = await enUmbral();
    store.getState().beginRoll('leer_inscripcion');
    store.getState().rerollDie(0);
    store.getState().commitRoll();

    const s = store.getState();
    expect(s.ui.pending).toBeNull();
    expect(s.ui.screen).toBe('escena');
    const gs = selectGameState(s)!;
    expect(gs.run.pending).toBeUndefined();
    expect(gs.run.sceneId).toBe('p_biblioteca');
    expect(gs.run.fortune).toBe(2);
    const tirada = gs.run.log.find((e) => e.kind === 'roll');
    expect(tirada).toBeDefined();
    expect(tirada).toMatchObject({ kind: 'roll', fortuneSpent: 1 });
    expect(gs.run.log.some((e) => e.kind === 'choice' && e.choiceId === 'leer_inscripcion')).toBe(true);
    expect(gs.run.log[gs.run.log.length - 1]).toMatchObject({ kind: 'scene', sceneId: 'p_biblioteca' });
    expect(readSaved().state.characters[0]!.run?.pending).toBeUndefined();
    expect(readSaved().state.characters[0]!.run?.sceneId).toBe('p_biblioteca');
  });

  it('rerollDie, usePower y commitRoll no hacen nada sin pending', async () => {
    const store = await enUmbral();
    const antes = selectGameState(store.getState())!;
    store.getState().rerollDie(0);
    store.getState().usePower();
    store.getState().commitRoll();
    expect(store.getState().ui.pending).toBeNull();
    expect(selectGameState(store.getState())).toEqual(antes);
  });
});
```

- [ ] **Paso 18: Correr el test y verificar que falla**

```
npx vitest run tests/state/store.test.ts
```

Error esperado: los 6 tests nuevos fallan con `TypeError: store.getState().beginRoll is not a function` (o `rerollDie`/`usePower`/`commitRoll`); los 18 anteriores siguen pasando.

- [ ] **Paso 19: Implementación mínima (store, versión final)**

Reemplazar `src/state/store.ts` entero por este contenido. Respecto de la versión anterior cambia: la interfaz `Actions` (completa según el contrato), el import de `PendingPersisted`, la función `toPersisted`, `continueRun` (ahora reconstruye `ui.pending` con `restorePending`) y las cuatro acciones de tirada.

```ts
import { create, type Mutate, type StoreApi, type UseBoundStore } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { LIMITS, type Attr, type ClassId, type TraitId } from '@/content/catalog';
import type { Campaign } from '@/content/schema';
import { CAMPAIGNS } from '@/content/campaigns/index';
import type {
  Character,
  EndSummary,
  GameState,
  PendingPersisted,
  PendingRoll,
  Run,
  SeenMap,
  WorldState,
} from '@/engine/types';
import * as engine from '@/engine/resolve';
import { fortuneMax } from '@/engine/progression';
import { newSeed } from '@/engine/rng';
import { PERSIST_VERSION, runMigrations } from '@/state/migrations';
import { selectGameState, writeGameState } from '@/state/selectors';

export interface Prefs {
  cps: number;
  showOdds: boolean;
  fontScale: 1 | 1.25 | 1.5;
  reducedMotion: 'auto' | 'on';
}

export type Screen = 'inicio' | 'cargando' | 'escena' | 'fin' | 'error';

export interface PersistedSlice {
  characters: Character[];
  activeCharacterId: string | null;
  world: WorldState;
  seen: Record<string, SeenMap>;
  prefs: Prefs;
}

export interface UiSlice {
  screen: Screen;
  campaign: Campaign | null;
  pending: PendingRoll | null;
  error: string | null;
  endSummary: EndSummary | null;
}

export interface CreateCharacterInput {
  name: string;
  classId: ClassId;
  portrait: string;
  traits: TraitId[];
  attrs: Record<Attr, number>;
}

export interface Actions {
  /** Crea un personaje de nivel 1 y lo activa. Devuelve su id. Lanza si ya hay LIMITS.maxCharacters. */
  createCharacter(input: CreateCharacterInput): string;
  /** Fase A: 'Prueba', mago de nivel 3 con Saber 2 / Astucia 1 / Presencia 1 / Vigor 0. Lo activa. */
  createTestCharacter(): string;
  /** 'cargando' → carga la campaña → run nuevo → enter(start) → 'escena'. Si falla: ui.error y 'error'. */
  startRun(campaignId: string): Promise<void>;
  /** Carga la campaña del run del personaje activo y reconstruye ui.pending con restorePending. */
  continueRun(): Promise<void>;
  /** Opción sin tirada. Si el run termina (outcome), pasa a 'fin'. */
  choose(choiceId: string): void;
  /** Fase 1 de la tirada: ui.pending completo y run.pending mínimo persistido. */
  beginRoll(choiceId: string): void;
  /** Gasta 1 Fortuna para repetir un dado; actualiza ui.pending y run.pending.rerolls. */
  rerollDie(dieIndex: number): void;
  /** Usa el Poder de clase si aplica; actualiza ui.pending y run.pending.powerUsed. */
  usePower(): void;
  /** Fase 2 de la tirada: consolida, limpia pending y avanza; si el run termina, 'fin'. */
  commitRoll(): void;
  /** Desde 'fin': endRun → escribe world y personaje (run = null), ui.endSummary → 'inicio'. */
  finishRun(): void;
  /** Marca el run como derrota y lo termina con finishRun. */
  abandonRun(): void;
  /** Desde 'error': si hay run en curso, continueRun; si no, 'inicio'. */
  retry(): void;
  setPrefs(p: Partial<Prefs>): void;
}

export type Store = PersistedSlice & { ui: UiSlice } & Actions;

export type AppStore = UseBoundStore<Mutate<StoreApi<Store>, [['zustand/persist', PersistedSlice]]>>;

export const STORAGE_KEY = 'juegorol';

export const DEFAULT_PREFS: Prefs = { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' };

const INITIAL_UI: UiSlice = { screen: 'inicio', campaign: null, pending: null, error: null, endSummary: null };

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** localStorage envuelto en try/catch: sin almacenamiento o sin cuota, el juego sigue en memoria. */
const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      return globalThis.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      globalThis.localStorage.setItem(name, value);
    } catch (e) {
      console.warn(`No se pudo guardar la partida (${errorMessage(e)}). Exportá tu guardado desde Opciones.`);
    }
  },
  removeItem: (name: string): void => {
    try {
      globalThis.localStorage.removeItem(name);
    } catch {
      // Sin almacenamiento no hay nada que borrar.
    }
  },
};

function newId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function buildCharacter(input: CreateCharacterInput, level: number): Character {
  return {
    id: newId(),
    name: input.name,
    portrait: input.portrait,
    classId: input.classId,
    attrs: { ...input.attrs },
    traits: [...input.traits],
    skills: [],
    level,
    xp: LIMITS.xpPerLevel * (level - 1),
    flags: input.traits.map((t) => `char:origen.${t}`),
    memoryNames: {},
    relics: [],
    scars: [],
    campaignLog: {},
    run: null,
  };
}

/** Pide al navegador que no borre el almacenamiento; falla en silencio donde no existe. */
function requestPersistentStorage(): void {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.persist === 'function') {
      void navigator.storage.persist();
    }
  } catch {
    // No disponible: no importa.
  }
}

function activeCharacter(s: PersistedSlice): Character | null {
  return s.characters.find((c) => c.id === s.activeCharacterId) ?? null;
}

async function loadCampaign(campaignId: string): Promise<Campaign> {
  const entry = CAMPAIGNS[campaignId];
  if (!entry) throw new Error(`Campaña desconocida: ${campaignId}`);
  return entry.load();
}

function newRun(campaign: Campaign, character: Character): Run {
  return {
    campaignId: campaign.id,
    contentVersion: campaign.contentVersion,
    sceneId: campaign.start,
    flags: [],
    stagedFlags: [],
    visited: {},
    items: [],
    wounds: 0,
    conditions: [],
    fortune: fortuneMax(character.level),
    powerUsed: false,
    clocks: {},
    milestones: [],
    log: [],
    rngSeed: newSeed(`${Date.now()}|${Math.random()}`),
  };
}

/** Tupla mínima que se persiste para poder reconstruir el PendingRoll al recargar. */
function toPersisted(pending: PendingRoll): PendingPersisted {
  return { choiceId: pending.choiceId, rerolls: [...pending.rerolls], powerUsed: pending.powerUsed };
}

function partialize(s: Store): PersistedSlice {
  return {
    characters: s.characters,
    activeCharacterId: s.activeCharacterId,
    world: s.world,
    seen: s.seen,
    prefs: s.prefs,
  };
}

export function createAppStore(): AppStore {
  return create<Store>()(
    persist<Store, [], [], PersistedSlice>(
      (set, get) => {
        const addCharacter = (character: Character): void => {
          set((s) => ({ characters: [...s.characters, character], activeCharacterId: character.id }));
        };
        const setUi = (patch: Partial<UiSlice>): void => {
          set((s) => ({ ui: { ...s.ui, ...patch } }));
        };
        const fail = (e: unknown): void => {
          setUi({ screen: 'error', error: errorMessage(e) });
        };
        /** Campaña cargada y GameState del personaje activo con partida; null si falta alguno. */
        const playing = (): { campaign: Campaign; gs: GameState } | null => {
          const st = get();
          const gs = selectGameState(st);
          return st.ui.campaign && gs ? { campaign: st.ui.campaign, gs } : null;
        };
        /** Escribe un PendingRoll nuevo en ui.pending y su tupla mínima en run.pending. */
        const writePending = (gs: GameState, pending: PendingRoll): void => {
          const run: Run = { ...gs.run, pending: toPersisted(pending) };
          set((s) => ({
            ...writeGameState(s, { ...gs, run }),
            ui: { ...s.ui, pending },
          }));
        };

        return {
          characters: [],
          activeCharacterId: null,
          world: { flags: [], fallen: [] },
          seen: {},
          prefs: { ...DEFAULT_PREFS },
          ui: { ...INITIAL_UI },

          createCharacter(input) {
            if (get().characters.length >= LIMITS.maxCharacters) {
              throw new Error(`No se pueden tener más de ${LIMITS.maxCharacters} personajes`);
            }
            const character = buildCharacter(input, 1);
            addCharacter(character);
            requestPersistentStorage();
            return character.id;
          },

          createTestCharacter() {
            const character = buildCharacter(
              {
                name: 'Prueba',
                classId: 'mago',
                portrait: 'mago_01',
                traits: ['aprendiz_de_escriba', 'cazador_furtivo'],
                attrs: { vigor: 0, astucia: 1, saber: 2, presencia: 1 },
              },
              3,
            );
            addCharacter(character);
            return character.id;
          },

          async startRun(campaignId) {
            setUi({ screen: 'cargando', error: null, pending: null, endSummary: null });
            try {
              const campaign = await loadCampaign(campaignId);
              const st = get();
              const character = activeCharacter(st);
              if (!character) throw new Error('No hay personaje activo');
              const run = newRun(campaign, character);
              const seen = st.seen[campaign.id] ?? {};
              const entered = engine.enter(campaign, { world: st.world, character, run, seen }, campaign.start);
              set((s) => ({
                ...writeGameState(s, entered),
                ui: { ...s.ui, screen: entered.run.outcome ? 'fin' : 'escena', campaign, pending: null },
              }));
            } catch (e) {
              fail(e);
            }
          },

          async continueRun() {
            const character = activeCharacter(get());
            if (!character || !character.run) {
              setUi({ screen: 'inicio' });
              return;
            }
            setUi({ screen: 'cargando', error: null });
            try {
              const campaign = await loadCampaign(character.run.campaignId);
              const gs = selectGameState(get());
              if (!gs) throw new Error('La partida ya no existe');
              const pending = engine.restorePending(campaign, gs);
              setUi({ screen: gs.run.outcome ? 'fin' : 'escena', campaign, pending });
            } catch (e) {
              fail(e);
            }
          },

          choose(choiceId) {
            const ctx = playing();
            if (!ctx) return;
            const next = engine.choose(ctx.campaign, ctx.gs, choiceId);
            set((s) => ({
              ...writeGameState(s, next),
              ui: { ...s.ui, screen: next.run.outcome ? 'fin' : 'escena' },
            }));
          },

          beginRoll(choiceId) {
            const ctx = playing();
            if (!ctx) return;
            const pending = engine.beginRoll(ctx.campaign, ctx.gs, choiceId);
            writePending(ctx.gs, pending);
          },

          rerollDie(dieIndex) {
            const ctx = playing();
            const current = get().ui.pending;
            if (!ctx || !current || !current.canReroll) return;
            const pending = engine.rerollDie(ctx.campaign, ctx.gs, current, dieIndex);
            writePending(ctx.gs, pending);
          },

          usePower() {
            const ctx = playing();
            const current = get().ui.pending;
            if (!ctx || !current || !current.canUsePower) return;
            const pending = engine.usePower(ctx.campaign, ctx.gs, current);
            writePending(ctx.gs, pending);
          },

          commitRoll() {
            const ctx = playing();
            const current = get().ui.pending;
            if (!ctx || !current) return;
            const next = engine.commitRoll(ctx.campaign, ctx.gs, current);
            set((s) => ({
              ...writeGameState(s, next),
              ui: { ...s.ui, pending: null, screen: next.run.outcome ? 'fin' : 'escena' },
            }));
          },

          finishRun() {
            const ctx = playing();
            if (!ctx) {
              setUi({ screen: 'inicio', campaign: null, pending: null });
              return;
            }
            const { world, character, summary } = engine.endRun(ctx.campaign, ctx.gs);
            set((s) => ({
              world,
              characters: s.characters.map((c) => (c.id === character.id ? character : c)),
              ui: { ...s.ui, screen: 'inicio', campaign: null, pending: null, endSummary: summary },
            }));
          },

          abandonRun() {
            const ctx = playing();
            if (!ctx) return;
            const run: Run = { ...ctx.gs.run, outcome: { kind: 'defeat' } };
            set((s) => ({
              ...writeGameState(s, { ...ctx.gs, run }),
              ui: { ...s.ui, pending: null, screen: 'fin' },
            }));
            get().finishRun();
          },

          retry() {
            const character = activeCharacter(get());
            if (character?.run) {
              void get().continueRun();
            } else {
              setUi({ screen: 'inicio', error: null });
            }
          },

          setPrefs(p) {
            set((s) => ({ prefs: { ...s.prefs, ...p } }));
          },
        };
      },
      {
        name: STORAGE_KEY,
        version: PERSIST_VERSION,
        storage: createJSONStorage(() => safeStorage),
        partialize,
        migrate: (persisted, version) => runMigrations(persisted, version) as PersistedSlice,
      },
    ),
  );
}

export const useStore: AppStore = createAppStore();
```

- [ ] **Paso 20: Correr el test y verificar que pasa**

```
npx vitest run tests/state/store.test.ts
```

Resultado esperado: `24 passed` (los 18 anteriores más los 6 de tirada y recarga). Si el test de recarga fallara comparando dados, revisar que `engine.restorePending` (tarea 10) repita los índices en el mismo orden que `run.pending.rerolls` y que el store no toque `run.rngSeed` ni `run.visited` entre `beginRoll` y `commitRoll`.

- [ ] **Paso 21: Commit**

```bash
git add src/state/store.ts tests/state/store.test.ts
git commit -m "feat(state): tirada en dos fases con pending persistido y reconstrucción al recargar

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Verificación de la tarea

- [ ] **Paso 22: Verificación de la tarea**

```
npx vitest run
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: todos los tests del repositorio en verde (los 4 de `tests/state/migrations.test.ts` y los 24 de `tests/state/store.test.ts` incluidos) y `tsc` sin errores (en particular sin `any`, sin non-null assertions fuera de los tests y con `@/state/store` exportando `createAppStore`, `useStore`, `Store`, `AppStore`, `PersistedSlice`, `UiSlice`, `Actions`, `Prefs`, `Screen`, `CreateCharacterInput`, `STORAGE_KEY` y `DEFAULT_PREFS`).

Criterio de aceptación: con un store creado por `createAppStore()`, `createTestCharacter()` + `startRun('prueba')` entra a `p_umbral`, `beginRoll` + `rerollDie` dejan la tupla mínima en `localStorage["juegorol"]` (sin `ui` ni acciones) y un store nuevo que llama a `continueRun()` reconstruye exactamente los mismos dados; `commitRoll` limpia el pending, `abandonRun` termina la partida dejando `run = null` en inicio, `setPrefs` persiste, y con un `localStorage` que lanza `QuotaExceededError` el store sigue funcionando sin lanzar.

---

### Tarea 14: UI mínima de la rebanada vertical (pantallas y componentes)

Con esta tarea el juego pasa a ser jugable en el navegador: pantallas de inicio, carga, escena, fin y error, con placeholders grises en lugar de arte. Todo es React 19 + CSS Modules, sin librerías de UI. La UI **no evalúa reglas**: lee el store (tarea 13), le pide al motor puro (`render` de la tarea 10) la escena ya resuelta y despacha acciones del store. Los textos de interfaz viven todos en `src/ui/strings.es.ts`.

**Archivos:**
- Crear: `src/ui/strings.es.ts`
- Crear: `src/ui/components/Placeholder.tsx`, `src/ui/components/Placeholder.module.css`
- Crear: `src/ui/components/OptionList.tsx`, `src/ui/components/OptionList.module.css`
- Crear: `src/ui/components/RollPanel.tsx`, `src/ui/components/RollPanel.module.css`
- Crear: `src/ui/components/StatusBar.tsx`, `src/ui/components/StatusBar.module.css`
- Crear: `src/ui/components/TextColumn.tsx`, `src/ui/components/TextColumn.module.css`
- Crear: `src/ui/screens/InicioScreen.tsx`, `src/ui/screens/InicioScreen.module.css`
- Crear: `src/ui/screens/EscenaScreen.tsx`, `src/ui/screens/EscenaScreen.module.css`
- Crear: `src/ui/screens/FinScreen.tsx`, `src/ui/screens/FinScreen.module.css`
- Crear: `src/ui/screens/CargandoScreen.tsx`, `src/ui/screens/CargandoScreen.module.css`
- Crear: `src/ui/screens/ErrorScreen.tsx`, `src/ui/screens/ErrorScreen.module.css`
- Crear: `src/app/ScreenRouter.tsx`
- Crear (si no existe): `src/vite-env.d.ts` (tipos de `*.module.css`)
- Modificar: `src/app/App.tsx` (reemplazar el "Hola" de la tarea 1 por `ErrorBoundary` + listener de `vite:preloadError` + `ScreenRouter`)
- Modificar: `src/app/tokens.css` (NO se reemplaza: se **agrega** una sola variable, `--color-placeholder`; el resto de los tokens son los de la tarea 1)
- Modificar: `src/state/selectors.ts` (tarea 13: hoistear la constante `EMPTY_SEEN` para que `selectGameState` devuelva una referencia estable cuando no hay `seen` de la campaña; sin eso `useShallow` entra en bucle)
- Modificar: `src/main.tsx` (reemplazar el contenido completo; monta `App` sin non-null assertion)
- Modificar: `tests/smoke.test.ts` (tarea 1: el `<h1>` ya no dice "Hola" sino `S.titulo`; se reescribe para que espere el título del prototipo)
- Test: `tests/ui/OptionList.test.tsx`, `tests/ui/RollPanel.test.tsx`, `tests/ui/flow.test.tsx`

**Interfaces:**
- Consume (tarea 1, `src/app/tokens.css`): las variables `--color-fondo`, `--color-superficie`, `--color-superficie-alta`, `--color-borde`, `--color-texto`, `--color-texto-suave`, `--color-acento`, `--color-seguro`, `--color-arriesgado`, `--color-peligroso`, `--fuente-juego`, `--fuente-ui`, `--tam-texto-juego`, `--tam-ui-chico`, `--interlineado-juego`, `--escala-fuente`, `--esp-1` … `--esp-7`, `--radio`, `--ancho-columna-max`, más el reset (`button { font: inherit; cursor: pointer }`, `:focus-visible`, `p { margin: 0 }`, `h1 { font-family: var(--fuente-juego) }`). Esta tarea agrega `--color-placeholder`.
- Consume (tarea 2, `@/content/catalog`): `ATTR_NAMES: Record<Attr, string>`, `DIFFICULTY_NAMES: Record<Difficulty, string>`, `CLASSES`, `CONDITIONS`, `WOUND_LABELS`, tipos `ConditionId`, `ClassId`.
- Consume (tarea 3, `@/content/schema`): tipos `Campaign`, `Scene`, `Paragraph`.
- Consume (tarea 8, `@/engine/progression`): `fortuneMax(level: number): number`.
- Consume (tarea 9/10, `@/engine/resolve`): `render(campaign: Campaign, state: GameState): RenderedScene` (importado como `renderScene` para no chocar con el `render` de Testing Library).
- Consume (tarea 9/10, `@/engine/types`): `RenderedChoice`, `RenderedScene`, `RollPreview`, `PendingRoll`, `LogEntry`, `ResolvedParagraph`, `GameState`, `SeenMap`.
- Consume (tarea 11): `campaign: Campaign` de `@/content/campaigns/prueba/campaign` (solo en `flow.test.tsx`, para leer los textos esperados) y `WORLD: WorldContent` de `@/content/world`.
- Consume (tarea 13, `@/state/store`): `useStore`, tipo `Store`, tipo `Screen`, acciones `createTestCharacter(): string`, `startRun(campaignId: string): Promise<void>`, `continueRun(): Promise<void>`, `choose(choiceId: string): void`, `beginRoll(choiceId: string): void`, `rerollDie(dieIndex: number): void`, `usePower(): void`, `commitRoll(): void`, `finishRun(): void`, `abandonRun(): void`, `retry(): void`; slices `characters`, `activeCharacterId`, `prefs.showOdds`, `ui.screen`, `ui.campaign`, `ui.pending`, `ui.error`, `ui.endSummary`. De `@/state/selectors`: `selectGameState(s: Store): GameState | null` (esta tarea le cambia solo la referencia devuelta en `seen` cuando falta la campaña; la firma no cambia).
- Produce (`src/ui/strings.es.ts`): `export const S = { … } as const` con todas las cadenas de UI (ver código del paso 3).
- Produce (`src/ui/components/Placeholder.tsx`): `export interface PlaceholderProps { label: string; aspect: '16:9' | '3:4' }`, `export function Placeholder(props: PlaceholderProps)`.
- Produce (`src/ui/components/OptionList.tsx`): `export interface OptionListProps { choices: RenderedChoice[]; showOdds: boolean; wounds: 0 | 1 | 2 | 3; onPick: (choiceId: string) => void }`, `export function OptionList(props: OptionListProps)`, `export function formatAttrChip(preview: RollPreview): string`, `export function formatOdds(odds: RollPreview['odds']): string`.
- Produce (`src/ui/components/RollPanel.tsx`): `export interface RollPanelProps { pending: PendingRoll; powerName: string; onReroll: (dieIndex: number) => void; onPower: () => void; onContinue: () => void }`, `export function RollPanel(props: RollPanelProps)`.
- Produce (`src/ui/components/StatusBar.tsx`): `export interface StatusBarProps { placeName: string; wounds: 0 | 1 | 2 | 3; fortune: number; fortuneMax: number; conditions: ConditionId[]; onAbandon: () => void }`, `export function StatusBar(props: StatusBarProps)`.
- Produce (`src/ui/components/TextColumn.tsx`): `export interface TextColumnProps { log: LogEntry[]; nombres: Record<string, string> }` (`nombres` = id de PNJ → nombre visible), `export function TextColumn(props: TextColumnProps)`.
- Produce (`src/ui/screens/*.tsx`): `export function InicioScreen()`, `export function EscenaScreen()`, `export function FinScreen()`, `export function CargandoScreen()`, `export function ErrorScreen()` (sin props; leen el store).
- Produce (`src/app/ScreenRouter.tsx`): `export function ScreenRouter()`.
- Produce (`src/app/App.tsx`): `export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }>`, `export function usePreloadErrorReload(): void`, `export function App()`, `export default App`.
- Produce (`src/app/tokens.css`): la variable nueva `--color-placeholder` (gris de las cajas de arte provisorio).
- Convención para tests: cada botón de opción lleva `data-testid="opcion-<choiceId>"`; cada dado del panel de tirada lleva `data-testid="dado-<índice>"` y `data-kept`; el total lleva `data-testid="total"`; el sello de banda lleva `data-banda`.

Notas antes de empezar:
- Todos los tests de UI llevan en la primera línea el docblock `/** @vitest-environment jsdom */` y llaman a `cleanup()` en `afterEach` (no dependemos de `globals: true`).
- `window.confirm` no existe en jsdom: los tests lo reemplazan con `vi.spyOn(window, 'confirm')`.
- Por la configuración de la tarea 1 (`vite.config.ts`: `test.css.include: [/\.module\.css$/]`, `classNameStrategy: 'non-scoped'`), en Vitest los CSS Modules devuelven el nombre de la clave (`styles.fila === 'fila'`). Igual los tests usan atributos `data-*` y estilos inline (`opacity`) para no depender de nombres de clase.
- Los `*.module.css` de esta tarea consumen los tokens de la tarea 1 tal cual están (`--esp-*`, `--fuente-juego`, `--color-superficie`, `--color-superficie-alta`, …); no se inventa un segundo juego de nombres. Escala de espaciado usada: `--esp-1` (4px), `--esp-2` (8px), `--esp-4` (16px), `--esp-6` (32px).
- `selectGameState` construye un objeto nuevo en cada llamada; en React hay que envolverlo con `useShallow` de `zustand/react/shallow`. `useShallow` compara las claves de primer nivel (`world`, `character`, `run`, `seen`), así que cada una tiene que ser una referencia estable mientras el estado no cambie. Por eso el paso 17 reemplaza el `?? {}` de `seen` (tarea 13) por una constante hoisteada `EMPTY_SEEN`: con `{}` nuevo en cada llamada, un guardado sin `seen[campaignId]` haría entrar a React en "Maximum update depth exceeded".

---

#### Ciclo 1: OptionList (lista de opciones con chips, teclado y confirmación de escena mortal)

- [ ] **Paso 1: Escribir el test que falla** → crear `tests/ui/OptionList.test.tsx` con este contenido completo:

```tsx
/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { OptionList } from '@/ui/components/OptionList';
import { S } from '@/ui/strings.es';
import type { RenderedChoice, RollPreview } from '@/engine/types';

const preview: RollPreview = {
  attr: 'saber',
  attrValue: 2,
  difficulty: 'normal',
  difficultyMod: 0,
  veteranMod: 0,
  totalMod: 2,
  mode: 'advantage',
  sources: [{ kind: 'advantage', label: 'Aprendiz de escriba', origin: 'trait', cancelled: false }],
  odds: { success: 15 / 36, partial: 15 / 36, failure: 6 / 36 },
  risk: 'arriesgado',
  targetLine: 'Necesitás 8+ en los dados para éxito, 5+ con costo',
};

const previewAnulada: RollPreview = {
  attr: 'vigor',
  attrValue: 0,
  difficulty: 'dificil',
  difficultyMod: -1,
  veteranMod: 0,
  totalMod: -1,
  mode: 'cancelled',
  sources: [
    { kind: 'advantage', label: 'Situación', origin: 'scene', cancelled: true },
    { kind: 'disadvantage', label: 'Debilidad: Mago', origin: 'class', cancelled: true },
  ],
  odds: { success: 3 / 36, partial: 12 / 36, failure: 21 / 36 },
  risk: 'peligroso',
  targetLine: 'Necesitás 11+ en los dados para éxito, 8+ con costo',
};

function opcion(base: Pick<RenderedChoice, 'id' | 'label'> & Partial<RenderedChoice>): RenderedChoice {
  return { visible: true, enabled: true, leadsToLethal: false, alreadySeen: false, ...base };
}

const opciones: RenderedChoice[] = [
  opcion({
    id: 'llave',
    label: 'Trabar la puerta con la llave',
    enabled: false,
    lockedHint: 'Necesitás algo con qué trabar la puerta',
    badge: 'Llave de hierro',
  }),
  opcion({ id: 'leer', label: 'Leer la inscripción', preview, badge: 'Aprendiz de escriba' }),
  opcion({ id: 'forzar', label: 'Forzar la puerta', preview: previewAnulada }),
  opcion({ id: 'bajar', label: 'Bajar a la cripta', leadsToLethal: true, alreadySeen: true }),
  opcion({ id: 'secreta', label: 'Opción oculta', visible: false }),
];

describe('OptionList', () => {
  let onPick: ReturnType<typeof vi.fn<(choiceId: string) => void>>;

  beforeEach(() => {
    onPick = vi.fn<(choiceId: string) => void>();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('muestra label, badge, chip de atributo, fuentes, riesgo y porcentajes', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={1} onPick={onPick} />);

    expect(screen.getByText('Leer la inscripción')).toBeInTheDocument();
    expect(screen.getByText('[Aprendiz de escriba]')).toBeInTheDocument();
    expect(screen.getByText('Saber +2 · Normal')).toBeInTheDocument();
    expect(screen.getByText('▲ Aprendiz de escriba')).toHaveAttribute('data-cancelled', 'false');
    expect(screen.getByText(S.opciones.riesgo.arriesgado)).toHaveAttribute('data-riesgo', 'arriesgado');
    expect(screen.getByText('Éxito 42 % · Con costo 42 % · Fallo 17 %')).toBeInTheDocument();

    expect(screen.getByText('Vigor -1 · Difícil')).toBeInTheDocument();
    expect(screen.getByText('▲ Situación')).toHaveAttribute('data-cancelled', 'true');
    expect(screen.getByText('▼ Debilidad: Mago')).toHaveAttribute('data-cancelled', 'true');
    expect(screen.getByText(S.opciones.riesgo.peligroso)).toHaveAttribute('data-riesgo', 'peligroso');
    expect(screen.getByText('Éxito 8 % · Con costo 33 % · Fallo 58 %')).toBeInTheDocument();

    expect(screen.getByText(S.opciones.mortal)).toBeInTheDocument();
    expect(screen.getByText(S.opciones.yaElegida)).toBeInTheDocument();
    expect(screen.queryByText('Opción oculta')).toBeNull();
  });

  it('oculta los porcentajes cuando showOdds es false', () => {
    render(<OptionList choices={opciones} showOdds={false} wounds={0} onPick={onPick} />);
    expect(screen.queryByText(/Éxito \d+ %/)).toBeNull();
    expect(screen.getByText('Saber +2 · Normal')).toBeInTheDocument();
  });

  it('una opción bloqueada con lockedHint está deshabilitada, muestra la pista y no elige', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={0} onPick={onPick} />);
    const boton = screen.getByTestId('opcion-llave');
    expect(boton).toBeDisabled();
    expect(screen.getByText('Necesitás algo con qué trabar la puerta')).toBeInTheDocument();
    fireEvent.click(boton);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('la tecla 1 elige la primera opción visible y habilitada (salta la bloqueada)', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={0} onPick={onPick} />);
    fireEvent.keyDown(window, { key: '1' });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith('leer');

    fireEvent.keyDown(window, { key: '2' });
    expect(onPick).toHaveBeenLastCalledWith('forzar');

    fireEvent.keyDown(window, { key: '9' });
    expect(onPick).toHaveBeenCalledTimes(2);
  });

  it('el clic en un botón habilitado llama a onPick con su id', () => {
    render(<OptionList choices={opciones} showOdds={true} wounds={0} onPick={onPick} />);
    fireEvent.click(screen.getByTestId('opcion-forzar'));
    expect(onPick).toHaveBeenCalledWith('forzar');
  });

  it('una opción que lleva a escena mortal pide confirmación con el texto según heridas', () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<OptionList choices={opciones} showOdds={true} wounds={1} onPick={onPick} />);

    fireEvent.click(screen.getByTestId('opcion-bajar'));
    expect(confirmar).toHaveBeenCalledWith(S.opciones.confirmMortal[1]);
    expect(onPick).not.toHaveBeenCalled();

    confirmar.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('opcion-bajar'));
    expect(onPick).toHaveBeenCalledWith('bajar');
  });

  it('la confirmación también se pide al elegir por teclado y usa el texto de Malherido', () => {
    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<OptionList choices={opciones} showOdds={true} wounds={2} onPick={onPick} />);
    fireEvent.keyDown(window, { key: '3' });
    expect(confirmar).toHaveBeenCalledWith(S.opciones.confirmMortal[2]);
    expect(onPick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Paso 2: Correr el test y verificar que falla**

```bash
npx vitest run tests/ui/OptionList.test.tsx
```

Error esperado: `Error: Failed to resolve import "@/ui/components/OptionList" from "tests/ui/OptionList.test.tsx". Does the file exist?` (o `Cannot find module '@/ui/strings.es'`). Si en cambio ves `ReferenceError: document is not defined`, falta el docblock `@vitest-environment jsdom` en la primera línea del test o `jsdom` no está instalado (`npm i -D jsdom`).

- [ ] **Paso 3: Implementación mínima (1/4): las cadenas de UI** → crear `src/ui/strings.es.ts`:

```ts
/**
 * Todas las cadenas de la interfaz en español. Ningún componente escribe texto
 * de UI "a mano": lo toma de acá. Las funciones son plantillas con parámetros.
 */
export const S = {
  titulo: 'Crónicas del Vado — prototipo',
  inicio: {
    continuar: 'Continuar',
    nuevaPrueba: 'Nueva partida de prueba',
    sinPersonaje: 'Todavía no hay personaje. La partida de prueba crea uno (mago de nivel 3).',
    personajeActivo: (nombre: string, clase: string, nivel: number): string =>
      `${nombre} · ${clase} · nivel ${nivel}`,
  },
  cargando: 'Cargando…',
  error: {
    titulo: 'Algo salió mal',
    generico: 'Error desconocido',
    reintentar: 'Reintentar',
    recargar: 'Recargar la página',
  },
  barra: {
    heridas: 'Heridas',
    fortuna: 'Fortuna',
    condiciones: 'Condiciones',
    sinCondiciones: 'sin condiciones',
    abandonar: 'Abandonar',
    confirmarAbandono: 'Si abandonás, la campaña se pierde. Tu personaje conserva lo suyo. ¿Abandonar?',
  },
  opciones: {
    titulo: 'Opciones',
    yaElegida: '· ya elegida',
    exito: 'Éxito',
    conCosto: 'Con costo',
    fallo: 'Fallo',
    mortal: '☠',
    mortalTitulo: 'Lleva a una escena mortal',
    riesgo: { seguro: 'Seguro', arriesgado: 'Arriesgado', peligroso: 'Peligroso' },
    confirmMortal: {
      0: 'Estás sano: un Fallo te deja Malherido.',
      1: 'Estás Herido: un Fallo te deja fuera de la campaña.',
      2: 'Estás Malherido: un Fallo acá te mata.',
      3: 'Estás Malherido: un Fallo acá te mata.',
    },
  },
  tirada: {
    titulo: 'Tirada',
    objetivo: 'Objetivo',
    total: 'Total',
    continuar: 'Continuar',
    repetir: (numeroDado: number): string => `Fortuna: repetir dado ${numeroDado}`,
    poder: (nombre: string): string => `Usar Poder (${nombre})`,
    banda: {
      crit: '¡Crítico!',
      success: 'Éxito',
      partial: 'Con costo',
      failure: 'Fallo',
      fumble: 'Fallo grave',
    },
    modo: {
      normal: 'Tirada normal: 2d6',
      advantage: 'Con ventaja: 3d6, se conservan los 2 mayores',
      disadvantage: 'Con desventaja: 3d6, se conservan los 2 menores',
      cancelled: 'Ventaja y desventaja se anulan: 2d6',
    },
  },
  log: {
    dados: 'Dados',
    total: 'Total',
    fortunaGastada: (n: number): string => (n === 1 ? '1 Fortuna gastada' : `${n} Fortuna gastadas`),
    poderUsado: 'Poder usado',
  },
  fin: {
    final: 'Final',
    derrota: 'Caíste. La campaña se pierde, tu personaje sigue.',
    muerte: 'Tu personaje ha muerto.',
    volver: 'Volver al inicio',
  },
  placeholder: {
    fondo: 'Fondo',
    retrato: 'Retrato',
  },
} as const;
```

- [ ] **Paso 4: Implementación mínima (2/4): tipos de CSS Modules** → si `src/vite-env.d.ts` no existe, crearlo con esta única línea (si ya existe con esta línea, no tocarlo):

```ts
/// <reference types="vite/client" />
```

- [ ] **Paso 5: Implementación mínima (3/4): el componente** → crear `src/ui/components/OptionList.tsx`:

```tsx
import { useCallback, useEffect, useMemo } from 'react';
import { ATTR_NAMES, DIFFICULTY_NAMES } from '@/content/catalog';
import type { RenderedChoice, RollPreview } from '@/engine/types';
import { S } from '@/ui/strings.es';
import styles from './OptionList.module.css';

export interface OptionListProps {
  choices: RenderedChoice[];
  showOdds: boolean;
  wounds: 0 | 1 | 2 | 3;
  onPick: (choiceId: string) => void;
}

/** "Saber +2 · Normal" */
export function formatAttrChip(preview: RollPreview): string {
  const signo = preview.totalMod >= 0 ? '+' : '';
  return `${ATTR_NAMES[preview.attr]} ${signo}${preview.totalMod} · ${DIFFICULTY_NAMES[preview.difficulty]}`;
}

/** "Éxito 42 % · Con costo 42 % · Fallo 17 %" (redondeo al entero) */
export function formatOdds(odds: RollPreview['odds']): string {
  const pct = (x: number): number => Math.round(x * 100);
  return `${S.opciones.exito} ${pct(odds.success)} % · ${S.opciones.conCosto} ${pct(odds.partial)} % · ${S.opciones.fallo} ${pct(odds.failure)} %`;
}

function esCampoDeTexto(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
  );
}

export function OptionList({ choices, showOdds, wounds, onPick }: OptionListProps) {
  const visibles = useMemo(() => choices.filter((c) => c.visible), [choices]);
  const habilitadas = useMemo(() => visibles.filter((c) => c.enabled), [visibles]);

  const elegir = useCallback(
    (choice: RenderedChoice): void => {
      if (!choice.enabled) return;
      if (choice.leadsToLethal && !window.confirm(S.opciones.confirmMortal[wounds])) return;
      onPick(choice.id);
    },
    [wounds, onPick],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (esCampoDeTexto(event.target)) return;
      if (!/^[1-9]$/.test(event.key)) return;
      const choice = habilitadas[Number(event.key) - 1];
      if (choice !== undefined) elegir(choice);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [habilitadas, elegir]);

  return (
    <ol className={styles.lista} aria-label={S.opciones.titulo}>
      {visibles.map((c) => {
        const numero = c.enabled ? String(habilitadas.indexOf(c) + 1) : '—';
        return (
          <li key={c.id} className={styles.fila} data-enabled={c.enabled ? 'true' : 'false'}>
            <button
              type="button"
              className={styles.boton}
              disabled={!c.enabled}
              data-testid={`opcion-${c.id}`}
              onClick={() => elegir(c)}
            >
              <span className={styles.numero}>{numero}</span>
              <span className={styles.label}>{c.label}</span>
              {c.badge !== undefined && <span className={styles.badge}>[{c.badge}]</span>}
              {c.leadsToLethal && (
                <span className={styles.mortal} title={S.opciones.mortalTitulo}>
                  {S.opciones.mortal}
                </span>
              )}
              {c.alreadySeen && <span className={styles.vista}>{S.opciones.yaElegida}</span>}
            </button>
            {c.preview !== undefined && (
              <div className={styles.detalle}>
                <span className={styles.chip}>{formatAttrChip(c.preview)}</span>
                {c.preview.sources.map((fuente, i) => (
                  <span
                    key={`${fuente.origin}-${fuente.label}-${i}`}
                    className={styles.fuente}
                    data-cancelled={fuente.cancelled ? 'true' : 'false'}
                  >
                    {`${fuente.kind === 'advantage' ? '▲' : '▼'} ${fuente.label}`}
                  </span>
                ))}
                <span className={styles.riesgo} data-riesgo={c.preview.risk}>
                  {S.opciones.riesgo[c.preview.risk]}
                </span>
                {showOdds && <span className={styles.odds}>{formatOdds(c.preview.odds)}</span>}
              </div>
            )}
            {!c.enabled && c.lockedHint !== undefined && <p className={styles.hint}>{c.lockedHint}</p>}
          </li>
        );
      })}
    </ol>
  );
}
```

Detalles que importan: las teclas 1-9 y los números pintados se cuentan **solo sobre las opciones visibles y habilitadas** (una bloqueada muestra "—" y no consume número, así el número que ves es la tecla que apretás). `data-cancelled` y `data-riesgo` alimentan el CSS y los tests. El `confirm` de escena mortal usa el número de heridas actual como clave de `S.opciones.confirmMortal`. El componente no sabe si la opción tiene tirada: eso lo decide `EscenaScreen` en `onPick` (ciclo 3).

- [ ] **Paso 6: Implementación mínima (4/4): estilos** → crear `src/ui/components/OptionList.module.css` (solo tokens de la tarea 1):

```css
.lista {
  list-style: none;
  margin: var(--esp-4) 0 0;
  padding: 0;
  display: grid;
  gap: var(--esp-2);
}

.fila {
  border: 1px solid var(--color-borde);
  border-radius: var(--radio);
  padding: var(--esp-2);
  background: var(--color-superficie);
}

.fila[data-enabled='false'] {
  opacity: 0.55;
}

.boton {
  all: unset;
  cursor: pointer;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--esp-2);
  width: 100%;
  font: inherit;
  color: var(--color-texto);
}

.boton:focus-visible {
  outline: 2px solid var(--color-acento);
  outline-offset: 2px;
}

.boton:disabled {
  cursor: not-allowed;
}

.numero {
  min-width: 1.5em;
  font-family: var(--fuente-ui);
  font-weight: 700;
  color: var(--color-acento);
}

.label {
  font-family: var(--fuente-juego);
  font-size: calc(var(--tam-texto-juego) * var(--escala-fuente));
}

.badge,
.vista {
  font-family: var(--fuente-ui);
  font-size: var(--tam-ui-chico);
  color: var(--color-texto-suave);
}

.mortal {
  color: var(--color-peligroso);
}

.detalle {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-1);
  margin-top: var(--esp-1);
  padding-left: 2em;
  font-family: var(--fuente-ui);
  font-size: var(--tam-ui-chico);
}

.chip,
.fuente,
.riesgo,
.odds {
  border-radius: 999px;
  padding: 0.1em 0.6em;
  background: var(--color-superficie-alta);
}

.fuente[data-cancelled='true'] {
  text-decoration: line-through;
  opacity: 0.7;
}

.riesgo[data-riesgo='seguro'] {
  color: var(--color-seguro);
}

.riesgo[data-riesgo='arriesgado'] {
  color: var(--color-arriesgado);
}

.riesgo[data-riesgo='peligroso'] {
  color: var(--color-peligroso);
}

.hint {
  margin: var(--esp-1) 0 0 2em;
  font-family: var(--fuente-ui);
  font-size: var(--tam-ui-chico);
  font-style: italic;
  color: var(--color-texto-suave);
}
```

`all: unset` en `.boton` descarta el reset global de `button` de la tarea 1 (borde, fondo); por eso el botón vuelve a declarar `cursor` y `font`.

- [ ] **Paso 7: Correr el test y verificar que pasa**

```bash
npx vitest run tests/ui/OptionList.test.tsx
```

Resultado esperado: `Test Files 1 passed (1)`, `Tests 7 passed (7)`. Si falla `toHaveAttribute` con "received value must be an HTMLElement", revisá que `tests/setup.ts` importe `@testing-library/jest-dom/vitest` y que `vite.config.ts` lo liste en `test.setupFiles`.

- [ ] **Paso 8: Commit**

```bash
git add src/ui/strings.es.ts src/ui/components/OptionList.tsx src/ui/components/OptionList.module.css src/vite-env.d.ts tests/ui/OptionList.test.tsx
git commit -m "feat(ui): lista de opciones con chips, teclado 1-9 y confirmación de escena mortal

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 2: RollPanel (dados, total, banda, Fortuna, Poder y Continuar)

- [ ] **Paso 9: Escribir el test que falla** → crear `tests/ui/RollPanel.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RollPanel } from '@/ui/components/RollPanel';
import { S } from '@/ui/strings.es';
import type { PendingRoll, RollPreview } from '@/engine/types';

const preview: RollPreview = {
  attr: 'saber',
  attrValue: 2,
  difficulty: 'normal',
  difficultyMod: 0,
  veteranMod: 0,
  totalMod: 2,
  mode: 'advantage',
  sources: [{ kind: 'advantage', label: 'Aprendiz de escriba', origin: 'trait', cancelled: false }],
  odds: { success: 15 / 36, partial: 15 / 36, failure: 6 / 36 },
  risk: 'arriesgado',
  targetLine: 'Necesitás 8+ en los dados para éxito, 5+ con costo',
};

function pendiente(over: Partial<PendingRoll> = {}): PendingRoll {
  return {
    choiceId: 'leer_inscripcion',
    sceneId: 'p_umbral',
    preview,
    dice: [6, 2, 5],
    kept: [0, 2],
    total: 13,
    band: 'success',
    rerolls: [],
    powerUsed: false,
    canReroll: true,
    canUsePower: false,
    ...over,
  };
}

describe('RollPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('muestra objetivo, dados (descartado apagado), total y sello de banda', () => {
    render(
      <RollPanel pending={pendiente()} powerName="Conjuro" onReroll={vi.fn()} onPower={vi.fn()} onContinue={vi.fn()} />,
    );
    expect(screen.getByText(preview.targetLine)).toBeInTheDocument();
    expect(screen.getByText(S.tirada.modo.advantage)).toBeInTheDocument();

    expect(screen.getByTestId('dado-0')).toHaveTextContent('6');
    expect(screen.getByTestId('dado-1')).toHaveTextContent('2');
    expect(screen.getByTestId('dado-2')).toHaveTextContent('5');
    expect(screen.getByTestId('dado-0')).toHaveAttribute('data-kept', 'true');
    expect(screen.getByTestId('dado-1')).toHaveAttribute('data-kept', 'false');
    expect(screen.getByTestId('dado-1')).toHaveStyle({ opacity: '0.4' });
    expect(screen.getByTestId('dado-2')).toHaveStyle({ opacity: '1' });

    expect(screen.getByTestId('total')).toHaveTextContent('13');
    const sello = screen.getByText(S.tirada.banda.success);
    expect(sello).toHaveAttribute('data-banda', 'success');
  });

  it('muestra el sello de cada banda', () => {
    const bandas = ['crit', 'success', 'partial', 'failure', 'fumble'] as const;
    for (const band of bandas) {
      render(
        <RollPanel pending={pendiente({ band })} powerName="Conjuro" onReroll={vi.fn()} onPower={vi.fn()} onContinue={vi.fn()} />,
      );
      expect(screen.getByText(S.tirada.banda[band])).toHaveAttribute('data-banda', band);
      cleanup();
    }
  });

  it('ofrece un botón de Fortuna por dado solo si canReroll y llama a onReroll con el índice', () => {
    const onReroll = vi.fn<(i: number) => void>();
    render(
      <RollPanel pending={pendiente({ canReroll: true })} powerName="Conjuro" onReroll={onReroll} onPower={vi.fn()} onContinue={vi.fn()} />,
    );
    const botones = screen.getAllByRole('button', { name: /Fortuna: repetir dado/ });
    expect(botones).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: S.tirada.repetir(2) }));
    expect(onReroll).toHaveBeenCalledWith(1);
    cleanup();

    render(
      <RollPanel pending={pendiente({ canReroll: false })} powerName="Conjuro" onReroll={onReroll} onPower={vi.fn()} onContinue={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /Fortuna: repetir dado/ })).toBeNull();
  });

  it('ofrece el botón de Poder solo si canUsePower y llama a onPower', () => {
    const onPower = vi.fn();
    render(
      <RollPanel
        pending={pendiente({ band: 'failure', canUsePower: true })}
        powerName="Conjuro"
        onReroll={vi.fn()}
        onPower={onPower}
        onContinue={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: S.tirada.poder('Conjuro') }));
    expect(onPower).toHaveBeenCalledTimes(1);
    cleanup();

    render(
      <RollPanel pending={pendiente({ canUsePower: false })} powerName="Conjuro" onReroll={vi.fn()} onPower={onPower} onContinue={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /Usar Poder/ })).toBeNull();
  });

  it('Continuar llama a onContinue', () => {
    const onContinue = vi.fn();
    render(
      <RollPanel pending={pendiente()} powerName="Conjuro" onReroll={vi.fn()} onPower={vi.fn()} onContinue={onContinue} />,
    );
    fireEvent.click(screen.getByRole('button', { name: S.tirada.continuar }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Paso 10: Correr el test y verificar que falla**

```bash
npx vitest run tests/ui/RollPanel.test.tsx
```

Error esperado: `Failed to resolve import "@/ui/components/RollPanel"`.

- [ ] **Paso 11: Implementación mínima (1/2): el componente** → crear `src/ui/components/RollPanel.tsx`:

```tsx
import type { PendingRoll } from '@/engine/types';
import { S } from '@/ui/strings.es';
import styles from './RollPanel.module.css';

export interface RollPanelProps {
  pending: PendingRoll;
  powerName: string;
  onReroll: (dieIndex: number) => void;
  onPower: () => void;
  onContinue: () => void;
}

export function RollPanel({ pending, powerName, onReroll, onPower, onContinue }: RollPanelProps) {
  return (
    <section className={styles.panel} aria-label={S.tirada.titulo}>
      <p className={styles.objetivo}>{pending.preview.targetLine}</p>
      <p className={styles.modo}>{S.tirada.modo[pending.preview.mode]}</p>

      <div className={styles.dados}>
        {pending.dice.map((valor, i) => {
          const conservado = pending.kept.includes(i);
          return (
            <span
              key={i}
              className={styles.dado}
              data-testid={`dado-${i}`}
              data-kept={conservado ? 'true' : 'false'}
              style={{ opacity: conservado ? 1 : 0.4 }}
            >
              {valor}
            </span>
          );
        })}
      </div>

      <p className={styles.total}>
        {S.tirada.total}: <strong data-testid="total">{pending.total}</strong>
      </p>
      <p className={styles.sello} data-banda={pending.band}>
        {S.tirada.banda[pending.band]}
      </p>

      <div className={styles.acciones}>
        {pending.canReroll &&
          pending.dice.map((_, i) => (
            <button key={i} type="button" className={styles.secundario} onClick={() => onReroll(i)}>
              {S.tirada.repetir(i + 1)}
            </button>
          ))}
        {pending.canUsePower && (
          <button type="button" className={styles.secundario} onClick={onPower}>
            {S.tirada.poder(powerName)}
          </button>
        )}
        <button type="button" className={styles.primario} onClick={onContinue}>
          {S.tirada.continuar}
        </button>
      </div>
    </section>
  );
}
```

`pending.kept` son **índices** de `pending.dice` (así lo devuelve `keepDice` en la tarea 4), por eso `kept.includes(i)`. El panel es tonto a propósito: no decide si se puede repetir o usar el Poder; eso viene calculado en `PendingRoll` (`canReroll`, `canUsePower`) desde el motor.

- [ ] **Paso 12: Implementación mínima (2/2): estilos** → crear `src/ui/components/RollPanel.module.css`:

```css
.panel {
  margin-top: var(--esp-4);
  padding: var(--esp-4);
  border: 1px solid var(--color-borde);
  border-radius: var(--radio);
  background: var(--color-superficie);
  font-family: var(--fuente-ui);
}

.objetivo {
  margin: 0 0 var(--esp-1);
  font-weight: 600;
}

.modo {
  margin: 0 0 var(--esp-2);
  font-size: var(--tam-ui-chico);
  color: var(--color-texto-suave);
}

.dados {
  display: flex;
  gap: var(--esp-2);
  margin-bottom: var(--esp-2);
}

.dado {
  display: inline-grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  border: 2px solid var(--color-borde);
  border-radius: var(--radio);
  font-size: 2rem;
  font-weight: 700;
  background: var(--color-fondo);
}

.total {
  margin: 0 0 var(--esp-1);
  font-size: 1.1rem;
}

.sello {
  display: inline-block;
  margin: 0 0 var(--esp-2);
  padding: 0.2em 0.8em;
  border-radius: 999px;
  font-weight: 700;
  background: var(--color-superficie-alta);
}

.sello[data-banda='crit'],
.sello[data-banda='success'] {
  color: var(--color-seguro);
}

.sello[data-banda='partial'] {
  color: var(--color-arriesgado);
}

.sello[data-banda='failure'],
.sello[data-banda='fumble'] {
  color: var(--color-peligroso);
}

.acciones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
}

.primario,
.secundario {
  padding: 0.5em 1em;
  border-radius: var(--radio);
  border: 1px solid var(--color-borde);
  background: var(--color-superficie-alta);
  color: var(--color-texto);
}

.primario {
  background: var(--color-acento);
  color: var(--color-fondo);
  border-color: var(--color-acento);
}
```

(`font: inherit`, `cursor: pointer` y el `:focus-visible` ya vienen del reset de `tokens.css` de la tarea 1.)

- [ ] **Paso 13: Correr el test y verificar que pasa**

```bash
npx vitest run tests/ui/RollPanel.test.tsx
```

Resultado esperado: `Tests 5 passed (5)`.

- [ ] **Paso 14: Commit**

```bash
git add src/ui/components/RollPanel.tsx src/ui/components/RollPanel.module.css tests/ui/RollPanel.test.tsx
git commit -m "feat(ui): panel de tirada inline con dados, banda, Fortuna y Poder

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 3: pantallas, router, App y flujo completo inicio → escena → opción → nueva escena

Este ciclo es el más largo: un test de flujo que monta `<App />` completa y varios archivos de implementación (uno por paso). El test recién pasa al final del ciclo; no te preocupes si falla "por el camino" con módulos faltantes. Al reemplazar `App`, el test de humo de la tarea 1 (`tests/smoke.test.ts`, que espera un `<h1>` con "Hola") deja de ser válido: el paso 29 lo reescribe para que espere `S.titulo`.

- [ ] **Paso 15: Escribir el test que falla** → crear `tests/ui/flow.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '@/app/App';
import { useStore } from '@/state/store';
import { selectGameState } from '@/state/selectors';
import { campaign } from '@/content/campaigns/prueba/campaign';
import type { Scene } from '@/content/schema';
import { S } from '@/ui/strings.es';

function escena(id: string): Scene {
  const s = campaign.scenes[id];
  if (s === undefined) throw new Error(`La campaña de prueba no tiene la escena ${id}`);
  return s;
}

/**
 * Devuelve un texto de la escena que se renderiza sí o sí en la primera visita:
 * el primer párrafo de narrador simple (string) o, si no hay, el primer Paragraph
 * con una sola variante sin `when`.
 */
function textoSeguro(scene: Scene): string {
  for (const p of scene.text) {
    if (typeof p === 'string') return p;
  }
  for (const p of scene.text) {
    if (typeof p === 'string' || p.variants.length !== 1) continue;
    const unica = p.variants[0];
    if (unica !== undefined && unica.when === undefined) return unica.text;
  }
  throw new Error(`La escena ${scene.id} no tiene un párrafo sin variantes; ajustá textoSeguro`);
}

/** Texto de la variante "otra vez" (la que depende de `visited`) de una escena. */
function varianteDeVisita(scene: Scene): string {
  for (const p of scene.text) {
    if (typeof p === 'string') continue;
    for (const v of p.variants) {
      if (v.when !== undefined && 'visited' in v.when) return v.text;
    }
  }
  throw new Error(`La escena ${scene.id} no tiene una variante con visited`);
}

function reiniciarStore(): void {
  localStorage.clear();
  useStore.setState({
    characters: [],
    activeCharacterId: null,
    world: { flags: [], fallen: [] },
    seen: {},
    prefs: { cps: 40, showOdds: true, fontScale: 1, reducedMotion: 'auto' },
    ui: { screen: 'inicio', campaign: null, pending: null, error: null, endSummary: null },
  });
}

describe('flujo de la rebanada vertical', () => {
  beforeEach(() => {
    reiniciarStore();
  });

  afterEach(() => {
    cleanup();
  });

  it('inicio → nueva partida → escena p_umbral sin "otra vez" → opción sin tirada → nueva escena en el log', async () => {
    render(<App />);
    expect(screen.getByText(S.titulo)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: S.inicio.continuar })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: S.inicio.nuevaPrueba }));

    const umbral = escena('p_umbral');
    await screen.findByText(textoSeguro(umbral), undefined, { timeout: 5000 });
    expect(useStore.getState().ui.screen).toBe('escena');
    expect(screen.queryByText(varianteDeVisita(umbral))).toBeNull();

    const rodear = umbral.choices.find((c) => c.id === 'rodear_patio');
    if (rodear === undefined) throw new Error('p_umbral no tiene la opción rodear_patio');
    const boton = screen.getByTestId('opcion-rodear_patio');
    expect(boton).toBeEnabled();
    expect(boton).toHaveTextContent(rodear.label);

    fireEvent.click(boton);

    const patio = escena('p_patio');
    await screen.findByText(textoSeguro(patio));
    expect(screen.getByText(`› ${rodear.label}`)).toBeInTheDocument();
    expect(screen.getByText(textoSeguro(umbral))).toBeInTheDocument();

    const gs = selectGameState(useStore.getState());
    expect(gs?.run.sceneId).toBe('p_patio');
    expect(gs?.run.visited['p_umbral']).toBe(1);
    expect(useStore.getState().ui.screen).toBe('escena');
  });

  it('una opción con tirada muestra el panel, persiste run.pending y Continuar consolida', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: S.inicio.nuevaPrueba }));
    const umbral = escena('p_umbral');
    await screen.findByText(textoSeguro(umbral), undefined, { timeout: 5000 });

    fireEvent.click(screen.getByTestId('opcion-leer_inscripcion'));

    const continuar = await screen.findByRole('button', { name: S.tirada.continuar });
    expect(screen.getByTestId('total')).toBeInTheDocument();
    expect(screen.queryByTestId('opcion-leer_inscripcion')).toBeNull();

    const antes = selectGameState(useStore.getState());
    expect(antes?.run.pending).toEqual({ choiceId: 'leer_inscripcion', rerolls: [], powerUsed: false });
    expect(useStore.getState().ui.pending?.choiceId).toBe('leer_inscripcion');

    fireEvent.click(continuar);

    const biblioteca = escena('p_biblioteca');
    await screen.findByText(textoSeguro(biblioteca));
    const despues = selectGameState(useStore.getState());
    expect(despues?.run.pending).toBeUndefined();
    expect(despues?.run.sceneId).toBe('p_biblioteca');
    expect(despues?.run.log.some((e) => e.kind === 'roll')).toBe(true);
    expect(useStore.getState().ui.pending).toBeNull();
  });

  it('con un guardado sin seen[campaignId], la escena se renderiza sin bucle de renders', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: S.inicio.nuevaPrueba }));
    const umbral = escena('p_umbral');
    await screen.findByText(textoSeguro(umbral), undefined, { timeout: 5000 });

    // Simula un guardado viejo o un fixture que nunca escribió `seen` para la campaña.
    useStore.setState({ seen: {} });

    // Si selectGameState devolviera un `{}` nuevo por llamada, useShallow vería un
    // cambio en cada render y React lanzaría "Maximum update depth exceeded".
    await screen.findByText(textoSeguro(umbral));
    expect(selectGameState(useStore.getState())?.seen).toEqual({});
    expect(useStore.getState().ui.screen).toBe('escena');
  });
});
```

Qué prueba y por qué: el primer test es el criterio de aceptación de la Fase A en miniatura (la primera visita no muestra "otra vez"; el historial acumula). El segundo cubre lo que la tarea 13 dejó preparado para "recargar en medio de una tirada": `run.pending` queda persistido en cuanto se muestran los dados. El tercero blinda el arreglo de `EMPTY_SEEN` del paso 17: sin él, `EscenaScreen` con `useShallow(selectGameState)` entra en bucle apenas falta `seen[campaignId]`. Los textos esperados se leen de la propia campaña (`textoSeguro`) para no copiar prosa en el test.

- [ ] **Paso 16: Correr el test y verificar que falla**

```bash
npx vitest run tests/ui/flow.test.tsx
```

Error esperado: `Failed to resolve import "@/app/ScreenRouter" from "src/app/App.tsx"` (o, si `App.tsx` todavía es el "Hola" de la tarea 1, `TestingLibraryElementError: Unable to find an element with the text: Crónicas del Vado — prototipo`).

- [ ] **Paso 17: Implementación (1/13): token `--color-placeholder` y `EMPTY_SEEN` en el selector**

(a) En `src/app/tokens.css` (tarea 1) **no se reemplaza nada**: dentro del bloque `:root`, justo después de la línea `--color-acento-suave: #8a6d2b;`, agregar esta línea:

```css
  --color-placeholder: #4a443c; /* gris de las cajas de arte provisorio (Placeholder) */
```

El resto del archivo (colores, `--fuente-juego`, `--tam-*`, `--escala-fuente`, `--esp-1` … `--esp-7`, `--ancho-columna-max`, `color-scheme: dark` y el reset) queda tal como lo dejó la tarea 1: los `*.module.css` de esta tarea consumen esos nombres.

(b) Reemplazar el contenido completo de `src/state/selectors.ts` (tarea 13) por este, que solo cambia el `?? {}` de `seen` por una constante compartida (la firma y `writeGameState` quedan iguales):

```ts
import type { Character, GameState, SeenMap } from '@/engine/types';
import type { PersistedSlice, Store } from '@/state/store';

/**
 * "Sin párrafos vistos" con referencia estable. `selectGameState` se usa con
 * `useShallow` en la UI: si acá devolviéramos un `{}` nuevo por llamada,
 * cada render vería un `seen` distinto y React entraría en bucle.
 */
const EMPTY_SEEN: SeenMap = {};

/** Arma el GameState del personaje activo, o null si no hay personaje activo o no tiene partida en curso. */
export function selectGameState(s: Store): GameState | null {
  const character = s.characters.find((c) => c.id === s.activeCharacterId);
  if (!character || !character.run) return null;
  return {
    world: s.world,
    character,
    run: character.run,
    seen: s.seen[character.run.campaignId] ?? EMPTY_SEEN,
  };
}

/** Reparte un GameState nuevo en las porciones persistidas del store. No muta nada. */
export function writeGameState(s: Store, gs: GameState): Partial<PersistedSlice> {
  const character: Character = { ...gs.character, run: gs.run };
  return {
    world: gs.world,
    characters: s.characters.map((c) => (c.id === character.id ? character : c)),
    seen: { ...s.seen, [gs.run.campaignId]: gs.seen },
  };
}
```

Comprobación rápida de que la tarea 13 sigue en verde después del cambio:

```bash
npx vitest run tests/state
```

Resultado esperado: todos los tests de `tests/state` pasan (el motor nunca muta `seen`, así que compartir el objeto vacío es seguro; `writeGameState` siempre escribe un objeto nuevo).

- [ ] **Paso 18: Implementación (2/13): Placeholder** → crear `src/ui/components/Placeholder.tsx` y `src/ui/components/Placeholder.module.css`:

```tsx
import styles from './Placeholder.module.css';

export interface PlaceholderProps {
  label: string;
  aspect: '16:9' | '3:4';
}

export function Placeholder({ label, aspect }: PlaceholderProps) {
  return (
    <div className={styles.caja} data-aspect={aspect} role="img" aria-label={label}>
      <span className={styles.etiqueta}>{label}</span>
    </div>
  );
}
```

```css
.caja {
  display: grid;
  place-items: center;
  width: 100%;
  background: var(--color-placeholder);
  border-radius: var(--radio);
  color: var(--color-texto-suave);
  font-family: var(--fuente-ui);
  font-size: var(--tam-ui-chico);
}

.caja[data-aspect='16:9'] {
  aspect-ratio: 16 / 9;
}

.caja[data-aspect='3:4'] {
  aspect-ratio: 3 / 4;
  max-width: 160px;
}

.etiqueta {
  padding: var(--esp-2);
  text-align: center;
}
```

- [ ] **Paso 19: Implementación (3/13): StatusBar** → crear `src/ui/components/StatusBar.tsx` y `src/ui/components/StatusBar.module.css`:

```tsx
import { CONDITIONS, WOUND_LABELS, type ConditionId } from '@/content/catalog';
import { S } from '@/ui/strings.es';
import styles from './StatusBar.module.css';

export interface StatusBarProps {
  placeName: string;
  wounds: 0 | 1 | 2 | 3;
  fortune: number;
  fortuneMax: number;
  conditions: ConditionId[];
  onAbandon: () => void;
}

function marcas(llenas: number, total: number, lleno: string, vacio: string): string {
  return Array.from({ length: total }, (_, i) => (i < llenas ? lleno : vacio)).join(' ');
}

export function StatusBar({ placeName, wounds, fortune, fortuneMax, conditions, onAbandon }: StatusBarProps) {
  const nombresCondiciones =
    conditions.length === 0 ? S.barra.sinCondiciones : conditions.map((c) => CONDITIONS[c].name).join(', ');

  const abandonar = (): void => {
    if (window.confirm(S.barra.confirmarAbandono)) onAbandon();
  };

  return (
    <header className={styles.barra}>
      <span className={styles.lugar}>{placeName}</span>
      <span className={styles.dato} title={S.barra.heridas}>
        {S.barra.heridas}: <span aria-hidden="true">{marcas(wounds, 3, '●', '○')}</span> {WOUND_LABELS[wounds]}
      </span>
      <span className={styles.dato} title={S.barra.fortuna}>
        {S.barra.fortuna}: <span aria-hidden="true">{marcas(fortune, fortuneMax, '◆', '◇')}</span> {fortune}/{fortuneMax}
      </span>
      <span className={styles.dato}>
        {S.barra.condiciones}: {nombresCondiciones}
      </span>
      <button type="button" className={styles.abandonar} onClick={abandonar}>
        {S.barra.abandonar}
      </button>
    </header>
  );
}
```

```css
.barra {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--esp-4);
  padding: var(--esp-2) var(--esp-4);
  border-bottom: 1px solid var(--color-borde);
  background: var(--color-superficie);
  font-family: var(--fuente-ui);
  font-size: var(--tam-ui-chico);
}

.lugar {
  font-weight: 700;
  color: var(--color-acento);
}

.dato {
  color: var(--color-texto-suave);
}

.abandonar {
  margin-left: auto;
  padding: 0.3em 0.8em;
  border: 1px solid var(--color-borde);
  border-radius: var(--radio);
  background: transparent;
  color: var(--color-texto);
}
```

- [ ] **Paso 20: Implementación (4/13): TextColumn** → crear `src/ui/components/TextColumn.tsx` y `src/ui/components/TextColumn.module.css`:

```tsx
import { useEffect, useRef } from 'react';
import type { LogEntry, ResolvedParagraph } from '@/engine/types';
import { S } from '@/ui/strings.es';
import styles from './TextColumn.module.css';

export interface TextColumnProps {
  log: LogEntry[];
  /** id de PNJ → nombre visible (campaña ∪ mundo) */
  nombres: Record<string, string>;
}

function Parrafos({ parrafos, nombres }: { parrafos: ResolvedParagraph[]; nombres: Record<string, string> }) {
  return (
    <>
      {parrafos.map((p, i) => (
        <p key={i} className={styles.parrafo}>
          {p.speaker !== undefined && <strong className={styles.hablante}>{nombres[p.speaker] ?? p.speaker}: </strong>}
          <span>{p.text}</span>
        </p>
      ))}
    </>
  );
}

function Entrada({ entry, nombres }: { entry: LogEntry; nombres: Record<string, string> }) {
  switch (entry.kind) {
    case 'scene':
      return (
        <section className={styles.escena} data-scene={entry.sceneId}>
          <Parrafos parrafos={entry.paragraphs} nombres={nombres} />
        </section>
      );
    case 'choice':
      return <p className={styles.eleccion}>{`› ${entry.label}`}</p>;
    case 'roll': {
      const extras: string[] = [];
      if (entry.fortuneSpent > 0) extras.push(S.log.fortunaGastada(entry.fortuneSpent));
      if (entry.powerUsed) extras.push(S.log.poderUsado);
      const cola = extras.length > 0 ? ` (${extras.join(', ')})` : '';
      return (
        <p className={styles.tirada} data-banda={entry.band}>
          {`${S.log.dados}: ${entry.dice.join(' · ')} → ${S.log.total} ${entry.total} · ${S.tirada.banda[entry.band]}${cola}`}
        </p>
      );
    }
    case 'outcome':
      return (
        <section className={styles.resultado}>
          <Parrafos parrafos={entry.paragraphs} nombres={nombres} />
        </section>
      );
  }
}

export function TextColumn({ log, nombres }: TextColumnProps) {
  const fin = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = fin.current;
    if (el !== null && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'end' });
  }, [log.length]);

  return (
    <div className={styles.columna}>
      {log.map((entry, i) => (
        <Entrada key={i} entry={entry} nombres={nombres} />
      ))}
      <div ref={fin} />
    </div>
  );
}
```

```css
/* El texto de juego usa la fuente serif y el tamaño de juego (escalado por prefs.fontScale);
   el body de la tarea 1 está en fuente de UI, por eso se declara acá. */
.columna {
  display: grid;
  gap: var(--esp-2);
  max-width: var(--ancho-columna-max);
  font-family: var(--fuente-juego);
  font-size: calc(var(--tam-texto-juego) * var(--escala-fuente));
  line-height: var(--interlineado-juego);
}

.parrafo {
  margin: 0 0 var(--esp-2);
}

.hablante {
  font-family: var(--fuente-ui);
  color: var(--color-acento);
}

.escena {
  padding-top: var(--esp-2);
  border-top: 1px solid var(--color-borde);
}

.eleccion {
  margin: 0;
  font-family: var(--fuente-ui);
  font-size: calc(var(--tam-ui) * var(--escala-fuente));
  font-style: italic;
  color: var(--color-texto-suave);
}

.tirada {
  margin: 0;
  font-family: var(--fuente-ui);
  font-size: var(--tam-ui-chico);
  color: var(--color-texto-suave);
}

.resultado {
  padding-left: var(--esp-4);
  border-left: 2px solid var(--color-borde);
}
```

El `switch` sobre `entry.kind` cubre los cuatro casos del tipo `LogEntry`; con `strict`, TypeScript verifica que la función devuelve en todos (si el contrato agregara un quinto tipo, `tsc` avisaría). `scrollIntoView` se comprueba con `typeof` porque jsdom no lo implementa.

- [ ] **Paso 21: Implementación (5/13): CargandoScreen y ErrorScreen** → crear los cuatro archivos:

`src/ui/screens/CargandoScreen.tsx`:

```tsx
import { S } from '@/ui/strings.es';
import styles from './CargandoScreen.module.css';

export function CargandoScreen() {
  return (
    <div className={styles.pantalla}>
      <p role="status">{S.cargando}</p>
    </div>
  );
}
```

`src/ui/screens/CargandoScreen.module.css`:

```css
.pantalla {
  display: grid;
  place-items: center;
  min-height: 100vh;
  font-family: var(--fuente-ui);
  color: var(--color-texto-suave);
}
```

`src/ui/screens/ErrorScreen.tsx`:

```tsx
import { useStore } from '@/state/store';
import { S } from '@/ui/strings.es';
import styles from './ErrorScreen.module.css';

export function ErrorScreen() {
  const error = useStore((s) => s.ui.error);
  const retry = useStore((s) => s.retry);
  return (
    <div className={styles.pantalla} role="alert">
      <h1 className={styles.titulo}>{S.error.titulo}</h1>
      <p className={styles.mensaje}>{error ?? S.error.generico}</p>
      <button type="button" className={styles.boton} onClick={retry}>
        {S.error.reintentar}
      </button>
    </div>
  );
}
```

`src/ui/screens/ErrorScreen.module.css`:

```css
.pantalla {
  display: grid;
  place-items: center;
  align-content: center;
  gap: var(--esp-4);
  min-height: 100vh;
  padding: var(--esp-6);
  font-family: var(--fuente-ui);
  text-align: center;
}

.titulo {
  margin: 0;
  color: var(--color-peligroso);
}

.mensaje {
  margin: 0;
  max-width: 60ch;
  color: var(--color-texto-suave);
  white-space: pre-wrap;
}

.boton {
  padding: 0.5em 1.2em;
  border: 1px solid var(--color-acento);
  border-radius: var(--radio);
  background: var(--color-acento);
  color: var(--color-fondo);
}
```

- [ ] **Paso 22: Implementación (6/13): InicioScreen** → crear `src/ui/screens/InicioScreen.tsx` y `src/ui/screens/InicioScreen.module.css`:

```tsx
import { CLASSES } from '@/content/catalog';
import { useStore } from '@/state/store';
import { S } from '@/ui/strings.es';
import styles from './InicioScreen.module.css';

export function InicioScreen() {
  const characters = useStore((s) => s.characters);
  const activeCharacterId = useStore((s) => s.activeCharacterId);
  const createTestCharacter = useStore((s) => s.createTestCharacter);
  const startRun = useStore((s) => s.startRun);
  const continueRun = useStore((s) => s.continueRun);

  const activo = characters.find((c) => c.id === activeCharacterId) ?? null;
  const puedeContinuar = activo !== null && activo.run !== null;

  const nuevaPartida = (): void => {
    if (activo === null) createTestCharacter();
    void startRun('prueba');
  };

  return (
    <div className={styles.pantalla}>
      <h1 className={styles.titulo}>{S.titulo}</h1>
      <p className={styles.personaje}>
        {activo === null
          ? S.inicio.sinPersonaje
          : S.inicio.personajeActivo(activo.name, CLASSES[activo.classId].name, activo.level)}
      </p>
      <div className={styles.botones}>
        {puedeContinuar && (
          <button type="button" className={styles.primario} onClick={() => void continueRun()}>
            {S.inicio.continuar}
          </button>
        )}
        <button type="button" className={styles.secundario} onClick={nuevaPartida}>
          {S.inicio.nuevaPrueba}
        </button>
      </div>
    </div>
  );
}
```

```css
.pantalla {
  display: grid;
  align-content: center;
  justify-items: center;
  gap: var(--esp-4);
  min-height: 100vh;
  padding: var(--esp-6);
  text-align: center;
}

.titulo {
  margin: 0;
  font-family: var(--fuente-juego);
  font-size: 2.2rem;
  color: var(--color-acento);
}

.personaje {
  margin: 0;
  font-family: var(--fuente-ui);
  color: var(--color-texto-suave);
}

.botones {
  display: flex;
  flex-wrap: wrap;
  gap: var(--esp-2);
  justify-content: center;
}

.primario,
.secundario {
  font-family: var(--fuente-ui);
  padding: 0.6em 1.4em;
  border-radius: var(--radio);
  border: 1px solid var(--color-borde);
  background: var(--color-superficie-alta);
  color: var(--color-texto);
}

.primario {
  background: var(--color-acento);
  border-color: var(--color-acento);
  color: var(--color-fondo);
}
```

Nota: si el personaje activo ya existe pero tiene una partida en curso, "Nueva partida de prueba" llama a `startRun('prueba')` igual; el store de la tarea 13 crea una partida nueva y descarta la anterior. En Fase A es aceptable; la confirmación de "abandonar partida" del hub llega en Fase C.

- [ ] **Paso 23: Implementación (7/13): FinScreen** → crear `src/ui/screens/FinScreen.tsx` y `src/ui/screens/FinScreen.module.css`:

```tsx
import { useShallow } from 'zustand/react/shallow';
import type { LogEntry, ResolvedParagraph, RunOutcome } from '@/engine/types';
import { selectGameState } from '@/state/selectors';
import { useStore } from '@/state/store';
import { S } from '@/ui/strings.es';
import styles from './FinScreen.module.css';

type SceneEntry = Extract<LogEntry, { kind: 'scene' }>;

function ultimaEscena(log: LogEntry[]): SceneEntry | null {
  for (let i = log.length - 1; i >= 0; i -= 1) {
    const e = log[i];
    if (e !== undefined && e.kind === 'scene') return e;
  }
  return null;
}

export function FinScreen() {
  const gs = useStore(useShallow(selectGameState));
  const campaign = useStore((s) => s.ui.campaign);
  const endSummary = useStore((s) => s.ui.endSummary);
  const finishRun = useStore((s) => s.finishRun);

  const outcome: RunOutcome | null = gs?.run.outcome ?? endSummary?.outcome ?? null;

  let titulo: string;
  let parrafos: ResolvedParagraph[] = [];
  if (outcome === null || outcome.kind === 'defeat') {
    titulo = S.fin.derrota;
  } else if (outcome.kind === 'death') {
    titulo = S.fin.muerte;
  } else {
    titulo = campaign?.endings[outcome.endingId]?.title ?? outcome.endingId;
    const escena = gs === null ? null : ultimaEscena(gs.run.log);
    parrafos = escena === null ? [] : escena.paragraphs;
  }

  return (
    <div className={styles.pantalla} data-outcome={outcome?.kind ?? 'defeat'}>
      <p className={styles.etiqueta}>{S.fin.final}</p>
      <h1 className={styles.titulo}>{titulo}</h1>
      <div className={styles.epilogo}>
        {parrafos.map((p, i) => (
          <p key={i}>
            {p.speaker !== undefined && <strong>{p.speaker}: </strong>}
            <span>{p.text}</span>
          </p>
        ))}
      </div>
      <button type="button" className={styles.boton} onClick={finishRun}>
        {S.fin.volver}
      </button>
    </div>
  );
}
```

```css
.pantalla {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: var(--esp-4);
  min-height: 100vh;
  padding: var(--esp-6);
}

.etiqueta {
  margin: 0;
  font-family: var(--fuente-ui);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-texto-suave);
}

.titulo {
  margin: 0;
  text-align: center;
  color: var(--color-acento);
}

.pantalla[data-outcome='death'] .titulo {
  color: var(--color-peligroso);
}

.epilogo {
  max-width: var(--ancho-columna-max);
  font-family: var(--fuente-juego);
  font-size: calc(var(--tam-texto-juego) * var(--escala-fuente));
  line-height: var(--interlineado-juego);
}

.boton {
  font-family: var(--fuente-ui);
  padding: 0.6em 1.4em;
  border-radius: var(--radio);
  border: 1px solid var(--color-acento);
  background: var(--color-acento);
  color: var(--color-fondo);
}
```

- [ ] **Paso 24: Implementación (8/13): EscenaScreen** → crear `src/ui/screens/EscenaScreen.tsx`:

```tsx
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CLASSES } from '@/content/catalog';
import { WORLD } from '@/content/world';
import { fortuneMax } from '@/engine/progression';
import { render as renderScene } from '@/engine/resolve';
import { selectGameState } from '@/state/selectors';
import { useStore } from '@/state/store';
import { OptionList } from '@/ui/components/OptionList';
import { Placeholder } from '@/ui/components/Placeholder';
import { RollPanel } from '@/ui/components/RollPanel';
import { StatusBar } from '@/ui/components/StatusBar';
import { TextColumn } from '@/ui/components/TextColumn';
import { S } from '@/ui/strings.es';
import { CargandoScreen } from './CargandoScreen';
import styles from './EscenaScreen.module.css';

export function EscenaScreen() {
  const campaign = useStore((s) => s.ui.campaign);
  const pending = useStore((s) => s.ui.pending);
  const showOdds = useStore((s) => s.prefs.showOdds);
  const gs = useStore(useShallow(selectGameState));
  const choose = useStore((s) => s.choose);
  const beginRoll = useStore((s) => s.beginRoll);
  const rerollDie = useStore((s) => s.rerollDie);
  const usePower = useStore((s) => s.usePower);
  const commitRoll = useStore((s) => s.commitRoll);
  const abandonRun = useStore((s) => s.abandonRun);

  const rendered = useMemo(
    () => (campaign !== null && gs !== null ? renderScene(campaign, gs) : null),
    [campaign, gs],
  );

  const nombres = useMemo(() => {
    const mapa: Record<string, string> = {};
    for (const npc of Object.values(WORLD.npcs)) mapa[npc.id] = npc.name;
    if (campaign !== null) {
      for (const npc of Object.values(campaign.npcs)) mapa[npc.id] = npc.name;
    }
    return mapa;
  }, [campaign]);

  const onPick = useCallback(
    (choiceId: string): void => {
      if (rendered === null) return;
      const choice = rendered.choices.find((c) => c.id === choiceId);
      if (choice === undefined) return;
      if (choice.preview !== undefined) beginRoll(choiceId);
      else choose(choiceId);
    },
    [rendered, beginRoll, choose],
  );

  if (campaign === null || gs === null || rendered === null) return <CargandoScreen />;

  const placeName = campaign.places[rendered.place]?.name ?? WORLD.places[rendered.place]?.name ?? rendered.place;
  const fondo = rendered.variant !== undefined ? `${rendered.place}.${rendered.variant}` : rendered.place;
  const retrato = rendered.portraitNpc !== undefined ? (nombres[rendered.portraitNpc] ?? rendered.portraitNpc) : null;

  return (
    <div className={styles.pantalla}>
      <StatusBar
        placeName={placeName}
        wounds={gs.run.wounds}
        fortune={gs.run.fortune}
        fortuneMax={fortuneMax(gs.character.level)}
        conditions={gs.run.conditions}
        onAbandon={abandonRun}
      />
      <div className={styles.grid}>
        <aside className={styles.visual}>
          <Placeholder label={`${S.placeholder.fondo}: ${fondo}`} aspect="16:9" />
          {retrato !== null && <Placeholder label={`${S.placeholder.retrato}: ${retrato}`} aspect="3:4" />}
        </aside>
        <main className={styles.columna}>
          <TextColumn log={gs.run.log} nombres={nombres} />
          {pending !== null ? (
            <RollPanel
              pending={pending}
              powerName={CLASSES[gs.character.classId].power.name}
              onReroll={rerollDie}
              onPower={usePower}
              onContinue={commitRoll}
            />
          ) : (
            <OptionList choices={rendered.choices} showOdds={showOdds} wounds={gs.run.wounds} onPick={onPick} />
          )}
        </main>
      </div>
    </div>
  );
}
```

Puntos clave: todos los hooks van **antes** del `return` temprano (regla de hooks). `renderScene` es la única llamada al motor desde la UI y es de solo lectura; cualquier cambio de estado pasa por una acción del store. Mientras `ui.pending` no es `null`, el `RollPanel` reemplaza a la lista de opciones: no se puede elegir otra opción a mitad de una tirada (y al recargar, `continueRun` reconstruye `pending`, así que la pantalla vuelve al mismo panel). `useShallow(selectGameState)` compara `world`, `character`, `run` y `seen` por referencia: las tres primeras salen del store tal cual y `seen` es o bien el objeto guardado o bien `EMPTY_SEEN` (paso 17), así que `gs` solo cambia cuando cambió el estado de verdad.

- [ ] **Paso 25: Implementación (9/13): estilos de EscenaScreen** → crear `src/ui/screens/EscenaScreen.module.css`:

```css
.pantalla {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.grid {
  flex: 1;
  display: grid;
  grid-template-columns: 60fr 40fr;
  gap: var(--esp-4);
  padding: var(--esp-4);
}

.visual {
  display: grid;
  align-content: start;
  gap: var(--esp-4);
}

.columna {
  min-width: 0;
  max-height: calc(100vh - 4rem);
  overflow-y: auto;
  padding-right: var(--esp-2);
}

@media (max-width: 800px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .columna {
    max-height: none;
  }
}
```

- [ ] **Paso 26: Implementación (10/13): ScreenRouter** → crear `src/app/ScreenRouter.tsx`:

```tsx
import { useStore } from '@/state/store';
import { CargandoScreen } from '@/ui/screens/CargandoScreen';
import { ErrorScreen } from '@/ui/screens/ErrorScreen';
import { EscenaScreen } from '@/ui/screens/EscenaScreen';
import { FinScreen } from '@/ui/screens/FinScreen';
import { InicioScreen } from '@/ui/screens/InicioScreen';

export function ScreenRouter() {
  const screen = useStore((s) => s.ui.screen);
  switch (screen) {
    case 'inicio':
      return <InicioScreen />;
    case 'cargando':
      return <CargandoScreen />;
    case 'escena':
      return <EscenaScreen />;
    case 'fin':
      return <FinScreen />;
    case 'error':
      return <ErrorScreen />;
    default: {
      const nunca: never = screen;
      throw new Error(`Pantalla desconocida: ${String(nunca)}`);
    }
  }
}
```

- [ ] **Paso 27: Implementación (11/13): App con ErrorBoundary y vite:preloadError** → reemplazar el contenido completo de `src/app/App.tsx`:

```tsx
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { ScreenRouter } from '@/app/ScreenRouter';
import { S } from '@/ui/strings.es';
import '@/app/tokens.css';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de render', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error !== null) {
      return (
        <div role="alert" style={{ padding: 'var(--esp-6)', fontFamily: 'var(--fuente-ui)' }}>
          <h1>{S.error.titulo}</h1>
          <p>{this.state.error.message}</p>
          <button type="button" onClick={() => window.location.reload()}>
            {S.error.recargar}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RELOAD_FLAG = 'juegorol:preload-reload';
const RELOAD_FLAG_TTL_MS = 10_000;

/**
 * Tras un deploy los chunks cambian de nombre y un import() dinámico viejo falla.
 * Vite emite `vite:preloadError`; recargamos UNA vez (flag en sessionStorage) y,
 * si la app vive 10 s sin problemas, borramos el flag para el próximo deploy.
 */
export function usePreloadErrorReload(): void {
  useEffect(() => {
    const onPreloadError = (event: Event): void => {
      let yaRecargado = false;
      try {
        yaRecargado = sessionStorage.getItem(RELOAD_FLAG) === '1';
      } catch {
        yaRecargado = false;
      }
      if (yaRecargado) return; // segunda vez: dejamos que el error llegue al ErrorBoundary / pantalla error
      event.preventDefault();
      try {
        sessionStorage.setItem(RELOAD_FLAG, '1');
      } catch {
        // sin sessionStorage recargamos igual; en el peor caso el usuario ve la pantalla de error
      }
      window.location.reload();
    };
    window.addEventListener('vite:preloadError', onPreloadError);
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        // ignorar
      }
    }, RELOAD_FLAG_TTL_MS);
    return () => {
      window.removeEventListener('vite:preloadError', onPreloadError);
      window.clearTimeout(timer);
    };
  }, []);
}

export function App() {
  usePreloadErrorReload();
  return (
    <ErrorBoundary>
      <ScreenRouter />
    </ErrorBoundary>
  );
}

export default App;
```

- [ ] **Paso 28: Implementación (12/13): main.tsx** → reemplazar el contenido completo de `src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';

const root = document.getElementById('root');
if (root === null) throw new Error('Falta el elemento #root en index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Paso 29: Implementación (13/13): actualizar el test de humo de la tarea 1** → reemplazar el contenido completo de `tests/smoke.test.ts`. El `<h1>` de la app ya no es "Hola" sino `S.titulo` (lo pinta `InicioScreen`); el test conserva su forma (`.ts`, `createElement`, montaje de `main.tsx` en `#root`) y solo cambia lo que espera. Se limpia `localStorage` antes de cada test para que el store de la tarea 13 arranque sin partida y muestre siempre la pantalla de inicio:

```ts
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
```

Este archivo no necesita el docblock `@vitest-environment jsdom` porque `vite.config.ts` (tarea 1) ya fija `environment: 'jsdom'` para todos los tests; el docblock de los tests de `tests/ui` es redundante a propósito (deja explícito el entorno en archivos que lo requieren sí o sí).

- [ ] **Paso 30: Comprobar el typecheck de todo lo nuevo antes de correr el flujo**

```bash
npx tsc --noEmit -p tsconfig.json
```

Resultado esperado: sin salida (exit 0). Errores típicos y su arreglo: `Cannot find module './X.module.css'` → falta `src/vite-env.d.ts` (paso 4) o `tsconfig.json` no incluye `src/**/*`; `Property 'endings' does not exist` → estás importando `CampaignMeta` en vez de `Campaign` en el store (revisar tarea 13); `useShallow` no encontrado → `zustand` no es 5.x (`npm i zustand@5`); `Module '"@/engine/types"' has no exported member 'SeenMap'` → revisar que la tarea 4 exportó el tipo con ese nombre.

- [ ] **Paso 31: Correr los tests y verificar que pasan**

```bash
npx vitest run tests/ui/flow.test.tsx tests/smoke.test.ts
```

Resultado esperado: `Test Files 2 passed (2)`, `Tests 5 passed (5)` (tres de flujo, dos de humo). Si `findByText` del texto de `p_umbral` agota los 5 s, mirá la consola del test: lo más probable es que `startRun` haya caído en `catch` y `ui.screen` sea `'error'`; el mensaje de `ui.error` te dice qué falló (normalmente un id de escena o de flag mal escrito en la campaña de la tarea 11). Si el test de humo de `main.tsx` falla con "Unable to find an accessible element with the role heading", el `localStorage` traía una partida en curso de otro test: revisá que el `beforeEach` con `localStorage.clear()` esté presente.

- [ ] **Paso 32: Commit**

```bash
git add src/app/App.tsx src/app/ScreenRouter.tsx src/app/tokens.css src/main.tsx src/state/selectors.ts src/ui/components/Placeholder.tsx src/ui/components/Placeholder.module.css src/ui/components/StatusBar.tsx src/ui/components/StatusBar.module.css src/ui/components/TextColumn.tsx src/ui/components/TextColumn.module.css src/ui/screens/InicioScreen.tsx src/ui/screens/InicioScreen.module.css src/ui/screens/EscenaScreen.tsx src/ui/screens/EscenaScreen.module.css src/ui/screens/FinScreen.tsx src/ui/screens/FinScreen.module.css src/ui/screens/CargandoScreen.tsx src/ui/screens/CargandoScreen.module.css src/ui/screens/ErrorScreen.tsx src/ui/screens/ErrorScreen.module.css tests/ui/flow.test.tsx tests/smoke.test.ts
git commit -m "feat(ui): pantallas de la rebanada vertical, router de pantallas y App con ErrorBoundary

Reemplaza el Hola de la tarea 1; el test de humo pasa a esperar el título del
prototipo. selectGameState devuelve una referencia estable para seen vacío
(EMPTY_SEEN) para que useShallow no entre en bucle.

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

#### Ciclo 4: comprobación manual en el navegador

Estos pasos no tienen test automático (la spec, sección 10, dice que guardar-recargar se prueba a mano). Hacelos en orden y anotá cualquier cosa rara.

- [ ] **Paso 33: Levantar el servidor de desarrollo**

```bash
npm run dev
```

Abrí la URL que imprime Vite (normalmente `http://localhost:5173/`). Tenés que ver el título "Crónicas del Vado — prototipo", el texto de "Todavía no hay personaje…" y el botón "Nueva partida de prueba". La consola del navegador debe estar sin errores.

- [ ] **Paso 34: Jugar la campaña de humo hasta un final**

1. Clic en "Nueva partida de prueba". Aparece la escena del umbral: barra con "Torre abandonada", Heridas ○ ○ ○ Sano, Fortuna ◆ ◆ ◆ 3/3, "sin condiciones", el placeholder gris "Fondo: torre_abandonada.noche" (o sin variante) a la izquierda y la columna de texto a la derecha.
2. Verificá que el texto NO dice "otra vez" (primera visita).
3. Elegí "Leer la inscripción" (opción con tirada): la lista se reemplaza por el panel de tirada; hay 3 dados (el mago tiene ventaja por "Aprendiz de escriba"), uno apagado, un total, un sello de banda y botones "Fortuna: repetir dado 1/2/3" y "Continuar".
4. Probá "Fortuna: repetir dado 2": el dado cambia (o repite valor) y la barra sigue mostrando 3/3 hasta consolidar; al apretar "Continuar", Fortuna baja a 2/3 y el log muestra la línea de dados con "(1 Fortuna gastada)".
5. Seguí eligiendo hasta llegar a la cripta por la escalera: al elegir "Bajar a la cripta" (☠) tiene que aparecer el `confirm` con el texto según tus heridas ("Estás sano: un Fallo te deja Malherido." si no te lastimaron).
6. En la cripta, elegí "Conjurar" (saber): si sale Fallo, aparece "Usar Poder (Conjuro)"; usalo y verificá que el sello pasa a "Con costo" y que, tras Continuar, la barra muestra la condición "Agotado".
7. Llegá a un final: se muestra la pantalla de fin con el título del final ("El tesoro de la torre" o "Con vida") y el epílogo. Clic en "Volver al inicio": vuelve al inicio, ya sin botón "Continuar".
8. Volvé a empezar y entrá al umbral por segunda vez en la misma partida (desde la capilla "Volver al umbral"): ahora sí tiene que leerse la variante "otra vez".

- [ ] **Paso 35: Recargar en medio de una tirada y comprobar que se restaura**

1. Iniciá una partida nueva y elegí una opción con tirada. Con el panel de dados en pantalla, anotá los valores de los dados.
2. Recargá la página (F5). Volvés al inicio con el botón "Continuar" visible. Clic en "Continuar".
3. Tiene que aparecer la misma escena con el **mismo panel de tirada y los mismos dados** (no la lista de opciones): `run.pending` se persistió y `continueRun` lo reconstruyó con `restorePending`.
4. Repetí un dado con Fortuna, recargá otra vez y continuá: el dado repetido muestra el mismo valor que antes de recargar (los rerolls también se persisten por índice).
5. Apretá "Continuar" en el panel: la partida sigue con normalidad.
6. Extra: en DevTools → Application → Local Storage, la clave `juegorol` contiene `{"state":{...},"version":1}` sin la clave `ui`.

- [ ] **Paso 36: Abandonar y pantalla de error**

1. En una escena, clic en "Abandonar": aparece el `confirm` de abandono; al aceptar, se vuelve al inicio y el personaje ya no tiene partida (sin botón "Continuar").
2. Para ver la pantalla de error sin romper nada: en la consola del navegador ejecutá `localStorage.setItem('juegorol', '{"state":{"characters":[{"id":"x","name":"X","portrait":"mago_01","classId":"mago","attrs":{"vigor":0,"astucia":1,"saber":2,"presencia":1},"traits":[],"skills":[],"level":3,"xp":0,"flags":[],"memoryNames":{},"relics":[],"scars":[],"campaignLog":{},"run":{"campaignId":"no_existe","contentVersion":1,"sceneId":"p_umbral","flags":[],"stagedFlags":[],"visited":{},"items":[],"wounds":0,"conditions":[],"fortune":3,"powerUsed":false,"clocks":{},"milestones":[],"log":[],"rngSeed":1}}],"activeCharacterId":"x","world":{"flags":[],"fallen":[]},"seen":{},"prefs":{"cps":40,"showOdds":true,"fontScale":1,"reducedMotion":"auto"}},"version":1}')`, recargá y apretá "Continuar": tiene que aparecer "Algo salió mal" con el mensaje del store y el botón "Reintentar". Después limpiá con `localStorage.removeItem('juegorol')` y recargá.

- [ ] **Paso 37: Build de producción en verde**

```bash
npm run build
```

Resultado esperado: corre `validate` (0 errores), `test:run` (todos los tests en verde, incluidos los tres de `tests/ui` y el `tests/smoke.test.ts` actualizado), `typecheck` (sin salida) y `vite build` termina con `✓ built in …` y un chunk aparte para la campaña `prueba` (algo como `dist/assets/campaign-XXXX.js`). Podés verificar el resultado con `npm run preview`.

---

#### Verificación de la tarea

- [ ] **Paso 38: Verificación final**

```bash
npx vitest run
npx tsc --noEmit -p tsconfig.json
npm run build
git status
```

Resultado esperado: todos los archivos de test en verde (`tests/smoke.test.ts`, los de `tests/engine`, `tests/content`, `tests/tools`, `tests/state` y los tres de `tests/ui`), `tsc` sin salida, `npm run build` en verde y `git status` limpio (todo commiteado en los tres commits de esta tarea).

**Criterio de aceptación:** con `npm run dev` se juega la campaña de humo de punta a punta con placeholders grises (opciones con porcentajes, tirada inline con Fortuna y Poder, confirmación de escena mortal, pantalla de fin), la primera visita al umbral no muestra "otra vez", y recargar en medio de una tirada restaura los mismos dados al apretar "Continuar"; `npx vitest run` (incluido el test de humo de la tarea 1, ahora con `S.titulo`), `npx tsc --noEmit` y `npm run build` están en verde.

---

## Orden de ejecución y dependencias

- Secuencia recomendada: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14. Cada tarea deja `npx vitest run` y `npx tsc --noEmit -p tsconfig.json` en verde.
- Pueden ejecutarse en paralelo (en worktrees separados) si se respetan sus insumos: 2 y 3 después de 1; 4, 5 y 7 después de 3; 6 después de 5; 8 después de 4 y 5; 9 después de 6, 7 y 8; 10 después de 9; 11 después de 3; 12 después de 11; 13 después de 10 y 11; 14 después de 13.
- Criterio de "listo" de la Fase A (spec §12): se juega la campaña de humo de punta a punta con placeholders grises, se recarga en medio de una tirada y continúa con los mismos dados, y la primera visita a una escena no muestra "otra vez". `npm run build` (validate → test → typecheck → vite build) en verde y el sitio publicado en GitHub Pages.
- Fuera de esta fase (spec §12): creación de personaje y hub (Fase C), prosa de la campaña real (B y D), simulador y lint de texto (E), animación de dados y ficha (F), arte (G).
