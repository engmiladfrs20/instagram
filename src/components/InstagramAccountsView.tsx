import React, { useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Instagram,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Webhook,
  X,
} from 'lucide-react';
import { InstagramAccount } from '../types';

interface InstagramAccountsViewProps {
  instagramAccount: InstagramAccount | null;
  onReauthorize: () => Promise<void>;
  onStartOAuth: () => Promise<string>;
}

const requestedScopes = [
  ['instagram_business_basic', 'مشاهده پروفایل و رسانه‌ها'],
  ['instagram_business_manage_comments', 'مدیریت و پاسخ به کامنت‌ها'],
  ['instagram_business_manage_messages', 'دریافت و ارسال دایرکت'],
];

const fallbackAccount: InstagramAccount = {
  id: 'not-connected',
  workspaceId: '',
  metaIgUserId: '',
  username: 'not-connected',
  displayName: 'اکانت اینستاگرام متصل نیست',
  accountType: 'BUSINESS',
  authMode: 'instagram_login',
  graphHost: 'graph.instagram.com',
  graphVersion: 'v20.0',
  grantedScopes: [],
  status: 'disconnected',
  webhookStatus: 'pending',
  tokenExpiresAt: '1970-01-01T00:00:00.000Z',
  lastWebhookAt: '1970-01-01T00:00:00.000Z',
  lastTokenCheckAt: '1970-01-01T00:00:00.000Z',
  createdAt: '1970-01-01T00:00:00.000Z',
};

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getFullYear() === 1970 ? '—' : date.toLocaleDateString('fa-IR');
}

