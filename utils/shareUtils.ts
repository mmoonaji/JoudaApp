/**
 * Share utilities and deep link helpers for Jouda Store
 */

export interface SharePayload {
  title: string;
  text: string;
  url: string;
  onCopied?: () => void;
}

export type ShareResult = 'shared' | 'copied' | 'opened_whatsapp' | 'dismissed';

/**
 * Builds the canonical product deep link URL
 */
export function buildProductShareUrl(productId: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://joudafood.com');
  const cleanId = encodeURIComponent(productId.trim());
  return `${base}/products?id=${cleanId}`;
}

/**
 * Strips markdown markup, tables, and excessive formatting for chat message clarity
 */
export function cleanShareText(rawText?: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/^ *\|.*\| *$/gm, '') // remove entire markdown table rows
    .replace(/\|/g, '') // remove any stray pipes
    .replace(/[#*`~_\[\]]/g, '') // remove markdown symbols
    .replace(/\n\s*\n/g, '\n') // collapse multiple empty lines
    .trim();
}

/**
 * Formats introductory share text without the URL (to prevent duplication on platforms that append url)
 */
export function formatProductShareIntro(productName: string): string {
  return `شاهد "${productName}" من متجر جودة للأغذية الخالية من الجلوتين:`;
}

/**
 * Formats a clean, professional product share message for WhatsApp / social apps
 */
export function formatProductShareText(productName: string, shareUrl: string): string {
  return `${formatProductShareIntro(productName)}\n${shareUrl}`;
}

/**
 * Builds the canonical article deep link URL
 */
export function buildArticleShareUrl(articleId: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://joudafood.com');
  const cleanId = encodeURIComponent(articleId.trim());
  return `${base}/articles/${cleanId}`;
}

/**
 * Formats introductory share text for articles without the URL
 */
export function formatArticleShareIntro(articleTitle: string): string {
  return `اقرأ مقال "${articleTitle}" من مدونة جودة:`;
}

/**
 * Formats a clean article share message for WhatsApp / social apps
 */
export function formatArticleShareText(articleTitle: string, shareUrl: string): string {
  return `${formatArticleShareIntro(articleTitle)}\n${shareUrl}`;
}

/**
 * Robust 3-tier sharing pipeline:
 * 1. Native Web Share API (mobile devices)
 * 2. Clipboard API fallback (desktop / unsupported browsers)
 * 3. WhatsApp Direct Intent fallback (restricted environments)
 */
export async function executeProductShare(payload: SharePayload): Promise<ShareResult> {
  const { title, text, url, onCopied } = payload;

  // Crucial: Many apps (WhatsApp, Twitter, Gmail) automatically concatenate `text + ' ' + url`.
  // If `text` already contains `url`, the recipient sees the link twice!
  // We strip `url` from `text` before calling navigator.share to guarantee it appears exactly once.
  const textWithoutUrl = text.replace(url, '').trim();
  const fullText = text.includes(url) ? text : `${text}\n${url}`.trim();

  // 1. Try Native Web Share
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text: textWithoutUrl,
        url,
      });
      return 'shared';
    } catch (err: any) {
      // If user deliberately cancelled/dismissed native sheet, do not trigger fallback
      if (err?.name === 'AbortError') {
        return 'dismissed';
      }
      // Otherwise proceed to clipboard fallback
    }
  }

  // 2. Try Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(fullText);
      if (onCopied) onCopied();
      return 'copied';
    } catch (err) {
      // Proceed to WhatsApp fallback
    }
  }

  // 3. WhatsApp Direct Intent Fallback
  if (typeof window !== 'undefined') {
    try {
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
      window.open(waUrl, '_blank', 'noopener,noreferrer');
      return 'opened_whatsapp';
    } catch (err) {
      return 'dismissed';
    }
  }

  return 'dismissed';
}

export const executeArticleShare = executeProductShare;
export const executeShare = executeProductShare;
