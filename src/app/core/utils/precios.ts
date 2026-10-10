import type { Butaca, TipoButaca } from '../models/butaca.model';

export interface LineaPrecio {
  butacaId: number;
  etiqueta: string;
  tipo: TipoButaca;
  base: number;
  recargo: number;
  total: number;
}

export interface DesglosePrecios {
  lineas: LineaPrecio[];
  subtotal: number; // suma de los precios base, sin recargo
  recargoVip: number; // suma de los recargos de las butacas vip
  total: number;
  cantidadVip: number;
}

// precio de una seleccion de butacas (rf-20, rn-17).
// se calcula en centavos enteros: con numeros decimales de javascript (0.1 + 0.2) aparecen diferencias de un centavo
export function calcularPrecios(
  seleccion: readonly Pick<Butaca, 'id' | 'tipo'>[],
  etiquetas: ReadonlyMap<number, string>,
  precioBase: number,
  recargoVipPct: number,
): DesglosePrecios {
  const baseCentavos = Math.round(precioBase * 100);
  const recargoCentavos = Math.round((baseCentavos * recargoVipPct) / 100);

  let subtotal = 0;
  let recargoVip = 0;
  let cantidadVip = 0;

  const lineas = seleccion.map((b) => {
    const esVip = b.tipo === 'vip';
    const recargo = esVip ? recargoCentavos : 0; // solo la vip paga recargo
    subtotal += baseCentavos;
    recargoVip += recargo;
    if (esVip) cantidadVip++;
    return {
      butacaId: b.id,
      etiqueta: etiquetas.get(b.id) ?? '',
      tipo: b.tipo,
      base: baseCentavos / 100,
      recargo: recargo / 100,
      total: (baseCentavos + recargo) / 100,
    };
  });

  return {
    lineas,
    subtotal: subtotal / 100,
    recargoVip: recargoVip / 100,
    total: (subtotal + recargoVip) / 100,
    cantidadVip,
  };
}