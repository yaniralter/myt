-- MYT T-Shirt Marketplace Database Schema

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shops table
create table public.shops (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  slug text not null unique,
  bio text,
  banner_url text,
  logo_url text,
  stripe_account_id text,
  stripe_onboarding_complete boolean default false,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Designs table (AI generated designs)
create table public.designs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  prompt text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);

-- Products table
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  shop_id uuid references public.shops(id) on delete cascade not null,
  design_id uuid references public.designs(id) on delete set null,
  title text not null,
  description text,
  price integer not null, -- stored in cents
  image_url text not null,
  printify_product_id text,
  is_published boolean default false,
  is_featured boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders table
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  buyer_id uuid references public.profiles(id) on delete set null,
  product_id uuid references public.products(id) on delete set null not null,
  shop_id uuid references public.shops(id) on delete set null not null,
  stripe_session_id text,
  stripe_payment_intent_id text,
  printify_order_id text,
  total_amount integer not null, -- in cents
  platform_fee integer not null, -- in cents
  seller_amount integer not null, -- in cents
  status text not null default 'pending' check (status in ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
  shipping_address jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.shops enable row level security;
alter table public.designs enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Shops policies
create policy "Shops are viewable by everyone"
  on public.shops for select using (true);

create policy "Shop owners can update their shop"
  on public.shops for update using (auth.uid() = owner_id);

create policy "Authenticated users can create shops"
  on public.shops for insert with check (auth.uid() = owner_id);

create policy "Shop owners can delete their shop"
  on public.shops for delete using (auth.uid() = owner_id);

-- Designs policies
create policy "Users can view own designs"
  on public.designs for select using (auth.uid() = user_id);

create policy "Users can create designs"
  on public.designs for insert with check (auth.uid() = user_id);

create policy "Users can delete own designs"
  on public.designs for delete using (auth.uid() = user_id);

-- Products policies
create policy "Published products are viewable by everyone"
  on public.products for select using (is_published = true);

create policy "Shop owners can view all their products"
  on public.products for select using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

create policy "Shop owners can create products"
  on public.products for insert with check (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

create policy "Shop owners can update their products"
  on public.products for update using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

create policy "Shop owners can delete their products"
  on public.products for delete using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

-- Orders policies
create policy "Buyers can view own orders"
  on public.orders for select using (auth.uid() = buyer_id);

create policy "Sellers can view orders for their shops"
  on public.orders for select using (
    shop_id in (select id from public.shops where owner_id = auth.uid())
  );

create policy "Authenticated users can create orders"
  on public.orders for insert with check (auth.uid() = buyer_id);

create policy "System can update orders"
  on public.orders for update using (true);

-- Functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to auto-create profile on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function to generate shop slug
create or replace function public.generate_slug(shop_name text)
returns text as $$
begin
  return lower(regexp_replace(regexp_replace(shop_name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
end;
$$ language plpgsql;

-- Indexes for performance
create index idx_shops_owner on public.shops(owner_id);
create index idx_shops_slug on public.shops(slug);
create index idx_products_shop on public.products(shop_id);
create index idx_products_published on public.products(is_published) where is_published = true;
create index idx_products_featured on public.products(is_featured) where is_featured = true;
create index idx_orders_buyer on public.orders(buyer_id);
create index idx_orders_shop on public.orders(shop_id);
create index idx_designs_user on public.designs(user_id);
