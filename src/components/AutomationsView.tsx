import React, { useEffect, useState } from 'react';
import {
  Workflow,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Send,
  MessageSquare,
  Tag,
  FormInput,
  ShoppingBag,
  Sparkles,
  Save,
  Check,
  Zap,
  Trash2,
  ListPlus,
  Edit2,
  HelpCircle,
} from 'lucide-react';
import { Automation, FlowNode, FlowEdge, NodeType } from '../types';

interface AutomationsViewProps {
  automations: Automation[];
  onSaveAutomation: (auto: Automation) => Promise<Automation | void>;
  onPublishAutomation: (autoId: string) => Promise<void>;
  onCreateAutomation: () => Promise<Automation>;
}

export const AutomationsView: React.FC<AutomationsViewProps> = ({
  automations,
  onSaveAutomation,
  onPublishAutomation,
  onCreateAutomation,
}) => {
  const [selectedAutoId, setSelectedAutoId] = useState<string>(
    automations[0]?.id || ''
  );
  const [isBuilding, setIsBuilding] = useState<boolean>(false);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [testCommentText, setTestCommentText] = useState<string>('قیمت مانتو چنده؟');

  const selectedAuto = automations.find((a) => a.id === selectedAutoId) || automations[0];

  const [nodes, setNodes] = useState<FlowNode[]>(
    selectedAuto?.currentVersion?.nodes || []
  );
  const [edges, setEdges] = useState<FlowEdge[]>(
    selectedAuto?.currentVersion?.edges || []
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node_trig_1');

  useEffect(() => {
    const auto = automations.find((item) => item.id === selectedAutoId) || automations[0];
    if (!auto) return;
    if (!selectedAutoId) setSelectedAutoId(auto.id);
    if (nodes.length === 0) {
      setNodes(auto.currentVersion.nodes);
      setEdges(auto.currentVersion.edges);
      setSelectedNodeId(auto.currentVersion.nodes[0]?.id || '');
    }
  }, [automations, selectedAutoId, nodes.length]);

  // Sync node changes if automation selection switches
  const handleSelectAuto = (auto: Automation) => {
    setSelectedAutoId(auto.id);
    setNodes(auto.currentVersion.nodes);
    setEdges(auto.currentVersion.edges);
    setSelectedNodeId(auto.currentVersion.nodes[0]?.id || '');
    setTestLog([]);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // Policy Guard Check for Current Graph
  const validateGraph = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const privReplyNodes = nodes.filter((n) => n.type === 'SEND_PRIVATE_REPLY');
    privReplyNodes.forEach((node) => {
      if (node.config.quickReplies && node.config.quickReplies.length > 13) {
        errors.push(`گره "${node.title}": تعداد دکمه‌های Quick Reply نباید بیشتر از ۱۳ عدد باشد (فعلی: ${node.config.quickReplies.length}).`);
      }
    });

    if (nodes.length < 2) {
      warnings.push('سناریو حداقل نیاز به یک محرک (Trigger) و یک اکشن (Action) دارد.');
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  const validation = validateGraph();

  // Handle Node Update in State
  const updateSelectedNodeConfig = (key: string, value: any) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === selectedNodeId) {
          return {
            ...n,
            config: {
              ...n.config,
              [key]: value,
            },
          };
        }
        return n;
      })
    );
  };

  // Add Quick Reply item
  const addQuickReply = () => {
    if (!selectedNode) return;
    const currentQRs = selectedNode.config.quickReplies || [];
    if (currentQRs.length >= 13) return;

    const newQR = {
      title: `گزینه ${currentQRs.length + 1}`,
      payload: `ACTION_QR_${Date.now()}`,
    };
    updateSelectedNodeConfig('quickReplies', [...currentQRs, newQR]);
  };

  const removeQuickReply = (idx: number) => {
    if (!selectedNode) return;
    const currentQRs = selectedNode.config.quickReplies || [];
    updateSelectedNodeConfig(
      'quickReplies',
      currentQRs.filter((_, i) => i !== idx)
    );
  };

  // Add new node to canvas
  const handleAddNode = (type: NodeType) => {
    const newId = `node_${type.toLowerCase()}_${Date.now()}`;
    const titleMap: Record<NodeType, string> = {
      TRIGGER: 'محرک کامنت/دایرکت',
      CONDITION: 'شرایط برچسب/متن',
      SEND_TEXT: 'ارسال پیام متنی',
      SEND_QUICK_REPLIES: 'ارسال دکمه‌های پاسخ سریع',
      SEND_PRIVATE_REPLY: 'ارسال پاسخ خصوصی (Private Reply)',
      REPLY_PUBLIC_COMMENT: 'پاسخ عمومی زیر کامنت',
      ASK_FORM_FIELD: 'دریافت پاسخ فرم',
      SEND_PRODUCT_CAROUSEL: 'نمایش ویترین محصول',
      ADD_TAG: 'افزودن برچسب لید',
      SET_CONTACT_FIELD: 'تنظیم فیلد مشتری',
      HANDOFF_TO_HUMAN: 'تحویل به اپراتور انسانی',
      WAIT: 'تأخیر زمانی',
      STOP: 'پایان سناریو',
    };

    const newNode: FlowNode = {
      id: newId,
      type,
      title: titleMap[type] || 'گره جدید',
      position: { x: 350, y: nodes.length * 80 + 50 },
      config: {
        text: type === 'SEND_PRIVATE_REPLY' ? 'پاسخ خصوصی دایرکت...' : undefined,
        publicReplyText: type === 'REPLY_PUBLIC_COMMENT' ? 'پاسخ عمومی شما...' : undefined,
      },
    };

    setNodes([...nodes, newNode]);
    if (nodes.length > 0) {
      setEdges([
        ...edges,
        {
          id: `e_${Date.now()}`,
          sourceNodeId: nodes[nodes.length - 1].id,
          targetNodeId: newId,
        },
      ]);
    }
    setSelectedNodeId(newId);
  };

  // Run Test Simulation inside Builder
  const handleRunSimulation = () => {
    setTestLog([
      '🚀 شروع شبیه‌سازی تست سناریو...',
      `📥 دریافت کامنت تست: "${testCommentText}"`,
      '🔍 بررسی تطابق کلمات کلیدی با Trigger...',
    ]);

    setTimeout(() => {
      const pubReply = nodes.find((n) => n.type === 'REPLY_PUBLIC_COMMENT');
      const privReply = nodes.find((n) => n.type === 'SEND_PRIVATE_REPLY');
      const tagNode = nodes.find((n) => n.type === 'ADD_TAG');

      const logs = [
        '🚀 شروع شبیه‌سازی تست سناریو...',
        `📥 دریافت کامنت تست: "${testCommentText}"`,
        '✅ کلمه کلیدی "قیمت" منطبق گردید.',
        '🛡️ بررسی قوانین Meta: کامنت کمتر از ۷ روز قدمت دارد (پاسخ مجاز است).',
      ];

      if (pubReply?.config?.publicReplyText) {
        logs.push(`💬 اکشن [پاسخ عمومی]: "${pubReply.config.publicReplyText}"`);
      }
      if (privReply?.config?.text) {
        logs.push(`📩 اکشن [Private Reply دایرکت]: "${privReply.config.text}"`);
        if (privReply.config.quickReplies) {
          logs.push(`🔘 ارسال ${privReply.config.quickReplies.length} دکمه Quick Reply.`);
        }
      }
      if (tagNode?.config?.tagToAdd) {
        logs.push(`🏷️ اکشن [افزودن برچسب]: "${tagNode.config.tagToAdd}"`);
      }

      logs.push('✨ سناریو با موفقیت اجرا شد.');
      setTestLog(logs);
    }, 600);
  };

  // Save changes
  const handleSave = () => {
    if (!selectedAuto) return;
    const updatedAuto: Automation = {
      ...selectedAuto,
      currentVersion: {
        ...selectedAuto.currentVersion,
        nodes,
        edges,
      },
    };
    return onSaveAutomation(updatedAuto);
  };

  const handleCreate = async () => {
    const auto = await onCreateAutomation();
    handleSelectAuto(auto);
    setIsBuilding(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center space-x-2 space-x-reverse">
            <Workflow className="w-5 h-5 text-purple-400" />
            <span>مدیریت اتوماسیون‌ها و طراح سناریو (Flow Builder)</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            سناریوهای پاسخ به کامنت، ارسال دایرکت خودکار و دریافت فاکتور با لینتر رعایت قوانین رسمی Meta.
          </p>
        </div>

        <div className="flex items-center space-x-3 space-x-reverse">
          <button
            onClick={() => setIsBuilding(!isBuilding)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
              isBuilding
                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/30'
            }`}
          >
            {isBuilding ? 'بازگشت به لیست اتوماسیون‌ها' : 'ورود به ویرایشگر گراف Flow'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {!isBuilding ? (
        /* Automations Table List */
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-sm font-bold text-white">لیست اتوماسیون‌های فعال حساب</span>
            <button
              onClick={handleCreate}
              className="flex items-center space-x-1.5 space-x-reverse text-xs bg-purple-600/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg hover:bg-purple-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>ساخت اتوماسیون جدید</span>
            </button>
          </div>

          <div className="divide-y divide-slate-800/80">
            {automations.map((auto) => (
              <div
                key={auto.id}
                className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-800/30 transition ${
                  selectedAutoId === auto.id ? 'bg-purple-950/10' : ''
                }`}
              >
                <div className="flex items-start space-x-4 space-x-reverse">
                  <div className="p-3 bg-purple-500/10 rounded-2xl text-purple-400 mt-1">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <h3 className="text-sm font-bold text-white">{auto.name}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          auto.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {auto.status === 'active' ? 'فعال' : 'پیش‌نویس'}
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono">
                        v{auto.currentVersion.versionNo}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">{auto.description}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="text-[11px] text-slate-400">کلمات کلیدی:</span>
                      {auto.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px]"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 space-x-reverse text-xs">
                  <div className="text-left font-mono text-slate-400">
                    <span className="block text-slate-200 font-bold">
                      {auto.runCount.toLocaleString('fa-IR')} اجرا
                    </span>
                    <span className="text-[10px]">
                      آخرین: {auto.lastTriggeredAt ? new Date(auto.lastTriggeredAt).toLocaleTimeString('fa-IR') : 'هرگز'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      handleSelectAuto(auto);
                      setIsBuilding(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition border border-slate-700 flex items-center space-x-1.5 space-x-reverse"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>ویرایش گراف سناریو</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Visual Flow Builder Canvas & Inspector */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas & Node List Panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* Action Bar */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="text-xs font-bold text-slate-300">افزودن گره به سناریو:</span>
                <button
                  onClick={() => handleAddNode('REPLY_PUBLIC_COMMENT')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 flex items-center space-x-1 space-x-reverse"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                  <span>پاسخ عمومی</span>
                </button>
                <button
                  onClick={() => handleAddNode('SEND_PRIVATE_REPLY')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 flex items-center space-x-1 space-x-reverse"
                >
                  <Send className="w-3.5 h-3.5 text-purple-400" />
                  <span>Private Reply</span>
                </button>
                <button
                  onClick={() => handleAddNode('ADD_TAG')}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 flex items-center space-x-1 space-x-reverse"
                >
                  <Tag className="w-3.5 h-3.5 text-emerald-400" />
                  <span>افزودن برچسب</span>
                </button>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <button
                  onClick={handleSave}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 font-medium flex items-center space-x-1.5 space-x-reverse"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>ذخیره پیش‌نویس</span>
                </button>
                <button
                  onClick={() => selectedAuto && onPublishAutomation(selectedAuto.id)}
                  disabled={!selectedAuto || !validation.valid}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 space-x-reverse transition ${
                    validation.valid
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>انتشار رسمی نسخه v{selectedAuto.currentVersion.versionNo + 1}</span>
                </button>
              </div>
            </div>

            {/* Visual Node Graph Editor Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 min-h-[460px] relative overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
              <div className="space-y-4 max-w-xl mx-auto">
                {nodes.map((node, index) => {
                  const isSelected = selectedNodeId === node.id;
                  return (
                    <React.Fragment key={node.id}>
                      {/* Node Card */}
                      <div
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`p-4 rounded-2xl border transition cursor-pointer relative shadow-lg ${
                          isSelected
                            ? 'bg-slate-900 border-purple-500 ring-2 ring-purple-500/30'
                            : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2 space-x-reverse">
                            <span className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-300 text-xs font-bold flex items-center justify-center font-mono">
                              {index + 1}
                            </span>
                            <span className="text-xs font-bold text-white">{node.title}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {node.type}
                          </span>
                        </div>

                        {/* Node Content Summary */}
                        <div className="text-xs text-slate-300 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80">
                          {node.type === 'TRIGGER' && (
                            <p>
                              کلمات کلیدی: {node.config.keywords?.join(' ، ') || 'قیمت'}
                            </p>
                          )}
                          {node.type === 'REPLY_PUBLIC_COMMENT' && (
                            <p>پاسخ زیر پست: "{node.config.publicReplyText}"</p>
                          )}
                          {node.type === 'SEND_PRIVATE_REPLY' && (
                            <div>
                              <p>متن دایرکت: "{node.config.text}"</p>
                              {node.config.quickReplies && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {node.config.quickReplies.map((qr, i) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px]">
                                      🔘 {qr.title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          {node.type === 'ADD_TAG' && (
                            <p>افزودن برچسب: #{node.config.tagToAdd || 'لید_جدید'}</p>
                          )}
                        </div>
                      </div>

                      {/* Connective Connector Line */}
                      {index < nodes.length - 1 && (
                        <div className="flex justify-center py-1">
                          <div className="w-0.5 h-6 bg-gradient-to-b from-purple-500 to-indigo-500 relative">
                            <div className="w-2 h-2 rounded-full bg-indigo-400 absolute bottom-0 -left-0.75 animate-ping" />
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Test Simulation Logs Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-amber-300 flex items-center space-x-1.5 space-x-reverse">
                  <Sparkles className="w-4 h-4" />
                  <span>تست اجرای زنده سناریو در محیط Builder</span>
                </span>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <input
                    type="text"
                    value={testCommentText}
                    onChange={(e) => setTestCommentText(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 dir-rtl"
                    placeholder="متن کامنت ورودی..."
                  />
                  <button
                    onClick={handleRunSimulation}
                    className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center space-x-1 space-x-reverse"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>تست سناریو</span>
                  </button>
                </div>
              </div>

              {testLog.length > 0 && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
                  {testLog.map((log, i) => (
                    <p key={i}>{log}</p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Config Inspector Panel */}
          <div className="space-y-4">
            {/* Linter Validation Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-xs font-bold text-white mb-2 flex items-center space-x-1.5 space-x-reverse">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>بررسی ضوابط قوانین Meta Linter</span>
              </h3>

              {validation.errors.length > 0 ? (
                <div className="space-y-1 text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {validation.errors.map((err, i) => (
                    <p key={i}>❌ {err}</p>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 flex items-center space-x-1.5 space-x-reverse">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>سناریو تمام قوانین Meta و محدودیت‌های Quick Reply را رعایت می‌کند.</span>
                </div>
              )}
            </div>

            {/* Selected Node Properties Editor */}
            {selectedNode && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white">تنظیمات {selectedNode.title}</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {selectedNode.id}</p>
                  </div>
                  <button
                    onClick={() => {
                      setNodes(nodes.filter((n) => n.id !== selectedNode.id));
                      setSelectedNodeId(nodes[0]?.id || '');
                    }}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Properties Inputs depending on Node Type */}
                {selectedNode.type === 'TRIGGER' && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-slate-300 block">
                      کلمات کلیدی محرک (جداکننده با ویرگول)
                    </label>
                    <input
                      type="text"
                      value={selectedNode.config.keywords?.join(' ، ') || ''}
                      onChange={(e) =>
                        updateSelectedNodeConfig(
                          'keywords',
                          e.target.value.split('،').map((s) => s.trim())
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                {selectedNode.type === 'REPLY_PUBLIC_COMMENT' && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-slate-300 block">
                      متن پاسخ عمومی روی کامنت
                    </label>
                    <textarea
                      rows={3}
                      value={selectedNode.config.publicReplyText || ''}
                      onChange={(e) => updateSelectedNodeConfig('publicReplyText', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}

                {selectedNode.type === 'SEND_PRIVATE_REPLY' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-300 block">
                        متن پاسخ خصوصی دایرکت (Private Reply)
                      </label>
                      <textarea
                        rows={3}
                        value={selectedNode.config.text || ''}
                        onChange={(e) => updateSelectedNodeConfig('text', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    {/* Quick Replies Config */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300">
                          دکمه‌های پاسخ سریع (حداکثر ۱۳)
                        </span>
                        <button
                          onClick={addQuickReply}
                          className="text-[11px] text-purple-400 hover:text-purple-300 font-medium"
                        >
                          + افزودن دکمه
                        </button>
                      </div>

                      <div className="space-y-2">
                        {selectedNode.config.quickReplies?.map((qr, idx) => (
                          <div key={idx} className="flex items-center space-x-2 space-x-reverse">
                            <input
                              type="text"
                              value={qr.title}
                              onChange={(e) => {
                                const newQRs = [...(selectedNode.config.quickReplies || [])];
                                newQRs[idx].title = e.target.value;
                                updateSelectedNodeConfig('quickReplies', newQRs);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white"
                            />
                            <button
                              onClick={() => removeQuickReply(idx)}
                              className="text-rose-400 p-1 hover:bg-rose-500/10 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {selectedNode.type === 'ADD_TAG' && (
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-slate-300 block">
                      نام برچسب افزودنی
                    </label>
                    <input
                      type="text"
                      value={selectedNode.config.tagToAdd || ''}
                      onChange={(e) => updateSelectedNodeConfig('tagToAdd', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
