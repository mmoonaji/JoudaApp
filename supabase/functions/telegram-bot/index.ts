// ═══════════════════════════════════════════════════════
// index.ts — Jouda Telegram Bot (Clean Architecture)
// ═══════════════════════════════════════════════════════
//
// This file is a PURE ROUTER. No business logic here.
// All it does: authenticate → route → respond.
//
// Structure:
//   config.ts    → Environment & constants
//   db.ts        → Supabase clients
//   telegram.ts  → Telegram API helpers
//   format.ts    → Date/phone/message formatting
//   workflow.ts  → State machines (wf_* & inv_*)
//   commands.ts  → Admin text commands (/help, /today, /queue, /money)
//   wf-callbacks → App order buttons (wf_*)
//   inv-callbacks→ POS invoice buttons (inv_*)
//   incoming.ts  → DB webhook (new/reversed invoices)

import { answerCallback, sendMessage } from './telegram.ts';
import { env, getInventoryUserId } from './config.ts';
import { handleInvCallback } from './inv-callbacks.ts';
import { handleNewInvoice, handleReversedInvoice } from './incoming.ts';
import { handleHelp, handleToday, handleQueue, handleMoney, handleMy } from './commands.ts';

// ─── Main Server ────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const botToken = env.botToken();
  if (!botToken) {
    return new Response(
      JSON.stringify({ error: 'Missing TELEGRAM_BOT_TOKEN' }),
      { status: 500 },
    );
  }

  try {
    const update = await req.json();

    // ═══ Authentication ═════════════════════════════════

    if (update.update_id !== undefined) {
      // Telegram update → verify X-Telegram-Bot-Api-Secret-Token
      const secret = env.telegramSecret();
      if (secret) {
        const provided =
          req.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
        if (provided !== secret) {
          console.warn('Invalid Telegram webhook secret');
          return new Response('Unauthorized', { status: 401 });
        }
      }
    } else {
      // Non-Telegram (DB webhook / Cron) → require WEBHOOK_SECRET
      const secret = env.webhookSecret();
      const provided =
        req.headers.get('x-webhook-secret') ||
        req.headers.get('authorization')?.replace('Bearer ', '') ||
        '';
      
      console.log(`[Diagnostic] Webhook auth check:`);
      console.log(`- Expected secret configured: ${!!secret} (length: ${secret?.length || 0})`);
      console.log(`- Provided secret present: ${!!provided} (length: ${provided?.length || 0})`);
      if (secret && provided) {
        const secretStr = String(secret);
        const providedStr = String(provided);
        console.log(`- Expected start/end: ${secretStr.substring(0, 2)}...${secretStr.substring(secretStr.length - 2)}`);
        console.log(`- Provided start/end: ${providedStr.substring(0, 2)}...${providedStr.substring(providedStr.length - 2)}`);
      }

      if (!secret) {
        return new Response('WEBHOOK_SECRET not configured', { status: 500 });
      }
      if (provided !== secret) {
        const secretStr = String(secret);
        const providedStr = String(provided);
        return new Response(
          JSON.stringify({
            error: 'Unauthorized',
            expected_length: secretStr.length,
            provided_length: providedStr.length,
            expected_start_end: `${secretStr.substring(0, 2)}...${secretStr.substring(secretStr.length - 2)}`,
            provided_start_end: providedStr.length > 2 ? `${providedStr.substring(0, 2)}...${providedStr.substring(providedStr.length - 2)}` : providedStr,
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // ═══ Route: DB Webhook (POS Invoice) ════════════════

    if (update.type && update.table === 'invoices' && update.record) {
      const { record, old_record, type } = update;
      if (type === 'INSERT' && record.status === 'POSTED') {
        await handleNewInvoice(record);
      } else if (
        type === 'UPDATE' &&
        record.is_voided &&
        !old_record?.is_voided
      ) {
        await handleReversedInvoice(record);
      }
      return new Response('OK');
    }

    // ═══ Route: Callback Query (Button Press) ═══════════

    if (update.callback_query) {
      const cb = update.callback_query;
      const cbChatId = String(cb.message?.chat?.id || cb.from?.id);
      const cbData = (cb.data as string) || '';

      // Auth: must be from admin chat or group chat
      const allowed = [...env.adminIds(), ...env.groupIds()];
      if (!allowed.includes(cbChatId)) {
        await answerCallback(botToken, cb.id, 'غير مصرح');
        return new Response('OK');
      }

      // Route by prefix
      if (cbData.startsWith('wf_')) {
        await answerCallback(
          botToken,
          cb.id,
          'تتم إدارة الطلب من نظام المخزون',
          true,
        );
      } else if (cbData.startsWith('inv_')) {
        await handleInvCallback(botToken, cbChatId, cb);
      } else {
        // Legacy order_* buttons or unknown
        await answerCallback(
          botToken,
          cb.id,
          '⚠️ هذا الزر من إصدار قديم. أعد إرسال الطلب.',
          true,
        );
      }
      return new Response('OK');
    }

    // ═══ Route: Text Message ════════════════════════════

    const message = update.message;
    if (!message?.text) return new Response('OK');

    const chatId = String(message.chat.id);
    const text = message.text.trim();

    // Group chats: text commands are disabled; workflow buttons still work above.
    if (chatId.startsWith('-')) {
      return new Response('OK');
    }

    // Private text commands are admin-only or driver-only.
    const isDriver = !!env.allChatIds().includes(chatId) || !!getInventoryUserId(chatId);
    const isAdminUser = env.adminIds().includes(chatId);

    if (!isAdminUser && !isDriver) {
      await sendMessage(botToken, chatId, 'هذا البوت خاص بإدارة جوده.');
      return new Response('OK');
    }

    // Parse and route command
    const command = text
      .split(/\s+/)[0]
      .toLowerCase()
      .replace(/@\w+$/, '');

    switch (command) {
      case '/start':
      case '/help':
        await handleHelp(botToken, chatId, isAdminUser);
        break;

      case '/my':
        await handleMy(botToken, chatId);
        break;

      case '/today':
        if (!isAdminUser) {
          await sendMessage(botToken, chatId, '🔒 هذا الأمر للمدير فقط.');
          break;
        }
        await handleToday(botToken, chatId);
        break;

      case '/queue':
        if (!isAdminUser) {
          await sendMessage(botToken, chatId, '🔒 هذا الأمر للمدير فقط.');
          break;
        }
        await handleQueue(botToken, chatId);
        break;

      case '/money':
        if (!isAdminUser) {
          await sendMessage(botToken, chatId, '🔒 هذا الأمر للمدير فقط.');
          break;
        }
        await handleMoney(botToken, chatId);
        break;

      default:
        await sendMessage(botToken, chatId, 'أمر غير معروف. أرسل /help');
    }
  } catch (err: any) {
    console.error('Bot error:', err?.message || err);
  }

  return new Response('OK');
});
