import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PrecioArsPipe } from '../../core/pipes/precio-ars.pipe';
import { EdadPipe } from '../../core/pipes/edad.pipe';
import { fechaNacimientoValida } from '../../core/validators/fecha-nacimiento-reactivo';
import { RestrictEdad } from '../restrict-edad.directive';
import type { MedioPago } from '../../core/models/compra.model';

// lo unico que sale del formulario: el medio elegido y la fecha declarada.
// los datos de la tarjeta se validan aca y no se guardan ni se envian (pago simulado)
export interface DatosPago {
  medioPago: MedioPago;
  fechaNacimiento: string | null;
}

type CampoValidable = 'titular' | 'numero' | 'vencimiento' | 'cvv' | 'fechaNacimiento';

// formulario de pago simulado (rf-22). es un formulario reactivo con Validators estandar
// (required, minLength, pattern) y el validador personalizado de fecha de nacimiento
@Component({
  selector: 'app-formulario-pago',
  imports: [ReactiveFormsModule, PrecioArsPipe, EdadPipe, RestrictEdad],
  templateUrl: './formulario-pago.html',
  styleUrl: './formulario-pago.css',
})
export class FormularioPago implements OnChanges {
  private readonly fb = inject(NonNullableFormBuilder);

  @Input() restriccion = 0; // restriccion de edad de la pelicula: 0, 13 o 18
  @Input() fechaPerfil: string | null = null; // fecha de nacimiento del perfil, si hay sesion
  @Input() total = 0;
  @Input() pagando = false;
  @Input() errorPago: string | null = null;
  @Output() pagar = new EventEmitter<DatosPago>();

  protected readonly formulario = this.fb.group({
    medio: this.fb.control<MedioPago>('tarjeta_credito', Validators.required),
    titular: ['', [Validators.required, Validators.minLength(3)]],
    numero: ['', [Validators.required, Validators.pattern(/^(\d{4} ?){3}\d{4}$/)]],
    vencimiento: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
    fechaNacimiento: ['', [fechaNacimientoValida]],
  });

  // el medio elegido como signal, para usarlo en el @switch de la plantilla
  protected readonly medio = toSignal(this.formulario.controls.medio.valueChanges, {
    initialValue: this.formulario.controls.medio.value,
  });

  constructor() {
    this.formulario.controls.medio.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((medio) => this.ajustarTarjeta(medio));
  }

  ngOnChanges(): void {
    this.ajustarFecha();
  }

  // la fecha solo se pide a quien no la tiene en su perfil y compra una pelicula con restriccion
  get necesitaFecha(): boolean {
    return this.restriccion > 0 && !this.fechaPerfil;
  }

  // la fecha con la que se evalua la edad: la del perfil o la que escribe el comprador
  get fechaEfectiva(): string | null {
    return this.fechaPerfil || this.formulario.controls.fechaNacimiento.value || null;
  }

  // la fecha es obligatoria solo cuando hace falta
  private ajustarFecha(): void {
    const control = this.formulario.controls.fechaNacimiento;
    control.setValidators(
      this.necesitaFecha ? [Validators.required, fechaNacimientoValida] : [fechaNacimientoValida],
    );
    control.updateValueAndValidity({ emitEvent: false });
  }

  // con transferencia los campos de tarjeta no aplican: un control deshabilitado no entra en la validacion
  private ajustarTarjeta(medio: MedioPago): void {
    const { titular, numero, vencimiento, cvv } = this.formulario.controls;
    for (const control of [titular, numero, vencimiento, cvv]) {
      if (medio === 'transferencia') control.disable({ emitEvent: false });
      else control.enable({ emitEvent: false });
    }
  }

  protected invalido(nombre: CampoValidable): boolean {
    const control = this.formulario.controls[nombre];
    return control.invalid && (control.touched || control.dirty);
  }

  protected mensajeFecha(): string {
    const errores = this.formulario.controls.fechaNacimiento.errors;
    if (errores?.['required']) return 'Informá tu fecha de nacimiento.';
    const personalizado = errores?.['fechaNacimiento'];
    return typeof personalizado === 'string' ? personalizado : 'La fecha no es válida.';
  }

  protected enviar(): void {
    this.formulario.markAllAsTouched();
    if (this.formulario.invalid) return;
    const valores = this.formulario.getRawValue();
    this.pagar.emit({
      medioPago: valores.medio,
      fechaNacimiento: this.necesitaFecha ? valores.fechaNacimiento : null,
    });
  }
}