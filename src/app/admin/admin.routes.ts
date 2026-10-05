import { Routes } from '@angular/router';
import { AdminLayout } from './admin-layout';
import { AdminInicio } from './admin-inicio';

// modulo lazy: solo se descarga si el rol es admin (ver canmatch en app.routes.ts)
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [{ path: '', component: AdminInicio }],
  },
];
