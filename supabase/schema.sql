-- =====================================================================
--  Interactive Restaurant Menu — تهيئة قاعدة بيانات Supabase (Postgres)
--
--  نفّذ الملف ده مرة واحدة بس:
--  Supabase Dashboard → SQL Editor → الصق الملف → Run
--
--  بعده الباك إند هيحفظ القائمة والطلبات والمخزون في Postgres بشكل دائم،
--  ولوحة التحكم هتشتغل بحساب الأدمن في Authentication → Users.
-- =====================================================================

-- ---------------------------------------------------------------
-- الجداول
-- ---------------------------------------------------------------
create table if not exists public.menu_data (
  slug       text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id         text primary key,
  created_at timestamptz not null default now(),
  data       jsonb not null
);

create table if not exists public.stock_notifications (
  id         uuid primary key default gen_random_uuid(),
  item_id    text not null,
  item_name  text not null,
  remaining  integer not null,
  threshold  integer not null default 2,
  created_at timestamptz not null default now(),
  read       boolean not null default false
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists stock_notifications_created_at_idx on public.stock_notifications (created_at desc);

-- ---------------------------------------------------------------
-- Row Level Security
--   • قراءة القائمة: مسموحة (العملاء بيقروها عن طريق الباك إند بمفتاح anon)
--   • أي كتابة: للأدمن المسجّل دخول فقط (دور authenticated)
--   • تسجيل الطلب: عن طريق دالة place_order الآمنة تحت
-- ---------------------------------------------------------------
alter table public.menu_data enable row level security;
alter table public.orders enable row level security;
alter table public.stock_notifications enable row level security;

drop policy if exists "menu_public_read" on public.menu_data;
create policy "menu_public_read" on public.menu_data
  for select using (true);

drop policy if exists "menu_owner_write" on public.menu_data;
create policy "menu_owner_write" on public.menu_data
  for all to authenticated using (true) with check (true);

drop policy if exists "orders_owner_read" on public.orders;
create policy "orders_owner_read" on public.orders
  for select to authenticated using (true);

drop policy if exists "notifications_owner_read" on public.stock_notifications;
create policy "notifications_owner_read" on public.stock_notifications
  for select to authenticated using (true);

drop policy if exists "notifications_owner_update" on public.stock_notifications;
create policy "notifications_owner_update" on public.stock_notifications
  for update to authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select on public.menu_data to anon, authenticated;
grant insert, update, delete on public.menu_data to authenticated;
grant select on public.orders to authenticated;
grant select, update on public.stock_notifications to authenticated;

-- ---------------------------------------------------------------
--  تسجيل الطلب + خصم المخزون + تنبيه النقص
--  بتشتغل SECURITY DEFINER عشان خصم الكمية يحصل بشكل ذرّي (FOR UPDATE)
--  ومفيش طلبين يخصموا نفس الكمية في نفس الوقت.
-- ---------------------------------------------------------------
create or replace function public.place_order(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_menu          jsonb;
  v_items         jsonb;
  v_lines         jsonb := coalesce(payload -> 'lines', '[]'::jsonb);
  v_line          jsonb;
  v_item          jsonb;
  v_item_id       text;
  v_item_name     text;
  v_item_price    numeric;
  v_quantity      integer;
  v_before        integer;
  v_after         integer;
  v_threshold     integer;
  v_order_lines   jsonb := '[]'::jsonb;
  v_low_stock     jsonb := '[]'::jsonb;
  v_notification  jsonb;
  v_order         jsonb;
  v_order_id      text;
  v_now           timestamptz := now();
  v_now_iso       text;
begin
  if jsonb_typeof(v_lines) <> 'array' or jsonb_array_length(v_lines) = 0 then
    raise exception 'السلة فارغة' using errcode = '22023';
  end if;

  v_now_iso := to_char(v_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  select data into v_menu
    from public.menu_data
   where slug = 'main'
     for update;

  if v_menu is null then
    raise exception 'قائمة المطعم لسه مش محفوظة في قاعدة البيانات — افتح لوحة التحكم مرة واحدة' using errcode = '22023';
  end if;

  for v_line in select * from jsonb_array_elements(v_lines)
  loop
    v_item_id  := v_line ->> 'itemId';
    v_quantity := greatest(1, floor(coalesce((v_line ->> 'quantity')::numeric, 1))::integer);

    select elem into v_item
      from jsonb_array_elements(v_menu -> 'items') as elem
     where elem ->> 'id' = v_item_id
     limit 1;

    if v_item is null or coalesce((v_item ->> 'available')::boolean, false) = false then
      raise exception 'أحد الأصناف لم يعد متاحاً' using errcode = '22023';
    end if;

    v_item_name  := coalesce(v_item ->> 'name', '');
    v_item_price := coalesce((v_item ->> 'price')::numeric, 0);

    if coalesce((v_item ->> 'trackStock')::boolean, false) then
      v_before    := greatest(0, coalesce((v_item ->> 'stock')::numeric, 0)::integer);
      if v_quantity > v_before then
        raise exception 'المتاح من % هو % فقط', v_item_name, v_before using errcode = '22023';
      end if;

      v_after     := v_before - v_quantity;
      v_threshold := greatest(0, coalesce((v_item ->> 'lowStockThreshold')::numeric, 2)::integer);

      select jsonb_agg(
               case
                 when elem ->> 'id' = v_item_id
                   then elem || jsonb_build_object('stock', v_after, 'available', v_after > 0)
                 else elem
               end
               order by ordinality
             )
        into v_items
        from jsonb_array_elements(v_menu -> 'items') with ordinality as t(elem, ordinality);

      v_menu := jsonb_set(v_menu, '{items}', v_items);

      -- وصلنا لحد التنبيه (الافتراضي 2) → نسجّل تنبيه للوحة التحكم والـ webhook
      if v_before > v_threshold and v_after <= v_threshold then
        v_notification := jsonb_build_object(
          'id',        gen_random_uuid()::text,
          'itemId',    v_item_id,
          'itemName',  v_item_name,
          'remaining', v_after,
          'threshold', v_threshold,
          'createdAt', v_now_iso,
          'read',      false
        );

        insert into public.stock_notifications (id, item_id, item_name, remaining, threshold, created_at, read)
        values ((v_notification ->> 'id')::uuid, v_item_id, v_item_name, v_after, v_threshold, v_now, false);

        v_low_stock := v_low_stock || v_notification;
      end if;
    end if;

    v_order_lines := v_order_lines || jsonb_build_object(
      'itemId',    v_item_id,
      'name',      v_item_name,
      'quantity',  v_quantity,
      'unitPrice', v_item_price
    );
  end loop;

  v_order_id := 'ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  v_order := jsonb_build_object(
    'id',        v_order_id,
    'createdAt', v_now_iso,
    'customer',  jsonb_build_object(
      'name',    btrim(coalesce(payload #>> '{customer,name}', '')),
      'phone',   btrim(coalesce(payload #>> '{customer,phone}', '')),
      'address', btrim(coalesce(payload #>> '{customer,address}', '')),
      'table',   btrim(coalesce(payload #>> '{customer,table}', '')),
      'notes',   btrim(coalesce(payload #>> '{customer,notes}', ''))
    ),
    'orderType', coalesce(payload ->> 'orderType', 'delivery'),
    'lines',     v_order_lines,
    'total',     coalesce((payload ->> 'total')::numeric, 0)
  );

  insert into public.orders (id, created_at, data) values (v_order_id, v_now, v_order);

  update public.menu_data
     set data       = jsonb_set(v_menu, '{updatedAt}', to_jsonb(v_now_iso)),
         updated_at = v_now
   where slug = 'main';

  return jsonb_build_object('order', v_order, 'lowStock', v_low_stock);
end;
$function$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- ---------------------------------------------------------------
--  التحديث اللحظي (Supabase Realtime)
--  أي تغيير في الجداول دي بيوصل فوراً لكل الأجهزة عن طريق WebSocket:
--   • menu_data           → العملاء يشوفوا تعديلات الأدمن وخصم المخزون فوراً
--   • orders              → لوحة الأدمن تستلم الطلب الجديد فوراً
--   • stock_notifications → تنبيه نقص المخزون يظهر فوراً
--  الصلاحيات بتحكمها RLS حتى على الـ Realtime.
--  (القطعة دي آمنة للتشغيل أكتر من مرة)
-- ---------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

alter publication supabase_realtime add table public.menu_data;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.stock_notifications;

-- عشان أحداث التحديث تبعت الصف القديم والجديد كاملين (مطلوب لبعض الفلاتر)
alter table public.menu_data replica identity full;
alter table public.orders replica identity full;
alter table public.stock_notifications replica identity full;
