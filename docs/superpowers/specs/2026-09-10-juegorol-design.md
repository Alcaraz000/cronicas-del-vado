# Diseño del juego: RPG narrativo tipo novela visual rejugable

**Estado:** APROBADO por Gabriel el 10 de septiembre de 2026.
**Origen:** brainstorming con Gabriel + workflow de 13 agentes (5 investigadores con búsqueda web, 3 arquitectos, síntesis, 3 críticos adversariales, revisión final). Los informes de investigación con fuentes están en `docs/superpowers/research/`.

## 0. Decisiones base tomadas por Gabriel (no negociables para este diseño)

1. Narrativa **pre-escrita** como grafo de escenas, escrita con IA durante el desarrollo. Sin IA ni backend en tiempo de ejecución. Sitio estático, sin cuentas.
2. Stack **Vite + TypeScript + React**, deploy estático (GitHub Pages o Netlify).
3. Ambientación **fantasía medieval clásica**. Tono **adulto cinematográfico**: sangre y temas serios, sin gore explícito.
4. Estilo visual **ilustración pintada semi-realista**. Todo el arte 2D generado con IA.
5. Hardware: **RTX 3060 Ti (8 GB VRAM)**, Windows 11. Generación local. Gabriel delega la elección de herramienta.
6. **Un solo personaje** por jugador, persistente y reutilizable entre campañas; define clase, rasgos y habilidades; sube de nivel.
7. Campañas modulares: se empieza con una, deben poder agregarse más. Cada campaña declara una **dificultad** y el jugador elige con cabeza.
8. Duración: la primera campaña **30 a 60 minutos**; en el futuro puede haber campañas de hasta 2 horas.
9. **Dados** con tiradas potenciadas o perjudicadas según la situación.
10. **Mínimo 4 opciones** en cada decisión.
11. **Combate narrativo** con tiradas, sin pantalla táctica.
12. **Memoria**: el juego recuerda lugares visitados y personajes conocidos dentro de la partida, entre partidas y entre campañas.
13. **Fallo**: caer pierde la campaña pero conserva al personaje; en situaciones específicas hay **muerte permanente**.
14. Simplicidad, YAGNI.
15. Idioma **español**; preparado para traducir después, sin i18n ahora.

## 0.1 Decisiones cerradas al aprobar (10 de septiembre de 2026)

- **Sistema de dados:** 2d6 con éxito parcial (10+ éxito, 7-9 éxito con costo, 6- fallo; ventaja 3d6 conservando los 2 mayores, desventaja los 2 menores). Se descartó d20.
- **Duración objetivo de la primera campaña:** 30 a 45 minutos por partida (dentro del rango 30-60 de la decisión base 8).
- **Dedicación de Gabriel:** 8 a 12 horas por semana. Las ~260 h del roadmap (sección 12) son horas humanas de referencia; como Claude Code escribe el código y la prosa, el tiempo real de Gabriel se concentra en revisar, curar arte, jugar y decidir. El calendario se mide tras las dos primeras semanas y se ajusta.

## 0.2 Decisiones que siguen abiertas (se adopta la recomendación como valor por defecto)

1. **Nombre del juego y de la campaña:** "Crónicas del Vado" y "El vado de Aldamar" quedan provisorios hasta la fase de arte (G), cuando el wordmark y la portada los fijan.
2. **RAM de 32 GB:** no comprar por adelantado; hacer la prueba de estilo con la RAM actual y comprar solo si el log muestra swap o tiempos > 60 s con ControlNet.
3. **Respaldo de másteres de arte:** carpeta de Google Drive u OneDrive sincronizada con `art/masters/`; disco externo como segunda copia.
4. **Testers para la fase H:** 3 personas conocidas que jueguen una partida y 2 que la rejueguen.

---

## 1. Visión y pilares de diseño

**Visión.** Una novela visual de fantasía medieval, pintada y adulta, que corre en el navegador sin servidor. Un personaje persistente atraviesa campañas cortas (30-45 minutos la primera), ramificadas y resueltas con dados; el mundo lo recuerda dentro de la partida, entre partidas y entre campañas. Rejugar no es repetir: es leer otro texto.

**Pilares, en orden de prioridad (ante un conflicto gana el de arriba):**

1. **Leer es jugar.** El texto es el juego y el arte lo enmarca. Toda decisión ofrece 4 o más opciones; toda tirada produce texto distinto (éxito / éxito con costo / fallo) y cambia el estado. Nunca "no pasa nada".
2. **Elegir con cabeza.** Antes de tirar se ve el atributo, cada fuente de ventaja o desventaja (incluidas las que se anulan) y la probabilidad exacta. La dificultad de una campaña se dice en palabras contra el personaje. El aviso de una escena mortal dice la consecuencia real para el estado actual.
3. **El mundo recuerda.** Lugares, PNJ y decisiones dejan huella en tres capas (partida, personaje, mundo) y el texto la cita; la memoria abre atajos y opciones. Marco de ficción fijo: dentro de una misma campaña recuerda el personaje (narrador), nunca los PNJ; entre campañas distintas recuerdan los dos.
4. **Un personaje, muchas historias.** Clase, rasgos y habilidades abren opciones etiquetadas, nunca imprescindibles: todo final es alcanzable por toda clase. El personaje sobrevive a la derrota; la muerte es rara, telegrafiada y deja legado.
5. **Contenido primero, sistemas mínimos.** El diseño técnico existe para que Claude Code produzca campañas enteras (texto y arte) en lotes validados. Un sistema entra solo si reduce el costo de producir o validar contenido o si abre rejugabilidad. Sin HP numéricos, oro, inventario con peso, combate táctico ni backend; cicatrices, Heredero y Ascensión elegible quedan para la segunda campaña.

## 2. Arquitectura técnica

**Stack (fijo):** Vite 8 + React 19 + TypeScript 5 (`strict`), Zustand 5 con `persist`, zod 4, Motion (`m` + `LazyMotion`), `vite-imagetools`, Vitest, `tsx` para scripts. CSS Modules con tokens; sin Tailwind ni librería de componentes. Sin router: máquina de estados de pantallas en el store. Sin audio en la v1.

**Estructura del repositorio:**

```
src/
  app/        App.tsx, ScreenRouter.tsx, tokens.css
  engine/     PURO: dice.ts, rng.ts, conditions.ts, effects.ts, memory.ts, text.ts, resolve.ts, progression.ts
  content/    SOLO datos: schema.ts, catalog.ts
    world/      npcs.ts, places.ts, items.ts (reliquias), flags.ts (espacios compartidos)
    campaigns/  index.ts (registro), vado/ (meta.ts, campaign.ts, scenes/*, npcs.ts, places.ts,
                items.ts, flags.ts, design/), prueba/ (campaña de humo)
  assets/     PNG exportados: world/<tipo>/<id>.png, vado/<tipo>/<id>[.<variante>].png
  state/      store.ts, migrations.ts, exportImport.ts
  ui/         screens/, components/, assets/{world,vado}.ts (import.meta.glob + imagetools), strings.es.ts
tools/        validate.ts, graph.ts, simulate.ts, lint-text.ts, art-manifest.ts
art/          style.md, LICENSES.md, manifest.generated.json, curation.json, workflows/*.json,
              gen_assets.py, post.py, masters/ (gitignored, con respaldo)
tests/        engine/, content/, ui/
```

**Reglas de capas:** `engine` no importa React ni el store. `ui` no evalúa reglas: llama al motor y muestra su resultado. `content` es solo datos y referencia assets por id (`portrait: 'orell'`); nunca importa imágenes ni nada de Vite, así `tools/*.ts` lo cargan con `tsx` en Node puro; el glob con imagetools vive en `src/ui/assets/<campaña>.ts`. Los ids de rasgos, habilidades, condiciones, tags y clases se derivan del catálogo (`type TraitId = keyof typeof TRAITS`); `next` y los flags son strings que verifica el linter en `vitest --watch`.

**API del motor.** Funciones puras sobre `GameState = { world, character, run }`:

```ts
enter(c, s, sceneId): GameState          // redirects (tope 8) → onEnter de la escena final → run.sceneId
render(c, s): RenderedScene              // párrafos resueltos, retrato, opciones {visible, enabled, badge, odds, sources}
choose(c, s, choiceId): GameState        // sin tirada: derivar memoria → efectos → enter(next)
beginRoll(c, s, choiceId): PendingRoll   // dados, fuentes, banda; NO toca el estado
rerollDie(c, s, pending, i): PendingRoll // gasta 1 Fortuna dentro de pending
usePower(c, s, pending): PendingRoll     // Fallo → Éxito con costo si el Poder aplica
commitRoll(c, s, pending): GameState     // derivar memoria → outcome → efectos → enter(next)
```

Orden fijo, documentado en el tipo `Scene` y cubierto por tests: (1) `enter` resuelve `redirect` sobre el estado de entrada; las escenas atravesadas por redirect no cuentan como visitadas ni derivan memoria; (2) se aplica `onEnter` de la escena final (hitos idempotentes por partida); (3) `render` evalúa `when`, `requires`, `advantageIf` y probabilidades contra el estado tal cual, que todavía no incluye la derivación de memoria de esta escena; (4) al elegir (`choose` o `commitRoll`) se deriva la memoria de la escena actual (`visited`, `met`, `place`, párrafos vistos), se aplican efectos y se entra a la siguiente. `visited: X, min: N` significa "N o más visitas previas completas"; la primera visita al puente nunca muestra "otra vez".

**Dados deterministas sin cursor.** `rng.ts` deriva cada tirada de `hash(run.rngSeed, sceneId, choiceId, visitas, intento)` con mulberry32. Recargar y repetir la misma opción da los mismos dados; otra opción no se puede espiar porque, en cuanto `beginRoll` muestra los dados, el store persiste `run.pending = { choiceId, rerolls, powerUsed }` y la UI, al rehidratar, reconstruye el mismo `PendingRoll` y no deja elegir otra opción. `commitRoll` limpia `pending`. El `PendingRoll` completo vive en el slice `ui`, no persistido.

