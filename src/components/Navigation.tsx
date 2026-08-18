import React from 'react';
import {
  LayoutDashboard,
  Workflow,
  FlaskConical,
  MessageSquare,
  Instagram,
  FormInput,
  ShoppingBag,
  ShieldAlert,
  Settings,
  Zap,
  CheckCircle2,
  LogOut,
  BrainCircuit,
} from 'lucide-react';
import { Workspace, InstagramAccount } from '../types';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  workspace: Workspace;
  instagramAccount: InstagramAccount | null;
  unreadCount: number;
  activeAutomationCount: number;
  onLogout: () => Promise<void>;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  workspace,
  instagramAccount: instagramAccountInput,
  unreadCount,
  activeAutomationCount,
  onLogout,
}) => {
  const instagramAccount = instagramAccountInput ?? ({
    id: 'not-connected',
    workspaceId: workspace.id,
    metaIgUserId: '',
    username: 'not-connected',
    displayName: 'Instagram متصل نیست',
    accountType: 'BUSINESS',
    authMode: 'instagram_login',
    graphHost: 'graph.instagram.com',
    graphVersion: 'v20.0',
    grantedScopes: [],
    status: 'disconnected',
    webhookStatus: 'pending',
    tokenExpiresAt: '',
    lastWebhookAt: '',
    lastTokenCheckAt: '',
    createdAt: new Date().toISOString(),
  } as InstagramAccount);
  const navItems = [
    { id: 'ai', label: 'دستیار هوشمند Gemini', icon: BrainCircuit },
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'automations', label: 'اتوماسیون‌ها و گراف سناریو', icon: Workflow, badge: '۳ فعال' },
    { id: 'webhook_studio', label: 'تست و شبیه‌ساز وب‌هوک', icon: FlaskConical, highlight: true },
    { id: 'inbox', label: 'صندوق پیام و CRM', icon: MessageSquare, badge: unreadCount > 0 ? `${unreadCount}` : undefined },
    { id: 'accounts', label: 'حساب‌های اینستاگرام', icon: Instagram },
    { id: 'forms', label: 'فرم‌های مکالمه‌ای', icon: FormInput },
    { id: 'products', label: 'ویترین محصولات', icon: ShoppingBag },
    { id: 'operations', label: 'عملیات و مدیریت خطا (DLQ)', icon: ShieldAlert },
    { id: 'settings', label: 'تنظیمات و اعضا', icon: Settings },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="flex items-center justify-between h-16 border-b border-slate-800/80">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-pink-600 via-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-900/40">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  InstaFlow
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                  Meta Official API
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">{workspace.name}</p>
            </div>
          </div>

          {/* Account Status Pill */}
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="hidden md:flex items-center space-x-3 space-x-reverse bg-slate-800/80 px-3.5 py-1.5 rounded-lg border border-slate-700/60">
              {instagramAccountInput ? (
                <>
              {instagramAccount.profilePicUrl && (
                <img
                  src={instagramAccount.profilePicUrl}
                  alt={instagramAccount.username}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-purple-500/30"
                  referrerPolicy="no-referrer"
                />
              )}
              <div className="text-right">
                <div className="flex items-center space-x-1.5 space-x-reverse">
                  <span className="text-xs font-semibold dir-ltr text-slate-200">
                    @{instagramAccount.username}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-[10px] text-slate-400">
                  Business Login | Webhook فعال
                </p>
              </div>
                </>
              ) : (
                <div className="text-right">
                  <p className="text-xs font-semibold text-amber-300">Instagram متصل نیست</p>
                  <p className="text-[10px] text-slate-400">برای شروع، اتصال رسمی Meta را انجام دهید</p>
                </div>
              )}
            </div>

            <button
              onClick={onLogout}
              title="خروج"
              className="p-2 rounded-lg border border-slate-700 text-slate-400 hover:text-rose-300 hover:border-rose-500/40 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentTab('accounts')}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-medium transition shadow-sm"
            >
              مدیریت OAuth
            </button>
          </div>
        </div>

        {/* Tab Links Navigation */}
        <nav className="flex items-center space-x-1 space-x-reverse overflow-x-auto no-scrollbar py-2 text-xs font-medium">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`flex items-center space-x-2 space-x-reverse px-3.5 py-2 rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 font-semibold'
                    : item.highlight
                    ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 border border-amber-500/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : ''}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive
                        ? 'bg-purple-500 text-white font-bold'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {item.id === 'automations' ? `${activeAutomationCount} فعال` : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
