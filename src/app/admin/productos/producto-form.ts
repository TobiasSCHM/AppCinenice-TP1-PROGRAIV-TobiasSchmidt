import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, required, maxLength, min, FormField, FormRoot } from '@angular/forms/signals';
import { ProductosService } from '../../core/productos.service';
import { ErroresCampo } from '../../shared/errores-campo';
import { mensajeError } from '../../core/utils/errores';
import type { ProductoDraft } from '../../core/models/producto.model';

const TAMANIO_MAXIMO_IMAGEN = 3 * 1024 * 1024; // 3 mb

// alta y edicion de productos del candy bar (rf-35). la misma pantalla sirve para las dos:
// si la ruta trae :id es edicion
@Component({
  selector: 'app-producto-form',
  imports: [FormField, FormRoot, RouterLink, ErroresCampo],
  templateUrl: './producto-form.html',
  styleUrl: './producto-form.css',
})
export class ProductoForm {
  private readonly service = inject(ProductosService);
  private readonly router = inject(Router);

  // llega desde la ruta /admin/productos/:id/editar (withComponentInputBinding)
  readonly id = input<string | undefined>(undefined);
  protected readonly esEdicion = computed(() => !!this.id());
  protected readonly categorias = this.service.categorias;

  protected readonly borrador = signal<ProductoDraft>({ nombre: '', descripcion: '', precio: null, activo: true });

  // estado que no pasa por el formulario: categoria e imagen
  protected readonly categoriaId = signal<number | null>(null);
  protected readonly archivo = signal<File | null>(null);
  protected readonly vistaPrevia = signal<string | null>(null);
  protected readonly imagenActual = signal<string | null>(null);

  protected readonly cargandoProducto = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly errorImagen = signal<string | null>(null);
  protected readonly errorCategoria = signal<string | null>(null);

  protected readonly imagenMostrada = computed(() => this.vistaPrevia() ?? this.imagenActual());

  protected readonly formulario = form(
    this.borrador,
    (f) => {
      required(f.nombre, { message: 'El nombre es obligatorio.' });
      maxLength(f.nombre, 80, { message: 'Máximo 80 caracteres.' });
      maxLength(f.descripcion, 200, { message: 'Máximo 200 caracteres.' });
      required(f.precio, { message: 'El precio es obligatorio.' });
      min(f.precio, 0, { message: 'El precio no puede ser negativo.' });
    },
    {
      submission: {
        action: async () => {
          this.errorEnvio.set(null);
          // la categoria son chips: se valida a mano
          if (this.categoriaId() === null) {
            this.errorCategoria.set('Elegí una categoría.');
            return;
          }
          this.errorCategoria.set(null);

          this.guardando.set(true);
          try {
            // la imagen es opcional: si no se elige una nueva se conserva la anterior
            let url = this.imagenActual();
            const nueva = this.archivo();
            if (nueva) url = await this.service.subirImagen(nueva);

            const idEdicion = this.id();
            if (idEdicion) {
              await this.service.actualizar(Number(idEdicion), this.borrador(), this.categoriaId()!, url);
            } else {
              await this.service.crear(this.borrador(), this.categoriaId()!, url);
            }
            await this.router.navigateByUrl('/admin/productos');
          } catch (e) {
            this.errorEnvio.set(`No se pudo guardar el producto: ${mensajeError(e)}`);
          } finally {
            this.guardando.set(false);
          }
        },
      },
    },
  );

  constructor() {
    this.service.cargarCategorias().catch((e) => this.errorCategoria.set(mensajeError(e)));

    // edicion: precarga el formulario con el producto de la ruta
    effect(() => {
      const id = this.id();
      if (id) void this.precargar(Number(id));
    });
  }

  private async precargar(id: number): Promise<void> {
    this.cargandoProducto.set(true);
    try {
      const p = await this.service.obtener(id);
      if (!p) {
        this.errorEnvio.set('El producto no existe.');
        return;
      }
      this.borrador.set({ nombre: p.nombre, descripcion: p.descripcion ?? '', precio: p.precio, activo: p.activo });
      this.categoriaId.set(p.categoria_id);
      this.imagenActual.set(p.imagen_url);
    } catch (e) {
      this.errorEnvio.set(`No se pudo cargar el producto: ${mensajeError(e)}`);
    } finally {
      this.cargandoProducto.set(false);
    }
  }

  protected elegirCategoria(id: number): void {
    this.categoriaId.set(id);
    this.errorCategoria.set(null);
  }

  protected alElegirImagen(evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    this.errorImagen.set(null);
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      this.errorImagen.set('El archivo tiene que ser una imagen.');
      return;
    }
    if (archivo.size > TAMANIO_MAXIMO_IMAGEN) {
      this.errorImagen.set('La imagen no puede superar los 3 MB.');
      return;
    }
    // libera la vista previa anterior para no acumular memoria
    const anterior = this.vistaPrevia();
    if (anterior) URL.revokeObjectURL(anterior);
    this.archivo.set(archivo);
    this.vistaPrevia.set(URL.createObjectURL(archivo));
  }
}