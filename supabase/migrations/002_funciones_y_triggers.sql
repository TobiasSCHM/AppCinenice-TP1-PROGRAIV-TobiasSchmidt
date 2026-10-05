-- migracion 002: funciones auxiliares, triggers y generador de butacas

-- helpers de rol. security definer: leen perfiles sin pasar por rls (evita recursion en las politicas)
create or replace function public.es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

create or replace function public.es_empleado() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol in ('empleado', 'admin'));
$$;

-- crea el perfil al registrarse. el rol SIEMPRE es cliente: se ignora cualquier rol enviado en la metadata
create or replace function public.crear_perfil_al_registrarse() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_nombre    text  := coalesce(nullif(meta->>'nombre', ''), nullif(meta->>'full_name', ''), nullif(meta->>'name', ''));
  v_apellido  text  := nullif(meta->>'apellido', '');
  v_nacim     date  := nullif(meta->>'fecha_nacimiento', '')::date;
  v_sangre    text  := nullif(meta->>'tipo_sangre', '');
  v_ojos      text  := nullif(meta->>'color_ojos', '');
  v_vacac     integer := nullif(meta->>'dias_vacaciones', '')::integer;
begin
  insert into public.perfiles
    (id, email, nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, dias_vacaciones, perfil_completo)
  values
    (new.id, new.email, v_nombre, v_apellido, v_nacim, v_sangre, v_ojos, v_vacac,
     -- completo solo si llegaron los 7 datos (registro con correo). en oauth se completa en el primer acceso
     (new.email is not null and v_nombre is not null and v_apellido is not null and v_nacim is not null
      and v_sangre is not null and v_ojos is not null and v_vacac is not null));
  return new;
end;
$$;

create trigger crear_perfil_al_registrarse
  after insert on auth.users
  for each row execute function public.crear_perfil_al_registrarse();

-- calcula fin y ocupada_hasta de una funcion a partir de la duracion de la pelicula y el margen configurado
create or replace function public.calcular_fin_funcion() returns trigger
language plpgsql set search_path = public as $$
declare
  v_duracion integer;
  v_margen   numeric;
begin
  select duracion_min into v_duracion from public.peliculas where id = new.pelicula_id;
  select valor into v_margen from public.configuracion where clave = 'margen_funciones_min';
  new.fin           := new.inicio + make_interval(mins => v_duracion);
  new.ocupada_hasta := new.fin + make_interval(mins => coalesce(v_margen, 30)::integer);
  return new;
end;
$$;

create trigger calcular_fin_funcion
  before insert or update of pelicula_id, inicio on public.funciones
  for each row execute function public.calcular_fin_funcion();

-- genera las 518 butacas de una sala (rn-02, rn-03)
-- 18 filas comunes de 4+20+4 (504) + 1 fila accesible 'J/K' de 2+10+2 (14). filas r, s y t son vip
create or replace function public.generar_butacas(p_sala bigint) returns integer
language plpgsql set search_path = public as $$
declare
  v_total integer;
begin
  if exists (select 1 from public.butacas where sala_id = p_sala) then
    raise exception 'la sala % ya tiene butacas', p_sala;
  end if;

  insert into public.butacas (sala_id, fila, fila_orden, bloque, numero, tipo)
  with letras(orden, etiqueta) as (
    values (1,'A'),(2,'B'),(3,'C'),(4,'D'),(5,'E'),(6,'F'),(7,'G'),(8,'H'),(9,'I'),
           (10,'J/K'),
           (11,'L'),(12,'M'),(13,'N'),(14,'O'),(15,'P'),(16,'Q'),(17,'R'),(18,'S'),(19,'T')
  ),
  filas as (
    select orden, etiqueta,
      case when etiqueta = 'J/K' then 'accesible'
           when etiqueta in ('R','S','T') then 'vip'
           else 'comun' end as tipo,
      case when etiqueta = 'J/K' then array[2,10,2] else array[4,20,4] end as tam
    from letras
  )
  select p_sala, f.etiqueta, f.orden::smallint, b::smallint, n::smallint, f.tipo::public.tipo_butaca
  from filas f
  cross join generate_series(1, 3) as b
  cross join lateral generate_series(1, f.tam[b]) as n;

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

-- registro de actividad. solo la llaman otras funciones security definer, nunca el cliente (se revoca abajo)
create or replace function public.registrar_actividad(p_accion text, p_entidad text, p_entidad_id text, p_detalle jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.activity_log (usuario_id, accion, entidad, entidad_id, detalle)
  values (auth.uid(), p_accion, p_entidad, p_entidad_id, p_detalle);
$$;
revoke execute on function public.registrar_actividad(text, text, text, jsonb) from public, anon, authenticated;

-- log: creacion de funciones
create or replace function public.log_funcion_creada() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.registrar_actividad('funcion_creada', 'funciones', new.id::text,
    jsonb_build_object('pelicula_id', new.pelicula_id, 'sala_id', new.sala_id, 'inicio', new.inicio));
  return new;
end;
$$;
create trigger log_funcion_creada after insert on public.funciones
  for each row execute function public.log_funcion_creada();

-- log: cambios de precio. los argumentos del trigger son: columna, columna id, nombre de la accion
create or replace function public.log_cambio_precio() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_viejo text := to_jsonb(old)->>tg_argv[0];
  v_nuevo text := to_jsonb(new)->>tg_argv[0];
begin
  if v_viejo is distinct from v_nuevo then
    perform public.registrar_actividad(tg_argv[2], tg_table_name, to_jsonb(new)->>tg_argv[1],
      jsonb_build_object('antes', v_viejo, 'despues', v_nuevo));
  end if;
  return new;
end;
$$;
create trigger log_precio_producto  after update on public.productos
  for each row execute function public.log_cambio_precio('precio', 'id', 'precio_modificado');
create trigger log_precio_combo     after update on public.combos
  for each row execute function public.log_cambio_precio('precio', 'id', 'precio_modificado');
create trigger log_precio_funcion   after update on public.funciones
  for each row execute function public.log_cambio_precio('precio_base', 'id', 'precio_modificado');
create trigger log_config_valor     after update on public.configuracion
  for each row execute function public.log_cambio_precio('valor', 'clave', 'configuracion_modificada');

-- puede resenar quien tenga el ingreso validado en una funcion de esa pelicula (rn-23)
create or replace function public.puede_resenar(p_pelicula bigint) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.compras c
    join public.funciones f on f.id = c.funcion_id
    where c.usuario_id = auth.uid()
      and c.estado = 'confirmada'
      and c.ingreso_usado_en is not null
      and f.pelicula_id = p_pelicula
  );
$$;
