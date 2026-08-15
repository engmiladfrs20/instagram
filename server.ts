import express, { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import { createServer as createViteServer } from 'vite';
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
} from './src/lib/mockData';
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
} from './src/types';

const app = express();
const PORT = 3000;

// Raw body parser for HMAC verification on webhooks
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// In-Memory Database State
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

// Set of processed fingerprints for Webhook Deduplication
const processedFingerprints = new Set<string>(
  webhookEvents.map((e) => e.fingerprint)
);

// Helper: Calculate HMAC SHA256 Signature for Webhook Verification
function calculateSignature(payloadBuffer: Buffer, appSecret: string): string {
  return (
    'sha256=' +
    crypto.createHmac('sha256', appSecret).update(payloadBuffer).digest('hex')
  );
}

// ==========================================
// 1. Meta Webhook Endpoints
// ==========================================

// GET /webhooks/meta -> Hub Verification Challenge
app.get('/webhooks/meta', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const EXPECTED_VERIFY_TOKEN =
    process.env.META_WEBHOOK_VERIFY_TOKEN || 'instaflow_secret_verify_token_2026';

  if (mode === 'subscribe' && token === EXPECTED_VERIFY_TOKEN) {
    console.log('[Meta Webhook] Successfully verified verify_token challenge');
    return res.status(200).send(challenge);
  }

  console.warn('[Meta Webhook] Invalid verify token or mode');
  return res.status(403).json({ error: 'Verification failed' });
});

// POST /webhooks/meta -> Webhook Event Ingest
app.post('/webhooks/meta', (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
  const appSecret = process.env.META_APP_SECRET || 'instaflow_app_secret_demo';

  // Verify HMAC signature if present
  let signatureValid = true;
  if (signature) {
    const expectedSig = calculateSignature(rawBody, appSecret);
    signatureValid = signature === expectedSig;
  }

  const payload = req.body;
  const canonicalString = JSON.stringify(payload);
  const fingerprint = crypto
    .createHash('sha256')
    .update(`meta_${canonicalString}`)
    .digest('hex')
    .slice(0, 32);

  // Check Deduplication
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
    console.log(`[Webhook Ingress] Deduplicated event fingerprint: ${fingerprint}`);
    return res.status(200).json({ status: 'deduped', fingerprint });
  }

  processedFingerprints.add(fingerprint);
  instagramAccount.lastWebhookAt = new Date().toISOString();

  // Process event in background / simulation pipeline
  processIncomingWebhookEvent(payload, eventId);

  return res.status(200).json({
    status: 'received',
    eventId,
    fingerprint,
    signatureValid,
  });
});

// ==========================================
// 2. Webhook Event Processing Logic
// ==========================================

function processIncomingWebhookEvent(payload: any, eventId: string) {
  // Extract change item
  const change = payload?.entry?.[0]?.changes?.[0];
  const field = change?.field;
  const value = change?.value;

  if (!value) return;

  // Handle Comment Event (Comment-to-DM)
  if (field === 'comments') {
    const commentText = value.text || '';
    const commentId = value.id || `cmt_${Date.now()}`;
    const mediaId = value.media?.id || '17891122334455';
    const fromUser = value.from || {
      id: `igs_${Date.now()}`,
      username: 'sample_user',
    };
    const createdTimeSec = value.created_time || Math.floor(Date.now() / 1000);

    // 1. Policy Guard Check: Comment must be younger than 7 days
    const commentAgeDays = (Date.now() / 1000 - createdTimeSec) / (3600 * 24);
    if (commentAgeDays > 7) {
      console.warn(`[Policy Block] Comment ${commentId} is older than 7 days (${commentAgeDays.toFixed(1)} days). Blocking Private Reply.`);
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

    // 2. Find or create contact & conversation
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

    // Record Inbound Comment Message
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

    // 3. Match active automations
    const activeAutomations = automations.filter(
      (a) => a.status === 'active' && (a.triggerType === 'COMMENT_KEYWORD' || a.triggerType === 'POST_OR_REEL_COMMENT')
    );

    let matchedAutomation: Automation | null = null;
    for (const auto of activeAutomations) {
      const keywords = auto.keywords || [];
      const isMatch =
        keywords.length === 0 ||
        keywords.some((kw) => commentText.includes(kw) || kw === '*');
      if (isMatch) {
        matchedAutomation = auto;
        break;
      }
    }

    if (matchedAutomation) {
      matchedAutomation.runCount += 1;
      matchedAutomation.lastTriggeredAt = new Date().toISOString();

      const nodes = matchedAutomation.currentVersion.nodes;

      // Execute Public Reply
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

      // Execute Private Reply (Comment-to-DM)
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

      // Tag Contact
      const tagNode = nodes.find((n) => n.type === 'ADD_TAG');
      if (tagNode?.config?.tagToAdd && !contact.tags.includes(tagNode.config.tagToAdd)) {
        contact.tags.push(tagNode.config.tagToAdd);
      }
    }
  }
}

// ==========================================
// 3. API Routes for Frontend
// ==========================================

app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), workspace: workspace.name });
});

