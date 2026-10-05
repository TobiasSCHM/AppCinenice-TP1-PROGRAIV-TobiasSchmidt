import { Routes } from '@angular/router';
import { adminGuard, empleadoGuard, guestGuard } from './core/guards/auth.guard';
import { Cartelera } from './pages/cartelera/cartelera';
import { Login } from './pages/login/login';

export const routes: Routes = [
  // rutas publicas: la compra anonima no exige sesion (rf-04)
  { path: '', pathMatch: 'full', component: Cartelera },
  { path: 'login', component: Login, canActivate: [guestGuard] },

  // modulos lazy protegidos por rol con canmatch
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

  { path: '**', redirectTo: '' },
];
