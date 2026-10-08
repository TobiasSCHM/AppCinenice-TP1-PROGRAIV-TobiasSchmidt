import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    // primer acceso con oauth: si el cliente no completo sus datos, se lo lleva a completarlos (rf-03).
    // admin y empleado quedan afuera porque sus cuentas las crea la institucion
    effect(() => {
      const perfil = this.auth.perfil();
      const pendiente = perfil !== null && perfil.rol === 'cliente' && !perfil.perfil_completo;
      if (pendiente && !this.router.url.startsWith('/completar-perfil')) {
        void this.router.navigateByUrl('/completar-perfil');
      }
    });
  }

  protected async salir(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
