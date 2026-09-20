create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('blusas', 'shorts', 'vestidos', 'outras')),
  image_url text not null,
  price numeric(10, 2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;

drop policy if exists "Public can view active products" on public.products;
create policy "Public can view active products"
on public.products for select
to anon, authenticated
using (active = true);

drop policy if exists "Authenticated users can insert products" on public.products;
create policy "Authenticated users can insert products"
on public.products for insert
to authenticated
with check (true);

drop policy if exists "Authenticated users can update products" on public.products;
create policy "Authenticated users can update products"
on public.products for update
to authenticated
using (true)
with check (true);

drop policy if exists "Authenticated users can delete products" on public.products;
create policy "Authenticated users can delete products"
on public.products for delete
to authenticated
using (true);

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Authenticated users can upload product images" on storage.objects;
create policy "Authenticated users can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'products');

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'products');

drop policy if exists "Authenticated users can update product images" on storage.objects;
create policy "Authenticated users can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'products')
with check (bucket_id = 'products');

drop policy if exists "Authenticated users can delete product images" on storage.objects;
create policy "Authenticated users can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'products');

insert into public.products (name, category, image_url)
select seed.name, seed.category, seed.image_url
from (values
  ('Cropped Corset', 'blusas', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/cropped-corset.jpeg'),
  ('Regata Contrast', 'blusas', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/regata-preta.jpeg'),
  ('Cropped Rosa', 'blusas', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/cropped-rosa.jpeg'),
  ('Cropped Regata', 'blusas', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/cropped-regata.jpeg'),
  ('Camiseta Gráfica', 'blusas', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/camiseta-grafica.jpeg'),
  ('Regata Básica', 'blusas', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/regata-preta-basica.jpeg'),
  ('Short Jeans', 'shorts', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/short-jeans.jpeg'),
  ('Short Alfaiataria', 'shorts', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/short-preto-detalhe.jpeg'),
  ('Short Couro', 'shorts', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/short-couro.jpeg'),
  ('Vestido Marinho', 'vestidos', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/vestido-marinho.jpeg'),
  ('Macacão Alfaiataria', 'outras', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/macacao-preto.jpeg'),
  ('Body Textura', 'outras', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/body-branco.jpeg'),
  ('Jaqueta Couro', 'outras', 'https://raw.githubusercontent.com/gabriel2g2/serena-moda/main/assets/produtos/jaqueta-couro.jpeg')
) as seed(name, category, image_url)
where not exists (
  select 1 from public.products existing where existing.name = seed.name
);
