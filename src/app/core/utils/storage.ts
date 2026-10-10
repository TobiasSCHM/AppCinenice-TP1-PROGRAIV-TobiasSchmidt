import { supabase } from '../supabase.client';

// sube una imagen a un bucket publico de supabase storage y devuelve su url publica.
// el nombre lleva un uuid para no pisar archivos ni mostrar versiones viejas desde la cache
export async function subirImagenPublica(bucket: string, archivo: File): Promise<string> {
  const nombreSeguro =
    archivo.name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9._-]+/g, '-')
      .replace(/^[.-]+|[.-]+$/g, '')
      .slice(0, 100) || 'imagen';
  const ruta = `${crypto.randomUUID()}-${nombreSeguro}`;
  const { error } = await supabase.storage.from(bucket).upload(ruta, archivo);
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(ruta).data.publicUrl;
}