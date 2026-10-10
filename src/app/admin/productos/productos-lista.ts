import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductosService } from '../../core/productos.service';
import { PrecioArsPipe } from '../../core/pipes/precio-ars.pipe';
import { mensajeError } from '../../core/utils/errores';
import type { CategoriaProducto, Producto } from '../../core/models/producto.model';

// gestion del candy bar (rf-35): categorias y productos agrupados por categoria
@Component({
  selector: 'app-productos-lista',
  imports: [RouterLink, PrecioArsPipe],
  templateUrl: './productos-lista.html',
  styleUrl: './productos-lista.css',
})
export class ProductosLista {
  protected readonly service = inject(ProductosService);

  protected readonly nuevaCategoria = signal('');
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // por cada categoria, sus productos: se rearma solo cuando cambia cualquiera de las dos listas
  protected readonly grupos = computed(() =>
    this.service.categorias().map((categoria) => ({
      categoria,
      productos: this.service.productos().filter((p) => p.categoria_id === categoria.id),
    })),
  );

  constructor() {
    Promise.all([this.service.cargarCategorias(), this.service.cargarProductos()])
      .catch((e) => this.error.set(`No se pudo cargar el candy bar: ${mensajeError(e)}`))
      .finally(() => this.cargando.set(false));
  }

  protected async agregarCategoria(): Promise<void> {
    const nombre = this.nuevaCategoria().trim();
    if (!nombre) {
      this.error.set('Escribí el nombre de la categoría.');
      return;
    }
    await this.ejecutar(async () => {
      await this.service.crearCategoria(nombre);
      this.nuevaCategoria.set('');
    });
  }

  protected async renombrarCategoria(c: CategoriaProducto): Promise<void> {
    const nuevo = prompt('Nuevo nombre de la categoría', c.nombre)?.trim();
    if (!nuevo || nuevo === c.nombre) return;
    await this.ejecutar(() => this.service.renombrarCategoria(c.id, nuevo));
  }

  protected async eliminarCategoria(c: CategoriaProducto): Promise<void> {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
    await this.ejecutar(() => this.service.eliminarCategoria(c.id));
  }

  protected async alternarActivo(p: Producto): Promise<void> {
    await this.ejecutar(() => this.service.cambiarActivo(p.id, !p.activo));
  }

  protected async eliminarProducto(p: Producto): Promise<void> {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    await this.ejecutar(() => this.service.eliminar(p.id));
  }

  // limpia el error, ejecuta la accion y muestra el error si falla
  private async ejecutar(accion: () => Promise<void>): Promise<void> {
    this.error.set(null);
    try {
      await accion();
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}