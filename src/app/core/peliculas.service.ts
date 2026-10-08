import { Injectable, computed, signal } from '@angular/core';
import { supabase } from './supabase.client';
import type { Genero, Pelicula, PeliculaDraft, VentasPelicula } from './models/pelicula.model';

// consulta que trae la pelicula con sus generos a traves de la tabla intermedia
const SELECT_PELICULA = '*, peliculas_generos(generos(id, nombre))';

@Injectable({ providedIn: 'root' })
export class PeliculasService {
  // estado compartido como signals: la lista y el selector de generos se actualizan solos
  readonly peliculas = signal<Pelicula[]>([]); // lista completa, la usa el admin
  readonly generos = signal<Genero[]>([]);

  // cartelera publica: solo peliculas visibles en portada. es otra lista distinta de la del admin
  readonly cartelera = signal<Pelicula[]>([]);
  private readonly ranking = signal<VentasPelicula[]>([]);

  // entradas vendidas por pelicula, para consultar en la plantilla
  readonly ventas = computed(
    () => new Map(this.ranking().map((r) => [r.pelicula_id, r.entradas_vendidas] as const)),
  );

  // las 3 mas vendidas entre las visibles (rn-15). el ranking puede incluir peliculas ocultas: se descartan
  readonly top3 = computed(() => {
    const visibles = new Map(this.cartelera().map((p) => [p.id, p] as const));
    return this.ranking()
      .map((r) => visibles.get(r.pelicula_id))
      .filter((p): p is Pelicula => p !== undefined)
      .slice(0, 3);
  });

  // orden final: primero el top 3, despues el resto de la mas nueva a la mas vieja
  readonly ordenadas = computed(() => {
    const enTop = new Set(this.top3().map((p) => p.id));
    return [...this.top3(), ...this.cartelera().filter((p) => !enTop.has(p.id))];
  });

  async cargar(): Promise<void> {
    const { data, error } = await supabase
      .from('peliculas')
      .select(SELECT_PELICULA)
      .order('id', { ascending: false });
    if (error) throw error;
    this.peliculas.set((data ?? []).map((fila) => this.aPelicula(fila)));
  }

  // dos consultas en paralelo: peliculas visibles y ranking de ventas
  async cargarCartelera(): Promise<void> {
    const [peliculas, ventas] = await Promise.all([
      supabase.from('peliculas').select(SELECT_PELICULA).eq('visible_portada', true).order('id', { ascending: false }),
      supabase
        .from('peliculas_mas_vendidas')
        .select('pelicula_id, entradas_vendidas')
        .order('entradas_vendidas', { ascending: false })
        .order('pelicula_id', { ascending: false }) // desempate: sin ventas, gana la mas nueva
        .limit(50),
    ]);
    if (peliculas.error) throw peliculas.error;
    if (ventas.error) throw ventas.error;
    this.cartelera.set((peliculas.data ?? []).map((fila) => this.aPelicula(fila)));
    this.ranking.set((ventas.data ?? []) as VentasPelicula[]);
  }

  async obtener(id: number): Promise<Pelicula | null> {
    const { data, error } = await supabase.from('peliculas').select(SELECT_PELICULA).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? this.aPelicula(data) : null;
  }

  async cargarGeneros(): Promise<void> {
    const { data, error } = await supabase.from('generos').select('id, nombre').order('nombre');
    if (error) throw error;
    this.generos.set((data ?? []) as Genero[]);
  }

  // rf-10: el admin puede sumar generos nuevos desde el mismo formulario
  async crearGenero(nombre: string): Promise<Genero> {
    const { data, error } = await supabase.from('generos').insert({ nombre: nombre.trim() }).select('id, nombre').single();
    if (error) throw error;
    await this.cargarGeneros();
    return data as Genero;
  }

  // sube el poster al bucket publico 'posters'. el nombre lleva un uuid para no pisar archivos ni cachear versiones viejas
  async subirPoster(archivo: File): Promise<string> {
    const nombreSeguro =
      archivo.name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9._-]+/g, '-')
        .replace(/^[.-]+|[.-]+$/g, '')
        .slice(0, 100) || 'poster';
    const ruta = `${crypto.randomUUID()}-${nombreSeguro}`;
    const { error } = await supabase.storage.from('posters').upload(ruta, archivo);
    if (error) throw error;
    return supabase.storage.from('posters').getPublicUrl(ruta).data.publicUrl;
  }

  async crear(draft: PeliculaDraft, imagenUrl: string, generoIds: number[]): Promise<number> {
    const { data, error } = await supabase
      .from('peliculas')
      .insert({ ...draft, imagen_url: imagenUrl })
      .select('id')
      .single();
    if (error) throw error;
    await this.asignarGeneros(data.id as number, generoIds);
    await this.cargar();
    return data.id as number;
  }

  async actualizar(id: number, draft: PeliculaDraft, imagenUrl: string, generoIds: number[]): Promise<void> {
    const { error } = await supabase.from('peliculas').update({ ...draft, imagen_url: imagenUrl }).eq('id', id);
    if (error) throw error;
    await this.asignarGeneros(id, generoIds);
    await this.cargar();
  }

  // rf-08: mostrar u ocultar en la cartelera
  async cambiarVisibilidad(id: number, visible: boolean): Promise<void> {
    const { error } = await supabase.from('peliculas').update({ visible_portada: visible }).eq('id', id);
    if (error) throw error;
    this.peliculas.update((lista) => lista.map((p) => (p.id === id ? { ...p, visible_portada: visible } : p)));
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await supabase.from('peliculas').delete().eq('id', id);
    if (error) throw error;
    this.peliculas.update((lista) => lista.filter((p) => p.id !== id));
  }

  // reemplaza los generos de la pelicula: borra los actuales e inserta los elegidos
  private async asignarGeneros(peliculaId: number, generoIds: number[]): Promise<void> {
    const { error: errorBorrado } = await supabase.from('peliculas_generos').delete().eq('pelicula_id', peliculaId);
    if (errorBorrado) throw errorBorrado;
    if (generoIds.length === 0) return;
    const filas = generoIds.map((genero_id) => ({ pelicula_id: peliculaId, genero_id }));
    const { error } = await supabase.from('peliculas_generos').insert(filas);
    if (error) throw error;
  }

  // aplana peliculas_generos: [{ generos: {id, nombre} }] -> generos: [{id, nombre}]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private aPelicula(fila: any): Pelicula {
    const { peliculas_generos, ...resto } = fila;
    const generos: Genero[] = (peliculas_generos ?? []).map((pg: { generos: Genero }) => pg.generos);
    return { ...resto, generos } as Pelicula;
  }
}