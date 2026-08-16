export interface InstagramProfile {
  id: string;
  username: string;
  account_type?: 'BUSINESS' | 'CREATOR';
  user_id?: string;
}

export interface MetaClientOptions {
  accessToken?: string;
  graphHost?: string;
  graphVersion?: string;
}

function getBaseUrl(options: MetaClientOptions): string {
  return `https://${options.graphHost || 'graph.instagram.com'}/${options.graphVersion || 'v20.0'}`;
}

async function requestMeta<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `Meta API returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export async function verifyInstagramAccount(options: MetaClientOptions): Promise<InstagramProfile> {
  if (!options.accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  const url = `${getBaseUrl(options)}/me?fields=id,username,account_type,user_id&access_token=${encodeURIComponent(options.accessToken)}`;
  return requestMeta<InstagramProfile>(url);
}

export async function sendInstagramText(
  options: MetaClientOptions & { instagramUserId: string; recipientId: string; text: string },
): Promise<{ message_id?: string }> {
  if (!options.accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  const url = `${getBaseUrl(options)}/${encodeURIComponent(options.instagramUserId)}/messages?access_token=${encodeURIComponent(options.accessToken)}`;
  return requestMeta<{ message_id?: string }>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: options.recipientId }, message: { text: options.text } }),
  });
}
