import React, { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Clock3,
  Mail,
  MessageSquare,
  Phone,
  Search,
  Send,
  Sparkles,
  Tag,
  UserCheck,
  UserRound,
} from 'lucide-react';
import { Conversation, Contact, Message } from '../types';

interface TeamInboxViewProps {
  conversations: Conversation[];
  messages: Message[];
  onSendMessage: (conversationId: string, text: string) => Promise<void>;
  onToggleTakeover: (conversationId: string, currentMode: 'automation' | 'human') => Promise<void>;
}

function initials(contact?: Contact): string {
  if (!contact) return 'IG';
  const value = contact.displayName || contact.username || 'IG';
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'IG';
}

function contactDisplayName(contact?: Contact): string {
  const displayName = contact?.displayName?.trim();
  const username = contact?.username?.trim();
  if (displayName && !/^Instagram user(?:\s|$)/i.test(displayName) && !/^user_[\w-]+$/i.test(displayName)) return displayName;
  if (username && !/^user_[\w-]+$/i.test(username)) return username;
  return 'مخاطب اینستاگرام';
}

function contactHandle(contact?: Contact): string {
  const username = contact?.username?.trim();
  return username && !/^user_[\w-]+$/i.test(username) ? `@${username.replace(/^@/, '')}` : 'حساب اینستاگرام';
}

function ContactAvatar({ contact, size = 'md' }: { contact?: Contact; size?: 'sm' | 'md' | 'lg' }) {
  return contact?.avatarUrl ? (
    <img className={`inbox-avatar inbox-avatar-${size}`} src={contact.avatarUrl} alt={contact.displayName} referrerPolicy="no-referrer" />
  ) : (
    <span className={`inbox-avatar inbox-avatar-${size} inbox-avatar-initials`} aria-hidden="true">{initials(contact)}</span>
  );
}

function messageText(message: Message): string {
  if (message.textBody?.trim()) return message.textBody;
  if (message.content.text?.trim()) return message.content.text;
  if (message.content.mediaType) return `رسانهٔ ${message.content.mediaType === 'image' ? 'تصویری' : message.content.mediaType === 'video' ? 'ویدئویی' : 'صوتی'}`;
  if (message.content.quickReplies?.length) return message.content.quickReplies.map((item) => item.title).join('، ');
  if (message.content.buttons?.length) return message.content.buttons.map((item) => item.title).join('، ');
  if (message.messageType === 'comment') return message.content.commentText || 'کامنت اینستاگرام';
  return 'پیام اینستاگرام بدون متن';
}

function messageKind(message: Message): string {
  if (message.messageType === 'private_reply') return 'پاسخ خصوصی دایرکت';
  if (message.messageType === 'public_comment_reply') return 'پاسخ کامنت';
  if (message.policyBasis === 'human_agent_reply') return 'ارسال توسط اپراتور';
  if (message.direction === 'outbound') return 'پاسخ اتوماسیون';
  return 'پیام دایرکت';
}

