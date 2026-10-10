import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FuncionesService } from '../../core/funciones.service';
import { ButacasService } from '../../core/butacas.service';
import { OcupacionService } from '../../core/ocupacion.service';
import type { EstadoCanal } from '../../core/ocupacion.service';
import { ConfiguracionService } from '../../core/configuracion.service';
import { MapaButacas } from '../../shared/mapa-butacas/mapa-butacas';
import { ResumenCompra } from '../../shared/resumen-compra/resumen-compra';
import { PrecioArsPipe } from '../../core/pipes/precio-ars.pipe';
import { armarFilas } from '../../core/utils/mapa-sala';
import { calcularPrecios } from '../../core/utils/precios';
import { textoDia, textoHora } from '../../core/utils/fechas';
import { mensajeError } from '../../core/utils/errores';
import { validarContiguas } from '../../core/validators/butacas-contiguas';
import type { Butaca, CambioOcupacion } from '../../core/models/butaca.model';
import type { FuncionAdmin } from '../../core/models/funcion.model';

type Paso = 'elegir' | 'resumen';

// eleccion de butacas de una funcion con ocupacion en tiempo real y resumen previo al pago
// (rf-14, rf-18, rf-20, rf-21, rnf-12). la pagina orquesta: carga datos, escucha realtime y guarda el estado.
// el dibujo lo hace MapaButacas y el resumen ResumenCompra. el boton de pago llega con rf-22 y rf-23
@Component({
  selector: 'app-funcion-mapa',
  imports: [RouterLink, MapaButacas, ResumenCompra, PrecioArsPipe],
  templateUrl: './funcion-mapa.html',
  styleUrl: './funcion-mapa.css',
})
export class FuncionMapa {
  private readonly funcionesService = inject(FuncionesService);
  private readonly butacasService = inject(ButacasService);
  private readonly ocupacionService = inject(OcupacionService);
  private readonly configuracion = inject(ConfiguracionService);

  // llega desde la ruta /funcion/:id (withComponentInputBinding)
  readonly id = input.required<string>();
  private readonly funcionId = computed(() => Number(this.id()));

  protected readonly funcion = signal<FuncionAdmin | null>(null);
  protected readonly butacas = signal<Butaca[]>([]);
  // los conjuntos se reemplazan por uno nuevo en cada cambio: asi los signals detectan la modificacion
  protected readonly ocupadas = signal<ReadonlySet<number>>(new Set());
  protected readonly seleccionadas = signal<ReadonlySet<number>>(new Set());

  protected readonly paso = signal<Paso>('elegir');
  protected readonly recargoVipPct = signal(0);

  protected readonly cargando = signal(true);
  protected readonly enVivo = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  // nombre que ve el usuario de cada butaca ('A-5'), por id
  private readonly etiquetaDe = computed(() => {
    const mapa = new Map<number, string>();
    for (const fila of armarFilas(this.butacas())) {
      for (const bloque of fila.bloques) {
        for (const b of bloque) mapa.set(b.id, b.etiqueta);
      }
    }
    return mapa;
  });

  // butacas elegidas, en el orden fisico de la sala
  protected readonly seleccion = computed(() => this.butacas().filter((b) => this.seleccionadas().has(b.id)));
  protected readonly textoSeleccion = computed(() =>
    this.seleccion().map((b) => this.etiquetaDe().get(b.id) ?? '').join(', '),
  );

  // validador de contiguas (rf-21): se recalcula solo cuando cambia la seleccion o la ocupacion
  protected readonly validacion = computed(() => validarContiguas(this.seleccion(), this.ocupadas(), this.butacas()));
  protected readonly motivoError = computed(() => {
    const v = this.validacion();
    return v.valida ? null : v.motivo;
  });

  // una funcion que ya empezo no admite compras
  protected readonly yaEmpezo = computed(() => {
    const f = this.funcion();
    return f !== null && Date.parse(f.inicio) <= Date.now();
  });

  // el paso al resumen y al pago se bloquea si la seleccion no es valida (rf-21)
  protected readonly puedeContinuar = computed(
    () => this.seleccion().length > 0 && this.validacion().valida && !this.yaEmpezo(),
  );

  // precio estimado (rf-20, rn-17). el servidor lo vuelve a calcular al confirmar la compra
  protected readonly desglose = computed(() =>
    calcularPrecios(this.seleccion(), this.etiquetaDe(), this.funcion()?.precio_base ?? 0, this.recargoVipPct()),
  );

  // se exponen a la plantilla
  protected readonly dia = textoDia;
  protected readonly hora = textoHora;

