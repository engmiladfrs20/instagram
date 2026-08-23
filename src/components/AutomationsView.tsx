import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileText,
  Filter,
  Image as ImageIcon,
  Link2,
  MessageCircle,
  MessageSquareText,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Trash2,
  UsersRound,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import { Automation, FlowEdge, FlowNode, FormField, InstagramMedia, TriggerType } from '../types';
import { ResponsivePreview } from './ResponsivePreview';
import { VisualScenarioBuilder } from './VisualScenarioBuilder';

type StudioKind = 'dm' | 'comment' | 'form' | 'followup';
type MatchMode = 'exact' | 'contains' | 'starts_with' | 'regex';
type CommentDestination = 'dm' | 'comment' | 'both';
type RepeatPolicy = 'keep_all' | 'limit' | 'replace';
type EditorMode = 'simple' | 'visual';

export type ResponseMediaDraft = {
  type: 'image' | 'video' | 'audio';
  url: string;
};

export type ResponseButtonDraft = {
  title: string;
  url?: string;
  payload?: string;
};

interface FormQuestionDraft {
  id: string;
  label: string;
  prompt: string;
  fieldType: FormField['fieldType'];
  required: boolean;
}

interface StudioDraft {
  name: string;
  description: string;
  keywords: string[];
  matchMode: MatchMode;
  message: string;
  variants: string[];
  publicVariants: string[];
  responseMedia: ResponseMediaDraft[];
  responseButtons: ResponseButtonDraft[];
  postScope: 'all' | 'selected' | 'live';
  postIds: string[];
  destination: CommentDestination;
  requireFollow: boolean;
  followGateEnabled: boolean;
  followGatePayload: string;
  followGateMessage: string;
  followGateButtonTitle: string;
  followGateSuccessMessage: string;
  linkMessage: boolean;
  storyReplyOnly: boolean;
  repeatPolicy: RepeatPolicy;
  repeatLimit: number;
  formTitle: string;
  formExitLabel: string;
  formCompletionMessage: string;
  questions: FormQuestionDraft[];
  followUpAutomationId: string;
  followUpCondition: 'always' | 'no_reply';
  delayMinutes: number;
  followUpMessage: string;
}

interface AutomationsViewProps {
  automations: Automation[];
  onSaveAutomation: (auto: Automation) => Promise<Automation | void>;
  onPublishAutomation: (autoId: string) => Promise<void>;
  onCreateAutomation: () => Promise<Automation>;
  onDeleteAutomation: (autoId: string) => Promise<void>;
}

const kindLabels: Record<StudioKind, string> = {
  dm: 'پاسخ دایرکت',
  comment: 'پاسخ کامنت',
  form: 'فرم دایرکت',
  followup: 'پیگیری خودکار',
};

const kindDescriptions: Record<StudioKind, string> = {
  dm: 'وقتی پیام مشخصی دریافت شد، پاسخ متنی یا چندرسانه‌ای ارسال کن.',
  comment: 'پست را انتخاب کن و پاسخ عمومی، دایرکت یا هر دو را بساز.',
  form: 'اطلاعات مخاطب را مرحله‌به‌مرحله و بدون سردرگمی دریافت کن.',
  followup: 'اگر گفتگو بی‌پاسخ ماند، با فاصلهٔ زمانی مناسب پیگیری کن.',
};

const kindIcon: Record<StudioKind, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  dm: Send,
  comment: MessageSquareText,
  form: FileText,
  followup: Clock3,
};

const makeQuestion = (index: number): FormQuestionDraft => ({
  id: `question_${Date.now()}_${index}`,
  label: index === 0 ? 'نام و نام خانوادگی' : 'شماره تماس',
  prompt: index === 0 ? 'لطفاً نام و نام خانوادگی‌تان را وارد کنید.' : 'شماره تماس خود را وارد کنید.',
  fieldType: index === 0 ? 'text' : 'phone',
  required: true,
});

const defaultDraft = (kind: StudioKind): StudioDraft => ({
  name: kindLabels[kind],
  description: kindDescriptions[kind],
  keywords: kind === 'comment' ? ['قیمت', 'لینک'] : kind === 'followup' ? [] : ['سلام'],
  matchMode: 'contains',
  message: kind === 'comment' ? 'سلام! جزئیات کامل و لینک برای شما ارسال شد.' : 'سلام! پیام شما دریافت شد. چطور می‌توانیم راهنمایی‌تان کنیم؟',
  variants: kind === 'comment' ? ['سلام! جزئیات کامل و لینک برای شما ارسال شد.', 'مرسی از کامنتت! اطلاعات کامل در دایرکت برایت ارسال شد.'] : ['سلام! پیام شما دریافت شد. چطور می‌توانیم راهنمایی‌تان کنیم؟'],
  publicVariants: ['سلام! جزئیات در دایرکت برای شما ارسال شد.'],
  responseMedia: [],
  responseButtons: [],
  postScope: 'all',
  postIds: [],
  destination: 'both',
  requireFollow: false,
  followGateEnabled: false,
  followGatePayload: 'FOLLOW_CLAIMED',
  followGateMessage: 'برای دریافت این محتوا ابتدا پیج را فالو کنید و سپس روی دکمهٔ زیر بزنید.',
  followGateButtonTitle: 'فالو کردم',
  followGateSuccessMessage: 'ممنون که پیج را فالو کردید! حالا ادامهٔ راهنما برای شما ارسال می‌شود.',
  linkMessage: false,
  storyReplyOnly: false,
  repeatPolicy: 'keep_all',
  repeatLimit: 3,
  formTitle: 'ثبت سفارش سریع',
  formExitLabel: 'انصراف',
  formCompletionMessage: 'اطلاعات شما با موفقیت ثبت شد؛ همکاران ما به‌زودی با شما تماس می‌گیرند.',
  questions: [makeQuestion(0), makeQuestion(1)],
  followUpAutomationId: '',
  followUpCondition: 'no_reply',
  delayMinutes: 60,
  followUpMessage: 'سلام! اگر هنوز به راهنمایی نیاز دارید، من در خدمتم.',
});

const inferKind = (automation: Automation): StudioKind => {
  const nodes = automation.currentVersion?.nodes || [];
  // `followUpCondition` is also stored on the trigger for regular DM/comment
  // scenarios. Only an actual WAIT node represents a follow-up automation.
  if (nodes.some((node) => node.type === 'WAIT')) return 'followup';
  if (nodes.some((node) => node.type === 'ASK_FORM_FIELD')) return 'form';
  if (automation.triggerType.includes('COMMENT') || nodes.some((node) => node.type === 'REPLY_PUBLIC_COMMENT')) return 'comment';
  return 'dm';
};

