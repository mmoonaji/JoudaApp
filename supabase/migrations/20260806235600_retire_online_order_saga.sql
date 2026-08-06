-- Archive the four HTTP test orders and allow the explicit manual-review state.
-- Dashboard policies are removed separately, after the gateway UI is deployed.

alter table public.customer_orders
  drop constraint if exists chk_inventory_sync_status;

alter table public.customer_orders
  add constraint chk_inventory_sync_status check (
    inventory_sync_status = any (array[
      'none'::text,
      'processing'::text,
      'completed'::text,
      'failed'::text,
      'reversing'::text,
      'reversed'::text,
      'manual_review'::text
    ])
  );

with test_orders as (
  select id, status as old_status, order_number
  from public.customer_orders
  where order_number in (
    'HTTP-TEST-001',
    'HTTP-TEST-002',
    'HTTP-TEST-003',
    'HTTP-TEST-004'
  )
), updated_orders as (
  update public.customer_orders orders
  set status = 'cancelled',
      cancelled_at = coalesce(orders.cancelled_at, clock_timestamp()),
      status_updated_at = clock_timestamp(),
      cancellation_reason = coalesce(
        orders.cancellation_reason,
        'طلب اختبار مؤرشف عند تعطيل Saga'
      ),
      inventory_sync_status = case
        when orders.order_number in ('HTTP-TEST-001', 'HTTP-TEST-004') then 'reversed'
        else 'none'
      end,
      inventory_reversed_at = case
        when orders.order_number in ('HTTP-TEST-001', 'HTTP-TEST-004')
          then coalesce(orders.inventory_reversed_at, clock_timestamp())
        else orders.inventory_reversed_at
      end,
      inventory_reversal_op_id = case
        when orders.order_number in ('HTTP-TEST-001', 'HTTP-TEST-004')
          then orders.inventory_deduction_op_id
        else orders.inventory_reversal_op_id
      end,
      inventory_sync_error = null,
      inventory_sync_updated_at = clock_timestamp()
  from test_orders
  where orders.id = test_orders.id
  returning orders.id, test_orders.old_status, orders.order_number
)
insert into public.order_events (
  order_id,
  event_type,
  old_status,
  new_status,
  notes,
  metadata
)
select
  updated_orders.id,
  'test_order_retired',
  updated_orders.old_status,
  'cancelled',
  'أرشفة طلب اختبار وتعويض أثر Saga',
  jsonb_build_object(
    'migration', '20260806235600_retire_online_order_saga',
    'order_number', updated_orders.order_number
  )
from updated_orders
where not exists (
  select 1
  from public.order_events existing_event
  where existing_event.order_id = updated_orders.id
    and existing_event.event_type = 'test_order_retired'
    and existing_event.metadata->>'migration' = '20260806235600_retire_online_order_saga'
);