// Workspace & Accounts
app.get('/api/v1/workspace', (_req, res) => {
  res.json({ workspace, members, instagramAccount });
});

// Automations CRUD & Actions
app.get('/api/v1/automations', (_req, res) => {
  res.json({ automations });
});

app.post('/api/v1/automations', (req, res) => {
  const newAuto: Automation = {
    id: `auto_${Date.now()}`,
    workspaceId: workspace.id,
    instagramAccountId: instagramAccount.id,
    name: req.body.name || 'اتوماسیون جدید',
    description: req.body.description || '',
    status: 'draft',
    priority: req.body.priority || 10,
    triggerType: req.body.triggerType || 'COMMENT_KEYWORD',
    keywords: req.body.keywords || ['قیمت'],
    runCount: 0,
    createdBy: 'usr_owner_1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentVersion: {
      id: `ver_${Date.now()}`,
      automationId: `auto_${Date.now()}`,
      versionNo: 1,
      checksum: crypto.randomBytes(8).toString('hex'),
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      validationResult: { valid: true, errors: [], warnings: [] },
      nodes: req.body.nodes || [
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
      edges: req.body.edges || [{ id: 'e1', sourceNodeId: 'n_trig', targetNodeId: 'n_priv' }],
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

  res.status(201).json({ automation: newAuto });
});

app.patch('/api/v1/automations/:id', (req, res) => {
  const auto = automations.find((a) => a.id === req.params.id);
  if (!auto) return res.status(404).json({ error: 'Automation not found' });

  if (req.body.status) auto.status = req.body.status;
  if (req.body.name) auto.name = req.body.name;
  if (req.body.keywords) auto.keywords = req.body.keywords;
  if (req.body.nodes) auto.currentVersion.nodes = req.body.nodes;
  if (req.body.edges) auto.currentVersion.edges = req.body.edges;
  auto.updatedAt = new Date().toISOString();

  res.json({ automation: auto });
});

app.post('/api/v1/automations/:id/publish', (req, res) => {
  const auto = automations.find((a) => a.id === req.params.id);
  if (!auto) return res.status(404).json({ error: 'Automation not found' });

  // Validate policy rules before publish
  const nodes = auto.currentVersion.nodes;
  const errors: string[] = [];
  const warnings: string[] = [];

  const privReplyNode = nodes.find((n) => n.type === 'SEND_PRIVATE_REPLY');
  if (privReplyNode?.config?.quickReplies && privReplyNode.config.quickReplies.length > 13) {
    errors.push('تعداد دکمه‌های پاسخ سریع (Quick Replies) نباید بیشتر از ۱۳ عدد باشد.');
  }

  if (errors.length > 0) {
    auto.currentVersion.validationResult = { valid: false, errors, warnings };
    return res.status(400).json({ valid: false, errors, warnings });
  }

  auto.currentVersion.versionNo += 1;
  auto.currentVersion.checksum = crypto.randomBytes(16).toString('hex');
  auto.currentVersion.publishedAt = new Date().toISOString();
  auto.currentVersion.validationResult = { valid: true, errors: [], warnings: ['تایید شده طبق ضوابط ۷ روزه Meta'] };
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

  res.json({ automation: auto, message: 'با موفقیت منتشر شد' });
});

// Conversations & CRM
app.get('/api/v1/conversations', (_req, res) => {
  res.json({ conversations });
});

app.get('/api/v1/conversations/:id/messages', (req, res) => {
  const convMsgs = messages.filter((m) => m.conversationId === req.params.id);
  res.json({ messages: convMsgs });
});

app.post('/api/v1/conversations/:id/takeover', (req, res) => {
  const conv = conversations.find((c) => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  conv.mode = req.body.mode || (conv.mode === 'human' ? 'automation' : 'human');
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

  res.json({ conversation: conv });
});

app.post('/api/v1/conversations/:id/messages', (req, res) => {
  const conv = conversations.find((c) => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const newMsg: Message = {
    id: `msg_out_${Date.now()}`,
    workspaceId: workspace.id,
    instagramAccountId: instagramAccount.id,
    conversationId: conv.id,
    externalMessageId: `meta_agent_${Date.now()}`,
    direction: 'outbound',
    messageType: 'text',
    textBody: req.body.text,
    content: { text: req.body.text },
    status: 'sent',
    policyBasis: 'human_agent_reply',
    correlationId: `corr_human_${Date.now()}`,
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  messages.push(newMsg);
  conv.lastOutboundAt = new Date().toISOString();
  conv.lastMessageAt = new Date().toISOString();
  conv.lastMessagePreview = req.body.text;

  res.status(201).json({ message: newMsg });
});

// Contacts
app.get('/api/v1/contacts', (_req, res) => {
  res.json({ contacts });
});

// Forms & Products
app.get('/api/v1/forms', (_req, res) => {
  res.json({ forms, submissions: formSubmissions });
});

app.get('/api/v1/products', (_req, res) => {
  res.json({ products });
});

app.post('/api/v1/products', (req, res) => {
  const newProd: Product = {
    id: `prod_${Date.now()}`,
    workspaceId: workspace.id,
    name: req.body.name || 'محصول جدید',
    description: req.body.description || '',
    priceMinor: req.body.priceMinor || 500000,
    currency: 'IRT',
    sku: req.body.sku || `SKU-${Date.now().toString().slice(-4)}`,
    imageUrl: req.body.imageUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    productUrl: req.body.productUrl || 'https://shikposhan.ir',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  products.unshift(newProd);
  res.status(201).json({ product: newProd });
});

// Webhook Studio Simulation Endpoint
app.post('/api/v1/webhooks/simulate', (req, res) => {
  const { eventType, text, username, isExpiredComment, isDuplicate } = req.body;

  const simUsername = username || 'shirin_lifestyle';
  const simText = text || 'قیمت مانتو چنده؟';
  const createdTimeSec = isExpiredComment
    ? Math.floor(Date.now() / 1000) - 8 * 24 * 3600 // 8 days old (violates 7-day rule)
    : Math.floor(Date.now() / 1000) - 60; // 1 minute old

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

  const appSecret = process.env.META_APP_SECRET || 'instaflow_app_secret_demo';
  const rawBodyBuffer = Buffer.from(JSON.stringify(payload));
  const signature = calculateSignature(rawBodyBuffer, appSecret);

  // Trigger processing
  const canonicalString = JSON.stringify(payload);
  const fingerprint = isDuplicate
    ? Array.from(processedFingerprints)[0] || 'duplicate_fingerprint_test_123'
    : crypto.createHash('sha256').update(`meta_${canonicalString}`).digest('hex').slice(0, 32);

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

  res.json({
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
});

// Operations & Analytics
app.get('/api/v1/analytics', (_req, res) => {
  res.json({ analytics, auditLogs, dlqItems, webhookEvents });
});

app.post('/api/v1/dlq/:id/replay', (req, res) => {
  const item = dlqItems.find((d) => d.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  if (!item.canReplay) {
    return res.status(400).json({ error: 'این خطا از نوع Policy Violation بوده و قابل بازپخش مجدد نیست.' });
  }

  dlqItems = dlqItems.filter((d) => d.id !== req.params.id);
  res.json({ message: 'عملیات با موفقیت بازپخش گردید' });
});

// ==========================================
// 4. Vite Development Server Setup
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [InstaFlow Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
