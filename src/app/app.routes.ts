import { Routes } from '@angular/router';
import { adminGuard, authGuard, empleadoGuard, guestGuard } from './core/guards/auth.guard';
import { Cartelera } from './pages/cartelera/cartelera';
import { PeliculaDetalle } from './pages/pelicula-detalle/pelicula-detalle';
import { FuncionMapa } from './pages/funcion-mapa/funcion-mapa';
import { Login } from './pages/login/login';
import { Registro } from './pages/registro/registro';
import { CompletarPerfil } from './pages/completar-perfil/completar-perfil';

export const routes: Routes = [
  // rutas publicas: la compra anonima no exige sesion (rf-04)
  { path: '', pathMatch: 'full', component: Cartelera },
  { path: 'pelicula/:id', component: PeliculaDetalle },
  { path: 'funcion/:id', component: FuncionMapa },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'registro', component: Registro, canActivate: [guestGuard] },
  { path: 'completar-perfil', component: CompletarPerfil, canActivate: [authGuard] },

  // modulos lazy protegidos por rol con canmatch: el codigo no se descarga si el rol no corresponde
  {
    path: 'admin',
    canMatch: [adminGuard],
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  {
    path: 'empleado',
    canMatch: [empleadoGuard],
    loadChildren: () => import('./empleado/empleado.routes').then((m) => m.EMPLEADO_ROUTES),
  },

  // cualquier direccion desconocida vuelve al inicio (siempre al final)
  { path: '**', redirectTo: '' },
];