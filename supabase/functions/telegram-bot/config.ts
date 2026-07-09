// ═══════════════════════════════════════════════════════
// config.ts — Environment helpers & constants
// ═══════════════════════════════════════════════════════

// ─── Environment Helpers ────────────────────────────────

export const env = {
  botToken: () => Deno.env.get('TELEGRAM_BOT_TOKEN')!,

  webhookSecret: () => Deno.env.get('WEBHOOK_SECRET'),

  telegramSecret: () => Deno.env.get('TELEGRAM_WEBHOOK_SECRET'),

  systemUserId: () => Deno.env.get('SYSTEM_USER_UUID') || 'telegram-bot',

  /** All IDs from TELEGRAM_ADMIN_CHAT_ID (admins + groups mixed) */
  allChatIds: () =>
    (Deno.env.get('TELEGRAM_ADMIN_CHAT_ID') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),

  /** Private admin IDs only (positive numbers, no minus prefix) */
  adminIds: () => env.allChatIds().filter((id) => !id.startsWith('-')),

  /** Group IDs from TELEGRAM_GROUP_CHAT_ID */
  groupIds: () =>
    (Deno.env.get('TELEGRAM_GROUP_CHAT_ID') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),

  /** Discussion thread/topic ID */
  discussionThreadId: () =>
    Number(Deno.env.get('TELEGRAM_DISCUSSION_THREAD_ID') || 0),
};


// ─── Status Labels (Arabic) ────────────────────────────

export const STATUS_LABEL: Record<string, string> = {
  submitted: '🆕 جديد',
  confirmed: '✅ مؤكد',
  reserved: '📦 محجوز',
  preparing: '👨‍🍳 قيد التحضير',
  delivered: '🚚 تم التوصيل',
  paid: '💰 تم الاستلام',
  deposited: '🏦 تم الإيداع',
  cancelled: '❌ ملغي',
};

// ─── Helpers ────────────────────────────────────────────

/** Check if a Telegram user ID belongs to an admin */
export function isAdmin(userId: string | number): boolean {
  return env.adminIds().includes(String(userId));
}

/** Get the Inventory User ID mapped to a Telegram User ID */
export function getInventoryUserId(telegramId: string): string | null {
  try {
    const mapStr = Deno.env.get('TELEGRAM_DRIVER_MAP');
    if (!mapStr) return null;
    const map = JSON.parse(mapStr);
    return map[telegramId] || null;
  } catch (e) {
    console.error('Error parsing TELEGRAM_DRIVER_MAP:', e);
    return null;
  }
}