const draftFromAutomation = (automation: Automation): StudioDraft => {
  const kind = inferKind(automation);
  const draft = defaultDraft(kind);
  const nodes = automation.currentVersion?.nodes || [];
  const trigger = nodes.find((node) => node.type === 'TRIGGER');
  const followContentNode = nodes.find((node) => node.id === 'node_follow_content');
  const privateNode = followContentNode || nodes.find((node) => (
    (node.type === 'SEND_PRIVATE_REPLY' || node.type === 'SEND_TEXT' || node.type === 'SEND_QUICK_REPLIES')
    && node.config.followGateMode !== 'claim'
  ));
  const publicNode = nodes.find((node) => node.type === 'REPLY_PUBLIC_COMMENT');
  const questionNodes = nodes.filter((node) => node.type === 'ASK_FORM_FIELD');
  const destination = publicNode && privateNode ? 'both' : publicNode ? 'comment' : 'dm';
  const publicVariants = publicNode?.config.publicResponseVariants?.filter(Boolean) || [];
  const responseMedia = privateNode?.config.mediaUrl && privateNode.config.mediaType
    ? [{ type: privateNode.config.mediaType, url: privateNode.config.mediaUrl }]
    : draft.responseMedia;
  const responseButtons = privateNode?.config.buttons || draft.responseButtons;
  const followGateNode = nodes.find((node) => node.config.followGateMode === 'claim');
  const followSuccessNode = nodes.find((node) => node.id === 'node_follow_success');
  const responseNode = privateNode || followSuccessNode;
  const effectiveResponseMedia = responseNode?.config.mediaUrl && responseNode.config.mediaType
    ? [{ type: responseNode.config.mediaType, url: responseNode.config.mediaUrl }]
    : responseMedia;
  const effectiveResponseButtons = responseNode?.config.buttons || responseButtons;
  const effectivePrivateVariants = responseNode?.config.responseVariants?.filter(Boolean) || [];

  return {
    ...draft,
    name: automation.name,
    description: automation.description || draft.description,
    keywords: trigger?.config.keywords?.length ? trigger.config.keywords : automation.keywords,
    matchMode: trigger?.config.matchMode || draft.matchMode,
    message: effectivePrivateVariants[0] || responseNode?.config.text || publicNode?.config.publicReplyText || draft.message,
    variants: effectivePrivateVariants.length ? effectivePrivateVariants : [responseNode?.config.text || draft.message],
    publicVariants: publicVariants.length ? publicVariants : [publicNode?.config.publicReplyText || draft.publicVariants[0]],
    responseMedia: effectiveResponseMedia,
    responseButtons: effectiveResponseButtons,
    postScope: trigger?.config.postScope || draft.postScope,
    postIds: trigger?.config.postIds || draft.postIds,
    destination,
    requireFollow: Boolean(trigger?.config.requireFollow),
    followGateEnabled: trigger?.config.followGateMode === 'claim' || Boolean(followGateNode),
    followGatePayload: trigger?.config.followGatePayload || followGateNode?.config.followGatePayload || draft.followGatePayload,
    followGateMessage: followGateNode?.config.text || draft.followGateMessage,
    followGateButtonTitle: followGateNode?.config.buttons?.[0]?.title || draft.followGateButtonTitle,
    followGateSuccessMessage: followSuccessNode?.config.text || draft.followGateSuccessMessage,
    linkMessage: Boolean(trigger?.config.linkMessage),
    storyReplyOnly: Boolean(trigger?.config.storyReplyOnly),
    repeatPolicy: trigger?.config.repeatPolicy || draft.repeatPolicy,
    repeatLimit: trigger?.config.repeatLimit || draft.repeatLimit,
    questions: questionNodes.length
      ? questionNodes.map((node, index) => ({
          id: node.id,
          label: node.config.formFieldKey || `سؤال ${index + 1}`,
          prompt: node.config.formFieldPrompt || '',
          fieldType: node.config.formFieldType || 'text',
          required: true,
        }))
      : draft.questions,
    followUpAutomationId: trigger?.config.followUpAutomationId || '',
    followUpCondition: trigger?.config.followUpCondition || draft.followUpCondition,
    delayMinutes: nodes.find((node) => node.type === 'WAIT')?.config.delayMinutes || draft.delayMinutes,
    followUpMessage: privateNode?.config.text || draft.followUpMessage,
    formTitle: privateNode?.config.text || draft.formTitle,
  };
};

const makeNode = (id: string, type: FlowNode['type'], title: string, config: FlowNode['config'], position: number): FlowNode => ({
  id,
  type,
  title,
  config,
  position: { x: 80 + position * 250, y: 120 },
});

