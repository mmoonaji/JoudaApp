// ═══════════════════════════════════════════════════════
// incoming.ts — Handle new/reversed invoices from POS
// ═══════════════════════════════════════════════════════
//
// Called when Inventory DB webhook fires on invoices table.
// INSERT (POSTED) → send to group with inv_* buttons
// UPDATE (is_voided) → notify group + cancel in JoudaApp

import { sendMessage, editMessage, getMessageLink } from './telegram.ts';
import { getClients } from './db.ts';
import { env } from './config.ts';
import { invButtons } from './workflow.ts';

import { fmtDate, paymentLabel, formatPhone } from './format.ts';

// ─── New Invoice (POS → Group) ──────────────────────────

export async function handleNewInvoice(record: any) {
  if (!record.customer_name_snapshot) return;

  const token = env.botToken();
  const { jouda, inventory } = getClients();

  // Fetch invoice items
  const { data: items } = await inventory
    .from('invoice_items')
    .select('product_name_snapshot, quantity')
    .eq('invoice_id', record.id);

  // Get collector name
  let collectorName = '—';
  if (record.collector_id) {
    const { data: user } = await inventory
      .from('users')
      .select('name')
      .eq('id', record.collector_id)
      .single();
    if (user) collectorName = user.name;
  }

  // Create tracking record in JoudaApp
  try {
    await jouda.from('customer_orders').insert({
      quotation_id: record.id,
      order_number: record.id,
      customer_name: record.customer_name_snapshot,
      customer_phone: record.customer_phone_snapshot || '',
      customer_address: record.customer_address_snapshot || null,
      subtotal: record.subtotal || 0,
      delivery_fee: record.delivery_fee || 0,
      total: record.total_amount || 0,
      payment_method: record.payment_method || 'CASH',
      status: 'submitted',
    });
  } catch (e) {
    console.warn('Failed to create customer_order:', e);
  }

  // Build message
  const itemCount = items?.length || 0;
  const itemsList = (items || [])
    .slice(0, 8)
    .map((i: any) => `• ${i.product_name_snapshot} × ${i.quantity}`)
    .join('\n');
  const extraItems =
    itemCount > 8 ? `\n<i>+ ${itemCount - 8} صنف آخر...</i>` : '';

  const subtotal = record.subtotal || 0;
  const discount = record.discount || 0;
  const companyAmount = Math.max(subtotal - discount, 0);
  const deliveryFee = record.delivery_fee || 0;

  const message = `\
🛒 <b>فاتورة مبيعات جديدة (#${record.id})</b>

👤 <b>العميل:</b> ${record.customer_name_snapshot}
${record.customer_phone_snapshot ? `📞 <b>الرقم:</b> <code>${formatPhone(record.customer_phone_snapshot)}</code>\n` : ''}\
💳 <b>الدفع:</b> <code>${paymentLabel(record.payment_method || 'CASH')}</code>
${record.collector_id ? `🧔 <b>المحصل:</b> ${collectorName}\n` : ''}\
📦 <b>المنتجات:</b>
${itemsList}${extraItems}

💵 <b>قيمة المبيعات:</b> <b>${companyAmount.toLocaleString()}</b> ر.ي
🚚 <b>أجور التوصيل:</b> <b>${deliveryFee.toLocaleString()}</b> ر.ي
💰 <b>الإجمالي الكلي:</b> <b>${(companyAmount + deliveryFee).toLocaleString()}</b> ر.ي
`.trim();

  for (const gId of env.groupIds()) {
    try {
      const res = await sendMessage(token, gId, message, { reply_markup: { inline_keyboard: invButtons(record.id, 'pending') } });
      
      const discThreadId = env.discussionThreadId();
      if (res && res.ok && discThreadId) {
        const originalMessageId = res.result.message_id;
        const originalMessageLink = getMessageLink(gId, originalMessageId);

        const discMsgText = `\
💬 <b>نقاش حول الطلب (#${record.id})</b>
👤 <b>العميل:</b> ${record.customer_name_snapshot}

🔙 <a href="${originalMessageLink}">انتقال للطلب الأصلي</a>`.trim();

        const discRes = await sendMessage(token, gId, discMsgText, {
          message_thread_id: discThreadId,
        });

        if (discRes && discRes.ok) {
          const discussionMessageId = discRes.result.message_id;
          const discussionLink = getMessageLink(gId, discussionMessageId);

          try {
            await jouda
              .from('customer_orders')
              .update({ discussion_message_id: discussionMessageId })
              .eq('quotation_id', record.id);
          } catch (dbErr) {
            console.warn('Failed to save discussion_message_id:', dbErr);
          }

          const updatedKeyboard = {
            inline_keyboard: invButtons(record.id, 'pending', discussionLink),
          };
          await editMessage(token, gId, originalMessageId, message, {
            reply_markup: updatedKeyboard,
          });
        }
      }
    } catch (e) {
      console.error(`Failed to send invoice to ${gId}:`, e);
    }
  }
}


// ─── Reversed Invoice ───────────────────────────────────

export async function handleReversedInvoice(record: any) {
  // Temporarily disabled by user request (2026-06-18)
  return;

  if (!record.is_voided) return;

  const token = env.botToken();
  const { jouda } = getClients();

  // Cancel tracking in JoudaApp
  try {
    await jouda
      .from('customer_orders')
      .update({ status: 'cancelled' })
      .eq('quotation_id', record.id);
  } catch (e) {
    console.warn('Failed to cancel JoudaApp order:', e);
  }

  const message = `\
🔄 <b>عكس فاتورة مبيعات ⚠️ (#${record.id})</b>

👤 <b>العميل:</b> ${record.customer_name_snapshot || '—'}
💰 <b>المبلغ المرتجع:</b> <b>${(record.total_amount || 0).toLocaleString()}</b> ر.ي

📌 <b>الإجراء:</b> <code>تم إعادة المخزون وإلغاء القيد المالي بنجاح</code>
`.trim();

  for (const gId of env.groupIds()) {
    try {
      await sendMessage(token, gId, message);
    } catch (e) {
      console.error(`Failed to send reversal to ${gId}:`, e);
    }
  }
}
