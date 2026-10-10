import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { errorFechaNacimiento } from './fecha-nacimiento';

// validador personalizado para formularios reactivos: adapta la funcion pura errorFechaNacimiento.
// devuelve { fechaNacimiento: 'mensaje' } si la fecha es invalida y null si esta bien (o vacia)
export const fechaNacimientoValida: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const mensaje = errorFechaNacimiento(String(control.value ?? ''));
  return mensaje ? { fechaNacimiento: mensaje } : null;
};