**Campañas como módulos.** `campaigns/index.ts` importa estáticamente solo `meta.ts` de cada campaña (título, portada, `levelRange`, duración, `lethalScenes`, finales, `lintProfile: 'smoke' | 'release'`, `hidden`) y expone `load()` con `import()` dinámico; en producción el registro filtra `hidden`. Vite genera un chunk por campaña más un chunk `world` (PNJ, lugares, reliquias e imágenes compartidas) que se carga con cualquier campaña. El motor resuelve PNJ, lugares y objetos contra `world ∪ campaign`; el linter prohíbe redefinir un id de `world/`. Ninguna campaña importa a otra.

**Build y deploy.** `npm run build` = `validate → test → vite build`. GitHub Actions: `checkout → npm ci → npm run build → deploy-pages`; `base` desde variable de entorno. Sin service worker. Tras un deploy los chunks cambian de nombre: la app escucha `vite:preloadError` y recarga una vez (flag en `sessionStorage`); la máquina de pantallas incluye `cargando` y `error` (con reintentar). Contenido en módulos TypeScript y no JSON: `tsc` y el editor marcan errores antes del linter y `satisfies Scene` da autocompletado.

## 3. Modelo de datos del contenido

Regla de oro: **datos declarativos, nunca expresiones en strings**. Cada tipo tiene su `z.object` espejo en `schema.ts`; el tipo se deriva con `z.infer`.

```ts
export type Attr = 'vigor' | 'astucia' | 'saber' | 'presencia';
export type ClassId = 'guerrero' | 'explorador' | 'mago' | 'clerigo';
export type Tag = 'fisico' | 'sigilo' | 'percepcion' | 'social' | 'engano' | 'saber' | 'magia' | 'fe' | 'supervivencia' | 'huida';
export type Difficulty = 'facil' | 'normal' | 'dificil' | 'muy_dificil' | 'extrema'; // +1 0 -1 -2 -3
export type FlagId = `run:${string}` | `char:${string}` | `world:${string}`;
export type SceneKind = 'normal' | 'hub' | 'encounter' | 'rest' | 'ending';

export type Condition =
  | { flag: FlagId } | { not: Condition } | { all: Condition[] } | { any: Condition[] }
  | { class: ClassId } | { trait: TraitId } | { skill: SkillId } | { item: string }
  | { attr: Attr; gte: number } | { wounds: { gte?: number; lte?: number } } | { condition: ConditionId }
  | { visited: string; min?: number }   // visitas previas COMPLETAS en esta partida
  | { met: string } | { knows: string }  // azúcar de char:met.<npc> / char:place.<lugar>
  | { clock: string; gte: number } | { endingSeen: string };

export type Effect =
  | { set: FlagId } | { clear: FlagId } | { give: string } | { take: string }
  | { wound: 1 | 2 } | { heal: 1 }       // heal solo en escenas rest; el fin de campaña cura todo
  | { addCondition: ConditionId } | { removeCondition: ConditionId | 'all' }
  | { clock: string; delta: number } | { milestone: string } | { fortune: number }
  | { lethal: true };                    // 2 Heridas; solo en outcomes de tirada de escenas lethal

export interface TextVariant { when?: Condition; text: string }
export interface Paragraph { speaker?: string; variants: TextVariant[] } // sin speaker = narrador
export type Text = (string | Paragraph)[];
export interface Outcome { text?: Text; effects?: Effect[]; next: string }
export interface Roll {
  attr: Attr; difficulty: Difficulty; tags: Tag[]; advantageIf?: Condition; disadvantageIf?: Condition;
  outcomes: { success: Outcome; partial: Outcome; failure: Outcome; crit?: Outcome; fumble?: Outcome };
}
export interface Choice {
  id: string; label: string;                 // verbo primero, ≤ 60 caracteres
  requires?: Condition; lockedHint?: string; // con hint: visible y bloqueada; sin hint: oculta
  roll?: Roll; outcome?: Outcome;            // exactamente uno de los dos
}
export interface Redirect { when: Condition; to: string }
export interface Scene {
  id: string; kind: SceneKind; lethal?: true; place: string; variant?: string; cg?: string; npcs?: string[];
  redirect?: Redirect[]; onEnter?: Effect[]; text: Text; choices: Choice[]; // 4-9 salvo 'ending' (0)
  ending?: { id: string; epilogue: Text };
}
export interface Npc   { id: string; name: string; portrait: string; voice: string; canonPrompt: string }
export interface Place { id: string; name: string; background: string; variants?: Record<string, string>; canonPrompt: string }
export interface Item  { id: string; name: string; icon: string; description: string; advantageTags?: Tag[]; relic?: true }
export interface Campaign {
  id: string; contentVersion: number; title: string; premise: string; cover: string;
  levelRange: [number, number]; durationMin: [number, number]; lethalScenes: number; start: string;
  scenes: Record<string, Scene>; npcs: Record<string, Npc>; places: Record<string, Place>; items: Record<string, Item>;
  flags: Record<string, string>;                    // run:*, char:<campaña>.*, world:<campaña>.*
  milestones: Record<string, { label: string }>;    // 10 XP la primera vez, 0 después
  clocks: Record<string, { max: number; label: string }>;
  endings: Record<string, { title: string; hidden?: true; reward?: Effect[] }>;
}
```

Notas: el badge de una opción (`[Mago]`, `[Recuerdo]`, `[Carta lacrada]`) lo deriva el motor del `requires`. `redirect` es el único mecanismo para hubs, rondas de combate y bifurcaciones por estado. Ids en `snake_case` con prefijo de acto; PNJ, lugares y objetos tienen id único en todo el registro. Espacios de flags compartidos, declarados en `world/flags.ts`: `char:met.*`, `char:place.*`, `char:origen.*`, `char:leyenda`, `world:caido.*`; cualquier otro `char:`/`world:` lleva prefijo de campaña.

**Validación en dos niveles.** zod valida la forma. `tools/validate.ts` (test de Vitest y paso de `prebuild`) reporta `id de escena → mensaje` en dos niveles:

*ERROR (rompe el build; reglas locales y decidibles; cada una con un fixture roto en tests):*
1. Todo `next`, `to` y `start` existe; no hay ciclos de `redirect` sin efectos entre medio.
2. Toda escena es alcanzable desde `start` asumiendo condiciones satisfacibles; todo final (incluidos los `hidden`) es alcanzable para cada clase de nivel 1 sin rasgos, evaluando solo las condiciones `class`.
3. Toda escena no final tiene 4-9 opciones, ≥ 4 sin `requires`; `ending` tiene 0.
4. `Choice` con exactamente uno de `roll`/`outcome`; toda tirada con `success`, `partial` y `failure`.
5. `lethal` solo en outcomes de tirada de escenas `lethal`; a ellas se entra solo por el `outcome.next` de una opción sin tirada; tienen ≥ 1 opción sin `lethal` en ningún outcome y ≥ 1 opción con tirada cuyos tags no incluyen `fisico`; `lethalScenes` coincide.
6. `encounter`: ≥ 2 atributos distintos, ≥ 1 opción sin tirada, ≥ 1 opción con tag `huida`; toda ronda posterior a la primera tiene una opción con `requires` sobre reloj, Heridas o flag `run:`, o un `redirect`.
7. Todo id usado está declarado (flag, PNJ, lugar, objeto, hito, reloj, condición, tag, rasgo, habilidad); prefijos de campaña correctos; ningún id de `world/` redefinido; `relic` solo en `world/items.ts`; todo `speaker` está en `npcs` de su escena.
8. Marco de memoria: un párrafo con `speaker` de un PNJ de la misma campaña no puede tener variantes condicionadas por `met`, `knows`, `endingSeen` ni `char:<esta campaña>.*`. Toda `Paragraph` termina en una variante sin `when`.
9. Dificultad `extrema` prohibida si `levelRange[0] < 3`.
10. `TODO` residual (perfil `release`); asset referenciado sin archivo ni entrada en `curation.json` (`--assets`).

*AVISO (reporte, no rompe):* longitudes fuera de rango (escena 60-160 palabras, ronda de `encounter` 40-80, outcome 20-60); flags escritos y nunca leídos o leídos y nunca escritos; arranques repetidos en escenas consecutivas (n-gramas) y textos duplicados; escenas con variante de memoria < 25 %; hub sin variante `visited`; PNJ de `world/` sin variante de narrador `met` al presentarse; costo de outcome que es una condición cuyo tag ya está en desventaja permanente para alguna clase; duración estimada por ruta (palabras/180 + 8 s por decisión, solo rutas alcanzables por un personaje nuevo) fuera de 30-45 min; y en la **ruta crítica** (tiradas que toda ruta a cualquier final atraviesa), ninguna tirada bajo el 25 % de Éxito + Éxito con costo para el **personaje mínimo** (nivel `levelRange[0]`, atributo en 0, con Debilidad de clase si el tag coincide).

**Ejemplo real de dos escenas encadenadas** (`src/content/campaigns/vado/scenes/acto1.ts`):

