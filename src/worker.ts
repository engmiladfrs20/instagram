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
  WorkspaceMember,
} from './types';
import { executableNodes, IncomingContext, matchesAutomation, runtimeVersion } from './lib/automationEngine';

type Env = Cloudflare.Env & {
  META_APP_SECRET?: string;
  META_APP_ID?: string;
  INSTAGRAM_ACCESS_TOKEN?: string;
  GEMINI_API_KEY?: string;
  META_LIVE_MODE?: string;
};

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

const CORRECT_AUTOMATION_TEXT_REPAIRS: typeof AUTOMATION_TEXT_REPAIRS = {
  auto_comment_price: {
    keywords: ['\u0642\u06cc\u0645\u062a', '\u0642\u06cc\u0645\u062a\u0634', '\u0686\u0646\u062f\u0647', '\u0644\u06cc\u0646\u06a9', '\u062e\u0631\u06cc\u062f', '\u0633\u0641\u0627\u0631\u0634', '\u062a\u062e\u0641\u06cc\u0641'],
    triggerKeywords: ['\u0642\u06cc\u0645\u062a', '\u0642\u06cc\u0645\u062a\u0634', '\u0686\u0646\u062f\u0647', '\u0644\u06cc\u0646\u06a9', '\u062e\u0631\u06cc\u062f', '\u0633\u0641\u0627\u0631\u0634', '\u062a\u062e\u0641\u06cc\u0641'],
    publicReply: '\u0633\u0644\u0627\u0645 \u0639\u0632\u06cc\u0632 \u062f\u0644\u0645 ❤️ \u062c\u0632\u0626\u06cc\u0627\u062a \u06a9\u0627\u0645\u0644 \u0648 \u0644\u06cc\u0646\u06a9 \u0633\u0641\u0627\u0631\u0634 \u0628\u0647 \u062f\u0627\u06cc\u0631\u06a9\u062a \u0634\u0645\u0627 \u0627\u0631\u0633\u0627\u0644 \u0634\u062f 📩',
    privateReply: '\u0633\u0644\u0627\u0645 \u062f\u0648\u0633\u062a \u0639\u0632\u06cc\u0632! 🌸 \u0645\u0631\u0633\u06cc \u0627\u0632 \u06a9\u0627\u0645\u0646\u062a \u0632\u06cc\u0628\u0627\u06cc\u062a. \u0642\u06cc\u0645\u062a \u0645\u0627\u0646\u062a\u0648 \u06a9\u062a\u0627\u0646 \u062a\u0627\u0628\u0633\u062a\u0627\u0646\u0647 \u0628\u0627 \u062a\u062e\u0641\u06cc\u0641 \u06f8\u06f9\u06f0\u060c\u06f0\u06f0\u06f0 \u062a\u0648\u0645\u0627\u0646 \u0647\u0633\u062a\u0634.',
  },
  auto_lead_form_direct: {
    keywords: ['\u0633\u0641\u0627\u0631\u0634', '\u062e\u0631\u06cc\u062f \u0622\u0646\u0644\u0627\u06cc\u0646', '\u0641\u0627\u06a9\u062a\u0648\u0631', '\u062b\u0628\u062a \u0633\u0641\u0627\u0631\u0634'],
    triggerKeywords: ['\u0633\u0641\u0627\u0631\u0634', '\u062b\u0628\u062a \u0633\u0641\u0627\u0631\u0634'],
  },
  auto_faq_icebreaker: {
    keywords: ['\u0633\u0644\u0627\u0645', '\u0631\u0627\u0647\u0646\u0645\u0627', '\u0622\u062f\u0631\u0633', '\u067e\u0633\u062a', '\u06a9\u062f \u0631\u0647\u06af\u06cc\u0631\u06cc', '\u0633\u0627\u0639\u0627\u062a \u06a9\u0627\u0631\u06cc'],
    triggerKeywords: ['\u0633\u0644\u0627\u0645', '\u0631\u0627\u0647\u0646\u0645\u0627', '\u0622\u062f\u0631\u0633'],
    faqReply: '\u0633\u0644\u0627\u0645! \u0628\u0647 \u062f\u0627\u06cc\u0631\u06a9\u062a \u0634\u06cc\u06a9\u200c\u067e\u0648\u0634\u0627\u0646 \u062e\u0648\u0634 \u0622\u0645\u062f\u06cc\u062f 🌸 \u0686\u0637\u0648\u0631 \u0645\u06cc\u200c\u062a\u0648\u0646\u0645 \u0631\u0627\u0647\u0646\u0645\u0627\u06cc\u06cc\u062a\u0648\u0646 \u06a9\u0646\u0645؟',
  },
};

