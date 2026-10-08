import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { form, required, email, FormField, FormRoot } from '@angular/forms/signals';
import { AuthService } from '../../core/auth.service';
import { ErroresCampo } from '../../shared/errores-campo';
import { mensajeError } from '../../core/utils/errores';

// login con correo (rf-02) y con google (rf-03)
@Component({
  selector: 'app-login',
  imports: [FormField, FormRoot, RouterLink, ErroresCampo],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly borrador = signal({ email: '', password: '' });
  protected readonly cargando = signal(false);
  protected readonly errorEnvio = signal<string | null>(null);

  protected readonly formulario = form(
    this.borrador,
    (f) => {
      required(f.email, { message: 'Ingresá tu correo.' });
      email(f.email, { message: 'Ingresá un correo válido.' });
      required(f.password, { message: 'Ingresá tu contraseña.' });
    },
    {
      submission: {
        action: async () => {
          this.cargando.set(true);
          this.errorEnvio.set(null);
          try {
            const b = this.borrador();
            const { error } = await this.auth.loginConCorreo(b.email.trim(), b.password);
            if (error) {
              // mensaje generico: no se indica cual dato fallo (rf-02)
              this.errorEnvio.set('Correo o contraseña incorrectos.');
              return;
            }
            // se espera al perfil para saber el rol y llevar a cada usuario a su pantalla
            await this.auth.esperarPerfil();
            await this.router.navigateByUrl(this.auth.rutaInicio());
          } finally {
            this.cargando.set(false);
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
