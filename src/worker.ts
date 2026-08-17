import {
  INITIAL_WORKSPACE,
  INITIAL_MEMBERS,
  INITIAL_INSTAGRAM_ACCOUNT,
  INITIAL_AUTOMATIONS,
  INITIAL_CONTACTS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_FORMS,
  INITIAL_FORM_SUBMISSIONS,
  INITIAL_PRODUCTS,
  INITIAL_ANALYTICS,
  INITIAL_WEBHOOK_EVENTS,
  INITIAL_DLQ_ITEMS,
  INITIAL_AUDIT_LOGS,
} from './lib/mockData';
import {
  Automation,
  Contact,
  Conversation,
  Message,
  WebhookEvent,
  Form,
  FormSubmission,
  Product,
  DLQItem,
  AuditLog,
} from './types';
import { executableNodes, IncomingContext, matchesAutomation, runtimeVersion } from './lib/automationEngine';

export interface Env {
  ASSETS?: {
    fetch: (req: Request) => Promise<Response>;
  };
  META_WEBHOOK_VERIFY_TOKEN?: string;
  META_APP_SECRET?: string;
  META_APP_ID?: string;
  INSTAGRAM_ACCESS_TOKEN?: string;
  GEMINI_API_KEY?: string;
  APP_ORIGIN?: string;
  META_LIVE_MODE?: string;
  STATE_KV?: {
    get: (key: string, type: 'json') => Promise<unknown>;
    put: (key: string, value: string) => Promise<void>;
  };
}

// In-Memory Database State for Worker instance
let workspace = { ...INITIAL_WORKSPACE };
let members = [...INITIAL_MEMBERS];
let instagramAccount = { ...INITIAL_INSTAGRAM_ACCOUNT };
let automations: Automation[] = [...INITIAL_AUTOMATIONS];
let contacts: Contact[] = [...INITIAL_CONTACTS];
let conversations: Conversation[] = [...INITIAL_CONVERSATIONS];
let messages: Message[] = [...INITIAL_MESSAGES];
let forms: Form[] = [...INITIAL_FORMS];
let formSubmissions: FormSubmission[] = [...INITIAL_FORM_SUBMISSIONS];
let products: Product[] = [...INITIAL_PRODUCTS];
let webhookEvents: WebhookEvent[] = [...INITIAL_WEBHOOK_EVENTS];
let dlqItems: DLQItem[] = [...INITIAL_DLQ_ITEMS];
let auditLogs: AuditLog[] = [...INITIAL_AUDIT_LOGS];
let analytics = structuredClone(INITIAL_ANALYTICS);

const AUTOMATION_TEXT_REPAIRS: Record<
  string,
  { keywords: string[]; triggerKeywords: string[]; publicReply?: string; privateReply?: string; faqReply?: string }
> = {
  auto_comment_price: {
    keywords: ['قیمت', 'قیمتش', 'چنده', 'لینک', 'خرید', 'سفارش', 'تخفیف'],
    triggerKeywords: ['قیمت', 'قیمتش', 'چنده', 'لینک', 'خرید', 'سفارش', 'تخفیف'],
    publicReply: 'سلام عزیز دلم ❤️ جزئیات کامل و لینک سفارش به دایرکت شما ارسال شد 📩',
    privateReply: 'سلام دوست عزیز! 🌸 مرسی از کامنت زیبایت. قیمت مانتو کتان تابستانه با تخفیف ۸۹۰,۰۰۰ تومان هستش.',
  },
  auto_lead_form_direct: {
    keywords: ['سفارش', 'خرید آنلاین', 'فاکتور', 'ثبت سفارش'],
    triggerKeywords: ['سفارش', 'ثبت سفارش'],
  },
  auto_faq_icebreaker: {
    keywords: ['سلام', 'راهنما', 'آدرس', 'پست', 'کد رهگیری', 'ساعات کاری'],
    triggerKeywords: ['سلام', 'راهنما', 'آدرس'],
    faqReply: 'سلام! به دایرکت شیک‌پوشان خوش آمدید 🌸 چطور می‌تونم راهنمایی‌تون کنم؟',
  },
};

function repairAutomationTextEncoding(): boolean {
  let repaired = false;
  for (const auto of automations) {
    const repair = AUTOMATION_TEXT_REPAIRS[auto.id];
    if (!repair) continue;
    const versions = [auto.currentVersion, auto.publishedVersion].filter(Boolean);
    const keywordValues = [
      ...(auto.keywords || []),
      ...versions.flatMap((version) => version!.nodes.flatMap((node) => (node.config.keywords || []).map(String))),
    ];
    const hasMojibake = keywordValues.some((value) => /[ظغ][^\s]{0,4}[طی]/.test(value));
    if (!hasMojibake) continue;

    auto.keywords = [...repair.keywords];
    for (const version of versions) {
      const trigger = version!.nodes.find((node) => node.type === 'TRIGGER');
      if (trigger) trigger.config.keywords = [...repair.triggerKeywords];
      if (repair.publicReply) {
        const publicReply = version!.nodes.find((node) => node.type === 'REPLY_PUBLIC_COMMENT');
        if (publicReply) publicReply.config.publicReplyText = repair.publicReply;
      }
      if (repair.privateReply) {
        const privateReply = version!.nodes.find((node) => node.type === 'SEND_PRIVATE_REPLY');
        if (privateReply) privateReply.config.text = repair.privateReply;
      }
      if (repair.faqReply) {
        const faqReply = version!.nodes.find((node) => node.type === 'SEND_QUICK_REPLIES');
        if (faqReply) faqReply.config.text = repair.faqReply;
      }
    }
    auto.updatedAt = new Date().toISOString();
    repaired = true;
  }
  return repaired;
}