const buildNodes = (kind: StudioKind, draft: StudioDraft, followGatePayload = draft.followGatePayload || 'FOLLOW_CLAIMED'): { nodes: FlowNode[]; edges: FlowEdge[]; triggerType: TriggerType } => {
  const triggerType: TriggerType = kind === 'comment'
    ? 'COMMENT_KEYWORD'
    : kind === 'form' || kind === 'dm'
      ? (draft.storyReplyOnly ? 'STORY_REPLY' : 'DM_KEYWORD')
      : 'DM_RECEIVED';
  const trigger = makeNode('node_trigger', 'TRIGGER', 'شروع سناریو', {
    triggerType,
    keywords: draft.keywords,
    matchMode: draft.matchMode,
    postScope: draft.postScope,
    postIds: draft.postIds,
    requireFollow: draft.requireFollow,
    linkMessage: draft.linkMessage,
    storyReplyOnly: draft.storyReplyOnly,
    repeatPolicy: draft.repeatPolicy,
    repeatLimit: draft.repeatLimit,
    followUpAutomationId: draft.followUpAutomationId,
    followUpCondition: draft.followUpCondition,
    followGateMode: draft.followGateEnabled && (kind === 'dm' || (kind === 'comment' && draft.destination !== 'comment')) ? 'claim' : undefined,
    followGatePayload: draft.followGateEnabled && (kind === 'dm' || (kind === 'comment' && draft.destination !== 'comment')) ? followGatePayload : undefined,
  }, 0);
  const nodes: FlowNode[] = [trigger];
  const edges: FlowEdge[] = [];
  const connect = (node: FlowNode, label?: string) => {
    nodes.push(node);
    edges.push({ id: `edge_${nodes.length}`, sourceNodeId: nodes[nodes.length - 2].id, targetNodeId: node.id, label });
  };

  if (kind === 'comment' && (draft.destination === 'comment' || draft.destination === 'both')) {
    connect(makeNode('node_public_reply', 'REPLY_PUBLIC_COMMENT', 'پاسخ عمومی زیر کامنت', {
      publicReplyText: draft.publicVariants[0] || '',
      publicResponseVariants: draft.publicVariants,
      commentReplyDestination: draft.destination,
    }, 1), 'پاسخ عمومی');
  }

  if (kind === 'form') {
    draft.questions.forEach((question, index) => connect(makeNode(`node_question_${index}`, 'ASK_FORM_FIELD', question.label, {
      formFieldKey: question.label,
      formFieldPrompt: question.prompt,
      formFieldType: question.fieldType,
    }, index + 1), `سؤال ${index + 1}`));
    connect(makeNode('node_form_complete', 'SEND_TEXT', 'پیام تکمیل فرم', { text: draft.formCompletionMessage }, draft.questions.length + 1), 'تکمیل');
  } else if (kind === 'followup') {
    connect(makeNode('node_followup_wait', 'WAIT', 'انتظار برای پیگیری', {
      delayMinutes: draft.delayMinutes,
      followUpCondition: draft.followUpCondition,
      followUpAutomationId: draft.followUpAutomationId,
    }, 1));
    connect(makeNode('node_followup_message', 'SEND_PRIVATE_REPLY', 'ارسال پیام پیگیری', {
      text: draft.followUpMessage,
      responseVariants: draft.variants,
      mediaUrl: draft.responseMedia[0]?.url,
      mediaType: draft.responseMedia[0]?.type,
      buttons: draft.responseButtons,
    }, 2));
  } else if (kind === 'comment' && (draft.destination === 'dm' || draft.destination === 'both')) {
    const needsFollowGate = draft.followGateEnabled;
    if (needsFollowGate) {
      const followGateNode = makeNode('node_follow_gate', 'SEND_PRIVATE_REPLY', 'درخواست فالو', {
        followGateMode: 'claim',
        followGatePayload,
        text: draft.followGateMessage,
        buttons: [{ title: draft.followGateButtonTitle || 'فالو کردم', payload: followGatePayload }],
      }, nodes.length);
      connect(followGateNode, 'درخواست فالو');
      const successNode = makeNode('node_follow_success', 'SEND_PRIVATE_REPLY', 'پاسخ بعد از تأیید فالو', {
        followGateMode: 'verified',
        text: draft.followGateSuccessMessage,
      }, nodes.length);
      nodes.push(successNode);
      edges.push({ id: 'edge_follow_success', sourceNodeId: followGateNode.id, targetNodeId: successNode.id, label: 'پس از فالو', conditionValue: 'FOLLOW_CLAIMED' });
      const contentNode = makeNode('node_follow_content', 'SEND_PRIVATE_REPLY', 'محتوای سناریو', {
        text: draft.message,
        responseVariants: draft.variants,
        quickReplies: [],
        mediaUrl: draft.responseMedia[0]?.url,
        mediaType: draft.responseMedia[0]?.type,
        buttons: draft.responseButtons,
      }, nodes.length);
      nodes.push(contentNode);
      edges.push({ id: 'edge_follow_content', sourceNodeId: successNode.id, targetNodeId: contentNode.id, label: 'ارسال محتوای سناریو' });
    } else {
      connect(makeNode('node_private_reply', 'SEND_PRIVATE_REPLY', 'پاسخ خصوصی در دایرکت', {
        text: draft.message,
        responseVariants: draft.variants,
        quickReplies: [],
        mediaUrl: draft.responseMedia[0]?.url,
        mediaType: draft.responseMedia[0]?.type,
        buttons: draft.responseButtons,
      }, nodes.length), 'دایرکت');
    }
  } else if (kind === 'dm') {
    if (draft.followGateEnabled) {
      const followGateNode = makeNode('node_follow_gate', 'SEND_PRIVATE_REPLY', 'درخواست فالو', {
        followGateMode: 'claim',
        followGatePayload,
        text: draft.followGateMessage,
        buttons: [{ title: draft.followGateButtonTitle || 'فالو کردم', payload: followGatePayload }],
      }, 1);
      connect(followGateNode, 'درخواست فالو');
      const successNode = makeNode('node_follow_success', 'SEND_PRIVATE_REPLY', 'پاسخ بعد از تأیید فالو', {
        followGateMode: 'verified',
        text: draft.followGateSuccessMessage,
        responseVariants: draft.variants,
        quickReplies: [],
        linkMessage: draft.linkMessage,
        mediaUrl: draft.responseMedia[0]?.url,
        mediaType: draft.responseMedia[0]?.type,
        buttons: draft.responseButtons,
      }, 2);
      nodes.push(successNode);
      edges.push({ id: 'edge_follow_success', sourceNodeId: followGateNode.id, targetNodeId: successNode.id, label: 'پس از فالو', conditionValue: 'FOLLOW_CLAIMED' });
      const contentNode = makeNode('node_follow_content', 'SEND_PRIVATE_REPLY', 'محتوای سناریو', {
        text: draft.message,
        responseVariants: draft.variants,
        quickReplies: [],
        linkMessage: draft.linkMessage,
        mediaUrl: draft.responseMedia[0]?.url,
        mediaType: draft.responseMedia[0]?.type,
        buttons: draft.responseButtons,
      }, 3);
      nodes.push(contentNode);
      edges.push({ id: 'edge_follow_content', sourceNodeId: successNode.id, targetNodeId: contentNode.id, label: 'ارسال محتوای سناریو' });
    } else {
      connect(makeNode('node_private_reply', 'SEND_PRIVATE_REPLY', 'ارسال پاسخ دایرکت', {
        text: draft.message,
        responseVariants: draft.variants,
        quickReplies: [],
        linkMessage: draft.linkMessage,
        mediaUrl: draft.responseMedia[0]?.url,
        mediaType: draft.responseMedia[0]?.type,
        buttons: draft.responseButtons,
      }, 1), 'پاسخ');
    }
  }
  return { nodes, edges, triggerType };
};

const updateAutomation = (automation: Automation, kind: StudioKind, draft: StudioDraft, graph?: { nodes: FlowNode[]; edges: FlowEdge[] }): Automation => {
  const followGatePayload = draft.followGatePayload === 'FOLLOW_CLAIMED'
    ? `FOLLOW_CLAIMED:${automation.id}`
    : draft.followGatePayload;
  const built = graph ? {
    nodes: graph.nodes,
    edges: graph.edges,
    triggerType: (graph.nodes.find((node) => node.type === 'TRIGGER')?.config.triggerType || automation.triggerType) as TriggerType,
  } : buildNodes(kind, { ...draft, followGatePayload }, followGatePayload);
  const graphTrigger = built.nodes.find((node) => node.type === 'TRIGGER');
  const now = new Date().toISOString();
  return {
    ...automation,
    name: draft.name.trim() || kindLabels[kind],
    description: draft.description.trim(),
    triggerType: built.triggerType,
    keywords: graphTrigger?.config.keywords || draft.keywords,
    updatedAt: now,
    currentVersion: {
      ...automation.currentVersion,
      nodes: built.nodes,
      edges: built.edges,
      validationResult: { valid: true, errors: [], warnings: [] },
      createdAt: now,
    },
  };
};

