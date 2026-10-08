import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../core/peliculas.service';
import { DuracionPipe } from '../../core/pipes/duracion.pipe';
import { mensajeError } from '../../core/utils/errores';
import type { Pelicula } from '../../core/models/pelicula.model';

// listado del admin: ver, ocultar de la portada (rf-08), editar y eliminar
@Component({
  selector: 'app-peliculas-lista',
  imports: [RouterLink, DuracionPipe],
  templateUrl: './peliculas-lista.html',
  styleUrl: './peliculas-lista.css',
})
export class PeliculasLista {
  protected readonly service = inject(PeliculasService);
  protected readonly error = signal<string | null>(null);
  protected readonly cargando = signal(true);

  constructor() {
    this.service
      .cargar()
      .catch((e) => this.error.set(`No se pudieron cargar las películas: ${mensajeError(e)}`))
      .finally(() => this.cargando.set(false));
  }

  protected async alternarVisibilidad(p: Pelicula): Promise<void> {
    this.error.set(null);
    try {
      await this.service.cambiarVisibilidad(p.id, !p.visible_portada);
    } catch (e) {
      this.error.set(`No se pudo cambiar la visibilidad: ${mensajeError(e)}`);
    }
  }

  protected async eliminar(p: Pelicula): Promise<void> {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    this.error.set(null);
    try {
      await this.service.eliminar(p.id);
    } catch (e) {
      // la base rechaza el borrado si la pelicula ya tiene funciones (fk restrict)
      this.error.set(`No se pudo eliminar (¿tiene funciones cargadas?): ${mensajeError(e)}`);
    }
  }
}
