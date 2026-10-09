import { textoDia, textoHora } from '../utils/fechas';

// rango que una funcion ya existente ocupa en su sala (desde que empieza hasta fin + margen)
export interface RangoOcupado {
  sala_id: number;
  inicio: string;
  ocupada_hasta: string;
}

// primera sala libre para una funcion que dura duracionMin y necesita margenMin de separacion.
// replica en el cliente lo que hace sala_libre_para en la base. salaIds tiene que venir ordenado.
// dos rangos [a,b) y [c,d) se pisan si a < d y c < b (igual que el operador && de postgres)
export function primeraSalaLibre(
  inicio: Date,
  duracionMin: number,
  margenMin: number,
  salaIds: number[],
  ocupados: RangoOcupado[],
): number | null {
  const desde = inicio.getTime();
  const hasta = desde + (duracionMin + margenMin) * 60_000;
  for (const salaId of salaIds) {
    const choca = ocupados.some(
      (o) => o.sala_id === salaId && Date.parse(o.inicio) < hasta && desde < Date.parse(o.ocupada_hasta),
    );
    if (!choca) return salaId;
  }
  return null;
}

// validador de separacion minima (rn-04): mensaje claro para las fechas sin sala libre, o null si todas tienen
export function errorSeparacion(sinSala: Date[], margenMin: number): string | null {
  if (sinSala.length === 0) return null;
  const fechas = sinSala
    .slice(0, 3)
    .map((d) => `${textoDia(d.toISOString())} ${textoHora(d.toISOString())}`)
    .join(', ');
  const resto = sinSala.length > 3 ? ` y ${sinSala.length - 3} más` : '';
  return (
    `No hay sala libre para: ${fechas}${resto}. ` +
    `Entre dos funciones de una misma sala tienen que pasar al menos ${margenMin} minutos desde que termina la anterior.`
  );
}