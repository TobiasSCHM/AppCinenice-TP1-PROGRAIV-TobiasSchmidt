import { validarContiguas } from './butacas-contiguas';
import type { Butaca } from '../models/butaca.model';

// sala de prueba: dos filas; cada una con un bloque izquierdo de 2 butacas y uno central de 6
const sala: Butaca[] = [];
let id = 0;
for (const filaOrden of [1, 2]) {
  for (const [bloque, cantidad] of [[1, 2], [2, 6]]) {
    for (let numero = 1; numero <= cantidad; numero++) {
      id++;
      sala.push({
        id,
        sala_id: 1,
        fila: filaOrden === 1 ? 'A' : 'B',
        fila_orden: filaOrden,
        bloque,
        numero,
        tipo: 'comun',
      });
    }
  }
}

const buscar = (filaOrden: number, bloque: number, numero: number): Butaca =>
  sala.find((b) => b.fila_orden === filaOrden && b.bloque === bloque && b.numero === numero)!;

const nadie = new Set<number>();
const motivoDe = (r: ReturnType<typeof validarContiguas>): string => (r.valida ? '' : r.motivo);

describe('validarContiguas', () => {
  it('sin seleccion es valida', () => {
    expect(validarContiguas([], nadie, sala).valida).toBe(true);
  });

  it('una sola butaca siempre es valida', () => {
    expect(validarContiguas([buscar(1, 2, 3)], nadie, sala).valida).toBe(true);
  });

  it('dos butacas seguidas del mismo bloque son validas', () => {
    expect(validarContiguas([buscar(1, 2, 2), buscar(1, 2, 3)], nadie, sala).valida).toBe(true);
  });

  it('el orden de los clics no importa', () => {
    const seleccion = [buscar(1, 2, 5), buscar(1, 2, 3), buscar(1, 2, 4), buscar(1, 2, 2)];
    expect(validarContiguas(seleccion, nadie, sala).valida).toBe(true);
  });

  it('rechaza butacas con un lugar libre en el medio', () => {
    const r = validarContiguas([buscar(1, 2, 2), buscar(1, 2, 4)], nadie, sala);
    expect(r.valida).toBe(false);
    expect(motivoDe(r)).toContain('seguidas');
  });

  it('rechaza butacas con una ocupada en el medio y lo dice', () => {
    const ocupadas = new Set([buscar(1, 2, 3).id]);
    const r = validarContiguas([buscar(1, 2, 2), buscar(1, 2, 4)], ocupadas, sala);
    expect(r.valida).toBe(false);
    expect(motivoDe(r)).toContain('ocupada entre');
  });

  it('rechaza butacas de filas distintas', () => {
    const r = validarContiguas([buscar(1, 2, 2), buscar(2, 2, 3)], nadie, sala);
    expect(r.valida).toBe(false);
    expect(motivoDe(r)).toContain('misma fila');
  });

  it('rechaza butacas separadas por un pasillo', () => {
    // numero 2 del bloque izquierdo y numero 1 del central: parecen vecinas pero hay un pasillo
    const r = validarContiguas([buscar(1, 1, 2), buscar(1, 2, 1)], nadie, sala);
    expect(r.valida).toBe(false);
    expect(motivoDe(r)).toContain('pasillo');
  });

  it('rechaza una seleccion que incluye una butaca ya ocupada, aunque sea una sola', () => {
    const elegida = buscar(1, 2, 3);
    const r = validarContiguas([elegida], new Set([elegida.id]), sala);
    expect(r.valida).toBe(false);
    expect(motivoDe(r)).toContain('ya fue ocupada');
  });
});