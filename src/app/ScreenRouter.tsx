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