```ts
import type { Scene } from '../../../schema';

export const a1_puente = {
  id: 'a1_puente', kind: 'normal', place: 'puente_viejo', variant: 'noche', npcs: ['orell'],
  text: [
    { variants: [
      { when: { knows: 'puente_viejo' }, text: 'El puente viejo, otra vez. La barricada está donde la recordás: tablones, barriles y dos hombres que miran el río como si fuera a subir.' },
      { text: 'El puente viejo está cerrado con tablones y barriles. Del otro lado, Aldamar es un puñado de ventanas apagadas. Un sargento de barba gris te apunta con la ballesta sin apuntar del todo.' } ] },
    { variants: [
      { when: { met: 'orell' }, text: 'Lo conocés de otra crónica: Orell no dispara, pero tampoco cede.' },
      { text: 'El guardia joven que lo acompaña no tiene ni veinte años y sostiene la lanza como si quemara.' } ] },
    { speaker: 'orell', variants: [
      { when: { trait: 'desertor' }, text: '—Un desertor. Se te nota en cómo parás. Nadie cruza a Aldamar hasta que amanezca. Órdenes del capitán Dravos.' },
      { text: '—Nadie cruza a Aldamar hasta que amanezca. Órdenes del capitán Dravos. Date la vuelta o esperá.' } ] } ],
  choices: [
    { id: 'convencer', label: 'Explicar que la alcaldesa te espera',
      roll: { attr: 'presencia', difficulty: 'normal', tags: ['social'], advantageIf: { item: 'carta_lacrada' },
        outcomes: {
          success: { text: ['Orell lee el lacre a la luz del farol y baja la ballesta. —Pasá. Y no digas que fui yo.'], effects: [{ set: 'run:orell_confia' }], next: 'a1_plaza' },
          partial: { text: ['Te deja pasar, pero manda al guardia joven a avisar a la torre. Alguien va a preguntar por vos antes del amanecer.'], effects: [{ clock: 'sospecha', delta: 1 }], next: 'a1_plaza' },
          failure: { text: ['—Órdenes son órdenes. —La ballesta ya no apunta al suelo. Retrocedés.'], effects: [{ clock: 'sospecha', delta: 1 }], next: 'a1_puente_rechazo' } } } },
    { id: 'intimidar', label: 'Intimidar a los guardias',
      roll: { attr: 'vigor', difficulty: 'dificil', tags: ['fisico', 'social'],
        outcomes: {
          success: { text: ['El guardia joven suelta la lanza. Orell no, pero se aparta. No te va a olvidar.'], effects: [{ set: 'run:orell_humillado' }], next: 'a1_plaza' },
          partial: { text: ['Pasás, con un culatazo en las costillas como despedida.'], effects: [{ wound: 1 }, { set: 'run:orell_humillado' }], next: 'a1_plaza' },
          failure: { text: ['Dos ballestas más aparecen tras los barriles. Retrocedés con el labio partido.'], effects: [{ wound: 1 }], next: 'a1_puente_rechazo' } } } },
    { id: 'rodear', label: 'Buscar un vado río abajo',
      roll: { attr: 'astucia', difficulty: 'normal', tags: ['sigilo', 'supervivencia'],
        outcomes: {
          success: { text: ['Media legua río abajo el agua baja hasta la cintura. Cruzás sin que nadie te vea.'], next: 'a1_vado_oculto' },
          partial: { text: ['Cruzás, empapado hasta el cuello y con el farol apagado.'], effects: [{ addCondition: 'empapado' }], next: 'a1_vado_oculto' },
          failure: { text: ['La corriente te arrastra contra las piedras y te devuelve a la orilla equivocada.'], effects: [{ wound: 1 }], next: 'a1_puente_rechazo' } } } },
    { id: 'esperar', label: 'Acampar y esperar el amanecer', outcome: { effects: [{ clock: 'sospecha', delta: 1 }], next: 'a1_puente_amanecer' } },
    { id: 'runas', label: 'Leer las runas talladas en el pilar', requires: { class: 'mago' },
      outcome: { effects: [{ set: 'run:vio_runas' }], next: 'a1_puente_runas' } },
    { id: 'atajo_vado', label: 'Ir directo al vado que ya conocés', requires: { knows: 'vado_oculto' },
      outcome: { text: ['No hace falta buscar: media legua río abajo, junto al sauce partido. Cruzás sin mojarte más arriba de la cintura.'], next: 'a1_vado_oculto' } },
  ],
} satisfies Scene;

export const a1_plaza = {
  id: 'a1_plaza', kind: 'hub', place: 'aldamar_plaza', variant: 'noche',
  onEnter: [{ milestone: 'llegar_a_aldamar' }],
  redirect: [{ when: { all: [{ flag: 'run:pista_taberna' }, { flag: 'run:pista_alcaldesa' }, { flag: 'run:pista_molino' }] }, to: 'a2_molinero_muerto' }],
  text: [
    { variants: [
      { when: { visited: 'a1_plaza', min: 1 }, text: 'La plaza está como la dejaste. Las ventanas encendidas son menos: alguien se fue a dormir, o apagó la luz al oírte.' },
      { when: { flag: 'run:orell_humillado' }, text: 'Cruzás la plaza y las conversaciones se apagan. Alguien ya contó lo del puente.' },
      { when: { flag: 'run:orell_confia' }, text: 'Cruzás sin que nadie te mire dos veces. Aldamar de noche huele a humo viejo y a pan que ya no se hornea.' },
      { text: 'Aldamar de noche huele a humo viejo y a pan que ya no se hornea. Nadie te saluda; tampoco nadie te cierra la puerta.' } ] },
    { variants: [
      { when: { flag: 'run:pista_molino' }, text: 'El molino ya no tiene luz. Quedan la taberna y la casa de la alcaldesa.' },
      { text: 'Tres ventanas tienen luz: la taberna, la casa de la alcaldesa y el molino, que debería estar vacío.' } ] },
  ],
  choices: [
    { id: 'taberna', label: 'Entrar a la taberna', outcome: { next: 'a1_taberna' } },
    { id: 'alcaldesa', label: 'Golpear la puerta de la alcaldesa', outcome: { next: 'a1_alcaldesa' } },
    { id: 'molino', label: 'Acercarse al molino', outcome: { next: 'a1_molino' } },
    { id: 'dormir', label: 'Buscar dónde pasar la noche', outcome: { next: 'a1_posada' } },
    { id: 'molino_atras', label: 'Entrar al molino por atrás, durante la ronda de Pell', requires: { met: 'pell' },
      outcome: { effects: [{ set: 'run:pista_molino' }], next: 'a1_molino_trampilla' } },
    { id: 'atajo_sotano', label: 'Ir directo al sótano del molino', requires: { flag: 'char:vado.sabe_del_sello' },
      outcome: { effects: [{ set: 'run:pista_molino' }], next: 'a2_sotano_atajo' } },
  ],
} satisfies Scene;
```

El ejemplo muestra el marco de memoria: `knows` y `met` solo en párrafos de narrador (el personaje recuerda; Orell no); Orell reacciona a un rasgo (`desertor`), visible esta misma noche; el hub reacciona a `visited` y a flags `run:`; y tres opciones `[Recuerdo]` (vado conocido, ronda de Pell, sótano) son la recompensa tangible de rejugar. En la primera visita con un personaje nuevo, el motor evalúa el texto antes de derivar `met`/`place`, así que ninguna variante de memoria aparece.

## 4. Sistema de reglas

Sistema 2d6 con tres simplificaciones respecto del informe de reglas: un solo eje situacional (ventaja/desventaja, sin ±1 sueltos), el golpe mortal como efecto explícito y los Poderes reducidos a dos mecánicas (convertir y curar).

**Creación de personaje (4 pasos):** clase → retrato + nombre → 2 rasgos → resumen. La clase va primero para que la galería de 12 retratos (3 por clase, con "ver todos") muestre primero los suyos.
- **Atributos** Vigor, Astucia, Saber, Presencia, rango 0-5. Reparto inicial 2/1/1/0; la clase fija el 2, el jugador ordena el resto.
- **Clases:** Guerrero (Vigor), Explorador (Astucia), Mago (Saber), Clérigo (Presencia). Cada una: opciones `[Clase]` nunca imprescindibles, un **Poder** de un uso por partida y una **Debilidad** (desventaja permanente en un tag): Guerrero `sigilo`, Explorador `social`, Mago `fisico`, Clérigo `engano`. Poderes: Guerrero **Furia** convierte un Fallo en Éxito con costo en tiradas `fisico`; Explorador **Sombra** lo mismo en `sigilo`, `huida` o `supervivencia`; Mago **Conjuro** en cualquier tirada y gana la condición Agotado; Clérigo **Plegaria** cura 1 Herida y limpia condiciones, desde la ficha.
- **Rasgos de origen (2 de 8), cada uno = ventaja en UN tag + flag `char:origen.<id>`** que abre variantes y opciones `[Origen]`: Hijo de la frontera (`supervivencia`), Criado en el templo (`fe`), Desertor (`fisico`), Huérfano de la peste (`percepcion`), Aprendiz de escriba (`saber`), Contrabandista (`engano`), Cazador furtivo (`sigilo`), Hijo de molinero (`social`). Nada de condicionales tipo "con gente de pueblo": lo condicional lo escribe el contenido leyendo el flag.
- **Habilidades:** una en niveles 3, 5, 7 y 9; cada una = ventaja en un tag más opciones `[Habilidad]`. Doce en la v1: Veterano (`fisico`), Intimidante y Orador (`social`), Rastreador y Ojo avizor (`percepcion`), Escurridizo (`huida`), Erudito de runas (`saber`), Vista arcana (`magia`), Voz del templo (`fe`), Curandero y Superviviente (`supervivencia`), Manos ligeras (`sigilo`).
- **Regla de identidad:** no se puede elegir un rasgo ni una habilidad cuyo tag coincida con la Debilidad de la clase (la UI los oculta con el motivo): la Debilidad solo la anula una fuente situacional. Dos fuentes permanentes del mismo tag no se apilan y la UI lo advierte.

