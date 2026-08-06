-- Online-order lifecycle changes are now available only through the authenticated
-- JoudaStock Edge gateway. The gateway calls these functions with service_role.

revoke all on function public.start_preparing_order(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mark_order_ready(uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_order_for_delivery(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_delivery_assignment(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.dispatch_order(uuid, uuid) from public, anon, authenticated;
revoke all on function public.deliver_order_with_cash(uuid, uuid) from public, anon, authenticated;
revoke all on function public.verify_wallet_payment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.settle_employee_cash(uuid[], uuid) from public, anon, authenticated;

grant execute on function public.start_preparing_order(uuid, uuid) to service_role;
grant execute on function public.mark_order_ready(uuid, uuid) to service_role;
grant execute on function public.claim_order_for_delivery(uuid, uuid) to service_role;
grant execute on function public.release_delivery_assignment(uuid, uuid, text) to service_role;
grant execute on function public.dispatch_order(uuid, uuid) to service_role;
grant execute on function public.deliver_order_with_cash(uuid, uuid) to service_role;
grant execute on function public.verify_wallet_payment(uuid, uuid) to service_role;
grant execute on function public.settle_employee_cash(uuid[], uuid) to service_role;

create or replace function public.release_delivery_assignment(
  p_order_id uuid,
  p_actor_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_record record;
begin
  select * into order_record
  from public.customer_orders
  where id = p_order_id
  for update;

  if order_record.delivery_assignee_id != p_actor_id
     and auth.role() != 'service_role'
     and not public.is_admin()
  then
    raise exception 'Not authorized to release';
  end if;

  update public.customer_orders
  set delivery_assignee_id = null,
      delivery_assigned_at = null
  where id = p_order_id;

  insert into public.order_events(order_id, event_type, actor_id, notes)
  values (p_order_id, 'delivery_released', p_actor_id, p_reason);

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.verify_wallet_payment(
  p_order_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_record record;
begin
  if auth.role() != 'service_role' and not public.is_admin() then
    raise exception 'Access denied';
  end if;

  select * into order_record
  from public.customer_orders
  where id = p_order_id
  for update;

  if order_record.payment_status != 'wallet_pending' then
    raise exception 'Order is not pending wallet verification';
  end if;

  update public.customer_orders
  set payment_status = 'wallet_verified',
      wallet_verified_by = p_actor_id,
      wallet_verified_at = now()
  where id = p_order_id;

  insert into public.order_events(order_id, event_type, actor_id, notes)
  values (p_order_id, 'wallet_verified', p_actor_id, null);

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.settle_employee_cash(
  p_order_ids uuid[],
  p_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order_id uuid;
  settled_count integer := 0;
begin
  if auth.role() != 'service_role' and not public.is_admin() then
    raise exception 'Access denied';
  end if;

  foreach current_order_id in array p_order_ids
  loop
    perform id
    from public.customer_orders
    where id = current_order_id
      and payment_status = 'cash_with_employee'
    for update;

    update public.customer_orders
    set payment_status = 'cash_settled',
        cash_settled_by = p_actor_id,
        cash_settled_at = now()
    where id = current_order_id
      and payment_status = 'cash_with_employee';

    if found then
      settled_count := settled_count + 1;
      insert into public.order_events(order_id, event_type, actor_id, notes)
      values (current_order_id, 'cash_settled', p_actor_id, 'Cash settled by admin');
    end if;
  end loop;

  return jsonb_build_object('success', true, 'settled_count', settled_count);
end;
$$;

-- CREATE OR REPLACE resets neither existing ACLs nor ownership; enforce the
-- intended boundary again after replacing the three functions.
revoke all on function public.release_delivery_assignment(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.verify_wallet_payment(uuid, uuid) from public, anon, authenticated;
revoke all on function public.settle_employee_cash(uuid[], uuid) from public, anon, authenticated;
grant execute on function public.release_delivery_assignment(uuid, uuid, text) to service_role;
grant execute on function public.verify_wallet_payment(uuid, uuid) to service_role;
grant execute on function public.settle_employee_cash(uuid[], uuid) to service_role;
