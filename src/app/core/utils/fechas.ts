// parsea 'yyyy-mm-dd' sin usar new Date(texto): esa forma interpreta utc y puede correr un dia
// devuelve null si el formato es invalido o la fecha no existe (ej: 31/02)
export function parsearFechaIso(valor: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return null;
  const anio = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  const fecha = new Date(anio, mes - 1, dia);
  const existe = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
  return existe ? fecha : null;
}

// edad en anios cumplidos a una fecha dada (por defecto hoy)
export function calcularEdad(nacimiento: Date, hoy: Date = new Date()): number {
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumplio =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumplio) edad--;
  return edad;
}

export function fechasDeRecurrencia(dias: number[], hora: string, semanas: number, ahora: Date = new Date()): Date[] {
  const [anio, mes, dia] = claveDia(ahora.toISOString()).split('-').map(Number);
  const resultado: Date[] = [];
  for (let i = 0; i < semanas * 7; i++) {
    // se trabaja al mediodia utc para que sumar dias nunca cambie de fecha por zona horaria
    const d = new Date(Date.UTC(anio, mes - 1, dia + i, 12));
    const iso = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // js: 0 = domingo
    if (!dias.includes(iso)) continue;
    const fecha = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    const inicio = new Date(`${fecha}T${hora}:00-03:00`);
    if (inicio.getTime() > ahora.getTime()) resultado.push(inicio);
  }
  return resultado;
}

// las funciones se guardan en timestamptz (utc) y se muestran siempre en hora argentina
export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

const formatoDia = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: ZONA_HORARIA,
});
const formatoHora = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit', minute: '2-digit', hour12: false, timeZone: ZONA_HORARIA,
});

const formatoClave = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA });

export const textoDia = (iso: string): string => formatoDia.format(new Date(iso));
export const textoHora = (iso: string): string => formatoHora.format(new Date(iso));
export const claveDia = (iso: string): string => formatoClave.format(new Date(iso));