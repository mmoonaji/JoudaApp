-- Simplify the online-order lifecycle for the shared JoudaStock team room.
-- These RPCs are invoked only by the authenticated JoudaStock Edge gateway.

create or replace function public.start_preparing_order(
  p_order_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  order_record record;
begin
  select status, quotation_id
  into order_record
  from public.customer_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_record.status = 'preparing' then
    return jsonb_build_object('success', true, 'already_done', true);
  end if;

  if order_record.status <> 'confirmed' then
    raise exception 'Order is not confirmed';
  end if;

  if order_record.quotation_id is null then
    raise exception 'Confirmed order has no invoice';
  end if;

  update public.customer_orders
  set status = 'preparing',
      preparer_id = null,
      preparing_started_at = now(),
      status_updated_at = now()
  where id = p_order_id;

  insert into public.order_events(order_id, event_type, old_status, new_status, actor_id)
  values (p_order_id, 'status_changed', 'confirmed', 'preparing', p_actor_id);

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.mark_order_ready(
  p_order_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  order_record record;
begin
  select status
  into order_record
  from public.customer_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_record.status = 'ready' then
    return jsonb_build_object('success', true, 'already_done', true);
  end if;

  if order_record.status <> 'preparing' then
    raise exception 'Order is not preparing';
  end if;

  update public.customer_orders
  set status = 'ready',
      prepared_at = now(),
      status_updated_at = now()
  where id = p_order_id;

  insert into public.order_events(order_id, event_type, old_status, new_status, actor_id)
  values (p_order_id, 'status_changed', 'preparing', 'ready', p_actor_id);

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.claim_order_for_delivery(
  p_order_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  order_record record;
begin
  select status, order_type, delivery_assignee_id
  into order_record
  from public.customer_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_record.order_type = 'pickup' then
    raise exception 'Pickup orders do not require a delivery assignee';
  end if;

  if order_record.status <> 'ready' then
    raise exception 'Order must be ready to claim';
  end if;

  if order_record.delivery_assignee_id = p_actor_id then
    return jsonb_build_object('success', true, 'already_done', true);
  end if;

  if order_record.delivery_assignee_id is not null then
    raise exception 'Order already claimed';
  end if;

  update public.customer_orders
  set delivery_assignee_id = p_actor_id,
      delivery_assigned_at = now()
  where id = p_order_id;

  insert into public.order_events(order_id, event_type, actor_id)
  values (p_order_id, 'delivery_claimed', p_actor_id);

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.release_delivery_assignment(
  p_order_id uuid,
  p_actor_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  order_record record;
begin
  select status, delivery_assignee_id
  into order_record
  from public.customer_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_record.status <> 'ready' then
    raise exception 'Delivery assignment can only be released before dispatch';
  end if;

  if order_record.delivery_assignee_id is null then
    return jsonb_build_object('success', true, 'already_done', true);
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

create or replace function public.dispatch_order(
  p_order_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  order_record record;
begin
  select status, delivery_assignee_id
  into order_record
  from public.customer_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_record.status = 'dispatched'
     and order_record.delivery_assignee_id = p_actor_id then
    return jsonb_build_object('success', true, 'already_done', true);
  end if;

  if order_record.status <> 'ready' then
    raise exception 'Order must be ready';
  end if;

  if order_record.delivery_assignee_id is distinct from p_actor_id then
    raise exception 'Order is assigned to another employee';
  end if;

  update public.customer_orders
  set status = 'dispatched',
      dispatched_at = now(),
      status_updated_at = now()
  where id = p_order_id;

  insert into public.order_events(order_id, event_type, old_status, new_status, actor_id)
  values (p_order_id, 'status_changed', 'ready', 'dispatched', p_actor_id);

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.mark_order_delivered(
  p_order_id uuid,
  p_actor_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  order_record record;
begin
  select status, order_type, payment_status, delivery_assignee_id
  into order_record
  from public.customer_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if order_record.status = 'delivered'
     and order_record.payment_status in (
       'payment_review_pending',
       'cash_with_employee',
       'cash_settled',
       'bank_paid'
     ) then
    return jsonb_build_object('success', true, 'already_done', true);
  end if;

  if order_record.order_type = 'pickup' then
    if order_record.status <> 'ready' then
      raise exception 'Pickup order must be ready';
    end if;
  else
    if order_record.status <> 'dispatched' then
      raise exception 'Delivery order must be dispatched';
    end if;

    if order_record.delivery_assignee_id is distinct from p_actor_id then
      raise exception 'Order is assigned to another employee';
    end if;
  end if;

  update public.customer_orders
  set status = 'delivered',
      delivered_at = now(),
      status_updated_at = now(),
      payment_status = 'payment_review_pending',
      payment_reference = null,
      cash_collected_by = null,
      cash_collected_at = null,
      cash_settled_by = null,
      cash_settled_at = null
  where id = p_order_id;

  insert into public.order_events(order_id, event_type, old_status, new_status, actor_id, notes)
  values (
    p_order_id,
    'status_changed',
    order_record.status,
    'delivered',
    p_actor_id,
    'Payment classification pending admin review'
  );

  return jsonb_build_object('success', true);
end;
$$;

create or replace function public.record_order_payment_classification(
  p_order_id uuid,
  p_actor_id uuid,
  p_payment_status text,
  p_payment_reference text default null,
  p_cash_collected_by uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  order_record record;
  normalized_reference text;
begin
  select status, order_type, payment_status, payment_reference,
         delivery_assignee_id, cash_collected_by
  into order_record
  from public.customer_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if p_payment_status not in ('cash_with_employee', 'bank_paid') then
    raise exception 'Unsupported payment classification';
  end if;

  normalized_reference := nullif(btrim(p_payment_reference), '');

  if order_record.payment_status = p_payment_status then
    if p_payment_status = 'cash_with_employee'
       and order_record.cash_collected_by is distinct from p_cash_collected_by then
      raise exception 'Payment was classified for another employee';
    end if;

    if p_payment_status = 'bank_paid'
       and order_record.payment_reference is distinct from normalized_reference then
      raise exception 'Payment was classified with another reference';
    end if;

    return jsonb_build_object('success', true, 'already_done', true);
  end if;

  if order_record.status <> 'delivered' then
    raise exception 'Order is not delivered';
  end if;

  if order_record.payment_status is distinct from 'payment_review_pending' then
    raise exception 'Payment was already classified';
  end if;

  if p_payment_status = 'cash_with_employee' then
    if p_cash_collected_by is null then
      raise exception 'Cash collector is required';
    end if;

    if order_record.order_type <> 'pickup'
       and order_record.delivery_assignee_id is distinct from p_cash_collected_by then
      raise exception 'Cash collector must be the delivery assignee';
    end if;

    update public.customer_orders
    set payment_method = 'CASH',
        payment_status = 'cash_with_employee',
        payment_reference = null,
        cash_collected_by = p_cash_collected_by,
        cash_collected_at = now()
    where id = p_order_id;
  else
    if p_cash_collected_by is not null then
      raise exception 'Bank payment cannot have a cash collector';
    end if;

    update public.customer_orders
    set payment_method = 'BANK',
        payment_status = 'bank_paid',
        payment_reference = normalized_reference,
        cash_collected_by = null,
        cash_collected_at = null
    where id = p_order_id;
  end if;

  insert into public.order_events(order_id, event_type, actor_id, notes)
  values (
    p_order_id,
    'payment_classified',
    p_actor_id,
    case
      when p_payment_status = 'cash_with_employee'
        then 'Cash assigned to employee custody'
      else 'Paid by bank transfer' || coalesce(' - ' || normalized_reference, '')
    end
  );

  return jsonb_build_object(
    'success', true,
    'payment_status', p_payment_status,
    'payment_reference', normalized_reference,
    'cash_collected_by', p_cash_collected_by
  );
end;
$$;

revoke all on function public.start_preparing_order(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mark_order_ready(uuid, uuid) from public, anon, authenticated;
revoke all on function public.claim_order_for_delivery(uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_delivery_assignment(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.dispatch_order(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mark_order_delivered(uuid, uuid) from public, anon, authenticated;
revoke all on function public.record_order_payment_classification(uuid, uuid, text, text, uuid) from public, anon, authenticated;

grant execute on function public.start_preparing_order(uuid, uuid) to service_role;
grant execute on function public.mark_order_ready(uuid, uuid) to service_role;
grant execute on function public.claim_order_for_delivery(uuid, uuid) to service_role;
grant execute on function public.release_delivery_assignment(uuid, uuid, text) to service_role;
grant execute on function public.dispatch_order(uuid, uuid) to service_role;
grant execute on function public.mark_order_delivered(uuid, uuid) to service_role;
grant execute on function public.record_order_payment_classification(uuid, uuid, text, text, uuid) to service_role;

comment on function public.mark_order_delivered(uuid, uuid) is
  'Marks delivery complete and defers payment classification to an authenticated JoudaStock admin.';
comment on function public.record_order_payment_classification(uuid, uuid, text, text, uuid) is
  'Records the JoudaApp side of an idempotent online-order payment classification.';
