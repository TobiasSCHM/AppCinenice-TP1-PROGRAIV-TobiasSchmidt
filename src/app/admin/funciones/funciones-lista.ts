import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FuncionesService } from '../../core/funciones.service';
import { PrecioArsPipe } from '../../core/pipes/precio-ars.pipe';
import { claveDia, textoDia, textoHora } from '../../core/utils/fechas';
import { mensajeError } from '../../core/utils/errores';
import type { FuncionAdmin } from '../../core/models/funcion.model';

// funciones programadas, agrupadas por dia en hora argentina. permite eliminar las que no tienen compras
@Component({
  selector: 'app-funciones-lista',
  imports: [RouterLink, PrecioArsPipe],
  templateUrl: './funciones-lista.html',
  styleUrl: './funciones-lista.css',
})
export class FuncionesLista {
  protected readonly service = inject(FuncionesService);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly porDia = computed(() => {
    const grupos = new Map<string, { titulo: string; funciones: FuncionAdmin[] }>();
    for (const f of this.service.proximas()) {
      const clave = claveDia(f.inicio);
      if (!grupos.has(clave)) grupos.set(clave, { titulo: textoDia(f.inicio), funciones: [] });
      grupos.get(clave)!.funciones.push(f);
    }
    return [...grupos.values()];
  });

  protected readonly hora = textoHora;

  constructor() {
    this.service
      .cargarProximas()
      .catch((e) => this.error.set(`No se pudieron cargar las funciones: ${mensajeError(e)}`))
      .finally(() => this.cargando.set(false));
  }

  protected async eliminar(f: FuncionAdmin): Promise<void> {
    if (!confirm(`¿Eliminar la función de ${f.pelicula?.nombre ?? 'la película'} de las ${this.hora(f.inicio)}?`)) return;
    this.error.set(null);
    try {
      await this.service.eliminar(f.id);
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}