import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

// layout del panel admin con navegacion lateral (rnf-01). los enlaces se suman a medida que hay secciones
@Component({
  selector: 'app-admin-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="admin">
      <aside class="admin-lateral">
        <h2>Panel</h2>
        <a routerLink="/admin" routerLinkActive="activo" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
      </aside>
      <section class="admin-contenido"><router-outlet /></section>
    </div>
  `,
  styles: `
    .admin { display: grid; gap: var(--espacio-4); }
    .admin-lateral { display: flex; flex-wrap: wrap; align-items: center; gap: var(--espacio-2); }
    .admin-lateral h2 { margin: 0 var(--espacio-3) 0 0; }
    .admin-lateral a { padding: var(--espacio-2) var(--espacio-3); border-radius: var(--radio);
      color: var(--color-texto-suave); text-decoration: none; }
    .admin-lateral a.activo { background: var(--color-superficie-2); color: var(--color-acento); }
    @media (min-width: 800px) {
      .admin { grid-template-columns: 220px 1fr; }
      .admin-lateral { flex-direction: column; align-items: stretch; align-self: start; }
    }
  `,
})
export class AdminLayout {}
