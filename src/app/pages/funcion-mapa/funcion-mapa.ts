import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { FuncionesService } from '../../core/funciones.service';
import { ButacasService } from '../../core/butacas.service';
import { OcupacionService } from '../../core/ocupacion.service';
import type { EstadoCanal } from '../../core/ocupacion.service';
import { ConfiguracionService } from '../../core/configuracion.service';
import { ProductosService } from '../../core/productos.service';
import { ComprasService, esConflictoDeButacas } from '../../core/compras.service';
import { MapaButacas } from '../../shared/mapa-butacas/mapa-butacas';
import { ResumenCompra } from '../../shared/resumen-compra/resumen-compra';
import { SelectorProductos } from '../../shared/selector-productos/selector-productos';
import { FormularioPago } from '../../shared/formulario-pago/formulario-pago';
import type { DatosPago } from '../../shared/formulario-pago/formulario-pago';
import { ComprobanteCompra } from '../../shared/comprobante-compra/comprobante-compra';
import { PrecioArsPipe } from '../../core/pipes/precio-ars.pipe';
import { armarFilas } from '../../core/utils/mapa-sala';
import { calcularPrecios, calcularTotales } from '../../core/utils/precios';
import type { ProductoElegido } from '../../core/utils/precios';
import { textoDia, textoHora } from '../../core/utils/fechas';
import { mensajeError } from '../../core/utils/errores';
import { validarContiguas } from '../../core/validators/butacas-contiguas';
import type { Butaca, CambioOcupacion } from '../../core/models/butaca.model';
import type { Comprobante } from '../../core/models/compra.model';
import type { FuncionAdmin } from '../../core/models/funcion.model';

type Paso = 'elegir' | 'resumen' | 'confirmada';

// compra de entradas de una funcion, de punta a punta (rf-04, rf-11, rf-14, rf-18, rf-20 a rf-23, rf-36):
// elegir butacas con ocupacion en tiempo real -> resumen, productos y pago simulado -> comprobante.
// la pagina orquesta: carga datos, escucha realtime y guarda el estado. el dibujo lo hacen los componentes de shared
@Component({
  selector: 'app-funcion-mapa',
  imports: [
    RouterLink, MapaButacas, ResumenCompra, SelectorProductos, FormularioPago, ComprobanteCompra, PrecioArsPipe,
  ],
  templateUrl: './funcion-mapa.html',
  styleUrl: './funcion-mapa.css',
})
export class FuncionMapa {
  private readonly auth = inject(AuthService);
  private readonly funcionesService = inject(FuncionesService);
  private readonly butacasService = inject(ButacasService);
  private readonly ocupacionService = inject(OcupacionService);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly productosService = inject(ProductosService);
  private readonly comprasService = inject(ComprasService);

  // llega desde la ruta /funcion/:id (withComponentInputBinding)
  readonly id = input.required<string>();
  private readonly funcionId = computed(() => Number(this.id()));

  protected readonly funcion = signal<FuncionAdmin | null>(null);
  protected readonly butacas = signal<Butaca[]>([]);
  // los conjuntos se reemplazan por uno nuevo en cada cambio: asi los signals detectan la modificacion
  protected readonly ocupadas = signal<ReadonlySet<number>>(new Set());
  protected readonly seleccionadas = signal<ReadonlySet<number>>(new Set());
  // cantidades de productos del candy bar: { idProducto: cantidad }
  protected readonly cantidades = signal<Record<number, number>>({});

  protected readonly paso = signal<Paso>('elegir');
  protected readonly comprobante = signal<Comprobante | null>(null);
  protected readonly pagando = signal(false);
  protected readonly errorPago = signal<string | null>(null);

  // parametros del negocio (tabla configuracion). replican la cuenta de la rpc: la base los vuelve a aplicar
  protected readonly recargoVipPct = signal(0);
  protected readonly primeraCompraPct = signal(0);
  protected readonly puntosPorPeso = signal(0);

  protected readonly cargando = signal(true);
  protected readonly enVivo = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly aviso = signal<string | null>(null);

  protected readonly productosDisponibles = this.productosService.activos;

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

  // restriccion de edad de la pelicula (rf-11) y fecha de nacimiento del perfil, si hay sesion
  protected readonly restriccion = computed(() => this.funcion()?.pelicula?.restriccion_edad ?? 0);
  protected readonly fechaPerfil = computed(() => this.auth.perfil()?.fecha_nacimiento ?? null);

  // cupon de primera compra (rf-30): solo usuarios registrados que todavia no lo usaron
  protected readonly descuentoPct = computed(() => {
    const perfil = this.auth.perfil();
    return perfil !== null && !perfil.primera_compra_usada ? this.primeraCompraPct() : 0;
  });

