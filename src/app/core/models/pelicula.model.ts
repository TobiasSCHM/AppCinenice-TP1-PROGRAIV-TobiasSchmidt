export interface Genero {
  id: number;
  nombre: string;
}

export type RestriccionEdad = 0 | 13 | 18;

// una pelicula con sus generos ya resueltos (la relacion n:m se aplana al leer)
export interface Pelicula {
  id: number;
  nombre: string;
  sinopsis: string;
  duracion_min: number;
  imagen_url: string;
  restriccion_edad: RestriccionEdad;
  visible_portada: boolean;
  generos: Genero[];
}

// lo que edita el admin en el formulario. imagen y generos se manejan aparte
export interface PeliculaDraft {
  nombre: string;
  sinopsis: string;
  duracion_min: number | null;
  restriccion_edad: RestriccionEdad;
  visible_portada: boolean;
}

// una fila de la vista peliculas_mas_vendidas (migracion 005)
export interface VentasPelicula {
  pelicula_id: number;
  entradas_vendidas: number;
}

export const OPCIONES_EDAD: { valor: RestriccionEdad; etiqueta: string }[] = [
  { valor: 0, etiqueta: 'Apta para todo público' },
  { valor: 13, etiqueta: '+13' },
  { valor: 18, etiqueta: '+18' },
];