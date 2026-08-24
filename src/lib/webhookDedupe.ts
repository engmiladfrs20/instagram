export interface WebhookIdentity {
  eventType: string;
  accountId: string;
  externalId: string;
  dedupeKey: string;
}

/**
 * Meta can retry the same webhook with a different delivery envelope.
 * Prefer Meta's stable message/comment id over hashing the full payload.
 */
export function getWebhookIdentity(payload: any): WebhookIdentity {
  const entry = payload?.entry?.[0] || {};
  const change = entry?.changes?.[0];
  const messaging = entry?.messaging?.[0];
  const value = change?.value || messaging || {};
  const message = value?.message || value?.messages?.[0] || {};
  const postback = value?.postback || message?.postback || {};
  const eventType = String(change?.field || (postback?.payload ? 'messaging_postbacks' : messaging ? 'messages' : 'unknown'));
  const accountId = String(entry?.id || value?.recipient?.id || 'instagram');
  const externalId = String(
    eventType === 'comments'
      ? value?.id || ''
      : message?.mid || postback?.mid || value?.mid || value?.id || '',
  );

  return {
    eventType,
    accountId,
    externalId,
    dedupeKey: externalId
      ? `${accountId}:${eventType}:${externalId}`
      : `payload:${JSON.stringify(payload)}`,
  };
}
