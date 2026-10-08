import { Component, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, required, maxLength, min, max, validate, FormField, FormRoot } from '@angular/forms/signals';
import { AuthService } from '../../core/auth.service';
import { COLORES_OJOS, DatosPerfil, TIPOS_SANGRE } from '../../core/models/perfil.model';
import { validarFechaNacimiento } from '../../core/validators/fecha-nacimiento';
import { EdadPipe } from '../../core/pipes/edad.pipe';
import { ErroresCampo } from '../../shared/errores-campo';
import { mensajeError } from '../../core/utils/errores';

interface BorradorPerfil {
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number | null;
}

// primer acceso con oauth: el proveedor no entrega todos los datos del rf-01, se piden aca
@Component({
  selector: 'app-completar-perfil',
  imports: [FormField, FormRoot, ErroresCampo, EdadPipe],
  templateUrl: './completar-perfil.html',
})
export class CompletarPerfil {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly tiposSangre = TIPOS_SANGRE;
  protected readonly coloresOjos = COLORES_OJOS;

  protected readonly borrador = signal<BorradorPerfil>({
    nombre: '', apellido: '', fecha_nacimiento: '', tipo_sangre: '', color_ojos: '', dias_vacaciones: null,
  });
  protected readonly guardando = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);

  protected readonly formulario = form(
    this.borrador,
    (f) => {
      required(f.nombre, { message: 'El nombre es obligatorio.' });
      maxLength(f.nombre, 60, { message: 'Máximo 60 caracteres.' });
      required(f.apellido, { message: 'El apellido es obligatorio.' });
      maxLength(f.apellido, 60, { message: 'Máximo 60 caracteres.' });
      required(f.fecha_nacimiento, { message: 'La fecha de nacimiento es obligatoria.' });
      validate(f.fecha_nacimiento, validarFechaNacimiento);
      required(f.tipo_sangre, { message: 'Elegí tu tipo de sangre.' });
      required(f.color_ojos, { message: 'Elegí el color de ojos.' });
      required(f.dias_vacaciones, { message: 'Indicá tus días de vacaciones.' });
      min(f.dias_vacaciones, 0, { message: 'No puede ser negativo.' });
      max(f.dias_vacaciones, 365, { message: 'Máximo 365 días.' });
    },
    {
      submission: {
        action: async () => {
          this.guardando.set(true);
          this.errorEnvio.set(null);
          try {
            const b = this.borrador();
            const datos: DatosPerfil = {
              nombre: b.nombre.trim(),
              apellido: b.apellido.trim(),
              fecha_nacimiento: b.fecha_nacimiento,
              tipo_sangre: b.tipo_sangre,
              color_ojos: b.color_ojos,
              dias_vacaciones: b.dias_vacaciones ?? 0,
            };
            await this.auth.completarPerfil(datos);
            await this.router.navigateByUrl('/');
          } catch (error) {
            this.errorEnvio.set(`No se pudo guardar el perfil: ${mensajeError(error)}`);
          } finally {
            this.guardando.set(false);
          }
        },
      },
    },
  );

  constructor() {
    // precarga el nombre que haya entregado el proveedor (una sola vez, sin pisar lo que el usuario ya escribio)
    effect(() => {
      const perfil = this.auth.perfil();
      if (perfil?.nombre && !this.borrador().nombre) {
        this.borrador.update((b) => ({ ...b, nombre: perfil.nombre ?? '' }));
      }
    });
  }
}
