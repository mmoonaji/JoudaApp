// ═══════════════════════════════════════════════════════
// commands.ts — Admin-only operational command reports
// ═══════════════════════════════════════════════════════

import { sendMessage } from './telegram.ts';
import { getClients } from './db.ts';
import { fmtDate } from './format.ts';
import { env, getInventoryUserId } from './config.ts';

const APP_ACTIVE_STATUSES = ['submitted', 'confirmed', 'reserved', 'preparing', 'delivered'];
const POS_ACTIVE_STATUSES = ['pending', 'reserve', 'prepare', 'deliver', 'paid'];
const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

type CountMap = Record<string, number>;

function money(value: number | null | undefined): string {
  return `${Math.round(value || 0).toLocaleString()} ر.ي`;
}

function countBy<T extends Record<string, unknown>>(rows: T[] | null | undefined, key: keyof T): CountMap {
  const counts: CountMap = {};
  for (const row of rows || []) {
    const value = String(row[key] || '');
    if (!value) continue;
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function sumBy<T>(rows: T[] | null | undefined, pick: (row: T) => number | null | undefined): number {
  return (rows || []).reduce((total, row) => total + (pick(row) || 0), 0);
}

function riyadhDayBounds(date = new Date()) {
  const shifted = new Date(date.getTime() + RIYADH_OFFSET_MS);
  const startUtc =
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
    RIYADH_OFFSET_MS;

  return {
    startIso: new Date(startUtc).toISOString(),
    endIso: new Date(startUtc + 24 * 60 * 60 * 1000).toISOString(),
  };
}

function minutesSince(createdAt?: string | null): string {
  if (!createdAt) return 'غير معروف';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
  if (minutes < 60) return `${minutes} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ساعة و${rest} دقيقة` : `${hours} ساعة`;
}

// ─── /help, /start ──────────────────────────────────────

export async function handleHelp(token: string, chatId: string, isAdminUser = false) {
  let text = '';
  if (isAdminUser) {
    text = `\
<b>بوت جوده — لوحة الإدارة</b>

/today — ملخص اليوم والمبيعات
/queue — حالة الطلبات المفتوحة والاختناقات
/money — الكاش والعهد المالية
/my — ملخصك الشخصي والعهدة

<i>الأوامر النصية متاحة للإدارة والمناديب المربوطين.</i>`;
  } else {
    text = `\
<b>بوت جوده — لوحة المندوب</b>

/my — ملخصك الشخصي (عهدة كاش + طلبات معلقة + مبالغ توصيل)
/help — عرض الأوامر المتاحة`;
  }

  await sendMessage(token, chatId, text);
}

// ─── /today ─────────────────────────────────────────────

export async function handleToday(token: string, chatId: string) {
  const { jouda, inventory } = getClients();
  const { startIso, endIso } = riyadhDayBounds();

  const [{ data: todayOrders }, { data: activeOrders }, { data: todayInvoices }] =
    await Promise.all([
      jouda
        .from('customer_orders')
        .select('status, total, subtotal, delivery_fee, payment_method, created_at')
        .gte('created_at', startIso)
        .lt('created_at', endIso)
        .neq('status', 'cancelled')
        .not('order_number', 'like', 'INV-%'),
      jouda
        .from('customer_orders')
        .select('status')
        .in('status', APP_ACTIVE_STATUSES)
        .not('order_number', 'like', 'INV-%'),
      inventory
        .from('invoices')
        .select('subtotal, discount, delivery_fee, total_amount, payment_method, workflow_status')
        .eq('is_voided', false)
        .gte('created_at', startIso)
        .lt('created_at', endIso),
    ]);

  const activeCounts = countBy(activeOrders, 'status');
  const todayCounts = countBy(todayOrders, 'status');
  const todaySales = sumBy(todayOrders, (o: any) => o.total);
  const deliveryFees = sumBy(todayOrders, (o: any) => o.delivery_fee);
  const cashSales = sumBy(todayOrders, (o: any) => o.payment_method === 'CASH' ? o.total : 0);
  const nonCashSales = Math.max(todaySales - cashSales, 0);
  const openCount = APP_ACTIVE_STATUSES.reduce((sum, status) => sum + (activeCounts[status] || 0), 0);
  const needsAttention =
    (activeCounts.submitted || 0) +
    (activeCounts.confirmed || 0) +
    (activeCounts.reserved || 0) +
    (activeCounts.preparing || 0);
  const posSales = sumBy(todayInvoices, (i: any) => i.total_amount);

  const text = `\
📊 <b>ملخص اليوم - جوده</b>

🛒 <b>طلبات اليوم:</b> ${todayOrders?.length || 0}
💰 <b>مبيعات اليوم:</b> ${money(todaySales)}
🧾 <b>فواتير Inventory اليوم:</b> ${money(posSales)}
🚚 <b>رسوم التوصيل:</b> ${money(deliveryFees)}
💵 <b>كاش:</b> ${money(cashSales)}
💳 <b>غير كاش:</b> ${money(nonCashSales)}

⏳ <b>طلبات مفتوحة الآن:</b> ${openCount}
• بانتظار الاعتماد: <b>${activeCounts.submitted || 0}</b>
• لم يستلمها أحد: <b>${activeCounts.confirmed || 0}</b>
• لم تبدأ/قيد التجهيز: <b>${(activeCounts.reserved || 0) + (activeCounts.preparing || 0)}</b>
• تم التسليم بانتظار الدفع: <b>${activeCounts.delivered || 0}</b>

✅ <b>مكتملة اليوم:</b> ${(todayCounts.paid || 0) + (todayCounts.deposited || 0)}
🔴 <b>تحتاج متابعة:</b> ${needsAttention}

📅 <b>آخر تحديث:</b> <code>${fmtDate()}</code>`;

  await sendMessage(token, chatId, text);
}

// ─── /queue ─────────────────────────────────────────────

export async function handleQueue(token: string, chatId: string) {
  const { jouda, inventory } = getClients();

  const [{ data: appOrders }, { data: posOrders }] = await Promise.all([
    jouda
      .from('customer_orders')
      .select('order_number, customer_name, total, status, created_at')
      .in('status', APP_ACTIVE_STATUSES)
      .not('order_number', 'like', 'INV-%')
      .order('created_at', { ascending: true }),
    inventory
      .from('invoices')
      .select('id, customer_name_snapshot, total_amount, workflow_status, created_at')
      .eq('is_voided', false)
      .eq('is_settled', false)
      .in('workflow_status', POS_ACTIVE_STATUSES)
      .order('created_at', { ascending: true }),
  ]);

  const appCounts = countBy(appOrders, 'status');
  const posCounts = countBy(posOrders, 'workflow_status');
  const oldestApp = (appOrders || []).find((o: any) =>
    ['submitted', 'confirmed', 'reserved', 'preparing'].includes(o.status)
  );
  const oldestPos = (posOrders || []).find((o: any) =>
    ['pending', 'reserve', 'prepare', 'deliver'].includes(o.workflow_status)
  );

  const oldest = [oldestApp, oldestPos]
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0] as any;

  const oldestLine = oldest
    ? `#${oldest.order_number || oldest.id} - منذ ${minutesSince(oldest.created_at)} - ${money(oldest.total || oldest.total_amount)}`
    : 'لا يوجد طلب متأخر حالياً';

  const text = `\
🚦 <b>حالة الطلبات المفتوحة</b>

🔴 <b>تحتاج تدخل الآن</b>
• بانتظار الاعتماد: <b>${appCounts.submitted || 0}</b>
• لم يستلمها أحد: <b>${(appCounts.confirmed || 0) + (posCounts.pending || 0)}</b>
• لم تبدأ تجهيزها: <b>${(appCounts.reserved || 0) + (posCounts.reserve || 0)}</b>

🟡 <b>قيد العمل</b>
• قيد التجهيز: <b>${(appCounts.preparing || 0) + (posCounts.prepare || 0)}</b>
• مع المندوب/بانتظار التسليم: <b>${(appCounts.delivered || 0) + (posCounts.deliver || 0)}</b>
• مدفوعة بانتظار الإيداع: <b>${posCounts.paid || 0}</b>

⏱️ <b>أقدم طلب مفتوح:</b>
${oldestLine}

📅 <b>آخر تحديث:</b> <code>${fmtDate()}</code>`;

  await sendMessage(token, chatId, text);
}

// ─── /money ─────────────────────────────────────────────

export async function handleMoney(token: string, chatId: string) {
  const { inventory, jouda } = getClients();
  const { startIso, endIso } = riyadhDayBounds();

  const [{ data: todayInvoices }, { data: unsettledInvoices }] = await Promise.all([
    inventory
      .from('invoices')
      .select('id, total_amount, subtotal, discount, delivery_fee, payment_method, workflow_status')
      .eq('is_voided', false)
      .gte('created_at', startIso)
      .lt('created_at', endIso),
    inventory
      .from('invoices')
      .select('id, collector_id, total_amount, subtotal, discount, delivery_fee, workflow_status, payment_method, users!invoices_collector_id_fkey(name)')
      .eq('is_voided', false)
      .eq('is_settled', false),
  ]);

  const invoiceIds = (unsettledInvoices || []).map((invoice: any) => invoice.id);
  const { data: appOrders } = invoiceIds.length
    ? await jouda.from('customer_orders').select('quotation_id, status').in('quotation_id', invoiceIds)
    : { data: [] };

  const appStatusMap: Record<string, string> = {};
  for (const order of appOrders || []) {
    if (order.quotation_id) appStatusMap[order.quotation_id] = order.status;
  }

  const driverStats: Record<string, {
    name: string;
    collected: number;
    collectedCount: number;
    pendingCount: number;
    markedDepositedCount: number;
  }> = {};
  let cashToDeposit = 0;
  let deliveredNotPaid = 0;
  let paidNotDeposited = 0;
  let missingCollectorCount = 0;
  let missingCollectorAmount = 0;
  let markedDepositedNotSettled = 0;
  let markedDepositedNotSettledAmount = 0;

  for (const invoice of unsettledInvoices || []) {
    const driverId = invoice.collector_id || 'unassigned';
    if (!driverStats[driverId]) {
      // @ts-ignore Supabase nested relation typing is not available in Edge runtime.
      driverStats[driverId] = {
        name: invoice.collector_id ? (invoice.users?.name || 'غير معروف') : 'غير مسند',
        collected: 0,
        collectedCount: 0,
        pendingCount: 0,
        markedDepositedCount: 0,
      };
    }

    const effectiveStatus = appStatusMap[invoice.id] || invoice.workflow_status;
    const cashAmount = invoice.payment_method === 'CASH'
      ? Math.max((invoice.subtotal ?? ((invoice.total_amount || 0) - (invoice.delivery_fee || 0))) - (invoice.discount || 0), 0)
      : 0;
    const isCashStatusNeedingCustody = ['delivered', 'deliver', 'paid', 'deposited', 'deposit'].includes(effectiveStatus);

    if (!invoice.collector_id && cashAmount > 0 && isCashStatusNeedingCustody) {
      missingCollectorCount++;
      missingCollectorAmount += cashAmount;
    }

    if (effectiveStatus === 'paid') {
      driverStats[driverId].collected += cashAmount;
      driverStats[driverId].collectedCount++;
      cashToDeposit += cashAmount;
      paidNotDeposited++;
    } else if (effectiveStatus === 'deposited' || effectiveStatus === 'deposit') {
      if (cashAmount > 0) {
        driverStats[driverId].markedDepositedCount++;
        markedDepositedNotSettled++;
        markedDepositedNotSettledAmount += cashAmount;
      }
    } else {
      driverStats[driverId].pendingCount++;
      if (effectiveStatus === 'delivered' || effectiveStatus === 'deliver') deliveredNotPaid++;
    }
  }

  const todaySales = sumBy(todayInvoices, (i: any) => i.total_amount);
  const todayDelivery = sumBy(todayInvoices, (i: any) => i.delivery_fee);
  const todayCash = sumBy(todayInvoices, (i: any) => i.payment_method === 'CASH' ? i.total_amount : 0);
  const driverLines = Object.values(driverStats)
    .filter((driver) => driver.collectedCount > 0 || driver.pendingCount > 0 || driver.markedDepositedCount > 0)
    .map((driver) =>
      `• ${driver.name}: <b>${money(driver.collected)}</b> - محصل ${driver.collectedCount} / معلق ${driver.pendingCount} / مودع بلا تسوية ${driver.markedDepositedCount}`
    )
    .join('\n') || 'لا توجد عهد حالية على المناديب.';

  const text = `\
💰 <b>تقرير المال والعهد</b>

📊 <b>اليوم</b>
• إجمالي المبيعات: <b>${money(todaySales)}</b>
• رسوم التوصيل: <b>${money(todayDelivery)}</b>
• كاش اليوم: <b>${money(todayCash)}</b>
• غير كاش: <b>${money(Math.max(todaySales - todayCash, 0))}</b>

💵 <b>كاش مطلوب توريده:</b> <b>${money(cashToDeposit)}</b>
⚠️ <b>كاش بلا محصل:</b> <b>${missingCollectorCount}</b> فاتورة - <b>${money(missingCollectorAmount)}</b>
⚠️ <b>مودع بلا تسوية:</b> <b>${markedDepositedNotSettled}</b> فاتورة - <b>${money(markedDepositedNotSettledAmount)}</b>

🏍️ <b>حسب المندوب</b>
${driverLines}

⏳ <b>متابعة مالية</b>
• تم التسليم ولم يؤكد الدفع: <b>${deliveredNotPaid}</b>
• مدفوعة ولم تودع: <b>${paidNotDeposited}</b>

📅 <b>آخر تحديث:</b> <code>${fmtDate()}</code>`;

  await sendMessage(token, chatId, text);
}

// ─── /my (Driver self-service report) ────────────────────

export async function handleMy(token: string, chatId: string) {
  const { inventory } = getClients();
  const inventoryUserId = getInventoryUserId(chatId);
  if (!inventoryUserId) {
    await sendMessage(token, chatId, '⚠️ حساب التليجرام الخاص بك غير مربوط بمندوب في النظام.');
    return;
  }

  // Fetch driver name
  const { data: driverUser } = await inventory
    .from('users')
    .select('name')
    .eq('id', inventoryUserId)
    .single();

  const driverName = driverUser?.name || 'مندوب جودة';

  // Fetch unsettled invoices for this collector
  const { data: invoices, error } = await inventory
    .from('invoices')
    .select('id, workflow_status, total_amount, subtotal, discount, delivery_fee, payment_method')
    .eq('collector_id', inventoryUserId)
    .eq('is_settled', false)
    .eq('is_voided', false);

  if (error) {
    console.error('Error fetching driver invoices:', error);
    await sendMessage(token, chatId, '⚠️ حدث خطأ أثناء جلب بياناتك المالية.');
    return;
  }

  let cashToDeposit = 0;
  let paidCount = 0;
  let deliveringCount = 0;
  let deliveredNotPaidCount = 0;
  let deliveredNotPaidAmount = 0;
  let totalDeliveryFees = 0;

  for (const inv of invoices || []) {
    const cashAmount = inv.payment_method === 'CASH'
      ? Math.max((inv.subtotal ?? ((inv.total_amount || 0) - (inv.delivery_fee || 0))) - (inv.discount || 0), 0)
      : 0;

    const deliveryFee = inv.delivery_fee || 0;
    totalDeliveryFees += deliveryFee;

    if (inv.workflow_status === 'paid') {
      cashToDeposit += cashAmount;
      paidCount++;
    } else if (inv.workflow_status === 'deliver') {
      deliveredNotPaidCount++;
      deliveredNotPaidAmount += cashAmount;
    } else if (['reserve', 'prepare'].includes(inv.workflow_status)) {
      deliveringCount++;
    }
  }

  const text = `\
👤 <b>الملخص الشخصي للمندوب: ${driverName}</b>

🏍️ <b>الطلبات المعلقة:</b>
• طلبات قيد التجهيز/التوصيل: <b>${deliveringCount}</b> طلب
• تم تسليمها (بانتظار التحصيل): <b>${deliveredNotPaidCount}</b> طلب (بإجمالي كاش: <b>${money(deliveredNotPaidAmount)}</b>)

💵 <b>العهد المالية والتوريد:</b>
• كاش بحوزتك مطلوب توريده: <b>${money(cashToDeposit)}</b> (من <b>${paidCount}</b> طلب)

🚚 <b>أجور التوصيل:</b>
• إجمالي رسوم التوصيل لعهدتك الحالية: <b>${money(totalDeliveryFees)}</b>

📅 <b>تاريخ الاستعلام:</b> <code>${fmtDate()}</code>

<i>نرجو توريد المبالغ المحصلة للمشرف أولاً بأول لتصفية عهدتك.</i>`;

  await sendMessage(token, chatId, text);
}
