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

export interface Env {
  ASSETS?: {
    fetch: (req: Request) => Promise<Response>;
  };
  META_WEBHOOK_VERIFY_TOKEN?: string;
  META_APP_SECRET?: string;
  GEMINI_API_KEY?: string;
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
let analytics = { ...INITIAL_ANALYTICS };

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

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Hub-Signature-256',
    },
  });
}

function processIncomingWebhookEvent(payload: any, eventId: string) {
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    const method = request.method;

    // Handle CORS Preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
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

      const expectedToken = env.META_WEBHOOK_VERIFY_TOKEN || 'instaflow_secret_verify_token_2026';

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
      const appSecret = env.META_APP_SECRET || 'instaflow_app_secret_demo';

      let signatureValid = true;
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

      const isDuplicate = processedFingerprints.has(fingerprint);
      const eventId = `whe_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      const webhookEventRecord: WebhookEvent = {
        id: eventId,
        workspaceId: workspace.id,
        instagramAccountId: instagramAccount.id,
        eventType: payload?.entry?.[0]?.changes?.[0]?.field || 'messages',
        externalEventId: payload?.entry?.[0]?.id || `evt_${Date.now()}`,
        fingerprint,
        signatureValid,
        payload,
        status: isDuplicate ? 'deduped' : signatureValid ? 'processed' : 'failed',
        receivedAt: new Date().toISOString(),
        processedAt: isDuplicate ? undefined : new Date().toISOString(),
        errorCode: !signatureValid
          ? 'INVALID_SIGNATURE'
          : isDuplicate
          ? 'DUPLICATE_EVENT'
          : undefined,
      };

      webhookEvents.unshift(webhookEventRecord);

      if (isDuplicate) {
        return jsonResponse({ status: 'deduped', fingerprint });
      }

      processedFingerprints.add(fingerprint);
      instagramAccount.lastWebhookAt = new Date().toISOString();

      processIncomingWebhookEvent(payload, eventId);

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
      });
    }

    if (pathname === '/api/v1/workspace' && method === 'GET') {
      return jsonResponse({ workspace, members, instagramAccount });
    }

    if (pathname === '/api/v1/automations' && method === 'GET') {
      return jsonResponse({ automations });
    }

    if (pathname === '/api/v1/automations' && method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const newAuto: Automation = {
        id: `auto_${Date.now()}`,
        workspaceId: workspace.id,
        instagramAccountId: instagramAccount.id,
        name: body.name || 'اتوماسیون جدید',
        description: body.description || '',
        status: 'draft',
        priority: body.priority || 10,
        triggerType: body.triggerType || 'COMMENT_KEYWORD',
        keywords: body.keywords || ['قیمت'],
        runCount: 0,
        createdBy: 'usr_owner_1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentVersion: {
          id: `ver_${Date.now()}`,
          automationId: `auto_${Date.now()}`,
          versionNo: 1,
          checksum: Math.random().toString(36).substring(2, 12),
          publishedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
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
      if (body.status) auto.status = body.status;
      if (body.name) auto.name = body.name;
      if (body.keywords) auto.keywords = body.keywords;
      if (body.nodes) auto.currentVersion.nodes = body.nodes;
      if (body.edges) auto.currentVersion.edges = body.edges;
      auto.updatedAt = new Date().toISOString();

      return jsonResponse({ automation: auto });
    }

    if (pathname === '/api/v1/conversations' && method === 'GET') {
      return jsonResponse({ conversations });
    }

    if (pathname.startsWith('/api/v1/conversations/') && pathname.endsWith('/messages') && method === 'GET') {
      const id = pathname.split('/')[4];
      const convMsgs = messages.filter((m) => m.conversationId === id);
      return jsonResponse({ messages: convMsgs });
    }

    if (pathname.startsWith('/api/v1/conversations/') && pathname.endsWith('/takeover') && method === 'POST') {
      const id = pathname.split('/')[4];
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return jsonResponse({ error: 'Conversation not found' }, 404);

      const body: any = await request.json().catch(() => ({}));
      conv.mode = body.mode || (conv.mode === 'human' ? 'automation' : 'human');
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

      return jsonResponse({ conversation: conv });
    }

    if (pathname.startsWith('/api/v1/conversations/') && pathname.endsWith('/messages') && method === 'POST') {
      const id = pathname.split('/')[4];
      const conv = conversations.find((c) => c.id === id);
      if (!conv) return jsonResponse({ error: 'Conversation not found' }, 404);

      const body: any = await request.json().catch(() => ({}));
      const newMsg: Message = {
        id: `msg_out_${Date.now()}`,
        workspaceId: workspace.id,
        instagramAccountId: instagramAccount.id,
        conversationId: conv.id,
        externalMessageId: `meta_agent_${Date.now()}`,
        direction: 'outbound',
        messageType: 'text',
        textBody: body.text || '',
        content: { text: body.text || '' },
        status: 'sent',
        policyBasis: 'human_agent_reply',
        correlationId: `corr_human_${Date.now()}`,
        sentAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      messages.push(newMsg);
      conv.lastOutboundAt = new Date().toISOString();
      conv.lastMessageAt = new Date().toISOString();
      conv.lastMessagePreview = body.text || '';

      return jsonResponse({ message: newMsg }, 201);
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
      const newProd: Product = {
        id: `prod_${Date.now()}`,
        workspaceId: workspace.id,
        name: body.name || 'محصول جدید',
        description: body.description || '',
        priceMinor: body.priceMinor || 500000,
        currency: 'IRT',
        sku: body.sku || `SKU-${Date.now().toString().slice(-4)}`,
        imageUrl:
          body.imageUrl ||
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
        productUrl: body.productUrl || 'https://shikposhan.ir',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      products.unshift(newProd);
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
                field: eventType || 'comments',
                value: {
                  id: `cmt_sim_${Date.now()}`,
                  text: simText,
                  created_time: createdTimeSec,
                  media: { id: '17891122334455', media_product_type: 'REELS' },
                  from: { id: `igs_sim_${simUsername}`, username: simUsername },
                },
              },
            ],
          },
        ],
      };

      const appSecret = env.META_APP_SECRET || 'instaflow_app_secret_demo';
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
        processIncomingWebhookEvent(payload, eventId);
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

      return jsonResponse({
        simulationResult: {
          eventId,
          signature,
          signatureValid: true,
          fingerprint,
          isDeduped,
          isExpiredComment,
          status: isDeduped ? 'deduped' : isExpiredComment ? 'policy_blocked' : 'processed',
          deliveredActionsCount: isDeduped || isExpiredComment ? 0 : 2,
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
      return jsonResponse({ message: 'عملیات با موفقیت بازپخش گردید' });
    }

    // ==========================================
    // 3. Static Assets & SPA Fallback (Cloudflare Assets)
    // ==========================================
    if (env.ASSETS) {
      return await env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  },
};