function repairAutomationTextEncoding(): boolean {
  let repaired = false;
  for (const auto of automations) {
    const repair = CORRECT_AUTOMATION_TEXT_REPAIRS[auto.id];
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
let stateWorkspaceId = INITIAL_WORKSPACE.id;

async function readSnapshotFromStorage(env: Env, workspaceId: string): Promise<WorkerStateSnapshot | null> {
  if (env.DB) {
    const row = await env.DB.prepare('SELECT payload FROM workspace_state WHERE workspace_id = ?1').bind(workspaceId).first<{ payload: string }>();
    if (row?.payload) return JSON.parse(row.payload) as WorkerStateSnapshot;
  }
  if (!env.STATE_KV) return null;
  const saved = await env.STATE_KV.get('instaflow-state', 'json') as WorkerStateSnapshot | null;
  if (saved && env.DB && workspaceId === INITIAL_WORKSPACE.id) {
    await env.DB.prepare(
      'INSERT INTO workspace_state (workspace_id, payload, source, version, updated_at) VALUES (?1, ?2, ?3, 1, ?4) ON CONFLICT(workspace_id) DO NOTHING',
    ).bind(workspaceId, JSON.stringify(saved), 'kv-migration', new Date().toISOString()).run();
  }
  return workspaceId === INITIAL_WORKSPACE.id ? saved : null;
}

async function writeSnapshotToStorage(env: Env, snapshot: WorkerStateSnapshot): Promise<void> {
  const payload = JSON.stringify(snapshot);
  if (env.DB) {
    await env.DB.prepare(
      'INSERT INTO workspace_state (workspace_id, payload, source, version, updated_at) VALUES (?1, ?2, ?3, 1, ?4) ON CONFLICT(workspace_id) DO UPDATE SET payload = excluded.payload, source = excluded.source, version = workspace_state.version + 1, updated_at = excluded.updated_at',
    ).bind(snapshot.workspace.id, payload, 'd1', new Date().toISOString()).run();
    return;
  }
  if (env.STATE_KV) await env.STATE_KV.put('instaflow-state', payload);
}

async function loadWorkerState(env: Env, workspaceId = INITIAL_WORKSPACE.id) {
  if (stateLoaded && stateWorkspaceId === workspaceId) return;
  const saved = await readSnapshotFromStorage(env, workspaceId);
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
  } else if (workspaceId !== INITIAL_WORKSPACE.id) {
    workspace = { ...INITIAL_WORKSPACE, id: workspaceId, name: 'New workspace', slug: `workspace-${workspaceId.slice(-8)}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    members = [];
    instagramAccount = { ...INITIAL_INSTAGRAM_ACCOUNT, id: `iga_${crypto.randomUUID()}`, workspaceId, metaIgUserId: '', username: '', displayName: '', status: 'disconnected', webhookStatus: 'pending', createdAt: new Date().toISOString() };
    automations = [];
    contacts = [];
    conversations = [];
    messages = [];
    forms = [];
    formSubmissions = [];
    products = [];
    webhookEvents = [];
    dlqItems = [];
    auditLogs = [];
    analytics = structuredClone(INITIAL_ANALYTICS);
    normalizeStateReferences();
    await persistWorkerState(env);
  }
  stateLoaded = true;
  stateWorkspaceId = workspace.id;
}

async function persistWorkerState(env: Env) {
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
  const payload = JSON.stringify(snapshot);
  if (env.DB) {
    await env.DB.prepare(
      'INSERT INTO workspace_state (workspace_id, payload, source, version, updated_at) VALUES (?1, ?2, ?3, 1, ?4) ON CONFLICT(workspace_id) DO UPDATE SET payload = excluded.payload, source = excluded.source, version = workspace_state.version + 1, updated_at = excluded.updated_at',
    ).bind(workspace.id, payload, 'd1', new Date().toISOString()).run();
    return;
  }
  if (env.STATE_KV) await env.STATE_KV.put('instaflow-state', payload);
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

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hashPassword(password: string): Promise<string> {
  // Cloudflare Workers limits PBKDF2 derivations to 100,000 iterations.
  const iterations = 100000;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
  return `pbkdf2-sha256$${iterations}$${base64UrlEncode(salt)}$${base64UrlEncode(new Uint8Array(derived))}`;
}

async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, iterationText, saltText, hashText] = encoded.split('$');
  if (algorithm !== 'pbkdf2-sha256' || !iterationText || !saltText || !hashText) return false;
  const iterations = Number(iterationText);
  if (!Number.isInteger(iterations) || iterations !== 100000) return false;
  const expected = base64UrlDecode(hashText);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: base64UrlDecode(saltText), iterations, hash: 'SHA-256' }, key, 256));
  let difference = derived.length ^ expected.length;
  for (let index = 0; index < Math.max(derived.length, expected.length); index += 1) difference |= (derived[index] || 0) ^ (expected[index] || 0);
  return difference === 0;
}

function getCookie(request: Request, name: string): string | undefined {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined;
}

function getSessionToken(request: Request): string | undefined {
  const authorization = request.headers.get('Authorization') || '';
  if (authorization.startsWith('Bearer ')) return authorization.slice(7).trim();
  return getCookie(request, '__Host-instaflow_session');
}

interface AuthContext {
  userId: string;
  email: string;
  displayName: string;
  workspaceId: string;
  role: string;
}

async function getAuthContext(request: Request, env: Env): Promise<AuthContext | null> {
  if (!env.DB) return null;
  const token = getSessionToken(request);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    'SELECT s.user_id AS userId, u.email, u.display_name AS displayName, wm.workspace_id AS workspaceId, wm.role FROM sessions s JOIN users u ON u.id = s.user_id JOIN workspace_memberships wm ON wm.user_id = u.id AND wm.status = \'active\' WHERE s.token_hash = ?1 AND s.expires_at > ?2 AND u.status = \'active\' ORDER BY wm.role = \'owner\' DESC LIMIT 1',
  ).bind(tokenHash, now).first<AuthContext>();
  if (!row) return null;
  await env.DB.prepare('UPDATE sessions SET last_seen_at = ?1 WHERE token_hash = ?2').bind(now, tokenHash).run();
  return row;
}

async function createSession(env: Env, userId: string): Promise<{ token: string; expiresAt: string }> {
  const token = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256Hex(token);
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
  await env.DB!.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, created_at, last_seen_at) VALUES (?1, ?2, ?3, ?4, ?4)').bind(tokenHash, userId, expiresAt, createdAt).run();
  return { token, expiresAt };
}

function sessionCookie(token: string, maxAge = 30 * 24 * 3600): string {
  return `__Host-instaflow_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function blankWorkspaceSnapshot(workspaceId: string, name: string, slug: string, member: WorkspaceMember): WorkerStateSnapshot {
  const createdAt = new Date().toISOString();
  const blankAccount = {
    ...structuredClone(INITIAL_INSTAGRAM_ACCOUNT),
    id: `iga_${crypto.randomUUID()}`,
    workspaceId,
    metaIgUserId: '',
    username: '',
    displayName: '',
    status: 'disconnected' as const,
    webhookStatus: 'pending' as const,
    createdAt,
  };
  const snapshot: WorkerStateSnapshot = {
    workspace: { ...structuredClone(INITIAL_WORKSPACE), id: workspaceId, name, slug, createdAt, updatedAt: createdAt },
    members: [member],
    instagramAccount: blankAccount,
    automations: [],
    contacts: [],
    conversations: [],
    messages: [],
    forms: [],
    formSubmissions: [],
    products: [],
    webhookEvents: [],
    dlqItems: [],
    auditLogs: [],
    analytics: structuredClone(INITIAL_ANALYTICS),
  };
  return snapshot;
}

function jsonResponseWithCookie(data: unknown, cookie: string, status = 200, origin = 'https://usdhunter.ir'): Response {
  const response = jsonResponse(data, status, origin);
  response.headers.set('Set-Cookie', cookie);
  return response;
}

interface AiSettingsRow {
  workspace_id: string;
  enabled: number;
  model: string;
  system_prompt: string;
  temperature: number;
  max_output_tokens: number;
  daily_request_limit: number;
  created_at: string;
  updated_at: string;
}

async function getAiSettings(env: Env, workspaceId: string): Promise<AiSettingsRow | null> {
  if (!env.DB) return null;
  const existing = await env.DB.prepare('SELECT * FROM ai_settings WHERE workspace_id = ?1').bind(workspaceId).first<AiSettingsRow>();
  if (existing) {
    // Gemini's former 2.5 default is no longer available to new API users.
    if (existing.model === 'gemini-2.5-flash') {
      existing.model = 'gemini-3.6-flash';
      await env.DB.prepare('UPDATE ai_settings SET model = ?1, updated_at = ?2 WHERE workspace_id = ?3').bind(existing.model, new Date().toISOString(), workspaceId).run();
    }
    return existing;
  }
  const now = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO ai_settings (workspace_id, enabled, model, system_prompt, temperature, max_output_tokens, daily_request_limit, created_at, updated_at) VALUES (?1, 0, ?2, ?3, 0.2, 512, 100, ?4, ?4)',
  ).bind(workspaceId, 'gemini-3.6-flash', 'You are a careful customer-support assistant. Answer only from the supplied business knowledge. Never invent prices, stock, delivery times, policies, or order status. If the answer is unknown, say that a human agent will follow up.', now).run();
  return env.DB.prepare('SELECT * FROM ai_settings WHERE workspace_id = ?1').bind(workspaceId).first<AiSettingsRow>();
}

async function getKnowledgeItems(env: Env, workspaceId: string): Promise<Array<{ title: string; content: string }>> {
  if (!env.DB) return [];
  const result = await env.DB.prepare('SELECT title, content FROM knowledge_items WHERE workspace_id = ?1 AND status = \'active\' ORDER BY updated_at DESC LIMIT 40').bind(workspaceId).all<{ title: string; content: string }>();
  return result.results || [];
}

async function askGemini(env: Env, workspaceId: string, userText: string, channel: 'dm' | 'comment'): Promise<{ text: string; model: string } | null> {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey || !env.DB) return null;
  const settings = await getAiSettings(env, workspaceId);
  if (!settings || settings.enabled !== 1) return null;
  const usageDate = new Date().toISOString().slice(0, 10);
  const usage = await env.DB.prepare('SELECT request_count FROM ai_usage_daily WHERE workspace_id = ?1 AND usage_date = ?2').bind(workspaceId, usageDate).first<{ request_count: number }>();
  if (Number(usage?.request_count || 0) >= Number(settings.daily_request_limit || 100)) return null;
  const knowledge = await getKnowledgeItems(env, workspaceId);
  const productsContext = products.slice(0, 50).map((product) => `${product.name}: ${product.description}; price=${product.priceMinor} ${product.currency}; status=${product.status}`).join('\n');
  const knowledgeContext = knowledge.map((item) => `## ${item.title}\n${item.content}`).join('\n');
  const prompt = `${settings.system_prompt}\n\nChannel: ${channel}\nBusiness products:\n${productsContext || 'No product data has been provided.'}\nBusiness knowledge:\n${knowledgeContext || 'No additional knowledge has been provided.'}\n\nCustomer message:\n${userText.slice(0, 2000)}\n\nReturn only the customer-facing answer in Persian, without markdown, internal reasoning, or invented facts.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: settings.system_prompt }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: Math.min(1, Math.max(0, Number(settings.temperature) || 0.2)), maxOutputTokens: Math.min(1024, Math.max(64, Number(settings.max_output_tokens) || 512)) },
    }),
  });
  const result: any = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.log(JSON.stringify({ event: 'gemini_request_failed', status: response.status, code: result?.error?.status || result?.error?.code }));
    return null;
  }
  const text = result?.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('').trim().slice(0, 1500);
  if (!text) return null;
  await env.DB.prepare(
    'INSERT INTO ai_usage_daily (workspace_id, usage_date, request_count, input_tokens, output_tokens) VALUES (?1, ?2, 1, 0, 0) ON CONFLICT(workspace_id, usage_date) DO UPDATE SET request_count = ai_usage_daily.request_count + 1',
  ).bind(workspaceId, usageDate).run();
  return { text, model: settings.model };
}

async function deriveInstagramTokenKey(env: Env, workspaceId: string, usages: KeyUsage[]): Promise<CryptoKey> {
  const secret = env.META_APP_SECRET?.trim();
  if (!secret) throw new Error('META_APP_SECRET is not configured');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${secret}:${workspaceId}`));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, usages);
}