const getKindCount = (automations: Automation[], kind: StudioKind) => automations.filter((auto) => inferKind(auto) === kind).length;

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  automations,
  onSaveAutomation,
  onPublishAutomation,
  onCreateAutomation,
  onDeleteAutomation,
}) => {
  const [selectedAutoId, setSelectedAutoId] = useState(automations[0]?.id || '');
  const [isBuilding, setIsBuilding] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('simple');
  const [studioKind, setStudioKind] = useState<StudioKind>(automations[0] ? inferKind(automations[0]) : 'dm');
  const [draft, setDraft] = useState<StudioDraft>(() => automations[0] ? draftFromAutomation(automations[0]) : defaultDraft('dm'));
  const [visualNodes, setVisualNodes] = useState<FlowNode[]>(() => automations[0]?.currentVersion?.nodes || []);
  const [visualEdges, setVisualEdges] = useState<FlowEdge[]>(() => automations[0]?.currentVersion?.edges || []);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | StudioKind>('all');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [instagramMedia, setInstagramMedia] = useState<InstagramMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [mediaReloadKey, setMediaReloadKey] = useState(0);
  const [deletingAutoId, setDeletingAutoId] = useState('');

  const selectedAuto = automations.find((auto) => auto.id === selectedAutoId);

  useEffect(() => {
    if (studioKind !== 'comment' || draft.postScope !== 'selected') return;
    let cancelled = false;
    setMediaLoading(true);
    setMediaError('');
    fetch('/api/v1/instagram/media?limit=18', { credentials: 'include' })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { error?: string; media?: InstagramMedia[] };
        if (!response.ok) throw new Error(payload.error || `دریافت پست‌ها ناموفق بود (${response.status})`);
        return payload as { media?: InstagramMedia[] };
      })
      .then((payload) => {
        if (!cancelled) setInstagramMedia(payload.media || []);
      })
      .catch((mediaRequestError) => {
        if (!cancelled) setMediaError(mediaRequestError instanceof Error ? mediaRequestError.message : 'دریافت پست‌ها ناموفق بود.');
      })
      .finally(() => {
        if (!cancelled) setMediaLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studioKind, draft.postScope, mediaReloadKey]);
  const filteredAutomations = useMemo(() => automations.filter((auto) => {
    const matchesType = filter === 'all' || inferKind(auto) === filter;
    const haystack = `${auto.name} ${auto.description || ''} ${auto.keywords.join(' ')}`.toLocaleLowerCase('fa-IR');
    return matchesType && haystack.includes(search.trim().toLocaleLowerCase('fa-IR'));
  }), [automations, filter, search]);

  const startEditing = (automation: Automation, forcedKind?: StudioKind) => {
    const kind = forcedKind || inferKind(automation);
    const initialDraft = forcedKind && forcedKind !== inferKind(automation) ? defaultDraft(forcedKind) : draftFromAutomation(automation);
    const initialGraph = forcedKind && forcedKind !== inferKind(automation)
      ? buildNodes(forcedKind, initialDraft)
      : { nodes: automation.currentVersion?.nodes || [], edges: automation.currentVersion?.edges || [] };
    setSelectedAutoId(automation.id);
    setStudioKind(kind);
    setDraft(initialDraft);
    setVisualNodes(initialGraph.nodes);
    setVisualEdges(initialGraph.edges);
    setEditorMode('simple');
    setTestResult([]);
    setError('');
    setIsBuilding(true);
  };

  const createScenario = async (kind: StudioKind) => {
    setSaving(true);
    setError('');
    try {
      const automation = await onCreateAutomation();
      const newDraft = defaultDraft(kind);
      const saved = await onSaveAutomation(updateAutomation(automation, kind, newDraft));
      const current = saved || updateAutomation(automation, kind, newDraft);
      startEditing(current, kind);
    } catch (creationError) {
      setError(creationError instanceof Error ? creationError.message : 'ساخت سناریو ناموفق بود.');
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async () => {
    if (!selectedAuto) return false;
    if (!draft.name.trim()) {
      setError('برای سناریو یک نام کوتاه وارد کنید.');
      return false;
    }
    const triggerNode = visualNodes.find((node) => node.type === 'TRIGGER');
    const activeKeywords = editorMode === 'visual' ? triggerNode?.config.keywords || [] : draft.keywords;
    if (studioKind !== 'followup' && activeKeywords.length === 0) {
      setError('حداقل یک کلمهٔ فعال‌ساز اضافه کنید.');
      return false;
    }
    setSaving(true);
    setError('');
    try {
      const graph = editorMode === 'visual' && visualNodes.length > 0 ? { nodes: visualNodes, edges: visualEdges } : undefined;
      const saved = await onSaveAutomation(updateAutomation(selectedAuto, studioKind, draft, graph));
      if (saved) setSelectedAutoId(saved.id);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیرهٔ پیش‌نویس ناموفق بود.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    const saved = await saveDraft();
    if (saved && selectedAuto) await onPublishAutomation(selectedAuto.id);
  };

  const switchEditorMode = (nextMode: EditorMode) => {
    if (nextMode === editorMode) return;
    if (nextMode === 'visual') {
      const followGatePayload = draft.followGatePayload === 'FOLLOW_CLAIMED' && selectedAuto
        ? `FOLLOW_CLAIMED:${selectedAuto.id}`
        : draft.followGatePayload;
      const built = buildNodes(studioKind, { ...draft, followGatePayload }, followGatePayload);
      setVisualNodes(built.nodes);
      setVisualEdges(built.edges);
      setEditorMode('visual');
      return;
    }
    if (selectedAuto && visualNodes.length > 0) {
      const graphAutomation = updateAutomation(selectedAuto, studioKind, draft, { nodes: visualNodes, edges: visualEdges });
      setDraft(draftFromAutomation(graphAutomation));
    }
    setEditorMode('simple');
  };

  const deleteScenario = async (automation: Automation) => {
    if (!window.confirm(`سناریوی «${automation.name}» حذف شود؟ این عملیات قابل بازگشت نیست.`)) return;
    setDeletingAutoId(automation.id);
    setError('');
    try {
      await onDeleteAutomation(automation.id);
      if (selectedAutoId === automation.id) {
        setSelectedAutoId('');
        setIsBuilding(false);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'حذف سناریو ناموفق بود.');
    } finally {
      setDeletingAutoId('');
    }
  };

  const runTest = () => {
    setTesting(true);
    setTestResult([]);
    window.setTimeout(() => {
      const input = draft.keywords[0] || 'سلام';
      const output = studioKind === 'comment'
        ? draft.destination === 'comment'
          ? 'پاسخ عمومی زیر همان کامنت آمادهٔ ارسال است.'
          : draft.destination === 'dm'
            ? 'پاسخ خصوصی برای دایرکت کاربر آمادهٔ ارسال است.'
            : 'پاسخ عمومی و پیام خصوصی هر دو آمادهٔ ارسال هستند.'
        : studioKind === 'form'
          ? `${draft.questions.length} سؤال به ترتیب نمایش داده می‌شود.`
          : studioKind === 'followup'
            ? `پیگیری پس از ${draft.delayMinutes} دقیقه در حالت شبیه‌سازی قرار گرفت.`
            : 'پاسخ دایرکت از بین متن‌های متنوع انتخاب می‌شود.';
      setTestResult([`ورودی تست: «${input}»`, `تطابق شرط: موفق · ${draft.matchMode}`, output, 'هیچ پیام واقعی به اینستاگرام ارسال نشد.']);
      setTesting(false);
    }, 450);
  };

  const updateDraft = <K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) => setDraft((previous) => ({ ...previous, [key]: value }));

  const addKeyword = (value: string) => {
    const keyword = value.trim();
    if (keyword && !draft.keywords.includes(keyword)) updateDraft('keywords', [...draft.keywords, keyword]);
  };

  const addVariant = (publicVariant = false) => {
    const key = publicVariant ? 'publicVariants' : 'variants';
    updateDraft(key, [...draft[key], publicVariant ? 'پاسخ عمومی جدید' : 'پاسخ متنوع جدید']);
  };

  const updateVariant = (index: number, value: string, publicVariant = false) => {
    const key = publicVariant ? 'publicVariants' : 'variants';
    const next = draft[key].map((item, itemIndex) => itemIndex === index ? value : item);
    setDraft((previous) => ({
      ...previous,
      [key]: next,
      ...(publicVariant ? {} : { message: next[0] || '' }),
    }));
  };

  const removeVariant = (index: number, publicVariant = false) => {
    const key = publicVariant ? 'publicVariants' : 'variants';
    const next = draft[key].filter((_, itemIndex) => itemIndex !== index);
    updateDraft(key, next.length ? next : [publicVariant ? 'پاسخ عمومی جدید' : 'پاسخ متنوع جدید']);
  };

  return (
    <div className="direct-studio" dir="rtl">
      {!isBuilding ? (
        <>
          <header className="workspace-page-header direct-studio-hero">
            <div>
              <div className="workspace-page-kicker"><WandSparkles size={16} /> استودیو پاسخ‌گویی</div>
              <h2>سناریوهای ساده، پاسخ‌های حرفه‌ای</h2>
              <p>همان تجربهٔ مرحله‌ای DirectSaz را با پیش‌نمایش زنده، پاسخ‌های متنوع و کنترل کامل روی مقصد پیام‌ها در اختیار داشته باشید.</p>
            </div>
            <div className="workspace-page-actions">
              <button type="button" className="btn btn-outline-secondary direct-secondary-btn" onClick={() => setFilter(filter === 'all' ? 'comment' : 'all')}><Filter size={16} /> {filter === 'all' ? 'فیلتر کامنت' : 'نمایش همه'}</button>
              <div className="direct-create-menu">
                <button type="button" className="btn btn-primary direct-primary-btn" onClick={() => createScenario('dm')} disabled={saving}><Plus size={17} /> ساخت سناریو <ChevronDown size={15} /></button>
                <div className="direct-create-hint">از اینجا نوع سناریو را انتخاب کنید</div>
              </div>
            </div>
          </header>

          <section className="direct-template-grid" aria-label="قالب‌های سریع">
            {(Object.keys(kindLabels) as StudioKind[]).map((kind) => {
              const Icon = kindIcon[kind];
              return <button type="button" key={kind} className="direct-template-card" onClick={() => createScenario(kind)} disabled={saving}>
                <span className="direct-template-icon"><Icon size={20} /></span>
                <span><strong>{kindLabels[kind]}</strong><small>{kindDescriptions[kind]}</small></span>
                <ArrowLeft size={16} />
              </button>;
            })}
          </section>

          <section className="surface-card direct-list-card">
            <div className="direct-list-toolbar">
              <div><span className="direct-eyebrow">کتابخانهٔ سناریو</span><h3>همهٔ پاسخ‌های خودکار</h3></div>
              <label className="direct-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجوی سناریو..." aria-label="جست‌وجوی سناریو" /></label>
            </div>
            <div className="direct-filter-tabs" role="tablist" aria-label="فیلتر سناریو">
              <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>همه <span>{automations.length}</span></button>
              {(Object.keys(kindLabels) as StudioKind[]).map((kind) => <button type="button" key={kind} className={filter === kind ? 'is-active' : ''} onClick={() => setFilter(kind)}>{kindLabels[kind]} <span>{getKindCount(automations, kind)}</span></button>)}
            </div>
            <div className="direct-scenario-list">
              {filteredAutomations.length === 0 ? <div className="empty-state-card"><Sparkles size={30} /><strong>هنوز سناریویی با این فیلتر پیدا نشد</strong><span>از قالب‌های بالای صفحه شروع کنید؛ هر تغییر تا قبل از انتشار قابل ویرایش است.</span></div> : filteredAutomations.map((automation) => {
                const kind = inferKind(automation);
                const Icon = kindIcon[kind];
                return <article className="direct-scenario-row" key={automation.id}>
                  <span className="direct-scenario-icon"><Icon size={19} /></span>
                  <div className="direct-scenario-copy"><div className="d-flex align-items-center gap-2 flex-wrap"><strong>{automation.name}</strong><span className={`status-chip ${automation.status === 'active' ? 'status-chip-success' : 'status-chip-muted'}`}><span className="direct-status-dot" />{automation.status === 'active' ? 'فعال' : 'پیش‌نویس'}</span></div><p>{automation.description || kindDescriptions[kind]}</p><div className="direct-scenario-meta"><span>{kindLabels[kind]}</span><span>{automation.keywords.slice(0, 3).join(' · ') || 'بدون کلمهٔ فعال‌ساز'}</span><span>{automation.runCount.toLocaleString('fa-IR')} اجرا</span></div></div>
                  <div className="direct-scenario-actions"><button type="button" className="btn btn-outline-secondary direct-edit-btn" onClick={() => startEditing(automation)}>ویرایش</button><button type="button" className="btn btn-primary direct-edit-btn" onClick={() => startEditing(automation)}><ArrowLeft size={15} /> جزئیات</button><button type="button" className="btn direct-delete-btn" onClick={() => deleteScenario(automation)} disabled={deletingAutoId === automation.id} aria-label={`حذف سناریوی ${automation.name}`}><Trash2 size={15} /> {deletingAutoId === automation.id ? 'در حال حذف...' : 'حذف'}</button></div>
                </article>;
              })}
            </div>
          </section>
        </>
      ) : (
        <>
          <div className="builder-toolbar direct-builder-toolbar">
            <div className="builder-toolbar-title"><button type="button" className="direct-back-btn" onClick={() => setIsBuilding(false)} aria-label="بازگشت به لیست"><ArrowLeft size={17} /></button><span className="direct-toolbar-icon"><Settings2 size={17} /></span><div><strong>{kindLabels[studioKind]}</strong><small>ساخت مرحله‌ای سناریو · پیش‌نمایش زنده</small></div></div>
            <div className="direct-toolbar-actions"><div className="direct-editor-mode" role="tablist" aria-label="روش ساخت سناریو"><button type="button" className={editorMode === 'simple' ? 'is-active' : ''} onClick={() => switchEditorMode('simple')} role="tab" aria-selected={editorMode === 'simple'}>فرم ساده</button><button type="button" className={editorMode === 'visual' ? 'is-active' : ''} onClick={() => switchEditorMode('visual')} role="tab" aria-selected={editorMode === 'visual'}>نموداری</button></div><span className="direct-save-state"><span className="direct-status-dot" /> پیش‌نویس ذخیره‌نشده</span><button type="button" className="btn btn-outline-secondary direct-secondary-btn" onClick={saveDraft} disabled={saving}><Check size={16} /> {saving ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس'}</button><button type="button" className="btn btn-primary direct-primary-btn" onClick={publish} disabled={saving}>انتشار سناریو <ArrowLeft size={15} /></button></div>
          </div>

          {editorMode === 'simple' && <div className="direct-stepper" aria-label="مراحل ساخت سناریو"><span className="is-active"><b>۱</b> فعال‌سازی</span><i /><span className="is-active"><b>۲</b> تنظیم پاسخ</span><i /><span><b>۳</b> تست و انتشار</span></div>}

          {error && <div className="alert alert-danger direct-alert" role="alert"><CircleHelp size={16} /> {error}</div>}

          {editorMode === 'visual' ? <VisualScenarioBuilder nodes={visualNodes} edges={visualEdges} onChange={(nodes, edges) => { setVisualNodes(nodes); setVisualEdges(edges); }} /> : <div className="direct-builder-shell">
            <aside className="direct-builder-preview">
              <ResponsivePreview
                variant={studioKind === 'comment' ? 'comment' : studioKind === 'form' ? 'form' : 'dm'}
                title={draft.name || kindLabels[studioKind]}
                message={studioKind === 'form' ? draft.formCompletionMessage : studioKind === 'followup' ? draft.followUpMessage : draft.followGateEnabled ? draft.followGateMessage : draft.variants[0] || draft.message}
                keyword={draft.keywords[0] || 'سلام'}
                formFields={draft.questions.map((question) => question.label)}
                media={draft.responseMedia}
                buttons={draft.followGateEnabled ? [{ title: draft.followGateButtonTitle, payload: draft.followGatePayload }, ...draft.responseButtons] : draft.responseButtons}
                onAddText={() => addVariant()}
                onAddMedia={(media) => updateDraft('responseMedia', [...draft.responseMedia.filter((item) => item.type !== media.type), media])}
                onAddButton={(button) => updateDraft('responseButtons', [...draft.responseButtons, button])}
                onRemoveMedia={(type) => updateDraft('responseMedia', draft.responseMedia.filter((item) => item.type !== type))}
                onRemoveButton={(index) => {
                  const responseIndex = draft.followGateEnabled ? index - 1 : index;
                  if (responseIndex >= 0) updateDraft('responseButtons', draft.responseButtons.filter((_, itemIndex) => itemIndex !== responseIndex));
                }}
              />
              <div className="direct-preview-tip"><Sparkles size={15} /><span>هر تغییر را ابتدا اینجا بررسی کنید؛ انتشار از سمت Meta جدا از پیش‌نمایش انجام می‌شود.</span></div>
            </aside>

            <div className="direct-builder-form">
              <section className="direct-panel">
                <div className="direct-panel-heading"><div><span>اطلاعات سناریو</span><h3>یک نام قابل فهم انتخاب کنید</h3></div><span className="direct-panel-number">۰۱</span></div>
                <div className="row g-3"><div className="col-12"><label className="direct-label" htmlFor="scenario-name">نام سناریو</label><input id="scenario-name" className="form-control direct-control" value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} /></div><div className="col-12"><label className="direct-label" htmlFor="scenario-description">توضیح کوتاه</label><textarea id="scenario-description" rows={2} className="form-control direct-control" value={draft.description} onChange={(event) => updateDraft('description', event.target.value)} /></div></div>
              </section>

              <section className="direct-panel">
                <div className="direct-panel-heading"><div><span>تنظیمات فعال‌سازی</span><h3>چه زمانی این سناریو اجرا شود؟</h3></div><span className="direct-panel-number">۰۲</span></div>
                {studioKind !== 'followup' && <><div className="direct-field-label-row"><label className="direct-label">کلمات یا عبارت‌های فعال‌ساز</label><small>با Enter یا ویرگول اضافه کنید</small></div><ChipEditor values={draft.keywords} onAdd={addKeyword} onRemove={(index) => updateDraft('keywords', draft.keywords.filter((_, itemIndex) => itemIndex !== index))} /><div className="row g-3 mt-1"><div className="col-12 col-md-6"><SelectField label="نوع تطبیق" value={draft.matchMode} onChange={(value) => updateDraft('matchMode', value as MatchMode)} options={[['contains', 'شامل عبارت'], ['exact', 'برابر با عبارت'], ['starts_with', 'شروع‌شده با عبارت'], ['regex', 'الگوی پیشرفته']]} /></div>{studioKind === 'dm' && <div className="col-12 col-md-6"><ToggleField label="فقط پاسخ به ریپلای استوری" checked={draft.storyReplyOnly} onChange={(value) => updateDraft('storyReplyOnly', value)} /></div>}</div></>}
                {studioKind === 'comment' && <CommentActivation draft={draft} updateDraft={updateDraft} media={instagramMedia} mediaLoading={mediaLoading} mediaError={mediaError} onReloadMedia={() => setMediaReloadKey((current) => current + 1)} />}
                {studioKind === 'form' && <div className="direct-option-grid"><ToggleField label="پیام فعال‌ساز لینک شود" checked={draft.linkMessage} onChange={(value) => updateDraft('linkMessage', value)} /><SelectField label="مدیریت پاسخ‌های تکراری" value={draft.repeatPolicy} onChange={(value) => updateDraft('repeatPolicy', value as RepeatPolicy)} options={[['keep_all', 'همه پاسخ‌ها حفظ شود'], ['limit', 'تعداد محدود حفظ شود'], ['replace', 'پاسخ جدید جایگزین شود']]} />{draft.repeatPolicy === 'limit' && <NumberField label="تعداد پاسخ قابل نگهداری" value={draft.repeatLimit} onChange={(value) => updateDraft('repeatLimit', value)} />}</div>}
                {studioKind === 'followup' && <FollowUpActivation draft={draft} automations={automations} updateDraft={updateDraft} />}
              </section>

              {studioKind !== 'form' && studioKind !== 'followup' && <section className="direct-panel"><PanelHeading label="تنظیمات پاسخ" title="پیام را ساده، انسانی و متنوع نگه دارید" number="۰۳" /><VariantEditor label="پاسخ‌های متنوع دایرکت" values={draft.variants} onAdd={() => addVariant()} onChange={(index, value) => updateVariant(index, value)} onRemove={(index) => removeVariant(index)} /><div className="direct-helper"><Sparkles size={16} /><span>برای هر اجرا یکی از متن‌ها به‌صورت چرخشی انتخاب می‌شود تا پاسخ‌ها تکراری و ماشینی به نظر نرسند.</span></div>{studioKind === 'dm' && <ToggleField label="لینک یا دکمهٔ مشاهدهٔ خدمات اضافه شود" checked={draft.linkMessage} onChange={(value) => updateDraft('linkMessage', value)} />}</section>}

              {((studioKind === 'dm') || (studioKind === 'comment' && (draft.destination === 'dm' || draft.destination === 'both'))) && <FollowGateEditor draft={draft} updateDraft={updateDraft} />}

              {studioKind === 'comment' && <section className="direct-panel"><PanelHeading label="پاسخ عمومی" title="پاسخ زیر همان پست" number="۰۴" /><VariantEditor label="پاسخ‌های متنوع زیر کامنت" values={draft.publicVariants} onAdd={() => addVariant(true)} onChange={(index, value) => updateVariant(index, value, true)} onRemove={(index) => removeVariant(index, true)} /></section>}

              {studioKind === 'form' && <FormQuestions draft={draft} updateDraft={updateDraft} />}
              {studioKind === 'followup' && <section className="direct-panel"><PanelHeading label="پیام پیگیری" title="متن پیگیری را بنویسید" number="۰۳" /><textarea className="form-control direct-control direct-textarea-lg" value={draft.followUpMessage} onChange={(event) => updateDraft('followUpMessage', event.target.value)} placeholder="پیام پیگیری شما..." /><div className="direct-helper mt-3"><Clock3 size={16} /><span>پیام پیگیری در محیط واقعی فقط با رعایت پنجرهٔ مجاز پیام‌رسانی و قوانین Meta ارسال می‌شود.</span></div></section>}

              <section className="direct-test-panel"><div><span className="direct-eyebrow">آزمایش امن</span><h3>قبل از انتشار، سناریو را شبیه‌سازی کنید</h3><p>این تست فقط در پنل اجرا می‌شود و هیچ پیام واقعی ارسال نمی‌کند.</p></div><button type="button" className="btn btn-warning direct-test-btn" onClick={runTest} disabled={testing}>{testing ? 'در حال تست...' : 'اجرای تست'}</button>{testResult.length > 0 && <div className="direct-test-result">{testResult.map((line) => <div key={line}><Check size={14} /> {line}</div>)}</div>}</section>
            </div>
          </div>}
        </>
      )}
    </div>
  );
};

interface SelectFieldProps { label: string; value: string; options: Array<[string, string]>; onChange: (value: string) => void; }
const SelectField: React.FC<SelectFieldProps> = ({ label, value, options, onChange }) => <label className="direct-select-wrap"><span className="direct-label">{label}</span><span className="direct-select-control"><select className="form-select direct-control" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select><ChevronDown size={15} /></span></label>;

interface NumberFieldProps { label: string; value: number; onChange: (value: number) => void; }
const NumberField: React.FC<NumberFieldProps> = ({ label, value, onChange }) => <label><span className="direct-label">{label}</span><input type="number" min={1} className="form-control direct-control" value={value} onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))} /></label>;

