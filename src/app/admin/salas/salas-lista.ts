import { Component, inject, signal } from '@angular/core';
import { SalasService } from '../../core/salas.service';
import { mensajeError } from '../../core/utils/errores';
import type { Sala } from '../../core/models/sala.model';

const LARGO_MAXIMO_NOMBRE = 40;

// altas, bajas y modificaciones de salas (rf-15). todas las salas tienen la misma forma (rn-02):
// la distribucion de 518 butacas la genera la base al crearlas, no se edita a mano
@Component({
  selector: 'app-salas-lista',
  templateUrl: './salas-lista.html',
  styleUrl: './salas-lista.css',
})
export class SalasLista {
  protected readonly service = inject(SalasService);

  protected readonly nombre = signal('');
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.service
      .cargar()
      .catch((e) => this.error.set(`No se pudieron cargar las salas: ${mensajeError(e)}`))
      .finally(() => this.cargando.set(false));
  }

  protected async crear(): Promise<void> {
    const nombre = this.nombre().trim();
    // un solo campo: la validacion se hace a mano, sin armar un formulario completo
    if (!nombre) {
      this.error.set('Ponele un nombre a la sala.');
      return;
    }
    if (nombre.length > LARGO_MAXIMO_NOMBRE) {
      this.error.set(`El nombre no puede superar los ${LARGO_MAXIMO_NOMBRE} caracteres.`);
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.service.crear(nombre);
      this.nombre.set('');
    } catch (e) {
      this.error.set(mensajeError(e));
    } finally {
      this.guardando.set(false);
    }
  }

  protected async renombrar(sala: Sala): Promise<void> {
    const nuevo = prompt('Nuevo nombre de la sala', sala.nombre)?.trim();
    if (!nuevo || nuevo === sala.nombre) return;
    this.error.set(null);
    try {
      await this.service.renombrar(sala.id, nuevo);
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }

  protected async eliminar(sala: Sala): Promise<void> {
    if (!confirm(`¿Eliminar la "${sala.nombre}"? Se borran también sus butacas.`)) return;
    this.error.set(null);
    try {
      await this.service.eliminar(sala.id);
    } catch (e) {
      this.error.set(mensajeError(e));
    }
  }
}