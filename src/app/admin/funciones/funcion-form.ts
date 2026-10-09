import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PeliculasService } from '../../core/peliculas.service';
import { SalasService } from '../../core/salas.service';
import { FuncionesService } from '../../core/funciones.service';
import { DuracionPipe } from '../../core/pipes/duracion.pipe';
import { fechasDeRecurrencia, textoDia, textoHora } from '../../core/utils/fechas';
import { mensajeError } from '../../core/utils/errores';
import { errorSeparacion, primeraSalaLibre } from '../../core/validators/separacion-funciones';
import type { FormatoProyeccion, IdiomaProyeccion } from '../../core/models/funcion.model';

// de 10:00 a 23:30 cada 30 minutos: chips en vez de un selector de hora (rnf-02)
const HORAS: string[] = Array.from({ length: 28 }, (_, i) => {
  const minutos = 10 * 60 + i * 30;
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
});

// numeracion iso: la misma que usa la funcion sql crear_funciones_recurrentes
const DIAS = [
  { n: 1, corto: 'Lun' }, { n: 2, corto: 'Mar' }, { n: 3, corto: 'Mié' }, { n: 4, corto: 'Jue' },
  { n: 5, corto: 'Vie' }, { n: 6, corto: 'Sáb' }, { n: 7, corto: 'Dom' },
];

interface FilaPrevia {
  iso: string;
  inicio: Date;
  salaId: number | null;
  salaNombre: string | null;
}

// programacion de funciones (rf-09, rf-16, rf-17). todos los campos son chips o toggles, por eso el estado
// va en signals sueltos y la validacion en computed, sin armar un formulario de signal forms
@Component({
  selector: 'app-funcion-form',
  imports: [RouterLink, DuracionPipe],
  templateUrl: './funcion-form.html',
  styleUrl: './funcion-form.css',
})
export class FuncionForm {
  protected readonly peliculasService = inject(PeliculasService);
  private readonly salasService = inject(SalasService);
  private readonly funcionesService = inject(FuncionesService);
  private readonly router = inject(Router);

  protected readonly horas = HORAS;
  protected readonly dias = DIAS;
  protected readonly opcionesSemanas = [1, 2, 4, 8];
  protected readonly formatos: FormatoProyeccion[] = ['2D', '3D', '4D', '5D'];
  protected readonly idiomas: { valor: IdiomaProyeccion; etiqueta: string }[] = [
    { valor: 'castellano', etiqueta: 'Castellano' },
    { valor: 'subtitulada', etiqueta: 'Subtitulada' },
  ];

  // estado del formulario
  protected readonly peliculaId = signal<number | null>(null);
  protected readonly diasElegidos = signal<number[]>([]);
  protected readonly hora = signal('20:00');
  protected readonly semanas = signal(2);
  protected readonly formato = signal<FormatoProyeccion>('2D');
  protected readonly idioma = signal<IdiomaProyeccion>('castellano');
  protected readonly precio = signal('6000');

  protected readonly margen = signal(30);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly intentado = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);

  protected readonly peliculaElegida = computed(
    () => this.peliculasService.peliculas().find((p) => p.id === this.peliculaId()) ?? null,
  );

  protected readonly precioNumero = computed(() => {
    const texto = this.precio().trim().replace(',', '.');
    const numero = Number(texto);
    return texto !== '' && Number.isFinite(numero) && numero >= 0 ? numero : null;
  });

  // errores de los campos: solo se muestran despues del primer intento de guardar
  protected readonly erroresCampos = computed(() => {
    const errores: string[] = [];
    if (this.peliculaId() === null) errores.push('Elegí una película.');
    if (this.diasElegidos().length === 0) errores.push('Elegí al menos un día de la semana.');
    if (this.precioNumero() === null) errores.push('Ingresá un precio válido (0 o más).');
    return errores;
  });

  // vista previa: para cada fecha de la recurrencia, que sala le tocaria (o ninguna)
  protected readonly vistaPrevia = computed<FilaPrevia[]>(() => {
    const pelicula = this.peliculaElegida();
    if (!pelicula || this.diasElegidos().length === 0) return [];
    const salas = this.salasService.salas();
    const salaIds = salas.map((s) => s.id);
    const ocupados = this.funcionesService.proximas();
    return fechasDeRecurrencia(this.diasElegidos(), this.hora(), this.semanas()).map((inicio) => {
      const salaId = primeraSalaLibre(inicio, pelicula.duracion_min, this.margen(), salaIds, ocupados);
      return {
        iso: inicio.toISOString(),
        inicio,
        salaId,
        salaNombre: salas.find((s) => s.id === salaId)?.nombre ?? null,
      };
    });
  });

  // validador de separacion minima (rn-04): mensaje claro si alguna fecha no tiene sala
  protected readonly errorSala = computed(() =>
    errorSeparacion(
      this.vistaPrevia().filter((f) => f.salaId === null).map((f) => f.inicio),
      this.margen(),
    ),
  );

  protected readonly puedeGuardar = computed(
    () => !this.guardando() && this.vistaPrevia().length > 0 && this.errorSala() === null,
  );

  // se exponen a la plantilla
  protected readonly dia = (iso: string) => textoDia(iso);
  protected readonly horaDe = (iso: string) => textoHora(iso);

  constructor() {
    Promise.all([
      this.peliculasService.cargar(),
      this.salasService.cargar(),
      this.funcionesService.cargarProximas(),
      this.funcionesService.margenMinutos().then((m) => this.margen.set(m)),
    ])
      .catch((e) => this.errorEnvio.set(`No se pudieron cargar los datos: ${mensajeError(e)}`))
      .finally(() => this.cargando.set(false));
  }

  protected elegirPelicula(valor: string): void {
    this.peliculaId.set(valor ? Number(valor) : null);
  }

  protected alternarDia(n: number): void {
    this.diasElegidos.update((ds) => (ds.includes(n) ? ds.filter((x) => x !== n) : [...ds, n].sort()));
  }

  protected async guardar(): Promise<void> {
    this.intentado.set(true);
    this.errorEnvio.set(null);
    if (this.erroresCampos().length > 0) return;
    if (this.vistaPrevia().length === 0) {
      this.errorEnvio.set('Todas las fechas elegidas ya pasaron. Elegí otros días u otra hora.');
      return;
    }
    if (!this.puedeGuardar()) return;

    this.guardando.set(true);
    try {
      await this.funcionesService.crearRecurrentes({
        peliculaId: this.peliculaId()!,
        dias: this.diasElegidos(),
        hora: this.hora(),
        semanas: this.semanas(),
        formato: this.formato(),
        idioma: this.idioma(),
        precio: this.precioNumero()!,
      });
      await this.router.navigateByUrl('/admin/funciones');
    } catch (e) {
      this.errorEnvio.set(mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }
}