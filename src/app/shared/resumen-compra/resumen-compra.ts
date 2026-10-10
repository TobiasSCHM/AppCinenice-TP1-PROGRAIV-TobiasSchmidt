import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PrecioArsPipe } from '../../core/pipes/precio-ars.pipe';
import type { TotalesCompra } from '../../core/utils/precios';

// resumen previo al pago (rf-20, rf-22, rn-17, rn-07): butacas con su precio, aviso explicito de butacas vip,
// productos, descuento y total. es un componente de presentacion: @Input totales, @Output volver
@Component({
  selector: 'app-resumen-compra',
  imports: [PrecioArsPipe],
  templateUrl: './resumen-compra.html',
  styleUrl: './resumen-compra.css',
})
export class ResumenCompra {
  @Input({ required: true }) totales!: TotalesCompra;
  @Input({ required: true }) recargoPct!: number;
  @Input() descuentoPct = 0;
  @Input() restriccionEdad = 0;
  @Output() volver = new EventEmitter<void>();
}