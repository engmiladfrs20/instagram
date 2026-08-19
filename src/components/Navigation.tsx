import React, { useMemo, useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  FlaskConical,
  FormInput,
  Instagram,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { Workspace, InstagramAccount } from '../types';
import { ThemeControls } from './ThemeControls';

interface NavigationProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  workspace: Workspace;
  instagramAccount: InstagramAccount | null;
  unreadCount: number;
  activeAutomationCount: number;
  onLogout: () => Promise<void>;
}

interface MenuItem {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  badge?: 'unread' | 'active';
  highlight?: boolean;
}

interface MenuSection {
  label: string;
  items: MenuItem[];
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  setCurrentTab,
  workspace,
  instagramAccount,
  unreadCount,
  activeAutomationCount,
  onLogout,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuSections: MenuSection[] = useMemo(() => [
    {
      label: 'نمای کلی',
      items: [
        { id: 'dashboard', label: 'داشبورد', description: 'تصویر زنده کسب‌وکار', icon: LayoutDashboard },
        { id: 'ai', label: 'دستیار هوشمند Gemini', description: 'پاسخ‌گویی با هوش مصنوعی', icon: BrainCircuit },
      ],
    },
    {
      label: 'اتوماسیون و تعامل',
      items: [
        { id: 'automations', label: 'اتوماسیون‌ها و سناریوها', description: `${activeAutomationCount} سناریوی فعال`, icon: Workflow, badge: 'active' },
        { id: 'inbox', label: 'صندوق پیام و CRM', description: 'مدیریت مکالمه‌ها', icon: MessageSquare, badge: unreadCount > 0 ? 'unread' : undefined },
        { id: 'webhook_studio', label: 'تست و شبیه‌ساز وب‌هوک', description: 'آزمون اتصال Meta', icon: FlaskConical, highlight: true },
      ],
    },
    {
      label: 'محتوا و کانال‌ها',
      items: [
        { id: 'accounts', label: 'حساب‌های اینستاگرام', description: 'اتصال رسمی Meta', icon: Instagram },
        { id: 'forms', label: 'فرم‌های مکالمه‌ای', description: 'جمع‌آوری اطلاعات لید', icon: FormInput },
        { id: 'products', label: 'ویترین محصولات', description: 'کاتالوگ و پیشنهادها', icon: ShoppingBag },
      ],
    },
    {
      label: 'مدیریت سیستم',
      items: [
        { id: 'operations', label: 'عملیات و خطاها', description: 'DLQ و گزارش رویدادها', icon: ShieldAlert },
        { id: 'settings', label: 'تنظیمات و اعضا', description: 'Workspace و دسترسی‌ها', icon: Settings },
      ],
    },
  ], [activeAutomationCount, unreadCount]);

  const allItems = menuSections.flatMap((section) => section.items);
  const currentItem = allItems.find((item) => item.id === currentTab) || allItems[0];
  const connected = instagramAccount?.status === 'connected';

  const navigate = (tab: string) => {
    setCurrentTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      <aside className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="ناوبری اصلی">
        <div className="app-sidebar-inner">
          <div className="sidebar-brand-row">
            <div className="sidebar-brand-mark" aria-hidden="true"><Zap size={21} fill="currentColor" /></div>
            <div className="sidebar-brand-copy">
              <strong>InstaFlow</strong>
              <span>Meta automation suite</span>
            </div>
            <button type="button" className="sidebar-close d-lg-none" onClick={() => setMobileOpen(false)} aria-label="بستن منو">
              <X size={18} />
            </button>
          </div>

          <div className={`sidebar-account-card ${connected ? 'is-connected' : ''}`}>
            <div className="sidebar-account-avatar">
              {instagramAccount?.profilePicUrl ? (
                <img src={instagramAccount.profilePicUrl} alt={instagramAccount.username} referrerPolicy="no-referrer" />
              ) : <Instagram size={19} />}
            </div>
            <div className="sidebar-account-copy">
              <div className="sidebar-account-name">{connected ? `@${instagramAccount.username}` : 'اکانت متصل نیست'}</div>
              <div className="sidebar-account-meta"><span className={`account-status-dot ${connected ? 'is-online' : ''}`} />{connected ? 'Webhook فعال' : 'اتصال رسمی Meta'}</div>
            </div>
            <button type="button" className="sidebar-account-arrow" onClick={() => navigate('accounts')} aria-label="مدیریت حساب اینستاگرام">
              <ChevronLeft size={16} />
            </button>
          </div>

          <nav className="sidebar-navigation">
            {menuSections.map((section) => (
              <div className="sidebar-section" key={section.label}>
                <div className="sidebar-section-label">{section.label}</div>
                <div className="sidebar-section-items">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentTab === item.id;
                    const badgeValue = item.badge === 'active' ? activeAutomationCount : unreadCount;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        className={`sidebar-nav-item ${isActive ? 'is-active' : ''} ${item.highlight ? 'is-highlighted' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                      >
                        <span className="sidebar-nav-icon"><Icon size={17} strokeWidth={isActive ? 2.4 : 2} /></span>
                        <span className="sidebar-nav-copy">
                          <span className="sidebar-nav-label">{item.label}</span>
                          <span className="sidebar-nav-description">{item.description}</span>
                        </span>
                        {item.badge && badgeValue > 0 && <span className="sidebar-nav-badge">{badgeValue}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="sidebar-bottom mt-auto">
            <div className="sidebar-health-card">
              <span className="sidebar-health-icon"><Sparkles size={15} /></span>
              <div>
                <strong>سامانه پایدار است</strong>
                <span>آماده پردازش پیام‌ها</span>
              </div>
              <span className="sidebar-health-pulse" />
            </div>
            <div className="sidebar-workspace-label"><span>Workspace</span><strong>{workspace.name}</strong></div>
            <button type="button" className="sidebar-logout" onClick={onLogout}>
              <LogOut size={16} />
              خروج امن از حساب
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && <button type="button" className="sidebar-backdrop d-lg-none" onClick={() => setMobileOpen(false)} aria-label="بستن منوی کناری" />}

      <header className="app-topbar">
        <div className="topbar-leading">
          <button type="button" className="sidebar-mobile-toggle d-lg-none" onClick={() => setMobileOpen(true)} aria-label="بازکردن منوی کناری" aria-controls="app-navigation">
            <Menu size={20} />
          </button>
          <div className="topbar-page-title">
            <span className="topbar-overline">پنل مدیریت اینستاگرام</span>
            <div className="d-flex align-items-center gap-2">
              <h1>{currentItem.label}</h1>
              <span className="topbar-live-pill"><span /> Live</span>
            </div>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="topbar-workspace d-none d-md-flex">
            <span className="topbar-workspace-mark">{workspace.name.slice(0, 1).toUpperCase()}</span>
            <div><strong>{workspace.name}</strong><span>Workspace فعال</span></div>
          </div>
          <ThemeControls />
          <button type="button" className="topbar-oauth" onClick={() => navigate('accounts')}>
            <CheckCircle2 size={16} />
            مدیریت اتصال
          </button>
        </div>
      </header>
    </>
  );
};
