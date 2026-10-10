import { Component, computed, input, output } from '@angular/core';
import { PrecioArsPipe } from '../../core/pipes/precio-ars.pipe';
import type { TipoButaca } from '../../core/models/butaca.model';
import type { DesglosePrecios } from '../../core/utils/precios';

// resumen previo al pago (rf-20, rn-17): precio de cada butaca, aviso explicito de butacas vip y total.
// es un componente de presentacion: recibe el desglose ya calculado y avisa cuando el usuario quiere volver.
// el boton de pago se agrega en el siguiente bloque (rf-22, rf-23)
@Component({
  selector: 'app-resumen-compra',
  imports: [PrecioArsPipe],
  templateUrl: './resumen-compra.html',
  styleUrl: './resumen-compra.css',
})
export class ResumenCompra {
  readonly desglose = input.required<DesglosePrecios>();
  readonly recargoPct = input.required<number>();
  readonly volver = output<void>();

  protected readonly hayVip = computed(() => this.desglose().cantidadVip > 0);

  protected nombreTipo(tipo: TipoButaca): string {
    return tipo === 'vip' ? 'VIP' : tipo === 'accesible' ? 'Accesible' : 'Común';
  }
}