interface ToggleFieldProps { label: string; checked: boolean; onChange: (value: boolean) => void; }
const ToggleField: React.FC<ToggleFieldProps> = ({ label, checked, onChange }) => <label className={`direct-toggle ${checked ? 'is-on' : ''}`}><span><span className="direct-toggle-title">{label}</span><small>{checked ? 'روشن' : 'خاموش'}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>;

interface ChipEditorProps { values: string[]; onAdd: (value: string) => void; onRemove: (index: number) => void; }
const ChipEditor: React.FC<ChipEditorProps> = ({ values, onAdd, onRemove }) => { const [input, setInput] = useState(''); const commit = () => { onAdd(input); setInput(''); }; return <div className="direct-chip-editor">{values.map((value, index) => <span className="direct-chip" key={`${value}-${index}`}>{value}<button type="button" onClick={() => onRemove(index)} aria-label={`حذف ${value}`}><X size={12} /></button></span>)}<input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); commit(); } }} onBlur={commit} placeholder="مثلاً قیمت" /></div>; };

interface VariantEditorProps { label: string; values: string[]; onAdd: () => void; onChange: (index: number, value: string) => void; onRemove: (index: number) => void; }
const VariantEditor: React.FC<VariantEditorProps> = ({ label, values, onAdd, onChange, onRemove }) => <div className="direct-variant-editor"><div className="direct-field-label-row"><label className="direct-label">{label}</label><button type="button" className="direct-inline-btn" onClick={onAdd}><Plus size={14} /> پاسخ جدید</button></div>{values.map((value, index) => <div className="direct-variant-row" key={`variant-${index}`}><span>{index + 1}</span><textarea className="form-control direct-control" rows={2} value={value} onChange={(event) => onChange(index, event.target.value)} /><button type="button" onClick={() => onRemove(index)} aria-label="حذف پاسخ"><Trash2 size={15} /></button></div>)}</div>;

