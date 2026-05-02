-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.payment_config CASCADE;

-- Supabase Database Schema for SnackBox

-- Products Table
create table public.products (
  id text primary key,
  name text not null,
  description text,
  price numeric not null,
  category text,
  image text,
  in_stock boolean default true,
  stock integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Orders Table
create table public.orders (
  id text primary key,
  customer_name text not null,
  phone text not null,
  room text not null,
  total numeric not null,
  status text not null default 'pending',
  date timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Order Items Table
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id text references public.orders(id) on delete cascade not null,
  product_id text references public.products(id) on delete restrict not null,
  name text not null,
  price numeric not null,
  quantity integer not null
);

-- Payment Configuration Table (Singleton)
create table public.payment_config (
  id text primary key default 'config',
  qr_code_url text not null
);

-- Set up Row Level Security (RLS)
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_config enable row level security;

-- Create Policies to allow anonymous reads and writes for simplicity in this dev phase
-- Note: In production you should secure these!
create policy "Allow public read access on products" on public.products for select using (true);
create policy "Allow public insert on products" on public.products for insert with check (true);
create policy "Allow public update on products" on public.products for update using (true);
create policy "Allow public delete on products" on public.products for delete using (true);

create policy "Allow public read access on orders" on public.orders for select using (true);
create policy "Allow public insert on orders" on public.orders for insert with check (true);
create policy "Allow public update on orders" on public.orders for update using (true);

create policy "Allow public read access on order_items" on public.order_items for select using (true);
create policy "Allow public insert on order_items" on public.order_items for insert with check (true);

create policy "Allow public read access on payment_config" on public.payment_config for select using (true);
create policy "Allow public update on payment_config" on public.payment_config for update using (true);
create policy "Allow public insert on payment_config" on public.payment_config for insert with check (true);