async function encryptInstagramToken(env: Env, workspaceId: string, token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveInstagramTokenKey(env, workspaceId, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(token)));
  return `${base64UrlEncode(iv)}.${base64UrlEncode(encrypted)}`;
}

async function decryptInstagramToken(env: Env, workspaceId: string, ciphertext: string): Promise<string> {
  const [ivText, dataText] = ciphertext.split('.');
  if (!ivText || !dataText) throw new Error('Invalid Instagram token ciphertext');
  const key = await deriveInstagramTokenKey(env, workspaceId, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64UrlDecode(ivText) }, key, base64UrlDecode(dataText));
  return new TextDecoder().decode(plaintext);
}

async function getInstagramAccessToken(env: Env): Promise<string | undefined> {
  if (env.DB) {
    const connection = await env.DB.prepare('SELECT access_token_ciphertext AS ciphertext FROM instagram_connections WHERE workspace_id = ?1 AND id = ?2 AND status = \'connected\' LIMIT 1').bind(workspace.id, instagramAccount.id).first<{ ciphertext: string }>();
    if (connection?.ciphertext) {
      try {
        return await decryptInstagramToken(env, workspace.id, connection.ciphertext);
      } catch (error) {
        console.log(JSON.stringify({ event: 'instagram_token_decrypt_failed', workspaceId: workspace.id, error: error instanceof Error ? error.message : String(error) }));
      }
    }
  }
  // Keep the original single-workspace installation working during migration.
  return workspace.id === INITIAL_WORKSPACE.id ? env.INSTAGRAM_ACCESS_TOKEN?.trim() : undefined;
}

