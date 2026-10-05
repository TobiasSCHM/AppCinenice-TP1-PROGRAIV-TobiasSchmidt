-- migracion 001: tipos, tablas y restricciones del modelo de datos del cine
-- ejecutar una sola vez, en orden, desde supabase > sql editor

create extension if not exists btree_gist; -- necesaria para el exclude de funciones (sala = + rango &&)

-- tipos enumerados
create type public.rol_usuario        as enum ('cliente', 'empleado', 'admin');
create type public.formato_proyeccion as enum ('2D', '3D', '4D', '5D');
create type public.idioma_proyeccion  as enum ('castellano', 'subtitulada');
create type public.tipo_butaca        as enum ('comun', 'accesible', 'vip');
create type public.estado_compra      as enum ('confirmada', 'cancelada');

-- configuracion editable por el admin: nada de esto va escrito en el codigo
create table public.configuracion (
  clave       text primary key,
  valor       numeric not null,
  descripcion text not null
);

-- perfiles: una fila por usuario de auth.users (la crea un trigger, ver migracion 002)
create table public.perfiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  email                 text,
  nombre                text,
  apellido              text,
  fecha_nacimiento      date,
  tipo_sangre           text,
  color_ojos            text,
  dias_vacaciones       integer check (dias_vacaciones between 0 and 365),
  rol                   public.rol_usuario not null default 'cliente',
  puntos                integer not null default 0 check (puntos >= 0),
  credito               numeric(12,2) not null default 0 check (credito >= 0),
  perfil_completo       boolean not null default false,
  primera_compra_usada  boolean not null default false,
  creado_en             timestamptz not null default now()
);

-- peliculas y generos (n:m)
create table public.generos (
  id     bigint generated always as identity primary key,
  nombre text not null unique
);

create table public.peliculas (
  id                bigint generated always as identity primary key,
  nombre            text not null check (length(trim(nombre)) > 0),
  sinopsis          text not null check (length(trim(sinopsis)) > 0),
  duracion_min      integer not null check (duracion_min between 1 and 600),
  imagen_url        text not null,
  restriccion_edad  smallint not null default 0 check (restriccion_edad in (0, 13, 18)),
  visible_portada   boolean not null default true,
  fecha_estreno     date,                              -- para proximamente y preventa
  preventa_activa   boolean not null default false,
  creada_en         timestamptz not null default now()
);

create table public.peliculas_generos (
  pelicula_id bigint not null references public.peliculas (id) on delete cascade,
  genero_id   bigint not null references public.generos (id) on delete cascade,
  primary key (pelicula_id, genero_id)
);

-- salas y butacas
create table public.salas (
  id     bigint generated always as identity primary key,
  nombre text not null unique
);

-- fila_orden ordena las filas fisicamente (la accesible 'J/K' queda entre la I y la L)
-- bloque: 1 = izquierda, 2 = centro, 3 = derecha. numero cuenta dentro del bloque
create table public.butacas (
  id         bigint generated always as identity primary key,
  sala_id    bigint not null references public.salas (id) on delete cascade,
  fila       text not null,
  fila_orden smallint not null,
  bloque     smallint not null check (bloque between 1 and 3),
  numero     smallint not null check (numero >= 1),
  tipo       public.tipo_butaca not null,
  unique (sala_id, fila_orden, bloque, numero)
);

-- funciones: fin y ocupada_hasta las calcula un trigger (migracion 002)
-- ocupada_hasta = fin + margen de 30 min. el exclude impide que dos funciones se pisen en una sala
-- (red de seguridad en la base: aunque falle la logica de asignacion, postgres rechaza el solapamiento)
create table public.funciones (
  id             bigint generated always as identity primary key,
  pelicula_id    bigint not null references public.peliculas (id) on delete restrict,
  sala_id        bigint not null references public.salas (id) on delete restrict,
  inicio         timestamptz not null,
  fin            timestamptz not null,
  ocupada_hasta  timestamptz not null,
  formato        public.formato_proyeccion not null,
  idioma         public.idioma_proyeccion not null,
  precio_base    numeric(10,2) not null check (precio_base >= 0),
  creada_por     uuid references auth.users (id) on delete set null,
  creada_en      timestamptz not null default now(),
  check (fin > inicio),
  check (ocupada_hasta >= fin),
  constraint funciones_sin_solapamiento
    exclude using gist (sala_id with =, tstzrange(inicio, ocupada_hasta) with &&)
);
create index funciones_pelicula_inicio_idx on public.funciones (pelicula_id, inicio);

-- candy bar
create table public.categorias_producto (
  id     bigint generated always as identity primary key,
  nombre text not null unique
);

create table public.productos (
  id           bigint generated always as identity primary key,
  categoria_id bigint not null references public.categorias_producto (id) on delete restrict,
  nombre       text not null,
  descripcion  text,
  precio       numeric(10,2) not null check (precio >= 0),
  imagen_url   text,
  activo       boolean not null default true
);

create table public.combos (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  descripcion text,
  precio      numeric(10,2) not null check (precio >= 0),
  destacado   boolean not null default false,
  activo      boolean not null default true
);

create table public.combos_items (
  combo_id    bigint not null references public.combos (id) on delete cascade,
  producto_id bigint not null references public.productos (id) on delete restrict,
  cantidad    integer not null default 1 check (cantidad > 0),
  primary key (combo_id, producto_id)
);

-- cupones creados por el admin (ej: solo mayores de 50). el de primera compra sale de configuracion
create table public.cupones (
  id          bigint generated always as identity primary key,
  codigo      text not null unique,
  descripcion text,
  porcentaje  numeric(5,2) not null check (porcentaje > 0 and porcentaje <= 100),
  edad_minima smallint check (edad_minima >= 0),     -- null = sin restriccion de edad
  activo      boolean not null default true
);

