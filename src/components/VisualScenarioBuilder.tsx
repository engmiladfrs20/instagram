import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Braces,
  Check,
  CircleStop,
  Clock3,
  GitBranch,
  Hand,
  MessageCircle,
  MessageSquareText,
  Plus,
  Send,
  Settings2,
  Tag,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { FlowEdge, FlowNode, NodeType } from '../types';

export interface VisualScenarioBuilderProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onChange: (nodes: FlowNode[], edges: FlowEdge[]) => void;
}

type PaletteItem = {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ElementType;
};

const NODE_LABELS: Record<NodeType, string> = {
  TRIGGER: 'شروع سناریو',
  CONDITION: 'شرط و تصمیم',
  SEND_TEXT: 'ارسال متن',
  SEND_QUICK_REPLIES: 'پاسخ سریع',
  SEND_PRIVATE_REPLY: 'ارسال به دایرکت',
  REPLY_PUBLIC_COMMENT: 'پاسخ زیر کامنت',
  ASK_FORM_FIELD: 'سؤال فرم',
  SEND_PRODUCT_CAROUSEL: 'کاتالوگ محصول',
  ADD_TAG: 'افزودن برچسب',
  SET_CONTACT_FIELD: 'ثبت اطلاعات مخاطب',
  HANDOFF_TO_HUMAN: 'تحویل به اپراتور',
  WAIT: 'مکث و انتظار',
  STOP: 'پایان سناریو',
};

const PALETTE: PaletteItem[] = [
  { type: 'CONDITION', label: 'شرط', description: 'شاخه‌بندی بر اساس متن یا payload', icon: GitBranch },
  { type: 'SEND_PRIVATE_REPLY', label: 'دایرکت', description: 'پیام خصوصی، رسانه و دکمه', icon: Send },
  { type: 'SEND_TEXT', label: 'متن', description: 'ارسال یک پاسخ متنی', icon: MessageSquareText },
  { type: 'SEND_QUICK_REPLIES', label: 'پاسخ سریع', description: 'گزینه‌های قابل کلیک', icon: MessageCircle },
  { type: 'REPLY_PUBLIC_COMMENT', label: 'پاسخ کامنت', description: 'پاسخ زیر همان پست', icon: MessageCircle },
  { type: 'ASK_FORM_FIELD', label: 'سؤال فرم', description: 'گرفتن اطلاعات از مخاطب', icon: Braces },
  { type: 'SEND_PRODUCT_CAROUSEL', label: 'کاتالوگ', description: 'نمایش محصولات انتخابی', icon: Tag },
  { type: 'ADD_TAG', label: 'برچسب', description: 'افزودن برچسب به مخاطب', icon: Tag },
  { type: 'SET_CONTACT_FIELD', label: 'اطلاعات مخاطب', description: 'ذخیرهٔ یک مقدار در پرونده', icon: UserRound },
  { type: 'WAIT', label: 'انتظار', description: 'مکث قبل از مرحلهٔ بعد', icon: Clock3 },
  { type: 'HANDOFF_TO_HUMAN', label: 'اپراتور', description: 'تحویل گفتگو به انسان', icon: Hand },
  { type: 'STOP', label: 'پایان', description: 'توقف مسیر اجرا', icon: CircleStop },
];

const nextPosition = (nodes: FlowNode[]) => {
  const index = nodes.length;
  return { x: 80 + (index % 4) * 280, y: 120 + Math.floor(index / 4) * 180 };
};

