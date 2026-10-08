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

// los datos personales que se piden en el registro (rf-01) y al completar el perfil de oauth (rf-03)
export interface DatosPerfil {
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number;
}

export const TIPOS_SANGRE = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'] as const;
export const COLORES_OJOS = ['Marrones', 'Negros', 'Azules', 'Verdes', 'Grises', 'Avellana'] as const;
