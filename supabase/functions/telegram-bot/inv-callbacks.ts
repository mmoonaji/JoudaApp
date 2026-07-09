// ═══════════════════════════════════════════════════════
// inv-callbacks.ts — POS Invoice Workflow (inv_* buttons)
// ═══════════════════════════════════════════════════════
//
// Handles: inv_reserve, inv_prepare, inv_deliver,
//          inv_paid, inv_deposit, inv_reverse

import { answerCallback, editMessage, getMessageLink } from './telegram.ts';

import { getClients } from './db.ts';
import { env, isAdmin, getInventoryUserId } from './config.ts';
import { INV_ACTIONS, invButtons, INV_ACTION_TO_APP_STATUS_MAP } from './workflow.ts';
import { fmtDate } from './format.ts';
import { parseCallbackData, handleAbort, requireConfirmation } from './confirmations.ts';

// ─── Main Handler ───────────────────────────────────────

export async function handleInvCallback(
  token: string,
  chatId: string,
  callback: any,
) {
  const { action, id: invoiceId, isConfirmed, isAbort } = parseCallbackData(callback.data);
  const userName = callback.from?.first_name || 'موظف';
  const userId = String(callback.from?.id);
  const messageId = callback.message?.message_id;

  const { inventory, jouda } = getClients();

  // Fetch discussion_message_id from JoudaApp customer_orders
  let discussionMessageId: number | null = null;
  try {
    const { data: order } = await jouda
      .from('customer_orders')
      .select('discussion_message_id')
      .eq('quotation_id', invoiceId)
      .single();
    if (order) discussionMessageId = order.discussion_message_id;
  } catch (e) {
    console.warn('Failed to fetch discussion_message_id for POS invoice:', e);
  }

  // ── 1. Fetch invoice ──
  const { data: invoice } = await inventory
    .from('invoices')
    .select('id, workflow_status, is_voided, status')
    .eq('id', invoiceId)
    .single();

  if (!invoice || invoice.is_voided) {
    await answerCallback(
      token,
      callback.id,
      '⚠️ الفاتورة غير موجوده أو ملغية',
      true,
    );
    return;
  }

  if (invoice.status !== 'POSTED') {
    await answerCallback(
      token,
      callback.id,
      '⚠️ الفاتورة غير مرحّلة',
      true,
    );
    return;
  }

  const currentWf = invoice.workflow_status || 'pending';

  // ── 1.5 Special action: abort (cancel confirmation) ──
  if (isAbort) {
    const discussionLink = discussionMessageId ? getMessageLink(chatId, discussionMessageId) : null;
    const restoredButtons = invButtons(invoiceId, currentWf, discussionLink);
    await handleAbort(token, chatId, callback.id, messageId, callback.message?.text || '', restoredButtons);
    return;
  }


  // ── 2. Validate action against state machine ──
  const currentActions = INV_ACTIONS[currentWf];
  if (!currentActions || !currentActions[action]) {
    await answerCallback(
      token,
      callback.id,
      '⚠️ هذا الإجراء غير متاح في الحالة الحالية',
      true,
    );
    return;
  }

  const actionDef = currentActions[action];

  // ── 3. Admin guard ──
  if (actionDef.adminOnly && !isAdmin(userId)) {
    await answerCallback(
      token,
      callback.id,
      '🔒 هذا الإجراء للمدير فقط',
      true,
    );
    return;
  }

  // ── 3.5 Check Confirmation ──
  if (actionDef.requiresConfirmation && !isConfirmed) {
    await requireConfirmation(token, chatId, callback.id, messageId, callback.message?.text || '', action, invoiceId, actionDef, 'inv');
    return;
  }

  // ── 4. Handle reverse (special: calls RPC) ──
  if (action === 'reverse') {
    await handleReverse(
      token,
      chatId,
      callback,
      invoiceId,
      userName,
    );
    return;
  }

  // ── 4.5 Deposit → settle invoice via RPC (creates settlement_batch + wallet entry) ──
  // TEMPORARILY DISABLED PER USER REQUEST (2026-06-25)
  /*
  if (action === 'deposit') {
    const { data: settleResult, error: settleErr } = await inventory.rpc('settle_single_invoice', {
      p_invoice_id: invoiceId,
      p_actor_user_id: env.systemUserId(),
      p_idempotency_key: `settle_${invoiceId}`,
    });
    if (settleErr) {
      await answerCallback(
        token,
        callback.id,
        `فشل التوريد: ${settleErr.message}`,
        true,
      );
      return;
    }
    const settleData = settleResult as any;
    if (settleData && settleData.success === false) {
      await answerCallback(
        token,
        callback.id,
        `فشل التوريد: ${settleData.error || 'خطأ غير معروف'}`,
        true,
      );
      return;
    }
  }
  */

  // ── 5. Normal action: update workflow_status (optimistic lock) ──
  const { error: updateErr } = await inventory
    .from('invoices')
    .update({
      workflow_status: actionDef.nextStatus,
      workflow_updated_by: userId,
      workflow_updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .eq('workflow_status', currentWf); // Optimistic lock

  if (updateErr) {
    await answerCallback(
      token,
      callback.id,
      `فشل التحديث: ${updateErr.message}`,
      true,
    );
    return;
  }

  if (INV_ACTION_TO_APP_STATUS_MAP[action]) {
    await jouda
      .from('customer_orders')
      .update({ status: INV_ACTION_TO_APP_STATUS_MAP[action] })
      .eq('quotation_id', invoiceId);
  }

  // ── 6.5 Invoice Assignment (Driver Mapping) — reserve only ──
  // TEMPORARILY DISABLED PER USER REQUEST (2026-06-25)
  // Only assign collector at the 'reserve' step. Prepare/deliver can be done by anyone.
  /*
  if (action === 'reserve') {
    const inventoryUserId = getInventoryUserId(userId);
    if (inventoryUserId) {
      const { data, error } = await inventory.rpc('assign_invoice_to_collector', {
        p_invoice_id: invoiceId,
        p_collector_id: inventoryUserId,
        p_actor_user_id: env.systemUserId(),
      });
      if (error || (data && data.success === false)) {
        const errMsg = error?.message || data?.error || 'Unknown error';
        console.error('Failed to assign invoice:', errMsg);
        await answerCallback(token, callback.id, `⚠️ لم يتم إسناد الفاتورة في المخزون: ${errMsg}`, true);
      }
    } else {
      // Not mapped in TELEGRAM_DRIVER_MAP — block reserve since we need a collector
      await answerCallback(token, callback.id, `⚠️ لا يمكنك حجز الفاتورة: حسابك (${userId}) غير مربوط بالمخزون في TELEGRAM_DRIVER_MAP`, true);
      return;
    }
  }
  */

  // ── 7. Acknowledge ──
  await answerCallback(
    token,
    callback.id,
    `${actionDef.emoji} ${actionDef.label} — ${userName}`,
  );

  // ── 8. Update message: action trail + smart keyboard ──
  if (messageId) {
    const orig = callback.message?.text || '';
    const hasHeader = orig.includes('سجل الحركات');
    const headerBlock = hasHeader ? '' : '\n\n📋 <b>سجل الحركات:</b>';
    const trail = `${headerBlock}\n${actionDef.emoji} <b>${actionDef.label}</b> (بواسطة: ${userName})`;
    const discussionLink = discussionMessageId ? getMessageLink(chatId, discussionMessageId) : null;
    const nextBtns = invButtons(invoiceId, actionDef.nextStatus, discussionLink);


    await editMessage(token, chatId, messageId, orig + trail, {
      reply_markup:
        nextBtns.length > 0
          ? { inline_keyboard: nextBtns }
          : undefined,
    });
  }
}

// ─── Reverse Invoice (Admin only) ───────────────────────

async function handleReverse(
  token: string,
  chatId: string,
  callback: any,
  invoiceId: string,
  userName: string,
) {
  const messageId = callback.message?.message_id;
  const { inventory, jouda } = getClients();
  const suid = env.systemUserId();

  const { data: rpcResult, error } = await inventory.rpc('reverse_invoice', {
    p_invoice_id: invoiceId,
    p_actor_user_id: suid,
    p_reason: 'عكس من تليجرام',
    p_idempotency_key: `rev_${invoiceId}`,
  });

  if (error) {
    await answerCallback(
      token,
      callback.id,
      `فشل العكس: ${error.message}`,
      true,
    );
    return;
  }

  const result = rpcResult as any;
  if (result && result.success === false) {
    await answerCallback(
      token,
      callback.id,
      `فشل العكس: ${result.error || 'خطأ غير معروف'}`,
      true,
    );
    return;
  }

  // Cancel in JoudaApp too
  await jouda
    .from('customer_orders')
    .update({ status: 'cancelled' })
    .eq('quotation_id', invoiceId);

  await answerCallback(
    token,
    callback.id,
    `🔄 تم عكس الفاتورة — ${userName}`,
  );

  // Update message: remove all buttons
  if (messageId) {
    const orig = callback.message?.text || '';
    const hasHeader = orig.includes('سجل الحركات');
    const headerBlock = hasHeader ? '' : '\n\n📋 <b>سجل الحركات:</b>';
    const trail = `${headerBlock}\n🔄 <b>تم العكس</b> (بواسطة: ${userName})`;
    await editMessage(token, chatId, messageId, orig + trail, {
      reply_markup: undefined,
    });
  }
}