function createNode(type: NodeType, index: number, position = { x: 80 + index * 260, y: 120 }): FlowNode {
  const id = `visual_${type.toLowerCase()}_${crypto.randomUUID()}`;
  const config: FlowNode['config'] = { branchMode: 'all' };
  if (type === 'TRIGGER') Object.assign(config, { triggerType: 'DM_KEYWORD', keywords: ['سلام'], matchMode: 'contains' });
  if (type === 'CONDITION') Object.assign(config, { conditionOperator: 'contains', conditionField: 'text', conditionValue: 'قیمت' });
  if (type === 'SEND_TEXT' || type === 'SEND_PRIVATE_REPLY' || type === 'SEND_QUICK_REPLIES') Object.assign(config, { text: 'پیام جدید سناریو' });
  if (type === 'REPLY_PUBLIC_COMMENT') Object.assign(config, { publicReplyText: 'ممنون از کامنت شما', commentReplyDestination: 'comment' });
  if (type === 'ASK_FORM_FIELD') Object.assign(config, { formFieldKey: 'نام', formFieldPrompt: 'لطفاً نام خود را وارد کنید.', formFieldType: 'text' });
  if (type === 'ADD_TAG') Object.assign(config, { tagToAdd: 'مخاطب جدید' });
  if (type === 'SET_CONTACT_FIELD') Object.assign(config, { fieldToSet: { key: 'source', value: 'instagram' } });
  if (type === 'WAIT') Object.assign(config, { delayMinutes: 60, waitDurationSeconds: 60 });
  if (type === 'SEND_PRODUCT_CAROUSEL') Object.assign(config, { productIds: [] });
  return { id, type, title: NODE_LABELS[type], config, position };
}

const textLines = (values: string[] | undefined) => (values || []).join('\n');
const parseLines = (value: string, trimValues = false) => {
  const lines = value.split(/\r?\n/);
  return trimValues
    ? lines.map((item) => item.trim()).filter(Boolean)
    : lines.filter((item) => item.trim().length > 0);
};

const nodeSummary = (node: FlowNode) => {
  if (node.type === 'TRIGGER') return (node.config.keywords || []).join('، ') || 'بدون کلمهٔ فعال‌ساز';
  if (node.type === 'CONDITION') return `${node.config.conditionOperator || 'شرط'}: ${String(node.config.conditionValue || '')}`;
  if (node.config.followGateMode === 'claim') return `درخواست فالو · ${node.config.followGatePayload || 'FOLLOW_CLAIMED'}`;
  if (node.config.followGateMode === 'verified') return 'ادامه پس از تأیید فالو';
  if (node.type === 'WAIT') return `${node.config.delayMinutes || 1} دقیقه مکث`;
  if (node.type === 'ADD_TAG') return node.config.tagToAdd || 'برچسب جدید';
  if (node.type === 'SET_CONTACT_FIELD') return `${node.config.fieldToSet?.key || 'فیلد'} = ${node.config.fieldToSet?.value || ''}`;
  if (node.type === 'SEND_PRODUCT_CAROUSEL') return `${node.config.productIds?.length || 0} محصول انتخاب شده`;
  return node.config.text || node.config.publicReplyText || node.config.formFieldPrompt || NODE_LABELS[node.type];
};

type NodePatch = Partial<FlowNode> & { config?: Partial<FlowNode['config']> };

