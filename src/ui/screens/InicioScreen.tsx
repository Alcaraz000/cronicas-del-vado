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

  // Con el activo muerto hace falta uno nuevo: el muerto no vuelve y startRun lo rechaza.
  // La pantalla de personajes de verdad es de una fase posterior.
  const nuevaPartida = (): void => {
    if (activo === null || activo.dead !== undefined) createTestCharacter();
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
