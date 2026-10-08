import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  form, required, minLength, maxLength, min, max, email, validate, FormField, FormRoot,
} from '@angular/forms/signals';
import { AuthService } from '../../core/auth.service';
import { COLORES_OJOS, TIPOS_SANGRE } from '../../core/models/perfil.model';
import { validarFechaNacimiento } from '../../core/validators/fecha-nacimiento';
import { EdadPipe } from '../../core/pipes/edad.pipe';
import { ErroresCampo } from '../../shared/errores-campo';
import { mensajeError } from '../../core/utils/errores';

// modelo del formulario: los 7 datos de rf-01 mas la contrasena
interface BorradorRegistro {
  email: string;
  password: string;
  confirmar: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number | null;
}

@Component({
  selector: 'app-registro',
  imports: [FormField, FormRoot, RouterLink, ErroresCampo, EdadPipe],
  templateUrl: './registro.html',
})
export class Registro {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly tiposSangre = TIPOS_SANGRE;
  protected readonly coloresOjos = COLORES_OJOS;

  protected readonly borrador = signal<BorradorRegistro>({
    email: '', password: '', confirmar: '', nombre: '', apellido: '',
    fecha_nacimiento: '', tipo_sangre: '', color_ojos: '', dias_vacaciones: null,
  });
  protected readonly guardando = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);
  protected readonly revisarCorreo = signal(false);

  protected readonly formulario = form(
    this.borrador,
    (f) => {
      required(f.email, { message: 'El correo es obligatorio.' });
      email(f.email, { message: 'Ingresá un correo válido.' });

      required(f.password, { message: 'La contraseña es obligatoria.' });
      minLength(f.password, 8, { message: 'Mínimo 8 caracteres.' });

      required(f.confirmar, { message: 'Repetí la contraseña.' });
      // validador entre campos: compara con la contrasena
      validate(f.confirmar, ({ value, valueOf }) =>
        value() === valueOf(f.password) ? null : { kind: 'noCoincide', message: 'Las contraseñas no coinciden.' },
      );

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
            const { data, error } = await this.auth.registrar(b.email.trim(), b.password, {
              nombre: b.nombre.trim(),
              apellido: b.apellido.trim(),
              fecha_nacimiento: b.fecha_nacimiento,
              tipo_sangre: b.tipo_sangre,
              color_ojos: b.color_ojos,
              dias_vacaciones: b.dias_vacaciones ?? 0,
            });
            if (error) {
              this.errorEnvio.set(`No se pudo crear la cuenta: ${mensajeError(error)}`);
              return;
            }
            // si el proyecto exige confirmar el correo, no hay sesion todavia
            if (!data.session) {
              this.revisarCorreo.set(true);
              return;
            }
            await this.auth.esperarPerfil();
            await this.router.navigateByUrl('/');
          } finally {
            this.guardando.set(false);
          }
        },
      },
    },
  );

  protected async conGoogle(): Promise<void> {
    const { error } = await this.auth.loginConProveedor('google');
    if (error) this.errorEnvio.set(`No se pudo iniciar con Google: ${mensajeError(error)}`);
  }
}
