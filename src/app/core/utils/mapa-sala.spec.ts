import { armarFilas } from './mapa-sala';
import type { Butaca } from '../models/butaca.model';

const butaca = (id: number, filaOrden: number, bloque: number, numero: number): Butaca => ({
  id,
  sala_id: 1,
  fila: filaOrden === 1 ? 'A' : 'B',
  fila_orden: filaOrden,
  bloque,
  numero,
  tipo: 'comun',
});

describe('armarFilas', () => {
  it('numera las butacas de corrido a traves de los bloques y deja siempre tres bloques', () => {
    // llegan desordenadas a proposito
    const filas = armarFilas([butaca(3, 1, 2, 1), butaca(1, 1, 1, 1), butaca(2, 1, 1, 2), butaca(4, 1, 2, 2)]);
    expect(filas.length).toBe(1);
    expect(filas[0].bloques.map((b) => b.length)).toEqual([2, 2, 0]);
    expect(filas[0].bloques.flat().map((b) => b.etiqueta)).toEqual(['A-1', 'A-2', 'A-3', 'A-4']);
  });

  it('ordena las filas segun su orden fisico', () => {
    const filas = armarFilas([butaca(2, 2, 1, 1), butaca(1, 1, 1, 1)]);
    expect(filas.map((f) => f.fila)).toEqual(['A', 'B']);
  });
});