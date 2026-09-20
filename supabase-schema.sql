create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('blusas', 'shorts', 'vestidos', 'outras')),
  image_url text not null,
  price numeric(10, 2),
  description text not null default '',
  color text not null default '',
  sizes text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists color text not null default '';
alter table public.products add column if not exists sizes text[] not null default '{}';

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

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  access_code text not null unique,
  name text not null,
  phone text not null,
  email text not null,
  document text,
  zip text not null,
  state text not null,
  city text not null,
  address text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  updated_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  status text not null default 'pending' check (status in ('pending', 'paid', 'shipped', 'completed', 'cancelled')),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  shipping numeric(10,2) not null default 0 check (shipping >= 0),
  total numeric(10,2) not null check (total >= 0),
  shipping_address jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated by default as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0)
);

alter table public.customers enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

revoke all on public.customers, public.cart_items, public.orders, public.order_items from anon, authenticated;

create or replace function public.create_customer(customer_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_customer public.customers;
begin
  insert into public.customers (
    access_code, name, phone, email, document, zip, state, city,
    address, number, complement, neighborhood
  )
  values (
    'SERENA-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    trim(customer_data->>'name'), trim(customer_data->>'phone'),
    lower(trim(customer_data->>'email')), nullif(trim(customer_data->>'document'), ''),
    trim(customer_data->>'zip'), upper(trim(customer_data->>'state')),
    trim(customer_data->>'city'), trim(customer_data->>'address'),
    trim(customer_data->>'number'), nullif(trim(customer_data->>'complement'), ''),
    trim(customer_data->>'neighborhood')
  )
  returning * into saved_customer;

  return jsonb_build_object(
    'id', saved_customer.id, 'code', saved_customer.access_code,
    'name', saved_customer.name, 'phone', saved_customer.phone,
    'email', saved_customer.email, 'document', saved_customer.document,
    'zip', saved_customer.zip, 'state', saved_customer.state,
    'city', saved_customer.city, 'address', saved_customer.address,
    'number', saved_customer.number, 'complement', saved_customer.complement,
    'neighborhood', saved_customer.neighborhood
  );
end;
$$;

create or replace function public.save_customer_cart(customer_code text, cart_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_record public.customers;
  item jsonb;
begin
  select * into customer_record from public.customers where access_code = customer_code;
  if not found then raise exception 'Cliente não encontrado'; end if;
  delete from public.cart_items where customer_id = customer_record.id;
  for item in select * from jsonb_array_elements(coalesce(cart_data, '[]'::jsonb)) loop
    if (item->>'quantity')::integer > 0 then
      insert into public.cart_items(customer_id, product_id, quantity)
      values (customer_record.id, (item->>'id')::uuid, (item->>'quantity')::integer);
    end if;
  end loop;
end;
$$;

create or replace function public.load_customer_cart(customer_code text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', ci.product_id, 'quantity', ci.quantity)), '[]'::jsonb)
  from public.cart_items ci
  join public.customers c on c.id = ci.customer_id
  where c.access_code = customer_code;
$$;

create or replace function public.create_customer_order(customer_code text, order_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_record public.customers;
  new_order public.orders;
  item jsonb;
begin
  select * into customer_record from public.customers where access_code = customer_code;
  if not found then raise exception 'Cliente não encontrado'; end if;

  insert into public.orders(customer_id, subtotal, shipping, total, shipping_address)
  values (
    customer_record.id, (order_data->>'subtotal')::numeric,
    (order_data->>'shipping')::numeric, (order_data->>'total')::numeric,
    order_data->'shipping_address'
  )
  returning * into new_order;

  for item in select * from jsonb_array_elements(order_data->'items') loop
    insert into public.order_items(order_id, product_id, product_name, unit_price, quantity)
    values (
      new_order.id, (item->>'id')::uuid, item->>'name',
      (item->>'price')::numeric, (item->>'quantity')::integer
    );
  end loop;

  delete from public.cart_items where customer_id = customer_record.id;
  return jsonb_build_object('id', new_order.id, 'status', new_order.status);
end;
$$;

create or replace function public.list_customer_orders(customer_code text)
returns table(
  id uuid, status text, subtotal numeric, shipping numeric, total numeric,
  created_at timestamptz, items jsonb
)
language sql
security definer
set search_path = public
as $$
  select o.id, o.status, o.subtotal, o.shipping, o.total, o.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
        'name', oi.product_name, 'price', oi.unit_price, 'quantity', oi.quantity
      ) order by oi.id) from public.order_items oi where oi.order_id = o.id),
      '[]'::jsonb
    ) as items
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where c.access_code = customer_code
  order by o.created_at desc;
$$;

revoke all on function public.create_customer(jsonb) from public;
revoke all on function public.save_customer_cart(text, jsonb) from public;
revoke all on function public.load_customer_cart(text) from public;
revoke all on function public.create_customer_order(text, jsonb) from public;
revoke all on function public.list_customer_orders(text) from public;
grant execute on function public.create_customer(jsonb) to anon, authenticated;
grant execute on function public.save_customer_cart(text, jsonb) to anon, authenticated;
grant execute on function public.load_customer_cart(text) to anon, authenticated;
grant execute on function public.create_customer_order(text, jsonb) to anon, authenticated;
grant execute on function public.list_customer_orders(text) to anon, authenticated;
