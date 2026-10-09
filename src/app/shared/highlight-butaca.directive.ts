import { Directive, input } from '@angular/core';
import type { EstadoButaca, TipoButaca } from '../core/models/butaca.model';

// da a un elemento el aspecto de una butaca segun su tipo y su estado (rf-19, rf-20, ui-04, ui-05).
// solo agrega clases: los colores estan en el css de mapa-butacas.
// se usa en cada butaca del mapa y tambien en la leyenda, para que ambas se vean siempre igual
@Directive({
  selector: '[appHighlightButaca]',
  host: {
    class: 'butaca',
    '[class.comun]': "tipo() === 'comun'",
    '[class.accesible]': "tipo() === 'accesible'",
    '[class.vip]': "tipo() === 'vip'",
    '[class.ocupada]': "estadoButaca() === 'ocupada'",
    '[class.seleccionada]': "estadoButaca() === 'seleccionada'",
  },
})
export class HighlightButaca {
  // el valor de [appHighlightButaca] es el tipo de butaca
  readonly tipo = input.required<TipoButaca>({ alias: 'appHighlightButaca' });
  readonly estadoButaca = input<EstadoButaca>('libre');
}