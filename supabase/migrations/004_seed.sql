-- migracion 004: datos iniciales y de demo
-- las funciones demo y la compra de ejemplo se cargan mas adelante (necesitan la rpc de asignacion y de compra)

insert into public.configuracion (clave, valor, descripcion) values
  ('primera_compra_pct',   20, 'descuento % del cupon de primera compra (rn-09)'),
  ('recargo_vip_pct',      50, 'recargo % sobre el precio base en butacas vip (rn-17)'),
  ('preventa_descuento_pct', 20, 'descuento % de la preventa (rn-25)'),
  ('margen_funciones_min', 30, 'minutos de separacion entre funciones de una misma sala (rn-04)'),
  ('cancelacion_horas',     2, 'horas minimas antes de la funcion para poder cancelar (rn-18)'),
  ('puntos_por_peso',       1, 'puntos acreditados por cada peso gastado (rn-20)');

-- 3 salas, cada una con sus 518 butacas
insert into public.salas (nombre) values ('Sala 1'), ('Sala 2'), ('Sala 3');
select public.generar_butacas(id) from public.salas;

-- control: tiene que dar 518 por sala. si falla, el seed se corta
do $$
begin
  if exists (
    select 1 from public.salas s
    where (select count(*) from public.butacas b where b.sala_id = s.id) <> 518
  ) then
    raise exception 'alguna sala no tiene 518 butacas';
  end if;
end $$;

insert into public.generos (nombre) values
  ('Accion'), ('Comedia'), ('Drama'), ('Terror'), ('Ciencia ficcion'), ('Animacion'), ('Aventura');

-- peliculas ficticias de demo. los posters son placeholders hasta subir los reales a storage
insert into public.peliculas (nombre, sinopsis, duracion_min, imagen_url, restriccion_edad, visible_portada, fecha_estreno) values
  ('La Ultima Funcion',   'Un proyeccionista descubre una pelicula que nadie recuerda haber filmado.', 118, 'https://placehold.co/400x600/1a1722/e8b04a?text=La+Ultima+Funcion', 0,  true, current_date - 30),
  ('Noche de Neon',       'Una persecucion a toda velocidad por una ciudad que nunca duerme.',          105, 'https://placehold.co/400x600/1a1722/e8b04a?text=Noche+de+Neon',     13, true, current_date - 20),
  ('El Faro Dormido',     'Una familia llega a un faro abandonado y las luces se encienden solas.',     98,  'https://placehold.co/400x600/1a1722/e8b04a?text=El+Faro+Dormido',   18, true, current_date - 10),
  ('Risas en Pijama',     'Cuatro amigos, una casa y un fin de semana que sale mal.',                   92,  'https://placehold.co/400x600/1a1722/e8b04a?text=Risas+en+Pijama',   0,  true, current_date - 15),
  ('Mas Alla del Cinturon','Una tripulacion cruza el cinturon de asteroides con combustible de menos.', 134, 'https://placehold.co/400x600/1a1722/e8b04a?text=Mas+Alla',          13, true, current_date - 5),
  ('Pequenos Gigantes',   'Un grupo de criaturas diminutas defiende su bosque de una topadora.',        88,  'https://placehold.co/400x600/1a1722/e8b04a?text=Pequenos+Gigantes', 0,  true, current_date - 25);

insert into public.peliculas_generos (pelicula_id, genero_id)
select p.id, g.id
from (values
  ('La Ultima Funcion','Drama'), ('Noche de Neon','Accion'), ('El Faro Dormido','Terror'),
  ('Risas en Pijama','Comedia'), ('Mas Alla del Cinturon','Ciencia ficcion'), ('Mas Alla del Cinturon','Aventura'),
  ('Pequenos Gigantes','Animacion'), ('Pequenos Gigantes','Aventura')
) as v(pelicula, genero)
join public.peliculas p on p.nombre = v.pelicula
join public.generos g on g.nombre = v.genero;

-- candy bar demo
insert into public.categorias_producto (nombre) values ('Pochoclos'), ('Bebidas'), ('Golosinas');

insert into public.productos (categoria_id, nombre, descripcion, precio)
select c.id, v.nombre, v.descripcion, v.precio
from (values
  ('Pochoclos', 'Pochoclo chico',  'Salado o dulce', 4500),
  ('Pochoclos', 'Pochoclo grande', 'Salado o dulce', 7500),
  ('Bebidas',   'Gaseosa 500 ml',  'Linea cola',     3500),
  ('Bebidas',   'Agua mineral',    '500 ml',         2500),
  ('Golosinas', 'Chocolate',       'Barra 50 g',     2800)
) as v(categoria, nombre, descripcion, precio)
join public.categorias_producto c on c.nombre = v.categoria;

-- recompensas del canje de puntos (rf-33): el ejemplo del cliente. costos editables por el admin
insert into public.recompensas (nombre, tipo, costo_puntos) values ('Entrada gratis', 'entrada', 500);
insert into public.recompensas (nombre, tipo, producto_id, costo_puntos)
select 'Pochoclo grande', 'producto', id, 150 from public.productos where nombre = 'Pochoclo grande';

-- cupon demo para mayores de 50 (rf-31)
insert into public.cupones (codigo, descripcion, porcentaje, edad_minima)
values ('MAYORES50', 'Descuento para mayores de 50 anos', 30, 51);
