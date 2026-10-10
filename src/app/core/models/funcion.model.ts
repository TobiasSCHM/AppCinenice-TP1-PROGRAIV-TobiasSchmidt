export type FormatoProyeccion = '2D' | '3D' | '4D' | '5D';
export type IdiomaProyeccion = 'castellano' | 'subtitulada';

// una funcion tal como se muestra en el detalle de pelicula
export interface Funcion {
  id: number;
  pelicula_id: number;
  inicio: string; // timestamptz en iso
  formato: FormatoProyeccion;
  idioma: IdiomaProyeccion;
  precio_base: number;
  sala: { nombre: string } | null;
}

// version completa para el admin: suma la sala, el rango ocupado y la pelicula (nombre y restriccion de edad)
export interface FuncionAdmin extends Funcion {
  sala_id: number;
  fin: string;
  ocupada_hasta: string; // fin + margen de 30 minutos
  pelicula: { nombre: string; restriccion_edad?: number } | null;
}

// lo que se envia a la rpc crear_funciones_recurrentes
export interface DatosRecurrencia {
  peliculaId: number;
  dias: number[]; // iso: 1 = lunes ... 7 = domingo
  hora: string; // 'hh:mm' en hora argentina
  semanas: number;
  formato: FormatoProyeccion;
  idioma: IdiomaProyeccion;
  precio: number;
}