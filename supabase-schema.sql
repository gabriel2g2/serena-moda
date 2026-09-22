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

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin';
$$;

drop policy if exists "Public can view active products" on public.products;
drop policy if exists "Administrators can view active products" on public.products;
create policy "Public can view active products"
on public.products for select
to anon, authenticated
using (active = true);

drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Administrators can insert products" on public.products;
create policy "Administrators can insert products"
on public.products for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Administrators can update products" on public.products;
create policy "Administrators can update products"
on public.products for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can delete products" on public.products;
drop policy if exists "Administrators can delete products" on public.products;
create policy "Administrators can delete products"
on public.products for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Authenticated users can upload product images" on storage.objects;
drop policy if exists "Administrators can upload product images" on storage.objects;
create policy "Administrators can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "Public can view product images" on storage.objects;
drop policy if exists "Administrators can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'products');

drop policy if exists "Authenticated users can update product images" on storage.objects;
drop policy if exists "Administrators can update product images" on storage.objects;
create policy "Administrators can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'products' and public.is_admin())
with check (bucket_id = 'products' and public.is_admin());

drop policy if exists "Authenticated users can delete product images" on storage.objects;
drop policy if exists "Administrators can delete product images" on storage.objects;
create policy "Administrators can delete product images"
on storage.objects for delete
to authenticated
using (bucket_id = 'products' and public.is_admin());

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

update public.products set
  description = 'Cropped estruturado com modelagem confortável e acabamento delicado para compor looks modernos.',
  color = 'Terracota',
  sizes = array['P', 'M', 'G']
where name = 'Cropped Corset';

update public.products set
  description = 'Regata leve com detalhe contrastante e caimento versátil para usar em diferentes ocasiões.',
  color = 'Preto e branco',
  sizes = array['P', 'M', 'G', 'GG']
where name = 'Regata Contrast';

update public.products set
  description = 'Cropped feminino em tom suave, confortável e fácil de combinar com peças de cintura alta.',
  color = 'Rosa',
  sizes = array['P', 'M', 'G']
where name = 'Cropped Rosa';

update public.products set
  description = 'Cropped regata básico e elegante, ideal para produções leves durante o dia.',
  color = 'Off-white',
  sizes = array['P', 'M', 'G', 'GG']
where name = 'Cropped Regata';

update public.products set
  description = 'Camiseta com estampa gráfica e tecido macio para um visual casual cheio de personalidade.',
  color = 'Preto',
  sizes = array['P', 'M', 'G', 'GG']
where name = 'Camiseta Gráfica';

update public.products set
  description = 'Regata básica de tecido confortável, uma peça essencial para montar combinações práticas.',
  color = 'Preto',
  sizes = array['P', 'M', 'G']
where name = 'Regata Básica';

update public.products set
  description = 'Short jeans de cintura confortável com visual versátil para os dias mais quentes.',
  color = 'Azul jeans',
  sizes = array['36', '38', '40', '42']
where name = 'Short Jeans';

update public.products set
  description = 'Short de alfaiataria com corte elegante e detalhe sofisticado para produções arrumadas.',
  color = 'Preto',
  sizes = array['36', '38', '40', '42']
where name = 'Short Alfaiataria';

update public.products set
  description = 'Short com acabamento que imita couro e cintura confortável para um look marcante.',
  color = 'Preto',
  sizes = array['36', '38', '40']
where name = 'Short Couro';

update public.products set
  description = 'Vestido de gola alta com silhueta elegante e caimento confortável para ocasiões especiais.',
  color = 'Azul-marinho',
  sizes = array['P', 'M', 'G']
where name = 'Vestido Marinho';

update public.products set
  description = 'Macacão de alfaiataria com visual sofisticado e modelagem que valoriza a silhueta.',
  color = 'Preto',
  sizes = array['P', 'M', 'G', 'GG']
where name = 'Macacão Alfaiataria';

update public.products set
  description = 'Body com textura delicada e acabamento elegante para usar sozinho ou em sobreposições.',
  color = 'Branco',
  sizes = array['P', 'M', 'G']
where name = 'Body Textura';

update public.products set
  description = 'Jaqueta com acabamento inspirado no couro, perfeita para completar produções nos dias frescos.',
  color = 'Preto',
  sizes = array['P', 'M', 'G', 'GG']
where name = 'Jaqueta Couro';

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
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

alter table public.customers add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade;

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
  if auth.uid() is null then raise exception 'É necessário estar autenticado'; end if;
  insert into public.customers (
    auth_user_id, access_code, name, phone, email, document, zip, state, city,
    address, number, complement, neighborhood
  )
  values (
    auth.uid(), 'SERENA-' || upper(replace(gen_random_uuid()::text, '-', '')),
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

create or replace function public.get_customer_profile()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', c.id, 'code', c.access_code, 'name', c.name, 'phone', c.phone,
    'email', c.email, 'document', c.document, 'zip', c.zip, 'state', c.state,
    'city', c.city, 'address', c.address, 'number', c.number,
    'complement', c.complement, 'neighborhood', c.neighborhood
  )
  from public.customers c
  where c.auth_user_id = auth.uid();
