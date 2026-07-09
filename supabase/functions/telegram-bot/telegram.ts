// ═══════════════════════════════════════════════════════
// telegram.ts — Telegram Bot API helpers
// ═══════════════════════════════════════════════════════

const API = (token: string) => `https://api.telegram.org/bot${token}`;

/** Send a new message */
export async function sendMessage(
  token: string,
  chatId: string,
  text: string,
  options: Record<string, unknown> = {},
) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML', ...options };
  const res = await fetch(`${API(token)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** Edit an existing message text (and optionally keyboard) */
export async function editMessage(
  token: string,
  chatId: string,
  messageId: number,
  text: string,
  options: Record<string, unknown> = {},
) {
  const body = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    ...options,
  };
  const res = await fetch(`${API(token)}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** Answer a callback query (button press acknowledgment) */
export async function answerCallback(
  token: string,
  callbackId: string,
  text = '',
  showAlert = false,
) {
  await fetch(`${API(token)}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackId,
      text,
      show_alert: showAlert,
    }),
  });
}

/** Copy a message to a destination chat/topic */
export async function copyMessage(
  token: string,
  chatId: string,
  fromChatId: string,
  messageId: number,
  options: Record<string, unknown> = {},
) {
  const body = {
    chat_id: chatId,
    from_chat_id: fromChatId,
    message_id: messageId,
    ...options,
  };
  const res = await fetch(`${API(token)}/copyMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

/** Generate a Telegram deep link to a specific message in a supergroup */
export function getMessageLink(chatId: string, messageId: number): string {
  const cleanChatId = chatId.replace(/^-100/, '');
  return `https://t.me/c/${cleanChatId}/${messageId}`;
}