function normalizeStateReferences() {
  const workspaceId = workspace.id;
  const instagramAccountId = instagramAccount.id;
  members = members.map((member) => ({ ...member, workspaceId }));
  automations = automations.map((auto) => ({
    ...auto,
    workspaceId,
    instagramAccountId,
    publishedVersion: auto.publishedVersion || (auto.status === 'active' ? structuredClone(auto.currentVersion) : undefined),
  }));
  contacts = contacts.map((contact) => ({ ...contact, workspaceId, instagramAccountId }));
  conversations = conversations.map((conversation) => ({
    ...conversation,
    workspaceId,
    instagramAccountId,
    contact: contacts.find((contact) => contact.id === conversation.contactId) || conversation.contact,
  }));
  messages = messages.map((message) => ({ ...message, workspaceId, instagramAccountId }));
  forms = forms.map((form) => ({ ...form, workspaceId }));
  formSubmissions = formSubmissions.map((submission) => ({ ...submission, workspaceId }));
  products = products.map((product) => ({ ...product, workspaceId }));
  webhookEvents = webhookEvents.map((event) => ({ ...event, workspaceId, instagramAccountId }));
  auditLogs = auditLogs.map((log) => ({ ...log, workspaceId }));
}

repairAutomationTextEncoding();
normalizeStateReferences();

type WorkerStateSnapshot = {
  workspace: typeof INITIAL_WORKSPACE;
  members: typeof INITIAL_MEMBERS;
  instagramAccount: typeof INITIAL_INSTAGRAM_ACCOUNT;
  automations: Automation[];
  contacts: Contact[];
  conversations: Conversation[];
  messages: Message[];
  forms: Form[];
  formSubmissions: FormSubmission[];
  products: Product[];
  webhookEvents: WebhookEvent[];
  dlqItems: DLQItem[];
  auditLogs: AuditLog[];
  analytics: typeof INITIAL_ANALYTICS;
};

let stateLoaded = false;
async function loadWorkerState(env: Env) {
  if (stateLoaded || !env.STATE_KV) return;
  const saved = await env.STATE_KV.get('instaflow-state', 'json') as WorkerStateSnapshot | null;
  if (saved) {
    workspace = saved.workspace || workspace;
    members = saved.members || members;
    instagramAccount = saved.instagramAccount || instagramAccount;
    automations = saved.automations || automations;
    contacts = saved.contacts || contacts;
    conversations = saved.conversations || conversations;
    messages = saved.messages || messages;
    forms = saved.forms || forms;
    formSubmissions = saved.formSubmissions || formSubmissions;
    products = saved.products || products;
    webhookEvents = saved.webhookEvents || webhookEvents;
    dlqItems = saved.dlqItems || dlqItems;
    auditLogs = saved.auditLogs || auditLogs;
    analytics = saved.analytics || analytics;
    const repaired = repairAutomationTextEncoding();
    normalizeStateReferences();
    processedFingerprints.clear();
    webhookEvents.forEach((event) => processedFingerprints.add(event.fingerprint));
    if (repaired) await persistWorkerState(env);
  }
  stateLoaded = true;
}

async function persistWorkerState(env: Env) {
  if (!env.STATE_KV) return;
  const snapshot: WorkerStateSnapshot = {
    workspace,
    members,
    instagramAccount,
    automations,
    contacts,
    conversations,
    messages,
    forms,
    formSubmissions,
    products,
    webhookEvents,
    dlqItems,
    auditLogs,
    analytics,
  };
  await env.STATE_KV.put('instaflow-state', JSON.stringify(snapshot));
}

const processedFingerprints = new Set<string>(
  webhookEvents.map((e) => e.fingerprint)
);

// Helper: Web Crypto HMAC SHA-256 for Meta Webhook Signature Validation
async function calculateHmacSha256(text: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `sha256=${hex}`;
}

// Helper: Web Crypto SHA-256 for event fingerprinting
async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function jsonResponse(data: unknown, status = 200, origin = 'https://usdhunter.ir'): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Vary': 'Origin',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Hub-Signature-256',
    },
  });
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

const LEGAL_PAGE_STYLE = `
  body { font-family: Arial, sans-serif; line-height: 1.7; max-width: 860px; margin: 40px auto; padding: 0 20px; color: #172033; }
  h1 { color: #5b21b6; } h2 { margin-top: 28px; } a { color: #6d28d9; }
  .muted { color: #667085; } .box { background: #f5f3ff; padding: 16px; border-radius: 12px; }
`;

const PRIVACY_POLICY_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>InstaFlow Privacy Policy</title><style>${LEGAL_PAGE_STYLE}</style></head><body><h1>InstaFlow Privacy Policy</h1><p class="muted">Last updated: August 17, 2026</p><p>InstaFlow is operated for USD Hunter to manage an Instagram Professional account and automate customer conversations.</p><h2>Information we process</h2><p>When you interact with the connected Instagram account, InstaFlow may process your public Instagram profile identifier, username, comments, direct messages, message timestamps, conversation history, tags, and automation responses.</p><h2>How we use information</h2><p>We use this information only to receive webhook events, respond to comments and messages, manage customer conversations, and operate the requested automation workflows. We do not sell personal information or use it for advertising profiling.</p><h2>Storage and security</h2><p>Operational data is stored in the connected Cloudflare Worker and its private storage. Access tokens and application secrets are stored as protected Cloudflare secrets and are not included in the source repository.</p><h2>Retention and deletion</h2><p>Data is retained only as long as needed to operate the workspace and its conversation history. To request deletion of your information, visit <a href="/data-deletion">the data deletion page</a> or send a deletion request through the connected Instagram account.</p><h2>Contact</h2><p>For privacy requests, contact the USD Hunter team through the Instagram account <a href="https://www.instagram.com/usdhunter.ir/">@usdhunter.ir</a>.</p><div class="box">This policy applies to the InstaFlow Instagram integration and its connected automation dashboard.</div></body></html>`;

const DATA_DELETION_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>InstaFlow Data Deletion</title><style>${LEGAL_PAGE_STYLE}</style></head><body><h1>InstaFlow Data Deletion</h1><p>To request deletion of Instagram data processed by InstaFlow, send a direct message to <a href="https://www.instagram.com/usdhunter.ir/">@usdhunter.ir</a> containing the words <strong>delete my data</strong> and your Instagram username.</p><p>We will remove the matching contact, conversation, messages, tags, and related operational records from the workspace, subject to security, legal, and fraud-prevention requirements.</p><p><a href="/privacy-policy">Back to Privacy Policy</a></p></body></html>`;

