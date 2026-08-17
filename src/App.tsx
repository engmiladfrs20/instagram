import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { AutomationsView } from './components/AutomationsView';
import { WebhookStudioView } from './components/WebhookStudioView';
import { TeamInboxView } from './components/TeamInboxView';
import { InstagramAccountsView } from './components/InstagramAccountsView';
import { FormsView } from './components/FormsView';
import { ProductsView } from './components/ProductsView';
import { OperationsView } from './components/OperationsView';
import { SettingsView } from './components/SettingsView';

import {
  Workspace,
  WorkspaceMember,
  InstagramAccount,
  Automation,
  Conversation,
  Message,
  Form,
  FormSubmission,
  Product,
  AnalyticsOverview,
  DLQItem,
  AuditLog,
  WebhookEvent,
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [loading, setLoading] = useState<boolean>(true);

  // App State
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [instagramAccount, setInstagramAccount] = useState<InstagramAccount | null>(null);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [dlqItems, setDlqItems] = useState<DLQItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const requestJson = async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await fetch(input, init);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const suffix = data.code ? ` (Meta code ${data.code})` : '';
      const error = new Error(`${data.error || `Request failed (${response.status})`}${suffix}`) as Error & { responseData?: any };
      error.responseData = data;
      throw error;
    }
    return data;
  };

  // Fetch initial workspace data from backend
  const fetchData = async () => {
    setError(null);
    try {
      const [wsData, autoData, convData, formsData, prodData, analyticsData] = await Promise.all([
        requestJson('/api/v1/workspace'),
        requestJson('/api/v1/automations'),
        requestJson('/api/v1/conversations'),
        requestJson('/api/v1/forms'),
        requestJson('/api/v1/products'),
        requestJson('/api/v1/analytics'),
      ]);

      setWorkspace(wsData.workspace);
      setMembers(wsData.members);
      setInstagramAccount(wsData.instagramAccount);
      setAutomations(autoData.automations || []);
      setConversations(convData.conversations || []);
      setForms(formsData.forms || []);
      setSubmissions(formsData.submissions || []);
      setProducts(prodData.products || []);
      setAnalytics(analyticsData.analytics);
      setAuditLogs(analyticsData.auditLogs || []);
      setDlqItems(analyticsData.dlqItems || []);
      setWebhookEvents(analyticsData.webhookEvents || []);

      const messageResponses = await Promise.all(
        (convData.conversations || []).map((conversation: Conversation) =>
          requestJson(`/api/v1/conversations/${conversation.id}/messages`)
        )
      );
      setMessages(messageResponses.flatMap((data: { messages?: Message[] }) => data.messages || []));
    } catch (e) {
      console.error('Failed to fetch workspace data:', e);
      setError(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات سامانه');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handler: Save Automation Changes
  const handleSaveAutomation = async (updatedAuto: Automation) => {
    try {
      const data = await requestJson(`/api/v1/automations/${updatedAuto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAuto),
      });
      setAutomations((prev) =>
        prev.map((a) => (a.id === data.automation.id ? data.automation : a))
      );
      return data.automation;
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'ذخیره اتوماسیون ناموفق بود');
      throw e;
    }
  };

  const handleCreateAutomation = async () => {
    const data = await requestJson('/api/v1/automations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'اتوماسیون جدید', keywords: ['قیمت'] }),
    });
    setAutomations((prev) => [data.automation, ...prev]);
    return data.automation as Automation;
  };

  // Handler: Publish Automation
  const handlePublishAutomation = async (autoId: string) => {
    try {
      const data = await requestJson(`/api/v1/automations/${autoId}/publish`, {
        method: 'POST',
      });
      if (data.automation) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === data.automation.id ? data.automation : a))
        );
        await fetchData();
      }
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'انتشار اتوماسیون ناموفق بود');
    }
  };

  // Handler: Simulate Webhook Payload
  const handleSimulateWebhook = async (params: {
    eventType: string;
    text: string;
    username: string;
    isExpiredComment?: boolean;
    isDuplicate?: boolean;
  }) => {
    const data = await requestJson('/api/v1/webhooks/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    await fetchData();
    return data;
  };

  // Handler: Send Human Agent Reply Message
  const handleSendMessage = async (conversationId: string, text: string) => {
    try {
      const data = await requestJson(`/api/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (data.message) setMessages((prev) => [...prev, data.message]);
      if (data.conversation) setConversations((prev) => prev.map((conversation) =>
        conversation.id === data.conversation.id ? data.conversation : conversation
      ));
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'ارسال پیام ناموفق بود');
    }
  };

  // Handler: Toggle Human Takeover Mode
  const handleToggleTakeover = async (conversationId: string, currentMode: 'automation' | 'human') => {
    try {
      const newMode = currentMode === 'human' ? 'automation' : 'human';
      const data = await requestJson(`/api/v1/conversations/${conversationId}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === data.conversation.id ? data.conversation : c))
      );
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'تغییر حالت گفتگو ناموفق بود');
    }
  };

  // Handler: Add New Product
  const handleAddProduct = async (prod: Partial<Product>) => {
    try {
      const data = await requestJson('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod),
      });
      setProducts((prev) => [data.product, ...prev]);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'ثبت محصول ناموفق بود');
    }
  };

  // Handler: Replay DLQ Item
  const handleReplayDLQ = async (id: string) => {
    try {
      await requestJson(`/api/v1/dlq/${id}/replay`, { method: 'POST' });
      await fetchData();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'بازپخش خطا ناموفق بود');
    }
  };

  const handleVerifyInstagram = async () => {
    try {
      const data = await requestJson('/api/v1/instagram/verify', { method: 'POST' });
      setInstagramAccount(data.instagramAccount);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'اتصال اینستاگرام ناموفق بود');
      const responseData = (e as Error & { responseData?: { instagramAccount?: InstagramAccount } }).responseData;
      if (responseData?.instagramAccount) setInstagramAccount(responseData.instagramAccount);
      throw e;
    }
  };

  if (error && (!workspace || !instagramAccount || !analytics)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4 max-w-sm px-6">
          <p className="text-sm text-rose-200">{error}</p>
          <button onClick={fetchData} className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white">تلاش دوباره</button>
        </div>
      </div>
    );
  }

  if (loading || !workspace || !instagramAccount || !analytics) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 animate-spin mx-auto flex items-center justify-center">
            <span className="text-white font-bold text-xl">⚡</span>
          </div>
          <p className="text-xs text-slate-400 font-medium dir-rtl">در حال بارگذاری سامانه اتوماسیون اینستاگرام...</p>
        </div>
      </div>
    );
  }

  const unreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white dir-rtl">
      {/* Top Header & Navigation Bar */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        workspace={workspace}
        instagramAccount={instagramAccount}
        unreadCount={unreadCount}
        activeAutomationCount={automations.filter((automation) => automation.status === 'active').length}
      />

      {/* Main Body View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">{error}</div>}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {currentTab === 'dashboard' && (
              <DashboardView
                analytics={analytics}
                recentWebhooks={webhookEvents}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'automations' && (
              <AutomationsView
                automations={automations}
                onSaveAutomation={handleSaveAutomation}
                onPublishAutomation={handlePublishAutomation}
                onCreateAutomation={handleCreateAutomation}
              />
            )}

            {currentTab === 'webhook_studio' && (
              <WebhookStudioView
                webhookEvents={webhookEvents}
                onSimulateWebhook={handleSimulateWebhook}
              />
            )}

            {currentTab === 'inbox' && (
              <TeamInboxView
                conversations={conversations}
                messages={messages}
                onSendMessage={handleSendMessage}
                onToggleTakeover={handleToggleTakeover}
              />
            )}

            {currentTab === 'accounts' && (
              <InstagramAccountsView
                instagramAccount={instagramAccount}
                onReauthorize={handleVerifyInstagram}
              />
            )}

            {currentTab === 'forms' && (
              <FormsView forms={forms} submissions={submissions} />
            )}

            {currentTab === 'products' && (
              <ProductsView products={products} onAddProduct={handleAddProduct} />
            )}

            {currentTab === 'operations' && (
              <OperationsView
                dlqItems={dlqItems}
                auditLogs={auditLogs}
                onReplayDLQ={handleReplayDLQ}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView workspace={workspace} members={members} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
