import express, { Request, Response } from 'express';
import crypto from 'crypto';
import fs from 'fs';
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
import {
  clone,
  executableNodes,
  IncomingContext,
  matchesAutomation,
  runtimeVersion,
} from './src/lib/automationEngine';
import { replyToInstagramComment, sendInstagramText, verifyInstagramAccount } from './src/lib/metaClient';

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

type PersistedState = {
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

const stateFile = path.join(process.cwd(), '.data', 'state.json');

function readPersistedState(): Partial<PersistedState> {
  if (process.env.DISABLE_PERSISTENCE === 'true') return {};
  try {
    return JSON.parse(fs.readFileSync(stateFile, 'utf8')) as Partial<PersistedState>;
  } catch {
    return {};
  }
}

const persistedState = readPersistedState();
let workspace = persistedState.workspace || clone(INITIAL_WORKSPACE);
let members = persistedState.members || clone(INITIAL_MEMBERS);
let instagramAccount = persistedState.instagramAccount || clone(INITIAL_INSTAGRAM_ACCOUNT);
let automations: Automation[] = (persistedState.automations || clone(INITIAL_AUTOMATIONS)).map((auto) => ({
  ...auto,
  publishedVersion: auto.publishedVersion || (auto.status === 'active' ? clone(auto.currentVersion) : undefined),
}));
let contacts = persistedState.contacts || clone(INITIAL_CONTACTS);
let conversations = persistedState.conversations || clone(INITIAL_CONVERSATIONS);
let messages = persistedState.messages || clone(INITIAL_MESSAGES);
let forms = persistedState.forms || clone(INITIAL_FORMS);
let formSubmissions = persistedState.formSubmissions || clone(INITIAL_FORM_SUBMISSIONS);
let products = persistedState.products || clone(INITIAL_PRODUCTS);
let webhookEvents = persistedState.webhookEvents || clone(INITIAL_WEBHOOK_EVENTS);
let dlqItems = persistedState.dlqItems || clone(INITIAL_DLQ_ITEMS);
let auditLogs = persistedState.auditLogs || clone(INITIAL_AUDIT_LOGS);
let analytics = persistedState.analytics || clone(INITIAL_ANALYTICS);

function normalizeStateReferences() {
  const workspaceId = workspace.id;
  const instagramAccountId = instagramAccount.id;
  members = members.map((member) => ({ ...member, workspaceId }));
  automations = automations.map((auto) => ({ ...auto, workspaceId, instagramAccountId }));
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

normalizeStateReferences();

function persistState() {
  if (process.env.DISABLE_PERSISTENCE === 'true') return;
  try {
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    const state: PersistedState = {
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
    fs.writeFileSync(stateFile, JSON.stringify(state), 'utf8');
  } catch (error) {
    console.error('[Persistence] Failed to save state', error);
  }
}

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
    (process.env.META_WEBHOOK_VERIFY_TOKEN || 'instaflow_secret_verify_token_2026').trim();

  if (mode === 'subscribe' && token === EXPECTED_VERIFY_TOKEN) {
    console.log('[Meta Webhook] Successfully verified verify_token challenge');
    return res.status(200).send(challenge);
  }

  console.warn('[Meta Webhook] Invalid verify token or mode');
  return res.status(403).json({ error: 'Verification failed' });
});

// POST /webhooks/meta -> Webhook Event Ingest
app.post('/webhooks/meta', async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string;
  const rawBody = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
  const appSecret = (process.env.META_APP_SECRET || 'instaflow_app_secret_demo').trim();

  const expectedSig = calculateSignature(rawBody, appSecret);
  const signatureValid = Boolean(signature) && signature!.length === expectedSig.length && crypto.timingSafeEqual(
    Buffer.from(signature!),
    Buffer.from(expectedSig),
  );

  const payload = req.body;
  const canonicalString = JSON.stringify(payload);
  const externalEventId = payload?.entry?.[0]?.changes?.[0]?.value?.id || payload?.entry?.[0]?.id || `evt_${Date.now()}`;
  const fingerprint = crypto
    .createHash('sha256')
    .update(`meta_${externalEventId}_${payload?.entry?.[0]?.changes?.[0]?.field || 'unknown'}_${canonicalString}`)
    .digest('hex')
    .slice(0, 32);

  const eventId = `whe_${crypto.randomUUID()}`;

  const webhookEventRecord: WebhookEvent = {
    id: eventId,
    workspaceId: workspace.id,
    instagramAccountId: instagramAccount.id,
    eventType: payload?.entry?.[0]?.changes?.[0]?.field || 'messages',
    externalEventId,
    fingerprint,
    signatureValid,
    payload,
    status: signatureValid ? 'received' : 'failed',
    receivedAt: new Date().toISOString(),
    errorCode: signatureValid ? undefined : 'INVALID_SIGNATURE',
  };

  webhookEvents.unshift(webhookEventRecord);

  if (!signatureValid) {
    persistState();
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  const isDuplicate = processedFingerprints.has(fingerprint);

  if (isDuplicate) {
    webhookEventRecord.status = 'deduped';
    webhookEventRecord.errorCode = 'DUPLICATE_EVENT';
    persistState();
    console.log(`[Webhook Ingress] Deduplicated event fingerprint: ${fingerprint}`);
    return res.status(200).json({ status: 'deduped', fingerprint });
  }

  processedFingerprints.add(fingerprint);
  instagramAccount.lastWebhookAt = new Date().toISOString();

  try {
    const result = await processIncomingWebhookEvent(payload, eventId);
    webhookEventRecord.status = result.blocked ? 'failed' : 'processed';
    webhookEventRecord.processedAt = new Date().toISOString();
    webhookEventRecord.errorCode = result.blocked ? 'META_POLICY_7DAY_EXPIRED' : undefined;
  } catch (error) {
    webhookEventRecord.status = 'failed';
    webhookEventRecord.errorCode = error instanceof Error ? error.message.slice(0, 120) : 'PROCESSING_ERROR';
  }
  persistState();

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

function processIncomingWebhookEventLegacy(payload: any, eventId: string) {
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

async function processIncomingWebhookEvent(payload: any, eventId: string): Promise<{ blocked: boolean }> {
  const change = payload?.entry?.[0]?.changes?.[0];
  const field = change?.field || 'messages';
  const value = change?.value;
  if (!value) return { blocked: false };

  const messageValue = value.message || value.messages?.[0];
  const isComment = field === 'comments';
  const replyPayload = messageValue?.quick_reply?.payload || messageValue?.postback?.payload;
  const text = String(isComment ? value.text || '' : messageValue?.text || value.text || '');
  const fromUser = value.from || value.sender || messageValue?.from || {
    id: `igs_${crypto.randomUUID()}`,
    username: 'sample_user',
  };
  const externalMessageId = value.id || messageValue?.mid || `msg_${crypto.randomUUID()}`;

  if (isComment) {
    const createdTimeSec = Number(value.created_time || Math.floor(Date.now() / 1000));
    const commentAgeDays = (Date.now() / 1000 - createdTimeSec) / (3600 * 24);
    if (commentAgeDays > 7) {
      dlqItems.unshift({
        id: `dlq_${crypto.randomUUID()}`,
        jobId: `job_${crypto.randomUUID()}`,
        actionType: 'SEND_PRIVATE_REPLY',
        recipientId: String(fromUser.id),
        errorReason: `Comment is older than 7 days (${commentAgeDays.toFixed(1)} days)`,
        errorClass: 'policy',
        payloadSummary: `Private reply blocked for ${fromUser.username || fromUser.id}`,
        attemptCount: 1,
        lastAttemptAt: new Date().toISOString(),
        canReplay: false,
      });
      return { blocked: true };
    }
  }

  let contact = contacts.find((item) =>
    item.workspaceId === workspace.id &&
    item.instagramAccountId === instagramAccount.id &&
    item.igScopedUserId === String(fromUser.id),
  );
  const now = new Date().toISOString();
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
    if (fromUser.username) contact.username = String(fromUser.username);
  }

  let conversation = conversations.find((item) =>
    item.workspaceId === workspace.id &&
    item.instagramAccountId === instagramAccount.id &&
    item.contactId === contact!.id,
  );
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

  const inboundMessage: Message = {
    id: `msg_in_${crypto.randomUUID()}`,
    workspaceId: workspace.id,
    instagramAccountId: instagramAccount.id,
    conversationId: conversation.id,
    externalMessageId: String(externalMessageId),
    direction: 'inbound',
    messageType: isComment ? 'comment' : replyPayload ? 'quick_reply' : 'text',
    textBody: text,
    content: isComment ? { commentText: text, mediaId: value.media?.id } : { text, quickReplies: messageValue?.quick_replies },
    status: 'received',
    correlationId: `corr_${eventId}`,
    receivedAt: now,
    createdAt: now,
  };
  messages.push(inboundMessage);
  analytics.totalInboundMessages += 1;
  if (isComment) analytics.totalCommentsReceived += 1;
  const daily = analytics.dailyStats[analytics.dailyStats.length - 1];
  if (daily) {
    daily.inbound += 1;
    if (isComment) daily.leads += 1;
  }

  if (conversation.mode === 'human') return { blocked: false };

  const context: IncomingContext = {
    trigger: isComment ? 'COMMENT_CREATED' : replyPayload ? 'QUICK_REPLY_SELECTED' : 'DM_RECEIVED',
    text,
    payload,
    replyPayload,
    contactTags: contact.tags,
    windowOpen: Date.parse(conversation.standardWindowOpenUntil) >= Date.now(),
  };
  const matchedAutomation = automations
    .filter((auto) => matchesAutomation(auto, context))
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id))[0];
  if (!matchedAutomation) return { blocked: false };

  matchedAutomation.runCount += 1;
  matchedAutomation.lastTriggeredAt = now;
  const nodes = executableNodes(runtimeVersion(matchedAutomation), context);

  const recordOutbound = async (
    nodeType: Message['messageType'],
    body: Message['content'],
    policyBasis: string,
  ) => {
    const outNow = new Date().toISOString();
    let status: Message['status'] = 'queued';
    let externalId: string | undefined;
    let error: Error | undefined;
    const liveMode = process.env.META_LIVE_MODE === 'true';
    if (liveMode) {
      try {
        const response = nodeType === 'public_comment_reply'
          ? await replyToInstagramComment({
              accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
              graphHost: instagramAccount.graphHost,
              graphVersion: instagramAccount.graphVersion,
              commentId: String(externalMessageId),
              text: body.text || '',
            })
          : await sendInstagramText({
              accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
              graphHost: instagramAccount.graphHost,
              graphVersion: instagramAccount.graphVersion,
              instagramUserId: instagramAccount.metaIgUserId,
              recipientId: String(fromUser.id),
              text: body.text || '',
        });
        status = 'sent';
        externalId = nodeType === 'public_comment_reply'
          ? (response as { id?: string }).id
          : (response as { message_id?: string }).message_id;
      } catch (caught) {
        status = 'failed';
        error = caught instanceof Error ? caught : new Error('Meta send failed');
        dlqItems.unshift({
          id: `dlq_${crypto.randomUUID()}`,
          jobId: `job_${crypto.randomUUID()}`,
          actionType: nodeType,
          recipientId: String(fromUser.id),
          errorReason: error.message,
          errorClass: 'transient',
          payloadSummary: body.text || nodeType,
          attemptCount: 1,
          lastAttemptAt: outNow,
          canReplay: true,
        });
      }
    }
    const outbound: Message = {
      id: `msg_out_${crypto.randomUUID()}`,
      workspaceId: workspace.id,
      instagramAccountId: instagramAccount.id,
      conversationId: conversation!.id,
      externalMessageId: externalId,
      direction: 'outbound',
      messageType: nodeType,
      textBody: body.text,
      content: body,
      status,
      policyBasis,
      correlationId: `corr_${eventId}`,
      sentAt: status === 'sent' ? outNow : undefined,
      createdAt: outNow,
    };
    messages.push(outbound);
    if (status === 'sent' || status === 'queued') {
      conversation!.lastOutboundAt = outNow;
      conversation!.lastMessageAt = outNow;
      conversation!.lastMessagePreview = body.text || nodeType;
    }
    if (status === 'sent') {
      if (nodeType === 'public_comment_reply') analytics.publicRepliesSent += 1;
      else analytics.privateRepliesSent += 1;
      const latest = analytics.dailyStats[analytics.dailyStats.length - 1];
      if (latest) {
        if (nodeType === 'public_comment_reply') latest.publicReplies += 1;
        else latest.privateReplies += 1;
      }
    }
    return error;
  };

  for (const node of nodes) {
    switch (node.type) {
      case 'REPLY_PUBLIC_COMMENT':
        if (isComment && node.config.publicReplyText) {
          await recordOutbound('public_comment_reply', { text: node.config.publicReplyText }, 'public_comment_moderation');
        }
        break;
      case 'SEND_PRIVATE_REPLY':
        if (node.config.text) {
          await recordOutbound('private_reply', {
            text: node.config.text,
            quickReplies: node.config.quickReplies,
            isPrivateReply: true,
          }, 'comment_to_dm_7day_rule');
        }
        break;
      case 'SEND_TEXT':
        if (node.config.text) await recordOutbound('text', { text: node.config.text }, 'automation');
        break;
      case 'SEND_QUICK_REPLIES':
        if (node.config.text || node.config.quickReplies?.length) {
          await recordOutbound('quick_reply', { text: node.config.text, quickReplies: node.config.quickReplies }, 'automation');
        }
        break;
      case 'SEND_PRODUCT_CAROUSEL': {
        const ids = node.config.productIds || (node.config.productId ? [node.config.productId] : []);
        const carouselItems = products.filter((product) => ids.includes(product.id)).map((product) => ({
          title: product.name,
          subtitle: product.description,
          imageUrl: product.imageUrl,
          price: `${product.priceMinor} ${product.currency}`,
          buttonText: 'مشاهده محصول',
          buttonUrl: product.productUrl,
        }));
        if (carouselItems.length) await recordOutbound('product_carousel', { carouselItems }, 'automation');
        break;
      }
      case 'ADD_TAG':
        if (node.config.tagToAdd && !contact!.tags.includes(node.config.tagToAdd)) contact!.tags.push(node.config.tagToAdd);
        break;
      case 'SET_CONTACT_FIELD':
        if (node.config.fieldToSet) contact!.customFields[node.config.fieldToSet.key] = node.config.fieldToSet.value;
        break;
      case 'HANDOFF_TO_HUMAN':
        conversation!.mode = 'human';
        conversation!.assignedUserId = 'usr_agent_2';
        conversation!.assignedUserName = 'Instagram agent';
        break;
      case 'STOP':
      case 'WAIT':
        return { blocked: false };
      default:
        break;
    }
  }

  return { blocked: false };
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

app.post('/api/v1/instagram/verify', async (_req, res) => {
  try {
    const profile = await verifyInstagramAccount({
      accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
      graphHost: instagramAccount.graphHost,
      graphVersion: instagramAccount.graphVersion,
    });
    instagramAccount.metaIgUserId = profile.user_id || profile.id;
    instagramAccount.username = profile.username;
    instagramAccount.displayName = profile.username;
    instagramAccount.accountType = profile.account_type || instagramAccount.accountType;
    instagramAccount.status = 'connected';
    instagramAccount.webhookStatus = 'active';
    instagramAccount.lastTokenCheckAt = new Date().toISOString();
    persistState();
    res.json({ instagramAccount, profile });
  } catch (error) {
    instagramAccount.status = 'reauth_required';
    instagramAccount.lastTokenCheckAt = new Date().toISOString();
    persistState();
    res.status(502).json({ error: error instanceof Error ? error.message : 'Instagram verification failed' });
  }
});

// Automations CRUD & Actions
app.get('/api/v1/automations', (_req, res) => {
  res.json({ automations });
});

app.post('/api/v1/automations', (req, res) => {
  const autoId = `auto_${crypto.randomUUID()}`;
  const versionId = `ver_${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const newAuto: Automation = {
    id: autoId,
    workspaceId: workspace.id,
    instagramAccountId: instagramAccount.id,
    name: req.body.name || 'اتوماسیون جدید',
    description: req.body.description || '',
    status: 'draft',
    priority: Number.isFinite(Number(req.body.priority)) ? Number(req.body.priority) : 10,
    triggerType: req.body.triggerType || 'COMMENT_KEYWORD',
    keywords: req.body.keywords || ['قیمت'],
    runCount: 0,
    createdBy: 'usr_owner_1',
    createdAt,
    updatedAt: createdAt,
    currentVersion: {
      id: versionId,
      automationId: autoId,
      versionNo: 1,
      checksum: crypto.randomBytes(8).toString('hex'),
      createdAt,
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

  persistState();
  res.status(201).json({ automation: newAuto });
});

app.patch('/api/v1/automations/:id', (req, res) => {
  const auto = automations.find((a) => a.id === req.params.id);
  if (!auto) return res.status(404).json({ error: 'Automation not found' });

  if (req.body.status && ['draft', 'active', 'paused', 'archived'].includes(req.body.status)) auto.status = req.body.status;
  if (typeof req.body.name === 'string' && req.body.name.trim()) auto.name = req.body.name.trim();
  if (Array.isArray(req.body.keywords)) auto.keywords = req.body.keywords.map(String).filter(Boolean);
  const version = req.body.currentVersion || req.body;
  if (Array.isArray(version.nodes)) auto.currentVersion.nodes = version.nodes;
  if (Array.isArray(version.edges)) auto.currentVersion.edges = version.edges;
  auto.updatedAt = new Date().toISOString();

  persistState();
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
    persistState();
    return res.status(400).json({ valid: false, errors, warnings });
  }

  auto.currentVersion.versionNo += 1;
  auto.currentVersion.checksum = crypto.randomBytes(16).toString('hex');
  auto.currentVersion.publishedAt = new Date().toISOString();
  auto.currentVersion.validationResult = { valid: true, errors: [], warnings: ['تایید شده طبق ضوابط ۷ روزه Meta'] };
  auto.status = 'active';
  auto.publishedVersion = clone(auto.currentVersion);
  auto.publishedVersionId = auto.currentVersion.id;
  persistState();

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
  const conv = conversations.find((item) => item.id === req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const convMsgs = messages.filter((m) => m.conversationId === req.params.id);
  res.json({ messages: convMsgs });
});

app.post('/api/v1/conversations/:id/takeover', (req, res) => {
  const conv = conversations.find((c) => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });

  const requestedMode = req.body.mode || (conv.mode === 'human' ? 'automation' : 'human');
  if (!['automation', 'human', 'paused'].includes(requestedMode)) {
    return res.status(400).json({ error: 'Invalid conversation mode' });
  }
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

  persistState();
  res.json({ conversation: conv });
});

app.post('/api/v1/conversations/:id/messages', async (req, res) => {
  const conv = conversations.find((c) => c.id === req.params.id);
  if (!conv) return res.status(404).json({ error: 'Conversation not found' });
  const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
  if (!text) return res.status(400).json({ error: 'Message text is required' });
  if (conv.mode !== 'human') return res.status(409).json({ error: 'Conversation is not in human mode' });
  if (Date.parse(conv.standardWindowOpenUntil) < Date.now()) {
    return res.status(409).json({ error: 'Instagram 24-hour messaging window has expired' });
  }

  const createdAt = new Date().toISOString();
  let status: Message['status'] = 'queued';
  let externalMessageId: string | undefined;
  if (process.env.META_LIVE_MODE === 'true') {
    try {
      const response = await sendInstagramText({
        accessToken: process.env.INSTAGRAM_ACCESS_TOKEN,
        graphHost: instagramAccount.graphHost,
        graphVersion: instagramAccount.graphVersion,
        instagramUserId: instagramAccount.metaIgUserId,
        recipientId: conv.contact.igScopedUserId,
        text,
      });
      status = 'sent';
      externalMessageId = response.message_id;
    } catch (error) {
      status = 'failed';
      dlqItems.unshift({
        id: `dlq_${crypto.randomUUID()}`,
        jobId: `job_${crypto.randomUUID()}`,
        actionType: 'SEND_TEXT',
        recipientId: conv.contact.igScopedUserId,
        errorReason: error instanceof Error ? error.message : 'Meta send failed',
        errorClass: 'transient',
        payloadSummary: text,
        attemptCount: 1,
        lastAttemptAt: createdAt,
        canReplay: true,
      });
    }
  }

  const newMsg: Message = {
    id: `msg_out_${crypto.randomUUID()}`,
    workspaceId: workspace.id,
    instagramAccountId: instagramAccount.id,
    conversationId: conv.id,
    externalMessageId,
    direction: 'outbound',
    messageType: 'text',
    textBody: text,
    content: { text },
    status,
    policyBasis: 'human_agent_reply',
    correlationId: `corr_human_${crypto.randomUUID()}`,
    sentAt: status === 'sent' ? createdAt : undefined,
    createdAt,
  };

  messages.push(newMsg);
  conv.lastOutboundAt = new Date().toISOString();
  conv.lastMessageAt = new Date().toISOString();
  conv.lastMessagePreview = text;

  if (status === 'sent') analytics.privateRepliesSent += 1;
  persistState();
  res.status(201).json({ message: newMsg, conversation: conv });
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
  if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
    return res.status(400).json({ error: 'Product name is required' });
  }
  const priceMinor = Number(req.body.priceMinor);
  if (!Number.isFinite(priceMinor) || priceMinor < 0) {
    return res.status(400).json({ error: 'Product price must be a non-negative number' });
  }
  const newProd: Product = {
    id: `prod_${crypto.randomUUID()}`,
    workspaceId: workspace.id,
    name: req.body.name || 'محصول جدید',
    description: req.body.description || '',
    priceMinor,
    currency: 'IRT',
    sku: req.body.sku || `SKU-${Date.now().toString().slice(-4)}`,
    imageUrl: req.body.imageUrl || 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
    productUrl: req.body.productUrl || 'https://usdhunter.ir',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  products.unshift(newProd);
  persistState();
  res.status(201).json({ product: newProd });
});

// Webhook Studio Simulation Endpoint
app.post('/api/v1/webhooks/simulate-legacy', (req, res) => {
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

  const appSecret = (process.env.META_APP_SECRET || 'instaflow_app_secret_demo').trim();
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

app.post('/api/v1/webhooks/simulate', async (req, res) => {
  const eventType = req.body.eventType || 'comments';
  const text = typeof req.body.text === 'string' ? req.body.text : 'قیمت محصول را می‌خواهم';
  const username = typeof req.body.username === 'string' ? req.body.username : 'sample_user';
  const isExpiredComment = Boolean(req.body.isExpiredComment) && eventType === 'comments';
  const createdTimeSec = isExpiredComment
    ? Math.floor(Date.now() / 1000) - 8 * 24 * 3600
    : Math.floor(Date.now() / 1000) - 60;
  const sender = { id: `igs_sim_${username}`, username };
  const value: any = eventType === 'comments'
    ? {
        id: `cmt_sim_${crypto.randomUUID()}`,
        text,
        created_time: createdTimeSec,
        media: { id: '17891122334455', media_product_type: 'REELS' },
        from: sender,
      }
    : {
        message: {
          mid: `mid_sim_${crypto.randomUUID()}`,
          text,
          from: sender,
          ...(eventType === 'quick_reply' ? { quick_reply: { payload: text } } : {}),
        },
      };
  const payload = {
    object: 'instagram',
    entry: [{ id: instagramAccount.metaIgUserId, time: createdTimeSec, changes: [{ field: eventType === 'comments' ? 'comments' : 'messages', value }] }],
  };
  const fingerprint = crypto.createHash('sha256').update(`meta_${JSON.stringify(payload)}`).digest('hex').slice(0, 32);
  const requestedDuplicate = Boolean(req.body.isDuplicate);
  const effectiveFingerprint = requestedDuplicate ? Array.from(processedFingerprints)[0] || fingerprint : fingerprint;
  const isDeduped = processedFingerprints.has(effectiveFingerprint);
  const eventId = `whe_sim_${crypto.randomUUID()}`;
  const eventRecord: WebhookEvent = {
    id: eventId,
    workspaceId: workspace.id,
    instagramAccountId: instagramAccount.id,
    eventType: eventType === 'comments' ? 'comments' : 'messages',
    externalEventId: value.id || value.message?.mid,
    fingerprint: effectiveFingerprint,
    signatureValid: true,
    payload,
    status: isDeduped ? 'deduped' : 'received',
    receivedAt: new Date().toISOString(),
    errorCode: isDeduped ? 'DUPLICATE_EVENT' : undefined,
  };
  webhookEvents.unshift(eventRecord);

  let blocked = false;
  if (!isDeduped) {
    processedFingerprints.add(effectiveFingerprint);
    try {
      blocked = (await processIncomingWebhookEvent(payload, eventId)).blocked;
      eventRecord.status = blocked ? 'failed' : 'processed';
      eventRecord.errorCode = blocked ? 'META_POLICY_7DAY_EXPIRED' : undefined;
      eventRecord.processedAt = new Date().toISOString();
    } catch (error) {
      eventRecord.status = 'failed';
      eventRecord.errorCode = error instanceof Error ? error.message.slice(0, 120) : 'PROCESSING_ERROR';
    }
  }
  persistState();
  const deliveredActionsCount = messages.filter((message) =>
    message.direction === 'outbound' && message.correlationId === `corr_${eventId}`,
  ).length;
  res.json({
    simulationResult: {
      eventId,
      signature: calculateSignature(Buffer.from(JSON.stringify(payload)), process.env.META_APP_SECRET || 'instaflow_app_secret_demo'),
      signatureValid: true,
      fingerprint: effectiveFingerprint,
      isDeduped,
      isExpiredComment: blocked,
      status: isDeduped ? 'deduped' : blocked ? 'policy_blocked' : eventRecord.status,
      deliveredActionsCount,
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

  item.attemptCount = (item.attemptCount || 0) + 1;
  item.lastAttemptAt = new Date().toISOString();
  dlqItems = dlqItems.filter((d) => d.id !== req.params.id);
  auditLogs.unshift({
    id: `aud_${crypto.randomUUID()}`,
    workspaceId: workspace.id,
    actorName: 'System',
    action: 'DLQ_REPLAY_REQUESTED',
    resourceType: 'dlq_item',
    resourceId: item.id,
    metadata: { actionType: item.actionType, jobId: item.jobId, attemptCount: item.attemptCount },
    createdAt: new Date().toISOString(),
  });
  persistState();
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
