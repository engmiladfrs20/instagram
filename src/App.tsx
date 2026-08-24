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
import { AuthView } from './components/AuthView';
import { AISettingsView } from './components/AISettingsView';

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
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authUser, setAuthUser] = useState<any>(null);

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
  const [aiSettings, setAiSettings] = useState<any | null>(null);
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const requestJson = async <T = any>(input: RequestInfo | URL, init?: RequestInit): Promise<T> => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(input, { ...init, signal: init?.signal || controller.signal });
      const contentType = response.headers.get('content-type') || '';
      const data: any = await response.json().catch(() => ({}));
      const isApiRequest = String(input).includes('/api/');
      if (!response.ok || (isApiRequest && !contentType.includes('application/json'))) {
        const suffix = data.code ? ` (Meta code ${data.code})` : '';
        const error = new Error(`${data.error || `Request failed (${response.status})`}${suffix}`) as Error & { responseData?: any };
        error.responseData = data;
        throw error;
      }
      return data;
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') {
        throw new Error('پاسخ Worker در زمان مقرر دریافت نشد؛ اتصال شبکه یا نشست ورود را بررسی کنید.');
      }
      throw requestError;
    } finally {
      window.clearTimeout(timeout);
    }
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

      try {
        const [aiData, knowledgeData] = await Promise.all([
          requestJson('/api/v1/ai/settings'),
          requestJson('/api/v1/ai/knowledge'),
        ]);
        setAiSettings(aiData.settings || null);
        setKnowledgeItems(knowledgeData.items || []);
      } catch (aiError) {
        console.warn('AI settings are not available in this environment:', aiError);
      }

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
    requestJson('/api/v1/auth/me')
      .then((data) => setAuthUser(data.user))
      .catch(() => {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          setAuthUser({ id: 'local', displayName: 'Local developer', email: 'local@example.com' });
        } else {
          setAuthUser(null);
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (authUser) fetchData();
  }, [authUser?.userId, authUser?.id]);

  const handleAuthenticated = (payload: any) => {
    setAuthUser(payload.user);
    setLoading(true);
  };

  const handleLogout = async () => {
    try {
      await requestJson('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setAuthUser(null);
      setWorkspace(null);
      setInstagramAccount(null);
    }
  };

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

  const handleDeleteAutomation = async (autoId: string) => {
    try {
      await requestJson(`/api/v1/automations/${autoId}`, { method: 'DELETE' });
      setAutomations((prev) => prev.filter((automation) => automation.id !== autoId));
    } catch (deleteError) {
      console.error(deleteError);
      throw deleteError;
    }
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
      const clientRequestId = crypto.randomUUID();
      const data = await requestJson(`/api/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': clientRequestId },
        body: JSON.stringify({ text, clientRequestId }),
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

  const handleCreateForm = async () => {
    const data = await requestJson('/api/v1/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'فرم جدید دایرکت',
        description: 'فرم کوتاه برای دریافت اطلاعات اولیه مخاطب',
        fields: [
          { fieldKey: 'full_name', label: 'نام و نام خانوادگی', fieldType: 'text', prompt: 'لطفاً نام و نام خانوادگی‌تان را وارد کنید.', required: true },
          { fieldKey: 'phone_number', label: 'شماره تماس', fieldType: 'phone', prompt: 'شماره تماس خود را وارد کنید.', required: true },
        ],
      }),
    });
    setForms((previous) => [data.form, ...previous]);
    return data.form as Form;
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

  const handleStartInstagramOAuth = async () => {
    const data = await requestJson('/api/v1/instagram/oauth/start');
    return data.authorizationUrl as string;
  };

  const handleSaveAiSettings = async (settings: any) => {
    const data = await requestJson('/api/v1/ai/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setAiSettings(data.settings);
  };

  const handleAddKnowledge = async (title: string, content: string) => {
    const data = await requestJson('/api/v1/ai/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });
    setKnowledgeItems((items) => [data.item, ...items]);
  };

  const handleDeleteKnowledge = async (id: string) => {
    await requestJson(`/api/v1/ai/knowledge/${id}`, { method: 'DELETE' });
    setKnowledgeItems((items) => items.filter((item) => item.id !== id));
  };

  const handleAiTest = async (text: string) => {
    const data = await requestJson('/api/v1/ai/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, channel: 'dm' }),
    });
    return data.answer || '';
  };

  const handleCleanupTestData = async () => {
    await requestJson('/api/v1/admin/cleanup-test-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'RESET_TEST_DATA', removeAutomations: true }),
    });
    await fetchData();
  };

  if (authLoading) {
    return <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">در حال آماده‌سازی ورود...</div>;
  }

  if (!authUser) {
    return <AuthView requestJson={requestJson} onAuthenticated={handleAuthenticated} />;
  }

  if (error && (!workspace || !analytics)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans">
        <div className="text-center space-y-4 max-w-sm px-6">
          <p className="text-sm text-rose-200">{error}</p>
          <button onClick={fetchData} className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white">تلاش دوباره</button>
        </div>
      </div>
    );
  }

  if (loading || !workspace || !analytics) {
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
    <div className="app-shell min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white dir-rtl">
      <Navigation
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        workspace={workspace}
        instagramAccount={instagramAccount}
        unreadCount={unreadCount}
        activeAutomationCount={automations.filter((automation) => automation.status === 'active').length}
        onLogout={handleLogout}
      />

      <div className="app-main">
        <main className="app-content">
          {error && <div className="app-error-alert mb-4">{error}</div>}
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
                onDeleteAutomation={handleDeleteAutomation}
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
                onStartOAuth={handleStartInstagramOAuth}
              />
            )}

            {currentTab === 'forms' && (
              <FormsView forms={forms} submissions={submissions} onCreateForm={handleCreateForm} />
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

            {currentTab === 'ai' && (
              <AISettingsView
                settings={aiSettings}
                knowledgeItems={knowledgeItems}
                onSaveSettings={handleSaveAiSettings}
                onAddKnowledge={handleAddKnowledge}
                onDeleteKnowledge={handleDeleteKnowledge}
                onTest={handleAiTest}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsView workspace={workspace} members={members} onCleanup={handleCleanupTestData} />
            )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
