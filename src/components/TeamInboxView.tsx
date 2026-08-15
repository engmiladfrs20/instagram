import React, { useState } from 'react';
import {
  MessageSquare,
  User,
  Clock,
  UserCheck,
  Send,
  Tag,
  Phone,
  Mail,
  Sparkles,
  ShieldAlert,
  Bot,
  UserX,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { Conversation, Message, Contact } from '../types';

interface TeamInboxViewProps {
  conversations: Conversation[];
  messages: Message[];
  onSendMessage: (conversationId: string, text: string) => Promise<void>;
  onToggleTakeover: (conversationId: string, currentMode: 'automation' | 'human') => Promise<void>;
}

export const TeamInboxView: React.FC<TeamInboxViewProps> = ({
  conversations,
  messages,
  onSendMessage,
  onToggleTakeover,
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string>(
    conversations[0]?.id || ''
  );
  const [replyText, setReplyText] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedConv = conversations.find((c) => c.id === selectedConvId) || conversations[0];
  const activeMessages = messages.filter((m) => m.conversationId === selectedConvId);
  const contact = selectedConv?.contact;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConv) return;
    await onSendMessage(selectedConv.id, replyText);
    setReplyText('');
  };

  const filteredConversations = conversations.filter((c) =>
    c.contact.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.contact.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl min-h-[640px] grid grid-cols-1 lg:grid-cols-12">
      {/* Left Conversations Sidebar List */}
      <div className="lg:col-span-4 border-l border-slate-800/80 flex flex-col bg-slate-950/60">
        {/* Search Bar & Header */}
        <div className="p-4 border-b border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2 space-x-reverse">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <span>صندوق پیام تیم (Team Inbox)</span>
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {conversations.length} مکالمه
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute top-2.5 right-3" />
            <input
              type="text"
              placeholder="جستجوی کاربر یا آیدی اینستاگرام..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="divide-y divide-slate-800/60 overflow-y-auto max-h-[560px]">
          {filteredConversations.map((conv) => {
            const isSelected = conv.id === selectedConvId;
            const isHuman = conv.mode === 'human';
            return (
              <div
                key={conv.id}
                onClick={() => setSelectedConvId(conv.id)}
                className={`p-3.5 cursor-pointer transition flex items-start space-x-3 space-x-reverse ${
                  isSelected
                    ? 'bg-purple-950/20 border-r-4 border-purple-500'
                    : 'hover:bg-slate-900/60'
                }`}
              >
                <img
                  src={
                    conv.contact.avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                  }
                  alt={conv.contact.displayName}
                  className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700"
                  referrerPolicy="no-referrer"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">
                      {conv.contact.displayName}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                        isHuman
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}
                    >
                      {isHuman ? 'اپراتور انسانی' : 'ربات اتوماسیون'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate mt-1">
                    @{conv.contact.username} • {conv.lastMessagePreview || 'مکالمه جدید'}
                  </p>

                  <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                    <span className="flex items-center space-x-1 space-x-reverse text-emerald-400">
                      <Clock className="w-3 h-3 ml-1" />
                      <span>پنجره ۲۴h فعال</span>
                    </span>
                    <span className="font-mono">
                      {new Date(conv.lastMessageAt).toLocaleTimeString('fa-IR')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Middle Conversation Chat Timeline */}
      <div className="lg:col-span-5 flex flex-col justify-between border-l border-slate-800/80 bg-slate-900/40">
        {/* Chat Header Control Bar */}
        {selectedConv && (
          <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
            <div className="flex items-center space-x-3 space-x-reverse">
              <img
                src={selectedConv.contact.avatarUrl}
                alt={selectedConv.contact.displayName}
                className="w-9 h-9 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <h3 className="text-xs font-bold text-white">{selectedConv.contact.displayName}</h3>
                  <span className="text-[10px] text-slate-400 dir-ltr font-mono">
                    @{selectedConv.contact.username}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {selectedConv.mode === 'human'
                    ? `تحویل به اپراتور: ${selectedConv.assignedUserName || 'علی رضایی'}`
                    : 'در حال مدیریت توسط اتوماسیون هوشمند'}
                </p>
              </div>
            </div>

            {/* Human Takeover Toggle Button */}
            <button
              onClick={() => onToggleTakeover(selectedConv.id, selectedConv.mode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center space-x-1.5 space-x-reverse ${
                selectedConv.mode === 'human'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {selectedConv.mode === 'human' ? (
                <>
                  <Bot className="w-3.5 h-3.5" />
                  <span>بازگشت به اتوماسیون</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>تحویل به اپراتور (Takeover)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Message Thread */}
        <div className="p-4 overflow-y-auto max-h-[420px] space-y-3">
          {activeMessages.map((msg) => {
            const isInbound = msg.direction === 'inbound';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs shadow-md ${
                    isInbound
                      ? 'bg-slate-800 text-slate-100 rounded-tr-none border border-slate-700/60'
                      : 'bg-purple-600 text-white rounded-tl-none'
                  }`}
                >
                  <p>{msg.textBody || msg.content.text}</p>

                  {/* Render Quick Replies if attached */}
                  {msg.content.quickReplies && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-purple-500/30">
                      {msg.content.quickReplies.map((qr, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-purple-800 text-white text-[10px] font-medium">
                          🔘 {qr.title}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1.5 flex items-center space-x-1 space-x-reverse ${
                      isInbound ? 'text-slate-400' : 'text-purple-200'
                    }`}
                  >
                    <span>
                      {msg.messageType === 'private_reply'
                        ? 'پاسخ خصوصی دایرکت'
                        : msg.messageType === 'public_comment_reply'
                        ? 'پاسخ عمومی کامنت'
                        : msg.policyBasis === 'human_agent_reply'
                        ? 'ارسال‌شده توسط اپراتور'
                        : 'پیام دایرکت'}
                    </span>
                    <span>•</span>
                    <span className="font-mono">{new Date(msg.createdAt).toLocaleTimeString('fa-IR')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Send Reply Box */}
        <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-900/80 flex items-center space-x-2 space-x-reverse">
          <input
            type="text"
            placeholder={
              selectedConv?.mode === 'human'
                ? 'پاسخ اپراتور انسان به کاربر...'
                : 'برای ارسال دستی ابتدا روی تحویل به اپراتور کلیک کنید...'
            }
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            disabled={selectedConv?.mode !== 'human'}
            className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-purple-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={selectedConv?.mode !== 'human' || !replyText.trim()}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1 space-x-reverse shadow-md"
          >
            <Send className="w-3.5 h-3.5" />
            <span>ارسال</span>
          </button>
        </form>
      </div>

      {/* Right Contact 360 Profile Sidebar */}
      {contact && (
        <div className="lg:col-span-3 p-5 bg-slate-950/80 space-y-5 text-xs">
          <div className="text-center pb-4 border-b border-slate-800/80">
            <img
              src={contact.avatarUrl}
              alt={contact.displayName}
              className="w-16 h-16 rounded-full object-cover mx-auto ring-2 ring-purple-500/40"
              referrerPolicy="no-referrer"
            />
            <h3 className="font-bold text-white text-sm mt-2">{contact.displayName}</h3>
            <p className="text-slate-400 text-[11px] font-mono">@{contact.username}</p>

            <div className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-2 font-medium">
              <Sparkles className="w-3 h-3 ml-1" />
              <span>امتیاز لید: {contact.leadScore}/100</span>
            </div>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <span className="font-bold text-slate-300 block">اطلاعات تماس لید</span>

            <div className="flex items-center space-x-2 space-x-reverse text-slate-300">
              <Phone className="w-3.5 h-3.5 text-purple-400" />
              <span className="dir-ltr font-mono">{contact.phone || 'ثبت نشده'}</span>
            </div>

            <div className="flex items-center space-x-2 space-x-reverse text-slate-300">
              <Mail className="w-3.5 h-3.5 text-purple-400" />
              <span className="dir-ltr font-mono truncate">{contact.email || 'ثبت نشده'}</span>
            </div>
          </div>

          {/* Tags List */}
          <div className="space-y-2 pt-3 border-t border-slate-800">
            <span className="font-bold text-slate-300 block">برچسب‌ها (Tags)</span>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-lg bg-purple-950/80 border border-purple-800/80 text-purple-300 text-[10px]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Messaging Window SLA Indicator */}
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
            <span className="text-[10px] text-slate-400 block">مهلت پاسخگویی پنجره ۲۴ ساعته Meta:</span>
            <span className="text-emerald-400 font-bold font-mono text-xs">
              ۱۸ ساعت و ۲۵ دقیقه باقی‌مانده
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
