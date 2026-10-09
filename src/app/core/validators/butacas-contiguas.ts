import type { Butaca } from '../models/butaca.model';

export type ResultadoContiguas = { valida: true } | { valida: false; motivo: string };

// validador de butacas contiguas (rf-21, rn-31). una seleccion es valida si:
//  1. ninguna butaca elegida esta ocupada
//  2. con mas de una: misma fila, mismo bloque, numeros consecutivos y ninguna ocupada en el medio
//  una sola butaca siempre es valida.
// es una funcion pura: no toca angular ni la base, por eso se prueba sola
export function validarContiguas(
  seleccion: readonly Butaca[],
  ocupadas: ReadonlySet<number>,
  sala: readonly Butaca[],
): ResultadoContiguas {
  if (seleccion.some((b) => ocupadas.has(b.id))) {
    return { valida: false, motivo: 'Alguna de las butacas elegidas ya fue ocupada por otra compra.' };
  }
  if (seleccion.length <= 1) return { valida: true };

  const primera = seleccion[0];
  if (seleccion.some((b) => b.fila_orden !== primera.fila_orden)) {
    return { valida: false, motivo: 'Las butacas tienen que estar en la misma fila.' };
  }
  if (seleccion.some((b) => b.bloque !== primera.bloque)) {
    return {
      valida: false,
      motivo: 'Hay un pasillo entre las butacas elegidas: tienen que estar en el mismo bloque.',
    };
  }

  // el orden en que el usuario hizo clic no importa: se ordena por numero
  const numeros = seleccion.map((b) => b.numero).sort((a, b) => a - b);
  for (let i = 1; i < numeros.length; i++) {
    if (numeros[i] - numeros[i - 1] === 1) continue;
    // hay un hueco: se mira si alguna butaca del hueco esta ocupada para dar el motivo correcto
    const hayOcupadaEnMedio = sala.some(
      (b) =>
        b.fila_orden === primera.fila_orden &&
        b.bloque === primera.bloque &&
        b.numero > numeros[i - 1] &&
        b.numero < numeros[i] &&
        ocupadas.has(b.id),
    );
    return {
      valida: false,
      motivo: hayOcupadaEnMedio
        ? 'Hay una butaca ocupada entre las elegidas.'
        : 'Las butacas tienen que ser seguidas, sin lugares libres en el medio.',
    };
  }
  return { valida: true };
}