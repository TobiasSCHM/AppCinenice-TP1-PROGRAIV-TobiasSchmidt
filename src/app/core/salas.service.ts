import { Injectable, signal } from '@angular/core';
import { supabase } from './supabase.client';
import { mensajeError } from './utils/errores';
import type { Sala } from './models/sala.model';

@Injectable({ providedIn: 'root' })
export class SalasService {
  readonly salas = signal<Sala[]>([]);

  // butacas(count) pide a postgrest solo la cantidad de butacas, no las 518 filas
  async cargar(): Promise<void> {
    const { data, error } = await supabase.from('salas').select('id, nombre, butacas(count)').order('id');
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.salas.set((data ?? []).map((s: any) => ({ id: s.id, nombre: s.nombre, total_butacas: s.butacas?.[0]?.count ?? 0 })));
  }

  // la rpc crear_sala (migracion 005) crea la sala y sus butacas en una transaccion
  async crear(nombre: string): Promise<void> {
    const { error } = await supabase.rpc('crear_sala', { p_nombre: nombre });
    if (error) throw this.traducir(error);
    await this.cargar();
  }

  async renombrar(id: number, nombre: string): Promise<void> {
    const { error } = await supabase.from('salas').update({ nombre }).eq('id', id);
    if (error) throw this.traducir(error);
    await this.cargar();
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await supabase.from('salas').delete().eq('id', id);
    if (error) throw this.traducir(error);
    await this.cargar();
  }

  // codigos de error de postgres: 23505 = unique violation, 23503 = foreign key violation
  private traducir(error: { code?: string; message?: string }): Error {
    if (error.code === '23505') return new Error('Ya existe una sala con ese nombre.');
    if (error.code === '23503') return new Error('La sala tiene funciones o entradas asociadas y no se puede eliminar.');
    return new Error(mensajeError(error));
  }
}