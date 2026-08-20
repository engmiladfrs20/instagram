import { Automation, AutomationVersion, FlowNode, FlowEdge, TriggerType } from '../types';

export type IncomingTrigger =
  | 'COMMENT_CREATED'
  | 'DM_RECEIVED'
  | 'QUICK_REPLY_SELECTED'
  | 'STORY_REPLY'
  | 'STORY_MENTION';

export interface IncomingContext {
  trigger: IncomingTrigger;
  text: string;
  payload: any;
  replyPayload?: string;
  contactTags?: string[];
  windowOpen?: boolean;
  mediaId?: string;
  isFollower?: boolean;
}

export function clone<T>(value: T): T {
  return structuredClone(value);
}

export function normalizeText(value: string | undefined): string {
  return (value || '').normalize('NFKC').trim().toLocaleLowerCase('fa-IR');
}

function triggerMatches(triggerType: TriggerType, trigger: IncomingTrigger): boolean {
  if (trigger === 'COMMENT_CREATED') {
    return triggerType === 'COMMENT_CREATED' || triggerType === 'COMMENT_KEYWORD' || triggerType === 'POST_OR_REEL_COMMENT';
  }
  if (trigger === 'DM_RECEIVED') {
    return triggerType === 'DM_RECEIVED' || triggerType === 'DM_KEYWORD';
  }
  return triggerType === trigger;
}

function keywordMatches(text: string, keyword: string, mode: FlowNode['config']['matchMode'] = 'contains'): boolean {
  const value = normalizeText(text);
  const target = normalizeText(keyword);
  if (!target) return false;
  if (target === '*') return true;
  if (mode === 'exact') return value === target;
  if (mode === 'starts_with') return value.startsWith(target);
  if (mode === 'regex') {
    try {
      return new RegExp(keyword, 'iu').test(text);
    } catch {
      return false;
    }
  }
  return value.includes(target);
}

export function matchesAutomation(auto: Automation, context: IncomingContext): boolean {
  if (auto.status !== 'active' || !triggerMatches(auto.triggerType, context.trigger)) return false;
  const triggerNode = (auto.publishedVersion || auto.currentVersion).nodes.find((node) => node.type === 'TRIGGER');
  if (context.trigger === 'COMMENT_CREATED' && triggerNode) {
    const { postScope, postIds, requireFollow } = triggerNode.config;
    if (postScope === 'selected' && postIds?.length && (!context.mediaId || !postIds.includes(context.mediaId))) return false;
    // Meta does not include follower status in every webhook shape. Only reject
    // when it explicitly tells us that the sender is not a follower.
    if (requireFollow && context.isFollower === false) return false;
  }
  const keywords = triggerNode?.config.keywords?.length ? triggerNode.config.keywords : auto.keywords;
  if (!keywords?.length) return false;
  const mode = triggerNode?.config.matchMode || 'contains';
  return keywords.some((keyword) => keywordMatches(context.text, keyword, mode));
}

function conditionPasses(node: FlowNode, context: IncomingContext): boolean {
  const value = node.config.conditionValue;
  const field = normalizeText(node.config.conditionField === 'payload' ? JSON.stringify(context.payload) : context.text);
  switch (node.config.conditionOperator) {
    case 'equals':
      return field === normalizeText(String(value || ''));
    case 'contains':
      return field.includes(normalizeText(String(value || '')));
    case 'contains_any':
      return Array.isArray(value) && value.some((item) => field.includes(normalizeText(String(item))));
    case 'has_tag':
      return Array.isArray(context.contactTags) && context.contactTags.includes(String(value || ''));
    case 'is_window_open':
      return context.windowOpen !== false;
    default:
      return true;
  }
}

export function executableNodes(version: AutomationVersion, context: IncomingContext): FlowNode[] {
  const byId = new Map(version.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, FlowEdge[]>();
  for (const edge of version.edges) {
    const list = outgoing.get(edge.sourceNodeId) || [];
    list.push(edge);
    outgoing.set(edge.sourceNodeId, list);
  }

  const trigger = version.nodes.find((node) => node.type === 'TRIGGER');
  if (!trigger) return [];

  const result: FlowNode[] = [];
  const queue = [trigger.id];
  const visited = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const node = byId.get(id);
    if (!node) continue;
    if (node.type !== 'TRIGGER' && node.type !== 'CONDITION') result.push(node);
    if (node.type === 'CONDITION' && !conditionPasses(node, context)) continue;
    for (const edge of outgoing.get(id) || []) {
      if (context.replyPayload && edge.conditionValue && edge.conditionValue !== context.replyPayload) continue;
      queue.push(edge.targetNodeId);
    }
  }
  return result;
}

export function runtimeVersion(auto: Automation): AutomationVersion {
  return auto.publishedVersion || auto.currentVersion;
}
