import { Pipe, PipeTransform } from '@angular/core';

// convierte minutos en texto legible: 135 -> '2 h 15 min'
@Pipe({ name: 'duracion' })
export class DuracionPipe implements PipeTransform {
  transform(minutos: number | null | undefined): string {
    if (minutos == null || minutos <= 0) return '';
    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    if (horas === 0) return `${resto} min`;
    if (resto === 0) return `${horas} h`;
    return `${horas} h ${resto} min`;
  }
}