**La tirada.** `2d6 + Atributo + Dificultad` (Fácil +1, Normal 0, Difícil −1, Muy difícil −2, Extrema −3; Extrema solo en campañas de rango ≥ 3). **Ventaja**: 3d6 y se conservan los 2 mayores; **Desventaja**: los 2 menores. No se acumulan; si hay ambas, se anulan y los chips lo muestran tachado ("▲ Veterano ⇄ ▼ Herido"). Fuentes de ventaja: rasgo, habilidad u objeto cuyo tag coincide, `advantageIf`. Fuentes de desventaja: Debilidad, condiciones con ese tag, Herido en `fisico`, Malherido en todo, `disadvantageIf`. El único número adicional es el modificador **Veterano**. `dice.ts` enumera 2d6 y 3d6 exhaustivamente; UI, linter y simulador usan la misma función.

**Tabla de resultados.** Los naturales priman sobre el total y la línea de objetivo lo dice ("10+ éxito · 7+ con costo · doble 1 siempre falla · doble 6 siempre crítico"):

| Resultado | Condición | Texto | Si falta texto |
|---|---|---|---|
| Crítico | doble 6 natural en los dados conservados | `crit` opcional | Éxito y +1 Fortuna |
| Éxito | total ≥ 10 | obligatorio | — |
| Éxito con costo | 7-9 | obligatorio; UN costo de la lista cerrada: Herida, condición, objeto, relación (flag), oportunidad, reloj +1 | — |
| Fallo | ≤ 6 | obligatorio; siempre avanza | — |
| Fallo grave | doble 1 natural | `fumble` opcional | Fallo y una condición |

Con ventaja o desventaja los dobles conservados suben del 2,8 % al 7,4 %: la ventaja casi triplica los críticos y la UI muestra esa banda cuando difiere de la nominal. Probabilidades con modificador neto 0: 16,7 / 41,7 / 41,7 %; con +2: 41,7 / 41,7 / 16,7; con ventaja y +2: 68,1 / 26,9 / 5,1. **Etiqueta de riesgo:** Seguro = Fallo ≤ 20 % **y** Éxito ≥ 40 %; Arriesgado = Fallo ≤ 45 %; Peligroso = Fallo > 45 %.

**Fortuna.** 3 puntos por partida (4 desde nivel 5), no persisten. Tras ver los dados, 1 Fortuna = repetir un dado a elección (sale del hash con `intento + 1`). +1 por crítico, hasta el máximo. Quien muere con Fortuna sin gastar, eligió.

**Estado.** Heridas 0-3: Sano → Herido (desventaja en `fisico`) → Malherido (desventaja en todo) → Caído. Condiciones-etiqueta (Envenenado, Asustado, Exhausto, Empapado, Perseguido, Agotado; cada una declara su tag o `all`), máximo 3. Una escena `rest` cura **como máximo 1 Herida** y limpia condiciones; el fin de campaña cura todo. Así las heridas del acto 2 llegan a la tormenta y cruzar pesa. Objetos: 6 ranuras, cada uno una etiqueta (ventaja en tags o llave narrativa). Reliquias: hasta 2 objetos `relic` de `world/items.ts` que persisten entre campañas. Relojes por campaña leídos con `clock gte`.

**Combate narrativo.** Escena `encounter` por ronda: 2 rondas la pelea menor, 3 el jefe. Cada ronda ofrece ≥ 2 atributos distintos, una opción sin tirada (ceder, negociar, usar el entorno) y una huida; desde la segunda ronda las opciones dependen del estado (reloj, Heridas, flags), para que sea una secuencia de decisiones y no la misma pregunta tres veces. Reloj de victoria de 2 a 3: Éxito +1, Crítico +2, Éxito con costo +1 y el enemigo golpea (Herida o condición), Fallo = golpe. Sin reloj de peligro: el combate termina por victoria, huida o Caído; el `redirect` de la ronda salta al desenlace.

**Dificultad de campaña y Veterano.** Cada campaña declara `levelRange`, `lethalScenes` y duración. El hub calcula la etiqueta contra el nivel del personaje: 2 o más por debajo del mínimo = **Mortal**; 1 por debajo = **Exigente**; en rango = **Pareja**; hasta 2 por encima del máximo = **Tranquila**; más = **Paseo**. Los umbrales de las escenas nunca escalan; escala el personaje: en Tranquila toda tirada lleva **−1** y en Paseo **−2**, visibles como chip "▼ Veterano del Vado". Es la Ascensión A1/A2 aplicada sola, sin contenido nuevo; la Ascensión elegible queda para después.

**Progresión por descubrimiento.** Niveles 1-10, 60 XP por nivel (nivel N = 60 × (N − 1) acumulados). Fuentes de XP, todas "la primera vez con este personaje": hito 10; final no visto 30; bono de campaña solo en la primera victoria (Mortal 80, Exigente 60, Pareja 40, Tranquila 20, Paseo 0). Repetir un hito o un final da 0. **Tope por campaña:** una campaña no sube a un personaje más allá de `levelRange[1] + 1` (Aldamar: nivel 4); la XP sobrante se descarta y el fin lo dice. Niveles pares: +1 atributo (techo 5); impares: habilidad; nivel 5: Fortuna 4; nivel 10: `char:leyenda`. Calibración: primera victoria = 100 + 30 + 40 = 170 XP → nivel 3; la segunda con un final nuevo → nivel 4 (tope) y la campaña pasa a Tranquila con −1. El nivel sube explorando y se frena cuando la campaña no tiene nada nuevo.

**Derrota, abandono y muerte permanente.**
- **Caído** (Heridas 3) = campaña perdida: se conserva la XP de hitos nuevos, sin bono ni final; la partida se borra y no reescribe el canon (sección 5). **Abandonar** desde el hub tiene las mismas consecuencias y el aviso lo dice. Sin cicatrices en la v1: el guardado reserva `scars: string[]` para no migrar después.
- **Muerte permanente**, regla de dos pasos verificable: `{ lethal: true }` aplica 2 Heridas; Malherido → muere; Herido → Caído; Sano → Malherido y sigue. Solo existe en outcomes de tirada de escenas `lethal`, a las que se entra por una decisión sin dados con confirmación **consciente del estado** ("Estás Malherido: un Fallo acá te mata" / "Estás Herido: un Fallo te deja fuera de la campaña" / "Estás sano: un Fallo te deja Malherido"). La calavera del hub explica la regla en una línea. Toda escena mortal ofrece una salida sin tirada y una vía con tirada que no es `fisico`, así cada clase responde con su atributo o su Poder; Fortuna y Poder se ofrecen antes de consolidar.
- **Legado:** al morir, el personaje pasa a `world.fallen` y el motor escribe `world:caido.<campaña>`, que las campañas futuras citan. El rasgo Heredero se implementa con la segunda campaña, la primera que puede leerlo.

## 5. Sistema de memoria

Tres alcances, todos flags con prefijo (codewords al estilo Fabled Lands) más contadores de visitas.

| Prefijo | Vive en | Se borra | Ejemplos |
|---|---|---|---|
| `run:` | la partida | al terminar, perder o abandonar | `run:orell_confia`, relojes, `visited` |
| `char:` | el personaje | nunca (salvo muerte); los `char:<campaña>.*` se reemplazan por canon | `char:vado.sabe_del_sello`, `char:met.orell`, `char:place.vado_oculto`, `char:origen.desertor` |
| `world:` | el perfil | nunca (sobrevive a la muerte); los `world:<campaña>.*` se reemplazan por canon | `world:vado.aldamar_inundada`, `world:caido.vado` |

**Canon por campaña.** Durante una partida, los `set` de `char:vado.*` y `world:vado.*` se acumulan en `run.stagedFlags` (visibles para las condiciones de esa partida). Al terminar por un final, el conjunto `char:vado.*` del personaje **se reemplaza** por el de la partida, y el `world:vado.*` del perfil, ídem: la última crónica completada es el canon. Derrota y abandono descartan lo apostado. Así un personaje nunca carga a la vez "vendió el sello" y "salvó a Ilse", y la segunda campaña lee una sola versión. Los espacios compartidos (`met`, `place`, `origen`, `leyenda`, `caido`) son acumulativos. La ficha muestra "Crónica canónica del Vado: La crecida".

**Marco de ficción (regla de prosa y de linter).** Dentro de la misma campaña cada partida es "la misma noche otra vez": los PNJ no pueden recordar otra partida. Las variantes `met`, `knows`, `endingSeen` y `char:<misma campaña>.*` solo van en párrafos de narrador ("Lo conocés. Sabés que no va a disparar.") o en `requires` de opciones. Entre campañas distintas, un PNJ de `world/` sí recuerda ("—Otra vez vos", pero en la campaña dos).

**Derivación automática (cero trabajo del autor).** Al salir de una escena por una elección, `memory.ts` escribe `char:met.<npc>` por cada PNJ de `npcs`, `char:place.<lugar>` por el `place`, incrementa `run.visited[sceneId]` y agrega a `seen[campaña][sceneId]` el hash FNV-1a (base36) del texto de cada párrafo mostrado. Al terminar se registran final, hitos y partidas en `character.campaignLog[campaña]`. El autor solo escribe flags de decisiones.

**Qué se recuerda y cómo lo usa el texto.**
- *Dentro de la partida:* `visited`, flags `run:`, relojes. Las tres pistas del acto 1 tienen contenido exclusivo por orden (quién está en el molino cambia si vas primero o último).
- *Entre partidas de la misma campaña:* narrador con `knows`/`met`, `endingSeen` ("2 de 4 finales"; una opción extra para quien ya vio la traición) y sobre todo **atajos `[Recuerdo]`**, tres en Aldamar: conocer el vado oculto salta la búsqueda; conocer la ronda de Pell resuelve la pista del molino en una escena; saber del sello lleva directo al sótano.
- *Entre campañas:* `char:met.*`, `char:place.*`, canon `char:vado.*`, `world:*`, reliquias. PNJ y lugares recurrentes viven en `content/world/` con id estable.

