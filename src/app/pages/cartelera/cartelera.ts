import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../core/peliculas.service';
import { DuracionPipe } from '../../core/pipes/duracion.pipe';
import { normalizarTexto } from '../../core/utils/texto';
import { mensajeError } from '../../core/utils/errores';
import type { Genero } from '../../core/models/pelicula.model';

// listado con buscador reactivo y filtro por genero (rf-12), con el top 3 de ventas primero (rf-13)
@Component({
  selector: 'app-cartelera',
  imports: [RouterLink, DuracionPipe],
  templateUrl: './cartelera.html',
  styleUrl: './cartelera.css',
})
export class Cartelera {
  protected readonly service = inject(PeliculasService);

  // estado de los filtros: dos signals simples
  protected readonly busqueda = signal('');
  protected readonly generosElegidos = signal<number[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  // solo se ofrecen los generos que alguna pelicula de la cartelera usa de verdad
  protected readonly generosDisponibles = computed<Genero[]>(() => {
    const porId = new Map<number, Genero>();
    for (const p of this.service.cartelera()) {
      for (const g of p.generos) porId.set(g.id, g);
    }
    return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });

  // se recalcula solo cuando cambia la busqueda, los generos o la cartelera
  protected readonly resultados = computed(() => {
    const texto = normalizarTexto(this.busqueda().trim());
    const elegidos = this.generosElegidos();
    return this.service.ordenadas().filter((p) => {
      const coincideTexto = texto === '' || normalizarTexto(p.nombre).includes(texto);
      // alguno de los generos elegidos (cambiar some por every para exigir todos)
      const coincideGenero = elegidos.length === 0 || p.generos.some((g) => elegidos.includes(g.id));
      return coincideTexto && coincideGenero;
    });
  });

  protected readonly hayFiltros = computed(() => this.busqueda().trim() !== '' || this.generosElegidos().length > 0);
  protected readonly idsTop3 = computed(() => new Set(this.service.top3().map((p) => p.id)));

  constructor() {
    this.service
      .cargarCartelera()
      .catch((e) => this.error.set(`No se pudo cargar la cartelera: ${mensajeError(e)}`))
      .finally(() => this.cargando.set(false));
  }

  protected alternarGenero(id: number): void {
    this.generosElegidos.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  protected limpiar(): void {
    this.busqueda.set('');
    this.generosElegidos.set([]);
  }
}