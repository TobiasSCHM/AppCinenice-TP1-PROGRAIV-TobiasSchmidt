import type { TipoButaca } from './butaca.model';
import type { FormatoProyeccion, IdiomaProyeccion } from './funcion.model';

// medios de pago simulados
export type MedioPago = 'tarjeta_credito' | 'tarjeta_debito' | 'transferencia';

export interface ItemProducto {
  producto_id: number;
  cantidad: number;
}

// lo que se envia a la rpc confirmar_compra: solo lo que el usuario quiere comprar.
// los precios, el descuento y los puntos los calcula la base
export interface SolicitudCompra {
  funcionId: number;
  butacaIds: number[];
  productos: ItemProducto[];
  fechaNacimiento: string | null; // la declara el comprador anonimo
  medioPago: MedioPago;
}

export interface ButacaComprada {
  id: number;
  etiqueta: string;
  tipo: TipoButaca;
  precio: number;
}

export interface ProductoComprado {
  nombre: string;
  cantidad: number;
  precio_unitario: number;
}

// lo que devuelve confirmar_compra. un comprador anonimo no puede leer la tabla compras,
// asi que la rpc le entrega todo lo necesario para ver su entrada
export interface Comprobante {
  compra_id: string;
  qr_codigo: string;
  creada_en: string;
  funcion: {
    id: number;
    inicio: string;
    formato: FormatoProyeccion;
    idioma: IdiomaProyeccion;
    sala: string;
    pelicula: string;
    restriccion_edad: number;
  };
  butacas: ButacaComprada[];
  productos: ProductoComprado[];
  subtotal_entradas: number;
  recargo_vip: number;
  descuento: number;
  total_productos: number;
  total_pagado: number;
  puntos_ganados: number;
  tiene_productos: boolean;
  medio_pago: MedioPago;
}