Mecanismos: `TextVariant.when` (la primera que cumple gana; la más específica arriba), `requires` y `advantageIf` con memoria, la sección **Recuerdos** de la ficha (PNJ conocidos, lugares, finales vistos, crónica canónica, Caídos), alimentada por los flags derivados más `character.memoryNames`, y "lo que el mundo recordará" en la pantalla de fin. Regla de autoría: si una decisión afecta más de una escena futura, es flag, no rama.

## 6. Experiencia de juego y UI

**Pantallas y transiciones** (`store.screen`): `inicio → creacion → hub`; `inicio → cargando → escena` (Continuar); `hub → cargando → escena`; `cargando → error → cargando` (reintentar); `escena → fin` (final, Caído o muerte); `escena → hub` (abandonar, con aviso de derrota); `fin → hub`; `fin(muerte) → inicio`. Ficha y Menú son cajones sobre la escena; Opciones (con exportar/importar) es un modal.

- **Inicio:** fondo de app oscurecido, emblema + wordmark (SVG), Continuar (si hay partida), Personajes (hasta 3), Campañas, Opciones.
- **Creación (4 pasos con barra y volver):** clase en 4 tarjetas (arte, "potencia tiradas de…", Poder, Debilidad) → retrato (12, los de la clase primero) + nombre → 2 de 8 rasgos (los incompatibles con la Debilidad ocultos con motivo) → resumen y Crear.
- **Hub de campañas:** tarjetas 3:4 con portada, título, nivel sugerido, etiqueta relativa en color y palabra (con "−1 Veterano" si aplica), duración, calaveras con las escenas mortales y la regla de dos pasos al pasar el cursor, "2 de 4 finales", partidas jugadas, estado, Continuar / Comenzar. Sin bloqueo por nivel: confirmación si es Exigente o Mortal; "Abandonar partida" con aviso de derrota.
- **Escena (layout híbrido):** fondo 16:9 a pantalla completa con degradado hacia la derecha; columna derecha del 40 % (420-720 px, 60-75 caracteres por línea, serif 19 px) con scroll que acumula toda la partida: el historial es la columna. Retrato 3:4 del hablante como side image de 160 px con name plate; barra superior con lugar, Heridas (3 marcas), Fortuna (3 gemas), condiciones y botón Ficha. Fundido cruzado del fondo cuando decodificó; precarga de los fondos de las escenas hijas. Móvil: fondo arriba y hoja inferior, en pulido.
- **Opciones:** lista numerada 1-9 al pie. Cada fila: etiqueta, badge, chip del atributo con modificador neto ("Presencia +2 · Normal"), chips de ventaja/desventaja con origen y anulaciones tachadas, etiqueta de riesgo con icono y color, porcentajes de las tres bandas si "Mostrar probabilidades" está activa (por defecto sí). Bloqueadas en gris con `lockedHint`; marca sutil "ya elegida" si el destino está en `seen`; calavera y confirmación consciente del estado hacia escenas `lethal`.
- **Tirada (inline, nunca modal):** objetivo en palabras, dos d6 SVG que giran 700 ms (tres con ventaja/desventaja; el descartado se apaga), chips que "vuelan" con su origen, total y sello **Éxito / Con costo / Fallo / ¡Crítico! / Grave**. Botones "Fortuna: repetir este dado" y "Poder" si aplican; luego se consolida y aparece el texto. Cualquier clic salta la animación; `prefers-reduced-motion` muestra el resultado directo.
- **Ficha (cajón, tecla C):** atributos, clase y Poder, rasgos, habilidades, objetos, reliquias, Heridas, condiciones, XP/nivel con el tope de la campaña, Recuerdos.
- **Fin de campaña:** CG, título, epílogo con variantes, "lo que el mundo recordará" (canon nuevo), hitos y XP, subida de nivel ahí mismo, reliquia, finales vistos con los no vistos en silueta, Volver al hub. Derrota: XP conservada y vuelta al hub. Muerte: pantalla de Caído y vuelta a Inicio.
- **Texto y control:** máquina de escribir por párrafo (40 cps, "instantáneo" disponible); primer clic muestra todo, segundo avanza. **"Saltar leído"** acelera hasta el primer párrafo cuyo hash no está en `seen` y se detiene en decisiones y tiradas: las variantes de memoria son lo único que no se salta. Teclado: 1-9, Enter/Espacio, C, Esc. Fuente 100/125/150 %, contraste 4,5:1, foco visible, resultados con icono y texto.
- **Guardado:** `persist` de Zustand escribe en cada `set`; no hay otro mecanismo ni ranuras; cada personaje lleva como mucho una partida en curso.

## 7. Pipeline de arte con IA

**Fuera del camino crítico.** Motor, UI y escritura usan placeholders grises; ComfyUI se instala el primer día de la fase de arte o una tarde libre en paralelo.

**Instalación mínima:** ComfyUI Portable en `C:\ComfyUI` (Dev Mode para exportar workflows en API format) + ComfyUI-Manager + `ComfyUI-RMBG` (pesos BiRefNet, MIT; **no** RMBG-2.0) + `comfyui_controlnet_aux` + `controlnet-depth-sdxl-1.0-small` (~320 MB). Upscale con el nodo core `ImageUpscaleWithModel` + RealESRGAN_x4plus (BSD). Nada de Impact-Pack ni UltimateSDUpscale; LayerDiffuse solo si BiRefNet falla en los iconos. Requisitos: driver NVIDIA reciente, **32 GB de RAM recomendados**, 40 GB libres en SSD.

**Modelo (decisión):** uno solo: SDXL finetune pictórica (ZavyChromaXL; DreamShaper XL de respaldo) + LoRA "Painterly Fantasia", fp16, 28 pasos DPM++ 2M SDE Karras, CFG 5; UNet en fp8 cuando hay ControlNet. Presupuesto: 25-30 s por imagen plana y 40-60 s con control, a verificar con un log en la **prueba de estilo de medio día** (20 prompts fijos: 5 retratos, 5 fondos, 5 objetos, 5 escenas) cuyo único objetivo es congelar `art/style.md`. FLUX.2 klein 4B y Qwen-Image-Edit quedan en "más adelante", salvo que SDXL falle claramente. Sin SDXL Lightning en la curación (la misma seed con otro sampler da otra imagen). Cada checkpoint y LoRA se registra con su licencia en `art/LICENSES.md` antes de usarse.

**Consistencia (tres capas):** (1) **Estilo:** `style.md` congela prompt positivo y negativo, sampler, pasos, CFG, resolución, LoRA y peso; si no converge, LoRA de estilo propio con kohya_ss (30-60 imágenes, 768 px, batch 1, Adafactor, 2-5 h). (2) **Identidad:** `canonPrompt` por PNJ y lugar en el contenido; 8 candidatos por maestro; Gabriel elige la imagen maestra; retratos con encuadre idéntico (hombros arriba, tres cuartos, mirada a la izquierda, fondo neutro); un retrato por PNJ. (3) **Composición:** variantes de lugar con ControlNet depth del maestro + prompt nuevo; objetos e iconos sobre gris liso + BiRefNet.

**Reproducibilidad.** `art/curation.json` guarda por id la tupla completa (hash del checkpoint, LoRA y peso, sampler, scheduler, pasos, CFG, resolución, seed, versión del workflow, `status`, `master`); un test de humo regenera un maestro y exige diferencia < 1 %. `art/masters/` está fuera de git pero con respaldo (Drive o disco externo): los másteres son la fuente de verdad, la seed es la segunda.

**Catálogo (≈ 57 imágenes finales):**

| Tipo | Cantidad | Máster | Exportado | Formato / peso |
|---|---|---|---|---|
| Retratos de jugador | 12 | 896×1152 → recorte 3:4 | 768×1024 | AVIF q65 + WebP, 30-60 KB |
| Retratos de PNJ | 8 (5 en `vado/`, 3 en `world/`) | ídem | 768×1024 + mini 192×256 | ídem |
| Fondos de lugar | 8 base + 4 variantes | 1344×768 → 2× ESRGAN | 1920×1080 | AVIF q70 + WebP, 100-200 KB |
| CG de escena | 6 | 1344×768 → 2× | 1920×1080 | 100-250 KB |
| Objetos | 8 (1 reliquia en `world/`) | 1024² + BiRefNet | 256×256 alfa | WebP alfa < 20 KB |
| Iconos de clase y atributo | 8 | 1024², seed fija | 128×128 alfa | < 10 KB |
| Portada, fondo de app, emblema | 3 | 896×1152 → 2× / 1344×768 → 2× / 1024² | 900×1200 / 1920×1080 / PNG alfa | < 250 KB c/u |
| Iconos de UI | ~20 | SVG a mano / Lucide | inline | — |

`post.py` recorta centrado con margen superior configurable; `validate --assets` verifica relación de aspecto, dimensiones y peso. Presupuesto: campaña 10-15 MB, carga inicial < 1,5 MB. **Nombres:** `<tipo>/<id>[.<variante>].png` con el mismo id que el contenido (`npc/orell.png`, `place/puente_viejo.noche.png`, `player/mago_02.png`); másteres en `art/masters/<tipo>/<id>/`, exportados en `src/assets/<world|vado>/<tipo>/`.

**Flujo por lotes:** (1) `npm run art:manifest` regenera `art/manifest.generated.json` desde el contenido (id, tipo, campaña, prompt = style + canonPrompt, tamaño, workflow); nunca se edita a mano y falla si un id de `curation.json` desapareció del contenido. (2) `python art/gen_assets.py --type npc --status todo --candidates 8`: join por id, carga el workflow API (`sdxl_txt2img`, `sdxl_controlnet_depth`, `rmbg_birefnet`, `upscale_esrgan`), sustituye prompt/seed/tamaño, `POST /prompt`, espera por WebSocket, guarda `art/masters/<tipo>/<id>/cand_<seed>.png`. (3) Curación: Gabriel renombra el elegido a `master.png` y el script registra la tupla. (4) `--variants` genera las variantes con ControlNet depth. (5) `python art/post.py`: upscale, recorte, resize, PNG a `src/assets/`; `vite-imagetools` produce AVIF + WebP en build. (6) `npm run validate -- --assets`.

