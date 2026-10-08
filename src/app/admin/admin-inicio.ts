import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-inicio',
  imports: [RouterLink],
  template: `
    <h1>Administración</h1>
    <div class="tarjeta">
      <p>Elegí una sección. Por ahora está disponible la gestión de <a routerLink="/admin/peliculas">películas</a>.</p>
    </div>
  `,
})
export class AdminInicio {}
