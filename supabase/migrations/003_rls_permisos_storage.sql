-- migracion 003: row level security, permisos, realtime y storage

-- 1) rls activado en todas las tablas
do $$
declare t text;
begin
  foreach t in array array[
    'configuracion','perfiles','generos','peliculas','peliculas_generos','salas','butacas','funciones',
    'categorias_producto','productos','combos','combos_items','cupones','compras','entradas','ocupaciones',
    'compra_items','cupones_usos','recompensas','puntos_movimientos','creditos_movimientos','resenas',
    'alertas_estreno','activity_log'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 2) permisos a nivel tabla: se parte de cero y se otorga solo lo necesario.
-- (rls filtra filas; estos grants filtran columnas y operaciones)
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;

-- tablas que el admin escribe directo desde el cliente (rls limita a es_admin)
grant insert, update, delete on
  public.configuracion, public.generos, public.peliculas, public.peliculas_generos, public.salas,
  public.butacas, public.funciones, public.categorias_producto, public.productos, public.combos,
  public.combos_items, public.cupones, public.recompensas
to authenticated;

-- tablas del usuario
grant insert, update, delete on public.resenas, public.alertas_estreno to authenticated;

-- perfiles: el usuario solo puede editar sus datos personales. NO rol, puntos, credito ni flags de cupon
grant update (nombre, apellido, fecha_nacimiento, tipo_sangre, color_ojos, dias_vacaciones, perfil_completo)
  on public.perfiles to authenticated;

-- compras, entradas, ocupaciones, puntos, credito y log NO tienen escritura directa:
-- solo se modifican desde funciones rpc security definer (compra atomica, validar qr, cancelar)

-- 3) politicas
-- lectura publica de la cartelera y del catalogo
do $$
declare t text;
begin
  foreach t in array array[
    'configuracion','generos','peliculas','peliculas_generos','salas','butacas','funciones',
    'categorias_producto','productos','combos','combos_items','recompensas','ocupaciones','resenas'
  ] loop
    execute format('create policy "lectura publica" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- el admin gestiona todo el catalogo
do $$
declare t text;
begin
  foreach t in array array[
    'configuracion','generos','peliculas','peliculas_generos','salas','butacas','funciones',
    'categorias_producto','productos','combos','combos_items','cupones','recompensas'
  ] loop
    execute format(
      'create policy "admin gestiona" on public.%I for all to authenticated using (public.es_admin()) with check (public.es_admin())', t);
  end loop;
end $$;

-- perfiles
create policy "perfil propio o admin" on public.perfiles for select to authenticated
  using (id = auth.uid() or public.es_admin());
create policy "editar perfil propio" on public.perfiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- compras y sus detalles: cada usuario ve solo lo suyo; el admin ve todo
create policy "compras propias" on public.compras for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());
create policy "entradas propias" on public.entradas for select to authenticated
  using (public.es_admin() or exists (select 1 from public.compras c where c.id = compra_id and c.usuario_id = auth.uid()));
create policy "items propios" on public.compra_items for select to authenticated
  using (public.es_admin() or exists (select 1 from public.compras c where c.id = compra_id and c.usuario_id = auth.uid()));

-- fidelizacion
create policy "puntos propios" on public.puntos_movimientos for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());
create policy "credito propio" on public.creditos_movimientos for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());
create policy "usos de cupon propios" on public.cupones_usos for select to authenticated
  using (usuario_id = auth.uid() or public.es_admin());

-- resenas: lectura publica (arriba). escribir solo si vio la pelicula, y solo las propias
create policy "resenar si la vio" on public.resenas for insert to authenticated
  with check (usuario_id = auth.uid() and public.puede_resenar(pelicula_id));
create policy "editar resena propia" on public.resenas for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "borrar resena propia o admin" on public.resenas for delete to authenticated
  using (usuario_id = auth.uid() or public.es_admin());

-- alertas: solo las propias
create policy "alertas propias" on public.alertas_estreno for all to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());

-- log: solo lo lee el admin
create policy "log solo admin" on public.activity_log for select to authenticated
  using (public.es_admin());

-- 4) realtime: el mapa de butacas escucha la tabla ocupaciones
alter table public.ocupaciones replica identity full;
alter publication supabase_realtime add table public.ocupaciones;

-- 5) storage: buckets publicos de lectura, escritura solo del admin
insert into storage.buckets (id, name, public) values
  ('posters', 'posters', true),
  ('productos', 'productos', true)
on conflict (id) do nothing;

create policy "storage lectura publica" on storage.objects for select
  using (bucket_id in ('posters', 'productos'));
create policy "storage admin sube" on storage.objects for insert to authenticated
  with check (bucket_id in ('posters', 'productos') and public.es_admin());
create policy "storage admin edita" on storage.objects for update to authenticated
  using (bucket_id in ('posters', 'productos') and public.es_admin());
create policy "storage admin borra" on storage.objects for delete to authenticated
  using (bucket_id in ('posters', 'productos') and public.es_admin());
