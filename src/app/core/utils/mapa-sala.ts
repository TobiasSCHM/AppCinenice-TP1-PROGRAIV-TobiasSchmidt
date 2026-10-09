import type { Butaca, ButacaMapa, FilaMapa } from '../models/butaca.model';

// convierte la lista plana de butacas (las filas de la base) en filas con tres bloques, listas para dibujar.
// es una funcion pura: no toca angular ni la base
export function armarFilas(butacas: readonly Butaca[]): FilaMapa[] {
  const ordenadas = [...butacas].sort(
    (a, b) => a.fila_orden - b.fila_orden || a.bloque - b.bloque || a.numero - b.numero,
  );

  const porFila = new Map<number, Butaca[]>();
  for (const b of ordenadas) {
    const grupo = porFila.get(b.fila_orden);
    if (grupo) grupo.push(b);
    else porFila.set(b.fila_orden, [b]);
  }

  const filas: FilaMapa[] = [];
  for (const [filaOrden, grupo] of porFila) {
    // numeracion corrida a traves de los bloques: 1 a 28 en una fila comun, 1 a 14 en la accesible
    let numeroEnFila = 0;
    const bloques: ButacaMapa[][] = [[], [], []];
    for (const b of grupo) {
      numeroEnFila++;
      bloques[b.bloque - 1].push({ ...b, etiqueta: `${b.fila}-${numeroEnFila}` });
    }
    filas.push({ fila: grupo[0].fila, filaOrden, tipo: grupo[0].tipo, bloques });
  }
  return filas;
}