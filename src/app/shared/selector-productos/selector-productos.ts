import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { PrecioArsPipe } from '../../core/pipes/precio-ars.pipe';
import type { Producto } from '../../core/models/producto.model';

const MAXIMO_POR_PRODUCTO = 50; // el mismo limite que valida la rpc

// selector de productos del candy bar dentro de la compra (rf-36).
// usa @Input / @Output y two-way binding: [(cantidades)] = @Input cantidades + @Output cantidadesChange.
// cantidades es un objeto { idProducto: cantidad }
@Component({
  selector: 'app-selector-productos',
  imports: [PrecioArsPipe],
  templateUrl: './selector-productos.html',
  styleUrl: './selector-productos.css',
})
export class SelectorProductos {
  private readonly productosSig = signal<readonly Producto[]>([]);

  @Input({ required: true }) set productos(valor: readonly Producto[]) {
    this.productosSig.set(valor);
  }
  @Input() cantidades: Record<number, number> = {};
  @Output() cantidadesChange = new EventEmitter<Record<number, number>>();

  // productos agrupados por categoria
  protected readonly grupos = computed(() => {
    const porCategoria = new Map<string, Producto[]>();
    for (const p of this.productosSig()) {
      const nombre = p.categoria?.nombre ?? 'Otros';
      const lista = porCategoria.get(nombre);
      if (lista) lista.push(p);
      else porCategoria.set(nombre, [p]);
    }
    return [...porCategoria].map(([categoria, productos]) => ({ categoria, productos }));
  });

  protected cantidadDe(p: Producto): number {
    return this.cantidades[p.id] ?? 0;
  }

  protected cambiar(p: Producto, delta: number): void {
    const nueva = Math.min(MAXIMO_POR_PRODUCTO, Math.max(0, this.cantidadDe(p) + delta));
    const siguiente = { ...this.cantidades };
    if (nueva === 0) delete siguiente[p.id];
    else siguiente[p.id] = nueva;
    this.cantidadesChange.emit(siguiente);
  }
}