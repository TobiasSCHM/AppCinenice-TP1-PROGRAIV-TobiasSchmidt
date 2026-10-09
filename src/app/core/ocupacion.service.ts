import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
import type { CambioOcupacion } from './models/butaca.model';

export type EstadoCanal = 'conectado' | 'desconectado';

export interface EscuchaOcupacion {
  alCambiar: (cambio: CambioOcupacion) => void;
  alEstado: (estado: EstadoCanal) => void;
}

@Injectable({ providedIn: 'root' })
export class OcupacionService {
  // ids de las butacas ocupadas en una funcion, tal como estan ahora
  async cargar(funcionId: number): Promise<number[]> {
    const { data, error } = await supabase.from('ocupaciones').select('butaca_id').eq('funcion_id', funcionId);
    if (error) throw error;
    return (data ?? []).map((fila) => Number(fila['butaca_id']));
  }

  // escucha por realtime las butacas que se ocupan o se liberan en una funcion (rf-18, rnf-12).
  // devuelve una funcion que corta la escucha: hay que llamarla al salir de la pantalla
  escuchar(funcionId: number, escucha: EscuchaOcupacion): () => void {
    // el nombre del canal lleva un sufijo al azar: dos pantallas abiertas no comparten canal
    const canal = supabase
      .channel(`ocupaciones-${funcionId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ocupaciones', filter: `funcion_id=eq.${funcionId}` },
        (payload) => {
          // en un delete el dato esta en old; en un insert, en new (replica identity full, ver migracion 003)
          const registro = (payload.eventType === 'DELETE' ? payload.old : payload.new) as Record<string, unknown>;
          // el filtro del servidor puede no aplicarse a los delete: se vuelve a chequear aca
          if (Number(registro['funcion_id']) !== funcionId) return;
          const butacaId = Number(registro['butaca_id']);
          if (!Number.isFinite(butacaId)) return;

          if (payload.eventType === 'INSERT') escucha.alCambiar({ tipo: 'ocupada', butacaId });
          else if (payload.eventType === 'DELETE') escucha.alCambiar({ tipo: 'liberada', butacaId });
        },
      )
      .subscribe((estado) => {
        // si se cae la conexion, realtime reintenta solo y vuelve a emitir 'SUBSCRIBED'
        escucha.alEstado(estado === 'SUBSCRIBED' ? 'conectado' : 'desconectado');
      });

    return () => {
      void supabase.removeChannel(canal);
    };
  }
}