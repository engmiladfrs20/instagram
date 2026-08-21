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

// Some older persisted scenarios were saved after a UTF-8/legacy-encoding
// conversion. Keep matching resilient so a real Persian message can still
// trigger those scenarios while the Worker repairs the known records.
const MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ['ط³ظ„ط§ظ…', 'سلام'],
  ['ط±ط§ظ‡ظ†ظ…ط§', 'راهنما'],
  ['ط¢ط¯ط±ط³', 'آدرس'],
  ['ظ¾ط³طھ', 'پست'],
  ['ط³ظپط§ط±ط´', 'سفارش'],
  ['ط®ط±غŒط¯', 'خرید'],
  ['ظ„غŒظ†ع©', 'لینک'],
  ['ظ‚غŒظ…طھ', 'قیمت'],
];

export function normalizeText(value: string | undefined): string {
  let text = value || '';
  for (const [broken, repaired] of MOJIBAKE_REPLACEMENTS) text = text.split(broken).join(repaired);
  return text.normalize('NFKC').trim().toLocaleLowerCase('fa-IR');
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
  if (auto.status !== 'active') return false;
  return [auto.publishedVersion, auto.currentVersion]
    .filter((version, index, versions) => Boolean(version) && versions.indexOf(version) === index)
    .some((version) => versionMatchesAutomation(auto, version!, context));
}

function versionMatchesAutomation(auto: Automation, version: AutomationVersion, context: IncomingContext): boolean {
  const triggerNode = version.nodes.find((node) => node.type === 'TRIGGER');
  const triggerType = triggerNode?.config.triggerType || auto.triggerType;
  if (!triggerMatches(triggerType, context.trigger)) return false;
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
  const textToMatch = context.replyPayload || context.text;
  return keywords.some((keyword) => keywordMatches(textToMatch, keyword, mode));
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

export function runtimeVersion(auto: Automation, context?: IncomingContext): AutomationVersion {
  if (context && auto.publishedVersion && versionMatchesAutomation(auto, auto.publishedVersion, context)) return auto.publishedVersion;
  if (context && versionMatchesAutomation(auto, auto.currentVersion, context)) return auto.currentVersion;
  return auto.publishedVersion || auto.currentVersion;
}
