import { calcularEdad, parsearFechaIso } from '../utils/fechas';

// logica pura: devuelve el mensaje de error o null si la fecha es valida.
// al ser una funcion pura se puede testear sin angular (tests del lunes)
export function errorFechaNacimiento(valor: string, hoy: Date = new Date()): string | null {
  if (!valor) return null; // el campo vacio lo marca required, no se duplica el mensaje
  const fecha = parsearFechaIso(valor);
  if (!fecha) return 'Ingresá una fecha válida.';
  if (fecha > hoy) return 'La fecha de nacimiento no puede ser futura.';
  if (calcularEdad(fecha, hoy) > 120) return 'Revisá la fecha de nacimiento.';
  return null;
}

// validador personalizado para signal forms: se usa con validate(f.campo, validarFechaNacimiento)
export function validarFechaNacimiento(ctx: { value: () => string }) {
  const mensaje = errorFechaNacimiento(ctx.value());
  return mensaje ? { kind: 'fechaNacimiento', message: mensaje } : null;
}
