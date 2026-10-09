import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
import type { Butaca } from './models/butaca.model';

@Injectable({ providedIn: 'root' })
export class ButacasService {
  // las butacas de una sala. son datos fijos: se leen una vez por pantalla
  async deSala(salaId: number): Promise<Butaca[]> {
    const { data, error } = await supabase
      .from('butacas')
      .select('id, sala_id, fila, fila_orden, bloque, numero, tipo')
      .eq('sala_id', salaId)
      .order('fila_orden')
      .order('bloque')
      .order('numero');
    if (error) throw error;
    return (data ?? []) as Butaca[];
  }
}