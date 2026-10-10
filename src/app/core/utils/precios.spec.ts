import { calcularPrecios } from './precios';

const etiquetas = new Map([[1, 'A-1'], [2, 'A-2'], [3, 'R-1']]);

describe('calcularPrecios', () => {
  it('sin butacas todo da cero', () => {
    const r = calcularPrecios([], etiquetas, 6000, 50);
    expect(r.total).toBe(0);
    expect(r.lineas.length).toBe(0);
    expect(r.cantidadVip).toBe(0);
  });

  it('butacas comunes pagan solo el precio base', () => {
    const r = calcularPrecios(
      [{ id: 1, tipo: 'comun' }, { id: 2, tipo: 'comun' }],
      etiquetas,
      6000,
      50,
    );
    expect(r.subtotal).toBe(12000);
    expect(r.recargoVip).toBe(0);
    expect(r.total).toBe(12000);
  });

  it('la butaca vip suma el recargo configurado', () => {
    const r = calcularPrecios(
      [{ id: 1, tipo: 'comun' }, { id: 2, tipo: 'comun' }, { id: 3, tipo: 'vip' }],
      etiquetas,
      6000,
      50,
    );
    expect(r.subtotal).toBe(18000);
    expect(r.recargoVip).toBe(3000);
    expect(r.total).toBe(21000);
    expect(r.cantidadVip).toBe(1);
    expect(r.lineas[2].total).toBe(9000);
    expect(r.lineas[2].etiqueta).toBe('R-1');
  });

  it('la butaca accesible no tiene recargo', () => {
    const r = calcularPrecios([{ id: 1, tipo: 'accesible' }], etiquetas, 6000, 50);
    expect(r.total).toBe(6000);
    expect(r.recargoVip).toBe(0);
  });

  it('redondea en centavos sin errores de coma flotante', () => {
    // 3333,33 + 50 % = 3333,33 + 1666,665 -> el recargo se redondea a 1666,67 y el total es exactamente 5000
    const r = calcularPrecios([{ id: 3, tipo: 'vip' }], etiquetas, 3333.33, 50);
    expect(r.recargoVip).toBe(1666.67);
    expect(r.total).toBe(5000);
  });
});