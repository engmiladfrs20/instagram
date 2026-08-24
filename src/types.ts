export type MetaAuthMode = 'instagram_login' | 'facebook_login';

export type Role = 'owner' | 'admin' | 'builder' | 'agent' | 'viewer' | 'billing';

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  locale: string;
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  userName: string;
  userEmail: string;
  role: Role;
  status: 'active' | 'invited';
  createdAt: string;
}

export interface InstagramAccount {
  id: string;
  workspaceId: string;
  metaIgUserId: string;
  username: string;
  displayName: string;
  profilePicUrl?: string;
  accountType: 'BUSINESS' | 'CREATOR';
  authMode: MetaAuthMode;
  graphHost: 'graph.instagram.com' | 'graph.facebook.com';
  graphVersion: string;
  grantedScopes: string[];
  status: 'connected' | 'reauth_required' | 'disconnected';
  webhookStatus: 'active' | 'pending' | 'failed';
  tokenExpiresAt: string;
  lastWebhookAt: string;
  lastTokenCheckAt: string;
  createdAt: string;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'UNKNOWN';
  mediaProductType?: 'FEED' | 'REELS' | 'STORY' | 'UNKNOWN';
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp?: string;
}

export interface Contact {
  id: string;
  workspaceId: string;
  instagramAccountId: string;
  igScopedUserId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
  customFields: Record<string, string>;
  tags: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  optedOutAt?: string;
  leadStatus: 'new' | 'contacted' | 'qualified' | 'customer' | 'lost';
  leadScore: number;
}

export interface Conversation {
  id: string;
  workspaceId: string;
  instagramAccountId: string;
  contactId: string;
  contact: Contact;
  status: 'open' | 'closed' | 'archived';
  mode: 'automation' | 'human' | 'paused';
  assignedUserId?: string;
  assignedUserName?: string;
  standardWindowOpenUntil: string; // ISO String for 24h window
  lastInboundAt: string;
  lastOutboundAt: string;
  lastMessageAt: string;
  unreadCount: number;
  lastMessagePreview?: string;
  createdAt: string;
}

export interface MessageContent {
  text?: string;
  quickReplies?: Array<{ title: string; payload: string }>;
  buttons?: Array<{ title: string; url?: string; payload?: string }>;
  /** Internal delivery key used to prevent duplicate Meta sends. */
  deliveryKey?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  carouselItems?: Array<{ title: string; subtitle: string; imageUrl: string; price?: string; buttonText?: string; buttonUrl?: string }>;
  commentText?: string;
  mediaId?: string;
  isPrivateReply?: boolean;
}

export interface Message {
  id: string;
  workspaceId: string;
  instagramAccountId: string;
  conversationId: string;
  externalMessageId?: string;
  direction: 'inbound' | 'outbound';
  messageType: 'text' | 'quick_reply' | 'postback' | 'comment' | 'private_reply' | 'public_comment_reply' | 'story_mention' | 'product_carousel';
  textBody?: string;
  content: MessageContent;
  status: 'received' | 'queued' | 'sent' | 'delivered' | 'failed' | 'policy_blocked';
  policyBasis?: string;
  correlationId: string;
  sentAt?: string;
  receivedAt?: string;
  createdAt: string;
}

export type TriggerType =
  | 'DM_RECEIVED'
  | 'DM_KEYWORD'
  | 'COMMENT_CREATED'
  | 'COMMENT_KEYWORD'
  | 'POST_OR_REEL_COMMENT'
  | 'QUICK_REPLY_SELECTED'
  | 'STORY_REPLY'
  | 'STORY_MENTION';

export type NodeType =
  | 'TRIGGER'
  | 'CONDITION'
  | 'SEND_TEXT'
  | 'SEND_QUICK_REPLIES'
  | 'SEND_PRIVATE_REPLY'
  | 'REPLY_PUBLIC_COMMENT'
  | 'ASK_FORM_FIELD'
  | 'SEND_PRODUCT_CAROUSEL'
  | 'ADD_TAG'
  | 'SET_CONTACT_FIELD'
  | 'HANDOFF_TO_HUMAN'
  | 'WAIT'
  | 'STOP';