**Logo:** emblema generado (sello del vado sobre agua) + BiRefNet + wordmark en Cinzel Decorative (SIL OFL) compuesto en SVG dentro de React.

## 8. Pipeline de escritura de contenido con IA

Se escribe con Claude Code en el repo, en TS tipado, con artefactos versionados en `campaigns/vado/design/`. Regla central: **grafo primero, prosa después**; la escritura arranca en la semana 1, en paralelo con el código, porque no depende de ninguna UI.

1. **`00-biblia.md`** (semana 1, humano + IA, 2 páginas): premisa, tono y reglas de prosa (segunda persona, presente, narración en rioplatense neutro y voseo en diálogos, un detalle sensorial por escena, sin gore explícito, nunca describir el resultado de una tirada en la escena que la propone, marco de memoria), PNJ con voz, secreto y `canonPrompt`, lugares, finales y qué decisiones los determinan, hitos, relojes, flags, taxonomía de decisiones (Fluff / Spice / Floodgate / Burnt Bridge), la escena mortal y qué decisión la anticipa.
2. **`01-outline.md`** (semana 1): rama-y-cuello-de-botella (máximo dos ramas por cuello) en Mermaid, con presupuesto de escenas y de palabras por acto.
3. **Esqueleto** (semana 2, apenas exista `schema.ts` + `validate`): todas las escenas con `text: ['TODO']`, `choices` con `label`, `next`, `roll` y `effects`. `validate --skeleton` en verde; `npm run graph` exporta Mermaid; el linter suma los máximos de palabras por escena y reporta el total antes de escribir prosa.
4. **Prosa por lotes** (desde la semana 3, 5-8 escenas por semana) con `tools/writing/PLANTILLA_ESCENA.md`: id, lugar, hora, PNJ presentes, opciones que llevan a la escena, flags de entrada, variantes de memoria obligatorias (y en qué párrafo pueden ir), las 4+ opciones con atributo, riesgo y qué debe pasar en cada outcome, longitud. Claude Code devuelve el `Scene` completo con las vecinas como contexto, corre `validate` y `lint-text` y corrige antes del siguiente lote.
5. **Pasada de memoria:** hubs, PNJ recurrentes y atajos `[Recuerdo]`; canon `char:vado.*` y `world:vado.*` de cada final.
6. **Pasada de voz y lectura humana:** consistencia de voz por PNJ; Gabriel juega una ruta por clase con `simulate --path` (semilla fija) cuando la UI está lista. Es la última pasada, no la primera.

**Control de calidad automático:** `validate` (niveles ERROR y AVISO) y `lint-text` (n-gramas, duplicados, palabras prohibidas de la biblia, longitudes, duración por ruta) en pre-commit y CI.

## 9. Persistencia y guardado

- **Dónde:** localStorage, una sola clave `juegorol`, vía Zustand `persist` con `partialize` (todo menos `ui`). `navigator.storage.persist()` al crear el primer personaje. Try/catch en todo acceso; `QuotaExceededError` muestra aviso y sugiere exportar. Limitación conocida: Safari/iOS borra el almacenamiento tras 7 días sin visitas; ahí el recordatorio de exportar es más insistente y el README sugiere "Añadir a pantalla de inicio".
- **Qué** (el wrapper `{ state, version }` de `persist` es el formato de guardado y de exportación):

```ts
interface State { characters: Character[] /* máx. 3 */; activeCharacterId: string | null;
  world: { flags: string[]; fallen: { name: string; classId: ClassId; level: number; campaign: string; scene: string }[] };
  seen: Record<string, Record<string, string[]>>;   // campaña → escena → hashes de párrafo
  prefs: { cps: number; showOdds: boolean; fontScale: 1 | 1.25 | 1.5; reducedMotion: 'auto' | 'on' } }
interface Character { id: string; name: string; portrait: string; classId: ClassId; attrs: Record<Attr, number>;
  traits: TraitId[]; skills: SkillId[]; level: number; xp: number; flags: string[] /* char: */;
  memoryNames: Record<string, { name: string; campaign: string }>; relics: string[]; scars: string[] /* reservado */;
  campaignLog: Record<string, { runs: number; wins: number; endings: string[]; milestones: string[]; canonEnding?: string }>;
  run: Run | null; dead?: { campaign: string; scene: string } }
interface Run { campaignId: string; contentVersion: number; sceneId: string; flags: string[] /* run: */;
  stagedFlags: string[] /* char:<campaña>.* y world:<campaña>.* apostados */; visited: Record<string, number>;
  items: string[]; wounds: 0 | 1 | 2 | 3; conditions: ConditionId[]; fortune: number; powerUsed: boolean;
  clocks: Record<string, number>; log: LogEntry[] /* tope 400 */; rngSeed: number;
  pending?: { choiceId: string; rerolls: number[]; powerUsed: boolean } }
```

- **Cuándo:** en cada `set` del store (entrar en una escena, mostrar dados, consolidar). Ningún otro mecanismo.
- **Versiones y migraciones:** una sola fuente de verdad, el `version` de `persist`; `state/migrations.ts` es un arreglo `[(v1) => v2, …]` puro aplicado por `persist.migrate` y por la importación, con fixtures por versión. **Política de `contentVersion`:** sube solo si cambian ids de escena, `next`, `redirect`, efectos o catálogos de flags y relojes; la prosa nunca lo sube; un test compara el hash del grafo estructural con el declarado. Si una partida en curso es de otra versión, se ofrece abandonarla conservando la XP de hitos nuevos; nunca se migra el grafo.
- **Exportar/importar:** en Opciones e Inicio: descarga `juegorol-<fecha>.json` y `<textarea>` para copiar y pegar; importar valida con zod y migra. Recordatorio al terminar la primera campaña.

## 10. Testing y validación

- **Contenido** (`tests/content/`): cada campaña del registro pasa zod + `validate` con el perfil de su `meta` (`smoke` relaja longitudes, memoria y duración; `release` exige todo). Un fixture roto por regla ERROR verifica que dispara.
- **Motor** (`tests/engine/`, cobertura > 90 %): tabla exacta de probabilidades (mod 0 → 16,7/41,7/41,7; ventaja mod 0 → 35,6/44,9/19,4; desventaja mod 0 → 5,1/26,9/68,1; dobles 2,8 % / 7,4 %); precedencia de naturales; anulación y regla de identidad; efectos con topes; variantes por prioridad; orden `redirect → onEnter → render → derivación` con la propia `a1_puente` (la primera visita con personaje nuevo no muestra `met` ni `knows`; escenas atravesadas por redirect no cuentan); dados por hash y `pending` que sobrevive a la recarga; dos fases con Fortuna y Poder; XP por descubrimiento, tope por campaña y Veterano; regla de dos pasos (Sano nunca muere; Herido + `lethal` = Caído; Malherido + `lethal` = muerte); canon (el final reemplaza `char:vado.*`; derrota y abandono no); alcances al terminar, perder y morir; migraciones; export/import de ida y vuelta.
- **Simulación** (`tools/simulate.ts`): un **reporte**, no una puerta, salvo tres aserciones. Simula **carreras**: cada personaje juega K = 4 partidas consecutivas conservando `char:`/`world:`/`campaignLog`, por 4 clases × niveles {1, 3} × tres políticas (aleatoria, codiciosa = mayor probabilidad, temeraria = mayor riesgo) con políticas fijas de Fortuna y Poder, N = 500 carreras por combinación, más un perfil "veterano" con `seedFlags` configurables. Reporta cobertura de escenas y opciones, finales por clase y por partida de la carrera, longitud por partida (objetivo 24-30 escenas), derrota y muerte, Heridas medias, tasa de Fallo por partida (detecta trivialización), flags nunca alcanzados, XP y nivel. Aserciones que fallan la CI: (1) ninguna escena sin `requires` de memoria es inalcanzable; (2) muerte a nivel 1 con política codiciosa < 3 %; (3) los cuatro finales alcanzados por las cuatro clases en alguna partida de la carrera. Los demás umbrales se fijan después de 3-5 testers. El reporte va a `design/sim-report.md` y se compara entre commits.
- **UI:** pocos tests con Testing Library: lista de opciones (teclado, bloqueadas, badges, chips tachados), tirada (saltable; `reduced-motion`), confirmación consciente del estado, pantalla de fin. Sin Playwright en la v1; guardar-recargar se prueba a mano.
- **Rendimiento y assets:** `validate --assets` cruza contenido ↔ `curation.json` ↔ archivos y verifica aspecto, dimensiones y peso; presupuestos de carga leyendo `dist/` en CI.

## 11. Primera campaña: "El vado de Aldamar"

Premisa del diseño "mvp" por ser la de menor alcance, con la taxonomía de decisiones, los PNJ globales y la revelación condicionada por flags.

**Premisa.** Una carta lacrada de Berta, alcaldesa de Aldamar, un pueblo fronterizo junto a un vado, te promete plata por encontrar a Tomé, el molinero desaparecido. Al llegar, el puente está cerrado por la guardia del capitán Dravos y el molino tiene luz aunque debería estar vacío. En dos noches descubrís que Tomé encontró bajo el molino un sello antiguo que contiene la crecida del río, y que Dravos quiere venderlo a un mercader del otro lado. Berta, su hija Ilse y el sargento Orell tienen cada uno una versión, y una de ellas es una traición. La tercera noche, con la tormenta encima, decidís quién se queda con el sello, quién cruza el vado y quién no vuelve.