export const VisualScenarioBuilder: React.FC<VisualScenarioBuilderProps> = ({ nodes, edges, onChange }) => {
  const [selectedNodeId, setSelectedNodeId] = useState(nodes[0]?.id || '');
  const [draggingNodeId, setDraggingNodeId] = useState('');
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || nodes[0];
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const updateNodes = (nextNodes: FlowNode[]) => onChange(nextNodes, edges);
  const updateEdges = (nextEdges: FlowEdge[]) => onChange(nodes, nextEdges);
  const updateNode = (nodeId: string, patch: NodePatch) => {
    updateNodes(nodes.map((node) => {
      if (node.id !== nodeId) return node;
      return patch.config
        ? { ...node, ...patch, config: { ...node.config, ...patch.config } }
        : { ...node, ...patch };
    }));
  };

  const addNode = (type: NodeType, position = nextPosition(nodes)) => {
    if (type === 'TRIGGER' && nodes.some((node) => node.type === 'TRIGGER')) return;
    const node = createNode(type, nodes.length, position);
    const source = nodes[nodes.length - 1];
    const nextEdges = source && source.type !== 'STOP'
      ? [...edges, { id: `edge_${crypto.randomUUID()}`, sourceNodeId: source.id, targetNodeId: node.id, label: 'مرحلهٔ بعد' }]
      : edges;
    onChange([...nodes, node], nextEdges);
    setSelectedNodeId(node.id);
  };

  const removeNode = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    if (!node || node.type === 'TRIGGER') return;
    const nextNodes = nodes.filter((item) => item.id !== nodeId);
    onChange(nextNodes, edges.filter((edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId));
    setSelectedNodeId(nextNodes[0]?.id || '');
  };

  const dropOnCanvas = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const position = { x: Math.max(24, event.clientX - rect.left - 110), y: Math.max(24, event.clientY - rect.top - 35) };
    const paletteType = event.dataTransfer.getData('application/x-instaflow-palette') as NodeType;
    const movedNodeId = event.dataTransfer.getData('application/x-instaflow-node');
    if (paletteType) addNode(paletteType, position);
    if (movedNodeId) updateNode(movedNodeId, { position });
    setDraggingNodeId('');
  };

  const updateEdge = (edgeId: string, patch: Partial<FlowEdge>) => updateEdges(edges.map((edge) => edge.id === edgeId ? { ...edge, ...patch } : edge));
  const addEdge = (sourceNodeId: string) => {
    const target = nodes.find((node) => node.id !== sourceNodeId && !edges.some((edge) => edge.sourceNodeId === sourceNodeId && edge.targetNodeId === node.id));
    if (!target) return;
    updateEdges([...edges, { id: `edge_${crypto.randomUUID()}`, sourceNodeId, targetNodeId: target.id, label: 'شاخهٔ جدید' }]);
  };

  const renderButtonEditor = (node: FlowNode) => <div className="visual-action-editor">
    <div className="visual-section-title"><span>دکمه‌های پاسخ</span><button type="button" onClick={() => updateNode(node.id, { config: { buttons: [...(node.config.buttons || []), { title: 'دکمهٔ جدید', payload: 'BUTTON_CLICKED' }] } })}><Plus size={13} /> افزودن</button></div>
    {(node.config.buttons || []).map((button, index) => <div className="visual-action-row" key={`button-${index}`}>
      <input value={button.title} onChange={(event) => updateNode(node.id, { config: { buttons: (node.config.buttons || []).map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) } })} placeholder="عنوان دکمه" />
      <input dir="ltr" value={button.url || button.payload || ''} onChange={(event) => updateNode(node.id, { config: { buttons: (node.config.buttons || []).map((item, itemIndex) => itemIndex === index ? (item.url ? { ...item, url: event.target.value } : { ...item, payload: event.target.value }) : item) } })} placeholder="payload یا لینک" />
      <button type="button" onClick={() => updateNode(node.id, { config: { buttons: (node.config.buttons || []).filter((_, itemIndex) => itemIndex !== index) } })} aria-label="حذف دکمه"><Trash2 size={13} /></button>
    </div>)}
  </div>;

  const renderQuickReplyEditor = (node: FlowNode) => <div className="visual-action-editor">
    <div className="visual-section-title"><span>گزینه‌های سریع</span><button type="button" onClick={() => updateNode(node.id, { config: { quickReplies: [...(node.config.quickReplies || []), { title: 'گزینهٔ جدید', payload: 'QUICK_REPLY' }] } })}><Plus size={13} /> افزودن</button></div>
    {(node.config.quickReplies || []).map((reply, index) => <div className="visual-action-row" key={`quick-reply-${index}`}>
      <input value={reply.title} onChange={(event) => updateNode(node.id, { config: { quickReplies: (node.config.quickReplies || []).map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) } })} placeholder="عنوان گزینه" />
      <input dir="ltr" value={reply.payload} onChange={(event) => updateNode(node.id, { config: { quickReplies: (node.config.quickReplies || []).map((item, itemIndex) => itemIndex === index ? { ...item, payload: event.target.value } : item) } })} placeholder="payload" />
      <button type="button" onClick={() => updateNode(node.id, { config: { quickReplies: (node.config.quickReplies || []).filter((_, itemIndex) => itemIndex !== index) } })} aria-label="حذف گزینه"><Trash2 size={13} /></button>
    </div>)}
  </div>;

  const renderMessageEditor = (node: FlowNode) => {
    const isPublic = node.type === 'REPLY_PUBLIC_COMMENT';
    const followMode = node.config.followGateMode || 'none';
    const setFollowMode = (mode: 'none' | 'claim' | 'verified') => {
      const payload = node.config.followGatePayload || 'FOLLOW_CLAIMED';
      const buttons = mode === 'claim' && !(node.config.buttons || []).length
        ? [{ title: 'فالو دارم', payload }]
        : node.config.buttons;
      updateNode(node.id, { config: {
        followGateMode: mode === 'none' ? undefined : mode,
        followGatePayload: mode === 'none' ? undefined : payload,
        buttons,
      } });
    };
    return <>
      <label className="visual-field"><span>{isPublic ? 'متن پاسخ عمومی' : 'متن پیام'}</span><textarea rows={4} value={isPublic ? node.config.publicReplyText || '' : node.config.text || ''} onChange={(event) => updateNode(node.id, { config: isPublic ? { publicReplyText: event.target.value } : { text: event.target.value } })} /></label>
      {!isPublic && <label className="visual-field"><span>پاسخ‌های تصادفی، هر خط یک متن</span><textarea rows={4} value={textLines(node.config.responseVariants)} onChange={(event) => updateNode(node.id, { config: { responseVariants: parseLines(event.target.value) } })} /></label>}
      {!isPublic && <div className="visual-field-grid"><label className="visual-field"><span>لینک رسانه</span><input dir="ltr" value={node.config.mediaUrl || ''} onChange={(event) => updateNode(node.id, { config: { mediaUrl: event.target.value } })} placeholder="https://..." /></label><label className="visual-field"><span>نوع رسانه</span><select value={node.config.mediaType || 'image'} onChange={(event) => updateNode(node.id, { config: { mediaType: event.target.value as FlowNode['config']['mediaType'] } })}><option value="image">تصویر</option><option value="video">ویدیو</option><option value="audio">صوت</option></select></label></div>}
      {!isPublic && renderButtonEditor(node)}
      {node.type === 'SEND_QUICK_REPLIES' && renderQuickReplyEditor(node)}
      {node.type === 'SEND_PRIVATE_REPLY' && <div className="visual-action-editor">
        <label className="visual-field"><span>نقش مرحله در بررسی فالو</span><select value={followMode} onChange={(event) => setFollowMode(event.target.value as 'none' | 'claim' | 'verified')}><option value="none">مرحلهٔ عادی</option><option value="claim">درخواست فالو و دکمهٔ «فالو دارم»</option><option value="verified">ادامه پس از تأیید فالو</option></select></label>
        {followMode !== 'none' && <label className="visual-field"><span>payload دکمه</span><input dir="ltr" value={node.config.followGatePayload || 'FOLLOW_CLAIMED'} onChange={(event) => { const payload = event.target.value; updateNode(node.id, { config: { followGatePayload: payload, buttons: followMode === 'claim' ? (node.config.buttons || []).map((button) => button.payload ? { ...button, payload } : button) : node.config.buttons } }); }} /></label>}
      </div>}
      <label className="visual-field"><span>مقصد اجرا</span><select value={node.config.commentReplyDestination || (isPublic ? 'comment' : 'dm')} onChange={(event) => updateNode(node.id, { config: { commentReplyDestination: event.target.value as FlowNode['config']['commentReplyDestination'] } })}><option value="dm">دایرکت</option><option value="comment">کامنت</option><option value="both">هر دو</option></select></label>
    </>;
  };

  const renderInspector = () => {
    if (!selectedNode) return <div className="visual-empty-inspector"><Settings2 size={22} /><strong>یک مرحله را انتخاب کنید</strong><span>برای ساخت سناریو، بلوک‌ها را از سمت چپ به بوم بکشید.</span></div>;
    const outgoing = edges.filter((edge) => edge.sourceNodeId === selectedNode.id);
    return <div className="visual-inspector-content">
      <div className="visual-inspector-heading"><div><span>تنظیمات مرحله</span><h3>{NODE_LABELS[selectedNode.type]}</h3></div><button type="button" onClick={() => removeNode(selectedNode.id)} disabled={selectedNode.type === 'TRIGGER'} aria-label="حذف مرحله"><Trash2 size={16} /></button></div>
      <label className="visual-field"><span>عنوان نمایشی</span><input value={selectedNode.title} onChange={(event) => updateNode(selectedNode.id, { title: event.target.value })} /></label>
      {selectedNode.type === 'TRIGGER' && <><label className="visual-field"><span>کلمات فعال‌ساز، هر خط یک کلمه</span><textarea rows={3} value={textLines(selectedNode.config.keywords)} onChange={(event) => updateNode(selectedNode.id, { config: { keywords: parseLines(event.target.value, true) } })} /></label><label className="visual-field"><span>نوع تطبیق</span><select value={selectedNode.config.matchMode || 'contains'} onChange={(event) => updateNode(selectedNode.id, { config: { matchMode: event.target.value as FlowNode['config']['matchMode'] } })}><option value="contains">شامل عبارت</option><option value="exact">برابر</option><option value="starts_with">شروع‌شده با</option><option value="regex">الگوی پیشرفته</option></select></label></>}
      {selectedNode.type === 'CONDITION' && <><label className="visual-field"><span>فیلد بررسی</span><select value={selectedNode.config.conditionField || 'text'} onChange={(event) => updateNode(selectedNode.id, { config: { conditionField: event.target.value } })}><option value="text">متن پیام</option><option value="payload">دادهٔ رویداد</option></select></label><label className="visual-field"><span>نوع شرط</span><select value={selectedNode.config.conditionOperator || 'contains'} onChange={(event) => updateNode(selectedNode.id, { config: { conditionOperator: event.target.value as FlowNode['config']['conditionOperator'] } })}><option value="contains">شامل</option><option value="equals">برابر</option><option value="contains_any">شامل یکی از موارد</option><option value="has_tag">دارای برچسب</option><option value="is_window_open">پنجرهٔ پاسخ باز است</option></select></label><label className="visual-field"><span>مقدار شرط</span><input value={Array.isArray(selectedNode.config.conditionValue) ? selectedNode.config.conditionValue.join('، ') : String(selectedNode.config.conditionValue || '')} onChange={(event) => updateNode(selectedNode.id, { config: { conditionValue: event.target.value } })} /></label></>}
      {(selectedNode.type === 'SEND_TEXT' || selectedNode.type === 'SEND_PRIVATE_REPLY' || selectedNode.type === 'SEND_QUICK_REPLIES' || selectedNode.type === 'REPLY_PUBLIC_COMMENT') && renderMessageEditor(selectedNode)}
      {selectedNode.type === 'ASK_FORM_FIELD' && <><label className="visual-field"><span>کلید فیلد</span><input value={selectedNode.config.formFieldKey || ''} onChange={(event) => updateNode(selectedNode.id, { config: { formFieldKey: event.target.value } })} /></label><label className="visual-field"><span>متن سؤال</span><textarea rows={3} value={selectedNode.config.formFieldPrompt || ''} onChange={(event) => updateNode(selectedNode.id, { config: { formFieldPrompt: event.target.value } })} /></label><label className="visual-field"><span>نوع پاسخ</span><select value={selectedNode.config.formFieldType || 'text'} onChange={(event) => updateNode(selectedNode.id, { config: { formFieldType: event.target.value as FlowNode['config']['formFieldType'] } })}><option value="text">متن</option><option value="phone">شماره تماس</option><option value="email">ایمیل</option><option value="choice">انتخابی</option></select></label></>}
      {selectedNode.type === 'SEND_PRODUCT_CAROUSEL' && <label className="visual-field"><span>شناسهٔ محصولات، هر خط یک شناسه</span><textarea rows={4} value={textLines(selectedNode.config.productIds)} onChange={(event) => updateNode(selectedNode.id, { config: { productIds: parseLines(event.target.value, true) } })} placeholder="product-1\nproduct-2" /></label>}
      {selectedNode.type === 'ADD_TAG' && <label className="visual-field"><span>برچسب</span><input value={selectedNode.config.tagToAdd || ''} onChange={(event) => updateNode(selectedNode.id, { config: { tagToAdd: event.target.value } })} /></label>}
      {selectedNode.type === 'SET_CONTACT_FIELD' && <div className="visual-field-grid"><label className="visual-field"><span>نام فیلد</span><input value={selectedNode.config.fieldToSet?.key || ''} onChange={(event) => updateNode(selectedNode.id, { config: { fieldToSet: { key: event.target.value, value: selectedNode.config.fieldToSet?.value || '' } } })} /></label><label className="visual-field"><span>مقدار</span><input value={selectedNode.config.fieldToSet?.value || ''} onChange={(event) => updateNode(selectedNode.id, { config: { fieldToSet: { key: selectedNode.config.fieldToSet?.key || '', value: event.target.value } } })} /></label></div>}
      {selectedNode.type === 'WAIT' && <label className="visual-field"><span>مدت انتظار، دقیقه</span><input type="number" min={1} value={selectedNode.config.delayMinutes || 1} onChange={(event) => updateNode(selectedNode.id, { config: { delayMinutes: Math.max(1, Number(event.target.value) || 1) } })} /></label>}
      {outgoing.length > 1 && <label className="visual-field"><span>رفتار شاخه‌ها</span><select value={selectedNode.config.branchMode || 'all'} onChange={(event) => updateNode(selectedNode.id, { config: { branchMode: event.target.value as FlowNode['config']['branchMode'] } })}><option value="all">اجرای همهٔ شاخه‌ها</option><option value="first_match">فقط اولین شاخهٔ منطبق</option></select></label>}
      <div className="visual-edges-editor"><div className="visual-section-title"><span>اتصال‌های بعدی</span><button type="button" onClick={() => addEdge(selectedNode.id)} disabled={selectedNode.type === 'STOP'}><Plus size={13} /> شاخه</button></div>{outgoing.length === 0 && <small className="text-muted">این مرحله هنوز خروجی ندارد.</small>}{outgoing.map((edge) => <div className="visual-edge-row" key={edge.id}><ArrowRight size={13} /><select value={edge.targetNodeId} onChange={(event) => updateEdge(edge.id, { targetNodeId: event.target.value })}>{nodes.filter((node) => node.id !== selectedNode.id).map((node) => <option key={node.id} value={node.id}>{node.title}</option>)}</select><input value={edge.label || ''} onChange={(event) => updateEdge(edge.id, { label: event.target.value })} placeholder="نام شاخه" /><input dir="ltr" value={edge.conditionValue || ''} onChange={(event) => updateEdge(edge.id, { conditionValue: event.target.value || undefined })} placeholder="شرط payload" /><button type="button" onClick={() => updateEdges(edges.filter((item) => item.id !== edge.id))} aria-label="حذف اتصال"><X size={13} /></button></div>)}</div>
    </div>;
  };

  return <section className="visual-flow-builder" dir="rtl">
    <div className="visual-flow-header"><div><span className="direct-eyebrow">حالت دوم سناریونویسی</span><h3>سازندهٔ نموداری و شاخه‌ای</h3><p>بلوک‌ها را بکشید، جابه‌جا کنید و برای هر مرحله مسیر بعدی را تعیین کنید.</p></div><div className="visual-flow-legend"><span><span className="visual-dot visual-dot-trigger" /> شروع</span><span><span className="visual-dot visual-dot-action" /> عملیات</span><span><span className="visual-dot visual-dot-condition" /> تصمیم</span></div></div>
    <div className="visual-flow-layout">
      <aside className="visual-palette"><div className="visual-section-title"><span>بلوک‌های آماده</span><small>کشیدن یا کلیک</small></div>{PALETTE.map((item) => { const Icon = item.icon; return <button type="button" className="visual-palette-item" key={item.type} draggable onDragStart={(event) => event.dataTransfer.setData('application/x-instaflow-palette', item.type)} onClick={() => addNode(item.type)}><span className="visual-palette-icon"><Icon size={15} /></span><span><strong>{item.label}</strong><small>{item.description}</small></span><Plus size={14} /></button>; })}</aside>
      <div className="visual-canvas-scroll"><div className="visual-flow-canvas" onDragOver={(event) => event.preventDefault()} onDrop={dropOnCanvas} aria-label="بوم ساخت سناریو"><svg className="visual-flow-lines" width="1600" height="1000" aria-hidden="true"><defs><marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" /></marker></defs>{edges.map((edge) => { const source = nodeMap.get(edge.sourceNodeId); const target = nodeMap.get(edge.targetNodeId); if (!source || !target) return null; return <g key={edge.id}><line x1={source.position.x + 185} y1={source.position.y + 65} x2={target.position.x + 15} y2={target.position.y + 65} markerEnd="url(#flow-arrow)" /><text x={(source.position.x + target.position.x) / 2 + 90} y={(source.position.y + target.position.y) / 2 + 50}>{edge.label || edge.conditionValue || ''}</text></g>; })}</svg>{nodes.map((node, index) => { const selected = selectedNode?.id === node.id; const isCondition = node.type === 'CONDITION'; const isTrigger = node.type === 'TRIGGER'; return <article className={`visual-flow-node ${selected ? 'is-selected' : ''} ${isCondition ? 'is-condition' : ''} ${isTrigger ? 'is-trigger' : ''} ${draggingNodeId === node.id ? 'is-dragging' : ''}`} key={node.id} style={{ left: node.position.x, top: node.position.y }} draggable onDragStart={(event) => { setDraggingNodeId(node.id); event.dataTransfer.setData('application/x-instaflow-node', node.id); }} onDragEnd={() => setDraggingNodeId('')} onClick={() => setSelectedNodeId(node.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedNodeId(node.id); } }} role="button" tabIndex={0}><div className="visual-flow-node-head"><span>{index + 1}</span><strong>{node.title}</strong><small>{NODE_LABELS[node.type]}</small></div><p>{nodeSummary(node)}</p><div className="visual-flow-node-foot"><span>{edges.filter((edge) => edge.sourceNodeId === node.id).length} اتصال</span>{node.config.branchMode === 'first_match' && <span>اولین شاخه</span>}</div></article>; })}{!nodes.length && <div className="visual-canvas-empty"><GitBranch size={28} /><strong>سناریو را از اینجا بسازید</strong><span>یک بلوک را از ستون کناری بکشید و داخل بوم رها کنید.</span></div>}</div></div>
      <aside className="visual-inspector"><div className="visual-inspector-scroll">{renderInspector()}</div></aside>
    </div>
    <div className="visual-flow-help"><Check size={15} /><span>اتصال بدون شرط همیشه اجرا می‌شود؛ برای شاخه‌بندی، مقدار payload یا شرط را روی اتصال وارد کنید.</span></div>
  </section>;
};
