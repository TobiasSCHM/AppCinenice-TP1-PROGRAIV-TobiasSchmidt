export interface Funcion {
  id: number;
  pelicula_id: number;
  inicio: string; // timestamptz en iso
  formato: '2D' | '3D' | '4D' | '5D';
  idioma: 'castellano' | 'subtitulada';
  precio_base: number;
  sala: { nombre: string } | null;
}