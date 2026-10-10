import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PrecioArsPipe } from '../../core/pipes/precio-ars.pipe';
import { textoDia, textoHora } from '../../core/utils/fechas';
import type { Comprobante, MedioPago } from '../../core/models/compra.model';

// pantalla de compra confirmada (rf-22, rf-25). es un componente de presentacion: @Input comprobante, @Output nuevaCompra.
// el qr en imagen y la descarga en pdf llegan con rf-24: por ahora se muestra el codigo en texto
@Component({
  selector: 'app-comprobante-compra',
  imports: [PrecioArsPipe],
  templateUrl: './comprobante-compra.html',
  styleUrl: './comprobante-compra.css',
})
export class ComprobanteCompra {
  @Input({ required: true }) comprobante!: Comprobante;
  @Output() nuevaCompra = new EventEmitter<void>();

  protected readonly dia = textoDia;
  protected readonly hora = textoHora;

  protected etiquetaMedio(medio: MedioPago): string {
    switch (medio) {
      case 'tarjeta_credito':
        return 'Tarjeta de crédito';
      case 'tarjeta_debito':
        return 'Tarjeta de débito';
      default:
        return 'Transferencia';
    }
  }
}