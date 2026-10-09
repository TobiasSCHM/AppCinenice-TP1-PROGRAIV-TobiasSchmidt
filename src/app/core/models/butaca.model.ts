// tipos de butaca: coinciden con el enum tipo_butaca de postgres
export type TipoButaca = 'comun' | 'accesible' | 'vip';

// estado de una butaca para quien la mira. 'ocupada' viene de la tabla ocupaciones;
// 'seleccionada' existe solo en el navegador de quien esta eligiendo
export type EstadoButaca = 'libre' | 'ocupada' | 'seleccionada';

// una fila de la tabla butacas
export interface Butaca {
  id: number;
  sala_id: number;
  fila: string; // 'A'..'I', 'J/K' (la accesible), 'L'..'T'
  fila_orden: number; // orden fisico en la sala: 1 a 19
  bloque: number; // 1 = izquierda, 2 = centro, 3 = derecha
  numero: number; // dentro del bloque, desde 1
  tipo: TipoButaca;
}

// butaca lista para dibujar: suma el nombre que ve el usuario (ej: 'A-5')
export interface ButacaMapa extends Butaca {
  etiqueta: string;
}

// una fila del mapa con sus tres bloques separados por pasillos
export interface FilaMapa {
  fila: string;
  filaOrden: number;
  tipo: TipoButaca;
  bloques: ButacaMapa[][]; // siempre 3 arreglos: izquierda, centro y derecha
}

// un cambio de ocupacion que llega por realtime
export interface CambioOcupacion {
  tipo: 'ocupada' | 'liberada';
  butacaId: number;
}