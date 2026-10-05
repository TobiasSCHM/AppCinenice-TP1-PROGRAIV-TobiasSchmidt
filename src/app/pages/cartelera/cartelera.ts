import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';

// placeholder del dia 1: confirma que sesion y rol llegan bien. el listado real es el lunes (rf-12, rf-13)
@Component({
  selector: 'app-cartelera',
  templateUrl: './cartelera.html',
})
export class Cartelera {
  protected readonly auth = inject(AuthService);
}
