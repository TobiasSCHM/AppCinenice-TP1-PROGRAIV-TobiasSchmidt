import { Injectable, signal } from '@angular/core';
import { supabase } from './supabase.client';
import { mensajeError } from './utils/errores';
import { subirImagenPublica } from './utils/storage';
import type { CategoriaProducto, Producto, ProductoDraft } from './models/producto.model';

// producto con el nombre de su categoria (relacion a una sola categoria: llega como objeto)
const SELECT_PRODUCTO =
  'id, categoria_id, nombre, descripcion, precio, imagen_url, activo, categoria:categorias_producto(nombre)';

@Injectable({ providedIn: 'root' })
export class ProductosService {
  readonly categorias = signal<CategoriaProducto[]>([]);
  readonly productos = signal<Producto[]>([]);

  async cargarCategorias(): Promise<void> {
    const { data, error } = await supabase.from('categorias_producto').select('id, nombre').order('nombre');
    if (error) throw error;
    this.categorias.set((data ?? []) as CategoriaProducto[]);
  }

  // todos los productos, activos o no: el admin los gestiona
  async cargarProductos(): Promise<void> {
    const { data, error } = await supabase.from('productos').select(SELECT_PRODUCTO).order('nombre');
    if (error) throw error;
    this.productos.set(this.mapear(data));
  }

  async obtener(id: number): Promise<Producto | null> {
    const { data, error } = await supabase.from('productos').select(SELECT_PRODUCTO).eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? this.mapear([data])[0] : null;
  }

  async crearCategoria(nombre: string): Promise<void> {
    const { error } = await supabase.from('categorias_producto').insert({ nombre: nombre.trim() });
    if (error) throw this.traducir(error, 'categoría');
    await this.cargarCategorias();
  }

  async renombrarCategoria(id: number, nombre: string): Promise<void> {
    const { error } = await supabase.from('categorias_producto').update({ nombre: nombre.trim() }).eq('id', id);
    if (error) throw this.traducir(error, 'categoría');
    await Promise.all([this.cargarCategorias(), this.cargarProductos()]);
  }

  async eliminarCategoria(id: number): Promise<void> {
    const { error } = await supabase.from('categorias_producto').delete().eq('id', id);
    if (error) throw this.traducir(error, 'categoría');
    await this.cargarCategorias();
  }

  // sube la imagen al bucket publico 'productos' y devuelve su url
  subirImagen(archivo: File): Promise<string> {
    return subirImagenPublica('productos', archivo);
  }

  async crear(draft: ProductoDraft, categoriaId: number, imagenUrl: string | null): Promise<void> {
    const { error } = await supabase.from('productos').insert(this.fila(draft, categoriaId, imagenUrl));
    if (error) throw this.traducir(error, 'producto');
    await this.cargarProductos();
  }

  async actualizar(id: number, draft: ProductoDraft, categoriaId: number, imagenUrl: string | null): Promise<void> {
    const { error } = await supabase.from('productos').update(this.fila(draft, categoriaId, imagenUrl)).eq('id', id);
    if (error) throw this.traducir(error, 'producto');
    await this.cargarProductos();
  }

  // desactivar saca el producto de la venta sin perder su historial
  async cambiarActivo(id: number, activo: boolean): Promise<void> {
    const { error } = await supabase.from('productos').update({ activo }).eq('id', id);
    if (error) throw this.traducir(error, 'producto');
    this.productos.update((lista) => lista.map((p) => (p.id === id ? { ...p, activo } : p)));
  }

  async eliminar(id: number): Promise<void> {
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (error) throw this.traducir(error, 'producto');
    this.productos.update((lista) => lista.filter((p) => p.id !== id));
  }

  // arma la fila a guardar. una descripcion vacia se guarda como null
  private fila(draft: ProductoDraft, categoriaId: number, imagenUrl: string | null) {
    return {
      categoria_id: categoriaId,
      nombre: draft.nombre.trim(),
      descripcion: draft.descripcion.trim() || null,
      precio: draft.precio,
      activo: draft.activo,
      imagen_url: imagenUrl,
    };
  }

  private mapear(data: unknown): Producto[] {
    return ((data ?? []) as Producto[]).map((p) => ({ ...p, precio: Number(p.precio) }));
  }

  // codigos de error de postgres: 23505 = unique violation, 23503 = foreign key violation
  private traducir(error: { code?: string; message?: string }, objeto: 'categoría' | 'producto'): Error {
    if (error.code === '23505') {
      return new Error(`Ya existe ${objeto === 'categoría' ? 'una categoría' : 'un producto'} con ese nombre.`);
    }
    if (error.code === '23503') {
      return new Error(
        objeto === 'categoría'
          ? 'La categoría tiene productos: movelos o eliminalos primero.'
          : 'El producto ya está en compras, combos o canjes y no se puede eliminar. Desactivalo para que deje de venderse.',
      );
    }
    return new Error(mensajeError(error));
  }
}