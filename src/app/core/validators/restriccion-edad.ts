import { calcularEdad, parsearFechaIso } from '../utils/fechas';

// regla de edad (rn-06): a menores de 13 o de 18 anios no se les permite comprar entradas de peliculas
// con esa restriccion. devuelve el motivo del bloqueo, o null si puede comprar.
// es una funcion pura: la base aplica la misma regla, esta version sirve para avisar antes de pagar
export function errorRestriccionEdad(
  restriccion: number,
  fechaNacimiento: string | null,
  hoy: Date = new Date(),
): string | null {
  if (restriccion <= 0) return null;
  if (!fechaNacimiento) return 'Esta película tiene restricción de edad: informá tu fecha de nacimiento.';
  const fecha = parsearFechaIso(fechaNacimiento);
  if (!fecha) return 'La fecha de nacimiento no es válida.';
  return calcularEdad(fecha, hoy) < restriccion ? `Esta película es para mayores de ${restriccion} años.` : null;
}