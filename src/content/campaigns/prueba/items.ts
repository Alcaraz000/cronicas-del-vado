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
