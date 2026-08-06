-- Apply only after the JoudaStock dashboard reads orders through online-orders/list.

drop policy if exists admin_dashboard_read_orders on public.customer_orders;
drop policy if exists admin_dashboard_read_order_items on public.order_items;