-- compras. el qr es uno por compra (rn-11) con dos usos independientes: ingreso y retiro (rn-13)
-- usuario_id es null en compras anonimas
create table public.compras (
  id                        uuid primary key default gen_random_uuid(),
  qr_codigo                 uuid not null unique default gen_random_uuid(),
  usuario_id                uuid references auth.users (id) on delete set null,
  email_contacto            text,
  fecha_nacimiento_declarada date,
  funcion_id                bigint not null references public.funciones (id) on delete restrict,
  estado                    public.estado_compra not null default 'confirmada',
  tiene_productos           boolean not null default false,
  subtotal_entradas         numeric(12,2) not null default 0,
  recargo_vip               numeric(12,2) not null default 0,
  descuento                 numeric(12,2) not null default 0,
  total_productos           numeric(12,2) not null default 0,
  credito_usado             numeric(12,2) not null default 0,
  total_pagado              numeric(12,2) not null default 0,
  puntos_ganados            integer not null default 0,
  cupon_id                  bigint references public.cupones (id) on delete set null,
  ingreso_usado_en          timestamptz,
  retiro_usado_en           timestamptz,
  creada_en                 timestamptz not null default now(),
  cancelada_en              timestamptz
);
create index compras_usuario_idx on public.compras (usuario_id);
create index compras_funcion_idx on public.compras (funcion_id);

create table public.entradas (
  id         bigint generated always as identity primary key,
  compra_id  uuid not null references public.compras (id) on delete cascade,
  funcion_id bigint not null references public.funciones (id) on delete restrict,
  butaca_id  bigint not null references public.butacas (id) on delete restrict,
  precio     numeric(10,2) not null,
  unique (compra_id, butaca_id)
);

-- ocupacion de butacas por funcion. es la tabla que escucha realtime.
-- la primary key es la defensa final contra dos compras de la misma butaca (la base decide, realtime es solo visual)
-- al cancelar una compra se borran sus filas y la butaca queda libre
create table public.ocupaciones (
  funcion_id bigint not null references public.funciones (id) on delete cascade,
  butaca_id  bigint not null references public.butacas (id) on delete restrict,
  primary key (funcion_id, butaca_id)
);

-- productos o combos comprados junto con la entrada: exactamente uno de los dos por fila
create table public.compra_items (
  id              bigint generated always as identity primary key,
  compra_id       uuid not null references public.compras (id) on delete cascade,
  producto_id     bigint references public.productos (id) on delete restrict,
  combo_id        bigint references public.combos (id) on delete restrict,
  cantidad        integer not null check (cantidad > 0),
  precio_unitario numeric(10,2) not null,
  check ((producto_id is null) <> (combo_id is null))
);

-- un usuario usa cada cupon una sola vez
create table public.cupones_usos (
  cupon_id   bigint not null references public.cupones (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  compra_id  uuid references public.compras (id) on delete set null,
  usado_en   timestamptz not null default now(),
  primary key (cupon_id, usuario_id)
);

-- fidelizacion
create table public.recompensas (
  id            bigint generated always as identity primary key,
  nombre        text not null,
  tipo          text not null check (tipo in ('entrada', 'producto')),
  producto_id   bigint references public.productos (id) on delete restrict,
  costo_puntos  integer not null check (costo_puntos > 0),
  activa        boolean not null default true
);

create table public.puntos_movimientos (
  id             bigint generated always as identity primary key,
  usuario_id     uuid not null references auth.users (id) on delete cascade,
  tipo           text not null check (tipo in ('ganado', 'canje', 'reversion')),
  puntos         integer not null,                    -- positivo suma, negativo resta
  compra_id      uuid references public.compras (id) on delete set null,
  recompensa_id  bigint references public.recompensas (id) on delete set null,
  creado_en      timestamptz not null default now()
);
create index puntos_mov_usuario_idx on public.puntos_movimientos (usuario_id);

create table public.creditos_movimientos (
  id          bigint generated always as identity primary key,
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  monto       numeric(12,2) not null,                 -- positivo acredita, negativo consume
  motivo      text not null,
  compra_id   uuid references public.compras (id) on delete set null,
  creado_en   timestamptz not null default now()
);
create index creditos_mov_usuario_idx on public.creditos_movimientos (usuario_id);

-- resenas: una por usuario y pelicula (rn-23). quien puede resenar lo controla rls (migracion 003)
create table public.resenas (
  id           bigint generated always as identity primary key,
  usuario_id   uuid not null references auth.users (id) on delete cascade,
  pelicula_id  bigint not null references public.peliculas (id) on delete cascade,
  estrellas    smallint not null check (estrellas between 1 and 5),
  comentario   text check (char_length(comentario) <= 280),
  creada_en    timestamptz not null default now(),
  unique (usuario_id, pelicula_id)
);

-- alertas de estreno (roadmap: el modelo queda previsto)
create table public.alertas_estreno (
  usuario_id  uuid not null references auth.users (id) on delete cascade,
  pelicula_id bigint not null references public.peliculas (id) on delete cascade,
  creada_en   timestamptz not null default now(),
  primary key (usuario_id, pelicula_id)
);

-- registro de actividad (rn-26)
create table public.activity_log (
  id          bigint generated always as identity primary key,
  usuario_id  uuid,
  accion      text not null,
  entidad     text not null,
  entidad_id  text,
  detalle     jsonb,
  creado_en   timestamptz not null default now()
);
create index activity_log_creado_idx on public.activity_log (creado_en desc);
