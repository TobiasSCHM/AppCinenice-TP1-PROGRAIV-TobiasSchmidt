import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

// login minimo con correo para poder probar roles hoy.
// el domingo se reemplaza por signal forms con validaciones, registro y google (rf-01, rf-02, rf-03)
@Component({
  selector: 'app-login',
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly cargando = signal(false);

  protected async ingresar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    const { error } = await this.auth.loginConCorreo(this.email(), this.password());
    this.cargando.set(false);
    if (error) {
      // mensaje generico: no se indica cual dato fallo (rf-02)
      this.error.set('Correo o contrasena incorrectos.');
      return;
    }
    await this.router.navigateByUrl('/');
  }
}
