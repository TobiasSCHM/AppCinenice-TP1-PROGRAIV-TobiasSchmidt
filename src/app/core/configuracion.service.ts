import { Injectable, signal } from '@angular/core';
import { supabase } from './supabase.client';

export interface ParametroConfiguracion {
  clave: string;
  valor: number;
  descripcion: string;
}

// parametros del negocio que edita el admin (tabla configuracion): recargo vip, descuentos, margenes, etc.
// nada de esto va escrito en el codigo
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  readonly parametros = signal<ParametroConfiguracion[]>([]);

  async cargar(): Promise<void> {
    const { data, error } = await supabase.from('configuracion').select('clave, valor, descripcion').order('clave');
    if (error) throw error;
    this.parametros.set(
      (data ?? []).map((f) => ({
        clave: String(f['clave']),
        valor: Number(f['valor']),
        descripcion: String(f['descripcion']),
      })),
    );
  }

  // un valor puntual. si la clave no existe es un error de configuracion: no se inventa un valor por defecto
  async valorDe(clave: string): Promise<number> {
    const { data, error } = await supabase.from('configuracion').select('valor').eq('clave', clave).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Falta el parámetro de configuración "${clave}".`);
    return Number(data['valor']);
  }

  async guardar(clave: string, valor: number): Promise<void> {
    const { data, error } = await supabase.from('configuracion').update({ valor }).eq('clave', clave).select('clave');
    if (error) throw error;
    // si la politica rls no deja modificar, supabase no da error: devuelve cero filas
    if (!data || data.length === 0) {
      throw new Error('No se pudo guardar: el cambio fue rechazado (¿tenés rol de administrador?).');
    }
    this.parametros.update((lista) => lista.map((p) => (p.clave === clave ? { ...p, valor } : p)));
  }
}