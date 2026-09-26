-- Serena Moda Supabase schema and idempotent legacy migration.
-- Back up the database before running this script on an existing project.
-- Re-running this file preserves catalog edits and existing customer/order data.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('blusas', 'shorts', 'vestidos', 'outras')),
  image_url text not null,
  price numeric(10, 2),
  description text not null default '',
  color text not null default '',
  sizes text[] not null default '{}',
  variants jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists color text not null default '';
alter table public.products add column if not exists sizes text[] not null default '{}';
alter table public.products add column if not exists variants jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.products'::regclass and conname = 'products_variants_array_check'
  ) then
    alter table public.products add constraint products_variants_array_check
      check (jsonb_typeof(variants) = 'array');
  end if;
end $$;

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
where not exists (select 1 from public.products);

update public.products set
  description = 'Cropped estruturado com modelagem confortável e acabamento delicado para compor looks modernos.',
  color = 'Terracota',
  sizes = array['P', 'M', 'G'],
  variants = '[{"model":"Corset clássico","color":"Terracota","sizes":["P","M","G"],"availableSizes":["P","M","G"]},{"model":"Corset alongado","color":"Terracota","sizes":["P","M","G"],"availableSizes":["P","G"]}]'::jsonb
where name = 'Cropped Corset'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Regata leve com detalhe contrastante e caimento versátil para usar em diferentes ocasiões.',
  color = 'Preto e branco',
  sizes = array['P', 'M', 'G', 'GG']
where name = 'Regata Contrast'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Cropped feminino em tom suave, confortável e fácil de combinar com peças de cintura alta.',
  color = 'Rosa',
  sizes = array['P', 'M', 'G']
where name = 'Cropped Rosa'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Cropped regata básico e elegante, ideal para produções leves durante o dia.',
  color = 'Off-white',
  sizes = array['P', 'M', 'G', 'GG']
where name = 'Cropped Regata'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Camiseta com estampa gráfica e tecido macio para um visual casual cheio de personalidade.',
  color = 'Preto',
  sizes = array['P', 'M', 'G', 'GG']
where name = 'Camiseta Gráfica'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Regata básica de tecido confortável, uma peça essencial para montar combinações práticas.',
  color = 'Preto',
  sizes = array['P', 'M', 'G']
where name = 'Regata Básica'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Short jeans de cintura confortável com visual versátil para os dias mais quentes.',
  color = 'Azul jeans',
  sizes = array['36', '38', '40', '42']
where name = 'Short Jeans'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Short de alfaiataria com corte elegante e detalhe sofisticado para produções arrumadas.',
  color = 'Preto',
  sizes = array['36', '38', '40', '42']
where name = 'Short Alfaiataria'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Short com acabamento que imita couro e cintura confortável para um look marcante.',
  color = 'Preto',
  sizes = array['36', '38', '40']
where name = 'Short Couro'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Vestido de gola alta com silhueta elegante e caimento confortável para ocasiões especiais.',
  color = 'Azul-marinho',
  sizes = array['P', 'M', 'G']
where name = 'Vestido Marinho'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Macacão de alfaiataria com visual sofisticado e modelagem que valoriza a silhueta.',
  color = 'Preto',
  sizes = array['P', 'M', 'G', 'GG']
where name = 'Macacão Alfaiataria'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Body com textura delicada e acabamento elegante para usar sozinho ou em sobreposições.',
  color = 'Branco',
  sizes = array['P', 'M', 'G']
where name = 'Body Textura'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products set
  description = 'Jaqueta com acabamento inspirado no couro, perfeita para completar produções nos dias frescos.',
  color = 'Preto',
  sizes = array['P', 'M', 'G', 'GG']
where name = 'Jaqueta Couro'
  and coalesce(description, '') = ''
  and coalesce(color, '') = ''
  and coalesce(cardinality(sizes), 0) = 0;