export const TeamInboxView: React.FC<TeamInboxViewProps> = ({
  conversations,
  messages,
  onSendMessage,
  onToggleTakeover,
}) => {
  const [selectedConvId, setSelectedConvId] = useState(conversations[0]?.id || '');
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!selectedConvId && conversations[0]) setSelectedConvId(conversations[0].id);
    if (selectedConvId && !conversations.some((conversation) => conversation.id === selectedConvId)) {
      setSelectedConvId(conversations[0]?.id || '');
    }
  }, [conversations, selectedConvId]);

  const selectedConv = conversations.find((conversation) => conversation.id === selectedConvId) || conversations[0];
  const contact = selectedConv?.contact;
  const activeMessages = useMemo(
    () => messages.filter((message) => message.conversationId === selectedConv?.id).sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)),
    [messages, selectedConv?.id],
  );
  const latestMessages = useMemo(() => {
    const byConversation = new Map<string, Message>();
    for (const message of messages) {
      const current = byConversation.get(message.conversationId);
      if (!current || Date.parse(message.createdAt) > Date.parse(current.createdAt)) byConversation.set(message.conversationId, message);
    }
    return byConversation;
  }, [messages]);
  const conversationPreview = (conversation: Conversation) => conversation.lastMessagePreview?.trim() || (latestMessages.get(conversation.id) ? messageText(latestMessages.get(conversation.id)!) : 'مکالمهٔ جدید');
  const filteredConversations = conversations.filter((conversation) => {
    const query = searchQuery.trim().toLocaleLowerCase('fa-IR');
    if (!query) return true;
    return `${conversation.contact.displayName} ${conversation.contact.username}`.toLocaleLowerCase('fa-IR').includes(query);
  });

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedConv || !replyText.trim() || sending) return;
    setSending(true);
    try {
      await onSendMessage(selectedConv.id, replyText.trim());
      setReplyText('');
    } finally {
      setSending(false);
    }
  };

  if (!conversations.length) {
    return (
      <section className="inbox-empty surface-card" aria-label="صندوق پیام">
        <MessageSquare size={32} />
        <h2>صندوق پیام خالی است</h2>
        <p>مکالمه‌ها مستقیماً از Instagram Conversations API یا Webhook واقعی نمایش داده می‌شوند.</p>
        <span>هنوز هیچ مکالمهٔ واقعی برای این حساب دریافت نشده است.</span>
      </section>
    );
  }

  return (
    <section className="team-inbox-shell surface-card" dir="rtl">
      <aside className="inbox-conversations-panel">
        <div className="inbox-panel-heading">
          <div>
            <span className="inbox-eyebrow"><Sparkles size={13} /> دادهٔ زندهٔ اینستاگرام</span>
            <h2>صندوق پیام</h2>
          </div>
          <span className="inbox-count">{conversations.length.toLocaleString('fa-IR')} مکالمه</span>
        </div>
        <label className="inbox-search">
          <Search size={16} />
          <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="جست‌وجوی نام کاربر..." aria-label="جست‌وجوی مکالمه" />
        </label>
        <div className="inbox-conversation-list">
          {filteredConversations.length ? filteredConversations.map((conversation) => {
            const selected = conversation.id === selectedConv?.id;
            return (
              <button type="button" className={`inbox-conversation-row ${selected ? 'is-selected' : ''}`} key={conversation.id} onClick={() => setSelectedConvId(conversation.id)} aria-pressed={selected}>
                <ContactAvatar contact={conversation.contact} />
                <span className="inbox-conversation-copy">
                  <span className="inbox-conversation-title"><strong>{contactDisplayName(conversation.contact)}</strong><small>{conversation.mode === 'human' ? 'اپراتور' : 'اتوماسیون'}</small></span>
                  <span className="inbox-conversation-preview">{contactHandle(conversation.contact)} · {conversationPreview(conversation)}</span>
                  <span className="inbox-conversation-meta"><span><Clock3 size={11} /> پنجرهٔ پاسخ فعال</span><time>{new Date(conversation.lastMessageAt).toLocaleTimeString('fa-IR')}</time></span>
                </span>
              </button>
            );
          }) : <div className="inbox-list-empty">نتیجه‌ای برای جست‌وجو پیدا نشد.</div>}
        </div>
      </aside>

      <div className="inbox-chat-panel">
        {selectedConv && (
          <>
            <header className="inbox-chat-header">
              <div className="inbox-person">
                <ContactAvatar contact={selectedConv.contact} size="sm" />
                <div><strong>{contactDisplayName(selectedConv.contact)}</strong><span>{contactHandle(selectedConv.contact)}</span></div>
              </div>
              <button type="button" className={`inbox-takeover ${selectedConv.mode === 'human' ? 'is-human' : ''}`} onClick={() => onToggleTakeover(selectedConv.id, selectedConv.mode)}>
                {selectedConv.mode === 'human' ? <><Bot size={15} /> بازگشت به ربات</> : <><UserCheck size={15} /> تحویل به اپراتور</>}
              </button>
            </header>
            <div className="inbox-message-list">
              {activeMessages.length ? activeMessages.map((message) => {
                const inbound = message.direction === 'inbound';
                return (
                  <div className={`inbox-message-row ${inbound ? 'is-inbound' : 'is-outbound'}`} key={message.id}>
                    <div className="inbox-message-bubble">
                      <p>{messageText(message)}</p>
                      {message.content.quickReplies?.length ? <div className="inbox-message-actions">{message.content.quickReplies.map((item) => <span key={item.payload}>{item.title}</span>)}</div> : null}
                      {message.content.buttons?.length ? <div className="inbox-message-actions">{message.content.buttons.map((item) => <span key={item.payload || item.title}>{item.title}</span>)}</div> : null}
                      <small>{messageKind(message)} · {new Date(message.createdAt).toLocaleTimeString('fa-IR')}</small>
                    </div>
                  </div>
                );
              }) : <div className="inbox-thread-empty"><MessageSquare size={26} /><strong>هنوز پیامی برای این مکالمه ثبت نشده</strong><span>پیام‌های جدید پس از دریافت از Meta اینجا نمایش داده می‌شوند.</span></div>}
            </div>
            <form className="inbox-reply-form" onSubmit={handleSend}>
              <input value={replyText} onChange={(event) => setReplyText(event.target.value)} disabled={selectedConv.mode !== 'human' || sending} placeholder={selectedConv.mode === 'human' ? 'پاسخ اپراتور را بنویسید...' : 'برای ارسال دستی، مکالمه را به اپراتور بسپارید'} />
              <button type="submit" disabled={selectedConv.mode !== 'human' || !replyText.trim() || sending} aria-label="ارسال پاسخ"><Send size={16} /> ارسال</button>
            </form>
          </>
        )}
      </div>

      {contact && <aside className="inbox-contact-panel">
        <div className="inbox-contact-header"><ContactAvatar contact={contact} size="lg" /><strong>{contactDisplayName(contact)}</strong><span>{contactHandle(contact)}</span><em><Sparkles size={12} /> امتیاز لید: {contact.leadScore}/100</em></div>
        <div className="inbox-contact-section"><h3>اطلاعات تماس</h3><p><Phone size={14} /> {contact.phone || 'ثبت نشده'}</p><p><Mail size={14} /> {contact.email || 'ثبت نشده'}</p></div>
        <div className="inbox-contact-section"><h3><Tag size={14} /> برچسب‌ها</h3><div className="inbox-tags">{contact.tags.length ? contact.tags.map((tag) => <span key={tag}>#{tag}</span>) : <small>بدون برچسب</small>}</div></div>
        <div className="inbox-contact-window"><strong>پنجرهٔ پاسخ Meta</strong><span>{Date.parse(selectedConv?.standardWindowOpenUntil || '') > Date.now() ? 'فعال' : 'منقضی شده'}</span></div>
      </aside>}
    </section>
  );
};
