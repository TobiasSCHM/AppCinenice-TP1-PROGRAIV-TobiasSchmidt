import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { HighlightButaca } from '../highlight-butaca.directive';
import { armarFilas } from '../../core/utils/mapa-sala';
import type { Butaca, ButacaMapa, EstadoButaca } from '../../core/models/butaca.model';

// dibuja la sala: tres bloques por fila separados por pasillos, la fila accesible entre la I y la L y la leyenda.
// es un componente de presentacion: no sabe de supabase, recibe todo por input y avisa los clics por output
@Component({
  selector: 'app-mapa-butacas',
  imports: [HighlightButaca],
  templateUrl: './mapa-butacas.html',
  styleUrl: './mapa-butacas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapaButacas {
  readonly butacas = input.required<readonly Butaca[]>();
  readonly ocupadas = input.required<ReadonlySet<number>>();
  readonly seleccionadas = input.required<ReadonlySet<number>>();

  // se emite al tocar una butaca libre: la pagina decide que hacer con ella
  readonly alternar = output<Butaca>();

  protected readonly filas = computed(() => armarFilas(this.butacas()));

  protected estadoDe(b: ButacaMapa): EstadoButaca {
    if (this.ocupadas().has(b.id)) return 'ocupada';
    return this.seleccionadas().has(b.id) ? 'seleccionada' : 'libre';
  }

  protected elegir(b: ButacaMapa): void {
    if (this.ocupadas().has(b.id)) return; // una butaca ocupada no se puede elegir
    this.alternar.emit(b);
  }

  // texto para lectores de pantalla y para el tooltip
  protected descripcion(b: ButacaMapa): string {
    const tipo = b.tipo === 'vip' ? 'VIP' : b.tipo === 'accesible' ? 'accesible' : 'común';
    const estado = { libre: 'libre', ocupada: 'ocupada', seleccionada: 'seleccionada' }[this.estadoDe(b)];
    return `Butaca ${b.etiqueta}, ${tipo}, ${estado}`;
  }
}