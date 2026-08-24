export interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  profile_pic?: string;
  profile_picture_url?: string;
  account_type?: 'BUSINESS' | 'CREATOR';
  user_id?: string;
  is_user_follow_business?: boolean;
  /** The opposite direction: whether the business follows the user. */
  is_business_follow_user?: boolean;
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

export interface InstagramConversationParticipant {
  id: string;
  username?: string;
  name?: string;
  profile_picture_url?: string;
}

export interface InstagramConversationItem {
  id: string;
  updated_time?: string;
  participants?: { data?: InstagramConversationParticipant[] };
}

export interface InstagramConversationMessage {
  id?: string;
  message?: string;
  created_time?: string;
  from?: InstagramConversationParticipant;
  to?: { data?: InstagramConversationParticipant[] };
  attachments?: { data?: Array<{ type?: string; image_data?: { url?: string }; video_data?: { url?: string } }> };
}

export interface MetaClientOptions {
  accessToken?: string;
  graphHost?: string;
  graphVersion?: string;
}

function getBaseUrl(options: MetaClientOptions): string {
  return `https://${options.graphHost || 'graph.instagram.com'}/${options.graphVersion || 'v23.0'}`;
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

function bearerHeaders(accessToken: string, headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  result.set('Authorization', `Bearer ${accessToken}`);
  return result;
}

export async function verifyInstagramAccount(options: MetaClientOptions): Promise<InstagramProfile> {
  const accessToken = options.accessToken?.trim();
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  const url = `${getBaseUrl(options)}/me?fields=id,username,name,profile_picture_url,account_type,user_id`;
  return requestMeta<InstagramProfile>(url, { headers: bearerHeaders(accessToken) });
}

export async function getInstagramUserProfile(
  options: MetaClientOptions & { userId: string; includeFollowStatus?: boolean },
): Promise<InstagramProfile> {
  const accessToken = options.accessToken?.trim();
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  // The user-profile endpoint for an Instagram-scoped messaging user uses
  // `profile_pic`. `profile_picture_url` belongs to other Graph API shapes
  // and causes the whole request to fail when included here.
  const baseFields = ['username', 'name', 'profile_pic'];
  // Only request the direction used by the follow gate. The similarly named
  // `is_business_follow_user` field answers the opposite question.
  const followFields = ['is_user_follow_business'];
  const fields = (options.includeFollowStatus ? [...baseFields, ...followFields] : baseFields).join(',');
  const versions = Array.from(new Set([options.graphVersion || 'v23.0', 'v23.0']));
  let lastError: unknown;
  for (const graphVersion of versions) {
    const baseUrl = `https://${options.graphHost || 'graph.instagram.com'}/${graphVersion}`;
    const url = `${baseUrl}/${encodeURIComponent(options.userId)}?fields=${encodeURIComponent(fields)}`;
    try {
      return await requestMeta<InstagramProfile>(url, { headers: bearerHeaders(accessToken) });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Instagram user profile lookup failed');
}

export async function listInstagramConversations(
  options: MetaClientOptions & { instagramUserId: string; limit?: number },
): Promise<{ data: InstagramConversationItem[]; paging?: { next?: string } }> {
  const accessToken = options.accessToken?.trim();
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  const limit = Math.min(50, Math.max(1, Math.trunc(options.limit || 25)));
  const url = `${getBaseUrl(options)}/${encodeURIComponent(options.instagramUserId)}/conversations?platform=instagram&limit=${limit}`;
  return requestMeta<{ data: InstagramConversationItem[]; paging?: { next?: string } }>(url, { headers: bearerHeaders(accessToken) });
}

export async function listInstagramConversationMessages(
  options: MetaClientOptions & { conversationId: string; limit?: number },
): Promise<{ data: InstagramConversationMessage[]; paging?: { next?: string } }> {
  const accessToken = options.accessToken?.trim();
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  const limit = Math.min(100, Math.max(1, Math.trunc(options.limit || 50)));
  const fields = 'id,message,created_time,from,to,attachments';
  const directUrl = `${getBaseUrl(options)}/${encodeURIComponent(options.conversationId)}/messages?fields=${encodeURIComponent(fields)}&limit=${limit}`;
  try {
    return await requestMeta<{ data: InstagramConversationMessage[]; paging?: { next?: string } }>(directUrl, { headers: bearerHeaders(accessToken) });
  } catch (directError) {
    const nestedUrl = `${getBaseUrl(options)}/${encodeURIComponent(options.conversationId)}?fields=messages.limit(${limit}){${fields}}`;
    try {
      const nested = await requestMeta<{ messages?: { data?: InstagramConversationMessage[]; paging?: { next?: string } } }>(nestedUrl, { headers: bearerHeaders(accessToken) });
      return { data: nested.messages?.data || [], paging: nested.messages?.paging };
    } catch {
      throw directError;
    }
  }
}

export async function listInstagramMedia(
  options: MetaClientOptions & { instagramUserId: string; limit?: number },
): Promise<{ data: InstagramMediaItem[]; paging?: { next?: string } }> {
  const accessToken = options.accessToken?.trim();
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  const fields = ['id', 'caption', 'media_type', 'media_product_type', 'media_url', 'thumbnail_url', 'permalink', 'timestamp'].join(',');
  const limit = Math.min(50, Math.max(1, Math.trunc(options.limit || 18)));
  const url = `${getBaseUrl(options)}/${encodeURIComponent(options.instagramUserId)}/media?fields=${encodeURIComponent(fields)}&limit=${limit}`;
  return requestMeta<{ data: InstagramMediaItem[]; paging?: { next?: string } }>(url, { headers: bearerHeaders(accessToken) });
}

export async function sendInstagramText(
  options: MetaClientOptions & { instagramUserId: string; recipientId: string; text: string },
): Promise<{ message_id?: string }> {
  return sendInstagramMessage({ ...options, content: { text: options.text } });
}

export async function sendInstagramMessage(
  options: MetaClientOptions & {
    instagramUserId: string;
    recipientId?: string;
    commentId?: string;
    content: { text?: string; quickReplies?: Array<{ title: string; payload: string }>; buttons?: Array<{ title: string; url?: string; payload?: string }>; mediaUrl?: string; mediaType?: 'image' | 'video' | 'audio' };
  },
): Promise<{ message_id?: string }> {
  const accessToken = options.accessToken?.trim();
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  if (!options.recipientId && !options.commentId) throw new Error('Instagram message recipient is not configured');
  const url = `${getBaseUrl(options)}/${encodeURIComponent(options.instagramUserId)}/messages`;
  const content = options.content;
  const buttons = (content.buttons || []).filter((button) => button.title.trim());
  const quickReplies = (content.quickReplies || []).filter((reply) => reply.title.trim()).slice(0, 13);
  const message: Record<string, unknown> = {};

  // Meta allows exactly one text-only private reply to a comment. Templates,
  // quick replies and follow-ups require an IGSID conversation after the
  // recipient has replied and opened the standard messaging window.
  if (options.commentId) {
    if (!content.text?.trim()) throw new Error('A private reply to a comment requires text');
    message.text = content.text.trim();
  } else if (buttons.length) {
    message.attachment = {
      type: 'template',
      payload: {
        template_type: 'button',
        text: content.text || 'برای ادامه یکی از گزینه‌ها را انتخاب کنید.',
        buttons: buttons.slice(0, 3).map((button) => button.url
          ? { type: 'web_url', title: button.title.trim().slice(0, 20), url: button.url }
          : { type: 'postback', title: button.title.trim().slice(0, 20), payload: button.payload || button.title }),
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

  if (!options.commentId && quickReplies.length) {
    message.quick_replies = quickReplies.map((reply) => ({
      content_type: 'text',
      title: reply.title.trim().slice(0, 20),
      payload: reply.payload,
    }));
  }
  if (!Object.keys(message).length) throw new Error('پیام سناریو متن، رسانه یا دکمه ندارد.');
  return requestMeta<{ message_id?: string }>(url, {
    method: 'POST',
    headers: bearerHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      recipient: options.commentId ? { comment_id: options.commentId } : { id: options.recipientId },
      ...(!options.commentId ? { messaging_type: 'RESPONSE' } : {}),
      message,
    }),
  });
}

export async function replyToInstagramComment(
  options: MetaClientOptions & { commentId: string; text: string },
): Promise<{ id?: string }> {
  const accessToken = options.accessToken?.trim();
  if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
  const url = `${getBaseUrl(options)}/${encodeURIComponent(options.commentId)}/replies`;
  return requestMeta<{ id?: string }>(url, {
    method: 'POST',
    headers: bearerHeaders(accessToken, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({ message: options.text }),
  });
}