function processIncomingWebhookEventLegacy(payload: any, eventId: string) {
  const change = payload?.entry?.[0]?.changes?.[0];
  const field = change?.field;
  const value = change?.value;

  if (!value) return;

  if (field === 'comments') {
    const commentText = value.text || '';
    const commentId = value.id || `cmt_${Date.now()}`;
    const mediaId = value.media?.id || '17891122334455';
    const fromUser = value.from || {
      id: `igs_${Date.now()}`,
      username: 'sample_user',
    };
    const createdTimeSec = value.created_time || Math.floor(Date.now() / 1000);

    const commentAgeDays = (Date.now() / 1000 - createdTimeSec) / (3600 * 24);
    if (commentAgeDays > 7) {
      dlqItems.unshift({
        id: `dlq_${Date.now()}`,
        jobId: `job_${Date.now()}`,
        actionType: 'SEND_PRIVATE_REPLY',
        recipientId: fromUser.id,
        errorReason: `Comment is older than 7 days (${commentAgeDays.toFixed(1)} days)`,
        errorClass: 'policy',
        payloadSummary: `پاسخ خصوصی به کامنت ${fromUser.username}`,
        attemptCount: 1,
        lastAttemptAt: new Date().toISOString(),
        canReplay: false,
      });
      return;
    }

    let contact = contacts.find((c) => c.igScopedUserId === fromUser.id);
    if (!contact) {
      contact = {
        id: `cnt_${Date.now()}`,
        workspaceId: workspace.id,
        instagramAccountId: instagramAccount.id,
        igScopedUserId: fromUser.id,
        username: fromUser.username || `user_${Date.now()}`,
        displayName: fromUser.username || 'کاربر اینستاگرام',
        customFields: {},
        tags: ['لید_کامنت'],
        firstSeenAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
        leadStatus: 'new',
        leadScore: 50,
      };
      contacts.unshift(contact);
    }

    let conv = conversations.find((c) => c.contactId === contact!.id);
    if (!conv) {
      conv = {
        id: `conv_${Date.now()}`,
        workspaceId: workspace.id,
        instagramAccountId: instagramAccount.id,
        contactId: contact.id,
        contact,
        status: 'open',
        mode: 'automation',
        standardWindowOpenUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        lastInboundAt: new Date().toISOString(),
        lastOutboundAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        unreadCount: 1,
        lastMessagePreview: commentText,
        createdAt: new Date().toISOString(),
      };
      conversations.unshift(conv);
    } else {
      conv.lastInboundAt = new Date().toISOString();
      conv.standardWindowOpenUntil = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
      conv.lastMessageAt = new Date().toISOString();
      conv.lastMessagePreview = commentText;
    }

    const inboundMsg: Message = {
      id: `msg_in_${Date.now()}`,
      workspaceId: workspace.id,
      instagramAccountId: instagramAccount.id,
      conversationId: conv.id,
      externalMessageId: commentId,
      direction: 'inbound',
      messageType: 'comment',
      textBody: commentText,
      content: { commentText, mediaId },
      status: 'delivered',
      correlationId: `corr_${eventId}`,
      receivedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    messages.push(inboundMsg);

    const activeAutomations = automations.filter(
      (a) => a.status === 'active' && (a.triggerType === 'COMMENT_KEYWORD' || a.triggerType === 'POST_OR_REEL_COMMENT')
    );

    let matchedAutomation: Automation | null = null;
    for (const auto of activeAutomations) {
      const kwList = auto.keywords || [];
      const isMatch =
        kwList.length === 0 || kwList.some((kw) => commentText.includes(kw) || kw === '*');
      if (isMatch) {
        matchedAutomation = auto;
        break;
      }
    }

    if (matchedAutomation) {
      matchedAutomation.runCount += 1;
      matchedAutomation.lastTriggeredAt = new Date().toISOString();

      const nodes = matchedAutomation.currentVersion.nodes;

      const pubReplyNode = nodes.find((n) => n.type === 'REPLY_PUBLIC_COMMENT');
      if (pubReplyNode?.config?.publicReplyText) {
        messages.push({
          id: `msg_out_pub_${Date.now()}`,
          workspaceId: workspace.id,
          instagramAccountId: instagramAccount.id,
          conversationId: conv.id,
          externalMessageId: `meta_pub_${Date.now()}`,
          direction: 'outbound',
          messageType: 'public_comment_reply',
          textBody: pubReplyNode.config.publicReplyText,
          content: { text: pubReplyNode.config.publicReplyText },
          status: 'sent',
          policyBasis: 'public_comment_moderation',
          correlationId: `corr_${eventId}`,
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        analytics.publicRepliesSent += 1;
      }

      const privReplyNode = nodes.find((n) => n.type === 'SEND_PRIVATE_REPLY');
      if (privReplyNode?.config?.text) {
        messages.push({
          id: `msg_out_priv_${Date.now()}`,
          workspaceId: workspace.id,
          instagramAccountId: instagramAccount.id,
          conversationId: conv.id,
          externalMessageId: `meta_priv_${Date.now()}`,
          direction: 'outbound',
          messageType: 'private_reply',
          textBody: privReplyNode.config.text,
          content: {
            text: privReplyNode.config.text,
            isPrivateReply: true,
            quickReplies: privReplyNode.config.quickReplies,
          },
          status: 'sent',
          policyBasis: 'comment_to_dm_7day_rule',
          correlationId: `corr_${eventId}`,
          sentAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
        analytics.privateRepliesSent += 1;
      }

      const tagNode = nodes.find((n) => n.type === 'ADD_TAG');
      if (tagNode?.config?.tagToAdd && !contact.tags.includes(tagNode.config.tagToAdd)) {
        contact.tags.push(tagNode.config.tagToAdd);
      }
    }
  }
}

async function processIncomingWebhookEvent(payload: any, eventId: string, env: Env): Promise<{ blocked: boolean }> {
  const change = payload?.entry?.[0]?.changes?.[0];
  const field = change?.field || 'messages';
  const value = change?.value;
  if (!value) return { blocked: false };

  const messageValue = value.message || value.messages?.[0];
  const isComment = field === 'comments';
  const replyPayload = messageValue?.quick_reply?.payload || messageValue?.postback?.payload;
  const text = String(isComment ? value.text || '' : messageValue?.text || value.text || '');
  const fromUser = value.from || value.sender || messageValue?.from || { id: `igs_${crypto.randomUUID()}`, username: 'sample_user' };
  const externalMessageId = value.id || messageValue?.mid || `msg_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  if (isComment) {
    const createdTimeSec = Number(value.created_time || Math.floor(Date.now() / 1000));
    const ageDays = (Date.now() / 1000 - createdTimeSec) / (3600 * 24);
    if (ageDays > 7) {
      dlqItems.unshift({
        id: `dlq_${crypto.randomUUID()}`,
        jobId: `job_${crypto.randomUUID()}`,
        actionType: 'SEND_PRIVATE_REPLY',
        recipientId: String(fromUser.id),
        errorReason: `Comment is older than 7 days (${ageDays.toFixed(1)} days)`,
        errorClass: 'policy',
        payloadSummary: `Private reply blocked for ${fromUser.username || fromUser.id}`,
        attemptCount: 1,
        lastAttemptAt: now,
        canReplay: false,
      });
      return { blocked: true };
    }
  }

  let contact = contacts.find((item) => item.igScopedUserId === String(fromUser.id));
  if (!contact) {
    contact = {
      id: `cnt_${crypto.randomUUID()}`,
      workspaceId: workspace.id,
      instagramAccountId: instagramAccount.id,
      igScopedUserId: String(fromUser.id),
      username: String(fromUser.username || `user_${Date.now()}`),
      displayName: String(fromUser.name || fromUser.username || 'Instagram user'),
      customFields: {},
      tags: isComment ? ['comment_lead'] : [],
      firstSeenAt: now,
      lastSeenAt: now,
      leadStatus: 'new',
      leadScore: 50,
    };
    contacts.unshift(contact);
  } else {
    contact.lastSeenAt = now;
  }

  let conversation = conversations.find((item) => item.contactId === contact!.id);
  if (!conversation) {
    conversation = {
      id: `conv_${crypto.randomUUID()}`,
      workspaceId: workspace.id,
      instagramAccountId: instagramAccount.id,
      contactId: contact.id,
      contact,
      status: 'open',
      mode: 'automation',
      standardWindowOpenUntil: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      lastInboundAt: now,
      lastOutboundAt: new Date(0).toISOString(),
      lastMessageAt: now,
      unreadCount: 1,
      lastMessagePreview: text,
      createdAt: now,
    };
    conversations.unshift(conversation);
  } else {
    conversation.lastInboundAt = now;
    conversation.standardWindowOpenUntil = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    conversation.lastMessageAt = now;
    conversation.lastMessagePreview = text;
    conversation.unreadCount += 1;
  }

  messages.push({
    id: `msg_in_${crypto.randomUUID()}`,
    workspaceId: workspace.id,
    instagramAccountId: instagramAccount.id,
    conversationId: conversation.id,
    externalMessageId: String(externalMessageId),
    direction: 'inbound',
    messageType: isComment ? 'comment' : replyPayload ? 'quick_reply' : 'text',
    textBody: text,
    content: isComment ? { commentText: text, mediaId: value.media?.id } : { text },
    status: 'received',
    correlationId: `corr_${eventId}`,
    receivedAt: now,
    createdAt: now,
  });
  analytics.totalInboundMessages += 1;
  if (isComment) analytics.totalCommentsReceived += 1;
  if (conversation.mode === 'human') return { blocked: false };

  const context: IncomingContext = {
    trigger: isComment ? 'COMMENT_CREATED' : replyPayload ? 'QUICK_REPLY_SELECTED' : 'DM_RECEIVED',
    text,
    payload,
    replyPayload,
    contactTags: contact.tags,
    windowOpen: Date.parse(conversation.standardWindowOpenUntil) >= Date.now(),
  };
  const automation = automations
    .filter((item) => matchesAutomation(item, context))
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id))[0];
  if (!automation) return { blocked: false };
  automation.runCount += 1;
  automation.lastTriggeredAt = now;

  const recordOutbound = async (messageType: Message['messageType'], content: Message['content'], policyBasis: string) => {
    let status: Message['status'] = 'queued';
    let externalId: string | undefined;
    if (env.META_LIVE_MODE === 'true' && content.text) {
      const accessToken = env.INSTAGRAM_ACCESS_TOKEN?.trim() || '';
      const isPublicCommentReply = messageType === 'public_comment_reply' && isComment && externalMessageId;
      const url = isPublicCommentReply
        ? `https://${instagramAccount.graphHost}/${instagramAccount.graphVersion}/${encodeURIComponent(String(externalMessageId))}/replies?access_token=${encodeURIComponent(accessToken)}`
        : `https://${instagramAccount.graphHost}/${instagramAccount.graphVersion}/${encodeURIComponent(instagramAccount.metaIgUserId)}/messages?access_token=${encodeURIComponent(accessToken)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isPublicCommentReply
            ? { message: content.text }
            : { recipient: { id: String(fromUser.id) }, message: { text: content.text } },
        ),
      });
      const result: any = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error?.message || `Meta API returned HTTP ${response.status}`);
      status = 'sent';
      externalId = result.message_id || result.id;
    }
    const sentAt = new Date().toISOString();
    messages.push({
      id: `msg_out_${crypto.randomUUID()}`,
      workspaceId: workspace.id,
      instagramAccountId: instagramAccount.id,
      conversationId: conversation!.id,
      externalMessageId: externalId,
      direction: 'outbound',
      messageType,
      textBody: content.text,
      content,
      status,
      policyBasis,
      correlationId: `corr_${eventId}`,
      sentAt: status === 'sent' ? sentAt : undefined,
      createdAt: sentAt,
    });
    conversation!.lastOutboundAt = sentAt;
    conversation!.lastMessageAt = sentAt;
    conversation!.lastMessagePreview = content.text || messageType;
    if (status === 'sent') {
      if (messageType === 'public_comment_reply') analytics.publicRepliesSent += 1;
      else analytics.privateRepliesSent += 1;
    }
  };

  for (const node of executableNodes(runtimeVersion(automation), context)) {
    if (node.type === 'REPLY_PUBLIC_COMMENT' && isComment && node.config.publicReplyText) {
      await recordOutbound('public_comment_reply', { text: node.config.publicReplyText }, 'public_comment_moderation');
    } else if (node.type === 'SEND_PRIVATE_REPLY' && node.config.text) {
      await recordOutbound('private_reply', { text: node.config.text, quickReplies: node.config.quickReplies, isPrivateReply: true }, 'comment_to_dm_7day_rule');
    } else if (node.type === 'SEND_TEXT' && node.config.text) {
      await recordOutbound('text', { text: node.config.text }, 'automation');
    } else if (node.type === 'SEND_QUICK_REPLIES' && (node.config.text || node.config.quickReplies?.length)) {
      await recordOutbound('quick_reply', { text: node.config.text, quickReplies: node.config.quickReplies }, 'automation');
    } else if (node.type === 'ADD_TAG' && node.config.tagToAdd && !contact.tags.includes(node.config.tagToAdd)) {
      contact.tags.push(node.config.tagToAdd);
    } else if (node.type === 'SET_CONTACT_FIELD' && node.config.fieldToSet) {
      contact.customFields[node.config.fieldToSet.key] = node.config.fieldToSet.value;
    } else if (node.type === 'HANDOFF_TO_HUMAN') {
      conversation.mode = 'human';
      conversation.assignedUserId = 'usr_agent_2';
      conversation.assignedUserName = 'Instagram agent';
    } else if (node.type === 'STOP' || node.type === 'WAIT') {
      break;
    }
  }
  return { blocked: false };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    await loadWorkerState(env);
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    const method = request.method;

    // Handle CORS Preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': env.APP_ORIGIN || 'https://usdhunter.ir',
          'Vary': 'Origin',
          'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Hub-Signature-256',
        },
      });
    }

    // ==========================================
    // 1. Meta Webhooks
    // ==========================================

    // Hub Verification Challenge
    if (pathname === '/webhooks/meta' && method === 'GET') {
      const mode = searchParams.get('hub.mode');
      const token = searchParams.get('hub.verify_token');
      const challenge = searchParams.get('hub.challenge');

      const expectedToken = (env.META_WEBHOOK_VERIFY_TOKEN || 'instaflow_secret_verify_token_2026').trim();

      if (mode === 'subscribe' && token === expectedToken) {
        return new Response(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      return jsonResponse({ error: 'Verification failed' }, 403);
    }

    // Webhook Event Ingest
    if (pathname === '/webhooks/meta' && method === 'POST') {
      const rawBody = await request.text();
      const signature = request.headers.get('x-hub-signature-256');
      const appSecret = (env.META_APP_SECRET || 'instaflow_app_secret_demo').trim();

      let signatureValid = false;
      if (signature) {
        const expectedSig = await calculateHmacSha256(rawBody, appSecret);
        signatureValid = signature === expectedSig;
      }

      let payload: any = {};
      try {
        payload = JSON.parse(rawBody);
      } catch {
        // invalid json
      }

      const canonicalString = JSON.stringify(payload);
      const hash = await sha256Hex(`meta_${canonicalString}`);
      const fingerprint = hash.slice(0, 32);

      // An invalid request must never be classified as a duplicate. Otherwise a
      // repeated unsigned payload can hide an authentication failure in analytics.
      const isDuplicate = signatureValid && processedFingerprints.has(fingerprint);
      const eventId = `whe_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const eventType = payload?.entry?.[0]?.changes?.[0]?.field || 'messages';
      console.log(
        JSON.stringify({
          event: 'meta_webhook_received',
          eventId,
          eventType,
          signaturePresent: Boolean(signature),
          signatureValid,
          isDuplicate,
          entryCount: Array.isArray(payload?.entry) ? payload.entry.length : 0,
        }),
      );

      const webhookEventRecord: WebhookEvent = {
        id: eventId,
        workspaceId: workspace.id,
        instagramAccountId: instagramAccount.id,
        eventType,
        externalEventId: payload?.entry?.[0]?.id || `evt_${Date.now()}`,
        fingerprint,
        signatureValid,
        payload,
        status: !signatureValid ? 'failed' : isDuplicate ? 'deduped' : 'processed',
        receivedAt: new Date().toISOString(),
        processedAt: signatureValid && !isDuplicate ? new Date().toISOString() : undefined,
        errorCode: !signatureValid
          ? 'INVALID_SIGNATURE'
          : isDuplicate
          ? 'DUPLICATE_EVENT'
          : undefined,
      };

      webhookEvents.unshift(webhookEventRecord);

      if (!signatureValid) {
        await persistWorkerState(env);
        console.log(JSON.stringify({ event: 'meta_webhook_rejected', eventId, errorCode: 'INVALID_SIGNATURE' }));
        return jsonResponse({ error: 'Invalid webhook signature' }, 401);
      }

      if (isDuplicate) {
        console.log(JSON.stringify({ event: 'meta_webhook_deduped', eventId, fingerprint }));
        return jsonResponse({ status: 'deduped', fingerprint });
      }

      processedFingerprints.add(fingerprint);
      instagramAccount.lastWebhookAt = new Date().toISOString();

      try {
        const result = await processIncomingWebhookEvent(payload, eventId, env);
        webhookEventRecord.status = result.blocked ? 'failed' : 'processed';
        webhookEventRecord.errorCode = result.blocked ? 'META_POLICY_7DAY_EXPIRED' : undefined;
        webhookEventRecord.processedAt = new Date().toISOString();
      } catch (error) {
        webhookEventRecord.status = 'failed';
        webhookEventRecord.errorCode = error instanceof Error ? error.message.slice(0, 120) : 'PROCESSING_ERROR';
      }
      await persistWorkerState(env);

      console.log(
        JSON.stringify({
          event: 'meta_webhook_processed',
          eventId,
          eventType: webhookEventRecord.eventType,
          status: webhookEventRecord.status,
          errorCode: webhookEventRecord.errorCode,
        }),
      );

      return jsonResponse({
        status: 'received',
        eventId,
        fingerprint,
        signatureValid,
      });
    }

    // ==========================================
    // 2. Application REST API Endpoints (/api/v1/*)
    // ==========================================

    if (pathname === '/api/v1/health' && method === 'GET') {
      return jsonResponse({
        status: 'ok',
        platform: 'Cloudflare Workers (Edge)',
        time: new Date().toISOString(),
        workspace: workspace.name,
        liveMode: env.META_LIVE_MODE === 'true',
        webhookPath: '/webhooks/meta',
      });
    }

    if (pathname === '/api/v1/workspace' && method === 'GET') {
      return jsonResponse({ workspace, members, instagramAccount });
    }

    if (pathname === '/api/v1/instagram/verify' && method === 'POST') {
      const accessToken = env.INSTAGRAM_ACCESS_TOKEN?.trim();
      if (!accessToken) return jsonResponse({ error: 'INSTAGRAM_ACCESS_TOKEN is not configured' }, 503);
      const verifyUrl = `https://${instagramAccount.graphHost}/${instagramAccount.graphVersion}/me?fields=id,username,account_type,user_id&access_token=${encodeURIComponent(accessToken)}`;
      const response = await fetch(verifyUrl);
      const profile: any = await response.json().catch(() => ({}));
      if (!response.ok) {
        instagramAccount.status = 'reauth_required';
        instagramAccount.webhookStatus = 'failed';
        instagramAccount.lastTokenCheckAt = new Date().toISOString();
        await persistWorkerState(env);
        const metaError = profile?.error || {};
        return jsonResponse({
          error: metaError.message || `Instagram verification failed (${response.status})`,
          code: metaError.code,
          type: metaError.type,
          fbtraceId: metaError.fbtrace_id,
          reauthRequired: true,
          instagramAccount,
        }, 502);
      }
      instagramAccount.metaIgUserId = profile.user_id || profile.id;
      instagramAccount.username = profile.username;
      instagramAccount.displayName = profile.username;
      instagramAccount.accountType = profile.account_type || instagramAccount.accountType;
      instagramAccount.status = 'connected';
      instagramAccount.webhookStatus = 'active';
      instagramAccount.lastTokenCheckAt = new Date().toISOString();
      await persistWorkerState(env);
      return jsonResponse({ instagramAccount, profile });
    }

    if (pathname === '/api/v1/automations' && method === 'GET') {
      return jsonResponse({ automations });
    }

    if (pathname === '/api/v1/automations' && method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const autoId = `auto_${crypto.randomUUID()}`;
      const versionId = `ver_${crypto.randomUUID()}`;
      const createdAt = new Date().toISOString();
      const newAuto: Automation = {
        id: autoId,
        workspaceId: workspace.id,
        instagramAccountId: instagramAccount.id,
        name: body.name || 'اتوماسیون جدید',
        description: body.description || '',
        status: 'draft',
        priority: Number.isFinite(Number(body.priority)) ? Number(body.priority) : 10,
        triggerType: body.triggerType || 'COMMENT_KEYWORD',
        keywords: body.keywords || ['قیمت'],
        runCount: 0,
        createdBy: 'usr_owner_1',
        createdAt,
        updatedAt: createdAt,
        currentVersion: {
          id: versionId,
          automationId: autoId,
          versionNo: 1,
          checksum: Math.random().toString(36).substring(2, 12),
          createdAt,
          validationResult: { valid: true, errors: [], warnings: [] },
          nodes: body.nodes || [
            {
              id: 'n_trig',
              type: 'TRIGGER',
              title: 'شروع با کلمه کلیدی',
              position: { x: 50, y: 100 },
              config: { triggerType: 'COMMENT_KEYWORD', keywords: ['قیمت'] },
            },
            {
              id: 'n_priv',
              type: 'SEND_PRIVATE_REPLY',
              title: 'پاسخ دایرکت',
              position: { x: 350, y: 100 },
              config: { text: 'سلام! قیمت برای شما ارسال شد.' },
            },
          ],
          edges: body.edges || [{ id: 'e1', sourceNodeId: 'n_trig', targetNodeId: 'n_priv' }],
        },
      };

      automations.unshift(newAuto);
      auditLogs.unshift({
        id: `aud_${Date.now()}`,
        workspaceId: workspace.id,
        actorName: 'میلاد فراستی',
        action: 'CREATE_AUTOMATION',
        resourceType: 'automation',
        resourceId: newAuto.id,
        metadata: { name: newAuto.name },
        createdAt: new Date().toISOString(),
      });

      await persistWorkerState(env);
      return jsonResponse({ automation: newAuto }, 201);
    }

    if (pathname.startsWith('/api/v1/automations/') && pathname.endsWith('/publish') && method === 'POST') {
      const id = pathname.split('/')[4];
      const auto = automations.find((a) => a.id === id);
      if (!auto) return jsonResponse({ error: 'Automation not found' }, 404);

      const nodes = auto.currentVersion.nodes;
      const errors: string[] = [];
      const warnings: string[] = [];

      const privReplyNode = nodes.find((n) => n.type === 'SEND_PRIVATE_REPLY');
      if (privReplyNode?.config?.quickReplies && privReplyNode.config.quickReplies.length > 13) {
        errors.push('تعداد دکمه‌های پاسخ سریع (Quick Replies) نباید بیشتر از ۱۳ عدد باشد.');
      }

      if (errors.length > 0) {
        auto.currentVersion.validationResult = { valid: false, errors, warnings };
        return jsonResponse({ valid: false, errors, warnings }, 400);
      }

      auto.currentVersion.versionNo += 1;
      auto.currentVersion.checksum = Math.random().toString(36).substring(2, 14);
      auto.currentVersion.publishedAt = new Date().toISOString();
      auto.currentVersion.validationResult = {
        valid: true,
        errors: [],
        warnings: ['تایید شده طبق ضوابط ۷ روزه Meta'],
      };
      auto.status = 'active';
      auto.publishedVersion = structuredClone(auto.currentVersion);
      auto.publishedVersionId = auto.currentVersion.id;
      await persistWorkerState(env);

      auditLogs.unshift({
        id: `aud_${Date.now()}`,
        workspaceId: workspace.id,
        actorName: 'میلاد فراستی',
        action: 'PUBLISH_AUTOMATION_VERSION',
        resourceType: 'automation',
        resourceId: auto.id,
        metadata: { versionNo: auto.currentVersion.versionNo, checksum: auto.currentVersion.checksum },
        createdAt: new Date().toISOString(),
      });

      return jsonResponse({ automation: auto, message: 'با موفقیت منتشر شد' });
    }

    if (pathname.startsWith('/api/v1/automations/') && method === 'PATCH') {
      const id = pathname.split('/')[4];
      const auto = automations.find((a) => a.id === id);
      if (!auto) return jsonResponse({ error: 'Automation not found' }, 404);

      const body: any = await request.json().catch(() => ({}));
      if (body.status && ['draft', 'active', 'paused', 'archived'].includes(body.status)) auto.status = body.status;
      if (typeof body.name === 'string' && body.name.trim()) auto.name = body.name.trim();
      if (Array.isArray(body.keywords)) auto.keywords = body.keywords.map(String).filter(Boolean);
      const version = body.currentVersion || body;
      if (Array.isArray(version.nodes)) auto.currentVersion.nodes = version.nodes;
      if (Array.isArray(version.edges)) auto.currentVersion.edges = version.edges;
      auto.updatedAt = new Date().toISOString();

      await persistWorkerState(env);
      return jsonResponse({ automation: auto });
    }

    if (pathname === '/api/v1/conversations' && method === 'GET') {
      return jsonResponse({ conversations });
    }

    if (pathname.startsWith('/api/v1/conversations/') && pathname.endsWith('/messages') && method === 'GET') {
      const id = pathname.split('/')[4];
      if (!conversations.some((conversation) => conversation.id === id)) return jsonResponse({ error: 'Conversation not found' }, 404);
      const convMsgs = messages.filter((m) => m.conversationId === id);
      return jsonResponse({ messages: convMsgs });
    }

    if (pathname.startsWith('/api/v1/conversations/') && pathname.endsWith('/takeover') && method === 'POST') {
      const id = pathname.split('/')[4];
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return jsonResponse({ error: 'Conversation not found' }, 404);

      const body: any = await request.json().catch(() => ({}));
      const requestedMode = body.mode || (conv.mode === 'human' ? 'automation' : 'human');
      if (!['automation', 'human', 'paused'].includes(requestedMode)) return jsonResponse({ error: 'Invalid conversation mode' }, 400);
      conv.mode = requestedMode;
      if (conv.mode === 'human') {
        conv.assignedUserId = 'usr_agent_2';
        conv.assignedUserName = 'علی رضایی';
      } else {
        conv.assignedUserId = undefined;
        conv.assignedUserName = undefined;
      }

      auditLogs.unshift({
        id: `aud_${Date.now()}`,
        workspaceId: workspace.id,
        actorName: 'علی رضایی',
        action: conv.mode === 'human' ? 'HUMAN_TAKEOVER_START' : 'HUMAN_TAKEOVER_END',
        resourceType: 'conversation',
        resourceId: conv.id,
        metadata: { mode: conv.mode },
        createdAt: new Date().toISOString(),
      });

      await persistWorkerState(env);
      return jsonResponse({ conversation: conv });
    }

    if (pathname.startsWith('/api/v1/conversations/') && pathname.endsWith('/messages') && method === 'POST') {
      const id = pathname.split('/')[4];
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return jsonResponse({ error: 'Conversation not found' }, 404);

      const body: any = await request.json().catch(() => ({}));
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) return jsonResponse({ error: 'Message text is required' }, 400);
      if (conv.mode !== 'human') return jsonResponse({ error: 'Conversation is not in human mode' }, 409);
      if (Date.parse(conv.standardWindowOpenUntil) < Date.now()) return jsonResponse({ error: 'Instagram 24-hour messaging window has expired' }, 409);
      const createdAt = new Date().toISOString();
      const newMsg: Message = {
        id: `msg_out_${crypto.randomUUID()}`,
        workspaceId: workspace.id,
        instagramAccountId: instagramAccount.id,
        conversationId: conv.id,
        externalMessageId: undefined,
        direction: 'outbound',
        messageType: 'text',
        textBody: text,
        content: { text },
        status: 'queued',
        policyBasis: 'human_agent_reply',
        correlationId: `corr_human_${crypto.randomUUID()}`,
        createdAt,
      };

      messages.push(newMsg);
      conv.lastOutboundAt = createdAt;
      conv.lastMessageAt = createdAt;
      conv.lastMessagePreview = text;

      await persistWorkerState(env);
      return jsonResponse({ message: newMsg, conversation: conv }, 201);
    }

    if (pathname === '/api/v1/contacts' && method === 'GET') {
      return jsonResponse({ contacts });
    }

    if (pathname === '/api/v1/forms' && method === 'GET') {
      return jsonResponse({ forms, submissions: formSubmissions });
    }

    if (pathname === '/api/v1/products' && method === 'GET') {
      return jsonResponse({ products });
    }

    if (pathname === '/api/v1/products' && method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const priceMinor = Number(body.priceMinor);
      if (typeof body.name !== 'string' || !body.name.trim()) return jsonResponse({ error: 'Product name is required' }, 400);
      if (!Number.isFinite(priceMinor) || priceMinor < 0) return jsonResponse({ error: 'Product price must be a non-negative number' }, 400);
      const newProd: Product = {
        id: `prod_${crypto.randomUUID()}`,
        workspaceId: workspace.id,
        name: body.name || 'محصول جدید',
        description: body.description || '',
        priceMinor,
        currency: 'IRT',
        sku: body.sku || `SKU-${Date.now().toString().slice(-4)}`,
        imageUrl:
          body.imageUrl ||
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
        productUrl: body.productUrl || 'https://usdhunter.ir',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      products.unshift(newProd);
      await persistWorkerState(env);
      return jsonResponse({ product: newProd }, 201);
    }

    if (pathname === '/api/v1/analytics' && method === 'GET') {
      return jsonResponse({ analytics, auditLogs, dlqItems, webhookEvents });
    }

    if (pathname === '/api/v1/webhooks/simulate' && method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const { eventType, text, username, isExpiredComment, isDuplicate } = body;

      const simUsername = username || 'shirin_lifestyle';
      const simText = text || 'قیمت مانتو چنده؟';
      const createdTimeSec = isExpiredComment
        ? Math.floor(Date.now() / 1000) - 8 * 24 * 3600
        : Math.floor(Date.now() / 1000) - 60;

      const payload = {
        object: 'instagram',
        entry: [
          {
            id: instagramAccount.metaIgUserId,
            time: createdTimeSec,
            changes: [
              {
                field: eventType === 'comments' || !eventType ? 'comments' : 'messages',
                value: eventType === 'comments' || !eventType
                  ? {
                      id: `cmt_sim_${Date.now()}`,
                      text: simText,
                      created_time: createdTimeSec,
                      media: { id: '17891122334455', media_product_type: 'REELS' },
                      from: { id: `igs_sim_${simUsername}`, username: simUsername },
                    }
                  : {
                      message: {
                        mid: `mid_sim_${Date.now()}`,
                        text: simText,
                        from: { id: `igs_sim_${simUsername}`, username: simUsername },
                        ...(eventType === 'quick_reply' ? { quick_reply: { payload: simText } } : {}),
                      },
                    },
              },
            ],
          },
        ],
      };

      const appSecret = (env.META_APP_SECRET || 'instaflow_app_secret_demo').trim();
      const rawString = JSON.stringify(payload);
      const signature = await calculateHmacSha256(rawString, appSecret);

      const canonicalString = JSON.stringify(payload);
      const hash = await sha256Hex(`meta_${canonicalString}`);
      const fingerprint = isDuplicate
        ? Array.from(processedFingerprints)[0] || 'duplicate_fingerprint_test_123'
        : hash.slice(0, 32);

      const isDeduped = processedFingerprints.has(fingerprint);
      const eventId = `whe_sim_${Date.now()}`;

      const webhookEventRecord: WebhookEvent = {
        id: eventId,
        workspaceId: workspace.id,
        instagramAccountId: instagramAccount.id,
        eventType: eventType || 'comments',
        externalEventId: `evt_${Date.now()}`,
        fingerprint,
        signatureValid: true,
        payload,
        status: isDeduped ? 'deduped' : isExpiredComment ? 'failed' : 'processed',
        receivedAt: new Date().toISOString(),
        processedAt: isDeduped ? undefined : new Date().toISOString(),
        errorCode: isDeduped
          ? 'DUPLICATE_EVENT'
          : isExpiredComment
          ? 'META_POLICY_7DAY_EXPIRED'
          : undefined,
      };

      webhookEvents.unshift(webhookEventRecord);

      if (!isDeduped && !isExpiredComment) {
        processedFingerprints.add(fingerprint);
        // Simulations must never call Meta, even when production live mode is enabled.
        await processIncomingWebhookEvent(payload, eventId, { ...env, META_LIVE_MODE: 'false' });
      } else if (isExpiredComment) {
        dlqItems.unshift({
          id: `dlq_${Date.now()}`,
          jobId: `job_${Date.now()}`,
          actionType: 'SEND_PRIVATE_REPLY',
          recipientId: `igs_sim_${simUsername}`,
          errorReason: 'نقض قانون Meta: کامنت قدیمی‌تر از ۷ روز است (تولیدشده ۸ روز پیش). ارسال پاسخ خصوصی مسدود شد.',
          errorClass: 'policy',
          payloadSummary: `پاسخ خصوصی به کامنت ${simUsername}`,
          attemptCount: 1,
          lastAttemptAt: new Date().toISOString(),
          canReplay: false,
        });
      }

      await persistWorkerState(env);
      return jsonResponse({
        simulationResult: {
          eventId,
          signature,
          signatureValid: true,
          fingerprint,
          isDeduped,
          isExpiredComment,
          dryRun: true,
          status: isDeduped ? 'deduped' : isExpiredComment ? 'policy_blocked' : 'processed',
          deliveredActionsCount: isDeduped || isExpiredComment
            ? 0
            : messages.filter((message) => message.direction === 'outbound' && message.correlationId === `corr_${eventId}`).length,
        },
      });
    }

    if (pathname.startsWith('/api/v1/dlq/') && pathname.endsWith('/replay') && method === 'POST') {
      const id = pathname.split('/')[4];
      const item = dlqItems.find((d) => d.id === id);
      if (!item) return jsonResponse({ error: 'Item not found' }, 404);

      if (!item.canReplay) {
        return jsonResponse(
          { error: 'این خطا از نوع Policy Violation بوده و قابل بازپخش مجدد نیست.' },
          400
        );
      }

      dlqItems = dlqItems.filter((d) => d.id !== id);
      await persistWorkerState(env);
      return jsonResponse({ message: 'عملیات با موفقیت بازپخش گردید' });
    }

    // ==========================================
    // 3. Static Assets & SPA Fallback (Cloudflare Assets)
    // ==========================================
    if (method === 'GET' && pathname === '/privacy-policy') {
      return htmlResponse(PRIVACY_POLICY_HTML);
    }

    if (method === 'GET' && pathname === '/data-deletion') {
      return htmlResponse(DATA_DELETION_HTML);
    }

    if (env.ASSETS) {
      return await env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
