import { Component, input } from '@angular/core';

// forma minima del estado de un campo de signal forms (lo que devuelve formulario.campo())
export interface EstadoCampo {
  touched(): boolean;
  valid(): boolean;
  errors(): readonly { kind: string; message?: string }[];
}

// muestra los errores de un campo una vez que el usuario lo toco. evita repetir el mismo bloque en cada formulario
@Component({
  selector: 'app-errores-campo',
  template: `
    @let e = estado();
    @if (e.touched() && !e.valid()) {
      @for (error of e.errors(); track error.kind) {
        <p class="error">{{ error.message }}</p>
      }
    }
  `,
})
export class ErroresCampo {
  readonly estado = input.required<EstadoCampo>();
}
