import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import type { Rol } from '../models/perfil.model';

// exige sesion; si no hay, manda a /login
export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.esperarPerfil();
  return auth.session() ? true : router.parseUrl('/login');
};

// solo para invitados (ej: /login). si ya hay sesion, manda al inicio
export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.esperarPerfil();
  return auth.session() ? router.parseUrl('/') : true;
};

// fabrica de guards por rol. se usa con canMatch para que el codigo lazy
// de /admin y /empleado ni siquiera se descargue si el rol no corresponde (rnf-13)
function rolGuard(permitidos: Rol[]): CanMatchFn {
  return async () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    await auth.esperarPerfil();
    if (!auth.session()) return router.parseUrl('/login');
    const rol = auth.rol();
    return rol !== null && permitidos.includes(rol) ? true : router.parseUrl('/');
  };
}

export const adminGuard = rolGuard(['admin']);
// el admin tambien puede entrar al modulo de empleado (util para la demo)
export const empleadoGuard = rolGuard(['empleado', 'admin']);
