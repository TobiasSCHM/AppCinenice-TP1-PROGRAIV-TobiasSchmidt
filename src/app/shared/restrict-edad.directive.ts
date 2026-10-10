import { Directive, computed, input } from '@angular/core';
import { errorRestriccionEdad } from '../core/validators/restriccion-edad';

// restringe la compra segun la edad del comprador y la restriccion de la pelicula (rf-11, rf-22; rn-06, rn-07).
// el valor de [appRestrictEdad] es la restriccion (0, 13 o 18).
// no deshabilita el elemento por su cuenta: expone `restringido` (con exportAs) para que el boton lo combine
// con sus otras condiciones, y le pone como title el motivo del bloqueo
@Directive({
  selector: '[appRestrictEdad]',
  exportAs: 'appRestrictEdad',
  host: {
    '[class.restringido]': 'restringido()',
    '[attr.title]': 'motivo()',
  },
})
export class RestrictEdad {
  readonly restriccion = input.required<number>({ alias: 'appRestrictEdad' });
  readonly fechaNacimiento = input<string | null>(null);

  readonly motivo = computed(() => errorRestriccionEdad(this.restriccion(), this.fechaNacimiento()));
  readonly restringido = computed(() => this.motivo() !== null);
}