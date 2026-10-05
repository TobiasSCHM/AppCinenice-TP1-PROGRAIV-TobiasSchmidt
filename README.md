# Cinenice

TP1 Programacion IV (UTN FRA, comision 141) - Sistema de venta de entradas y Candy Bar.
Autor: Tobias Schmidt. Angular 22 + Supabase (auth, postgres, realtime, storage).

## Como correrlo

```bash
npm install
npm start          # http://localhost:4200
```

Base de datos: ejecutar en orden, desde Supabase > SQL Editor, los archivos de `supabase/migrations/` (001 a 004).

Usuarios de prueba: crearlos en Supabase > Authentication > Users > Add user (marcar "Auto confirm user"),
y luego asignar el rol con sql:

```sql
update public.perfiles set rol = 'admin'    where email = 'admin@cinenice.test';
update public.perfiles set rol = 'empleado' where email = 'empleado@cinenice.test';
```

## Arquitectura (resumen)

- `src/app/core`: cliente de supabase, `AuthService` (sesion y perfil como signals), guards (`authGuard`, `guestGuard`, `adminGuard`, `empleadoGuard`).
- `src/app/pages`: pantallas publicas. `src/app/admin` y `src/app/empleado`: modulos lazy protegidos por rol.
- `supabase/migrations`: modelo de datos, funciones, triggers, rls y seed. La logica critica vive en postgres.

## Registro de decisiones

### 03/10 - dia 1
- La logica de negocio critica (asignacion de sala, compra atomica, validacion de qr, permisos) va en postgres: menos codigo en angular y una sola fuente de verdad.
- Los guards de rol usan `canMatch` y no `canActivate`: asi el codigo lazy de /admin y /empleado ni se descarga si el rol no corresponde (rnf-13).
- Perfiles: el rol siempre nace como `cliente` (el trigger ignora cualquier rol de la metadata). Los usuarios solo pueden editar sus datos personales por permisos a nivel columna; rol, puntos y credito solo cambian por funciones de servidor.
- Solapamiento de funciones: `exclude using gist` sobre (sala, rango inicio..fin+30min). `fin` y `ocupada_hasta` los calcula un trigger a partir de la duracion de la pelicula.
- Un solo qr por compra (`compras.qr_codigo`) con dos usos independientes: `ingreso_usado_en` y `retiro_usado_en` (rn-13).
- Butacas: fila accesible `J/K` ubicada entre la I y la L (`fila_orden` 10). 18 filas comunes + 1 accesible = 518 por sala.
- Ocupacion de butacas en una tabla propia (`ocupaciones`) con primary key (funcion, butaca): la base decide, realtime solo avisa.
- Valores configurables (cupon de primera compra, recargo vip, preventa, margen de 30 min, horas de cancelacion, puntos por peso) en la tabla `configuracion`.
- Rutas de consulta y compra publicas (compra anonima, rf-04).