export interface FlowNode {
  id: string;
  type: NodeType;
  title: string;
  config: {
    triggerType?: TriggerType;
    keywords?: string[];
    matchMode?: 'exact' | 'contains' | 'starts_with' | 'regex';
    mediaId?: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video' | 'audio';
    text?: string;
    quickReplies?: Array<{ title: string; payload: string }>;
    buttons?: Array<{ title: string; url?: string; payload?: string }>;
    publicReplyText?: string;
    formFieldKey?: string;
    formFieldPrompt?: string;
    formFieldType?: 'text' | 'phone' | 'email' | 'choice';
    formChoices?: string[];
    productId?: string;
    productIds?: string[];
    tagToAdd?: string;
    fieldToSet?: { key: string; value: string };
    waitDurationSeconds?: number;
    conditionOperator?: 'equals' | 'contains' | 'contains_any' | 'is_window_open' | 'has_tag';
    conditionValue?: string | string[];
    conditionField?: string;
    /** DirectSaz-style scenario options kept on the trigger/action nodes. */
    postScope?: 'all' | 'selected' | 'live';
    postIds?: string[];
    commentReplyDestination?: 'dm' | 'comment' | 'both';
    requireFollow?: boolean;
    responseVariants?: string[];
    publicResponseVariants?: string[];
    storyReplyOnly?: boolean;
    linkMessage?: boolean;
    repeatPolicy?: 'keep_all' | 'limit' | 'replace';
    repeatLimit?: number;
    followUpAutomationId?: string;
    followUpCondition?: 'always' | 'no_reply';
    delayMinutes?: number;
    followGateMode?: 'claim' | 'verified';
    followGatePayload?: string;
    /** How outgoing edges from this node should be evaluated. */
    branchMode?: 'all' | 'first_match';
  };
  position: { x: number; y: number };
}

export interface FlowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string; // e.g., 'Yes', 'No', or Quick Reply title
  conditionValue?: string;
}

export interface AutomationVersion {
  id: string;
  automationId: string;
  versionNo: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
  checksum: string;
  validationResult: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
  publishedAt?: string;
  createdAt: string;
}

export interface Automation {
  id: string;
  workspaceId: string;
  instagramAccountId: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  priority: number;
  triggerType: TriggerType;
  keywords: string[];
  mediaId?: string;
  publishedVersionId?: string;
  currentVersion: AutomationVersion;
  /** Published immutable snapshot used by the runtime. */
  publishedVersion?: AutomationVersion;
  runCount: number;
  lastTriggeredAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  workspaceId?: string;
  instagramAccountId?: string;
  eventType: string;
  externalEventId?: string;
  fingerprint: string;
  signatureValid: boolean;
  payload: any;
  status: 'received' | 'deduped' | 'processed' | 'failed';
  receivedAt: string;
  processedAt?: string;
  errorCode?: string;
}

export interface OutboundJob {
  id: string;
  workspaceId: string;
  instagramAccountId: string;
  conversationId?: string;
  actionRunKey: string;
  actionType: string;
  payload: any;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'policy_blocked' | 'in_dlq';
  attemptCount: number;
  availableAt: string;
  lastHttpStatus?: number;
  lastErrorCode?: string;
  policyBasis?: string;
  createdAt: string;
  completedAt?: string;
}

export interface FormField {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: 'text' | 'phone' | 'email' | 'choice';
  prompt: string;
  required: boolean;
  sortOrder: number;
  choices?: string[];
}

export interface Form {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: 'active' | 'draft';
  fields: FormField[];
  completionAction: 'add_tag' | 'handoff' | 'send_text';
  tagOnComplete?: string;
  submissionCount: number;
  createdAt: string;
}

export interface FormSubmission {
  id: string;
  workspaceId: string;
  formId: string;
  formName: string;
  contactId: string;
  contactName: string;
  contactUsername: string;
  answers: Record<string, string>; // fieldKey -> value
  status: 'in_progress' | 'completed';
  completedAt?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  priceMinor: number; // in Tomans or Rials
  currency: 'IRT' | 'IRR';
  sku: string;
  imageUrl: string;
  productUrl: string;
  status: 'active' | 'out_of_stock';
  createdAt: string;
}

export interface AnalyticsOverview {
  totalAutomations: number;
  activeAutomations: number;
  totalInboundMessages: number;
  totalCommentsReceived: number;
  privateRepliesSent: number;
  publicRepliesSent: number;
  leadsCaptured: number;
  webhookDeliveryRate: number; // percentage
  policyBlockRate: number; // percentage
  conversionRate: number; // percentage
  dailyStats: Array<{
    date: string;
    inbound: number;
    privateReplies: number;
    publicReplies: number;
    leads: number;
  }>;
}

export interface AuditLog {
  id: string;
  workspaceId: string;
  actorName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface DLQItem {
  id: string;
  jobId: string;
  actionType: string;
  recipientId: string;
  errorReason: string;
  errorClass: 'transient' | 'throttling' | 'auth' | 'policy' | 'validation';
  payloadSummary: string;
  attemptCount: number;
  lastAttemptAt: string;
  canReplay: boolean;
}
