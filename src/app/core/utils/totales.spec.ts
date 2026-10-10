import { calcularPrecios, calcularTotales } from './precios';

const etiquetas = new Map([[1, 'A-1'], [2, 'A-2'], [3, 'R-1']]);

// 2 comunes y 1 vip, base $ 6.000 y recargo del 50 %: entradas = $ 21.000
const entradas = calcularPrecios(
  [{ id: 1, tipo: 'comun' }, { id: 2, tipo: 'comun' }, { id: 3, tipo: 'vip' }],
  etiquetas,
  6000,
  50,
);

const pochoclos = { id: 1, nombre: 'Pochoclo grande', precio: 4500, cantidad: 2 };

describe('calcularTotales', () => {
  it('sin descuento ni productos el total son las entradas', () => {
    const t = calcularTotales(entradas, [], 0, 0);
    expect(t.total).toBe(21000);
    expect(t.descuento).toBe(0);
    expect(t.totalProductos).toBe(0);
  });

  it('suma los productos al total', () => {
    const t = calcularTotales(entradas, [pochoclos], 0, 0);
    expect(t.totalProductos).toBe(9000);
    expect(t.total).toBe(30000);
    expect(t.productos[0].subtotal).toBe(9000);
  });

  it('el descuento de primera compra se aplica solo a las entradas, no a los productos', () => {
    const t = calcularTotales(entradas, [pochoclos], 20, 1);
    expect(t.descuento).toBe(4200); // 20 % de 21.000
    expect(t.total).toBe(25800); // 21.000 - 4.200 + 9.000
    expect(t.puntos).toBe(25800);
  });

  it('el comprador anonimo no acumula puntos', () => {
    expect(calcularTotales(entradas, [pochoclos], 0, 0).puntos).toBe(0);
  });

  it('redondea el descuento en centavos', () => {
    const una = calcularPrecios([{ id: 1, tipo: 'comun' }], etiquetas, 100.05, 50);
    const t = calcularTotales(una, [], 33, 0);
    expect(t.descuento).toBe(33.02); // 33 % de 100,05 = 33,0165
    expect(t.total).toBe(67.03);
  });

  it('ignora los productos con cantidad cero', () => {
    const t = calcularTotales(entradas, [{ ...pochoclos, cantidad: 0 }], 0, 0);
    expect(t.productos.length).toBe(0);
    expect(t.total).toBe(21000);
  });
});