$$;

create or replace function public.login_customer(customer_email text, customer_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_customer public.customers;
begin
  select * into saved_customer
  from public.customers
  where lower(email) = lower(trim(customer_email))
    and upper(access_code) = upper(trim(customer_code))
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'E-mail ou código de acesso inválido';
  end if;

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

create or replace function public.save_customer_cart(cart_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_record public.customers;
  item jsonb;
begin
  select * into customer_record from public.customers where auth_user_id = auth.uid();
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

create or replace function public.load_customer_cart()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', ci.product_id, 'quantity', ci.quantity)), '[]'::jsonb)
  from public.cart_items ci
  join public.customers c on c.id = ci.customer_id
  where c.auth_user_id = auth.uid();
$$;

create or replace function public.create_customer_order(order_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_record public.customers;
  new_order public.orders;
  product_record public.products;
  item jsonb;
  calculated_subtotal numeric(10,2) := 0;
  calculated_shipping numeric(10,2) := 0;
  item_quantity integer;
begin
  select * into customer_record from public.customers where auth_user_id = auth.uid();
  if not found then raise exception 'Cliente não encontrado'; end if;

  for item in select * from jsonb_array_elements(order_data->'items') loop
    item_quantity := (item->>'quantity')::integer;
    if item_quantity is null or item_quantity < 1 or item_quantity > 99 then
      raise exception 'Quantidade de produto inválida';
    end if;
    select * into product_record
    from public.products
    where id = (item->>'id')::uuid and active = true;
    if not found or product_record.price is null then
      raise exception 'Produto indisponível ou sem preço';
    end if;
    calculated_subtotal := calculated_subtotal + (product_record.price * item_quantity);
  end loop;

  if calculated_subtotal >= 199 then
    calculated_shipping := 0;
  else
    calculated_shipping := case left(customer_record.zip, 1)
      when '0' then 14.90 when '1' then 14.90 when '2' then 19.90
      when '3' then 21.90 when '4' then 27.90 when '5' then 29.90
      when '6' then 31.90 when '7' then 24.90 when '8' then 22.90
      when '9' then 24.90 else 0 end;
  end if;

  insert into public.orders(customer_id, subtotal, shipping, total, shipping_address)
  values (
    customer_record.id, calculated_subtotal, calculated_shipping,
    calculated_subtotal + calculated_shipping,
    jsonb_build_object(
      'zip', customer_record.zip, 'state', customer_record.state,
      'city', customer_record.city, 'address', customer_record.address,
      'number', customer_record.number, 'complement', customer_record.complement,
      'neighborhood', customer_record.neighborhood
    )
  )
  returning * into new_order;

  for item in select * from jsonb_array_elements(order_data->'items') loop
    select * into product_record from public.products
    where id = (item->>'id')::uuid and active = true;
    insert into public.order_items(order_id, product_id, product_name, unit_price, quantity)
    values (
      new_order.id, product_record.id, product_record.name,
      product_record.price, (item->>'quantity')::integer
    );
  end loop;

  delete from public.cart_items where customer_id = customer_record.id;
  return jsonb_build_object(
    'id', new_order.id, 'status', new_order.status,
    'subtotal', calculated_subtotal, 'shipping', calculated_shipping,
    'total', calculated_subtotal + calculated_shipping
  );
end;
$$;

create or replace function public.list_customer_orders()
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
  where c.auth_user_id = auth.uid()
  order by o.created_at desc;
$$;

revoke all on function public.create_customer(jsonb) from public;
revoke all on function public.login_customer(text, text) from public;
drop function if exists public.login_customer(text, text);
drop function if exists public.save_customer_cart(text, jsonb);
drop function if exists public.load_customer_cart(text);
drop function if exists public.create_customer_order(text, jsonb);
drop function if exists public.list_customer_orders(text);
revoke all on function public.get_customer_profile() from public;
revoke all on function public.save_customer_cart(jsonb) from public;
revoke all on function public.load_customer_cart() from public;
revoke all on function public.create_customer_order(jsonb) from public;
revoke all on function public.list_customer_orders() from public;
grant execute on function public.create_customer(jsonb) to authenticated;
grant execute on function public.get_customer_profile() to authenticated;
grant execute on function public.save_customer_cart(jsonb) to authenticated;
grant execute on function public.load_customer_cart() to authenticated;
grant execute on function public.create_customer_order(jsonb) to authenticated;
grant execute on function public.list_customer_orders() to authenticated;
