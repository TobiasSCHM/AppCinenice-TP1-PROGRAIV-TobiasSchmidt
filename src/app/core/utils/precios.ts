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

export interface ProductoElegido {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface LineaProducto {
  productoId: number;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface TotalesCompra {
  entradas: DesglosePrecios;
  productos: LineaProducto[];
  totalProductos: number;
  descuento: number; // cupon de primera compra: se aplica solo sobre las entradas
  total: number;
  puntos: number;
}

// total de la compra (rf-22, rf-30, rf-32). replica la cuenta de la rpc confirmar_compra para que
// el total que ve el usuario coincida con lo que se cobra. todo en centavos enteros.
// descuentoPct: 0 si no tiene cupon. puntosPorPeso: 0 para el comprador anonimo
export function calcularTotales(
  entradas: DesglosePrecios,
  productos: readonly ProductoElegido[],
  descuentoPct: number,
  puntosPorPeso: number,
): TotalesCompra {
  const entradasCentavos = Math.round(entradas.total * 100);
  const descuentoCentavos = Math.round((entradasCentavos * descuentoPct) / 100);

  let productosCentavos = 0;
  const lineas = productos
    .filter((p) => p.cantidad > 0)
    .map((p) => {
      const subtotalCentavos = Math.round(p.precio * 100) * p.cantidad;
      productosCentavos += subtotalCentavos;
      return {
        productoId: p.id,
        nombre: p.nombre,
        cantidad: p.cantidad,
        precioUnitario: p.precio,
        subtotal: subtotalCentavos / 100,
      };
    });

  const totalCentavos = entradasCentavos - descuentoCentavos + productosCentavos;
  return {
    entradas,
    productos: lineas,
    totalProductos: productosCentavos / 100,
    descuento: descuentoCentavos / 100,
    total: totalCentavos / 100,
    puntos: Math.floor((totalCentavos * puntosPorPeso) / 100),
  };
}