**Estructura (rama y cuello de botella, dos cuellos):**
- **Prólogo** (5): el camino bajo la lluvia, el puente (escena de ejemplo) y tres salidas convergentes (rechazo, vado oculto, amanecer). Atajo `[Recuerdo]` al vado oculto.
- **Acto 1, Aldamar de noche** (hub + 3 pistas, ~13): taberna de Mausi (Orell bebe ahí), casa de la alcaldesa (Berta e Ilse), molino (la luz, la trampilla, el guardia joven Pell). Cada pista deja un `run:pista_*` y su contenido cambia según el orden (Pell está en el molino solo si vas primero; si vas último, la trampilla está abierta). Reloj `sospecha` 0-4: al llenarse, Dravos te manda buscar antes de tiempo (Floodgate). Atajo `[Recuerdo]` con la ronda de Pell.
- **Cuello 1, el molinero muerto** (3): el cuerpo de Tomé; Dravos te acusa en la plaza; `encounter` de 2 rondas (reloj 2) o la palabra de Orell si `run:orell_confia`. Burnt Bridge: con la ley o contra la ley.
- **Acto 2, dos ramas** (~12): *Con la ley*: Orell, la torre de Dravos, las cartas del mercader Halvar, la duda sobre Berta. *Contra la ley*: huir con Ilse al sótano del sello, el medallón, la verdad de Tomé; opción `[Recuerdo]` "Preguntarle a Ilse por el sello sin rodeos" (`endingSeen: fin_crecida`) que escribe `char:vado.sabe_del_sello`. Se puede cruzar de rama una vez con costo de sospecha. Escena `rest` en cada rama (cura 1 Herida).
- **Cuello 2, la tormenta** (3): el vado crece; **escena mortal única** "El vado crecido", anunciada dos escenas antes. Cinco opciones: cruzar con el sello bajo las ballestas (Vigor muy difícil, `fisico`, `lethal` en Fallo), cruzar por las piedras a oscuras (Astucia muy difícil, `sigilo` + `supervivencia`, `lethal` en Fallo), entregar el sello (sin tirada; pierde el final de la crecida), esconder el sello y cruzar sin él (Astucia normal, sin `lethal`) y esperar a Orell (`requires: run:orell_confia`).
- **Clímax en el molino** (4): jefe de 3 rondas contra Dravos o negociación con Halvar según rama y flags, más el desenlace.
- **4 finales + muerte:** *El sello se hunde*; *Aldamar de Dravos* (traición aceptada; `char:vado.vendido`); *La crecida* (Ilse salva el pueblo; `char:vado.vinculo_ilse`, reliquia *Sello del vado* de `world/items.ts`); *El heredero* (oculto: te quedás con el sello; requiere `char:vado.sabe_del_sello`, que escriben la ruta del Mago, la segunda lectura de las runas con Aprendiz de escriba, o la pregunta a Ilse de quien ya vio *La crecida*: toda clase llega, a más tardar en la segunda partida).

**Números:** `levelRange [1, 3]` (Pareja para un personaje nuevo; tope nivel 4), 1 escena mortal, 30-45 min (24-30 escenas por partida); **~46 escenas** (5 + 13 + 3 + 12 + 3 + 4 + 4 finales + 2 de transición), ~30 tiradas, 2 encuentros (5 rondas); **8 PNJ** (Orell, Ilse y Halvar en `world/`); **8 lugares** con 4 variantes; 8 objetos; 10 hitos; relojes `sospecha` y `pelea`; ~22 flags `run:`, 6 `char:vado.*`, 2 `world:vado.*`; ~57 imágenes; **~11.000-12.000 palabras de prosa** (46 × ~110 + 30 tiradas × 3 × ~40 + ~1.400 de variantes + ~1.200 de epílogos y etiquetas), de las que una partida lee ~5.000.

## 12. Roadmap por fases

Estimado en horas; el calendario depende de las horas por semana que Gabriel declare (con 12 h/semana, ~22 semanas; con 20 h/semana, ~13). Las fases A y B corren en paralelo desde la semana 1. Ninguna fase se abre con la anterior en rojo.

| Fase | Qué se construye | Horas | Listo cuando |
|---|---|---|---|
| **A. Rebanada vertical** | Repo, Vitest y CI con "Hola" en Pages (4 h); `schema.ts`, `catalog.ts` y `engine/*` con tests (16 h); `validate` con las 10 reglas ERROR (6 h); campaña de humo `prueba/` de 8 escenas, `levelRange [3,5]`, `hidden`, con tirada, memoria, encuentro, escena mortal y final (4 h); pantalla de escena mínima con columna, opciones con porcentaje, tirada sin animación, Fortuna y `persist` (12 h) | ~42 | Se juega la campaña de humo de punta a punta con placeholders grises, se recarga y continúa; la primera visita no muestra "otra vez" |
| **B. Biblia y esqueleto** (paralela a A) | `00-biblia.md` y `01-outline.md` (semana 1); esqueleto de las 46 escenas con `validate --skeleton` en verde y presupuesto de palabras (semana 2) | ~14 | Grafo aprobado sin una palabra de prosa |
| **C. Personaje, hub, fin y guardado** | Creación en 4 pasos, hub con etiqueta relativa y Veterano, fin con XP por descubrimiento y subida de nivel, derrota, muerte, export/import, migraciones con fixtures, `cargando`/`error` | ~30 | Un personaje termina la campaña de humo con Mortal confirmado, sube de nivel, rejuega y lee una variante de memoria; exportar e importar conserva todo |
| **D. Prosa por lotes** (desde la semana 3, paralela a C y E) | 6-7 lotes de 5-8 escenas; pasada de memoria; pasada de voz | ~50 | `validate` y `lint-text` en verde en perfil `release` |
| **E. Herramientas** (paralela) | `graph`, `simulate` con carreras y reporte, `lint-text`, fixtures por regla ERROR, `validate --assets` | ~24 | Reporte de simulación generado y las 3 aserciones en verde |
| **F. UI completa** | Tirada inline animada con chips y anulaciones, confirmación consciente del estado, ficha con Recuerdos y crónica canónica, saltar leído por párrafo, teclado, reduced-motion, fundidos y precarga | ~36 | Una tirada con Fortuna se entiende sin explicación; saltar leído se frena en una variante nueva |
| **G. Arte** (paralela a D-F) | Instalación mínima de ComfyUI (6 h), prueba de estilo y `style.md` (4 h), manifiesto y curación (~430 generaciones desatendidas + 12 h de curación), variantes, post-proceso, galería de 12 retratos, logo, fondo de app, integración | ~40 | `validate --assets` sin faltantes ni sobrantes; campaña < 15 MB; carga inicial < 1,5 MB |
| **H. Pulido y lanzamiento** | Lectura humana de una ruta por clase, móvil como hoja inferior, accesibilidad básica, README, 3-5 testers, umbrales de simulación fijados con sus datos | ~26 | Publicado con URL; los testers terminan una partida sin ayuda y al menos 2 rejuegan; partida media 30-45 min; sin errores de consola |
| **Más adelante** | Ascensión elegible, cicatrices, Heredero, Qwen-Edit para expresiones, klein 4B si SDXL falla, LoRA de estilo propio, audio, segunda campaña (nivel 3-5, 60-90 min) que reutilice Orell/Ilse/Halvar y lea el canon `char:vado.*`, extracción de textos por id para traducir, service worker | — | La segunda campaña se agrega sin tocar el motor |

Total ≈ 260 h hasta la v1. El primer hito jugable (A) llega a las ~40 h de trabajo, no al mes y medio.

## 13. Riesgos y mitigaciones

1. **El look pictórico no converge.** Prueba de estilo con prompts fijos; `style.md` congelado; imagen maestra por entidad; LoRA de estilo propio si hace falta (2-5 h, verificado en 8 GB).
2. **Tiempos de GPU peores que lo presupuestado.** Medir en la prueba de estilo con log; lotes nocturnos desatendidos; el arte no bloquea ninguna otra fase.
3. **Licencias de checkpoints y LoRAs sin verificar.** `art/LICENSES.md` por peso antes de generar; solo uso comercial permitido; nunca RMBG-2.0, Flux.1 dev, klein 9B ni 4x-UltraSharp sin confirmar.
4. **Explosión combinatoria.** Rama y cuello con dos ramas máximo; "si afecta más de una escena, es flag"; presupuesto de escenas por acto; esqueleto aprobado antes de la prosa.
5. **La memoria queda cosmética o incoherente.** Marco de ficción exigido por el linter, canon por campaña, tres atajos `[Recuerdo]`, saltar leído que se frena en variantes nuevas, 25 % de escenas con memoria como aviso.
6. **La rejugada se trivializa.** XP por descubrimiento, tope de nivel por campaña, −1/−2 Veterano; la simulación de carreras reporta la tasa de Fallo por partida.
7. **Prosa de IA plana o repetitiva.** Biblia con voz por PNJ, plantilla con vecinas, `lint-text`, lectura humana de una ruta por clase, ~46 escenas revisables.
8. **Balance injusto.** Simulación por clase, nivel y política con reporte comparable; solo tres aserciones duras hasta tener testers; números de XP y dificultad en datos.
9. **Muerte permanente percibida como injusta.** Regla de dos pasos, entrada por decisión explícita, confirmación consciente del estado, vía no `fisico` y salida sin tirada exigidas por el linter, Fortuna y Poder antes de consolidar.
10. **Pérdida de guardados.** Export/import desde la v1, `storage.persist()`, recordatorio insistente en Safari, `version` de `persist` con migraciones testeadas, partidas obsoletas abandonadas conservando XP.
11. **Alcance creciente y agotamiento.** Rebanada vertical a las ~40 h, escritura desde la semana 1, herramientas como reportes hasta tener testers, lista explícita de "más adelante", criterio de listo por fase en horas, curación en sesiones cortas.

---

## Apéndice A. Cambios aplicados tras la crítica adversarial

