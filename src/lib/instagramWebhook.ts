import { normalizeText } from './automationEngine';

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