  // precio de las butacas (rf-20, rn-17) y total de la compra (rf-22). son estimaciones: el servidor las recalcula
  protected readonly desglose = computed(() =>
    calcularPrecios(this.seleccion(), this.etiquetaDe(), this.funcion()?.precio_base ?? 0, this.recargoVipPct()),
  );

  protected readonly productosElegidos = computed<ProductoElegido[]>(() => {
    const cantidades = this.cantidades();
    return this.productosService
      .activos()
      .filter((p) => (cantidades[p.id] ?? 0) > 0)
      .map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio, cantidad: cantidades[p.id] }));
  });

  // los puntos solo los acumulan los usuarios registrados
  protected readonly totales = computed(() =>
    calcularTotales(
      this.desglose(),
      this.productosElegidos(),
      this.descuentoPct(),
      this.auth.perfil() ? this.puntosPorPeso() : 0,
    ),
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

  protected limpiar(): void {
    this.aviso.set(null);
    this.seleccionadas.set(new Set());
  }

  // paso al resumen: solo si el validador lo permite
  protected continuar(): void {
    if (!this.puedeContinuar()) return;
    this.aviso.set(null);
    this.errorPago.set(null);
    this.paso.set('resumen');
  }

  protected volverAElegir(): void {
    this.paso.set('elegir');
  }

  // pago simulado + confirmacion atomica en la base (rf-22, rf-23)
  protected async pagar(datos: DatosPago): Promise<void> {
    const funcion = this.funcion();
    if (!funcion || this.pagando()) return;

    this.pagando.set(true);
    this.errorPago.set(null);
    try {
      // el pago es simulado: una pausa breve y nada mas. no se cobra ni se guarda ningun dato de tarjeta
      await new Promise((resolver) => setTimeout(resolver, 700));
      const comprobante = await this.comprasService.confirmar({
        funcionId: funcion.id,
        butacaIds: this.seleccion().map((b) => b.id),
        productos: this.productosElegidos().map((p) => ({ producto_id: p.id, cantidad: p.cantidad })),
        fechaNacimiento: datos.fechaNacimiento,
        medioPago: datos.medioPago,
      });
      this.comprobante.set(comprobante);
      this.seleccionadas.set(new Set());
      this.paso.set('confirmada');
      // se refresca el perfil: los puntos cambiaron y el cupon de primera compra ya esta usado
      void this.auth.cargarPerfil(this.auth.session()?.user.id);
    } catch (e) {
      const mensaje = mensajeError(e);
      if (esConflictoDeButacas(mensaje)) {
        // alguien se adelanto con alguna butaca: se vuelve al mapa a elegir otras
        this.aviso.set(mensaje);
        this.paso.set('elegir');
        void this.recargarOcupadas(funcion.id);
      } else {
        this.errorPago.set(mensaje);
      }
    } finally {
      this.pagando.set(false);
    }
  }

  // despues de una compra: se vuelve al mapa con todo limpio
  protected nuevaCompra(): void {
    const funcion = this.funcion();
    this.comprobante.set(null);
    this.cantidades.set({});
    this.seleccionadas.set(new Set());
    this.errorPago.set(null);
    this.aviso.set(null);
    this.paso.set('elegir');
    if (funcion) void this.recargarOcupadas(funcion.id);
  }

  private reiniciar(): void {
    this.funcion.set(null);
    this.butacas.set([]);
    this.ocupadas.set(new Set());
    this.seleccionadas.set(new Set());
    this.cantidades.set({});
    this.comprobante.set(null);
    this.paso.set('elegir');
    this.error.set(null);
    this.errorPago.set(null);
    this.aviso.set(null);
    this.pagando.set(false);
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
      // los productos son opcionales: si no cargan, se puede comprar igual solo las entradas
      void this.productosService.cargarProductos().catch(() => undefined);

      const [butacas, ocupadas, recargo, primera, puntos] = await Promise.all([
        this.butacasService.deSala(funcion.sala_id),
        this.ocupacionService.cargar(funcionId),
        this.configuracion.valorDe('recargo_vip_pct'),
        this.configuracion.valorDe('primera_compra_pct'),
        this.configuracion.valorDe('puntos_por_peso'),
      ]);
      if (this.funcionId() !== funcionId) return;
      this.funcion.set(funcion);
      this.butacas.set(butacas);
      this.ocupadas.set(new Set(ocupadas));
      this.recargoVipPct.set(recargo);
      this.primeraCompraPct.set(primera);
      this.puntosPorPeso.set(puntos);
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
  // si estabas en el resumen se vuelve al mapa: tu seleccion cambio y el total ya no corresponde.
  // mientras se esta pagando no se hace nada: el aviso en vivo de TU propia compra puede llegar antes
  // que la respuesta de la rpc, y si hubo un conflicto real la rpc lo informa
  private quitarSiEstabaElegida(butacaId: number): void {
    if (this.pagando() || !this.seleccionadas().has(butacaId)) return;
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