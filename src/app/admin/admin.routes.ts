import { Routes } from '@angular/router';
import { AdminLayout } from './admin-layout';
import { AdminInicio } from './admin-inicio';
import { PeliculasLista } from './peliculas/peliculas-lista';
import { PeliculaForm } from './peliculas/pelicula-form';
import { SalasLista } from './salas/salas-lista';

// modulo lazy: solo se descarga si el rol es admin (ver canmatch en app.routes.ts)
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', component: AdminInicio },
      { path: 'peliculas', component: PeliculasLista },
      { path: 'peliculas/nueva', component: PeliculaForm },
      { path: 'peliculas/:id/editar', component: PeliculaForm },
      { path: 'salas', component: SalasLista },
    ],
  },
];
