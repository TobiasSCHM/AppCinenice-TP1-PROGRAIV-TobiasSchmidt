import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../core/peliculas.service';
import { FuncionesService } from '../../core/funciones.service';
import { DuracionPipe } from '../../core/pipes/duracion.pipe';
import { PrecioArsPipe } from '../../core/pipes/precio-ars.pipe';
import { claveDia, textoDia, textoHora } from '../../core/utils/fechas';
import { mensajeError } from '../../core/utils/errores';
import type { Pelicula } from '../../core/models/pelicula.model';
import type { Funcion } from '../../core/models/funcion.model';

// ficha de la pelicula con sus funciones disponibles. la compra de butacas se conecta el miercoles
@Component({
  selector: 'app-pelicula-detalle',
  imports: [RouterLink, DuracionPipe, PrecioArsPipe],
  templateUrl: './pelicula-detalle.html',
  styleUrl: './pelicula-detalle.css',
})
export class PeliculaDetalle {
  private readonly peliculas = inject(PeliculasService);
  private readonly funcionesService = inject(FuncionesService);

  // llega desde la ruta /pelicula/:id (withComponentInputBinding)
  readonly id = input.required<string>();

  protected readonly pelicula = signal<Pelicula | null>(null);
  protected readonly funciones = signal<Funcion[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // las funciones se agrupan por dia en hora argentina
  protected readonly funcionesPorDia = computed(() => {
    const grupos = new Map<string, { titulo: string; funciones: Funcion[] }>();
    for (const f of this.funciones()) {
      const clave = claveDia(f.inicio);
      if (!grupos.has(clave)) grupos.set(clave, { titulo: textoDia(f.inicio), funciones: [] });
      grupos.get(clave)!.funciones.push(f);
    }
    return [...grupos.values()];
  });

  // se exponen a la plantilla
  protected readonly hora = textoHora;

  constructor() {
    // si cambia el :id de la ruta, se vuelve a cargar
    effect(() => {
      void this.cargar(Number(this.id()));
    });
  }

  private async cargar(id: number): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      const [pelicula, funciones] = await Promise.all([
        this.peliculas.obtener(id),
        this.funcionesService.proximasDe(id),
      ]);
      this.pelicula.set(pelicula);
      this.funciones.set(funciones);
    } catch (e) {
      this.error.set(`No se pudo cargar la película: ${mensajeError(e)}`);
    } finally {
      this.cargando.set(false);
    }
  }
}