export const InstagramAccountsView: React.FC<InstagramAccountsViewProps> = ({
  instagramAccount: instagramAccountInput,
  onReauthorize,
  onStartOAuth,
}) => {
  const instagramAccount = instagramAccountInput ?? fallbackAccount;
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const isConnected = instagramAccount.status === 'connected';
  const webhookIsActive = instagramAccount.webhookStatus === 'active';
  const statusLabel = isConnected ? 'متصل' : instagramAccount.status === 'reauth_required' ? 'نیازمند اتصال مجدد' : 'متصل نیست';

  const handleStartOAuth = async () => {
    setChecking(true);
    setError('');
    try {
      const authorizationUrl = await onStartOAuth();
      if (!authorizationUrl || !/^https:\/\/(?:www\.)?instagram\.com\/oauth\//.test(authorizationUrl)) {
        throw new Error('لینک اتصال رسمی اینستاگرام نامعتبر است. تنظیمات OAuth را بررسی کنید.');
      }
      window.location.assign(authorizationUrl);
    } catch (oauthError) {
      setError(oauthError instanceof Error ? oauthError.message : 'شروع اتصال اینستاگرام ناموفق بود.');
      setChecking(false);
    }
  };

  const handleVerify = async () => {
    setChecking(true);
    setError('');
    try {
      await onReauthorize();
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'بررسی توکن ناموفق بود.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="direct-account-view" dir="rtl">
      <header className="direct-account-header">
        <div className="direct-account-title-wrap">
          <span className="direct-account-icon"><Instagram size={22} /></span>
          <div>
            <span className="direct-eyebrow">اتصال رسمی Meta</span>
            <h2>اتصال به اینستاگرام</h2>
            <p>اکانت حرفه‌ای خود را در چند مرحله و بدون واردکردن رمز عبور به InstaFlow وصل کنید.</p>
          </div>
        </div>
        <button type="button" className="btn direct-account-primary" onClick={() => setShowOAuthModal(true)}>
          <KeyRound size={16} /> اتصال اکانت جدید
        </button>
      </header>

      <section className="direct-account-layout">
        <article className="direct-connection-guide direct-panel">
          <div className="direct-guide-heading">
            <div><span className="direct-eyebrow">راهنمای اتصال</span><h3>در چهار مرحله آماده شوید</h3></div>
            <span className="direct-guide-progress"><i /><i /><i /><i /></span>
          </div>

          <div className="direct-connection-steps">
            <div className="direct-connection-step"><span>۱</span><div><strong>در اینستاگرام لاگین کنید</strong><p>در یک تب جدید وارد instagram.com شوید و با اکانت حرفه‌ای خود وارد شوید.</p></div></div>
            <div className="direct-connection-step"><span>۲</span><div><strong>روی «اتصال اکانت» کلیک کنید</strong><p>به صفحه اتصال برگردید و دکمه اتصال اکانت را انتخاب کنید.</p></div></div>
            <div className="direct-connection-step"><span>۳</span><div><strong>مجوزهای Meta را تأیید کنید</strong><p>مجوزهای لازم برای پروفایل، کامنت و دایرکت را بررسی و روی Allow بزنید.</p></div></div>
            <div className="direct-connection-step"><span>۴</span><div><strong>تمام!</strong><p>پس از بازگشت، سلامت Webhook و زمان انقضای توکن بررسی می‌شود.</p></div></div>
          </div>

          <button type="button" className="btn direct-account-wide-btn" onClick={() => setShowOAuthModal(true)}>
            رفتن به اتصال اکانت <ArrowRight size={16} />
          </button>
          <div className="direct-account-note"><ShieldCheck size={16} /><span>این اتصال از OAuth رسمی Meta استفاده می‌کند؛ InstaFlow هیچ‌وقت رمز اینستاگرام شما را دریافت یا ذخیره نمی‌کند.</span></div>
        </article>

        <aside className="direct-account-status-card direct-panel">
          <div className="direct-account-status-heading"><span className="direct-eyebrow">اکانت فعلی</span><span className={`direct-account-status ${isConnected ? 'is-connected' : 'is-warning'}`}><i />{statusLabel}</span></div>
          <div className="direct-account-profile">
            {instagramAccount.profilePicUrl ? <img src={instagramAccount.profilePicUrl} alt={instagramAccount.username} referrerPolicy="no-referrer" /> : <span className="direct-account-avatar-fallback"><Instagram size={22} /></span>}
            <div><strong>{instagramAccount.displayName}</strong><span dir="ltr">@{instagramAccount.username}</span><small>{instagramAccount.accountType === 'BUSINESS' ? 'Instagram Business' : 'Instagram Creator'}</small></div>
          </div>
          <div className="direct-account-health-list">
            <div><span><Webhook size={15} /> وضعیت Webhook</span><strong className={webhookIsActive ? 'is-ok' : 'is-warning'}>{webhookIsActive ? 'فعال و ثبت‌شده' : 'نیازمند بررسی'}</strong></div>
            <div><span><KeyRound size={15} /> انقضای Access Token</span><strong>{formatDate(instagramAccount.tokenExpiresAt)}</strong></div>
            <div><span><RefreshCw size={15} /> آخرین بررسی سلامت</span><strong>{formatDate(instagramAccount.lastTokenCheckAt)}</strong></div>
          </div>
          <button type="button" className="btn direct-account-check-btn" onClick={handleVerify} disabled={checking}><RefreshCw size={15} /> {checking ? 'در حال بررسی...' : 'بررسی اتصال و توکن'}</button>
        </aside>
      </section>

      <section className="direct-panel direct-scope-panel">
        <div className="direct-guide-heading"><div><span className="direct-eyebrow">دسترسی‌های موردنیاز</span><h3>مجوزهایی که در Meta تأیید می‌شوند</h3></div><CheckCircle2 size={20} className="direct-scope-check" /></div>
        <div className="direct-scope-grid">{requestedScopes.map(([scope, label]) => <div className="direct-scope-item" key={scope}><Check size={14} /><div><strong>{label}</strong><code>{scope}</code></div></div>)}</div>
      </section>

      {error && <div className="alert alert-danger direct-account-alert" role="alert"><CircleAlert size={16} /> {error}</div>}

      {showOAuthModal && <div className="direct-account-modal-backdrop" role="presentation"><div className="direct-account-modal" role="dialog" aria-modal="true" aria-labelledby="oauth-title">
        <div className="direct-account-modal-header"><div><span className="direct-eyebrow">اتصال امن</span><h3 id="oauth-title">آماده اتصال به اینستاگرام هستید؟</h3></div><button type="button" onClick={() => setShowOAuthModal(false)} aria-label="بستن"><X size={18} /></button></div>
        <p className="direct-account-modal-copy">با انتخاب ادامه، به صفحه رسمی Instagram منتقل می‌شوید. رمز عبور در اختیار InstaFlow قرار نمی‌گیرد.</p>
        <div className="direct-modal-scope-list">{requestedScopes.map(([scope, label]) => <div key={scope}><CheckCircle2 size={15} /><span>{label}</span></div>)}</div>
        <div className="direct-account-modal-actions"><button type="button" className="btn direct-account-cancel" onClick={() => setShowOAuthModal(false)}>انصراف</button><button type="button" className="btn direct-account-primary" onClick={handleStartOAuth} disabled={checking}>{checking ? 'در حال انتقال...' : 'ادامه در Instagram'} <ExternalLink size={15} /></button></div>
      </div></div>}
    </div>
  );
};
