// roles del sistema. coinciden con el enum rol_usuario de postgres
export type Rol = 'cliente' | 'empleado' | 'admin';

// una fila de la tabla perfiles (ver migracion 001)
export interface Perfil {
  id: string;
  email: string | null;
  nombre: string | null;
  apellido: string | null;
  fecha_nacimiento: string | null; // formato yyyy-mm-dd
  tipo_sangre: string | null;
  color_ojos: string | null;
  dias_vacaciones: number | null;
  rol: Rol;
  puntos: number;
  credito: number;
  perfil_completo: boolean;
  primera_compra_usada: boolean;
}
