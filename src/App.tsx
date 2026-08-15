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

  // Fetch initial workspace data from backend
  const fetchData = async () => {
    try {
      const [wsRes, autoRes, convRes, formsRes, prodRes, analyticsRes] = await Promise.all([
        fetch('/api/v1/workspace'),
        fetch('/api/v1/automations'),
        fetch('/api/v1/conversations'),
        fetch('/api/v1/forms'),
        fetch('/api/v1/products'),
        fetch('/api/v1/analytics'),
      ]);

      const wsData = await wsRes.json();
      const autoData = await autoRes.json();
      const convData = await convRes.json();
      const formsData = await formsRes.json();
      const prodData = await prodRes.json();
      const analyticsData = await analyticsRes.json();

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

      // Fetch messages for first conversation
      if (convData.conversations?.[0]?.id) {
        const msgsRes = await fetch(`/api/v1/conversations/${convData.conversations[0].id}/messages`);
        const msgsData = await msgsRes.json();
        setMessages(msgsData.messages || []);
      }
    } catch (e) {
      console.error('Failed to fetch workspace data:', e);
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
      const res = await fetch(`/api/v1/automations/${updatedAuto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedAuto),
      });
      const data = await res.json();
      setAutomations((prev) =>
        prev.map((a) => (a.id === data.automation.id ? data.automation : a))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Handler: Publish Automation
  const handlePublishAutomation = async (autoId: string) => {
    try {
      const res = await fetch(`/api/v1/automations/${autoId}/publish`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.automation) {
        setAutomations((prev) =>
          prev.map((a) => (a.id === data.automation.id ? data.automation : a))
        );
        fetchData();
      }
    } catch (e) {
      console.error(e);
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
    const res = await fetch('/api/v1/webhooks/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    fetchData();
    return data;
  };

  // Handler: Send Human Agent Reply Message
  const handleSendMessage = async (conversationId: string, text: string) => {
    try {
      const res = await fetch(`/api/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, data.message]);
    } catch (e) {
      console.error(e);
    }
  };

  // Handler: Toggle Human Takeover Mode
  const handleToggleTakeover = async (conversationId: string, currentMode: 'automation' | 'human') => {
    try {
      const newMode = currentMode === 'human' ? 'automation' : 'human';
      const res = await fetch(`/api/v1/conversations/${conversationId}/takeover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode }),
      });
      const data = await res.json();
      setConversations((prev) =>
        prev.map((c) => (c.id === data.conversation.id ? data.conversation : c))
      );
    } catch (e) {
      console.error(e);
    }
  };

  // Handler: Add New Product
  const handleAddProduct = async (prod: Partial<Product>) => {
    try {
      const res = await fetch('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prod),
      });
      const data = await res.json();
      setProducts((prev) => [data.product, ...prev]);
    } catch (e) {
      console.error(e);
    }
  };

  // Handler: Replay DLQ Item
  const handleReplayDLQ = async (id: string) => {
    try {
      await fetch(`/api/v1/dlq/${id}/replay`, { method: 'POST' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

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
      />

      {/* Main Body View Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                onReauthorize={fetchData}
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
