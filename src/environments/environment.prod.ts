// entorno de produccion (reemplaza a environment.ts en el build, ver fileReplacements en angular.json). la anon key es publica por diseno: la seguridad real la da rls.
// nunca poner aca la clave service_role.
export const environment = {
  production: true,
  supabaseUrl: 'https://cabwrffyqsolsziptrht.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhYndyZmZ5cXNvbHN6aXB0cmh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwNTgzMzYsImV4cCI6MjEwNjYzNDMzNn0.7Vvbp6CmnCqGRSromzQ7n-80HZGznZrPR4s8E8SwVUc',
};