update public.products
set price = coalesce(price, case name
    when 'Cropped Corset' then 89.90
    when 'Regata Contrast' then 59.90
    when 'Cropped Rosa' then 69.90
    when 'Cropped Regata' then 54.90
    when 'Camiseta Gráfica' then 79.90
    when 'Regata Básica' then 49.90
    when 'Short Jeans' then 99.90
    when 'Short Alfaiataria' then 109.90
    when 'Short Couro' then 119.90
    when 'Vestido Marinho' then 159.90
    when 'Macacão Alfaiataria' then 189.90
    when 'Body Textura' then 89.90
    when 'Jaqueta Couro' then 219.90
  end),
  variants = case
    when variants = '[]'::jsonb then case name
      when 'Cropped Corset' then '[{"model":"Corset clássico","color":"Terracota","sizes":["P","M","G"],"availableSizes":["P","M","G"],"stock":10},{"model":"Corset alongado","color":"Terracota","sizes":["P","M","G"],"availableSizes":["P","G"],"stock":5}]'::jsonb
      else jsonb_build_array(jsonb_build_object('model','Modelo único','color',color,'sizes',to_jsonb(sizes),'availableSizes',to_jsonb(sizes),'stock',10))
    end
    else variants
  end
where name in ('Cropped Corset', 'Regata Contrast', 'Cropped Rosa', 'Cropped Regata',
  'Camiseta Gráfica', 'Regata Básica', 'Short Jeans', 'Short Alfaiataria',
  'Short Couro', 'Vestido Marinho', 'Macacão Alfaiataria', 'Body Textura',
  'Jaqueta Couro')
  and (price is null or variants = '[]'::jsonb);

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

alter table public.customers add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;
alter table public.customers add column if not exists access_code text;
alter table public.customers add column if not exists name text not null default '';
alter table public.customers add column if not exists phone text not null default '';
alter table public.customers add column if not exists email text not null default '';
alter table public.customers add column if not exists document text;
alter table public.customers add column if not exists zip text not null default '';
alter table public.customers add column if not exists state text not null default '';
alter table public.customers add column if not exists city text not null default '';
alter table public.customers add column if not exists address text not null default '';
alter table public.customers add column if not exists number text not null default '';
alter table public.customers add column if not exists complement text;
alter table public.customers add column if not exists neighborhood text not null default '';
alter table public.customers add column if not exists cart_count integer not null default 0;
alter table public.customers add column if not exists created_at timestamptz not null default now();
alter table public.customers add column if not exists updated_at timestamptz not null default now();
alter table public.customers alter column cart_count set default 0;
update public.customers set cart_count = 0 where cart_count is null;

update public.customers
set access_code = 'SERENA-' || upper(replace(gen_random_uuid()::text, '-', ''))
where access_code is null or btrim(access_code) = '';

create unique index if not exists customers_access_code_key
  on public.customers(access_code);
create unique index if not exists customers_auth_user_id_key
  on public.customers(auth_user_id)
  where auth_user_id is not null;

alter table public.customers alter column access_code set not null;

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  variant jsonb not null default '{}'::jsonb,
  variant_key text not null default '',
  color text,
  size text,
  price_snapshot numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id),
  status text not null default 'pending' check (status in ('pending', 'paid', 'shipped', 'completed', 'cancelled')),
  subtotal numeric(10,2) not null check (subtotal >= 0),
  shipping numeric(10,2) not null default 0 check (shipping >= 0),
  total numeric(10,2) not null check (total >= 0),
  payment_method text check (payment_method is null or payment_method in ('pix', 'credit', 'debit')),
  shipping_address jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists payment_method text;
alter table public.orders add column if not exists status text not null default 'pending';
alter table public.orders add column if not exists subtotal numeric(10,2) not null default 0;
alter table public.orders add column if not exists shipping numeric(10,2) not null default 0;
alter table public.orders add column if not exists total numeric(10,2) not null default 0;
alter table public.orders add column if not exists shipping_address jsonb not null default '{}'::jsonb;
alter table public.orders add column if not exists created_at timestamptz not null default now();
alter table public.orders alter column status set default 'pending';
alter table public.orders alter column subtotal set default 0;
alter table public.orders alter column shipping set default 0;
alter table public.orders alter column total set default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.orders'::regclass and conname = 'orders_payment_method_check'
  ) then
    alter table public.orders add constraint orders_payment_method_check
      check (payment_method is null or payment_method in ('pix', 'credit', 'debit'));
  end if;
