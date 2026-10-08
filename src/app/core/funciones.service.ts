import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
import type { Funcion } from './models/funcion.model';

@Injectable({ providedIn: 'root' })
export class FuncionesService {
  // funciones futuras de una pelicula, con el nombre de la sala (detalle de pelicula, rf-12)
  async proximasDe(peliculaId: number): Promise<Funcion[]> {
    const { data, error } = await supabase
      .from('funciones')
      .select('id, pelicula_id, inicio, formato, idioma, precio_base, sala:salas(nombre)')
      .eq('pelicula_id', peliculaId)
      .gte('inicio', new Date().toISOString())
      .order('inicio');
    if (error) throw error;
    // el cliente sin tipos generados infiere la relacion como arreglo: se fuerza al modelo propio
    return (data ?? []) as unknown as Funcion[];
  }
}