function instagramOAuthRedirectUri(env: Env): string {
  return `${(env.APP_ORIGIN || 'https://instaflow-worker.m-farokhi2729.workers.dev').replace(/\/$/, '')}/api/v1/instagram/oauth/callback`;
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

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
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

async function deliverAiReply(
  env: Env,
  text: string,
  recipientId: string,
  conversation: Conversation,
  eventId: string,
): Promise<void> {
  let status: Message['status'] = 'queued';
  let externalId: string | undefined;
  if (env.META_LIVE_MODE === 'true') {
    const accessToken = await getInstagramAccessToken(env);
    if (!accessToken) throw new Error('INSTAGRAM_ACCESS_TOKEN is not configured');
    const url = `https://${instagramAccount.graphHost}/${instagramAccount.graphVersion}/${encodeURIComponent(instagramAccount.metaIgUserId)}/messages?access_token=${encodeURIComponent(accessToken)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient: { id: recipientId }, message: { text } }),
    });
    const result: any = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error?.message || `Meta API returned HTTP ${response.status}`);
    status = 'sent';
    externalId = result.message_id || result.id;
  }
  const now = new Date().toISOString();
  messages.push({
    id: `msg_ai_${crypto.randomUUID()}`,
    workspaceId: workspace.id,
    instagramAccountId: instagramAccount.id,
    conversationId: conversation.id,
    externalMessageId: externalId,
    direction: 'outbound',
    messageType: 'text',
    textBody: text,
    content: { text },
    status,
    policyBasis: 'gemini_ai_assistant',
    correlationId: `corr_${eventId}`,
    sentAt: status === 'sent' ? now : undefined,
    createdAt: now,
  });
  conversation.lastOutboundAt = now;
  conversation.lastMessageAt = now;
  conversation.lastMessagePreview = text;
  if (status === 'sent') analytics.privateRepliesSent += 1;
}

async function processIncomingWebhookEvent(payload: any, eventId: string, env: Env): Promise<{ blocked: boolean }> {
  // Instagram sends comments through entry.changes, but direct messages
  // from the Instagram Messaging webhook arrive through entry.messaging.
  // Normalize both shapes before extracting the message fields.
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const messagingEvent = entry?.messaging?.[0];
  const field = change?.field || 'messages';
  const value = change?.value || messagingEvent;
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
    mediaId: isComment ? String(value?.media?.id || '') : undefined,
    isFollower: typeof fromUser.is_follower === 'boolean' ? fromUser.is_follower : undefined,
  };
  const automation = automations
    .filter((item) => matchesAutomation(item, context))
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id))[0];
  if (!automation) {
    const aiReply = await askGemini(env, workspace.id, text, isComment ? 'comment' : 'dm');
    if (aiReply && conversation.mode === 'automation') await deliverAiReply(env, aiReply.text, String(fromUser.id), conversation, eventId);
    return { blocked: false };
  }
  automation.runCount += 1;
  automation.lastTriggeredAt = now;

  const recordOutbound = async (messageType: Message['messageType'], content: Message['content'], policyBasis: string) => {
    let status: Message['status'] = 'queued';
    let externalId: string | undefined;
    if (env.META_LIVE_MODE === 'true' && content.text) {
      const accessToken = (await getInstagramAccessToken(env)) || '';
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

  const chooseVariant = (variants: string[] | undefined, fallback: string | undefined) => {
    const values = (variants || []).map((item) => String(item).trim()).filter(Boolean);
    if (values.length === 0) return fallback;
    return values[Math.floor(Math.random() * values.length)];
  };

  for (const node of executableNodes(runtimeVersion(automation), context)) {
    if (node.type === 'REPLY_PUBLIC_COMMENT' && isComment && node.config.commentReplyDestination !== 'dm') {
      const publicText = chooseVariant(node.config.publicResponseVariants, node.config.publicReplyText);
      if (publicText) await recordOutbound('public_comment_reply', { text: publicText }, 'public_comment_moderation');
    } else if (node.type === 'SEND_PRIVATE_REPLY' && node.config.text && !(isComment && node.config.commentReplyDestination === 'comment')) {
      const privateText = chooseVariant(node.config.responseVariants, node.config.text);
      await recordOutbound('private_reply', { text: privateText, quickReplies: node.config.quickReplies, isPrivateReply: true }, 'comment_to_dm_7day_rule');
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
    const url = new URL(request.url);
    const { pathname, searchParams } = url;
    const method = request.method;
    let bootstrapWorkspaceId = INITIAL_WORKSPACE.id;
    if (pathname === '/api/v1/instagram/oauth/callback' && env.DB) {
      const oauthState = searchParams.get('state');
      if (oauthState) {
        const stateRow = await env.DB.prepare('SELECT workspace_id AS workspaceId FROM instagram_oauth_states WHERE state_hash = ?1 AND expires_at > ?2').bind(await sha256Hex(oauthState), new Date().toISOString()).first<{ workspaceId: string }>();
        if (stateRow?.workspaceId) bootstrapWorkspaceId = stateRow.workspaceId;
      }
    }
    let authContext: AuthContext | null = null;
    try {
      authContext = await getAuthContext(request, env);
      await loadWorkerState(env, authContext?.workspaceId || bootstrapWorkspaceId);
    } catch (error) {
      console.log(JSON.stringify({ event: 'state_bootstrap_failed', error: error instanceof Error ? error.message : String(error) }));
      return jsonResponse({ error: 'State bootstrap failed' }, 500);
    }

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

      // Meta's webhook entry id is the Instagram professional account id.
      // Resolve it to the owning workspace before processing a multi-tenant event.
      if (signatureValid && env.DB && payload?.entry?.[0]?.id) {
        const routedConnection = await env.DB.prepare('SELECT workspace_id AS workspaceId FROM instagram_connections WHERE meta_ig_user_id = ?1 AND status = \'connected\' LIMIT 1').bind(String(payload.entry[0].id)).first<{ workspaceId: string }>();
        if (routedConnection?.workspaceId && routedConnection.workspaceId !== workspace.id) {
          await loadWorkerState(env, routedConnection.workspaceId);
        }
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
    // 2. Authentication and tenant bootstrap
    // ==========================================

    if (pathname === '/api/v1/auth/register' && method === 'POST') {
      if (!env.DB) return jsonResponse({ error: 'D1 database is not configured' }, 503);
      try {
        const body: any = await request.json().catch(() => ({}));
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        if (!/^\S+@\S+\.\S+$/.test(email)) return jsonResponse({ error: 'A valid email is required' }, 400);
        if (password.length < 8) return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
        if (displayName.length < 2) return jsonResponse({ error: 'Display name is required' }, 400);
        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?1').bind(email).first<{ id: string }>();
        if (existing) return jsonResponse({ error: 'An account with this email already exists' }, 409);
        const userCount = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first<{ count: number }>();
        const firstUser = Number(userCount?.count || 0) === 0;
        const userId = firstUser ? 'usr_owner_1' : `usr_${crypto.randomUUID()}`;
        const workspaceId = firstUser ? INITIAL_WORKSPACE.id : `ws_${crypto.randomUUID()}`;
        const workspaceName = typeof body.workspaceName === 'string' && body.workspaceName.trim() ? body.workspaceName.trim() : `${displayName} Workspace`;
        const workspaceSlug = `${workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'workspace'}-${userId.slice(-6)}`;
        const createdAt = new Date().toISOString();
        const passwordHash = await hashPassword(password);
        const member: WorkspaceMember = { workspaceId, userId, userName: displayName, userEmail: email, role: 'owner', status: 'active', createdAt };
        const currentSnapshot: WorkerStateSnapshot = {
          workspace,
          members: [member],
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
        const snapshot = firstUser
          ? { ...currentSnapshot, members: [member], workspace: { ...currentSnapshot.workspace, updatedAt: createdAt } }
          : blankWorkspaceSnapshot(workspaceId, workspaceName, workspaceSlug, member);
        await env.DB.batch([
          env.DB.prepare('INSERT INTO users (id, email, display_name, password_hash, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, \'active\', ?5, ?5)').bind(userId, email, displayName, passwordHash, createdAt),
          env.DB.prepare('INSERT INTO workspace_memberships (workspace_id, user_id, role, status, created_at) VALUES (?1, ?2, \'owner\', \'active\', ?3)').bind(workspaceId, userId, createdAt),
        ]);
        await writeSnapshotToStorage(env, snapshot);
        const session = await createSession(env, userId);
        return jsonResponseWithCookie({ user: { id: userId, email, displayName }, workspace: snapshot.workspace }, sessionCookie(session.token), 201, env.APP_ORIGIN);
      } catch (error) {
        console.log(JSON.stringify({ event: 'auth_register_failed', error: error instanceof Error ? error.message : String(error) }));
        return jsonResponse({ error: 'Registration failed' }, 500);
      }
    }

    if (pathname === '/api/v1/auth/login' && method === 'POST') {
      if (!env.DB) return jsonResponse({ error: 'D1 database is not configured' }, 503);
      const body: any = await request.json().catch(() => ({}));
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const user = await env.DB.prepare('SELECT id, email, display_name AS displayName, password_hash AS passwordHash FROM users WHERE email = ?1 AND status = \'active\'').bind(email).first<{ id: string; email: string; displayName: string; passwordHash: string }>();
      if (!user || !(await verifyPassword(password, user.passwordHash))) return jsonResponse({ error: 'Email or password is incorrect' }, 401);
      const membership = await env.DB.prepare('SELECT workspace_id AS workspaceId, role FROM workspace_memberships WHERE user_id = ?1 AND status = \'active\' ORDER BY role = \'owner\' DESC LIMIT 1').bind(user.id).first<{ workspaceId: string; role: string }>();
      if (!membership) return jsonResponse({ error: 'No active workspace is assigned to this account' }, 403);
      const session = await createSession(env, user.id);
      return jsonResponseWithCookie({ user: { id: user.id, email: user.email, displayName: user.displayName }, workspaceId: membership.workspaceId, role: membership.role }, sessionCookie(session.token), 200, env.APP_ORIGIN);
    }

    if (pathname === '/api/v1/auth/logout' && method === 'POST') {
      const token = getSessionToken(request);
      if (token && env.DB) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?1').bind(await sha256Hex(token)).run();
      return jsonResponseWithCookie({ ok: true }, sessionCookie('', 0), 200, env.APP_ORIGIN);
    }

    if (pathname === '/api/v1/auth/me' && method === 'GET') {
      if (!authContext) return jsonResponse({ authenticated: false }, 401);
      return jsonResponse({ authenticated: true, user: authContext }, 200, env.APP_ORIGIN);
    }

    const publicApiPath = pathname === '/api/v1/health' || pathname.startsWith('/api/v1/auth/') || pathname === '/api/v1/instagram/oauth/callback';
    if (env.DB && pathname.startsWith('/api/v1/') && !publicApiPath && !authContext) {
      return jsonResponse({ error: 'Authentication required' }, 401, env.APP_ORIGIN);
    }

    if (pathname === '/api/v1/instagram/oauth/start' && method === 'GET') {
      if (!env.DB || !authContext) return jsonResponse({ error: 'Authentication required' }, 401, env.APP_ORIGIN);
      if (!env.META_APP_ID || !env.META_APP_SECRET) return jsonResponse({ error: 'Meta OAuth is not configured' }, 503, env.APP_ORIGIN);
      const state = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
      await env.DB.prepare('DELETE FROM instagram_oauth_states WHERE expires_at <= ?1').bind(now.toISOString()).run();
      await env.DB.prepare('INSERT INTO instagram_oauth_states (state_hash, workspace_id, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)').bind(await sha256Hex(state), workspace.id, expiresAt, now.toISOString()).run();
      const redirectUri = instagramOAuthRedirectUri(env);
      const scope = ['instagram_business_basic', 'instagram_business_manage_messages', 'instagram_business_manage_comments'].join(',');
      const authorizationUrl = `https://www.instagram.com/oauth/authorize?client_id=${encodeURIComponent(env.META_APP_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
      return jsonResponse({ authorizationUrl, redirectUri, expiresAt }, 200, env.APP_ORIGIN);
    }

    if (pathname === '/api/v1/instagram/oauth/callback' && method === 'GET') {
      if (!env.DB || !env.META_APP_ID || !env.META_APP_SECRET) return htmlResponse('<h1>Meta OAuth is not configured</h1>', 503);
      const state = searchParams.get('state') || '';
      const code = searchParams.get('code') || '';
      const providerError = searchParams.get('error_description') || searchParams.get('error');
      const stateRow = await env.DB.prepare('SELECT workspace_id AS workspaceId FROM instagram_oauth_states WHERE state_hash = ?1 AND expires_at > ?2').bind(await sha256Hex(state), new Date().toISOString()).first<{ workspaceId: string }>();
      if (!state || !stateRow) return htmlResponse('<h1>OAuth state is invalid or expired</h1>', 400);
      await env.DB.prepare('DELETE FROM instagram_oauth_states WHERE state_hash = ?1').bind(await sha256Hex(state)).run();
      if (providerError || !code) return htmlResponse(`<h1>Instagram connection was cancelled</h1><p>${providerError || 'No authorization code was returned.'}</p>`, 400);
      try {
        const redirectUri = instagramOAuthRedirectUri(env);
        const shortTokenResponse = await fetchWithTimeout('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ client_id: env.META_APP_ID, client_secret: env.META_APP_SECRET, grant_type: 'authorization_code', redirect_uri: redirectUri, code }),
        });
        const shortToken = await shortTokenResponse.json<any>().catch(() => ({}));
        if (!shortTokenResponse.ok || !shortToken.access_token) throw new Error(shortToken?.error_message || `Authorization code exchange failed (${shortTokenResponse.status})`);
        const longTokenUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(env.META_APP_SECRET)}&access_token=${encodeURIComponent(shortToken.access_token)}`;
        const longTokenResponse = await fetchWithTimeout(longTokenUrl);
        const longToken = await longTokenResponse.json<any>().catch(() => ({}));
        const accessToken = longToken.access_token || shortToken.access_token;
        if (!longTokenResponse.ok || !accessToken) throw new Error(longToken?.error?.message || `Long-lived token exchange failed (${longTokenResponse.status})`);
        const profileResponse = await fetchWithTimeout(`https://graph.instagram.com/${instagramAccount.graphVersion}/me?fields=id,username,account_type,user_id&access_token=${encodeURIComponent(accessToken)}`);
        const profile = await profileResponse.json<any>().catch(() => ({}));
        if (!profileResponse.ok || !profile.username) throw new Error(profile?.error?.message || `Instagram profile lookup failed (${profileResponse.status})`);
        const now = new Date().toISOString();
        const accountId = instagramAccount.metaIgUserId ? instagramAccount.id : `iga_${crypto.randomUUID()}`;
        const tokenExpiresAt = new Date(Date.now() + Number(longToken.expires_in || 5_184_000) * 1000).toISOString();
        const tokenCiphertext = await encryptInstagramToken(env, stateRow.workspaceId, accessToken);
        const scopes = ['instagram_business_basic', 'instagram_business_manage_messages', 'instagram_business_manage_comments'];
        await env.DB.prepare('INSERT INTO instagram_connections (id, workspace_id, meta_ig_user_id, username, display_name, profile_pic_url, account_type, access_token_ciphertext, token_expires_at, granted_scopes, status, webhook_status, last_token_check_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, \'connected\', \'active\', ?11, ?12, ?12) ON CONFLICT(id) DO UPDATE SET meta_ig_user_id = excluded.meta_ig_user_id, username = excluded.username, display_name = excluded.display_name, account_type = excluded.account_type, access_token_ciphertext = excluded.access_token_ciphertext, token_expires_at = excluded.token_expires_at, granted_scopes = excluded.granted_scopes, status = \'connected\', webhook_status = \'active\', last_token_check_at = excluded.last_token_check_at, updated_at = excluded.updated_at').bind(accountId, stateRow.workspaceId, String(profile.user_id || profile.id), String(profile.username), String(profile.username), null, String(profile.account_type || 'BUSINESS'), tokenCiphertext, tokenExpiresAt, JSON.stringify(scopes), now, now).run();
        instagramAccount.id = accountId;
        instagramAccount.workspaceId = stateRow.workspaceId;
        instagramAccount.metaIgUserId = String(profile.user_id || profile.id);
        instagramAccount.username = String(profile.username);
        instagramAccount.displayName = String(profile.username);
        instagramAccount.accountType = profile.account_type || 'BUSINESS';
        instagramAccount.grantedScopes = scopes;
        instagramAccount.status = 'connected';
        instagramAccount.webhookStatus = 'active';
        instagramAccount.tokenExpiresAt = tokenExpiresAt;
        instagramAccount.lastTokenCheckAt = now;
        await persistWorkerState(env);
        return htmlResponse('<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="1;url=/"><title>Instagram connected</title></head><body><h1>Instagram connected successfully</h1><p>Returning to InstaFlow…</p><p><a href="/">Open InstaFlow</a></p></body></html>', 200);
      } catch (error) {
        console.log(JSON.stringify({ event: 'instagram_oauth_failed', workspaceId: stateRow.workspaceId, error: error instanceof Error ? error.message : String(error) }));
        return htmlResponse('<h1>Instagram connection failed</h1><p>Meta did not complete the connection. Return to InstaFlow and try again.</p>', 502);
      }
    }

    if (pathname === '/api/v1/admin/cleanup-test-data' && method === 'GET') {
      return jsonResponse({
        counts: {
          automations: automations.length,
          contacts: contacts.length,
          conversations: conversations.length,
          messages: messages.length,
          forms: forms.length,
          formSubmissions: formSubmissions.length,
          products: products.length,
          webhookEvents: webhookEvents.length,
          dlqItems: dlqItems.length,
          auditLogs: auditLogs.length,
        },
        instruction: 'POST with confirm=RESET_TEST_DATA to clear workspace demo and operational records.',
      }, 200, env.APP_ORIGIN);
    }

    if (pathname === '/api/v1/admin/cleanup-test-data' && method === 'POST') {
      if (authContext?.role !== 'owner') return jsonResponse({ error: 'Only the workspace owner can clean data' }, 403, env.APP_ORIGIN);
      const body: any = await request.json().catch(() => ({}));
      if (body.confirm !== 'RESET_TEST_DATA') return jsonResponse({ error: 'Confirmation is required' }, 400, env.APP_ORIGIN);
      const before = { automations: automations.length, contacts: contacts.length, conversations: conversations.length, messages: messages.length, forms: forms.length, formSubmissions: formSubmissions.length, products: products.length, webhookEvents: webhookEvents.length, dlqItems: dlqItems.length, auditLogs: auditLogs.length };
      const removeAutomations = body.removeAutomations === true;
      contacts = [];
      conversations = [];
      messages = [];
      forms = [];
      formSubmissions = [];
      products = [];
      webhookEvents = [];
      dlqItems = [];
      auditLogs = [];
      if (removeAutomations) automations = [];
      analytics = { ...structuredClone(INITIAL_ANALYTICS), totalAutomations: automations.length, activeAutomations: automations.filter((automation) => automation.status === 'active').length, totalInboundMessages: 0, totalCommentsReceived: 0, privateRepliesSent: 0, publicRepliesSent: 0, leadsCaptured: 0, webhookDeliveryRate: 100, policyBlockRate: 0, conversionRate: 0, dailyStats: [] };
      instagramAccount.lastWebhookAt = undefined;
      instagramAccount.profilePicUrl = undefined;
      workspace.updatedAt = new Date().toISOString();
      processedFingerprints.clear();
      await persistWorkerState(env);
      return jsonResponse({ ok: true, before, after: { automations: automations.length, contacts: 0, conversations: 0, messages: 0, forms: 0, formSubmissions: 0, products: 0, webhookEvents: 0, dlqItems: 0, auditLogs: 0 } }, 200, env.APP_ORIGIN);
    }

    if (pathname === '/api/v1/ai/settings' && method === 'GET') {
      const settings = await getAiSettings(env, workspace.id);
      return jsonResponse({ settings: settings ? { ...settings, enabled: settings.enabled === 1 } : null }, 200, env.APP_ORIGIN);
    }

    if (pathname === '/api/v1/ai/settings' && method === 'PATCH') {
      if (!env.DB) return jsonResponse({ error: 'D1 database is not configured' }, 503, env.APP_ORIGIN);
      const body: any = await request.json().catch(() => ({}));
      const current = await getAiSettings(env, workspace.id);
      const now = new Date().toISOString();
      const enabled = typeof body.enabled === 'boolean' ? (body.enabled ? 1 : 0) : Number(current?.enabled || 0);
      const model = typeof body.model === 'string' && /^[a-zA-Z0-9._-]{3,80}$/.test(body.model.trim()) ? body.model.trim() : current?.model || 'gemini-3.6-flash';
      const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt.trim().slice(0, 8000) : current?.system_prompt || '';
      const temperature = Math.min(1, Math.max(0, Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : Number(current?.temperature || 0.2)));
      const maxOutputTokens = Math.min(1024, Math.max(64, Number.isFinite(Number(body.maxOutputTokens)) ? Number(body.maxOutputTokens) : Number(current?.max_output_tokens || 512)));
      const dailyLimit = Math.min(1000, Math.max(1, Number.isFinite(Number(body.dailyRequestLimit)) ? Number(body.dailyRequestLimit) : Number(current?.daily_request_limit || 100)));
      await env.DB.prepare(
        'INSERT INTO ai_settings (workspace_id, enabled, model, system_prompt, temperature, max_output_tokens, daily_request_limit, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8) ON CONFLICT(workspace_id) DO UPDATE SET enabled = excluded.enabled, model = excluded.model, system_prompt = excluded.system_prompt, temperature = excluded.temperature, max_output_tokens = excluded.max_output_tokens, daily_request_limit = excluded.daily_request_limit, updated_at = excluded.updated_at',
      ).bind(workspace.id, enabled, model, systemPrompt, temperature, maxOutputTokens, dailyLimit, now).run();
      const settings = await getAiSettings(env, workspace.id);
      return jsonResponse({ settings: settings ? { ...settings, enabled: settings.enabled === 1 } : null }, 200, env.APP_ORIGIN);
    }

    if (pathname === '/api/v1/ai/knowledge' && method === 'GET') {
      if (!env.DB) return jsonResponse({ items: [] }, 200, env.APP_ORIGIN);
      const items = await env.DB.prepare('SELECT id, workspace_id AS workspaceId, title, content, status, created_at AS createdAt, updated_at AS updatedAt FROM knowledge_items WHERE workspace_id = ?1 AND status = \'active\' ORDER BY updated_at DESC').bind(workspace.id).all();
      return jsonResponse({ items: items.results || [] }, 200, env.APP_ORIGIN);
    }

    if (pathname === '/api/v1/ai/knowledge' && method === 'POST') {
      if (!env.DB) return jsonResponse({ error: 'D1 database is not configured' }, 503, env.APP_ORIGIN);
      const body: any = await request.json().catch(() => ({}));
      const title = typeof body.title === 'string' ? body.title.trim().slice(0, 160) : '';
      const content = typeof body.content === 'string' ? body.content.trim().slice(0, 12000) : '';
      if (!title || !content) return jsonResponse({ error: 'Title and content are required' }, 400, env.APP_ORIGIN);
      const now = new Date().toISOString();
      const id = `know_${crypto.randomUUID()}`;
      await env.DB.prepare('INSERT INTO knowledge_items (id, workspace_id, title, content, status, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, \'active\', ?5, ?5)').bind(id, workspace.id, title, content, now).run();
      return jsonResponse({ item: { id, workspaceId: workspace.id, title, content, status: 'active', createdAt: now, updatedAt: now } }, 201, env.APP_ORIGIN);
    }

    if (pathname.startsWith('/api/v1/ai/knowledge/') && method === 'DELETE') {
      if (!env.DB) return jsonResponse({ error: 'D1 database is not configured' }, 503, env.APP_ORIGIN);
      const id = pathname.split('/')[5];
      await env.DB.prepare('UPDATE knowledge_items SET status = \'archived\', updated_at = ?1 WHERE id = ?2 AND workspace_id = ?3').bind(new Date().toISOString(), id, workspace.id).run();
      return jsonResponse({ ok: true }, 200, env.APP_ORIGIN);
    }

    if (pathname === '/api/v1/ai/test' && method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      if (!text) return jsonResponse({ error: 'Text is required' }, 400, env.APP_ORIGIN);
      const settings = await getAiSettings(env, workspace.id);
      if (!settings?.enabled) return jsonResponse({ error: 'Gemini assistant is disabled for this workspace' }, 409, env.APP_ORIGIN);
      const result = await askGemini(env, workspace.id, text, body.channel === 'comment' ? 'comment' : 'dm');
      if (!result) return jsonResponse({ error: 'Gemini did not return an answer' }, 502, env.APP_ORIGIN);
      return jsonResponse({ answer: result.text, model: result.model }, 200, env.APP_ORIGIN);
    }

    // ==========================================
    // 3. Application REST API Endpoints (/api/v1/*)
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
      const accessToken = await getInstagramAccessToken(env);
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

    if (pathname === '/api/v1/forms' && method === 'POST') {
      const body: any = await request.json().catch(() => ({}));
      const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'فرم جدید دایرکت';
      const fields = Array.isArray(body.fields) && body.fields.length > 0
        ? body.fields.map((field: any, index: number) => ({
            id: `field_${crypto.randomUUID()}`,
            fieldKey: String(field.fieldKey || `field_${index + 1}`),
            label: String(field.label || `سؤال ${index + 1}`),
            fieldType: ['text', 'phone', 'email', 'choice'].includes(field.fieldType) ? field.fieldType : 'text',
            prompt: String(field.prompt || field.label || `پاسخ سؤال ${index + 1}`),
            required: field.required !== false,
            sortOrder: index + 1,
            ...(Array.isArray(field.choices) ? { choices: field.choices.map(String) } : {}),
          }))
        : [{
            id: `field_${crypto.randomUUID()}`,
            fieldKey: 'full_name',
            label: 'نام و نام خانوادگی',
            fieldType: 'text' as const,
            prompt: 'لطفاً نام و نام خانوادگی‌تان را وارد کنید.',
            required: true,
            sortOrder: 1,
          }];
      const createdAt = new Date().toISOString();
      const form: Form = {
        id: `form_${crypto.randomUUID()}`,
        workspaceId: workspace.id,
        name,
        description: typeof body.description === 'string' ? body.description : 'فرم کوتاه برای دریافت اطلاعات اولیه مخاطب',
        status: 'draft',
        fields,
        completionAction: 'send_text',
        submissionCount: 0,
        createdAt,
      };
      forms.unshift(form);
      auditLogs.unshift({
        id: `aud_${crypto.randomUUID()}`,
        workspaceId: workspace.id,
        actorName: 'میلاد فراستی',
        action: 'CREATE_FORM',
        resourceType: 'form',
        resourceId: form.id,
        metadata: { name: form.name },
        createdAt,
      });
      await persistWorkerState(env);
      return jsonResponse({ form }, 201);
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