- [alcance, crítico] Roadmap rehecho: fase A 'rebanada vertical' (~42 h) que termina con la campaña de humo jugable en el navegador con persistencia; graph, simulate, lint-text, fixtures, migraciones y export/import movidos a fases paralelas; todas las fases estimadas en horas (total ~260 h) con conversión a semanas según las horas/semana que Gabriel declare.
- [alcance, mayor] Escritura adelantada: biblia y outline en la semana 1, esqueleto en la semana 2 apenas exista schema.ts + validate, prosa por lotes desde la semana 3 en paralelo con la UI; la lectura humana por clase pasa a ser la última pasada.
- [alcance+técnico, mayor] API del motor en dos fases puras (beginRoll / rerollDie / usePower / commitRoll, más choose para opciones sin tirada) con orden fijo redirect → onEnter → render → derivación de memoria, documentado en el tipo Scene y cubierto por tests.
- [alcance+técnico, mayor] Off-by-one de memoria cerrado: las condiciones se evalúan contra el estado previo a la derivación de la escena actual; la derivación ocurre al elegir; 'visited min N' = N visitas previas completas; las escenas atravesadas por redirect no cuentan; test explícito con a1_puente; tope de 8 redirects y ciclos sin efectos como error de linter.
- [alcance, mayor] Presupuesto de palabras recalculado desde los rangos del linter (~11.000-12.000 palabras totales, ~5.000 leídas por partida), duración objetivo 30-45 min, rangos por pieza bajados (escena 60-160, ronda 40-80, outcome 20-60) y estimación de duración solo sobre rutas de personaje nuevo y como aviso. Se eligió 60-160 en vez de los 50-150 propuestos para no caer por debajo del piso de 30 min del requisito 8.
- [alcance+técnico, mayor] Simulación convertida en reporte con carreras de K=4 partidas por personaje (conserva char:/world:), N=500 por combinación, perfil veterano con seedFlags; solo tres aserciones duras (escena no gated inalcanzable, muerte codiciosa nivel 1 < 3 %, cuatro finales alcanzados por las cuatro clases). Se sumó la tercera aserción (crítica de diseño #5) a las dos propuestas por alcance porque es barata y protege el pilar 4. El umbral de trivialización '≥10 % Fallo' propuesto por diseño queda como métrica del reporte, no como puerta de CI.
- [alcance+técnico, mayor] Arte fuera del camino crítico: instalación mínima (Portable + Manager + RMBG/BiRefNet + controlnet_aux + controlnet-depth-sdxl-small), upscale con nodo core, sin Impact-Pack ni UltimateSDUpscale, LayerDiffuse solo como respaldo; bake-off de dos modelos reemplazado por prueba de estilo de medio día solo con SDXL; klein y Qwen a 'más adelante'; 32 GB de RAM recomendados; tiempos presupuestados en 25-30 s / 40-60 s y medidos con log.
- [alcance+técnico, mayor] Linter dividido en 10 reglas ERROR (locales, decidibles, con fixture roto cada una) y un conjunto de AVISOS; 'when imposibles' eliminado. 'Ruta crítica' y 'personaje mínimo' no se borraron como pedía alcance: se adoptaron las definiciones concretas de la crítica técnica, pero la regla del 25 % queda en nivel AVISO.
- [alcance, menor] Cicatrices y pantalla de elección pospuestas a la segunda campaña; el tipo de guardado reserva scars y world.fallen. Derrota = XP de hitos nuevos sin bono ni final.
- [alcance+diseño, menor] Creación de personaje invertida: clase → retrato (galería de 12 con los 3 de la clase primero, 'ver todos'). Rasgos devueltos a un tag simple cada uno (Hijo de molinero = social) con la condicionalidad en el contenido vía char:origen.*.
- [alcance, menor] Guardado solo por persist de Zustand en cada set; eliminados visibilitychange/beforeunload.
- [diseño, crítico] Progresión por descubrimiento: hito 10 XP solo la primera vez (0 al repetir), final no visto 30 XP, bono solo en la primera victoria; tope de nivel por campaña (levelRange[1]+1, Aldamar nivel 4); modificador Veterano automático (−1 en Tranquila, −2 en Paseo) visible como chip; frase 'rejugar da medio nivel' corregida con la aritmética real (170 XP → nivel 3; segunda victoria → nivel 4 tope); multiplicador ×0,3 de Paseo eliminado por redundante con el tope.
- [diseño, mayor] Marco de ficción de la memoria: dentro de la misma campaña recuerda el narrador, nunca el PNJ (regla ERROR 8 del linter); canon por campaña (los char:<campaña>.* y world:<campaña>.* se apuestan en run.stagedFlags y se reemplazan atómicamente al terminar por un final; derrota y abandono no reescriben); la ficha muestra la crónica canónica. El ejemplo de a1_puente se reescribió para cumplirlo (Orell reacciona a un rasgo, el narrador recuerda).
- [diseño, mayor] Combate: regla del linter cambiada a ≥2 atributos + 1 opción sin tirada + 1 huida, con dependencia del estado desde la ronda 2; 2 rondas la pelea menor y 3 el jefe; reloj de peligro eliminado; presupuesto de tiradas (~30) y palabras rehecho.
- [diseño+técnico, mayor] Escena mortal rediseñada: confirmación consciente del estado (texto distinto para Sano/Herido/Malherido), rest cura como máximo 1 Herida, dificultad extrema prohibida si levelRange[0] < 3, regla de linter que exige una vía con tirada no física y una salida sin tirada, Sombra ampliada a supervivencia, y 'El vado crecido' con 5 opciones (4 sin requires).
- [diseño, mayor] Final oculto accesible a toda clase: tercera vía por memoria (preguntar a Ilse con endingSeen fin_crecida) y regla ERROR 2 del linter (todo final alcanzable por cada clase de nivel 1 sin rasgos) más aserción de simulación.
- [diseño+técnico, mayor] 'Saltar leído' y seen registrados por hash de párrafo mostrado (FNV-1a base36), de modo que el salto se frena exactamente en las variantes de memoria; tres atajos [Recuerdo] reales (vado oculto, ronda de Pell, sótano) y pistas del acto 1 con contenido exclusivo por orden.
- [diseño, mayor, DESCARTADO en parte] Cicatrices curables con tope 2 y abandono con cicatriz tras el cuello 1: se descarta porque las cicatrices se posponen a la v2 (no tienen lector en Aldamar, crítica de alcance #9). El hueco de 'abandonar sin costo' se cierra de otra forma: abandonar = derrota (mismas consecuencias, sin final, sin bono, sin canon) y la XP de hitos repetidos ya es 0, así que no hay farmeo por abandono.
- [diseño, menor] Anulaciones visibles con chips tachados; aviso del linter cuando el costo de un outcome es una condición cuyo tag ya está en desventaja permanente para alguna clase. La regla de motor 'la Debilidad solo la anula una fuente situacional' se reemplazó por una regla de catálogo más simple: no se puede elegir rasgo ni habilidad con el tag de la Debilidad de la clase (misma intención, cero lógica extra en el motor).
- [diseño+técnico, menor] Seguro = Fallo ≤ 20 % y Éxito ≥ 40 %; los naturales priman (doble 1 siempre Fallo grave, doble 6 siempre Crítico) y la línea de objetivo lo dice; se documenta que ventaja/desventaja suben los dobles al 7,4 %.
- [diseño, menor] Dados derivados de hash(seed, escena, opción, visitas, intento) en vez de cursor lineal, más run.pending mínimo persistido al mostrar los dados: recargar no permite espiar otra opción. Esto modifica la propuesta técnica de dejar el PendingRoll solo en ui no persistido (se conserva ahí el objeto completo, pero la tupla mínima sí se guarda).
- [diseño, menor, DESCARTADO en parte] Etiqueta de dificultad contra el punto medio del rango: se descarta porque un personaje nuevo vería 'Exigente' en la única campaña de la v1, contradiciendo el requisito 7 de elegir con cabeza sobre información honesta; se adopta la otra mitad: campaña de humo con levelRange [3,5] para probar el flujo Mortal/confirmación antes de la segunda campaña.
- [técnico, mayor] Assets fuera de content/: el contenido referencia por id, el glob con imagetools vive en src/ui/assets/<campaña>.ts, los PNG en src/assets/, y las tools corren con tsx en Node puro.
- [técnico, mayor] Reproducibilidad de arte: sin Lightning en la curación, tupla completa de reproducción en art/curation.json, test de humo de regeneración (< 1 % de diferencia), masters con respaldo fuera del repo; manifiesto separado en manifest.generated.json (derivado) y curation.json (curado) con join por id.
- [técnico, mayor] ControlNet Union reemplazado por controlnet-depth-sdxl-1.0-small, UNet fp8 con control, tiempos y RAM corregidos, Impact-Pack y UltimateSDUpscale eliminados, un solo upscaler (ESRGAN con nodo core).
- [técnico, mayor] Chunk world con content/world/assets (retratos de Orell/Ilse/Halvar, icono de la reliquia); relic solo en world/items.ts; resolución world ∪ campaign en el motor; prohibido redefinir ids de world/.
- [técnico, menor] Una sola versión (la de persist) para guardado y exportación con la misma cadena de migraciones; nombres del store alineados con el tipo State; política escrita de contentVersion con test de hash estructural; vite:preloadError con recarga única y pantallas cargando/error; tabla completa de transiciones.
- [técnico, menor] Limitación de Safari/iOS documentada con recordatorio de exportar más insistente; retratos generados a 896×1152 y recortados a 3:4 con verificación de aspecto en validate --assets; campaña de humo con lintProfile 'smoke' y hidden filtrada en producción; tope de 9 opciones; GameState = { world, character, run } explícito; espacios de flags compartidos declarados en world/flags.ts; ids de rasgos/habilidades/condiciones derivados del catálogo; XP de hitos repetidos = 0 (cierra el farmeo por abandono).
