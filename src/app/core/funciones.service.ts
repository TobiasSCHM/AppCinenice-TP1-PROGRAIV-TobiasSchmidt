import { Injectable, signal } from '@angular/core';
import { supabase } from './supabase.client';
import { mensajeError } from './utils/errores';
import type { DatosRecurrencia, Funcion, FuncionAdmin } from './models/funcion.model';

@Injectable({ providedIn: 'root' })
export class FuncionesService {
  // funciones que todavia no terminaron, de todas las peliculas: sirven para el listado y para calcular ocupacion
  readonly proximas = signal<FuncionAdmin[]>([]);

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

  // se filtra por ocupada_hasta: una funcion en curso todavia ocupa su sala
  async cargarProximas(): Promise<void> {
    const { data, error } = await supabase
      .from('funciones')
      .select(
        'id, pelicula_id, sala_id, inicio, fin, ocupada_hasta, formato, idioma, precio_base, pelicula:peliculas(nombre), sala:salas(nombre)',
      )
      .gte('ocupada_hasta', new Date().toISOString())
      .order('inicio');
    if (error) throw error;
    this.proximas.set((data ?? []) as unknown as FuncionAdmin[]);
  }

  // minutos de separacion entre funciones de una misma sala (editable en la tabla configuracion)
  async margenMinutos(): Promise<number> {
    const { data, error } = await supabase
      .from('configuracion')
      .select('valor')
      .eq('clave', 'margen_funciones_min')
      .maybeSingle();
    if (error) throw error;
    return data ? Number(data.valor) : 30;
  }

  // la rpc crea todas las funciones de la recurrencia en una transaccion y devuelve cuantas creo.
  // p_desde va en null: la base usa la fecha de hoy en hora argentina
  async crearRecurrentes(d: DatosRecurrencia): Promise<number> {
    const { data, error } = await supabase.rpc('crear_funciones_recurrentes', {
      p_pelicula: d.peliculaId,
      p_dias: d.dias,
      p_hora: d.hora,
      p_semanas: d.semanas,
      p_desde: null,
      p_formato: d.formato,
      p_idioma: d.idioma,
      p_precio: d.precio,
    });
    if (error) throw this.traducir(error);
    await this.cargarProximas();
    return data as number;
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await supabase.from('funciones').delete().eq('id', id);
    if (error) throw this.traducir(error);
    this.proximas.update((lista) => lista.filter((f) => f.id !== id));
  }

  // una funcion con el nombre de su pelicula y de su sala (pantalla del mapa de butacas)
  async obtener(id: number): Promise<FuncionAdmin | null> {
    const { data, error } = await supabase
      .from('funciones')
      .select(
        'id, pelicula_id, sala_id, inicio, fin, ocupada_hasta, formato, idioma, precio_base, pelicula:peliculas(nombre), sala:salas(nombre)',
      )
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as FuncionAdmin | null;
  }

  // codigos de error de postgres: 23P01 = exclusion violation (el exclude de la tabla), 23503 = foreign key
  private traducir(error: { code?: string; message?: string }): Error {
    if (error.code === '23P01') {
      return new Error('Otra función ocupó esa sala en el mismo momento. Volvé a intentarlo.');
    }
    if (error.code === '23503') {
      return new Error('La función ya tiene compras asociadas y no se puede eliminar.');
    }
    return new Error(mensajeError(error));
  }
}