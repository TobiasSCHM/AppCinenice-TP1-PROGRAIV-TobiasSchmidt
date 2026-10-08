import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, required, minLength, maxLength, min, max, FormField, FormRoot } from '@angular/forms/signals';
import { PeliculasService } from '../../core/peliculas.service';
import { OPCIONES_EDAD, PeliculaDraft, RestriccionEdad } from '../../core/models/pelicula.model';
import { ErroresCampo } from '../../shared/errores-campo';
import { mensajeError } from '../../core/utils/errores';

const TAMANIO_MAXIMO_POSTER = 3 * 1024 * 1024; // 3 mb

// alta y edicion de peliculas (rf-07, rf-08, rf-10, rf-11). la misma pantalla sirve para las dos:
// si la ruta trae :id es edicion
@Component({
  selector: 'app-pelicula-form',
  imports: [FormField, FormRoot, RouterLink, ErroresCampo],
  templateUrl: './pelicula-form.html',
  styleUrl: './pelicula-form.css',
})
export class PeliculaForm {
  private readonly service = inject(PeliculasService);
  private readonly router = inject(Router);

  // llega desde la ruta /admin/peliculas/:id/editar (withComponentInputBinding)
  readonly id = input<string | undefined>(undefined);
  protected readonly esEdicion = computed(() => !!this.id());

  protected readonly opcionesEdad = OPCIONES_EDAD;
  protected readonly generos = this.service.generos;

  // el borrador es la fuente de verdad del formulario (signal del dominio)
  protected readonly borrador = signal<PeliculaDraft>({
    nombre: '',
    sinopsis: '',
    duracion_min: null,
    restriccion_edad: 0,
    visible_portada: true,
  });

  // estado que no pasa por el formulario: imagen y generos
  protected readonly archivo = signal<File | null>(null);
  protected readonly vistaPrevia = signal<string | null>(null);
  protected readonly posterActual = signal<string | null>(null);
  protected readonly generoIds = signal<number[]>([]);
  protected readonly nuevoGenero = signal('');

  protected readonly guardando = signal(false);
  protected readonly cargandoPelicula = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly errorImagen = signal<string | null>(null);
  protected readonly errorGeneros = signal<string | null>(null);

  protected readonly imagenMostrada = computed(() => this.vistaPrevia() ?? this.posterActual());

  protected readonly formulario = form(
    this.borrador,
    (f) => {
      required(f.nombre, { message: 'El nombre es obligatorio.' });
      maxLength(f.nombre, 100, { message: 'Máximo 100 caracteres.' });
      required(f.sinopsis, { message: 'La sinopsis es obligatoria.' });
      minLength(f.sinopsis, 20, { message: 'Mínimo 20 caracteres.' });
      maxLength(f.sinopsis, 1000, { message: 'Máximo 1000 caracteres.' });
      required(f.duracion_min, { message: 'La duración es obligatoria.' });
      min(f.duracion_min, 1, { message: 'Debe ser de al menos 1 minuto.' });
      max(f.duracion_min, 600, { message: 'Máximo 600 minutos.' });
    },
    {
      submission: {
        action: async () => {
          this.errorEnvio.set(null);
          // rn-01: toda pelicula tiene imagen. y se exige al menos un genero (rf-10)
          const sinImagen = !this.archivo() && !this.posterActual();
          const sinGeneros = this.generoIds().length === 0;
          this.errorImagen.set(sinImagen ? 'Subí el póster de la película.' : null);
          this.errorGeneros.set(sinGeneros ? 'Elegí al menos un género.' : null);
          if (sinImagen || sinGeneros) return;

          this.guardando.set(true);
          try {
            let url = this.posterActual();
            const nuevo = this.archivo();
            if (nuevo) url = await this.service.subirPoster(nuevo);

            const idEdicion = this.id();
            if (idEdicion) {
              await this.service.actualizar(Number(idEdicion), this.borrador(), url!, this.generoIds());
            } else {
              await this.service.crear(this.borrador(), url!, this.generoIds());
            }
            await this.router.navigateByUrl('/admin/peliculas');
          } catch (e) {
            this.errorEnvio.set(`No se pudo guardar la película: ${mensajeError(e)}`);
          } finally {
            this.guardando.set(false);
          }
        },
      },
    },
  );

  constructor() {
    this.service.cargarGeneros().catch((e) => this.errorGeneros.set(mensajeError(e)));

    // edicion: precarga el formulario con la pelicula de la ruta
    effect(() => {
      const id = this.id();
      if (id) void this.precargar(Number(id));
    });
  }

  private async precargar(id: number): Promise<void> {
    this.cargandoPelicula.set(true);
    try {
      const p = await this.service.obtener(id);
      if (!p) {
        this.errorEnvio.set('La película no existe.');
        return;
      }
      this.borrador.set({
        nombre: p.nombre,
        sinopsis: p.sinopsis,
        duracion_min: p.duracion_min,
        restriccion_edad: p.restriccion_edad,
        visible_portada: p.visible_portada,
      });
      this.posterActual.set(p.imagen_url);
      this.generoIds.set(p.generos.map((g) => g.id));
    } catch (e) {
      this.errorEnvio.set(`No se pudo cargar la película: ${mensajeError(e)}`);
    } finally {
      this.cargandoPelicula.set(false);
    }
  }

  protected fijarEdad(valor: RestriccionEdad): void {
    this.borrador.update((b) => ({ ...b, restriccion_edad: valor }));
  }

  protected alternarGenero(id: number): void {
    this.errorGeneros.set(null);
    this.generoIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  protected async agregarGenero(): Promise<void> {
    const nombre = this.nuevoGenero().trim();
    if (!nombre) return;
    const existe = this.generos().some((g) => g.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) {
      this.errorGeneros.set('Ese género ya existe.');
      return;
    }
    try {
      const creado = await this.service.crearGenero(nombre);
      this.generoIds.update((ids) => [...ids, creado.id]);
      this.nuevoGenero.set('');
      this.errorGeneros.set(null);
    } catch (e) {
      this.errorGeneros.set(`No se pudo crear el género: ${mensajeError(e)}`);
    }
  }

  protected alElegirImagen(evento: Event): void {
    const archivo = (evento.target as HTMLInputElement).files?.[0] ?? null;
    this.errorImagen.set(null);
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      this.errorImagen.set('El archivo tiene que ser una imagen.');
      return;
    }
    if (archivo.size > TAMANIO_MAXIMO_POSTER) {
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
