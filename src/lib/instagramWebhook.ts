import { normalizeText } from './automationEngine';
import type { MessageContent } from '../types';

export interface NormalizedInstagramInbound {
  content: MessageContent;
  displayText: string;
  hasUserContent: boolean;
  replyPayload?: string;
}

const firstText = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
};

const asArray = (value: unknown): any[] => {
  if (Array.isArray(value)) return value;
  if (Array.isArray((value as any)?.data)) return (value as any).data;
  return value ? [value] : [];
};

function attachmentDescription(typeValue: unknown): { label: string; mediaType?: MessageContent['mediaType'] } {
  const type = String(typeValue || '').toLocaleLowerCase('en-US');
  if (/image|photo|sticker/.test(type)) return { label: type.includes('sticker') ? 'استیکر اینستاگرام' : 'تصویر اینستاگرام', mediaType: 'image' };
  if (/video|reel/.test(type)) return { label: 'ویدئو یا ریل اینستاگرام', mediaType: 'video' };
  if (/audio|voice/.test(type)) return { label: 'پیام صوتی اینستاگرام', mediaType: 'audio' };
  if (/share|story|post|ig_reel|link/.test(type)) return { label: 'پست، ریل یا استوری به‌اشتراک‌گذاشته‌شده' };
  if (/file|document/.test(type)) return { label: 'فایل ارسال‌شده در اینستاگرام' };
  if (/unsupported/.test(type)) return { label: 'پیام پشتیبانی‌نشدهٔ اینستاگرام' };
  return { label: type ? `پیوست اینستاگرام (${type})` : 'پیوست اینستاگرام' };
}

/**
 * Normalizes both Conversations API rows and messaging webhook payloads.
 * Delivery/read receipts intentionally report hasUserContent=false so they are
 * not persisted as empty chat bubbles.
 */
export function normalizeInstagramInbound(source: any, options: { isComment?: boolean } = {}): NormalizedInstagramInbound {
  const nestedMessage = source?.message && typeof source.message === 'object'
    ? source.message
    : source?.messages?.[0] && typeof source.messages[0] === 'object'
      ? source.messages[0]
      : source;
  const postback = source?.postback || nestedMessage?.postback;
  const quickReply = nestedMessage?.quick_reply || source?.quick_reply;
  const replyPayload = firstText(quickReply?.payload, postback?.payload);
  const text = firstText(
    options.isComment ? source?.text : undefined,
    typeof source?.message === 'string' ? source.message : undefined,
    nestedMessage?.text,
    source?.text,
    postback?.title,
    quickReply?.title,
    replyPayload,
  );

  const attachments = [
    ...asArray(nestedMessage?.attachments),
    ...asArray(source?.attachments),
    ...asArray(nestedMessage?.attachment),
    ...asArray(source?.attachment),
  ];
  const firstAttachment = attachments.find(Boolean);
  const rawType = firstText(
    firstAttachment?.type,
    firstAttachment?.mime_type,
    firstAttachment?.payload?.type,
    nestedMessage?.is_unsupported ? 'unsupported' : undefined,
  );
  const mediaUrl = firstText(
    firstAttachment?.image_data?.url,
    firstAttachment?.video_data?.url,
    firstAttachment?.audio_data?.url,
    firstAttachment?.file_url,
    firstAttachment?.payload?.url,
    firstAttachment?.url,
    firstAttachment?.image_url,
    firstAttachment?.video_url,
  );
  const attachment = firstAttachment ? attachmentDescription(rawType) : undefined;

  const shares = asArray(nestedMessage?.shares || source?.shares);
  const share = shares[0];
  const shareUrl = firstText(share?.link, share?.url, share?.media_url, share?.permalink);
  const reaction = source?.reaction || nestedMessage?.reaction;
  const reactionText = reaction
    ? reaction.action === 'unreact'
      ? 'واکنش به پیام برداشته شد'
      : `واکنش ${firstText(reaction.emoji, reaction.reaction) || 'به پیام'}`
    : undefined;
  const referral = source?.referral || nestedMessage?.referral;
  const referralText = referral ? 'ورود از تبلیغ یا ارجاع اینستاگرام' : undefined;
  const attachmentLabel = attachment?.label
    || (share ? 'پست، ریل یا استوری به‌اشتراک‌گذاشته‌شده' : undefined)
    || reactionText
    || referralText;
  const attachmentType = rawType
    || (share ? 'share' : undefined)
    || (reaction ? 'reaction' : undefined)
    || (referral ? 'referral' : undefined);
  const attachmentUrl = mediaUrl || shareUrl || firstText(referral?.source_url, referral?.ad_id);
  const hasUserContent = Boolean(text || attachmentLabel || attachmentUrl);
  const content: MessageContent = {
    text,
    mediaUrl: mediaUrl || undefined,
    mediaType: attachment?.mediaType,
    attachmentLabel,
    attachmentType,
    attachmentUrl: attachmentUrl || undefined,
  };

  return {
    content,
    displayText: text || attachmentLabel || 'پیام اینستاگرام',
    hasUserContent,
    replyPayload,
  };
}

export function hasDisplayableInstagramContent(content?: MessageContent): boolean {
  return Boolean(
    content?.text?.trim()
    || content?.commentText?.trim()
    || content?.mediaUrl
    || content?.attachmentLabel?.trim()
    || content?.attachmentUrl
    || content?.quickReplies?.length
    || content?.buttons?.length,
  );
}

/**
 * Meta can batch multiple entries, changes and messaging events in one HTTP
 * request. Split them before deduplication so every event gets its own stable
 * identity and retry lifecycle.
 */
export function splitInstagramWebhookPayload(payload: any): any[] {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  const events: any[] = [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      events.push({ ...payload, entry: [{ ...entry, changes: [change], messaging: undefined }] });
    }

    const messaging = Array.isArray(entry?.messaging) ? entry.messaging : [];
    for (const item of messaging) {
      events.push({ ...payload, entry: [{ ...entry, changes: undefined, messaging: [item] }] });
    }

    if (changes.length === 0 && messaging.length === 0) {
      events.push({ ...payload, entry: [{ ...entry }] });
    }
  }

  return events.length ? events : [payload];
}

export function isOwnInstagramComment(options: {
  senderId?: unknown;
  senderUsername?: unknown;
  connectedAccountId?: unknown;
  connectedUsername?: unknown;
  isSelf?: unknown;
}): boolean {
  if (options.isSelf === true) return true;
  const senderId = String(options.senderId || '').trim();
  const accountId = String(options.connectedAccountId || '').trim();
  if (senderId && accountId && senderId === accountId) return true;

  const senderUsername = normalizeText(String(options.senderUsername || '')).replace(/^@/, '');
  const accountUsername = normalizeText(String(options.connectedUsername || '')).replace(/^@/, '');
  return Boolean(senderUsername && accountUsername && senderUsername === accountUsername);
}