end $$;

create table if not exists public.order_items (
  id bigint generated by default as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  variant jsonb not null default '{}'::jsonb
);

create table if not exists public.users_extended (
  user_id uuid references auth.users(id) on delete cascade,
  customer_name varchar(255),
  cellphone varchar(20),
  customer_address jsonb,
  cart_count integer default 0,
  status varchar(20) default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.users_extended enable row level security;
drop policy if exists "Public can view own extended data" on public.users_extended;
drop policy if exists "Users can view own extended data" on public.users_extended;
create policy "Users can view own extended data"
  on public.users_extended for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "Admins can manage all users_extended" on public.users_extended;
drop policy if exists "Administrators can manage users_extended" on public.users_extended;
create policy "Administrators can manage users_extended"
  on public.users_extended for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.order_items add column if not exists variant jsonb not null default '{}'::jsonb;
alter table public.cart_items add column if not exists id uuid default gen_random_uuid();
alter table public.cart_items alter column id set default gen_random_uuid();
alter table public.cart_items add column if not exists variant jsonb not null default '{}'::jsonb;
alter table public.cart_items add column if not exists variant_key text not null default '';
alter table public.cart_items add column if not exists color text;
alter table public.cart_items add column if not exists size text;
alter table public.cart_items add column if not exists price_snapshot numeric(10,2) not null default 0;
alter table public.cart_items add column if not exists created_at timestamptz not null default now();
alter table public.cart_items add column if not exists updated_at timestamptz not null default now();

update public.cart_items
set variant = jsonb_strip_nulls(jsonb_build_object(
      'model', '',
      'color', nullif(color, ''),
      'size', nullif(size, '')
    )),
    variant_key = concat_ws('|', nullif(color, ''), nullif(size, ''))
where variant = '{}'::jsonb
  and (coalesce(color, '') <> '' or coalesce(size, '') <> '');

do $$
declare
  current_primary_key text;
  primary_key_columns text[];
begin
  select constraint_row.conname,
         array_agg(attribute_row.attname::text order by key_column.ordinality)
  into current_primary_key, primary_key_columns
  from pg_constraint constraint_row
  cross join lateral unnest(constraint_row.conkey) with ordinality
    as key_column(attribute_number, ordinality)
  join pg_attribute attribute_row
    on attribute_row.attrelid = constraint_row.conrelid
   and attribute_row.attnum = key_column.attribute_number
  where constraint_row.conrelid = 'public.cart_items'::regclass
    and constraint_row.contype = 'p'
  group by constraint_row.conname;

  if current_primary_key is not null and primary_key_columns <> array['id']::text[] then
    execute format('alter table public.cart_items drop constraint %I', current_primary_key);
    current_primary_key := null;
  end if;

  if current_primary_key is null then
    update public.cart_items set id = gen_random_uuid() where id is null;
    alter table public.cart_items alter column id set not null;
    alter table public.cart_items
      add constraint cart_items_pkey primary key (id);
  end if;
end $$;

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

create or replace function public.save_customer_cart(cart_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  customer_record public.customers;
  item jsonb;
  item_quantity integer;
  item_variant jsonb;
begin
  if auth.uid() is null then raise exception 'É necessário estar autenticado'; end if;
  if cart_data is not null and jsonb_typeof(cart_data) <> 'array' then
    raise exception 'Formato de carrinho inválido';
  end if;
  select * into customer_record from public.customers where auth_user_id = auth.uid();
  if not found then raise exception 'Cliente não encontrado'; end if;
  delete from public.cart_items where customer_id = customer_record.id;
  for item in select * from jsonb_array_elements(coalesce(cart_data, '[]'::jsonb)) loop
    item_quantity := (item->>'quantity')::integer;
    if item_quantity is null or item_quantity < 1 or item_quantity > 99 then
      raise exception 'Quantidade de produto inválida';
    end if;
    item_variant := coalesce(item->'variant', '{}'::jsonb);
    if jsonb_typeof(item_variant) <> 'object' then
      raise exception 'Variação de produto inválida';
    end if;
    insert into public.cart_items(
      customer_id, product_id, quantity, variant, variant_key, color, size, price_snapshot
    )
    values (
      customer_record.id, (item->>'id')::uuid, item_quantity, item_variant,
      coalesce(item->>'variantKey', ''),
      nullif(item_variant->>'color', ''),
      nullif(item_variant->>'size', ''),
      0
    );
  end loop;
end;
$$;

create or replace function public.load_customer_cart()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', ci.product_id, 'quantity', ci.quantity, 'variant', ci.variant)), '[]'::jsonb)
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
  payment_method text := order_data->>'payment_method';
  shipping_zip text;
begin
  if auth.uid() is null then raise exception 'É necessário estar autenticado'; end if;
  select * into customer_record from public.customers where auth_user_id = auth.uid();
  if not found then raise exception 'Cliente não encontrado'; end if;
  if payment_method is null or payment_method not in ('pix', 'credit', 'debit') then
    raise exception 'Forma de pagamento inválida';
  end if;
  shipping_zip := regexp_replace(
    coalesce(order_data #>> '{shipping_address,zip}', customer_record.zip, ''),
    '[^0-9]', '', 'g'
  );
  if length(shipping_zip) <> 8 then raise exception 'CEP inválido'; end if;
  if jsonb_typeof(order_data->'items') is distinct from 'array' then
    raise exception 'Formato de itens do pedido inválido';
  end if;
  if jsonb_array_length(order_data->'items') = 0 then
    raise exception 'O pedido precisa conter pelo menos um produto';
  end if;

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
    calculated_shipping := case left(shipping_zip, 1)
      when '0' then 14.90 when '1' then 14.90 when '2' then 19.90
      when '3' then 21.90 when '4' then 27.90 when '5' then 29.90
      when '6' then 31.90 when '7' then 24.90 when '8' then 22.90
      when '9' then 24.90 else 0 end;
  end if;

  insert into public.orders(
    customer_id, status, subtotal, shipping, total, payment_method, shipping_address
  )
  values (
    customer_record.id, 'pending', calculated_subtotal, calculated_shipping,
    calculated_subtotal + calculated_shipping,
    payment_method,
    jsonb_build_object(
      'zip', shipping_zip,
      'state', coalesce(order_data #>> '{shipping_address,state}', customer_record.state),
      'city', coalesce(order_data #>> '{shipping_address,city}', customer_record.city),
      'address', coalesce(order_data #>> '{shipping_address,address}', customer_record.address),
      'number', coalesce(order_data #>> '{shipping_address,number}', customer_record.number),
      'complement', coalesce(order_data #>> '{shipping_address,complement}', customer_record.complement),
      'neighborhood', coalesce(order_data #>> '{shipping_address,neighborhood}', customer_record.neighborhood)
    )
  )
  returning * into new_order;

  for item in select * from jsonb_array_elements(order_data->'items') loop
    select * into product_record from public.products
    where id = (item->>'id')::uuid and active = true;
    insert into public.order_items(order_id, product_id, product_name, unit_price, quantity, variant)
    values (
      new_order.id, product_record.id, product_record.name,
      product_record.price, (item->>'quantity')::integer, coalesce(item->'variant', '{}'::jsonb)
    );
  end loop;

  delete from public.cart_items where customer_id = customer_record.id;
  return jsonb_build_object(
    'id', new_order.id, 'status', new_order.status,
    'subtotal', calculated_subtotal, 'shipping', calculated_shipping,
    'total', calculated_subtotal + calculated_shipping,
    'payment_method', new_order.payment_method
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
        'name', oi.product_name, 'price', oi.unit_price, 'quantity', oi.quantity,
        'variant', oi.variant
      ) order by oi.id) from public.order_items oi where oi.order_id = o.id),
      '[]'::jsonb
    ) as items
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where c.auth_user_id = auth.uid()
  order by o.created_at desc;
$$;

revoke all on function public.create_customer(jsonb) from public;
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