interface PanelHeadingProps { label: string; title: string; number: string; }
const PanelHeading: React.FC<PanelHeadingProps> = ({ label, title, number }) => <div className="direct-panel-heading"><div><span>{label}</span><h3>{title}</h3></div><span className="direct-panel-number">{number}</span></div>;

interface CommentActivationProps { draft: StudioDraft; updateDraft: <K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) => void; media: InstagramMedia[]; mediaLoading: boolean; mediaError: string; onReloadMedia: () => void; }
const CommentActivation: React.FC<CommentActivationProps> = ({ draft, updateDraft, media, mediaLoading, mediaError, onReloadMedia }) => <div className="direct-comment-options"><SelectField label="محدودهٔ پست" value={draft.postScope} onChange={(value) => updateDraft('postScope', value as StudioDraft['postScope'])} options={[['all', 'روی همهٔ پست‌ها'], ['selected', 'فقط پست‌های انتخاب‌شده'], ['live', 'فقط لایو']]} />{draft.postScope === 'selected' && <div className="direct-post-picker"><div className="direct-field-label-row"><div><span className="direct-label">انتخاب پست</span><small>فقط پست‌های واقعی اکانت متصل نمایش داده می‌شوند</small></div><span className="direct-post-count">{draft.postIds.length} انتخاب شده</span></div>{mediaLoading && <div className="direct-post-state"><span className="direct-loading-dot" /> در حال دریافت پست‌های پیج...</div>}{!mediaLoading && mediaError && <div className="direct-post-state is-error"><span>{mediaError}</span><button type="button" className="direct-inline-btn" onClick={onReloadMedia}>تلاش دوباره</button></div>}{!mediaLoading && !mediaError && media.length === 0 && <div className="direct-post-state">برای این اکانت پستی از API دریافت نشد.</div>}{!mediaLoading && !mediaError && media.length > 0 && <div className="direct-post-grid">{media.map((post) => { const selected = draft.postIds.includes(post.id); const title = post.caption?.split('\n')[0]?.trim() || (post.mediaProductType === 'REELS' ? 'ریلز اینستاگرام' : 'پست اینستاگرام'); const meta = `${post.mediaProductType === 'REELS' ? 'ریلز' : post.mediaType === 'VIDEO' ? 'ویدیو' : 'پست'}${post.timestamp ? ` · ${new Date(post.timestamp).toLocaleDateString('fa-IR')}` : ''}`; return <button type="button" key={post.id} className={`direct-post-card ${selected ? 'is-selected' : ''}`} onClick={() => updateDraft('postIds', selected ? draft.postIds.filter((id) => id !== post.id) : [...draft.postIds, post.id])}>{post.thumbnailUrl || post.mediaUrl ? <img src={post.thumbnailUrl || post.mediaUrl} alt={title} loading="lazy" /> : <span className="direct-post-placeholder"><ImageIcon size={18} /></span>}<span><strong>{title}</strong><small>{meta}</small></span>{selected && <Check size={15} />}</button>; })}</div>}</div>}<div className="row g-3"><div className="col-12 col-md-6"><SelectField label="پاسخ در کجا ارسال شود؟" value={draft.destination} onChange={(value) => updateDraft('destination', value as CommentDestination)} options={[['dm', 'فقط دایرکت'], ['comment', 'فقط زیر کامنت'], ['both', 'دایرکت و کامنت']]} /></div><div className="col-12 col-md-6"><ToggleField label="فقط برای دنبال‌کننده‌ها" checked={draft.requireFollow} onChange={(value) => updateDraft('requireFollow', value)} /></div></div><div className="direct-helper"><UsersRound size={16} /><span>این گزینه فقط وقتی اجرا را محدود می‌کند که وضعیت دنبال‌کردن در رویداد Meta در دسترس باشد؛ سیستم به‌صورت خودکار کسی را فالو نمی‌کند.</span></div></div>;

