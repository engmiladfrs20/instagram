export interface InstagramProfile {
  id: string;
  username: string;
  account_type?: 'BUSINESS' | 'CREATOR';
  user_id?: string;
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type?: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_product_type?: 'FEED' | 'REELS' | 'STORY';
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp?: string;
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
  const body: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || `Meta API returned HTTP ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

export async function verifyInstagramAccount(options: MetaClientOptions): Promise<InstagramProfile> {
  const accessToken = options.accessToken?.trim();
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  const url = `${getBaseUrl(options)}/me?fields=id,username,account_type,user_id&access_token=${encodeURIComponent(accessToken)}`;
  return requestMeta<InstagramProfile>(url);
}

export async function listInstagramMedia(
  options: MetaClientOptions & { instagramUserId: string; limit?: number },
): Promise<{ data: InstagramMediaItem[]; paging?: { next?: string } }> {
  const accessToken = options.accessToken?.trim();
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  const fields = ['id', 'caption', 'media_type', 'media_product_type', 'media_url', 'thumbnail_url', 'permalink', 'timestamp'].join(',');
  const limit = Math.min(50, Math.max(1, Math.trunc(options.limit || 18)));
  const url = `${getBaseUrl(options)}/${encodeURIComponent(options.instagramUserId)}/media?fields=${encodeURIComponent(fields)}&limit=${limit}&access_token=${encodeURIComponent(accessToken)}`;
  return requestMeta<{ data: InstagramMediaItem[]; paging?: { next?: string } }>(url);
}

export async function sendInstagramText(
  options: MetaClientOptions & { instagramUserId: string; recipientId: string; text: string },
): Promise<{ message_id?: string }> {
  return sendInstagramMessage({ ...options, content: { text: options.text } });
}

export async function sendInstagramMessage(
  options: MetaClientOptions & {
    instagramUserId: string;
    recipientId: string;
    content: { text?: string; quickReplies?: Array<{ title: string; payload: string }>; buttons?: Array<{ title: string; url?: string; payload?: string }>; mediaUrl?: string; mediaType?: 'image' | 'video' | 'audio' };
  },
): Promise<{ message_id?: string }> {
  const accessToken = options.accessToken?.trim();
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  const url = `${getBaseUrl(options)}/${encodeURIComponent(options.instagramUserId)}/messages?access_token=${encodeURIComponent(accessToken)}`;
  const content = options.content;
  const buttons = (content.buttons || []).filter((button) => button.title.trim());
  const quickReplies = (content.quickReplies || []).filter((reply) => reply.title.trim()).slice(0, 13);
  const message: Record<string, unknown> = {};

  if (buttons.length) {
    message.attachment = {
      type: 'template',
      payload: {
        template_type: 'button',
        text: content.text || 'برای ادامه یکی از گزینه‌ها را انتخاب کنید.',
        buttons: buttons.slice(0, 3).map((button) => button.url
          ? { type: 'web_url', title: button.title, url: button.url }
          : { type: 'postback', title: button.title, payload: button.payload || button.title }),
      },
    };
  } else if (content.mediaUrl && content.mediaType) {
    message.attachment = {
      type: content.mediaType,
      payload: { url: content.mediaUrl },
    };
  } else if (content.text) {
    message.text = content.text;
  }

  if (quickReplies.length) message.quick_replies = quickReplies;
  if (!Object.keys(message).length) throw new Error('پیام سناریو متن، رسانه یا دکمه ندارد.');
  return requestMeta<{ message_id?: string }>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient: { id: options.recipientId }, message }),
  });
}

export async function replyToInstagramComment(
  options: MetaClientOptions & { commentId: string; text: string },
): Promise<{ id?: string }> {
  const accessToken = options.accessToken?.trim();
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  const url = `${getBaseUrl(options)}/${encodeURIComponent(options.commentId)}/replies?access_token=${encodeURIComponent(accessToken)}`;
  return requestMeta<{ id?: string }>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: options.text }),
  });
}
