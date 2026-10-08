// convierte cualquier error (los de supabase no son instancias de error) en un texto legible
export function mensajeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const detalle = 'details' in error && typeof error.details === 'string' ? error.details : '';
    const pista = 'hint' in error && typeof error.hint === 'string' ? error.hint : '';
    return [error.message, detalle, pista].filter(Boolean).join(' ');
  }
  return 'Error desconocido.';
}
