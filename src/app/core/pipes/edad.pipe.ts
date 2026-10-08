import { Pipe, PipeTransform } from '@angular/core';
import { calcularEdad, parsearFechaIso } from '../utils/fechas';

// calcula la edad a partir de una fecha 'yyyy-mm-dd'. devuelve null si no es una fecha valida
@Pipe({ name: 'edad' })
export class EdadPipe implements PipeTransform {
  transform(fecha: string | null | undefined): number | null {
    if (!fecha) return null;
    const f = parsearFechaIso(fecha);
    return f ? calcularEdad(f) : null;
  }
}
