import { useStore } from '@/state/store';
import { CargandoScreen } from '@/ui/screens/CargandoScreen';
import { CreacionScreen } from '@/ui/screens/CreacionScreen';
import { ErrorScreen } from '@/ui/screens/ErrorScreen';
import { EscenaScreen } from '@/ui/screens/EscenaScreen';
import { FinScreen } from '@/ui/screens/FinScreen';
import { HubScreen } from '@/ui/screens/HubScreen';
import { InicioScreen } from '@/ui/screens/InicioScreen';

export function ScreenRouter() {
  const screen = useStore((s) => s.ui.screen);
  switch (screen) {
    case 'inicio':
      return <InicioScreen />;
    case 'creacion':
      return <CreacionScreen />;
    case 'hub':
      return <HubScreen />;
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
