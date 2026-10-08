import { Pipe, PipeTransform } from '@angular/core';

// da formato de pesos argentinos: 4500 -> '$ 4.500,00'
const formato = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

@Pipe({ name: 'precioArs' })
export class PrecioArsPipe implements PipeTransform {
  transform(valor: number | string | null | undefined): string {
    if (valor == null || valor === '') return '';
    return formato.format(Number(valor));
  }
}
