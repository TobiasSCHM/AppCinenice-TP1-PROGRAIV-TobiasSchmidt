import { Injectable } from '@angular/core';
import { supabase } from './supabase.client';
import type { Comprobante, SolicitudCompra } from './models/compra.model';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  // confirma la compra con una unica llamada a la rpc. la base valida y recalcula todo
  async confirmar(solicitud: SolicitudCompra): Promise<Comprobante> {
    const { data, error } = await supabase.rpc('confirmar_compra', {
      p_funcion: solicitud.funcionId,
      p_butacas: solicitud.butacaIds,
      p_productos: solicitud.productos,
      p_fecha_nacimiento: solicitud.fechaNacimiento,
      p_medio_pago: solicitud.medioPago,
    });
    // los errores de negocio (raise exception) llegan con el texto listo para mostrar
    if (error) throw new Error(error.message);
    return data as Comprobante;
  }
}

// un error de butacas (ocupadas, no contiguas) obliga a volver al mapa a elegir otras
export function esConflictoDeButacas(mensaje: string): boolean {
  return /ocupada|contiguas|no pertenece|repetidas|butaca/i.test(mensaje);
}