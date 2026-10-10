import { Component, inject, signal } from '@angular/core';
import { ConfiguracionService } from '../../core/configuracion.service';
import type { ParametroConfiguracion } from '../../core/configuracion.service';
import { mensajeError } from '../../core/utils/errores';

interface Meta {
  etiqueta: string;
  unidad: string;
  min: number;
  max: number;
  entero: boolean;
}

// nombre legible, unidad y rango valido de cada parametro conocido de la tabla configuracion
const METADATOS: Record<string, Meta> = {
  recargo_vip_pct: { etiqueta: 'Recargo de las butacas VIP', unidad: '%', min: 0, max: 300, entero: false },
  primera_compra_pct: { etiqueta: 'Descuento de primera compra', unidad: '%', min: 0, max: 100, entero: false },
  preventa_descuento_pct: { etiqueta: 'Descuento de preventa', unidad: '%', min: 0, max: 100, entero: false },
  margen_funciones_min: { etiqueta: 'Separación entre funciones de una sala', unidad: 'minutos', min: 0, max: 240, entero: true },
  cancelacion_horas: { etiqueta: 'Anticipación mínima para cancelar', unidad: 'horas', min: 0, max: 72, entero: true },
  puntos_por_peso: { etiqueta: 'Puntos por cada peso gastado', unidad: 'puntos', min: 0, max: 100, entero: false },
};

// parametros nuevos que todavia no tienen metadatos: se muestran igual con un rango amplio
const GENERICO: Meta = { etiqueta: '', unidad: '', min: 0, max: 1000, entero: false };

// edicion de los parametros del negocio (rf-20: recargo vip configurable; rf-30: porcentaje de primera compra)
@Component({
  selector: 'app-configuracion-lista',
  templateUrl: './configuracion-lista.html',
  styleUrl: './configuracion-lista.css',
})
export class ConfiguracionLista {
  protected readonly service = inject(ConfiguracionService);

  // lo que el admin escribio en cada campo (texto) y los errores de cada uno
  protected readonly borradores = signal<Record<string, string>>({});
  protected readonly errores = signal<Record<string, string>>({});

  protected readonly cargando = signal(true);
  protected readonly guardando = signal<string | null>(null); // clave que se esta guardando
  protected readonly error = signal<string | null>(null);
  protected readonly confirmacion = signal<string | null>(null);

  constructor() {
    this.service
      .cargar()
      .then(() =>
        this.borradores.set(Object.fromEntries(this.service.parametros().map((p) => [p.clave, String(p.valor)]))),
      )
      .catch((e) => this.error.set(`No se pudo cargar la configuración: ${mensajeError(e)}`))
      .finally(() => this.cargando.set(false));
  }

  protected meta(clave: string): Meta {
    const m = METADATOS[clave];
    return m ?? { ...GENERICO, etiqueta: clave };
  }

  protected editar(clave: string, texto: string): void {
    this.borradores.update((b) => ({ ...b, [clave]: texto }));
    this.errores.update((e) => {
      const nuevo = { ...e };
      delete nuevo[clave];
      return nuevo;
    });
    this.confirmacion.set(null);
  }

  // acepta coma decimal. null si no es un numero
  private leer(texto: string | undefined): number | null {
    const limpio = (texto ?? '').trim().replace(',', '.');
    if (limpio === '') return null;
    const numero = Number(limpio);
    return Number.isFinite(numero) ? numero : null;
  }

  protected hayCambios(p: ParametroConfiguracion): boolean {
    const numero = this.leer(this.borradores()[p.clave]);
    return numero === null || numero !== p.valor;
  }

  protected async guardar(p: ParametroConfiguracion): Promise<void> {
    const meta = this.meta(p.clave);
    const valor = this.leer(this.borradores()[p.clave]);

    let problema: string | null = null;
    if (valor === null) problema = 'Ingresá un número.';
    else if (valor < meta.min || valor > meta.max) problema = `Tiene que estar entre ${meta.min} y ${meta.max}.`;
    else if (meta.entero && !Number.isInteger(valor)) problema = 'Tiene que ser un número entero.';

    if (problema !== null || valor === null) {
      this.errores.update((e) => ({ ...e, [p.clave]: problema ?? 'Valor inválido.' }));
      return;
    }

    this.guardando.set(p.clave);
    this.error.set(null);
    this.confirmacion.set(null);
    try {
      await this.service.guardar(p.clave, valor);
      this.confirmacion.set(`Guardado: ${meta.etiqueta}.`);
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.guardando.set(null);
    }
  }
}