interface FormQuestionsProps { draft: StudioDraft; updateDraft: <K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) => void; }
interface FollowGateEditorProps { draft: StudioDraft; updateDraft: <K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) => void; }
const FollowGateEditor: React.FC<FollowGateEditorProps> = ({ draft, updateDraft }) => <section className="direct-panel direct-follow-gate-panel"><PanelHeading label="شرط فالو" title="قبل از ارسال محتوا، فالو را تأیید کنید" number="۰۴" /><ToggleField label="ابتدا از مخاطب بخواه پیج را فالو کند" checked={draft.followGateEnabled} onChange={(value) => updateDraft('followGateEnabled', value)} />{draft.followGateEnabled && <div className="direct-follow-gate-fields"><label className="direct-label">متن راهنمای بالای دکمه<textarea className="form-control direct-control" rows={3} value={draft.followGateMessage} onChange={(event) => updateDraft('followGateMessage', event.target.value)} placeholder="مثلاً اول پیج را فالو کنید و سپس دکمه را بزنید." /></label><label className="direct-label">عنوان دکمهٔ تأیید فالو<input className="form-control direct-control" value={draft.followGateButtonTitle} onChange={(event) => updateDraft('followGateButtonTitle', event.target.value)} placeholder="فالو کردم" /></label><label className="direct-label">پاسخ بعد از تأیید فالو<textarea className="form-control direct-control" rows={3} value={draft.followGateSuccessMessage} onChange={(event) => updateDraft('followGateSuccessMessage', event.target.value)} placeholder="پیام یا سناریوی موفقیت را بنویسید." /></label><div className="direct-helper"><UsersRound size={16} /><span>با کلیک روی دکمه، وضعیت دنبال‌کردن از رویداد Meta بررسی می‌شود. اگر Meta وضعیت را تأیید کند، پاسخ موفقیت و محتوای سناریو ارسال می‌شود.</span></div></div>}</section>;
const FormQuestions: React.FC<FormQuestionsProps> = ({ draft, updateDraft }) => <section className="direct-panel"><PanelHeading label="تنظیمات فرم" title="سؤال‌ها را کوتاه و مرحله‌ای بچینید" number="۰۳" /><div className="row g-3 mb-3"><div className="col-12 col-md-6"><label className="direct-label">عنوان فرم</label><input className="form-control direct-control" value={draft.formTitle} onChange={(event) => updateDraft('formTitle', event.target.value)} /></div><div className="col-12 col-md-6"><label className="direct-label">متن دکمهٔ خروج</label><input className="form-control direct-control" value={draft.formExitLabel} onChange={(event) => updateDraft('formExitLabel', event.target.value)} /></div></div><div className="direct-question-list">{draft.questions.map((question, index) => <article className="direct-question-card" key={question.id}><span className="direct-question-index">{index + 1}</span><div><strong>{question.label}</strong><p>{question.prompt}</p><small>{question.fieldType} · {question.required ? 'الزامی' : 'اختیاری'}</small></div><button type="button" onClick={() => updateDraft('questions', draft.questions.filter((item) => item.id !== question.id))} aria-label="حذف سؤال"><Trash2 size={15} /></button></article>)}</div><button type="button" className="direct-add-question" onClick={() => updateDraft('questions', [...draft.questions, makeQuestion(draft.questions.length)])}><Plus size={16} /> افزودن سؤال</button><label className="direct-label mt-3">پیام تکمیل فرم</label><textarea className="form-control direct-control" rows={3} value={draft.formCompletionMessage} onChange={(event) => updateDraft('formCompletionMessage', event.target.value)} /></section>;

interface FollowUpActivationProps { draft: StudioDraft; automations: Automation[]; updateDraft: <K extends keyof StudioDraft>(key: K, value: StudioDraft[K]) => void; }
const FollowUpActivation: React.FC<FollowUpActivationProps> = ({ draft, automations, updateDraft }) => <div className="direct-followup-options"><SelectField label="سناریوی پایه" value={draft.followUpAutomationId} onChange={(value) => updateDraft('followUpAutomationId', value)} options={[[ '', 'انتخاب پاسخ خودکار پایه'], ...automations.filter((auto) => inferKind(auto) !== 'followup').map((auto) => [auto.id, auto.name])]} /><SelectField label="چه زمانی پیگیری شود؟" value={draft.followUpCondition} onChange={(value) => updateDraft('followUpCondition', value as StudioDraft['followUpCondition'])} options={[['no_reply', 'وقتی کاربر پاسخی نداده است'], ['always', 'در هر حالت']]} /><NumberField label="فاصلهٔ پیگیری (دقیقه)" value={draft.delayMinutes} onChange={(value) => updateDraft('delayMinutes', value)} /></div>;
