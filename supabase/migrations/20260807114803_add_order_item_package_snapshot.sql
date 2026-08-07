alter table public.order_items
  add column if not exists package_items_snapshot jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_items_package_snapshot_is_array'
      and conrelid = 'public.order_items'::regclass
  ) then
    alter table public.order_items
      add constraint order_items_package_snapshot_is_array
      check (jsonb_typeof(package_items_snapshot) = 'array');
  end if;
end
$$;

comment on column public.order_items.package_items_snapshot is
  'Historical package component snapshot. Each component stores its final quantity for this order line.';
