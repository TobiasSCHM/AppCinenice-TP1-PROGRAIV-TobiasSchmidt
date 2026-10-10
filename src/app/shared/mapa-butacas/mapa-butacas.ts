import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { HighlightButaca } from '../highlight-butaca.directive';
import { armarFilas } from '../../core/utils/mapa-sala';
import type { Butaca, ButacaMapa, EstadoButaca } from '../../core/models/butaca.model';

// dibuja la sala: tres bloques por fila separados por pasillos, la fila accesible entre la I y la L y la leyenda.
// es un componente de presentacion (seat-grid): no sabe de supabase.
// usa @Input / @Output. la seleccion es two-way: [(seleccionadas)] = @Input seleccionadas + @Output seleccionadasChange
@Component({
  selector: 'app-mapa-butacas',
  imports: [HighlightButaca],
  templateUrl: './mapa-butacas.html',
  styleUrl: './mapa-butacas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapaButacas {
  // los @Input se copian a signals internas para poder usar computed y tener un render eficiente con OnPush
  private readonly butacasSig = signal<readonly Butaca[]>([]);
  private readonly ocupadasSig = signal<ReadonlySet<number>>(new Set());
  private readonly seleccionadasSig = signal<ReadonlySet<number>>(new Set());

  @Input({ required: true }) set butacas(valor: readonly Butaca[]) {
    this.butacasSig.set(valor);
  }
  @Input({ required: true }) set ocupadas(valor: ReadonlySet<number>) {
    this.ocupadasSig.set(valor);
  }
  @Input({ required: true }) set seleccionadas(valor: ReadonlySet<number>) {
    this.seleccionadasSig.set(valor);
  }

  // se emite el conjunto nuevo de butacas seleccionadas: asi funciona [(seleccionadas)]
  @Output() seleccionadasChange = new EventEmitter<ReadonlySet<number>>();

  protected readonly filas = computed(() => armarFilas(this.butacasSig()));

  protected estadoDe(b: ButacaMapa): EstadoButaca {
    if (this.ocupadasSig().has(b.id)) return 'ocupada';
    return this.seleccionadasSig().has(b.id) ? 'seleccionada' : 'libre';
  }

  protected elegir(b: ButacaMapa): void {
    if (this.ocupadasSig().has(b.id)) return; // una butaca ocupada no se puede elegir
    const nuevo = new Set(this.seleccionadasSig());
    if (nuevo.has(b.id)) nuevo.delete(b.id);
    else nuevo.add(b.id);
    this.seleccionadasChange.emit(nuevo);
  }

  // texto para lectores de pantalla y para el tooltip
  protected descripcion(b: ButacaMapa): string {
    const tipo = b.tipo === 'vip' ? 'VIP' : b.tipo === 'accesible' ? 'accesible' : 'común';
    const estado = { libre: 'libre', ocupada: 'ocupada', seleccionada: 'seleccionada' }[this.estadoDe(b)];
    return `Butaca ${b.etiqueta}, ${tipo}, ${estado}`;
  }
}