  constructor() {
    effect((onCleanup) => {
      // lo unico que dispara este efecto es un cambio de funcion
      const funcionId = this.funcionId();
      // untracked: lo que se lee y escribe adentro no tiene que volver a disparar el efecto
      untracked(() => {
        this.reiniciar();
        if (!Number.isInteger(funcionId)) {
          this.error.set('La función no existe.');
          this.cargando.set(false);
          return;
        }
        void this.cargarFuncion(funcionId);
        const cortar = this.ocupacionService.escuchar(funcionId, {
          alCambiar: (cambio) => this.aplicarCambio(cambio),
          alEstado: (estado) => this.alEstado(estado, funcionId),
        });
        // angular llama a cortar() cuando el efecto se vuelve a ejecutar o la pagina se destruye
        onCleanup(cortar);
      });
    });
  }

  protected alternar(b: Butaca): void {
    this.aviso.set(null);
    this.seleccionadas.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(b.id)) nuevo.delete(b.id);
      else nuevo.add(b.id);
      return nuevo;
    });
  }

  protected limpiar(): void {
    this.aviso.set(null);
    this.seleccionadas.set(new Set());
  }

  // paso al resumen: solo si el validador lo permite
  protected continuar(): void {
    if (!this.puedeContinuar()) return;
    this.aviso.set(null);
    this.paso.set('resumen');
  }

  protected volverAElegir(): void {
    this.paso.set('elegir');
  }

  private reiniciar(): void {
    this.funcion.set(null);
    this.butacas.set([]);
    this.ocupadas.set(new Set());
    this.seleccionadas.set(new Set());
    this.paso.set('elegir');
    this.error.set(null);
    this.aviso.set(null);
    this.enVivo.set(false);
    this.cargando.set(true);
  }

  private async cargarFuncion(funcionId: number): Promise<void> {
    try {
      const funcion = await this.funcionesService.obtener(funcionId);
      if (this.funcionId() !== funcionId) return; // el usuario ya cambio de funcion
      if (!funcion) {
        this.error.set('La función no existe.');
        return;
      }
      const [butacas, ocupadas, recargo] = await Promise.all([
        this.butacasService.deSala(funcion.sala_id),
        this.ocupacionService.cargar(funcionId),
        this.configuracion.valorDe('recargo_vip_pct'),
      ]);
      if (this.funcionId() !== funcionId) return;
      this.funcion.set(funcion);
      this.butacas.set(butacas);
      this.ocupadas.set(new Set(ocupadas));
      this.recargoVipPct.set(recargo);
    } catch (e) {
      this.error.set(`No se pudo cargar la función: ${mensajeError(e)}`);
    } finally {
      this.cargando.set(false);
    }
  }

  // un aviso de realtime: otra compra ocupo o libero una butaca
  private aplicarCambio(cambio: CambioOcupacion): void {
    if (cambio.tipo === 'ocupada') {
      this.ocupadas.update((actual) => new Set(actual).add(cambio.butacaId));
      this.quitarSiEstabaElegida(cambio.butacaId);
    } else {
      this.ocupadas.update((actual) => {
        const nuevo = new Set(actual);
        nuevo.delete(cambio.butacaId);
        return nuevo;
      });
    }
  }

  // estado del canal. al (re)conectar se recarga la ocupacion completa para cubrir lo que se pudo perder
  private alEstado(estado: EstadoCanal, funcionId: number): void {
    this.enVivo.set(estado === 'conectado');
    if (estado === 'conectado') void this.recargarOcupadas(funcionId);
  }

  private async recargarOcupadas(funcionId: number): Promise<void> {
    try {
      const ids = await this.ocupacionService.cargar(funcionId);
      if (this.funcionId() !== funcionId) return;
      this.ocupadas.set(new Set(ids));
      for (const id of ids) this.quitarSiEstabaElegida(id);
    } catch {
      // si falla se mantiene lo ultimo que se sabia: la base decide al momento de comprar
    }
  }

  // si alguien ocupo una butaca que tenias elegida, se te quita y se te avisa (flujo alternativo del documento).
  // si estabas en el resumen se vuelve al mapa: tu seleccion cambio y el total ya no corresponde
  private quitarSiEstabaElegida(butacaId: number): void {
    if (!this.seleccionadas().has(butacaId)) return;
    this.seleccionadas.update((actual) => {
      const nuevo = new Set(actual);
      nuevo.delete(butacaId);
      return nuevo;
    });
    const nombre = this.etiquetaDe().get(butacaId) ?? 'elegida';
    this.aviso.set(`La butaca ${nombre} acaba de ser ocupada por otra compra. La sacamos de tu selección.`);
    this.paso.set('elegir');
  }
}