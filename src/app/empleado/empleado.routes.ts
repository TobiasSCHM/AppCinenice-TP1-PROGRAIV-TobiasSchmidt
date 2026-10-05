import { Routes } from '@angular/router';
import { Validador } from './validador';

// modulo lazy para empleados (validacion de qr, el sabado 10/10)
export const EMPLEADO_ROUTES: Routes = [{ path: '', component: Validador }];
